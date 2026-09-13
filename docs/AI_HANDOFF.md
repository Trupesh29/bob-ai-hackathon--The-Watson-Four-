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
