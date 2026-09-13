# Edited Plan 1 - Hackathon Contract and Submission Baseline

## Assignment

- **Recommended model:** Claude Sonnet
- **Reasoning:** High
- **Purpose:** Merge the existing PortFlow architecture contract with the official IBM Bobathon submission requirements.
- **Allowed work:** Documentation and submission metadata only.
- **Do not implement application code in this plan.**

## Copy-Paste Prompt

```text
Act as the senior product architect and hackathon submission engineer for:

PortFlow AI - Container Congestion Predictor & Port Operations Optimiser

You are editing an existing repository. Do not start over, delete correct work,
or replace detailed documents with shorter generic versions.

Repository context:

- Current local workspace: F:\PortFlow-AI
- Required final public repository name: bob-ai-hackathon-portflow-ai
- Selected official problem: L1 - Container Congestion Predictor & Port
  Operations Optimiser
- Official track: AI
- The public GitHub repository must be created with "Use this template" from
  the official IBM Bobathon template. It must not be created as a fork.

Before editing, read all of these files completely:

- README.md
- submission.yaml
- docs/PROJECT_CONTEXT.md
- docs/API_CONTRACT.md
- docs/DATA_DICTIONARY.md
- docs/DEFINITION_OF_DONE.md
- docs/AI_WORKFLOW.md
- docs/AI_HANDOFF.md
- docs/problem-statement.md
- docs/solution-overview.md
- docs/architecture.md
- docs/setup-guide.md
- docs/submission-readiness.md
- docs/template-guide.md
- CONTRIBUTING.md
- .github/workflows/validate.yml
- bob_sessions/README.md

Also inspect the top-level repository tree. Treat the official validator as a
fixed contract: do not modify .github/workflows/validate.yml.

Task:

Audit and edit the documentation and submission metadata so the PortFlow
architecture and the official Bobathon submission specification form one
consistent contract.

Official problem alignment:

The solution must demonstrably support this end-to-end outcome:

1. Predict congestion hotspots using vessel schedules and berth capacity.
2. Predict or quantify vessel waiting time.
3. Recommend alternate routing strategies when they provide a positive net
   operational benefit.
4. Optimise berth and crane assignments jointly rather than separately.
5. Generate a 72-hour port operations plan for shift supervisors.
6. Explain model and solver outputs without allowing an LLM to invent numerical
   schedules or approve consequential actions.

Primary user:

- Port shift supervisor for one container terminal.
- The supervisor must be able to understand the cause of a risk, compare a
  baseline with an optimised proposal, and explicitly approve routing or plan
  changes.

Approved architecture:

Frontend:
- React
- Vite
- TypeScript
- Tailwind CSS
- React Router
- Recharts and Leaflet only when a real feature requires them

Backend:
- Python 3.12
- FastAPI
- Pydantic
- SQLAlchemy 2
- Alembic
- PostgreSQL

ML:
- Pandas
- NumPy
- scikit-learn
- optional XGBoost only if it measurably improves the evaluated baseline
- Joblib for small serialised models

Optimisation:
- Google OR-Tools CP-SAT

IBM Bob:
- IBM Bob IDE must be a core development tool, not just mentioned in the README.
- Relevant Bob task histories and task-consumption screenshots must be exported
  into bob_sessions/.
- A PortFlow MCP server may expose structured, safe, read-oriented tools to Bob
  for risk explanations and plan summaries.
- IBM Bob or another LLM must not calculate berth/crane assignments, fabricate
  predictions, confirm rerouting, or approve an operations plan.

Deployment target:
- Public GitHub repository
- PostgreSQL and FastAPI deployment suitable for Render or IBM Cloud
- React static deployment suitable for Render, Vercel, or IBM Cloud
- Do not claim deployment until a working public URL exists

Data policy:

- Use reproducible, seed-driven synthetic data when operational port data is
  unavailable.
- Clearly label synthetic records and document the generation assumptions.
- Do not use confidential data, client data, personal information, social-media
  data, or data without appropriate permission.
- Keep a source/provenance record for any public dataset used.

Repository submission contract:

The following top-level paths must exist and remain correctly named:

- submission.yaml
- README.md
- src/
- docs/problem-statement.md
- docs/solution-overview.md
- docs/architecture.md
- docs/setup-guide.md
- demo/demo-video-link.txt
- demo/live-demo-url.txt
- demo/screenshots/
- presentation/
- bob_sessions/
- CONTRIBUTING.md
- .github/workflows/validate.yml

All application code must live under src/. Existing detailed PortFlow contract
documents may remain under docs/ as additional documentation.

Required documentation work:

1. README.md
   - State the exact L1 problem and primary user.
   - Explain the prediction-to-action differentiator.
   - Include an honest current implementation status.
   - Include the repository structure and exact run commands.
   - Link demo, screenshots, presentation, and Bob evidence.
   - Do not contain official template placeholders.

2. submission.yaml
   - Keep track equal to AI.
   - Ensure every validator-required field is non-empty.
   - Use 3-5 concrete key features.
   - Do not describe an unfinished capability as implemented.
   - Preserve honest known limitations.
   - Do not invent team members, emails, video URLs, or deployment URLs.

3. docs/problem-statement.md
   - Identify the port shift supervisor and operational pain.
   - Explain why spreadsheets and prediction-only dashboards are insufficient.
   - Avoid unsupported numerical claims.
   - Define a testable success outcome.

4. docs/solution-overview.md
   - Explain the complete prediction -> optimisation -> human approval loop.
   - Distinguish ML, deterministic business logic, CP-SAT, and LLM/Bob roles.
   - Explain why the solution is differentiated from a basic risk dashboard.

5. docs/architecture.md
   - Include a valid Mermaid component/data-flow diagram.
   - Include a technology/responsibility table.
   - Explain the end-to-end data flow, security controls, reproducibility,
     synthetic-data policy, and MVP scalability.

6. docs/setup-guide.md
   - Assume all application code lives under src/.
   - Include prerequisites, environment variables, exact install/run/test
     commands, health verification, and troubleshooting.
   - Do not include a repository URL that does not exist; mark it as pending if
     the official public repository has not been created.

7. Existing contract documents
   - Preserve their detail.
   - Reconcile field names, endpoint names, UTC handling, risk thresholds, and
     human-approval rules.
   - Record any necessary contract change explicitly in docs/AI_HANDOFF.md.

8. docs/submission-readiness.md
   - Record current status using Complete, In progress, Not started, or Blocked.
   - Separate automated work from manual artifacts: team details, Bob exports,
     demo video, screenshots, slide deck, public URLs, and final form submission.
   - Record the organiser window: 15 September 2026, 12:00 PM-11:45 PM, with a
     note to confirm the organiser timezone.

9. bob_sessions/README.md
   - Explain that each relevant IBM Bob task needs both the exported Markdown
     history and the task-consumption-summary screenshot.
   - Include a credential-removal warning.
   - Never fabricate Bob session evidence.

Hard constraints:

- Documentation and metadata only; do not change source code.
- Do not modify the official validation workflow.
- Do not create fake URLs or screenshots.
- Do not insert secrets or real credentials.
- Do not invent team member details.
- Do not commit, push, rename a GitHub repository, or submit a form.
- Do not broaden the MVP with IoT, AIS live feeds, Kafka, Kubernetes,
  microservices, blockchain, Redis, Celery, Spark, Hadoop, or GraphQL.

Validation before finishing:

1. Confirm all required template paths exist.
2. Parse submission.yaml and confirm required fields are present.
3. Search README.md for official placeholder text.
4. Review all architecture documents for contradictions.
5. Verify all setup commands use the src/ layout.
6. Check for accidentally documented secrets or nonexistent links.
7. Run git diff --check.

Update docs/AI_HANDOFF.md with:

- completed work;
- changed files;
- validation performed;
- unresolved team/manual information;
- contract changes;
- exact next task.

Return a concise completion report and stop. Do not begin Plan 2.
```

## Expected Result

Plan 1 should update only documentation and submission metadata. It must not generate application code, fake artifacts, or external GitHub changes.

## Completion Checklist

- [ ] Exact L1 problem is consistently stated.
- [ ] Primary user and end-to-end demo outcome are defined.
- [ ] Official top-level template paths are documented.
- [ ] All code paths in the setup guide use `src/`.
- [ ] `submission.yaml` parses and required fields are non-empty.
- [ ] README has no official template placeholders.
- [ ] ML, optimiser, deterministic logic, and IBM Bob roles are distinct.
- [ ] Synthetic-data and prohibited-data policies are explicit.
- [ ] Human approval is required for routing and plans.
- [ ] Bob task-export requirements are explicit.
- [ ] Manual artifacts are not fabricated.
- [ ] Official validator is unchanged.
- [ ] `docs/AI_HANDOFF.md` is current.

