/**
 * PortFlow AI — Operations Plan Page
 *
 * 72-hour berth and crane assignment plan via CP-SAT optimizer.
 * POST /api/v1/operations-plan → assignments + metrics + unscheduled vessels.
 * POST /api/v1/operations-plan/{plan_id}/approve → human approval gate.
 *
 * Human approval is REQUIRED before any plan change becomes active.
 * All data is synthetic (seed=2026). Not a real port operations system.
 */

import { useState, useCallback } from 'react'
import { fetchOperationsPlan, approveOperationsPlan, DEFAULT_PORT_CODE, ApiRequestError } from '../services/api'
import type { OperationsPlanResponse } from '../types/api'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMinutes(m: number): string {
  if (m < 60) return `${Math.round(m)}m`
  const h = Math.floor(m / 60)
  const rem = Math.round(m % 60)
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`
}

function fmtPct(v: number): string {
  return `${v.toFixed(1)}%`
}

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
    case 1: return 'bg-red-900/40 text-red-300 border-red-700'
    case 2: return 'bg-orange-900/30 text-orange-300 border-orange-700'
    default: return 'bg-slate-700 text-slate-300 border-slate-600'
  }
}

function solveStatusColour(s: string): string {
  switch (s) {
    case 'OPTIMAL': return 'text-green-400'
    case 'FEASIBLE': return 'text-teal-400'
    case 'INFEASIBLE': return 'text-red-400'
    default: return 'text-slate-400'
  }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString([], {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function OperationsPlanPage() {
  const portCode = DEFAULT_PORT_CODE

  const [planStatus, setPlanStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [approvalStatus, setApprovalStatus] = useState<'idle' | 'loading' | 'approved'>('idle')
  const [plan, setPlan] = useState<OperationsPlanResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [approvalMsg, setApprovalMsg] = useState<string | null>(null)

  const generatePlan = useCallback(() => {
    setPlanStatus('loading')
    setError(null)
    setApprovalStatus('idle')
    setApprovalMsg(null)
    fetchOperationsPlan({ port_code: portCode, horizon_hours: 72 })
      .then(p => {
        setPlan(p)
        setPlanStatus('ready')
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
        setPlanStatus('error')
      })
  }, [portCode])

  const handleApprove = useCallback(() => {
    if (!plan) return
    setApprovalStatus('loading')
    approveOperationsPlan(plan.plan_id)
      .then(resp => {
        setApprovalStatus('approved')
        setApprovalMsg(resp.message)
      })
      .catch(() => {
        setApprovalStatus('idle')
      })
  }, [plan])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Operations Plan</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            72-hour CP-SAT berth &amp; crane assignment plan ·{' '}
            <span className="text-teal-400">Human approval required</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 text-xs bg-amber-900/30 text-amber-300 border border-amber-700 rounded">
            Synthetic demo data
          </span>
          <span className="px-2.5 py-1 text-xs bg-slate-700 text-slate-400 border border-slate-600 rounded">
            cp_sat_v1 optimizer
          </span>
        </div>
      </div>

      {/* Generate button */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-slate-100 font-medium mb-1">Generate 72-Hour Plan</h2>
            <p className="text-slate-400 text-sm max-w-xl">
              The CP-SAT solver jointly optimises berth and crane assignments
              for all upcoming vessels, minimising total waiting time. Review and
              explicitly approve before any plan becomes active.
            </p>
          </div>
          <button
            onClick={generatePlan}
            disabled={planStatus === 'loading'}
            className="px-5 py-2 bg-teal-700 hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors whitespace-nowrap"
          >
            {planStatus === 'loading' ? '⏳ Optimising…' : '▶ Generate 72-hour Plan'}
          </button>
        </div>

        {/* Disclaimer */}
        <p className="text-slate-600 text-[10px] mt-4 border-t border-slate-700 pt-3">
          Demo optimisation using synthetic/seeded data. Not validated for real-world operations.
          All assignments require manual implementation by port staff.
        </p>
      </div>

      {/* Error */}
      {planStatus === 'error' && (
        <div className="rounded-lg border border-red-700 bg-red-900/20 p-5">
          <h3 className="text-red-300 font-semibold mb-1">Optimiser error</h3>
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Results */}
      {planStatus === 'ready' && plan && (
        <div className="space-y-6">
          {/* Metrics cards */}
          {plan.metrics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <MetricCard
                label="Scheduled"
                value={`${plan.metrics.scheduled_count} / ${plan.metrics.total_vessels}`}
                sub="vessels assigned"
              />
              <MetricCard
                label="Wait Reduction"
                value={fmtMinutes(plan.metrics.wait_reduction_minutes)}
                sub={`vs FIFO (${fmtMinutes(plan.metrics.fifo_total_wait_minutes)} → ${fmtMinutes(plan.metrics.opt_total_wait_minutes)})`}
                accent="#2dd4bf"
              />
              <MetricCard
                label="Berth Utilisation"
                value={fmtPct(plan.metrics.berth_utilization_pct)}
                sub="of capacity used"
              />
              <MetricCard
                label="Solve Status"
                value={plan.metrics.solve_status}
                sub={`in ${plan.metrics.solve_wall_seconds.toFixed(1)}s`}
                accent={solveStatusColour(plan.metrics.solve_status)}
              />
            </div>
          )}

          {/* Human approval gate */}
          <div
            className={`rounded-lg border p-4 ${
              approvalStatus === 'approved'
                ? 'border-green-700 bg-green-900/20'
                : 'border-amber-700 bg-amber-900/10'
            }`}
          >
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className={`font-semibold text-sm ${
                  approvalStatus === 'approved' ? 'text-green-300' : 'text-amber-300'
                }`}>
                  {approvalStatus === 'approved'
                    ? '✅ Plan Approved — Human review confirmed'
                    : '⚠️ Supervisor Approval Required'}
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  {approvalStatus === 'approved'
                    ? approvalMsg ?? 'No automated changes have been applied.'
                    : 'Review the assignment plan below, then approve. No changes are applied automatically.'}
                </p>
              </div>
              {approvalStatus !== 'approved' && (
                <button
                  onClick={handleApprove}
                  disabled={approvalStatus === 'loading'}
                  className="px-4 py-1.5 bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-medium rounded transition-colors whitespace-nowrap"
                >
                  {approvalStatus === 'loading' ? 'Recording…' : '✓ Approve Plan'}
                </button>
              )}
            </div>
          </div>

          {/* Explanation */}
          {plan.explanation && (
            <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
              <h3 className="text-slate-300 font-medium text-sm mb-2">Optimiser Explanation</h3>
              <pre className="text-slate-400 text-xs whitespace-pre-wrap leading-relaxed font-sans">
                {plan.explanation}
              </pre>
            </div>
          )}

          {/* Assignment table */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/60 overflow-x-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
              <h3 className="text-slate-100 font-medium text-sm">
                Berth Assignments ({plan.assignments.length})
              </h3>
              <span className="text-slate-500 text-[10px]">cp_sat_v1 · Synthetic data</span>
            </div>
            {plan.assignments.length === 0 ? (
              <p className="px-4 py-8 text-slate-500 text-sm text-center">
                No feasible assignments found for this horizon.
              </p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-700 bg-slate-900/30">
                    <th className="text-left px-4 py-2 font-medium">Vessel</th>
                    <th className="text-left px-4 py-2 font-medium">Berth</th>
                    <th className="text-left px-4 py-2 font-medium">Start</th>
                    <th className="text-left px-4 py-2 font-medium">End</th>
                    <th className="text-left px-4 py-2 font-medium">Service</th>
                    <th className="text-left px-4 py-2 font-medium">Wait</th>
                    <th className="text-left px-4 py-2 font-medium">Cranes</th>
                    <th className="text-left px-4 py-2 font-medium">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.assignments.map(a => (
                    <tr
                      key={a.schedule_id}
                      className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-slate-100 font-medium">{a.vessel_name}</td>
                      <td className="px-4 py-2.5">
                        <span className="px-1.5 py-0.5 bg-indigo-900/40 text-indigo-300 border border-indigo-700 rounded text-[10px] font-medium">
                          {a.berth_code}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-300">{formatTime(a.start_time)}</td>
                      <td className="px-4 py-2.5 text-slate-300">{formatTime(a.end_time)}</td>
                      <td className="px-4 py-2.5 text-teal-300">{fmtMinutes(a.service_minutes)}</td>
                      <td className="px-4 py-2.5 text-slate-400">{fmtMinutes(a.waiting_minutes)}</td>
                      <td className="px-4 py-2.5 text-slate-300">{a.cranes_assigned} 🏗️</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${priorityBadge(a.priority)}`}>
                          {priorityLabel(a.priority)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Unscheduled vessels */}
          {plan.unscheduled.length > 0 && (
            <div className="rounded-lg border border-orange-800 bg-orange-900/10 p-4">
              <h3 className="text-orange-300 font-medium text-sm mb-3">
                ⚠️ Unscheduled Vessels ({plan.unscheduled.length})
              </h3>
              <div className="space-y-2">
                {plan.unscheduled.map(u => (
                  <div
                    key={u.schedule_id}
                    className="flex items-start justify-between gap-4 bg-slate-800/40 rounded px-3 py-2"
                  >
                    <div>
                      <p className="text-slate-200 text-xs font-medium">{u.vessel_name}</p>
                      <p className="text-slate-500 text-[10px]">
                        Arrival: {formatTime(u.arrival_time)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${priorityBadge(u.priority)}`}>
                        {priorityLabel(u.priority)}
                      </span>
                      <p className="text-orange-400 text-[10px] mt-1">{u.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assumptions */}
          {plan.assumptions.length > 0 && (
            <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-4">
              <h3 className="text-slate-400 font-medium text-xs mb-2 uppercase tracking-wide">
                Assumptions &amp; Limitations
              </h3>
              <ul className="space-y-1">
                {plan.assumptions.map((a, i) => (
                  <li key={i} className="text-slate-500 text-[11px] flex gap-2">
                    <span className="text-slate-600 shrink-0">·</span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer */}
          <p className="text-[10px] text-slate-600">
            Plan ID: {plan.plan_id} · Synthetic data only · Human approval required before any operational use
          </p>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetricCard({
  label, value, sub, accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: string
}) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
      <p className="text-slate-500 text-[10px] font-medium uppercase tracking-wide mb-1">{label}</p>
      <p
        className="text-xl font-semibold text-slate-100"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
      {sub && <p className="text-slate-500 text-[10px] mt-0.5">{sub}</p>}
    </div>
  )
}
