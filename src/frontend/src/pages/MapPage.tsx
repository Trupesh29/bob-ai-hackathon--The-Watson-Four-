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
  berthStatusColors,
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

  const { highRiskBerthCodes, criticalBerthCodes } = useMemo(() => {
    const highRisk = new Set<string>()
    const crit = new Set<string>()

    if (scenario === 'berth_closure') {
      crit.add('B03')
    }
    if (scenario === 'crane_outage') {
      highRisk.add('B02')
    }
    if (scenario === 'arrival_surge') {
      highRisk.add('B01')
      highRisk.add('B02')
    }

    if (congestion) {
      congestion.windows.forEach(w => {
        if (w.risk_level === 'critical') {
          berths.forEach(b => {
            if (b.occupancy_status === 'occupied') crit.add(b.berth_code)
          })
        }
      })
    }

    return { highRiskBerthCodes: highRisk, criticalBerthCodes: crit }
  }, [scenario, congestion, berths])

  const selectedBerth = useMemo(() => {
    return berths.find(b => b.berth_code === selectedBerthCode) ?? berths[0]
  }, [berths, selectedBerthCode])

  const assignedVessels = useMemo(() => {
    if (!selectedBerth) return []
    return schedules.filter(
      s => s.preferred_berth_code === selectedBerth.berth_code
    )
  }, [schedules, selectedBerth])

  return (
    <div className="space-y-6 lg:space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Berth Map &amp; Terminal</h1>
          <p className="body-text mt-1 max-w-2xl">
            Real-time berth occupancy and constraints for Port <strong>{portCode}</strong>.
          </p>
        </div>
        
        {/* Scenario selector */}
        <div className="flex flex-wrap gap-2">
          {SCENARIOS.map(s => (
            <button
              key={s.id}
              onClick={() => setScenario(s.id)}
              className={`px-4 py-2 text-sm font-medium rounded-xl border transition-all ${
                scenario === s.id
                  ? 'bg-white border-[#213657] text-[#213657] shadow-sm ring-1 ring-[#213657]'
                  : 'bg-[#F7F4EE] border-[#E7DED4] text-[#6F6761] hover:bg-white hover:text-[#213657]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {status === 'loading' && (
        <div className="flex items-center justify-center h-56">
          <p className="text-[#6F6761] text-sm animate-pulse">Loading berth layout map…</p>
        </div>
      )}

      {status === 'error' && (
        <div className="card-main border-red-200 bg-[#FCE8E6] p-6">
          <h2 className="text-[#C94B43] font-bold mb-2">Failed to load berth map</h2>
          <p className="text-[#C94B43] text-sm">{error}</p>
        </div>
      )}

      {status === 'ready' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main spatial layout map (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card-main bg-[#FAF9F6] p-6 flex flex-col h-[500px]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-title">Quayside Berth Schematic</h2>
              </div>

              {/* Embedded Berth Layout Component */}
              <div className="flex-1 rounded-xl bg-white border border-[#E7DED4] shadow-sm overflow-hidden flex items-center justify-center">
                <BerthLayoutMap
                  berths={berths}
                  highRiskBerthCodes={highRiskBerthCodes}
                  criticalBerthCodes={criticalBerthCodes}
                />
              </div>
            </div>

            <div className="card-standard p-6 bg-white space-y-4">
              <h3 className="section-title text-sm uppercase tracking-wider text-[#6F6761]">
                Terminal Geometry &amp; Mooring Limitations
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-[#F7F4EE] rounded-xl border border-[#E7DED4]">
                  <p className="text-[#6F6761] font-medium text-xs uppercase">Deep-Water Access</p>
                  <p className="text-[#213657] mt-1 font-bold">Berth Alpha (16.0m)</p>
                  <p className="text-sm text-[#6F6761] mt-2">Accommodates ultra-large container vessels (ULCVs) up to 18,000 TEU.</p>
                </div>
                <div className="p-4 bg-[#F7F4EE] rounded-xl border border-[#E7DED4]">
                  <p className="text-[#6F6761] font-medium text-xs uppercase">Mid-Tier Pier</p>
                  <p className="text-[#213657] mt-1 font-bold">Berth Beta (13.5m)</p>
                  <p className="text-sm text-[#6F6761] mt-2">Medium vessels up to 8,000 TEU with 3 post-Panamax STS cranes.</p>
                </div>
                <div className="p-4 bg-[#F7F4EE] rounded-xl border border-[#E7DED4]">
                  <p className="text-[#6F6761] font-medium text-xs uppercase">Feeder &amp; Short-Sea</p>
                  <p className="text-[#213657] mt-1 font-bold">Berth Gamma (11.0m)</p>
                  <p className="text-sm text-[#6F6761] mt-2">Feeder ships up to 3,000 TEU with dedicated quay turnaround.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right inspector column */}
          <div className="space-y-6">
            <div className="card-main bg-white overflow-hidden flex flex-col h-full max-h-[800px]">
              {selectedBerth ? (
                <>
                  <div className="p-6 border-b border-[#E7DED4] bg-[#F7F4EE]">
                    <span className="text-xs font-bold text-[#D99119] uppercase tracking-wider block mb-1">
                      Berth Inspector
                    </span>
                    <h2 className="text-2xl font-bold text-[#231F20]">{selectedBerth.berth_name}</h2>
                    <p className="text-sm text-[#6F6761] font-medium">Code: {selectedBerth.berth_code}</p>
                  </div>

                  <div className="p-6 space-y-4 border-b border-[#E7DED4]">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-[#6F6761]">Status</span>
                      <span
                        className="px-2.5 py-1 rounded-md text-xs font-bold uppercase border"
                        style={{
                          backgroundColor: berthStatusColors(berthDisplayStatus(selectedBerth, highRiskBerthCodes, criticalBerthCodes)).bg,
                          color: berthStatusColors(berthDisplayStatus(selectedBerth, highRiskBerthCodes, criticalBerthCodes)).text,
                          borderColor: berthStatusColors(berthDisplayStatus(selectedBerth, highRiskBerthCodes, criticalBerthCodes)).border,
                        }}
                      >
                        {berthStatusLabel(berthDisplayStatus(selectedBerth, highRiskBerthCodes, criticalBerthCodes))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-[#6F6761]">Max Draft (Depth)</span>
                      <span className="text-sm font-bold text-[#231F20]">{selectedBerth.max_draft_m} metres</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-[#6F6761]">Max Length</span>
                      <span className="text-sm font-bold text-[#231F20]">{selectedBerth.max_length_m} metres</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-[#6F6761]">Allocated Cranes</span>
                      <span className="text-sm font-bold text-[#213657]">{selectedBerth.crane_count} STS Cranes</span>
                    </div>
                  </div>

                  <div className="p-6 flex-1 overflow-y-auto bg-white">
                    <h3 className="font-bold text-[#231F20] mb-4 flex justify-between items-center">
                      <span>Scheduled Port Calls</span>
                      <span className="text-xs bg-[#E7DED4] text-[#6F6761] px-2 py-0.5 rounded-full">{assignedVessels.length} vessels</span>
                    </h3>

                    {assignedVessels.length === 0 ? (
                      <p className="text-[#6F6761] text-sm text-center p-4 bg-[#F7F4EE] rounded-xl">
                        No vessels currently queued for {selectedBerth.berth_code} in this horizon.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {assignedVessels.slice(0, 5).map(v => (
                          <div
                            key={v.schedule_id}
                            className="p-3 rounded-xl border border-[#E7DED4] bg-white hover:border-[#D99119] transition-colors"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-[#213657] text-sm">{v.vessel_name}</span>
                              <span className="text-xs font-semibold text-[#6F6761]">{v.expected_containers} TEU</span>
                            </div>
                            <div className="flex justify-between text-xs mt-2">
                              <span className="text-[#6F6761]">
                                ETA: {new Date(v.eta).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className={v.estimated_waiting_minutes && v.estimated_waiting_minutes > 0 ? 'text-[#D85F2B] font-medium' : 'text-[#2E7D5B] font-medium'}>
                                Wait: {v.estimated_waiting_minutes ? `${v.estimated_waiting_minutes}m` : '0m'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center p-6 text-[#6F6761]">
                  Select a berth on the map to view details.
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              {berths.map(b => (
                <button
                  key={b.berth_id}
                  onClick={() => setSelectedBerthCode(b.berth_code)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    selectedBerth?.berth_code === b.berth_code
                      ? 'bg-white border-[#213657] ring-1 ring-[#213657] shadow-sm'
                      : 'bg-[#F7F4EE] border-[#E7DED4] hover:bg-white hover:border-[#D99119]'
                  }`}
                >
                  <span className="font-bold text-[#231F20] block text-sm">{b.berth_code}</span>
                  <span className="text-xs text-[#6F6761] truncate block">{b.berth_name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
