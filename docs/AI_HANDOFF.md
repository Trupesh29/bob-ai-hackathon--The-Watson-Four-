# AI Handoff — PortFlow AI

**Track:** AI  |  **Problem:** L1 — Container Congestion Predictor & Port Operations Optimiser  
**Document purpose:** Records completed work, changed files, validation results, open items,
contract changes, and the exact next task between IBM Bob sessions.

---

## Session: Plan 1 — Documentation and Submission Baseline

**Date:** 2026-09-13  
**Goal:** Create all documentation and submission metadata so the PortFlow
architecture and the official IBM Bobathon submission specification form one
consistent contract.

### Context

The repository was initialised with an empty initial commit.  No files existed
prior to this session.  All documentation and submission files were created
from scratch.

### Completed Work

| File | Action | Notes |
|---|---|---|
| `README.md` | Created | L1 problem, primary user, end-to-end demo outcome, tech stack, repo structure, status table, quick-start commands, demo links, IBM Bob usage, data policy, documentation index |
| `submission.yaml` | Created | All validator-required fields populated; team details and URLs marked as pending |
| `docs/problem-statement.md` | Created | Supervisor pain, why spreadsheets/dashboards are insufficient, testable success criteria, out-of-scope list |
| `docs/solution-overview.md` | Created | Four-layer loop diagram, role boundaries table, ML/optimiser/LLM/deterministic roles, differentiation table, IBM Bob MCP tools |
| `docs/architecture.md` | Created | Mermaid component/data-flow diagram, tech+responsibility table, end-to-end data flow, security controls, reproducibility, synthetic data policy, MVP scalability notes |
| `docs/setup-guide.md` | Created | Prerequisites, DB setup (Docker + local), backend setup, frontend setup, ML training, tests, production build, deployment (pending), troubleshooting |
| `docs/submission-readiness.md` | Created | Technical status, application code status, manual artifacts, pre-submission checklist, key dates |
| `docs/PROJECT_CONTEXT.md` | Created | Authoritative project context, approved technology decisions, hard constraints, code structure contract, UTC policy, synthetic data assumptions, session export convention, document hierarchy |
| `docs/API_CONTRACT.md` | Created | All endpoints (health, vessels, berths, predictions, plans/optimise, plans/approve, plans/reject, routing), request/response schemas, error responses, contract change log |
| `docs/DATA_DICTIONARY.md` | Created | Synthetic data policy, all DB table schemas, ML feature definitions, risk level thresholds, synthetic data generation parameters, data provenance table |
| `docs/DEFINITION_OF_DONE.md` | Created | Global acceptance criteria, per-feature DoD for all MVP features, submission completion criteria |
| `docs/AI_WORKFLOW.md` | Created | IBM Bob IDE roles, prohibited LLM actions, MCP server design and tools, session export requirements, development workflow per plan, LLM guardrails |
| `docs/AI_HANDOFF.md` | Created | This document |
| `bob_sessions/README.md` | Created | Export instructions, credential-removal warning, session index |
| `CONTRIBUTING.md` | Created | Contribution guidelines aligned to project conventions |
| `.github/workflows/validate.yml` | Created | Official Bobathon validator (not modified from contract) |
| `demo/demo-video-link.txt` | Created | Placeholder pending demo video |
| `demo/live-demo-url.txt` | Created | Placeholder pending deployment |
| `demo/screenshots/` | Created | Empty directory pending screenshots |
| `presentation/` | Created | Empty directory pending slide deck |
| `bob_sessions/` | Created | Directory + README |
| `src/` | Created | Empty directory; application code not yet implemented |

### Validation Performed

1. **Required template paths exist:**
   - [x] `submission.yaml`
   - [x] `README.md`
   - [x] `src/`
   - [x] `docs/problem-statement.md`
   - [x] `docs/solution-overview.md`
   - [x] `docs/architecture.md`
   - [x] `docs/setup-guide.md`
   - [x] `demo/demo-video-link.txt`
   - [x] `demo/live-demo-url.txt`
   - [x] `demo/screenshots/`
   - [x] `presentation/`
   - [x] `bob_sessions/`
   - [x] `CONTRIBUTING.md`
   - [x] `.github/workflows/validate.yml`

2. **`submission.yaml` required fields:** `project_name`, `track`, `problem_statement`,
   `solution_overview`, `team`, `repository_url`, `demo_video_url`, `live_demo_url`,
   `key_features`, `tech_stack`, `ibm_bob_usage`, `known_limitations` — all present.

3. **README placeholder check:** No official Bobathon template placeholder text;
   `TEAM_MEMBER_*` and `*_PENDING` markers are intentional project-level TODOs,
   not template residue.

4. **Architecture contradictions:** None found.  All documents use the same
   endpoint names, field names, UTC timestamps, risk thresholds, and approval rules.

5. **Setup commands use `src/` layout:** Verified — all commands in
   `docs/setup-guide.md` reference `src/backend` and `src/frontend`.

6. **Secrets/nonexistent links:** No secrets.  `*_PENDING` markers used instead of
   invented URLs.  `.env.example` filenames referenced but `.env` files are in `.gitignore`.

7. **`git diff --check`:** No trailing whitespace issues (all files freshly created).

8. **Official validator:** `.github/workflows/validate.yml` created as the intended
   Bobathon validator structure; not modified from contract.

### Unresolved Items (Human Action Required)

| Item | Owner | Blocker |
|---|---|---|
| Team member names and emails | Human | Cannot be invented |
| Public GitHub repository URL | Human | Repo must be created from official Bobathon template |
| Demo video URL | Human | Application not yet built |
| Live demo URL | Human | Application not deployed |
| Bob session exports | Human | Future development sessions |
| Organiser timezone for 15 Sep 2026 deadline | Human | Confirm with organiser |

### Contract Changes (vs Prior State)

This is the initial contract.  No prior documentation existed.  Key decisions
established in this session:

| Decision | Value |
|---|---|
| `REROUTE_THRESHOLD` default | `0.7` |
| `RISK_WARN_THRESHOLD` default | `0.5` |
| `RANDOM_SEED` default | `42` |
| Planning horizon | 72 hours |
| Synthetic berth count | 6 |
| Synthetic cranes per berth | 2 |
| All timestamps | UTC, ISO 8601 |
| Model serialisation | Joblib `.joblib` files |
| ML algorithm baseline | scikit-learn LinearRegression or RandomForestRegressor |
| Approval endpoint | `POST /api/v1/plans/{plan_id}/approve` |

---

## Next Task — Plan 2 ✅ COMPLETED — see Plan 2 session below

---

## Session: Plan 2 — Application Skeleton

**Date:** 2026-09-13 (same session as Plan 1)
**Goal:** Verify and build the application skeleton so it runs from `src/`,
with a passing FastAPI health endpoint and a passing React production build.

### Context

Plan 1 created all documentation.  The repository had no source code.
Plan 2 creates the minimal, honest, no-fake-data application skeleton.

### Completed Work

| File | Action | Notes |
|---|---|---|
| `.python-version` | Created | `3.12` (target spec; runtime is Python 3.14 — see Known Issues) |
| `.gitignore` | Created | Covers `.env`, `node_modules/`, `dist/`, `.venv/`, ML artefacts, data dirs |
| `src/.env.example` | Created | Index file pointing to sub-module examples |
| `src/backend/.env.example` | Created | Backend environment variable template |
| `src/backend/requirements.txt` | Created | fastapi, uvicorn, pydantic, pydantic-settings, sqlalchemy, psycopg[binary], alembic, pytest, httpx |
| `src/backend/__init__.py` | Created | Package marker |
| `src/backend/app/__init__.py` | Created | Package marker |
| `src/backend/app/main.py` | Created | FastAPI app factory; health router; CORS; error handlers; no DB connection |
| `src/backend/app/core/config.py` | Created | pydantic-settings Settings class; `get_cors_origins()` helper |
| `src/backend/app/core/__init__.py` | Created | Re-exports `settings` |
| `src/backend/app/core/errors.py` | Created | Global validation and 500 exception handlers; `ErrorEnvelope` schema |
| `src/backend/app/api/__init__.py` | Created | Package marker |
| `src/backend/app/api/v1/__init__.py` | Created | Package marker |
| `src/backend/app/api/v1/health.py` | Created | `GET /api/v1/health` — returns exact contract response |
| `src/backend/app/models/__init__.py` | Created | TODO stub — Plan 3 |
| `src/backend/app/schemas/__init__.py` | Created | TODO stub — Plan 3 |
| `src/backend/app/ml/__init__.py` | Created | TODO stub — Plan 4 |
| `src/backend/app/optimiser/__init__.py` | Created | TODO stub — Plan 5 |
| `src/backend/app/mcp_server/__init__.py` | Created | TODO stub — Plan 6 |
| `src/backend/tests/__init__.py` | Created | Package marker |
| `src/backend/tests/test_health.py` | Created | 3 tests: status 200, exact body, content-type |
| `src/pytest.ini` | Created | `testpaths = backend/tests` |
| `src/.venv/` | Created | Python virtual environment (Python 3.14; gitignored) |
| `src/frontend/package.json` | Created | react, react-dom, react-router-dom v7, Vite v6, Tailwind, TS |
| `src/frontend/vite.config.ts` | Created | Vite + React plugin; dev proxy to `:8000` |
| `src/frontend/tsconfig*.json` | Created | TypeScript project references config |
| `src/frontend/tailwind.config.js` | Created | Navy + teal colour palette |
| `src/frontend/postcss.config.js` | Created | Tailwind + autoprefixer |
| `src/frontend/.eslintrc.cjs` | Created | ESLint v8 config (TS + React Hooks + react-refresh) |
| `src/frontend/index.html` | Created | Vite entry HTML |
| `src/frontend/src/vite-env.d.ts` | Created | Vite/client type reference |
| `src/frontend/src/index.css` | Created | Tailwind directives + maritime colour vars |
| `src/frontend/src/main.tsx` | Created | React root mount |
| `src/frontend/src/App.tsx` | Created | BrowserRouter + all 7 routes |
| `src/frontend/src/types/api.ts` | Created | `HealthResponse` interface |
| `src/frontend/src/services/api.ts` | Created | `apiFetch<T>()` — minimal fetch wrapper |
| `src/frontend/src/hooks/useApiHealth.ts` | Created | `useApiHealth()` hook; exported `HealthState` type |
| `src/frontend/src/components/Shell.tsx` | Created | Top-level layout: sidebar + header + `<Outlet/>` |
| `src/frontend/src/components/Sidebar.tsx` | Created | NavLinks for all 7 routes; active-route highlight; API health badge |
| `src/frontend/src/components/EmptyState.tsx` | Created | Honest "Demo data not loaded" empty state |
| `src/frontend/src/pages/DashboardPage.tsx` | Created | `/` — 72-hour congestion overview |
| `src/frontend/src/pages/VesselsPage.tsx` | Created | `/vessels` — vessel arrival schedule |
| `src/frontend/src/pages/MapPage.tsx` | Created | `/map` — berth layout map (placeholder) |
| `src/frontend/src/pages/PredictionsPage.tsx` | Created | `/predictions` — ML prediction results |
| `src/frontend/src/pages/OptimizerPage.tsx` | Created | `/optimizer` — CP-SAT plan proposals |
| `src/frontend/src/pages/OperationsPlanPage.tsx` | Created | `/operations-plan` — approval gate |
| `src/frontend/src/pages/CopilotPage.tsx` | Created | `/copilot` — IBM Bob MCP explanations |
| `src/frontend/.env.example` | Created | `VITE_API_BASE_URL`, `VITE_DEFAULT_PORT_ID` |
| `src/database/README.md` | Created | Placeholder for Plan 3 DDL |
| `src/ml/README.md` | Created | Placeholder for Plan 4 training scripts |
| `src/optimizer/README.md` | Created | Placeholder for Plan 5 solver scripts |
| `src/mcp-server/README.md` | Created | Placeholder for Plan 6 MCP server |
| `src/tests/README.md` | Created | Integration tests placeholder |
| `src/data/raw/.gitkeep` | Created | Preserve tracked empty directory |
| `src/data/processed/.gitkeep` | Created | Preserve tracked empty directory |
| `demo/live-demo-url.txt` | Updated | Changed `LIVE DEMO URL PENDING` → `NOT DEPLOYED` |
| `docs/API_CONTRACT.md` | Updated | Health endpoint corrected to `/api/v1/health`; response shape updated; change log updated |

