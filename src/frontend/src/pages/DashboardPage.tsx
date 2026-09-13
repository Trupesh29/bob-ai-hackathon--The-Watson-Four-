/**
 * PortFlow AI — Dashboard Page
 *
 * Displays the 72-hour congestion overview for the selected port.
 * All KPI values come from FastAPI — nothing is calculated in React.
 * Congestion is labelled "Baseline rule — ML model pending".
 * Data is labelled "Synthetic demo data".
 */

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import {
  fetchDashboardSummary,
  fetchDashboardCongestion,
  fetchSchedules,
  fetchBerths,
  DEFAULT_PORT_CODE,
  ApiRequestError,
} from '../services/api'
import type {
  CongestionMode,
  DashboardSummaryResponse,
  DashboardCongestionResponse,
  SchedulesResponse,
  BerthsResponse,
  ScenarioId,
  CongestionWindow,
} from '../types/api'

// ── Scenario configuration ────────────────────────────────────────────────────

const SCENARIOS: { id: ScenarioId; label: string }[] = [
  { id: 'baseline', label: 'Baseline' },
  { id: 'arrival_surge', label: 'Arrival Surge' },
  { id: 'crane_outage', label: 'Crane Outage' },
  { id: 'berth_closure', label: 'Berth Closure' },
  { id: 'handling_slowdown', label: 'Handling Slowdown' },
]

// ── Risk colour helpers ────────────────────────────────────────────────────────

function riskColour(level: string): string {
  switch (level) {
    case 'critical':
      return '#dc2626'
    case 'high':
      return '#ea580c'
    case 'medium':
      return '#d97706'
    default:
      return '#16a34a'
  }
}

