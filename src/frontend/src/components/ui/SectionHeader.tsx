import type { ReactNode } from 'react'

export interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  className?: string
}

export function SectionHeader({
  title,
  subtitle,
  action,
  className = '',
}: SectionHeaderProps) {
  return (
    <div
      className={`flex items-start sm:items-center justify-between gap-4 mb-4 ${className}`}
    >
      <div>
        <h2 className="section-title text-lg sm:text-xl font-semibold text-portflow-ink leading-snug">
          {title}
        </h2>
        {subtitle && (
          <p className="body-text text-xs sm:text-sm text-portflow-muted mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export default SectionHeader
