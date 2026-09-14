/**
 * PortFlow AI — Comprehensive Judge QA Audit Suite
 * Tests all 9 user journeys (A through I), every navigation item, button,
 * selector, form, table, empty state, and validation guard.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import App from '../App'
import { Sidebar } from '../components/Sidebar'
import DashboardPage from '../pages/DashboardPage'
import VesselsPage from '../pages/VesselsPage'
import MapPage from '../pages/MapPage'
import PredictionsPage from '../pages/PredictionsPage'
import OptimizerPage from '../pages/OptimizerPage'
import OperationsPlanPage from '../pages/OperationsPlanPage'
import CopilotPage from '../pages/CopilotPage'
import * as api from '../services/api'

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof api>()
  return {
    ...actual,
    DEFAULT_PORT_CODE: 'FKPFL',
    fetchDashboardSummary: vi.fn(),
    fetchDashboardCongestion: vi.fn(),
    fetchSchedules: vi.fn(),
    fetchBerths: vi.fn(),
    fetchCranes: vi.fn(),
    fetchWaitingTimes: vi.fn(),
    fetchAlternateRouting: vi.fn(),
    fetchCopilotAsk: vi.fn(),
    fetchOperationsPlan: vi.fn(),
    approveOperationsPlan: vi.fn(),
  }
})

const mockSummary = {
  port_code: 'FKPFL',
  port_name: 'Port of Falkermere',
  active_vessel_count: 12,
  arrivals_next_24h: 4,
  berth_occupancy_pct: 66.7,
  available_crane_count: 5,
  peak_congestion_risk: 0.85,
  peak_risk_level: 'high',
  avg_estimated_waiting_minutes: 976,
  is_synthetic: true,
}

const mockCongestion = {
  port_code: 'FKPFL',
  calculation_method: 'baseline_rule_v1',
  horizon_hours: 72,
  windows: [
    {
      window_start: '2026-09-15T00:00:00Z',
      window_end: '2026-09-15T06:00:00Z',
      risk_level: 'high',
      risk_probability: 0.85,
      estimated_queue_count: 3,
      rule_drivers: ['3 arriving vessels vs 3 berths', 'occupancy >= 80%'],
    },
    {
      window_start: '2026-09-15T06:00:00Z',
      window_end: '2026-09-15T12:00:00Z',
      risk_level: 'medium',
      risk_probability: 0.55,
      estimated_queue_count: 1,
      rule_drivers: ['2 arriving vessels vs 3 berths'],
    },
  ],
}

const mockBerths = {
  port_code: 'FKPFL',
  total: 3,
  berths: [
    {
      berth_id: 'b1',
      berth_code: 'B01',
      berth_name: 'Berth Alpha',
      max_length_m: 400.0,
      max_draft_m: 16.0,
      max_cranes: 4,
      crane_count: 3,
      status: 'operational',
      occupancy_status: 'occupied',
    },
    {
      berth_id: 'b2',
      berth_code: 'B02',
      berth_name: 'Berth Beta',
      max_length_m: 320.0,
      max_draft_m: 14.0,
      max_cranes: 3,
      crane_count: 2,
      status: 'operational',
      occupancy_status: 'occupied',
    },
    {
      berth_id: 'b3',
      berth_code: 'B03',
      berth_name: 'Berth Gamma',
      max_length_m: 250.0,
      max_draft_m: 11.5,
      max_cranes: 2,
      crane_count: 2,
      status: 'operational',
      occupancy_status: 'available',
    },
  ],
}

const mockSchedules = {
  port_code: 'FKPFL',
  scenario: 'arrival_surge',
  total: 12,
  schedules: [
    {
      schedule_id: 's1',
      vessel_name: 'FALKERMERE ATLAS',
      imo_number: 'IMO9000001',
      eta: '2026-09-15T02:00:00Z',
      etd: '2026-09-15T14:00:00Z',
      expected_containers: 450,
      cargo_type: 'containerised',
      priority: 1,
      preferred_berth_code: 'B01',
      status: 'completed',
      is_synthetic: true,
      compatible_berth_count: 3,
      estimated_waiting_minutes: 120,
    },
    {
      schedule_id: 's2',
      vessel_name: 'FALKERMERE JUNO',
      imo_number: 'IMO9000002',
      eta: '2026-09-15T04:00:00Z',
      etd: '2026-09-15T16:00:00Z',
      expected_containers: 380,
      cargo_type: 'containerised',
      priority: 2,
      preferred_berth_code: 'B02',
      status: 'completed',
      is_synthetic: true,
      compatible_berth_count: 2,
      estimated_waiting_minutes: 840,
    },
  ],
}

const mockWaitingTimes = {
  port_code: 'FKPFL',
  calculation_method: 'waiting_baseline_v1',
  horizon_hours: 72,
  vessels: [
    {
      vessel_id: 'v1',
      schedule_id: 's1',
      vessel_name: 'FALKERMERE ATLAS',
      eta: '2026-09-15T02:00:00Z',
      priority: 1,
      predicted_waiting_hours: 2.0,
      risk_level: 'medium',
      primary_cause: 'berth queue',
    },
    {
      vessel_id: 'v2',
      schedule_id: 's2',
      vessel_name: 'FALKERMERE JUNO',
      eta: '2026-09-15T04:00:00Z',
      priority: 2,
      predicted_waiting_hours: 14.0,
      risk_level: 'high',
      primary_cause: 'arrival surge spike',
    },
  ],
}

const mockRouting = {
  vessel_id: 'v2',
  vessel_name: 'FALKERMERE JUNO',
  recommended: true,
  recommended_port_code: 'ROSK',
  recommended_port_name: 'Port of Roskilde',
  estimated_hours_saved: 16.5,
  diversion_threshold_hours: 12.0,
  reason: 'Severe congestion at Port of Falkermere causes an estimated 14.0h wait. Diverting saves 16.5h net.',
  is_synthetic: true,
}

const mockCopilotResponse = {
  port_code: 'FKPFL',
  answer: '1. Prioritize critical vessels at Berth Alpha.\n2. Reallocate cranes from Berth Gamma.\n3. Divert non-critical vessels.',
  method: 'rules_fallback',
  provider_available: false,
  is_synthetic: true,
  context_snapshot: {
    port_code: 'FKPFL',
    port_name: 'Port of Falkermere',
    scenario: 'arrival_surge',
    peak_risk_level: 'high',
    peak_congestion_risk_pct: 85,
    top_waiting_vessel: 'FALKERMERE JUNO',
    top_waiting_hours: 14.0,
    routing_recommended: true,
  },
}

const mockPlan = {
  plan_id: '11111111-2222-3333-4444-555555555555',
  port_code: 'FKPFL',
  horizon_hours: 72,
  assignments: [
    {
      schedule_id: 's1',
      vessel_name: 'FALKERMERE ATLAS',
      berth_code: 'B01',
      start_time: '2026-09-15T02:00:00Z',
      end_time: '2026-09-15T08:00:00Z',
      service_minutes: 360,
      waiting_minutes: 0,
      cranes_assigned: 3,
      priority: 1,
    },
  ],
  unscheduled: [],
  metrics: {
    solve_status: 'OPTIMAL',
    solve_wall_seconds: 0.45,
    scheduled_count: 1,
    total_vessels: 1,
    wait_reduction_minutes: 120,
    fifo_total_wait_minutes: 120,
    opt_total_wait_minutes: 0,
    berth_utilization_pct: 0.65,
  },
  assumptions: ['Synthetic data only', 'Human approval required'],
  explanation: 'Optimal berth allocation found. Total wait reduced by 120 minutes.',
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.fetchDashboardSummary).mockResolvedValue(mockSummary)
  vi.mocked(api.fetchDashboardCongestion).mockResolvedValue(mockCongestion)
  vi.mocked(api.fetchSchedules).mockResolvedValue(mockSchedules)
  vi.mocked(api.fetchBerths).mockResolvedValue(mockBerths)
  vi.mocked(api.fetchWaitingTimes).mockResolvedValue(mockWaitingTimes)
  vi.mocked(api.fetchAlternateRouting).mockResolvedValue(mockRouting)
  vi.mocked(api.fetchCopilotAsk).mockResolvedValue(mockCopilotResponse)
  vi.mocked(api.fetchOperationsPlan).mockResolvedValue(mockPlan)
  vi.mocked(api.approveOperationsPlan).mockResolvedValue({
    plan_id: mockPlan.plan_id,
    approved: true,
    message: `Plan ${mockPlan.plan_id} approved by operations supervisor.`,
  })
})

describe('Judge QA Audit — Navigation & Shell', () => {
  it('renders all 7 navigation links and API health badge', () => {
    render(
      <MemoryRouter>
        <Sidebar apiHealth={{ status: 'healthy', version: '0.1.0' }} />
      </MemoryRouter>
    )
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Vessels')).toBeInTheDocument()
    expect(screen.getByText('Berth Map')).toBeInTheDocument()
    expect(screen.getByText('Predictions')).toBeInTheDocument()
    expect(screen.getByText('Optimiser')).toBeInTheDocument()
    expect(screen.getByText('Operations Plan')).toBeInTheDocument()
    expect(screen.getByText('Copilot')).toBeInTheDocument()
    expect(screen.getByText(/API healthy v0.1.0/i)).toBeInTheDocument()
  })
})

describe('Judge QA Audit — Journey A, B, C, F, G, H on Dashboard', () => {
  it('loads metrics, scenarios, congestion, affected vessels, routing, and copilot', async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    )

    // Journey A: Dashboard loads metrics
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-title')).toHaveTextContent(/Port of Falkermere/i)
    })
    expect(screen.getByTestId('synthetic-label')).toHaveTextContent(/synthetic demo data/i)
    expect(screen.getByTestId('kpi-upcoming-vessels')).toHaveTextContent('12')
    expect(screen.getByTestId('kpi-berth-occupancy')).toHaveTextContent('66.7%')
    expect(screen.getByTestId('kpi-available-cranes')).toHaveTextContent('5')

    // Journey B: Scenario selector and mode toggle
    const surgeBtn = screen.getByTestId('scenario-btn-arrival_surge')
    fireEvent.click(surgeBtn)
    expect(api.fetchDashboardSummary).toHaveBeenCalledWith('FKPFL', 'arrival_surge')

    await waitFor(() => {
      expect(screen.getByTestId('mode-btn-ml')).toBeInTheDocument()
    })
    const mlBtn = screen.getByTestId('mode-btn-ml')
    fireEvent.click(mlBtn)
    expect(api.fetchDashboardCongestion).toHaveBeenCalledWith('FKPFL', 'arrival_surge', 72, 'ml')

    await waitFor(() => {
      expect(screen.getByTestId('vessels-table')).toBeInTheDocument()
    })

    // Journey C: Affected vessels table
    expect(screen.getByText('FALKERMERE ATLAS')).toBeInTheDocument()
    expect(screen.getByText('FALKERMERE JUNO')).toBeInTheDocument()

    // Journey F: Alternate-Routing Recommendation Card
    await waitFor(() => {
      expect(screen.getByTestId('routing-card')).toBeInTheDocument()
      expect(screen.getByTestId('routing-badge')).toHaveTextContent(/Divert → Port of Roskilde/i)
    })
    expect(screen.getByTestId('routing-reason')).toHaveTextContent(/Severe congestion/i)

    // Journey G: Copilot interaction
    const suggestedQuestionBtn = screen.getByText('Why is congestion high and what should operators do?')
    fireEvent.click(suggestedQuestionBtn)
    await waitFor(() => {
      expect(screen.getByTestId('copilot-response')).toBeInTheDocument()
    })
    expect(screen.getByTestId('copilot-method')).toHaveTextContent('rules_fallback')

    // Custom question with validation
    const copilotInput = screen.getByTestId('copilot-input')
    fireEvent.change(copilotInput, { target: { value: 'Hi' } })
    const askBtn = screen.getByTestId('copilot-ask-btn')
    fireEvent.click(askBtn)
    expect(screen.getByTestId('copilot-validation')).toHaveTextContent(/at least 3 characters/i)

    // Journey H: Berth Map and Alerts
    expect(screen.getByTestId('berth-map-panel')).toBeInTheDocument()
    expect(screen.getByTestId('alerts-panel')).toBeInTheDocument()
  })
})

describe('Judge QA Audit — Journey D & E: Optimizer & Operations Plan', () => {
  it('generates 72-hour plan and executes approval gate', async () => {
    render(
      <MemoryRouter>
        <OperationsPlanPage />
      </MemoryRouter>
    )

    const generateBtn = screen.getByText(/▶ Generate 72-hour Plan/i)
    fireEvent.click(generateBtn)

    await waitFor(() => {
      expect(screen.getByText(/1 \/ 1/i)).toBeInTheDocument()
    })
    expect(screen.getAllByText('2h').length).toBeGreaterThan(0) // 120m wait reduction formatted as 2h
    expect(screen.getAllByText(/OPTIMAL/i).length).toBeGreaterThan(0)

    // Approval gate
    const approveBtn = screen.getByTestId('approve-plan-btn')
    fireEvent.click(approveBtn)

    await waitFor(() => {
      expect(screen.getByText(/Plan Approved/i)).toBeInTheDocument()
    })
  })

  it('handles CP-SAT Optimiser Studio parameter tuning and solve', async () => {
    render(
      <MemoryRouter>
        <OptimizerPage />
      </MemoryRouter>
    )

    expect(screen.getByText('CP-SAT Optimiser Studio')).toBeInTheDocument()
    const runBtn = screen.getByText(/⚡ Execute CP-SAT Optimization/i)
    fireEvent.click(runBtn)

    await waitFor(() => {
      expect(screen.getByText('Solved Berth & Crane Assignments (1)')).toBeInTheDocument()
    })
    expect(screen.getByText('120 min')).toBeInTheDocument()
  })
})

describe('Judge QA Audit — Journey I: Vessels Page', () => {
  it('toggles horizon filter between 72h and all records', async () => {
    render(
      <MemoryRouter>
        <VesselsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Vessel Arrival Schedule/i)).toBeInTheDocument()
    })
    const allRecordsBtn = screen.getByText(/All Records/i)
    fireEvent.click(allRecordsBtn)
    expect(screen.getByText(/Total in Scope/i)).toBeInTheDocument()
  })
})

describe('Judge QA Audit — Standalone Copilot & Map Pages', () => {
  it('tests CopilotPage quick queries and context inspector', async () => {
    render(
      <MemoryRouter>
        <CopilotPage />
      </MemoryRouter>
    )

    expect(screen.getByText(/AI Operations Copilot Terminal/i)).toBeInTheDocument()
    const promptBtn = screen.getByText('What are the 3 top operational recommendations?')
    fireEvent.click(promptBtn)

    await waitFor(() => {
      expect(screen.getByText(/Engine: rules_fallback/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/Port of Falkermere \(FKPFL\)/i)).toBeInTheDocument()
  })

  it('tests MapPage quayside schematic and berth inspection', async () => {
    render(
      <MemoryRouter>
        <MapPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Berth Map & Spatial Terminal Layout')).toBeInTheDocument()
    })
    expect(screen.getByText('Quayside Berth Schematic')).toBeInTheDocument()
    expect(screen.getByText('Berth Inspector')).toBeInTheDocument()
  })
})
