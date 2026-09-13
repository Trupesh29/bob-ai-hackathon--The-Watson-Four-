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
  const [waitWeight, setWaitWeight] = useState<number>(1.0)
  const [priorityWeight, setPriorityWeight] = useState<number>(2.0)
  const [craneEfficiencyWeight, setCraneEfficiencyWeight] = useState<number>(1.0)

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">CP-SAT Optimiser Studio</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Google OR-Tools CP-SAT joint berth allocation and quay crane scheduling engine
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/operations-plan"
            className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 rounded transition-colors"
          >
            Go to Operations Plan →
          </Link>
          <span className="px-2.5 py-1 text-xs font-medium bg-amber-900/30 text-amber-300 border border-amber-700 rounded">
            Synthetic solver demo
          </span>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Parameter Configuration */}
        <div className="space-y-6">
          <div className="rounded-lg border border-slate-700 bg-slate-800/70 p-5 shadow-lg space-y-5">
            <h2 className="text-sm font-semibold text-slate-100 border-b border-slate-700 pb-2">
              Solver Tuning &amp; Constraints
            </h2>

            {/* Scenario */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Operational Scenario</label>
              <select
                value={scenario}
                onChange={e => setScenario(e.target.value as ScenarioId)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              >
                {SCENARIOS.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.label} — {s.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Planning Horizon */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-slate-300">Planning Horizon</span>
                <span className="text-teal-400 font-mono font-semibold">{horizonHours} Hours</span>
              </div>
              <input
                type="range"
                min="24"
                max="120"
                step="24"
                value={horizonHours}
                onChange={e => setHorizonHours(Number(e.target.value))}
                className="w-full accent-teal-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>24h</span>
                <span>48h</span>
                <span>72h</span>
                <span>96h</span>
                <span>120h</span>
              </div>
            </div>

            {/* Solver Time Limit */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-slate-300">Wall-Clock Timeout</span>
                <span className="text-teal-400 font-mono font-semibold">{timeLimitSec}s</span>
              </div>
              <input
                type="range"
                min="3"
                max="30"
                step="1"
                value={timeLimitSec}
                onChange={e => setTimeLimitSec(Number(e.target.value))}
                className="w-full accent-teal-500"
              />
            </div>

            {/* Objective Weights */}
            <div className="space-y-3 pt-2 border-t border-slate-700/60">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Objective Weight Multipliers
              </span>

              {/* Wait time weight */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Wait Time Minimization</span>
                  <span className="text-teal-400 font-mono">{waitWeight.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="2.0"
                  step="0.1"
                  value={waitWeight}
                  onChange={e => setWaitWeight(Number(e.target.value))}
                  className="w-full accent-teal-500"
                />
              </div>

              {/* Priority weight */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Priority Vessel Bonus</span>
                  <span className="text-teal-400 font-mono">{priorityWeight.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="5.0"
                  step="0.5"
                  value={priorityWeight}
                  onChange={e => setPriorityWeight(Number(e.target.value))}
                  className="w-full accent-teal-500"
                />
              </div>

              {/* Crane weight */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Crane Allocation Efficiency</span>
                  <span className="text-teal-400 font-mono">{craneEfficiencyWeight.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="2.0"
                  step="0.1"
                  value={craneEfficiencyWeight}
                  onChange={e => setCraneEfficiencyWeight(Number(e.target.value))}
                  className="w-full accent-teal-500"
                />
              </div>
            </div>

            {/* Run Button */}
            <button
              onClick={handleRunOptimizer}
              disabled={status === 'running'}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-semibold text-xs rounded transition-colors shadow-md flex items-center justify-center gap-2"
            >
              {status === 'running' ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Solving CP-SAT Model…</span>
                </>
              ) : (
                <span>⚡ Execute CP-SAT Optimization</span>
              )}
            </button>
          </div>

          {/* Solver Specifications Card */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-4 text-xs space-y-2">
            <h3 className="font-semibold text-slate-300">Constraint Model Constraints</h3>
            <ul className="text-slate-400 space-y-1.5 list-disc list-inside text-[11px]">
              <li><strong>No Berth Overlaps:</strong> IntervalVar non-overlap per berth</li>
              <li><strong>Physical Limits:</strong> Vessel draft &le; Berth max draft; length &le; max length</li>
              <li><strong>Crane Conservation:</strong> Total cranes used &le; available STS cranes</li>
              <li><strong>Temporal Feasibility:</strong> Berthing start &ge; Scheduled ETA</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Results & Telemetry (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {status === 'idle' && (
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-teal-950/80 border border-teal-700 text-teal-400 flex items-center justify-center mx-auto text-xl font-bold">
                ⚡
              </div>
              <h3 className="text-slate-100 font-semibold text-base">CP-SAT Optimiser Workbench Ready</h3>
              <p className="text-slate-400 text-xs max-w-md mx-auto">
                Select your parameters on the left and click <strong>Execute CP-SAT Optimization</strong> to run Google OR-Tools constraint programming and evaluate assignment proposals.
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="rounded-lg border border-red-700 bg-red-900/20 p-6">
              <h2 className="text-red-300 font-semibold mb-2">Optimization Failed</h2>
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {status === 'ready' && plan && (
            <div className="space-y-6">
              {/* Telemetry KPIs */}
              {plan.metrics && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-slate-700 bg-slate-800/70 p-3.5">
                    <p className="text-slate-400 text-[10px] font-medium uppercase tracking-wide">Solve Status</p>
                    <p className={`text-xl font-bold mt-0.5 ${plan.metrics.solve_status === 'OPTIMAL' ? 'text-green-400' : 'text-teal-300'}`}>
                      {plan.metrics.solve_status}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">in {plan.metrics.solve_wall_seconds.toFixed(2)}s wall-clock</p>
                  </div>
                  <div className="rounded-lg border border-slate-700 bg-slate-800/70 p-3.5">
                    <p className="text-slate-400 text-[10px] font-medium uppercase tracking-wide">Scheduled Ratio</p>
                    <p className="text-xl font-bold text-slate-100 mt-0.5">
                      {plan.metrics.scheduled_count} / {plan.metrics.total_vessels}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {plan.unscheduled.length} unscheduled
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-700 bg-slate-800/70 p-3.5">
                    <p className="text-slate-400 text-[10px] font-medium uppercase tracking-wide">Wait Reduction</p>
                    <p className="text-xl font-bold text-teal-300 mt-0.5">
                      {plan.metrics.wait_reduction_minutes} min
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">vs FIFO heuristic</p>
                  </div>
                  <div className="rounded-lg border border-slate-700 bg-slate-800/70 p-3.5">
                    <p className="text-slate-400 text-[10px] font-medium uppercase tracking-wide">Berth Utilisation</p>
                    <p className="text-xl font-bold text-slate-100 mt-0.5">
                      {(plan.metrics.berth_utilization_pct * 100).toFixed(0)}%
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">of rated capacity</p>
                  </div>
                </div>
              )}

              {/* Benchmark Comparison: CP-SAT vs FIFO */}
              <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-slate-100 font-semibold text-xs uppercase tracking-wide">
                    Benchmark Comparison: CP-SAT vs FIFO Heuristic
                  </h3>
                  <button
                    onClick={() => navigate('/operations-plan')}
                    className="text-xs bg-teal-700 hover:bg-teal-600 text-white px-3 py-1.5 rounded font-medium transition-colors"
                  >
                    Open in Operations Plan &amp; Approve →
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-900/60 rounded border border-slate-800 space-y-1">
                    <span className="text-slate-400 text-[11px] font-medium">FIFO Total Wait</span>
                    <p className="text-lg font-bold text-slate-300">{plan.metrics?.fifo_total_wait_minutes ?? 0} minutes</p>
                    <p className="text-[10px] text-slate-500">Unconstrained arrival order</p>
                  </div>
                  <div className="p-3 bg-teal-950/30 rounded border border-teal-800/40 space-y-1">
                    <span className="text-teal-400 text-[11px] font-medium">CP-SAT Optimized Wait</span>
                    <p className="text-lg font-bold text-teal-300">{plan.metrics?.opt_total_wait_minutes ?? 0} minutes</p>
                    <p className="text-[10px] text-teal-400/80">Joint berth &amp; crane constraint solver</p>
                  </div>
                </div>
              </div>

              {/* Assignment Proposals Table */}
              <div className="rounded-lg border border-slate-700 bg-slate-800/60 overflow-x-auto">
                <div className="px-4 py-3 border-b border-slate-700 flex justify-between items-center">
                  <h3 className="text-slate-100 font-semibold text-xs uppercase tracking-wide">
                    Solved Berth &amp; Crane Assignments ({plan.assignments.length})
                  </h3>
                  <span className="text-slate-500 text-[10px]">Model: cp_sat_v1</span>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-700 bg-slate-900/40">
                      <th className="text-left px-4 py-2 font-medium">Vessel</th>
                      <th className="text-left px-4 py-2 font-medium">Assigned Berth</th>
                      <th className="text-left px-4 py-2 font-medium">Cranes</th>
                      <th className="text-left px-4 py-2 font-medium">Berth Start</th>
                      <th className="text-left px-4 py-2 font-medium">Berth End</th>
                      <th className="text-left px-4 py-2 font-medium">Wait Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.assignments.map(a => (
                      <tr key={a.schedule_id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                        <td className="px-4 py-2 text-slate-100 font-medium">{a.vessel_name}</td>
                        <td className="px-4 py-2 text-teal-300 font-semibold">{a.berth_code}</td>
                        <td className="px-4 py-2 text-slate-300">{a.cranes_assigned} Cranes</td>
                        <td className="px-4 py-2 text-slate-400">
                          {new Date(a.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-2 text-slate-400">
                          {new Date(a.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-2 text-slate-200">{a.waiting_minutes}m</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
