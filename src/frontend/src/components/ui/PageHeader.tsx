import type { ReactNode } from 'react'

export interface PageHeaderProps {
  title: string
  subtitle?: string
  badge?: ReactNode
  actions?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  subtitle,
  badge,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-portflow-border/80 ${className}`}
    >
      <div>
        <div className="flex items-center gap-3">
          <h1 className="page-title text-2xl sm:text-3xl font-bold text-portflow-navy tracking-tight leading-tight">
            {title}
          </h1>
          {badge && <div className="shrink-0">{badge}</div>}
        </div>
        {subtitle && (
          <p className="body-text text-sm sm:text-base text-portflow-muted mt-1 leading-normal">
            {subtitle}
          </p>
        )}
      </div>

      {actions && <div className="flex items-center gap-2.5 flex-wrap shrink-0">{actions}</div>}
    </div>
  )
}

export default PageHeader
