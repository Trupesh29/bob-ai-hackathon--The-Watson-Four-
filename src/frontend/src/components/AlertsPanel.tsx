/**
 * PortFlow AI — Operational Alerts
 *
 * Derives a prioritised list of operational alerts from already-fetched API data.
 * No new API calls. No persistence. All logic is pure/deterministic.
 *
 * Alert sources:
 *   - CRITICAL congestion window(s) from DashboardCongestionResponse
 *   - Vessel predicted wait above HIGH threshold (>12 h) from WaitingTimesResponse
 *   - Routing recommendation with meaningful time saving from AlternateRoutingResponse
 *   - Peak risk HIGH/CRITICAL from DashboardSummaryResponse
 *
 * All alerts include:
 *   severity: 'critical' | 'high' | 'medium' | 'info'
 *   title, reason, actionLabel, vesselName?, berthCode?
 */

import type {
  DashboardSummaryResponse,
  DashboardCongestionResponse,
  WaitingTimesResponse,
  AlternateRoutingResponse,
} from '../types/api'

// ── Types (exported for tests) ────────────────────────────────────────────────

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'info'

export interface OperationalAlert {
  id: string
  severity: AlertSeverity
  title: string
  reason: string
  actionLabel: string
  vesselName?: string
  berthCode?: string
}

// Documented HIGH threshold = >12 h (from schemas/dashboard.py WAITING_RISK_HIGH_THRESHOLD)
export const WAIT_HIGH_THRESHOLD_HOURS = 12

// Minimum hours saved to show a routing alert
export const ROUTING_MIN_HOURS_SAVED = 2

// ── Severity sort order ───────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  info: 3,
}

export function sortAlerts(alerts: OperationalAlert[]): OperationalAlert[] {
  return [...alerts].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  )
}

// ── Alert derivation (pure function — exported for tests) ─────────────────────

export function deriveAlerts({
  summary,
  congestion,
  waitingTimes,
  routing,
}: {
  summary: DashboardSummaryResponse | null
  congestion: DashboardCongestionResponse | null
  waitingTimes: WaitingTimesResponse | null
  routing: AlternateRoutingResponse | null
}): OperationalAlert[] {
  const alerts: OperationalAlert[] = []

  // ── 1. Critical congestion windows ──────────────────────────────────────────
  if (congestion) {
    const criticalWindows = congestion.windows.filter(
      w => w.risk_level === 'critical'
    )
    if (criticalWindows.length > 0) {
      const first = criticalWindows[0]
      alerts.push({
        id: `congestion-critical-${first.window_start}`,
        severity: 'critical',
        title: 'Critical congestion window',
        reason: `${criticalWindows.length} window(s) at CRITICAL risk. Peak queue: ${first.estimated_queue_count} vessels. Drivers: ${(first.rule_drivers ?? []).slice(0, 2).join('; ')}.`,
        actionLabel: 'Generate 72-hour plan',
      })
    } else {
      // High-risk windows (not critical)
      const highWindows = congestion.windows.filter(w => w.risk_level === 'high')
      if (highWindows.length > 0) {
        const first = highWindows[0]
        alerts.push({
          id: `congestion-high-${first.window_start}`,
          severity: 'high',
          title: `${highWindows.length} high-risk congestion window${highWindows.length > 1 ? 's' : ''}`,
          reason: `Peak queue: ${first.estimated_queue_count} vessels. Drivers: ${(first.rule_drivers ?? []).slice(0, 2).join('; ')}.`,
          actionLabel: 'Review congestion chart',
        })
      }
    }
  }

  // ── 2. Vessels with predicted wait above HIGH threshold ──────────────────────
  if (waitingTimes) {
    const highWait = waitingTimes.vessels.filter(
      v => v.predicted_waiting_hours > WAIT_HIGH_THRESHOLD_HOURS
    )
    for (const v of highWait.slice(0, 3)) {
      alerts.push({
        id: `wait-high-${v.schedule_id}`,
        severity: v.predicted_waiting_hours > 24 ? 'critical' : 'high',
        title: 'Vessel wait above HIGH threshold',
        reason: `${v.vessel_name} predicted ${v.predicted_waiting_hours.toFixed(1)} h wait (>${WAIT_HIGH_THRESHOLD_HOURS} h threshold)${v.primary_cause ? `; cause: ${v.primary_cause}` : ''}.`,
        actionLabel: 'Pre-position cranes',
        vesselName: v.vessel_name,
      })
    }
  }

  // ── 3. Alternate routing recommendation with meaningful saving ───────────────
  if (
    routing &&
    routing.recommended &&
    routing.estimated_hours_saved >= ROUTING_MIN_HOURS_SAVED
  ) {
    alerts.push({
      id: `routing-${routing.vessel_id}`,
      severity: 'medium',
      title: 'Alternate routing recommended',
      reason: `${routing.vessel_name}: divert to ${routing.recommended_port_name ?? 'alternate port'} saves ~${routing.estimated_hours_saved.toFixed(1)} h. ${routing.reason}`,
      actionLabel: 'Review routing recommendation',
      vesselName: routing.vessel_name,
    })
  }

  // ── 4. Peak risk HIGH/CRITICAL from summary (if no congestion detail yet) ────
  if (
    summary &&
    (summary.peak_risk_level === 'high' || summary.peak_risk_level === 'critical') &&
    alerts.length === 0
  ) {
    alerts.push({
      id: `summary-peak-${summary.peak_risk_level}`,
      severity: summary.peak_risk_level === 'critical' ? 'critical' : 'high',
      title: `Peak congestion risk: ${summary.peak_risk_level.toUpperCase()}`,
      reason: `Port ${summary.port_code} — ${Math.round(summary.peak_congestion_risk * 100)}% peak risk. ${summary.active_vessel_count} active vessels.`,
      actionLabel: 'Generate 72-hour plan',
    })
  }

  return sortAlerts(alerts)
}

