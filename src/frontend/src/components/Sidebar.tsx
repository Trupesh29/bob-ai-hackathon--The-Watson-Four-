import { NavLink } from 'react-router-dom'
import type { HealthState } from '../hooks/useApiHealth'

const NAV_LINKS = [
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
}

export function Sidebar({ apiHealth }: SidebarProps) {
  return (
    <aside className="flex flex-col w-56 min-h-screen bg-navy-900 border-r border-slate-800 shrink-0">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-slate-800">
        <span className="text-teal-400 font-bold text-lg tracking-tight">
          PortFlow AI
        </span>
        <p className="text-slate-500 text-xs mt-0.5">Port Operations Optimiser</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-0.5 px-2">
        {NAV_LINKS.map(({ to, label, ...rest }) => (
          <NavLink
            key={to}
            to={to}
            end={'end' in rest ? rest.end : undefined}
            className={({ isActive }) =>
              [
                'flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors',
                isActive
                  ? 'bg-teal-500/20 text-teal-300 font-medium'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800',
              ].join(' ')
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {/* API health indicator */}
      <div className="px-4 py-3 border-t border-slate-800">
        <ApiHealthBadge state={apiHealth} />
      </div>
    </aside>
  )
}

function ApiHealthBadge({ state }: { state: HealthState }) {
  if (state.status === 'loading') {
    return <span className="text-slate-500 text-xs">API connecting…</span>
  }
  if (state.status === 'healthy') {
    return (
      <span className="text-xs flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-teal-400 inline-block" />
        <span className="text-teal-300">API healthy v{state.version}</span>
      </span>
    )
  }
  return (
    <span className="text-xs flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
      <span className="text-red-400">API unreachable</span>
    </span>
  )
}
