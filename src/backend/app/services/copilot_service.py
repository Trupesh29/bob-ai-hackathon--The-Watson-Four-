"""
PortFlow AI — Copilot service.

PURPOSE
-------
Gathers structured context from existing services (congestion, waiting-times,
alternate-routing), then either:

  a) Generates a deterministic plain-language explanation via rules_fallback
     (always available; requires no external dependencies).

  b) Calls the IBM Bob LLM if COPILOT_PROVIDER=ibm_bob and credentials are
     configured via environment variables.

Provider selection:
  COPILOT_PROVIDER=ibm_bob  →  attempt IBM Bob; fall back to rules if unavailable
  anything else / unset     →  rules_fallback immediately

ENVIRONMENT VARIABLES (never logged or returned)
  COPILOT_PROVIDER      — "ibm_bob" to enable IBM Bob; default empty = rules_fallback
  IBM_BOB_API_KEY       — IBM Watson Machine Learning API key
  IBM_BOB_MODEL         — model deployment ID / name
  IBM_BOB_BASE_URL      — WML inference endpoint base URL

LIMITATIONS
-----------
- rules_fallback is deterministic and cannot answer questions beyond the
  supplied context.  It will explicitly state this.
- IBM Bob integration requires a live WML endpoint and valid credentials.
  Without them, the service returns labeled rules_fallback output — never
  pretends an LLM answered.
- All context data is synthetic demo data only.
"""

from __future__ import annotations

import logging
import textwrap
from typing import Optional

from sqlalchemy.orm import Session

from ..schemas.copilot import (
    CopilotAskResponse,
    CopilotContextSnapshot,
)
from ..services.congestion import (
    compute_dashboard_summary,
    compute_congestion_horizon,
    _SCENARIO_MULTIPLIER,
)
from ..schemas.dashboard import VALID_SCENARIOS

logger = logging.getLogger(__name__)

# ── Settings ──────────────────────────────────────────────────────────────────

def _copilot_settings():
    """Import settings lazily to avoid circular imports."""
    from ..core.config import settings
    return settings


# ── Context builder ───────────────────────────────────────────────────────────

def build_context(
    db: Session,
    port_code: str,
    scenario: str,
) -> Optional[CopilotContextSnapshot]:
    """
    Gather structured context from existing services.

    Returns None when port_code is not found.
    Uses only services/routes that already exist — no new DB queries invented.
    """
    # ── 1. Dashboard summary ──────────────────────────────────────────────────
    summary = compute_dashboard_summary(
        db, port_code=port_code, scenario=scenario, horizon_hours=72
    )
    if summary is None:
        return None

    # ── 2. Congestion horizon — top rule drivers from first non-empty window ──
    horizon = compute_congestion_horizon(
        db, port_code=port_code, scenario=scenario, horizon_hours=72
    )
    top_drivers: list[str] = []
    for w in horizon.windows:
        if w.rule_drivers:
            top_drivers = w.rule_drivers[:3]
            break

    # ── 3. Waiting-times — top vessel info (scenario-aware) ───────────────────
    wt_info = _waiting_context(db, port_code=port_code, scenario=scenario)

    # ── 4. Alternate-routing for top vessel ───────────────────────────────────
    routing_recommended: Optional[bool] = None
    routing_reason: Optional[str] = None
    if wt_info and wt_info.get("top_schedule_id"):
        try:
            from ..services.alternate_routing import compute_alternate_routing
            vessel_id_str = wt_info.get("top_vessel_id")
            sched_id_str = wt_info.get("top_schedule_id")
            if vessel_id_str:
                ar = compute_alternate_routing(
                    db,
                    vessel_id_str=vessel_id_str,
                    schedule_id_str=sched_id_str,
                    scenario=scenario,
                )
                if ar:
                    routing_recommended = ar.recommended
                    routing_reason = ar.reason
        except Exception as exc:
            logger.debug("Alternate routing context unavailable: %s", exc)

    return CopilotContextSnapshot(
        port_code=port_code,
        port_name=summary.port_name,
        scenario=scenario,
        peak_risk_level=summary.peak_risk_level,
        peak_congestion_risk_pct=round(summary.peak_congestion_risk * 100, 1),
        active_vessel_count=summary.active_vessel_count,
        arrivals_next_24h=summary.arrivals_next_24h,
        avg_estimated_waiting_minutes=summary.avg_estimated_waiting_minutes,
        available_crane_count=summary.available_crane_count,
        berth_occupancy_pct=summary.berth_occupancy_pct,
        high_risk_vessels=wt_info.get("high_risk_vessels", []) if wt_info else [],
        top_waiting_vessel=wt_info.get("top_vessel_name") if wt_info else None,
        top_waiting_hours=wt_info.get("top_waiting_hours") if wt_info else None,
        top_waiting_cause=wt_info.get("top_primary_cause") if wt_info else None,
        routing_recommended=routing_recommended,
        routing_reason=routing_reason,
        top_rule_drivers=top_drivers,
    )


