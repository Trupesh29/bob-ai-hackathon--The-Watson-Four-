import type { ReactNode } from 'react'

export interface InsightCardProps {
  title: string
  content: string | ReactNode
  recommendations?: string[]
  timestamp?: string
  badgeText?: string
  action?: ReactNode
  className?: string
  testId?: string
}

export function InsightCard({
  title,
  content,
  recommendations,
  timestamp,
  badgeText = 'IBM Bob Insight',
  action,
  className = '',
  testId,
}: InsightCardProps) {
  return (
    <div
      data-testid={testId}
      className={`rounded-2xl border border-portflow-purple/30 bg-gradient-to-br from-portflow-surface via-portflow-surface to-portflow-purpleSoft/40 p-5 sm:p-6 shadow-card hover:shadow-card-hover transition-all duration-200 ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-portflow-purpleSoft text-portflow-purple border border-portflow-purple/20">
            <svg
              className="w-3.5 h-3.5 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zm0 13a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zm8-5a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0118 10zM5 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 015 10zm10.657-5.657a.75.75 0 010 1.06l-1.06 1.061a.75.75 0 11-1.061-1.06l1.06-1.061a.75.75 0 011.061 0zm-9.193 9.192a.75.75 0 010 1.061l-1.06 1.06a.75.75 0 11-1.061-1.06l1.06-1.061a.75.75 0 011.061 0zm9.193 2.122a.75.75 0 01-1.06 0l-1.061-1.06a.75.75 0 111.06-1.061l1.061 1.06a.75.75 0 010 1.061zM6.464 6.464a.75.75 0 01-1.06 0l-1.061-1.06a.75.75 0 011.06-1.061l1.061 1.06a.75.75 0 010 1.061zM10 6.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" />
            </svg>
            {badgeText}
          </span>
          {timestamp && (
            <span className="text-xs text-portflow-muted font-mono">
              {timestamp}
            </span>
          )}
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>

      {/* Title */}
      <h3 className="text-base sm:text-lg font-bold text-portflow-ink tracking-tight">
        {title}
      </h3>

      {/* Main Content */}
      <div className="text-xs sm:text-sm text-portflow-muted mt-2 leading-relaxed">
        {content}
      </div>

      {/* Actionable Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div className="mt-4 pt-3 border-t border-portflow-purple/20">
          <p className="text-xs font-semibold text-portflow-purple uppercase tracking-wider mb-2">
            Recommended Actions
          </p>
          <ul className="space-y-1.5 text-xs text-portflow-ink">
            {recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-portflow-purple mt-1.5 shrink-0" />
                <span className="leading-normal">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default InsightCard
