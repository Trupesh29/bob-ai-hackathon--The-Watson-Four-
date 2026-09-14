import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import VesselsPage from '../pages/VesselsPage'
import * as api from '../services/api'

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof api>()
  return {
    ...actual,
    DEFAULT_PORT_CODE: 'FKPFL',
    fetchSchedules: vi.fn(),
    fetchWaitingTimes: vi.fn(),
  }
})

const mockSchedules = {
  port_code: 'FKPFL',
  scenario: 'baseline',
  total: 3,
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
      vessel_name: 'PACIFIC WAVE',
      imo_number: 'IMO9000022',
      eta: '2026-09-17T04:00:00+00:00',
      expected_containers: 250,
      cargo_type: 'bulk',
      priority: 3,
      preferred_berth_code: null,
      status: 'unscheduled',
      is_synthetic: true,
      compatible_berth_count: 1,
      estimated_waiting_minutes: 120,
    },
  ],
}

const mockWaitingTimes = {
  port_code: 'FKPFL',
  horizon_hours: 72,
  mode: 'baseline' as const,
  calculation_method: 'baseline_rule_v1',
  vessels: [
    {
      schedule_id: 's1',
      vessel_id: 'v1',
      vessel_name: 'FALKERMERE ATLAS',
      eta: '2026-09-15T06:00:00+00:00',
      priority: 1,
      predicted_waiting_hours: 8.4,
      risk_level: 'high' as const,
      primary_cause: 'Simultaneous morning arrival cluster',
    },
    {
      schedule_id: 's2',
      vessel_id: 'v2',
      vessel_name: 'FALKERMERE GALE',
      eta: '2026-09-16T12:00:00+00:00',
      priority: 2,
      predicted_waiting_hours: 13.3,
      risk_level: 'high' as const,
      primary_cause: 'High quayside queue pressure',
    },
    {
      schedule_id: 's3',
      vessel_id: 'v3',
      vessel_name: 'PACIFIC WAVE',
      eta: '2026-09-17T04:00:00+00:00',
      priority: 3,
      predicted_waiting_hours: 2.0,
      risk_level: 'low' as const,
      primary_cause: null,
    },
  ],
  total: 3,
  is_synthetic: true,
  data_source: 'synthetic',
}

describe('VesselsPage — Operational Vessel List & Interactive Filters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.fetchSchedules).mockResolvedValue(mockSchedules)
    vi.mocked(api.fetchWaitingTimes).mockResolvedValue(mockWaitingTimes)
  })

  it('renders page header, operational scenario pills, and metric cards', async () => {
    render(<VesselsPage />)

    await waitFor(() => {
      expect(screen.getByText('Vessel Schedule')).toBeInTheDocument()
    })

    // Metric cards
    expect(screen.getByText('Total in Scope')).toBeInTheDocument()
    expect(screen.getByText('Critical Priority')).toBeInTheDocument()
    expect(screen.getByText('In Port')).toBeInTheDocument()
    expect(screen.getByText('Scheduled')).toBeInTheDocument()
    expect(screen.getByText('Avg Predicted Wait')).toBeInTheDocument()

    // Vessels present in table
    expect(screen.getByText('FALKERMERE ATLAS')).toBeInTheDocument()
    expect(screen.getByText('FALKERMERE GALE')).toBeInTheDocument()
    expect(screen.getByText('PACIFIC WAVE')).toBeInTheDocument()
  })

  it('filters vessels by search input (name or IMO)', async () => {
    render(<VesselsPage />)

    await waitFor(() => {
      expect(screen.getByText('FALKERMERE ATLAS')).toBeInTheDocument()
    })

    const searchInput = screen.getByLabelText('Search vessel')
    fireEvent.change(searchInput, { target: { value: 'PACIFIC' } })

    expect(screen.getByText('PACIFIC WAVE')).toBeInTheDocument()
    expect(screen.queryByText('FALKERMERE ATLAS')).not.toBeInTheDocument()
    expect(screen.queryByText('FALKERMERE GALE')).not.toBeInTheDocument()

    // Test IMO search
    fireEvent.change(searchInput, { target: { value: 'IMO9000001' } })
    expect(screen.getByText('FALKERMERE ATLAS')).toBeInTheDocument()
    expect(screen.queryByText('PACIFIC WAVE')).not.toBeInTheDocument()
  })

  it('filters vessels by risk level dropdown', async () => {
    render(<VesselsPage />)

    await waitFor(() => {
      expect(screen.getByText('FALKERMERE ATLAS')).toBeInTheDocument()
    })

    const riskSelect = screen.getByLabelText('Risk level')
    fireEvent.change(riskSelect, { target: { value: 'low' } })

    expect(screen.getByText('PACIFIC WAVE')).toBeInTheDocument()
    expect(screen.queryByText('FALKERMERE ATLAS')).not.toBeInTheDocument()
    expect(screen.queryByText('FALKERMERE GALE')).not.toBeInTheDocument()
  })

  it('filters vessels by priority dropdown and resets correctly', async () => {
    render(<VesselsPage />)

    await waitFor(() => {
      expect(screen.getByText('FALKERMERE ATLAS')).toBeInTheDocument()
    })

    const prioritySelect = screen.getByLabelText('Priority')
    fireEvent.change(prioritySelect, { target: { value: '1' } })

    // Only Priority 1 (ATLAS) should remain
    expect(screen.getByText('FALKERMERE ATLAS')).toBeInTheDocument()
    expect(screen.queryByText('FALKERMERE GALE')).not.toBeInTheDocument()
    expect(screen.queryByText('PACIFIC WAVE')).not.toBeInTheDocument()

    // Click Reset
    const resetBtn = screen.getByText('Reset')
    fireEvent.click(resetBtn)

    expect(screen.getByText('FALKERMERE ATLAS')).toBeInTheDocument()
    expect(screen.getByText('FALKERMERE GALE')).toBeInTheDocument()
    expect(screen.getByText('PACIFIC WAVE')).toBeInTheDocument()
  })

  it('opens vessel detail modal on clicking "View detail" and closes it', async () => {
    render(<VesselsPage />)

    await waitFor(() => {
      expect(screen.getByText('FALKERMERE ATLAS')).toBeInTheDocument()
    })

    const viewButtons = screen.getAllByText('View detail')
    fireEvent.click(viewButtons[0])

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Vessel & Cargo Specifications')).toBeInTheDocument()
    })

    expect(screen.getByText(/400 TEU/i)).toBeInTheDocument()
    expect(screen.getByText('Simultaneous morning arrival cluster')).toBeInTheDocument()
    expect(screen.getByText('Run CP-SAT Berth Optimizer')).toBeInTheDocument()

    // Close modal
    const closeBtn = screen.getByLabelText('Close detail modal')
    fireEvent.click(closeBtn)

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})
