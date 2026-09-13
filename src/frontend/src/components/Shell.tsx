import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useApiHealth } from '../hooks/useApiHealth'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/vessels': 'Vessels',
  '/map': 'Berth Map',
  '/predictions': 'Predictions',
  '/optimizer': 'Optimiser',
  '/operations-plan': 'Operations Plan',
  '/copilot': 'Copilot',
}

/** Top-level shell: sidebar + main content area. */
export function Shell() {
  const location = useLocation()
  const apiHealth = useApiHealth()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const pageTitle = PAGE_TITLES[location.pathname] ?? 'PortFlow AI'

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar
        apiHealth={apiHealth}
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 flex items-center justify-between px-4 sm:px-6 border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-30 shrink-0">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="md:hidden p-2 mr-2 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-slate-200 font-semibold text-sm sm:text-base tracking-tight">
              {pageTitle}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="md:hidden flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-900 border border-slate-800 px-2 py-1 rounded">
              <span className={`w-2 h-2 rounded-full ${apiHealth.status === 'healthy' ? 'bg-teal-400' : 'bg-red-500'}`} />
              <span>{apiHealth.status === 'healthy' ? 'Online' : 'API Offline'}</span>
            </div>
            <span className="hidden sm:inline-block text-[11px] text-teal-400/80 font-mono">
              Port: FKPFL
            </span>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 p-3 sm:p-6 overflow-auto min-w-0 max-w-full">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
