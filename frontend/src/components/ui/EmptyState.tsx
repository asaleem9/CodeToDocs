import { ReactNode } from 'react'

interface EmptyStateProps {
  /** ASCII/block glyph rendered large, e.g. "░▒▓" or "¶". */
  glyph?: string
  title: string
  hint?: ReactNode
  paper?: boolean
  className?: string
}

function EmptyState({ glyph = '░▒▓', title, hint, paper = false, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`flex h-full min-h-0 flex-col items-center justify-center gap-3 p-8 text-center ${className}`}
    >
      <div
        aria-hidden
        className={`font-display text-3xl tracking-widest select-none ${
          paper ? 'text-paper-300' : 'text-ink-700'
        }`}
      >
        {glyph}
      </div>
      <p className={`font-display text-sm ${paper ? 'text-print-600' : 'text-ink-300'}`}>{title}</p>
      {hint && (
        <p className={`max-w-sm font-sans text-[13px] ${paper ? 'text-print-400' : 'text-ink-400'}`}>
          {hint}
        </p>
      )}
    </div>
  )
}

export default EmptyState
