import { NavLink } from 'react-router-dom'
import type { HealthState } from '../hooks/useApiHealth'

export const NAV_LINKS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/vessels', label: 'Vessels' },
  { to: '/map', label: 'Berth Map' },
  { to: '/predictions', label: 'Predictions' },
  { to: '/optimizer', label: 'Optimiser' },
  { to: '/operations-plan', label: 'Operations Plan' },
  { to: '/copilot', label: 'Copilot' },
] as const

interface SidebarProps {
  apiHealth: HealthState
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ apiHealth, isOpen = false, onClose }: SidebarProps) {
  const navContent = (
    <>
      {/* Brand */}
      <div className="px-4 py-5 border-b border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-teal-400 font-bold text-lg tracking-tight">
            PortFlow AI
          </span>
          <p className="text-slate-400 text-xs mt-0.5">Port Operations Optimiser</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {NAV_LINKS.map(({ to, label, ...rest }) => (
          <NavLink
            key={to}
            to={to}
            end={'end' in rest ? rest.end : undefined}
            onClick={() => onClose?.()}
            className={({ isActive }) =>
              [
                'flex items-center gap-2 px-3 py-2.5 rounded text-sm transition-colors',
                isActive
                  ? 'bg-teal-500/20 text-teal-300 font-medium'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800',
              ].join(' ')
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {/* API health indicator */}
      <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/40">
        <ApiHealthBadge state={apiHealth} />
      </div>
    </>
  )

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col w-56 min-h-screen bg-navy-900 border-r border-slate-800 shrink-0">
        {navContent}
      </aside>

      {/* Mobile Drawer Backdrop & Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />
          <aside className="relative z-50 flex flex-col w-64 max-w-[80vw] min-h-screen bg-slate-900 border-r border-slate-800 shadow-2xl animate-in slide-in-from-left duration-200">
            {navContent}
          </aside>
        </div>
      )}
    </>
  )
}

function ApiHealthBadge({ state }: { state: HealthState }) {
  if (state.status === 'loading') {
    return <span className="text-slate-400 text-xs">API connecting…</span>
  }
  if (state.status === 'healthy') {
    return (
      <span className="text-xs flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-teal-400 inline-block" />
        <span className="text-teal-300 font-medium">API healthy v{state.version}</span>
      </span>
    )
  }
  return (
    <span className="text-xs flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
      <span className="text-red-400 font-medium">API unreachable</span>
    </span>
  )
}