function riskBadge(level: string): string {
  switch (level) {
    case 'critical':
      return 'bg-red-900/40 text-red-300 border border-red-700'
    case 'high':
      return 'bg-orange-900/40 text-orange-300 border border-orange-700'
    case 'medium':
      return 'bg-yellow-900/40 text-yellow-300 border border-yellow-700'
    default:
      return 'bg-green-900/40 text-green-300 border border-green-700'
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── State type ────────────────────────────────────────────────────────────────

interface DashboardState {
  status: 'idle' | 'loading' | 'error' | 'empty' | 'ready'
  error: string | null
  summary: DashboardSummaryResponse | null
  congestion: DashboardCongestionResponse | null
  schedules: SchedulesResponse | null
  berths: BerthsResponse | null
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const portCode = DEFAULT_PORT_CODE
  const [scenario, setScenario] = useState<ScenarioId>('baseline')
  const [congestionMode, setCongestionMode] = useState<CongestionMode>('baseline')
  const [state, setState] = useState<DashboardState>({
    status: 'idle',
    error: null,
    summary: null,
    congestion: null,
    schedules: null,
    berths: null,
  })

  const load = useCallback(async (sc: ScenarioId, mode: CongestionMode) => {
    setState(prev => ({ ...prev, status: 'loading', error: null }))
    try {
      const [summary, congestion, schedules, berths] = await Promise.all([
        fetchDashboardSummary(portCode, sc),
        fetchDashboardCongestion(portCode, sc, 72, mode),
        fetchSchedules(portCode, sc),
        fetchBerths(portCode),
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
      })
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
  }, [portCode])

  useEffect(() => {
    load(scenario, congestionMode)
  }, [scenario, congestionMode, load])

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (state.status === 'idle' || state.status === 'loading') {
    return (
      <div data-testid="loading-state" className="flex items-center justify-center h-48">
        <div className="text-slate-400 text-sm animate-pulse">
          Loading dashboard data…
        </div>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (state.status === 'error') {
    return (
      <div data-testid="error-state" className="rounded-lg border border-red-700 bg-red-900/20 p-6">
        <h2 className="text-red-300 font-semibold mb-2">Backend unavailable</h2>
        <p className="text-red-400 text-sm mb-4">{state.error}</p>
        <button
          onClick={() => load(scenario, congestionMode)}
          className="px-4 py-1.5 bg-red-700 hover:bg-red-600 text-white text-sm rounded"
        >
          Retry
        </button>
      </div>
    )
  }

  // ── Empty ────────────────────────────────────────────────────────────────────
  if (state.status === 'empty') {
    return (
      <div data-testid="empty-state" className="rounded-lg border border-slate-700 bg-slate-800 p-8 text-center">
        <p className="text-slate-300 font-medium mb-1">No seeded data found</p>
        <p className="text-slate-500 text-sm">
          Run <code className="text-teal-400">python -m data.seed</code> to load demo records.
        </p>
        <p className="text-slate-600 text-xs mt-3">Synthetic demo data · baseline_rule_v1</p>
      </div>
    )
  }

  // ── Ready ─────────────────────────────────────────────────────────────────────
  const { summary, congestion, schedules, berths } = state

  // Chart data
  const chartData = (congestion?.windows ?? []).map((w, i) => ({
    label: i % 2 === 0 ? windowLabel(w) : '',
    fullLabel: windowLabel(w),
    probability: Math.round(w.risk_probability * 100),
    level: w.risk_level,
    queue: w.estimated_queue_count,
    window: w,
  }))

  return (
    <div className="space-y-6">
      {/* ── Operational header ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-100" data-testid="dashboard-title">
            PortFlow AI — {summary?.port_name ?? portCode}
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            72-hour congestion horizon · Scenario:{' '}
            <span className="text-teal-400 font-medium">
              {SCENARIOS.find(s => s.id === scenario)?.label ?? scenario}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            data-testid="synthetic-label"
            className="px-2.5 py-1 text-xs font-medium bg-amber-900/30 text-amber-300 border border-amber-700 rounded"
          >
            Synthetic demo data
          </span>
          <span className="px-2.5 py-1 text-xs bg-slate-700 text-slate-400 border border-slate-600 rounded">
            {congestionMode === 'ml'
              ? 'Trained on synthetic data'
              : 'Baseline rule — ML model pending'}
          </span>
          <span className="px-2.5 py-1 text-xs bg-slate-700 text-slate-400 border border-slate-600 rounded">
            Optimization pending
          </span>
        </div>
      </div>

      {/* ── Congestion mode selector ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2" data-testid="congestion-mode-selector">
        <span className="text-slate-500 text-xs">Congestion method:</span>
        {(['baseline', 'ml'] as CongestionMode[]).map(m => (
          <button
            key={m}
            data-testid={`mode-btn-${m}`}
            onClick={() => setCongestionMode(m)}
            className={`px-3 py-1 text-xs font-medium rounded border transition-colors ${
              congestionMode === m
                ? 'bg-indigo-700 border-indigo-500 text-white'
                : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {m === 'baseline' ? 'Baseline rule' : 'ML model (synthetic)'}
          </button>
        ))}
      </div>

      {/* ── Scenario selector ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2" data-testid="scenario-selector">
        {SCENARIOS.map(s => (
          <button
            key={s.id}
            data-testid={`scenario-btn-${s.id}`}
            onClick={() => setScenario(s.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
              scenario === s.id
                ? 'bg-teal-700 border-teal-500 text-white'
                : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ── KPI cards ────────────────────────────────────────────────────────── */}
      {summary && (
        <div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
          data-testid="kpi-cards"
        >
          <KpiCard
            label="Upcoming Vessels"
            value={String(summary.active_vessel_count)}
            sub={`${summary.arrivals_next_24h} in next 24h`}
          />
          <KpiCard
            label="Berth Occupancy"
            value={formatPct(summary.berth_occupancy_pct)}
            sub="of total berths"
          />
          <KpiCard
            label="Available Cranes"
            value={String(summary.available_crane_count)}
            sub="operational"
          />
          <KpiCard
            label="Peak Risk"
            value={`${Math.round(summary.peak_congestion_risk * 100)}%`}
            sub={summary.peak_risk_level}
            accent={riskColour(summary.peak_risk_level)}
          />
          <KpiCard
            label="Est. Avg Wait"
            value={formatHours(summary.avg_estimated_waiting_minutes)}
            sub="baseline rule estimate"
          />
        </div>
      )}

      {/* ── Congestion chart ─────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-slate-100 font-medium text-sm">
              72-Hour Congestion Horizon
            </h2>
            <p className="text-slate-500 text-xs mt-0.5" data-testid="chart-method-label">
              Calculation:{' '}
              <span className="text-slate-400">
                {state.congestion?.calculation_method ?? 'baseline_rule_v1'}
              </span>
              {' '}· 6-hour windows
              {congestionMode === 'ml' && (
                <span className="ml-1 text-amber-500">· Trained on synthetic data only</span>
              )}
            </p>
          </div>
          {summary && (
            <span className={`px-2 py-0.5 text-xs rounded font-medium ${riskBadge(summary.peak_risk_level)}`}>
              Peak: {summary.peak_risk_level.toUpperCase()}
            </span>
          )}
        </div>

        <div data-testid="congestion-chart" className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                tickFormatter={v => `${v}%`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload
                  return (
                    <div className="bg-slate-900 border border-slate-600 rounded p-2 text-xs">
                      <p className="text-slate-200 font-medium">{d.fullLabel}</p>
                      <p className="text-slate-300">Risk: {d.probability}%</p>
                      <p className="text-slate-400">Level: {d.level}</p>
                      <p className="text-slate-400">Queue: {d.queue} vessels</p>
                      <p className="text-slate-500 mt-1">
                        {state.congestion?.calculation_method ?? 'baseline_rule_v1'}
                        {congestionMode === 'ml' && ' · synthetic data only'}
                      </p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="probability" radius={[3, 3, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={riskColour(entry.level)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Two-column layout: schedules + berths ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Affected vessels table ──────────────────────────────────────── */}
        <div className="lg:col-span-2 rounded-lg border border-slate-700 bg-slate-800/60 p-4">
          <h2 className="text-slate-100 font-medium text-sm mb-3">
            Affected Vessels
          </h2>
          {schedules && schedules.schedules.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs" data-testid="vessels-table">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-700">
                    <th className="text-left py-1.5 pr-3 font-medium">Vessel</th>
                    <th className="text-left py-1.5 pr-3 font-medium">ETA</th>
                    <th className="text-left py-1.5 pr-3 font-medium">Priority</th>
                    <th className="text-left py-1.5 pr-3 font-medium">Berths</th>
                    <th className="text-left py-1.5 font-medium">Est. Wait</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.schedules.slice(0, 12).map(s => (
                    <tr
                      key={s.schedule_id}
                      className="border-b border-slate-700/50 hover:bg-slate-700/30"
                    >
                      <td className="py-1.5 pr-3 text-slate-200 font-medium truncate max-w-[120px]">
                        {s.vessel_name}
                      </td>
                      <td className="py-1.5 pr-3 text-slate-400">
                        {new Date(s.eta).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-1.5 pr-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            s.priority === 1
                              ? 'bg-red-900/40 text-red-300'
                              : s.priority === 2
                              ? 'bg-orange-900/30 text-orange-300'
                              : 'bg-slate-700 text-slate-400'
                          }`}
                        >
                          {priorityLabel(s.priority)}
                        </span>
                      </td>
                      <td className="py-1.5 pr-3 text-slate-400">
                        {s.compatible_berth_count ?? '—'}
                      </td>
                      <td className="py-1.5 text-slate-400">
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
            <p className="text-slate-500 text-xs">No vessel schedules available.</p>
          )}
        </div>

        {/* ── Berth status panel ──────────────────────────────────────────── */}
        <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
          <h2 className="text-slate-100 font-medium text-sm mb-3">Berth Status</h2>
          {berths && berths.berths.length > 0 ? (
            <div className="space-y-2" data-testid="berth-panel">
              {berths.berths.map(b => (
                <div
                  key={b.berth_id}
                  className="flex items-center justify-between bg-slate-700/40 rounded px-3 py-2"
                >
                  <div>
                    <p className="text-slate-200 text-xs font-medium">{b.berth_code}</p>
                    <p className="text-slate-500 text-[10px]">{b.berth_name}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${
                        b.occupancy_status === 'maintenance'
                          ? 'bg-slate-600 text-slate-400'
                          : b.occupancy_status === 'occupied'
                          ? 'bg-orange-900/40 text-orange-300'
                          : 'bg-green-900/30 text-green-400'
                      }`}
                    >
                      {b.occupancy_status}
                    </span>
                    <p className="text-slate-500 text-[10px] mt-0.5">
                      {b.max_draft_m}m draft · {b.crane_count} cranes
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-xs">No berth data available.</p>
          )}
        </div>
      </div>

      {/* ── Footer disclosure ────────────────────────────────────────────────── */}
      <div className="text-[10px] text-slate-600 space-y-0.5 pt-2 border-t border-slate-800">
        <p>Synthetic demo data · baseline_rule_v1 · Not a trained ML model · Optimization pending</p>
        <p>
          Port: {summary?.port_code} · Scenario: {scenario} · Horizon: 72h
        </p>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: string
}) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
      <p className="text-slate-500 text-[10px] font-medium uppercase tracking-wide mb-1">
        {label}
      </p>
      <p
        className="text-2xl font-semibold text-slate-100"
        style={accent ? { color: accent } : undefined}
        data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {value}
      </p>
      {sub && <p className="text-slate-500 text-[10px] mt-0.5">{sub}</p>}
    </div>
  )
}
