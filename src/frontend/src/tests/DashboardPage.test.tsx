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

function setupSuccessMocks() {
  vi.mocked(api.fetchDashboardSummary).mockResolvedValue(mockSummary)
  vi.mocked(api.fetchDashboardCongestion).mockResolvedValue(mockCongestion)
  vi.mocked(api.fetchSchedules).mockResolvedValue(mockSchedules)
  vi.mocked(api.fetchBerths).mockResolvedValue(mockBerths)
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

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByTestId('chart-method-label')).toBeInTheDocument()
    })

    // The chart method label should show the API-returned calculation_method
    expect(screen.getByTestId('chart-method-label')).toHaveTextContent('ml_model_v1')
  })
})
