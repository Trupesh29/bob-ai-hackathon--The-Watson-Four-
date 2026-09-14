import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import MapPage from '../pages/MapPage'
import * as api from '../services/api'

vi.mock('../services/api')

describe('MapPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.fetchBerths).mockResolvedValue({
      port_code: 'FALK',
      timestamp: new Date().toISOString(),
      berths: [
        {
          berth_id: '1',
          berth_code: 'B01',
          berth_name: 'Berth Alpha',
          max_draft_m: 16,
          max_length_m: 400,
          crane_count: 4,
          occupancy_status: 'occupied',
          available_at: '2026-10-10T14:00:00Z'
        },
        {
          berth_id: '2',
          berth_code: 'B02',
          berth_name: 'Berth Beta',
          max_draft_m: 14,
          max_length_m: 300,
          crane_count: 3,
          occupancy_status: 'available',
          available_at: '2026-10-10T14:00:00Z'
        }
      ]
    })
    vi.mocked(api.fetchSchedules).mockResolvedValue({
      port_code: 'FALK',
      scenario: 'baseline',
      timestamp: new Date().toISOString(),
      schedules: []
    })
    vi.mocked(api.fetchDashboardCongestion).mockResolvedValue({
      port_code: 'FALK',
      scenario: 'baseline',
      horizon_hours: 72,
      peak_risk_level: 'low',
      windows: []
    })
  })

  it('renders MapPage, loads berths, and shows inspector', async () => {
    render(<MapPage />)
    
    // Shows loading initially
    expect(screen.getByText('Loading berth layout map…')).toBeInTheDocument()

    // Wait for the data to load
    await waitFor(() => {
      expect(screen.getAllByText(/Berth Alpha/i)[0]).toBeInTheDocument()
      expect(screen.getAllByText(/Berth Beta/i)[0]).toBeInTheDocument()
    })

    // B01 is selected by default since it's the first in the list
    expect(screen.getByText('Code: B01')).toBeInTheDocument()

    // Click B02 to change inspector
    const b02Btn = screen.getByRole('button', { name: /B02Berth Beta/i })
    fireEvent.click(b02Btn)
    
    expect(screen.getByText('Code: B02')).toBeInTheDocument()
  })
})
