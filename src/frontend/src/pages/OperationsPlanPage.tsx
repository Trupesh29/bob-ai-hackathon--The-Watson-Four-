import { EmptyState } from '../components/EmptyState'

/**
 * Operations Plan — 72-hour shift plan with the human-approval gate.
 *
 * The supervisor reviews the baseline vs optimised plan here and must
 * explicitly approve or reject before any change becomes active.
 */
export default function OperationsPlanPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-100 mb-1">
        Operations Plan
      </h1>
      <p className="text-slate-400 text-sm mb-8">
        72-hour berth and crane assignment plan. Review the baseline vs optimised
        proposal and approve or reject before the plan becomes active.
      </p>
      <EmptyState
        title="No plan to review"
        description="An optimised plan proposal will appear here once the CP-SAT solver has run. The supervisor must explicitly approve before any plan becomes active."
      />
    </div>
  )
}