# ── Waiting-times context helper ─────────────────────────────────────────────

def _waiting_context(db: Session, port_code: str, scenario: str = "baseline") -> Optional[dict]:
    """
    Pull waiting-time data for the top vessel.

    Returns a dict with selected fields or None on error.
    Defined at module level (imported via 'from ..services import _waiting_context').
    """
    try:
        from sqlalchemy import cast as sa_cast, String as SAStr
        from ..models.berth import Berth
        from ..models.crane import Crane
        from ..models.historical_operation import HistoricalOperation
        from ..models.port import Port
        from ..models.vessel import Vessel
        from ..models.vessel_schedule import VesselSchedule
        from ..schemas.dashboard import (
            WAITING_METHOD_BASELINE,
            waiting_risk_level,
        )
        from datetime import timezone

        # Resolve port
        port_row = (
            db.query(sa_cast(Port.id, SAStr).label("id_str"))
            .filter(Port.code == port_code)
            .first()
        )
        if port_row is None:
            return None
        port_id_str = port_row.id_str

        # Berth/crane counts
        total_berths = (
            db.query(Berth)
            .filter(sa_cast(Berth.port_id, SAStr) == port_id_str)
            .count()
        )
        total_cranes = (
            db.query(Crane)
            .filter(
                sa_cast(Crane.port_id, SAStr) == port_id_str,
                Crane.status == "operational",
            )
            .count()
        )
        berth_rows = (
            db.query(Berth.max_draft_m, Berth.max_length_m)
            .filter(sa_cast(Berth.port_id, SAStr) == port_id_str)
            .all()
        )

        # Schedules — scan all schedules in horizon (same as waiting_times endpoint)
        schedule_rows = (
            db.query(
                sa_cast(VesselSchedule.id, SAStr).label("sched_id"),
                sa_cast(VesselSchedule.vessel_id, SAStr).label("vessel_id"),
                VesselSchedule.expected_containers,
                VesselSchedule.priority,
                Vessel.name.label("vessel_name"),
                Vessel.length_m,
                Vessel.draft_m,
            )
            .join(Vessel, VesselSchedule.vessel_id == Vessel.id)
            .filter(
                sa_cast(VesselSchedule.port_id, SAStr) == port_id_str,
            )
            .order_by(VesselSchedule.eta)
            .all()
        )

        # Historical waiting
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

        multiplier = _SCENARIO_MULTIPLIER.get(scenario, 1.0)
        vessels = []
        for idx, row in enumerate(schedule_rows):
            compat = sum(
                1 for b in berth_rows
                if float(b.max_draft_m) >= float(row.draft_m)
                and float(b.max_length_m) >= float(row.length_m)
            )
            queue = idx
            wait_min = waiting_by_sched.get(row.sched_id, 0)
            hours = round((wait_min / 60.0) * multiplier, 4)
            risk = waiting_risk_level(hours)
            # primary cause
            cause: Optional[str] = None
            if queue >= 3:
                cause = "high queue at arrival"
            elif compat == 1:
                cause = "limited berth compatibility"
            elif int(row.priority) == 1:
                cause = "high-priority vessel"
            vessels.append({
                "sched_id": row.sched_id,
                "vessel_id": row.vessel_id,
                "vessel_name": str(row.vessel_name),
                "hours": hours,
                "risk": risk,
                "cause": cause,
            })

        vessels.sort(key=lambda v: v["hours"], reverse=True)
        high_risk = [v["vessel_name"] for v in vessels if v["risk"] in ("high",)]
        top = vessels[0] if vessels else None

        return {
            "high_risk_vessels": high_risk[:5],
            "top_vessel_name": top["vessel_name"] if top else None,
            "top_vessel_id": top["vessel_id"] if top else None,
            "top_schedule_id": top["sched_id"] if top else None,
            "top_waiting_hours": top["hours"] if top else None,
            "top_primary_cause": top["cause"] if top else None,
        }
    except Exception as exc:
        logger.debug("Waiting context unavailable: %s", exc)
        return None