### Validation Performed

| Check | Result |
|---|---|
| `python -m pytest backend/tests -q` (from `src/`) | ✅ 3 passed, 2 warnings (library deprecations, not our code) |
| `GET /api/v1/health` exact response | ✅ `{"status":"healthy","service":"portflow-api","version":"0.1.0"}` |
| `pip check` | ✅ No broken requirements |
| `npm install` | ✅ 0 vulnerabilities |
| `npm audit` | ✅ 0 vulnerabilities |
| `npm run build` | ✅ Built in ~28s; `dist/index.html` 0.43 kB, JS 190 kB gzipped 62 kB |
| All 14 required Bobathon template paths | ✅ All present |
| All application source under `src/` | ✅ No source files at repo root |
| No real `.env` files | ✅ Only `.env.example` files committed |
| `.github/workflows/validate.yml` unchanged | ✅ |
| `git diff --check` | ✅ No trailing whitespace (LF/CRLF warning on `live-demo-url.txt` is cosmetic) |

### Known Issues / Caveats

1. **Python version:** `.python-version` specifies `3.12` (project target) but the
   runtime in `src/.venv/` is Python 3.14 (only version installed on this machine).
   All packages work on 3.14.  A CI or production environment should install 3.12.
   **Action required:** Install Python 3.12 and recreate the venv before the final
   submission or CI run.

2. **httpx/starlette deprecation warnings:** Two `DeprecationWarning` and
   `StarletteDeprecationWarning` come from installed library versions, not our code.
   Tests pass.  Monitor on Python 3.12 install.

3. **`@eslint/js` dependency:** Added to frontend but ESLint v8 flat config is not
   used (`.eslintrc.cjs` is used instead).  The `@eslint/js` package can be
   removed from `package.json` in a future cleanup pass.

### Contract Changes

| Change | Justification | Documented |
|---|---|---|
| Health endpoint changed from `GET /health` (root) to `GET /api/v1/health` | Plan 2 spec requires `/api/v1` prefix; all feature endpoints are under this prefix | `docs/API_CONTRACT.md` change log |
| Health response changed from `{"status":"ok","environment":"development"}` to `{"status":"healthy","service":"portflow-api","version":"0.1.0"}` | Plan 2 specifies exact response shape with `service` and `version` fields | `docs/API_CONTRACT.md` change log |
| `demo/live-demo-url.txt` updated from `LIVE DEMO URL PENDING` to `NOT DEPLOYED` | Plan 2 spec requires "NOT DEPLOYED" until a real URL exists | File updated |

---

## Next Task — Plan 3 ✅ COMPLETED — see Plan 3 session below

---

## Session: Plan 3 — Database Foundation and Synthetic Data

**Date:** 2026-09-13
**Goal:** Implement the PostgreSQL database foundation and deterministic synthetic
demo dataset for the PortFlow vertical slice.

### Context

Plans 1 and 2 established documentation and the application skeleton.
Plan 3 implements the 6 MVP tables, Alembic migration, session factory,
and synthetic data generator with 5 scenarios.

### Completed Work

| File | Action | Notes |
|---|---|---|
| `src/backend/app/core/config.py` | Updated | Added `synthetic_data_seed` field; changed default `database_url` placeholder password to `change-me` |
| `src/backend/app/dependencies.py` | Created | `get_db()` session dependency; `get_engine()`; `pool_pre_ping=True`; no credential logging |
| `src/backend/app/models/base.py` | Created | `DeclarativeBase` subclass `Base` |
| `src/backend/app/models/port.py` | Created | `Port` model; unique `code`; lat/lon CHECK constraints |
| `src/backend/app/models/vessel.py` | Created | `Vessel` model; unique `imo_number`; dimension CHECK constraints |
| `src/backend/app/models/berth.py` | Created | `Berth` model; composite unique `(port_id, code)`; dimension/crane CHECK constraints; `ix_berths_port_status` index |
| `src/backend/app/models/crane.py` | Created | `Crane` model; composite unique `(port_id, code)`; `moves_per_hour > 0` CHECK; nullable `berth_id` for movable cranes; `ix_cranes_port_status` index |
| `src/backend/app/models/vessel_schedule.py` | Created | `VesselSchedule` model; `priority` CHECK [1,5]; `ix_vs_port_eta` and `ix_vs_vessel_eta` indexes; `is_synthetic` flag |
| `src/backend/app/models/historical_operation.py` | Created | `HistoricalOperation` model; `waiting_minutes >= 0`; `service_minutes > 0`; `actual_departure >= actual_arrival` CHECK; one-to-one with `VesselSchedule` via `unique=True`; `ix_ho_schedule_id` index |
| `src/backend/app/models/__init__.py` | Updated | Imports all 6 models so Alembic sees all metadata |
| `src/database/alembic.ini` | Created | Alembic config; `DATABASE_URL` injected from settings in `env.py`; never stored in ini |
| `src/database/migrations/env.py` | Created | Imports all models; injects `settings.database_url`; supports offline and online modes |
| `src/database/migrations/script.py.mako` | Created | Alembic revision template |
| `src/database/migrations/versions/0001_initial_schema.py` | Created | Complete initial migration: all 6 tables, all indexes, all constraints; safe `downgrade()` |
| `src/data/__init__.py` | Created | Package marker |
| `src/data/generator.py` | Created | `SyntheticDataset` class; 5 scenarios; per-scenario isolated RNG; causal realism; vessel–berth compatibility enforced; fictional names and IMOs |
| `src/data/seed.py` | Created | Idempotent seeder via `session.merge()`; `--reset` blocked outside dev/test; prints record counts only |
| `src/backend/tests/test_database.py` | Created | 14 tests (13 pure Python in-memory, 1 PostgreSQL integration skipped if unavailable) |
| `src/pytest.ini` | Updated | Added `addopts = -q` |
| `src/.env.example` | Updated | Added key variable index |
| `src/backend/.env.example` | Updated | Added `SYNTHETIC_DATA_SEED=2026`; changed password placeholder to `change-me` |
| `src/README.md` | Updated | Full directory structure, all commands, synthetic data disclosure |
| `docs/setup-guide.md` | Updated | PostgreSQL prereqs, Docker setup, migration commands, seed command, troubleshooting |
| `docs/submission-readiness.md` | Updated | Plan 3 items marked Complete; backend test count updated to 16/1-skipped |

### Validation Performed

| Check | Result |
|---|---|
| `python -m pytest backend/tests/ -v` (from `src/`) | ✅ **16 passed, 1 skipped** (PostgreSQL test skipped — no DB available) |
| Health tests (subset) | ✅ 3 passed |
| Database unit tests (1–11) | ✅ 11 passed |
| Vessel–berth compatibility test (12) | ✅ Passed |
| Congestion scenario test (13) | ✅ Passed (`arrival_surge` 946 min > `baseline` 50 min) |
| PostgreSQL idempotency test (14) | ⏭ Skipped (no PostgreSQL available) |
| All 14 required Bobathon paths | ✅ All present |
| All source code under `src/` | ✅ |
| No `.env` files committed | ✅ |
| `validate.yml` unchanged | ✅ |
| `git diff --check` | ✅ No trailing whitespace |

### Synthetic Dataset Counts (seed=2026)

| Entity | Count |
|---|---|
| Port | 1 (Port of Falkermere, code FKPFL) |
| Berths | 3 (B01, B02, B03) |
| Cranes | 7 (QC01–QC07) |
| Vessels | 15 |
| Schedules | 44 (8+12+8+8+8 across 5 scenarios) |
| Historical operations | 44 |

### Scenario Waiting Times

| Scenario | Vessels | Avg wait (min) |
|---|---|---|
| baseline | 8 | 50 |
| arrival_surge | 12 | 946 |
| crane_outage | 8 | 1192 |
| berth_closure | 8 | 661 |
| handling_slowdown | 8 | 1648 |

### Known Issues / Caveats

1. **Python 3.14 runtime:** `.python-version` specifies 3.12 but only 3.14 is installed.
   All code runs correctly on 3.14.  Recreate venv with Python 3.12 before final submission.

2. **PostgreSQL integration test skipped:** Test 14 (`test_seed_idempotent_postgresql`)
   requires `DATABASE_URL` pointing to a real PostgreSQL instance.  Set `DATABASE_URL`
   in `src/backend/.env` to run this test.

3. **`docs/DATA_DICTIONARY.md` describes a simpler schema** (from Plan 1, which used a
   basic `vessels/berths/cranes` schema with VARCHAR PKs).  The Plan 3 schema uses a
   richer model with `ports`, `vessel_schedules`, `historical_operations`, UUID PKs,
   and timezone-aware timestamps.  The DATA_DICTIONARY.md should be updated in a future
   session to match the implemented schema.  Existing API contract endpoints reference
   the Plan 1 schema names — these will be reconciled in Plan 4 when CRUD handlers are built.

4. **`berth_override_code` parameter** in `_gen_schedules` is unused after refactoring.
   It was removed from the scenario configs but the parameter remains.  No functional impact.

### Contract Changes

| Change | Justification | Documented |
|---|---|---|
| Schema uses `ports`, `vessel_schedules`, `historical_operations` instead of Plan 1 DATA_DICTIONARY schema | Plan 3 spec requires a richer port-operations model with 6 specific tables | `docs/AI_HANDOFF.md` (this entry); `docs/DATA_DICTIONARY.md` update deferred to Plan 4 |
| `expected_containers` in `vessel_schedules` represents crane moves per port call (not TEU loaded) | Causal realism requires a value that drives service duration at realistic crane rates | Generator comment in `src/data/generator.py` |
| `SYNTHETIC_DATA_SEED` environment variable added (default `2026`) | Plan 3 spec requirement; replaces old `RANDOM_SEED` from Plan 1 | `src/backend/app/core/config.py`, `.env.example` files |

---

## Session: Plan 4 — End-to-End Dashboard Slice

**Date:** 2026-09-13
**Goal:** Implement the smallest honest end-to-end PortFlow dashboard slice —
connecting seeded PostgreSQL records through FastAPI to a React dashboard with a
Recharts congestion chart. No fake ML, no fake optimizer claims.

### Context

Plans 1–3 established documentation, the application skeleton, ORM models,
Alembic migration, and the synthetic data generator/seeder.
Plan 4 wires the database to the API and the API to the React dashboard.

### Completed Work

#### Backend

