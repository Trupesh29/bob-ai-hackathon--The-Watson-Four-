import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import OptimizerPage from '../pages/OptimizerPage'
import * as api from '../services/api'
import type { OperationsPlanResponse } from '../types/api'

// Mock the API service
vi.mock('../services/api')

const mockPlan: OperationsPlanResponse = {
  plan_id: 'TEST-PLAN-123',
  port_code: 'FALK',
  scenario: 'baseline',
  horizon_hours: 72,
  metrics: {
    total_vessels: 5,
    scheduled_count: 5,
    berth_utilization_pct: 0.8,
    solve_status: 'OPTIMAL',
    solve_wall_seconds: 5.5,
    fifo_total_wait_minutes: 600,
    opt_total_wait_minutes: 300,
    wait_reduction_minutes: 300
  },
  assignments: [
    {
      schedule_id: 'A1',
      vessel_name: 'Vessel A',
      vessel_id: 'V1',
      berth_code: 'B01',
      start_time: '2026-10-10T10:00:00Z',
      end_time: '2026-10-10T14:00:00Z',
      cranes_assigned: 2,
      waiting_minutes: 30,
      service_minutes: 240,
      priority: 2
    }
  ],
  unscheduled: [],
  assumptions: ['Mock assumption'],
  explanation: 'Mock explanation'
}

describe('OptimizerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.fetchOperationsPlan).mockResolvedValue(mockPlan)
  })

  it('renders initial idle state correctly', () => {
    render(<BrowserRouter><OptimizerPage /></BrowserRouter>)
    expect(screen.getByText('Optimizer Studio')).toBeInTheDocument()
    expect(screen.getByText('Engine Ready')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Run Optimizer/i })).toBeInTheDocument()
  })

  it('shows loading state during API request and then results', async () => {
    render(<BrowserRouter><OptimizerPage /></BrowserRouter>)
    
    const runBtn = screen.getByRole('button', { name: /Run Optimizer/i })
    fireEvent.click(runBtn)
    
    // Check loading text
    expect(screen.getByText('Optimizing Schedule...')).toBeInTheDocument()
    
    // Wait for mock response
    await waitFor(() => {
      expect(screen.getByText(/300 minutes saved/i)).toBeInTheDocument()
    })
    
    // Check if timeline rendered
    expect(screen.getByText('Berth B01')).toBeInTheDocument()
    expect(screen.getByText('Vessel A')).toBeInTheDocument()
    
    // Check if metrics match
    expect(screen.getByText('OPTIMAL')).toBeInTheDocument()
  })

  it('shows error state on API failure', async () => {
    vi.mocked(api.fetchOperationsPlan).mockRejectedValue(new Error('Solver timeout'))
    render(<BrowserRouter><OptimizerPage /></BrowserRouter>)
    
    fireEvent.click(screen.getByRole('button', { name: /Run Optimizer/i }))
    
    await waitFor(() => {
      expect(screen.getByText('Optimization Failed')).toBeInTheDocument()
      expect(screen.getByText('Solver timeout')).toBeInTheDocument()
    })
  })
})
