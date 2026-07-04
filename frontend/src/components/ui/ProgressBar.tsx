interface ProgressBarProps {
  /** 0–100; omit for indeterminate. */
  value?: number
  showReadout?: boolean
  className?: string
}

// Segmented block fill — ▰▰▰▰▱▱▱ as a continuous bar with cell notches.
function ProgressBar({ value, showReadout = true, className = '' }: ProgressBarProps) {
  const determinate = typeof value === 'number'
  const pct = determinate ? Math.max(0, Math.min(100, value)) : 100

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        role="progressbar"
        aria-valuenow={determinate ? Math.round(pct) : undefined}
        aria-valuemin={0}
        aria-valuemax={100}
        className="relative h-2.5 flex-1 overflow-hidden border border-ink-700 bg-ink-850"
      >
        <div
          className={`h-full bg-phosphor-500 transition-[width] duration-300 ease-out ${
            determinate ? '' : 'animate-pulse'
          }`}
          style={{ width: `${pct}%` }}
        />
        {/* cell notches over the fill */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'repeating-linear-gradient(90deg, transparent 0 6px, var(--color-ink-900) 6px 8px)',
          }}
        />
      </div>
      {showReadout && determinate && (
        <span className="w-10 text-right font-display text-[11px] text-ink-300 tabular-nums">
          {Math.round(pct)}%
        </span>
      )}
    </div>
  )
}

export default ProgressBar
