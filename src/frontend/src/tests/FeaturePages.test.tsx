/**
 * PortFlow AI — Tests for Completed Feature Pages & Approval Guards:
 * - OperationsPlanPage: Adverse plan guard & override checkbox
 * - VesselsPage: 72-hour planning horizon toggle & realistic statuses
 * - MapPage: Interactive Berth Map & Quayside Inspector
 * - CopilotPage: Standalone Copilot Terminal & Context Inspector
 * - OptimizerPage: CP-SAT Solver Studio
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import OperationsPlanPage from '../pages/OperationsPlanPage'
import VesselsPage from '../pages/VesselsPage'
import MapPage from '../pages/MapPage'
import CopilotPage from '../pages/CopilotPage'
import OptimizerPage from '../pages/OptimizerPage'
import * as api from '../services/api'

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof api>()
  return {
    ...actual,
    DEFAULT_PORT_CODE: 'FKPFL',
    fetchBerths: vi.fn(),
    fetchSchedules: vi.fn(),
    fetchWaitingTimes: vi.fn(),
    fetchDashboardCongestion: vi.fn(),
    fetchOperationsPlan: vi.fn(),
    approveOperationsPlan: vi.fn(),
    fetchCopilotAsk: vi.fn(),
  }
})

const mockBerths = {
  port_code: 'FKPFL',
  berths: [
    {
      berth_id: 'b1',
      berth_code: 'B01',
      berth_name: 'Berth Alpha',
      max_length_m: 400.0,
      max_draft_m: 16.0,
      crane_count: 4,
      occupancy_status: 'available' as const,
    },
    {
      berth_id: 'b2',
      berth_code: 'B02',
      berth_name: 'Berth Beta',
      max_length_m: 300.0,
      max_draft_m: 13.5,
      crane_count: 3,
      occupancy_status: 'occupied' as const,
    },
  ],
  total: 2,
}

const mockSchedules = {
  port_code: 'FKPFL',
  scenario: 'baseline',
  schedules: [
    {
      schedule_id: 's1',
      vessel_name: 'FALKERMERE ATLAS',
      imo_number: 'IMO9000001',
      eta: '2026-09-15T06:00:00+00:00',
      expected_containers: 400,
      cargo_type: 'containerised',
      priority: 1,
      preferred_berth_code: 'B01',
      status: 'completed',
      is_synthetic: true,
      compatible_berth_count: 3,
      estimated_waiting_minutes: 60,
    },
    {
      schedule_id: 's2',
      vessel_name: 'FALKERMERE GALE',
      imo_number: 'IMO9000007',
      eta: '2026-09-16T12:00:00+00:00',
      expected_containers: 500,
      cargo_type: 'containerised',
      priority: 2,
      preferred_berth_code: 'B02',
      status: 'completed',
      is_synthetic: true,
      compatible_berth_count: 2,
      estimated_waiting_minutes: 800,
    },
    {
      schedule_id: 's3',
      vessel_name: 'FALKERMERE JUNO',
      imo_number: 'IMO9000010',
      eta: '2026-09-25T12:00:00+00:00', // outside 72h horizon
      expected_containers: 300,
      cargo_type: 'containerised',
      priority: 3,
      preferred_berth_code: 'B02',
      status: 'completed',
      is_synthetic: true,
      compatible_berth_count: 2,
      estimated_waiting_minutes: 30,
    },
  ],
  total: 3,
}

const mockWaitingTimes = {
  port_code: 'FKPFL',
  horizon_hours: 72,
  mode: 'baseline' as const,
  vessels: [
    {
      schedule_id: 's2',
      vessel_id: 'v2',
      vessel_name: 'FALKERMERE GALE',
      eta: '2026-09-16T12:00:00+00:00',
      priority: 2,
      predicted_waiting_hours: 13.3,
      risk_level: 'high' as const,
      method: 'waiting_baseline_v1',
      model_version: 'baseline',
      data_source: 'synthetic',
      is_synthetic: true,
      limitations: '',
      primary_cause: 'high queue',
    },
    {
      schedule_id: 's1',
      vessel_id: 'v1',
      vessel_name: 'FALKERMERE ATLAS',
      eta: '2026-09-15T06:00:00+00:00',
      priority: 1,
      predicted_waiting_hours: 1.0,
      risk_level: 'low' as const,
      method: 'waiting_baseline_v1',
      model_version: 'baseline',
      data_source: 'synthetic',
      is_synthetic: true,
      limitations: '',
      primary_cause: null,
    },
  ],
  total: 2,
  is_synthetic: true,
  data_source: 'synthetic',
  calculation_method: 'baseline_rule_v1',
  limitations: '',
}

const mockCongestion = {
  port_code: 'FKPFL',
  horizon_hours: 72,
  windows: [],
  selected_scenario: 'baseline' as const,
}

describe('OperationsPlanPage — Approval Guard for Adverse Plans', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('blocks approval and displays adverse warning banner when wait reduction is <= 0 or unscheduled vessels exist', async () => {
    vi.mocked(api.fetchOperationsPlan).mockResolvedValue({
      plan_id: 'plan-123',
      port_code: 'FKPFL',
      horizon_hours: 72,
      generated_at: new Date().toISOString(),
      assignments: [],
      unscheduled: [
        {
          schedule_id: 's99',
          vessel_id: 'v99',
          vessel_name: 'UNSCHEDULED SHIP',
          priority: 2,
          reason: 'No berth available',
        },
      ],
      metrics: {
        total_vessels: 10,
        scheduled_count: 8,
        unscheduled_count: 2,
        fifo_total_wait_minutes: 500,
        opt_total_wait_minutes: 501,
        wait_reduction_minutes: -1,
        berth_utilization_pct: 0.65,
        solve_status: 'FEASIBLE',
        solve_wall_seconds: 1.2,
      },
      explanation: 'Solver finished with negative wait reduction.',
      is_synthetic: true,
      assumptions: [],
    })

    render(
      <BrowserRouter>
        <OperationsPlanPage />
      </BrowserRouter>
    )

    // Click Generate Plan button
    fireEvent.click(screen.getByRole('button', { name: /Generate 72-hour Plan/i }))

    await waitFor(() => {
      expect(screen.getByTestId('plan-adverse-warning')).toBeInTheDocument()
    })

    // Verify approve button is disabled
    const approveBtn = screen.getByTestId('approve-plan-btn')
    expect(approveBtn).toBeDisabled()
    expect(screen.getByText('Override acknowledgment required')).toBeInTheDocument()

    // Check the override checkbox
    const checkbox = screen.getByTestId('override-checkbox')
    fireEvent.click(checkbox)

    // Verify approve button is now enabled
    expect(approveBtn).not.toBeDisabled()
  })
})

describe('VesselsPage — 72-Hour Horizon and Status Semantics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.fetchSchedules).mockResolvedValue(mockSchedules)
    vi.mocked(api.fetchWaitingTimes).mockResolvedValue(mockWaitingTimes)
  })

  it('filters to 72-hour planning horizon by default and displays realistic statuses', async () => {
    render(<VesselsPage />)

    await waitFor(() => {
      expect(screen.getByText('FALKERMERE ATLAS')).toBeInTheDocument()
    })

    // In 72h horizon: ATLAS (Sep 15) and GALE (Sep 16) are shown, JUNO (Sep 25) is filtered out
    expect(screen.getByText('FALKERMERE ATLAS')).toBeInTheDocument()
    expect(screen.getByText('FALKERMERE GALE')).toBeInTheDocument()
    expect(screen.queryByText('FALKERMERE JUNO')).not.toBeInTheDocument()

    // Statuses should be derived (in_port for earliest, delayed for GALE with high wait) rather than all 'completed'
    expect(screen.getByText('in_port')).toBeInTheDocument()
    expect(screen.getByText('delayed')).toBeInTheDocument()

    // Switch to All Records
    fireEvent.click(screen.getByText(/All Records/))

    await waitFor(() => {
      expect(screen.getByText('FALKERMERE JUNO')).toBeInTheDocument()
    })
  })
})

describe('MapPage — Interactive Berth Layout and Inspector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.fetchBerths).mockResolvedValue(mockBerths)
    vi.mocked(api.fetchSchedules).mockResolvedValue(mockSchedules)
    vi.mocked(api.fetchDashboardCongestion).mockResolvedValue(mockCongestion)
  })

  it('renders interactive berth quayside layout and inspects selected berth', async () => {
    render(<MapPage />)

    await waitFor(() => {
      expect(screen.getByText('Quayside Berth Schematic')).toBeInTheDocument()
    })

    expect(screen.getByText('Berth Inspector')).toBeInTheDocument()
    expect(screen.getAllByText(/Berth Alpha/).length).toBeGreaterThan(0)
  })
})

describe('CopilotPage — Standalone Copilot Terminal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.fetchCopilotAsk).mockResolvedValue({
      answer: 'Diversion to Port of Roskilde recommended to avoid 45.4h delay.',
      method: 'rules_fallback',
      provider_available: true,
      question: 'Should vessels divert?',
      port_code: 'FKPFL',
      scenario: 'baseline',
      context_snapshot: {
        port_code: 'FKPFL',
        port_name: 'Port of Falkermere',
        scenario: 'baseline',
        peak_risk_level: 'high',
        peak_congestion_risk_pct: 65,
        active_vessel_count: 5,
        arrivals_next_24h: 3,
        avg_estimated_waiting_minutes: 80,
        high_risk_vessels: ['FALKERMERE GALE'],
        top_waiting_vessel: 'FALKERMERE GALE',
        top_waiting_hours: 45.4,
        top_waiting_cause: 'queue pressure',
        routing_recommended: true,
        routing_reason: 'Saves 34.4 hours.',
        top_rule_drivers: ['3 arrivals in 6h window'],
      },
    })
  })

  it('allows asking operational questions and renders answer with context inspector', async () => {
    render(<CopilotPage />)

    expect(screen.getByText(/AI Operations Copilot Terminal/)).toBeInTheDocument()

    // Click quick prompt
    fireEvent.click(screen.getByText('Should we consider routing vessels to an alternate port?'))

    await waitFor(() => {
      expect(screen.getByText(/Diversion to Port of Roskilde recommended/)).toBeInTheDocument()
    })

    // Inspect structured context
    expect(screen.getByText('Divert')).toBeInTheDocument()
  })
})

describe('OptimizerPage — CP-SAT Solver Studio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.fetchOperationsPlan).mockResolvedValue({
      plan_id: 'opt-999',
      port_code: 'FKPFL',
      horizon_hours: 72,
      generated_at: new Date().toISOString(),
      assignments: [
        {
          schedule_id: 's1',
          vessel_id: 'v1',
          vessel_name: 'FALKERMERE ATLAS',
          berth_id: 'b1',
          berth_code: 'B01',
          start_time: '2026-09-15T08:00:00+00:00',
          end_time: '2026-09-15T14:00:00+00:00',
          cranes_assigned: 3,
          service_minutes: 360,
          waiting_minutes: 30,
          priority: 1,
          explanation: 'Assigned to Berth Alpha',
        },
      ],
      unscheduled: [],
      metrics: {
        total_vessels: 5,
        scheduled_count: 5,
        unscheduled_count: 0,
        fifo_total_wait_minutes: 400,
        opt_total_wait_minutes: 250,
        wait_reduction_minutes: 150,
        berth_utilization_pct: 0.72,
        solve_status: 'OPTIMAL',
        solve_wall_seconds: 0.85,
      },
      explanation: 'Optimal solution found.',
      is_synthetic: true,
      assumptions: [],
    })
  })

  it('runs CP-SAT optimizer simulation and displays benchmark results', async () => {
    render(
      <BrowserRouter>
        <OptimizerPage />
      </BrowserRouter>
    )

    expect(screen.getByText('CP-SAT Optimiser Studio')).toBeInTheDocument()

    // Execute solver button
    fireEvent.click(screen.getByRole('button', { name: /Execute CP-SAT Optimization/i }))

    await waitFor(() => {
      expect(screen.getByText('OPTIMAL')).toBeInTheDocument()
      expect(screen.getByText('150 min')).toBeInTheDocument()
      expect(screen.getByText('Benchmark Comparison: CP-SAT vs FIFO Heuristic')).toBeInTheDocument()
    })
  })
})
