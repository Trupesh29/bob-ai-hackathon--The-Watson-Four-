"""
PortFlow AI — Congestion ML dataset builder.

PURPOSE
-------
Builds a flat, tabular dataset of one row per port per six-hour historical
window from the PortFlow synthetic data generator.  This dataset is used to
train and evaluate the congestion classifier.

FEATURE LEAKAGE POLICY
-----------------------
FORBIDDEN columns — NEVER used as features:
  - actual_arrival, berth_start, berth_end, actual_departure  (future outcome data)
  - waiting_minutes                                             (target leakage)
  - service_minutes                                             (future outcome data)
  - cranes_used (actual)                                        (future assignment data)
  - any optimizer output or plan assignment data

Only columns known BEFORE the prediction window are permitted.

DATA SOURCE
-----------
All data is synthetic (is_synthetic=True).  Generated deterministically
from SyntheticDataset(seed=2026).  No real port or vessel data is used.

LIMITATIONS (honest disclosure)
--------------------------------
- Synthetic data only; no real-world accuracy claims.
- Small dataset (~40–60 rows across 5 scenarios); results are illustrative.
- Chronological split is approximate because synthetic ETAs span fixed offsets.
"""

from __future__ import annotations

import sys
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Dict, List

# ---------------------------------------------------------------------------
# Leakage guard — forbidden raw column names that must never appear as features
# ---------------------------------------------------------------------------
FORBIDDEN_COLUMNS: frozenset[str] = frozenset(
    {
        "waiting_minutes",
        "service_minutes",
        "actual_arrival",
        "berth_start",
        "berth_end",
        "actual_departure",
        "average_moves_per_hour",   # actual crane performance post-assignment
        "cranes_used",              # actual post-assignment crane count
        "assigned_berth_id",        # actual berth assignment (future decision)
        "delay_reason",             # derived from actual delay (leakage)
    }
)

# ---------------------------------------------------------------------------
# Risk label thresholds (from docs/DATA_DICTIONARY.md)
# HIGH >= 0.7 · MEDIUM 0.5–0.699 · LOW < 0.5
# (baseline_rule_v1 uses occupancy fraction as risk proxy)
# ---------------------------------------------------------------------------
def _risk_label(occupancy_fraction: float) -> str:
    """
    Map bucket occupancy fraction to a risk label.
    Thresholds from docs/DATA_DICTIONARY.md Risk Level Thresholds.
    """
    if occupancy_fraction >= 0.7:
        return "HIGH"
    if occupancy_fraction >= 0.5:
        return "MEDIUM"
    return "LOW"


# ---------------------------------------------------------------------------
# Window row
# ---------------------------------------------------------------------------
@dataclass
class CongestionWindowRow:
    """One row in the ML training/evaluation dataset."""
    window_start: datetime
    window_end: datetime
    scenario: str

    # Pre-window inputs only (no leakage)
    arrivals_in_window: int       # count of scheduled ETAs in [start, end)
    berth_count: int              # total operational berths
    crane_count: int              # total operational cranes
    avg_expected_containers: float  # mean expected_containers for arrivals in window
    priority_min: int             # minimum priority value (1 = highest) in window
    priority_max: int             # maximum priority value in window
    hour_of_day: int              # UTC hour of window_start (0–23)
    day_of_week: int              # weekday of window_start (0=Mon, 6=Sun)

    # Derived ratio (pre-window)
    raw_occupancy: float          # arrivals / berth_count (can exceed 1.0)
    crane_to_berth_ratio: float   # crane_count / berth_count

    # Label
    risk_label: str               # "LOW", "MEDIUM", "HIGH"


# ---------------------------------------------------------------------------
# Dataset builder
# ---------------------------------------------------------------------------

class CongestionDatasetBuilder:
    """
    Builds a list of CongestionWindowRow instances from a SyntheticDataset.

    Usage::

        from data.generator import SyntheticDataset
        from ml.congestion_dataset import CongestionDatasetBuilder

        ds = SyntheticDataset(seed=2026).generate()
        rows = CongestionDatasetBuilder(ds).build()
    """

    WINDOW_HOURS: int = 6

    def __init__(self, dataset) -> None:
        """
        Parameters
        ----------
        dataset : SyntheticDataset
            A generated synthetic dataset (must have called .generate()).
        """
        self._ds = dataset

    def build(self) -> List[CongestionWindowRow]:
        """
        Return one row per (scenario, 6-hour window) pair.

        Windows are aligned to the earliest ETA in each scenario so that
        the dataset covers every bucket that contains at least one arrival.
        Empty buckets at the start/end of each scenario horizon are included
        with zero arrivals to give the classifier negative examples.
        """
        rows: List[CongestionWindowRow] = []
        berth_count = len(self._ds.berths)
        crane_count = len(self._ds.cranes)
        crane_to_berth = crane_count / max(berth_count, 1)

        for scenario_name, schedules in self._ds.scenarios.items():
            if not schedules:
                continue

            etas = sorted(s["eta"] for s in schedules)
            # Align to nearest 6-hour boundary below earliest ETA
            first = etas[0]
            h = first.replace(minute=0, second=0, microsecond=0)
            h = h.replace(hour=(h.hour // self.WINDOW_HOURS) * self.WINDOW_HOURS)
            last = etas[-1]
            # Extend horizon to cover all arrivals + one extra bucket
            end_horizon = last + timedelta(hours=self.WINDOW_HOURS)

            t = h
            while t < end_horizon:
                t_end = t + timedelta(hours=self.WINDOW_HOURS)
                # Arrivals in this window (only ETAs — no outcome columns)
                in_window = [s for s in schedules if t <= s["eta"] < t_end]
                arrivals = len(in_window)
                avg_containers = (
                    sum(s["expected_containers"] for s in in_window) / arrivals
                    if arrivals > 0
                    else 0.0
                )
                priorities = [s["priority"] for s in in_window] if in_window else [3]
                raw_occ = arrivals / max(berth_count, 1)
                rows.append(
                    CongestionWindowRow(
                        window_start=t,
                        window_end=t_end,
                        scenario=scenario_name,
                        arrivals_in_window=arrivals,
                        berth_count=berth_count,
                        crane_count=crane_count,
                        avg_expected_containers=round(avg_containers, 2),
                        priority_min=min(priorities),
                        priority_max=max(priorities),
                        hour_of_day=t.hour,
                        day_of_week=t.weekday(),
                        raw_occupancy=round(raw_occ, 4),
                        crane_to_berth_ratio=round(crane_to_berth, 4),
                        risk_label=_risk_label(raw_occ),
                    )
                )
                t = t_end

        # Sort chronologically across all scenarios
        rows.sort(key=lambda r: r.window_start)
        return rows


def build_default_dataset() -> List[CongestionWindowRow]:
    """
    Build the default dataset from SyntheticDataset(seed=2026).
    Deterministic; always returns the same rows given the same seed.
    """
    # Import here to keep this module importable without the data package
    # being on sys.path (callers from src/ add it themselves).
    from data.generator import SyntheticDataset  # type: ignore[import]
    ds = SyntheticDataset(seed=2026).generate()
    return CongestionDatasetBuilder(ds).build()
