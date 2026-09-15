"""
PortFlow AI — Plain-language explanation of optimizer assignments.

PURPOSE
-------
Converts each BerthAssignment into an operational sentence a port supervisor
could read and act on.  Also summarises the full OptimizerResult.

DISCLAIMER: derived from synthetic data only.  Requires human review.
"""

from __future__ import annotations

from .models import BerthAssignment, OptimizerResult, UnscheduledVessel


def explain_assignment(a: BerthAssignment) -> str:
    """
    Return a rich plain-language sentence describing one berth assignment,
    including the primary reason for the berth choice and any wait cause.

    Example:
      "FALKERMERE TITAN (P1) → Berth B01: service 08:00–10:30Z (150 min,
       3 cranes). Assigned to B01 — only berth compatible with 14.5m draft.
       No wait."
    """
    start_str = a.start_time.strftime("%Y-%m-%dT%H:%MZ")
    end_str = a.end_time.strftime("%Y-%m-%dT%H:%MZ")

    # ── Wait explanation ──────────────────────────────────────────────────────
    if a.waiting_minutes == 0:
        wait_note = "no wait"
    elif a.waiting_minutes < 60:
        wait_note = f"{a.waiting_minutes} min wait"
    else:
        wait_h = a.waiting_minutes // 60
        wait_m = a.waiting_minutes % 60
        wait_note = f"{wait_h}h {wait_m}m wait" if wait_m else f"{wait_h}h wait"

    # ── Berth choice reason ───────────────────────────────────────────────────
    reason = _berth_reason(a)

    return (
        f"{a.vessel_name} (P{a.priority}) → Berth {a.berth_code}: "
        f"service {start_str} to {end_str} "
        f"({a.service_minutes} min, {a.cranes_assigned} crane{'s' if a.cranes_assigned != 1 else ''}, {wait_note}). "
        f"{reason}"
    )


def _berth_reason(a: BerthAssignment) -> str:
    """Generate a plain-language reason for why this vessel was assigned to this berth."""
    parts: list[str] = []

    # Draft / size constraint hint
    if a.draft_m and a.draft_m >= 13.0:
        parts.append(f"assigned to {a.berth_code} — deep-draft berth required ({a.draft_m:.1f}m)")
    elif a.waiting_minutes > 120:
        wait_h = round(a.waiting_minutes / 60, 1)
        parts.append(
            f"waited {wait_h}h — higher-priority vessels or berth constraints delayed start"
        )
    elif a.waiting_minutes > 0:
        parts.append(f"short wait due to berth turnover from previous vessel")
    else:
        parts.append(f"assigned to {a.berth_code} — berth available on arrival")

    # Priority context
    if a.priority == 1:
        parts.append("critical-priority vessel served first")
    elif a.priority == 2:
        parts.append("high-priority vessel scheduled ahead of standard calls")

    return ". ".join(p.capitalize() for p in parts) + "."


def explain_unscheduled(u: UnscheduledVessel) -> str:
    """
    Return a plain-language sentence for an unscheduled vessel.

    Example:
      "FALKERMERE NIMBUS (priority 4) could not be scheduled: vessel
       length 150.0 m / draft 8.5 m exceeds all available berth capacities."
    """
    return (
        f"{u.vessel_name} (priority {u.priority}) could not be scheduled: "
        f"{u.reason}"
    )


def explain_result(result: OptimizerResult) -> str:
    """
    Return a multi-line plain-language summary of the full optimizer result.

    Includes:
    - Solver status and metrics
    - Before/after comparison
    - One line per assignment
    - One line per unscheduled vessel
    - Assumptions and disclaimer
    """
    lines: list[str] = []

    m = result.metrics
    if m:
        lines.append(
            f"[Optimizer: {result.optimizer_method} | status: {m.solve_status} | "
            f"wall: {m.solve_wall_seconds:.2f}s]"
        )
        lines.append(
            f"Scheduled {m.scheduled_count}/{m.total_vessels} vessels. "
            f"Unscheduled: {m.unscheduled_count}."
        )
        # Before/after comparison
        fifo_h = round(m.fifo_total_wait_minutes / 60, 1)
        opt_h = round(m.opt_total_wait_minutes / 60, 1)
        saved_h = round(m.wait_reduction_minutes / 60, 1)
        lines.append(
            f"Total wait: {opt_h}h (optimizer) vs {fifo_h}h (FIFO baseline). "
            f"Reduction: {saved_h}h ({m.wait_reduction_minutes:.0f} min)."
        )
        lines.append(
            f"Avg wait: {m.avg_wait_minutes:.0f} min. "
            f"Berth utilisation: {m.berth_utilization_pct:.1f}%. "
            f"Crane utilisation: {m.crane_utilization_pct:.1f}%."
        )

    if result.assignments:
        lines.append("")
        lines.append("ASSIGNMENTS:")
        for a in sorted(result.assignments, key=lambda x: (x.priority, x.start_time)):
            lines.append(f"  {explain_assignment(a)}")

    if result.unscheduled:
        lines.append("")
        lines.append("UNSCHEDULED VESSELS:")
        for u in result.unscheduled:
            lines.append(f"  {explain_unscheduled(u)}")

    if result.assumptions:
        lines.append("")
        lines.append("ASSUMPTIONS:")
        for assumption in result.assumptions:
            lines.append(f"  - {assumption}")

    lines.append("")
    lines.append(f"DISCLAIMER: {result.limitations}")

    return "\n".join(lines)
