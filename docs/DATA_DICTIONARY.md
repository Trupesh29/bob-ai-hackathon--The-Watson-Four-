# Data Dictionary — PortFlow AI

**Version:** 1.0  
**Last updated:** 2026-09-13 (Plan 1 session)  
**All timestamps:** UTC, ISO 8601 (`YYYY-MM-DDTHH:MM:SSZ`)

---

## Synthetic Data Policy

All data used in development and demonstration is **synthetic and seed-driven**.

| Policy rule | Detail |
|---|---|
| Random seed | `RANDOM_SEED=42` (configurable) |
| Generation script | `src/backend/app/data/generate_synthetic.py` |
| Synthetic flag | Every synthetic record has `is_synthetic = true` in the database and in API responses |
| No real data | No live AIS feeds, no real port operator data, no personal information, no confidential data |
| Public datasets | If any public dataset is used, it will be documented in the "Data Provenance" section below with source, licence, and access date |
| Reproducibility | Given the same `RANDOM_SEED` and generation parameters, the script must produce identical output |

---

## Database Tables

### `vessels`

| Column | Type | Nullable | Description |
|---|---|---|---|
| `vessel_id` | VARCHAR(50) | NOT NULL PK | Unique vessel identifier (e.g. `V001`) |
| `name` | VARCHAR(200) | NOT NULL | Vessel name (synthetic: `SYNTHETIC-CONTAINER-NNN`) |
| `eta_utc` | TIMESTAMPTZ | NOT NULL | Estimated time of arrival in UTC |
| `teu` | INTEGER | NOT NULL | Twenty-foot equivalent unit capacity (500 – 18,000 for synthetic data) |
| `priority` | VARCHAR(10) | NOT NULL | `HIGH`, `NORMAL`, or `LOW` |
| `is_synthetic` | BOOLEAN | NOT NULL | `true` for all synthetic records |
| `created_at_utc` | TIMESTAMPTZ | NOT NULL | Record creation timestamp in UTC |

### `berths`

| Column | Type | Nullable | Description |
|---|---|---|---|
| `berth_id` | VARCHAR(50) | NOT NULL PK | Unique berth identifier (e.g. `B01`) |
| `name` | VARCHAR(200) | NOT NULL | Berth display name |
| `max_teu_per_hour` | INTEGER | NOT NULL | Rated container throughput per hour |
| `crane_count` | INTEGER | NOT NULL | Number of cranes assigned to this berth |
| `is_active` | BOOLEAN | NOT NULL | `false` if berth is under maintenance |

### `cranes`

| Column | Type | Nullable | Description |
|---|---|---|---|
| `crane_id` | VARCHAR(50) | NOT NULL PK | Unique crane identifier (e.g. `C01`) |
| `berth_id` | VARCHAR(50) | NOT NULL FK → berths | Home berth of this crane |
| `is_available` | BOOLEAN | NOT NULL | `false` if crane is under maintenance |

### `predictions`

| Column | Type | Nullable | Description |
|---|---|---|---|
| `prediction_id` | VARCHAR(100) | NOT NULL PK | Unique prediction run ID |
| `generated_at_utc` | TIMESTAMPTZ | NOT NULL | When this prediction was produced |
| `model_version` | VARCHAR(50) | NOT NULL | Serialised model artefact name |
| `horizon_start_utc` | TIMESTAMPTZ | NOT NULL | Start of the planning horizon |
| `horizon_end_utc` | TIMESTAMPTZ | NOT NULL | End of the planning horizon |

### `prediction_results`

| Column | Type | Nullable | Description |
|---|---|---|---|
| `result_id` | BIGINT | NOT NULL PK | Auto-increment primary key |
| `prediction_id` | VARCHAR(100) | NOT NULL FK → predictions | Parent prediction run |
| `vessel_id` | VARCHAR(50) | NOT NULL FK → vessels | Vessel this result applies to |
| `congestion_risk_score` | FLOAT | NOT NULL | ML model output; range 0.0 – 1.0 |
| `waiting_time_hours` | FLOAT | NOT NULL | Predicted waiting time in decimal hours |
| `waiting_time_ci_lower` | FLOAT | NOT NULL | Lower bound of 90% confidence interval |
| `waiting_time_ci_upper` | FLOAT | NOT NULL | Upper bound of 90% confidence interval |
| `risk_level` | VARCHAR(10) | NOT NULL | `HIGH` (≥ 0.7), `MEDIUM` (0.5–0.69), `LOW` (< 0.5) |
| `is_synthetic` | BOOLEAN | NOT NULL | Inherits from vessel record |

### `plans`

| Column | Type | Nullable | Description |
|---|---|---|---|
| `plan_id` | VARCHAR(100) | NOT NULL PK | Unique plan ID |
| `status` | VARCHAR(20) | NOT NULL | `proposed`, `active`, or `rejected` |
| `generated_at_utc` | TIMESTAMPTZ | NOT NULL | When CP-SAT produced this plan |
| `prediction_id` | VARCHAR(100) | NOT NULL FK → predictions | Prediction that drove this plan |
| `solver` | VARCHAR(20) | NOT NULL | Always `cpsat` for MVP |
| `objective_value` | FLOAT | NOT NULL | Total waiting hours in optimised plan |
| `baseline_objective_value` | FLOAT | NOT NULL | Total waiting hours in FCFS baseline |
| `horizon_start_utc` | TIMESTAMPTZ | NOT NULL | Plan horizon start |
| `horizon_end_utc` | TIMESTAMPTZ | NOT NULL | Plan horizon end |

