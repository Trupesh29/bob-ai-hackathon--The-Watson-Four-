"""
PortFlow AI — Feature engineering for the congestion ML classifier.

PURPOSE
-------
Converts CongestionWindowRow instances into a numpy/pandas-compatible
feature matrix and label vector for use by scikit-learn pipelines.

FEATURE COLUMNS (all pre-window, no leakage)
--------------------------------------------
Numeric:
  arrivals_in_window        — scheduled vessel count in the 6-hour bucket
  raw_occupancy             — arrivals / berth_count
  avg_expected_containers   — average container moves per arriving vessel
  crane_to_berth_ratio      — operational cranes / operational berths
  priority_min              — lowest priority integer (1 = highest urgency)
  hour_of_day               — UTC hour of bucket start (0, 6, 12, 18)
  day_of_week               — weekday of bucket start (0=Mon … 6=Sun)

Categorical:
  scenario                  — one of the 5 synthetic scenario names

FORBIDDEN COLUMNS
-----------------
See congestion_dataset.FORBIDDEN_COLUMNS.  Any attempt to include a
forbidden column raises ValueError.

LIMITATIONS
-----------
Synthetic data only; not statistically validated for real-world use.
"""

from __future__ import annotations

from typing import List, Tuple

import numpy as np

from .congestion_dataset import CongestionWindowRow, FORBIDDEN_COLUMNS

# ---------------------------------------------------------------------------
# Column definitions
# ---------------------------------------------------------------------------

NUMERIC_FEATURES: List[str] = [
    "arrivals_in_window",
    "raw_occupancy",
    "avg_expected_containers",
    "crane_to_berth_ratio",
    "priority_min",
    "hour_of_day",
    "day_of_week",
]

CATEGORICAL_FEATURES: List[str] = [
    "scenario",
]

ALL_FEATURE_NAMES: List[str] = NUMERIC_FEATURES + CATEGORICAL_FEATURES

LABEL_COLUMN: str = "risk_label"

VALID_LABELS: List[str] = ["LOW", "MEDIUM", "HIGH"]


def _check_no_leakage(column_names: List[str]) -> None:
    """
    Raise ValueError if any forbidden (leakage) column is in column_names.
    Called at feature extraction time as a safety guard.
    """
    bad = [c for c in column_names if c in FORBIDDEN_COLUMNS]
    if bad:
        raise ValueError(
            f"Leakage guard: forbidden column(s) used as features: {bad}. "
            "These columns represent future outcome data and must never be "
            "used as model inputs."
        )


def rows_to_arrays(
    rows: List[CongestionWindowRow],
) -> Tuple[List[dict], List[str]]:
    """
    Convert a list of CongestionWindowRow instances into:
      - X_dicts: list of feature dicts (compatible with DictVectorizer / Pipeline)
      - y: list of string labels ("LOW", "MEDIUM", "HIGH")

    Raises ValueError if forbidden columns are detected.

    Returns
    -------
    X_dicts : list[dict]
        One dict per row; keys are ALL_FEATURE_NAMES.
    y : list[str]
        Parallel list of risk labels.
    """
    _check_no_leakage(ALL_FEATURE_NAMES)

    X_dicts: List[dict] = []
    y: List[str] = []

    for row in rows:
        feat = {
            "arrivals_in_window": row.arrivals_in_window,
            "raw_occupancy": row.raw_occupancy,
            "avg_expected_containers": row.avg_expected_containers,
            "crane_to_berth_ratio": row.crane_to_berth_ratio,
            "priority_min": row.priority_min,
            "hour_of_day": row.hour_of_day,
            "day_of_week": row.day_of_week,
            "scenario": row.scenario,
        }
        X_dicts.append(feat)
        y.append(row.risk_label)

    return X_dicts, y


def chronological_split(
    rows: List[CongestionWindowRow],
    train_frac: float = 0.70,
    val_frac: float = 0.15,
) -> Tuple[
    List[CongestionWindowRow],
    List[CongestionWindowRow],
    List[CongestionWindowRow],
]:
    """
    Split rows into train / validation / test by chronological order.

    Rows MUST already be sorted by window_start (CongestionDatasetBuilder
    returns them sorted).  The split is positional — no shuffling — to
    preserve temporal ordering and prevent data leakage across time.

    Parameters
    ----------
    rows : list[CongestionWindowRow]
        Chronologically sorted dataset rows.
    train_frac : float
        Fraction of rows assigned to training set (default 0.70).
    val_frac : float
        Fraction of rows assigned to validation set (default 0.15).
        Test fraction = 1 - train_frac - val_frac.

    Returns
    -------
    train, val, test : tuple of lists
    """
    n = len(rows)
    n_train = int(n * train_frac)
    n_val = int(n * val_frac)
    train = rows[:n_train]
    val = rows[n_train : n_train + n_val]
    test = rows[n_train + n_val :]
    return train, val, test
