import type { ReactNode } from 'react'

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
  testId?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
  testId,
}: EmptyStateProps) {
  return (
    <div
      data-testid={testId}
      className={`bg-portflow-surface rounded-2xl border border-dashed border-portflow-border p-8 sm:p-12 text-center flex flex-col items-center justify-center ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-portflow-canvas flex items-center justify-center text-portflow-muted mb-4 shadow-sm border border-portflow-border">
        {icon ?? (
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        )}
      </div>

      <h3 className="section-title text-base sm:text-lg font-semibold text-portflow-ink">
        {title}
      </h3>

      {description && (
        <p className="body-text text-xs sm:text-sm text-portflow-muted mt-1.5 max-w-md leading-relaxed">
          {description}
        </p>
      )}

      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export default EmptyState
