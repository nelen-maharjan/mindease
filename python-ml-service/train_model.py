"""
Train a Logistic Regression mood classifier for MindEase.

Pipeline: TF-IDF (1–2 grams) → LogisticRegression
Also fits IsolationForest for mood-score anomaly detection.
Supports 4 core emotional states: happy, calm, sad, anxious.
"""

from __future__ import annotations

import json
import random
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, f1_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder

ROOT = Path(__file__).parent
MODELS = ROOT / "models"
MODELS.mkdir(exist_ok=True)

# 4 Core Emotions
MOOD_LABELS = ["happy", "calm", "sad", "anxious"]

TEMPLATES = {
    "happy": [
        "I feel genuinely happy today and grateful for the people around me.",
        "What a wonderful morning. I am excited and proud of the progress I made.",
        "I laughed a lot and felt joyful after spending time with friends.",
        "I am thriving, energized, and hopeful about the week ahead.",
        "I feel confident, cheerful, and full of love for this moment.",
        "Today was amazing. I feel content and motivated to keep going.",
        "I am so thankful. Everything clicked and I feel alive.",
        "A great day overall. I feel warm, light, and really good.",
        "Accomplished all my goals today and celebrated with friends.",
        "Woke up with high energy and an optimistic outlook on life.",
        "Feeling inspired and enthusiastic about working on new projects.",
        "Such a uplifting and cheerful day. I am smiling non-stop.",
    ],
    "calm": [
        "I feel peaceful and relaxed after a quiet evening at home.",
        "My mind is still. I feel grounded, serene, and at ease.",
        "A slow morning helped me stay calm and present.",
        "I meditated and feel balanced, steady, and soothed.",
        "Nothing urgent. I feel settled and comfortable in my body.",
        "The walk outside left me tranquil and clear-headed.",
        "I am breathing easily and feeling quietly content.",
        "I feel safe, stable, and gently optimistic.",
        "Enjoying the quiet stillness of the afternoon with a warm cup of tea.",
        "My thoughts are unhurried and my body feels relaxed.",
        "Taking things one step at a time with a clear, peaceful mind.",
        "No tension in my shoulders. Just feeling harmonious and tranquil.",
    ],
    "sad": [
        "I feel sad and disappointed about how today unfolded.",
        "A heavy gloom settled in and I cannot shake the emptiness.",
        "I cried a little. Everything feels unhappy and dull.",
        "I feel down, lost, and not like myself.",
        "The day felt miserable and I keep replaying what went wrong.",
        "I am heartbroken and tired of feeling this low.",
        "Nothing feels good. I am gloomy and withdrawn.",
        "I feel like a failure and it hurts more than I expected.",
        "I feel lonely and disconnected from everyone I care about.",
        "Nobody reached out today. The silence feels heavy and empty.",
        "Feeling gloomy, fatigued, and lacking motivation to do anything.",
        "Deep sadness and tearful thoughts keep pulling my spirits down.",
    ],
    "anxious": [
        "I feel anxious and keep overthinking every possible outcome.",
        "My chest is tight. I am worried, restless, and uneasy.",
        "I am nervous about tomorrow and spiraling into panic.",
        "I cannot sit still. Fear and dread keep looping.",
        "I am apprehensive and fidgety about things I cannot control.",
        "My thoughts race. I feel scared that I will mess this up.",
        "I keep checking my phone. The uncertainty is unbearable.",
        "I am on edge and bracing for something bad to happen.",
        "I am exhausted, overloaded, and completely burned out with stress.",
        "Work keeps piling up. I feel frantic, panicked, and overwhelmed.",
        "Tension headaches and racing heartbeat from all the pressure.",
        "Constantly on edge, unable to breathe deeply or slow my mind down.",
    ],
}

FILLERS = [
    " After journaling I noticed this more clearly.",
    " It has been building for a few days.",
    " Sleep was off last night which did not help.",
    " I tried to take a short walk anyway.",
    " Talking about it might help later.",
    " I want to be honest with myself.",
    " This is just how the afternoon felt.",
    " I will check in again tomorrow.",
    " I keep returning to this feeling.",
    " Sitting alone with these thoughts right now.",
    "",
]


def build_corpus(n_per_class: int = 350, seed: int = 42) -> tuple[list[str], list[str]]:
    rng = random.Random(seed)
    texts: list[str] = []
    labels: list[str] = []
    for label, templates in TEMPLATES.items():
        for i in range(n_per_class):
            base = rng.choice(templates)
            extra = rng.choice(FILLERS)
            noise = rng.choice(FILLERS)
            # Paraphrase via phrasing / context tags
            if rng.random() < 0.40:
                base = base.replace("I feel", "I have been feeling")
            if rng.random() < 0.25:
                base = base.replace("I am", "I'm feeling completely")
            if rng.random() < 0.30:
                topic = rng.choice(["Work", "Family", "Sleep", "Health", "Relationships", "Finances"]).lower()
                extra = extra + f" {topic} is on my mind."
            texts.append((base + extra + noise).strip())
            labels.append(label)
    return texts, labels


def train() -> dict:
    texts, labels = build_corpus(n_per_class=400)
    encoder = LabelEncoder()
    y = encoder.fit_transform(labels)

    X_train, X_test, y_train, y_test = train_test_split(
        texts, y, test_size=0.2, random_state=42, stratify=y
    )

    pipeline = Pipeline(
        steps=[
            (
                "tfidf",
                TfidfVectorizer(
                    lowercase=True,
                    ngram_range=(1, 2),
                    min_df=2,
                    max_features=8000,
                    sublinear_tf=True,
                ),
            ),
            (
                "clf",
                LogisticRegression(
                    C=1.0,
                    max_iter=1000,
                    solver="lbfgs",
                    random_state=42,
                ),
            ),
        ]
    )

    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)
    report = classification_report(
        y_test,
        y_pred,
        target_names=encoder.classes_,
        output_dict=True,
        zero_division=0,
    )
    print(classification_report(y_test, y_pred, target_names=encoder.classes_, zero_division=0))

    per_class = {}
    for label in encoder.classes_:
        row = report[label]
        per_class[label] = {
            "precision": round(row["precision"], 4),
            "recall": round(row["recall"], 4),
            "f1": round(row["f1-score"], 4),
        }

    metrics = {
        "algorithm": "LogisticRegression (TF-IDF)",
        "accuracy": round(report["accuracy"], 4),
        "macro_f1": round(f1_score(y_test, y_pred, average="macro"), 4),
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test)),
        "n_classes": int(len(encoder.classes_)),
        "classes": list(encoder.classes_),
        "per_class": per_class,
        "trained_at": datetime.now(timezone.utc).isoformat(),
    }

    # Isolation Forest on synthetic mood scores for anomaly detection
    rng = np.random.default_rng(42)
    typical = rng.normal(6.5, 1.2, size=1000)
    iso = IsolationForest(contamination=0.07, random_state=42)
    iso.fit(typical.reshape(-1, 1))

    bundle = {
        "pipeline": pipeline,
        "encoder": encoder,
        "isolation_forest": iso,
        "metrics": metrics,
    }

    # Save to both mood_classifier.joblib and mood_hgb.joblib for seamless backwards-compatibility
    joblib.dump(bundle, MODELS / "mood_classifier.joblib")
    joblib.dump(bundle, MODELS / "mood_hgb.joblib")
    (MODELS / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    return metrics


if __name__ == "__main__":
    result = train()
    print("Saved mood_classifier.joblib and metrics.json")
    print("Algorithm:", result["algorithm"])
    print("Accuracy:", result["accuracy"], "macro F1:", result["macro_f1"])
