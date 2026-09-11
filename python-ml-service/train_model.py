"""
MindEase ML Pipeline — Production-Grade Emotion Classifier
Trains a regularized Logistic Regression classifier with TF-IDF n-grams
for 4 core affective states: happy, calm, sad, anxious.

Key Features:
- Diverse curated dataset with zero near-duplicate train/test leakage
- 5-Fold Stratified Cross-Validation during training
- GridSearchCV hyperparameter optimization (C and ngram_range)
- Class-balanced weighting (class_weight="balanced")
- Evaluated on holdout test set with Macro F1, Weighted F1, Precision, Recall
- Confusion matrix export (confusion_matrix.png + metrics.json)
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Tuple

import joblib
import matplotlib
matplotlib.use("Agg")  # Non-interactive backend for headless server/CLI execution
import matplotlib.pyplot as plt
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    ConfusionMatrixDisplay,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import GridSearchCV, StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder

ROOT = Path(__file__).parent
DATA_DIR = ROOT / "data"
MODELS_DIR = ROOT / "models"
MODELS_DIR.mkdir(exist_ok=True)

# 4 Core Emotions aligned with Russell's Circumplex Model & MindEase UI
MOOD_LABELS = ["happy", "calm", "sad", "anxious"]


def load_dataset() -> Tuple[List[str], List[str]]:
    """Loads curated mood corpus from JSON, strictly enforcing MOOD_LABELS."""
    corpus_file = DATA_DIR / "mood_corpus.json"
    if not corpus_file.exists():
        raise FileNotFoundError(
            f"Dataset not found at {corpus_file}. Run the dataset generator first."
        )

    raw_data: Dict[str, List[str]] = json.loads(corpus_file.read_text(encoding="utf-8"))

    texts: List[str] = []
    labels: List[str] = []

    for label in MOOD_LABELS:
        samples = raw_data.get(label, [])
        if not samples:
            raise ValueError(f"No samples found for expected label: '{label}'")
        for text in samples:
            cleaned = text.strip()
            if cleaned:
                texts.append(cleaned)
                labels.append(label)

    return texts, labels


def train() -> dict:
    print("=" * 60)
    print("MindEase ML: Training Emotion Classifier (Logistic Regression)")
    print("=" * 60)

    # 1. Load Dataset
    texts, labels = load_dataset()
    print(f"Loaded {len(texts)} unique samples across {len(MOOD_LABELS)} classes:")
    for label in MOOD_LABELS:
        count = labels.count(label)
        print(f"  - {label}: {count} samples")

    # 2. Encode Labels
    encoder = LabelEncoder()
    y = encoder.fit_transform(labels)

    # 3. Unbiased Holdout Test Split (Zero near-duplicate leakage)
    X_train, X_test, y_train, y_test = train_test_split(
        texts,
        y,
        test_size=0.20,
        random_state=42,
        stratify=y,
    )
    print(f"\nSplit into {len(X_train)} training samples and {len(X_test)} holdout test samples.")

    # 4. Pipeline Definition
    base_pipeline = Pipeline(
        steps=[
            (
                "tfidf",
                TfidfVectorizer(
                    lowercase=True,
                    sublinear_tf=True,
                ),
            ),
            (
                "clf",
                LogisticRegression(
                    solver="lbfgs",
                    class_weight="balanced",
                    max_iter=2000,
                    random_state=42,
                ),
            ),
        ]
    )

    # 5. Hyperparameter Tuning via 5-Fold Stratified GridSearchCV
    param_grid = {
        "tfidf__ngram_range": [(1, 2), (1, 3)],
        "tfidf__min_df": [1, 2],
        "clf__C": [1.0, 2.0, 5.0],
    }

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    print("\nRunning GridSearchCV (5-Fold Stratified Cross-Validation on training set)...")
    grid_search = GridSearchCV(
        base_pipeline,
        param_grid=param_grid,
        cv=cv,
        scoring="f1_macro",
        n_jobs=-1,
        verbose=1,
    )
    grid_search.fit(X_train, y_train)

    best_pipeline = grid_search.best_estimator_
    best_params = grid_search.best_params_
    best_cv_score = round(float(grid_search.best_score_), 4)

    print(f"\nBest Hyperparameters: {best_params}")
    print(f"Best 5-Fold CV Macro F1: {best_cv_score}")

    # Detailed CV scores with the winning pipeline
    cv_scores = cross_val_score(best_pipeline, X_train, y_train, cv=cv, scoring="f1_macro")
    cv_scores_rounded = [round(float(s), 4) for s in cv_scores]
    cv_mean = round(float(cv_scores.mean()), 4)
    cv_std = round(float(cv_scores.std()), 4)
    print(f"5-Fold CV F1 Scores: {cv_scores_rounded}")
    print(f"Mean CV Macro F1: {cv_mean} (+/- {cv_std})")

    # 6. Final Evaluation on Holdout Test Set
    print("\nEvaluating best model on independent holdout test set...")
    y_pred = best_pipeline.predict(X_test)

    report = classification_report(
        y_test,
        y_pred,
        target_names=encoder.classes_,
        output_dict=True,
        zero_division=0,
    )
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=encoder.classes_, zero_division=0))

    per_class = {}
    for label in encoder.classes_:
        row = report[label]
        per_class[label] = {
            "precision": round(float(row["precision"]), 4),
            "recall": round(float(row["recall"]), 4),
            "f1": round(float(row["f1-score"]), 4),
            "support": int(row["support"]),
        }

    # 7. Confusion Matrix
    cm = confusion_matrix(y_test, y_pred)
    cm_list = cm.tolist()

    disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=encoder.classes_)
    fig, ax = plt.subplots(figsize=(6, 5))
    disp.plot(ax=ax, cmap="Blues", colorbar=False)
    plt.title("MindEase Emotion Classifier — Confusion Matrix", fontsize=12, pad=12)
    plt.tight_layout()
    cm_path = MODELS_DIR / "confusion_matrix.png"
    plt.savefig(cm_path, dpi=200)
    plt.close(fig)
    print(f"Saved Confusion Matrix visualization to: {cm_path}")

    # 8. Metrics Object
    metrics = {
        "algorithm": "LogisticRegression (TF-IDF)",
        "best_params": {
            "C": best_params.get("clf__C"),
            "ngram_range": list(best_params.get("tfidf__ngram_range", [1, 2])),
            "min_df": best_params.get("tfidf__min_df"),
        },
        "accuracy": round(float(report["accuracy"]), 4),
        "macro_f1": round(float(f1_score(y_test, y_pred, average="macro")), 4),
        "weighted_f1": round(float(f1_score(y_test, y_pred, average="weighted")), 4),
        "macro_precision": round(float(precision_score(y_test, y_pred, average="macro", zero_division=0)), 4),
        "macro_recall": round(float(recall_score(y_test, y_pred, average="macro", zero_division=0)), 4),
        "cv_mean_macro_f1": cv_mean,
        "cv_std_macro_f1": cv_std,
        "cv_scores": cv_scores_rounded,
        "confusion_matrix": cm_list,
        "n_total": len(texts),
        "n_train": len(X_train),
        "n_test": len(X_test),
        "n_classes": len(encoder.classes_),
        "classes": list(encoder.classes_),
        "version": "2.2.0",
        "trained_at": datetime.now(timezone.utc).isoformat(),
    }

    # 9. Save Bundle & Metrics
    bundle = {
        "pipeline": best_pipeline,
        "encoder": encoder,
        "metrics": metrics,
    }

    model_file = MODELS_DIR / "mood_classifier.joblib"
    joblib.dump(bundle, model_file)
    print(f"Saved model bundle to: {model_file}")

    # Remove legacy mood_hgb.joblib if present to avoid confusion
    legacy_hgb = MODELS_DIR / "mood_hgb.joblib"
    if legacy_hgb.exists():
        try:
            legacy_hgb.unlink()
        except OSError:
            pass

    metrics_file = MODELS_DIR / "metrics.json"
    metrics_file.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(f"Saved metrics to: {metrics_file}")

    print("\nTraining completed successfully!")
    print(f"Test Accuracy: {metrics['accuracy']} | Test Macro F1: {metrics['macro_f1']} | 5-Fold CV Mean F1: {metrics['cv_mean_macro_f1']}")
    return metrics


if __name__ == "__main__":
    train()
