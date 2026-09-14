/**
 * PortFlow AI — Executive Operations Dashboard
 *
 * Primary command center for port operators, supervisors, and judges.
 * Provides high-contrast clarity: risk, cause, and next action visible in under 10 seconds.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import BerthLayoutMap from '../components/BerthLayoutMap'
import AlertsPanel, { deriveAlerts } from '../components/AlertsPanel'
import {
  SurfaceCard,
  MetricCard,
  StatusBadge,
  Button,
} from '../components/ui'
import {
  fetchDashboardSummary,
  fetchDashboardCongestion,
  fetchSchedules,
  fetchBerths,
  fetchWaitingTimes,
  fetchAlternateRouting,
  fetchCopilotAsk,
  DEFAULT_PORT_CODE,
  ApiRequestError,
} from '../services/api'
import type {
  AlternateRoutingResponse,
  CopilotAskResponse,
  CongestionMode,
  WaitingMode,
  DashboardSummaryResponse,
  DashboardCongestionResponse,
  SchedulesResponse,
  BerthsResponse,
  ScenarioId,
  CongestionWindow,
  WaitingTimesResponse,
} from '../types/api'

// ── Scenario configuration ────────────────────────────────────────────────────

const SCENARIOS: { id: ScenarioId; label: string }[] = [
  { id: 'baseline', label: 'Baseline' },
  { id: 'arrival_surge', label: 'Arrival Surge' },
  { id: 'crane_outage', label: 'Crane Outage' },
  { id: 'berth_closure', label: 'Berth Closure' },
  { id: 'handling_slowdown', label: 'Handling Slowdown' },
]

// ── Congestion colour mapping per design system ──────────────────────────────

function congestionBarColor(level: string): string {
  switch (level) {
    case 'critical':
      return '#C94B43' // PortFlow Red
    case 'high':
      return '#D85F2B' // PortFlow Orange
    case 'medium':
      return '#D99119' // PortFlow Amber
    default:
      return '#213657' // PortFlow Navy (normal capacity)
  }
}

// ── Formatters ────────────────────────────────────────────────────────────────

function formatPct(v: number): string {
  return `${v.toFixed(1)}%`
}

function formatHours(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function windowLabel(w: CongestionWindow): string {
  try {
    const d = new Date(w.window_start)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return w.window_start.slice(11, 16)
  }
}

function priorityLabel(p: number): string {
  switch (p) {
    case 1:
      return 'CRITICAL'
    case 2:
      return 'High'
    case 3:
      return 'Normal'
    case 4:
      return 'Low'
    default:
      return 'Deferred'
  }
}

// ── State interface ───────────────────────────────────────────────────────────

interface DashboardState {
  status: 'idle' | 'loading' | 'error' | 'empty' | 'ready'
  error: string | null
  summary: DashboardSummaryResponse | null
  congestion: DashboardCongestionResponse | null
  schedules: SchedulesResponse | null
  berths: BerthsResponse | null
  waitingTimes: WaitingTimesResponse | null
  routing: AlternateRoutingResponse | null
  routingError: string | null
  copilotResponse: CopilotAskResponse | null
  copilotLoading: boolean
  copilotError: string | null
}

const SUGGESTED_QUESTIONS = [
  'Why is congestion high and what should operators do?',
  'Which vessel is most at risk of delay?',
  'Should we consider routing vessels to an alternate port?',
]

export default function DashboardPage() {
  const portCode = DEFAULT_PORT_CODE
  const [scenario, setScenario] = useState<ScenarioId>('baseline')
  const [congestionMode, setCongestionMode] = useState<CongestionMode>('baseline')
  const [waitingMode, setWaitingMode] = useState<WaitingMode>('baseline')
  const [copilotQuestion, setCopilotQuestion] = useState('')
  const [copilotValidation, setCopilotValidation] = useState<string | null>(null)

  const [state, setState] = useState<DashboardState>({
    status: 'idle',
    error: null,
    summary: null,
    congestion: null,
    schedules: null,
    berths: null,
    waitingTimes: null,
    routing: null,
    routingError: null,
    copilotResponse: null,
    copilotLoading: false,
    copilotError: null,
  })

  const load = useCallback(
    async (sc: ScenarioId, cMode: CongestionMode, wMode: WaitingMode) => {
      setState(prev => ({ ...prev, status: 'loading', error: null }))
      try {
        const [summary, congestion, schedules, berths, waitingTimes] = await Promise.all([
          fetchDashboardSummary(portCode, sc),
          fetchDashboardCongestion(portCode, sc, 72, cMode),
          fetchSchedules(portCode, sc),
          fetchBerths(portCode),
          fetchWaitingTimes(portCode, 72, wMode, sc),
        ])
        const isEmpty =
          summary.active_vessel_count === 0 && congestion.windows.length === 0
        setState({
          status: isEmpty ? 'empty' : 'ready',
          error: null,
          summary,
          congestion,
          schedules,
          berths,
          waitingTimes,
          routing: null,
          routingError: null,
          copilotResponse: null,
          copilotLoading: false,
          copilotError: null,
        })

        // Fire alternate-routing fetch for highest-wait vessel (non-blocking)
        if (!isEmpty && waitingTimes.vessels.length > 0) {
          const topVessel = waitingTimes.vessels[0]
          fetchAlternateRouting(topVessel.vessel_id, topVessel.schedule_id, sc)
            .then(routing => setState(prev => ({ ...prev, routing, routingError: null })))
            .catch(() =>
              setState(prev => ({
                ...prev,
                routingError: 'Routing recommendation unavailable',
              }))
            )
        }
      } catch (err) {
        let msg = 'Unknown error'
        if (err instanceof ApiRequestError) {
          if (err.status === 0 || String(err.status) === '0') {
            msg = 'Backend unavailable — start FastAPI and refresh'
          } else {
            msg = `API error ${err.status}: ${JSON.stringify(err.body)}`
          }
        } else if (err instanceof TypeError && String(err).includes('fetch')) {
          msg = 'Backend unavailable — start FastAPI and refresh'
        } else if (err instanceof Error) {
          msg = err.message
        }
        setState(prev => ({ ...prev, status: 'error', error: msg }))
      }
    },
    [portCode]
  )

  const askCopilot = useCallback(
    (question: string) => {
      const trimmed = question.trim()
      if (!trimmed) {
        setCopilotValidation('Please enter a question before asking.')
        return
      }
      if (trimmed.length < 3) {
        setCopilotValidation('Question must be at least 3 characters.')
        return
      }
      setCopilotValidation(null)
      setState(prev => ({ ...prev, copilotLoading: true, copilotError: null }))
      fetchCopilotAsk({ port_code: portCode, question: trimmed, scenario })
        .then(copilotResponse =>
          setState(prev => ({ ...prev, copilotResponse, copilotLoading: false }))
        )
        .catch(() =>
          setState(prev => ({
            ...prev,
            copilotLoading: false,
            copilotError: 'Copilot unavailable — start the backend and retry.',
          }))
        )
    },
    [portCode, scenario]
  )

  useEffect(() => {
    load(scenario, congestionMode, waitingMode)
  }, [scenario, congestionMode, waitingMode, load])

  // Derive operational alerts
  const alerts = useMemo(
    () =>
      deriveAlerts({
        summary: state.summary,
        congestion: state.congestion,
        waitingTimes: state.waitingTimes,
        routing: state.routing,
      }),
    [state.summary, state.congestion, state.waitingTimes, state.routing]
  )

  // ── Loading state ────────────────────────────────────────────────────────────
  if (state.status === 'idle' || state.status === 'loading') {
    return (
      <div
        data-testid="loading-state"
        className="min-h-[400px] flex flex-col items-center justify-center p-8 bg-portflow-surface rounded-2xl border border-portflow-border shadow-card"
      >
        <div className="relative w-12 h-12 mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-portflow-amberSoft" />
          <div className="absolute inset-0 rounded-full border-4 border-portflow-amber border-t-transparent animate-spin" />
        </div>
        <p className="text-slate-400 text-sm font-medium animate-pulse">
          Loading dashboard data…
        </p>
      </div>
    )
  }

  // ── Error state ──────────────────────────────────────────────────────────────
  if (state.status === 'error') {
    return (
      <div
        data-testid="error-state"
        className="rounded-2xl border border-portflow-red/30 bg-portflow-redSoft/60 p-6 sm:p-8 shadow-card"
      >
        <div className="flex items-center gap-3 mb-2">
          <span className="w-8 h-8 rounded-xl bg-portflow-red text-white flex items-center justify-center font-bold text-sm">
            !
          </span>
          <h2 className="text-portflow-ink text-lg font-bold">Backend unavailable</h2>
        </div>
        <p className="text-portflow-red text-sm mb-5 font-medium">{state.error}</p>
        <Button
          variant="danger"
          size="sm"
          onClick={() => load(scenario, congestionMode, waitingMode)}
        >
          Retry Connection
        </Button>
      </div>
    )
  }

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (state.status === 'empty') {
    return (
      <div
        data-testid="empty-state"
        className="rounded-2xl border border-portflow-border bg-portflow-surface p-12 text-center shadow-card"
      >
        <div className="w-14 h-14 rounded-2xl bg-portflow-canvas flex items-center justify-center text-portflow-navy mx-auto mb-4 border border-portflow-border">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-portflow-ink mb-1">No seeded data found</h3>
        <p className="text-portflow-muted text-sm max-w-md mx-auto">
          Run <code className="px-2 py-0.5 rounded bg-portflow-canvas border border-portflow-border font-mono text-portflow-navy">python -m data.seed</code> to load demo records.
        </p>
        <p className="text-portflow-muted text-xs mt-4">Synthetic demo data · baseline_rule_v1</p>
      </div>
    )
  }

  // ── Ready state ──────────────────────────────────────────────────────────────
  const {
    summary,
    congestion,
    schedules,
    berths,
    waitingTimes,
    routing,
    routingError,
    copilotResponse,
    copilotLoading,
    copilotError,
  } = state

  // Chart data
  const availableBerthCount = berths ? berths.berths.filter(b => b.occupancy_status === 'free').length : 3
  const chartData = (congestion?.windows ?? []).map((w, i) => ({
    label: i % 2 === 0 ? windowLabel(w) : '',
    fullLabel: windowLabel(w),
    probability: Math.round(w.risk_probability * 100),
    level: w.risk_level,
    queue: w.estimated_queue_count,
    availableBerths: availableBerthCount,
    drivers: w.rule_drivers && w.rule_drivers.length > 0 ? w.rule_drivers.join(', ') : 'Normal scheduled vessel flow',
    window: w,
  }))

  const peakWindow = congestion?.windows.find(
    w => w.risk_level === 'critical' || w.risk_level === 'high'
  ) ?? congestion?.windows[0]

  return (
    <div className="space-y-6">
      {/* ── Page Header & Scenario Selector ───────────────────────────────── */}
      <SurfaceCard padding="md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1
                className="text-2xl sm:text-3xl font-bold text-portflow-navy tracking-tight leading-tight"
                data-testid="dashboard-title"
              >
                PortFlow AI — {summary?.port_name ?? portCode}
              </h1>
              <span
                data-testid="synthetic-label"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-portflow-amberSoft text-portflow-amber border border-portflow-amber/30"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-portflow-amber" />
                Synthetic demo data
              </span>
            </div>
            <p className="text-sm text-portflow-muted mt-1">
              72-hour operational congestion overview and intelligent resource guidance
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-portflow-muted">
              Horizon: <span className="font-semibold text-portflow-navy">72h</span>
            </span>
            <span className="text-xs font-medium text-portflow-muted">
              Port: <span className="font-semibold text-portflow-navy">{portCode}</span>
            </span>
          </div>
        </div>

        {/* Controls Bar: Scenario & Modes */}
        <div className="mt-5 pt-4 border-t border-portflow-border/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Scenario Selector */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-portflow-muted block">
              Simulation Scenario:
            </span>
            <div className="flex flex-wrap gap-2" data-testid="scenario-selector">
              {SCENARIOS.map(s => (
                <button
                  key={s.id}
                  data-testid={`scenario-btn-${s.id}`}
                  onClick={() => setScenario(s.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-all duration-150 ${
                    scenario === s.id
                      ? 'bg-portflow-amber border-portflow-amber text-white font-semibold shadow-sm'
                      : 'bg-portflow-surface border-portflow-border text-portflow-ink hover:bg-portflow-canvas'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dual Method Selectors */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Congestion Mode Selector */}
            <div className="space-y-1" data-testid="congestion-mode-selector">
              <span className="text-[11px] font-medium text-portflow-muted block">
                Congestion Method:
              </span>
              <div className="flex items-center gap-1.5">
                {(['baseline', 'ml'] as CongestionMode[]).map(m => (
                  <button
                    key={m}
                    data-testid={`mode-btn-${m}`}
                    onClick={() => setCongestionMode(m)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                      congestionMode === m
                        ? 'bg-portflow-navy border-portflow-navy text-white font-semibold'
                        : 'bg-portflow-canvas border-portflow-border text-portflow-muted hover:text-portflow-ink'
                    }`}
                  >
                    {m === 'baseline' ? 'Baseline rule' : 'ML model (synthetic)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Waiting Mode Selector */}
            <div className="space-y-1" data-testid="waiting-mode-selector">
              <span className="text-[11px] font-medium text-portflow-muted block">
                Waiting-Time Method:
              </span>
              <div className="flex items-center gap-1.5">
                {(['baseline', 'ml'] as WaitingMode[]).map(m => (
                  <button
                    key={m}
                    data-testid={`waiting-mode-btn-${m}`}
                    onClick={() => setWaitingMode(m)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                      waitingMode === m
                        ? 'bg-portflow-purple border-portflow-purple text-white font-semibold'
                        : 'bg-portflow-canvas border-portflow-border text-portflow-muted hover:text-portflow-ink'
                    }`}
                  >
                    {m === 'baseline' ? 'Baseline (historical)' : 'ML model (synthetic)'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </SurfaceCard>

      {/* ── KPI Cards Row ─────────────────────────────────────────────────── */}
      {summary && (
        <div
          data-testid="kpi-cards"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
        >
          {/* 1. Active vessels */}
          <MetricCard
            label="Active Vessels"
            value={String(summary.active_vessel_count)}
            supportingText={`${summary.arrivals_next_24h} arriving next 24 hours`}
            tone="navy"
            testId="kpi-upcoming-vessels"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13l2 2h14l2-2M5 15l2 5h10l2-5M9 7h6m-3-4v8" />
              </svg>
            }
          />

          {/* 2. Peak congestion risk */}
          <MetricCard
            label="Peak Congestion Risk"
            value={`${Math.round(summary.peak_congestion_risk * 100)}%`}
            change={summary.peak_risk_level.toUpperCase()}
            supportingText={
              summary.peak_risk_level === 'critical'
                ? 'Action Required'
                : 'Monitored Window'
            }
            tone={summary.peak_risk_level === 'critical' ? 'red' : 'amber'}
            testId="kpi-peak-risk"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
          />

          {/* 3. Average waiting time */}
          <MetricCard
            label="Est. Avg Wait"
            value={formatHours(summary.avg_estimated_waiting_minutes)}
            supportingText="Baseline vs optimized target"
            tone="orange"
            testId="kpi-est.-avg-wait"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />

          {/* 4. Operational cranes */}
          <MetricCard
            label="Available Cranes"
            value={String(summary.available_crane_count)}
            supportingText="All quayside active"
            tone="navy"
            testId="kpi-available-cranes"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
          />

          {/* 5. Berth occupancy */}
          <MetricCard
            label="Berth Occupancy"
            value={formatPct(summary.berth_occupancy_pct)}
            supportingText="of total berths allocated"
            tone="green"
            testId="kpi-berth-occupancy"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />
        </div>
      )}

      {/* ── Main Row: 72-Hour Congestion Chart & IBM Bob Insight ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 72-Hour Congestion Forecast Chart (7 cols) */}
        <div className="lg:col-span-7">
          <SurfaceCard
            title="72-Hour Congestion Horizon"
            subtitle="6-hour operational observation windows"
            action={
              <div className="flex items-center gap-2">
                <span
                  data-testid="chart-method-label"
                  className="text-xs text-portflow-muted font-medium"
                >
                  Calculation:{' '}
                  <span className="font-semibold text-portflow-navy">
                    {state.congestion?.calculation_method ?? 'baseline_rule_v1'}
                  </span>
                </span>
                {summary && (
                  <StatusBadge
                    status={summary.peak_risk_level}
                    label={`Peak: ${summary.peak_risk_level.toUpperCase()}`}
                    size="sm"
                  />
                )}
              </div>
            }
          >
            <div data-testid="congestion-chart" className="h-64 sm:h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 10, right: 10, bottom: 4, left: -20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7DED4" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#6F6761', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: '#E7DED4' }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: '#6F6761', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: '#E7DED4' }}
                    tickFormatter={v => `${v}%`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0].payload
                      return (
                        <div className="bg-portflow-surface border border-portflow-border rounded-xl p-3 shadow-card-hover text-xs space-y-1.5 z-50">
                          <div className="flex items-center justify-between gap-3 border-b border-portflow-border pb-1">
                            <span className="font-bold text-portflow-navy">{d.fullLabel}</span>
                            <StatusBadge status={d.level} size="sm" />
                          </div>
                          <div className="text-portflow-ink font-semibold">
                            Congestion Risk: <span className="text-portflow-navy font-bold">{d.probability}%</span>
                          </div>
                          <div className="text-portflow-muted flex items-center justify-between gap-2">
                            <span>Expected Queue:</span>
                            <span className="font-semibold text-portflow-ink">{d.queue} vessels</span>
                          </div>
                          <div className="text-portflow-muted flex items-center justify-between gap-2">
                            <span>Available Berths:</span>
                            <span className="font-semibold text-portflow-ink">{d.availableBerths} berths</span>
                          </div>
                          <div className="pt-1 border-t border-portflow-border/80 text-[11px] text-portflow-muted">
                            <span className="font-semibold text-portflow-navy">Primary Driver:</span>{' '}
                            {d.drivers}
                          </div>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="probability" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={congestionBarColor(entry.level)} />
                    ))}
                  </Bar>
                  {congestionMode === 'ml' && (
                    <Line
                      type="monotone"
                      dataKey="probability"
                      stroke="#7656B8"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={{ fill: '#7656B8', r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Legend & Guidance */}
            <div className="mt-3 pt-3 border-t border-portflow-border/80 flex items-center justify-between text-xs flex-wrap gap-2 text-portflow-muted">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-portflow-navy inline-block" />
                  <span>Normal</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-portflow-amber inline-block" />
                  <span>Rising</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-portflow-orange inline-block" />
                  <span>High Risk</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-portflow-red inline-block" />
                  <span>Critical</span>
                </span>
                {congestionMode === 'ml' && (
                  <span className="flex items-center gap-1.5 text-portflow-purple font-medium">
                    <span className="w-4 h-0.5 border-t-2 border-dashed border-portflow-purple inline-block" />
                    <span>ML Forecast Confidence</span>
                  </span>
                )}
              </div>

              <span className="text-[11px] text-portflow-muted font-mono">
                {congestionMode === 'ml'
                  ? 'Trained on synthetic data'
                  : 'Baseline rule — ML model pending'}
              </span>
            </div>
          </SurfaceCard>
        </div>

        {/* IBM Bob Operations Insight Panel (5 cols) */}
        <div className="lg:col-span-5" data-testid="copilot-panel">
          <div className="bg-[#F1ECFB]/70 border border-portflow-purple/30 rounded-2xl p-5 sm:p-6 shadow-card space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-portflow-purple text-white flex items-center justify-center shadow-sm shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-portflow-ink tracking-tight leading-snug">
                    IBM Bob Operations Insight
                  </h3>
                  <p className="text-xs text-portflow-purple font-medium">
                    Decision Support & Telemetry Guidance
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-portflow-purpleSoft text-portflow-purple border border-portflow-purple/20 shrink-0">
                Advisory
              </span>
            </div>

            {/* Structured Situation Cards */}
            <div className="space-y-2.5 text-xs">
              <div className="bg-portflow-surface/90 rounded-xl p-3 border border-portflow-purple/20">
                <span className="font-bold text-portflow-purple block mb-0.5 uppercase text-[10px] tracking-wider">
                  Current Situation
                </span>
                <p className="text-portflow-ink leading-relaxed">
                  {summary?.peak_risk_level === 'critical' || summary?.peak_risk_level === 'high'
                    ? `Elevated congestion risk (${Math.round((summary?.peak_congestion_risk ?? 0.5) * 100)}%) across peak arrival window. ${summary?.active_vessel_count ?? 8} vessels scheduled against ${summary?.available_crane_count ?? 5} available cranes.`
                    : `Quay operations balanced. Peak congestion risk estimated at ${Math.round((summary?.peak_congestion_risk ?? 0.2) * 100)}% with manageable vessel queuing.`}
                </p>
              </div>

              <div className="bg-portflow-surface/90 rounded-xl p-3 border border-portflow-purple/20">
                <span className="font-bold text-portflow-purple block mb-0.5 uppercase text-[10px] tracking-wider">
                  Top Congestion Driver
                </span>
                <p className="text-portflow-ink leading-relaxed">
                  {peakWindow?.rule_drivers?.[0] ?? 'Concentrated arrival cluster overlapping limited crane discharge rate.'}
                </p>
              </div>

              <div className="bg-portflow-surface/90 rounded-xl p-3 border border-portflow-purple/20">
                <span className="font-bold text-portflow-purple block mb-0.5 uppercase text-[10px] tracking-wider">
                  Suggested Next Action
                </span>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <p className="text-portflow-ink leading-relaxed">
                    Generate an optimized 72h berth plan to balance queue distribution.
                  </p>
                  <a
                    href="/operations-plan"
                    className="inline-flex items-center gap-1 text-xs font-bold text-portflow-purple hover:underline underline-offset-2 shrink-0"
                  >
                    Open Plan →
                  </a>
                </div>
              </div>
            </div>

            {/* Presets and Interactive Question Dispatch */}
            <div className="pt-2 border-t border-portflow-purple/20 space-y-2.5">
              <span className="text-[11px] font-semibold text-portflow-purple uppercase tracking-wider block">
                Ask IBM Bob Copilot
              </span>

              {/* Suggestions */}
              <div className="flex flex-wrap gap-1.5" data-testid="copilot-suggestions">
                {SUGGESTED_QUESTIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => {
                      setCopilotQuestion(q)
                      askCopilot(q)
                    }}
                    className="px-2.5 py-1 text-[11px] bg-portflow-surface hover:bg-portflow-purpleSoft text-portflow-ink rounded-lg border border-portflow-purple/20 transition-colors text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Input & Ask Button */}
              <div className="flex gap-2 pt-1">
                <input
                  data-testid="copilot-input"
                  type="text"
                  value={copilotQuestion}
                  onChange={e => {
                    setCopilotQuestion(e.target.value)
                    if (copilotValidation && e.target.value.trim().length >= 3) {
                      setCopilotValidation(null)
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') askCopilot(copilotQuestion)
                  }}
                  placeholder="Ask about port congestion or delay causes…"
                  className="flex-1 bg-portflow-surface border border-portflow-border rounded-xl px-3 py-2 text-xs text-portflow-ink placeholder-portflow-muted focus:outline-none focus:ring-2 focus:ring-portflow-purple/30"
                />
                <Button
                  variant="ai"
                  size="sm"
                  data-testid="copilot-ask-btn"
                  onClick={() => askCopilot(copilotQuestion)}
                  disabled={copilotLoading || !copilotQuestion.trim()}
                >
                  {copilotLoading ? 'Thinking…' : 'Ask'}
                </Button>
              </div>

              {copilotValidation && (
                <p className="text-portflow-orange text-[11px] font-medium" data-testid="copilot-validation">
                  {copilotValidation}
                </p>
              )}

              {/* Response Display Area */}
              {copilotLoading && (
                <div data-testid="copilot-loading" className="p-3 bg-portflow-surface rounded-xl border border-portflow-purple/20">
                  <p className="text-portflow-purple text-xs font-medium animate-pulse">
                    Generating explanation…
                  </p>
                </div>
              )}

              {copilotError && (
                <div data-testid="copilot-error" className="p-3 bg-portflow-redSoft/60 rounded-xl border border-portflow-red/30">
                  <p className="text-portflow-red text-xs font-medium">{copilotError}</p>
                </div>
              )}

              {!copilotLoading && !copilotError && copilotResponse && (
                <div data-testid="copilot-response" className="p-3.5 bg-portflow-surface rounded-xl border border-portflow-purple/20 text-xs shadow-sm space-y-2">
                  <div className="whitespace-pre-wrap text-portflow-ink leading-relaxed">
                    {copilotResponse.answer}
                  </div>
                  <div className="pt-2 border-t border-portflow-border/80 flex items-center justify-between text-[10px] text-portflow-muted">
                    <span>
                      Method: <span className="font-semibold text-portflow-purple" data-testid="copilot-method">{copilotResponse.method}</span>
                    </span>
                    <span>Synthetic demo data</span>
                  </div>
                </div>
              )}

              {!copilotLoading && !copilotError && !copilotResponse && (
                <p className="text-[11px] text-portflow-muted text-center pt-1" data-testid="copilot-idle">
                  Select a suggested question or enter your query to evaluate recommendations.
                </p>
              )}

              <p className="text-[10px] text-portflow-muted text-center italic">
                Synthetic demo data · Decision support only
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Second Row: Affected Vessels & Priority Alerts ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Affected Vessel Table (7 cols) */}
        <div className="lg:col-span-7">
          <SurfaceCard
            title="Affected Vessels"
            subtitle="Queue turnaround forecasts and priority schedules"
            action={
              waitingTimes && (
                <span className="text-xs text-portflow-muted font-mono" data-testid="waiting-method-label">
                  {waitingTimes.calculation_method}
                </span>
              )
            }
          >
            {waitingTimes && waitingTimes.vessels.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs" data-testid="vessels-table">
                  <thead>
                    <tr className="text-portflow-muted border-b border-portflow-border bg-portflow-canvas/60">
                      <th className="text-left py-2.5 px-3 font-semibold uppercase tracking-wider">Vessel</th>
                      <th className="text-left py-2.5 px-3 font-semibold uppercase tracking-wider">ETA</th>
                      <th className="text-left py-2.5 px-3 font-semibold uppercase tracking-wider">Priority</th>
                      <th className="text-left py-2.5 px-3 font-semibold uppercase tracking-wider">Risk</th>
                      <th className="text-left py-2.5 px-3 font-semibold uppercase tracking-wider">Pred. Wait</th>
                      <th className="text-left py-2.5 px-3 font-semibold uppercase tracking-wider">Primary Cause</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-portflow-border/70">
                    {waitingTimes.vessels.slice(0, 10).map(v => (
                      <tr key={v.schedule_id} className="hover:bg-portflow-canvas/50 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-portflow-navy truncate max-w-[140px]">
                          {v.vessel_name}
                        </td>
                        <td className="py-2.5 px-3 text-portflow-muted whitespace-nowrap">
                          {new Date(v.eta).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold ${
                              v.priority === 1
                                ? 'bg-portflow-redSoft text-portflow-red'
                                : v.priority === 2
                                ? 'bg-portflow-orangeSoft text-portflow-orange'
                                : 'bg-portflow-canvas text-portflow-ink border border-portflow-border'
                            }`}
                          >
                            {priorityLabel(v.priority)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <StatusBadge status={v.risk_level} size="sm" />
                        </td>
                        <td className="py-2.5 px-3 font-bold text-portflow-ink whitespace-nowrap">
                          {v.predicted_waiting_hours < 1
                            ? `${Math.round(v.predicted_waiting_hours * 60)}m`
                            : `${v.predicted_waiting_hours.toFixed(1)}h`}
                        </td>
                        <td className="py-2.5 px-3 text-portflow-muted text-[11px] truncate max-w-[160px]">
                          {v.primary_cause ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : schedules && schedules.schedules.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs" data-testid="vessels-table">
                  <thead>
                    <tr className="text-portflow-muted border-b border-portflow-border bg-portflow-canvas/60">
                      <th className="text-left py-2.5 px-3 font-semibold uppercase tracking-wider">Vessel</th>
                      <th className="text-left py-2.5 px-3 font-semibold uppercase tracking-wider">ETA</th>
                      <th className="text-left py-2.5 px-3 font-semibold uppercase tracking-wider">Priority</th>
                      <th className="text-left py-2.5 px-3 font-semibold uppercase tracking-wider">Berths</th>
                      <th className="text-left py-2.5 px-3 font-semibold uppercase tracking-wider">Est. Wait</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-portflow-border/70">
                    {schedules.schedules.slice(0, 10).map(s => (
                      <tr key={s.schedule_id} className="hover:bg-portflow-canvas/50 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-portflow-navy truncate max-w-[140px]">
                          {s.vessel_name}
                        </td>
                        <td className="py-2.5 px-3 text-portflow-muted whitespace-nowrap">
                          {new Date(s.eta).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-portflow-canvas text-portflow-ink border border-portflow-border">
                            {priorityLabel(s.priority)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-portflow-muted">
                          {s.compatible_berth_count ?? '—'}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-portflow-ink">
                          {s.estimated_waiting_minutes != null
                            ? formatHours(s.estimated_waiting_minutes)
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-portflow-muted text-xs p-4">No vessel schedules available.</p>
            )}
          </SurfaceCard>
        </div>

        {/* Priority Alerts (5 cols) */}
        <div className="lg:col-span-5" data-testid="alerts-panel">
          <SurfaceCard
            title="Priority Alerts"
            subtitle="Derived from operational telemetry & risk thresholds"
            action={
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-portflow-canvas text-portflow-ink border border-portflow-border">
                {alerts.length} Active
              </span>
            }
          >
            <AlertsPanel alerts={alerts} />
          </SurfaceCard>
        </div>
      </div>

      {/* ── Bottom Row: Berth Occupancy Overview & Map Layout ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Port Operations Map (7 cols) */}
        <div className="lg:col-span-7" data-testid="berth-map-panel">
          <SurfaceCard
            title="Berth Layout & Spatial Schematic"
            subtitle="Quay alignment, draft limits, and crane readiness"
            action={
              <a
                href="/map"
                className="text-xs font-semibold text-portflow-navy hover:underline underline-offset-2"
              >
                Expand Map →
              </a>
            }
          >
            <BerthLayoutMap berths={berths?.berths ?? []} />
          </SurfaceCard>
        </div>

        {/* Right side: Routing Recommendation & Berth Status (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Alternate Routing Recommendation Card */}
          <div data-testid="routing-card">
            <SurfaceCard
              title="Alternate Routing Advisory"
              subtitle="Diversion feasibility model"
            >
              {routingError ? (
                <p className="text-portflow-red text-xs" data-testid="routing-error">
                  {routingError}
                </p>
              ) : routing === null ? (
                <p className="text-portflow-muted text-xs" data-testid="routing-loading">
                  {waitingTimes && waitingTimes.vessels.length > 0
                    ? 'Loading routing evaluation…'
                    : 'No vessel data available.'}
                </p>
              ) : (
                <div data-testid="routing-result" className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span
                      data-testid="routing-badge"
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
                        routing.recommended
                          ? 'bg-portflow-greenSoft text-portflow-green border-portflow-green/30'
                          : 'bg-portflow-canvas text-portflow-muted border-portflow-border'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${routing.recommended ? 'bg-portflow-green' : 'bg-portflow-muted'}`} />
                      {routing.recommended
                        ? `Divert → ${routing.recommended_port_name}`
                        : 'Stay at current port'}
                    </span>
                    {routing.estimated_hours_saved > 0 && (
                      <span className="text-xs font-bold text-portflow-green">
                        ~{routing.estimated_hours_saved.toFixed(1)} h saved
                      </span>
                    )}
                  </div>

                  <p
                    data-testid="routing-reason"
                    className="text-xs text-portflow-ink leading-relaxed font-medium bg-portflow-canvas/60 p-3 rounded-xl border border-portflow-border"
                  >
                    {routing.reason}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-portflow-muted border-t border-portflow-border pt-2">
                    <span>For: {routing.vessel_name} · Threshold: {routing.diversion_threshold_hours}h · <span className="text-amber-600">Synthetic training data</span></span>
                  </div>
                </div>
              )}
            </SurfaceCard>
          </div>

          {/* Berth Status Overview */}
          <div data-testid="berth-panel">
            <SurfaceCard
              title="Berth Occupancy Overview"
              subtitle="Active quayside resource allocation"
            >
              {berths && berths.berths.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {berths.berths.map(b => (
                    <div
                      key={b.berth_id}
                      className="flex items-center justify-between bg-portflow-canvas border border-portflow-border rounded-xl p-2.5"
                    >
                      <div>
                        <span className="font-bold text-xs text-portflow-navy block">
                          {b.berth_code}
                        </span>
                        <span className="text-[10px] text-portflow-muted block">
                          {b.berth_name}
                        </span>
                      </div>
                      <div className="text-right">
                        <StatusBadge
                          status={b.occupancy_status === 'free' ? 'active' : b.occupancy_status === 'maintenance' ? 'medium' : 'high'}
                          label={b.occupancy_status}
                          size="sm"
                        />
                        <span className="text-[10px] text-portflow-muted block mt-0.5">
                          {b.max_draft_m}m draft · {b.crane_count} cranes
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-portflow-muted text-xs">No berth data available.</p>
              )}
            </SurfaceCard>
          </div>
        </div>
      </div>

      {/* ── Footer Disclosures ────────────────────────────────────────────── */}
      <div className="pt-4 border-t border-portflow-border/80 text-[11px] text-portflow-muted flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>Synthetic demo data · baseline_rule_v1 · Not a trained ML model · Optimization pending</p>
        <p className="font-mono">
          Port: {summary?.port_code} · Scenario: {scenario} · Horizon: 72h
        </p>
      </div>
    </div>
  )
}
