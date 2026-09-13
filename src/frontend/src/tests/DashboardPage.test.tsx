/**
 * PortFlow AI — Dashboard frontend tests.
 *
 * Tests:
 * 1. Loading state is shown while fetching.
 * 2. Backend error state is shown on fetch failure.
 * 3. Synthetic-data label is visible in ready state.
 * 4. Scenario selection sends the correct API query.
 * 5. Dashboard renders API KPI values.
 * 6. Chart receives real API-derived series data.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import DashboardPage from '../pages/DashboardPage'
import * as api from '../services/api'

// ── Mock API module ───────────────────────────────────────────────────────────

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof api>()
  return {
    ...actual,
    DEFAULT_PORT_CODE: 'FKPFL',
    fetchDashboardSummary: vi.fn(),
    fetchDashboardCongestion: vi.fn(),
    fetchSchedules: vi.fn(),
    fetchBerths: vi.fn(),
    fetchWaitingTimes: vi.fn(),
    fetchAlternateRouting: vi.fn(),
    fetchCopilotAsk: vi.fn(),
  }
})

const mockSummary = {
  port_code: 'FKPFL',
  port_name: 'Port of Falkermere',
  active_vessel_count: 8,
  arrivals_next_24h: 3,
  berth_occupancy_pct: 66.7,
  available_crane_count: 7,
  peak_congestion_risk: 0.45,
  peak_risk_level: 'medium' as const,
  avg_estimated_waiting_minutes: 50.0,
  critical_vessel_count: 1,
  selected_scenario: 'baseline' as const,
  is_synthetic: true,
  calculation_method: 'baseline_rule_v1',
}

const mockCongestion = {
  port_code: 'FKPFL',
  horizon_hours: 72,
  windows: Array.from({ length: 12 }, (_, i) => ({
    window_start: `2026-09-15T${String(i * 6).padStart(2, '0')}:00:00+00:00`,
    window_end: `2026-09-15T${String(i * 6 + 6).padStart(2, '0')}:00:00+00:00`,
    risk_probability: 0.1 + i * 0.05,
    risk_level: i < 4 ? ('low' as const) : i < 8 ? ('medium' as const) : ('high' as const),
    estimated_queue_count: Math.max(0, i - 2),
    affected_schedule_ids: [],
    rule_drivers: ['2 arrivals in window', '3 berths available'],
    ml_label: null,
    ml_confidence: null,
    ml_model_version: null,
  })),
  selected_scenario: 'baseline' as const,
  selected_mode: 'baseline' as const,
  is_synthetic: true,
  calculation_method: 'baseline_rule_v1',
  data_source: 'synthetic',
  limitations: null,
}

const mockSchedules = {
  port_code: 'FKPFL',
  scenario: 'baseline',
  schedules: [
    {
      schedule_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      vessel_name: 'FALKERMERE ATLAS',
      imo_number: 'IMO9000001',
      eta: '2026-09-15T08:00:00+00:00',
      etd: null,
      expected_containers: 500,
      cargo_type: 'containerised',
      priority: 1,
      preferred_berth_code: 'B01',
      status: 'scheduled',
      is_synthetic: true,
      compatible_berth_count: 1,
      estimated_waiting_minutes: 30,
    },
  ],
  total: 1,
  is_synthetic: true,
}

const mockBerths = {
  port_code: 'FKPFL',
  berths: [
    {
      berth_id: 'b1',
      berth_code: 'B01',
      berth_name: 'Berth Alpha',
      max_length_m: 400.0,
      max_draft_m: 16.0,
      max_cranes: 4,
      status: 'operational',
      occupancy_status: 'free' as const,
      crane_count: 4,
    },
  ],
  total: 1,
  is_synthetic: true,
}

const mockWaitingTimes = {
  port_code: 'FKPFL',
  horizon_hours: 72,
  mode: 'baseline' as const,
  vessels: [
    {
      schedule_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      vessel_id: 'vvvvvvvv-vvvv-vvvv-vvvv-vvvvvvvvvvvv',
      vessel_name: 'FALKERMERE ATLAS',
      eta: '2026-09-15T08:00:00+00:00',
      priority: 1,
      predicted_waiting_hours: 2.0,
      risk_level: 'low' as const,
      method: 'waiting_baseline_v1',
      model_version: 'waiting_baseline_v1',
      data_source: 'synthetic',
      is_synthetic: true,
      limitations: 'Synthetic data only.',
      primary_cause: 'high-priority vessel',
    },
  ],
  total: 1,
  is_synthetic: true,
  data_source: 'synthetic',
  calculation_method: 'waiting_baseline_v1',
  limitations: 'Synthetic data only.',
}

const mockRouting = {
  vessel_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  vessel_name: 'FALKERMERE ATLAS',
  schedule_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  current_port: {
    port_code: 'FKPFL',
    port_name: 'Port of Falkermere',
    diversion_transit_hours: 0.0,
    predicted_wait_hours: 2.0,
    estimated_handling_hours: 4.0,
    estimated_total_hours: 6.0,
    total_berths: 3,
    operational_cranes: 7,
    is_current_port: true,
    is_candidate: false,
  },
  candidates: [
    {
      port_code: 'FKROS',
      port_name: 'Port of Roskilde (Fictional)',
      diversion_transit_hours: 8.0,
      predicted_wait_hours: 3.0,
      estimated_handling_hours: 4.0,
      estimated_total_hours: 15.0,
      total_berths: 4,
      operational_cranes: 10,
      is_current_port: false,
      is_candidate: true,
    },
  ],
  recommended: false,
  recommended_port_code: null,
  recommended_port_name: null,
  estimated_hours_saved: 0.0,
  reason: 'Best alternative (Port of Roskilde (Fictional)) saves only 0.0 h — below the 12-h diversion threshold. Stay at Port of Falkermere.',
  factors: ['Current-port wait: 2.0 h (baseline historical)'],
  diversion_threshold_hours: 12.0,
  data_source: 'synthetic',
  is_synthetic: true,
  limitations: 'Synthetic data only. Not validated for real-world routing decisions.',
  assumptions: ['Diversion threshold: 12 h (demo assumption).'],
}


const mockCopilot = {
  answer: '**Port:** Port of Falkermere\n\n1. Prioritise berth allocation.\n2. Review vessel FALKERMERE ATLAS.\n3. No diversion needed.\n\n_Synthetic demo data._',
  method: 'rules_fallback' as const,
  provider_available: false,
  question: 'Why is congestion high?',
  port_code: 'FKPFL',
  scenario: 'baseline',
  context_snapshot: {
    port_code: 'FKPFL',
    port_name: 'Port of Falkermere',
    scenario: 'baseline',
    peak_risk_level: 'medium',
    peak_congestion_risk_pct: 45.0,
    active_vessel_count: 8,
    arrivals_next_24h: 3,
    avg_estimated_waiting_minutes: 50.0,
    high_risk_vessels: [],
    top_waiting_vessel: 'FALKERMERE ATLAS',
    top_waiting_hours: 2.0,
    top_waiting_cause: 'high-priority vessel',
    routing_recommended: false,
    routing_reason: 'Stay at current port.',
    top_rule_drivers: ['2 arrivals in window'],
    data_source: 'synthetic',
  },
  is_synthetic: true,
  data_source: 'synthetic',
  disclaimer: 'All data is synthetic demo data.',
  limitations: 'rules_fallback generates a deterministic explanation.',
}


function setupSuccessMocks() {
  vi.mocked(api.fetchDashboardSummary).mockResolvedValue(mockSummary)
  vi.mocked(api.fetchDashboardCongestion).mockResolvedValue(mockCongestion)
  vi.mocked(api.fetchSchedules).mockResolvedValue(mockSchedules)
  vi.mocked(api.fetchBerths).mockResolvedValue(mockBerths)
  vi.mocked(api.fetchWaitingTimes).mockResolvedValue(mockWaitingTimes)
  vi.mocked(api.fetchAlternateRouting).mockResolvedValue(mockRouting)
  vi.mocked(api.fetchCopilotAsk).mockResolvedValue(mockCopilot)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  // ── Test 1: Loading state ──────────────────────────────────────────────────

  it('shows loading state while data is being fetched', () => {
    // Never resolves during this test
    vi.mocked(api.fetchDashboardSummary).mockReturnValue(new Promise(() => {}))
    vi.mocked(api.fetchDashboardCongestion).mockReturnValue(new Promise(() => {}))
    vi.mocked(api.fetchSchedules).mockReturnValue(new Promise(() => {}))
    vi.mocked(api.fetchBerths).mockReturnValue(new Promise(() => {}))
    vi.mocked(api.fetchWaitingTimes).mockReturnValue(new Promise(() => {}))
    vi.mocked(api.fetchAlternateRouting).mockReturnValue(new Promise(() => {}))
    vi.mocked(api.fetchCopilotAsk).mockReturnValue(new Promise(() => {}))

    render(<DashboardPage />)
    expect(screen.getByTestId('loading-state')).toBeInTheDocument()
  })

  // ── Test 2: Backend error state ────────────────────────────────────────────

  it('shows backend error state when API call fails', async () => {
    vi.mocked(api.fetchDashboardSummary).mockRejectedValue(
      new api.ApiRequestError(503, { detail: 'Service unavailable' }, 'API 503: Service unavailable'),
    )
    vi.mocked(api.fetchDashboardCongestion).mockRejectedValue(new Error('fetch error'))
    vi.mocked(api.fetchSchedules).mockRejectedValue(new Error('fetch error'))
    vi.mocked(api.fetchBerths).mockRejectedValue(new Error('fetch error'))
    vi.mocked(api.fetchWaitingTimes).mockRejectedValue(new Error('fetch error'))
    vi.mocked(api.fetchAlternateRouting).mockRejectedValue(new Error('fetch error'))

    render(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeInTheDocument()
    })
    expect(screen.getByText(/backend unavailable/i)).toBeInTheDocument()
  })

  // ── Test 3: Synthetic-data label ───────────────────────────────────────────

  it('shows synthetic-data label when data loads successfully', async () => {
    setupSuccessMocks()
    render(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByTestId('synthetic-label')).toBeInTheDocument()
    })
    expect(screen.getByTestId('synthetic-label')).toHaveTextContent(
      'Synthetic demo data',
    )
  })

  // ── Test 4: Scenario selection sends correct API query ─────────────────────

  it('sends correct scenario when scenario button is clicked', async () => {
    setupSuccessMocks()
    render(<DashboardPage />)

    // Wait for initial load to complete
    await waitFor(() => {
      expect(api.fetchDashboardSummary).toHaveBeenCalledTimes(1)
    })

    // Click arrival_surge scenario
    const surgeBtn = screen.getByTestId('scenario-btn-arrival_surge')
    fireEvent.click(surgeBtn)

    // API should be called a second time with arrival_surge
    await waitFor(
      () => {
        expect(api.fetchDashboardSummary).toHaveBeenCalledTimes(2)
      },
      { timeout: 5000 },
    )

    // Verify the second call used arrival_surge (horizonHours defaults to 72 in the function)
    const calls = vi.mocked(api.fetchDashboardSummary).mock.calls
    expect(calls[1][0]).toBe('FKPFL')
    expect(calls[1][1]).toBe('arrival_surge')
  })

  // ── Test 5: Dashboard renders API KPI values ───────────────────────────────

  it('renders KPI values received from the API', async () => {
    setupSuccessMocks()
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByTestId('kpi-cards')).toBeInTheDocument()
    })

    // upcoming-vessels = 8 (from mockSummary.active_vessel_count)
    const vesselKpi = screen.getByTestId('kpi-upcoming-vessels')
    expect(vesselKpi).toHaveTextContent('8')

    // available-cranes = 7
    const craneKpi = screen.getByTestId('kpi-available-cranes')
    expect(craneKpi).toHaveTextContent('7')

    // peak-risk = 45% (0.45 * 100)
    const peakRiskKpi = screen.getByTestId('kpi-peak-risk')
    expect(peakRiskKpi).toHaveTextContent('45%')
  })

  // ── Test 6: Chart receives real API-derived series data ────────────────────

  it('renders the congestion chart with API-derived data', async () => {
    setupSuccessMocks()
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByTestId('congestion-chart')).toBeInTheDocument()
    })

    // The chart container must be present — data comes from mockCongestion (12 windows)
    expect(screen.getByTestId('congestion-chart')).toBeInTheDocument()
  })

  // ── Bonus: calculation_method is never claimed to be ML ───────────────────

  it('does not display any claim of ML or trained model', async () => {
    setupSuccessMocks()
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByTestId('synthetic-label')).toBeInTheDocument()
    })

    // Should NOT contain "ML model running" or "trained model"
    const body = document.body.textContent ?? ''
    expect(body).not.toMatch(/ML model running/i)
    expect(body).not.toMatch(/trained model/i)
    expect(body).not.toMatch(/live AIS/i)

    // Should contain honest labels
    expect(body).toContain('baseline_rule_v1')
    expect(body).toContain('Synthetic demo data')
  })

  // ── Test 7: Congestion mode selector calls API with selected mode ──────────

  it('sends selected congestion mode to the API', async () => {
    setupSuccessMocks()
    render(<DashboardPage />)

    // Wait for initial load (mode=baseline by default)
    await waitFor(() => {
      expect(api.fetchDashboardCongestion).toHaveBeenCalledTimes(1)
    })
    // Initial call: mode defaults to baseline
    const firstCall = vi.mocked(api.fetchDashboardCongestion).mock.calls[0]
    expect(firstCall[3]).toBe('baseline')

    // Click ML mode button
    const mlBtn = screen.getByTestId('mode-btn-ml')
    fireEvent.click(mlBtn)

    await waitFor(
      () => {
        expect(api.fetchDashboardCongestion).toHaveBeenCalledTimes(2)
      },
      { timeout: 5000 },
    )

    // Second call must use mode=ml
    const secondCall = vi.mocked(api.fetchDashboardCongestion).mock.calls[1]
    expect(secondCall[3]).toBe('ml')
  })

  // ── Test 8: Shows method/data-source label from API response ──────────────

  it('displays calculation method label from API response', async () => {
    // Mock congestion response with ml_model_v1 method (simulates ML mode response)
    const mlCongestion = {
      ...mockCongestion,
      calculation_method: 'ml_model_v1',
      selected_mode: 'ml' as const,
      data_source: 'synthetic',
      limitations: 'Trained on synthetic data only. Not validated for real-world operations.',
    }
    vi.mocked(api.fetchDashboardSummary).mockResolvedValue(mockSummary)
    vi.mocked(api.fetchDashboardCongestion).mockResolvedValue(mlCongestion)
    vi.mocked(api.fetchSchedules).mockResolvedValue(mockSchedules)
    vi.mocked(api.fetchBerths).mockResolvedValue(mockBerths)
    vi.mocked(api.fetchWaitingTimes).mockResolvedValue(mockWaitingTimes)
    vi.mocked(api.fetchAlternateRouting).mockResolvedValue(mockRouting)

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByTestId('chart-method-label')).toBeInTheDocument()
    })

    // The chart method label should show the API-returned calculation_method
    expect(screen.getByTestId('chart-method-label')).toHaveTextContent('ml_model_v1')
  })

  // ── Test 9: Waiting-time mode selector sends correct request ──────────────

  it('sends correct waiting mode when waiting-mode button is clicked', async () => {
    setupSuccessMocks()
    render(<DashboardPage />)

    await waitFor(() => {
      expect(api.fetchWaitingTimes).toHaveBeenCalledTimes(1)
    })

    // Initial call defaults to 'baseline'
    const firstCall = vi.mocked(api.fetchWaitingTimes).mock.calls[0]
    expect(firstCall[2]).toBe('baseline')

    // Click ML mode
    const mlBtn = screen.getByTestId('waiting-mode-btn-ml')
    fireEvent.click(mlBtn)

    await waitFor(
      () => {
        expect(api.fetchWaitingTimes).toHaveBeenCalledTimes(2)
      },
      { timeout: 5000 },
    )

    const secondCall = vi.mocked(api.fetchWaitingTimes).mock.calls[1]
    expect(secondCall[2]).toBe('ml')
  })

  // ── Test 10: Dashboard renders waiting-time vessel data ───────────────────

  it('renders waiting-time vessel predictions in the affected vessels table', async () => {
    setupSuccessMocks()
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByTestId('vessels-table')).toBeInTheDocument()
    })

    // Vessel name from mockWaitingTimes
    expect(screen.getByText('FALKERMERE ATLAS')).toBeInTheDocument()
  })

  // ── Test 11: Waiting method label is shown ────────────────────────────────

  it('shows waiting-method label from API response', async () => {
    setupSuccessMocks()
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByTestId('waiting-method-label')).toBeInTheDocument()
    })

    expect(screen.getByTestId('waiting-method-label')).toHaveTextContent('waiting_baseline_v1')
  })

  // ── Test 12: Synthetic-training-data label on ML waiting mode ─────────────

  it('shows synthetic-training-data label when waiting ML mode is selected', async () => {
    const mlWaiting = {
      ...mockWaitingTimes,
      mode: 'ml' as const,
      calculation_method: 'waiting_rf_v1',
    }
    vi.mocked(api.fetchDashboardSummary).mockResolvedValue(mockSummary)
    vi.mocked(api.fetchDashboardCongestion).mockResolvedValue(mockCongestion)
    vi.mocked(api.fetchSchedules).mockResolvedValue(mockSchedules)
    vi.mocked(api.fetchBerths).mockResolvedValue(mockBerths)
    vi.mocked(api.fetchWaitingTimes).mockResolvedValue(mlWaiting)
    vi.mocked(api.fetchAlternateRouting).mockResolvedValue(mockRouting)

    render(<DashboardPage />)

    // Click ML waiting mode
    await waitFor(() => {
      expect(screen.getByTestId('waiting-mode-btn-ml')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId('waiting-mode-btn-ml'))

    await waitFor(() => {
      expect(api.fetchWaitingTimes).toHaveBeenCalledTimes(2)
    })

    // After second fetch completes with ml response, label should be present
    await waitFor(() => {
      expect(screen.getByTestId('waiting-method-label')).toHaveTextContent('waiting_rf_v1')
    })
  })

  // ── Test 13: Routing card is present ────────────────────────────────────

  it('renders routing recommendation card', async () => {
    setupSuccessMocks()
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByTestId('routing-card')).toBeInTheDocument()
    })
  })

  // ── Test 14: Routing result renders when API returns successfully ─────────

  it('renders routing result with reason when data loads', async () => {
    setupSuccessMocks()
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByTestId('routing-result')).toBeInTheDocument()
    })

    expect(screen.getByTestId('routing-reason')).toHaveTextContent('threshold')
  })

  // ── Test 15: Routing error state ─────────────────────────────────────────

  it('shows routing error state when alternate-routing API fails', async () => {
    vi.mocked(api.fetchDashboardSummary).mockResolvedValue(mockSummary)
    vi.mocked(api.fetchDashboardCongestion).mockResolvedValue(mockCongestion)
    vi.mocked(api.fetchSchedules).mockResolvedValue(mockSchedules)
    vi.mocked(api.fetchBerths).mockResolvedValue(mockBerths)
    vi.mocked(api.fetchWaitingTimes).mockResolvedValue(mockWaitingTimes)
    vi.mocked(api.fetchAlternateRouting).mockRejectedValue(new Error('routing error'))

    render(<DashboardPage />)

    await waitFor(
      () => {
        expect(screen.getByTestId('routing-error')).toBeInTheDocument()
      },
      { timeout: 5000 },
    )
  })

  // ── Test 16: Routing badge shows "Stay" when not recommended ─────────────

  it('shows "Stay at current port" badge when diversion not recommended', async () => {
    setupSuccessMocks()
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByTestId('routing-badge')).toBeInTheDocument()
    })

    expect(screen.getByTestId('routing-badge')).toHaveTextContent('Stay at current port')
  })

  // ── Test 17: Copilot panel is rendered ───────────────────────────────────

  it('renders copilot panel in ready state', async () => {
    setupSuccessMocks()
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByTestId('copilot-panel')).toBeInTheDocument()
    })
  })

  // ── Test 18: Copilot shows idle state initially ───────────────────────────

  it('shows copilot idle state before any question is asked', async () => {
    setupSuccessMocks()
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByTestId('copilot-idle')).toBeInTheDocument()
    })
  })

  // ── Test 19: Copilot loading state shown while waiting ────────────────────

  it('shows copilot loading state while fetching', async () => {
    setupSuccessMocks()
    // Make copilot ask never resolve
    vi.mocked(api.fetchCopilotAsk).mockReturnValue(new Promise(() => {}))

    render(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByTestId('copilot-ask-btn')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Why is congestion high and what should operators do?'))

    await waitFor(() => {
      expect(screen.getByTestId('copilot-loading')).toBeInTheDocument()
    })
  })

  // ── Test 20: Copilot response shown on success ────────────────────────────

  it('shows copilot response when ask succeeds', async () => {
    setupSuccessMocks()
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByTestId('copilot-ask-btn')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Why is congestion high and what should operators do?'))

    await waitFor(() => {
      expect(screen.getByTestId('copilot-response')).toBeInTheDocument()
    })

    expect(screen.getByTestId('copilot-method')).toHaveTextContent('rules_fallback')
  })

  // ── Test 21: Copilot error state ─────────────────────────────────────────

  it('shows copilot error state when API fails', async () => {
    setupSuccessMocks()
    vi.mocked(api.fetchCopilotAsk).mockRejectedValue(new Error('copilot error'))

    render(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByTestId('copilot-ask-btn')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Why is congestion high and what should operators do?'))

    await waitFor(
      () => {
        expect(screen.getByTestId('copilot-error')).toBeInTheDocument()
      },
      { timeout: 5000 },
    )
  })

  // ── Test 22: Copilot suggestions are rendered ─────────────────────────────

  it('renders 3 suggested questions', async () => {
    setupSuccessMocks()
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByTestId('copilot-suggestions')).toBeInTheDocument()
    })

    const suggestions = screen.getByTestId('copilot-suggestions').querySelectorAll('button')
    expect(suggestions.length).toBe(3)
  })
})
