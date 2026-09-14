"""
PortFlow AI — Waiting-time regression dataset builder.

PURPOSE
-------
Builds one row per vessel arrival from PortFlow synthetic historical operations.
The regression target is actual_waiting_hours = (berth_start - actual_arrival).

FEATURE LEAKAGE POLICY
-----------------------
FORBIDDEN — never used as features (future outcome / target-derived data):
  berth_start, berth_end, actual_departure
  waiting_minutes, service_minutes
  cranes_used, average_moves_per_hour  (actual post-assignment values)
  assigned_berth_id                    (actual assignment decision)
  delay_reason                         (derived from outcome)

ALLOWED at-arrival features only:
  vessel dimensions, cargo, priority, ETA hour/day, estimated queue at arrival,
  berth occupancy at arrival, compatible berth count, available crane count,
  scenario label.

DATA SOURCE
-----------
SyntheticDataset(seed=2026) — all records are is_synthetic=True.

LIMITATIONS
-----------
- Synthetic data only; ~44 rows; metrics are illustrative.
- No real-world accuracy claims.
"""

from __future__ import annotations

import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import List

_SRC = Path(__file__).resolve().parent.parent
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

# ── Leakage guard ──────────────────────────────────────────────────────────────

FORBIDDEN_COLUMNS: frozenset[str] = frozenset({
    "berth_start",
    "berth_end",
    "actual_departure",
    "waiting_minutes",
    "service_minutes",
    "cranes_used",
    "average_moves_per_hour",
    "assigned_berth_id",
    "delay_reason",
    "actual_waiting_hours",   # target itself
})


# ── Row dataclass ──────────────────────────────────────────────────────────────

@dataclass
class WaitingRow:
    """One row in the waiting-time training dataset."""
    schedule_id: str
    vessel_name: str
    arrival_time: datetime
    scenario: str

    # At-arrival features (no leakage)
    length_m: float
    draft_m: float
    capacity_teu: int
    expected_containers: int
    priority: int              # 1=highest, 5=lowest
    cargo_type: str            # "containerised"
    eta_hour: int              # UTC hour of arrival (0–23)
    day_of_week: int           # weekday of arrival (0=Mon)
    # Queue/capacity context at arrival (derived from schedule ordering)
    queue_at_arrival: int      # number of vessels with earlier ETA in same scenario
    compatible_berth_count: int  # berths where length_m/draft_m fit
    total_berths: int
    total_cranes: int

    # Target (derived from berth_start − actual_arrival)
    actual_waiting_hours: float


# ── Builder ────────────────────────────────────────────────────────────────────

class WaitingDatasetBuilder:
    """
    Builds WaitingRow instances from a SyntheticDataset.

    Each row corresponds to one vessel schedule + its HistoricalOperation record.
    The target actual_waiting_hours is computed as:
        (berth_start − actual_arrival).total_seconds() / 3600
    which equals waiting_minutes / 60 exactly (both are in the generator output).

    Features use only information available at the moment of vessel arrival.
    """

    def __init__(self, dataset) -> None:
        self._ds = dataset

    def build(self) -> List[WaitingRow]:
        rows: List[WaitingRow] = []

        berths = self._ds.berths
        total_cranes = len(self._ds.cranes)
        total_berths = len(berths)

        for scenario_name, schedules in self._ds.scenarios.items():
            ops = {o["schedule_id"]: o for o in self._ds.operations.get(scenario_name, [])}

            # Sort by ETA for queue count calculation
            sorted_scheds = sorted(schedules, key=lambda s: s["eta"])

            for i, sched in enumerate(sorted_scheds):
                op = ops.get(sched["id"])
                if op is None:
                    continue  # no historical record — skip

                # ── Derive target ─────────────────────────────────────────────
                # berth_start − actual_arrival (timezone-aware subtraction)
                bs = op["berth_start"]
                arr = op["actual_arrival"]
                if bs is None or arr is None:
                    continue
                if bs.tzinfo is None:
                    bs = bs.replace(tzinfo=timezone.utc)
                if arr.tzinfo is None:
                    arr = arr.replace(tzinfo=timezone.utc)
                actual_waiting_hours = max(0.0, (bs - arr).total_seconds() / 3600.0)

                # ── Vessel dimensions from template ────────────────────────────
                vessel = next(
                    (v for v in self._ds.vessels if v["id"] == sched["vessel_id"]),
                    None,
                )
                if vessel is None:
                    continue

                length_m = float(vessel["length_m"])
                draft_m = float(vessel["draft_m"])
                capacity_teu = int(vessel["capacity_teu"])

                # ── Compatible berths ──────────────────────────────────────────
                compat_count = sum(
                    1 for b in berths
                    if b["max_draft_m"] >= draft_m and b["max_length_m"] >= length_m
                )

                # ── Queue at arrival ───────────────────────────────────────────
                # Vessels in the same scenario with an earlier ETA = queue ahead
                queue_at = sum(
                    1 for earlier in sorted_scheds[:i]
                    if earlier["eta"] < sched["eta"]
                )

                # ── ETA time features ──────────────────────────────────────────
                eta = sched["eta"]
                if eta.tzinfo is None:
                    eta = eta.replace(tzinfo=timezone.utc)

                rows.append(WaitingRow(
                    schedule_id=str(sched["id"]),
                    vessel_name=vessel["name"],
                    arrival_time=eta,
                    scenario=scenario_name,
                    length_m=length_m,
                    draft_m=draft_m,
                    capacity_teu=capacity_teu,
                    expected_containers=int(sched["expected_containers"]),
                    priority=int(sched["priority"]),
                    cargo_type=str(sched.get("cargo_type", "containerised")),
                    eta_hour=eta.hour,
                    day_of_week=eta.weekday(),
                    queue_at_arrival=queue_at,
                    compatible_berth_count=compat_count,
                    total_berths=total_berths,
                    total_cranes=total_cranes,
                    actual_waiting_hours=round(actual_waiting_hours, 4),
                ))

        # Sort chronologically
        rows.sort(key=lambda r: r.arrival_time)
        return rows


def build_default_dataset() -> List[WaitingRow]:
    """Build from SyntheticDataset(seed=2026). Deterministic."""
    from data.generator import SyntheticDataset  # type: ignore[import]
    ds = SyntheticDataset(seed=2026).generate()
    return WaitingDatasetBuilder(ds).build()
