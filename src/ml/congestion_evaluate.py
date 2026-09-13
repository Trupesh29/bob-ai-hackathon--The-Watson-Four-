"""
PortFlow AI — Congestion classifier evaluation script.

SYNOPSIS
--------
    python -m ml.congestion_evaluate          # from src/

WHAT IT DOES
------------
1. Loads the saved pipeline from artifacts/congestion_pipeline.joblib.
2. Rebuilds the dataset from SyntheticDataset(seed=2026).
3. Applies the same chronological split.
4. Evaluates on the held-out test split.
5. Compares against the baseline_rule_v1 rule heuristic.
6. Reports:
     - macro F1
     - HIGH recall (critical class)
     - MEDIUM recall
     - confusion matrix
     - baseline_rule_v1 comparison

LIMITATIONS (honest disclosure)
--------------------------------
- Synthetic data only; no real-world accuracy claims.
- Small dataset; results are illustrative.
- baseline_rule_v1 is the intended production fallback.
"""

from __future__ import annotations

import sys
from pathlib import Path

_SRC = Path(__file__).resolve().parent.parent
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

import joblib
import numpy as np
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    f1_score,
    recall_score,
)

from ml.congestion_dataset import build_default_dataset, _risk_label
from ml.congestion_features import (
    ALL_FEATURE_NAMES,
    VALID_LABELS,
    chronological_split,
    rows_to_arrays,
)

ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"


def _baseline_predict(rows) -> list[str]:
    """
    Predict risk labels using the baseline_rule_v1 occupancy heuristic.
    This uses ONLY the pre-window raw_occupancy feature (no leakage).
    """
    return [_risk_label(r.raw_occupancy) for r in rows]


def evaluate() -> None:
    """Load the saved pipeline and evaluate on the held-out test set."""
    print("=" * 60)
    print("PortFlow AI — Congestion Classifier Evaluation")
    print("⚠  SYNTHETIC DATA ONLY — results are illustrative")
    print("=" * 60)

    pipeline_path = ARTIFACTS_DIR / "congestion_pipeline.joblib"
    if not pipeline_path.exists():
        print(f"\n✗ Pipeline not found at {pipeline_path}")
        print("  Run: python -m ml.congestion_train")
        sys.exit(1)

    # Load
    pipeline = joblib.load(pipeline_path)
    print(f"\nLoaded: {pipeline_path}")

    # Rebuild dataset
    print("\n[1/3] Rebuilding synthetic dataset …")
    rows = build_default_dataset()
    _, _, test_rows = chronological_split(rows)
    print(f"      Test split: {len(test_rows)} rows")

    if not test_rows:
        print("✗ Test split is empty — cannot evaluate.")
        sys.exit(1)

    # Extract features
    print("\n[2/3] Extracting features …")
    X_test_d, y_test = rows_to_arrays(test_rows)

    import pandas as pd
    X_test = pd.DataFrame(X_test_d, columns=ALL_FEATURE_NAMES)

    # ML predictions
    print("\n[3/3] Evaluating …")
    y_pred = pipeline.predict(X_test)

    ml_f1 = f1_score(y_test, y_pred, average="macro", zero_division=0)
    ml_high_recall = recall_score(
        y_test, y_pred, labels=["HIGH"], average="macro", zero_division=0
    )
    ml_medium_recall = recall_score(
        y_test, y_pred, labels=["MEDIUM"], average="macro", zero_division=0
    )
    cm = confusion_matrix(y_test, y_pred, labels=VALID_LABELS)

    # Baseline comparison
    y_baseline = _baseline_predict(test_rows)
    base_f1 = f1_score(y_test, y_baseline, average="macro", zero_division=0)

    # Report
    print("\n── ML Classifier (congestion_rf_v1) ──────────────────────────")
    print(f"  Macro F1              : {ml_f1:.3f}")
    print(f"  HIGH recall           : {ml_high_recall:.3f}")
    print(f"  MEDIUM recall         : {ml_medium_recall:.3f}")
    print()
    print(classification_report(y_test, y_pred, labels=VALID_LABELS, zero_division=0))

    print("── Confusion Matrix (ML) ─────────────────────────────────────")
    print(f"  Labels: {VALID_LABELS}")
    print(f"  {cm}")

    print("\n── Baseline comparison (baseline_rule_v1) ────────────────────")
    print(f"  baseline_rule_v1 macro F1  : {base_f1:.3f}")
    print(f"  congestion_rf_v1 macro F1  : {ml_f1:.3f}")
    diff = ml_f1 - base_f1
    direction = "↑ better" if diff > 0.01 else ("↓ worse" if diff < -0.01 else "≈ similar")
    print(f"  Difference                 : {diff:+.3f}  ({direction})")

    print("\n⚠  SYNTHETIC DATA LIMITATIONS:")
    print("   • Dataset contains ~40–60 rows — metrics are illustrative only.")
    print("   • Not validated for real-world port operations.")
    print("   • baseline_rule_v1 remains the production fallback.")
    print("=" * 60)


if __name__ == "__main__":
    evaluate()
