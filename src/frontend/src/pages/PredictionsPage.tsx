/**
 * PortFlow AI — Predictions Page
 *
 * Shows congestion forecasts (baseline_rule_v1) and vessel waiting-time
 * predictions (waiting_baseline_v1) from the backend.
 *
 * Endpoints used:
 *   GET /api/v1/dashboard/congestion  — 6-hour risk windows
 *   GET /api/v1/waiting-times         — per-vessel waiting time
 *
 * No ML values are calculated in React — all data comes from FastAPI.
 */

import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { fetchDashboardCongestion, fetchWaitingTimes, DEFAULT_PORT_CODE, ApiRequestError } from '../services/api'
import type { DashboardCongestionResponse, WaitingTimesResponse, ScenarioId, CongestionWindow } from '../types/api'

// ── Helpers ───────────────────────────────────────────────────────────────────

function riskColour(level: string): string {
  switch (level) {
    case 'critical': return '#dc2626'
    case 'high': return '#ea580c'
    case 'medium': return '#d97706'
    default: return '#16a34a'
  }
}

function riskBadge(level: string): string {
  switch (level) {
    case 'critical': return 'bg-red-900/40 text-red-300 border border-red-700'
    case 'high': return 'bg-orange-900/40 text-orange-300 border border-orange-700'
    case 'medium': return 'bg-yellow-900/40 text-yellow-300 border border-yellow-700'
    default: return 'bg-green-900/40 text-green-300 border border-green-700'
  }
}

