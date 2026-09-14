export type BadgeStatus =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'
  | 'proposed'
  | 'active'
  | 'rejected'
  | 'scheduled'
  | 'unscheduled'
  | 'in_port'
  | 'delayed'

export interface StatusBadgeProps {
  status: BadgeStatus | string
  label?: string
  size?: 'sm' | 'md'
  showDot?: boolean
  className?: string
}

interface StatusConfig {
  bg: string
  text: string
  border: string
  dot: string
  defaultLabel: string
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  low: {
    bg: 'bg-portflow-greenSoft',
    text: 'text-portflow-green',
    border: 'border-portflow-green/20',
    dot: 'bg-portflow-green',
    defaultLabel: 'Low',
  },
  medium: {
    bg: 'bg-portflow-amberSoft',
    text: 'text-portflow-amber',
    border: 'border-portflow-amber/20',
    dot: 'bg-portflow-amber',
    defaultLabel: 'Medium',
  },
  high: {
    bg: 'bg-portflow-orangeSoft',
    text: 'text-portflow-orange',
    border: 'border-portflow-orange/20',
    dot: 'bg-portflow-orange',
    defaultLabel: 'High',
  },
  critical: {
    bg: 'bg-portflow-redSoft',
    text: 'text-portflow-red',
    border: 'border-portflow-red/20',
    dot: 'bg-portflow-red',
    defaultLabel: 'Critical',
  },
  proposed: {
    bg: 'bg-portflow-amberSoft',
    text: 'text-portflow-amber',
    border: 'border-portflow-amber/20',
    dot: 'bg-portflow-amber',
    defaultLabel: 'Proposed',
  },
  active: {
    bg: 'bg-portflow-greenSoft',
    text: 'text-portflow-green',
    border: 'border-portflow-green/20',
    dot: 'bg-portflow-green',
    defaultLabel: 'Active',
  },
  rejected: {
    bg: 'bg-portflow-redSoft',
    text: 'text-portflow-red',
    border: 'border-portflow-red/20',
    dot: 'bg-portflow-red',
    defaultLabel: 'Rejected',
  },
  scheduled: {
    bg: 'bg-portflow-greenSoft',
    text: 'text-portflow-green',
    border: 'border-portflow-green/20',
    dot: 'bg-portflow-green',
    defaultLabel: 'Scheduled',
  },
  unscheduled: {
    bg: 'bg-portflow-orangeSoft',
    text: 'text-portflow-orange',
    border: 'border-portflow-orange/20',
    dot: 'bg-portflow-orange',
    defaultLabel: 'Unscheduled',
  },
  in_port: {
    bg: 'bg-portflow-navy/10',
    text: 'text-portflow-navy',
    border: 'border-portflow-navy/20',
    dot: 'bg-portflow-navy',
    defaultLabel: 'in_port',
  },
  delayed: {
    bg: 'bg-portflow-orangeSoft',
    text: 'text-portflow-orange',
    border: 'border-portflow-orange/20',
    dot: 'bg-portflow-orange',
    defaultLabel: 'delayed',
  },
}

export function StatusBadge({
  status,
  label,
  size = 'md',
  showDot = true,
  className = '',
}: StatusBadgeProps) {
  const normalizedKey = status.toLowerCase()
  const config = STATUS_CONFIG[normalizedKey] ?? {
    bg: 'bg-portflow-canvas',
    text: 'text-portflow-ink',
    border: 'border-portflow-border',
    dot: 'bg-portflow-muted',
    defaultLabel: status,
  }

  const sizeClasses =
    size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-lg border ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${className}`}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot} shrink-0`} />
      )}
      <span>{label ?? config.defaultLabel}</span>
    </span>
  )
}

export default StatusBadge
