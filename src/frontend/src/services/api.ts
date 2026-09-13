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
  DashboardCongestionResponse,
  DashboardSummaryResponse,
  BerthsResponse,
  CranesResponse,
  SchedulesResponse,
  ScenariosResponse,
  ScenarioId,
  WaitingTimesResponse,
} from '../types/api'

const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1'

export const DEFAULT_PORT_CODE =
  (import.meta.env.VITE_DEFAULT_PORT_ID as string | undefined) ?? 'FKPFL'

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
): Promise<WaitingTimesResponse> {
  return apiFetch<WaitingTimesResponse>('/waiting-times', {
    port_code: portCode,
    horizon_hours: horizonHours,
    mode,
  })
}

export function fetchAlternateRouting(
  vesselId: string,
): Promise<AlternateRoutingResponse> {
  return apiFetch<AlternateRoutingResponse>(`/vessels/${encodeURIComponent(vesselId)}/alternate-routing`)
}

export function fetchCopilotAsk(
  req: CopilotAskRequest,
): Promise<CopilotAskResponse> {
  const url = new URL(`${(import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1'}/copilot/ask`, window.location.origin)
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