## Suggested Commit After Human Review

```bash
git add README.md submission.yaml CONTRIBUTING.md docs bob_sessions
git commit -m "docs: align PortFlow with Bobathon submission contract"
```

Do not commit until team details and the diff have been reviewed by a human.



# Edited Plan 2 - Bobathon-Compliant Application Skeleton

## Assignment

- **Recommended model:** Gemini 3.7 Flash
- **Thinking level:** Medium
- **Tool:** Google Antigravity
- **Purpose:** Verify and repair the existing skeleton so it satisfies the official template and runs from `src/`.
- **Do not implement database models, ML, optimisation, routing, or a copilot in this plan.**

## Copy-Paste Prompt

```text
Act as a senior full-stack engineer and repository maintainer for PortFlow AI.

You are working in an existing repository. Plan 1 documentation and much of the
application skeleton may already exist. Inspect first, preserve correct work,
and change only what is missing, broken, duplicated, or inconsistent.

Repository context:

- Current local workspace: F:\PortFlow-AI
- Final required public repository name: bob-ai-hackathon-portflow-ai
- Official problem: L1 - Container Congestion Predictor & Port Operations
  Optimiser
- Official track: AI
- The official Bobathon template requires every application source file to live
  under src/.

Precondition:

Plan 1 must be complete. Before editing, read:

- README.md
- submission.yaml
- CONTRIBUTING.md
- .gitignore
- .python-version
- .github/workflows/validate.yml
- docs/PROJECT_CONTEXT.md
- docs/API_CONTRACT.md
- docs/DATA_DICTIONARY.md
- docs/DEFINITION_OF_DONE.md
- docs/AI_WORKFLOW.md
- docs/AI_HANDOFF.md
- docs/problem-statement.md
- docs/solution-overview.md
- docs/architecture.md
- docs/setup-guide.md
- docs/submission-readiness.md
- bob_sessions/README.md
- src/README.md

If these documents contain a major unresolved contradiction that changes the
code architecture, stop and report it. Do not invent a new contract.

Task:

Audit and repair the existing repository skeleton so it is small, executable,
secure, honest, and compliant with the official Bobathon layout.

Required top-level layout:

bob-ai-hackathon-portflow-ai/
|-- README.md
|-- submission.yaml
|-- CONTRIBUTING.md
|-- .gitignore
|-- .python-version
|-- .github/
|   `-- workflows/
|       `-- validate.yml
|-- docs/
|   |-- problem-statement.md
|   |-- solution-overview.md
|   |-- architecture.md
|   |-- setup-guide.md
|   `-- additional PortFlow contract documents
|-- src/
|   |-- .env.example
|   |-- README.md
|   |-- frontend/
|   |-- backend/
|   |-- database/
|   |-- ml/
|   |-- optimizer/
|   |-- mcp-server/
|   |-- data/
|   `-- tests/
|-- demo/
|   |-- README.md
|   |-- demo-video-link.txt
|   |-- live-demo-url.txt
|   `-- screenshots/
|-- presentation/
`-- bob_sessions/

Migration rule:

- If legacy application folders such as frontend/, backend/, database/, ml/,
  optimizer/, mcp-server/, data/, or tests/ exist at the repository root,
  compare them with src/<folder>/ before moving anything.
- Preserve the newest intentional source changes.
- Never overwrite one divergent copy without reporting the difference.
- Generated node_modules/, dist/, .venv/, caches, and logs must remain ignored
  and must not be copied into src/ as source code.
- Do not delete user work. If duplicate source trees differ materially, stop and
  report the exact paths.

Approved stack for this plan:

Frontend:
- React
- Vite
- TypeScript
- Tailwind CSS
- React Router

Backend:
- Python 3.12
- FastAPI
- Pydantic
- pydantic-settings
- SQLAlchemy 2 packages may be declared but no models are implemented
- PostgreSQL configuration may be declared but no connection is required
- Uvicorn

Project constraints:

- Modular monolith
- No IoT or hardware
- No live AIS integration
- No Kafka, Kubernetes, microservices, blockchain, Redis, Celery, GraphQL,
  Spark, or Hadoop
- No fake predictions, optimiser assignments, vessel positions, alerts, KPIs,
  cost savings, or demo URLs
- Do not modify the architecture contracts unless a blocking implementation
  mismatch is documented first
- Do not modify .github/workflows/validate.yml

Backend requirements:

Location: src/backend/

1. Preserve or create a functioning FastAPI application.
2. Use /api/v1 as the API prefix.
3. Implement only this real endpoint:

   GET /api/v1/health

4. Exact response:

   {
     "status": "healthy",
     "service": "portflow-api",
     "version": "0.1.0"
   }

5. Configure settings with pydantic-settings.
6. Read DATABASE_URL and CORS_ORIGINS from environment variables.
7. Configure CORS from settings.
8. Add a consistent API error envelope and global error handling.
9. Do not connect to PostgreSQL in this plan.
10. Do not call Base.metadata.create_all.
11. Do not create placeholder feature endpoints that return invented values.
12. Empty future modules may contain README files or explicit TODO comments.

Backend package set should remain minimal:

- fastapi
- uvicorn[standard]
- pydantic
- pydantic-settings
- sqlalchemy
- psycopg[binary]
- alembic
- pytest
- httpx

Backend commands must work from src/:

   python -m uvicorn backend.app.main:app --reload --port 8000
   python -m pytest backend/tests -q

Frontend requirements:

Location: src/frontend/

1. Preserve or create a React + Vite + TypeScript application.
2. Configure Tailwind CSS and React Router.
3. Provide these routes:

   /
   /vessels
   /map
   /predictions
   /optimizer
   /operations-plan
   /copilot

4. Build a compact maritime operations shell containing:

   - PortFlow AI product name;
   - responsive sidebar or top navigation;
   - active-route indication;
   - page title;
   - API health state;
   - honest "Demo data not loaded" empty states.

5. Use a navy and teal operational visual direction.
6. Do not create a marketing landing page.
7. Do not add fake KPI cards, charts, vessel markers, predictions, assignments,
   or cost savings.
8. Do not add Recharts, Leaflet, Axios, or a state library until a later real
   feature needs them.
9. Use maintained dependency versions compatible with the installed Node.js
   version and ensure npm audit has no unresolved high-severity issue.

Frontend commands must work from src/frontend/:

   npm install
   npm run build
   npm run dev

Environment requirements:

Create or preserve:

- src/.env.example as an index only;
- src/backend/.env.example for backend variables;
- src/frontend/.env.example for frontend variables.

Backend example variables:

APP_NAME=PortFlow AI API
APP_ENV=development
API_V1_PREFIX=/api/v1
DATABASE_URL=postgresql+psycopg://portflow:portflow@localhost:5432/portflow
CORS_ORIGINS=["http://localhost:5173"]
LOG_LEVEL=INFO

Frontend example variables:

VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_DEFAULT_PORT_ID=

Do not create real .env files for submission. Never insert production secrets,
IBM Cloud credentials, API keys, or personal tokens.

Root safeguards:

1. .python-version must contain 3.12.
2. .gitignore must exclude at least:

   - .env and environment variants;
   - node_modules/;
   - dist/;
   - .venv/;
   - __pycache__/;
   - .pytest_cache/;
   - generated ML artifacts;
   - generated raw/processed data while preserving intentional .gitkeep files;
   - local databases;
   - logs;
   - any legacy root frontend dependency cache.

3. Do not ignore src/ or required demo/presentation/Bob evidence directories.
4. README and docs/setup-guide.md must use the actual src/ commands.

Official submission safeguards:

- Preserve the official validator unchanged.
- Preserve submission.yaml and all required top-level template files.
- Keep the real demo-video placeholder until a human supplies a genuine public
  video URL; do not game the validator with "pending" or a fake URL.
- Use NOT DEPLOYED in demo/live-demo-url.txt until a real deployment exists.
- Do not create fake screenshots, a fake slide deck, or fake Bob exports.
- Do not commit, push, create/rename a GitHub repository, change visibility, or
  submit the organiser form in this plan.

Validation:

1. Inventory trackable files and confirm all application code is under src/.
2. Install or verify frontend dependencies.
3. Run npm audit and report exact findings.
4. Run npm run build and report the exact result.
5. Create/use a Python 3.12 virtual environment under src/.venv.
6. Install or verify backend dependencies.
7. Run pip check.
8. Run python -m pytest backend/tests -q from src/.
9. Start FastAPI temporarily and request /api/v1/health if safely possible.
10. Verify Python imports from src/.
11. Confirm no real .env or credential files are trackable.
12. Parse submission.yaml and confirm required fields are non-empty.
13. Confirm the only expected submission-validator blocker is the real manual
    artifact that has not yet been supplied, such as the demo video.
14. Run git diff --check and inspect git status for unrelated changes.

Do not implement:

- database ORM models or Alembic revisions;
- CRUD endpoints;
- authentication;
- CSV import;
- synthetic-data generator;
- ML features, training, inference, or artifacts;
- OR-Tools logic;
- alternate routing;
- operations-plan generation;
- IBM Bob MCP tools;
- charts or maps with invented data;
- deployment configuration.

After finishing, update:

- docs/AI_HANDOFF.md with changed files, commands, exact tests, known issues,
  contract changes, and recommended next task;
- docs/submission-readiness.md with the verified current state.

Return a concise completion report and stop. Do not begin Plan 3.
```

