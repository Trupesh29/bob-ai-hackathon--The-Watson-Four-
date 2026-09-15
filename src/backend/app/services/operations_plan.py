"""
PortFlow AI — Operations-plan service.

Loads vessel schedules, berths, and cranes from the database for a given
port, converts them to optimizer input models, runs the CP-SAT optimizer,
and returns the structured result.

The optimizer is a pure-Python function — no database writes occur here.
Human approval (logged in-memory) is handled by the API layer.
"""

from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from sqlalchemy import cast as sa_cast, String as SAStr
from sqlalchemy.orm import Session

# Ensure src/ is on the path so optimizer can be imported
_SRC = Path(__file__).resolve().parent.parent.parent.parent.parent
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from ..models.berth import Berth
from ..models.crane import Crane
from ..models.port import Port
from ..models.vessel import Vessel
from ..models.vessel_schedule import VesselSchedule

from optimizer.berth_crane_optimizer import optimize  # type: ignore[import]
from optimizer.explain import explain_assignment, explain_result  # type: ignore[import]
from optimizer.models import (  # type: ignore[import]
    BerthInput,
    CraneInput,
    OptimizerResult,
    VesselInput,
)


def run_operations_plan(
    db: Session,
    port_code: str,
    horizon_hours: int = 72,
    solve_limit_seconds: int = 5,
) -> tuple[OptimizerResult, str]:
    """
    Load DB data for port_code, run the optimizer, and return the result
    plus the port code string (confirmed from DB).

    Returns
    -------
    (result, confirmed_port_code)

    Raises
    ------
    ValueError  if port_code is not found in the database.
    """
    # ── Resolve port ────────────────────────────────────────────────────────
    port_row = (
        db.query(
            sa_cast(Port.id, SAStr).label("id_str"),
            Port.code,
        )
        .filter(Port.code == port_code)
        .first()
    )
    if port_row is None:
        raise ValueError(f"Port '{port_code}' not found.")
    port_id_str = port_row.id_str

    # ── Load berths ─────────────────────────────────────────────────────────
    berth_rows = (
        db.query(
            sa_cast(Berth.id, SAStr).label("berth_id"),
            Berth.code,
            Berth.name,
            Berth.max_length_m,
            Berth.max_draft_m,
            Berth.max_cranes,
            Berth.status,
        )
        .filter(sa_cast(Berth.port_id, SAStr) == port_id_str)
        .all()
    )
    berths: list[BerthInput] = [
        BerthInput(
            berth_id=r.berth_id,
            code=r.code,
            name=r.name,
            max_length_m=float(r.max_length_m),
            max_draft_m=float(r.max_draft_m),
            max_cranes=int(r.max_cranes),
            status=r.status,
        )
        for r in berth_rows
    ]

    # ── Load cranes ─────────────────────────────────────────────────────────
    crane_rows = (
        db.query(
            sa_cast(Crane.id, SAStr).label("crane_id"),
            Crane.code,
            sa_cast(Crane.berth_id, SAStr).label("berth_id_str"),
            Crane.moves_per_hour,
            Crane.status,
        )
        .filter(sa_cast(Crane.port_id, SAStr) == port_id_str)
        .all()
    )
    cranes: list[CraneInput] = [
        CraneInput(
            crane_id=r.crane_id,
            code=r.code,
            berth_id=r.berth_id_str or None,
            moves_per_hour=float(r.moves_per_hour),
            status=r.status,
        )
        for r in crane_rows
    ]

    # ── Load vessel schedules ────────────────────────────────────────────────
    now = datetime.now(tz=timezone.utc)
    horizon_end_dt = now  # horizon_start defaults to min ETA inside optimizer

    schedule_rows = (
        db.query(
            sa_cast(VesselSchedule.id, SAStr).label("sched_id"),
            sa_cast(VesselSchedule.vessel_id, SAStr).label("vessel_id_str"),
            VesselSchedule.eta,
            VesselSchedule.expected_containers,
            VesselSchedule.priority,
            Vessel.name.label("vessel_name"),
            Vessel.length_m,
            Vessel.draft_m,
            Vessel.capacity_teu,
        )
        .join(Vessel, VesselSchedule.vessel_id == Vessel.id)
        .filter(
            sa_cast(VesselSchedule.port_id, SAStr) == port_id_str,
        )
        .order_by(VesselSchedule.eta)
        .all()
    )

    vessels: list[VesselInput] = []
    for r in schedule_rows:
        eta = r.eta
        if hasattr(eta, "replace") and (eta.tzinfo is None):
            eta = eta.replace(tzinfo=timezone.utc)
        vessels.append(
            VesselInput(
                schedule_id=r.sched_id,
                vessel_id=r.vessel_id_str,
                name=r.vessel_name,
                arrival_time=eta,
                length_m=float(r.length_m),
                draft_m=float(r.draft_m),
                expected_containers=int(r.expected_containers),
                priority=int(r.priority),
                min_cranes=1,
                max_cranes=4,
            )
        )

    # ── Run optimizer ────────────────────────────────────────────────────────
    result = optimize(
        vessels=vessels,
        berths=berths,
        cranes=cranes,
        horizon_hours=horizon_hours,
        solve_limit_seconds=solve_limit_seconds,
    )

    return result, port_code
