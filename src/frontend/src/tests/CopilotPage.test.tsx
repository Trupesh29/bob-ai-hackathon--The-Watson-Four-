import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CopilotPage from '../pages/CopilotPage'
import * as api from '../services/api'

vi.mock('../services/api')

describe('CopilotPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly and shows initial welcome message', () => {
    render(<CopilotPage />)
    expect(screen.getByText(/IBM Bob Copilot/i)).toBeInTheDocument()
    expect(screen.getByText(/Hello! I am IBM Bob/i)).toBeInTheDocument()
  })

  it('submits a question, shows loading, and gets an answer', async () => {
    vi.mocked(api.fetchCopilotAsk).mockResolvedValue({
      port_code: 'FALK',
      scenario: 'baseline',
      question: 'What is the wait time?',
      answer: 'The wait time is 30 mins.',
      method: 'ibm_bob',
      context_snapshot: {
        port_name: 'Falkermere',
        port_code: 'FALK',
        scenario: 'baseline',
        peak_risk_level: 'low',
        peak_congestion_risk_pct: 20,
        top_waiting_vessel: 'Vessel X',
        top_waiting_hours: 0.5,
        routing_recommended: false
      }
    })

    render(<CopilotPage />)
    
    const input = screen.getByPlaceholderText(/Ask IBM Bob/i)
    fireEvent.change(input, { target: { value: 'What is the wait time?' } })
    
    const askBtn = screen.getByRole('button', { name: /Ask/i })
    fireEvent.click(askBtn)
    
    // Shows loading
    expect(screen.getByText('Thinking…')).toBeInTheDocument()
    
    // Answer appears
    await waitFor(() => {
      expect(screen.getByText('The wait time is 30 mins.')).toBeInTheDocument()
    })
    
    // Metadata appears
    expect(screen.getByText(/IBM Bob provider/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Vessel X/i)[0]).toBeInTheDocument()
  })

  it('displays error on api failure', async () => {
    vi.mocked(api.fetchCopilotAsk).mockRejectedValue(new Error('Network Error'))

    render(<CopilotPage />)
    
    const input = screen.getByPlaceholderText(/Ask IBM Bob/i)
    fireEvent.change(input, { target: { value: 'Will it fail?' } })
    fireEvent.click(screen.getByRole('button', { name: /Ask/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/Network Error/i)).toBeInTheDocument()
    })
  })
})
