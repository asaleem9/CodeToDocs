import { ReactNode } from 'react'

type BadgeTone = 'neutral' | 'phosphor' | 'amber' | 'red' | 'green' | 'paper'

const TONES: Record<BadgeTone, { text: string; bracket: string }> = {
  neutral: { text: 'text-ink-300', bracket: 'text-ink-400' },
  phosphor: { text: 'text-phosphor-300', bracket: 'text-phosphor-600' },
  amber: { text: 'text-amber', bracket: 'text-amber/50' },
  red: { text: 'text-red', bracket: 'text-red/50' },
  green: { text: 'text-green', bracket: 'text-green/50' },
  paper: { text: 'text-print-600', bracket: 'text-paper-400' },
}

interface BadgeProps {
  tone?: BadgeTone
  className?: string
  children: ReactNode
}

// Bracket-framed chip: [ TS ]  [ CONFIGURED ]  [ PRIVATE ]
function Badge({ tone = 'neutral', className = '', children }: BadgeProps) {
  const t = TONES[tone]
  return (
    <span
      className={`inline-flex items-baseline gap-0.5 font-mono text-[11px] font-medium tracking-wide uppercase select-none ${t.text} ${className}`}
    >
      <span aria-hidden className={t.bracket}>[</span>
      {children}
      <span aria-hidden className={t.bracket}>]</span>
    </span>
  )
}

export default Badge
