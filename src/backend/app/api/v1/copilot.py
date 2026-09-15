"""
PortFlow AI — Copilot endpoint.

POST /api/v1/copilot/ask

Gathers structured context from existing services and returns a plain-language
explanation via rules_fallback (always available) or IBM Bob LLM (when configured).

Rules:
- Never invents vessel names, port data, weather, or costs.
- Always labels synthetic data.
- Distinguishes prediction from fact.
- Provides 3 operational recommendations.
- Never executes any action.

PROVIDER STATUS
  method = rules_fallback   → deterministic explanation; provider_available = false
  method = ibm_bob_llm      → IBM Bob LLM was used;     provider_available = true

Returns 404 when port_code is not found.
Returns 422 when the question is empty or the port_code/scenario is invalid.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ...dependencies import get_db
from ...schemas.copilot import CopilotAskRequest, CopilotAskResponse
from ...schemas.dashboard import VALID_SCENARIOS
from ...services.copilot_service import build_context, copilot_ask

router = APIRouter(prefix="/copilot", tags=["copilot"])


@router.post(
    "/ask",
    response_model=CopilotAskResponse,
    summary="Copilot: explain port operations",
    description=(
        "Gathers real structured context (congestion, waiting-times, routing) "
        "and returns a plain-language explanation with 3 operational recommendations.\n\n"
        "**method=rules_fallback** — deterministic, always available, no LLM required.\n"
        "**method=ibm_bob_llm** — IBM Bob LLM (requires COPILOT_PROVIDER=ibm_bob + credentials).\n\n"
        "⚠️ All data is synthetic demo data. Never a real operational instruction."
    ),
)
def post_copilot_ask(
    body: CopilotAskRequest,
    db: Session = Depends(get_db),
) -> CopilotAskResponse:
    """
    Explain current port operations using structured context from existing services.

    Returns 404 if port_code is not found.
    Returns 422 if scenario is invalid.
    """
    if body.scenario not in VALID_SCENARIOS:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "invalid_scenario",
                "message": (
                    f"Scenario '{body.scenario}' is not recognised. "
                    f"Valid options: {sorted(VALID_SCENARIOS)}"
                ),
            },
        )

    ctx = build_context(db, port_code=body.port_code, scenario=body.scenario)
    if ctx is None:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "port_not_found",
                "message": f"Port '{body.port_code}' not found.",
            },
        )

    return copilot_ask(ctx, question=body.question, plan_context=body.plan_context)
