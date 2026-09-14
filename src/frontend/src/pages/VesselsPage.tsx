/**
 * PortFlow AI — Vessels Page
 *
 * Operational vessel list for port supervisors and terminal planners.
 * Reactive to scenario switching, horizon filtering, and live search.
 * Includes desktop operational table and mobile stacked rounded cards.
 * Data: GET /api/v1/schedules and GET /api/v1/waiting-times.
 */

import { useState, useEffect, useMemo } from 'react'
import {
  fetchSchedules,
  fetchWaitingTimes,
  DEFAULT_PORT_CODE,
  ApiRequestError,
} from '../services/api'
import type { ScheduleItem, VesselWaitingPrediction, ScenarioId } from '../types/api'
import {
  PageHeader,
  MetricCard,
  StatusBadge,
  Button,
  LoadingState,
  ErrorState,
  EmptyState,
} from '../components/ui'

const SCENARIOS: { id: ScenarioId; label: string; desc: string }[] = [
  { id: 'baseline', label: 'Baseline', desc: 'Normal port operations (1.0x wait multiplier)' },
  { id: 'arrival_surge', label: 'Arrival Surge', desc: 'High-density vessel arrival spike (1.5x wait multiplier)' },
  { id: 'crane_outage', label: 'Crane Outage', desc: 'Reduced crane capacity in Berth Beta (1.3x wait multiplier)' },
  { id: 'berth_closure', label: 'Berth Closure', desc: 'Berth Gamma closed for maintenance (1.4x wait multiplier)' },
  { id: 'handling_slowdown', label: 'Handling Slowdown', desc: 'Reduced container moves per hour (1.2x wait multiplier)' },
]

