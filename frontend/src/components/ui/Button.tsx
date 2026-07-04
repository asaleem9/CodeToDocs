import { ButtonHTMLAttributes, ReactNode } from 'react'
import Spinner from './Spinner'

type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'success'
type ButtonSize = 'sm' | 'md'

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'border-phosphor-400/30 bg-phosphor-400/10 text-phosphor-300 hover:enabled:border-phosphor-400 hover:enabled:bg-phosphor-400/15 hover:enabled:shadow-[0_0_18px_rgba(45,212,191,0.15)]',
  ghost:
    'border-ink-700 bg-transparent text-ink-300 hover:enabled:border-ink-600 hover:enabled:text-ink-100',
  danger:
    'border-red/20 bg-red/10 text-red hover:enabled:border-red/50 hover:enabled:bg-red/15',
  success:
    'border-green/20 bg-green/10 text-green hover:enabled:border-green/50 hover:enabled:bg-green/15',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-[12.5px] gap-1.5',
  md: 'px-4 py-2 text-[13.5px] gap-2',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  children: ReactNode
}

/** Class string for styling a Link/anchor like a Button. */
export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md') {
  return `inline-flex cursor-pointer items-center justify-center rounded-[2px] border font-mono font-medium transition-colors duration-150 select-none disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${SIZES[size]}`
}

function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`${buttonClasses(variant, size)} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}

export default Button
