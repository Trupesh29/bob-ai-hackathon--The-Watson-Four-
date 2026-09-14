# AI Workflow — PortFlow AI

**Track:** AI  |  **Problem:** L1 — Container Congestion Predictor & Port Operations Optimiser

---

## IBM Bob as the Primary Development IDE

IBM Bob is the **core development tool** for all PortFlow AI application work.
Every significant development task — writing route handlers, designing schemas,
reviewing optimiser logic, debugging tests — should be conducted as a Bob task
so that the session history and task-consumption evidence can be exported.

### What IBM Bob Does in This Project

| Role | What Bob does |
|---|---|
| **IDE** | Primary interface for writing and reviewing Python, TypeScript, YAML, and SQL |
| **Code reviewer** | Reviews FastAPI handlers, Pydantic schemas, and SQLAlchemy models against the API contract |
| **Docs assistant** | Keeps `docs/AI_HANDOFF.md` updated; reconciles contract documents |
| **Explanation engine** | Via the PortFlow MCP server, explains congestion risk scores and plan summaries in plain language |

### What IBM Bob Must NOT Do

| Prohibited action | Reason |
|---|---|
| Calculate berth or crane assignments | Assignments must come from the CP-SAT solver, not from LLM reasoning |
| Generate or invent numerical vessel schedules | Would introduce non-reproducible, unverifiable data |
| Approve a 72-hour operations plan | Human-approval gate is a hard requirement |
| Confirm or recommend routing changes | Routing recommendations must come from the optimiser |
| Access the write endpoints of the PortFlow API | MCP server is read-only |

---

## PortFlow MCP Server

The PortFlow MCP server exposes structured, safe, **read-only** tools that IBM
Bob can call to explain model and solver outputs without fabricating data.

### MCP Server Location

```
src/backend/app/mcp_server.py   # FastMCP server definition
```

### MCP Tools

#### `get_risk_explanation`

**Purpose:** Explain in plain language why a specific vessel has a given
congestion risk score.

**Input:**
```json
{
  "vessel_id": "V001",
  "prediction_id": "pred-20260915-001"
}
```

**What it does:**
1. Calls `GET /api/v1/predictions/{prediction_id}` on the PortFlow backend.
2. Extracts the result for `vessel_id`.
3. Returns a structured explanation referencing the actual score and features.

**What it must NOT do:** Invent or estimate numbers not present in the API response.

---

#### `get_plan_summary`

**Purpose:** Summarise the 72-hour operations plan for the shift supervisor.

**Input:**
```json
{
  "plan_id": "plan-20260915-001"
}
```

**What it does:**
1. Calls `GET /api/v1/plans/{plan_id}` on the PortFlow backend.
2. Returns a plain-language summary of assignments, savings, and recommendations.

**What it must NOT do:** Modify the plan, approve it, or suggest a different assignment than what the solver produced.

---

#### `get_waiting_time_context`

**Purpose:** Explain the waiting-time forecast and confidence interval for
a vessel.

**Input:**
```json
{
  "vessel_id": "V001"
}
```

**What it does:**
1. Calls `GET /api/v1/vessels/{vessel_id}` and the associated prediction result.
2. Returns a plain-language description of the waiting-time forecast and what
   drives the confidence range.

---

### MCP Server Design Rules

- All tools call only `GET` endpoints on the PortFlow backend.
- No tool writes to the database or calls `POST`, `PATCH`, `PUT`, or `DELETE`.
- The MCP server authenticates to the backend using a read-only service token
  stored in an environment variable (`PORTFLOW_MCP_TOKEN`).
- The MCP server does not cache data between calls (stateless reads).
- All tool responses include the `prediction_id` or `plan_id` that the data
  was sourced from, so the supervisor can verify the source.

---

## Bob Session Export Requirements

Every significant IBM Bob task related to PortFlow AI development must be
exported to `bob_sessions/`.  See `bob_sessions/README.md` for detailed
instructions.

**Minimum export for each task:**
1. Exported Markdown task history (`task-<N>-<slug>.md`)
2. Task-consumption summary screenshot (`task-<N>-<slug>-screenshot.png`)

**Tasks that must be exported (at minimum):**

| Task | When to export |
|---|---|
| Plan 1: Documentation and submission baseline | After this session |
| Plan 2: Backend scaffold and DB models | After implementation |
| Plan 3: ML training pipeline | After model training verified |
| Plan 4: CP-SAT optimiser | After solver verified |
| Plan 5: Frontend | After UI approval gate working |
| MCP server demonstration | After Bob MCP explanation demonstrated |

---

## Development Workflow Per Plan

Each plan follows this sequence:

```
1. Bob reads docs/AI_HANDOFF.md and docs/PROJECT_CONTEXT.md
2. Bob reads relevant contract docs (API_CONTRACT, DATA_DICTIONARY, DEFINITION_OF_DONE)
3. Bob implements the plan scope
4. Bob runs validation (pytest, typecheck, lint, git diff --check)
5. Bob updates docs/AI_HANDOFF.md with completed work and next task
6. Human reviews diff before committing
7. Human exports Bob task history to bob_sessions/
```

---

## LLM Guardrails Summary

| Guardrail | Mechanism |
|---|---|
| No LLM assignments | CP-SAT solver produces all assignments; Bob only reads results |
| No LLM approval | Approval endpoint requires authenticated supervisor action from the React UI |
| No fabricated numbers | MCP tools only return data from the API; no free-form generation of predictions |
| Reproducible ML | scikit-learn + Joblib + fixed seed; not an LLM |
| Explainability without fabrication | Bob explains what the model produced, never what it thinks the model should have produced |
