import { EmptyState } from '../components/EmptyState'

/** Berth Map — spatial view of berth occupancy. */
export default function MapPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-100 mb-1">Berth Map</h1>
      <p className="text-slate-400 text-sm mb-8">
        Terminal layout showing berth occupancy and crane assignment.
      </p>
      <EmptyState
        title="Map unavailable"
        description="The berth layout map (Leaflet) will be added in a later plan once real berth geometry data is available."
      />
    </div>
  )
}
