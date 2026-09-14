"""
PortFlow AI — Pre-solve feasibility checks for the optimizer.

PURPOSE
-------
These checks run BEFORE the CP-SAT solver to:
1. Detect structurally infeasible vessels early (wrong dimensions, outside horizon).
2. Partition the input into (solvable, pre-rejected) lists.
3. Provide explicit human-readable rejection reasons.

Running these checks avoids wasting solver time on impossible assignments and
ensures every unscheduled vessel has a documented reason.

SYNTHETIC DATA DISCLAIMER
--------------------------
All compatibility rules are derived from the PortFlow synthetic dataset.
No real-world compatibility tables are used.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import List, Tuple

from .models import BerthInput, CraneInput, UnscheduledVessel, VesselInput


def is_berth_compatible(vessel: VesselInput, berth: BerthInput) -> bool:
    """
    Return True if the vessel's physical dimensions fit the berth.

    Compatibility criteria:
    - Vessel length <= berth max_length_m
    - Vessel draft  <= berth max_draft_m
    - Berth status  == "operational"

    Does NOT check cargo type (PortFlow synthetic data uses only 'containerised').
    """
    return (
        berth.status == "operational"
        and vessel.length_m <= berth.max_length_m
        and vessel.draft_m <= berth.max_draft_m
    )


def compatible_berths(
    vessel: VesselInput, berths: List[BerthInput]
) -> List[BerthInput]:
    """Return the subset of berths physically compatible with this vessel."""
    return [b for b in berths if is_berth_compatible(vessel, b)]


def partition_vessels(
    vessels: List[VesselInput],
    berths: List[BerthInput],
    cranes: List[CraneInput],
    horizon_start: datetime,
    horizon_end: datetime,
) -> Tuple[List[VesselInput], List[UnscheduledVessel]]:
    """
    Split vessels into (feasible_for_solver, pre_rejected).

    A vessel is pre-rejected if:
    1. Its arrival_time is at or after horizon_end — no time to serve it.
    2. No compatible berth exists.
    3. No operational cranes exist at all (port-wide crane failure).

    Parameters
    ----------
    vessels      : all vessel inputs for the planning horizon
    berths       : all berth inputs
    cranes       : all crane inputs
    horizon_start: start of planning window (timezone-aware UTC)
    horizon_end  : end of planning window (timezone-aware UTC)

    Returns
    -------
    (solvable, pre_rejected) — disjoint, ordered by priority then arrival
    """
    operational_cranes = [c for c in cranes if c.status == "operational"]
    total_cranes = len(operational_cranes)

    solvable: List[VesselInput] = []
    rejected: List[UnscheduledVessel] = []

    for v in vessels:
        # Ensure arrival_time is timezone-aware for comparison
        arr = v.arrival_time
        if arr.tzinfo is None:
            arr = arr.replace(tzinfo=timezone.utc)

        if arr >= horizon_end:
            rejected.append(
                UnscheduledVessel(
                    schedule_id=v.schedule_id,
                    vessel_id=v.vessel_id,
                    vessel_name=v.name,
                    arrival_time=arr,
                    priority=v.priority,
                    reason=(
                        f"Arrival at {arr.isoformat()} is at or after horizon end "
                        f"{horizon_end.isoformat()} — no time to serve this vessel."
                    ),
                )
            )
            continue

        compat = compatible_berths(v, berths)
        if not compat:
            rejected.append(
                UnscheduledVessel(
                    schedule_id=v.schedule_id,
                    vessel_id=v.vessel_id,
                    vessel_name=v.name,
                    arrival_time=arr,
                    priority=v.priority,
                    reason=(
                        f"No compatible berth: vessel length {v.length_m} m / "
                        f"draft {v.draft_m} m exceeds all available berth capacities."
                    ),
                )
            )
            continue

        if total_cranes == 0:
            rejected.append(
                UnscheduledVessel(
                    schedule_id=v.schedule_id,
                    vessel_id=v.vessel_id,
                    vessel_name=v.name,
                    arrival_time=arr,
                    priority=v.priority,
                    reason="No operational cranes available port-wide.",
                )
            )
            continue

        solvable.append(v)

    # Sort solvable by priority ascending (1=highest), then by arrival time
    solvable.sort(key=lambda v: (v.priority, v.arrival_time))
    return solvable, rejected


def estimate_service_minutes(
    vessel: VesselInput,
    berth: BerthInput,
    operational_cranes: List[CraneInput],
) -> int:
    """
    Estimate service duration in minutes using crane productivity.

    Formula:
      cranes_to_use   = min(berth.max_cranes, vessel.max_cranes,
                            cranes_at_berth_count)
      avg_moves_ph    = mean(moves_per_hour for assigned cranes)
      service_hours   = expected_containers / (cranes_to_use * avg_moves_ph)
      service_minutes = max(60, ceil(service_hours * 60))

    The 60-minute floor prevents unrealistically short service times.

    ASSUMPTION: cranes at the assigned berth are used first; any shortfall
    draws from movable cranes (berth_id == None).
    """
    import math

    # Cranes homed at this berth
    at_berth = [c for c in operational_cranes if c.berth_id == berth.berth_id]
    movable = [c for c in operational_cranes if c.berth_id is None]
    candidate_cranes = at_berth + movable

    cranes_to_use = min(
        berth.max_cranes,
        vessel.max_cranes,
        max(1, len(candidate_cranes)),
    )
    cranes_to_use = max(vessel.min_cranes, cranes_to_use)

    if candidate_cranes:
        avg_mph = sum(c.moves_per_hour for c in candidate_cranes[:cranes_to_use]) / cranes_to_use
    else:
        avg_mph = 20.0  # conservative fallback

    if vessel.expected_containers > 0 and avg_mph > 0:
        service_hours = vessel.expected_containers / (cranes_to_use * avg_mph)
        service_minutes = max(60, math.ceil(service_hours * 60))
    else:
        service_minutes = 60  # minimum service time

    return service_minutes
