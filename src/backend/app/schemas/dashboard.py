"""
Pydantic v2 schemas for /api/v1/dashboard/* endpoints.

All responses include:
  - is_synthetic: True  (all data is synthetic demo data)
  - calculation_method: "baseline_rule_v1" or "ml_model_v1"

These schemas are the single source of truth for dashboard API types.
They must be kept in sync with src/frontend/src/types/api.ts.
"""

from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field


CALCULATION_METHOD = "baseline_rule_v1"
ML_CALCULATION_METHOD = "ml_model_v1"
VALID_SCENARIOS = {"baseline", "arrival_surge", "crane_outage", "berth_closure", "handling_slowdown"}
VALID_MODES = {"baseline", "ml"}


class DashboardSummaryResponse(BaseModel):
    """
    Response for GET /api/v1/dashboard/summary.

    Provides a real-time snapshot of port operations derived from seeded
    PostgreSQL records. All KPI values come from the database — no values
    are hardcoded or invented.
    """

    # Port identity
    port_code: str
    port_name: str

    # Vessel counts (read from vessel_schedules)
    active_vessel_count: int = Field(description="Vessels with status in ('scheduled','in_port')")
    arrivals_next_24h: int = Field(description="Vessels with ETA within next 24 hours of now")

    # Infrastructure utilisation (read from berths/cranes)
    berth_occupancy_pct: float = Field(description="Occupied berths / total berths * 100")
    available_crane_count: int = Field(description="Cranes with status='operational'")

    # Congestion summary (derived by baseline_rule_v1)
    peak_congestion_risk: float = Field(description="Highest risk_probability across the 72h horizon (0–1)")
    peak_risk_level: str = Field(description="low | medium | high | critical")
    avg_estimated_waiting_minutes: float = Field(
        description="Average baseline estimated waiting time across upcoming vessels"
    )
    critical_vessel_count: int = Field(description="Vessels with priority=1 (highest priority)")

    # Scenario and provenance
    selected_scenario: str
    is_synthetic: bool = True
    calculation_method: str = CALCULATION_METHOD


class CongestionWindowResponse(BaseModel):
    """One 6-hour time window in the congestion horizon (baseline mode)."""

    window_start: str = Field(description="ISO 8601 UTC start of 6-hour bucket")
    window_end: str = Field(description="ISO 8601 UTC end of 6-hour bucket")
    risk_probability: float = Field(description="Congestion risk 0.0–1.0")
    risk_level: str = Field(description="low | medium | high | critical")
    estimated_queue_count: int = Field(description="Estimated vessels waiting for a berth")
    affected_schedule_ids: List[str] = Field(description="UUIDs of schedules falling in this window")
    rule_drivers: List[str] = Field(description="Top factors driving this bucket's risk")
    # ML-mode additions (present when mode=ml, None otherwise)
    ml_label: Optional[str] = Field(
        default=None,
        description="ML risk label: LOW | MEDIUM | HIGH (present when mode=ml)"
    )
    ml_confidence: Optional[float] = Field(
        default=None,
        description="Probability of the predicted ML class (present when mode=ml)"
    )
    ml_model_version: Optional[str] = Field(
        default=None,
        description="Model version string (present when mode=ml)"
    )


class DashboardCongestionResponse(BaseModel):
    """
    Response for GET /api/v1/dashboard/congestion.

    Returns 12 × 6-hour windows covering the 72-hour horizon.

    mode=baseline: risk_probability from baseline_rule_v1 (deterministic rule).
    mode=ml: risk_probability from congestion_rf_v1 (trained on synthetic data).

    LIMITATIONS: mode=ml uses synthetic data only and is not validated for
    real-world port operations.
    """

    port_code: str
    horizon_hours: int = Field(description="Length of planning horizon (default 72)")
    windows: List[CongestionWindowResponse]
    selected_scenario: str
    selected_mode: str = Field(
        default="baseline",
        description="baseline | ml"
    )
    is_synthetic: bool = True
    calculation_method: str = CALCULATION_METHOD
    data_source: str = "synthetic"
    limitations: Optional[str] = Field(
        default=None,
        description="Non-null when mode=ml; describes synthetic-data limitations"
    )


class ScheduleResponse(BaseModel):
    """One row in the schedules list."""

    schedule_id: str
    vessel_name: str
    imo_number: str
    eta: str = Field(description="ISO 8601 UTC")
    etd: Optional[str] = None
    expected_containers: int
    cargo_type: str
    priority: int = Field(description="1=highest, 5=lowest")
    preferred_berth_code: Optional[str] = None
    status: str
    is_synthetic: bool = True
    # Compatibility derived fields
    compatible_berth_count: Optional[int] = Field(
        default=None,
        description="Number of port berths physically compatible with this vessel"
    )
    estimated_waiting_minutes: Optional[int] = Field(
        default=None,
        description="Baseline rule estimate from historical_operations record"
    )


