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
  const pageTitle = PAGE_TITLES[location.pathname] ?? 'PortFlow AI'

  return (
    <div className="flex min-h-screen">
      <Sidebar apiHealth={apiHealth} />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-12 flex items-center px-6 border-b border-slate-800 bg-slate-950 shrink-0">
          <span className="text-slate-300 font-medium text-sm">{pageTitle}</span>
        </header>

        {/* Page content */}
        <div className="flex-1 p-6 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