# ── Rules fallback ────────────────────────────────────────────────────────────

def _rules_fallback(ctx: CopilotContextSnapshot, question: str) -> str:
    """
    Generate a deterministic plain-language explanation from structured context.

    Answers only from supplied context. Never invents facts.
    """
    risk = ctx.peak_risk_level.upper()
    risk_pct = ctx.peak_congestion_risk_pct

    q = question.lower()
    is_wait_question = any(word in q for word in ("wait", "delay", "late", "vessel", "ship"))
    is_risk_question = any(word in q for word in ("congestion", "risk", "why", "busy", "queue"))
    is_routing_question = any(word in q for word in ("route", "routing", "divert", "alternate", "other port"))
    is_resource_question = any(word in q for word in ("berth", "crane", "resource", "capacity", "maintenance"))
    is_plan_question = any(word in q for word in ("plan", "optim", "schedule", "recommend"))

    lines = [
        f"**Port:** {ctx.port_name} ({ctx.port_code})  |  "
        f"**Scenario:** {ctx.scenario}  |  "
        f"⚠️ Demo starter data and local planning inputs only.",
        "",
    ]

    # Answer the operator's subject first, then provide enough context to audit it.
    if is_wait_question and ctx.top_waiting_vessel:
        lines += [
            "**Waiting-time answer:**",
            f"{ctx.top_waiting_vessel} has the highest current estimated wait: "
            f"**{ctx.top_waiting_hours:.1f} hours**"
            + (f". Main driver: {ctx.top_waiting_cause}." if ctx.top_waiting_cause else "."),
        ]
    elif is_routing_question:
        lines += ["**Routing answer:**"]
        lines.append(ctx.routing_reason if ctx.routing_recommended and ctx.routing_reason else "No diversion benefit is currently identified from the available planning data.")
    elif is_resource_question:
        lines += [
            "**Resource answer:**",
            f"{ctx.available_crane_count} cranes are operational and berth allocation is "
            f"{ctx.berth_occupancy_pct:.0f}% of the available terminal capacity.",
        ]
    elif is_plan_question:
        lines += [
            "**Planning answer:**",
            "Use Optimizer after you save vessel or resource changes. It creates a new CP-SAT berth and crane proposal; review it in Operations Plan before approval.",
        ]
    else:
        lines += [
            "**Current operational answer:**",
            f"Peak congestion risk is **{risk} ({risk_pct:.0f}%)**. "
            f"There are {ctx.active_vessel_count} active calls and {ctx.arrivals_next_24h} arrivals in the next 24 hours.",
        ]

    lines += [
        "",
        "**Supporting facts:**",
        f"- Average estimated wait: {ctx.avg_estimated_waiting_minutes:.0f} min ({ctx.avg_estimated_waiting_minutes/60:.1f} h)",
        f"- Operational cranes: {ctx.available_crane_count}",
        f"- Peak congestion risk: {risk} ({risk_pct:.0f}%)",
    ]

    if ctx.top_waiting_vessel:
        lines.append(
            f"- Highest predicted wait: {ctx.top_waiting_vessel} "
            f"— {ctx.top_waiting_hours:.1f} h"
            + (f" ({ctx.top_waiting_cause})" if ctx.top_waiting_cause else "")
        )

    if ctx.high_risk_vessels:
        lines.append(
            f"- High-risk vessels: {', '.join(ctx.high_risk_vessels)}"
        )

    if ctx.top_rule_drivers:
        lines.append("")
        lines.append("**Top congestion drivers:**")
        for d in ctx.top_rule_drivers:
            lines.append(f"- {d}")

    if ctx.routing_recommended is not None:
        lines.append("")
        if ctx.routing_recommended:
            lines.append(
                f"**Routing:** Diversion recommended — {ctx.routing_reason}"
            )
        else:
            lines.append(
                f"**Routing:** Stay at current port — {ctx.routing_reason}"
            )

    # Recommendations — derived only from context, no invention
    lines += ["", "**3 operational recommendations (from structured context):**"]

    rec_num = 1

    if ctx.peak_risk_level in ("high", "critical"):
        lines.append(
            f"{rec_num}. Prioritise berth allocation for the {ctx.arrivals_next_24h} "
            f"incoming vessels to reduce queue build-up (peak risk is {risk})."
        )
        rec_num += 1
    else:
        lines.append(
            f"{rec_num}. Current congestion risk is {risk} ({risk_pct:.0f}%) — "
            f"maintain normal operations but monitor arrivals closely."
        )
        rec_num += 1

    if ctx.top_waiting_vessel and ctx.top_waiting_hours and ctx.top_waiting_hours > 6:
        lines.append(
            f"{rec_num}. Investigate delay for {ctx.top_waiting_vessel} "
            f"(predicted {ctx.top_waiting_hours:.1f} h wait"
            + (f"; cause: {ctx.top_waiting_cause}" if ctx.top_waiting_cause else "")
            + "). Consider pre-positioning cranes or reassigning berth."
        )
        rec_num += 1
    else:
        lines.append(
            f"{rec_num}. No vessel with a critical wait was identified from the "
            f"baseline data — review individual vessel schedules for priority-1 calls."
        )
        rec_num += 1

    if ctx.routing_recommended:
        lines.append(
            f"{rec_num}. {ctx.routing_reason or 'Consider alternate port routing per recommendation.'}"
        )
    else:
        lines.append(
            f"{rec_num}. Current port capacity appears sufficient; "
            f"diversion to alternate ports is not recommended at this time."
        )

    lines += [
        "",
        "_This response was generated by the local PortFlow API from structured database context. "
        "No LLM was used. It supports operational questions but cannot answer unrelated questions or execute actions._",
    ]

    return "\n".join(lines)


