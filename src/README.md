# src/ — Application Source Code

All PortFlow AI application code lives under this directory.

---

## Directory Structure

```
src/
├── backend/                    # Python FastAPI application
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── health.py           # GET /api/v1/health
│   │   │   ├── dashboard.py        # GET /api/v1/dashboard/summary, /congestion
│   │   │   ├── schedules.py        # GET /api/v1/schedules
│   │   │   ├── resources.py        # GET /api/v1/resources/berths, /cranes, /scenarios
│   │   │   ├── waiting_times.py    # GET /api/v1/waiting-times
│   │   │   ├── alternate_routing.py # GET /api/v1/vessels/{vessel_id}/alternate-routing
│   │   │   ├── copilot.py          # POST /api/v1/copilot/ask
│   │   │   └── operations_plan.py  # POST /api/v1/operations-plan + /approve
│   │   ├── core/config.py      # pydantic-settings (Settings class)
│   │   ├── core/errors.py      # Global exception handlers
│   │   ├── models/             # SQLAlchemy 2 ORM models
│   │   ├── schemas/            # Pydantic v2 response schemas
│   │   ├── services/           # Business logic (congestion, waiting, routing, copilot)
│   │   ├── dependencies.py     # SQLAlchemy session factory
│   │   └── main.py             # FastAPI app factory + ML artifact loading
│   ├── tests/                  # Backend API tests (157 passed, 1 skipped)
│   ├── requirements.txt
│   └── .env.example
├── database/                   # Alembic configuration
│   ├── alembic.ini
│   └── migrations/
├── data/                       # Synthetic data generation and seeding
│   ├── generator.py            # Deterministic scenario generator (seed=2026)
│   └── seed.py                 # Database seeder (idempotent, --reset for dev)
├── frontend/                   # React + Vite + TypeScript
│   └── src/
│       ├── components/         # BerthLayoutMap, AlertsPanel, Shell, Sidebar
│       ├── pages/DashboardPage.tsx  # Full dashboard
│       ├── services/api.ts     # Typed API client
│       ├── types/api.ts        # All API response types
│       └── tests/              # 47 frontend tests
├── ml/                         # scikit-learn ML pipelines
│   ├── congestion_train.py     # Train congestion classifier
│   ├── waiting_train.py        # Train waiting-time regressor
│   ├── congestion_predict.py   # CongestionPredictor class
│   ├── waiting_predict.py      # WaitingPredictor class
│   └── artifacts/              # Saved .joblib pipelines (not committed)
├── optimizer/                  # OR-Tools CP-SAT optimizer
│   ├── berth_crane_optimizer.py # optimize() entry point
│   ├── models.py               # Input/output dataclasses
│   ├── feasibility.py          # Pre-solve checks
│   └── explain.py              # Plain-language explanation generators
├── mcp/                        # IBM Bob MCP server (TypeScript/Node.js)
│   ├── src/index.ts            # 3 read-only tools: risk, plan, waiting-time
│   └── README.md               # Setup and registration guide
├── pytest.ini
└── README.md                   # This file
```

---

## Quick Commands

All commands run from `src/` unless noted:

```bash
# Activate virtual environment (Windows PowerShell)
.venv\Scripts\Activate.ps1

# Install backend dependencies
pip install -r backend/requirements.txt

# Run database migrations
python -m alembic -c database/alembic.ini upgrade head

# Seed synthetic demo data (idempotent — safe to run repeatedly)
python -m data.seed

# Re-seed from scratch (dev/test only — requires APP_ENV=development)
python -m data.seed --reset

# Train ML artifacts (required for mode=ml; not required for demo baseline)
python -m ml.congestion_train
python -m ml.waiting_train

# Start the API server (port 8000)
python -m uvicorn backend.app.main:app --reload --port 8000

# Run ALL backend + ML + optimizer tests
python -m pytest backend/tests ml/tests optimizer/tests -q

# Run only the end-to-end demo scenario test
python -m pytest backend/tests/test_demo_e2e.py -v
```

