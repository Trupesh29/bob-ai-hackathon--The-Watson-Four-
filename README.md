# PortFlow AI — Container Congestion Predictor & Port Operations Optimiser

## Team

**The Watson Four** · **Track: AI** · **Problem: L1**

- Lead: Deep Makwana — 24dcs048@charusat.edu.in
- Members: Manav Kansagra, Smit Kansagara, Trupesh Hingrajiya

## Problem Statement

Port shift supervisors must coordinate vessel arrivals with limited berths and crane capacity. Overlapping arrivals and unavailable equipment can create queues, making it difficult to anticipate delays and compare feasible responses.

## Solution

PortFlow AI brings schedules, resource availability, predictions, and optimized assignments into one supervisor workspace. It supports baseline and trained ML forecasts, CP-SAT planning, advisory routing, and visual review. Prototype approval is an ephemeral acknowledgement, not activation of a production schedule.

## Key Features

- CSV upload and manual vessel entry; berth/crane status controls and a synthetic disruption scenario.
- A 72-hour congestion view and per-vessel waiting-time predictions, with baseline and ML modes.
- Joint berth-and-crane optimization using OR-Tools CP-SAT and a FIFO waiting-time comparison.
- Advisory alternate routing, operations-plan review, and SVG berth visualization.
- Operational Copilot with a local rules fallback, optional Watsonx provider, and separate read-only MCP integration for IBM Bob.

## Tech Stack

React 18, TypeScript, Vite 6, Tailwind CSS 3, React Router 7, Recharts 3; Python 3.12, FastAPI, Pydantic, SQLAlchemy, Alembic; PostgreSQL or local SQLite; scikit-learn Random Forest pipelines, Joblib, and OR-Tools CP-SAT. The berth map uses SVG, not Leaflet.

## How to Run

The following commands use Windows PowerShell and local SQLite. Full configuration and PostgreSQL deployment instructions are in [the setup guide](docs/setup-guide.md).

```powershell
git clone https://github.com/Trupesh29/bob-ai-hackathon--The-Watson-Four-.git
cd bob-ai-hackathon--The-Watson-Four-
python -m venv .venv
.\.venv\Scripts\Activate.ps1
# Avoid a machine-wide pip prefix overriding the virtual environment.
Remove-Item Env:PIP_PREFIX -ErrorAction SilentlyContinue
python -m pip install -r src/backend/requirements.txt
Copy-Item src/backend/.env.example src/backend/.env
# Edit src/backend/.env: set DATABASE_URL=sqlite:///./portflow_demo.db
cd src
python -m data.seed
python -X utf8 -m ml.congestion_train
python -X utf8 -m ml.waiting_train
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

In a second terminal, from the repository root:

```powershell
cd src/frontend
npm ci
Copy-Item .env.example .env
npm run dev
```

Open http://localhost:5173. Verify health at http://localhost:8000/api/v1/health and Swagger at http://localhost:8000/api/v1/docs. Generated databases, environments, models, and build outputs are git-ignored.

## Repository Layout

`src/frontend/` contains eight React pages; `src/backend/` contains the API, ORM, schemas, and services. `src/database/` holds migrations; `src/data/` generates/seeds synthetic records; `src/ml/` trains and loads predictors; `src/optimizer/` contains CP-SAT logic; `src/mcp/` contains the TypeScript MCP server. Submission documents and artifacts remain in the template's top-level folders.

## Demo

- [User-provided demo video](https://drive.google.com/file/d/1mDgTB5ZLHZ8GgCLUZmYUsYa72eaoEjp_/view?usp=drive_link) — playback and view-only permissions require confirmation.
- [Repository](https://github.com/Trupesh29/bob-ai-hackathon--The-Watson-Four-) — public accessibility and latest Actions status require confirmation.
- Live demo: **NOT DEPLOYED** (permitted by the supplied guide).
- [Presentation](presentation/slides.pptx) — factual project overview; no invented benchmark savings.
- [Screenshots](demo/screenshots/) — three genuine running-app captures are still required.
- [Bob sessions](bob_sessions/) — genuine exports will be supplied by the team.

Suggested journey: Data Input → Dashboard → Predictions → Vessels/routing → Optimizer → Operations Plan → Berth Map → Copilot. Read generated numbers from the actual run.

## IBM Integration

The repository provides three MCP tools for risk explanations, waiting-time context, and plan summaries. They do not write to the database, though plan-summary requests invoke the solver. Copilot uses `rules_fallback` without credentials, with optional Watsonx text generation when configured. Team-reported Bob development usage needs genuine session evidence; this documentation review does not establish a live IBM execution.

## Known Limitations

- Synthetic demo/training data; no live AIS feed or demonstrated real-port forecasting accuracy.
- Single-terminal scope and advisory routing only.
- Approval is ephemeral; it does not persist plans or dispatch resources. No production authentication is implemented for this demo workspace.
- No public deployment; video access, genuine screenshots, and Bob exports remain to be confirmed/completed.
- Previous local checks: 84 frontend tests passed, frontend and MCP builds passed, frontend npm audit reported zero vulnerabilities. Backend/ML/end-to-end QA was interrupted; lint still reports existing findings. These are prior checks, not newly executed tests.

## What We're Most Proud Of

The complete decision-support loop: operational inputs become explainable forecasts and constraint-based assignment proposals that supervisors can inspect. Numerical optimization stays separate from language explanations and human review.

## Documentation and Submission

See [problem statement](docs/problem-statement.md), [solution overview](docs/solution-overview.md), [architecture](docs/architecture.md), [setup guide](docs/setup-guide.md), and [current guideline checklist](docs/submission-readiness.md). The existing validator is preserved. Metadata includes the guide's nested sections plus legacy fields for compatibility.

The repository records an organiser deadline of 15 September 2026 at 23:45, with timezone confirmation pending. This update on 16 September does not establish deadline acceptance or form submission. Git history is preserved; no submission form was sent by this review.
