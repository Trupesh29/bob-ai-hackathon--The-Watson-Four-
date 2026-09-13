"""
PortFlow AI — Alternate-routing recommender service.

PURPOSE
-------
Given a vessel schedule at the current (home) port, compute whether any
synthetic candidate port offers a meaningfully shorter total arrival-to-
service time.

FORMULA
-------
For each candidate port:

  estimated_total_hours =
    diversion_transit_hours          (fixed synthetic travel time)
    + candidate_avg_wait_hours       (average historical wait at candidate)
    + estimated_handling_hours       (containers / avg_moves_per_hour / cranes)

A recommendation is made when:
  time_saved = current_total - candidate_total >= DIVERSION_THRESHOLD_HOURS

CANDIDATE PORTS
---------------
No second port is seeded in the database.  Three fictional candidate ports are
defined as a static in-code lookup with synthetic representative data.
This is a demo assumption; all values are labelled synthetic.

LIMITATIONS
-----------
- Synthetic data only.  Not validated for real-world routing decisions.
- Transit hours are illustrative estimates; no real nautical distance used.
- Handling time is a rough estimate: containers / (moves_per_hour * cranes).
- Never issue this as a real navigational instruction.

DIVERSION THRESHOLD
-------------------
12 hours — a demo assumption; no project documentation defines a different
value.  Documented in AI_HANDOFF.md Plan 11.
"""

from __future__ import annotations

import uuid as _uuid_mod
from dataclasses import dataclass, field
from typing import List, Optional

from sqlalchemy import cast as _sa_cast, select as _sa_select, String as _SAStr
from sqlalchemy.orm import Session

from ..models.berth import Berth
from ..models.crane import Crane
from ..models.historical_operation import HistoricalOperation
from ..models.port import Port
from ..models.vessel import Vessel
from ..models.vessel_schedule import VesselSchedule

# ── Constants ─────────────────────────────────────────────────────────────────

DIVERSION_THRESHOLD_HOURS: float = 12.0   # demo assumption
_DEFAULT_HANDLING_HOURS: float = 4.0      # fallback when crane data absent
_AVG_MOVES_PER_HOUR: float = 25.0         # synthetic representative value

# ── Synthetic candidate-port catalogue ───────────────────────────────────────
# These are entirely fictional ports used for demo purposes only.
# They are NOT in the database; they live here as static demo data.

@dataclass(frozen=True)
class _CandidatePort:
    code: str
    name: str
    country: str
    diversion_transit_hours: float   # synthetic travel time from FKPFL
    avg_wait_hours: float            # synthetic representative wait at candidate
    avg_handling_hours: float        # synthetic representative handling time
    total_berths: int
    operational_cranes: int


def _parse_uuid(value: str) -> _uuid_mod.UUID:
    """Parse a UUID string, raising ValueError on invalid input."""
    return _uuid_mod.UUID(value)


_CANDIDATE_PORTS: List[_CandidatePort] = [
    _CandidatePort(
        code="FKROS",
        name="Port of Roskilde (Fictional)",
        country="Fictional",
        diversion_transit_hours=8.0,
        avg_wait_hours=3.0,
        avg_handling_hours=5.0,
        total_berths=4,
        operational_cranes=10,
    ),
    _CandidatePort(
        code="FKHVN",
        name="Port of Havenmoor (Fictional)",
        country="Fictional",
        diversion_transit_hours=18.0,
        avg_wait_hours=1.5,
        avg_handling_hours=4.5,
        total_berths=6,
        operational_cranes=14,
    ),
    _CandidatePort(
        code="FKVRD",
        name="Port of Verdaal (Fictional)",
        country="Fictional",
        diversion_transit_hours=24.0,
        avg_wait_hours=0.5,
        avg_handling_hours=4.0,
        total_berths=8,
        operational_cranes=18,
    ),
]


# ── Data classes ──────────────────────────────────────────────────────────────

@dataclass
class PortEstimate:
    port_code: str
    port_name: str
    diversion_transit_hours: float
    predicted_wait_hours: float
    estimated_handling_hours: float
    estimated_total_hours: float
    total_berths: int
    operational_cranes: int
    is_current_port: bool = False
    is_candidate: bool = True


