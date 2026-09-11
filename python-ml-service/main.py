"""
MindEase ML Service — FastAPI

Mood classification uses a trained Logistic Regression model
(TF-IDF → LogisticRegression). Sentiment and recommendations
are derived directly from the emotion model. Statistical baseline
deviation flags unusual mood trajectories.
"""

from __future__ import annotations

import json
import statistics
from collections import Counter
from contextlib import asynccontextmanager
from pathlib import Path
from typing import List

import joblib
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from train_model import train as run_training

ROOT = Path(__file__).parent
MODEL_PATH = ROOT / "models" / "mood_classifier.joblib"
METRICS_PATH = ROOT / "models" / "metrics.json"

BUNDLE = None


@asynccontextmanager
async def lifespan(_app: FastAPI):
    load_bundle()
    yield


app = FastAPI(
    title="MindEase ML Service",
    description="Logistic Regression mood classifier with sentiment, trend, and statistical anomaly analysis",
    version="2.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "https://yourdomain.com"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class TextInput(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)


class MoodEntry(BaseModel):
    mood: str
    intensity: int = Field(..., ge=1, le=10)
    date: str = Field(..., min_length=4, max_length=30)


class TrendRequest(BaseModel):
    entries: List[MoodEntry]


class SentimentResponse(BaseModel):
    label: str
    score: float
    emotions: List[str]


class MoodClassification(BaseModel):
    label: str
    confidence: float
    probabilities: dict[str, float] = Field(default_factory=dict)
    is_uncertain: bool = False


class TrendAnalysis(BaseModel):
    weekly_average: float
    trend_direction: str
    change_percent: float
    anomalies: List[str]
    dominant_mood: str


class RecommendationResponse(BaseModel):
    type: str
    title: str
    description: str
    priority: int

MOOD_SCORE_MAP = {
    "HAPPY": 9,
    "GOOD": 7,  
    "CALM": 7,
    "SAD": 3,
    "ANXIOUS": 3,
}

MOOD_TO_SENTIMENT = {
    "happy": "positive",
    "calm": "neutral",
    "sad": "negative",
    "anxious": "anxiety",
}


def load_bundle():
    global BUNDLE
    if MODEL_PATH.exists():
        BUNDLE = joblib.load(MODEL_PATH)
        return True
    BUNDLE = None
    return False


def ensure_model():
    if BUNDLE is None and not load_bundle():
        raise HTTPException(status_code=503, detail="ML model is not trained yet")
    return BUNDLE


CONFIDENCE_THRESHOLD = 0.45


def predict_mood(text: str) -> MoodClassification:
    bundle = ensure_model()
    pipeline = bundle["pipeline"]
    encoder = bundle["encoder"]
    proba = pipeline.predict_proba([text])[0]
    idx = int(proba.argmax())
    best_confidence = round(float(proba[idx]), 3)

    probabilities = {
        str(cls_name): round(float(p), 4)
        for cls_name, p in zip(encoder.classes_, proba)
    }

    # "Uncertain" condition when maximum probability is below threshold
    if best_confidence < CONFIDENCE_THRESHOLD:
        return MoodClassification(
            label="uncertain",
            confidence=best_confidence,
            probabilities=probabilities,
            is_uncertain=True,
        )

    predicted_label = str(encoder.inverse_transform([idx])[0])
    return MoodClassification(
        label=predicted_label,
        confidence=best_confidence,
        probabilities=probabilities,
        is_uncertain=False,
    )


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "mindease-ml",
        "model_loaded": BUNDLE is not None,
    }


@app.get("/model/info")
def model_info():
    metrics = {}
    if METRICS_PATH.exists():
        metrics = json.loads(METRICS_PATH.read_text(encoding="utf-8"))
    elif BUNDLE and BUNDLE.get("metrics"):
        metrics = BUNDLE["metrics"]
    return {
        "status": "ok" if BUNDLE else "untrained",
        "loaded": BUNDLE is not None,
        "algorithm": metrics.get("algorithm", "LogisticRegression (TF-IDF)"),
        "version": metrics.get("version", "2.2.0"),
        "trainedAt": metrics.get("trained_at"),
        "metrics": metrics,
    }


@app.post("/model/train")
def train_model_endpoint():
    metrics = run_training()
    load_bundle()
    return {"status": "trained", "metrics": metrics}


@app.post("/sentiment", response_model=SentimentResponse)
def analyze_sentiment(body: TextInput):
    cleaned = body.text.strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="Text is required")
    mood = predict_mood(cleaned)
    if mood.is_uncertain:
        return SentimentResponse(
            label="uncertain",
            score=mood.confidence,
            emotions=["uncertain"],
        )
    label = MOOD_TO_SENTIMENT.get(mood.label, "neutral")
    return SentimentResponse(
        label=label,
        score=mood.confidence,
        emotions=[mood.label, label],
    )


@app.post("/classify-mood", response_model=MoodClassification)
def classify_mood(body: TextInput):
    cleaned = body.text.strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="Text is required")
    return predict_mood(cleaned)


