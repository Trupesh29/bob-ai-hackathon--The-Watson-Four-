/**
 * PortFlow AI — Operational Alerts
 *
 * Derives a prioritised list of operational alerts from already-fetched API data.
 * No new API calls. No persistence. All logic is pure/deterministic.
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

export const WAIT_HIGH_THRESHOLD_HOURS = 12
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

  // 1. Critical congestion windows
  if (congestion) {
    const criticalWindows = congestion.windows.filter(
      w => w.risk_level === 'critical'
    )
    if (criticalWindows.length > 0) {
      const first = criticalWindows[0]
      alerts.push({
        id: `congestion-critical-${first.window_start}`,
        severity: 'critical',
        title: 'Critical congestion risk',
        reason: `${criticalWindows.length} window(s) at CRITICAL risk. Peak queue: ${first.estimated_queue_count} vessels. Drivers: ${(first.rule_drivers ?? []).slice(0, 2).join('; ')}.`,
        actionLabel: 'Open optimization plan',
      })
    } else {
      const highWindows = congestion.windows.filter(w => w.risk_level === 'high')
      if (highWindows.length > 0) {
        const first = highWindows[0]
        alerts.push({
          id: `congestion-high-${first.window_start}`,
          severity: 'high',
          title: 'High congestion risk',
          reason: `${highWindows.length} high-risk window(s). Peak queue: ${first.estimated_queue_count} vessels. Drivers: ${(first.rule_drivers ?? []).slice(0, 2).join('; ')}.`,
          actionLabel: 'Open optimization plan',
        })
      }
    }
  }

  // 2. High waiting times
  if (waitingTimes && waitingTimes.vessels.length > 0) {
    const delayedVessels = waitingTimes.vessels.filter(
      v => v.predicted_waiting_hours > WAIT_HIGH_THRESHOLD_HOURS
    )
    if (delayedVessels.length > 0) {
      const top = delayedVessels[0]
      alerts.push({
        id: `wait-high-${top.schedule_id}`,
        severity: top.predicted_waiting_hours > 24 ? 'critical' : 'high',
        title: 'Excessive vessel wait projected',
        reason: `${top.vessel_name} projected wait ${top.predicted_waiting_hours.toFixed(1)}h (>12h threshold). Cause: ${top.primary_cause ?? 'unassigned'}.`,
        actionLabel: 'Open optimization plan',
        vesselName: top.vessel_name,
      })
    }
  }

  // 3. Routing diversion recommendation
  if (routing && routing.recommended && routing.estimated_hours_saved >= ROUTING_MIN_HOURS_SAVED) {
    alerts.push({
      id: `routing-alert-${routing.vessel_name}`,
      severity: routing.estimated_hours_saved >= 6 ? 'high' : 'medium',
      title: `Routing diversion available`,
      reason: `Divert ${routing.vessel_name} → ${routing.recommended_port_name}: saves ~${routing.estimated_hours_saved.toFixed(1)}h.`,
      actionLabel: 'Review routing',
      vesselName: routing.vessel_name,
    })
  }

  // 4. Summary-level fallback
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
      actionLabel: 'Open optimization plan',
    })
  }

  return sortAlerts(alerts)
}

// ── AlertsPanel component ─────────────────────────────────────────────────────

const SEVERITY_BORDER: Record<AlertSeverity, string> = {
  critical: 'border-portflow-red/40 bg-portflow-redSoft/40',
  high: 'border-portflow-orange/40 bg-portflow-orangeSoft/40',
  medium: 'border-portflow-amber/40 bg-portflow-amberSoft/40',
  info: 'border-portflow-border bg-portflow-surface',
}

const SEVERITY_BADGE: Record<AlertSeverity, string> = {
  critical: 'bg-portflow-red text-white',
  high: 'bg-portflow-orange text-white',
  medium: 'bg-portflow-amber text-white',
  info: 'bg-portflow-navy text-white',
}

interface AlertsPanelProps {
  alerts: OperationalAlert[]
  loading?: boolean
  error?: string | null
}

export default function AlertsPanel({ alerts, loading, error }: AlertsPanelProps) {
  if (loading) {
    return (
      <div data-testid="alerts-loading" className="text-portflow-muted text-xs animate-pulse p-4">
        Computing alerts…
      </div>
    )
  }

  if (error) {
    return (
      <p data-testid="alerts-error" className="text-portflow-red text-xs p-4">
        {error}
      </p>
    )
  }

  if (alerts.length === 0) {
    return (
      <p data-testid="alerts-empty" className="text-portflow-muted text-xs p-4">
        No operational alerts at this time.
      </p>
    )
  }

  return (
    <div data-testid="alerts-list" className="space-y-3">
      {alerts.map(alert => (
        <div
          key={alert.id}
          data-testid={`alert-${alert.severity}`}
          className={`rounded-2xl border p-4 shadow-sm transition-all duration-150 hover:shadow-card ${SEVERITY_BORDER[alert.severity]}`}
        >
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${SEVERITY_BADGE[alert.severity]}`}
              >
                !
              </span>
              <h4 className="text-sm font-semibold text-portflow-ink">
                {alert.title}
              </h4>
            </div>

            <a
              href="/operations-plan"
              className="inline-flex items-center gap-1 text-xs font-semibold text-portflow-amber hover:text-portflow-amberHover hover:underline underline-offset-2 transition-colors shrink-0"
            >
              <span>{alert.actionLabel}</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>

          <p className="text-xs text-portflow-muted mt-2 leading-relaxed">
            {alert.reason}
          </p>

          {alert.vesselName && (
            <p className="text-[11px] font-medium text-portflow-navy mt-1.5">
              Vessel: {alert.vesselName}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
