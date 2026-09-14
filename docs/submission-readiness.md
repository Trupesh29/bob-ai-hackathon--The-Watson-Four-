# Submission Readiness — PortFlow AI

**Track:** AI  |  **Problem:** L1 — Container Congestion Predictor & Port Operations Optimiser
**Organiser submission window:** 15 September 2026, 12:00 PM – 11:45 PM
⚠️ **Confirm timezone with the organiser before final submission.**

**Last updated:** Plan 17 — Demo Runbook Validation (2026-09-14)

---

## Automated / Technical Requirements

| Item | Status | Notes |
|---|---|---|
| `submission.yaml` present and parseable | ✅ Complete | All required fields populated (team details pending) |
| `README.md` — no template placeholders | ✅ Complete | Team details and URLs marked as pending |
| `docs/problem-statement.md` | ✅ Complete | Primary user, pain, testable criteria defined |
| `docs/solution-overview.md` | ✅ Complete | Prediction → optimisation → approval loop documented |
| `docs/architecture.md` | ✅ Complete | Mermaid diagram, tech table, data flow, security |
| `docs/setup-guide.md` | ✅ Complete | `src/`-based commands; repo URL marked pending |
| `.github/workflows/validate.yml` | ✅ Complete | Official validator — not modified |
| `.python-version` | ✅ Complete | Contains `3.12` (target spec) |
| `.gitignore` | ✅ Complete | Covers env, node_modules, dist, venv, ML artefacts, data dirs |
| `src/` directory and application skeleton | ✅ Complete | FastAPI + React shell created; no feature code yet |
| `demo/demo-video-link.txt` | ✅ Complete | Placeholder pending demo video |
| `demo/live-demo-url.txt` | ✅ Complete | Contains `NOT DEPLOYED` |
| `demo/screenshots/` directory | ✅ Complete | Empty; screenshots pending |
| `presentation/` directory | ✅ Complete | Empty; slide deck pending |
| `bob_sessions/` directory + README | ✅ Complete | README explains export requirements; sessions pending |
| `CONTRIBUTING.md` | ✅ Complete | |
| All code paths use `src/` layout | ✅ Complete | Verified in setup guide, architecture, and all commands |
| ML, optimiser, LLM, and deterministic roles distinct | ✅ Complete | Documented in solution-overview and architecture |
| Synthetic data policy explicit | ✅ Complete | Data dictionary and architecture |
| Human approval required for routing/plans | ✅ Complete | Documented; `/operations-plan` route has approval gate UI stub |
| No secrets or real credentials in source | ✅ Complete | Only `.env.example` files committed |
| `GET /api/v1/health` returns exact contract response | ✅ Complete | `{"status":"healthy","service":"portflow-api","version":"0.1.0"}` |
| `GET /api/v1/dashboard/summary` returns real KPIs | ✅ Complete | Plan 4 — reads seeded PostgreSQL data |
| `GET /api/v1/dashboard/congestion` returns 12×6h windows | ✅ Complete | Plan 4/6 — mode=baseline (baseline_rule_v1) + mode=ml (congestion_rf_v1) |
| `GET /api/v1/schedules` returns vessel list | ✅ Complete | Plan 4 |
| `GET /api/v1/resources/berths` and `/cranes` | ✅ Complete | Plan 4 |
| `GET /api/v1/scenarios` lists 5 scenarios | ✅ Complete | Plan 4 |
| ML congestion classifier trained + integrated | ✅ Complete | Plan 5/6 — congestion_rf_v1 (synthetic data); mode=ml returns 503 if artefact absent |
| `GET /api/v1/waiting-times` returns per-vessel predictions | ✅ Complete | Plan 9 — mode=baseline + mode=ml |
| `GET /api/v1/vessels/{vessel_id}/alternate-routing` returns routing recommendation | ✅ Complete | Plan 11 — rule-based, 3 synthetic candidate ports, 12-h threshold |
| `POST /api/v1/copilot/ask` returns plain-language explanation | ✅ Complete | Plan 12 — rules_fallback always; IBM Bob LLM when configured |
| `POST /api/v1/operations-plan` runs CP-SAT optimizer and returns assignment plan | ✅ Complete | Plan 13 — approval_required=true; metrics, explanation, assumptions |
| `POST /api/v1/operations-plan/{plan_id}/approve` records human approval | ✅ Complete | Plan 13 — ephemeral, UUID-validated, no DB writes |
| Backend tests pass (`pytest backend/tests ml/tests optimizer/tests -q` from `src/`) | ✅ Complete | **157 passed, 1 skipped** (env: `DATABASE_URL=sqlite:///./portflow_test.db`) |
| Frontend production build passes (`npm run build` in `src/frontend/`) | ✅ Complete | Vite 6, 0 errors, built in ~3.8s |
| Frontend tests pass (`npm test` in `src/frontend/`) | ✅ Complete | **59 passed** — Vitest (23 dashboard + 24 map/alerts + 5 feature pages + 7 judge audit) |
| `npm audit` — 0 high-severity vulnerabilities | ✅ Complete | 0 vulnerabilities |
| Complete Functional QA Audit (`docs/QA_AUDIT.md`) | ✅ Complete | Plan 18 — 59-item audit matrix, all journeys PASS, judge click order |

