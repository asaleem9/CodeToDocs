import { useEffect, useState } from 'react'

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

// Braille-frame spinner — the terminal answer to the border-spin loader.
function Spinner({ className = '' }: { className?: string }) {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setFrame((f) => (f + 1) % FRAMES.length), 80)
    return () => clearInterval(id)
  }, [])

  return (
    <span aria-hidden className={`inline-block font-mono leading-none ${className}`}>
      {FRAMES[frame]}
    </span>
  )
}

export default Spinner
