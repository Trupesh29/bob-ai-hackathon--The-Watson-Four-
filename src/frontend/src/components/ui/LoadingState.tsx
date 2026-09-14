export interface LoadingStateProps {
  message?: string
  description?: string
  className?: string
  testId?: string
}

export function LoadingState({
  message = 'Loading operational data…',
  description,
  className = '',
  testId,
}: LoadingStateProps) {
  return (
    <div
      data-testid={testId}
      className={`bg-portflow-surface rounded-2xl border border-portflow-border p-10 text-center flex flex-col items-center justify-center shadow-card ${className}`}
    >
      <div className="relative w-12 h-12 mb-4">
        {/* Outer subtle ring */}
        <div className="absolute inset-0 rounded-full border-4 border-portflow-amberSoft" />
        {/* Spinning indicator */}
        <div className="absolute inset-0 rounded-full border-4 border-portflow-amber border-t-transparent animate-spin" />
      </div>

      <p className="text-sm font-semibold text-portflow-navy">{message}</p>

      {description && (
        <p className="text-xs text-portflow-muted mt-1 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
    </div>
  )
}

export default LoadingState