## Expected Result

The existing repository should remain recognisably the same project, but all trackable application code should be under `src/`, the FastAPI health endpoint should pass, the React shell should build, and the official submission structure should remain intact.

## Completion Checklist

- [ ] Plan 1 documents were read.
- [ ] Existing work was inspected before editing.
- [ ] Required top-level Bobathon paths exist.
- [ ] All trackable application code is under `src/`.
- [ ] No divergent source copy was overwritten silently.
- [ ] React uses TypeScript, Tailwind, and React Router.
- [ ] All seven placeholder routes render.
- [ ] Navigation is responsive and shows the active route.
- [ ] Empty states are honest; no operational results are fabricated.
- [ ] FastAPI imports and starts from `src/`.
- [ ] `/api/v1/health` returns the exact contract response.
- [ ] Backend health test passes on Python 3.12.
- [ ] Frontend production build passes.
- [ ] Dependency audit results are recorded.
- [ ] Environment examples exist and real `.env` files are ignored.
- [ ] Official validator is unchanged.
- [ ] Manual submission artifacts are not fabricated.
- [ ] `docs/AI_HANDOFF.md` and `docs/submission-readiness.md` are updated.

## Suggested Commit After Human Review

```bash
git add .
git commit -m "chore: align application skeleton with Bobathon template"
```

Do not commit generated dependencies, build output, virtual environments, caches, or real secrets. Do not begin Plan 3 until the backend test, frontend build, and repository-structure checks pass.



Plan 3 — Core Data Foundation and Demo Dataset
Assignment
	• Primary executor: IBM Bob, Agent mode
	• Optional reviewer: GPT-5.6 Luna, medium reasoning
	• Purpose: Build the minimum reliable PostgreSQL foundation and reproducible demo data.
	• Why IBM Bob: This is meaningful implementation work and creates genuine Bob development evidence.
	• Do not implement ML or OR-Tools in this plan.
Copy-paste prompt for IBM Bob
Act as a senior Python, SQLAlchemy and PostgreSQL engineer for:
PortFlow AI - Container Congestion Predictor & Port Operations Optimiser
You are editing an existing Bobathon repository.
Repository:
F:\PortFlow-AI
Official problem:
L1 - Container Congestion Predictor & Port Operations Optimiser
Official track:
AI
This project must remain compliant with the official IBM Bobathon
submission template.
Before editing, inspect the complete repository tree and read:
- README.md
- submission.yaml
- CONTRIBUTING.md
- .gitignore
- .python-version
- .github/workflows/validate.yml
- docs/PROJECT_CONTEXT.md
- docs/API_CONTRACT.md
- docs/DATA_DICTIONARY.md
- docs/DEFINITION_OF_DONE.md
- docs/AI_WORKFLOW.md
- docs/AI_HANDOFF.md
- docs/problem-statement.md
- docs/solution-overview.md
- docs/architecture.md
- docs/setup-guide.md
- docs/submission-readiness.md
- docs/plans/PLAN_01_HACKATHON_CONTRACTS.md
- docs/plans/PLAN_02_HACKATHON_SKELETON.md
- src/README.md
- src/.env.example
- src/backend/
- src/database/
- src/data/
- bob_sessions/README.md
Precondition:
Plan 1 and Plan 2 must already be complete.
Confirm:
1. All application source is under src/.
2. The frontend production build passes.
3. The FastAPI health test passes.
4. There are no materially different duplicate source trees outside src/.
5. The official validation workflow exists and remains unmodified.
If any precondition fails, stop and report the exact problem.
Do not rebuild the repository or invent a new architecture.
Task:
Implement the minimum PostgreSQL database foundation and deterministic
synthetic demo dataset needed for the PortFlow vertical slice.
Keep the work hackathon-sized.
Allowed paths:
- src/database/
- src/data/
- src/backend/app/dependencies.py
- src/backend/app/core/config.py
- src/backend/tests/
- src/.env.example
- docs/AI_HANDOFF.md
- docs/setup-guide.md
- docs/submission-readiness.md
- src/README.md
Do not modify unrelated frontend files.
Do not modify .github/workflows/validate.yml.
Do not change submission.yaml unless a verified contract error requires it.
Do not create URLs, screenshots, presentation files or Bob evidence.
Technology:
- Python 3.12
- PostgreSQL
- SQLAlchemy 2 typed mappings
- psycopg 3
- Alembic
- Pydantic settings
- pytest
Architecture:
- Modular monolith
- One PostgreSQL database
- Database access through a centralized SQLAlchemy session
- No Base.metadata.create_all during production startup
- Alembic owns schema migrations
- No IoT or hardware
- No Kafka, Kubernetes, microservices, Redis, Celery,
  blockchain, Spark, Hadoop or GraphQL
Implement these MVP tables:
1. ports
2. vessels
3. berths
4. cranes
5. vessel_schedules
6. historical_operations
Do not implement prediction, optimization, alert or plan-result tables yet
unless they already exist correctly from previous work.
Those result tables will be added when their real services are implemented.
Do not create unused tables merely to make the schema look complete.
Database conventions:
- UUID primary keys
- timezone-aware timestamps
- UTC internally
- SQLAlchemy 2 Mapped and mapped_column
- bidirectional relationships
- explicit foreign keys
- useful indexes
- readable string status values
- created_at and updated_at where appropriate
- no business logic inside ORM classes
- no credentials in source code
- no logging of DATABASE_URL
Required models:
ports:
- id
- code
- name
- country
- latitude
- longitude
- timezone
- max_yard_capacity_teu, nullable
- created_at
- updated_at
vessels:
- id
- imo_number
- name
- vessel_type
- capacity_teu
- length_m
- beam_m
- draft_m
- operator_name
- created_at
- updated_at
berths:
- id
- port_id
- code
- name
- max_length_m
- max_draft_m
- max_cranes
- status
- available_from
- available_until
- created_at
- updated_at
cranes:
- id
- port_id
- berth_id, nullable for movable cranes
- code
- moves_per_hour
- status
- available_from
- available_until
- created_at
- updated_at
vessel_schedules:
- id
- vessel_id
- port_id
- eta
- etd, nullable
- expected_containers
- cargo_type
- priority
- preferred_berth_id, nullable
- status
- source
- is_synthetic
- created_at
- updated_at
historical_operations:
- id
- schedule_id
- actual_arrival
- berth_start
- berth_end
- actual_departure
- assigned_berth_id
- cranes_used
- average_moves_per_hour
- waiting_minutes
- service_minutes
- delay_reason
- is_synthetic
- created_at
Required relationships:
- Port has many berths.
- Port has many cranes.
- Port has many schedules.
- Vessel has many schedules.
- Schedule may have one historical operation.
- Historical operation references its assigned berth.
- Schedule may reference a preferred berth.
- Crane may reference a home berth.
Required constraints:
- ports.code is unique.
- vessels.imo_number is unique.
- berth code is unique within a port.
- crane code is unique within a port.
- priority is between 1 and 5.
- risk-related fields are not required in this plan.
- waiting_minutes cannot be negative.
- service_minutes must be positive when present.
- moves_per_hour must be positive.
- crane counts cannot be negative.
- vessel and berth dimensions must be positive.
- actual departure cannot precede actual arrival when a practical
  database constraint can enforce it.
