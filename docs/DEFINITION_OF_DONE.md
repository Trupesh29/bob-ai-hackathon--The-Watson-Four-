# Definition of Done — PortFlow AI

**Track:** AI  |  **Problem:** L1 — Container Congestion Predictor & Port Operations Optimiser

---

## Global Acceptance Criteria

These criteria apply to every feature before it is considered complete:

- [ ] Feature behaviour matches the API contract in `docs/API_CONTRACT.md`.
- [ ] All new database columns are defined in `docs/DATA_DICTIONARY.md`.
- [ ] No hardcoded credentials, secrets, or real personal data.
- [ ] All timestamps stored and returned in UTC.
- [ ] `is_synthetic` flag correctly set on all test/synthetic records.
- [ ] Unit tests cover happy path and at least one error path.
- [ ] `pytest` passes with no failures.
- [ ] Frontend TypeScript compiles with `npm run typecheck` — no errors.
- [ ] `npm run lint` passes — no errors.
- [ ] API changes are reflected in FastAPI `/docs` (Swagger UI).
- [ ] `git diff --check` passes (no trailing whitespace).

---

## Feature: Congestion Prediction

**Done when:**
- `POST /api/v1/predictions` returns a `PredictionResult` for every vessel in the horizon.
- Each result includes `congestion_risk_score` (float 0–1), `waiting_time_hours`,
  `waiting_time_ci_lower`, `waiting_time_ci_upper`, and `risk_level`.
- Given the same `RANDOM_SEED` and input data, the model returns identical predictions.
- The model artefact (`.joblib`) is committed under `src/backend/app/ml/models/`
  with a version tag in its filename.
- `GET /api/v1/predictions/{prediction_id}` retrieves a previously stored prediction.
- At least one hotspot window is identified when ≥ 2 vessels have `risk_level = HIGH`
  in the same 6-hour berth window.
- Training RMSE is documented in `docs/AI_HANDOFF.md`.

---

## Feature: 72-Hour Optimised Plan (CP-SAT)

**Done when:**
- `POST /api/v1/plans/optimise` returns a `PlanProposal` with status `proposed`.
- The proposal contains `berth_assignments` and `crane_assignments` for all
  vessels in the horizon.
- All hard constraints are satisfied:
  - Each berth has at most one vessel at any time.
  - Each crane serves at most one vessel at any time.
  - No vessel start time is earlier than its ETA.
- `objective_value` (total waiting hours) is less than or equal to `baseline_objective_value`.
- The solver returns within 30 seconds for a 72-hour horizon with ≤ 40 vessels.
- Solver status (`OPTIMAL`, `FEASIBLE`, `INFEASIBLE`) is logged.
- If status is `INFEASIBLE`, the API returns HTTP 422 with `error_code: SOLVER_INFEASIBLE`.

---

## Feature: Human Approval Gate

**Done when:**
- `POST /api/v1/plans/{plan_id}/approve` sets `plan.status = "active"` and
  creates a `PlanApproval` record.
- A plan with `status = "active"` cannot be approved or rejected again
  (returns HTTP 409 `PLAN_ALREADY_APPROVED`).
- `POST /api/v1/plans/{plan_id}/reject` sets `plan.status = "rejected"`.
- No automated process (including the MCP server) calls the approve endpoint.
- The React UI displays an explicit "Approve" button that requires a user click.
- Approved plans appear in the active schedule view.

---

## Feature: Alternate Routing Recommendations

**Done when:**
- Routing recommendations are generated only when
  `congestion_risk_score > REROUTE_THRESHOLD` AND `net_benefit_hours > 0`.
- Each recommendation includes `current_berth_id`, `recommended_berth_id`,
  `reason` (plain text), and `net_benefit_hours`.
- Recommendations have `status = "pending_approval"` until the supervisor acts.
- `GET /api/v1/routing?plan_id={id}` returns all recommendations for a plan.
- No recommendation is described as a committed routing change until approved.

---

## Feature: IBM Bob MCP Server

**Done when:**
- The MCP server exposes at least these three read-only tools:
  `get_risk_explanation`, `get_plan_summary`, `get_waiting_time_context`.
- Each tool fetches data from the FastAPI backend via a GET request.
- No MCP tool calls a POST, PATCH, PUT, or DELETE endpoint.
- A Bob task session demonstrates the MCP returning a real (not fabricated)
  explanation referencing actual prediction data.
- The Bob task history and a task-consumption screenshot are exported to `bob_sessions/`.

---

## Feature: Synthetic Data Generation

**Done when:**
- `python -m app.data.generate_synthetic` produces a deterministic dataset
  given the same `RANDOM_SEED`.
- Generated data respects all constraints in `docs/DATA_DICTIONARY.md`
  (TEU range, priority distribution, berth count, crane count).
- `python -m app.data.seed` loads the generated data into the database.
- All synthetic records have `is_synthetic = true`.
- Running the script twice with the same seed produces identical records.

---

## Feature: Frontend — Congestion Dashboard

**Done when:**
- Dashboard displays a list of vessels with `congestion_risk_score` and
  `waiting_time_hours` for the current 72-hour horizon.
- HIGH risk vessels are visually highlighted (e.g. red indicator).
- Recharts time-series chart shows risk scores over the planning horizon.
- Leaflet berth-layout map shows berth occupancy (only included if a real
  feature requires it — not added for decoration).
- Dashboard fetches from `GET /api/v1/predictions` and `GET /api/v1/vessels`.
- No hardcoded mock data in the production build.

---

## Feature: Frontend — Plan Approval UI

**Done when:**
- Plan view shows baseline (FCFS) vs optimised plan side-by-side.
- `objective_value` and `baseline_objective_value` are displayed with
  the saving (`baseline - optimised` hours).
- Routing recommendations are shown with reason and net benefit.
- "Approve" button calls `POST /api/v1/plans/{plan_id}/approve`.
- "Reject" button calls `POST /api/v1/plans/{plan_id}/reject`.
- Both buttons are disabled after the plan status is no longer `proposed`.
- IBM Bob explanation panel fetches from the MCP server on request.

---

## Submission Completion Criteria

The submission is complete when all of the following are true:

- [ ] All feature DoD criteria above are satisfied.
- [ ] `src/backend/tests/` coverage ≥ 70% (measured by `pytest --cov`).
- [ ] `npm run build` completes without errors.
- [ ] A working public deployment URL exists and is recorded in `demo/live-demo-url.txt`.
- [ ] A demo video URL is recorded in `demo/demo-video-link.txt`.
- [ ] At least 3 screenshots are in `demo/screenshots/`.
- [ ] At least one Bob session export is in `bob_sessions/`.
- [ ] `submission.yaml` has no placeholder values.
- [ ] The official validator passes in the GitHub Actions tab.
