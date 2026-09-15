/**
 * PortFlow AI — Optimiser Studio (Wow Moment)
 *
 * The primary demo page. Shows Before vs After impact panel,
 * assignment table with per-vessel reasons, conflict resolution badges,
 * and unscheduled vessel explanation.
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchOperationsPlan,
  DEFAULT_PORT_CODE,
  ApiRequestError,
} from '../services/api'
import type { OperationsPlanResponse, ScenarioId } from '../types/api'

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      window.setTimeout(
        () => reject(new Error('The solver is taking longer than expected. Please retry with a shorter time limit.')),
        timeoutMs,
      )
    ),
  ])
}

const SCENARIOS: { id: ScenarioId; label: string; description: string; crisis?: boolean }[] = [
  { id: 'baseline', label: 'Baseline', description: 'Standard operating conditions' },
  { id: 'arrival_surge', label: 'Arrival Surge', description: 'High-density vessel arrival spike', crisis: true },
  { id: 'crane_outage', label: 'Crane Outage', description: '2 cranes unavailable — reduced throughput', crisis: true },
  { id: 'berth_closure', label: 'Berth Closure', description: 'One berth in maintenance — limited capacity', crisis: true },
  { id: 'handling_slowdown', label: 'Handling Slowdown', description: 'Reduced crane moves per hour', crisis: true },
]

function fmtHours(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function priorityLabel(p: number) {
  switch (p) {
    case 1: return { label: 'P1 CRITICAL', cls: 'bg-red-100 text-red-700 border border-red-200' }
    case 2: return { label: 'P2 HIGH', cls: 'bg-orange-100 text-orange-700 border border-orange-200' }
    case 3: return { label: 'P3 NORMAL', cls: 'bg-blue-100 text-blue-700 border border-blue-200' }
    default: return { label: `P${p}`, cls: 'bg-gray-100 text-gray-600 border border-gray-200' }
  }
}

export default function OptimizerPage() {
  const portCode = DEFAULT_PORT_CODE
  const [scenario, setScenario] = useState<ScenarioId>('baseline')
  const [horizonHours, setHorizonHours] = useState<number>(72)
  const [timeLimitSec, setTimeLimitSec] = useState<number>(10)
  const [status, setStatus] = useState<'idle' | 'running' | 'ready' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [plan, setPlan] = useState<OperationsPlanResponse | null>(null)
  const [progressStep, setProgressStep] = useState(0)

  // Animated progress messages during solve
  const PROGRESS_MSGS = [
    'Loading vessel schedule and resource data...',
    'Evaluating berth compatibility for each vessel...',
    'Checking crane availability and capacity...',
    'Running CP-SAT constraint solver...',
    'Comparing against FIFO baseline...',
    'Computing before/after impact metrics...',
    'Generating plain-language explanations...',
  ]

  useEffect(() => {
    if (status !== 'running') { setProgressStep(0); return }
    const interval = setInterval(() => {
      setProgressStep(p => Math.min(p + 1, PROGRESS_MSGS.length - 1))
    }, Math.max(800, (timeLimitSec * 1000) / PROGRESS_MSGS.length))
    return () => clearInterval(interval)
  }, [status, timeLimitSec])

  const handleRunOptimizer = async () => {
    setStatus('running')
    setError(null)
    setProgressStep(0)
    try {
      const result = await withTimeout(
        fetchOperationsPlan({
          port_code: portCode,
          horizon_hours: horizonHours,
          solve_limit_seconds: timeLimitSec,
          scenario,
        }),
        (timeLimitSec + 15) * 1000,
      )
      setPlan(result)
      setStatus('ready')
      // Cache for Copilot and Berth Map
      try {
        const m = result.metrics
        const topAssignment = result.assignments.sort((a, b) => b.waiting_minutes - a.waiting_minutes)[0]
        localStorage.setItem('portflow_last_plan', JSON.stringify({
          plan_id: result.plan_id,
          scenario,
          top_vessel: topAssignment?.vessel_name ?? null,
          wait_saved_hours: m ? Math.round((m.wait_reduction_minutes / 60) * 10) / 10 : 0,
          assignments_summary: result.explanation.slice(0, 600),
          assignments: result.assignments,
          metrics: m,
          timestamp: new Date().toISOString(),
        }))
      } catch { /* ignore storage errors */ }
    } catch (err) {
      let msg = 'Solver optimization failed'
      if (err instanceof ApiRequestError) {
        msg = err.status === 0
          ? 'Backend unavailable — start FastAPI and retry'
          : `API error ${err.status}: ${JSON.stringify(err.body)}`
      } else if (err instanceof Error) {
        msg = err.message
      }
      setError(msg)
      setStatus('error')
    }
  }

  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr)
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }

  const m = plan?.metrics

  const selectedScenario = SCENARIOS.find(s => s.id === scenario)

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Optimizer Studio</h1>
          <p className="body-text mt-1 max-w-2xl">
            CP-SAT constraint solver for joint berth and crane allocation.
            Shows measurable before/after impact vs FIFO baseline.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {plan && (
            <Link
              to="/operations-plan"
              className="btn-navy text-sm py-2 px-4 whitespace-nowrap"
            >
              Review Operations Plan →
            </Link>
          )}
        </div>
      </div>

      {/* Demo Mode Banner */}
      <div className="rounded-xl border border-portflow-amber/40 bg-portflow-amberSoft px-5 py-3 text-sm text-portflow-ink flex items-start gap-2">
        <span className="text-portflow-amber font-bold shrink-0">ℹ</span>
        <span>
          <strong>Operational Risk Model (rule-based):</strong> Uses vessel dimensions, arrival queue, and crane availability to compute waiting time. Load the{' '}
          <button onClick={() => setScenario('crane_outage')} className="underline font-semibold hover:text-portflow-navy">Crane Outage</button>{' '}
          or <button onClick={() => setScenario('berth_closure')} className="underline font-semibold hover:text-portflow-navy">Berth Closure</button>{' '}
          scenario for maximum impact, then launch optimization below.
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Left: Planning Settings */}
        <div className="lg:col-span-4 space-y-5">
          <div className="card-main p-5 space-y-5 bg-white">
            <h2 className="section-title border-b border-[#E7DED4] pb-3">Planning Settings</h2>

            {/* Scenario */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#231F20]" htmlFor="scenario-select">
                Scenario Context
              </label>
              <select
                id="scenario-select"
                value={scenario}
                onChange={e => setScenario(e.target.value as ScenarioId)}
                className="w-full bg-[#F7F4EE] border border-[#E7DED4] rounded-xl px-3 py-2.5 text-sm text-[#231F20] focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              >
                {SCENARIOS.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.crisis ? '⚠️ ' : ''}{s.label}
                  </option>
                ))}
              </select>
              {selectedScenario && (
                <p className="text-xs text-[#6F6761] mt-1">{selectedScenario.description}</p>
              )}
            </div>

            {/* Planning Horizon */}
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <label className="text-sm font-semibold text-[#231F20]" htmlFor="horizon-slider">
                  Planning Horizon
                </label>
                <span className="text-sm font-bold text-[#213657]">{horizonHours} Hours</span>
              </div>
              <input
                id="horizon-slider"
                type="range" min="24" max="96" step="24"
                value={horizonHours}
                onChange={e => setHorizonHours(Number(e.target.value))}
                className="w-full accent-[#D99119]"
              />
              <div className="flex justify-between text-xs text-[#6F6761] font-medium">
                <span>24h</span><span>48h</span><span>72h</span><span>96h</span>
              </div>
            </div>

            {/* Solver Time Limit */}
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <label className="text-sm font-semibold text-[#231F20]" htmlFor="solver-slider">
                  Solver Time Limit
                </label>
                <span className="text-sm font-bold text-[#213657]">{timeLimitSec}s</span>
              </div>
              <input
                id="solver-slider"
                type="range" min="3" max="30" step="1"
                value={timeLimitSec}
                onChange={e => setTimeLimitSec(Number(e.target.value))}
                className="w-full accent-[#D99119]"
              />
            </div>

            <button
              id="run-optimizer-btn"
              onClick={handleRunOptimizer}
              disabled={status === 'running'}
              className="w-full py-3 btn-primary text-sm shadow-sm flex items-center justify-center gap-2"
            >
              {status === 'running' ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Optimizing Schedule...</span>
                </>
              ) : (
                <span className="font-semibold">⚡ Run Optimizer</span>
              )}
            </button>
          </div>

          {/* Constraints */}
          <div className="card-standard p-4 bg-[#F7F4EE] space-y-2">
            <h3 className="font-semibold text-sm text-[#231F20]">Constraints Applied</h3>
            <ul className="text-sm text-[#6F6761] space-y-1.5">
              {[
                'No berth overlaps (no-overlap constraint)',
                'Vessel dimensions ≤ berth limits (draft + length)',
                'Crane demand ≤ operational crane inventory',
                'Service time scales with crane allocation',
                'Priority 1–2 vessels scheduled before lower priority',
              ].map(c => (
                <li key={c} className="flex items-start gap-2">
                  <span className="text-green-600 font-bold shrink-0">✓</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>

          {/* Last plan summary if loaded */}
          {plan && m && (
            <div className="card-standard p-4 bg-[#F7F4EE] text-xs text-[#6F6761] space-y-1">
              <p className="font-semibold text-[#231F20] text-sm mb-2">Last Run Summary</p>
              <p>Solver run: <span className="font-mono text-[#213657]">Finished ({m.solve_status})</span> in {m.solve_wall_seconds.toFixed(2)}s</p>
              <p>Scheduled: {m.scheduled_count}/{m.total_vessels} vessels</p>
              <p>Method: Operational Risk Model (rule-based)</p>
            </div>
          )}
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-8 space-y-5">
          {status === 'idle' && (
            <div className="card-main p-12 text-center flex flex-col items-center justify-center bg-white min-h-[400px]">
              <div className="w-16 h-16 rounded-full bg-[#FFF0D0] text-3xl flex items-center justify-center mb-4">⚙️</div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-bold text-[#231F20]">Optimizer Ready</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Engine Ready</span>
              </div>
              <p className="text-[#6F6761] max-w-sm">
                Select a scenario on the left — try{' '}
                <button onClick={() => setScenario('crane_outage')} className="underline text-portflow-amber font-semibold">
                  Crane Outage
                </button>{' '}
                for a dramatic before/after comparison. Then click the solver button to optimize.
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="card-main border-red-200 bg-[#FCE8E6] p-6">
              <h2 className="text-[#C94B43] font-bold mb-2">Optimization Failed</h2>
              <p className="text-[#C94B43] text-sm">{error}</p>
              <button onClick={handleRunOptimizer} className="mt-3 text-sm btn-primary px-4 py-2">
                Retry
              </button>
            </div>
          )}

          {status === 'running' && (
            <div className="card-main p-12 text-center flex flex-col items-center justify-center bg-white min-h-[400px]">
              <div className="w-12 h-12 rounded-full border-4 border-[#D99119]/25 border-t-[#D99119] animate-spin mb-6" />
              <h3 className="text-xl font-bold text-[#231F20] mb-3">Running CP-SAT Solver</h3>
              <div className="w-full max-w-sm space-y-2">
                {PROGRESS_MSGS.map((msg, i) => (
                  <div key={i} className={`flex items-center gap-2 text-sm transition-opacity duration-500 ${i <= progressStep ? 'opacity-100' : 'opacity-20'}`}>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${i < progressStep ? 'bg-green-500 text-white' : i === progressStep ? 'bg-[#D99119] text-white animate-pulse' : 'bg-gray-200 text-gray-400'}`}>
                      {i < progressStep ? '✓' : i === progressStep ? '●' : '○'}
                    </span>
                    <span className={i <= progressStep ? 'text-[#231F20]' : 'text-[#6F6761]'}>{msg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {status === 'ready' && plan && (
            <div className="space-y-5">
              {/* Before vs After Impact Panel */}
              <div className="card-main bg-white p-5">
                <h3 className="section-title mb-4">⚡ Before vs After Optimization</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* FIFO Baseline */}
                  <div className="rounded-xl border-2 border-[#E7DED4] bg-[#F7F4EE] p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#6F6761] mb-3">Baseline FIFO (unoptimized)</p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-[#6F6761]">Total vessel wait</span>
                        <span className="font-bold text-[#231F20]">{fmtHours(m?.fifo_total_wait_minutes ?? 0)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-[#6F6761]">Scheduled vessels</span>
                        <span className="font-bold text-[#231F20]">{m?.total_vessels ?? 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-[#6F6761]">Avg wait per vessel</span>
                        <span className="font-bold text-[#231F20]">{fmtHours((m?.fifo_total_wait_minutes ?? 0) / Math.max(1, m?.total_vessels ?? 1))}</span>
                      </div>
                    </div>
                  </div>

                  {/* Optimized */}
                  <div className="rounded-xl border-2 border-[#D99119]/60 bg-[#FFF8E8] p-4 relative overflow-hidden">
                    <div className="absolute top-2 right-2">
                      <span className="badge-primary text-xs">{m?.solve_status || 'OPTIMAL'}</span>
                    </div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#B97710] mb-3">PortFlow Optimized CP-SAT ({m?.solve_status || 'OPTIMAL'})</p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-[#6F6761]">Total vessel wait</span>
                        <span className="font-bold text-[#213657]">{fmtHours(m?.opt_total_wait_minutes ?? 0)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-[#6F6761]">Scheduled vessels</span>
                        <span className="font-bold text-[#213657]">{m?.scheduled_count ?? 0}/{m?.total_vessels ?? 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-[#6F6761]">Avg wait per vessel</span>
                        <span className="font-bold text-[#213657]">{fmtHours(m?.avg_wait_minutes ?? 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Impact Summary Bar */}
                {m && m.wait_reduction_minutes > 0 && (
                  <div className="rounded-xl bg-gradient-to-r from-[#213657] to-[#2D4A73] p-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🏆</span>
                      <div>
                        <p className="text-white font-bold text-lg">
                          {fmtHours(m.wait_reduction_minutes)} ({m.wait_reduction_minutes} minutes saved)
                        </p>
                        <p className="text-white/70 text-xs">vs FIFO first-come, first-served</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <div className="bg-white/10 rounded-lg px-3 py-2 text-center">
                        <p className="text-white font-bold">{Math.round(m.berth_utilization_pct)}%</p>
                        <p className="text-white/70 text-xs">Berth util.</p>
                      </div>
                      <div className="bg-white/10 rounded-lg px-3 py-2 text-center">
                        <p className="text-white font-bold">{Math.round(m.crane_utilization_pct)}%</p>
                        <p className="text-white/70 text-xs">Crane util.</p>
                      </div>
                      {m.unscheduled_count === 0 && (
                        <div className="bg-green-500/20 border border-green-400/40 rounded-lg px-3 py-2 text-center">
                          <p className="text-green-300 font-bold text-sm">0</p>
                          <p className="text-green-300/80 text-xs">Conflicts</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Assignment Table */}
              <div className="card-main bg-white overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-[#E7DED4]">
                  <h3 className="section-title">Constraint Verification & Assignments</h3>
                  <span className="text-xs text-[#6F6761] font-medium">
                    {plan.assignments.length} vessel{plan.assignments.length !== 1 ? 's' : ''} scheduled
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#F7F4EE] text-[#6F6761] text-xs font-semibold uppercase tracking-wide">
                        <th className="text-left px-4 py-3">Vessel</th>
                        <th className="text-left px-4 py-3">Priority</th>
                        <th className="text-left px-4 py-3">Berth</th>
                        <th className="text-center px-4 py-3">Cranes</th>
                        <th className="text-right px-4 py-3">Start</th>
                        <th className="text-right px-4 py-3">Wait</th>
                        <th className="text-left px-4 py-3 min-w-[220px]">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7DED4]">
                      {plan.assignments
                        .slice()
                        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                        .map(a => {
                          const { label: plabel, cls: pcls } = priorityLabel(a.priority)
                          const waitClass = a.waiting_minutes > 240
                            ? 'text-red-600 font-bold'
                            : a.waiting_minutes > 60
                            ? 'text-orange-600 font-semibold'
                            : 'text-green-600'
                          return (
                            <tr key={a.schedule_id} className="hover:bg-[#FAFAF8] transition-colors">
                              <td className="px-4 py-3 font-semibold text-[#231F20] max-w-[160px] truncate" title={a.vessel_name}>
                                {a.vessel_name}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pcls}`}>{plabel}</span>
                              </td>
                              <td className="px-4 py-3 font-mono font-bold text-[#213657]">
                                Berth {a.berth_code}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="text-[#213657] font-semibold">{a.cranes_assigned} 🏗</span>
                              </td>
                              <td className="px-4 py-3 text-right text-[#6F6761] font-mono text-xs">
                                {formatDate(a.start_time)}
                              </td>
                              <td className={`px-4 py-3 text-right font-mono ${waitClass}`}>
                                {a.waiting_minutes === 0 ? (
                                  <span className="text-green-600 font-bold">None</span>
                                ) : (
                                  fmtHours(a.waiting_minutes)
                                )}
                              </td>
                              <td className="px-4 py-3 text-xs text-[#6F6761] max-w-[240px]">
                                {a.explanation || '—'}
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Unscheduled Vessels */}
              {plan.unscheduled && plan.unscheduled.length > 0 && (
                <div className="card-main bg-white p-5 border-l-4 border-red-400">
                  <h3 className="font-bold text-[#C94B43] mb-3 flex items-center gap-2">
                    ⚠️ {plan.unscheduled.length} Vessel{plan.unscheduled.length > 1 ? 's' : ''} Could Not Be Scheduled
                  </h3>
                  <div className="space-y-2">
                    {plan.unscheduled.map(u => (
                      <div key={u.schedule_id} className="flex items-start gap-3 bg-red-50 rounded-lg p-3">
                        <span className="text-red-400 font-bold shrink-0">✕</span>
                        <div>
                          <p className="font-semibold text-[#231F20] text-sm">{u.vessel_name}</p>
                          <p className="text-xs text-[#C94B43] mt-0.5">{u.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-[#6F6761] mt-3">
                    These vessels need manual review — check berth compatibility or adjust the planning horizon.
                  </p>
                </div>
              )}

              {/* Assumptions */}
              <div className="card-standard p-4 bg-[#F7F4EE] text-xs text-[#6F6761]">
                <p className="font-semibold text-[#231F20] mb-2 text-sm">Model Assumptions</p>
                <ul className="space-y-1 list-disc pl-4">
                  {plan.assumptions.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