Required indexes:
- vessel_schedules(port_id, eta)
- vessel_schedules(vessel_id, eta)
- historical_operations(schedule_id)
- berths(port_id, status)
- cranes(port_id, status)
Database session:
Implement a centralized session module that:
- reads DATABASE_URL from settings;
- uses pool_pre_ping;
- returns a FastAPI-compatible session dependency;
- closes sessions reliably;
- does not expose credentials;
- supports local and Render PostgreSQL URLs.
Alembic:
1. Configure Alembic under src/database/.
2. Ensure all model metadata is imported.
3. Create one initial migration for the implemented tables.
4. Verify upgrade on a clean development or test database.
5. Verify downgrade when safe.
6. Document the exact migration commands from the repository structure.
Synthetic demo data:
Create a deterministic seed generator under:
src/data/
Requirements:
- fixed random seed;
- clearly mark every generated record as synthetic;
- create one fictional container terminal;
- create exactly three operational berths;
- create seven quay cranes;
- create at least twelve vessels;
- create at least thirty scheduled port calls;
- create sufficient historical operations for later ML development;
- include normal and congested periods;
- include draft compatibility differences;
- include variable container workloads;
- include variable crane productivity;
- include priority levels;
- include some waiting time caused by berth congestion.
Create these reproducible scenarios:
1. baseline
2. arrival_surge
3. crane_outage
4. berth_closure
5. handling_slowdown
Do not claim that scenarios are real port records.
Do not use real customer, employee, student or confidential information.
Do not use social-media data.
Use fictional vessel and port names.
Causal realism:
Synthetic data must preserve these relationships:
- more arrivals in the same window increase queue pressure;
- fewer compatible berths increase waiting;
- more container moves increase service duration;
- additional productive cranes may reduce service duration;
- crane outages and berth closures increase delay;
- no vessel may use a berth with insufficient draft or length capacity.
Do not generate independent random values that break these relationships.
Seed requirements:
- seed command must be safe to run more than once;
- avoid duplicate records;
- support an explicit reset only in a test/development environment;
- never reset a production database;
- print record counts, not credentials or sensitive configuration.
Testing:
Add focused tests for:
1. All six required tables exist in metadata.
2. Required foreign keys exist.
3. Required unique constraints exist.
4. Port-to-berth relationship works.
5. Port-to-crane relationship works.
6. Vessel-to-schedule relationship works.
7. Schedule-to-historical-operation relationship works.
8. Negative waiting time is rejected.
9. Invalid priority is rejected.
10. Duplicate port code is rejected.
11. Generated data is reproducible with the same seed.
12. Every generated vessel is compatible with its recorded berth.
13. Congested scenarios produce greater queue or waiting pressure
    than the baseline.
14. Seed operation is idempotent.
Test policy:
- Use PostgreSQL for at least one migration or integration test.
- If PostgreSQL is unavailable, skip only that integration test with
  an explicit reason.
- Do not silently claim a PostgreSQL test passed using SQLite.
- Never use a production database for tests.
Environment example:
Update src/.env.example without real secrets.
Include:
DATABASE_URL=postgresql+psycopg://portflow:change-me@localhost:5432/portflow
APP_ENV=development
SYNTHETIC_DATA_SEED=2026
Documentation:
Update docs/setup-guide.md and src/README.md with:
- PostgreSQL prerequisites;
- database creation steps;
- migration commands;
- seed command;
- database test command;
- synthetic-data disclosure;
- troubleshooting for connection failures.
Update docs/submission-readiness.md only for status that genuinely changed.
Do not mark ML, optimization, demo, screenshots, presentation,
deployment or final submission as complete.
IBM Bob evidence:
This task is being executed in IBM Bob and is meaningful project work.
At the end:
- remind the human to export this IBM Bob task history as Markdown;
- remind the human to capture the task-consumption-summary screenshot;
- recommend storing both under bob_sessions/;
- do not fabricate, generate or backfill Bob evidence yourself;
- do not include credentials in exported evidence.
Validation before finishing:
1. Run the existing backend health test.
2. Run database unit tests.
3. Run seed-generator tests.
4. Apply the migration to a clean test/development PostgreSQL
   database if one is available.
5. Run git diff --check.
6. Confirm .github/workflows/validate.yml is unchanged.
7. Confirm no .env file or credential is staged.
8. Confirm no application code was created outside src/.
9. Confirm no fake URLs or submission artifacts were added.
10. Confirm frontend build still passes only if database changes could
    reasonably affect shared configuration; otherwise do not waste time
    rebuilding an unchanged frontend.
Do not:
- implement REST CRUD;
- implement congestion ML;
- implement waiting-time ML;
- implement OR-Tools;
- implement routing;
- implement the copilot;
- change the frontend;
- create a public repository;
- commit or push;
- deploy;
- submit the hackathon form.
Update docs/AI_HANDOFF.md with:
- completed work;
- changed files;
- implemented tables;
- migration revision;
- synthetic dataset counts;
- commands executed;
- exact test results;
- skipped checks and reasons;
- known issues;
- contract changes;
- submission-readiness changes;
- exact recommended next task.
Return a concise completion report and stop.
Do not begin the next plan.
Expected output
src/
├── database/
│   ├── base.py
│   ├── session.py
│   ├── models/
│   ├── migrations/
│   ├── alembic.ini
│   └── README.md
├── data/
│   ├── generate_synthetic.py
│   ├── seed_database.py
│   ├── scenarios/
│   └── README.md
└── backend/
    └── tests/
        └── database/
Completion checklist
	• Existing repository inspected first
	• Application source remains under src/
	• Six MVP tables implemented
	• SQLAlchemy 2 typed mappings used
	• Initial Alembic migration works
	• No production create_all
	• Synthetic records are clearly labelled
	• Five reproducible scenarios exist
	• Data relationships are causally realistic
	• Seed command is idempotent
	• Database and seed tests pass
	• Backend health test still passes
	• Official validator is unchanged
	• No fake submission artifacts were created
	• No credentials were committed
	• AI_HANDOFF.md updated
	• submission-readiness.md remains honest
	• Human reminded to export IBM Bob evidence
Suggested commit after human review
git add src/database src/data src/backend/tests src/.env.example docs
git commit -m "feat: add reproducible PortFlow data foundation"



Plan 4 — First Real End-to-End Dashboard Slice
Primary executor: IBM Bob, Agent mode
Optional UI helper: Gemini 3.7 Flash, medium thinking
Purpose: Turn Plan 3’s seeded data into a working dashboard with a transparent, rule-based congestion baseline.
This is the first demonstrable journey:
Seeded port data → FastAPI summary → congestion baseline → React dashboard
No trained ML, OR-Tools, routing, or copilot yet.
Copy-paste prompt for IBM Bob
Act as a senior full-stack engineer for PortFlow AI.
Repository:
F:\PortFlow-AI
Official problem:
L1 - Container Congestion Predictor & Port Operations Optimiser
Before editing, inspect the repository tree and read:
- README.md
- submission.yaml
- CONTRIBUTING.md
- .github/workflows/validate.yml
- docs/PROJECT_CONTEXT.md
- docs/API_CONTRACT.md
- docs/DATA_DICTIONARY.md
- docs/DEFINITION_OF_DONE.md
- docs/AI_WORKFLOW.md
- docs/AI_HANDOFF.md
- docs/submission-readiness.md
- docs/plans/
- src/README.md
- src/backend/
- src/frontend/
- src/database/
- src/data/
- bob_sessions/README.md
Preconditions:
1. Plan 3 is complete.
2. Database migrations work.
3. Synthetic seed data exists.
4. Backend health test passes.
5. Frontend production build passes.
6. All application code remains under src/.
If any precondition fails, stop and report the exact issue.
Do not rebuild correct work.
Task:
Implement the smallest honest end-to-end PortFlow dashboard slice.
The dashboard must use real seeded PostgreSQL records.
It must not display invented KPI values or fake ML predictions.
Allowed paths:
- src/backend/app/api/
- src/backend/app/schemas/
- src/backend/app/services/
- src/backend/app/dependencies.py
- src/backend/tests/
- src/frontend/
- src/tests/
- docs/AI_HANDOFF.md
- docs/submission-readiness.md
- docs/setup-guide.md
- src/README.md
Do not modify:
- .github/workflows/validate.yml
- submission.yaml unless a verified contract issue requires it
- database schema unless a blocking defect is found
- demo URLs, screenshots, presentation, or Bob evidence files
Architecture rules:
- React communicates only with FastAPI.
- React must not calculate congestion risk itself.
- FastAPI reads PostgreSQL records.
- The temporary prediction method must be explicitly labeled:
  baseline_rule_v1.
- Do not describe it as machine learning.
- Do not implement trained ML, OR-Tools, alternate routing,
  authentication, IBM Bob MCP tools, or deployment in this plan.
- Do not add Kafka, Kubernetes, microservices, Redis, Celery,
  GraphQL, blockchain, Spark, Hadoop, IoT, or hardware.
