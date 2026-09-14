# API Contract — PortFlow AI

**Version:** v1  
**Base URL (local):** `http://localhost:8000/api/v1`  
**Base URL (production):** Pending deployment  
**Authentication:** JWT Bearer token for write endpoints; read endpoints may be public in development  
**Content-Type:** `application/json`  
**Timestamps:** All UTC, ISO 8601 format (`YYYY-MM-DDTHH:MM:SSZ`)

---

## Health

### `GET /api/v1/health`

Returns the API liveness status.  No authentication required.
No database connection is required.

**Response 200:**
```json
{
  "status": "healthy",
  "service": "portflow-api",
  "version": "0.1.0"
}
```

> **Contract change (Plan 2):** Original Plan 1 endpoint was `GET /health`
> returning `{"status":"ok","environment":"development"}`.  Updated in Plan 2
> to `GET /api/v1/health` (under the `/api/v1` prefix) with the canonical
> Bobathon response shape.  Recorded in `docs/AI_HANDOFF.md`.

---

## Vessels

### `GET /api/v1/vessels`

Returns the list of vessels in the current planning horizon.

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `horizon_start` | string (UTC ISO 8601) | Filter vessels arriving at or after this time |
| `horizon_end` | string (UTC ISO 8601) | Filter vessels arriving before or at this time |
| `is_synthetic` | boolean | If `true`, return only synthetic records |

**Response 200:**
```json
{
  "vessels": [
    {
      "vessel_id": "V001",
      "name": "SYNTHETIC-CONTAINER-001",
      "eta_utc": "2026-09-15T06:00:00Z",
      "teu": 4500,
      "priority": "HIGH",
      "is_synthetic": true
    }
  ],
  "total": 1
}
```

**Vessel priority values:** `HIGH`, `NORMAL`, `LOW`

### `POST /api/v1/vessels`

Creates a new vessel record.  Requires authentication.

**Request body:**
```json
{
  "name": "SYNTHETIC-CONTAINER-001",
  "eta_utc": "2026-09-15T06:00:00Z",
  "teu": 4500,
  "priority": "HIGH",
  "is_synthetic": true
}
```

**Response 201:** Created vessel object (same schema as in `GET` response).

---

## Berths

### `GET /api/v1/berths`

Returns all berths and their current capacity snapshot.

**Response 200:**
```json
{
  "berths": [
    {
      "berth_id": "B01",
      "name": "Berth 1 North",
      "max_teu_per_hour": 600,
      "crane_count": 2,
      "is_occupied": false,
      "current_vessel_id": null
    }
  ]
}
```

### `GET /api/v1/berths/{berth_id}`

Returns a single berth by ID.

---

## Predictions

### `POST /api/v1/predictions`

Triggers the ML inference pipeline for a given planning horizon.
Returns congestion risk scores and vessel waiting-time forecasts.

**Request body:**
```json
{
  "horizon_start_utc": "2026-09-15T00:00:00Z",
  "horizon_end_utc": "2026-09-18T00:00:00Z"
}
```

**Response 200:**
```json
{
  "prediction_id": "pred-20260915-001",
  "generated_at_utc": "2026-09-14T22:00:00Z",
  "model_version": "congestion_model_v1",
  "horizon_start_utc": "2026-09-15T00:00:00Z",
  "horizon_end_utc": "2026-09-18T00:00:00Z",
  "results": [
    {
      "vessel_id": "V001",
      "congestion_risk_score": 0.82,
      "waiting_time_hours": 3.4,
      "waiting_time_ci_lower": 2.1,
      "waiting_time_ci_upper": 5.2,
      "risk_level": "HIGH",
      "is_synthetic": true
    }
  ],
  "hotspots": [
    {
      "berth_id": "B01",
      "window_start_utc": "2026-09-15T06:00:00Z",
      "window_end_utc": "2026-09-15T12:00:00Z",
      "peak_risk_score": 0.82
    }
  ]
}
```

**Risk level values:** `HIGH` (score ≥ 0.7), `MEDIUM` (0.5 – 0.69), `LOW` (< 0.5)

### `GET /api/v1/predictions/{prediction_id}`

Returns a previously generated prediction by ID.

---

## Plans — Optimisation

### `POST /api/v1/plans/optimise`

Triggers the CP-SAT solver to generate an optimised 72-hour berth and
crane assignment plan.  Returns a plan proposal with `status = "proposed"`.
The supervisor must call `POST /api/v1/plans/{plan_id}/approve` to activate it.

