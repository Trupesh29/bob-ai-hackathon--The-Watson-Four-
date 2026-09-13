# Solution Overview — PortFlow AI

**Track:** AI  |  **Problem:** L1 — Container Congestion Predictor & Port Operations Optimiser

---

## Summary

PortFlow AI transforms a port shift supervisor's reactive, spreadsheet-driven
workflow into a proactive, explainable, human-approved operations cycle.  The
system predicts congestion before it occurs, proposes an optimised 72-hour plan,
explains the reasoning in plain language, and records supervisor approval before
any change takes effect.

---

## The Four-Layer Loop

```
┌─────────────────────────────────────────────────────────────────────┐
│  INPUT                                                              │
│  Vessel schedules (ETA, TEU, priority) + Berth capacity snapshot    │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 1 — ML PREDICTION  (scikit-learn, Joblib)                    │
│  • Congestion risk score per berth window (0–1 probability)         │
│  • Vessel waiting-time forecast (hours) + confidence interval       │
│  • Identifies congestion hotspot windows and berths                 │
│  • Output: structured PredictionResult objects                      │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 2 — OPTIMISATION  (Google OR-Tools CP-SAT)                   │
│  • Jointly assigns vessels to berths and cranes                     │
│  • Minimises total waiting time subject to hard capacity constraints │
│  • Evaluates alternate routing when risk score > threshold          │
│  • Output: PlanProposal (list of BerthAssignment + CraneAssignment) │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 3 — HUMAN APPROVAL GATE  (FastAPI + React UI)                │
│  • Shift supervisor reviews baseline vs optimised plan side-by-side │
│  • IBM Bob (MCP) provides plain-language explanation on request     │
│  • Supervisor must explicitly approve or reject the plan proposal   │
│  • Approved plan is written to the database as active schedule      │
│  • Rejected plan is logged but never activated                      │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 4 — ACTIVE 72-HOUR PLAN  (PostgreSQL)                        │
│  • Approved berth and crane assignments stored as immutable records │
│  • Plan available for export and shift handover                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Role Boundaries

| Component | What it does | What it must NOT do |
|---|---|---|
| **ML model (scikit-learn)** | Predicts congestion risk score and vessel waiting time from historical/synthetic training data | Generate assignment schedules; approve actions |
| **Deterministic business logic (Python)** | Enforces berth capacity rules, calculates utilisation rates, validates arrival windows | Override hard physical constraints |
| **CP-SAT solver (OR-Tools)** | Produces mathematically optimal berth + crane joint assignments | Fabricate predictions; override supervisor approval |
| **IBM Bob / LLM (MCP server)** | Explains model outputs and plan summaries in plain language | Calculate assignments; invent numbers; approve plans |
| **Shift supervisor (human)** | Reviews baseline vs optimised plan; approves or rejects | Be bypassed for routing or plan activation |

This separation is the core differentiator from a basic risk dashboard:
the system closes the loop from prediction to executable plan while keeping
the human firmly in control of consequential decisions.

---

## What Makes This Different from a Risk Dashboard

| Capability | Basic risk dashboard | PortFlow AI |
|---|---|---|
| Congestion probability | ✅ Yes | ✅ Yes |
| Waiting-time forecast | ❌ Rarely | ✅ Yes |
| Optimised berth assignment | ❌ No | ✅ Yes |
| Joint crane allocation | ❌ No | ✅ Yes |
| Alternate routing trigger | ❌ No | ✅ Yes (when net benefit is positive) |
| 72-hour operations plan | ❌ No | ✅ Yes |
| Plain-language explanation | ❌ No | ✅ Yes (IBM Bob MCP) |
| Human approval gate | ❌ No | ✅ Yes (required) |

---

## ML Model Design

- **Algorithm:** scikit-learn gradient-based or ensemble regression
  (LinearRegression baseline; RandomForestRegressor or optional XGBoost
  only if cross-validated RMSE measurably improves over the baseline).
- **Features:** vessel TEU, ETA, priority class, current berth occupancy,
  scheduled crane availability, day-of-week, tidal window flag.
- **Targets:** `waiting_time_hours` (regression) and `congestion_risk_score`
  (derived from waiting-time quantile or trained as a separate classifier).
- **Serialisation:** Joblib (`.joblib` file, committed with model version tag).
- **Training data:** Seed-driven synthetic data; generation script in
  `src/backend/data/`.

---

## Optimiser Design (CP-SAT)

- **Decision variables:** `berth_assignment[vessel, berth]` (binary),
  `crane_assignment[vessel, crane]` (binary), `start_time[vessel]` (integer
  minutes from plan horizon start).
- **Hard constraints:** Each berth occupied by at most one vessel at a time;
  each crane assigned to at most one berth at a time; vessel start time ≥ ETA.
- **Soft objective:** Minimise `Σ (start_time[v] - ETA[v])` over all vessels.
- **Routing trigger:** If the optimised plan still shows
  `congestion_risk_score > REROUTE_THRESHOLD` (configurable, default 0.7)
  for a given berth window, the system generates an alternate-routing
  recommendation; this recommendation is advisory only.

---

## IBM Bob MCP Server

The PortFlow MCP server exposes three read-only tools:

| Tool | Input | Output |
|---|---|---|
| `get_risk_explanation` | `vessel_id`, `prediction_id` | Plain-language explanation of why a vessel has high congestion risk |
| `get_plan_summary` | `plan_id` | Human-readable summary of the 72-hour operations plan |
| `get_waiting_time_context` | `vessel_id` | Context explaining the waiting-time forecast and confidence range |

All tools are read-only.  They fetch structured data from the FastAPI backend
and format it as text.  They do not write to the database or calculate values.

---

## Data Policy

- All development and demo data is synthetic, reproducible, and seed-driven.
- Synthetic records carry a `is_synthetic: true` flag in the database and
  in all API responses.
- No confidential, personal, client, or social-media data is used.
- Any public dataset used will be documented with source and provenance in
  `docs/DATA_DICTIONARY.md`.

---

## Deployment Target (MVP)

| Component | Platform |
|---|---|
| PostgreSQL | Render (managed) or IBM Cloud Databases |
| FastAPI | Render Web Service or IBM Cloud Code Engine |
| React static build | Render Static Site, Vercel, or IBM Cloud Object Storage |

Deployment URLs will not be documented until a working public URL exists.
Current status: **not deployed** (see `docs/submission-readiness.md`).
