"""
Dashboard API endpoints — GET /api/v1/dashboard/summary and
GET /api/v1/dashboard/congestion.

All data comes from seeded PostgreSQL records.

mode=baseline: deterministic baseline_rule_v1 (default)
mode=ml:       congestion_rf_v1 trained on synthetic data (requires artifact)
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from ...dependencies import get_db
from ...schemas.dashboard import (
    DashboardCongestionResponse,
    DashboardSummaryResponse,
    VALID_SCENARIOS,
    VALID_MODES,
)
from ...services.congestion import (
    compute_congestion_horizon,
    compute_congestion_horizon_ml,
    compute_dashboard_summary,
)

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


def _validate_mode(mode: str) -> None:
    if mode not in VALID_MODES:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "invalid_mode",
                "message": (
                    f"Mode '{mode}' is not recognised. "
                    f"Valid options: {sorted(VALID_MODES)}"
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
        "Returns 12 × 6-hour congestion windows for the requested port.\n\n"
        "mode=baseline (default): risk_probability from baseline_rule_v1 — "
        "a deterministic rule applied to seeded synthetic data.\n\n"
        "mode=ml: risk_probability from congestion_rf_v1 — trained on synthetic "
        "data only. NOT validated for real-world operations. "
        "Returns HTTP 503 with error_code=MODEL_ARTIFACT_UNAVAILABLE if the "
        "model artefact has not been generated yet."
    ),
)
def get_dashboard_congestion(
    request: Request,
    port_code: str = Query(default=_DEFAULT_PORT, description="Port code (e.g. FKPFL)"),
    scenario: str = Query(default="baseline", description="Scenario to apply"),
    horizon_hours: int = Query(default=72, ge=6, le=168, description="Horizon in hours"),
    mode: str = Query(default="baseline", description="baseline | ml"),
    db: Session = Depends(get_db),
) -> DashboardCongestionResponse:
    """
    Compute the 72-hour congestion horizon.

    - mode=baseline: deterministic baseline_rule_v1 (default, always available)
    - mode=ml: congestion_rf_v1; requires trained artefact — returns 503 if absent

    Raises 422 for invalid scenario or mode.
    """
    _validate_scenario(scenario)
    _validate_mode(mode)

    if mode == "ml":
        predictor = getattr(request.app.state, "ml_predictor", None)
        if predictor is None:
            raise HTTPException(
                status_code=503,
                detail={
                    "error_code": "MODEL_ARTIFACT_UNAVAILABLE",
                    "detail": (
                        "The ML model artefact is not loaded. "
                        "Run: python -m ml.congestion_train  (from src/)"
                    ),
                },
            )
        return compute_congestion_horizon_ml(
            db,
            predictor,
            port_code=port_code,
            scenario=scenario,
            horizon_hours=horizon_hours,
        )

    # Default: baseline_rule_v1
    return compute_congestion_horizon(
        db, port_code=port_code, scenario=scenario, horizon_hours=horizon_hours
    )
