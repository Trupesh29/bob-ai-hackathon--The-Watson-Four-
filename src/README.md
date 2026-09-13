# src/ — Application Source Code

All PortFlow AI application code lives under this directory.

**Plan 4 status:** Dashboard API (6 endpoints), `baseline_rule_v1` congestion service, React dashboard
with Recharts congestion chart, 34 backend tests + 7 frontend tests. All data from seeded PostgreSQL.

---

## Directory Structure

```
src/
├── backend/                    # Python FastAPI application
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── health.py       # GET /api/v1/health
│   │   │   ├── dashboard.py    # GET /api/v1/dashboard/summary, /congestion  ← Plan 4
│   │   │   ├── schedules.py    # GET /api/v1/schedules                        ← Plan 4
│   │   │   └── resources.py    # GET /api/v1/resources/berths, /cranes, /scenarios ← Plan 4
│   │   ├── core/config.py      # pydantic-settings (Settings class)
│   │   ├── core/errors.py      # Global exception handlers
│   │   ├── models/             # SQLAlchemy 2 ORM models (Plan 3)
│   │   │   ├── port.py
│   │   │   ├── vessel.py
│   │   │   ├── berth.py
│   │   │   ├── crane.py
│   │   │   ├── vessel_schedule.py
│   │   │   └── historical_operation.py
│   │   ├── schemas/dashboard.py # Pydantic v2 response schemas      ← Plan 4
│   │   ├── services/congestion.py # baseline_rule_v1 calculator      ← Plan 4
│   │   ├── ml/                 # scikit-learn inference (Plan 5)
│   │   ├── optimiser/          # OR-Tools CP-SAT (Plan 5)
│   │   ├── mcp_server/         # PortFlow MCP server (Plan 6)
│   │   ├── dependencies.py     # SQLAlchemy session factory (Plan 3)
│   │   └── main.py             # FastAPI app factory
│   ├── tests/
│   │   ├── test_health.py      # 3 health endpoint tests
│   │   ├── test_database.py    # 13 ORM + seed tests (Plan 3)
│   │   └── test_dashboard.py   # 18 dashboard API tests               ← Plan 4
│   ├── requirements.txt
│   └── .env.example
├── database/                   # Alembic configuration (Plan 3)
│   ├── alembic.ini
│   └── migrations/
│       ├── env.py
│       └── versions/
│           └── 0001_initial_schema.py
├── data/                       # Synthetic data (Plan 3)
│   ├── generator.py            # Deterministic scenario generator
│   ├── seed.py                 # Database seeder (idempotent)
│   ├── raw/                    # Raw input data (gitignored except .gitkeep)
│   └── processed/              # Processed data (gitignored except .gitkeep)
├── frontend/                   # React + Vite + TypeScript
│   └── src/
│       ├── App.tsx             # Router with 7 routes
│       ├── components/         # Shell, Sidebar, EmptyState
│       ├── pages/
│       │   ├── DashboardPage.tsx  # Full dashboard — Plan 4  ← Plan 4
│       │   └── (other pages)
│       ├── services/api.ts        # Typed API client          ← Plan 4
│       ├── types/api.ts           # All API response types    ← Plan 4
│       └── tests/DashboardPage.test.tsx  # 7 UI tests         ← Plan 4
├── ml/                         # Standalone ML scripts (Plan 5)
├── optimizer/                  # Standalone solver scripts (Plan 5)
├── mcp-server/                 # Standalone MCP server (Plan 6)
├── tests/                      # Integration tests
├── .env.example                # Index pointing to sub-module examples
├── pytest.ini
└── README.md                   # This file
```

---

## Quick Commands

All commands run from `src/`:

```bash
# Activate virtual environment (Windows PowerShell)
.venv\Scripts\Activate.ps1

# Install backend dependencies
pip install -r backend/requirements.txt

# Run database migrations
python -m alembic -c database/alembic.ini upgrade head

# Check current migration
python -m alembic -c database/alembic.ini current

# Seed synthetic demo data (idempotent)
python -m data.seed

# Re-seed from scratch (dev/test only)
python -m data.seed --reset

# Start the API server
python -m uvicorn backend.app.main:app --reload --port 8000

# Run all backend tests (34 passed, 1 skipped)
python -m pytest backend/tests -v

# Health check
curl http://localhost:8000/api/v1/health

# Dashboard summary (requires seeded data)
curl "http://localhost:8000/api/v1/dashboard/summary?port_code=FKPFL"

# 72-hour congestion horizon (baseline_rule_v1, not ML)
curl "http://localhost:8000/api/v1/dashboard/congestion?port_code=FKPFL"
```

From `src/frontend/`:

```bash
# Run frontend tests (7 passed)
npm test

# Frontend production build
npm run build
```

---

## Synthetic Data Disclosure

All data seeded by `python -m data.seed` is **entirely synthetic and fictional**.

- Port name: "Port of Falkermere" — **not a real port**
- Vessel names (e.g. "FALKERMERE ATLAS") — **not real vessels**
- IMO numbers (e.g. "IMO9000001") — **fictional, not real IMO registry entries**
- All records have `is_synthetic = true`
- Data is reproducible: `SYNTHETIC_DATA_SEED=2026` (configurable)
- No real port operator data, AIS feeds, customer data, or personal information

Five scenarios are generated: `baseline`, `arrival_surge`, `crane_outage`,
`berth_closure`, and `handling_slowdown`.

---

## Environment Setup

```bash
# 1. Copy and edit backend environment file
cp backend/.env.example backend/.env
# Edit backend/.env — set DATABASE_URL to your PostgreSQL connection string

# 2. Copy and edit frontend environment file
cp frontend/.env.example frontend/.env
# Default VITE_API_BASE_URL=http://localhost:8000/api/v1 usually works
```

See `docs/setup-guide.md` for full prerequisites and troubleshooting.