function windowLabel(w: CongestionWindow, i: number): string {
  if (i % 2 !== 0) return ''
  try {
    return new Date(w.window_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return w.window_start.slice(11, 16)
  }
}

function fmtHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`
  return `${hours.toFixed(1)}h`
}

const SCENARIOS: { id: ScenarioId; label: string }[] = [
  { id: 'baseline', label: 'Baseline' },
  { id: 'arrival_surge', label: 'Arrival Surge' },
  { id: 'crane_outage', label: 'Crane Outage' },
  { id: 'berth_closure', label: 'Berth Closure' },
  { id: 'handling_slowdown', label: 'Handling Slowdown' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function PredictionsPage() {
  const portCode = DEFAULT_PORT_CODE
  const [scenario, setScenario] = useState<ScenarioId>('baseline')
  const [congestion, setCongestion] = useState<DashboardCongestionResponse | null>(null)
  const [waitingTimes, setWaitingTimes] = useState<WaitingTimesResponse | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setStatus('loading')
    setError(null)
    Promise.all([
      fetchDashboardCongestion(portCode, scenario, 72, 'baseline'),
      fetchWaitingTimes(portCode, 72, 'baseline'),
    ])
      .then(([cong, wait]) => {
        setCongestion(cong)
        setWaitingTimes(wait)
        setStatus('ready')
      })
      .catch(err => {
        let msg = 'Unknown error'
        if (err instanceof ApiRequestError) {
          msg = err.status === 0
            ? 'Backend unavailable — start FastAPI and refresh'
            : `API error ${err.status}: ${JSON.stringify(err.body)}`
        } else if (err instanceof Error) {
          msg = err.message
        }
        setError(msg)
        setStatus('error')
      })
  }, [portCode, scenario])

  // Chart data
  const chartData = (congestion?.windows ?? []).map((w, i) => ({
    label: windowLabel(w, i),
    fullLabel: (() => {
      try { return new Date(w.window_start).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }
      catch { return w.window_start }
    })(),
    probability: Math.round(w.risk_probability * 100),
    level: w.risk_level,
    queue: w.estimated_queue_count,
  }))

  // Waiting-time chart data (top 8 vessels)
  const waitChartData = (waitingTimes?.vessels ?? [])
    .slice(0, 8)
    .map(v => ({
      name: v.vessel_name.split(' ').slice(-1)[0], // last word for brevity
      fullName: v.vessel_name,
      hours: parseFloat(v.predicted_waiting_hours.toFixed(2)),
      level: v.risk_level,
    }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Predictions</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            72-hour congestion forecast &amp; vessel waiting-time predictions
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 text-xs bg-amber-900/30 text-amber-300 border border-amber-700 rounded">
            Synthetic demo data
          </span>
          <span className="px-2.5 py-1 text-xs bg-slate-700 text-slate-400 border border-slate-600 rounded">
            baseline_rule_v1
          </span>
        </div>
      </div>

      {/* Scenario selector */}
      <div className="flex flex-wrap gap-2">
        {SCENARIOS.map(s => (
          <button
            key={s.id}
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

      {/* States */}
      {status === 'loading' && (
        <div className="flex items-center justify-center h-48">
          <p className="text-slate-400 text-sm animate-pulse">Loading predictions…</p>
        </div>
      )}

      {status === 'error' && (
        <div className="rounded-lg border border-red-700 bg-red-900/20 p-6">
          <h2 className="text-red-300 font-semibold mb-2">Failed to load predictions</h2>
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {status === 'ready' && (
        <div className="space-y-6">
          {/* Method note */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="px-3 py-1.5 rounded border border-indigo-700 bg-indigo-900/20 text-xs text-indigo-300">
              Congestion: <strong>baseline_rule_v1</strong> — deterministic rule
            </div>
            <div className="px-3 py-1.5 rounded border border-violet-700 bg-violet-900/20 text-xs text-violet-300">
              Waiting time: <strong>waiting_baseline_v1</strong> — historical records
            </div>
            <div className="text-slate-600 text-[10px]">
              Switch to ML mode on the Dashboard page
            </div>
          </div>

          {/* Congestion chart */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-slate-100 font-medium text-sm">
                  72-Hour Congestion Forecast — {SCENARIOS.find(s => s.id === scenario)?.label}
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  baseline_rule_v1 · 6-hour windows · Not a trained ML model
                </p>
              </div>
              {congestion && (
                <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                  riskBadge(
                    chartData.reduce(
                      (max, d) => {
                        const order = ['critical', 'high', 'medium', 'low']
                        return order.indexOf(d.level) < order.indexOf(max) ? d.level : max
                      },
                      'low' as string,
                    )
                  )
                }`}>
                  Peak:{' '}
                  {chartData.reduce(
                    (max, d) => {
                      const order = ['critical', 'high', 'medium', 'low']
                      return order.indexOf(d.level) < order.indexOf(max) ? d.level : max
                    },
                    'low' as string,
                  ).toUpperCase()}
                </span>
              )}
            </div>
            <div className="h-56">
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
                          <p className="text-slate-500 mt-1">baseline_rule_v1</p>
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

          {/* Waiting-time chart */}
          {waitChartData.length > 0 && (
            <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
              <div className="mb-3">
                <h2 className="text-slate-100 font-medium text-sm">
                  Predicted Waiting Time — Top {waitChartData.length} Vessels
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  waiting_baseline_v1 · Historical records · Sorted by highest wait
                </p>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={waitChartData}
                    layout="vertical"
                    margin={{ top: 4, right: 8, bottom: 4, left: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                      tickLine={false}
                      axisLine={{ stroke: '#334155' }}
                      tickFormatter={v => `${v}h`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                      tickLine={false}
                      axisLine={{ stroke: '#334155' }}
                      width={56}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const d = payload[0].payload
                        return (
                          <div className="bg-slate-900 border border-slate-600 rounded p-2 text-xs">
                            <p className="text-slate-200 font-medium">{d.fullName}</p>
                            <p className="text-slate-300">Predicted wait: {fmtHours(d.hours)}</p>
                            <p className={`${riskBadge(d.level)} px-1 py-0.5 rounded mt-1 inline-block`}>
                              {d.level}
                            </p>
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="hours" radius={[0, 3, 3, 0]}>
                      {waitChartData.map((entry, index) => (
                        <Cell key={index} fill={riskColour(entry.level)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Window detail table */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/60 overflow-x-auto">
            <div className="px-4 py-3 border-b border-slate-700">
              <h3 className="text-slate-100 font-medium text-sm">Congestion Window Detail</h3>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-700 bg-slate-900/30">
                  <th className="text-left px-4 py-2 font-medium">Window Start</th>
                  <th className="text-left px-4 py-2 font-medium">Risk %</th>
                  <th className="text-left px-4 py-2 font-medium">Level</th>
                  <th className="text-left px-4 py-2 font-medium">Queue</th>
                  <th className="text-left px-4 py-2 font-medium">Rule Drivers</th>
                </tr>
              </thead>
              <tbody>
                {(congestion?.windows ?? []).map((w, i) => (
                  <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                    <td className="px-4 py-2 text-slate-300">
                      {(() => {
                        try {
                          return new Date(w.window_start).toLocaleString([], {
                            weekday: 'short', hour: '2-digit', minute: '2-digit',
                          })
                        } catch { return w.window_start }
                      })()}
                    </td>
                    <td className="px-4 py-2 text-slate-100 font-medium">
                      {Math.round(w.risk_probability * 100)}%
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${riskBadge(w.risk_level)}`}>
                        {w.risk_level}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-400">{w.estimated_queue_count}</td>
                    <td className="px-4 py-2 text-slate-500 text-[10px]">
                      {w.rule_drivers.join(' · ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <p className="text-[10px] text-slate-600">
            Synthetic demo data · baseline_rule_v1 · Not a trained ML model ·
            ML mode available on the Dashboard page
          </p>
        </div>
      )}
    </div>
  )
}
