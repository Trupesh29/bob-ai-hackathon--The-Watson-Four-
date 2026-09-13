import { EmptyState } from '../components/EmptyState'

/** Predictions — congestion risk scores and vessel waiting-time forecasts. */
export default function PredictionsPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-100 mb-1">Predictions</h1>
      <p className="text-slate-400 text-sm mb-8">
        Congestion risk scores and vessel waiting-time forecasts from the ML pipeline.
      </p>
      <EmptyState
        title="No predictions available"
        description="Run POST /api/v1/predictions to generate congestion risk scores and waiting-time forecasts for the current horizon."
      />
    </div>
  )
}
