import { ReactNode, useEffect, useRef } from 'react'
import { gsap, prefersReducedMotion } from '../../lib/motion'

interface MenuProps {
  open: boolean
  onClose: () => void
  align?: 'left' | 'right'
  className?: string
  children: ReactNode
}

// Anchored popover panel. Parent owns the open state; this handles
// Escape, outside-click, and the enter animation. Wrap the trigger and
// <Menu> in a relatively-positioned element.
function Menu({ open, onClose, align = 'left', className = '', children }: MenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const onClick = (e: PointerEvent) => {
      const wrapper = ref.current?.parentElement
      if (wrapper && !wrapper.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onClick)
    }
  }, [open, onClose])

  useEffect(() => {
    if (open && ref.current && !prefersReducedMotion()) {
      gsap.fromTo(
        ref.current,
        { opacity: 0, y: -6 },
        { opacity: 1, y: 0, duration: 0.16, ease: 'power2.out' }
      )
    }
  }, [open])

  if (!open) return null

  return (
    <div
      ref={ref}
      role="menu"
      className={`absolute top-[calc(100%+0.5rem)] z-50 min-w-56 max-w-[calc(100vw-2rem)] border border-ink-700 bg-ink-900 p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.5)] ${
        align === 'right' ? 'right-0' : 'left-0'
      } ${className}`}
    >
      {children}
    </div>
  )
}

interface MenuItemProps {
  onSelect: () => void
  children: ReactNode
  className?: string
}

export function MenuItem({ onSelect, children, className = '' }: MenuItemProps) {
  return (
    <button
      role="menuitem"
      onClick={onSelect}
      className={`block w-full cursor-pointer rounded-[2px] border border-transparent px-3 py-2 text-left font-mono text-[13px] text-ink-300 transition-colors duration-100 hover:border-ink-700 hover:bg-phosphor-400/5 hover:text-ink-100 focus-visible:border-ink-700 focus-visible:bg-phosphor-400/5 ${className}`}
    >
      {children}
    </button>
  )
}

export default Menu
