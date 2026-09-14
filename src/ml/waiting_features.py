"""
PortFlow AI — Feature engineering for the waiting-time regression model.

FEATURE COLUMNS (all at-arrival, no leakage)
--------------------------------------------
Numeric:
  length_m               — vessel length in metres
  draft_m                — vessel draft in metres
  capacity_teu           — vessel TEU capacity
  expected_containers    — planned crane moves for this call
  priority               — scheduling priority (1=highest, 5=lowest)
  eta_hour               — UTC hour of arrival (0–23)
  day_of_week            — weekday of arrival (0=Mon, 6=Sun)
  queue_at_arrival       — vessels with earlier ETA in same scenario
  compatible_berth_count — berths physically fitting this vessel
  total_berths           — total berths in port
  total_cranes           — total operational cranes in port

Categorical:
  cargo_type             — "containerised" (one value in synthetic data)
  scenario               — baseline / arrival_surge / crane_outage / etc.

TARGET: actual_waiting_hours (regression, non-negative)

FORBIDDEN COLUMNS
-----------------
See waiting_dataset.FORBIDDEN_COLUMNS.
"""

from __future__ import annotations

from typing import List, Tuple

from .waiting_dataset import FORBIDDEN_COLUMNS, WaitingRow

NUMERIC_FEATURES: List[str] = [
    "length_m",
    "draft_m",
    "capacity_teu",
    "expected_containers",
    "priority",
    "eta_hour",
    "day_of_week",
    "queue_at_arrival",
    "compatible_berth_count",
    "total_berths",
    "total_cranes",
]

CATEGORICAL_FEATURES: List[str] = [
    "cargo_type",
    "scenario",
]

ALL_FEATURE_NAMES: List[str] = NUMERIC_FEATURES + CATEGORICAL_FEATURES

TARGET_COLUMN: str = "actual_waiting_hours"


def _check_no_leakage(column_names: List[str]) -> None:
    bad = [c for c in column_names if c in FORBIDDEN_COLUMNS]
    if bad:
        raise ValueError(
            f"Leakage guard: forbidden column(s) requested as features: {bad}. "
            "These represent future outcome data."
        )


def rows_to_arrays(
    rows: List[WaitingRow],
) -> Tuple[List[dict], List[float]]:
    """
    Convert WaitingRow list to (X_dicts, y).

    X_dicts: list of feature dicts with keys == ALL_FEATURE_NAMES
    y:       list of actual_waiting_hours (float, non-negative)
    """
    _check_no_leakage(ALL_FEATURE_NAMES)

    X: List[dict] = []
    y: List[float] = []

    for row in rows:
        X.append({
            "length_m": row.length_m,
            "draft_m": row.draft_m,
            "capacity_teu": row.capacity_teu,
            "expected_containers": row.expected_containers,
            "priority": row.priority,
            "eta_hour": row.eta_hour,
            "day_of_week": row.day_of_week,
            "queue_at_arrival": row.queue_at_arrival,
            "compatible_berth_count": row.compatible_berth_count,
            "total_berths": row.total_berths,
            "total_cranes": row.total_cranes,
            "cargo_type": row.cargo_type,
            "scenario": row.scenario,
        })
        y.append(row.actual_waiting_hours)

    return X, y


def chronological_split(
    rows: List[WaitingRow],
    train_frac: float = 0.70,
    val_frac: float = 0.15,
) -> Tuple[List[WaitingRow], List[WaitingRow], List[WaitingRow]]:
    """
    Split rows into train / val / test by arrival_time order (no shuffle).

    The rows must already be sorted chronologically (WaitingDatasetBuilder
    guarantees this).
    """
    n = len(rows)
    n_train = int(n * train_frac)
    n_val = int(n * val_frac)
    return rows[:n_train], rows[n_train:n_train + n_val], rows[n_train + n_val:]