Backend work:
Implement only these APIs under /api/v1:
1. GET /dashboard/summary
2. GET /dashboard/congestion
3. GET /schedules
4. GET /resources/berths
5. GET /resources/cranes
6. GET /scenarios
Required parameters:
- port_code
- horizon_hours, default 72 where applicable
- scenario, default baseline where applicable
Scenario options:
- baseline
- arrival_surge
- crane_outage
- berth_closure
- handling_slowdown
Scenario policy:
- Scenarios are deterministic views derived from synthetic data.
- Do not overwrite database records when a scenario is selected.
- Clearly include `is_synthetic: true`.
- Include `calculation_method: "baseline_rule_v1"` where prediction-like
  output appears.
Baseline congestion calculation:
Use a transparent six-hour bucket calculation over the requested horizon.
Inputs may include:
- scheduled arrivals in the bucket;
- compatible available berths;
- berth occupancy estimate;
- available crane count;
- expected container workload;
- selected synthetic scenario.
Output:
- risk_probability from 0 to 1;
- risk_level: low, medium, high, or critical;
- estimated queue count;
- affected schedule IDs;
- top rule drivers.
Document the formula in code and setup documentation.
The calculation must be deterministic.
It must never claim statistical accuracy or trained-model confidence.
Dashboard summary response must include:
- port identity;
- active/upcoming vessel count;
- arrivals in next 24 hours;
- berth occupancy percentage;
- available crane count;
- peak congestion risk;
- average baseline estimated waiting time;
- critical vessel count;
- selected scenario;
- is_synthetic;
- calculation_method.
The congestion response must include:
- 72-hour horizon;
- six-hour windows;
- probability;
- risk level;
- estimated queue;
- affected vessels;
- rule drivers;
- selected scenario;
- is_synthetic;
- calculation_method.
Schedules response must include:
- vessel name;
- ETA;
- expected containers;
- priority;
- preferred berth;
- status;
- compatibility status when practical.
Resource APIs must expose only data needed by the dashboard.
Do not create full administrative CRUD in this plan.
Frontend work:
Use the existing React, TypeScript and Tailwind application.
Install Recharts only if it is not already available and needed for
the working congestion chart.
Implement the Dashboard page first.
Required dashboard elements:
1. Operational header:
   - PortFlow AI
   - selected port
   - 72-hour horizon
   - synthetic-data label
2. Real KPI cards:
   - upcoming vessels
   - berth occupancy
   - available cranes
   - peak risk
   - estimated average waiting time
3. Congestion chart:
   - six-hour windows;
   - risk probability;
   - risk-level labeling;
   - selected scenario visible;
   - clear baseline-rule label.
4. Scenario selector:
   - baseline;
   - arrival surge;
   - crane outage;
   - berth closure;
   - handling slowdown.
5. Affected-vessels table:
   - vessel;
   - ETA;
   - priority;
   - compatible berth count if available;
   - baseline estimated impact.
6. Berth-status panel:
   - berth code;
   - availability;
   - draft capacity;
   - occupancy status.
7. Honest state labels:
   - “Synthetic demo data”
   - “Baseline rule — ML model pending”
   - “Optimization pending”

Required UX states:
- loading;
- backend unavailable;
- empty seeded data;
- invalid scenario;
- API validation error.
Do not add:
- a marketing landing page;
- fake map vessel positions;
- fake optimization improvements;
- fake route recommendations;
- fake AI answers;
- a “live AIS” label;
- any manual values that bypass the backend API.

API client requirements:
- typed request and response types;
- one central base URL configuration;
- no duplicated API schemas;
- no business calculations in React;
- clear handling of non-200 API responses.
Testing:
Backend tests must cover:
1. dashboard summary with seeded data;
2. congestion horizon returns six-hour buckets;
3. risk probability stays between 0 and 1;
4. invalid scenario returns the standard error envelope;
5. scenario does not modify persisted source records;
6. schedule list filters by port and date range;
7. no data returns an honest empty response.
Frontend tests must cover:
1. loading state;
2. backend error state;
3. synthetic-data label;
4. scenario selection sends the correct API query;
5. dashboard renders API KPI values;
6. chart receives real API-derived series data.
Validation before finishing:
1. Run the database migration and seed command.
2. Run backend tests.
3. Run frontend tests.
4. Run frontend production build.
5. Start the backend and verify:
   /api/v1/health
   /api/v1/dashboard/summary
   /api/v1/dashboard/congestion
6. Verify the React dashboard loads data from FastAPI.
7. Confirm that no fake ML or optimizer claims appear in UI text.
8. Confirm that .github/workflows/validate.yml is unchanged.
9. Run git diff --check.
10. Confirm no .env file or credentials are staged.
Documentation:
Update:
- docs/AI_HANDOFF.md
- docs/submission-readiness.md
- docs/setup-guide.md
- src/README.md
Record:
- baseline_rule_v1 limitations;
- synthetic-data disclosure;
- exact local run commands;
- completed APIs;
- completed dashboard behavior;
- known gaps:
  trained ML, OR-Tools, alternate routing, copilot,
  screenshots, video, presentation, deployment.
IBM Bob evidence:
This is meaningful IBM Bob development work.
At the end, remind the human to:
1. Export this IBM Bob task history as Markdown.
2. Capture the IBM Bob task-consumption summary screenshot.
3. Remove secrets from exports.
4. Save both files under bob_sessions/.
Do not fabricate these artifacts.
Do not:
- commit;
- push;
- create a public repository;
- deploy;
- submit the form;
- start Plan 5.
Update docs/AI_HANDOFF.md and stop.
Completion checklist
	• APIs use seeded PostgreSQL data
	• Dashboard gets all data from FastAPI
	• Congestion is clearly labelled baseline_rule_v1
	• Synthetic data is disclosed
	• No ML claim is made
	• No optimization claim is made
	• Five scenarios work without mutating source data
	• Scenario changes affect dashboard output
	• Backend tests pass
	• Frontend tests pass
	• Frontend production build passes
	• Official validator remains unchanged
	• AI_HANDOFF.md and submission readiness are updated
	• IBM Bob evidence is exported manually after completion
Suggested commit after review:
git add src docs
git commit -m "feat: add seeded congestion dashboard slice"
The next plan will add the real ML training pipeline, replacing baseline_rule_v1 without changing the dashboard contract.



Use this smaller Plan 5. It builds only the congestion ML pipeline; API and dashboard integration move to Plan 6. That keeps the task focused and saves tokens.
Plan 5 — Lean Congestion ML Pipeline
Executor: IBM Bob Agent Mode
Recommended model: Claude Sonnet high reasoning, if selectable
Do not use Flash for this step.
Copy-paste prompt
Implement only the PortFlow congestion ML pipeline.
Repository: F:\PortFlow-AI
Read only these files first:
- docs/AI_HANDOFF.md
- docs/PROJECT_CONTEXT.md
- docs/DATA_DICTIONARY.md
- src/data/
- src/ml/
- src/database/
- src/backend/app/services/ if it contains the existing baseline rule
Preconditions:
- Seeded synthetic data exists.
- Plan 4 baseline congestion calculation exists.
- All source code is under src/.
If a precondition fails, report it and stop. Do not inspect or rewrite
unrelated files.
Goal:
Train a synthetic-data congestion classifier for six-hour port windows.
Allowed changes only:
- src/ml/
- src/ml/tests/
- src/ml/artifacts/.gitkeep
- docs/AI_HANDOFF.md
- docs/submission-readiness.md
- src/README.md only if training instructions are absent
Do not change:
- frontend
- FastAPI routes
- database schema
- Alembic migrations
- API contracts
- optimizer
- routing
- copilot
- validator workflow
- submission files
- demo or presentation files
Implement only these files if absent:
src/ml/
├── congestion_dataset.py
├── congestion_features.py
├── congestion_train.py
├── congestion_predict.py
├── congestion_evaluate.py
├── README.md
├── artifacts/.gitkeep
└── tests/test_congestion_pipeline.py

Requirements:
1. Use only reproducible synthetic PortFlow data.
2. Create one row per port per six-hour historical window.
3. Use only data available before the prediction window.
4. Never use actual future waiting time, berth start, berth end,
   departure time, future crane allocation, or optimizer output
   as model features.
5. Use congestion labels already defined in project documentation.
   If missing, stop and report the missing definition.
6. Use chronological train/validation/test splits.
7. Keep the existing baseline rule unchanged for later comparison.
8. Use only Scikit-learn:
   - Pipeline
   - SimpleImputer
   - OneHotEncoder if needed
   - RandomForestClassifier