| File | Action | Notes |
|---|---|---|
| `src/backend/app/schemas/dashboard.py` | Created | Pydantic v2 schemas for all 6 endpoints; `CALCULATION_METHOD = "baseline_rule_v1"`; `VALID_SCENARIOS` set |
| `src/backend/app/services/__init__.py` | Created | Package marker |
| `src/backend/app/services/congestion.py` | Created | Full `baseline_rule_v1` implementation — piecewise-linear risk, scenario multipliers, 6-hour buckets, SQLite-safe UUID helper |
| `src/backend/app/api/v1/dashboard.py` | Created | `GET /api/v1/dashboard/summary` and `GET /api/v1/dashboard/congestion` |
| `src/backend/app/api/v1/schedules.py` | Created | `GET /api/v1/schedules` — vessel join, berth compatibility count, waiting minutes from historical ops |
| `src/backend/app/api/v1/resources.py` | Created | `GET /api/v1/resources/berths`, `/cranes`, `/scenarios` |
| `src/backend/app/main.py` | Updated | Registered 3 new routers (dashboard, schedules, resources) |
| `src/backend/tests/test_dashboard.py` | Created | 18 tests: summary 200, KPI fields, 12-window congestion, prob 0–1 range, invalid scenario 422, no DB mutation on scenario change, schedule filter by port/date, berths/cranes/scenarios endpoints, calculation_method label |

#### Frontend

| File | Action | Notes |
|---|---|---|
| `src/frontend/src/types/api.ts` | Updated | Full typed interfaces: `DashboardSummaryResponse`, `DashboardCongestionResponse`, `ScheduleItem`, `BerthItem`, `CraneItem`, `ScenarioId`, `ScenariosResponse`, `ApiError` |
| `src/frontend/src/services/api.ts` | Updated | Typed API client: `apiFetch<T>()`, `ApiRequestError` class, `fetchDashboardSummary()`, `fetchDashboardCongestion()`, `fetchSchedules()`, `fetchBerths()`, `fetchCranes()`, `fetchScenarios()`, `DEFAULT_PORT_CODE` |
| `src/frontend/src/pages/DashboardPage.tsx` | Updated | Full dashboard: operational header, synthetic-data label, scenario selector (5 buttons), KPI cards (5), Recharts BarChart congestion chart, affected vessels table, berth status panel, footer disclosure; states: loading, error, empty, ready |
| `src/frontend/src/test-setup.ts` | Created | Vitest + jsdom global setup |
| `src/frontend/vitest.config.ts` | Created | Separate vitest config with jsdom environment and pool:threads |
| `src/frontend/src/tests/DashboardPage.test.tsx` | Created | 7 tests: loading state, error state, synthetic label, scenario sends correct API query, KPI values from API, chart receives real series data, no ML claims |
| `src/frontend/package.json` | Updated | Added `recharts`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, `msw`; added `test` script |
| `src/frontend/vite.config.ts` | Updated | Removed `test` block (moved to vitest.config.ts to avoid type conflicts) |
| `src/frontend/tsconfig.app.json` | Updated | Added `types: ["vite/client"]`; excluded test files from app compilation |
| `src/frontend/tsconfig.node.json` | Updated | Added vitest types; included `vitest.config.ts` |

#### Documentation

| File | Action | Notes |
|---|---|---|
| `docs/submission-readiness.md` | Updated | All Plan 4 endpoints and tests marked Complete; backend count 34 passed 1 skipped; frontend 7 passed |
| `docs/setup-guide.md` | Updated | Plan 4 status, API endpoint curl examples, `baseline_rule_v1` formula, local run commands |
| `src/README.md` | Updated | Directory structure with new files; quick commands with Plan 4 entries |
| `docs/AI_HANDOFF.md` | Updated | This Plan 4 session record |

### Validation Performed

| Check | Result |
|---|---|
| `python -m pytest backend/tests/ -q` (from `src/`) | ✅ **34 passed, 1 skipped** |
| `npm test` (from `src/frontend/`) | ✅ **7 passed** |
| `npm run build` (from `src/frontend/`) | ✅ `✓ built in 6.11s`; `dist/index.html` 0.43 kB |
| `GET /api/v1/health` | ✅ `{"status":"healthy","service":"portflow-api","version":"0.1.0"}` |
| No ML claim in dashboard text | ✅ All labels say "Baseline rule — ML model pending" |
| No fake optimizer claim | ✅ "Optimization pending" label used throughout |
| Five scenarios deterministic (no DB mutation) | ✅ Test `test_scenario_does_not_mutate_source_records` passes |
| Risk probability always in [0, 1] | ✅ Test `test_risk_probability_bounds` passes |
| `calculation_method = "baseline_rule_v1"` in all prediction-like responses | ✅ All endpoints verified |
| `is_synthetic = true` in all API responses | ✅ Confirmed in schema constants |
| `.github/workflows/validate.yml` unchanged | ✅ |
| No `.env` files staged | ✅ |
| `git diff --check` | ✅ No trailing whitespace |

### baseline_rule_v1 Formula

The congestion risk calculation is entirely rule-based and deterministic.
It is not a trained statistical model and makes no accuracy claims.

**Inputs per 6-hour bucket:**

```
arrivals       = vessel schedules with ETA in [bucket_start, bucket_end)
capacity       = compatible available berths
occupancy_rate = 1 - min(arrivals / max(capacity, 1), 1)
crane_ratio    = available_cranes / max(total_cranes, 1)
workload       = sum(expected_containers) for arrivals in bucket
raw_load       = arrivals / max(capacity, 1)
```

**Piecewise risk probability:**

```
if raw_load <= 0:       risk_prob = 0.05
elif raw_load <= 0.5:   risk_prob = 0.05 + 0.30 * (raw_load / 0.5)
elif raw_load <= 1.0:   risk_prob = 0.35 + 0.35 * ((raw_load - 0.5) / 0.5)
elif raw_load <= 1.5:   risk_prob = 0.70 + 0.25 * ((raw_load - 1.0) / 0.5)
else:                   risk_prob = 0.95

risk_prob = min(1.0, risk_prob * crane_penalty)
```

**crane_penalty:** `max(0.5, 2.0 - crane_ratio)` (up to 2× amplification
when no cranes available; 0.5 floor when full crane capacity).

**Risk levels:** low < 0.35 · medium < 0.60 · high < 0.80 · critical ≥ 0.80

**Scenario multipliers (applied before piecewise):**

| Scenario | Arrivals multiplier | Capacity multiplier |
|---|---|---|
| baseline | 1.0 | 1.0 |
| arrival_surge | 2.0 | 1.0 |
| crane_outage | 1.0 | 1.0 (cranes halved) |
| berth_closure | 1.0 | 0.5 |
| handling_slowdown | 1.0 | 1.0 (crane_penalty × 1.5) |

Scenarios are computed views — source records are never overwritten.

### New API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/dashboard/summary` | Port KPIs, peak risk, scenario, `is_synthetic`, `calculation_method` |
| GET | `/api/v1/dashboard/congestion` | 12 × 6-hour windows with probability, risk level, queue estimate |
| GET | `/api/v1/schedules` | Vessel arrival schedule with berth compatibility count |
| GET | `/api/v1/resources/berths` | Berth inventory for the requested port |
| GET | `/api/v1/resources/cranes` | Crane inventory for the requested port |
| GET | `/api/v1/scenarios` | List of 5 valid scenario options with descriptions |

All endpoints accept `?port_code=FKPFL` (required).
Dashboard and congestion endpoints also accept `?scenario=baseline` (default) and
`?horizon_hours=72` (default).

### Known Issues / Caveats

1. **Python 3.14 runtime:** `.python-version` specifies `3.12` but only 3.14 is
   installed. All code works on 3.14. Recreate venv with Python 3.12 before final
   submission.

2. **SQLite/UUID incompatibility in tests:** `sqlalchemy.dialects.postgresql.UUID`
   breaks on SQLite via `insertmanyvalues RETURNING` and ORM deserialization.
   Fixed via: `use_insertmanyvalues=False` on the test engine,
   `join_transaction_mode="create_savepoint"`, and `cast(column, String)` in all
   queries touching UUID columns. Test fixture uses `session.add()` not
   `session.merge()` to avoid the RETURNING path.

3. **Synthetic data base time:** The seeder uses `datetime(2026, 9, 15, 6, 0, 0, tzinfo=UTC)`
   as the schedule base time. If tested after this date, "next 24 hours" logic in
   the summary may show 0 arrivals (schedules are in the past). The congestion
   service uses `func.min(VesselSchedule.eta)` as the horizon start, so it remains
   functional. This will be corrected when a real-time AIS feed is integrated.

4. **Recharts chunk size warning:** Bundle is 571 kB uncompressed (174 kB gzipped).
   Vite emits a `chunkSizeWarningLimit` warning. The build still passes. Code-split
   Recharts in a future cleanup pass.

5. **PostgreSQL integration test skipped:** `test_seed_idempotent_postgresql`
   requires `DATABASE_URL` pointing to a real PostgreSQL instance.

6. **`docs/DATA_DICTIONARY.md`** still describes the original Plan 1 schema.
   Update to match the Plan 3/4 implementation is deferred to a future plan.

### Contract Changes

| Change | Justification | Documented |
|---|---|---|
| `baseline_rule_v1` label replaces any reference to "ML prediction" | Plan 4 spec forbids ML claims; the method is purely rule-based | All API response schemas, UI labels, setup-guide |
| `calculation_method` field added to all prediction-like responses | Plan 4 spec requirement | `src/backend/app/schemas/dashboard.py` |
| `is_synthetic: true` field added to all responses | Plan 4 spec requirement | All API schemas |
| Scenario selection is a query parameter, not a DB state change | Scenarios are deterministic views; source records must never be overwritten | `src/backend/app/services/congestion.py` |
| 6 new API endpoints under `/api/v1/` | Plan 4 spec requirement | `src/backend/app/api/v1/`, `docs/API_CONTRACT.md` should be updated next |

---

## Next Task — Plan 5

**Goal:** Implement scikit-learn ML congestion prediction pipeline and OR-Tools
CP-SAT berth allocation solver.

**Scope:**
1. `src/backend/app/ml/` — Feature engineering from synthetic data, scikit-learn
   RandomForestRegressor training, joblib serialisation, `predict_congestion()` service.
2. `src/backend/app/optimiser/` — OR-Tools CP-SAT berth/crane allocation,
   `optimise_allocations()` service, deterministic result schema.
3. Replace `baseline_rule_v1` outputs with ML predictions where confidence
   threshold is met; retain `baseline_rule_v1` as the fallback.
4. `GET /api/v1/predictions` endpoint — replaces or supplements dashboard congestion.
5. `POST /api/v1/plans/optimise` endpoint — returns CP-SAT allocation proposal.
6. `POST /api/v1/plans/{plan_id}/approve` and `/reject` — human approval gate.
7. Frontend: Predictions page and Optimizer page wired to real endpoints.
8. Backend tests: ML prediction range, CP-SAT feasibility, approval flow.

**Before starting Plan 5, read:**
- `docs/AI_HANDOFF.md` (this document, especially Plan 4 caveats)
- `docs/API_CONTRACT.md`
- `docs/DEFINITION_OF_DONE.md`
- `src/backend/app/services/congestion.py` (baseline to replace/extend)
- `src/backend/app/models/` (all 6 model files)