class SchedulesResponse(BaseModel):
    """Response for GET /api/v1/schedules."""

    port_code: str
    scenario: str
    schedules: List[ScheduleResponse]
    total: int
    is_synthetic: bool = True


class BerthResponse(BaseModel):
    """One berth in the resource list."""

    berth_id: str
    berth_code: str
    berth_name: str
    max_length_m: float
    max_draft_m: float
    max_cranes: int
    status: str
    occupancy_status: str = Field(description="free | occupied | maintenance")
    crane_count: int = Field(description="Number of cranes assigned to this berth")


class BerthsResponse(BaseModel):
    """Response for GET /api/v1/resources/berths."""

    port_code: str
    berths: List[BerthResponse]
    total: int
    is_synthetic: bool = True


class CraneResponse(BaseModel):
    """One crane in the resource list."""

    crane_id: str
    crane_code: str
    berth_code: Optional[str] = None
    moves_per_hour: float
    status: str


class CranesResponse(BaseModel):
    """Response for GET /api/v1/resources/cranes."""

    port_code: str
    cranes: List[CraneResponse]
    total: int
    available_count: int
    is_synthetic: bool = True


class ScenarioInfo(BaseModel):
    """Metadata for one available scenario."""

    scenario_id: str
    label: str
    description: str


class ScenariosResponse(BaseModel):
    """Response for GET /api/v1/scenarios."""

    scenarios: List[ScenarioInfo]
    default_scenario: str = "baseline"


# ── Waiting-time prediction schemas ───────────────────────────────────────────

WAITING_RISK_LOW_THRESHOLD = 6.0    # hours
WAITING_RISK_HIGH_THRESHOLD = 12.0  # hours
WAITING_METHOD_BASELINE = "waiting_baseline_v1"
WAITING_METHOD_ML = "waiting_rf_v1"
WAITING_LIMITATIONS = (
    "Trained on ~44 synthetic rows. Not validated for real-world operations. "
    "Point estimate only — no confidence interval."
)


def waiting_risk_level(hours: float) -> str:
    """Map predicted waiting hours to a risk label."""
    if hours < WAITING_RISK_LOW_THRESHOLD:
        return "low"
    if hours <= WAITING_RISK_HIGH_THRESHOLD:
        return "medium"
    return "high"


class VesselWaitingPrediction(BaseModel):
    """Waiting-time prediction for one vessel."""
    schedule_id: str
    vessel_id: str = Field(description="Vessel UUID — used as the key for alternate-routing requests")
    vessel_name: str
    eta: str
    priority: int
    predicted_waiting_hours: float
    risk_level: str = Field(description="low | medium | high")
    method: str
    model_version: str
    data_source: str = "synthetic"
    is_synthetic: bool = True
    limitations: str = WAITING_LIMITATIONS
    primary_cause: Optional[str] = Field(
        default=None,
        description="Top driver of predicted wait (e.g. 'high queue at arrival')"
    )


class WaitingTimesResponse(BaseModel):
    """Response for GET /api/v1/waiting-times."""
    port_code: str
    horizon_hours: int
    mode: str = Field(description="baseline | ml")
    vessels: List[VesselWaitingPrediction]
    total: int
    is_synthetic: bool = True
    data_source: str = "synthetic"
    calculation_method: str
    scenario: Optional[str] = "baseline"
    limitations: str = WAITING_LIMITATIONS


# ── Alternate-routing recommendation schemas ──────────────────────────────────

ROUTING_DIVERSION_THRESHOLD = 12.0  # hours — demo assumption
ROUTING_LIMITATIONS = (
    "Synthetic data only. Transit and wait times are illustrative estimates. "
    "Not validated for real-world routing decisions. "
    "Never use as a real navigational instruction."
)


class PortEstimateResponse(BaseModel):
    """Estimated time breakdown for one port option."""
    port_code: str
    port_name: str
    diversion_transit_hours: float = Field(
        description="Synthetic travel time from current port (0.0 for current port)"
    )
    predicted_wait_hours: float
    estimated_handling_hours: float
    estimated_total_hours: float
    total_berths: int
    operational_cranes: int
    is_current_port: bool
    is_candidate: bool


class AlternateRoutingResponse(BaseModel):
    """Response for GET /api/v1/vessels/{vessel_id}/alternate-routing."""
    vessel_id: str
    vessel_name: str
    schedule_id: str
    current_port: PortEstimateResponse
    candidates: List[PortEstimateResponse]
    recommended: bool = Field(
        description="True when best candidate saves >= diversion_threshold_hours"
    )
    recommended_port_code: Optional[str] = None
    recommended_port_name: Optional[str] = None
    estimated_hours_saved: float
    reason: str = Field(description="One-sentence human-readable explanation")
    factors: List[str] = Field(description="Explainable factors driving the decision")
    diversion_threshold_hours: float = ROUTING_DIVERSION_THRESHOLD
    data_source: str = "synthetic"
    is_synthetic: bool = True
    limitations: str = ROUTING_LIMITATIONS
    assumptions: List[str]