---

## Application Code

| Item | Status | Notes |
|---|---|---|
| `src/backend/` — FastAPI app factory + health endpoint | ✅ Complete | Plan 2 |
| `src/backend/` — pydantic-settings config, CORS, error envelope | ✅ Complete | Plan 2 |
| `src/frontend/` — React + Vite + TS shell, all 7 routes | ✅ Complete | Plan 2 |
| `src/backend/app/models/` — 6 SQLAlchemy 2 ORM models | ✅ Complete | Plan 3 |
| `src/backend/app/dependencies.py` — session factory | ✅ Complete | Plan 3 |
| `src/database/migrations/` — Alembic initial migration | ✅ Complete | Plan 3 (rev `0001_initial_schema`) |
| `src/data/generator.py` — synthetic data generator (5 scenarios) | ✅ Complete | Plan 3 |
| `src/data/seed.py` — idempotent database seeder | ✅ Complete | Plan 3 |
| `src/backend/app/schemas/dashboard.py` — Pydantic v2 schemas | ✅ Complete | Plan 4 |
| `src/backend/app/services/congestion.py` — baseline_rule_v1 | ✅ Complete | Plan 4 |
| `src/backend/app/api/v1/dashboard.py` — summary + congestion | ✅ Complete | Plan 4 |
| `src/backend/app/api/v1/schedules.py` — vessel schedules | ✅ Complete | Plan 4 |
| `src/backend/app/api/v1/resources.py` — berths, cranes, scenarios | ✅ Complete | Plan 4 |
| `src/frontend/src/pages/DashboardPage.tsx` — full dashboard | ✅ Complete | Plan 4 |
| `src/frontend/src/services/api.ts` — typed API client | ✅ Complete | Plan 4 |
| `src/frontend/src/types/api.ts` — all API response types | ✅ Complete | Plan 4 |
| `src/backend/tests/test_dashboard.py` — 22 dashboard API tests | ✅ Complete | Plan 4+6 |
| `src/frontend/src/tests/DashboardPage.test.tsx` — 9 UI tests | ✅ Complete | Plan 4+6 |
| `src/ml/` — scikit-learn congestion RF classifier + training | ✅ Complete | Plan 5 |
| `src/ml/` — ML integrated into FastAPI via mode=ml param | ✅ Complete | Plan 6 |
| `src/optimizer/` — OR-Tools CP-SAT berth-and-crane optimizer | ✅ Complete | Plan 7 — standalone module, 11 tests |
| `src/ml/waiting_*.py` — waiting-time regression pipeline | ✅ Complete | Plan 8 — 11 tests, MAE 8.44 h vs baseline 12.02 h |
| `src/backend/app/api/v1/waiting_times.py` — waiting-time endpoint | ✅ Complete | Plan 9 — mode=baseline (historical) + mode=ml (waiting_rf_v1) |
| `src/frontend/` — waiting-time mode selector + affected vessels table | ✅ Complete | Plan 9 — DashboardPage enhanced, 13 frontend tests |
| `src/backend/tests/test_waiting_times.py` — 10 waiting-time API tests | ✅ Complete | Plan 9 |
| `src/backend/app/services/alternate_routing.py` — rule-based routing service | ✅ Complete | Plan 11 — 3 synthetic candidate ports, 12-h threshold |
| `src/backend/app/api/v1/alternate_routing.py` — routing endpoint | ✅ Complete | Plan 11 — GET /api/v1/vessels/{vessel_id}/alternate-routing |
| `src/frontend/` — routing recommendation card | ✅ Complete | Plan 11 — compact card, stay/divert badge, error state, 17 frontend tests |
| `src/backend/tests/test_alternate_routing.py` — 12 routing API tests | ✅ Complete | Plan 11 |
| `src/backend/app/services/copilot_service.py` — Copilot context + provider | ✅ Complete | Plan 12 — rules_fallback + IBM Bob stub |
| `src/backend/app/api/v1/copilot.py` — POST /api/v1/copilot/ask | ✅ Complete | Plan 12 |
| `src/backend/tests/test_copilot.py` — 15 Copilot API tests | ✅ Complete | Plan 12 |
| `src/frontend/` — Copilot panel in Dashboard (suggested Q, input, response) | ✅ Complete | Plan 12 — 23 frontend tests |
| `src/backend/app/schemas/operations_plan.py` — Pydantic schemas for optimizer API | ✅ Complete | Plan 13 |
| `src/backend/app/services/operations_plan.py` — DB adapter for optimizer | ✅ Complete | Plan 13 |
| `src/backend/app/api/v1/operations_plan.py` — POST /api/v1/operations-plan + approve | ✅ Complete | Plan 13 |
| `src/backend/tests/test_operations_plan.py` — 14 optimizer API tests | ✅ Complete | Plan 13 |
| `src/optimizer/` — API integration (optimise + approval endpoints) | ✅ Complete | Plan 13 — see rows above |
| `src/mcp/src/index.ts` — PortFlow IBM Bob MCP server (3 read-only tools) | ✅ Complete | Plan 14 — get_risk_explanation, get_plan_summary, get_waiting_time_context |
| `src/mcp/README.md` — MCP server setup guide | ✅ Complete | Plan 14 |
| `src/backend/` — PortFlow MCP server | ✅ Complete | Plan 14 — see src/mcp/ above |
| `src/frontend/src/components/BerthLayoutMap.tsx` — SVG berth layout, status colours, hover tooltip | ✅ Complete | Plan 15 — no external map tiles |
| `src/frontend/src/components/AlertsPanel.tsx` — alert derivation from API data, severity sort | ✅ Complete | Plan 15 |
| `src/frontend/src/tests/MapAndAlerts.test.tsx` — 24 focused tests | ✅ Complete | Plan 15 |
| `src/backend/tests/test_demo_e2e.py` — 32 E2E integration tests | ✅ Complete | Plan 16 — full demo journey, all API paths, error paths |
| `vessel_id` field in `VesselWaitingPrediction` + routing fix | ✅ Complete | Plan 16 — bug fix; alternate-routing card now uses correct UUID |
| Demo Runbook in `src/README.md` | ✅ Complete | Plan 16 — 8-step runbook, directory structure, known limitations |
| `src/pytest.ini` — `DATABASE_URL=sqlite:///./portflow_test.db` env for tests | ✅ Complete | Plan 17 — demo-blocking fix: engine import failed without live PostgreSQL |
| `src/frontend/package.json` — `@testing-library/dom` in devDependencies | ✅ Complete | Plan 17 — demo-blocking fix: frontend tests crashed with `Cannot find package` error |
| Full Judge QA Audit Suite (`src/frontend/src/tests/JudgeAudit.test.tsx`) | ✅ Complete | Plan 18 — 7 comprehensive journey tests |
| Backend test suite coverage ≥ 70% | 🔲 Not started | Future |