@app.post("/trend", response_model=TrendAnalysis)
def analyze_trend(body: TrendRequest):
    if not body.entries:
        raise HTTPException(status_code=400, detail="No entries provided")

    # Combine mood category ordinal baseline with user-reported intensity (1-10)
    # For positive affect (HAPPY/CALM): higher intensity boosts wellness score
    # For negative affect (SAD/ANXIOUS): higher intensity lowers wellness score
    scores = []
    for e in body.entries:
        base = MOOD_SCORE_MAP.get(e.mood.upper(), 5)
        delta = (e.intensity - 5) * 0.25
        if base >= 6:
            effective = min(10.0, max(1.0, base + delta))
        else:
            effective = min(10.0, max(1.0, base - delta))
        scores.append(round(effective, 2))

    dates = [e.date for e in body.entries]
    moods = [e.mood for e in body.entries]
    avg = round(statistics.mean(scores), 2)
    dominant = Counter(moods).most_common(1)[0][0].lower()

    anomalies: List[str] = []
    # Statistical anomaly detection on user's recent personal score baseline
    if len(scores) >= 3:
        try:
            stdev = statistics.stdev(scores)
            if stdev > 0.1:
                anomalies = [dates[i] for i, s in enumerate(scores) if abs(s - avg) / stdev >= 1.5]
        except statistics.StatisticsError:
            pass

    # Require at least 4 entries to calculate a statistically meaningful trend direction
    if len(scores) < 4:
        return TrendAnalysis(
            weekly_average=avg,
            trend_direction="insufficient_data",
            change_percent=0.0,
            anomalies=anomalies,
            dominant_mood=dominant,
        )

    mid = len(scores) // 2
    first_half = statistics.mean(scores[:mid])
    second_half = statistics.mean(scores[mid:])
    change = second_half - first_half
    change_pct = round((change / max(first_half, 1)) * 100, 1)

    if change > 0.5:
        direction = "improving"
    elif change < -0.5:
        direction = "declining"
    else:
        direction = "stable"

    return TrendAnalysis(
        weekly_average=avg,
        trend_direction=direction,
        change_percent=change_pct,
        anomalies=anomalies,
        dominant_mood=dominant,
    )


@app.post("/recommend", response_model=List[RecommendationResponse])
def get_recommendations(body: TextInput):
    cleaned = body.text.strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="Text is required")
    mood = predict_mood(cleaned)
    recs: List[RecommendationResponse] = []

    # Recommendations driven directly from the 4-class emotion output
    if mood.label == "anxious":
        recs.append(RecommendationResponse(
            type="BREATHING", priority=1,
            title="4-7-8 breathing exercise",
            description="A gentle guided breathing exercise to help you pause, steady your rhythm, and focus on slow exhalations.",
        ))
        recs.append(RecommendationResponse(
            type="WALKING", priority=2,
            title="10-minute outdoor walk",
            description="A short walk can provide a refreshing change of environment and a brief break from stressful thoughts.",
        ))
        recs.append(RecommendationResponse(
            type="GROUNDING", priority=3,
            title="5-4-3-2-1 sensory grounding",
            description="Notice 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste.",
        ))
    elif mood.label == "sad":
        recs.append(RecommendationResponse(
            type="JOURNALING_PROMPT", priority=1,
            title="Gentle self-compassion",
            description="Write a few kind words to yourself as if you were encouraging a dear friend going through a tough day.",
        ))
        recs.append(RecommendationResponse(
            type="SOCIAL", priority=2,
            title="Reach out to someone you trust",
            description="A brief message or phone call to a friend can provide warmth, connection, and a listening ear.",
        ))
        recs.append(RecommendationResponse(
            type="COMFORT", priority=3,
            title="Rest and warm comfort",
            description="Allow yourself time to slow down with a warm cup of tea and a cozy, quiet space.",
        ))
    elif mood.label == "happy":
        recs.append(RecommendationResponse(
            type="GRATITUDE", priority=1,
            title="Savor the moment",
            description="Take a moment to write down what contributed to this positive feeling so you can reflect on it later.",
        ))
        recs.append(RecommendationResponse(
            type="CELEBRATION", priority=2,
            title="Share your joy",
            description="Sharing good news or positive energy with someone close to you can amplify the happiness.",
        ))
        recs.append(RecommendationResponse(
            type="MEDITATION", priority=3,
            title="Loving-kindness reflection",
            description="Spend five minutes wishing peace, happiness, and well-being to yourself and those around you.",
        ))
    elif mood.label == "calm":
        recs.append(RecommendationResponse(
            type="MINDFULNESS", priority=1,
            title="Mindful breathing pause",
            description="Enjoy this tranquil state by taking three deep, unhurried breaths and noting the calm in your body.",
        ))
        recs.append(RecommendationResponse(
            type="NATURE", priority=2,
            title="Step into nature",
            description="Spend a few quiet minutes outside observing the breeze, trees, or sky to deepen your sense of peace.",
        ))
        recs.append(RecommendationResponse(
            type="STRETCHING", priority=3,
            title="Gentle stretching",
            description="Release any remaining physical tension with slow, restorative shoulder and neck rolls.",
        ))
    else:  # uncertain or ambiguous
        recs.append(RecommendationResponse(
            type="MINDFULNESS", priority=1,
            title="Mindful 2-minute check-in",
            description="Close your eyes for a moment. Soften your posture, unclench your jaw, and notice how you feel without judgment.",
        ))
        recs.append(RecommendationResponse(
            type="JOURNALING_PROMPT", priority=2,
            title="Free-form reflection",
            description="Write freely for five minutes without filtering your thoughts to explore what is on your mind.",
        ))
        recs.append(RecommendationResponse(
            type="HYDRATION", priority=3,
            title="Water and a gentle pause",
            description="Drink a fresh glass of water and give yourself permission to step away from screens for a short break.",
        ))

    return recs[:3]