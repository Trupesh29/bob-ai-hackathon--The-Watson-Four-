"""
PortFlow AI — Waiting-time regression prediction interface.

USAGE
-----
    from ml.waiting_predict import WaitingPredictor

    p = WaitingPredictor()
    result = p.predict({
        "length_m": 200.0, "draft_m": 10.0, "capacity_teu": 4000,
        "expected_containers": 350, "priority": 2,
        "eta_hour": 8, "day_of_week": 0,
        "queue_at_arrival": 1, "compatible_berth_count": 2,
        "total_berths": 3, "total_cranes": 7,
        "cargo_type": "containerised", "scenario": "baseline",
    })
    # result.predicted_waiting_hours >= 0.0

LIMITATIONS
-----------
Synthetic data only. Not validated for real-world use.
"""

from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

_SRC = Path(__file__).resolve().parent.parent
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"
DEFAULT_PIPELINE_PATH = ARTIFACTS_DIR / "waiting_pipeline.joblib"


@dataclass
class WaitingPrediction:
    predicted_waiting_hours: float
    model_version: str
    data_source: str = "synthetic"
    method: str = "waiting_rf_v1"
    uncertainty_note: str = (
        "Point estimate only. No confidence interval. "
        "Trained on ~44 synthetic rows — high uncertainty."
    )
    is_synthetic: bool = True
    limitations: str = (
        "Synthetic data only. Not validated for real-world port operations."
    )


class WaitingPredictor:
    """Loads the saved waiting-time pipeline and predicts waiting hours."""

    def __init__(self, pipeline_path: Optional[Path] = None) -> None:
        import joblib
        path = pipeline_path or DEFAULT_PIPELINE_PATH
        if not path.exists():
            raise FileNotFoundError(
                f"Artifact not found: {path}. "
                "Run: python -m ml.waiting_train"
            )
        self._pipeline = joblib.load(path)
        self._model_version = "waiting_rf_v1"

    def predict(self, feature_dict: dict) -> WaitingPrediction:
        import pandas as pd
        from ml.waiting_features import ALL_FEATURE_NAMES, FORBIDDEN_COLUMNS

        bad = [k for k in feature_dict if k in FORBIDDEN_COLUMNS]
        if bad:
            raise ValueError(f"Leakage guard: forbidden column(s): {bad}")

        df = pd.DataFrame([feature_dict], columns=ALL_FEATURE_NAMES)
        raw = float(self._pipeline.predict(df)[0])
        predicted = max(0.0, round(raw, 4))

        return WaitingPrediction(
            predicted_waiting_hours=predicted,
            model_version=self._model_version,
        )
