"""
PortFlow AI — Waiting-time regression evaluation script.

SYNOPSIS
--------
    python -m ml.waiting_evaluate          # from src/

REPORTS
-------
- MAE, RMSE, R2 on test split
- Median-baseline comparison
- Synthetic data limitations
"""

from __future__ import annotations

import sys
from pathlib import Path

_SRC = Path(__file__).resolve().parent.parent
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

import joblib
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from ml.waiting_dataset import build_default_dataset
from ml.waiting_features import ALL_FEATURE_NAMES, chronological_split, rows_to_arrays

ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"


def evaluate() -> None:
    print("=" * 60)
    print("PortFlow AI - Waiting-Time Regression Evaluation")
    print("WARNING: SYNTHETIC DATA ONLY - results are illustrative")
    print("=" * 60)

    pipeline_path = ARTIFACTS_DIR / "waiting_pipeline.joblib"
    if not pipeline_path.exists():
        print(f"\nPipeline not found: {pipeline_path}")
        print("Run: python -m ml.waiting_train")
        sys.exit(1)

    pipeline = joblib.load(pipeline_path)
    print(f"\nLoaded: {pipeline_path}")

    rows = build_default_dataset()
    train_rows, _, test_rows = chronological_split(rows)

    if not test_rows:
        print("Test split is empty.")
        sys.exit(1)

    X_test_d, y_test = rows_to_arrays(test_rows)
    _, y_train = rows_to_arrays(train_rows)

    import pandas as pd
    X_test = pd.DataFrame(X_test_d, columns=ALL_FEATURE_NAMES)
    y_pred = pipeline.predict(X_test)
    y_pred_clipped = [max(0.0, p) for p in y_pred]

    mae  = float(mean_absolute_error(y_test, y_pred_clipped))
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred_clipped)))
    r2   = float(r2_score(y_test, y_pred_clipped)) if len(y_test) > 1 else 0.0

    median_pred = [float(np.median(y_train))] * len(y_test)
    baseline_mae = float(mean_absolute_error(y_test, median_pred))

    print(f"\n  Test rows     : {len(y_test)}")
    print(f"  MAE           : {mae:.4f} h")
    print(f"  RMSE          : {rmse:.4f} h")
    print(f"  R2            : {r2:.4f}")
    print(f"  Baseline MAE  : {baseline_mae:.4f} h  (median-of-train)")
    diff = baseline_mae - mae
    direction = "better" if diff > 0.01 else ("worse" if diff < -0.01 else "similar")
    print(f"  vs baseline   : {diff:+.4f} h ({direction})")

    print("\nWARNING: ~44 synthetic rows — metrics are illustrative only.")
    print("Not validated for real-world port operations.")
    print("=" * 60)


if __name__ == "__main__":
    evaluate()
