import { ReactNode } from 'react'

type PanelVariant = 'dark' | 'paper'

interface PanelProps {
  title?: string
  actions?: ReactNode
  variant?: PanelVariant
  /** Phosphor corner brackets light up (also shown on hover). */
  active?: boolean
  /** CRT scanline texture — dark panels only, never paper. */
  scanlines?: boolean
  /** Background behind the title tab; must match the surface the panel sits on. */
  tabBg?: string
  className?: string
  contentClassName?: string
  children: ReactNode
}

// The TUI frame every surface is built from: 1px border, a title tab
// punched through the top border, and corner brackets that glow phosphor
// when the panel is active. `paper` renders the printout surface.
function Panel({
  title,
  actions,
  variant = 'dark',
  active = false,
  scanlines = false,
  tabBg = 'bg-ink-950',
  className = '',
  contentClassName = '',
  children,
}: PanelProps) {
  const isPaper = variant === 'paper'

  const corner = (pos: string) => (
    <span
      aria-hidden
      className={`pointer-events-none absolute h-2.5 w-2.5 border-phosphor-400 transition-opacity duration-200 ${pos} ${
        active ? 'opacity-100' : 'opacity-0 group-hover/panel:opacity-60'
      }`}
    />
  )

  return (
    <section
      className={`group/panel relative flex min-h-0 flex-col border ${
        isPaper
          ? 'border-paper-300 bg-paper-100 shadow-[0_1px_0_rgba(0,0,0,0.35),0_12px_32px_rgba(0,0,0,0.45)]'
          : 'border-ink-700 bg-ink-900'
      } ${className}`}
    >
      {corner('-top-px -left-px border-t-2 border-l-2')}
      {corner('-top-px -right-px border-t-2 border-r-2')}
      {corner('-bottom-px -left-px border-b-2 border-l-2')}
      {corner('-bottom-px -right-px border-b-2 border-r-2')}

      {(title || actions) && (
        <div className="pointer-events-none absolute -top-[9px] right-3 left-3 z-10 flex items-center justify-between">
          {title ? (
            <span
              className={`${tabBg} pointer-events-auto px-1.5 font-display text-[11px] tracking-[0.12em] select-none ${
                isPaper ? 'text-print-600' : active ? 'text-phosphor-300' : 'text-ink-300'
              }`}
            >
              [ {title} ]
            </span>
          ) : (
            <span />
          )}
          {actions && (
            <span className={`${tabBg} pointer-events-auto flex items-center gap-1.5 px-1.5`}>
              {actions}
            </span>
          )}
        </div>
      )}

      <div
        className={`relative flex min-h-0 flex-1 flex-col ${
          scanlines && !isPaper ? 'scanlines' : ''
        } ${contentClassName}`}
      >
        {children}
      </div>
    </section>
  )
}

export default Panel