9. Do not add XGBoost, neural networks, notebooks, hyperparameter
   search, charts, or new dependencies.
10. Save:
    - complete pipeline as joblib;
    - metadata.json with model version, feature names,
      train/test time range, metrics and `data_source: synthetic`.
11. Do not commit model binaries automatically.
12. Provide deterministic commands:
python -m ml.congestion_train
    python -m ml.congestion_evaluate
13. Evaluation must report:
    - macro F1;
    - HIGH/CRITICAL recall;
    - confusion matrix;
    - baseline comparison.
14. Do not claim real-world accuracy.
15. All output must explicitly state synthetic-data limitations.
Tests required:
- dataset builder is deterministic;
- feature columns are stable;
- forbidden leakage columns are rejected;
- chronological splits do not overlap;
- saved pipeline reloads;
- probabilities are between 0 and 1;
- predicted labels are valid.
Before finishing:
- run training once;
- run evaluation once;
- run ML tests;
- verify model metadata;
- run git diff --check;
- confirm no model binary or .env file is staged.
Update docs/AI_HANDOFF.md briefly with:
- files changed;
- training command;
- evaluation result;
- known limitation;
- next task: API integration for congestion ML.
This work is done in IBM Bob:
remind me to export the Bob task history and task-consumption screenshot
to bob_sessions/ after completion.
Final response:
maximum 120 words.
Include only changed files, test result, metrics summary, and blockers.
Stop after Plan 5.
Why this is efficient
	• One model only: RandomForestClassifier
	• No API changes
	• No React changes
	• No XGBoost
	• No optimizer work
	• No database migration
	• No large documentation rewrite
	• No hyperparameter tuning
	• Final response limited to 120 words
Plan 5 success criteria
	• Synthetic six-hour training dataset exists
	• No feature leakage
	• Chronological split used
	• Model and metadata are generated
	• Tests pass
	• Baseline remains unchanged
	• No UI or API files changed
	• IBM Bob task evidence is exported manually
Plan 6 will be a small integration task: load this model in FastAPI and add mode=ml to the existing congestion endpoint.





Plan 6 — Connect ML Predictions to API + Dashboard
Use this after Plan 5 passes training, evaluation, and tests.
	• Executor: IBM Bob Agent Mode 
	• Recommended model: GPT-5.6 Luna (medium reasoning; use high only for debugging)
	• Goal: expose the trained synthetic congestion model through the existing FastAPI contract and let the dashboard switch between baseline and ML predictions.
Copy this prompt into IBM Bob:
Work in F:\PortFlow-AI.
Goal: integrate the completed Plan 5 congestion ML model into the existing FastAPI API and dashboard. Keep this a small vertical slice.
Read only what is needed:
- docs/AI_HANDOFF.md
- docs/API_CONTRACT.md
- src/ml/README.md
- src/ml/congestion_predict.py
- src/backend/ relevant API, schema, service, and startup files
- src/frontend/ relevant API client and dashboard files
Preconditions:
1. Plan 5 training, evaluation, and ML tests pass.
2. A trained local model artifact can be generated.
3. The existing dashboard baseline congestion flow works.
If any precondition fails, do not build a workaround. Report the exact blocker.
Bobathon rules:
- Keep all application source inside src/.
- Do not edit .github/workflows/validate.yml.
- Do not create fake screenshots, video links, deployment URLs, or IBM Bob evidence.
- Do not commit, push, deploy, or create a GitHub repository.
- Record actual IBM Bob work manually in bob_sessions/ after this task.
Allowed changes only:
- src/backend/
- src/frontend/
- src/ml/ only if a small import/configuration fix is essential
- docs/AI_HANDOFF.md
- docs/submission-readiness.md
- src/README.md only if runtime instructions are missing
Do not change database schema, migrations, authentication, optimizer, routing, waiting-time model, AI Copilot, or create new pages.
Implementation:
1. Use the existing congestion API route and contract. Do not create a duplicate endpoint.
2. Add a mode parameter exactly as the contract permits:
   - baseline = existing baseline_rule_v1
   - ml = trained synthetic ML model
3. Load the ML artifact once during FastAPI startup/lifespan. Never retrain in an API request.
4. Configure artifact location through ML_ARTIFACT_DIR with a safe local default.
5. For ML results return:
   - congestion level
   - probability/confidence
   - method: ml_model_v1
   - model version
   - data_source: synthetic
   - a short limitations field
6. Preserve baseline behavior and label it method: baseline_rule_v1.
7. If the ML artifact is unavailable or invalid, return HTTP 503 using the project’s standard error envelope:
   code = MODEL_ARTIFACT_UNAVAILABLE
   Do not silently fall back to baseline.
8. In the existing dashboard, add a compact Baseline / ML selector.
   - Call the existing API with the selected mode.
   - Clearly label ML output as “Trained on synthetic data”.
   - Show API errors visibly.
   - Do not redesign the dashboard or add a new page.
9. Add focused tests:
   - baseline request succeeds
   - ML request succeeds when artifact exists
   - missing artifact returns 503 with the expected error code
   - frontend sends selected mode and displays method/data-source label
10. Update AI_HANDOFF.md with Plan 6 status, run commands, changed API behavior, and known limitation.
11. Update submission-readiness.md truthfully.

Run before finishing:
- Plan 5 training command
- backend tests
- frontend tests if configured
- frontend production build
- git diff --check
Confirm no .env, generated model binary, fabricated artifact, or secret is staged.
Final response: maximum 120 words. Include files changed, commands passed, exact blocker if any, and the manual Bob evidence reminder.
Success means the judge can switch from a transparent rule-based baseline to a real, clearly labeled synthetic ML prediction—without hiding failures or overclaiming accuracy.



Plan 8 — Optimizer API + 72-Hour Operations Board
Use this only after Plan 7 tests pass.
	• Executor: IBM Bob Agent Mode
	• Recommended model: GPT-5.6 Luna (medium reasoning)
	• Goal: expose the tested optimizer through FastAPI and show a usable 72-hour berth/crane plan in the existing dashboard.
Work in F:\PortFlow-AI.
Goal: connect the completed Plan 7 optimizer to the existing FastAPI API and dashboard. Build one clear 72-hour operations-board experience; do not redesign the app.
Read only what is needed:
- docs/AI_HANDOFF.md
- docs/API_CONTRACT.md
- src/optimizer/README.md
- src/optimizer/berth_crane_optimizer.py
- src/backend/ relevant routes, schemas, services
- src/frontend/ relevant API client, dashboard, styles/components
Preconditions:
- Plan 7 optimizer tests pass.
- Seeded vessels, schedules, berths, and cranes exist.
- Existing API error format is documented.
If any prerequisite fails, report it and stop. Do not add schema migrations or fake data workarounds.
Bobathon rules:
- Keep all application source in src/.
- Do not modify .github/workflows/validate.yml.
- No fabricated screenshots, demo URLs, video URLs, deployment claims, or Bob evidence.
- Do not commit, push, deploy, or create a repository.
- Manually save genuine IBM Bob evidence in bob_sessions/ after completion.
Allowed changes:
- src/backend/
- src/frontend/
- src/optimizer/ only for a small integration adapter
- docs/AI_HANDOFF.md
- docs/submission-readiness.md
- src/README.md only when run instructions are absent
Do not change ML training, database schema/migrations, authentication, alternate routing, AI Copilot, or deployment.
Implementation:
1. Use the existing API contract. If an optimizer route already exists, complete it; otherwise add:
   POST /api/v1/operations/optimize
2. Request:
   {
     "port_id": 1,
     "horizon_hours": 72,
     "scenario": "demo"
   }
   Validate horizon_hours: 24–168.
3. API service loads existing DB/seed records, maps them to optimizer input, and runs the optimizer once per request.
4. Response includes:
   - generated_at, horizon start/end, solver_status
   - assignments: vessel, berth, start, end, crane_count, waiting_hours
   - unscheduled vessels with reason
   - before/after wait metrics
   - berth and crane utilization
   - assumptions and limitations
5. Do not persist optimization output unless an existing compatible table/service already supports it. No migrations.
6. Return standard errors for invalid input, missing port data, and solver failure. Never return fake assignments.
7. In the existing dashboard, add a compact “Generate 72-hour plan” action.
8. Render:
   - metric cards: wait reduction, scheduled vessels, unscheduled vessels, berth utilization
   - berth timeline: rows = berths; blocks = vessel assignments
   - readable crane count on each block
   - exceptions list for unscheduled vessels
   - plain disclaimer: “Demo optimization using synthetic/seeded data.”