@dataclass
class AlternateRoutingResult:
    vessel_id: str
    vessel_name: str
    schedule_id: str
    current_port: PortEstimate
    candidates: List[PortEstimate]
    recommended: bool
    recommended_port_code: Optional[str]
    recommended_port_name: Optional[str]
    estimated_hours_saved: float
    reason: str
    factors: List[str]
    diversion_threshold_hours: float = DIVERSION_THRESHOLD_HOURS
    data_source: str = "synthetic"
    limitations: str = (
        "Synthetic data only. Transit and wait times are illustrative estimates. "
        "Not validated for real-world routing decisions. "
        "Never use as a real navigational instruction."
    )
    assumptions: List[str] = field(default_factory=lambda: [
        f"Diversion threshold: {DIVERSION_THRESHOLD_HOURS} h (demo assumption — "
        "no project documentation defines a different value).",
        "Candidate ports are entirely fictional synthetic demo entries.",
        f"Average moves per hour: {_AVG_MOVES_PER_HOUR} (synthetic representative value).",
        "Current-port wait is the baseline (historical waiting_minutes / 60) "
        "for this vessel schedule; 0.0 if no historical record exists.",
    ])


# ── Core logic ────────────────────────────────────────────────────────────────

def _handling_hours(expected_containers: int) -> float:
    """
    Rough estimate: containers / (moves_per_hour * typical crane allocation).
    Two cranes assumed as representative allocation for a typical call.
    """
    if expected_containers <= 0:
        return _DEFAULT_HANDLING_HOURS
    return round(expected_containers / (_AVG_MOVES_PER_HOUR * 2), 2)


def compute_alternate_routing(
    db: Session,
    vessel_id_str: str,
) -> Optional[AlternateRoutingResult]:
    """
    Compute alternate-routing recommendation for a given vessel.

    Returns None when the vessel_id is not found (caller raises 404).
    """
    # ── 1. Look up vessel ────────────────────────────────────────────────────
    try:
        vessel_uuid = _parse_uuid(vessel_id_str)
    except ValueError:
        return None

    # Use db.get to avoid SQLite UUID materialisation issues with full ORM queries
    vessel_obj = db.get(Vessel, vessel_uuid)
    if vessel_obj is None:
        return None
    vessel_name = str(vessel_obj.name)

    # ── 2. Schedule — cast UUID FKs to String to avoid SQLite UUID type issues ─
    # UUIDs in tests use uuid5/uuid4 (non-degenerate) so the cast is stable.
    sched_stmt = (
        _sa_select(
            _sa_cast(VesselSchedule.id, _SAStr).label("sched_id_hex"),
            _sa_cast(VesselSchedule.port_id, _SAStr).label("port_id_hex"),
            VesselSchedule.expected_containers,
        )
        .where(
            VesselSchedule.vessel_id == vessel_uuid,
            VesselSchedule.is_synthetic == True,  # noqa: E712
        )
        .order_by(VesselSchedule.eta)
        .limit(1)
    )
    sched_row = db.execute(sched_stmt).first()
    if sched_row is None:
        return _no_schedule_result(vessel_id_str, vessel_name)

    # Normalise: SQLite returns 32-char hex; PostgreSQL returns hyphenated UUID string
    def _to_uuid(s: str) -> _uuid_mod.UUID:
        s = s.replace("-", "")
        return _uuid_mod.UUID(hex=s)

    sched_uuid = _to_uuid(sched_row.sched_id_hex)
    port_uuid = _to_uuid(sched_row.port_id_hex)
    expected_containers = int(sched_row.expected_containers)

    # ── 3. Resolve current port ───────────────────────────────────────────────
    port_stmt = _sa_select(Port.code, Port.name).where(Port.id == port_uuid).limit(1)
    port_row = db.execute(port_stmt).first()
    port_code = str(port_row.code) if port_row else "FKPFL"
    port_name = str(port_row.name) if port_row else "Port of Falkermere"

    # ── 4. Current-port wait (baseline historical) ────────────────────────────
    op_stmt = (
        _sa_select(HistoricalOperation.waiting_minutes)
        .where(HistoricalOperation.schedule_id == sched_uuid)
        .limit(1)
    )
    op_row = db.execute(op_stmt).first()
    current_wait_hours = round((op_row.waiting_minutes / 60.0) if op_row else 0.0, 4)

    # ── 5. Current-port handling estimate ─────────────────────────────────────
    current_handling = _handling_hours(expected_containers)

    # ── 6. Current-port berth/crane counts ────────────────────────────────────
    berth_stmt = _sa_select(
        _sa_cast(Berth.id, _SAStr).label("bid")
    ).where(Berth.port_id == port_uuid)
    current_berths = len(db.execute(berth_stmt).all())
    crane_stmt = _sa_select(
        _sa_cast(Crane.id, _SAStr).label("cid")
    ).where(Crane.port_id == port_uuid, Crane.status == "operational")
    current_cranes = len(db.execute(crane_stmt).all())
    current_total = round(0.0 + current_wait_hours + current_handling, 2)

    current_estimate = PortEstimate(
        port_code=port_code,
        port_name=port_name,
        diversion_transit_hours=0.0,
        predicted_wait_hours=current_wait_hours,
        estimated_handling_hours=current_handling,
        estimated_total_hours=current_total,
        total_berths=current_berths,
        operational_cranes=current_cranes,
        is_current_port=True,
        is_candidate=False,
    )

    # ── 7. Evaluate candidate ports ───────────────────────────────────────────
    candidates: List[PortEstimate] = []
    for cp in _CANDIDATE_PORTS:
        cand_total = round(
            cp.diversion_transit_hours
            + cp.avg_wait_hours
            + current_handling,  # same container count, same handling estimate
            2,
        )
        candidates.append(PortEstimate(
            port_code=cp.code,
            port_name=cp.name,
            diversion_transit_hours=cp.diversion_transit_hours,
            predicted_wait_hours=cp.avg_wait_hours,
            estimated_handling_hours=current_handling,
            estimated_total_hours=cand_total,
            total_berths=cp.total_berths,
            operational_cranes=cp.operational_cranes,
            is_current_port=False,
            is_candidate=True,
        ))

    # Sort candidates best (lowest total) first
    candidates.sort(key=lambda c: c.estimated_total_hours)

    # ── 8. Best candidate vs current ─────────────────────────────────────────
    best = candidates[0] if candidates else None
    if best is None:
        return _build_result(
            vessel_id_str, vessel_name, str(sched_uuid),
            current_estimate, [], False, None, None, 0.0,
            "No candidate ports available — stay at current port.",
            ["No alternative ports defined in demo catalogue."],
        )

    time_saved = round(current_total - best.estimated_total_hours, 2)
    recommend = time_saved >= DIVERSION_THRESHOLD_HOURS

    if recommend:
        reason = (
            f"Diverting to {best.port_name} saves an estimated "
            f"{time_saved:.1f} h total (transit + wait + handling) "
            f"vs staying at {port_name}."
        )
        factors = [
            f"Current-port wait: {current_wait_hours:.1f} h (baseline historical)",
            f"Diversion transit to {best.port_code}: {best.diversion_transit_hours:.1f} h",
            f"Candidate wait: {best.predicted_wait_hours:.1f} h (synthetic representative)",
            f"Handling time: {current_handling:.1f} h (same at both ports)",
            f"Time saved exceeds diversion threshold ({DIVERSION_THRESHOLD_HOURS:.0f} h)",
        ]
    else:
        reason = (
            f"Best alternative ({best.port_name}) saves only "
            f"{max(0.0, time_saved):.1f} h — below the {DIVERSION_THRESHOLD_HOURS:.0f}-h "
            f"diversion threshold. Stay at {port_name}."
        )
        factors = [
            f"Current-port wait: {current_wait_hours:.1f} h (baseline historical)",
            f"Best candidate transit: {best.diversion_transit_hours:.1f} h",
            f"Best candidate wait: {best.predicted_wait_hours:.1f} h",
            f"Time saving {max(0.0, time_saved):.1f} h < threshold {DIVERSION_THRESHOLD_HOURS:.0f} h",
        ]

    return _build_result(
        vessel_id_str, vessel_name, str(sched_uuid),
        current_estimate, candidates,
        recommend,
        best.port_code if recommend else None,
        best.port_name if recommend else None,
        max(0.0, time_saved),
        reason,
        factors,
    )


