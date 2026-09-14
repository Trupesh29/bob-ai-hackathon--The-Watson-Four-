import type { ReactNode } from 'react'

export interface MetricCardProps {
  label: string
  value: string | number
  change?: string
  icon: ReactNode
  tone: 'navy' | 'amber' | 'orange' | 'purple' | 'green' | 'red'
  supportingText?: string
  className?: string
  testId?: string
}

const TONE_STYLES: Record<MetricCardProps['tone'], { bg: string; text: string }> = {
  navy: {
    bg: 'bg-portflow-navy/10',
    text: 'text-portflow-navy',
  },
  amber: {
    bg: 'bg-portflow-amberSoft',
    text: 'text-portflow-amber',
  },
  orange: {
    bg: 'bg-portflow-orangeSoft',
    text: 'text-portflow-orange',
  },
  purple: {
    bg: 'bg-portflow-purpleSoft',
    text: 'text-portflow-purple',
  },
  green: {
    bg: 'bg-portflow-greenSoft',
    text: 'text-portflow-green',
  },
  red: {
    bg: 'bg-portflow-redSoft',
    text: 'text-portflow-red',
  },
}

export function MetricCard({
  label,
  value,
  change,
  icon,
  tone,
  supportingText,
  className = '',
  testId,
}: MetricCardProps) {
  const toneStyle = TONE_STYLES[tone]

  return (
    <div
      data-testid={testId}
      className={`bg-portflow-surface rounded-2xl border border-portflow-border shadow-card p-5 transition-all duration-200 hover:shadow-card-hover ${className}`}
    >
      <div className="flex items-start gap-4">
        {/* Color icon square */}
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${toneStyle.bg} ${toneStyle.text} shadow-sm`}
        >
          {icon}
        </div>

        {/* Metric info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="table-label text-xs font-medium text-portflow-muted uppercase tracking-wider truncate">
              {label}
            </p>
            {change && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-portflow-canvas text-portflow-ink border border-portflow-border">
                {change}
              </span>
            )}
          </div>

          <p className="metric-value text-3xl font-bold text-portflow-ink mt-1 tracking-tight leading-none">
            {value}
          </p>

          {supportingText && (
            <p className="text-xs text-portflow-muted mt-1.5 truncate">
              {supportingText}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default MetricCard
