import { useEffect } from 'react'
import { Button, type ButtonVariant } from './Button'

export interface ConfirmationDialogProps {
  isOpen: boolean
  title: string
  description: string
  details?: Record<string, string>
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'primary' | 'danger' | 'success'
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
  testId?: string
}

export function ConfirmationDialog({
  isOpen,
  title,
  description,
  details,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  isLoading = false,
  onConfirm,
  onCancel,
  testId,
}: ConfirmationDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isLoading, onCancel])

  if (!isOpen) return null

  const confirmVariant: ButtonVariant =
    variant === 'danger' ? 'danger' : variant === 'success' ? 'success' : 'primary'

  return (
    <div
      data-testid={testId}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={isLoading ? undefined : onCancel}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg rounded-2xl bg-portflow-surface border border-portflow-border shadow-card-hover p-6 sm:p-7 z-10 animate-in fade-in zoom-in-95 duration-200">
        <h3
          id="dialog-title"
          className="text-xl font-bold text-portflow-navy tracking-tight"
        >
          {title}
        </h3>

        <p className="text-sm text-portflow-muted mt-2 leading-relaxed">
          {description}
        </p>

        {/* Structured Context / Details */}
        {details && Object.keys(details).length > 0 && (
          <div className="mt-4 p-3.5 rounded-xl bg-portflow-canvas border border-portflow-border space-y-1.5">
            {Object.entries(details).map(([key, val]) => (
              <div
                key={key}
                className="flex items-center justify-between text-xs gap-3"
              >
                <span className="text-portflow-muted font-medium">{key}:</span>
                <span className="text-portflow-ink font-semibold text-right truncate">
                  {val}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons with min 44px height */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>

          <Button
            type="button"
            variant={confirmVariant}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmationDialog
