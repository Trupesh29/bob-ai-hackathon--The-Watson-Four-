import { EmptyState } from '../components/EmptyState'

/** Dashboard — entry point for the shift supervisor's 72-hour view. */
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-100 mb-1">Dashboard</h1>
      <p className="text-slate-400 text-sm mb-8">
        72-hour congestion overview for the current terminal.
      </p>
      <EmptyState
        title="No congestion data"
        description="Predictions will appear here once the ML pipeline is running and a planning horizon has been loaded."
      />
    </div>
  )
}
