"""
PortFlow AI — Alternate-routing recommendation endpoint.

GET /api/v1/vessels/{vessel_id}/alternate-routing

Returns a transparent, rule-based recommendation: divert to a candidate port
only when the estimated total time saving (transit + wait + handling) meets or
exceeds the diversion threshold (12 h — demo assumption).

Returns HTTP 404 when the vessel_id is not found.
Returns HTTP 200 with recommended=False when no alternative is better.

Candidate ports are entirely fictional synthetic demo entries defined in
backend/app/services/alternate_routing.py — no external routing API is called.

LIMITATIONS
-----------
Synthetic data only. Not a real navigational instruction.
See service module for full limitations and assumptions.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ...dependencies import get_db
from ...schemas.dashboard import AlternateRoutingResponse, PortEstimateResponse
from ...services.alternate_routing import (
    AlternateRoutingResult,
    PortEstimate,
    compute_alternate_routing,
)

router = APIRouter(prefix="/vessels", tags=["alternate-routing"])


def _port_estimate_to_response(pe: PortEstimate) -> PortEstimateResponse:
    return PortEstimateResponse(
        port_code=pe.port_code,
        port_name=pe.port_name,
        diversion_transit_hours=pe.diversion_transit_hours,
        predicted_wait_hours=pe.predicted_wait_hours,
        estimated_handling_hours=pe.estimated_handling_hours,
        estimated_total_hours=pe.estimated_total_hours,
        total_berths=pe.total_berths,
        operational_cranes=pe.operational_cranes,
        is_current_port=pe.is_current_port,
        is_candidate=pe.is_candidate,
    )


def _result_to_response(result: AlternateRoutingResult) -> AlternateRoutingResponse:
    return AlternateRoutingResponse(
        vessel_id=result.vessel_id,
        vessel_name=result.vessel_name,
        schedule_id=result.schedule_id,
        current_port=_port_estimate_to_response(result.current_port),
        candidates=[_port_estimate_to_response(c) for c in result.candidates],
        recommended=result.recommended,
        recommended_port_code=result.recommended_port_code,
        recommended_port_name=result.recommended_port_name,
        estimated_hours_saved=result.estimated_hours_saved,
        reason=result.reason,
        factors=result.factors,
        diversion_threshold_hours=result.diversion_threshold_hours,
        data_source=result.data_source,
        limitations=result.limitations,
        assumptions=result.assumptions,
    )


@router.get(
    "/{vessel_id}/alternate-routing",
    response_model=AlternateRoutingResponse,
    summary="Alternate-routing recommendation for a vessel",
    description=(
        "Returns a rule-based recommendation to divert a vessel to a fictional "
        "synthetic candidate port when the estimated total time saving "
        "(transit + wait + handling) meets or exceeds the 12-hour diversion "
        "threshold (demo assumption).\n\n"
        "Returns HTTP 404 when vessel_id is not found.\n"
        "Returns HTTP 200 with recommended=False when staying is better.\n\n"
        "⚠️ Synthetic data only. Not a real navigational instruction."
    ),
)
def get_alternate_routing(
    vessel_id: str,
    db: Session = Depends(get_db),
) -> AlternateRoutingResponse:
    """
    Compute alternate-routing recommendation for the given vessel.

    Raises 404 when vessel_id is not found in the database.
    Always returns 200 even when no diversion is recommended (recommended=False).
    """
    result = compute_alternate_routing(db, vessel_id_str=vessel_id)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "vessel_not_found",
                "message": f"Vessel '{vessel_id}' not found.",
            },
        )
    return _result_to_response(result)