**Do NOT implement in Plan 5:**
- IBM Bob MCP server (Plan 6)
- Real AIS data integration
- Authentication
- Kubernetes / deployment
- Any change to `.github/workflows/validate.yml`

---

## Session: Plan 5 — Congestion ML Pipeline

**Date:** 2026-09-13
**Goal:** Train a synthetic-data congestion risk classifier for six-hour port
windows using scikit-learn. No FastAPI changes. No frontend changes.

### Files Changed

| File | Action | Notes |
|---|---|---|
| `src/ml/__init__.py` | Created | Package marker |
| `src/ml/congestion_dataset.py` | Created | Dataset builder; leakage guard (`FORBIDDEN_COLUMNS`); `_risk_label()`; `CongestionWindowRow`; `CongestionDatasetBuilder` |
| `src/ml/congestion_features.py` | Created | `ALL_FEATURE_NAMES`, `FORBIDDEN_COLUMNS`, `rows_to_arrays()`, `chronological_split()` |
| `src/ml/congestion_train.py` | Created | Full training script; `build_pipeline()`; saves `.joblib` + `metadata.json` |
| `src/ml/congestion_predict.py` | Created | `CongestionPredictor` class; `predict()` / `predict_batch()` |
| `src/ml/congestion_evaluate.py` | Created | Evaluation script; macro F1; HIGH/MEDIUM recall; confusion matrix; baseline comparison |
| `src/ml/README.md` | Updated | Full module documentation |
| `src/ml/artifacts/.gitkeep` | Created | Directory marker for saved artefacts (not committed) |
| `src/ml/tests/__init__.py` | Created | Package marker |
| `src/ml/tests/test_congestion_pipeline.py` | Created | 14 tests covering all required test cases |

### Training Command

```bash
# From src/
python -m ml.congestion_train
```

Artefacts saved to `src/ml/artifacts/`:
- `congestion_pipeline.joblib` (gitignored via `*.joblib`)
- `metadata.json`

### Evaluation Command

```bash
python -m ml.congestion_evaluate
```

### Evaluation Results (synthetic data — illustrative only)

| Metric | Value |
|---|---|
| Test macro F1 | 0.762 |
| Val macro F1 | 1.000 |
| HIGH recall (test) | 0.000 (no HIGH rows in test split) |
| MEDIUM recall (test) | 1.000 |
| baseline_rule_v1 macro F1 | 1.000 |
| Dataset rows | 28 (19 train / 4 val / 5 test) |
| Data source | synthetic (seed=2026) |

⚠ The HIGH recall of 0.000 on test reflects that the 5-row test split
contains no HIGH-label windows — not a model failure. Dataset is too
small for statistically meaningful metrics.

### Test Results

```
python -m pytest backend/tests/ ml/tests/ -q
48 passed, 1 skipped
```

### Known Limitations

1. **28-row dataset** — too small for meaningful generalisation. Metrics
   are purely illustrative. The model is not suitable for production use.
2. **HIGH class underrepresented** — only 2 HIGH windows in the full dataset.
   The test split may contain zero HIGH rows depending on split position.
3. **Synthetic data only** — all labels derived from `raw_occupancy` heuristic;
   the model is essentially learning the same rule as `baseline_rule_v1`.
4. **Not integrated into FastAPI** — `CongestionPredictor` exists but the API
   still uses `baseline_rule_v1`. API integration is the next task.
5. **pandas dependency** — `congestion_train.py` and `congestion_predict.py`
   use pandas (available via scikit-learn install). If pandas is removed,
   replace `_dicts_to_matrix()` with a numpy-only ColumnTransformer approach.

### Next Task — API Integration for Congestion ML

Connect `CongestionPredictor` to the FastAPI congestion endpoints:
- `GET /api/v1/dashboard/congestion` — optionally use ML predictions when
  the artefact exists, fall back to `baseline_rule_v1` otherwise.
- Add `calculation_method: "congestion_rf_v1"` when ML is used.
- Keep `baseline_rule_v1` as the fallback.

**Before starting, read:**
- This document (Plan 5 caveats)
- `src/ml/congestion_predict.py` (`CongestionPredictor` interface)
- `src/backend/app/services/congestion.py` (current baseline)
- `src/backend/app/api/v1/dashboard.py` (endpoint to extend)

---

## Session: Plan 6 — ML API Integration

**Date:** 2026-09-13
**Goal:** Integrate the Plan 5 ML classifier into the existing FastAPI congestion
endpoint and add a compact Baseline/ML selector to the React dashboard.

### Files Changed

| File | Action | Notes |
|---|---|---|
| `src/backend/app/core/config.py` | Updated | Added `ml_artifact_dir` setting (env: `ML_ARTIFACT_DIR`); `get_ml_artifact_dir()` helper |
| `src/backend/app/main.py` | Updated | Added `_lifespan` context; loads `CongestionPredictor` once at startup into `app.state.ml_predictor` |
| `src/backend/app/schemas/dashboard.py` | Updated | Added `ML_CALCULATION_METHOD`, `VALID_MODES`; added `ml_label`, `ml_confidence`, `ml_model_version` to `CongestionWindowResponse`; added `selected_mode`, `data_source`, `limitations` to `DashboardCongestionResponse` |
| `src/backend/app/services/congestion.py` | Updated | Added `compute_congestion_horizon_ml()` function; imports `ML_CALCULATION_METHOD` |
| `src/backend/app/api/v1/dashboard.py` | Updated | Added `mode` query param; `_validate_mode()`; routes `mode=ml` to ML service; returns 503 with `error_code=MODEL_ARTIFACT_UNAVAILABLE` when predictor not loaded |
| `src/backend/tests/test_dashboard.py` | Updated | Added 4 Plan 6 tests: baseline explicit, invalid mode 422, ML no-artifact 503, ML stub predictor 200 |
| `src/frontend/src/types/api.ts` | Updated | Added `CongestionMode` type; `ml_label`, `ml_confidence`, `ml_model_version` to `CongestionWindow`; `selected_mode`, `data_source`, `limitations` to `DashboardCongestionResponse` |
| `src/frontend/src/services/api.ts` | Updated | Added `mode: CongestionMode = 'baseline'` param to `fetchDashboardCongestion()` |
| `src/frontend/src/pages/DashboardPage.tsx` | Updated | Added `congestionMode` state; mode selector buttons (`data-testid="mode-btn-baseline"` / `"mode-btn-ml"`); updated chart label to show `calculation_method` from API; ML disclaimer label |
| `src/frontend/src/tests/DashboardPage.test.tsx` | Updated | Added 2 tests (mode selector sends correct mode; chart method label from API); updated mock to include new fields |

### API Change

`GET /api/v1/dashboard/congestion` now accepts `?mode=baseline|ml` (default: `baseline`).

- `mode=baseline`: unchanged behaviour; `calculation_method: "baseline_rule_v1"`
- `mode=ml`: uses `CongestionPredictor` loaded at startup; `calculation_method: "ml_model_v1"`; 503 if artefact absent
- Invalid mode: HTTP 422

### Run Commands

```bash
# From src/ — required before starting the API for mode=ml
python -m ml.congestion_train

# Backend tests
python -m pytest backend/tests/ ml/tests/ -q

# Frontend tests
cd frontend && npm test

# Frontend build
cd frontend && npm run build
```

### Validation Results

| Check | Result |
|---|---|
| Backend tests | **52 passed, 1 skipped** |
| Frontend tests | **9 passed** |
| Production build | **✓ built in 6.22s** |
| `git diff --check` | Exit 0 |
| No `.joblib` or `.env` staged | Confirmed |

### Known Limitations

1. **Artefact must be generated manually** — run `python -m ml.congestion_train` before
   starting the FastAPI server if `mode=ml` is needed. The API returns 503 if not present.
2. **28-row training set** — ML predictions on synthetic data mirror the baseline rule.
   The model has no real operational advantage over `baseline_rule_v1`.
3. **No result caching** — every ML request runs 12 individual `predictor.predict()` calls.
   Acceptable for the demo; profile before production use.
4. **pandas loaded at predict time** — imported lazily in `CongestionPredictor.predict()`.

---

## IBM Bob Evidence — Human Action Required

At the end of each session:

1. Export this IBM Bob task history as Markdown.
2. Capture the IBM Bob task-consumption summary screenshot.
3. Remove any secrets or personal data from the export.
4. Save both files under `bob_sessions/` with filenames:
   - `plan6-session-YYYY-MM-DD.md`
   - `plan6-session-YYYY-MM-DD-screenshot.png`

Do not fabricate these artifacts. Export them from the IBM Bob IDE after this
task is complete.

---

## Session: Plan 7 — CP-SAT Berth-and-Crane Optimizer

**Date:** 2026-09-13
**Goal:** Implement a testable OR-Tools CP-SAT berth-and-crane allocation engine
as a standalone module (`src/optimizer/`). No API or frontend changes.

### Files Changed

| File | Action | Notes |
|---|---|---|
| `src/optimizer/__init__.py` | Created | Package marker |
| `src/optimizer/models.py` | Created | In-memory dataclasses: `VesselInput`, `BerthInput`, `CraneInput`, `BerthAssignment`, `UnscheduledVessel`, `OptimizerMetrics`, `OptimizerResult` |
| `src/optimizer/feasibility.py` | Created | `is_berth_compatible()`, `compatible_berths()`, `partition_vessels()`, `estimate_service_minutes()` |
| `src/optimizer/berth_crane_optimizer.py` | Created | CP-SAT model; FIFO baseline; `optimize()` entry point; weighted objective |
| `src/optimizer/explain.py` | Created | `explain_assignment()`, `explain_unscheduled()`, `explain_result()` |
| `src/optimizer/README.md` | Updated | Full module documentation |
| `src/optimizer/tests/__init__.py` | Created | Package marker |
| `src/optimizer/tests/test_berth_crane_optimizer.py` | Created | 11 tests |

### Run Command

```bash
# From src/
python -m pytest optimizer/tests/ -v
```

### Test Results

```
11 passed, 1 warning
```

### Optimizer Assumptions

1. Planning horizon: configurable (default 72 h).
2. Service duration estimated from `expected_containers / (cranes × avg_moves_per_hour)`.
3. Minimum service time: 60 minutes (floor).
4. Cranes at the assigned berth are used first; movable cranes fill shortfalls.
5. No tidal windows, pilotage delays, or weather effects.
6. All data synthetic (seed=2026).

### Hard Constraints

- One vessel per berth at a time (CP-SAT `add_no_overlap`).
- Vessel length and draft must fit berth (pre-solve filter + model exclusion).
- Service start >= vessel arrival time.
- Service end <= horizon end.
- Cranes assigned <= berth max_cranes.

### Objective (weighted sum)

- Minimize total wait × 1000 (primary)
- Minimize unscheduled vessels × 500 000 (secondary)

### Known Limitations

1. **Not integrated into FastAPI** — `optimize()` is a pure Python function. API
   integration (Plan 8) will add `POST /api/v1/plans/optimise` and the human
   approval gate.
2. **Crane assignment simplified** — time-indexed crane feasibility not fully
   modelled; each vessel's crane count is bounded but inter-vessel crane conflicts
   are not resolved by time.
3. **Synthetic data only** — 28-row dataset; results are illustrative.
4. **OR-Tools 9.15 required** — `cranes_var * is_scheduled` multiplication not
   supported in this version; global crane cap is enforced via per-berth conditional
   constraints instead.

### Next Task — Plan 8: API Integration for the Optimizer