# ── IBM Bob provider (stub — requires real credentials) ───────────────────────

def _ibm_bob_ask(
    ctx: CopilotContextSnapshot,
    question: str,
    api_key: str,
    model: str,
    base_url: str,
) -> str:
    """
    Call IBM Watson Machine Learning / IBM Bob inference endpoint.

    This is a real HTTP call — it will only work when valid credentials are
    supplied via environment variables.  Never logs credentials.

    Raises RuntimeError on connection/auth failure so callers can fall back.
    """
    import json
    import urllib.parse
    import urllib.request
    import urllib.error

    context_text = (
        f"Port: {ctx.port_name} ({ctx.port_code}), scenario: {ctx.scenario}.\n"
        f"Peak risk: {ctx.peak_risk_level} ({ctx.peak_congestion_risk_pct:.0f}%).\n"
        f"Active vessels: {ctx.active_vessel_count}, "
        f"arrivals next 24 h: {ctx.arrivals_next_24h}.\n"
        f"Avg wait: {ctx.avg_estimated_waiting_minutes:.0f} min.\n"
    )
    if ctx.top_waiting_vessel:
        context_text += (
            f"Highest wait: {ctx.top_waiting_vessel} "
            f"({ctx.top_waiting_hours:.1f} h"
            + (f", {ctx.top_waiting_cause}" if ctx.top_waiting_cause else "")
            + ").\n"
        )
    if ctx.top_rule_drivers:
        context_text += "Congestion drivers: " + "; ".join(ctx.top_rule_drivers) + ".\n"
    if ctx.routing_recommended is not None:
        context_text += (
            f"Routing: {'diversion recommended' if ctx.routing_recommended else 'stay at port'}. "
            f"{ctx.routing_reason or ''}\n"
        )

    system_prompt = textwrap.dedent("""
        You are a port operations assistant explaining PortFlow AI results.
        Rules:
        - Answer ONLY from the supplied context. Do NOT invent vessel names, port names, weather, costs, or facts not in the context.
        - Explicitly state that all data is synthetic demo data.
        - Distinguish prediction from historical fact.
        - Provide exactly 3 concise operational recommendations.
        - Never claim to execute an action or control port equipment.
        - Keep the response under 300 words.
    """).strip()

    user_prompt = (
        f"Context (synthetic demo data only):\n{context_text}\n\n"
        f"Question: {question}"
    )

    payload = json.dumps({
        "input": f"<|system|>\n{system_prompt}\n<|user|>\n{user_prompt}\n<|assistant|>",
        "parameters": {
            "decoding_method": "greedy",
            "max_new_tokens": 400,
            "stop_sequences": ["<|user|>"],
        },
    }).encode()

    # IBM Cloud API keys must first be exchanged for a short-lived IAM access
    # token. The token—not the API key—is used as the inference bearer token.
    token_request = urllib.request.Request(
        "https://iam.cloud.ibm.com/identity/token",
        data=urllib.parse.urlencode({
            "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
            "apikey": api_key,
        }).encode(),
        headers={"Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(token_request, timeout=15) as token_response:
            access_token = json.loads(token_response.read())["access_token"]
    except Exception as exc:
        raise RuntimeError("IBM Cloud IAM authentication failed") from exc

    req = urllib.request.Request(
        f"{base_url.rstrip('/')}/ml/v1/deployments/{urllib.parse.quote(model, safe='')}/text/generation?version=2024-01-01",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read())
            return result["results"][0]["generated_text"].strip()
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"IBM Bob HTTP {exc.code}") from exc
    except Exception as exc:
        raise RuntimeError(f"IBM Bob unavailable: {exc}") from exc


# ── Main entry point ──────────────────────────────────────────────────────────

def copilot_ask(
    ctx: CopilotContextSnapshot,
    question: str,
) -> CopilotAskResponse:
    """
    Route the question to IBM Bob or rules_fallback based on configuration.

    Never logs or returns secret values.
    """
    cfg = _copilot_settings()
    provider = getattr(cfg, "copilot_provider", "").lower().strip()
    api_key  = getattr(cfg, "ibm_bob_api_key",   "").strip()
    model    = getattr(cfg, "ibm_bob_model",      "").strip()
    base_url = getattr(cfg, "ibm_bob_base_url",   "").strip()

    use_ibm = (
        provider == "ibm_bob"
        and bool(api_key)
        and bool(model)
        and bool(base_url)
    )

    if use_ibm:
        try:
            answer = _ibm_bob_ask(ctx, question, api_key, model, base_url)
            return CopilotAskResponse(
                answer=answer,
                method="ibm_bob_llm",
                provider_available=True,
                question=question,
                port_code=ctx.port_code,
                scenario=ctx.scenario,
                context_snapshot=ctx,
            )
        except RuntimeError as exc:
            logger.warning("IBM Bob unavailable (%s) — falling back to rules", exc)

    # Rules fallback (always available)
    answer = _rules_fallback(ctx, question)
    return CopilotAskResponse(
        answer=answer,
        method="rules_fallback",
        provider_available=False,
        question=question,
        port_code=ctx.port_code,
        scenario=ctx.scenario,
        context_snapshot=ctx,
    )
