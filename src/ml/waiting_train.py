"""
PortFlow AI — Waiting-time regression training script.

SYNOPSIS
--------
    python -m ml.waiting_train          # from src/

WHAT IT DOES
------------
1. Builds the synthetic dataset (WaitingDataset from SyntheticDataset seed=2026).
2. Extracts features; derives target from (berth_start - actual_arrival).
3. Chronological split 70/15/15.
4. Trains sklearn Pipeline:
       SimpleImputer(mean) + OneHotEncoder + RandomForestRegressor
5. Saves pipeline to src/ml/artifacts/waiting_pipeline.joblib.
6. Saves metadata to src/ml/artifacts/waiting_metadata.json.

LIMITATIONS
-----------
- Synthetic data only (~44 rows).
- Metrics are illustrative only.
- No real-world accuracy claims.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

_SRC = Path(__file__).resolve().parent.parent
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

import joblib
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from ml.waiting_dataset import FORBIDDEN_COLUMNS, build_default_dataset
from ml.waiting_features import (
    ALL_FEATURE_NAMES,
    CATEGORICAL_FEATURES,
    NUMERIC_FEATURES,
    TARGET_COLUMN,
    chronological_split,
    rows_to_arrays,
)

ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"
MODEL_VERSION = "waiting_rf_v1"
RANDOM_STATE = 2026


def build_pipeline() -> Pipeline:
    numeric_tf = SimpleImputer(strategy="mean")
    categorical_tf = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])
    preprocessor = ColumnTransformer([
        ("num", numeric_tf, NUMERIC_FEATURES),
        ("cat", categorical_tf, CATEGORICAL_FEATURES),
    ], remainder="drop")
    return Pipeline([
        ("preprocessor", preprocessor),
        ("regressor", RandomForestRegressor(
            n_estimators=100,
            max_depth=8,
            random_state=RANDOM_STATE,
        )),
    ])


def _median_baseline(y_train: list[float], y_test: list[float]) -> float:
    """Median-of-training-set baseline MAE on test set."""
    median_val = float(np.median(y_train)) if y_train else 0.0
    preds = [median_val] * len(y_test)
    return float(mean_absolute_error(y_test, preds))


def train(save: bool = True) -> dict:
    print("=" * 60)
    print("PortFlow AI - Waiting-Time Regression Training")
    print("WARNING: SYNTHETIC DATA ONLY - results are illustrative")
    print("=" * 60)

    print("\n[1/5] Building dataset ...")
    rows = build_default_dataset()
    print(f"      {len(rows)} rows  |  target: {TARGET_COLUMN}")
    targets = [r.actual_waiting_hours for r in rows]
    print(f"      wait range: {min(targets):.2f} - {max(targets):.2f} h  "
          f"(mean {float(np.mean(targets)):.2f} h)")

    print("\n[2/5] Chronological split (70/15/15) ...")
    train_rows, val_rows, test_rows = chronological_split(rows)
    print(f"      train={len(train_rows)}  val={len(val_rows)}  test={len(test_rows)}")

    print("\n[3/5] Extracting features ...")
    X_train_d, y_train = rows_to_arrays(train_rows)
    X_val_d, y_val = rows_to_arrays(val_rows)
    X_test_d, y_test = rows_to_arrays(test_rows)

    import pandas as pd
    X_train = pd.DataFrame(X_train_d, columns=ALL_FEATURE_NAMES)
    X_val   = pd.DataFrame(X_val_d,   columns=ALL_FEATURE_NAMES)
    X_test  = pd.DataFrame(X_test_d,  columns=ALL_FEATURE_NAMES)

    print("\n[4/5] Training RandomForestRegressor ...")
    pipeline = build_pipeline()
    pipeline.fit(X_train, y_train)

    y_val_pred  = pipeline.predict(X_val)
    y_test_pred = pipeline.predict(X_test)

    val_mae  = float(mean_absolute_error(y_val,  y_val_pred))
    test_mae = float(mean_absolute_error(y_test, y_test_pred))
    test_rmse = float(np.sqrt(mean_squared_error(y_test, y_test_pred)))
    test_r2   = float(r2_score(y_test, y_test_pred)) if len(y_test) > 1 else 0.0

    baseline_mae = _median_baseline(y_train, y_test)

    print(f"      Val  MAE  = {val_mae:.4f} h")
    print(f"      Test MAE  = {test_mae:.4f} h")
    print(f"      Test RMSE = {test_rmse:.4f} h")
    print(f"      Test R2   = {test_r2:.4f}")
    print(f"      Baseline (median) MAE = {baseline_mae:.4f} h")

    train_start = train_rows[0].arrival_time.isoformat() if train_rows else ""
    train_end   = train_rows[-1].arrival_time.isoformat() if train_rows else ""
    test_start  = test_rows[0].arrival_time.isoformat()  if test_rows  else ""
    test_end    = test_rows[-1].arrival_time.isoformat()  if test_rows  else ""

    metadata = {
        "model_version": MODEL_VERSION,
        "data_source": "synthetic",
        "data_seed": 2026,
        "target_column": TARGET_COLUMN,
        "target_derivation": "berth_start - actual_arrival (seconds / 3600)",
        "feature_names": ALL_FEATURE_NAMES,
        "forbidden_columns": sorted(FORBIDDEN_COLUMNS),
        "train_rows": len(train_rows),
        "val_rows": len(val_rows),
        "test_rows": len(test_rows),
        "train_time_range": {"start": train_start, "end": train_end},
        "test_time_range":  {"start": test_start,  "end": test_end},
        "metrics": {
            "val_mae_hours":      round(val_mae,      4),
            "test_mae_hours":     round(test_mae,     4),
            "test_rmse_hours":    round(test_rmse,    4),
            "test_r2":            round(test_r2,      4),
            "baseline_median_mae_hours": round(baseline_mae, 4),
        },
        "limitations": [
            "Synthetic data only (~44 rows); metrics are illustrative.",
            "Not validated for real-world port operations.",
            "baseline_rule_v1 remains the API production estimate.",
        ],
        "random_state": RANDOM_STATE,
    }

    if save:
        ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
        pipeline_path = ARTIFACTS_DIR / "waiting_pipeline.joblib"
        meta_path     = ARTIFACTS_DIR / "waiting_metadata.json"
        joblib.dump(pipeline, pipeline_path)
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)
        print(f"\n[5/5] Saved: {pipeline_path}")
        print(f"      Saved: {meta_path}")

    print("\nWARNING: SYNTHETIC DATA - not validated for real-world operations")
    print("=" * 60)
    return metadata


if __name__ == "__main__":
    train(save=True)
