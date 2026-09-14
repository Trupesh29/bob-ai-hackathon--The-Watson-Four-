import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ai'
  | 'danger'
  | 'success'
  | 'ghost'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  children: ReactNode
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    'bg-portflow-amber hover:bg-portflow-amberHover active:bg-[#9E650C] text-white shadow-sm focus:ring-portflow-amber/40 border border-transparent',
  secondary:
    'bg-portflow-surface hover:bg-portflow-navy/5 active:bg-portflow-navy/10 text-portflow-navy border border-portflow-navy focus:ring-portflow-navy/30',
  ai:
    'bg-portflow-purple hover:bg-[#63459E] active:bg-[#523884] text-white shadow-sm focus:ring-portflow-purple/40 border border-transparent',
  danger:
    'bg-portflow-redSoft hover:bg-portflow-red hover:text-white text-portflow-red border border-portflow-red/30 focus:ring-portflow-red/30',
  success:
    'bg-portflow-green hover:bg-[#25664A] active:bg-[#1E523B] text-white shadow-sm focus:ring-portflow-green/40 border border-transparent',
  ghost:
    'bg-transparent hover:bg-black/5 active:bg-black/10 text-portflow-muted hover:text-portflow-ink border border-transparent focus:ring-portflow-border',
}

const SIZE_STYLES: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'min-h-[44px] px-3.5 py-2 text-xs',
  md: 'min-h-[44px] px-4 py-2.5 text-sm',
  lg: 'min-h-[48px] px-5 py-3 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const variantClass = VARIANT_STYLES[variant]
  const sizeClass = SIZE_STYLES[size]
  const isDisabled = disabled || isLoading

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150 select-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-portflow-canvas disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer ${variantClass} ${sizeClass} ${className}`}
    >
      {isLoading ? (
        <svg
          className="w-4 h-4 animate-spin shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}

      <span>{children}</span>

      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  )
}

export default Button