From `src/frontend/`:

```bash
npm install          # first time only
npm test             # run 47 frontend tests
npm run build        # production build
npm run dev          # development server (port 5173)
```

From `src/mcp/`:

```bash
npm install
npm run build        # compile TypeScript MCP server
```

---

## Demo Runbook — Traffic Spike → Full Journey

This runbook walks through the complete PortFlow AI demo journey in the browser
using the **`arrival_surge`** scenario (12 vessels at 15-minute intervals — the
traffic spike).

### Prerequisites

1. PostgreSQL running with a `portflow` database
2. Backend `.env` configured (`cp backend/.env.example backend/.env`, set `DATABASE_URL`)
3. Frontend `.env` configured (`cp frontend/.env.example frontend/.env`)

### Step 0 — Setup (one time)

```bash
# From src/
python -m alembic -c database/alembic.ini upgrade head
python -m data.seed
```

Expected output:
```
Synthetic dataset (seed=2026)
  Port:      1  (FKPFL)
  Berths:    3
  Cranes:    7
  Vessels:   15
  Schedules: 44 across 5 scenarios
  Operations:44
    baseline             :   8 schedules, avg wait 12 min
    arrival_surge        :  12 schedules, avg wait 976 min
    crane_outage         :   8 schedules, avg wait 161 min
    berth_closure        :   8 schedules, avg wait 236 min
    handling_slowdown    :   8 schedules, avg wait 12 min
```

### Step 1 — Start the application

```bash
# Terminal 1 — Backend
cd src/
python -m uvicorn backend.app.main:app --reload --port 8000

# Terminal 2 — Frontend
cd src/frontend/
npm run dev
```

Open: **http://localhost:5173**

### Step 2 — Traffic Spike: select Arrival Surge scenario

1. Open the **Dashboard** (default page)
2. In the **Scenario** row, click **"Arrival Surge"**

**Expected truthful outcomes:**
- KPI "Upcoming Vessels" shows the vessels in this scenario
- KPI "Peak Risk" shows a high risk percentage (amber/red)
- KPI "Est. Avg Wait" shows ~16h (976 min ÷ 60) — the genuine seeded value
- The "Synthetic demo data" badge is always visible

### Step 3 — Congestion prediction

3. The **72-Hour Congestion Horizon** chart updates automatically
4. Bars in the first 6-hour windows show HIGH risk due to 12 vessels cramming into 3 berths

**Expected truthful outcomes:**
- At least one bar is orange/red (high/critical)
- Tooltip shows "queue: N vessels" reflecting the genuine queue estimate
- Method label shows `baseline_rule_v1`

### Step 4 — Affected vessels & wait prediction

5. Scroll down to **"Affected Vessels"** table
6. Table lists vessels sorted by predicted wait, highest first

**Expected truthful outcomes:**
- Top vessel shows a multi-hour predicted wait (from seeded `waiting_minutes` ÷ 60)
- Risk badges show `medium` or `high` for heavily queued vessels
- Primary cause column shows "high queue at arrival" for later-arriving vessels
- Method label shows `waiting_baseline_v1`

### Step 5 — 72-hour berth/crane optimization

7. Open a terminal and run:
   ```bash
   curl -s -X POST http://localhost:8000/api/v1/operations-plan \
     -H "Content-Type: application/json" \
     -d '{"port_code":"FKPFL","horizon_hours":72,"solve_limit_seconds":5}' | python -m json.tool
   ```

**Expected truthful outcomes:**
- `solve_status`: OPTIMAL or FEASIBLE
- `scheduled_count + unscheduled_count == total_vessels`
- `wait_reduction_minutes > 0` (optimizer beats FIFO)
- `approval_required: true` — human must approve before use
- All assignments have non-negative `waiting_minutes`

