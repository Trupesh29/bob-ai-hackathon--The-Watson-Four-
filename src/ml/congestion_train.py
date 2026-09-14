"""
PortFlow AI — Congestion classifier training script.

SYNOPSIS
--------
    python -m ml.congestion_train          # from src/

WHAT IT DOES
------------
1. Builds the synthetic dataset from SyntheticDataset(seed=2026).
2. Extracts features using congestion_features.rows_to_arrays().
3. Performs a chronological train/val/test split (70/15/15).
4. Trains a scikit-learn Pipeline:
       SimpleImputer (mean) → OneHotEncoder (scenario) → RandomForestClassifier
5. Evaluates on the validation set during training.
6. Saves the fitted pipeline to src/ml/artifacts/congestion_pipeline.joblib.
7. Saves metadata to src/ml/artifacts/metadata.json.

OUTPUT
------
  src/ml/artifacts/congestion_pipeline.joblib   — complete fitted Pipeline
  src/ml/artifacts/metadata.json               — model version, features, metrics

LIMITATIONS (honest disclosure)
--------------------------------
- Uses synthetic data only (data_source: "synthetic").
- Small dataset (~40–60 rows); metrics are illustrative, not production-grade.
- No hyperparameter search.
- No real-world accuracy claims are made or implied.

DETERMINISM
-----------
RandomForestClassifier is seeded with random_state=2026.
SyntheticDataset uses seed=2026.
Given the same code and seed, output is identical across runs.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

# ── Ensure src/ is on sys.path when run as python -m ml.congestion_train ──────
_SRC = Path(__file__).resolve().parent.parent  # src/
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

import joblib
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    f1_score,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from ml.congestion_dataset import build_default_dataset, FORBIDDEN_COLUMNS
from ml.congestion_features import (
    ALL_FEATURE_NAMES,
    CATEGORICAL_FEATURES,
    LABEL_COLUMN,
    NUMERIC_FEATURES,
    VALID_LABELS,
    chronological_split,
    rows_to_arrays,
)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
MODEL_VERSION = "congestion_rf_v1"
RANDOM_STATE = 2026
ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"


# ---------------------------------------------------------------------------
# Build sklearn Pipeline
# ---------------------------------------------------------------------------

def build_pipeline() -> Pipeline:
    """
    Construct the scikit-learn Pipeline.

    Transformers:
      - numeric columns: SimpleImputer(strategy="mean")
      - scenario (categorical): OneHotEncoder(handle_unknown="ignore")

    Classifier:
      - RandomForestClassifier(n_estimators=100, random_state=RANDOM_STATE)
    """
    numeric_transformer = SimpleImputer(strategy="mean")

    categorical_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ]
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, NUMERIC_FEATURES),
            ("cat", categorical_transformer, CATEGORICAL_FEATURES),
        ],
        remainder="drop",
    )

    pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            (
                "classifier",
                RandomForestClassifier(
                    n_estimators=100,
                    max_depth=8,
                    random_state=RANDOM_STATE,
                    class_weight="balanced",
                ),
            ),
        ]
    )
    return pipeline


# ---------------------------------------------------------------------------
# Convert feature dicts to DataFrame-like arrays for ColumnTransformer
# ---------------------------------------------------------------------------

def _dicts_to_matrix(X_dicts: list[dict]) -> "pd.DataFrame":  # type: ignore[name-defined]
    """
    Convert list of feature dicts to a pandas DataFrame.
    ColumnTransformer requires named columns.
    """
    import pandas as pd  # lazy import; pandas is available via sklearn dep

    return pd.DataFrame(X_dicts, columns=ALL_FEATURE_NAMES)


# ---------------------------------------------------------------------------
# Main training routine
# ---------------------------------------------------------------------------

def train(save: bool = True) -> dict:
    """
    Build dataset, train the pipeline, evaluate on val/test, and save artefacts.

    Parameters
    ----------
    save : bool
        If True, save the pipeline and metadata to artifacts/.

    Returns
    -------
    dict
        Metadata dict that was (or would be) written to metadata.json.
    """
    print("=" * 60)
    print("PortFlow AI — Congestion Classifier Training")
    print("⚠  SYNTHETIC DATA ONLY — results are illustrative")
    print("=" * 60)

    # 1. Build dataset
    print("\n[1/5] Building synthetic dataset …")
    rows = build_default_dataset()
    print(f"      {len(rows)} windows generated")

    label_counts: dict[str, int] = {}
    for r in rows:
        label_counts[r.risk_label] = label_counts.get(r.risk_label, 0) + 1
    for lbl in VALID_LABELS:
        print(f"      {lbl:8s}: {label_counts.get(lbl, 0)} rows")

    # 2. Chronological split
    print("\n[2/5] Chronological split (70/15/15) …")
    train_rows, val_rows, test_rows = chronological_split(rows)
    print(f"      train={len(train_rows)}  val={len(val_rows)}  test={len(test_rows)}")

    # 3. Feature extraction
    print("\n[3/5] Extracting features …")
    X_train_d, y_train = rows_to_arrays(train_rows)
    X_val_d, y_val = rows_to_arrays(val_rows)
    X_test_d, y_test = rows_to_arrays(test_rows)

    X_train = _dicts_to_matrix(X_train_d)
    X_val = _dicts_to_matrix(X_val_d)
    X_test = _dicts_to_matrix(X_test_d)

    # 4. Train
    print("\n[4/5] Training RandomForestClassifier …")
    pipeline = build_pipeline()
    pipeline.fit(X_train, y_train)

    # Validation metrics
    y_val_pred = pipeline.predict(X_val)
    val_f1 = f1_score(y_val, y_val_pred, average="macro", zero_division=0)
    val_report = classification_report(
        y_val, y_val_pred, labels=VALID_LABELS, zero_division=0
    )
    print(f"      Validation macro-F1 = {val_f1:.3f}")
    print(val_report)

    # Test metrics
    y_test_pred = pipeline.predict(X_test)
    test_f1 = f1_score(y_test, y_test_pred, average="macro", zero_division=0)
    test_report = classification_report(
        y_test, y_test_pred, labels=VALID_LABELS, zero_division=0
    )

    # Per-class recall on HIGH and MEDIUM (critical operational classes)
    from sklearn.metrics import recall_score
    high_recall_val = recall_score(
        y_val, y_val_pred, labels=["HIGH"], average="macro", zero_division=0
    )
    medium_recall_val = recall_score(
        y_val, y_val_pred, labels=["MEDIUM"], average="macro", zero_division=0
    )

    # Confusion matrix
    cm = confusion_matrix(y_test, y_test_pred, labels=VALID_LABELS).tolist()

    # Training time range
    train_start = train_rows[0].window_start.isoformat() if train_rows else ""
    train_end = train_rows[-1].window_end.isoformat() if train_rows else ""
    test_start = test_rows[0].window_start.isoformat() if test_rows else ""
    test_end = test_rows[-1].window_end.isoformat() if test_rows else ""

    # 5. Save
    metadata = {
        "model_version": MODEL_VERSION,
        "data_source": "synthetic",
        "data_seed": 2026,
        "feature_names": ALL_FEATURE_NAMES,
        "label_classes": VALID_LABELS,
        "forbidden_columns": sorted(FORBIDDEN_COLUMNS),
        "train_rows": len(train_rows),
        "val_rows": len(val_rows),
        "test_rows": len(test_rows),
        "train_time_range": {"start": train_start, "end": train_end},
        "test_time_range": {"start": test_start, "end": test_end},
        "metrics": {
            "val_macro_f1": round(val_f1, 4),
            "val_high_recall": round(high_recall_val, 4),
            "val_medium_recall": round(medium_recall_val, 4),
            "test_macro_f1": round(test_f1, 4),
            "confusion_matrix_test": cm,
            "confusion_matrix_labels": VALID_LABELS,
        },
        "limitations": [
            "Trained on synthetic data only; no real-world accuracy claims.",
            "Small dataset (~40-60 rows); metrics are illustrative.",
            "baseline_rule_v1 remains the production fallback.",
        ],
        "random_state": RANDOM_STATE,
    }

    if save:
        ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
        pipeline_path = ARTIFACTS_DIR / "congestion_pipeline.joblib"
        meta_path = ARTIFACTS_DIR / "metadata.json"

        joblib.dump(pipeline, pipeline_path)
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

        print(f"\n[5/5] Saved artefacts:")
        print(f"      {pipeline_path}")
        print(f"      {meta_path}")

    print("\n⚠  SYNTHETIC DATA — not validated on real-world port operations")
    print("=" * 60)
    return metadata


if __name__ == "__main__":
    train(save=True)
