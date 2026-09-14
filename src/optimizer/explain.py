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
    Return a single plain-language sentence describing one berth assignment.

    Example:
      "FALKERMERE ATLAS (priority 1) → Berth B01: service starts at
       2026-09-15T08:00Z, ends at 2026-09-15T10:30Z (150 min service,
       0 min wait, 3 cranes)."
    """
    start_str = a.start_time.strftime("%Y-%m-%dT%H:%MZ")
    end_str = a.end_time.strftime("%Y-%m-%dT%H:%MZ")
    wait_note = (
        f"{a.waiting_minutes} min wait"
        if a.waiting_minutes > 0
        else "no wait"
    )
    return (
        f"{a.vessel_name} (priority {a.priority}) → Berth {a.berth_code}: "
        f"service {start_str} to {end_str} "
        f"({a.service_minutes} min service, {wait_note}, "
        f"{a.cranes_assigned} crane{'s' if a.cranes_assigned != 1 else ''})."
    )


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
        lines.append(
            f"Total wait: {m.opt_total_wait_minutes:.0f} min (optimizer) vs "
            f"{m.fifo_total_wait_minutes:.0f} min (FIFO baseline). "
            f"Reduction: {m.wait_reduction_minutes:.0f} min."
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