### `berth_assignments`

| Column | Type | Nullable | Description |
|---|---|---|---|
| `assignment_id` | VARCHAR(100) | NOT NULL PK | Unique berth assignment ID |
| `plan_id` | VARCHAR(100) | NOT NULL FK → plans | Parent plan |
| `vessel_id` | VARCHAR(50) | NOT NULL FK → vessels | Vessel being assigned |
| `berth_id` | VARCHAR(50) | NOT NULL FK → berths | Assigned berth |
| `start_time_utc` | TIMESTAMPTZ | NOT NULL | Assigned berth entry time in UTC |
| `end_time_utc` | TIMESTAMPTZ | NOT NULL | Assigned berth departure time in UTC |

### `crane_assignments`

| Column | Type | Nullable | Description |
|---|---|---|---|
| `assignment_id` | VARCHAR(100) | NOT NULL PK | Unique crane assignment ID |
| `plan_id` | VARCHAR(100) | NOT NULL FK → plans | Parent plan |
| `vessel_id` | VARCHAR(50) | NOT NULL FK → vessels | Vessel being served |
| `berth_id` | VARCHAR(50) | NOT NULL FK → berths | Berth where crane operates |
| `crane_id` | VARCHAR(50) | NOT NULL FK → cranes | Assigned crane |
| `start_time_utc` | TIMESTAMPTZ | NOT NULL | Crane operation start in UTC |
| `end_time_utc` | TIMESTAMPTZ | NOT NULL | Crane operation end in UTC |

### `plan_approvals`

| Column | Type | Nullable | Description |
|---|---|---|---|
| `approval_id` | VARCHAR(100) | NOT NULL PK | Unique approval record ID |
| `plan_id` | VARCHAR(100) | NOT NULL FK → plans | Plan that was approved |
| `approved_by` | VARCHAR(100) | NOT NULL | Supervisor ID who approved |
| `approved_at_utc` | TIMESTAMPTZ | NOT NULL | Approval timestamp in UTC |
| `notes` | TEXT | NULL | Optional supervisor notes |

### `routing_recommendations`

| Column | Type | Nullable | Description |
|---|---|---|---|
| `recommendation_id` | VARCHAR(100) | NOT NULL PK | Unique recommendation ID |
| `plan_id` | VARCHAR(100) | NOT NULL FK → plans | Parent plan |
| `vessel_id` | VARCHAR(50) | NOT NULL FK → vessels | Vessel subject to rerouting |
| `current_berth_id` | VARCHAR(50) | NOT NULL FK → berths | Original assigned berth |
| `recommended_berth_id` | VARCHAR(50) | NOT NULL FK → berths | Recommended alternate berth |
| `reason` | TEXT | NOT NULL | Plain-language explanation of the recommendation |
| `net_benefit_hours` | FLOAT | NOT NULL | Waiting-time reduction if recommendation is followed |
| `status` | VARCHAR(20) | NOT NULL | `pending_approval`, `approved`, `rejected` |

---

## ML Feature Definitions

| Feature name | Source column(s) | Transformation |
|---|---|---|
| `teu` | `vessels.teu` | None (used raw) |
| `hour_of_day` | `vessels.eta_utc` | Extract hour (0–23, UTC) |
| `day_of_week` | `vessels.eta_utc` | Extract weekday (0=Mon, 6=Sun) |
| `priority_encoded` | `vessels.priority` | Ordinal: HIGH=2, NORMAL=1, LOW=0 |
| `berth_occupancy_rate` | Count of active `berth_assignments` at ETA / total berths | Float 0.0 – 1.0 |
| `available_crane_fraction` | Available cranes at ETA / total cranes | Float 0.0 – 1.0 |
| `vessels_in_next_6h` | Count of vessels arriving within 6h of ETA | Integer |

**Target variables:**

| Target | Description |
|---|---|
| `waiting_time_hours` | Actual time from ETA to berth entry (used for regression training) |
| `congestion_risk_score` | Derived: quantile rank of `waiting_time_hours` in training set, normalised to 0–1 |

---

## Risk Level Thresholds

| Level | Score range | Configured by |
|---|---|---|
| `HIGH` | ≥ 0.7 | `REROUTE_THRESHOLD` env var (default 0.7) |
| `MEDIUM` | 0.5 – 0.699 | `RISK_WARN_THRESHOLD` env var (default 0.5) |
| `LOW` | < 0.5 | Implicit |

---

## Synthetic Data Generation Parameters

| Parameter | Default | Config variable |
|---|---|---|
| Random seed | 42 | `RANDOM_SEED` |
| Planning horizon | 72 hours | Hardcoded in generator |
| Number of berths | 6 | `SYNTHETIC_BERTH_COUNT` |
| Cranes per berth | 2 | `SYNTHETIC_CRANES_PER_BERTH` |
| Vessel arrivals per 72h | 20–40 (uniform random) | `SYNTHETIC_MIN_VESSELS`, `SYNTHETIC_MAX_VESSELS` |
| TEU range | 500 – 18,000 | `SYNTHETIC_MIN_TEU`, `SYNTHETIC_MAX_TEU` |
| Priority distribution | HIGH 20%, NORMAL 60%, LOW 20% | Hardcoded in generator |

---

## Data Provenance

| Dataset | Source | Licence | Access date | Location |
|---|---|---|---|---|
| *(none)* | All data is synthetic | N/A | N/A | `src/backend/app/data/` |

If any public dataset is added in future plans, it will be recorded here.
