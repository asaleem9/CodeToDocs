interface LogoProps {
  size?: 'small' | 'medium' | 'large'
  showText?: boolean
}

const SIZES = {
  small: 'text-base',
  medium: 'text-xl',
  large: 'text-3xl',
}

function Logo({ size = 'medium', showText = true }: LogoProps) {
  if (!showText) return null

  return (
    <span className={`inline-flex items-baseline gap-2 font-display select-none ${SIZES[size]}`}>
      <span aria-hidden className="text-phosphor-400 glow-text">
        &gt;
      </span>
      <span className="tracking-tight text-ink-100">CodeToDocs</span>
      <span aria-hidden className="animate-caret-blink -ml-1 text-phosphor-400">
        ▮
      </span>
    </span>
  )
}

export default Logo
