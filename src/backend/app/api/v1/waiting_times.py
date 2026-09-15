"""
Waiting-time prediction endpoint -- GET /api/v1/waiting-times.

mode=baseline: returns historical waiting_minutes / 60 from HistoricalOperation rows.
mode=ml:       returns WaitingPredictor regression predictions; requires artifact.

Returns HTTP 503 (MODEL_ARTIFACT_UNAVAILABLE) when mode=ml and the artifact is absent.
Returns HTTP 404 when port_code is not found.
Returns HTTP 422 for invalid mode.
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import cast as sa_cast, String as SAStr
from sqlalchemy.orm import Session

from ...dependencies import get_db
from ...models.berth import Berth
from ...models.crane import Crane
from ...models.historical_operation import HistoricalOperation
from ...models.port import Port
from ...models.vessel import Vessel
from ...models.vessel_schedule import VesselSchedule
from ...services.congestion import _SCENARIO_MULTIPLIER
from ...schemas.dashboard import (
    VesselWaitingPrediction,
    WaitingTimesResponse,
    VALID_MODES,
    WAITING_METHOD_BASELINE,
    WAITING_METHOD_ML,
    WAITING_LIMITATIONS,
    waiting_risk_level,
)

router = APIRouter(prefix="/waiting-times", tags=["waiting-times"])

_DEFAULT_PORT = "FKPFL"


def _primary_cause(
    queue_at_arrival: int,
    compatible_berth_count: int,
    priority: int,
    total_cranes: int,
    predicted_hours: float,
) -> str | None:
    """Determine the top driver of a vessel's predicted wait with multi-factor detail."""
    causes: list[str] = []
    if compatible_berth_count <= 1:
        causes.append(f"only {compatible_berth_count} compatible berth")
    if queue_at_arrival >= 3:
        causes.append(f"{queue_at_arrival} vessels arrive before this one")
    if total_cranes <= 3:
        causes.append(f"only {total_cranes} cranes operational")
    if priority == 1:
        causes.append("critical-priority vessel requires immediate berth")
    if not causes and predicted_hours > 6:
        causes.append("high berth demand in arrival window")
    return " · ".join(causes) if causes else None


def _recommendation(
    queue_at_arrival: int,
    compatible_berth_count: int,
    predicted_hours: float,
    berth_rows: list,
    vessel_draft: float,
    vessel_length: float,
) -> str | None:
    """Generate a supervisor action recommendation based on predicted delay."""
    if predicted_hours <= 2:
        return None
    if compatible_berth_count <= 1:
        return "Reserve the only compatible berth and pre-position 2+ cranes before ETA."
    if queue_at_arrival >= 3:
        return (
            "Run Optimizer to reassign this vessel ahead of lower-priority vessels. "
            "Consider pre-positioning cranes on an alternate berth."
        )
    if predicted_hours > 12:
        return "Run Optimizer — high wait risk. Verify berth availability and crane staffing."
    return "Monitor; run Optimizer to reduce wait if berth becomes available earlier."