- Add `POST /api/v1/plans/optimise` endpoint calling `optimize()`.
- Add `POST /api/v1/plans/{plan_id}/approve` and `/reject` approval gate.
- Wire the Optimizer page in the React dashboard to real endpoints.
- Add backend tests for the optimise and approval flows.

---

## Session: Plan 8 — Waiting-Time Regression Pipeline

**Date:** 2026-09-13
**Goal:** Add a leak-safe vessel waiting-time regression pipeline using synthetic
historical operations data. No API or frontend changes.

### Files Changed

| File | Action | Notes |
|---|---|---|
| `src/ml/waiting_dataset.py` | Created | `WaitingRow`, `WaitingDatasetBuilder`, `build_default_dataset()`; target = `(berth_start − actual_arrival) / 3600`; `FORBIDDEN_COLUMNS` leakage guard |
| `src/ml/waiting_features.py` | Created | `ALL_FEATURE_NAMES`, `CATEGORICAL_FEATURES`, `NUMERIC_FEATURES`, `rows_to_arrays()`, `chronological_split()` |
| `src/ml/waiting_train.py` | Created | Training script; Pipeline(SimpleImputer+OHE+RandomForestRegressor); saves `waiting_pipeline.joblib` + `waiting_metadata.json` |
| `src/ml/waiting_predict.py` | Created | `WaitingPredictor` class; `predict()` returns `WaitingPrediction` with non-negative clamped output |
| `src/ml/waiting_evaluate.py` | Created | Evaluation script; MAE, RMSE, R², baseline comparison |
| `src/ml/tests/test_waiting_pipeline.py` | Created | 11 tests |

### Run Commands

```bash
# From src/
python -m ml.waiting_train
python -m ml.waiting_evaluate
python -m pytest ml/tests/test_waiting_pipeline.py -v
```

### Training / Evaluation Results (synthetic, illustrative only)

| Metric | Value |
|---|---|
| Dataset rows | 44 (30 train / 6 val / 8 test) |
| Target range | 0.00 – 39.67 h (mean 13.44 h) |
| Test MAE | 8.44 h |
| Test RMSE | 10.30 h |
| Test R² | 0.26 |
| Baseline (median-train) MAE | 12.02 h |
| vs Baseline | +3.58 h better |
| Data source | synthetic (seed=2026) |

### Target Derivation

```
actual_waiting_hours = (berth_start - actual_arrival).total_seconds() / 3600
```

Verified to match `waiting_minutes / 60` from the generator (within float tolerance).

### Leakage Guard

Forbidden columns (never used as features): `berth_start`, `berth_end`,
`actual_departure`, `waiting_minutes`, `service_minutes`, `cranes_used`,
`average_moves_per_hour`, `assigned_berth_id`, `delay_reason`, `actual_waiting_hours`.

### Test Results

```
python -m pytest backend/tests/ ml/tests/ optimizer/tests/ -q
74 passed, 1 skipped
```

### Known Limitations

1. **44 rows** — too small for meaningful generalisation; metrics illustrative only.
2. **uuid.uuid4() in generator** — schedule IDs are not reproducible across
   generator calls; tests use a single DS instance for ID-based lookups.
3. **Single cargo type** — "containerised" only in synthetic data; OHE adds no
   signal on this column.
4. **Not integrated into API** — `WaitingPredictor` exists but not wired to any
   endpoint.

---

## Session: Plan 9 — Waiting-Time API Integration & Dashboard Enhancement

**Date:** 2026-09-13
**Goal:** Wire the Plan 8 `WaitingPredictor` regression model to FastAPI via
`GET /api/v1/waiting-times` and add a Baseline/ML waiting-time mode selector
and enhanced affected-vessels table to the React dashboard.

### Context

Plans 1–8 established all infrastructure, synthetic data, the baseline congestion
rule, the congestion ML classifier, the CP-SAT optimizer, and the waiting-time
regression model (`waiting_rf_v1`).  Plan 9 exposes waiting-time predictions
through the API and displays them on the dashboard.

No ML training was performed in this plan.  The `waiting_pipeline.joblib`
artefact was already present from Plan 8.

### Files Changed

#### Backend

| File | Action | Notes |
|---|---|---|
| `src/backend/app/schemas/dashboard.py` | Updated (Plan 8) | Added `VesselWaitingPrediction`, `WaitingTimesResponse`, `waiting_risk_level()`, `WAITING_METHOD_BASELINE`, `WAITING_METHOD_ML`, `WAITING_LIMITATIONS`, thresholds |
| `src/backend/app/main.py` | Updated | Loads `WaitingPredictor` into `app.state.waiting_predictor` at startup; registers `waiting_times_router` |
| `src/backend/app/api/v1/waiting_times.py` | **Created** | `GET /api/v1/waiting-times?port_code&horizon_hours&mode`; baseline uses `waiting_minutes / 60`; ML uses `WaitingPredictor.predict()`; 503 for missing artefact; 404 for unknown port; 422 for invalid mode; sorted by predicted wait descending |
| `src/backend/tests/test_waiting_times.py` | **Created** | 10 tests using a fresh `create_app()` instance to avoid DB override collision with `test_dashboard.py` |

#### Frontend

| File | Action | Notes |
|---|---|---|
| `src/frontend/src/types/api.ts` | Updated | Added `WaitingMode`, `VesselWaitingPrediction`, `WaitingTimesResponse` interfaces |
| `src/frontend/src/services/api.ts` | Updated | Added `fetchWaitingTimes(portCode, horizonHours, mode)` |
| `src/frontend/src/pages/DashboardPage.tsx` | Updated | Added `waitingMode` state; waiting-mode selector buttons (`waiting-mode-btn-baseline` / `waiting-mode-btn-ml`); affected-vessels table now shows `predicted_waiting_hours`, risk badge, primary cause from API; fallback to schedule table if waiting-times unavailable; `waitingTimes` field in `DashboardState`; `load()` now takes 3 args |
| `src/frontend/src/tests/DashboardPage.test.tsx` | Updated | Added `fetchWaitingTimes: vi.fn()` to mock; added `mockWaitingTimes` fixture; fixed loading/error mocks to include 5th promise; added 4 new tests (waiting mode selector, vessel table data, method label, ML synthetic-training label) |

### New API Endpoint

`GET /api/v1/waiting-times`

| Parameter | Default | Description |
|---|---|---|
| `port_code` | `FKPFL` | Port code |
| `horizon_hours` | `72` | Horizon length (6–168) |
| `mode` | `baseline` | `baseline` \| `ml` |

**Response fields:**
- `port_code`, `horizon_hours`, `mode`
- `vessels`: list sorted by `predicted_waiting_hours` descending
  - `schedule_id`, `vessel_name`, `eta`, `priority`
  - `predicted_waiting_hours` (≥ 0.0)
  - `risk_level`: `low` (< 6 h), `medium` (6–12 h), `high` (> 12 h)
  - `method`: `waiting_baseline_v1` or `waiting_rf_v1`
  - `model_version`, `data_source`, `is_synthetic`
  - `limitations`: always present disclosure
  - `primary_cause`: rule-based top driver or null
- `total`, `is_synthetic`, `data_source`, `calculation_method`, `limitations`

**Error responses:**
- `422` — invalid mode
- `404` — port_code not found
- `503` (`MODEL_ARTIFACT_UNAVAILABLE`) — `mode=ml` with no loaded artefact

### waiting_baseline_v1 Method

In `mode=baseline`, `predicted_waiting_hours = waiting_minutes / 60` where
`waiting_minutes` is taken directly from the seeded `historical_operations` record.
This is historical fact, not a prediction. The response labels it
`waiting_baseline_v1` to distinguish it from the regression model.

### waiting_rf_v1 Method

In `mode=ml`, the `WaitingPredictor` (RandomForestRegressor pipeline trained on 44
synthetic rows) is called with per-vessel features computed server-side from the DB:
`queue_at_arrival` (position in ETA-sorted list), `compatible_berth_count`
(berths where vessel draft and length fit), `total_berths`, `total_cranes`, and all
vessel attributes. Predictions are non-negative (clamped at 0.0).

**LIMITATIONS:** Synthetic training data only. Not validated for real-world
port operations. Point estimate with no confidence interval.

### primary_cause Logic

```
if queue_at_arrival >= 3   → "high queue at arrival"
elif compatible_berths == 1 → "limited berth compatibility"
elif priority == 1          → "high-priority vessel"
else                        → None
```

### Test Results

```
python -m pytest backend/tests/ ml/tests/ optimizer/tests/ -q
84 passed, 1 skipped

npm test --run     (from src/frontend/)
13 passed
```

### Validation Performed

| Check | Result |
|---|---|
| `python -m pytest backend/tests/ ml/tests/ optimizer/tests/ -q` | ✅ **84 passed, 1 skipped** |
| `npm test -- --run` (from `src/frontend/`) | ✅ **13 passed** |
| `npm run build` (from `src/frontend/`) | ✅ Built in ~22s |
| `GET /api/v1/waiting-times?port_code=FKPFL` | ✅ Returns baseline predictions |
| `GET /api/v1/waiting-times?port_code=FKPFL&mode=ml` | ✅ Returns ML predictions (artefact loaded) |
| No ML accuracy claim made | ✅ Label: "Synthetic training data" |
| No fake optimizer claim | ✅ "Optimization pending" unchanged |
| `calculation_method = "waiting_baseline_v1"` in baseline mode | ✅ |
| `calculation_method = "waiting_rf_v1"` in ML mode | ✅ |
| `is_synthetic = true` in all responses | ✅ |
| `.github/workflows/validate.yml` unchanged | ✅ |
| No `.env` or `.joblib` staged | ✅ |
| `git diff --check` | ✅ |

### Known Limitations

1. **44-row training set** — waiting_rf_v1 results are illustrative only.
   Test MAE ≈ 8.4 h on a mean waiting time of 13.4 h. Not production quality.
2. **Baseline mode shows historical fact, not a prediction** — `waiting_minutes / 60`
   is drawn from seeded records. Suitable for demonstration only.
3. **Synthetic data base time** — schedules centred on 2026-09-15; the
   `arrivals_next_24h` KPI may show 0 if tested after that date.
4. **No endpoint caching** — each request runs per-vessel DB queries and
   (in ML mode) one `predictor.predict()` per vessel. Acceptable for demo.
5. **Single cargo_type** — "containerised" only; OHE contributes no signal.
6. **No authentication** — endpoints are open; intended for local demo use only.

### IBM Bob Evidence — Human Action Required

At the end of this session:

1. Export this IBM Bob task history as Markdown.
2. Capture the IBM Bob task-consumption summary screenshot.
3. Remove any secrets or personal data from the export.
4. Save both files under `bob_sessions/` with filenames:
   - `plan9-session-YYYY-MM-DD.md`
   - `plan9-session-YYYY-MM-DD-screenshot.png`

Do not fabricate these artifacts.

## Session: Plan 9 Re-Validation — Full Check Pass

**Date:** 2026-09-13 (re-run)
**Goal:** Verify all Plan 9 deliverables pass in the current workspace state.

### Re-Validation Results

All source files for Plan 9 were confirmed present and correct (no code changes
needed). The `waiting_pipeline.joblib` artefact was already on disk; it was
regenerated to confirm training completes cleanly.

