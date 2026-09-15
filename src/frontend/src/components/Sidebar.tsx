import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import type { HealthState } from '../hooks/useApiHealth'

export interface NavItem {
  to: string
  label: string
  displayLabel?: ReactNode
  end?: boolean
  icon: ReactNode
}

export const NAV_LINKS: NavItem[] = [
  {
    to: '/data-input',
    label: 'Data Input Center',
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
    ),
  },
  {
    to: '/',
    label: 'Dashboard',
    end: true,
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: '/predictions',
    label: 'Predictions',
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    to: '/vessels',
    label: 'Vessels',
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13l2 2h14l2-2M5 15l2 5h10l2-5M9 7h6m-3-4v8" />
      </svg>
    ),
  },
  {
    to: '/optimizer',
    label: 'Optimiser',
    displayLabel: (
      <>
        <span className="sr-only">Optimiser</span>
        <span>Optimizer</span>
      </>
    ),
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
  },
  {
    to: '/operations-plan',
    label: 'Operations Plan',
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    to: '/map',
    label: 'Berth Map',
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
  {
    to: '/copilot',
    label: 'Copilot',
    displayLabel: (
      <span className="flex items-center">
        <span className="text-[10px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded bg-portflow-purple/30 text-portflow-purpleSoft mr-1.5">
          IBM Bob
        </span>
        <span>Copilot</span>
      </span>
    ),
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
]

interface SidebarProps {
  apiHealth: HealthState
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ apiHealth, isOpen = false, onClose }: SidebarProps) {
  const navContent = (
    <div className="flex flex-col h-full">
      {/* ── Brand / Logo Area ──────────────────────────────────────────────── */}
      <div className="px-5 py-5 border-b border-[#2D4A73]/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-portflow-amber flex items-center justify-center text-portflow-ink shadow-sm shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <span className="text-white font-bold text-lg tracking-tight block leading-snug">
              PortFlow AI
            </span>
            <p className="text-slate-300 text-xs font-normal">Port Operations</p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="md:hidden p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <NavLink to="/data-input" onClick={() => onClose?.()} className="mx-3 mt-3 rounded-xl bg-portflow-amber px-3 py-2.5 text-xs font-semibold text-portflow-ink hover:bg-portflow-amberHover transition-colors">
        <span className="block">Demo + planning inputs</span>
        <span className="block font-normal text-[11px] mt-0.5">Synthetic starter data · add your own schedule</span>
      </NavLink>

      {/* ── Navigation Links ────────────────────────────────────────────────── */}
      <nav className="flex-1 py-5 px-3 space-y-1.5 overflow-y-auto">
        {NAV_LINKS.map(({ to, label, displayLabel, end, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => onClose?.()}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-portflow-amber text-portflow-ink font-semibold shadow-sm'
                  : 'text-slate-200 hover:text-white hover:bg-portflow-navyHover',
              ].join(' ')
            }
          >
            {icon}
            <span className="truncate">{displayLabel ?? label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── Bottom Section ──────────────────────────────────────────────────── */}
      <div className="p-4 border-t border-[#2D4A73]/40 space-y-3 bg-black/10">
        {/* Disclaimer Link */}
        <button
          type="button"
          onClick={() =>
            alert(
              'Synthetic Demo Environment: PortFlow AI uses synthetic AIS data and simulated port schedules for demonstration and testing purposes.'
            )
          }
          className="text-[11px] text-slate-400 hover:text-slate-200 underline underline-offset-2 transition-colors block text-left px-1"
        >
          Simulation & Demo Disclaimer
        </button>

        {/* API Health indicator */}
        <div className="pt-1">
          <ApiHealthBadge state={apiHealth} />
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Persistent Sidebar (260px, medium dark navy) */}
      <aside className="hidden md:flex flex-col w-[260px] h-screen sticky top-0 bg-[#1D2E49] border-r border-[#2D4A73]/40 shrink-0 shadow-sidebar z-20">
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
          <aside className="relative z-50 flex flex-col w-[260px] max-w-[85vw] min-h-screen bg-[#1D2E49] border-r border-[#2D4A73]/40 shadow-2xl animate-in slide-in-from-left duration-200">
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
        <span className="w-2 h-2 rounded-full bg-portflow-green inline-block" />
        <span className="text-emerald-300 font-medium">API healthy v{state.version}</span>
      </span>
    )
  }
  return (
    <span className="text-xs flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-portflow-red inline-block" />
      <span className="text-red-300 font-medium">API unreachable</span>
    </span>
  )
}