@router.get(
    "",
    response_model=WaitingTimesResponse,
    summary="Vessel waiting-time predictions",
)
def get_waiting_times(
    request: Request,
    port_code: str = Query(default=_DEFAULT_PORT, description="Port code"),
    horizon_hours: int = Query(default=72, ge=6, le=168, description="Horizon in hours"),
    mode: str = Query(default="baseline", description="baseline | ml"),
    scenario: str = Query(default="baseline", description="Scenario filter"),
    db: Session = Depends(get_db),
) -> WaitingTimesResponse:
    """Return per-vessel waiting-time predictions with enriched cause and recommendation."""
    if mode not in VALID_MODES:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "invalid_mode",
                "message": f"Mode '{mode}' is not recognised. Valid options: {sorted(VALID_MODES)}",
            },
        )

    if mode == "ml":
        predictor = getattr(request.app.state, "waiting_predictor", None)
        if predictor is None:
            raise HTTPException(
                status_code=503,
                detail={
                    "error_code": "MODEL_ARTIFACT_UNAVAILABLE",
                    "detail": "The waiting-time ML artifact is not loaded. Run: python -m ml.waiting_train",
                },
            )

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

    total_berths = (
        db.query(Berth).filter(sa_cast(Berth.port_id, SAStr) == port_id_str).count()
    )
    total_cranes = (
        db.query(Crane)
        .filter(sa_cast(Crane.port_id, SAStr) == port_id_str, Crane.status == "operational")
        .count()
    )

    berth_rows = (
        db.query(Berth.max_draft_m, Berth.max_length_m)
        .filter(sa_cast(Berth.port_id, SAStr) == port_id_str)
        .all()
    )

    now = datetime.now(tz=timezone.utc)

    schedule_rows = (
        db.query(
            sa_cast(VesselSchedule.id, SAStr).label("sched_id"),
            sa_cast(Vessel.id, SAStr).label("vessel_id"),
            VesselSchedule.eta,
            VesselSchedule.expected_containers,
            VesselSchedule.cargo_type,
            VesselSchedule.priority,
            Vessel.name.label("vessel_name"),
            Vessel.length_m,
            Vessel.draft_m,
            Vessel.capacity_teu,
        )
        .join(Vessel, VesselSchedule.vessel_id == Vessel.id)
        .filter(sa_cast(VesselSchedule.port_id, SAStr) == port_id_str)
        .order_by(VesselSchedule.eta)
        .all()
    )

    waiting_rows = (
        db.query(
            sa_cast(HistoricalOperation.schedule_id, SAStr).label("sched_id"),
            HistoricalOperation.waiting_minutes,
        )
        .join(VesselSchedule, HistoricalOperation.schedule_id == VesselSchedule.id)
        .filter(sa_cast(VesselSchedule.port_id, SAStr) == port_id_str)
        .all()
    )
    waiting_by_sched: dict[str, int] = {r.sched_id: r.waiting_minutes for r in waiting_rows}

    calculation_method = WAITING_METHOD_BASELINE if mode == "baseline" else WAITING_METHOD_ML
    vessels: list[VesselWaitingPrediction] = []

    for idx, row in enumerate(schedule_rows):
        compatible_berth_count = sum(
            1 for b in berth_rows
            if float(b.max_draft_m) >= float(row.draft_m)
            and float(b.max_length_m) >= float(row.length_m)
        )
        queue_at_arrival = idx

        eta_dt = row.eta
        if hasattr(eta_dt, "replace") and eta_dt.tzinfo is None:
            eta_dt = eta_dt.replace(tzinfo=timezone.utc)

        multiplier = _SCENARIO_MULTIPLIER.get(scenario, 1.0)
        if mode == "baseline":
            wait_min = waiting_by_sched.get(row.sched_id, 0)
            predicted_hours = round((wait_min / 60.0) * multiplier, 4)
            model_version = WAITING_METHOD_BASELINE
        else:
            predictor = request.app.state.waiting_predictor
            feature_dict = {
                "length_m": float(row.length_m),
                "draft_m": float(row.draft_m),
                "capacity_teu": int(row.capacity_teu),
                "expected_containers": int(row.expected_containers),
                "priority": int(row.priority),
                "eta_hour": int(eta_dt.hour) if hasattr(eta_dt, "hour") else 0,
                "day_of_week": int(eta_dt.weekday()) if hasattr(eta_dt, "weekday") else 0,
                "queue_at_arrival": queue_at_arrival,
                "compatible_berth_count": compatible_berth_count,
                "total_berths": total_berths,
                "total_cranes": total_cranes,
                "cargo_type": str(row.cargo_type) if row.cargo_type else "containerised",
                "scenario": scenario,
            }
            result = predictor.predict(feature_dict)
            predicted_hours = result.predicted_waiting_hours
            model_version = result.model_version

        vessels.append(
            VesselWaitingPrediction(
                schedule_id=row.sched_id,
                vessel_id=row.vessel_id,
                vessel_name=row.vessel_name,
                eta=eta_dt.isoformat() if hasattr(eta_dt, "isoformat") else str(eta_dt),
                priority=int(row.priority),
                predicted_waiting_hours=predicted_hours,
                risk_level=waiting_risk_level(predicted_hours),
                method=calculation_method,
                model_version=model_version,
                primary_cause=_primary_cause(
                    queue_at_arrival, compatible_berth_count, int(row.priority),
                    total_cranes, predicted_hours,
                ),
                recommendation=_recommendation(
                    queue_at_arrival, compatible_berth_count, predicted_hours,
                    berth_rows, float(row.draft_m), float(row.length_m),
                ),
            )
        )

    vessels.sort(key=lambda v: v.predicted_waiting_hours, reverse=True)

    return WaitingTimesResponse(
        port_code=port_code,
        horizon_hours=horizon_hours,
        mode=mode,
        vessels=vessels,
        total=len(vessels),
        calculation_method=calculation_method,
        scenario=scenario,
    )
