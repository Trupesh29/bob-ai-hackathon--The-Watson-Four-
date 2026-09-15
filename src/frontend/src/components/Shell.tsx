import { useState, useMemo } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useApiHealth } from '../hooks/useApiHealth'

interface PageMeta {
  title: string
  subtitle: string
}

const PAGE_META: Record<string, PageMeta> = {
  '/': {
    title: 'Dashboard',
    subtitle: '72-hour operational overview for Port of Falkermere',
  },
  '/predictions': {
    title: 'Predictions',
    subtitle: 'AI-assisted turnaround estimates and congestion risk forecasting',
  },
  '/vessels': {
    title: 'Vessels',
    subtitle: 'Active vessel schedules, arrival manifests, and berthing assignments',
  },
  '/data-input': {
    title: 'Data Input Center',
    subtitle: 'Add vessel schedules and update berth or crane availability',
  },
  '/optimizer': {
    title: 'Optimizer',
    subtitle: 'Automated berth scheduling and crane resource allocation engine',
  },
  '/operations-plan': {
    title: 'Operations Plan',
    subtitle: 'Berth schedule dispatch, crane shift tasks, and supervisor approvals',
  },
  '/map': {
    title: 'Berth Map',
    subtitle: 'Geospatial layout, real-time quay allocation, and crane readiness',
  },
  '/copilot': {
    title: 'IBM Bob Copilot',
    subtitle: 'Maritime operational assistant for query dispatch and proactive guidance',
  },
}

/** Top-level shell: sidebar + standardized executive header + main content area. */
export function Shell() {
  const location = useLocation()
  const apiHealth = useApiHealth()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const pageMeta = useMemo(() => {
    return (
      PAGE_META[location.pathname] ?? {
        title: 'PortFlow AI',
        subtitle: 'Maritime Port Operations Platform',
      }
    )
  }, [location.pathname])

  // Current UTC time formatted as HH:MM
  const updatedTime = useMemo(() => {
    const now = new Date()
    const hours = String(now.getUTCHours()).padStart(2, '0')
    const minutes = String(now.getUTCMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }, [])

  return (
    <div className="flex min-h-screen bg-portflow-canvas text-portflow-ink font-sans">
      <Sidebar
        apiHealth={apiHealth}
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0">
        {/* ── Standard Executive Header ───────────────────────────────────── */}
        <header className="bg-portflow-surface/90 backdrop-blur-md border-b border-portflow-border px-4 sm:px-8 py-4 sm:py-5 sticky top-0 z-30 shadow-card">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Page Title & Explanation + Mobile Nav Button */}
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open navigation menu"
                className="md:hidden p-2 text-portflow-navy hover:bg-portflow-canvas rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-portflow-amber"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl sm:text-[28px] font-bold text-portflow-navy tracking-tight leading-tight">
                  {pageMeta.title}
                </h1>
                <p className="text-sm text-portflow-muted mt-1 leading-normal">
                  {pageMeta.subtitle}
                </p>
              </div>
            </div>

            {/* Metadata Bar: Port, Scenario, Updated Time, API Status */}
            <div className="flex items-center flex-wrap gap-2.5 sm:gap-3 text-xs">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-portflow-canvas border border-portflow-border text-portflow-ink font-medium">
                <span className="text-portflow-muted font-normal">Port:</span>
                <span className="font-semibold text-portflow-navy">FKPFL</span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-portflow-amberSoft border border-portflow-amber/30 text-portflow-amber font-medium">
                <span className="text-portflow-amberHover font-normal">Scenario:</span>
                <span className="font-semibold text-portflow-ink">Select on page</span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-portflow-canvas border border-portflow-border text-portflow-muted">
                <span>Updated:</span>
                <span className="font-mono text-portflow-ink font-medium">{updatedTime} UTC</span>
              </div>

              {/* Online indicator */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-portflow-canvas border border-portflow-border">
                <span
                  className={`w-2 h-2 rounded-full ${
                    apiHealth.status === 'healthy' ? 'bg-portflow-green' : 'bg-portflow-red'
                  }`}
                />
                <span className="text-[11px] font-medium text-portflow-muted">
                  {apiHealth.status === 'healthy' ? 'Online' : 'API Offline'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* ── Page Content ────────────────────────────────────────────────── */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto min-w-0 max-w-full">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
