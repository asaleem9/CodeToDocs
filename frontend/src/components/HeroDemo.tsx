import { useRef } from 'react'
import { gsap, useGSAP, prefersReducedMotion } from '../lib/motion'
import Panel from './ui/Panel'

// The hero: a terminal runs `codetodocs generate`, and the documentation
// prints out of it as a typeset paper sheet. One looping GSAP timeline;
// reduced-motion and small screens get the completed frame, static.

const CODE_LINES: Array<Array<{ t: string; c?: string }>> = [
  [
    { t: 'function', c: 'text-amber' },
    { t: ' calculateTotal', c: 'text-phosphor-200' },
    { t: '(items) {' },
  ],
  [
    { t: '  return', c: 'text-amber' },
    { t: ' items.reduce((sum, item) =>' },
  ],
  [
    { t: '    sum + (item.price ' },
    { t: '*', c: 'text-amber' },
    { t: ' item.qty), ' },
    { t: '0', c: 'text-phosphor-200' },
    { t: ');' },
  ],
  [{ t: '}' }],
]

function HeroDemo() {
  const scope = useRef<HTMLDivElement>(null)
  const tl = useRef<gsap.core.Timeline | null>(null)

  useGSAP(
    () => {
      const q = gsap.utils.selector(scope)
      const codeLines = q('[data-demo=code] > div')
      const proseLines = q('[data-demo=prose] > *')
      const strokes = q('[data-demo=chart] path, [data-demo=chart] rect')
      const scoreEl = q('[data-demo=score]')[0]
      const blocks = q('[data-demo=blocks] span')

      const setFinal = () => {
        gsap.set(q('[data-demo=cmd]'), { text: 'codetodocs generate example.ts' })
        gsap.set(codeLines, { autoAlpha: 1 })
        gsap.set(q('[data-demo=status]'), { autoAlpha: 1 })
        gsap.set(blocks, { autoAlpha: 1 })
        gsap.set(q('[data-demo=sheet]'), { autoAlpha: 1, clipPath: 'inset(0% 0 0% 0)', y: 0 })
        gsap.set(proseLines, { autoAlpha: 1, y: 0 })
        gsap.set(strokes, { strokeDashoffset: 0 })
        if (scoreEl) scoreEl.textContent = '95'
      }

      const isSmall = window.matchMedia('(max-width: 1023px)').matches
      if (prefersReducedMotion() || isSmall) {
        setFinal()
        return
      }

      // prepare stroke drawing
      strokes.forEach((el) => {
        const shape = el as unknown as SVGGeometryElement
        if (typeof shape.getTotalLength !== 'function') return
        const len = shape.getTotalLength()
        gsap.set(shape, { strokeDasharray: len, strokeDashoffset: len })
      })

      const score = { n: 0 }
      const t = gsap.timeline({ repeat: -1, repeatDelay: 0.9, delay: 0.6 })
      tl.current = t

      t.addLabel('boot')
        .to(q('[data-demo=cmd]'), {
          text: 'codetodocs generate example.ts',
          duration: 1.0,
          ease: 'none',
        })
        .addLabel('code', '+=0.25')
        .fromTo(
          codeLines,
          { autoAlpha: 0, x: -6 },
          { autoAlpha: 1, x: 0, duration: 0.18, stagger: 0.14, ease: 'none' },
          'code'
        )
        .addLabel('run', '+=0.2')
        .fromTo(q('[data-demo=status]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.15 }, 'run')
        .fromTo(
          blocks,
          { autoAlpha: 0.15 },
          { autoAlpha: 1, duration: 0.12, stagger: 0.14, ease: 'steps(1)' },
          'run'
        )
        .addLabel('print', '+=0.3')
        .fromTo(
          q('[data-demo=sheet]'),
          { autoAlpha: 1, clipPath: 'inset(0% 0 100% 0)', y: -10 },
          { clipPath: 'inset(0% 0 0% 0)', y: 0, duration: 0.9, ease: 'power2.inOut' },
          'print'
        )
        .fromTo(
          proseLines,
          { autoAlpha: 0, y: 8 },
          { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.09, ease: 'power2.out' },
          'print+=0.45'
        )
        .to(
          strokes,
          { strokeDashoffset: 0, duration: 0.7, stagger: 0.08, ease: 'power1.inOut' },
          'print+=0.7'
        )
        .addLabel('score', '-=0.2')
        .to(
          score,
          {
            n: 95,
            duration: 0.9,
            ease: 'power2.out',
            snap: { n: 1 },
            onUpdate: () => {
              if (scoreEl) scoreEl.textContent = String(score.n)
            },
          },
          'score'
        )
        .fromTo(
          q('[data-demo=scorebadge]'),
          { boxShadow: '0 0 0 rgba(13,148,136,0)' },
          { boxShadow: '0 0 22px rgba(13,148,136,0.35)', duration: 0.4, yoyo: true, repeat: 1 },
          'score+=0.5'
        )
        // hold, then wipe for the next pass
        .to(q('[data-demo=sheet]'), { autoAlpha: 0, y: 14, duration: 0.5, ease: 'power2.in' }, '+=4.5')
        .to(
          [codeLines, q('[data-demo=status]'), q('[data-demo=cmd]')].flat(),
          { autoAlpha: 0, duration: 0.3 },
          '<'
        )
        .set(q('[data-demo=cmd]'), { text: '' })
        .set(codeLines, { autoAlpha: 0, x: -6 })
        .set(strokes, {
          strokeDashoffset: (_i: number, el: Element) =>
            (el as unknown as SVGGeometryElement).getTotalLength?.() ?? 0,
        })
    },
    { scope }
  )

  return (
    <div ref={scope} className="relative mx-auto w-full max-w-xl">
      {/* the terminal */}
      <Panel title="codetodocs — session" scanlines active tabBg="bg-ink-950">
        <div className="p-5 pb-6 font-mono text-[13px] leading-relaxed">
          <div className="flex items-baseline gap-2">
            <span className="text-phosphor-400 select-none">$</span>
            <span data-demo="cmd" className="text-ink-100" />
            <span aria-hidden className="animate-caret-blink -ml-1 text-phosphor-400">▮</span>
          </div>

          <div data-demo="code" className="mt-4 text-ink-300">
            {CODE_LINES.map((line, i) => (
              <div key={i} className="whitespace-pre" style={{ opacity: 0 }}>
                {line.map((seg, j) => (
                  <span key={j} className={seg.c}>
                    {seg.t}
                  </span>
                ))}
              </div>
            ))}
          </div>

          <div data-demo="status" className="mt-4 flex items-center gap-3" style={{ opacity: 0 }}>
            <span className="text-ink-400">analyzing</span>
            <span data-demo="blocks" className="tracking-[0.2em] text-phosphor-400">
              {Array.from({ length: 8 }, (_, i) => (
                <span key={i}>▮</span>
              ))}
            </span>
            <span className="text-ink-400">ok</span>
          </div>
        </div>
      </Panel>

      {/* the printout */}
      <div
        data-demo="sheet"
        className="relative z-10 mx-4 -mt-1 -rotate-[0.4deg] border border-paper-300 bg-paper-100 px-7 py-6 shadow-[0_18px_50px_rgba(0,0,0,0.55)]"
        style={{ opacity: 0 }}
      >
        <div data-demo="prose">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <h3 className="font-serif text-2xl font-semibold text-print-900">calculateTotal</h3>
            <span className="font-mono text-[10px] tracking-wider text-print-400 uppercase">
              documentation.md
            </span>
          </div>
          <p className="mt-2 font-serif text-[15px] leading-relaxed text-print-600">
            Computes the total price of a cart by summing each item's price multiplied by its
            quantity.
          </p>

          <svg
            data-demo="chart"
            viewBox="0 0 340 64"
            className="mt-4 h-14 w-full"
            fill="none"
            stroke="#494f49"
            strokeWidth="1.5"
          >
            <rect x="2" y="18" width="88" height="28" />
            <path d="M 90 32 H 126 m -8 -5 8 5 -8 5" />
            <rect x="126" y="18" width="88" height="28" />
            <path d="M 214 32 H 250 m -8 -5 8 5 -8 5" />
            <rect x="250" y="18" width="88" height="28" />
            <text x="46" y="36" textAnchor="middle" stroke="none" fill="#1a1c19" fontSize="11" fontFamily="'JetBrains Mono Variable', monospace">
              items[]
            </text>
            <text x="170" y="36" textAnchor="middle" stroke="none" fill="#1a1c19" fontSize="11" fontFamily="'JetBrains Mono Variable', monospace">
              reduce()
            </text>
            <text x="294" y="36" textAnchor="middle" stroke="none" fill="#1a1c19" fontSize="11" fontFamily="'JetBrains Mono Variable', monospace">
              total
            </text>
          </svg>

          <div className="mt-4 flex items-center justify-between border-t border-paper-300 pt-3">
            <span className="font-mono text-[10px] tracking-wider text-print-400 uppercase">
              quality score
            </span>
            <span
              data-demo="scorebadge"
              className="border border-phosphor-600/40 bg-phosphor-600/10 px-2.5 py-0.5 font-display text-sm text-phosphor-600"
            >
              <span data-demo="score">0</span>/100
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HeroDemo
