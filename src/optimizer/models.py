"""
PortFlow AI — Optimizer in-memory data models.

PURPOSE
-------
Plain dataclasses used as input/output for the CP-SAT berth-and-crane optimizer.
These are deliberately decoupled from SQLAlchemy ORM models so the optimizer can
be called from tests, scripts, or the API layer with no database dependency.

SYNTHETIC DATA DISCLAIMER
--------------------------
All fields populated from SyntheticDataset(seed=2026).  No real port, vessel, or
operational data is used.  Results are illustrative only and do not imply
real-world optimality.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import List, Optional


# ── Input models ──────────────────────────────────────────────────────────────

@dataclass
class VesselInput:
    """
    A vessel arriving at the port during the planning horizon.

    Fields derived from Vessel + VesselSchedule ORM records.
    Service duration is calculated from expected_containers and available
    crane capacity — it is an estimate, not a committed time.
    """
    schedule_id: str          # VesselSchedule.id (string-cast UUID)
    vessel_id: str            # Vessel.id (string-cast UUID)
    name: str                 # Vessel.name
    arrival_time: datetime    # VesselSchedule.eta (timezone-aware)
    length_m: float           # Vessel.length_m — for berth compatibility
    draft_m: float            # Vessel.draft_m — for berth compatibility
    expected_containers: int  # VesselSchedule.expected_containers (crane moves)
    priority: int             # VesselSchedule.priority (1=highest, 5=lowest)
    min_cranes: int = 1       # Minimum cranes required (hardcoded: 1)
    max_cranes: int = 4       # Maximum cranes vessel can accept (from berth.max_cranes)


@dataclass
class BerthInput:
    """
    An operational berth available during the planning horizon.

    Fields derived from Berth ORM record.
    """
    berth_id: str             # Berth.id (string-cast UUID)
    code: str                 # Berth.code (e.g. "B01")
    name: str                 # Berth.name
    max_length_m: float       # Berth.max_length_m
    max_draft_m: float        # Berth.max_draft_m
    max_cranes: int           # Berth.max_cranes
    status: str               # Berth.status ("operational" | "maintenance")


@dataclass
class CraneInput:
    """
    An operational crane available during the planning horizon.

    Fields derived from Crane ORM record.
    """
    crane_id: str             # Crane.id (string-cast UUID)
    code: str                 # Crane.code (e.g. "QC01")
    berth_id: Optional[str]   # Crane.berth_id — home berth (None = movable)
    moves_per_hour: float     # Crane.moves_per_hour
    status: str               # Crane.status ("operational" | "maintenance")


# ── Output models ─────────────────────────────────────────────────────────────

@dataclass
class BerthAssignment:
    """One solved berth assignment for a vessel."""
    schedule_id: str
    vessel_id: str
    vessel_name: str
    berth_id: str
    berth_code: str
    start_time: datetime      # When service begins (>= arrival_time)
    end_time: datetime        # When service ends (start_time + service_duration)
    cranes_assigned: int      # Number of cranes allocated
    service_minutes: int      # Estimated service duration in minutes
    waiting_minutes: int      # start_time - arrival_time in minutes
    priority: int
    draft_m: float = 0.0      # Vessel draft (m) — used for explanation context


@dataclass
class UnscheduledVessel:
    """A vessel that could not be feasibly assigned to any berth."""
    schedule_id: str
    vessel_id: str
    vessel_name: str
    arrival_time: datetime
    priority: int
    reason: str               # Human-readable explanation


@dataclass
class OptimizerMetrics:
    """Summary metrics comparing optimizer output against FIFO baseline."""
    total_vessels: int
    scheduled_count: int
    unscheduled_count: int
    # Waiting time summary
    fifo_total_wait_minutes: float      # Baseline FIFO total waiting minutes
    opt_total_wait_minutes: float       # Optimizer total waiting minutes
    wait_reduction_minutes: float       # fifo - opt (positive = improvement)
    avg_wait_minutes: float             # opt_total / scheduled_count
    # Utilisation
    berth_utilization_pct: float        # (total service minutes / available berth-minutes) * 100
    crane_utilization_pct: float        # (total crane-minutes used / available crane-minutes) * 100
    # Meta
    solve_status: str                   # "OPTIMAL", "FEASIBLE", "INFEASIBLE", "UNKNOWN"
    solve_wall_seconds: float


@dataclass
class OptimizerResult:
    """
    Complete output of the berth-and-crane optimizer.

    DISCLAIMER: derived from synthetic data only.  Not validated for
    real-world port operations.  Requires human review before acting.
    """
    assignments: List[BerthAssignment] = field(default_factory=list)
    unscheduled: List[UnscheduledVessel] = field(default_factory=list)
    metrics: Optional[OptimizerMetrics] = None
    assumptions: List[str] = field(default_factory=list)
    is_synthetic: bool = True
    data_source: str = "synthetic"
    optimizer_method: str = "cp_sat_v1"
    limitations: str = (
        "Derived from synthetic data only. "
        "Not validated for real-world port operations. "
        "Requires human review before acting on results."
    )
