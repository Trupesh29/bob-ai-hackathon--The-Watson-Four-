"""Supervisor data-entry endpoints for the operational planning workspace."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import cast as sa_cast, String as SAStr
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ...dependencies import get_db
from ...models.berth import Berth
from ...models.crane import Crane
from ...models.port import Port
from ...models.vessel import Vessel
from ...models.vessel_schedule import VesselSchedule
from ...schemas.data_input import (
    ResourceStatusResponse,
    ResourceStatusUpdate,
    VesselScheduleCreate,
    VesselScheduleCreateResponse,
)

router = APIRouter(prefix="/data-input", tags=["data input"])


@router.post("/vessel-schedules", response_model=VesselScheduleCreateResponse, status_code=status.HTTP_201_CREATED)
def create_vessel_schedule(body: VesselScheduleCreate, db: Session = Depends(get_db)) -> VesselScheduleCreateResponse:
    """Store a supervisor-entered vessel and upcoming schedule in the database."""
    port = db.query(Port).filter(Port.code == body.port_code).first()
    if port is None:
        raise HTTPException(status_code=404, detail={"error": "port_not_found", "message": f"Port '{body.port_code}' not found."})

    preferred_berth_id = None
    if body.preferred_berth_code:
        berth = db.query(Berth).filter(Berth.port_id == port.id, Berth.code == body.preferred_berth_code).first()
        if berth is None:
            raise HTTPException(status_code=422, detail={"error": "berth_not_found", "message": "Choose a berth from this port or leave it unassigned."})
        if body.length_m > float(berth.max_length_m) or body.draft_m > float(berth.max_draft_m):
            raise HTTPException(status_code=422, detail={"error": "incompatible_berth", "message": "This vessel exceeds the selected berth's length or draft limit."})
        preferred_berth_id = berth.id

    vessel = db.query(Vessel).filter(Vessel.imo_number == body.imo_number).first()
    if vessel is None:
        vessel = Vessel(
            imo_number=body.imo_number, name=body.vessel_name, operator_name=body.operator_name,
            vessel_type="container", capacity_teu=body.capacity_teu, length_m=body.length_m,
            beam_m=body.beam_m, draft_m=body.draft_m,
        )
        db.add(vessel)
        db.flush()

    schedule = VesselSchedule(
        vessel_id=vessel.id, port_id=port.id, eta=body.eta, expected_containers=body.expected_containers,
        cargo_type=body.cargo_type, priority=body.priority, preferred_berth_id=preferred_berth_id,
        status="scheduled", source="supervisor_input", is_synthetic=False,
    )
    db.add(schedule)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail={"error": "duplicate_vessel", "message": "This vessel could not be saved because its IMO already conflicts with existing data."})
    db.refresh(schedule)
    return VesselScheduleCreateResponse(schedule_id=str(schedule.id), vessel_id=str(vessel.id), message="Vessel schedule saved to the planning database.")


def _update_resource_status(model: type[Berth] | type[Crane], resource_id: str, body: ResourceStatusUpdate, db: Session) -> ResourceStatusResponse:
    row = db.query(model).filter(sa_cast(model.id, SAStr) == resource_id).first()
    if row is None:
        raise HTTPException(status_code=404, detail={"error": "resource_not_found", "message": "Resource not found."})
    row.status = body.status
    db.commit()
    return ResourceStatusResponse(resource_id=resource_id, status=row.status, message="Resource status saved to the planning database.")


@router.patch("/berths/{berth_id}/status", response_model=ResourceStatusResponse)
def update_berth_status(berth_id: str, body: ResourceStatusUpdate, db: Session = Depends(get_db)) -> ResourceStatusResponse:
    return _update_resource_status(Berth, berth_id, body, db)


@router.patch("/cranes/{crane_id}/status", response_model=ResourceStatusResponse)
def update_crane_status(crane_id: str, body: ResourceStatusUpdate, db: Session = Depends(get_db)) -> ResourceStatusResponse:
    return _update_resource_status(Crane, crane_id, body, db)