function priorityLabel(p: number): string {
  switch (p) {
    case 1:
      return 'CRITICAL'
    case 2:
      return 'High'
    case 3:
      return 'Normal'
    case 4:
      return 'Low'
    default:
      return 'Deferred'
  }
}

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`
  return `${hours.toFixed(1)}h`
}

function deriveOperationalStatus(
  s: ScheduleItem,
  wt?: VesselWaitingPrediction,
  firstEtaMs?: number
): string {
  if (s.status !== 'completed') return s.status
  const etaMs = new Date(s.eta).getTime()
  const waitHours = wt ? wt.predicted_waiting_hours : (s.estimated_waiting_minutes ?? 0) / 60
  if (waitHours >= 12) return 'delayed'
  if (firstEtaMs && etaMs <= firstEtaMs + 12 * 3600 * 1000) return 'in_port'
  return 'scheduled'
}

export default function VesselsPage() {
  const portCode = DEFAULT_PORT_CODE
  const [scenario, setScenario] = useState<ScenarioId>('baseline')
  const [horizonFilter, setHorizonFilter] = useState<'72h' | 'all'>('72h')
  const [searchQuery, setSearchQuery] = useState('')
  const [riskFilter, setRiskFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | '1' | '2' | '3' | '4'>('all')

  const [schedules, setSchedules] = useState<ScheduleItem[]>([])
  const [waitMap, setWaitMap] = useState<Map<string, VesselWaitingPrediction>>(new Map())
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'empty'>('loading')
  const [error, setError] = useState<string | null>(null)

  // Detailed view drawer / modal
  const [selectedVessel, setSelectedVessel] = useState<{
    schedule: ScheduleItem
    prediction?: VesselWaitingPrediction
  } | null>(null)

  const loadData = () => {
    setStatus('loading')
    setError(null)
    Promise.all([
      fetchSchedules(portCode, scenario),
      fetchWaitingTimes(portCode, 72, 'baseline', scenario),
    ])
      .then(([schResp, waitResp]) => {
        setSchedules(schResp.schedules)
        const m = new Map<string, VesselWaitingPrediction>()
        for (const v of waitResp.vessels) m.set(v.schedule_id, v)
        setWaitMap(m)
        setStatus(schResp.schedules.length === 0 ? 'empty' : 'ready')
      })
      .catch((err) => {
        let msg = 'Unknown error'
        if (err instanceof ApiRequestError) {
          msg =
            err.status === 0
              ? 'Backend unavailable — start FastAPI and refresh'
              : `API error ${err.status}: ${JSON.stringify(err.body)}`
        } else if (err instanceof Error) {
          msg = err.message
        }
        setError(msg)
        setStatus('error')
      })
  }

  useEffect(() => {
    loadData()
  }, [portCode, scenario])

  // Reference time: earliest ETA in schedule
  const earliestEtaMs = useMemo(() => {
    if (schedules.length === 0) return undefined
    const times = schedules.map((s) => new Date(s.eta).getTime()).filter((t) => !isNaN(t))
    return times.length > 0 ? Math.min(...times) : undefined
  }, [schedules])

  // Filter pipeline: Horizon -> Search -> Risk -> Priority
  const displayedSchedules = useMemo(() => {
    let list = schedules

    // 1. Horizon filter (72h default vs All)
    if (horizonFilter === '72h' && earliestEtaMs) {
      const cutoff = earliestEtaMs + 72 * 3600 * 1000
      list = list.filter((s) => new Date(s.eta).getTime() <= cutoff)
    }

    // 2. Search query (vessel name or IMO)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (s) =>
          s.vessel_name.toLowerCase().includes(q) ||
          s.imo_number.toLowerCase().includes(q)
      )
    }

    // 3. Risk filter
    if (riskFilter !== 'all') {
      list = list.filter((s) => {
        const wt = waitMap.get(s.schedule_id)
        return (wt?.risk_level ?? 'low') === riskFilter
      })
    }

    // 4. Priority filter
    if (priorityFilter !== 'all') {
      const pNum = parseInt(priorityFilter, 10)
      list = list.filter((s) => s.priority === pNum)
    }

    return list
  }, [schedules, horizonFilter, earliestEtaMs, searchQuery, riskFilter, priorityFilter, waitMap])

  // Aggregated stats over current displayed vessels
  const stats = useMemo(() => {
    let crit = 0
    let inPort = 0
    let sched = 0
    let delayed = 0
    let totalWaitHours = 0
    let countWithWait = 0

    displayedSchedules.forEach((s) => {
      const wt = waitMap.get(s.schedule_id)
      const opStatus = deriveOperationalStatus(s, wt, earliestEtaMs)
      if (s.priority === 1) crit++
      if (opStatus === 'in_port') inPort++
      if (opStatus === 'scheduled') sched++
      if (opStatus === 'delayed') delayed++

      const h = wt
        ? wt.predicted_waiting_hours
        : s.estimated_waiting_minutes
        ? s.estimated_waiting_minutes / 60
        : 0
      totalWaitHours += h
      countWithWait++
    })

    const avgWait = countWithWait > 0 ? (totalWaitHours / countWithWait).toFixed(1) : '0.0'

    return { crit, inPort, sched, delayed, avgWait }
  }, [displayedSchedules, waitMap, earliestEtaMs])

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    riskFilter !== 'all' ||
    priorityFilter !== 'all' ||
    horizonFilter !== '72h'

  const handleResetFilters = () => {
    setSearchQuery('')
    setRiskFilter('all')
    setPriorityFilter('all')
    setHorizonFilter('72h')
  }

  const activeScenarioInfo = SCENARIOS.find((s) => s.id === scenario)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Vessel Schedule"
        subtitle={`Operational port call tracking, queue predictions, and quayside berth plans · Port ${portCode}`}
        badge={<StatusBadge status="active" label="Synthetic demo data" size="sm" />}
        actions={
          <div className="flex items-center gap-2">
            {/* Horizon toggle */}
            <div className="inline-flex bg-portflow-canvas border border-portflow-border rounded-xl p-1 text-xs">
              <button
                type="button"
                onClick={() => setHorizonFilter('72h')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  horizonFilter === '72h'
                    ? 'bg-portflow-surface text-portflow-navy font-semibold shadow-sm border border-portflow-border'
                    : 'text-portflow-muted hover:text-portflow-ink'
                }`}
              >
                72h Planning Horizon
              </button>
              <button
                type="button"
                onClick={() => setHorizonFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  horizonFilter === 'all'
                    ? 'bg-portflow-surface text-portflow-navy font-semibold shadow-sm border border-portflow-border'
                    : 'text-portflow-muted hover:text-portflow-ink'
                }`}
              >
                All Records ({schedules.length})
              </button>
            </div>
          </div>
        }
      />

      {/* Scenario Selector */}
      <div className="bg-portflow-surface rounded-2xl border border-portflow-border p-3.5 shadow-sm space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-portflow-muted uppercase tracking-wider">
            Operational Scenario
          </span>
          {activeScenarioInfo && (
            <span className="text-xs text-portflow-muted">
              Multiplier impact: <strong className="text-portflow-navy">{activeScenarioInfo.desc}</strong>
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setScenario(s.id)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-xl border transition-all ${
                scenario === s.id
                  ? 'bg-portflow-navy border-portflow-navy text-white shadow-sm ring-2 ring-portflow-navy/20'
                  : 'bg-portflow-canvas/60 border-portflow-border text-portflow-ink hover:bg-portflow-canvas hover:border-portflow-muted/40'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* States */}
      {status === 'loading' && (
        <LoadingState message={`Updating vessel arrival schedules for ${scenario}…`} />
      )}

      {status === 'error' && (
        <ErrorState
          title="Failed to load vessels"
          message={error ?? 'An unexpected error occurred while fetching vessel schedules.'}
          onRetry={loadData}
        />
      )}

      {status === 'empty' && (
        <EmptyState
          title="No vessel schedules found"
          description="Run python -m data.seed to populate synthetic port records."
        />
      )}

      {status === 'ready' && (
        <>
          {/* Operational Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <MetricCard
              label="Total in Scope"
              value={displayedSchedules.length}
              tone="navy"
              supportingText={horizonFilter === '72h' ? 'Next 72 Hours' : 'Full 14-Day View'}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              }
            />
            <MetricCard
              label="Critical Priority"
              value={stats.crit}
              tone="red"
              supportingText="Priority 1 calls"
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
            />
            <MetricCard
              label="In Port"
              value={stats.inPort}
              tone="navy"
              supportingText="Currently at berth"
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
              }
            />
            <MetricCard
              label="Scheduled"
              value={stats.sched}
              tone="green"
              supportingText="Incoming within scope"
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
            />
            <MetricCard
              label="Avg Predicted Wait"
              value={`${stats.avgWait}h`}
              tone="amber"
              supportingText={`Scenario: ${scenario}`}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </div>

          {/* Filter Bar */}
          <div className="bg-portflow-surface rounded-2xl border border-portflow-border p-4 shadow-sm">
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
              {/* Search Vessel */}
              <div className="relative flex-1 min-w-[200px]">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-portflow-muted">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search vessel name or IMO..."
                  aria-label="Search vessel"
                  className="w-full pl-10 pr-3.5 py-2 text-xs rounded-xl border border-portflow-border bg-portflow-canvas/40 focus:bg-portflow-surface focus:outline-none focus:ring-2 focus:ring-portflow-amber focus:border-portflow-amber text-portflow-ink placeholder-portflow-muted/70 transition-all min-h-[42px]"
                />
              </div>

              {/* Risk Level Filter */}
              <div className="w-full md:w-auto min-w-[140px]">
                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value as 'all' | 'high' | 'medium' | 'low')}
                  aria-label="Risk level"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-portflow-border bg-portflow-canvas/40 focus:bg-portflow-surface focus:outline-none focus:ring-2 focus:ring-portflow-amber text-portflow-ink cursor-pointer min-h-[42px]"
                >
                  <option value="all">All Risk Levels</option>
                  <option value="high">High Risk</option>
                  <option value="medium">Medium Risk</option>
                  <option value="low">Low Risk</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div className="w-full md:w-auto min-w-[140px]">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as 'all' | '1' | '2' | '3' | '4')}
                  aria-label="Priority"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-portflow-border bg-portflow-canvas/40 focus:bg-portflow-surface focus:outline-none focus:ring-2 focus:ring-portflow-amber text-portflow-ink cursor-pointer min-h-[42px]"
                >
                  <option value="all">All Priorities</option>
                  <option value="1">Priority 1 - Critical</option>
                  <option value="2">Priority 2 - High</option>
                  <option value="3">Priority 3 - Normal</option>
                  <option value="4">Priority 4 - Low</option>
                </select>
              </div>

              {/* Arrival Range Filter */}
              <div className="w-full md:w-auto min-w-[170px]">
                <select
                  value={horizonFilter}
                  onChange={(e) => setHorizonFilter(e.target.value as '72h' | 'all')}
                  aria-label="Arrival range"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-portflow-border bg-portflow-canvas/40 focus:bg-portflow-surface focus:outline-none focus:ring-2 focus:ring-portflow-amber text-portflow-ink cursor-pointer min-h-[42px]"
                >
                  <option value="72h">Next 72 Hours Horizon</option>
                  <option value="all">Full Schedule Window ({schedules.length} calls)</option>
                </select>
              </div>

              {/* Reset Filter Button */}
              <div className="w-full md:w-auto">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleResetFilters}
                  disabled={!hasActiveFilters}
                  className={`w-full md:w-auto min-h-[42px] text-xs font-medium ${
                    hasActiveFilters ? 'text-portflow-orange border-portflow-orange/30' : ''
                  }`}
                >
                  Reset
                </Button>
              </div>
            </div>
          </div>

          {/* Operational Vessel Table & Responsive Cards */}
          {displayedSchedules.length === 0 ? (
            <EmptyState
              title="No matching vessels found"
              description="No vessel calls match your current search and filter criteria."
              action={
                <Button variant="secondary" size="sm" onClick={handleResetFilters}>
                  Clear all filters
                </Button>
              }
            />
          ) : (
            <div className="bg-portflow-surface rounded-2xl border border-portflow-border shadow-card overflow-hidden">
              {/* Table Top Toolbar */}
              <div className="flex flex-wrap items-center justify-between px-5 py-3.5 border-b border-portflow-border bg-portflow-canvas/30">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-portflow-navy">
                    Vessel Arrival Schedule ({displayedSchedules.length} calls)
                  </h2>
                  <span className="text-[11px] text-portflow-muted">
                    · Showing {horizonFilter === '72h' ? '72-hour window' : 'entire dataset'}
                  </span>
                </div>
                <div className="text-xs text-portflow-muted">
                  Scenario: <span className="font-semibold text-portflow-navy">{scenario}</span> · Synthetic records
                </div>
              </div>

              {/* Unified Responsive Table & Mobile Cards */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse block md:table">
                  {/* Desktop Header */}
                  <thead className="hidden md:table-header-group border-b border-portflow-border bg-portflow-canvas/60">
                    <tr className="text-portflow-muted text-xs uppercase tracking-wider font-semibold">
                      <th className="px-4 py-3.5">Vessel</th>
                      <th className="px-4 py-3.5">ETA</th>
                      <th className="px-4 py-3.5">Priority</th>
                      <th className="px-4 py-3.5">Size / TEU</th>
                      <th className="px-4 py-3.5">Predicted wait</th>
                      <th className="px-4 py-3.5">Risk</th>
                      <th className="px-4 py-3.5">Assigned berth</th>
                      <th className="px-4 py-3.5">Plan status</th>
                      <th className="px-4 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>

                  {/* Body: Table rows on Desktop, Stacked rounded cards on Mobile */}
                  <tbody className="block md:table-row-group divide-y divide-portflow-border/40 md:divide-y md:divide-portflow-border/60 p-3 md:p-0 space-y-3 md:space-y-0">
                    {displayedSchedules.map((s, idx) => {
                      const wt = waitMap.get(s.schedule_id)
                      const opStatus = deriveOperationalStatus(s, wt, earliestEtaMs)
                      const isUnscheduled = !s.preferred_berth_code || opStatus === 'unscheduled'
                      const isDelayed = opStatus === 'delayed'
                      const alertBorder = isUnscheduled || isDelayed

                      return (
                        <tr
                          key={s.schedule_id}
                          className={`
                            block md:table-row
                            rounded-2xl md:rounded-none
                            border border-portflow-border md:border-0 md:border-b md:border-portflow-border/60
                            p-4 md:px-0 md:py-0
                            shadow-sm md:shadow-none
                            transition-colors duration-150
                            hover:bg-portflow-amberSoft/40
                            ${idx % 2 === 1 ? 'bg-portflow-canvas/20 md:bg-portflow-canvas/25' : 'bg-portflow-surface'}
                            ${alertBorder ? 'border-l-4 border-l-portflow-orange md:border-l-4 md:border-l-portflow-orange' : ''}
                          `}
                        >
                          {/* Column 1: Vessel */}
                          <td className="block md:table-cell px-0 md:px-4 py-1.5 md:py-3.5">
                            <div className="flex items-center justify-between md:justify-start gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-portflow-navy text-sm">
                                  {s.vessel_name}
                                </span>
                                {s.priority === 1 && (
                                  <span
                                    className="inline-block w-2.5 h-2.5 rounded-full bg-portflow-orange shrink-0 animate-pulse"
                                    title="Priority 1 Critical"
                                  />
                                )}
                              </div>
                            </div>
                            <div className="text-[11px] font-mono text-portflow-muted mt-0.5">
                              {s.imo_number}
                            </div>
                          </td>

                          {/* Column 2: ETA */}
                          <td className="block md:table-cell px-0 md:px-4 py-1.5 md:py-3.5 text-xs text-portflow-ink">
                            <div className="flex items-center justify-between md:justify-start">
                              <span className="md:hidden text-xs text-portflow-muted font-medium">ETA:</span>
                              <span className="font-medium">
                                {new Date(s.eta).toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </td>

                          {/* Column 3: Priority */}
                          <td className="block md:table-cell px-0 md:px-4 py-1.5 md:py-3.5">
                            <div className="flex items-center justify-between md:justify-start">
                              <span className="md:hidden text-xs text-portflow-muted font-medium">Priority:</span>
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                                {s.priority === 1 && (
                                  <span className="w-2 h-2 rounded-full bg-portflow-orange inline-block shrink-0" />
                                )}
                                <span
                                  className={
                                    s.priority === 1
                                      ? 'text-portflow-orange'
                                      : s.priority === 2
                                      ? 'text-portflow-amber'
                                      : 'text-portflow-muted'
                                  }
                                >
                                  {priorityLabel(s.priority)}
                                </span>
                              </span>
                            </div>
                          </td>

                          {/* Column 4: Size / TEU */}
                          <td className="block md:table-cell px-0 md:px-4 py-1.5 md:py-3.5 text-xs text-portflow-muted">
                            <div className="flex items-center justify-between md:justify-start">
                              <span className="md:hidden text-xs text-portflow-muted font-medium">Size / TEU:</span>
                              <span>
                                <strong className="text-portflow-ink font-semibold">{s.expected_containers}</strong> TEU
                                <span className="text-portflow-muted text-[11px] ml-1">({s.cargo_type})</span>
                              </span>
                            </div>
                          </td>

                          {/* Column 5: Predicted wait */}
                          <td className="block md:table-cell px-0 md:px-4 py-1.5 md:py-3.5 text-xs font-semibold text-portflow-ink">
                            <div className="flex items-center justify-between md:justify-start">
                              <span className="md:hidden text-xs text-portflow-muted font-medium">Predicted Wait:</span>
                              <span>
                                {wt != null
                                  ? formatHours(wt.predicted_waiting_hours)
                                  : s.estimated_waiting_minutes != null
                                  ? `${s.estimated_waiting_minutes}m`
                                  : '—'}
                              </span>
                            </div>
                          </td>

                          {/* Column 6: Risk */}
                          <td className="block md:table-cell px-0 md:px-4 py-1.5 md:py-3.5">
                            <div className="flex items-center justify-between md:justify-start">
                              <span className="md:hidden text-xs text-portflow-muted font-medium">Risk:</span>
                              {wt ? (
                                <StatusBadge
                                  status={wt.risk_level}
                                  label={wt.risk_level.toUpperCase()}
                                  size="sm"
                                />
                              ) : (
                                <span className="text-portflow-muted text-xs">—</span>
                              )}
                            </div>
                          </td>

                          {/* Column 7: Assigned berth */}
                          <td className="block md:table-cell px-0 md:px-4 py-1.5 md:py-3.5 text-xs">
                            <div className="flex items-center justify-between md:justify-start">
                              <span className="md:hidden text-xs text-portflow-muted font-medium">Assigned berth:</span>
                              {s.preferred_berth_code ? (
                                <span className="font-semibold text-portflow-navy px-2 py-0.5 rounded bg-portflow-navy/10 border border-portflow-navy/20">
                                  {s.preferred_berth_code}
                                </span>
                              ) : (
                                <span className="text-portflow-orange font-medium italic">Unassigned</span>
                              )}
                            </div>
                          </td>

                          {/* Column 8: Plan status */}
                          <td className="block md:table-cell px-0 md:px-4 py-1.5 md:py-3.5">
                            <div className="flex items-center justify-between md:justify-start">
                              <span className="md:hidden text-xs text-portflow-muted font-medium">Plan status:</span>
                              <StatusBadge status={opStatus} label={opStatus} size="sm" />
                            </div>
                          </td>

                          {/* Column 9: Action */}
                          <td className="block md:table-cell px-0 md:px-4 py-2 md:py-3.5 text-right">
                            <div className="flex items-center justify-end pt-2 md:pt-0 border-t md:border-t-0 border-portflow-border/40">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setSelectedVessel({ schedule: s, prediction: wt })}
                                className="w-full md:w-auto min-h-[36px] md:min-h-[32px] text-xs font-medium"
                              >
                                View detail
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer Context */}
          <div className="flex flex-wrap items-center justify-between text-xs text-portflow-muted pt-2">
            <span>
              Synthetic demo data · baseline_rule_v1 with scenario multiplier ·{' '}
              {displayedSchedules.length} vessel calls shown ({schedules.length} total seeded)
            </span>
            <span>PortFlow AI Operations · Port FKPFL</span>
          </div>
        </>
      )}

      {/* Vessel Detail Modal / Drawer */}
      {selectedVessel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-portflow-navy/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vessel-detail-title"
        >
          <div className="bg-portflow-surface rounded-2xl border border-portflow-border shadow-panel max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-portflow-border/80 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 id="vessel-detail-title" className="text-xl font-bold text-portflow-navy">
                    {selectedVessel.schedule.vessel_name}
                  </h3>
                  {selectedVessel.schedule.priority === 1 && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-portflow-orangeSoft text-portflow-orange border border-portflow-orange/30">
                      PRIORITY 1
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono text-portflow-muted mt-1">
                  IMO: {selectedVessel.schedule.imo_number} · Schedule ID: {selectedVessel.schedule.schedule_id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVessel(null)}
                className="text-portflow-muted hover:text-portflow-ink p-1 rounded-lg hover:bg-portflow-canvas transition-colors"
                aria-label="Close detail modal"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Operational Snapshot Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-portflow-canvas/40 p-3 rounded-xl border border-portflow-border/60">
                <span className="text-portflow-muted block mb-1">ETA</span>
                <span className="font-semibold text-portflow-ink text-sm">
                  {new Date(selectedVessel.schedule.eta).toLocaleString()}
                </span>
              </div>
              <div className="bg-portflow-canvas/40 p-3 rounded-xl border border-portflow-border/60">
                <span className="text-portflow-muted block mb-1">Predicted Wait</span>
                <span className="font-semibold text-portflow-ink text-sm">
                  {selectedVessel.prediction
                    ? formatHours(selectedVessel.prediction.predicted_waiting_hours)
                    : selectedVessel.schedule.estimated_waiting_minutes != null
                    ? `${selectedVessel.schedule.estimated_waiting_minutes}m`
                    : '—'}
                </span>
              </div>
              <div className="bg-portflow-canvas/40 p-3 rounded-xl border border-portflow-border/60">
                <span className="text-portflow-muted block mb-1">Risk Level</span>
                <StatusBadge
                  status={selectedVessel.prediction?.risk_level ?? 'low'}
                  size="sm"
                />
              </div>
              <div className="bg-portflow-canvas/40 p-3 rounded-xl border border-portflow-border/60">
                <span className="text-portflow-muted block mb-1">Assigned Berth</span>
                <span className="font-semibold text-portflow-navy text-sm">
                  {selectedVessel.schedule.preferred_berth_code ?? 'Unassigned'}
                </span>
              </div>
            </div>

            {/* Technical Specifications */}
            <div className="space-y-2 text-xs">
              <h4 className="font-semibold text-portflow-navy uppercase tracking-wider text-[11px]">
                Vessel & Cargo Specifications
              </h4>
              <div className="bg-portflow-canvas/30 rounded-xl p-3.5 border border-portflow-border space-y-2">
                <div className="flex justify-between">
                  <span className="text-portflow-muted">Cargo Type:</span>
                  <span className="font-medium text-portflow-ink">{selectedVessel.schedule.cargo_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-portflow-muted">Expected Containers:</span>
                  <span className="font-semibold text-portflow-navy">{selectedVessel.schedule.expected_containers} TEU</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-portflow-muted">Compatible Berths:</span>
                  <span className="font-medium text-portflow-ink">
                    {selectedVessel.schedule.compatible_berth_count != null
                      ? `${selectedVessel.schedule.compatible_berth_count} berths compatible`
                      : '—'}
                  </span>
                </div>
                {selectedVessel.prediction?.primary_cause && (
                  <div className="flex justify-between pt-1 border-t border-portflow-border/60">
                    <span className="text-portflow-muted">Primary Risk Cause:</span>
                    <span className="font-medium text-portflow-orange">{selectedVessel.prediction.primary_cause}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Suggested Next Steps */}
            <div className="pt-2 flex flex-wrap items-center justify-end gap-2.5">
              <a
                href="/optimizer"
                className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-portflow-amber text-portflow-ink hover:bg-portflow-amberHover transition-colors shadow-sm"
              >
                Run CP-SAT Berth Optimizer
              </a>
              <Button variant="secondary" size="sm" onClick={() => setSelectedVessel(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
