"""
PortFlow AI — Congestion classifier prediction interface.

PURPOSE
-------
Loads the saved Pipeline artefact and exposes a predict() function that
returns label + probability for a given 6-hour window feature dict.

All predictions include an explicit synthetic-data disclaimer.

USAGE
-----
    from ml.congestion_predict import CongestionPredictor

    predictor = CongestionPredictor()         # loads saved artefact
    result = predictor.predict({
        "arrivals_in_window": 3,
        "raw_occupancy": 1.0,
        "avg_expected_containers": 420.0,
        "crane_to_berth_ratio": 2.333,
        "priority_min": 2,
        "hour_of_day": 6,
        "day_of_week": 0,
        "scenario": "baseline",
    })
    # result.label in ("LOW", "MEDIUM", "HIGH")
    # 0.0 <= result.probability <= 1.0

LIMITATIONS
-----------
- Synthetic data only.
- The model is NOT suitable for real-world operational decisions.
- baseline_rule_v1 remains the production fallback.
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
DEFAULT_PIPELINE_PATH = ARTIFACTS_DIR / "congestion_pipeline.joblib"

VALID_LABELS = ["LOW", "MEDIUM", "HIGH"]


@dataclass
class PredictionResult:
    """Result of a single congestion window prediction."""
    label: str              # "LOW", "MEDIUM", or "HIGH"
    probability: float      # probability of the predicted class (0.0–1.0)
    all_probabilities: dict[str, float]  # {label: probability} for all classes
    model_version: str
    is_synthetic: bool = True
    calculation_method: str = "congestion_rf_v1"
    disclaimer: str = (
        "Trained on synthetic data only. "
        "Not validated for real-world port operations."
    )


class CongestionPredictor:
    """
    Loads the saved congestion pipeline and predicts risk labels.

    Parameters
    ----------
    pipeline_path : Path, optional
        Path to the saved joblib pipeline.  Defaults to the standard
        artifacts/ location.
    """

    def __init__(self, pipeline_path: Optional[Path] = None) -> None:
        import joblib

        path = pipeline_path or DEFAULT_PIPELINE_PATH
        if not path.exists():
            raise FileNotFoundError(
                f"Model artefact not found at {path}. "
                "Run: python -m ml.congestion_train"
            )
        self._pipeline = joblib.load(path)
        self._model_version = "congestion_rf_v1"

    def predict(self, feature_dict: dict) -> PredictionResult:
        """
        Predict congestion risk for one 6-hour window.

        Parameters
        ----------
        feature_dict : dict
            Keys must match ALL_FEATURE_NAMES from congestion_features.

        Returns
        -------
        PredictionResult
        """
        import pandas as pd
        from ml.congestion_features import ALL_FEATURE_NAMES, FORBIDDEN_COLUMNS

        # Leakage guard
        bad = [k for k in feature_dict if k in FORBIDDEN_COLUMNS]
        if bad:
            raise ValueError(
                f"Leakage guard: forbidden column(s) in feature_dict: {bad}"
            )

        df = pd.DataFrame([feature_dict], columns=ALL_FEATURE_NAMES)
        label = self._pipeline.predict(df)[0]
        proba_array = self._pipeline.predict_proba(df)[0]
        classes = list(self._pipeline.classes_)
        all_probs = {
            cls: round(float(p), 4)
            for cls, p in zip(classes, proba_array)
        }
        label_prob = all_probs.get(label, 0.0)

        return PredictionResult(
            label=str(label),
            probability=round(label_prob, 4),
            all_probabilities=all_probs,
            model_version=self._model_version,
        )

    def predict_batch(self, feature_dicts: list[dict]) -> list[PredictionResult]:
        """
        Predict congestion risk for multiple windows.

        Parameters
        ----------
        feature_dicts : list[dict]
            Each dict must match ALL_FEATURE_NAMES.

        Returns
        -------
        list[PredictionResult]
        """
        return [self.predict(fd) for fd in feature_dicts]