To approve the plan:
```bash
# Replace <plan_id> with the UUID from the response above
curl -s -X POST http://localhost:8000/api/v1/operations-plan/<plan_id>/approve | python -m json.tool
```

### Step 6 — Alternate-routing decision

8. The **Routing Recommendation** card loads automatically (uses top-wait vessel)
9. It shows either "Stay at current port" or "Divert → [Port]" depending on time saved

**Expected truthful outcomes:**
- Card shows the vessel name, threshold (12 h), and a one-sentence reason
- If diversion is not recommended: honest "saves only X.X h — below the 12-h threshold"
- If diversion is recommended: estimated hours saved ≥ 12 h
- Label "Synthetic training data" is always visible
- This is NOT a real navigational instruction

### Step 7 — AI Copilot explanation

10. In the **AI Copilot** panel, click: *"Why is congestion high and what should operators do?"*

**Expected truthful outcomes:**
- Response appears with 3 numbered operational recommendations
- Method label shows `rules_fallback` (IBM Bob LLM not configured in local dev)
- Disclaimer: "All data is synthetic demo data"
- `provider_available: false` — honest, not fabricated

### Step 8 — Port Operations Map + Alerts

11. Scroll to **Port Operations Map** — SVG schematic shows berths coloured by status
12. Scroll to **Operational Alerts** — alerts derived from congestion and wait data

**Expected truthful outcomes:**
- Map shows TB01/TB02/TB03 (or B01/B02/B03) berth blocks
- Label: "Synthetic / demo operational data — not GPS-tracked vessel positions"
- Alerts panel shows HIGH alerts from the congestion windows and queued vessels
- All alert action labels are non-destructive suggestions

### Reset for a clean demo

```bash
# From src/ (requires APP_ENV=development in backend/.env)
APP_ENV=development python -m data.seed --reset
```

---

## Synthetic Data Disclosure

All data seeded by `python -m data.seed` is **entirely synthetic and fictional**.

| Item | Detail |
|---|---|
| Port | "Port of Falkermere" — **not a real port** |
| Vessels | e.g. "FALKERMERE ATLAS" — **not real vessels** |
| IMO numbers | e.g. "IMO9000001" — **fictional, not real IMO registry** |
| Synthetic flag | Every record has `is_synthetic = true` |
| Seed | `SYNTHETIC_DATA_SEED=2026` (configurable) |
| No real data | No AIS feeds, port operator data, or personal information |

Five scenarios: `baseline`, `arrival_surge`, `crane_outage`, `berth_closure`, `handling_slowdown`.

---

## Environment Setup

```bash
# 1. Backend
cp backend/.env.example backend/.env
# Edit: set DATABASE_URL to your PostgreSQL connection string

# 2. Frontend
cp frontend/.env.example frontend/.env
# Default VITE_API_BASE_URL=http://localhost:8000/api/v1 works for local dev

# 3. MCP server (optional — for IBM Bob IDE integration)
cd mcp/
npm install && npm run build
# Then register build/index.js in your workspace mcp.json
```

See `docs/setup-guide.md` for full prerequisites.

---

## Known Limitations

| Item | Detail |
|---|---|
| ML mode | Requires running `python -m ml.congestion_train` and `python -m ml.waiting_train` first. Returns HTTP 503 (not a crash) if artifact absent. |
| Optimizer | CP-SAT with 5-second limit. May return FEASIBLE (not OPTIMAL) for large inputs. Assignments require human approval — no auto-commit. |
| Routing | Candidate ports are entirely fictional. Transit times are illustrative. Not a real navigational instruction. |
| Copilot | `rules_fallback` always available. IBM Bob LLM requires `COPILOT_PROVIDER=ibm_bob` + credentials in `.env`. |
| Map | Berth schematic only — not real geographic coordinates. |
| Congestion | `arrival_surge` peak risk depends on absolute vessel count vs berth count. With seed=2026, avg wait ≈ 976 min. |
