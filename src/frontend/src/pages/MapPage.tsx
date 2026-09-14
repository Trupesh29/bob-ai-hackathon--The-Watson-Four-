/**
 * PortFlow AI — Berth Map Page
 *
 * Spatial terminal view showing berth occupancy, crane assignments,
 * vessel queues, and physical berth constraints.
 */

import { useState, useEffect, useMemo } from 'react'
import {
  fetchBerths,
  fetchSchedules,
  fetchDashboardCongestion,
  DEFAULT_PORT_CODE,
  ApiRequestError,
} from '../services/api'
import type {
  BerthItem,
  ScheduleItem,
  DashboardCongestionResponse,
  ScenarioId,
} from '../types/api'
import BerthLayoutMap, {
  berthDisplayStatus,
  berthStatusColour,
  berthStatusLabel,
} from '../components/BerthLayoutMap'

const SCENARIOS: { id: ScenarioId; label: string }[] = [
  { id: 'baseline', label: 'Baseline' },
  { id: 'arrival_surge', label: 'Arrival Surge' },
  { id: 'crane_outage', label: 'Crane Outage' },
  { id: 'berth_closure', label: 'Berth Closure' },
  { id: 'handling_slowdown', label: 'Handling Slowdown' },
]

export default function MapPage() {
  const portCode = DEFAULT_PORT_CODE
  const [scenario, setScenario] = useState<ScenarioId>('baseline')
  const [berths, setBerths] = useState<BerthItem[]>([])
  const [schedules, setSchedules] = useState<ScheduleItem[]>([])
  const [congestion, setCongestion] = useState<DashboardCongestionResponse | null>(null)
  const [selectedBerthCode, setSelectedBerthCode] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setStatus('loading')
    setError(null)
    Promise.all([
      fetchBerths(portCode),
      fetchSchedules(portCode, scenario),
      fetchDashboardCongestion(portCode, scenario, 72),
    ])
      .then(([berthsResp, schedResp, congResp]) => {
        setBerths(berthsResp.berths)
        setSchedules(schedResp.schedules)
        setCongestion(congResp)
        if (!selectedBerthCode && berthsResp.berths.length > 0) {
          setSelectedBerthCode(berthsResp.berths[0].berth_code)
        }
        setStatus('ready')
      })
      .catch(err => {
        let msg = 'Failed to load berth map data'
        if (err instanceof ApiRequestError) {
          msg = err.status === 0
            ? 'Backend unavailable — start FastAPI and refresh'
            : `API error ${err.status}: ${JSON.stringify(err.body)}`
        } else if (err instanceof Error) {
          msg = err.message
        }
        setError(msg)
        setStatus('error')
      })
  }, [portCode, scenario])

  // Derive high-risk and critical berth codes
  const { highRiskBerthCodes, criticalBerthCodes } = useMemo(() => {
    const highRisk = new Set<string>()
    const crit = new Set<string>()

    if (scenario === 'berth_closure') {
      crit.add('B03') // Berth Gamma closed in closure scenario
    }
    if (scenario === 'crane_outage') {
      highRisk.add('B02') // Berth Beta crane outage
    }
    if (scenario === 'arrival_surge') {
      highRisk.add('B01')
      highRisk.add('B02')
    }

    if (congestion) {
      congestion.windows.forEach(w => {
        if (w.risk_level === 'critical') {
          // flag all operational berths under critical window pressure
          berths.forEach(b => {
            if (b.occupancy_status === 'occupied') crit.add(b.berth_code)
          })
        }
      })
    }

    return { highRiskBerthCodes: highRisk, criticalBerthCodes: crit }
  }, [scenario, congestion, berths])

  // Selected berth object
  const selectedBerth = useMemo(() => {
    return berths.find(b => b.berth_code === selectedBerthCode) ?? berths[0]
  }, [berths, selectedBerthCode])

  // Vessels scheduled for selected berth
  const assignedVessels = useMemo(() => {
    if (!selectedBerth) return []
    return schedules.filter(
      s => s.preferred_berth_code === selectedBerth.berth_code
    )
  }, [schedules, selectedBerth])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Berth Map &amp; Spatial Terminal Layout</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Real-time berth occupancy, quay constraints, and crane capacity · Port <span className="text-teal-400 font-semibold">{portCode}</span>
          </p>
        </div>
        <span className="px-2.5 py-1 text-xs font-medium bg-amber-900/30 text-amber-300 border border-amber-700 rounded">
          Synthetic schematic data
        </span>
      </div>

      {/* Scenario selector */}
      <div className="flex flex-wrap gap-2">
        {SCENARIOS.map(s => (
          <button
            key={s.id}
            onClick={() => setScenario(s.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
              scenario === s.id
                ? 'bg-teal-600 border-teal-400 text-white shadow-sm ring-1 ring-teal-400/50'
                : 'bg-slate-800/90 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* States */}
      {status === 'loading' && (
        <div className="flex items-center justify-center h-56">
          <p className="text-slate-400 text-sm animate-pulse">Loading berth layout map…</p>
        </div>
      )}

      {status === 'error' && (
        <div className="rounded-lg border border-red-700 bg-red-900/20 p-6">
          <h2 className="text-red-300 font-semibold mb-2">Failed to load berth map</h2>
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {status === 'ready' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main spatial layout map (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-lg border border-slate-700 bg-slate-800/70 p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-slate-100 font-semibold text-sm">Quayside Berth Schematic</h2>
                  <p className="text-slate-400 text-xs mt-0.5">Click any berth block to inspect specifications and assigned vessels</p>
                </div>
                <span className="text-[11px] text-teal-400 font-mono bg-teal-950/60 border border-teal-800/40 px-2 py-0.5 rounded">
                  {berths.length} Operational Berths
                </span>
              </div>

              {/* Embedded Berth Layout Component */}
              <div className="bg-slate-950/70 rounded-lg p-4 border border-slate-800/80 mb-4">
                <BerthLayoutMap
                  berths={berths}
                  highRiskBerthCodes={highRiskBerthCodes}
                  criticalBerthCodes={criticalBerthCodes}
                />
              </div>

              {/* Berth Selector Buttons */}
              <div className="space-y-2">
                <p className="text-xs text-slate-400 font-medium">Select Berth to Inspect:</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {berths.map(b => {
                    const dispStatus = berthDisplayStatus(b, highRiskBerthCodes, criticalBerthCodes)
                    const color = berthStatusColour(dispStatus)
                    const isSelected = selectedBerth?.berth_code === b.berth_code

                    return (
                      <button
                        key={b.berth_id}
                        onClick={() => setSelectedBerthCode(b.berth_code)}
                        className={`text-left p-3 rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-slate-700/80 border-teal-400 ring-1 ring-teal-400 shadow-md'
                            : 'bg-slate-900/60 border-slate-700/70 hover:bg-slate-700/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-100 text-sm">{b.berth_code}</span>
                          <span
                            className="px-1.5 py-0.5 text-[10px] rounded font-semibold uppercase"
                            style={{
                              backgroundColor: color + '25',
                              color: color,
                              border: `1px solid ${color}60`,
                            }}
                          >
                            {berthStatusLabel(dispStatus)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 font-medium truncate">{b.berth_name}</p>
                        <div className="mt-2 text-[11px] text-slate-400 flex justify-between">
                          <span>{b.max_draft_m}m depth</span>
                          <span>{b.crane_count} cranes</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Terminal Capacity & Geometry Constraints */}
            <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
              <h3 className="text-slate-200 font-medium text-xs uppercase tracking-wide mb-3">
                Terminal Geometry &amp; Mooring Limitations
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-900/50 rounded border border-slate-800">
                  <p className="text-slate-400 font-medium">Deep-Water Access</p>
                  <p className="text-slate-200 mt-1 font-semibold">Berth Alpha (16.0m)</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Accommodates ultra-large container vessels (ULCVs) up to 18,000 TEU.</p>
                </div>
                <div className="p-3 bg-slate-900/50 rounded border border-slate-800">
                  <p className="text-slate-400 font-medium">Mid-Tier Pier</p>
                  <p className="text-slate-200 mt-1 font-semibold">Berth Beta (13.5m)</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Medium vessels up to 8,000 TEU with 3 post-Panamax STS cranes.</p>
                </div>
                <div className="p-3 bg-slate-900/50 rounded border border-slate-800">
                  <p className="text-slate-400 font-medium">Feeder &amp; Short-Sea</p>
                  <p className="text-slate-200 mt-1 font-semibold">Berth Gamma (11.0m)</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Feeder ships up to 3,000 TEU with dedicated quay turnaround.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right inspector column */}
          <div className="space-y-6">
            {selectedBerth && (
              <div className="rounded-lg border border-slate-700 bg-slate-800/70 p-5 shadow-lg space-y-4">
                <div className="border-b border-slate-700 pb-3">
                  <span className="text-[10px] uppercase font-bold text-teal-400 tracking-wider">
                    Berth Inspector
                  </span>
                  <h2 className="text-lg font-bold text-slate-100">{selectedBerth.berth_name} ({selectedBerth.berth_code})</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Port of Falkermere Quayside Sector
                  </p>
                </div>

                {/* Specs list */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-700/50">
                    <span className="text-slate-400">Max Draft (Depth):</span>
                    <span className="text-slate-200 font-medium font-mono">{selectedBerth.max_draft_m} metres</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-700/50">
                    <span className="text-slate-400">Max Length:</span>
                    <span className="text-slate-200 font-medium font-mono">{selectedBerth.max_length_m} metres</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-700/50">
                    <span className="text-slate-400">Allocated Cranes:</span>
                    <span className="text-teal-300 font-medium font-mono">{selectedBerth.crane_count} STS Cranes</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-700/50">
                    <span className="text-slate-400">Current Occupancy:</span>
                    <span className="text-slate-200 capitalize font-medium">{selectedBerth.occupancy_status}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-700/50">
                    <span className="text-slate-400">Scenario Status:</span>
                    <span
                      className="font-semibold"
                      style={{
                        color: berthStatusColour(
                          berthDisplayStatus(selectedBerth, highRiskBerthCodes, criticalBerthCodes)
                        ),
                      }}
                    >
                      {berthStatusLabel(
                        berthDisplayStatus(selectedBerth, highRiskBerthCodes, criticalBerthCodes)
                      )}
                    </span>
                  </div>
                </div>

                {/* Assigned / Upcoming Vessel Queue */}
                <div className="pt-2">
                  <h3 className="text-xs font-semibold text-slate-200 mb-2 flex items-center justify-between">
                    <span>Scheduled Port Calls</span>
                    <span className="text-teal-400 font-mono text-[11px]">({assignedVessels.length} vessels)</span>
                  </h3>

                  {assignedVessels.length === 0 ? (
                    <p className="text-slate-500 text-xs bg-slate-900/40 p-3 rounded text-center">
                      No vessels currently queued for {selectedBerth.berth_code} in this horizon.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {assignedVessels.slice(0, 5).map(v => (
                        <div
                          key={v.schedule_id}
                          className="bg-slate-900/60 border border-slate-700/60 p-2.5 rounded text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-100">{v.vessel_name}</span>
                            <span className="text-[10px] text-teal-400 font-mono">{v.expected_containers} TEU</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-400">
                            <span>ETA: {new Date(v.eta).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="text-amber-400">Wait: {v.estimated_waiting_minutes ? `${v.estimated_waiting_minutes}m` : '0m'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quay Operations Note */}
                <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-700/60">
                  ⚠️ Real berth allocation decisions must be verified against current tidal heights and terminal draft survey.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
