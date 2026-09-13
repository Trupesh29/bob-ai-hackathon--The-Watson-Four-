/**
 * PortFlow AI — Vessels Page
 *
 * Shows the vessel arrival schedule for the 72-hour planning horizon
 * or full schedule, reactive to scenario switching.
 * Data comes from GET /api/v1/schedules and GET /api/v1/waiting-times.
 */

import { useState, useEffect, useMemo } from 'react'
import { fetchSchedules, fetchWaitingTimes, DEFAULT_PORT_CODE, ApiRequestError } from '../services/api'
import type { ScheduleItem, VesselWaitingPrediction, ScenarioId } from '../types/api'

const SCENARIOS: { id: ScenarioId; label: string; desc: string }[] = [
  { id: 'baseline', label: 'Baseline', desc: 'Normal port operations (1.0x wait multiplier)' },
  { id: 'arrival_surge', label: 'Arrival Surge', desc: 'High-density vessel arrival spike (1.5x wait multiplier)' },
  { id: 'crane_outage', label: 'Crane Outage', desc: 'Reduced crane capacity in Berth Beta (1.3x wait multiplier)' },
  { id: 'berth_closure', label: 'Berth Closure', desc: 'Berth Gamma closed for maintenance (1.4x wait multiplier)' },
  { id: 'handling_slowdown', label: 'Handling Slowdown', desc: 'Reduced container moves per hour (1.2x wait multiplier)' },
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
    case 1: return 'bg-red-900/50 text-red-300 border border-red-700'
    case 2: return 'bg-orange-900/40 text-orange-300 border border-orange-700'
    case 3: return 'bg-slate-700 text-slate-300 border border-slate-600'
    default: return 'bg-slate-800 text-slate-400 border border-slate-700'
  }
}

