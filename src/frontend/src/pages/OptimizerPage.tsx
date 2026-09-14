/**
 * PortFlow AI — Optimiser Studio
 *
 * Dedicated CP-SAT Constraint Programming Solver Studio.
 * Allows operations managers to configure solver weights, simulate scenarios,
 * analyze solver telemetry, and benchmark against FIFO heuristic baselines.
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  fetchOperationsPlan,
  DEFAULT_PORT_CODE,
  ApiRequestError,
} from '../services/api'
import type { OperationsPlanResponse, ScenarioId } from '../types/api'

const SCENARIOS: { id: ScenarioId; label: string; description: string }[] = [
  { id: 'baseline', label: 'Baseline', description: 'Standard operating conditions' },
  { id: 'arrival_surge', label: 'Arrival Surge', description: 'High-density vessel arrival spike' },
  { id: 'crane_outage', label: 'Crane Outage', description: 'Reduced crane capacity in Berth Beta' },
  { id: 'berth_closure', label: 'Berth Closure', description: 'Berth Gamma closed for maintenance' },
  { id: 'handling_slowdown', label: 'Handling Slowdown', description: 'Reduced crane moves/hour' },
]

export default function OptimizerPage() {
  const portCode = DEFAULT_PORT_CODE
  const navigate = useNavigate()

  // Solver parameters
  const [scenario, setScenario] = useState<ScenarioId>('baseline')
  const [horizonHours, setHorizonHours] = useState<number>(72)
  const [timeLimitSec, setTimeLimitSec] = useState<number>(10)

  // Execution state
  const [status, setStatus] = useState<'idle' | 'running' | 'ready' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [plan, setPlan] = useState<OperationsPlanResponse | null>(null)

  const handleRunOptimizer = async () => {
    setStatus('running')
    setError(null)
    try {
      const result = await fetchOperationsPlan({
        port_code: portCode,
        horizon_hours: horizonHours,
        solve_limit_seconds: timeLimitSec,
        scenario,
      })
      setPlan(result)
      setStatus('ready')
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

  // Format time for timeline block
  const formatTimeBlock = (isoStr: string) => {
    return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Optimizer Studio</h1>
          <p className="body-text mt-1 max-w-2xl">
            Real constraint-based CP-SAT decision engine for joint berth and crane allocation.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Link
            to="/operations-plan"
            className="btn-navy text-sm py-2 px-4 whitespace-nowrap"
          >
            Review Operations Plan &rarr;
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* Left: Planning Settings */}
        <div className="lg:col-span-4 space-y-6">
          <div className="card-main p-5 space-y-6 bg-white">
            <h2 className="section-title border-b border-[#E7DED4] pb-3">Planning Settings</h2>
            
            {/* Scenario */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#231F20]" htmlFor="scenario-select">Scenario Context</label>
              <select
                id="scenario-select"
                value={scenario}
                onChange={e => setScenario(e.target.value as ScenarioId)}
                className="w-full bg-[#F7F4EE] border border-[#E7DED4] rounded-xl px-3 py-2.5 text-sm text-[#231F20] focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              >
                {SCENARIOS.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Planning Horizon */}
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <label className="text-sm font-semibold text-[#231F20]" htmlFor="horizon-slider">Planning Horizon</label>
                <span className="text-sm font-bold text-[#213657]">{horizonHours} Hours</span>
              </div>
              <input
                id="horizon-slider"
                type="range"
                min="24"
                max="96"
                step="24"
                value={horizonHours}
                onChange={e => setHorizonHours(Number(e.target.value))}
                className="w-full accent-[#D99119]"
              />
              <div className="flex justify-between text-xs text-[#6F6761] font-medium">
                <span>24h</span>
                <span>48h</span>
                <span>72h</span>
                <span>96h</span>
              </div>
            </div>

            {/* Solver Time Limit */}
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <label className="text-sm font-semibold text-[#231F20]" htmlFor="solver-slider">Solver Time Limit</label>
                <span className="text-sm font-bold text-[#213657]">{timeLimitSec}s</span>
              </div>
              <input
                id="solver-slider"
                type="range"
                min="3"
                max="30"
                step="1"
                value={timeLimitSec}
                onChange={e => setTimeLimitSec(Number(e.target.value))}
                className="w-full accent-[#D99119]"
              />
            </div>

            <button
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
                <span className="font-semibold">Run Optimizer</span>
              )}
            </button>
          </div>

          <div className="card-standard p-5 bg-[#F7F4EE] space-y-3">
            <h3 className="font-semibold text-sm text-[#231F20]">Constraints Applied</h3>
            <ul className="text-sm text-[#6F6761] space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold shrink-0">✓</span>
                No berth overlaps
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold shrink-0">✓</span>
                Vessel dimensions compatible with berth
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold shrink-0">✓</span>
                Concurrent crane demand within available inventory
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold shrink-0">✓</span>
                Service duration changes with crane allocation
              </li>
            </ul>
          </div>
        </div>

        {/* Right: Optimization Outcome */}
        <div className="lg:col-span-8 space-y-6">
          {status === 'idle' && (
            <div className="card-main p-12 text-center flex flex-col items-center justify-center bg-white min-h-[400px]">
              <div className="w-16 h-16 rounded-full bg-[#FFF0D0] text-[#D99119] flex items-center justify-center text-2xl font-bold mb-4">
                ⚙️
              </div>
              <h3 className="text-xl font-bold text-[#231F20] mb-2">Engine Ready</h3>
              <p className="text-[#6F6761] max-w-sm">
                Configure your planning horizon and scenario on the left, then run the optimizer to generate a real schedule.
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="card-main border-red-200 bg-[#FCE8E6] p-6">
              <h2 className="text-[#C94B43] font-bold mb-2">Optimization Failed</h2>
              <p className="text-[#C94B43] text-sm">{error}</p>
            </div>
          )}

          {status === 'ready' && plan && (
            <div className="space-y-6">
              {/* Baseline vs Optimized Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card-standard p-5 bg-[#F7F4EE] border-[#E7DED4] shadow-none flex flex-col">
                  <h3 className="text-sm font-semibold text-[#6F6761] uppercase tracking-wide">Baseline FIFO</h3>
                  <div className="mt-4 flex-1">
                    <p className="text-[#231F20] text-lg font-bold">
                      Total waiting: {Math.round(plan.metrics?.fifo_total_wait_minutes ?? 0)} minutes
                    </p>
                    <p className="text-xs text-[#6F6761] mt-1">First-come, first-served unoptimized queue.</p>
                  </div>
                </div>
                
                <div className="card-standard p-5 bg-[#FFF0D0] border-[#D99119]/30 shadow-none flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4">
                    <span className="badge-primary">Optimized</span>
                  </div>
                  <h3 className="text-sm font-semibold text-[#B97710] uppercase tracking-wide">Optimized CP-SAT</h3>
                  <div className="mt-4 flex-1">
                    <p className="text-[#231F20] text-lg font-bold">
                      Total waiting: {Math.round(plan.metrics?.opt_total_wait_minutes ?? 0)} minutes
                    </p>
                    <p className="text-sm font-bold text-[#D85F2B] mt-1">
                      {Math.round(plan.metrics?.wait_reduction_minutes ?? 0)} minutes saved
                    </p>
                  </div>
                </div>
              </div>

              {/* Assignment Timeline */}
              <div className="card-main bg-white p-5 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between border-b border-[#E7DED4] pb-4 mb-4">
                  <h3 className="section-title">Constraint Verification &amp; Assignments</h3>
                  <div className="text-sm text-[#6F6761] flex items-center gap-4">
                    <span><strong>Solver status:</strong> {plan.metrics?.solve_status}</span>
                    <span><strong>Berth utilization:</strong> {Math.round((plan.metrics?.berth_utilization_pct || 0) * 100)}%</span>
                  </div>
                </div>

                <div className="overflow-x-auto pb-4">
                  <div className="min-w-[700px] space-y-4">
                    {/* Map through unique berths in assignments */}
                    {Array.from(new Set(plan.assignments.map(a => a.berth_code))).sort().map(berthCode => {
                      const berthAssignments = plan.assignments
                        .filter(a => a.berth_code === berthCode)
                        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
                      
                      return (
                        <div key={berthCode} className="flex gap-4">
                          <div className="w-24 shrink-0 font-semibold text-[#213657] pt-3 text-sm">
                            Berth {berthCode}
                          </div>
                          <div className="flex-1 relative min-h-[4rem] bg-[#F7F4EE] rounded-lg p-2 flex gap-2 overflow-x-auto">
                            {berthAssignments.map(a => (
                              <div
                                key={a.schedule_id}
                                className="shrink-0 bg-white border border-[#E7DED4] rounded-md p-2 shadow-sm min-w-[200px]"
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <span className="font-bold text-sm text-[#231F20] truncate pr-2">{a.vessel_name}</span>
                                  {a.priority === 1 && (
                                    <span title="Critical Priority" className="w-2 h-2 rounded-full bg-[#C94B43] shrink-0 mt-1"></span>
                                  )}
                                  {a.priority === 2 && (
                                    <span title="High Priority" className="w-2 h-2 rounded-full bg-[#D85F2B] shrink-0 mt-1"></span>
                                  )}
                                </div>
                                <div className="text-xs text-[#213657] font-medium mb-1">
                                  {formatTimeBlock(a.start_time)} – {formatTimeBlock(a.end_time)}
                                </div>
                                <div className="flex justify-between items-center text-[11px] text-[#6F6761]">
                                  <span>{a.cranes_assigned} cranes</span>
                                  <span className={a.waiting_minutes > 0 ? 'text-[#D85F2B]' : ''}>
                                    Wait: {Math.round(a.waiting_minutes)}m
                                  </span>
                                </div>
                              </div>
                            ))}
                            {berthAssignments.length === 0 && (
                              <div className="flex items-center text-xs text-[#6F6761] px-2 italic">Idle</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
