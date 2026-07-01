"""
MindEase ML Service — FastAPI
Provides: sentiment analysis, mood classification, trend analysis, anomaly detection
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import re
from collections import Counter
import statistics

app = FastAPI(
    title="MindEase ML Service",
    description="Sentiment analysis, mood classification, and wellness analytics",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://yourdomain.com"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Models ────────────────────────────────────────────────────────────────────

class TextInput(BaseModel):
    text: str

class MoodEntry(BaseModel):
    mood: str
    intensity: int
    date: str  # ISO string

class TrendRequest(BaseModel):
    entries: List[MoodEntry]

class SentimentResponse(BaseModel):
    label: str          # positive | neutral | negative | stress | anxiety
    score: float        # 0–1
    emotions: List[str] # detected emotion labels

class MoodClassification(BaseModel):
    label: str          # happy | calm | sad | angry | lonely | burnout | anxious
    confidence: float

class TrendAnalysis(BaseModel):
    weekly_average: float
    trend_direction: str    # improving | stable | declining
    change_percent: float
    anomalies: List[str]    # dates with anomalous values
    dominant_mood: str

class RecommendationResponse(BaseModel):
    type: str
    title: str
    description: str
    priority: int  # 1=high, 2=medium, 3=low


# ── Sentiment Lexicons (simplified, production would use a model) ──────────────

POSITIVE_WORDS = {
    "happy", "joy", "great", "wonderful", "amazing", "love", "excited", "grateful",
    "thankful", "good", "calm", "peaceful", "content", "thriving", "energized",
    "hopeful", "motivated", "proud", "confident", "relaxed", "refreshed", "cheerful",
}
NEGATIVE_WORDS = {
    "sad", "bad", "terrible", "awful", "horrible", "depressed", "hopeless",
    "worthless", "miserable", "unhappy", "gloomy", "down", "lost", "empty",
    "failure", "disappointed", "lonely", "isolated", "numb", "broken",
}
STRESS_WORDS = {
    "stressed", "overwhelmed", "pressure", "deadline", "busy", "exhausted",
    "overloaded", "burnout", "drained", "frazzled", "tense", "hectic", "rushed",
}
ANXIETY_WORDS = {
    "anxious", "worried", "nervous", "panic", "fear", "scared", "dread",
    "apprehensive", "uneasy", "restless", "fidgety", "overthinking",
}
ANGER_WORDS = {
    "angry", "furious", "rage", "irritated", "frustrated", "mad", "annoyed",
    "hostile", "bitter", "resentful", "livid",
}

MOOD_SCORE_MAP = {
    "HAPPY": 9, "GOOD": 7, "NEUTRAL": 5, "SAD": 3,
    "DEPRESSED": 1, "ANGRY": 2, "ANXIOUS": 3, "EXHAUSTED": 4,
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def tokenize(text: str) -> List[str]:
    return re.findall(r"\b[a-z]+\b", text.lower())


def analyze_sentiment_lexicon(tokens: List[str]) -> SentimentResponse:
    pos = sum(1 for t in tokens if t in POSITIVE_WORDS)
    neg = sum(1 for t in tokens if t in NEGATIVE_WORDS)
    stress = sum(1 for t in tokens if t in STRESS_WORDS)
    anxiety = sum(1 for t in tokens if t in ANXIETY_WORDS)
    anger = sum(1 for t in tokens if t in ANGER_WORDS)

    total = max(len(tokens), 1)
    emotions = []

    if stress > 0: emotions.append("stress")
    if anxiety > 0: emotions.append("anxious")
    if anger > 0: emotions.append("angry")
    if pos > neg: emotions.append("positive")
    elif neg > pos: emotions.append("negative")

    if stress >= 2:
        return SentimentResponse(label="stress", score=min(stress / 5, 1.0), emotions=emotions or ["stress"])
    if anxiety >= 2:
        return SentimentResponse(label="anxiety", score=min(anxiety / 5, 1.0), emotions=emotions or ["anxious"])
    if neg > pos:
        score = min(neg / max(pos + neg, 1), 1.0)
        return SentimentResponse(label="negative", score=score, emotions=emotions or ["negative"])
    if pos > neg:
        score = min(pos / max(pos + neg, 1), 1.0)
        return SentimentResponse(label="positive", score=score, emotions=emotions or ["positive"])
    return SentimentResponse(label="neutral", score=0.5, emotions=["neutral"])


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "mindease-ml"}


@app.post("/sentiment", response_model=SentimentResponse)
def analyze_sentiment(body: TextInput):
    """Analyze sentiment of a journal entry or chat message."""
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="Text is required")
    tokens = tokenize(body.text)
    return analyze_sentiment_lexicon(tokens)


@app.post("/classify-mood", response_model=MoodClassification)
def classify_mood(body: TextInput):
    """Classify free text into a mood category."""
    tokens = tokenize(body.text)
    scores = {
        "happy":   sum(1 for t in tokens if t in POSITIVE_WORDS),
        "anxious": sum(1 for t in tokens if t in ANXIETY_WORDS),
        "angry":   sum(1 for t in tokens if t in ANGER_WORDS),
        "sad":     sum(1 for t in tokens if t in NEGATIVE_WORDS),
        "burnout": sum(1 for t in tokens if t in STRESS_WORDS),
        "calm":    sum(1 for t in tokens if t in {"peaceful", "calm", "relaxed", "serene", "still"}),
        "lonely":  sum(1 for t in tokens if t in {"lonely", "alone", "isolated", "disconnected"}),
    }
    if all(v == 0 for v in scores.values()):
        return MoodClassification(label="calm", confidence=0.5)
    top = max(scores, key=lambda k: scores[k])
    total = sum(scores.values()) or 1
    return MoodClassification(label=top, confidence=round(scores[top] / total, 2))


@app.post("/trend", response_model=TrendAnalysis)
def analyze_trend(body: TrendRequest):
    """Analyze mood trend from a list of mood log entries."""
    if not body.entries:
        raise HTTPException(status_code=400, detail="No entries provided")

    scores = [MOOD_SCORE_MAP.get(e.mood.upper(), 5) for e in body.entries]
    dates = [e.date for e in body.entries]
    moods = [e.mood for e in body.entries]

    avg = round(statistics.mean(scores), 2)

    # Trend: compare first half vs second half
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

    # Anomaly detection: z-score > 1.5
    anomalies = []
    if len(scores) > 3:
        try:
            stdev = statistics.stdev(scores)
            if stdev > 0:
                anomalies = [
                    dates[i] for i, s in enumerate(scores)
                    if abs(s - avg) / stdev > 1.5
                ]
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
    """Generate wellness recommendations based on text analysis."""
    sentiment = analyze_sentiment_lexicon(tokenize(body.text))
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
            description="Fresh air and movement lower cortisol within minutes.",
        ))
    elif sentiment.label == "negative":
        recs.append(RecommendationResponse(
            type="JOURNALING_PROMPT", priority=1,
            title="Gratitude journaling",
            description="Write 3 specific things you appreciate today. Specificity amplifies the effect.",
        ))
        recs.append(RecommendationResponse(
            type="SOCIAL", priority=2,
            title="Reach out to someone",
            description="A short voice note to a friend can shift your emotional state significantly.",
        ))
    elif sentiment.label == "positive":
        recs.append(RecommendationResponse(
            type="MEDITATION", priority=3,
            title="Loving-kindness meditation",
            description="Extend your positive mood outward. 5 minutes of metta practice.",
        ))

    recs.append(RecommendationResponse(
        type="SLEEP_TIP", priority=3,
        title="Consistent wake time",
        description="Waking at the same time each day is the single most impactful sleep habit.",
    ))

    return recs[:3]