function riskBadge(level: string): string {
  switch (level) {
    case 'high': return 'bg-red-900/50 text-red-300 border border-red-700 font-semibold'
    case 'medium': return 'bg-yellow-900/40 text-yellow-300 border border-yellow-700 font-medium'
    default: return 'bg-green-900/40 text-green-300 border border-green-700'
  }
}

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`
  return `${hours.toFixed(1)}h`
}

function statusBadge(status: string): string {
  switch (status) {
    case 'in_port': return 'bg-blue-900/50 text-blue-300 border border-blue-600 font-medium'
    case 'scheduled': return 'bg-teal-900/40 text-teal-300 border border-teal-600 font-medium'
    case 'delayed': return 'bg-orange-900/50 text-orange-300 border border-orange-600 font-medium'
    default: return 'bg-slate-700 text-slate-300 border border-slate-600'
  }
}

function deriveOperationalStatus(
  s: ScheduleItem,
  wt?: VesselWaitingPrediction,
  firstEtaMs?: number
): string {
  if (s.status !== 'completed') return s.status
  const etaMs = new Date(s.eta).getTime()
  const waitHours = wt ? wt.predicted_waiting_hours : ((s.estimated_waiting_minutes ?? 0) / 60)
  if (waitHours >= 12) return 'delayed'
  if (firstEtaMs && etaMs <= firstEtaMs + 12 * 3600 * 1000) return 'in_port'
  return 'scheduled'
}

export default function VesselsPage() {
  const portCode = DEFAULT_PORT_CODE
  const [scenario, setScenario] = useState<ScenarioId>('baseline')
  const [horizonFilter, setHorizonFilter] = useState<'72h' | 'all'>('72h')
  const [schedules, setSchedules] = useState<ScheduleItem[]>([])
  const [waitMap, setWaitMap] = useState<Map<string, VesselWaitingPrediction>>(new Map())
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'empty'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setStatus('loading')
    setError(null)
    Promise.all([
      fetchSchedules(portCode, scenario),
      fetchWaitingTimes(portCode, 72, 'baseline', scenario),
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

  // Compute reference time (earliest ETA)
  const earliestEtaMs = useMemo(() => {
    if (schedules.length === 0) return undefined
    const times = schedules.map(s => new Date(s.eta).getTime()).filter(t => !isNaN(t))
    return times.length > 0 ? Math.min(...times) : undefined
  }, [schedules])

  // Filtered schedules according to 72h horizon or all
  const displayedSchedules = useMemo(() => {
    if (horizonFilter === 'all' || !earliestEtaMs) return schedules
    const cutoff = earliestEtaMs + 72 * 3600 * 1000
    return schedules.filter(s => new Date(s.eta).getTime() <= cutoff)
  }, [schedules, horizonFilter, earliestEtaMs])

  // Compute aggregated stats
  const stats = useMemo(() => {
    let crit = 0
    let inPort = 0
    let sched = 0
    let delayed = 0
    let totalWaitHours = 0
    let countWithWait = 0

    displayedSchedules.forEach(s => {
      const wt = waitMap.get(s.schedule_id)
      const opStatus = deriveOperationalStatus(s, wt, earliestEtaMs)
      if (s.priority === 1) crit++
      if (opStatus === 'in_port') inPort++
      if (opStatus === 'scheduled') sched++
      if (opStatus === 'delayed') delayed++

      const h = wt ? wt.predicted_waiting_hours : (s.estimated_waiting_minutes ? s.estimated_waiting_minutes / 60 : 0)
      totalWaitHours += h
      countWithWait++
    })

    const avgWait = countWithWait > 0 ? (totalWaitHours / countWithWait).toFixed(1) : '0.0'

    return { crit, inPort, sched, delayed, avgWait }
  }, [displayedSchedules, waitMap, earliestEtaMs])

  const activeScenarioInfo = SCENARIOS.find(s => s.id === scenario)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Vessel Schedule</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Operational port call tracking · Port <span className="text-teal-400 font-semibold">{portCode}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Horizon toggle */}
          <div className="flex bg-slate-900 border border-slate-700 rounded p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setHorizonFilter('72h')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                horizonFilter === '72h'
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              72h Planning Horizon
            </button>
            <button
              type="button"
              onClick={() => setHorizonFilter('all')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                horizonFilter === 'all'
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Records ({schedules.length})
            </button>
          </div>
          <span className="px-2.5 py-1 text-xs font-medium bg-amber-900/30 text-amber-300 border border-amber-700 rounded">
            Synthetic demo data
          </span>
        </div>
      </div>

      {/* Scenario selector */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {SCENARIOS.map(s => (
            <button
              key={s.id}
              onClick={() => setScenario(s.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
                scenario === s.id
                  ? 'bg-teal-600 border-teal-400 text-white shadow-sm ring-1 ring-teal-400/50'
                  : 'bg-slate-800/90 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        {activeScenarioInfo && (
          <div className="text-xs bg-slate-900/60 border border-slate-800 rounded px-3 py-2 text-slate-300 flex items-center gap-2">
            <span className="text-teal-400 font-semibold">{activeScenarioInfo.label}:</span>
            <span>{activeScenarioInfo.desc}</span>
          </div>
        )}
      </div>

      {/* States */}
      {status === 'loading' && (
        <div className="flex items-center justify-center h-48">
          <p className="text-slate-400 text-sm animate-pulse">Updating vessel schedules for {scenario}…</p>
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
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <StatCard label="Total in Scope" value={String(displayedSchedules.length)} sub={horizonFilter === '72h' ? 'Next 72 Hours' : 'Full 14-Day View'} />
            <StatCard
              label="Critical Priority"
              value={String(stats.crit)}
              accent="#dc2626"
            />
            <StatCard
              label="In Port"
              value={String(stats.inPort)}
              accent="#38bdf8"
            />
            <StatCard
              label="Scheduled"
              value={String(stats.sched)}
              accent="#2dd4bf"
            />
            <StatCard
              label="Avg Predicted Wait"
              value={`${stats.avgWait}h`}
              accent="#f59e0b"
              sub={`Scenario: ${scenario}`}
            />
          </div>

          {/* Vessel table */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/60 overflow-x-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
              <h2 className="text-slate-100 font-medium text-sm">
                Vessel Arrival Schedule ({displayedSchedules.length} calls)
              </h2>
              <span className="text-slate-400 text-[10px]">
                Scenario: <span className="text-teal-300 font-medium">{scenario}</span> · Synthetic records
              </span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700 bg-slate-900/50">
                  <th className="text-left px-4 py-2.5 font-medium">Vessel</th>
                  <th className="text-left px-4 py-2.5 font-medium">IMO</th>
                  <th className="text-left px-4 py-2.5 font-medium">ETA</th>
                  <th className="text-left px-4 py-2.5 font-medium">Cargo / TEU</th>
                  <th className="text-left px-4 py-2.5 font-medium">Priority</th>
                  <th className="text-left px-4 py-2.5 font-medium">Status</th>
                  <th className="text-left px-4 py-2.5 font-medium">Berths</th>
                  <th className="text-left px-4 py-2.5 font-medium">Est. Wait</th>
                  <th className="text-left px-4 py-2.5 font-medium">Wait Risk</th>
                </tr>
              </thead>
              <tbody>
                {displayedSchedules.map(s => {
                  const wt = waitMap.get(s.schedule_id)
                  const opStatus = deriveOperationalStatus(s, wt, earliestEtaMs)
                  return (
                    <tr
                      key={s.schedule_id}
                      className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-slate-100 font-medium whitespace-nowrap">{s.vessel_name}</td>
                      <td className="px-4 py-2.5 text-slate-400 font-mono text-[11px] whitespace-nowrap">{s.imo_number}</td>
                      <td className="px-4 py-2.5 text-slate-300 whitespace-nowrap">
                        {new Date(s.eta).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-2.5 text-slate-300 whitespace-nowrap">
                        <span>{s.cargo_type}</span>
                        <span className="ml-1 text-slate-400">· {s.expected_containers} TEU</span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${priorityBadge(s.priority)}`}>
                          {priorityLabel(s.priority)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-medium tracking-tight ${statusBadge(opStatus)}`}>
                          {opStatus}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-300 whitespace-nowrap">
                        {s.compatible_berth_count != null ? `${s.compatible_berth_count} compatible` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-200 font-medium whitespace-nowrap">
                        {wt != null
                          ? formatHours(wt.predicted_waiting_hours)
                          : s.estimated_waiting_minutes != null
                          ? `${s.estimated_waiting_minutes}m`
                          : '—'}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
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
          <p className="text-[10px] text-slate-500">
            Synthetic demo data · baseline_rule_v1 with scenario multiplier ·{' '}
            {displayedSchedules.length} vessel records shown ({schedules.length} total seeded)
          </p>
        </>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  accent,
  sub,
}: {
  label: string
  value: string
  accent?: string
  sub?: string
}) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/70 p-3.5">
      <p className="text-slate-400 text-[10px] font-medium uppercase tracking-wide mb-1">{label}</p>
      <p
        className="text-2xl font-semibold text-slate-100"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
      {sub && <p className="text-slate-400 text-[10px] mt-1">{sub}</p>}
    </div>
  )
}
