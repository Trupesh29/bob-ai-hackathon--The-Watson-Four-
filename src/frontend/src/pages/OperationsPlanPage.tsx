/**
 * PortFlow AI — Operations Plan Page
 *
 * 72-hour berth and crane assignment plan via CP-SAT optimizer.
 * POST /api/v1/operations-plan → assignments + metrics + unscheduled vessels.
 * POST /api/v1/operations-plan/{plan_id}/approve → human approval gate.
 */

import { useState, useCallback, useRef } from 'react'
import { fetchOperationsPlan, approveOperationsPlan, DEFAULT_PORT_CODE, ApiRequestError } from '../services/api'
import type { OperationsPlanResponse } from '../types/api'

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => window.setTimeout(() => reject(new Error('Plan generation timed out. Try again or open Optimizer to use a shorter solve limit.')), timeoutMs)),
  ])
}

function fmtMinutes(m: number): string {
  if (m < 60) return `${Math.round(m)}m`
  const h = Math.floor(m / 60)
  const rem = Math.round(m % 60)
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`
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


export default function OperationsPlanPage() {
  const portCode = DEFAULT_PORT_CODE
  
  // States: 'idle' -> 'generated' -> 'approved' | 'rejected'
  const [workflowState, setWorkflowState] = useState<'idle' | 'generating' | 'generated' | 'approved' | 'rejected'>('idle')
  const [plan, setPlan] = useState<OperationsPlanResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionTimestamp, setActionTimestamp] = useState<Date | null>(null)
  const [overrideAdverse, setOverrideAdverse] = useState(false)

  const approveDialogRef = useRef<HTMLDialogElement>(null)
  const rejectDialogRef = useRef<HTMLDialogElement>(null)

  const generatePlan = useCallback(() => {
    setWorkflowState('generating')
    setError(null)
    setPlan(null)
    setActionTimestamp(null)
    setOverrideAdverse(false)

    withTimeout(fetchOperationsPlan({ port_code: portCode, horizon_hours: 72 }), 30_000)
      .then(p => {
        setPlan(p)
        setWorkflowState('generated')
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
        setWorkflowState('idle')
      })
  }, [portCode])

  const confirmApprove = () => {
    approveDialogRef.current?.close()
    if (!plan) return
    
    // Simulate backend call for approval
    approveOperationsPlan(plan.plan_id)
      .then(() => {
        setWorkflowState('approved')
        setActionTimestamp(new Date())
      })
      .catch(() => {
        // If it fails, we stay generated (or show error)
      })
  }

  const confirmReject = () => {
    rejectDialogRef.current?.close()
    if (!plan) return
    setWorkflowState('rejected')
    setActionTimestamp(new Date())
  }

  const getStepStatus = (step: number) => {
    if (step === 1) { // Generate Plan
      if (workflowState === 'idle') return 'current'
      return 'completed'
    }
    if (step === 2) { // Review Outcome
      if (workflowState === 'generated') return 'current'
      if (workflowState === 'approved' || workflowState === 'rejected') return 'completed'
      return 'future'
    }
    if (step === 3) { // Approve or reject
      if (workflowState === 'generated') return 'current' // Pending
      if (workflowState === 'rejected') return 'rejected'
      if (workflowState === 'approved') return 'completed'
      return 'future'
    }
    if (step === 4) { // Active schedule
      if (workflowState === 'approved') return 'current'
      return 'future'
    }
    return 'future'
  }

  const stepColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-[#2E7D5B] text-white border-[#2E7D5B]'
      case 'current': return 'bg-[#D99119] text-white border-[#D99119]'
      case 'rejected': return 'bg-[#C94B43] text-white border-[#C94B43]'
      default: return 'bg-white text-[#6F6761] border-[#E7DED4]'
    }
  }

  const isAdversePlan = plan ? ((plan.metrics?.wait_reduction_minutes ?? 0) <= 0 || plan.unscheduled.length > 0) : false

  return (
    <div className="space-y-6 lg:space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Operations Plan</h1>
          <p className="body-text mt-1">Trustworthy supervisor approval experience.</p>
        </div>
      </div>

      {/* Workflow Stepper */}
      <div className="card-main p-6 bg-white overflow-x-auto">
        <div className="flex items-center min-w-[600px]">
          <Step 
            num={1} title="Generate Plan" status={getStepStatus(1)} 
            colorClass={stepColor(getStepStatus(1))} 
          />
          <div className={`flex-1 h-px mx-4 ${getStepStatus(2) !== 'future' ? 'bg-[#2E7D5B]' : 'bg-[#E7DED4]'}`} />
          <Step 
            num={2} title="Review Outcome" status={getStepStatus(2)} 
            colorClass={stepColor(getStepStatus(2))} 
          />
          <div className={`flex-1 h-px mx-4 ${getStepStatus(3) === 'completed' || getStepStatus(3) === 'rejected' ? 'bg-[#2E7D5B]' : 'bg-[#E7DED4]'}`} />
          <Step 
            num={3} title="Approve/Reject" status={getStepStatus(3)} 
            colorClass={stepColor(getStepStatus(3))} 
          />
          <div className={`flex-1 h-px mx-4 ${getStepStatus(4) === 'current' ? 'bg-[#2E7D5B]' : 'bg-[#E7DED4]'}`} />
          <Step 
            num={4} title="Active Schedule" status={getStepStatus(4)} 
            colorClass={stepColor(getStepStatus(4))} 
          />
        </div>
      </div>

      {error && (
        <div className="card-main border-red-200 bg-[#FCE8E6] p-6">
          <h2 className="text-[#C94B43] font-bold mb-2">Generation Failed</h2>
          <p className="text-[#C94B43] text-sm">{error}</p>
        </div>
      )}

      {/* Main Content Area depending on State */}
      {workflowState === 'idle' || workflowState === 'generating' ? (
        <div className="card-main p-12 text-center bg-white flex flex-col items-center justify-center min-h-[300px]">
          <h3 className="text-xl font-bold text-[#231F20] mb-4">Start Planning Cycle</h3>
          <p className="text-[#6F6761] max-w-md mx-auto mb-8">
            Generate a new 72-hour CP-SAT assignment plan. The solver normally completes within a few seconds; this page will show a clear error if it takes longer than 30 seconds.
          </p>
          <button
            onClick={generatePlan}
            disabled={workflowState === 'generating'}
            className="btn-primary py-3 px-8 text-base shadow-sm"
          >
            {workflowState === 'generating' ? '⏳ Generating Plan...' : 'Generate Plan'}
          </button>
          {workflowState === 'generating' && (
            <p className="mt-4 text-xs text-[#6F6761] animate-pulse">Checking vessel, berth, and crane constraints. Please keep this page open.</p>
          )}
        </div>
      ) : plan ? (
        <div className="space-y-6">
          {/* Plan State Block */}
          <div className={`card-main p-6 border-l-4 ${
            workflowState === 'approved' ? 'border-l-[#2E7D5B] bg-[#E3F3EA]' :
            workflowState === 'rejected' ? 'border-l-[#C94B43] bg-[#FCE8E6]' :
            'border-l-[#D99119] bg-[#FFF0D0]'
          }`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className={`text-xl font-bold ${
                  workflowState === 'approved' ? 'text-[#2E7D5B]' :
                  workflowState === 'rejected' ? 'text-[#C94B43]' :
                  'text-[#B97710]'
                }`}>
                  {workflowState === 'approved' ? 'Active Demo Plan' :
                   workflowState === 'rejected' ? 'Rejected Plan' :
                   'Proposed Plan'}
                </h2>
                <div className="mt-2 text-sm text-[#231F20] space-y-1">
                  {workflowState === 'generated' ? (
                    <>
                      <p>Generated: {new Date().toLocaleTimeString()} UTC</p>
                      <p>Planning horizon: 72 hours (Solver: CP-SAT)</p>
                      <p>Plan ID: {plan.plan_id}</p>
                    </>
                  ) : (
                    <>
                      <p>
                        {workflowState === 'approved' ? 'Approved by:' : 'Rejected by:'} 
                        <strong> DEMO-SUPERVISOR</strong>
                      </p>
                      <p>
                        {workflowState === 'approved' ? 'Approved at:' : 'Rejected at:'} 
                        {' '}{actionTimestamp?.toLocaleTimeString()} UTC
                      </p>
                      <p>Plan ID: {plan.plan_id}</p>
                    </>
                  )}
                </div>
              </div>
              
              {/* Approval Actions */}
              {workflowState === 'generated' && (
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-[#E7DED4] shadow-sm">
                  <button
                    onClick={() => {
                      if (typeof rejectDialogRef.current?.showModal === 'function') {
                        rejectDialogRef.current.showModal()
                      }
                    }}
                    className="px-4 py-2 text-sm font-semibold text-[#C94B43] bg-[#FCE8E6] hover:bg-[#F8D0CD] rounded-lg transition-colors"
                  >
                    Reject Plan
                  </button>
                  <button
                    data-testid="approve-plan-btn"
                    disabled={isAdversePlan && !overrideAdverse}
                    onClick={() => {
                      if (typeof approveDialogRef.current?.showModal === 'function') {
                        approveDialogRef.current.showModal()
                      }
                    }}
                    className="btn-primary text-sm px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Approve Plan
                  </button>
                </div>
              )}

              {isAdversePlan && workflowState === 'generated' && (
                <div data-testid="plan-adverse-warning" className="w-full mt-4 p-4 border border-[#C94B43] bg-[#FCE8E6] rounded-xl flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-[#C94B43] text-sm">Adverse Plan Warning</h3>
                    <p className="text-xs text-[#C94B43] mt-1">This plan provides negative wait reduction or leaves vessels unscheduled.</p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      data-testid="override-checkbox"
                      checked={overrideAdverse}
                      onChange={e => setOverrideAdverse(e.target.checked)}
                      className="rounded border-[#C94B43] text-[#C94B43] focus:ring-[#C94B43]"
                    />
                    <span className="text-sm font-semibold text-[#C94B43]">Override acknowledgment required</span>
                  </label>
                </div>
              )}

              {/* Reset to generate another one if completed/rejected */}
              {(workflowState === 'approved' || workflowState === 'rejected') && (
                <button onClick={generatePlan} className="btn-navy text-sm">
                  Generate New Plan
                </button>
              )}
            </div>
          </div>

          {/* Assignment Table */}
          <div className="card-main bg-white overflow-hidden">
            <div className="p-5 border-b border-[#E7DED4] flex justify-between items-center bg-[#F7F4EE]">
              <h3 className="section-title">Assignment Table</h3>
              {workflowState === 'approved' && (
                <span className="badge-approved">Active Plan</span>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F7F4EE] border-b border-[#E7DED4]">
                    <th className="p-4 text-xs font-semibold text-[#6F6761] uppercase">Vessel</th>
                    <th className="p-4 text-xs font-semibold text-[#6F6761] uppercase">Berth</th>
                    <th className="p-4 text-xs font-semibold text-[#6F6761] uppercase">Start</th>
                    <th className="p-4 text-xs font-semibold text-[#6F6761] uppercase">End</th>
                    <th className="p-4 text-xs font-semibold text-[#6F6761] uppercase">Cranes</th>
                    <th className="p-4 text-xs font-semibold text-[#6F6761] uppercase">Wait Time</th>
                    <th className="p-4 text-xs font-semibold text-[#6F6761] uppercase">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7DED4]">
                  {plan.assignments.map(a => (
                    <tr key={a.schedule_id} className={`
                      transition-colors hover:bg-[#F7F4EE]
                      ${workflowState === 'generated' ? 'bg-[#FFF0D0]/30' : ''}
                    `}>
                      <td className="p-4 font-semibold text-[#213657] whitespace-nowrap">{a.vessel_name}</td>
                      <td className="p-4 text-[#231F20]">{a.berth_code}</td>
                      <td className="p-4 text-sm text-[#6F6761]">{formatTime(a.start_time)}</td>
                      <td className="p-4 text-sm text-[#6F6761]">{formatTime(a.end_time)}</td>
                      <td className="p-4 text-sm font-medium text-[#231F20]">{a.cranes_assigned}</td>
                      <td className="p-4 text-sm text-[#D85F2B] font-medium">{fmtMinutes(a.waiting_minutes)}</td>
                      <td className="p-4">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold uppercase
                          ${a.priority <= 2 ? 'bg-[#FCE8E6] text-[#C94B43]' : 'bg-[#E7DED4] text-[#6F6761]'}
                        `}>
                          {priorityLabel(a.priority)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {plan.assignments.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-[#6F6761]">No assignments found for this horizon.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Unscheduled vessels decision explanation */}
          {plan.unscheduled.length > 0 && (
            <div className="card-main border-l-4 border-l-[#D85F2B] bg-[#FDE6DB] p-5">
              <h3 className="font-bold text-[#D85F2B] mb-2 flex items-center gap-2">
                <span>⚠️</span> {plan.unscheduled.length} Unscheduled Vessels
              </h3>
              <ul className="space-y-1">
                {plan.unscheduled.map(u => (
                  <li key={u.schedule_id} className="text-sm text-[#231F20] bg-white p-2 rounded shadow-sm">
                    <strong>{u.vessel_name}</strong> — {u.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      ) : null}

      {/* Confirmation Dialogs */}
      <dialog ref={approveDialogRef} className="card-main p-0 backdrop:bg-[#213657]/40 outline-none">
        <div className="p-6 max-w-sm">
          <h3 className="text-lg font-bold text-[#231F20] mb-2">Approve Operations Plan?</h3>
          <p className="text-[#6F6761] text-sm mb-6">
            Approving this plan will make it active for all operational teams. Are you sure you want to proceed?
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
            if (typeof approveDialogRef.current?.close === 'function') {
              approveDialogRef.current.close()
            }
          }}
              className="px-4 py-2 text-sm font-medium text-[#6F6761] hover:bg-[#F7F4EE] rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={confirmApprove}
              className="btn-primary text-sm"
            >
              Yes, Approve Plan
            </button>
          </div>
        </div>
      </dialog>

      <dialog ref={rejectDialogRef} className="card-main p-0 backdrop:bg-[#213657]/40 outline-none">
        <div className="p-6 max-w-sm">
          <h3 className="text-lg font-bold text-[#C94B43] mb-2">Reject Operations Plan?</h3>
          <p className="text-[#6F6761] text-sm mb-6">
            This will discard the generated plan. You will need to adjust constraints or generate a new plan.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
            if (typeof rejectDialogRef.current?.close === 'function') {
              rejectDialogRef.current.close()
            }
          }}
              className="px-4 py-2 text-sm font-medium text-[#6F6761] hover:bg-[#F7F4EE] rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={confirmReject}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#C94B43] hover:bg-[#B23F38] rounded-lg transition-colors focus:ring-2 focus:ring-red-400/40"
            >
              Yes, Reject Plan
            </button>
          </div>
        </div>
      </dialog>

    </div>
  )
}

function Step({ num, title, status, colorClass }: { num: number, title: string, status: string, colorClass: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 ${colorClass}`}>
        {status === 'completed' ? '✓' : status === 'rejected' ? '✕' : num}
      </div>
      <span className={`text-xs font-semibold uppercase tracking-wider whitespace-nowrap ${
        status === 'future' ? 'text-[#6F6761]' : 'text-[#231F20]'
      }`}>
        {title}
      </span>
    </div>
  )
}
