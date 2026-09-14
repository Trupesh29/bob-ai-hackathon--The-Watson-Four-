import type { ReactNode } from 'react'

export interface SurfaceCardProps {
  title?: string
  subtitle?: string
  children: ReactNode
  accent?: 'navy' | 'amber' | 'orange' | 'purple' | 'green' | 'red'
  padding?: 'sm' | 'md' | 'lg' | 'none'
  action?: ReactNode
  className?: string
  testId?: string
}

const ACCENT_STYLES: Record<NonNullable<SurfaceCardProps['accent']>, string> = {
  navy: 'border-t-4 border-t-portflow-navy',
  amber: 'border-t-4 border-t-portflow-amber',
  orange: 'border-t-4 border-t-portflow-orange',
  purple: 'border-t-4 border-t-portflow-purple',
  green: 'border-t-4 border-t-portflow-green',
  red: 'border-t-4 border-t-portflow-red',
}

const PADDING_STYLES: Record<NonNullable<SurfaceCardProps['padding']>, string> = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  none: 'p-0',
}

export function SurfaceCard({
  title,
  subtitle,
  children,
  accent,
  padding = 'md',
  action,
  className = '',
  testId,
}: SurfaceCardProps) {
  const accentClass = accent ? ACCENT_STYLES[accent] : ''
  const paddingClass = PADDING_STYLES[padding]

  return (
    <div
      data-testid={testId}
      className={`bg-portflow-surface rounded-2xl border border-portflow-border shadow-card transition-shadow duration-200 hover:shadow-card-hover ${accentClass} ${paddingClass} ${className}`}
    >
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-portflow-border/60">
          <div>
            {title && (
              <h3 className="section-title text-portflow-ink font-semibold text-lg leading-snug">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="body-text text-sm text-portflow-muted mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  )
}

export default SurfaceCard
