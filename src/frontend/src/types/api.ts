/**
 * PortFlow AI — TypeScript interfaces for all API response types.
 *
 * These types are the single source of truth for API shapes.
 * No business calculations are performed in React — all KPI values
 * come directly from FastAPI.
 *
 * Calculation methods:
 *   "baseline_rule_v1" — deterministic rule (default)
 *   "ml_model_v1"      — trained on synthetic data only
 */

export type CongestionMode = 'baseline' | 'ml'

export interface HealthResponse {
  status: string
  service: string
  version: string
}

// ── Dashboard Summary ────────────────────────────────────────────────────────

export interface DashboardSummaryResponse {
  port_code: string
  port_name: string
  active_vessel_count: number
  arrivals_next_24h: number
  berth_occupancy_pct: number
  available_crane_count: number
  peak_congestion_risk: number
  peak_risk_level: 'low' | 'medium' | 'high' | 'critical'
  avg_estimated_waiting_minutes: number
  critical_vessel_count: number
  selected_scenario: ScenarioId
  is_synthetic: boolean
  calculation_method: string
}

// ── Dashboard Congestion ─────────────────────────────────────────────────────

export interface CongestionWindow {
  window_start: string
  window_end: string
  risk_probability: number
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  estimated_queue_count: number
  affected_schedule_ids: string[]
  rule_drivers: string[]
  // ML-mode additions (null when mode=baseline)
  ml_label: 'LOW' | 'MEDIUM' | 'HIGH' | null
  ml_confidence: number | null
  ml_model_version: string | null
}

export interface DashboardCongestionResponse {
  port_code: string
  horizon_hours: number
  windows: CongestionWindow[]
  selected_scenario: ScenarioId
  selected_mode: CongestionMode
  is_synthetic: boolean
  calculation_method: string
  data_source: string
  limitations: string | null
}

// ── Schedules ────────────────────────────────────────────────────────────────

export interface ScheduleItem {
  schedule_id: string
  vessel_name: string
  imo_number: string
  eta: string
  etd: string | null
  expected_containers: number
  cargo_type: string
  priority: number
  preferred_berth_code: string | null
  status: string
  is_synthetic: boolean
  compatible_berth_count: number | null
  estimated_waiting_minutes: number | null
}

export interface SchedulesResponse {
  port_code: string
  scenario: string
  schedules: ScheduleItem[]
  total: number
  is_synthetic: boolean
}

// ── Resources — Berths ───────────────────────────────────────────────────────

export interface BerthItem {
  berth_id: string
  berth_code: string
  berth_name: string
  max_length_m: number
  max_draft_m: number
  max_cranes: number
  status: string
  occupancy_status: 'free' | 'occupied' | 'maintenance'
  crane_count: number
}

export interface BerthsResponse {
  port_code: string
  berths: BerthItem[]
  total: number
  is_synthetic: boolean
}

// ── Resources — Cranes ───────────────────────────────────────────────────────

export interface CraneItem {
  crane_id: string
  crane_code: string
  berth_code: string | null
  moves_per_hour: number
  status: string
}

export interface CranesResponse {
  port_code: string
  cranes: CraneItem[]
  total: number
  available_count: number
  is_synthetic: boolean
}

// ── Scenarios ────────────────────────────────────────────────────────────────

export type ScenarioId =
  | 'baseline'
  | 'arrival_surge'
  | 'crane_outage'
  | 'berth_closure'
  | 'handling_slowdown'

export interface ScenarioInfo {
  scenario_id: ScenarioId
  label: string
  description: string
}

export interface ScenariosResponse {
  scenarios: ScenarioInfo[]
  default_scenario: string
}

// ── Error envelope ────────────────────────────────────────────────────────────

export interface ApiError {
  detail: string | { error: string; message: string }
}