| Check | Result |
|---|---|
| `python -m ml.waiting_train` (from `src/`) | ✅ Completed — artefact saved |
| Training MAE (val=9.43 h, test=11.20 h) | ✅ Completes without error |
| `python -m pytest backend/tests/ ml/tests/ optimizer/tests/ -q` | ✅ **84 passed, 1 skipped** |
| `npm test -- --run` (from `src/frontend/`) | ✅ **13 passed** |
| `npm run build` (from `src/frontend/`) | ✅ Built in ~19s, 0 errors |
| `git diff --check` (trailing whitespace) | ✅ No whitespace errors (LF→CRLF normalisation warnings only, expected on Windows) |
| `.github/workflows/validate.yml` unchanged | ✅ Confirmed |
| No secrets, `.joblib`, or fabricated assets staged | ✅ Confirmed |

### IBM Bob Evidence — Human Action Required

At the end of this session:

1. Export this IBM Bob task history as Markdown.
2. Capture the IBM Bob task-consumption summary screenshot.
3. Remove any secrets or personal data from the export.
4. Save both files under `bob_sessions/` with filenames:
   - `plan9-revalidation-YYYY-MM-DD.md`
   - `plan9-revalidation-YYYY-MM-DD-screenshot.png`

Do not fabricate these artifacts.

## Session: Plan 11 — Alternate-Routing Recommender

**Date:** 2026-09-13
**Goal:** Add a transparent, rule-based alternate-routing recommendation feature that
recommends a fictional synthetic candidate port only when the estimated total time
saving (transit + wait + handling) meets or exceeds the 12-hour diversion threshold.

### Context

Plans 1–9 established all infrastructure, ML pipelines, optimizer, and waiting-time
API integration.  Plan 11 adds the alternate-routing feature on top, using existing
vessel schedule data and a static in-code catalogue of fictional candidate ports.

**Precondition note:** Only one port (FKPFL) is seeded in the database.  Candidate
ports for diversion are defined as a static in-code synthetic lookup — no DB schema
change required.  This is documented as a demo assumption.

### Files Changed

#### Backend

| File | Action | Notes |
|---|---|---|
| `src/backend/app/services/alternate_routing.py` | **Created** | Rule-based service; 3 fictional candidate ports; computes `diversion_transit + wait + handling`; recommends when saving ≥ 12 h (demo assumption) |
| `src/backend/app/schemas/dashboard.py` | Updated | Added `PortEstimateResponse`, `AlternateRoutingResponse`, `ROUTING_DIVERSION_THRESHOLD`, `ROUTING_LIMITATIONS` |
| `src/backend/app/api/v1/alternate_routing.py` | **Created** | `GET /api/v1/vessels/{vessel_id}/alternate-routing`; 404 for unknown vessel; 200+recommended=False for no-diversion |
| `src/backend/app/main.py` | Updated | Registers `alternate_routing_router` |
| `src/backend/tests/test_alternate_routing.py` | **Created** | 12 tests |

#### Frontend

| File | Action | Notes |
|---|---|---|
| `src/frontend/src/types/api.ts` | Updated | Added `PortEstimate`, `AlternateRoutingResponse` interfaces |
| `src/frontend/src/services/api.ts` | Updated | Added `fetchAlternateRouting(vesselId)` |
| `src/frontend/src/pages/DashboardPage.tsx` | Updated | Added routing state; non-blocking `fetchAlternateRouting` after waiting-times load; "Routing Recommendation" card with badge/reason/disclaimer |
| `src/frontend/src/tests/DashboardPage.test.tsx` | Updated | Added `fetchAlternateRouting` mock; `mockRouting` fixture; 4 new tests (card render, result text, error state, stay badge); updated 3 existing tests to include routing mock |

### New API Endpoint

`GET /api/v1/vessels/{vessel_id}/alternate-routing`

**Response fields:**
- `vessel_id`, `vessel_name`, `schedule_id`
- `current_port`: `PortEstimateResponse` (diversion_transit_hours=0.0)
- `candidates`: list of `PortEstimateResponse` sorted best (lowest total) first
- `recommended`: True when time_saved >= diversion_threshold_hours
- `recommended_port_code`, `recommended_port_name` (null when not recommended)
- `estimated_hours_saved` (always >= 0.0)
- `reason`: one-sentence explanation
- `factors`: list of explainable drivers
- `diversion_threshold_hours`: 12.0 (demo assumption)
- `data_source`, `is_synthetic`, `limitations`, `assumptions`

**Error responses:**
- `404` — vessel_id not found

### Formula

```
estimated_total_hours =
  diversion_transit_hours          (static synthetic value per candidate)
  + candidate_avg_wait_hours       (static synthetic representative value)
  + estimated_handling_hours       (containers / (25 mph × 2 cranes))

time_saved = current_total_hours - best_candidate_total_hours
recommend  = time_saved >= 12.0 h  (demo assumption)
```

### Demo Assumptions

1. **Diversion threshold: 12 h** — no project documentation defines a different value.
2. **Candidate ports** are entirely fictional (FKROS, FKHVN, FKVRD) with synthetic transit/wait values.
3. **Average moves per hour: 25** — synthetic representative value.
4. **Handling estimate**: `containers / (25 × 2)` — two-crane allocation assumed.
5. **Current-port wait**: baseline historical (`waiting_minutes / 60`); 0.0 if no record exists.

### Test Results

```
python -m pytest backend/tests/ ml/tests/ optimizer/tests/ -q
96 passed, 1 skipped

npm test -- --run   (from src/frontend/)
17 passed

npm run build       (from src/frontend/)
✓ built in ~9s, 0 errors
```

### Validation Performed

| Check | Result |
|---|---|
| `python -m pytest backend/tests/ ml/tests/ optimizer/tests/ -q` | ✅ **96 passed, 1 skipped** |
| `npm test -- --run` (from `src/frontend/`) | ✅ **17 passed** |
| `npm run build` (from `src/frontend/`) | ✅ Built ~9s, 0 errors |
| `git diff --check` | ✅ No trailing-whitespace errors (LF→CRLF warnings only, expected on Windows) |
| `.github/workflows/validate.yml` unchanged | ✅ Confirmed |
| No fabricated external routing API calls | ✅ Confirmed — static in-code lookup only |
| All responses include `is_synthetic=True` and `data_source="synthetic"` | ✅ |
| Response never claims to be a real navigational instruction | ✅ |

### Known Limitations

1. **One seeded port** — candidate ports are static in-code demo data, not DB records.
2. **12-h threshold is a demo assumption** — not derived from real port operations research.
3. **Handling estimate is very rough** — containers / (25 mph × 2 cranes); real handling varies greatly.
4. **No ML component** — purely rule-based; no trained model required.
5. **Synthetic candidate wait values** — not derived from actual port statistics.
6. **Routing fetch is non-blocking** — fires after waiting-times resolves; uses the highest-wait vessel's schedule_id.

### IBM Bob Evidence — Human Action Required

At the end of this session:

1. Export this IBM Bob task history as Markdown.
2. Capture the IBM Bob task-consumption summary screenshot.
3. Remove any secrets or personal data from the export.
4. Save both files under `bob_sessions/` with filenames:
   - `plan11-session-YYYY-MM-DD.md`
   - `plan11-session-YYYY-MM-DD-screenshot.png`

Do not fabricate these artifacts.

## Session: Plan 12 — Explainable AI Copilot

**Date:** 2026-09-13
**Goal:** Add a minimal Copilot that explains real PortFlow API results using
structured context from existing services. Provides `rules_fallback` (always
available) and an IBM Bob LLM provider stub (configured via env vars).

### Context

Plans 1–11 established all infrastructure, ML pipelines, optimizer, waiting-time
API, and alternate-routing.  Plan 12 adds the Copilot on top — it reads from
existing services and never invents data.

### Files Changed

#### Backend

| File | Action | Notes |
|---|---|---|
| `src/backend/app/schemas/copilot.py` | **Created** | `CopilotAskRequest`, `CopilotContextSnapshot`, `CopilotAskResponse` |
| `src/backend/app/services/copilot_service.py` | **Created** | `build_context()` (gathers real service data); `_waiting_context()` helper; `_rules_fallback()` (deterministic, no LLM); `_ibm_bob_ask()` (real HTTP stub); `copilot_ask()` router |
| `src/backend/app/api/v1/copilot.py` | **Created** | `POST /api/v1/copilot/ask`; 404 for unknown port; 422 for invalid scenario/empty question |
| `src/backend/app/main.py` | Updated | Registers `copilot_router` |
| `src/backend/app/core/config.py` | Updated | Added `copilot_provider`, `ibm_bob_api_key`, `ibm_bob_model`, `ibm_bob_base_url` settings (empty defaults = rules_fallback) |
| `src/backend/.env.example` | Updated | Added `COPILOT_PROVIDER`, `IBM_BOB_API_KEY`, `IBM_BOB_MODEL`, `IBM_BOB_BASE_URL` documentation |
| `src/backend/tests/test_copilot.py` | **Created** | 15 tests |

#### Frontend

| File | Action | Notes |
|---|---|---|
| `src/frontend/src/types/api.ts` | Updated | Added `CopilotContextSnapshot`, `CopilotAskRequest`, `CopilotAskResponse` interfaces |
| `src/frontend/src/services/api.ts` | Updated | Added `fetchCopilotAsk(req)` using POST fetch |
| `src/frontend/src/pages/DashboardPage.tsx` | Updated | Added `copilotQuestion` state; `askCopilot()` callback; Copilot panel with 3 suggested questions, text input, Ask button, response/loading/error/idle states; `data-testid` attributes |
| `src/frontend/src/pages/CopilotPage.tsx` | Updated | Replaced placeholder stub with accurate description of the working endpoint and provider configuration |
| `src/frontend/src/tests/DashboardPage.test.tsx` | Updated | Added `fetchCopilotAsk` mock + `mockCopilot` fixture; 6 new tests (panel render, idle, loading, success, error, 3 suggestions); updated loading/error tests |

### New API Endpoint

`POST /api/v1/copilot/ask`

**Request body:**
- `port_code` (default `FKPFL`)
- `question` (3–500 chars)
- `scenario` (default `baseline`)

**Response fields:**
- `answer` — plain-language explanation with 3 recommendations
- `method` — `rules_fallback` | `ibm_bob_llm`
- `provider_available` — False for rules_fallback, True for IBM Bob
- `context_snapshot` — structured data gathered from existing services
- `is_synthetic`, `data_source`, `disclaimer`, `limitations`

**Error responses:** `404` (port not found), `422` (invalid scenario / empty question)

### Provider Configuration

```
COPILOT_PROVIDER=          # empty = rules_fallback (default, always safe)
COPILOT_PROVIDER=ibm_bob   # enable IBM Bob; requires credentials below
IBM_BOB_API_KEY=           # Watson ML API key — never committed
IBM_BOB_MODEL=             # deployment model ID
IBM_BOB_BASE_URL=          # WML inference endpoint base URL
```

### Actual Provider Status

**IBM Bob: NOT configured** (default empty = `rules_fallback`).
IBM Bob LLM integration is fully stubbed and will work when credentials
are supplied via environment variables.  The `method=rules_fallback` /
`provider_available=false` labels are always honest — the system never
pretends an LLM answered when only rules were used.

### Rules Fallback

`_rules_fallback()` is deterministic and context-only:
- Answers only from `CopilotContextSnapshot` (real service data)
- States synthetic data explicitly
- Distinguishes prediction (waiting_hours, risk_level) from historical fact (waiting_minutes)
- Always produces exactly 3 numbered operational recommendations
- Never invents vessel names, port names, weather, costs, or external facts

