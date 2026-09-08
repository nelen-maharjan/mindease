"""
Train a Histogram Gradient Boosting mood classifier.

Pipeline: TF-IDF (1–2 grams) → TruncatedSVD (LSA) → HistGradientBoostingClassifier
Also fits IsolationForest for mood-score anomaly detection.
"""

from __future__ import annotations

import json
import random
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
from sklearn.decomposition import TruncatedSVD
from sklearn.ensemble import HistGradientBoostingClassifier, IsolationForest
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import classification_report, f1_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder

ROOT = Path(__file__).parent
MODELS = ROOT / "models"
MODELS.mkdir(exist_ok=True)

MOOD_LABELS = ["happy", "calm", "sad", "angry", "lonely", "burnout", "anxious"]

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
    ],
    "angry": [
        "I am furious about how I was treated and I cannot let it go.",
        "I feel irritated, resentful, and ready to snap.",
        "This made me so mad. I am angry and tense.",
        "I am frustrated with the unfairness of it all.",
        "My blood is boiling. I feel hostile and bitter.",
        "I snapped at someone because I was livid.",
        "I keep replaying the argument and feeling rage.",
        "I am annoyed at every small thing today.",
    ],
    "lonely": [
        "I feel lonely and disconnected from everyone I care about.",
        "I am isolated, even in a crowded room.",
        "Nobody reached out. I feel alone and unseen.",
        "I miss people. The silence feels heavy and empty.",
        "I feel abandoned and like I do not belong.",
        "I want connection but I am too withdrawn to ask.",
        "The apartment is too quiet. I feel cut off.",
        "I scrolled for hours and still felt invisible.",
    ],
    "burnout": [
        "I am exhausted, overloaded, and completely drained.",
        "Work keeps piling up. I feel frazzled and on the edge of burnout.",
        "I am overwhelmed by deadlines and cannot catch my breath.",
        "I feel burned out, tense, and too busy to rest.",
        "My energy is gone. Even small tasks feel hectic and rushed.",
        "I am overworked and my body is begging me to stop.",
        "I have nothing left to give. I am depleted.",
        "The pressure never lets up and I am running on empty.",
    ],
    "anxious": [
        "I feel anxious and keep overthinking every possible outcome.",
        "My chest is tight. I am worried, restless, and uneasy.",
        "I am nervous about tomorrow and spiraling into panic.",
        "I cannot sit still. Fear and dread keep looping.",
        "I am apprehensive and fidgety about things I cannot control.",
        "My thoughts race. I feel scared that I will mess this up.",
        "I keep checking my phone. The uncertainty is unbearable.",
        "I am on edge and bracing for something bad.",
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
    "",
]


def build_corpus(n_per_class: int = 280, seed: int = 42) -> tuple[list[str], list[str]]:
    rng = random.Random(seed)
    texts: list[str] = []
    labels: list[str] = []
    for label, templates in TEMPLATES.items():
        for i in range(n_per_class):
            base = rng.choice(templates)
            extra = rng.choice(FILLERS)
            noise = rng.choice(FILLERS)
            # Light paraphrase via word order / repetition
            if rng.random() < 0.35:
                base = base.replace("I feel", "I have been feeling")
            if rng.random() < 0.25:
                extra = extra + " " + rng.choice(["Work", "Family", "Sleep", "Health"]).lower() + " is on my mind."
            texts.append((base + extra + noise).strip())
            labels.append(label)
    return texts, labels


def train() -> dict:
    texts, labels = build_corpus()
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
                    max_features=6000,
                    sublinear_tf=True,
                ),
            ),
            ("svd", TruncatedSVD(n_components=120, random_state=42)),
            (
                "clf",
                HistGradientBoostingClassifier(
                    max_depth=6,
                    max_iter=180,
                    learning_rate=0.08,
                    l2_regularization=0.1,
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
        "algorithm": "HistGradientBoostingClassifier (TF-IDF + TruncatedSVD/LSA)",
        "accuracy": round(report["accuracy"], 4),
        "macro_f1": round(f1_score(y_test, y_pred, average="macro"), 4),
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test)),
        "n_classes": int(len(encoder.classes_)),
        "per_class": per_class,
        "trained_at": datetime.now(timezone.utc).isoformat(),
    }

    # Isolation Forest on synthetic mood scores for anomaly detection
    rng = np.random.default_rng(42)
    typical = rng.normal(6.2, 1.1, size=800)
    iso = IsolationForest(contamination=0.08, random_state=42)
    iso.fit(typical.reshape(-1, 1))

    joblib.dump(
        {"pipeline": pipeline, "encoder": encoder, "isolation_forest": iso, "metrics": metrics},
        MODELS / "mood_hgb.joblib",
    )
    (MODELS / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    return metrics


if __name__ == "__main__":
    result = train()
    print("Saved", MODELS / "mood_hgb.joblib")
    print("Accuracy", result["accuracy"], "macro F1", result["macro_f1"])