// ── AlertsPanel component ─────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<AlertSeverity, string> = {
  critical: 'border-red-700 bg-red-900/20',
  high:     'border-orange-700 bg-orange-900/15',
  medium:   'border-yellow-700 bg-yellow-900/10',
  info:     'border-slate-600 bg-slate-800/40',
}

const SEVERITY_BADGE: Record<AlertSeverity, string> = {
  critical: 'bg-red-900/50 text-red-300 border border-red-700',
  high:     'bg-orange-900/40 text-orange-300 border border-orange-700',
  medium:   'bg-yellow-900/30 text-yellow-300 border border-yellow-700',
  info:     'bg-slate-700 text-slate-400 border border-slate-600',
}

interface AlertsPanelProps {
  alerts: OperationalAlert[]
  loading?: boolean
  error?: string | null
}

export default function AlertsPanel({ alerts, loading, error }: AlertsPanelProps) {
  if (loading) {
    return (
      <div data-testid="alerts-loading" className="text-slate-500 text-xs animate-pulse">
        Computing alerts…
      </div>
    )
  }

  if (error) {
    return (
      <p data-testid="alerts-error" className="text-red-400 text-xs">
        {error}
      </p>
    )
  }

  if (alerts.length === 0) {
    return (
      <p data-testid="alerts-empty" className="text-slate-500 text-xs">
        No operational alerts at this time.
      </p>
    )
  }

  return (
    <div data-testid="alerts-list" className="space-y-2">
      {alerts.map(alert => (
        <div
          key={alert.id}
          data-testid={`alert-${alert.severity}`}
          className={`rounded border px-3 py-2 ${SEVERITY_STYLES[alert.severity]}`}
        >
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-1.5 py-0.5 text-[9px] font-semibold rounded ${SEVERITY_BADGE[alert.severity]}`}
              >
                {alert.severity.toUpperCase()}
              </span>
              <span className="text-slate-200 text-xs font-medium">
                {alert.title}
              </span>
              {alert.vesselName && (
                <span className="text-slate-400 text-[10px]">
                  · {alert.vesselName}
                </span>
              )}
            </div>
            <span className="text-teal-400 text-[10px] font-medium whitespace-nowrap">
              {alert.actionLabel}
            </span>
          </div>
          <p className="text-slate-400 text-[10px] mt-1 leading-relaxed">
            {alert.reason}
          </p>
        </div>
      ))}
    </div>
  )
}
