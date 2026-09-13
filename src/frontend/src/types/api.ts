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
export type WaitingMode = 'baseline' | 'ml'

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

// ── Waiting-time predictions ─────────────────────────────────────────────────

export interface VesselWaitingPrediction {
  schedule_id: string
  vessel_id: string
  vessel_name: string
  eta: string
  priority: number
  predicted_waiting_hours: number
  risk_level: 'low' | 'medium' | 'high'
  method: string
  model_version: string
  data_source: string
  is_synthetic: boolean
  limitations: string
  primary_cause: string | null
}

export interface WaitingTimesResponse {
  port_code: string
  horizon_hours: number
  mode: WaitingMode
  vessels: VesselWaitingPrediction[]
  total: number
  is_synthetic: boolean
  data_source: string
  calculation_method: string
  limitations: string
}

// ── Alternate-routing recommendation ─────────────────────────────────────────

export interface PortEstimate {
  port_code: string
  port_name: string
  diversion_transit_hours: number
  predicted_wait_hours: number
  estimated_handling_hours: number
  estimated_total_hours: number
  total_berths: number
  operational_cranes: number
  is_current_port: boolean
  is_candidate: boolean
}

export interface AlternateRoutingResponse {
  vessel_id: string
  vessel_name: string
  schedule_id: string
  current_port: PortEstimate
  candidates: PortEstimate[]
  recommended: boolean
  recommended_port_code: string | null
  recommended_port_name: string | null
  estimated_hours_saved: number
  reason: string
  factors: string[]
  diversion_threshold_hours: number
  data_source: string
  is_synthetic: boolean
  limitations: string
  assumptions: string[]
}


// ── Copilot ───────────────────────────────────────────────────────────────────

export interface CopilotContextSnapshot {
  port_code: string
  port_name: string
  scenario: string
  peak_risk_level: string
  peak_congestion_risk_pct: number
  active_vessel_count: number
  arrivals_next_24h: number
  avg_estimated_waiting_minutes: number
  high_risk_vessels: string[]
  top_waiting_vessel: string | null
  top_waiting_hours: number | null
  top_waiting_cause: string | null
  routing_recommended: boolean | null
  routing_reason: string | null
  top_rule_drivers: string[]
  data_source: string
}

export interface CopilotAskRequest {
  port_code: string
  question: string
  scenario?: string
}

export interface CopilotAskResponse {
  answer: string
  method: 'rules_fallback' | 'ibm_bob_llm'
  provider_available: boolean
  question: string
  port_code: string
  scenario: string
  context_snapshot: CopilotContextSnapshot
  is_synthetic: boolean
  data_source: string
  disclaimer: string
  limitations: string
}


// ── Error envelope ────────────────────────────────────────────────────────────

export interface ApiError {
  detail: string | { error: string; message: string }
}

// ── Operations Plan ───────────────────────────────────────────────────────────

export interface BerthAssignment {
  schedule_id: string
  vessel_id: string
  vessel_name: string
  berth_id: string
  berth_code: string
  start_time: string
  end_time: string
  cranes_assigned: number
  service_minutes: number
  waiting_minutes: number
  priority: number
  explanation: string
}

export interface UnscheduledVessel {
  schedule_id: string
  vessel_id: string
  vessel_name: string
  arrival_time: string
  priority: number
  reason: string
}

export interface OptimizerMetrics {
  total_vessels: number
  scheduled_count: number
  unscheduled_count: number
  fifo_total_wait_minutes: number
  opt_total_wait_minutes: number
  wait_reduction_minutes: number
  avg_wait_minutes: number
  berth_utilization_pct: number
  crane_utilization_pct: number
  solve_status: string
  solve_wall_seconds: number
}

export interface OperationsPlanResponse {
  plan_id: string
  port_code: string
  horizon_hours: number
  assignments: BerthAssignment[]
  unscheduled: UnscheduledVessel[]
  metrics: OptimizerMetrics | null
  explanation: string
  assumptions: string[]
  optimizer_method: string
  approval_required: boolean
  approved: boolean
  is_synthetic: boolean
  data_source: string
  limitations: string
}

export interface OperationsPlanApprovalResponse {
  plan_id: string
  approved: boolean
  message: string
  is_synthetic: boolean
  disclaimer: string
}

export interface OperationsPlanRequest {
  port_code?: string
  horizon_hours?: number
  solve_limit_seconds?: number
}
