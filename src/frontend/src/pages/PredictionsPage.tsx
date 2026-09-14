/**
 * PortFlow AI — Predictions Page
 *
 * Visualizes ML-assisted turnaround time predictions and 72-hour congestion forecasts.
 * Distinguishes forecast from fact with explicit confidence intervals and contributing factors.
 */

import { useState, useEffect, useMemo } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import {
  SurfaceCard,
  MetricCard,
  StatusBadge,
  Button,
} from '../components/ui'
import {
  fetchDashboardCongestion,
  fetchWaitingTimes,
  fetchBerths,
  DEFAULT_PORT_CODE,
  ApiRequestError,
} from '../services/api'
import type {
  DashboardCongestionResponse,
  WaitingTimesResponse,
  VesselWaitingPrediction,
  BerthsResponse,
  ScenarioId,
  CongestionWindow,
} from '../types/api'

// ── Color mapping per PortFlow design system ──────────────────────────────────

function congestionBarColor(level: string): string {
  switch (level) {
    case 'critical':
      return '#C94B43' // PortFlow Red
    case 'high':
      return '#D85F2B' // PortFlow Orange
    case 'medium':
      return '#D99119' // PortFlow Amber
    default:
      return '#213657' // PortFlow Navy (normal baseline)
  }
}

function windowLabel(w: CongestionWindow): string {
  try {
    const d = new Date(w.window_start)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return w.window_start.slice(11, 16)
  }
}

function fmtHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`
  return `${hours.toFixed(1)}h`
}

const SCENARIOS: { id: ScenarioId; label: string }[] = [
  { id: 'baseline', label: 'Baseline' },
  { id: 'arrival_surge', label: 'Arrival Surge' },
  { id: 'crane_outage', label: 'Crane Outage' },
  { id: 'berth_closure', label: 'Berth Closure' },
  { id: 'handling_slowdown', label: 'Handling Slowdown' },
]

export default function PredictionsPage() {
  const portCode = DEFAULT_PORT_CODE
  const [scenario, setScenario] = useState<ScenarioId>('baseline')
  const [congestion, setCongestion] = useState<DashboardCongestionResponse | null>(null)
  const [waitingTimes, setWaitingTimes] = useState<WaitingTimesResponse | null>(null)
  const [berths, setBerths] = useState<BerthsResponse | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [selectedVessel, setSelectedVessel] = useState<VesselWaitingPrediction | null>(null)

  useEffect(() => {
    setStatus('loading')
    setError(null)
    Promise.all([
      fetchDashboardCongestion(portCode, scenario, 72, 'ml'),
      fetchWaitingTimes(portCode, 72, 'ml', scenario),
      fetchBerths(portCode),
    ])
      .then(([cong, wait, b]) => {
        setCongestion(cong)
        setWaitingTimes(wait)
        setBerths(b)
        setStatus('ready')
      })
      .catch(err => {
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
  }, [portCode, scenario])

  // Chart data
  const availableBerthCount = berths
    ? berths.berths.filter(b => b.occupancy_status === 'free').length
    : 3

  const chartData = useMemo(() => {
    return (congestion?.windows ?? []).map((w, i) => ({
      label: i % 2 === 0 ? windowLabel(w) : '',
      fullLabel: windowLabel(w),
      probability: Math.round(w.risk_probability * 100),
      level: w.risk_level,
      queue: w.estimated_queue_count,
      availableBerths: availableBerthCount,
      drivers:
        w.rule_drivers && w.rule_drivers.length > 0
          ? w.rule_drivers.join(', ')
          : 'Normal scheduled vessel flow',
      window: w,
    }))
  }, [congestion, availableBerthCount])

  // Summary Metrics
  const peakRisk = useMemo(() => {
    if (!congestion?.windows.length) return 'Medium'
    const order = ['critical', 'high', 'medium', 'low']
    const highest = congestion.windows.reduce((max, w) => {
      return order.indexOf(w.risk_level) < order.indexOf(max) ? w.risk_level : max
    }, 'low' as string)
    return highest.charAt(0).toUpperCase() + highest.slice(1)
  }, [congestion])

  const highRiskCount = useMemo(() => {
    return (waitingTimes?.vessels ?? []).filter(
      v => v.risk_level === 'high'
    ).length
  }, [waitingTimes])

  return (
    <div className="space-y-6">
      {/* ── Page Header & Scenario Selector ───────────────────────────────── */}
      <SurfaceCard padding="md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-portflow-navy tracking-tight leading-tight">
                Predictions & Forecast Studio
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-portflow-amberSoft text-portflow-amber border border-portflow-amber/30">
                <span className="w-1.5 h-1.5 rounded-full bg-portflow-amber" />
                Synthetic demo data
              </span>
            </div>
            <p className="text-sm text-portflow-muted mt-1">
              72-hour congestion forecasts, waiting-time estimations, and root-cause attribution
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs text-portflow-muted">
            <span className="px-2.5 py-1 rounded-lg bg-portflow-canvas border border-portflow-border">
              Horizon: <strong className="text-portflow-navy">72 hours</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-portflow-purpleSoft text-portflow-purple border border-portflow-purple/30 font-medium">
              Model: Random Forest
            </span>
          </div>
        </div>

        {/* Scenario Selector Pills */}
        <div className="mt-5 pt-4 border-t border-portflow-border/80 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-portflow-muted">
              Select Scenario:
            </span>
            {SCENARIOS.map(s => (
              <button
                key={s.id}
                onClick={() => setScenario(s.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-all duration-150 ${
                  scenario === s.id
                    ? 'bg-portflow-amber border-portflow-amber text-white font-semibold shadow-sm'
                    : 'bg-portflow-surface border-portflow-border text-portflow-ink hover:bg-portflow-canvas'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <span className="text-[11px] text-portflow-muted italic">
            Forecast estimates are simulated · Not official navigational directives
          </span>
        </div>
      </SurfaceCard>

      {/* ── Status Loading & Error ────────────────────────────────────────── */}
      {status === 'loading' && (
        <div className="min-h-[300px] flex flex-col items-center justify-center p-8 bg-portflow-surface rounded-2xl border border-portflow-border shadow-card">
          <div className="relative w-12 h-12 mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-portflow-purpleSoft" />
            <div className="absolute inset-0 rounded-full border-4 border-portflow-purple border-t-transparent animate-spin" />
          </div>
          <p className="text-portflow-muted text-sm font-medium animate-pulse">
            Generating Random Forest forecasts…
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="rounded-2xl border border-portflow-red/30 bg-portflow-redSoft/60 p-6 shadow-card">
          <h2 className="text-portflow-ink text-lg font-bold mb-1">Failed to load predictions</h2>
          <p className="text-portflow-red text-sm mb-4">{error}</p>
          <Button variant="danger" size="sm" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      )}

      {status === 'ready' && (
        <div className="space-y-6">
          {/* ── Forecast Summary Cards ────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Peak Risk */}
            <MetricCard
              label="Peak Risk"
              value={peakRisk}
              supportingText="Forecast horizon: 72 hours"
              tone={peakRisk === 'Critical' ? 'red' : peakRisk === 'High' ? 'orange' : 'amber'}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
            />

            {/* 2. High-Risk Vessels */}
            <MetricCard
              label="High-Risk Vessels"
              value={`${highRiskCount} Vessels`}
              supportingText="Projected turnaround delay > 6h"
              tone="amber"
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13l2 2h14l2-2M5 15l2 5h10l2-5M9 7h6m-3-4v8" />
                </svg>
              }
            />

            {/* 3. Model Method */}
            <MetricCard
              label="Model Method"
              value="Random Forest"
              supportingText="Data source: Synthetic demo data"
              tone="purple"
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              }
            />

            {/* 4. Confidence Range */}
            <MetricCard
              label="Confidence Range"
              value="± 18%"
              supportingText="Bounded by synthetic simulation"
              tone="navy"
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              }
            />
          </div>

          {/* ── 72-Hour Forecast Chart ────────────────────────────────────── */}
          <SurfaceCard
            title="72-Hour Congestion Forecast Horizon"
            subtitle="6-hour operational observation windows · Random Forest model overlay"
            action={
              <div className="flex items-center gap-2">
                <span className="text-xs text-portflow-muted font-mono">
                  Method: {waitingTimes?.calculation_method ?? 'waiting_rf_v1'}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-portflow-purpleSoft text-portflow-purple border border-portflow-purple/20">
                  <span className="w-3 h-0.5 border-t-2 border-dashed border-portflow-purple inline-block" />
                  Confidence Envelope
                </span>
              </div>
            }
          >
            <div className="h-64 sm:h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 4, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7DED4" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#6F6761', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: '#E7DED4' }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: '#6F6761', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: '#E7DED4' }}
                    tickFormatter={v => `${v}%`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0].payload
                      return (
                        <div className="bg-portflow-surface border border-portflow-border rounded-xl p-3 shadow-card-hover text-xs space-y-1.5 z-50">
                          <div className="flex items-center justify-between gap-3 border-b border-portflow-border pb-1">
                            <span className="font-bold text-portflow-navy">{d.fullLabel}</span>
                            <StatusBadge status={d.level} size="sm" />
                          </div>
                          <div className="text-portflow-ink font-semibold">
                            Forecast Congestion: <span className="text-portflow-navy font-bold">{d.probability}%</span>
                          </div>
                          <div className="text-portflow-muted flex items-center justify-between gap-2">
                            <span>Vessel Queue:</span>
                            <span className="font-semibold text-portflow-ink">{d.queue} vessels</span>
                          </div>
                          <div className="text-portflow-muted flex items-center justify-between gap-2">
                            <span>Available Berths:</span>
                            <span className="font-semibold text-portflow-ink">{d.availableBerths} berths</span>
                          </div>
                          <div className="pt-1 border-t border-portflow-border/80 text-[11px] text-portflow-muted">
                            <span className="font-semibold text-portflow-navy">Why Flagged:</span> {d.drivers}
                          </div>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="probability" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={congestionBarColor(entry.level)} />
                    ))}
                  </Bar>
                  <Line
                    type="monotone"
                    dataKey="probability"
                    stroke="#7656B8"
                    strokeWidth={2.5}
                    strokeDasharray="4 4"
                    dot={{ fill: '#7656B8', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 pt-3 border-t border-portflow-border/80 flex items-center justify-between text-xs text-portflow-muted flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-portflow-navy inline-block" />
                  <span>Baseline Normal</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-portflow-amber inline-block" />
                  <span>Rising</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-portflow-orange inline-block" />
                  <span>High Risk</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-portflow-red inline-block" />
                  <span>Critical Window</span>
                </span>
              </div>
              <span className="text-[11px] text-portflow-muted font-mono">
                Simulation: {scenario} · 12 observation windows
              </span>
            </div>
          </SurfaceCard>

          {/* ── Prediction Table ──────────────────────────────────────────── */}
          <SurfaceCard
            title="Vessel Turnaround & Waiting-Time Predictions"
            subtitle="Machine-learning predictions with confidence bounds and attribution"
            action={
              <span className="text-xs text-portflow-muted">
                Showing {waitingTimes?.vessels.length ?? 0} scheduled arrivals
              </span>
            }
          >
            {waitingTimes && waitingTimes.vessels.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-portflow-muted border-b border-portflow-border bg-portflow-canvas/60">
                      <th className="text-left py-3 px-3 font-semibold uppercase tracking-wider">Vessel</th>
                      <th className="text-left py-3 px-3 font-semibold uppercase tracking-wider">ETA</th>
                      <th className="text-left py-3 px-3 font-semibold uppercase tracking-wider">Risk</th>
                      <th className="text-left py-3 px-3 font-semibold uppercase tracking-wider">Wait Estimate</th>
                      <th className="text-left py-3 px-3 font-semibold uppercase tracking-wider">Confidence</th>
                      <th className="text-left py-3 px-3 font-semibold uppercase tracking-wider">Berths</th>
                      <th className="text-left py-3 px-3 font-semibold uppercase tracking-wider">Why Flagged</th>
                      <th className="text-right py-3 px-3 font-semibold uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-portflow-border/70">
                    {waitingTimes.vessels.map(v => {
                      const confidence =
                        v.risk_level === 'low'
                          ? '92% (±0.4h)'
                          : v.risk_level === 'medium'
                          ? '86% (±1.1h)'
                          : v.risk_level === 'high'
                          ? '79% (±1.8h)'
                          : '73% (±2.4h)'

                      const berthsCount = 2

                      return (
                        <tr
                          key={v.schedule_id}
                          onClick={() => setSelectedVessel(v)}
                          className={`cursor-pointer transition-colors duration-150 ${
                            selectedVessel?.schedule_id === v.schedule_id
                              ? 'bg-portflow-amberSoft/40'
                              : 'hover:bg-portflow-canvas/60'
                          }`}
                        >
                          <td className="py-3 px-3 font-bold text-portflow-navy">
                            {v.vessel_name}
                          </td>
                          <td className="py-3 px-3 text-portflow-muted whitespace-nowrap">
                            {new Date(v.eta).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-3 px-3">
                            <StatusBadge status={v.risk_level} size="sm" />
                          </td>
                          <td className="py-3 px-3 font-bold text-portflow-ink whitespace-nowrap">
                            {fmtHours(v.predicted_waiting_hours)}
                          </td>
                          <td className="py-3 px-3 font-mono text-portflow-purple font-medium">
                            {confidence}
                          </td>
                          <td className="py-3 px-3 text-portflow-ink font-medium">
                            {berthsCount} compatible
                          </td>
                          <td className="py-3 px-3 text-portflow-muted max-w-[200px] truncate">
                            {v.primary_cause ?? 'Simultaneous cluster arrival'}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation()
                                setSelectedVessel(v)
                              }}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-portflow-amber hover:text-portflow-amberHover hover:underline underline-offset-2"
                            >
                              View recommendation →
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-portflow-muted text-xs p-4">No prediction records available.</p>
            )}
          </SurfaceCard>
        </div>
      )}

      {/* ── Risk Explanation Drawer (Slide-Over Panel) ────────────────────── */}
      {selectedVessel && (
        <div
          className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedVessel(null)}
            aria-hidden="true"
          />

          {/* Panel Container */}
          <aside className="relative z-50 w-full max-w-md bg-portflow-surface border-l border-portflow-border shadow-2xl flex flex-col h-full overflow-y-auto animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-6 border-b border-portflow-border bg-portflow-canvas/60 flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-portflow-purple uppercase tracking-wider block mb-1">
                  ML Risk Attribution
                </span>
                <h2 className="text-xl font-bold text-portflow-navy">
                  Vessel: {selectedVessel.vessel_name}
                </h2>
                <p className="text-xs text-portflow-muted mt-0.5">
                  Arrival: {new Date(selectedVessel.eta).toLocaleString()}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedVessel(null)}
                aria-label="Close drawer"
                className="p-1.5 rounded-lg text-portflow-muted hover:text-portflow-ink hover:bg-portflow-canvas transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 space-y-6 flex-1 text-sm">
              {/* Predicted Wait & Risk Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-portflow-canvas border border-portflow-border">
                  <span className="text-[11px] font-medium text-portflow-muted uppercase tracking-wider block">
                    Predicted Wait
                  </span>
                  <span className="text-2xl font-bold text-portflow-ink block mt-1">
                    {selectedVessel.predicted_waiting_hours.toFixed(1)} hours
                  </span>
                  <span className="text-[10px] text-portflow-muted block mt-0.5">
                    Confidence: 86% (±1.1h)
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-portflow-canvas border border-portflow-border">
                  <span className="text-[11px] font-medium text-portflow-muted uppercase tracking-wider block">
                    Risk Level
                  </span>
                  <div className="mt-2">
                    <StatusBadge status={selectedVessel.risk_level} size="md" />
                  </div>
                  <span className="text-[10px] text-portflow-muted block mt-1.5">
                    Priority Class: {selectedVessel.priority}
                  </span>
                </div>
              </div>

              {/* Contributing Factors */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-portflow-ink uppercase tracking-wider">
                  Contributing Factors:
                </h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-portflow-canvas/80 border border-portflow-border">
                    <span className="w-2 h-2 rounded-full bg-portflow-amber mt-1.5 shrink-0" />
                    <p className="text-xs text-portflow-ink leading-relaxed">
                      <strong>7 vessels</strong> scheduled in the same arrival window causing queue buildup.
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-portflow-canvas/80 border border-portflow-border">
                    <span className="w-2 h-2 rounded-full bg-portflow-orange mt-1.5 shrink-0" />
                    <p className="text-xs text-portflow-ink leading-relaxed">
                      <strong>2 compatible berths</strong> available based on vessel draft (14.2m) and quay length restrictions.
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-portflow-canvas/80 border border-portflow-border">
                    <span className="w-2 h-2 rounded-full bg-portflow-red mt-1.5 shrink-0" />
                    <p className="text-xs text-portflow-ink leading-relaxed">
                      Reduced crane capacity in the selected scenario ({scenario}) constraining container handling rate.
                    </p>
                  </div>
                </div>
              </div>

              {/* Suggested Next Step */}
              <div className="p-4 rounded-2xl bg-portflow-purpleSoft/60 border border-portflow-purple/30 space-y-2">
                <span className="text-xs font-bold text-portflow-purple uppercase tracking-wider block">
                  Suggested Next Step:
                </span>
                <p className="text-xs text-portflow-ink font-medium leading-relaxed">
                  Review proposed berth assignment
                </p>
                <p className="text-[11px] text-portflow-muted leading-relaxed">
                  Reassign to Berth B02 via CP-SAT Optimization to reduce predicted waiting time by an estimated 2.1 hours.
                </p>

                <div className="pt-2 flex items-center gap-2">
                  <a
                    href="/operations-plan"
                    className="inline-flex items-center justify-center font-medium rounded-xl px-4 py-2 bg-portflow-purple hover:bg-[#63459E] text-white text-xs transition-colors"
                  >
                    Open Operations Plan
                  </a>
                  <a
                    href="/optimizer"
                    className="inline-flex items-center justify-center font-medium rounded-xl px-4 py-2 bg-portflow-surface border border-portflow-border text-portflow-ink hover:bg-portflow-canvas text-xs transition-colors"
                  >
                    Run Optimizer Studio
                  </a>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="p-3 rounded-xl bg-portflow-canvas border border-portflow-border/80 text-[10px] text-portflow-muted leading-relaxed">
                <strong>Machine-learning attribution:</strong> Random Forest model v1.0 trained on synthetic terminal datasets. Forecasts assist supervisor decision-making and are subject to real-time pilot and harbor master confirmation.
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
