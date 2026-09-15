/**
 * PortFlow AI — API client.
 *
 * Single source of truth for all backend communication.
 * - One central BASE_URL configuration.
 * - Typed request/response functions.
 * - No business calculations performed here.
 * - Clear handling of non-200 responses.
 */

import type {
  AlternateRoutingResponse,
  CongestionMode,
  WaitingMode,
  CopilotAskRequest,
  CopilotAskResponse,
  CSVImportResponse,
  DisruptionScenarioResponse,
  DashboardCongestionResponse,
  DashboardSummaryResponse,
  BerthsResponse,
  CranesResponse,
  SchedulesResponse,
  ScenariosResponse,
  ScenarioId,
  WaitingTimesResponse,
} from '../types/api'

const rawBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()
const BASE_URL = rawBase && rawBase.length > 0 ? rawBase : '/api/v1'

const rawPort = (import.meta.env.VITE_DEFAULT_PORT_ID as string | undefined)?.trim()
export const DEFAULT_PORT_CODE = rawPort && rawPort.length > 0 ? rawPort : 'FKPFL'

// ── Error type ───────────────────────────────────────────────────────────────

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message: string,
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

// ── Core fetch helper ─────────────────────────────────────────────────────────

export async function apiFetch<T>(
  path: string,
  params?: Record<string, string | number>,
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value))
    }
  }
  const response = await fetch(url.toString())
  if (!response.ok) {
    let body: unknown
    try {
      body = await response.json()
    } catch {
      body = { detail: response.statusText }
    }
    throw new ApiRequestError(
      response.status,
      body,
      `API ${response.status}: ${response.statusText}`,
    )
  }
  return response.json() as Promise<T>
}

// ── Typed API functions ───────────────────────────────────────────────────────

export function fetchDashboardSummary(
  portCode: string,
  scenario: ScenarioId,
  horizonHours = 72,
): Promise<DashboardSummaryResponse> {
  return apiFetch<DashboardSummaryResponse>('/dashboard/summary', {
    port_code: portCode,
    scenario,
    horizon_hours: horizonHours,
  })
}

export function fetchDashboardCongestion(
  portCode: string,
  scenario: ScenarioId,
  horizonHours = 72,
  mode: CongestionMode = 'baseline',
): Promise<DashboardCongestionResponse> {
  return apiFetch<DashboardCongestionResponse>('/dashboard/congestion', {
    port_code: portCode,
    scenario,
    horizon_hours: horizonHours,
    mode,
  })
}

export function fetchSchedules(
  portCode: string,
  scenario: ScenarioId,
): Promise<SchedulesResponse> {
  return apiFetch<SchedulesResponse>('/schedules', {
    port_code: portCode,
    scenario,
  })
}

export function fetchBerths(portCode: string): Promise<BerthsResponse> {
  return apiFetch<BerthsResponse>('/resources/berths', { port_code: portCode })
}

export function fetchCranes(portCode: string): Promise<CranesResponse> {
  return apiFetch<CranesResponse>('/resources/cranes', { port_code: portCode })
}

export function fetchScenarios(): Promise<ScenariosResponse> {
  return apiFetch<ScenariosResponse>('/scenarios')
}

export function fetchWaitingTimes(
  portCode: string,
  horizonHours = 72,
  mode: WaitingMode = 'baseline',
  scenario?: string,
): Promise<WaitingTimesResponse> {
  const params: Record<string, string | number> = {
    port_code: portCode,
    horizon_hours: horizonHours,
    mode,
  }
  if (scenario) params.scenario = scenario
  return apiFetch<WaitingTimesResponse>('/waiting-times', params)
}

export function fetchAlternateRouting(
  vesselId: string,
  scheduleId?: string,
  scenario?: string,
): Promise<AlternateRoutingResponse> {
  const params: Record<string, string> = {}
  if (scheduleId) params.schedule_id = scheduleId
  if (scenario) params.scenario = scenario
  return apiFetch<AlternateRoutingResponse>(
    `/vessels/${encodeURIComponent(vesselId)}/alternate-routing`,
    params,
  )
}

