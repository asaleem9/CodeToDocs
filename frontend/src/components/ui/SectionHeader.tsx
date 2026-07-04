import { ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  meta?: ReactNode
  className?: string
}

// "## title ────────" — a markdown heading as chrome.
function SectionHeader({ title, meta, className = '' }: SectionHeaderProps) {
  return (
    <div className={`flex items-baseline gap-3 ${className}`}>
      <span aria-hidden className="font-display text-sm text-phosphor-500 select-none">
        ##
      </span>
      <h2 className="font-display text-lg tracking-wide text-ink-100">{title}</h2>
      <span aria-hidden className="h-px flex-1 translate-y-[-3px] bg-ink-700" />
      {meta && <span className="font-mono text-xs text-ink-400">{meta}</span>}
    </div>
  )
}

export default SectionHeader
