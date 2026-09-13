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

## Next Task — Plan 4

**Goal:** Implement Pydantic v2 schemas and CRUD REST endpoints for vessels, berths,
and vessel schedules.  Connect the database to the API.  No ML or CP-SAT yet.

**Scope:**
1. Pydantic v2 request/response schemas for all entities in `docs/API_CONTRACT.md`.
2. CRUD route handlers: `GET /api/v1/vessels`, `GET /api/v1/berths`, `GET /api/v1/ports`.
3. Database session injection via `get_db()` dependency.
4. Update `docs/DATA_DICTIONARY.md` to match the Plan 3 schema.
5. pytest tests for at least the vessels and berths endpoints.

**Before starting Plan 4, read:**
- `docs/AI_HANDOFF.md` (this document)
- `docs/API_CONTRACT.md`
- `docs/DEFINITION_OF_DONE.md`
- `src/backend/app/models/` (all 6 model files)

**Do NOT implement in Plan 4:**
- ML pipeline
- CP-SAT solver
- Frontend changes beyond API type updates