export function fetchCopilotAsk(
  req: CopilotAskRequest,
): Promise<CopilotAskResponse> {
  const url = new URL(`${BASE_URL}/copilot/ask`, window.location.origin)
  return fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  }).then(async (resp) => {
    if (!resp.ok) {
      let body: unknown
      try { body = await resp.json() } catch { body = { detail: resp.statusText } }
      throw new ApiRequestError(resp.status, body, `API ${resp.status}: ${resp.statusText}`)
    }
    return resp.json() as Promise<CopilotAskResponse>
  })
}

export function fetchOperationsPlan(
  req: import('../types/api').OperationsPlanRequest = {},
): Promise<import('../types/api').OperationsPlanResponse> {
  const url = new URL(`${BASE_URL}/operations-plan`, window.location.origin)
  return fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  }).then(async (resp) => {
    if (!resp.ok) {
      let body: unknown
      try { body = await resp.json() } catch { body = { detail: resp.statusText } }
      throw new ApiRequestError(resp.status, body, `API ${resp.status}: ${resp.statusText}`)
    }
    return resp.json() as Promise<import('../types/api').OperationsPlanResponse>
  })
}

// ── Write helpers ─────────────────────────────────────────────────────────────

async function writeApi<T>(path: string, method: 'POST' | 'PATCH', body: unknown): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin)
  const response = await fetch(url.toString(), {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    let responseBody: unknown
    try { responseBody = await response.json() } catch { responseBody = { detail: response.statusText } }
    throw new ApiRequestError(response.status, responseBody, `API ${response.status}: ${response.statusText}`)
  }
  return response.json() as Promise<T>
}

export function createVesselSchedule(
  request: import('../types/api').VesselScheduleCreateRequest,
): Promise<import('../types/api').VesselScheduleCreateResponse> {
  return writeApi('/data-input/vessel-schedules', 'POST', request)
}

export function updateResourceStatus(
  resource: 'berths' | 'cranes', resourceId: string, status: string,
): Promise<import('../types/api').ResourceStatusResponse> {
  return writeApi(`/data-input/${resource}/${encodeURIComponent(resourceId)}/status`, 'PATCH', { status })
}

export async function uploadVesselScheduleCSV(
  file: File,
  portCode: string = DEFAULT_PORT_CODE,
): Promise<CSVImportResponse> {
  const url = new URL(`${BASE_URL}/data-input/vessel-schedules/csv`, window.location.origin)
  url.searchParams.set('port_code', portCode)
  const form = new FormData()
  form.append('file', file)
  const resp = await fetch(url.toString(), { method: 'POST', body: form })
  if (!resp.ok) {
    let body: unknown
    try { body = await resp.json() } catch { body = { detail: resp.statusText } }
    throw new ApiRequestError(resp.status, body, `API ${resp.status}: ${resp.statusText}`)
  }
  return resp.json() as Promise<CSVImportResponse>
}

export async function downloadCSVTemplate(): Promise<void> {
  const url = new URL(`${BASE_URL}/data-input/vessel-schedules/csv-template`, window.location.origin)
  const resp = await fetch(url.toString())
  if (!resp.ok) throw new Error('Failed to download template')
  const blob = await resp.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'portflow_vessel_schedule_template.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}

export async function loadDemoScenario(
  portCode: string = DEFAULT_PORT_CODE,
): Promise<DisruptionScenarioResponse> {
  const url = new URL(`${BASE_URL}/data-input/load-demo-scenario`, window.location.origin)
  url.searchParams.set('port_code', portCode)
  const resp = await fetch(url.toString(), { method: 'POST' })
  if (!resp.ok) {
    let body: unknown
    try { body = await resp.json() } catch { body = { detail: resp.statusText } }
    throw new ApiRequestError(resp.status, body, `API ${resp.status}: ${resp.statusText}`)
  }
  return resp.json() as Promise<DisruptionScenarioResponse>
}

export function approveOperationsPlan(
  planId: string,
): Promise<import('../types/api').OperationsPlanApprovalResponse> {
  const url = new URL(
    `${BASE_URL}/operations-plan/${encodeURIComponent(planId)}/approve`,
    window.location.origin,
  )
  return fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }).then(async (resp) => {
    if (!resp.ok) {
      let body: unknown
      try { body = await resp.json() } catch { body = { detail: resp.statusText } }
      throw new ApiRequestError(resp.status, body, `API ${resp.status}: ${resp.statusText}`)
    }
    return resp.json() as Promise<import('../types/api').OperationsPlanApprovalResponse>
  })
}
