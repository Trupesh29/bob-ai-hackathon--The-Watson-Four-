"""
Pydantic v2 schemas for POST /api/v1/copilot/ask.

Kept separate from dashboard.py to avoid cluttering the main schema file.
"""

from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field


# ── Request ───────────────────────────────────────────────────────────────────

class CopilotAskRequest(BaseModel):
    """Request body for POST /api/v1/copilot/ask."""

    port_code: str = Field(
        default="FKPFL",
        description="Port code (e.g. FKPFL)",
    )
    question: str = Field(
        description="Plain-language question about current port operations",
        min_length=3,
        max_length=500,
    )
    scenario: str = Field(
        default="baseline",
        description="Scenario to use when gathering context (baseline | arrival_surge | ...)",
    )


# ── Context snapshot (gathered from existing services) ───────────────────────

class CopilotContextSnapshot(BaseModel):
    """Structured context gathered from existing services before calling the LLM."""

    port_code: str
    port_name: str
    scenario: str
    peak_risk_level: str
    peak_congestion_risk_pct: float
    active_vessel_count: int
    arrivals_next_24h: int
    avg_estimated_waiting_minutes: float
    available_crane_count: int = 0
    berth_occupancy_pct: float = 0.0
    high_risk_vessels: List[str] = Field(
        description="vessel_name list with risk_level high or above"
    )
    top_waiting_vessel: Optional[str] = None
    top_waiting_hours: Optional[float] = None
    top_waiting_cause: Optional[str] = None
    routing_recommended: Optional[bool] = None
    routing_reason: Optional[str] = None
    top_rule_drivers: List[str] = Field(default_factory=list)
    data_source: str = "synthetic"


# ── Response ──────────────────────────────────────────────────────────────────

class CopilotAskResponse(BaseModel):
    """Response for POST /api/v1/copilot/ask."""

    answer: str = Field(description="Plain-language explanation (3 operational recommendations)")
    method: str = Field(description="rules_fallback | ibm_bob_llm")
    provider_available: bool = Field(
        description="True when IBM Bob LLM was used; False for rules_fallback"
    )
    question: str
    port_code: str
    scenario: str
    context_snapshot: CopilotContextSnapshot
    is_synthetic: bool = True
    data_source: str = "synthetic"
    disclaimer: str = (
        "All data is synthetic demo data. "
        "Predictions are not validated for real-world port operations. "
        "This explanation is for demonstration purposes only."
    )
    limitations: str = (
        "rules_fallback generates a deterministic explanation from structured context only. "
        "No LLM, no internet, no real shipping data."
    )