9. Keep the UI simple: no drag-and-drop, no map changes, no new route/page unless current structure requires it.
10. Add focused backend and frontend tests:
    - valid request returns assignments/metrics
    - invalid horizon rejected
    - no data has useful error
    - UI renders loading, success, and error states
    - frontend production build passes

Run:
- optimizer tests
- backend tests
- frontend tests if configured
- frontend production build
- git diff --check
Update AI_HANDOFF.md and submission-readiness.md truthfully.
Final response: maximum 120 words with files changed, checks passed, and the manual Bob evidence reminder.
The live demo now has a strong moment: congestion appears, then a single click generates a visually understandable 72-hour recovery plan.




Plan 9 — Vessel Waiting-Time ML Model
Use after Plans 5–8. This adds the second prediction engine: estimated waiting hours for each vessel.
	• Executor: IBM Bob Agent Mode
	• Recommended model: Claude Sonnet (high reasoning)
	• Goal: train and test a small regression model; API/dashboard connection comes later.
Work in F:\PortFlow-AI.
Goal: add a leak-safe vessel waiting-time regression pipeline using existing synthetic historical operations data.
Read only:
- docs/AI_HANDOFF.md
- docs/DATA_DICTIONARY.md
- src/ml/
- src/data/
- src/database/ relevant schedule/operation models
- existing baseline wait-time logic, if present
Preconditions:
- Historical/seed data has actual waiting time, or has arrival and actual berth-start timestamps from which it can be truthfully derived.
- Timestamps are timezone-consistent.
If the target cannot be derived, stop and report the missing field. Do not invent labels or alter the database schema.
Bobathon rules:
- Keep source inside src/.
- Do not edit .github/workflows/validate.yml.
- No fake demo, deployment, screenshots, or IBM Bob evidence.
- Do not commit, push, deploy, or add a migration.
- Save actual Bob work manually in bob_sessions/ afterward.
Allowed changes only:
- src/ml/
- src/ml/tests/
- src/ml/artifacts/.gitkeep
- docs/AI_HANDOFF.md
- docs/submission-readiness.md
- src/README.md only if commands are missing
Do not modify API routes, frontend, optimizer, congestion model behavior, database schema, routing, Copilot, or authentication.
Create only if absent:
src/ml/
  waiting_dataset.py
  waiting_features.py
  waiting_train.py
  waiting_predict.py
  waiting_evaluate.py
  tests/test_waiting_pipeline.py
Implementation:
1. One row per vessel arrival.
2. Target: actual_waiting_hours = actual_berth_start - arrival_time.
3. Use only information available at arrival:
   vessel size/type/cargo class, ETA hour/day, queue length at arrival,
   berth occupancy, compatible berth count, available cranes, weather/season field if already present.
4. Explicitly exclude actual berth start/end, departure, future schedules, optimizer output, and target-derived fields.
5. Use chronological train/test split.
6. Scikit-learn only:
   Pipeline + SimpleImputer + OneHotEncoder + RandomForestRegressor.
   No XGBoost, neural networks, notebooks, tuning sweeps, or new dependencies.
7. Save artifact with joblib plus metadata JSON:
   model version, features, train dates, metrics, synthetic data source, limitations.
8. Include a simple baseline: queue-based or historical-median estimate.
9. Evaluate MAE, RMSE, R², and baseline comparison. Do not claim real-port accuracy.
10. Prediction output:
   predicted_waiting_hours, confidence/uncertainty note, method, model_version, data_source=synthetic.
11. Tests:
   - target derivation is correct
   - leakage columns rejected
   - chronological split has no overlap
   - prediction is non-negative
   - artifact reload works
   - model beats or matches baseline on deterministic synthetic fixture
Run:
- python -m ml.waiting_train
- python -m ml.waiting_evaluate
- relevant ML tests
- git diff --check
Ensure generated model binaries and secrets are not staged.
Update AI_HANDOFF.md and submission-readiness.md truthfully.
Final response: maximum 120 words with changed files, checks passed, limitation, and Bob evidence reminder.
This gives PortFlow AI both “how congested?” and “how long will this vessel wait?”—a much stronger judging story.




Plan 10 — Waiting-Time API + Affected Vessel View
Use after Plan 9 passes training and tests.
	• Executor: IBM Bob Agent Mode
	• Recommended model: GPT-5.6 Luna (medium reasoning)
	• Goal: show predicted waiting time per vessel in the existing dashboard—without adding extra pages.
Work in F:\PortFlow-AI.
Goal: connect the Plan 9 waiting-time model to FastAPI and display affected vessels in the existing dashboard.
Read only:
- docs/AI_HANDOFF.md
- docs/API_CONTRACT.md
- src/ml/waiting_predict.py
- src/ml/README.md
- src/backend/ relevant routes, services, schemas, startup files
- src/frontend/ relevant API client and dashboard components
Preconditions:
- Plan 9 training/evaluation/tests pass.
- A trained waiting-time artifact can be generated locally.
- Existing vessel schedule data is available.
If not, report the blocker. Do not change schema or invent data.
Bobathon rules:
- All source remains under src/.
- Do not edit .github/workflows/validate.yml.
- Do not fabricate demo assets, URLs, screenshots, deployment, or Bob evidence.
- Do not commit, push, deploy, or create migrations.
- Save genuine Bob session evidence manually in bob_sessions/ afterward.
Allowed changes:
- src/backend/
- src/frontend/
- src/ml/ only for essential adapter/config fixes
- docs/AI_HANDOFF.md
- docs/submission-readiness.md
Do not modify optimizer behavior, congestion model training, routing, AI Copilot, authentication, database schema, or add a new page.
Implementation:
1. Follow the existing API contract. Complete an existing waiting-time route, or add:
   GET /api/v1/vessels/{vessel_id}/waiting-time
   GET /api/v1/waiting-times?port_id={id}&horizon_hours=72
2. Support mode=baseline|ml when the contract allows.
3. Load the trained artifact once at FastAPI startup; never train during requests.
4. For ML output return:
   vessel_id, vessel_name, predicted_waiting_hours,
   risk_level, method, model_version,
   data_source="synthetic", limitations.
5. Risk levels:
   LOW < 6h, MEDIUM 6–12h, HIGH > 12h,
   unless existing project documentation defines different thresholds.
6. Missing/invalid artifact must return HTTP 503 with:
   code = MODEL_ARTIFACT_UNAVAILABLE
   Never silently use baseline.
7. Dashboard additions only:
   - “Affected vessels” table/card in the existing dashboard
   - vessel name, ETA, predicted wait, risk badge, primary cause if available
   - sort highest waiting time first
   - baseline/ML selector consistent with congestion view
   - clear “Synthetic training data” label and visible error state
8. Keep UI compact. No vessel-detail page, map work, or design rewrite.
9. Tests:
   - baseline and ML API success paths
   - missing artifact returns expected 503 envelope
   - invalid vessel/port returns standard error
   - UI sorting, mode request, loading, and API error state
   - production build passes

Run:
- Plan 9 training command
- backend tests
- frontend tests if configured
- frontend production build
- git diff --check
Update AI_HANDOFF.md and submission-readiness.md truthfully.
Final response: maximum 120 words with files changed, checks passed, blocker if any, and Bob evidence reminder.
After this plan, your demo can identify exactly which vessels are at risk—not just that the port is congested.



Plan 11 — Alternate-Routing Recommender
Use after waiting-time prediction and optimizer are working.
	• Executor: IBM Bob Agent Mode
	• Recommended model: GPT-5.6 Luna (medium reasoning)
	• Goal: recommend another seeded port only when its estimated total arrival-to-service time is meaningfully better.
Work in F:\PortFlow-AI.
Goal: add a transparent, rule-based alternate-routing recommendation feature. Use existing seeded ports and schedules only; do not call external shipping, map, or routing APIs.
Read only:
- docs/AI_HANDOFF.md
- docs/DATA_DICTIONARY.md
- docs/API_CONTRACT.md
- src/backend/ relevant services/routes/schemas
- src/database/ relevant port/schedule models
- src/ml/waiting_predict.py
- src/optimizer/ relevant result types
- src/frontend/ existing dashboard files
Preconditions:
- At least two seeded ports exist with usable location/transfer-time data.
- Predicted wait time can be obtained for the current port and candidate ports.
- A documented diversion threshold exists; otherwise use 12 hours and record it as a demo assumption.
If these are unavailable, report the exact missing data. Do not change the database schema.
Bobathon rules:
- Source stays in src/.
- Do not edit .github/workflows/validate.yml.
- No fabricated external route data, live shipping claims, screenshots, video, deployment, or Bob evidence.
- Do not commit, push, deploy, or add migrations.
- Save genuine Bob evidence manually in bob_sessions/ after the task.
Allowed changes:
- src/backend/
- src/frontend/
- docs/AI_HANDOFF.md
- docs/submission-readiness.md
Do not modify ML training, optimizer logic, authentication, AI Copilot, schema/migrations, or add new pages.
Implement:
1. Follow API_CONTRACT.md. Complete an existing route or add:
   GET /api/v1/vessels/{vessel_id}/alternate-routing
