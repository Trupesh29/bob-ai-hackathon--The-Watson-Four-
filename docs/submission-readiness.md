# Submission Readiness — PortFlow AI

**Track:** AI  |  **Problem:** L1 — Container Congestion Predictor & Port Operations Optimiser
**Organiser submission window:** 15 September 2026, 12:00 PM – 11:45 PM
⚠️ **Confirm timezone with the organiser before final submission.**

**Last updated:** Plan 4 session (2026-09-13)

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
| Backend tests pass (`pytest backend/tests ml/tests -q` from `src/`) | ✅ Complete | **52 passed, 1 skipped** |
| Frontend production build passes (`npm run build` in `src/frontend/`) | ✅ Complete | Vite 6, 0 errors, Recharts included |
| Frontend tests pass (`npm test` in `src/frontend/`) | ✅ Complete | **9 passed** — Vitest + testing-library |
| `npm audit` — 0 high-severity vulnerabilities | ✅ Complete | 0 vulnerabilities |

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
| `src/backend/` — OR-Tools CP-SAT solver | 🔲 Not started | Future |
| `src/backend/` — PortFlow MCP server | 🔲 Not started | Future |
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