**Request body:**
```json
{
  "prediction_id": "pred-20260915-001",
  "horizon_start_utc": "2026-09-15T00:00:00Z",
  "horizon_end_utc": "2026-09-18T00:00:00Z"
}
```

**Response 200:**
```json
{
  "plan_id": "plan-20260915-001",
  "status": "proposed",
  "generated_at_utc": "2026-09-14T22:05:00Z",
  "prediction_id": "pred-20260915-001",
  "solver": "cpsat",
  "objective_value": 12.4,
  "baseline_objective_value": 28.7,
  "berth_assignments": [
    {
      "assignment_id": "ba-001",
      "vessel_id": "V001",
      "berth_id": "B02",
      "start_time_utc": "2026-09-15T07:00:00Z",
      "end_time_utc": "2026-09-15T14:00:00Z"
    }
  ],
  "crane_assignments": [
    {
      "assignment_id": "ca-001",
      "vessel_id": "V001",
      "berth_id": "B02",
      "crane_id": "C03",
      "start_time_utc": "2026-09-15T07:00:00Z",
      "end_time_utc": "2026-09-15T14:00:00Z"
    }
  ],
  "routing_recommendations": []
}
```

**`objective_value`:** Total vessel waiting hours in optimised plan  
**`baseline_objective_value`:** Total vessel waiting hours in first-come-first-served baseline

### `GET /api/v1/plans`

Returns all plan proposals and active plans.

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `status` | string | Filter by status: `proposed`, `active`, `rejected` |

### `GET /api/v1/plans/{plan_id}`

Returns a single plan by ID.

---

## Plans — Human Approval

### `POST /api/v1/plans/{plan_id}/approve`

The shift supervisor explicitly approves a proposed plan.
Sets `plan.status = "active"`.  Requires authentication.

**⚠️ This is the human approval gate.  No LLM or automated process may call
this endpoint on behalf of a supervisor.**

**Request body:**
```json
{
  "supervisor_id": "SUP-001",
  "notes": "Approved for shift starting 2026-09-15 06:00 UTC"
}
```

**Response 200:**
```json
{
  "approval_id": "appr-001",
  "plan_id": "plan-20260915-001",
  "approved_by": "SUP-001",
  "approved_at_utc": "2026-09-14T22:10:00Z",
  "notes": "Approved for shift starting 2026-09-15 06:00 UTC",
  "plan_status": "active"
}
```

### `POST /api/v1/plans/{plan_id}/reject`

The shift supervisor rejects a proposed plan.
Sets `plan.status = "rejected"`.  Requires authentication.

**Request body:**
```json
{
  "supervisor_id": "SUP-001",
  "reason": "Berth B02 maintenance not reflected in schedule"
}
```

**Response 200:** Updated plan summary with `status = "rejected"`.

---

## Routing Recommendations

### `GET /api/v1/routing`

Returns routing recommendations for a given plan or prediction.

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `plan_id` | string | Filter by plan ID |
| `prediction_id` | string | Filter by prediction ID |

**Response 200:**
```json
{
  "recommendations": [
    {
      "recommendation_id": "rr-001",
      "vessel_id": "V001",
      "current_berth_id": "B01",
      "recommended_berth_id": "B04",
      "reason": "Berth B01 has peak congestion risk 0.82 during arrival window; Berth B04 available with risk 0.21",
      "net_benefit_hours": 2.3,
      "status": "pending_approval"
    }
  ]
}
```

**Routing recommendations are advisory only.**  A recommendation only triggers
when `congestion_risk_score > REROUTE_THRESHOLD` (default 0.7) AND
`net_benefit_hours > 0`.

---

## Error Responses

All error responses follow this structure:

```json
{
  "detail": "Human-readable error message",
  "error_code": "MACHINE_READABLE_CODE"
}
```

| HTTP Status | Meaning |
|---|---|
| 400 | Bad request — validation error |
| 401 | Unauthenticated — missing or invalid JWT |
| 403 | Forbidden — insufficient permissions |
| 404 | Resource not found |
| 409 | Conflict — e.g., plan already approved |
| 422 | Unprocessable entity — Pydantic validation failure |
| 500 | Internal server error |

---

## Contract Change Log

| Date | Change | Recorded in AI_HANDOFF.md |
|---|---|---|
| 2026-09-13 | Initial contract created | Yes — Plan 1 session |
| 2026-09-13 | Health endpoint moved to `/api/v1/health`; response shape updated to `{"status":"healthy","service":"portflow-api","version":"0.1.0"}` | Yes — Plan 2 session |