2. For each compatible candidate port, calculate:
   estimated_total_hours =
   diversion_transit_hours + candidate_predicted_wait_hours + estimated_handling_hours
3. Compare with current-port predicted total hours.
4. Recommend an alternate only when improvement >= diversion threshold.
5. Return:
   - current-port estimate
   - ranked alternatives
   - recommended boolean
   - estimated time saved
   - explainable factors: congestion/wait, transit tradeoff, berth/crane capacity
   - assumptions, data_source="synthetic", limitations
6. If no option is better, return a valid “stay at current port” recommendation with explanation.
7. Never present this as a real navigational instruction or real-time shipping advice.
8. Dashboard: add one compact “Routing recommendation” card to the existing affected-vessel area:
   - recommended port or “Stay at current port”
   - estimated hours saved
   - one-sentence reason
   - synthetic-data disclaimer
   - loading and standard error state
9. Tests:
   - better alternative is recommended
   - worse alternative is not recommended
   - no candidate ports returns valid stay decision
   - missing vessel gives standard error
   - UI success/error states and production build pass

Run backend tests, frontend tests if configured, frontend production build, and git diff --check.
Update AI_HANDOFF.md and submission-readiness.md truthfully.
Final response: maximum 120 words: files changed, checks passed, assumptions, blockers, Bob evidence reminder.
This adds a decision that judges can understand immediately: “reroute only when the congestion saving exceeds the diversion cost.”



Plan 12 — Explainable AI Copilot
Use after predictions, optimizer, and alternate-routing endpoints work.
	• Executor: IBM Bob Agent Mode
	• Recommended model: GPT-5.6 Luna (medium reasoning)
	• Goal: add a safe Copilot that explains real PortFlow API results; it must not invent operations data or make changes.
Work in F:\PortFlow-AI.
Goal: build a minimal AI Copilot that explains current congestion, vessel wait risk, optimizer outcomes, and alternate-routing recommendations using real API/service results.
Read only:
- docs/AI_HANDOFF.md
- docs/API_CONTRACT.md
- src/backend/ relevant routes, services, settings
- src/frontend/ relevant dashboard/client components
- existing IBM Bob/LLM integration files, if any
- docs/ or README sections describing approved Bob configuration
Preconditions:
- Congestion, waiting-time, optimizer, and routing services return structured results.
- An approved IBM Bob/LLM configuration method is documented or environment variables are available.
If no approved integration path exists, create only a provider interface and clear configuration instructions; do not fabricate a live IBM Bob connection.
Bobathon rules:
- Keep source inside src/.
- Do not edit .github/workflows/validate.yml.
- Do not expose keys, add secrets, fabricate IBM Bob evidence, or claim a provider is connected when it is not.
- Do not commit, push, deploy, create migrations, or alter existing prediction/optimizer logic.
- Save genuine Bob evidence manually in bob_sessions/ after completion.
Allowed changes:
- src/backend/
- src/frontend/
- docs/AI_HANDOFF.md
- docs/submission-readiness.md
- .env.example files only
Do not add authentication, agents that take actions, external web search, vector databases, new pages, schema changes, or extra LLM frameworks.
Implementation:
1. Create a small backend Copilot service with one provider adapter.
2. Use environment variables only:
   COPILOT_PROVIDER
   IBM_BOB_API_KEY
   IBM_BOB_MODEL
   IBM_BOB_BASE_URL
   Never log or return secret values.
3. Follow API_CONTRACT.md. Complete an existing route or add:
   POST /api/v1/copilot/ask
4. Request:
   {
     "port_id": 1,
     "question": "Why is congestion high and what should operators do?"
   }
5. Server gathers structured context from existing services:
   congestion summary, affected vessels, optimizer metrics/assignments, and routing recommendations.
6. Prompt rules:
   - answer only from supplied context
   - explicitly state synthetic/demo data
   - distinguish prediction from fact
   - give 3 concise operational recommendations
   - never invent vessel, port, weather, cost, or external facts
   - never execute an action
7. If provider is unconfigured/unavailable, return a deterministic, structured local explanation from the same context, labeled:
   method = rules_fallback
   provider_available = false
   Do not pretend this is IBM Bob.
8. If IBM Bob is configured, label:
   method = ibm_bob_llm
   provider_available = true
9. Dashboard: add a compact Copilot panel/drawer in the existing dashboard:
   - three suggested questions
   - text input and Ask button
   - response, method label, synthetic-data disclaimer
   - loading and standard error state
   - no chat history persistence required
10. Tests:
   - context builder contains real service data
   - fallback never invents unsupported facts
   - missing provider config uses labeled fallback
   - provider errors use standard API envelope
   - UI loading/success/error states
   - production build passes
Run backend tests, frontend tests if configured, frontend production build, and git diff --check.
Update .env.example, AI_HANDOFF.md, and submission-readiness.md truthfully.
Final response: maximum 120 words with changed files, checks passed, actual provider status, and Bob evidence reminder.
This makes the AI feel useful in the demo: it explains why a delay is predicted and why the optimizer’s new plan is better—without pretending it controls the port.


Plan 13 — Port Map + Operational Alerts
Use after the core prediction, optimizer, routing, and Copilot features work.
	• Executor: IBM Bob Agent Mode
	• Recommended model: Gemini 3.7 Flash (high reasoning)
	• Goal: make the dashboard visually impressive without changing backend logic or creating fake real-time data.
Work in F:\PortFlow-AI.
Goal: add a compact Port Map and operational alert experience using existing API data. Focus on visual clarity for the demo.
Read only:
- docs/AI_HANDOFF.md
- docs/API_CONTRACT.md
- src/frontend/
- src/backend/ only if an existing read-only dashboard/port endpoint must be completed
- existing dashboard data structures
Preconditions:
- Dashboard already receives port, berth, congestion, affected-vessel, and optimizer data.
- Each seeded port/berth has usable demo coordinates, or documented static display coordinates already exist.
If coordinates are unavailable, create a clean berth-layout map panel from existing berth data; do not invent real port geolocation.
Bobathon rules:
- Keep source inside src/.
- Do not edit .github/workflows/validate.yml.
- Do not fabricate live vessel positions, IoT feeds, screenshots, deployment claims, or Bob evidence.
- Do not commit, push, deploy, modify database schema, or create migrations.
- Save genuine Bob work manually in bob_sessions/ after completion.
Allowed changes:
- src/frontend/
- src/backend/ only for an existing read-only data endpoint
- docs/AI_HANDOFF.md
- docs/submission-readiness.md
Do not modify ML, optimizer logic, routing logic, Copilot, authentication, or add a new backend persistence feature.
Implementation:
1. Use Leaflet + OpenStreetMap only if already installed or a single lightweight dependency can be added.
2. Add a “Port Operations Map” panel to the existing dashboard; do not add a new page.
3. Display:
   - port marker or berth-layout view
   - berth markers/blocks colored by status:
     available = green, occupied = blue, high-risk = amber, critical = red
   - click/hover details: berth name, assigned vessel, occupancy window, crane count
   - visible “Synthetic/demo operational data” label
4. Do not imply vessel markers are GPS/live AIS tracking.
5. Add a compact Alerts panel generated client-side from existing API responses:
   - CRITICAL congestion
   - vessel predicted wait above documented HIGH threshold
   - unscheduled vessel from optimizer
   - alternate-route recommendation with meaningful time saving
6. Each alert must include severity, affected vessel/berth when known, one-line reason, and a useful action label such as “Generate 72-hour plan”.
7. Alerts are derived only from already-returned data. Do not add alert database tables or background jobs.
8. Handle loading, empty, and API-error states cleanly.
9. Keep the dashboard responsive and avoid animation-heavy or map-heavy redesigns.
10. Add focused frontend tests for:
   - status-color mapping
   - alert derivation and severity
   - empty/error states
   - map panel renders without external tiles in test environment

Run frontend tests if configured, frontend production build, and git diff --check.
Update AI_HANDOFF.md and submission-readiness.md truthfully.
Final response: maximum 120 words with files changed, checks passed, limitation, and manual Bob evidence reminder.
This plan gives your demo its “command center” visual: colorful berth status, clear risks, and immediate operational actions.
