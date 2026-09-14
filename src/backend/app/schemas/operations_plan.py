"""
Pydantic v2 schemas for /api/v1/operations-plan endpoints.

These are the single source of truth for the optimizer API shapes.
All data is synthetic (seed=2026). Results require human approval
before any operational use.
"""

from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field


OPTIMIZER_METHOD = "cp_sat_v1"
OPTIMIZER_LIMITATIONS = (
    "Derived from synthetic data only. "
    "Not validated for real-world port operations. "
    "Human approval required before acting on any assignment."
)


# ── Nested output schemas ──────────────────────────────────────────────────────

class BerthAssignmentResponse(BaseModel):
    """One solved berth assignment."""
    schedule_id: str
    vessel_id: str
    vessel_name: str
    berth_id: str
    berth_code: str
    start_time: str = Field(description="ISO 8601 UTC")
    end_time: str = Field(description="ISO 8601 UTC")
    cranes_assigned: int
    service_minutes: int
    waiting_minutes: int
    priority: int
    explanation: str = Field(description="Plain-language description of this assignment")


class UnscheduledVesselResponse(BaseModel):
    """A vessel that could not be assigned to any berth."""
    schedule_id: str
    vessel_id: str
    vessel_name: str
    arrival_time: str = Field(description="ISO 8601 UTC")
    priority: int
    reason: str


class OptimizerMetricsResponse(BaseModel):
    """Summary metrics comparing optimizer output vs FIFO baseline."""
    total_vessels: int
    scheduled_count: int
    unscheduled_count: int
    fifo_total_wait_minutes: float
    opt_total_wait_minutes: float
    wait_reduction_minutes: float
    avg_wait_minutes: float
    berth_utilization_pct: float
    crane_utilization_pct: float
    solve_status: str = Field(description="OPTIMAL | FEASIBLE | INFEASIBLE | UNKNOWN")
    solve_wall_seconds: float


# ── Top-level response schemas ─────────────────────────────────────────────────

class OperationsPlanResponse(BaseModel):
    """
    Response for POST /api/v1/operations-plan.

    Contains the CP-SAT optimizer assignment plan, metrics, plain-language
    explanation, and human-approval gate metadata.

    IMPORTANT: requires human approval before any operational use.
    """
    plan_id: str = Field(description="Ephemeral plan identifier (UUID, not persisted)")
    port_code: str
    horizon_hours: int
    assignments: List[BerthAssignmentResponse]
    unscheduled: List[UnscheduledVesselResponse]
    metrics: Optional[OptimizerMetricsResponse] = None
    explanation: str = Field(description="Multi-line plain-language summary")
    assumptions: List[str]
    optimizer_method: str = OPTIMIZER_METHOD
    approval_required: bool = True
    approved: bool = False
    is_synthetic: bool = True
    data_source: str = "synthetic"
    limitations: str = OPTIMIZER_LIMITATIONS


class OperationsPlanApprovalResponse(BaseModel):
    """
    Response for POST /api/v1/operations-plan/{plan_id}/approve.

    Acknowledges that a human operator has reviewed and approved the plan.
    The approved flag is set to True. No database writes are performed.
    """
    plan_id: str
    approved: bool = True
    message: str = Field(
        description="Human-readable confirmation"
    )
    is_synthetic: bool = True
    disclaimer: str = (
        "This approval is recorded in-memory only for this demo. "
        "No operational changes are made. "
        "Synthetic data — not a real port operations system."
    )


# ── Request schema ─────────────────────────────────────────────────────────────

class OperationsPlanRequest(BaseModel):
    """
    Request body for POST /api/v1/operations-plan.

    All fields are optional — defaults produce a standard 72-hour plan
    for the default port using all seeded vessels/berths/cranes.
    """
    port_code: str = Field(default="FKPFL", description="Port code (e.g. FKPFL)")
    horizon_hours: int = Field(default=72, ge=6, le=168, description="Planning horizon in hours")
    solve_limit_seconds: int = Field(default=5, ge=1, le=30, description="CP-SAT wall-clock limit")