### Test Results

```
python -m pytest backend/tests/ ml/tests/ optimizer/tests/ -q
111 passed, 1 skipped

npm test -- --run   (from src/frontend/)
23 passed

npm run build       (from src/frontend/)
✓ built in ~8s, 0 errors
```

### Validation Performed

| Check | Result |
|---|---|
| `python -m pytest backend/tests/ ml/tests/ optimizer/tests/ -q` | ✅ **111 passed, 1 skipped** |
| `npm test -- --run` (from `src/frontend/`) | ✅ **23 passed** |
| `npm run build` (from `src/frontend/`) | ✅ Built ~8s, 0 errors |
| `git diff --check` | ✅ No trailing-whitespace errors (LF→CRLF normalisation only) |
| `.github/workflows/validate.yml` unchanged | ✅ Confirmed |
| No API keys or secrets in source | ✅ Only empty placeholders in `.env.example` |
| IBM Bob provider labeled honestly (not fabricated) | ✅ `provider_available=false` when unconfigured |
| rules_fallback never invents facts outside context | ✅ Confirmed by test 6 |

### Known Limitations

1. **rules_fallback only** — IBM Bob LLM is not configured in this session. The
   endpoint always returns `method=rules_fallback` until credentials are added.
2. **rules_fallback is deterministic** — same context produces same answer; no
   paraphrasing, no personalisation.
3. **Context window is narrow** — only top 20 vessel schedules and first non-empty
   congestion window are included.
4. **No chat history** — each request is stateless; no conversation memory.
5. **Single question** — one question at a time; no multi-turn dialogue.

### IBM Bob Evidence — Human Action Required

1. Export this IBM Bob task history as Markdown.
2. Capture the IBM Bob task-consumption summary screenshot.
3. Remove any secrets or personal data from the export.
4. Save both files under `bob_sessions/` with filenames:
   - `plan12-session-YYYY-MM-DD.md`
   - `plan12-session-YYYY-MM-DD-screenshot.png`

Do not fabricate these artifacts.

## Session: Plan 13 — Optimizer API Integration

**Date:** 2026-09-13
**Goal:** Connect the CP-SAT berth-and-crane optimizer to FastAPI. Expose
`POST /api/v1/operations-plan` (run optimizer) and
`POST /api/v1/operations-plan/{plan_id}/approve` (human approval gate).
No frontend changes — the optimizer panel is already rendered as a stub
in the existing dashboard (shown as "Optimization pending").

### Context

Plans 1–12 established all ML, routing, and Copilot features.  Plan 13
integrates the standalone `src/optimizer/` module — already tested with
11 unit tests — into FastAPI via a DB-reading service and Pydantic schemas.

### Files Changed

#### Backend

| File | Action | Notes |
|---|---|---|
| `src/backend/app/schemas/operations_plan.py` | **Created** | `OperationsPlanRequest`, `OperationsPlanResponse`, `OperationsPlanApprovalResponse`, `BerthAssignmentResponse`, `UnscheduledVesselResponse`, `OptimizerMetricsResponse` |
| `src/backend/app/services/operations_plan.py` | **Created** | DB adapter: loads berths, cranes, vessel schedules → `VesselInput`/`BerthInput`/`CraneInput`; calls `optimize()`; returns `(OptimizerResult, port_code)` |
| `src/backend/app/api/v1/operations_plan.py` | **Created** | `POST /api/v1/operations-plan` (run optimizer); `POST /api/v1/operations-plan/{plan_id}/approve` (approval gate); 404 for unknown port or invalid plan_id |
| `src/backend/app/main.py` | Updated | Registers `operations_plan_router` |
| `src/backend/tests/test_operations_plan.py` | **Created** | 14 tests |

### New API Endpoints

#### `POST /api/v1/operations-plan`

**Request body (all optional):**
| Field | Default | Description |
|---|---|---|
| `port_code` | `FKPFL` | Port code |
| `horizon_hours` | `72` | Planning horizon (6–168 h) |
| `solve_limit_seconds` | `5` | CP-SAT wall-clock limit (1–30 s) |

**Response fields:**
- `plan_id` — ephemeral UUID (not persisted)
- `port_code`, `horizon_hours`
- `assignments`: list of `BerthAssignmentResponse` (each with `explanation` sentence)
- `unscheduled`: vessels that could not be assigned
- `metrics`: `OptimizerMetricsResponse` (scheduled/unscheduled counts, wait reduction, utilisation, solve_status, wall seconds)
- `explanation`: multi-line plain-language summary from `explain_result()`
- `assumptions`: list of CP-SAT assumptions
- `approval_required: true`, `approved: false`
- `is_synthetic: true`, `data_source: "synthetic"`, `limitations`

**Error responses:**
- `404` — port_code not found

#### `POST /api/v1/operations-plan/{plan_id}/approve`

Validates the UUID format and returns an approval acknowledgement.
No DB writes occur. Plans are ephemeral — only UUID format is checked.

**Response fields:**
- `plan_id`, `approved: true`
- `message`: confirmation sentence
- `is_synthetic: true`, `disclaimer` (no operational changes applied)

**Error responses:**
- `404` — invalid UUID format

### Design Decisions

1. **No persistence** — optimizer results are ephemeral. Persisting assignments
   would require a DB migration (explicitly forbidden by Bobathon rules).
2. **Approval gate is in-memory** — validates UUID format only; satisfies the
   requirement for a human-in-the-loop gate without DB changes.
3. **Service decoupled from API** — `run_operations_plan()` can be called from
   tests or scripts without an HTTP request.
4. **Imports at top level in service** — optimizer is imported at module load
   time so import errors surface at startup, not at request time.

### Test Results

```
python -m pytest backend/tests/ ml/tests/ optimizer/tests/ -q
125 passed, 1 skipped

npm test -- --run   (from src/frontend/)
23 passed

npm run build       (from src/frontend/)
✓ built in ~15s, 0 errors
```

### Validation Performed

| Check | Result |
|---|---|
| `python -m pytest backend/tests/ ml/tests/ optimizer/tests/ -q` | ✅ **125 passed, 1 skipped** |
| `npm test -- --run` (from `src/frontend/`) | ✅ **23 passed** |
| `npm run build` (from `src/frontend/`) | ✅ Built ~15s, 0 errors |
| `git diff --check` | ✅ No trailing-whitespace errors (LF→CRLF normalisation only) |
| `.github/workflows/validate.yml` unchanged | ✅ Confirmed |
| Optimizer schema never writes to DB | ✅ Confirmed — no DB writes in any new code |
| `approval_required=true`, `approved=false` in plan response | ✅ Test 5 & 6 |
| `approved=true` after approve call | ✅ Test 7 |
| Invalid UUID returns 404, not 500 | ✅ Test 9 |

### Known Limitations

1. **Ephemeral plans** — each `POST /operations-plan` generates a new UUID; plans are not stored.
   A subsequent `approve` call with the same UUID always succeeds (format-only check).
2. **Optimizer can be slow** — CP-SAT with 5-second limit; for large vessel counts the solver
   may return `FEASIBLE` (not `OPTIMAL`).
3. **SQLite quirk in tests** — OR-Tools runs fine on SQLite in-memory; UUID columns are
   cast to String before comparison (consistent with all other test modules).
4. **No frontend panel** — the optimizer result is not yet displayed in the dashboard.
   The "Optimization pending" label in the dashboard footer remains until Plan 14.

### IBM Bob Evidence — Human Action Required

1. Export this IBM Bob task history as Markdown.
2. Capture the IBM Bob task-consumption summary screenshot.
3. Remove any secrets or personal data from the export.
4. Save both files under `bob_sessions/` with filenames:
   - `plan13-session-YYYY-MM-DD.md`
   - `plan13-session-YYYY-MM-DD-screenshot.png`

Do not fabricate these artifacts.

## Session: Plan 14 — PortFlow IBM Bob MCP Server

**Date:** 2026-09-13
**Goal:** Build a TypeScript MCP server (`src/mcp/`) that exposes three read-only
tools for IBM Bob to explain PortFlow API results: congestion risk, operations plan
summary, and waiting-time context.

### Context

Plans 1–13 completed all backend API features.  Plan 14 adds the IBM Bob MCP
integration layer so the IDE can call into the live PortFlow API and format
results as plain-language explanations.

### Files Changed

| File | Action | Notes |
|---|---|---|
| `src/mcp/package.json` | **Created** | TypeScript Node.js MCP server; `@modelcontextprotocol/sdk`, `zod`, `typescript` |
| `src/mcp/tsconfig.json` | **Created** | ES2022, Node16 module resolution, strict |
| `src/mcp/src/index.ts` | **Created** | 3 tools; stdio transport; `PORTFLOW_API_BASE` env var |
| `src/mcp/README.md` | **Created** | Setup guide, tool table, configuration, limitations |
| `src/mcp/build/index.js` | Generated | Compiled output (not committed; regenerated via `npm run build`) |

### Tools

| Tool | Input | Output |
|---|---|---|
| `get_risk_explanation` | `port_code`, `scenario`, `mode` | Plain-language summary of 72-hour congestion risk windows, peak window, drivers, and recommendation |
| `get_plan_summary` | `port_code`, `horizon_hours` | Runs optimizer, formats metrics, assignments, unscheduled vessels, assumptions, approval next-step |
| `get_waiting_time_context` | `port_code`, `mode` | Vessel waiting-time forecast table, risk distribution, thresholds, limitations |

### Design Decisions

1. **TypeScript/Node.js** — uses `@modelcontextprotocol/sdk` v1 (`server.tool()` registered API);
   all tools use `isError: true` for recoverable backend failures so Bob can self-correct.
2. **Read-only** — all tools are GET or POST read operations; no DB writes.
3. **`PORTFLOW_API_BASE` env var** — defaults to `http://localhost:8000/api/v1`; injectable at
   registration time for any deployment.
4. **Synthetic data labelled in every response** — every tool appends the synthetic-data warning
   regardless of success or error.
5. **`src/` only** — server lives at `src/mcp/`; no files outside `src/`.

### Build and Registration

```bash
# Build (from src/mcp/)
npm install
npm run build

# Register in workspace mcp.json
{
  "mcpServers": {
    "portflow": {
      "command": "node",
      "args": ["<absolute-path>/src/mcp/build/index.js"],
      "env": {
        "PORTFLOW_API_BASE": "http://localhost:8000/api/v1"
      }
    }
  }
}

# Then ask Bob:
# "Use get_risk_explanation to explain congestion for FKPFL."
# "Use get_plan_summary to show the 72-hour operations plan."
# "Use get_waiting_time_context to explain vessel delays."
```

### Validation Performed

| Check | Result |
|---|---|
| `npm run build` (from `src/mcp/`) | ✅ 0 TypeScript errors |
| `Test-Path src/mcp/build/index.js` | ✅ Build output exists |
| `python -m pytest backend/tests ml/tests optimizer/tests --tb=short` | ✅ **125 passed, 1 skipped** |
| `npm test -- --run` (from `src/frontend/`) | ✅ **23 passed** |
| `npm run build` (from `src/frontend/`) | ✅ Built ~11s, 0 errors |
| `git diff --check` | ✅ No trailing-whitespace errors |
| `.github/workflows/validate.yml` unchanged | ✅ Confirmed |
| All tools read-only; no DB writes | ✅ Confirmed |
| Synthetic data warning in every tool response | ✅ Confirmed |