def _no_schedule_result(vessel_id: str, vessel_name: str) -> AlternateRoutingResult:
    dummy = PortEstimate(
        port_code="FKPFL", port_name="Port of Falkermere",
        diversion_transit_hours=0.0, predicted_wait_hours=0.0,
        estimated_handling_hours=0.0, estimated_total_hours=0.0,
        total_berths=0, operational_cranes=0,
        is_current_port=True, is_candidate=False,
    )
    return _build_result(
        vessel_id, vessel_name, "",
        dummy, [], False, None, None, 0.0,
        "No upcoming schedule found for this vessel — stay at current port.",
        ["No active schedule in the synthetic dataset."],
    )


def _build_result(
    vessel_id: str, vessel_name: str, schedule_id: str,
    current: PortEstimate, candidates: List[PortEstimate],
    recommended: bool, rec_code: Optional[str], rec_name: Optional[str],
    hours_saved: float, reason: str, factors: List[str],
) -> AlternateRoutingResult:
    return AlternateRoutingResult(
        vessel_id=vessel_id,
        vessel_name=vessel_name,
        schedule_id=schedule_id,
        current_port=current,
        candidates=candidates,
        recommended=recommended,
        recommended_port_code=rec_code,
        recommended_port_name=rec_name,
        estimated_hours_saved=hours_saved,
        reason=reason,
        factors=factors,
    )
