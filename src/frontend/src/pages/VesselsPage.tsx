import { EmptyState } from '../components/EmptyState'

/** Vessels — list of vessels in the current planning horizon. */
export default function VesselsPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-100 mb-1">Vessels</h1>
      <p className="text-slate-400 text-sm mb-8">
        Vessel arrival schedule for the current 72-hour planning horizon.
      </p>
      <EmptyState
        title="No vessels loaded"
        description="Vessel records will appear here once the database has been seeded with synthetic data."
      />
    </div>
  )
}
