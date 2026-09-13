"""
PortFlow AI — Operations-plan API endpoints.

POST /api/v1/operations-plan
    Run the CP-SAT berth-and-crane optimizer for a port and return an
    assignment plan. Returns HTTP 404 if port not found.

POST /api/v1/operations-plan/{plan_id}/approve
    Record human approval for an ephemeral plan. Plans are not persisted —
    this endpoint accepts the UUID and returns an approval acknowledgement.
    Returns HTTP 404 if the plan_id is not a valid UUID.

IMPORTANT: all data is synthetic. Human approval is required before any
operational use. No database writes are performed by either endpoint.
"""

from __future__ import annotations

import uuid as _uuid_module

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session

from ...dependencies import get_db
from ...schemas.operations_plan import (
    OperationsPlanApprovalResponse,
    OperationsPlanRequest,
    OperationsPlanResponse,
    BerthAssignmentResponse,
    UnscheduledVesselResponse,
    OptimizerMetricsResponse,
)
from ...services.operations_plan import run_operations_plan

router = APIRouter(prefix="/operations-plan", tags=["operations-plan"])


@router.post(
    "",
    response_model=OperationsPlanResponse,
    summary="Run berth-and-crane optimizer",
    description=(
        "Run the CP-SAT berth-and-crane optimizer for the specified port and "
        "return a full assignment plan. Requires human approval before use.\n\n"
        "All data is synthetic (seed=2026). Not validated for real-world operations."
    ),
)
def create_operations_plan(
    body: OperationsPlanRequest = Body(default=OperationsPlanRequest()),
    db: Session = Depends(get_db),
) -> OperationsPlanResponse:
    """
    Run the optimizer and return the plan. No DB writes occur.

    HTTP 404 if port_code is not found.
    HTTP 500 if the optimizer raises an unexpected error.
    """
    try:
        result, confirmed_port = run_operations_plan(
            db=db,
            port_code=body.port_code,
            horizon_hours=body.horizon_hours,
            solve_limit_seconds=body.solve_limit_seconds,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "port_not_found",
                "message": str(exc),
            },
        )

    # Build response assignments
    from optimizer.explain import explain_assignment  # type: ignore[import]

    assignments_out = [
        BerthAssignmentResponse(
            schedule_id=a.schedule_id,
            vessel_id=a.vessel_id,
            vessel_name=a.vessel_name,
            berth_id=a.berth_id,
            berth_code=a.berth_code,
            start_time=a.start_time.isoformat(),
            end_time=a.end_time.isoformat(),
            cranes_assigned=a.cranes_assigned,
            service_minutes=a.service_minutes,
            waiting_minutes=a.waiting_minutes,
            priority=a.priority,
            explanation=explain_assignment(a),
        )
        for a in result.assignments
    ]

    unscheduled_out = [
        UnscheduledVesselResponse(
            schedule_id=u.schedule_id,
            vessel_id=u.vessel_id,
            vessel_name=u.vessel_name,
            arrival_time=u.arrival_time.isoformat(),
            priority=u.priority,
            reason=u.reason,
        )
        for u in result.unscheduled
    ]

    metrics_out: OptimizerMetricsResponse | None = None
    if result.metrics:
        m = result.metrics
        metrics_out = OptimizerMetricsResponse(
            total_vessels=m.total_vessels,
            scheduled_count=m.scheduled_count,
            unscheduled_count=m.unscheduled_count,
            fifo_total_wait_minutes=m.fifo_total_wait_minutes,
            opt_total_wait_minutes=m.opt_total_wait_minutes,
            wait_reduction_minutes=m.wait_reduction_minutes,
            avg_wait_minutes=m.avg_wait_minutes,
            berth_utilization_pct=m.berth_utilization_pct,
            crane_utilization_pct=m.crane_utilization_pct,
            solve_status=m.solve_status,
            solve_wall_seconds=m.solve_wall_seconds,
        )

    from optimizer.explain import explain_result  # type: ignore[import]

    plan_id = str(_uuid_module.uuid4())

    return OperationsPlanResponse(
        plan_id=plan_id,
        port_code=confirmed_port,
        horizon_hours=body.horizon_hours,
        assignments=assignments_out,
        unscheduled=unscheduled_out,
        metrics=metrics_out,
        explanation=explain_result(result),
        assumptions=result.assumptions,
    )


@router.post(
    "/{plan_id}/approve",
    response_model=OperationsPlanApprovalResponse,
    summary="Approve an operations plan",
    description=(
        "Record human approval for an ephemeral operations plan. "
        "Plans are not persisted to the database — this endpoint "
        "validates the UUID format and returns an acknowledgement.\n\n"
        "No operational changes are made. Synthetic demo only."
    ),
)
def approve_operations_plan(
    plan_id: str,
) -> OperationsPlanApprovalResponse:
    """
    Accept a plan_id UUID and return an approval acknowledgement.

    HTTP 404 if plan_id is not a valid UUID format.
    """
    try:
        parsed_id = str(_uuid_module.UUID(plan_id))
    except ValueError:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "plan_not_found",
                "message": (
                    f"Plan '{plan_id}' is not a valid plan ID. "
                    "Plans are ephemeral — generate a new plan first."
                ),
            },
        )

    return OperationsPlanApprovalResponse(
        plan_id=parsed_id,
        approved=True,
        message=(
            f"Plan {parsed_id} approved by operator. "
            "Human review confirmed. "
            "No automated changes have been applied — "
            "all assignments require manual implementation."
        ),
    )
