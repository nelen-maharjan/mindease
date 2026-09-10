"""
MindEase ML Service — FastAPI

Mood classification uses a trained Logistic Regression model
(TF-IDF → LogisticRegression). Sentiment and recommendations
are derived from that model. Isolation Forest flags unusual mood scores.
"""

from __future__ import annotations

import json
import statistics
from collections import Counter
from contextlib import asynccontextmanager
from pathlib import Path
from typing import List

import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from train_model import train as run_training

ROOT = Path(__file__).parent
MODEL_PATHS = [
    ROOT / "models" / "mood_classifier.joblib",
    ROOT / "models" / "mood_hgb.joblib",
]
METRICS_PATH = ROOT / "models" / "metrics.json"

BUNDLE = None


@asynccontextmanager
async def lifespan(_app: FastAPI):
    load_bundle()
    yield


app = FastAPI(
    title="MindEase ML Service",
    description="Trained Logistic Regression mood classifier, sentiment, trends, and anomalies",
    version="2.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "https://yourdomain.com"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class TextInput(BaseModel):
    text: str


class MoodEntry(BaseModel):
    mood: str
    intensity: int
    date: str

class TrendRequest(BaseModel):
    entries: List[MoodEntry]


class SentimentResponse(BaseModel):
    label: str
    score: float
    emotions: List[str]

class MoodClassification(BaseModel):
    label: str
    confidence: float

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
    "NEUTRAL": 5,
    "SAD": 3,
    "DEPRESSED": 1,
    "ANGRY": 2,
    "ANXIOUS": 3,
    "EXHAUSTED": 4,
}

MOOD_TO_SENTIMENT = {
    "happy": "positive",
    "calm": "neutral",
    "sad": "negative",
    "anxious": "anxiety",
    # backwards-compatibility
    "angry": "negative",
    "lonely": "negative",
    "burnout": "anxiety",
}

def load_bundle():
    global BUNDLE
    for path in MODEL_PATHS:
        if path.exists():
            BUNDLE = joblib.load(path)
            return True
    BUNDLE = None
    return False


def ensure_model():
    if BUNDLE is None and not load_bundle():
        raise HTTPException(status_code=503, detail="ML model is not trained yet")
    return BUNDLE


def predict_mood(text: str) -> MoodClassification:
    bundle = ensure_model()
    pipeline = bundle["pipeline"]
    encoder = bundle["encoder"]
    proba = pipeline.predict_proba([text])[0]
    idx = int(proba.argmax())
    label = str(encoder.inverse_transform([idx])[0])
    return MoodClassification(label=label, confidence=round(float(proba[idx]), 3))


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
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="Text is required")
    mood = predict_mood(body.text)
    label = MOOD_TO_SENTIMENT.get(mood.label, "neutral")
    return SentimentResponse(
        label=label,
        score=mood.confidence,
        emotions=[mood.label, label],
    )

@app.post("/classify-mood", response_model=MoodClassification)
def classify_mood(body: TextInput):
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="Text is required")
    return predict_mood(body.text)


@app.post("/trend", response_model=TrendAnalysis)
def analyze_trend(body: TrendRequest):
    if not body.entries:
        raise HTTPException(status_code=400, detail="No entries provided")

    scores = [MOOD_SCORE_MAP.get(e.mood.upper(), 5) for e in body.entries]
    dates = [e.date for e in body.entries]
    moods = [e.mood for e in body.entries]
    avg = round(statistics.mean(scores), 2)

    mid = len(scores) // 2
    first_half = statistics.mean(scores[:mid]) if mid > 0 else avg
    second_half = statistics.mean(scores[mid:]) if mid < len(scores) else avg
    change = second_half - first_half
    change_pct = round((change / max(first_half, 1)) * 100, 1)

    if change > 0.5:
        direction = "improving"
    elif change < -0.5:
        direction = "declining"
    else:
        direction = "stable"

    anomalies: List[str] = []
    bundle = BUNDLE
    if bundle and bundle.get("isolation_forest") is not None and len(scores) > 2:
        iso = bundle["isolation_forest"]
        preds = iso.predict(np.asarray(scores, dtype=float).reshape(-1, 1))
        anomalies = [dates[i] for i, p in enumerate(preds) if p == -1]
    elif len(scores) > 3:
        try:
            stdev = statistics.stdev(scores)
            if stdev > 0:
                anomalies = [dates[i] for i, s in enumerate(scores) if abs(s - avg) / stdev > 1.5]
        except statistics.StatisticsError:
            pass

    dominant = Counter(moods).most_common(1)[0][0].lower()
    return TrendAnalysis(
        weekly_average=avg,
        trend_direction=direction,
        change_percent=change_pct,
        anomalies=anomalies,
        dominant_mood=dominant,
    )


@app.post("/recommend", response_model=List[RecommendationResponse])
def get_recommendations(body: TextInput):
    sentiment = analyze_sentiment(body)
    recs = []

    if sentiment.label in ("stress", "anxiety"):
        recs.append(RecommendationResponse(
            type="BREATHING", priority=1,
            title="4-7-8 breathing exercise",
            description="Inhale for 4 seconds, hold for 7, exhale for 8. Activates your parasympathetic nervous system.",
        ))
        recs.append(RecommendationResponse(
            type="WALKING", priority=2,
            title="10-minute outdoor walk",
            description="Fresh air and rhythmic movement lower cortisol and clear nervous tension.",
        ))
    elif sentiment.label == "negative":
        recs.append(RecommendationResponse(
            type="JOURNALING_PROMPT", priority=1,
            title="Gratitude journaling",
            description="Write 3 specific things you appreciate today. Specificity amplifies the neural effect.",
        ))
        recs.append(RecommendationResponse(
            type="SOCIAL", priority=2,
            title="Reach out to someone",
            description="A short message or call to a friend can shift your emotional baseline significantly.",
        ))
    elif sentiment.label == "positive":
        recs.append(RecommendationResponse(
            type="MEDITATION", priority=3,
            title="Loving-kindness meditation",
            description="Extend your positive mood outward. Spend 5 minutes wishing peace to yourself and others.",
        ))
        recs.append(RecommendationResponse(
            type="GRATITUDE", priority=2,
            title="Savor the moment",
            description="Write down what contributed to this positive moment to anchor it in memory.",
        ))
    else:
        recs.append(RecommendationResponse(
            type="MINDFULNESS", priority=2,
            title="Mindful 2-minute pause",
            description="Check in with your body. Soften your shoulders and take three unhurried breaths.",
        ))

    recs.append(RecommendationResponse(
        type="SLEEP_TIP", priority=3,
        title="Consistent wake time",
        description="Waking at the same time each day is the single most impactful sleep habit.",
    ))

    return recs[:3]