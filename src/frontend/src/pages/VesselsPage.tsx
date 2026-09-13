/**
 * PortFlow AI — Vessels Page
 *
 * Shows the vessel arrival schedule for the 72-hour planning horizon.
 * Data comes from GET /api/v1/schedules and GET /api/v1/waiting-times.
 * No values are calculated in React — all data comes from FastAPI.
 */

import { useState, useEffect } from 'react'
import { fetchSchedules, fetchWaitingTimes, DEFAULT_PORT_CODE, ApiRequestError } from '../services/api'
import type { ScheduleItem, VesselWaitingPrediction, ScenarioId } from '../types/api'

const SCENARIOS: { id: ScenarioId; label: string }[] = [
  { id: 'baseline', label: 'Baseline' },
  { id: 'arrival_surge', label: 'Arrival Surge' },
  { id: 'crane_outage', label: 'Crane Outage' },
  { id: 'berth_closure', label: 'Berth Closure' },
  { id: 'handling_slowdown', label: 'Handling Slowdown' },
]

function priorityLabel(p: number): string {
  switch (p) {
    case 1: return 'CRITICAL'
    case 2: return 'High'
    case 3: return 'Normal'
    case 4: return 'Low'
    default: return 'Deferred'
  }
}

function priorityBadge(p: number): string {
  switch (p) {
    case 1: return 'bg-red-900/40 text-red-300 border border-red-700'
    case 2: return 'bg-orange-900/30 text-orange-300 border border-orange-700'
    case 3: return 'bg-slate-700 text-slate-300 border border-slate-600'
    default: return 'bg-slate-800 text-slate-500 border border-slate-700'
  }
}

function riskBadge(level: string): string {
  switch (level) {
    case 'high': return 'bg-red-900/40 text-red-300 border border-red-700'
    case 'medium': return 'bg-yellow-900/40 text-yellow-300 border border-yellow-700'
    default: return 'bg-green-900/40 text-green-300 border border-green-700'
  }
}

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`
  return `${hours.toFixed(1)}h`
}

function statusBadge(status: string): string {
  switch (status) {
    case 'in_port': return 'bg-blue-900/40 text-blue-300 border border-blue-700'
    case 'scheduled': return 'bg-teal-900/40 text-teal-300 border border-teal-700'
    case 'delayed': return 'bg-orange-900/40 text-orange-300 border border-orange-700'
    default: return 'bg-slate-700 text-slate-400 border border-slate-600'
  }
}

export default function VesselsPage() {
  const portCode = DEFAULT_PORT_CODE
  const [scenario, setScenario] = useState<ScenarioId>('baseline')
  const [schedules, setSchedules] = useState<ScheduleItem[]>([])
  const [waitMap, setWaitMap] = useState<Map<string, VesselWaitingPrediction>>(new Map())
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'empty'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setStatus('loading')
    setError(null)
    Promise.all([
      fetchSchedules(portCode, scenario),
      fetchWaitingTimes(portCode, 72, 'baseline'),
    ])
      .then(([schResp, waitResp]) => {
        setSchedules(schResp.schedules)
        const m = new Map<string, VesselWaitingPrediction>()
        for (const v of waitResp.vessels) m.set(v.schedule_id, v)
        setWaitMap(m)
        setStatus(schResp.schedules.length === 0 ? 'empty' : 'ready')
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Vessel Schedule</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            72-hour arrival schedule · Port <span className="text-teal-400">{portCode}</span>
          </p>
        </div>
        <span className="px-2.5 py-1 text-xs font-medium bg-amber-900/30 text-amber-300 border border-amber-700 rounded">
          Synthetic demo data
        </span>
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
          <p className="text-slate-400 text-sm animate-pulse">Loading vessel schedules…</p>
        </div>
      )}

      {status === 'error' && (
        <div className="rounded-lg border border-red-700 bg-red-900/20 p-6">
          <h2 className="text-red-300 font-semibold mb-2">Failed to load vessels</h2>
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {status === 'empty' && (
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-8 text-center">
          <p className="text-slate-300 font-medium mb-1">No vessel schedules found</p>
          <p className="text-slate-500 text-sm">
            Run <code className="text-teal-400">python -m data.seed</code> to load demo records.
          </p>
        </div>
      )}

      {status === 'ready' && (
        <>
          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total Vessels" value={String(schedules.length)} />
            <StatCard
              label="Critical Priority"
              value={String(schedules.filter(s => s.priority === 1).length)}
              accent="#dc2626"
            />
            <StatCard
              label="In Port"
              value={String(schedules.filter(s => s.status === 'in_port').length)}
            />
            <StatCard
              label="Scheduled"
              value={String(schedules.filter(s => s.status === 'scheduled').length)}
            />
          </div>

          {/* Vessel table */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/60 overflow-x-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
              <h2 className="text-slate-100 font-medium text-sm">Vessel Arrival Schedule</h2>
              <span className="text-slate-500 text-[10px]">
                waiting_baseline_v1 · Synthetic records
              </span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-700 bg-slate-900/30">
                  <th className="text-left px-4 py-2 font-medium">Vessel</th>
                  <th className="text-left px-4 py-2 font-medium">IMO</th>
                  <th className="text-left px-4 py-2 font-medium">ETA</th>
                  <th className="text-left px-4 py-2 font-medium">Cargo / TEU</th>
                  <th className="text-left px-4 py-2 font-medium">Priority</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-left px-4 py-2 font-medium">Berths</th>
                  <th className="text-left px-4 py-2 font-medium">Est. Wait</th>
                  <th className="text-left px-4 py-2 font-medium">Wait Risk</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map(s => {
                  const wt = waitMap.get(s.schedule_id)
                  return (
                    <tr
                      key={s.schedule_id}
                      className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-slate-100 font-medium">{s.vessel_name}</td>
                      <td className="px-4 py-2.5 text-slate-500 font-mono">{s.imo_number}</td>
                      <td className="px-4 py-2.5 text-slate-300">
                        {new Date(s.eta).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-2.5 text-slate-400">
                        <span>{s.cargo_type}</span>
                        <span className="ml-1 text-slate-500">· {s.expected_containers} TEU</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${priorityBadge(s.priority)}`}>
                          {priorityLabel(s.priority)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusBadge(s.status)}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-400">
                        {s.compatible_berth_count != null ? `${s.compatible_berth_count} compatible` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-300 font-medium">
                        {wt != null
                          ? formatHours(wt.predicted_waiting_hours)
                          : s.estimated_waiting_minutes != null
                          ? `${s.estimated_waiting_minutes}m`
                          : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        {wt ? (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${riskBadge(wt.risk_level)}`}>
                            {wt.risk_level}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <p className="text-[10px] text-slate-600">
            Synthetic demo data · baseline_rule_v1 · Not a trained ML model ·{' '}
            {schedules.length} vessel records
          </p>
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
      <p className="text-slate-500 text-[10px] font-medium uppercase tracking-wide mb-1">{label}</p>
      <p
        className="text-2xl font-semibold text-slate-100"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
    </div>
  )
}