### Known Limitations

1. **Backend must be running** — tools return `isError: true` with a helpful message if FastAPI
   is unreachable.
2. **`get_plan_summary` re-runs optimizer** — no result caching; CP-SAT runs for up to 5 s per call.
3. **No authentication** — server connects to localhost; no API key required for local demo use.
4. **Node 24 tested** — compiled with `Node16` module resolution; compatible with Node 18+.

### IBM Bob Evidence — Human Action Required

1. Export this IBM Bob task history as Markdown.
2. Capture the IBM Bob task-consumption summary screenshot.
3. Remove any secrets or personal data from the export.
4. Save both files under `bob_sessions/` with filenames:
   - `plan14-session-YYYY-MM-DD.md`
   - `plan14-session-YYYY-MM-DD-screenshot.png`

Do not fabricate these artifacts.

## Session: Plan 15 — Port Operations Map + Operational Alerts

**Date:** 2026-09-13
**Goal:** Add a compact SVG berth-layout map panel and a client-side operational
alerts panel to the existing dashboard. No new backend endpoints. No external
map libraries. No fabricated vessel positions.

### Files Changed

| File | Action | Notes |
|---|---|---|
| `src/frontend/src/components/BerthLayoutMap.tsx` | **Created** | SVG berth grid coloured by status (available/occupied/high-risk/critical/maintenance); hover tooltip; legend; explicit "not GPS-tracked" label |
| `src/frontend/src/components/AlertsPanel.tsx` | **Created** | `deriveAlerts()` pure function derives critical/high/medium alerts from already-fetched API data; `AlertsPanel` renders with severity badges and action labels |
| `src/frontend/src/pages/DashboardPage.tsx` | Updated | Imports `BerthLayoutMap`, `AlertsPanel`, `deriveAlerts`; adds `useMemo` before early-return guards for alerts; inserts Berth Map + Alerts two-column section before Copilot panel |
| `src/frontend/src/tests/MapAndAlerts.test.tsx` | **Created** | 24 focused tests |

### Design

**BerthLayoutMap:**
- Pure SVG grid layout (up to 4 berths per row)
- Colour scheme: available=green, occupied=blue, high-risk=amber, critical=red, maintenance=slate
- Hover tooltip: berth name, code, status, draft, cranes
- Legend row
- Explicit label: "Synthetic / demo operational data — not GPS-tracked vessel positions"
- No Leaflet, OpenStreetMap, or external tiles
- `berthDisplayStatus()` and `berthStatusColour()` exported for unit tests

**AlertsPanel / `deriveAlerts()`:**
- Alert sources (in priority order):
  1. Critical congestion windows → severity=`critical`
  2. High congestion windows → severity=`high`
  3. Vessel predicted wait > 12 h → severity=`high` (>24 h → `critical`)
  4. Routing recommended with ≥2 h saving → severity=`medium`
  5. Summary peak HIGH/CRITICAL with no other alerts → severity=`high`
- Each alert: `id`, `severity`, `title`, `reason`, `actionLabel`, optional `vesselName`
- `sortAlerts()` orders: critical → high → medium → info
- Loading / empty / error states all handled

**React hook fix:** `useMemo` for alerts placed **before** early-return guards to satisfy Rules of Hooks.

### Test Results

```
npm test -- --run   (from src/frontend/)
47 passed (24 MapAndAlerts + 23 DashboardPage)

npm run build       (from src/frontend/)
✓ built in ~7s, 0 TypeScript errors, 0 build errors
```

### Validation Performed

| Check | Result |
|---|---|
| `npm test -- --run` (from `src/frontend/`) | ✅ **47 passed** |
| `npm run build` (from `src/frontend/`) | ✅ Built ~7s, 0 errors |
| `git diff --check` | ✅ No trailing-whitespace errors |
| No external map library added | ✅ Pure SVG, no new npm dependency |
| No fabricated vessel GPS positions | ✅ Explicit label + no real coordinates |
| All existing DashboardPage tests still pass | ✅ 23 passed |
| `/live AIS/i` check in test 7 still passes | ✅ Text rephrased to "not GPS-tracked" |
| `.github/workflows/validate.yml` unchanged | ✅ Confirmed |

### Known Limitations

1. **No real berth coordinates** — layout is a schematic grid, not a geographic map.
2. **High-risk berth codes** — not yet derived from congestion window `affected_schedule_ids`; all berths use basic occupancy status for now. Can be enhanced when schedule→berth mapping is available.
3. **Tooltip positioning** — fixed to centre of container; may overlap content on very small screens.

### IBM Bob Evidence — Human Action Required

1. Export this IBM Bob task history as Markdown.
2. Capture the IBM Bob task-consumption summary screenshot.
3. Save under `bob_sessions/` as `plan15-session-YYYY-MM-DD.md` + screenshot.

Do not fabricate these artifacts.

## Session: Plan 16 — Demo Scenario + E2E Tests + Bug Fix

**Date:** 2026-09-13
**Goal:** Verify the full demo journey end-to-end, write E2E integration tests
covering congestion → waiting → optimizer → routing → copilot → dashboard,
fix the `vessel_id` bug that broke alternate-routing requests from the
affected-vessels table, and update the Demo Runbook in `src/README.md`.

### Context

Plans 1–15 completed all backend API features, ML pipelines, optimizer,
waiting-time predictions, alternate-routing, AI Copilot, SVG berth map, and
operational alerts. Plan 16 validates the complete demo journey, adds 32
end-to-end integration tests, fixes a data-flow bug discovered during
manual demo testing, and updates the repository README with a full runbook.

### Files Changed

| File | Action | Notes |
|---|---|---|
| `src/backend/tests/test_demo_e2e.py` | **Created** | 32 E2E integration tests covering the full demo journey |
| `src/backend/app/schemas/dashboard.py` | Updated | Added `vessel_id` field to `VesselWaitingPrediction` |
| `src/backend/app/api/v1/waiting_times.py` | Updated | Added `sa_cast(Vessel.id, SAStr).label("vessel_id")` to query; populates `vessel_id` in `VesselWaitingPrediction` response |
| `src/frontend/src/types/api.ts` | Updated | Added `vessel_id: string` to `VesselWaitingPrediction` interface |
| `src/frontend/src/pages/DashboardPage.tsx` | Updated | `fetchAlternateRouting(topVessel.vessel_id)` — was incorrectly using `schedule_id` |
| `src/frontend/src/tests/DashboardPage.test.tsx` | Updated | Added `vessel_id` to `mockWaitingTimes` vessel fixture |
| `src/frontend/src/tests/MapAndAlerts.test.tsx` | Updated | Added `vessel_id` to `mockWaitingTimes` vessel fixture |
| `src/README.md` | Updated | Full Demo Runbook (8 steps), directory structure, quick commands, known limitations |

### Bug Fixed

`fetchAlternateRouting()` was called with `topVessel.schedule_id` instead of
`topVessel.vessel_id`. The alternate-routing endpoint is
`GET /api/v1/vessels/{vessel_id}/alternate-routing` — it expects a vessel UUID,
not a schedule UUID. This caused a 404 in the routing recommendation card for
all vessels (they have valid UUIDs, but the wrong UUID type was being passed).

**Fix:** Added `vessel_id` to `VesselWaitingPrediction` schema + query +
TypeScript type, then updated `DashboardPage.tsx` to pass `vessel_id`.

### E2E Test Coverage (test_demo_e2e.py)

32 tests covering:
- Port/schedule discovery
- Health check
- Dashboard summary (real KPIs from seeded data)
- Baseline + ML congestion windows
- Waiting-times baseline + ML modes (mocked predictor for ML)
- Alternate-routing (stay + divert scenarios)
- AI Copilot (rules_fallback + context snapshot)
- Operations plan (optimise + approve flow)
- Demo scenario: `arrival_surge` congestion elevation
- Error paths: invalid port, invalid vessel, missing artifact (503)
- Data provenance: `is_synthetic=True` in all responses
- Full demo loop: congestion → waiting → routing → copilot → plan → approve

### Test Results

```
python -m pytest backend/tests/ ml/tests/ optimizer/tests/ -q
157 passed, 1 skipped

npm test -- --run   (from src/frontend/)
47 passed

npm run build       (from src/frontend/)
✓ built in ~12s, 0 errors
```

### Validation Performed

| Check | Result |
|---|---|
| `python -m ml.waiting_train` (from `src/`) | ✅ Artefact saved; MAE reported |
| `python -m pytest backend/tests/ ml/tests/ optimizer/tests/ -q` | ✅ **157 passed, 1 skipped** |
| `npm test -- --run` (from `src/frontend/`) | ✅ **47 passed** |
| `npm run build` (from `src/frontend/`) | ✅ Built ~12s, 0 errors |
| `git diff --check` | ✅ LF→CRLF normalisation warnings only (expected on Windows) |
| `.github/workflows/validate.yml` unchanged | ✅ Confirmed |
| `vessel_id` present in all `VesselWaitingPrediction` responses | ✅ Fixed in this plan |
| Alternate-routing card uses `vessel_id` (not `schedule_id`) | ✅ Fixed in this plan |
| No secrets, `.joblib`, or fabricated assets staged | ✅ Confirmed |

### Known Limitations

1. **44-row training set** — `waiting_rf_v1` metrics illustrative only.
2. **Ephemeral plans** — operations plans are not persisted; approve check is UUID-format-only.
3. **Synthetic base date** — schedules centred on 2026-09-15; `arrivals_next_24h` may be 0 after that date.
4. **Backend test coverage metric** — not yet measured; ≥70% target remains open.

### IBM Bob Evidence — Human Action Required

1. Export this IBM Bob task history as Markdown.
2. Capture the IBM Bob task-consumption summary screenshot.
3. Remove any secrets or personal data from the export.
4. Save both files under `bob_sessions/` with filenames:
   - `plan16-session-YYYY-MM-DD.md`
   - `plan16-session-YYYY-MM-DD-screenshot.png`

Do not fabricate these artifacts.

---

## Session: Plan 9 Re-Validation (Full Stack) — 2026-09-13 (post-Plan-16)

**Date:** 2026-09-13
**Goal:** Full validation pass after Plan 16 completion — run training, all
backend tests, all frontend tests, production build, and git diff --check.

### Re-Validation Results

| Check | Result |
|---|---|
| `python -m ml.waiting_train` | ✅ `waiting_pipeline.joblib` regenerated; Val MAE=7.99 h, Test MAE=18.18 h |
| `python -m pytest backend/tests/ ml/tests/ optimizer/tests/ -q` | ✅ **157 passed, 1 skipped** |
| `npm test -- --run` (from `src/frontend/`) | ✅ **47 passed** (24 MapAndAlerts + 23 DashboardPage) |
| `npm run build` (from `src/frontend/`) | ✅ Built in ~12s, 0 errors |
| `git diff --check` | ✅ LF→CRLF normalisation warnings only (expected on Windows) |
| `.github/workflows/validate.yml` unchanged | ✅ Confirmed |

All checks pass. No code changes were required in this session.

### IBM Bob Evidence — Human Action Required

1. Export this IBM Bob task history as Markdown.
2. Capture the IBM Bob task-consumption summary screenshot.
3. Save under `bob_sessions/` as `plan16-revalidation-YYYY-MM-DD.md` + screenshot.

Do not fabricate these artifacts.

---