---

## Manual Artifacts (Human Action Required)

| Item | Status | Action required |
|---|---|---|
| Team member names | 🔲 Not started | Update `submission.yaml` and `README.md` with real names |
| Team member emails | 🔲 Not started | Update `submission.yaml` with real emails |
| Public GitHub repository | 🔲 Not started | Create from official IBM Bobathon template; set `repository_url` in `submission.yaml` |
| Demo video | 🔲 Not started | Record, upload, add URL to `demo/demo-video-link.txt` and `submission.yaml` |
| Live demo deployment | 🔲 Not started | Deploy to Render/Vercel/IBM Cloud; add URL to `demo/live-demo-url.txt` and `submission.yaml` |
| Screenshots (≥3) | 🔲 Not started | Capture from working app; add to `demo/screenshots/` |
| Slide deck / presentation | 🔲 Not started | Create and add to `presentation/` |
| IBM Bob task exports | 🔲 Not started | Export Markdown + screenshot for each relevant Bob task to `bob_sessions/` |
| Official submission form | 🔲 Not started | Complete on hackathon platform before deadline |

---

## Pre-Submission Checklist

Before submitting the form:

- [ ] All `TEAM_MEMBER_*` and `*_PENDING` placeholders replaced in `submission.yaml` and `README.md`
- [ ] `repository_url` in `submission.yaml` points to the correct public GitHub repository
- [ ] `demo_video_url` is a working, publicly accessible link
- [ ] `live_demo_url` is a working, publicly accessible URL
- [ ] Demo video shows the complete prediction → optimisation → approval flow
- [ ] At least 3 screenshots in `demo/screenshots/`
- [ ] Slide deck in `presentation/`
- [ ] At least one IBM Bob task export in `bob_sessions/` (Markdown + screenshot)
- [ ] `git diff --check` passes (no trailing whitespace issues)
- [ ] Validator workflow passes (`Actions` tab on GitHub)
- [ ] Submission form completed on the hackathon platform

---

## Key Dates

| Event | Date / Time |
|---|---|
| Organiser submission window | 15 September 2026, 12:00 PM – 11:45 PM |
| Timezone | **Confirm with organiser** |
