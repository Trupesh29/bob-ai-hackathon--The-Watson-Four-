"""
Schedules API endpoint — GET /api/v1/schedules.

Returns vessel schedule records from the planning database, including supervisor-entered records.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ...dependencies import get_db
from ...models.berth import Berth
from ...models.vessel import Vessel
from ...models.vessel_schedule import VesselSchedule
from ...models.port import Port
from ...schemas.dashboard import ScheduleResponse, SchedulesResponse, VALID_SCENARIOS

router = APIRouter(prefix="/schedules", tags=["schedules"])

_DEFAULT_PORT = "FKPFL"


@router.get(
    "",
    response_model=SchedulesResponse,
    summary="Vessel schedule list",
    description="Returns upcoming vessel schedules for the port from seeded synthetic data.",
)
def get_schedules(
    port_code: str = Query(default=_DEFAULT_PORT, description="Port code"),
    scenario: str = Query(default="baseline", description="Scenario filter"),
    db: Session = Depends(get_db),
) -> SchedulesResponse:
    """
    Return vessel schedules for the requested port and scenario.

    Schedules are read directly from the seeded PostgreSQL database.
    The scenario parameter changes analytical simulations; it does not hide
    supervisor-entered planning records.
    """
    if scenario not in VALID_SCENARIOS:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "invalid_scenario",
                "message": f"Scenario '{scenario}' is not recognised.",
            },
        )

    # Use cast(UUID, String) throughout to avoid PostgreSQL UUID(as_uuid=True)
    # deserialization failures on SQLite in tests.
    from sqlalchemy import cast as sa_cast, String as SAStr, func as sqlfunc

    port_id_row = (
        db.query(sa_cast(Port.id, SAStr).label("id_str"))
        .filter(Port.code == port_code)
        .first()
    )
    if port_id_row is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "port_not_found", "message": f"Port '{port_code}' not found."},
        )
    port_id_str = port_id_row.id_str

    # Berth compatibility data
    berth_compat_rows = (
        db.query(
            sa_cast(Berth.id, SAStr).label("id_str"),
            Berth.code,
            Berth.max_draft_m,
            Berth.max_length_m,
        )
        .filter(sa_cast(Berth.port_id, SAStr) == port_id_str)
        .all()
    )

    # Vessel schedules with all needed columns (no UUID columns except via cast)
    rows_raw = (
        db.query(
            sa_cast(VesselSchedule.id, SAStr).label("sched_id"),
            VesselSchedule.eta,
            VesselSchedule.etd,
            VesselSchedule.expected_containers,
            VesselSchedule.cargo_type,
            VesselSchedule.priority,
            VesselSchedule.status,
            VesselSchedule.is_synthetic,
            Vessel.name.label("vessel_name"),
            Vessel.imo_number,
            Vessel.draft_m,
            Vessel.length_m,
        )
        .join(Vessel, VesselSchedule.vessel_id == Vessel.id)
        .filter(
            sa_cast(VesselSchedule.port_id, SAStr) == port_id_str,
        )
        .order_by(VesselSchedule.eta)
        .all()
    )

    # Fetch preferred_berth_id → berth_code mapping using Berth join (no UUID read)
    berth_pref_rows = (
        db.query(
            sa_cast(VesselSchedule.id, SAStr).label("sched_id"),
            Berth.code.label("berth_code"),
        )
        .join(Berth, VesselSchedule.preferred_berth_id == Berth.id, isouter=True)
        .filter(
            sa_cast(VesselSchedule.port_id, SAStr) == port_id_str,
        )
        .all()
    )
    preferred_berth_code_by_sched = {r.sched_id: r.berth_code for r in berth_pref_rows}

    # Fetch waiting minutes from historical_operations
    from ...models.historical_operation import HistoricalOperation as HistOp
    waiting_rows = (
        db.query(sa_cast(HistOp.schedule_id, SAStr).label("sched_id"), HistOp.waiting_minutes)
        .join(VesselSchedule, HistOp.schedule_id == VesselSchedule.id)
        .filter(
            sa_cast(VesselSchedule.port_id, SAStr) == port_id_str,
        )
        .all()
    )
    waiting_by_sched = {r.sched_id: r.waiting_minutes for r in waiting_rows}

    rows: list[ScheduleResponse] = []
    for row in rows_raw:
        # Compatible berths: berths whose draft and length can accommodate this vessel
        compat_count = sum(
            1 for b in berth_compat_rows
            if float(b.max_draft_m) >= float(row.draft_m)
            and float(b.max_length_m) >= float(row.length_m)
        )
        sched_str = row.sched_id
        pref_berth_code = preferred_berth_code_by_sched.get(sched_str)
        waiting_est = waiting_by_sched.get(sched_str)

        rows.append(
            ScheduleResponse(
                schedule_id=sched_str,
                vessel_name=row.vessel_name,
                imo_number=row.imo_number,
                eta=row.eta.isoformat() if hasattr(row.eta, "isoformat") else str(row.eta),
                etd=(
                    row.etd.isoformat() if row.etd and hasattr(row.etd, "isoformat") else None
                ),
                expected_containers=row.expected_containers,
                cargo_type=row.cargo_type,
                priority=row.priority,
                preferred_berth_code=pref_berth_code,
                status=row.status,
                is_synthetic=bool(row.is_synthetic),
                compatible_berth_count=compat_count,
                estimated_waiting_minutes=waiting_est,
            )
        )

    return SchedulesResponse(
        port_code=port_code,
        scenario=scenario,
        schedules=rows,
        total=len(rows),
    )
