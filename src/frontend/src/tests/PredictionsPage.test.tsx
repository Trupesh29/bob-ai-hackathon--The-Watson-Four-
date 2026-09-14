import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import PredictionsPage from '../pages/PredictionsPage'
import * as api from '../services/api'

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof api>()
  return {
    ...actual,
    DEFAULT_PORT_CODE: 'FKPFL',
    fetchDashboardCongestion: vi.fn(),
    fetchWaitingTimes: vi.fn(),
    fetchBerths: vi.fn(),
  }
})

const mockCongestion = {
  port_code: 'FKPFL',
  horizon_hours: 72,
  windows: [
    {
      window_start: '2026-09-15T00:00:00+00:00',
      window_end: '2026-09-15T06:00:00+00:00',
      risk_probability: 0.85,
      risk_level: 'high' as const,
      estimated_queue_count: 5,
      affected_schedule_ids: [],
      rule_drivers: ['7 vessels arriving in window', '2 berths available'],
      ml_label: 'high',
      ml_confidence: 0.88,
      ml_model_version: 'rf_v1',
    },
  ],
  selected_scenario: 'baseline' as const,
  selected_mode: 'ml' as const,
  is_synthetic: true,
  calculation_method: 'waiting_rf_v1',
  data_source: 'synthetic',
  limitations: 'Synthetic simulation only',
}

const mockWaitingTimes = {
  port_code: 'FKPFL',
  horizon_hours: 72,
  mode: 'ml' as const,
  calculation_method: 'waiting_rf_v1',
  vessels: [
    {
      vessel_id: 'v1',
      schedule_id: 's1',
      vessel_name: 'FALKERMERE ATLAS',
      eta: '2026-09-15T08:00:00+00:00',
      priority: 1,
      predicted_waiting_hours: 8.4,
      risk_level: 'high' as const,
      primary_cause: 'Arrival cluster overlapping constrained crane capacity',
    },
    {
      vessel_id: 'v2',
      schedule_id: 's2',
      vessel_name: 'PACIFIC HARBOR',
      eta: '2026-09-15T12:00:00+00:00',
      priority: 3,
      predicted_waiting_hours: 2.1,
      risk_level: 'medium' as const,
      primary_cause: 'Draft restriction for deep quays',
    },
  ],
  high_risk_threshold_hours: 6.0,
  is_synthetic: true,
  data_source: 'synthetic',
}

const mockBerths = {
  port_code: 'FKPFL',
  berths: [
    {
      berth_id: 'b1',
      berth_code: 'B01',
      berth_name: 'Berth 1',
      max_length_m: 400.0,
      max_draft_m: 16.0,
      crane_count: 4,
      occupancy_status: 'free' as const,
    },
  ],
  total: 1,
}

describe('PredictionsPage — Forecasts & Risk Explanation Drawer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.fetchDashboardCongestion).mockResolvedValue(mockCongestion)
    vi.mocked(api.fetchWaitingTimes).mockResolvedValue(mockWaitingTimes)
    vi.mocked(api.fetchBerths).mockResolvedValue(mockBerths)
  })

  it('renders forecast summary cards with model method and confidence range', async () => {
    render(<PredictionsPage />)

    await waitFor(() => {
      expect(screen.getByText('Predictions & Forecast Studio')).toBeInTheDocument()
    })

    expect(screen.getByText('Peak Risk')).toBeInTheDocument()
    expect(screen.getByText('High-Risk Vessels')).toBeInTheDocument()
    expect(screen.getByText('Random Forest')).toBeInTheDocument()
    expect(screen.getByText('Confidence Range')).toBeInTheDocument()
    expect(screen.getByText('± 18%')).toBeInTheDocument()
    expect(screen.getByText(/Forecast horizon: 72 hours/i)).toBeInTheDocument()
    expect(screen.getByText(/Data source: Synthetic demo data/i)).toBeInTheDocument()
  })

  it('renders prediction table rows and opens risk explanation drawer on click', async () => {
    render(<PredictionsPage />)

    await waitFor(() => {
      expect(screen.getByText('FALKERMERE ATLAS')).toBeInTheDocument()
    })

    expect(screen.getByText('8.4h')).toBeInTheDocument()
    expect(screen.getByText('PACIFIC HARBOR')).toBeInTheDocument()

    // Click "View recommendation" for FALKERMERE ATLAS
    const viewButtons = screen.getAllByText(/View recommendation →/i)
    fireEvent.click(viewButtons[0])

    // Drawer should open with detailed breakdown
    await waitFor(() => {
      expect(screen.getByText('ML Risk Attribution')).toBeInTheDocument()
      expect(screen.getByText(/Vessel: FALKERMERE ATLAS/i)).toBeInTheDocument()
    })

    expect(screen.getByText('8.4 hours')).toBeInTheDocument()
    expect(screen.getByText('Contributing Factors:')).toBeInTheDocument()
    expect(screen.getByText(/7 vessels/i)).toBeInTheDocument()
    expect(screen.getByText(/2 compatible berths/i)).toBeInTheDocument()
    expect(screen.getByText('Suggested Next Step:')).toBeInTheDocument()
    expect(screen.getByText('Review proposed berth assignment')).toBeInTheDocument()

    // Close drawer
    const closeBtn = screen.getByLabelText('Close drawer')
    fireEvent.click(closeBtn)

    await waitFor(() => {
      expect(screen.queryByText('ML Risk Attribution')).not.toBeInTheDocument()
    })
  })
})
