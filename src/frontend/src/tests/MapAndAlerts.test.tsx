/**
 * PortFlow AI — Map and Alerts focused tests.
 *
 * Tests:
 * 1.  berthDisplayStatus: free berth → 'available'
 * 2.  berthDisplayStatus: occupied berth → 'occupied'
 * 3.  berthDisplayStatus: maintenance berth → 'maintenance'
 * 4.  berthDisplayStatus: berth in highRiskCodes → 'high-risk'
 * 5.  berthDisplayStatus: berth in criticalCodes → 'critical'
 * 6.  berthStatusColour: maps each status to correct hex
 * 7.  BerthLayoutMap: renders berth blocks from berth data
 * 8.  BerthLayoutMap: empty state shows data-testid="berth-map-empty"
 * 9.  BerthLayoutMap: renders synthetic disclaimer label
 * 10. deriveAlerts: critical congestion window → critical alert
 * 11. deriveAlerts: high congestion window → high alert
 * 12. deriveAlerts: vessel wait > 12 h → high alert
 * 13. deriveAlerts: vessel wait > 24 h → critical alert
 * 14. deriveAlerts: routing recommended with saving → medium alert
 * 15. deriveAlerts: routing not recommended → no routing alert
 * 16. deriveAlerts: no data → empty list
 * 17. deriveAlerts: sortAlerts puts critical before high before medium
 * 18. AlertsPanel: renders alerts-list when alerts present
 * 19. AlertsPanel: renders alerts-empty when no alerts
 * 20. AlertsPanel: renders alerts-error on error prop
 * 21. AlertsPanel: renders alerts-loading on loading prop
 * 22. DashboardPage: berth-map-panel is present in ready state
 * 23. DashboardPage: alerts-panel is present in ready state
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import BerthLayoutMap, {
  berthDisplayStatus,
  berthStatusColour,
} from '../components/BerthLayoutMap'
import AlertsPanel, { deriveAlerts, sortAlerts } from '../components/AlertsPanel'
import type { BerthItem } from '../types/api'
import DashboardPage from '../pages/DashboardPage'
import * as api from '../services/api'

// ── Mock API module (mirrors DashboardPage.test.tsx) ─────────────────────────

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

// ── Berth factory ─────────────────────────────────────────────────────────────

function makeBerth(overrides: Partial<BerthItem> = {}): BerthItem {
  return {
    berth_id: 'b1',
    berth_code: 'B01',
    berth_name: 'Berth Alpha',
    max_length_m: 400,
    max_draft_m: 16,
    max_cranes: 4,
    status: 'operational',
    occupancy_status: 'free',
    crane_count: 4,
    ...overrides,
  }
}

// ── Shared mock data (matching DashboardPage.test.tsx) ─────────────────────────

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
  berths: [makeBerth()],
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
  candidates: [],
  recommended: false,
  recommended_port_code: null,
  recommended_port_name: null,
  estimated_hours_saved: 0.0,
  reason: 'Stay at current port.',
  factors: [],
  diversion_threshold_hours: 12.0,
  data_source: 'synthetic',
  is_synthetic: true,
  limitations: 'Synthetic data only.',
  assumptions: [],
}

const mockCopilot = {
  answer: '1. Rec one.\n2. Rec two.\n3. Rec three.',
  method: 'rules_fallback' as const,
  provider_available: false,
  question: 'Why?',
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
    top_waiting_vessel: null,
    top_waiting_hours: null,
    top_waiting_cause: null,
    routing_recommended: false,
    routing_reason: null,
    top_rule_drivers: [],
    data_source: 'synthetic',
  },
  is_synthetic: true,
  data_source: 'synthetic',
  disclaimer: 'Synthetic.',
  limitations: 'rules_fallback.',
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

describe('berthDisplayStatus', () => {
  it('free berth returns available', () => {
    expect(berthDisplayStatus(makeBerth({ occupancy_status: 'free' }), new Set(), new Set())).toBe('available')
  })

  it('occupied berth returns occupied', () => {
    expect(berthDisplayStatus(makeBerth({ occupancy_status: 'occupied' }), new Set(), new Set())).toBe('occupied')
  })

  it('maintenance berth returns maintenance', () => {
    expect(berthDisplayStatus(makeBerth({ occupancy_status: 'maintenance' }), new Set(), new Set())).toBe('maintenance')
  })

  it('berth in highRiskCodes returns high-risk', () => {
    expect(berthDisplayStatus(makeBerth({ berth_code: 'B01' }), new Set(['B01']), new Set())).toBe('high-risk')
  })

  it('berth in criticalCodes returns critical', () => {
    expect(berthDisplayStatus(makeBerth({ berth_code: 'B01' }), new Set(), new Set(['B01']))).toBe('critical')
  })
})

describe('berthStatusColour', () => {
  it('maps each status to a hex colour', () => {
    expect(berthStatusColour('available')).toMatch(/^#/)
    expect(berthStatusColour('occupied')).toMatch(/^#/)
    expect(berthStatusColour('high-risk')).toMatch(/^#/)
    expect(berthStatusColour('critical')).toMatch(/^#/)
    expect(berthStatusColour('maintenance')).toMatch(/^#/)
    // Distinct colours for available vs critical
    expect(berthStatusColour('available')).not.toBe(berthStatusColour('critical'))
  })
})

describe('BerthLayoutMap', () => {
  it('renders berth block for each berth in data', () => {
    const berths = [
      makeBerth({ berth_id: 'b1', berth_code: 'B01' }),
      makeBerth({ berth_id: 'b2', berth_code: 'B02' }),
    ]
    render(<BerthLayoutMap berths={berths} />)
    expect(screen.getByTestId('berth-block-B01')).toBeInTheDocument()
    expect(screen.getByTestId('berth-block-B02')).toBeInTheDocument()
    expect(screen.getByTestId('berth-map')).toBeInTheDocument()
  })

  it('shows empty state when no berths provided', () => {
    render(<BerthLayoutMap berths={[]} />)
    expect(screen.getByTestId('berth-map-empty')).toBeInTheDocument()
  })

  it('shows synthetic disclaimer', () => {
    render(<BerthLayoutMap berths={[makeBerth()]} />)
    expect(screen.getByText(/Synthetic \/ demo operational data — not GPS/i)).toBeInTheDocument()
  })
})

describe('deriveAlerts', () => {
  it('returns empty list when all inputs are null', () => {
    const alerts = deriveAlerts({ summary: null, congestion: null, waitingTimes: null, routing: null })
    expect(alerts).toHaveLength(0)
  })

  it('produces critical alert for critical congestion window', () => {
    const congestion = {
      ...mockCongestion,
      windows: [
        {
          window_start: '2026-09-15T00:00:00+00:00',
          window_end: '2026-09-15T06:00:00+00:00',
          risk_probability: 0.95,
          risk_level: 'critical' as const,
          estimated_queue_count: 8,
          affected_schedule_ids: [],
          rule_drivers: ['5 arrivals in window'],
          ml_label: null,
          ml_confidence: null,
          ml_model_version: null,
        },
      ],
    }
    const alerts = deriveAlerts({ summary: null, congestion, waitingTimes: null, routing: null })
    expect(alerts.some(a => a.severity === 'critical')).toBe(true)
  })

  it('produces high alert for high congestion window (no critical)', () => {
    const alerts = deriveAlerts({
      summary: null,
      congestion: mockCongestion, // mockCongestion has high windows
      waitingTimes: null,
      routing: null,
    })
    expect(alerts.some(a => a.severity === 'high')).toBe(true)
  })

  it('produces high alert for vessel wait > 12 h', () => {
    const wt = {
      ...mockWaitingTimes,
      vessels: [
        { ...mockWaitingTimes.vessels[0], predicted_waiting_hours: 15.0 },
      ],
    }
    const alerts = deriveAlerts({ summary: null, congestion: null, waitingTimes: wt, routing: null })
    expect(alerts.some(a => a.severity === 'high' && a.vesselName === 'FALKERMERE ATLAS')).toBe(true)
  })

  it('produces critical alert for vessel wait > 24 h', () => {
    const wt = {
      ...mockWaitingTimes,
      vessels: [
        { ...mockWaitingTimes.vessels[0], predicted_waiting_hours: 25.0 },
      ],
    }
    const alerts = deriveAlerts({ summary: null, congestion: null, waitingTimes: wt, routing: null })
    expect(alerts.some(a => a.severity === 'critical')).toBe(true)
  })

  it('produces medium alert for recommended routing with saving >= 2 h', () => {
    const routing = {
      ...mockRouting,
      recommended: true,
      estimated_hours_saved: 5.0,
      recommended_port_name: 'Port of Roskilde (Fictional)',
      reason: 'Diversion saves 5 h.',
    }
    const alerts = deriveAlerts({ summary: null, congestion: null, waitingTimes: null, routing })
    expect(alerts.some(a => a.severity === 'medium')).toBe(true)
  })

  it('does not produce routing alert when routing not recommended', () => {
    const alerts = deriveAlerts({ summary: null, congestion: null, waitingTimes: null, routing: mockRouting })
    expect(alerts.every(a => !a.id.startsWith('routing-'))).toBe(true)
  })

  it('does not produce vessel-wait alert when wait <= 12 h', () => {
    const alerts = deriveAlerts({ summary: null, congestion: null, waitingTimes: mockWaitingTimes, routing: null })
    expect(alerts.every(a => !a.id.startsWith('wait-high-'))).toBe(true)
  })
})

describe('sortAlerts', () => {
  it('orders critical → high → medium → info', () => {
    const input = [
      { id: '1', severity: 'medium' as const, title: '', reason: '', actionLabel: '' },
      { id: '2', severity: 'critical' as const, title: '', reason: '', actionLabel: '' },
      { id: '3', severity: 'high' as const, title: '', reason: '', actionLabel: '' },
    ]
    const sorted = sortAlerts(input)
    expect(sorted.map(a => a.severity)).toEqual(['critical', 'high', 'medium'])
  })
})

describe('AlertsPanel', () => {
  it('renders alerts-list when alerts are present', () => {
    const alerts = [
      { id: 'a1', severity: 'high' as const, title: 'Test', reason: 'Reason', actionLabel: 'Act' },
    ]
    render(<AlertsPanel alerts={alerts} />)
    expect(screen.getByTestId('alerts-list')).toBeInTheDocument()
    expect(screen.getByTestId('alert-high')).toBeInTheDocument()
  })

  it('renders alerts-empty when no alerts', () => {
    render(<AlertsPanel alerts={[]} />)
    expect(screen.getByTestId('alerts-empty')).toBeInTheDocument()
  })

  it('renders alerts-error when error prop set', () => {
    render(<AlertsPanel alerts={[]} error="Something went wrong" />)
    expect(screen.getByTestId('alerts-error')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('renders alerts-loading when loading prop set', () => {
    render(<AlertsPanel alerts={[]} loading />)
    expect(screen.getByTestId('alerts-loading')).toBeInTheDocument()
  })
})

describe('DashboardPage map and alerts integration', () => {
  beforeEach(() => { vi.clearAllMocks() })
  afterEach(() => { vi.resetAllMocks() })

  it('renders berth-map-panel in ready state', async () => {
    setupSuccessMocks()
    render(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByTestId('berth-map-panel')).toBeInTheDocument()
    })
  })

  it('renders alerts-panel in ready state', async () => {
    setupSuccessMocks()
    render(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByTestId('alerts-panel')).toBeInTheDocument()
    })
  })
})
