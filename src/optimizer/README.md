# PortFlow AI — Optimizer Module

> ⚠️ **Synthetic data only.** All inputs are derived from `src/data/generator.py` (seed=2026). Results are illustrative and require human review before any operational use.

## Purpose

This module implements a **CP-SAT berth-and-crane allocation optimizer** for a fictional container terminal. It assigns arriving vessels to compatible berths with crane counts, minimising total waiting time and unscheduled vessels.

The optimizer is intentionally decoupled from FastAPI and the database. It operates on plain in-memory Python objects and can be called from tests, scripts, or future API endpoints.

---

## Files

| File | Purpose |
|---|---|
| `models.py` | In-memory dataclasses: `VesselInput`, `BerthInput`, `CraneInput`, `BerthAssignment`, `UnscheduledVessel`, `OptimizerMetrics`, `OptimizerResult` |
| `feasibility.py` | Pre-solve checks: `is_berth_compatible()`, `compatible_berths()`, `partition_vessels()`, `estimate_service_minutes()` |
| `berth_crane_optimizer.py` | CP-SAT model, FIFO baseline, `optimize()` entry point |
| `explain.py` | `explain_assignment()`, `explain_unscheduled()`, `explain_result()` — plain-language summaries |
| `tests/` | 11 unit tests |

---

## Quick Start

From `src/`:

```bash
# Run optimizer tests
python -m pytest optimizer/tests/ -v

# Use from Python
python - <<'EOF'
import sys; sys.path.insert(0, '.')
from datetime import datetime, timezone
from optimizer.models import VesselInput, BerthInput, CraneInput
from optimizer.berth_crane_optimizer import optimize
from optimizer.explain import explain_result

BASE = datetime(2026, 9, 15, 6, 0, 0, tzinfo=timezone.utc)
vessels = [VesselInput("s1","v1","TEST VESSEL",BASE,200.0,10.0,300,1,1,3)]
berths  = [BerthInput("b01","B01","Berth Alpha",400.0,16.0,4,"operational")]
cranes  = [CraneInput("qc01","QC01","b01",28.0,"operational")]
result  = optimize(vessels, berths, cranes)
print(explain_result(result))
EOF
```

---

## Decision Variables

| Variable | Description |
|---|---|
| `assigned[vi][bi]` | Boolean: vessel `vi` assigned to berth `bi` |
| `start_var[vi][bi]` | Integer minutes from horizon start when service begins |
| `is_scheduled[vi]` | Boolean: vessel `vi` receives any assignment |
| `cranes_var[vi]` | Integer: number of cranes allocated to vessel `vi` |

---

## Hard Constraints

| Constraint | Implementation |
|---|---|
| One vessel per berth at a time | `add_no_overlap` on conditional interval variables per berth |
| Vessel fits berth (length + draft) | `is_berth_compatible()` pre-filter; incompatible pairs excluded |
| Service begins at or after arrival | `start >= arrival_time` enforced when assigned |
| All work within horizon | `start + service_minutes <= horizon_end` enforced when assigned |
| Cranes within berth capacity | `cranes_var <= berth.max_cranes` when assigned |
| Each vessel assigned at most once | `add_at_most_one(assigned[vi])` |

---

## Objective

Weighted sum minimised by CP-SAT (lexicographic approximation):

```
minimize:
  total_wait_minutes  × 1000      (primary: reduce vessel waiting)
  unscheduled_vessels × 500000    (secondary: schedule all vessels)
```

---

## Service Duration Estimate

```
cranes_to_use = min(berth.max_cranes, vessel.max_cranes, cranes_at_berth)
avg_mph       = mean(moves_per_hour for assigned cranes)
service_hours = expected_containers / (cranes_to_use × avg_mph)
service_min   = max(60, ceil(service_hours × 60))
```

The 60-minute floor prevents unrealistically short service times.

---

## Solver Settings

| Setting | Value |
|---|---|
| Solver | OR-Tools CP-SAT |
| Random seed | `2026` (deterministic) |
| Time limit | `5 seconds` (configurable) |
| Workers | `1` (single-threaded for reproducibility) |

---

## Output Fields

`OptimizerResult`:
- `assignments` — `List[BerthAssignment]` with start/end times, cranes, wait minutes
- `unscheduled` — `List[UnscheduledVessel]` with explicit rejection reasons
- `metrics` — before/after wait, berth/crane utilisation, solver status
- `assumptions` — list of modelling assumptions
- `limitations` — synthetic-data disclaimer

---

## Limitations

1. **Synthetic data only** — not validated for real-world port operations.
2. **Service duration is estimated** — actual durations depend on tides, pilotage, yard congestion.
3. **No tidal windows, weather, or berthing sequence constraints** are modelled.
4. **Crane assignment is simplified** — time-indexed crane feasibility not fully modelled.
5. **Not integrated into the API yet** — API integration is the next plan.
6. **Human review required** before acting on any assignment.

---

*PortFlow AI — IBM Bobathon 2026 · Track AI · L1 Container Congestion Predictor*
