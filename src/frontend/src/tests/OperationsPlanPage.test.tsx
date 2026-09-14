import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import OperationsPlanPage from '../pages/OperationsPlanPage'
import * as api from '../services/api'

vi.mock('../services/api')

const mockPlan = {
  plan_id: 'OP-PLAN-555',
  port_code: 'FALK',
  scenario: 'baseline',
  horizon_hours: 72,
  metrics: {
    total_vessels: 1,
    scheduled_count: 1,
    berth_utilization_pct: 0.5,
    solve_status: 'OPTIMAL',
    solve_wall_seconds: 1.2,
    fifo_total_wait_minutes: 100,
    opt_total_wait_minutes: 50,
    wait_reduction_minutes: 50
  },
  assignments: [
    {
      schedule_id: 'A1',
      vessel_name: 'Vessel Alpha',
      vessel_id: 'V1',
      berth_code: 'B02',
      start_time: '2026-10-10T10:00:00Z',
      end_time: '2026-10-10T14:00:00Z',
      cranes_assigned: 3,
      waiting_minutes: 0,
      service_minutes: 240,
      priority: 3
    }
  ],
  unscheduled: [],
  assumptions: [],
  explanation: ''
}

describe('OperationsPlanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.fetchOperationsPlan).mockResolvedValue(mockPlan as any)
    vi.mocked(api.approveOperationsPlan).mockResolvedValue({ status: 'ok', message: 'Approved' })
  })

  it('renders stepper and initial empty state', () => {
    render(<OperationsPlanPage />)
    expect(screen.getByText('Start Planning Cycle')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Generate Plan/i })).toBeInTheDocument()
  })

  it('generates plan and opens approve dialog', async () => {
    render(<OperationsPlanPage />)
    fireEvent.click(screen.getByRole('button', { name: /Generate Plan/i }))
    
    // Wait for the mock to resolve
    await waitFor(() => {
      expect(screen.getByText('Vessel Alpha')).toBeInTheDocument()
    })

    // Click Approve Plan to open dialog
    const approveBtn = screen.getByRole('button', { name: /Approve Plan/i })
    fireEvent.click(approveBtn)
    
    // The dialog should be visible
    expect(screen.getByText('Approve Operations Plan?')).toBeInTheDocument()
    
    // Confirm approval
    const confirmBtn = screen.getByText(/Yes, Approve Plan/i)
    fireEvent.click(confirmBtn)
    
    // Verify it changed state
    await waitFor(() => {
      expect(screen.getByText('Active Demo Plan')).toBeInTheDocument()
    })
  })

  it('reject dialog opens and confirms action', async () => {
    render(<OperationsPlanPage />)
    fireEvent.click(screen.getByRole('button', { name: /Generate Plan/i }))
    
    await waitFor(() => {
      expect(screen.getByText('Vessel Alpha')).toBeInTheDocument()
    })

    // Reject flow
    const rejectBtn = screen.getByRole('button', { name: /Reject Plan/i })
    fireEvent.click(rejectBtn)
    expect(screen.getByText('Reject Operations Plan?')).toBeInTheDocument()
    
    const confirmReject = screen.getByText(/Yes, Reject Plan/i)
    fireEvent.click(confirmReject)
    
    await waitFor(() => {
      expect(screen.getByText('Rejected Plan')).toBeInTheDocument()
    })
  })
})
