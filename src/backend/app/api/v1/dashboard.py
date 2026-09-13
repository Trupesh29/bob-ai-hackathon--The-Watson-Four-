"""
Dashboard API endpoints — GET /api/v1/dashboard/summary and
GET /api/v1/dashboard/congestion.

All data comes from seeded PostgreSQL records.
Congestion risk is labelled "baseline_rule_v1" — not ML.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ...dependencies import get_db
from ...schemas.dashboard import (
    DashboardCongestionResponse,
    DashboardSummaryResponse,
    VALID_SCENARIOS,
)
from ...services.congestion import compute_congestion_horizon, compute_dashboard_summary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

_DEFAULT_PORT = "FKPFL"


def _validate_scenario(scenario: str) -> None:
    if scenario not in VALID_SCENARIOS:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "invalid_scenario",
                "message": (
                    f"Scenario '{scenario}' is not recognised. "
                    f"Valid options: {sorted(VALID_SCENARIOS)}"
                ),
            },
        )


@router.get(
    "/summary",
    response_model=DashboardSummaryResponse,
    summary="Dashboard KPI summary",
    description=(
        "Returns the port KPI summary including vessel counts, berth occupancy, "
        "crane availability, and peak congestion risk derived by baseline_rule_v1 "
        "from seeded synthetic PostgreSQL records."
    ),
)
def get_dashboard_summary(
    port_code: str = Query(default=_DEFAULT_PORT, description="Port code (e.g. FKPFL)"),
    scenario: str = Query(default="baseline", description="Scenario to apply"),
    horizon_hours: int = Query(default=72, ge=6, le=168, description="Horizon in hours"),
    db: Session = Depends(get_db),
) -> DashboardSummaryResponse:
    """
    Fetch dashboard summary KPIs from the seeded database.

    Raises 422 for invalid scenario; 404 if the port code is not found.
    """
    _validate_scenario(scenario)
    result = compute_dashboard_summary(
        db, port_code=port_code, scenario=scenario, horizon_hours=horizon_hours
    )
    if result is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "port_not_found", "message": f"Port '{port_code}' not found."},
        )
    return result


@router.get(
    "/congestion",
    response_model=DashboardCongestionResponse,
    summary="72-hour congestion horizon",
    description=(
        "Returns 12 × 6-hour congestion windows for the requested port. "
        "Risk probability is computed by baseline_rule_v1 — a deterministic "
        "rule applied to seeded synthetic data. This is not a trained ML model."
    ),
)
def get_dashboard_congestion(
    port_code: str = Query(default=_DEFAULT_PORT, description="Port code (e.g. FKPFL)"),
    scenario: str = Query(default="baseline", description="Scenario to apply"),
    horizon_hours: int = Query(default=72, ge=6, le=168, description="Horizon in hours"),
    db: Session = Depends(get_db),
) -> DashboardCongestionResponse:
    """
    Compute the 72-hour congestion horizon using baseline_rule_v1.

    Raises 422 for invalid scenario; returns empty windows if port not found.
    """
    _validate_scenario(scenario)
    result = compute_congestion_horizon(
        db, port_code=port_code, scenario=scenario, horizon_hours=horizon_hours
    )
    return result
