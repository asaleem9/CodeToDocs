import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap, useGSAP, decode, countUp, revealBatch, prefersReducedMotion } from '../lib/motion'
import HeroDemo from '../components/HeroDemo'
import Logo from '../components/Logo'
import ScreenFX from '../components/ScreenFX'
import Panel from '../components/ui/Panel'
import { buttonClasses } from '../components/ui/Button'

const STATS = [
  { value: 180, suffix: 'x', label: 'faster than manual' },
  { value: 10, suffix: 's', label: 'per file, average' },
  { value: 95, suffix: '+', label: 'quality score' },
]

const STEPS = [
  {
    n: '01',
    cmd: 'paste',
    body: 'Drop in a file, a snippet, or a whole repository.',
  },
  {
    n: '02',
    cmd: 'generate',
    body: 'The engine reads the code, writes the manual, and scores its own work.',
  },
  {
    n: '03',
    cmd: 'ship',
    body: 'Export Markdown, HTML, or PDF — or wire a webhook and never think about it.',
  },
]

const FEATURES = [
  {
    glyph: '[≡≡≡]',
    title: 'Batch processing',
    body: 'Document entire repositories at once — fifty files in flight with live, per-file progress.',
  },
  {
    glyph: '⎇',
    title: 'GitHub webhooks',
    body: 'Merge a pull request, get updated docs. Zero manual steps, forever.',
  },
  {
    glyph: '◇─◇',
    title: 'Diagrams included',
    body: 'A Mermaid flowchart for every file. The architecture, at a glance, on the page.',
  },
]

function Landing() {
  const scope = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const q = gsap.utils.selector(scope)

      // hero copy boot-in
      const heroBits = q('[data-hero]')
      if (prefersReducedMotion()) {
        gsap.set(heroBits, { opacity: 1, y: 0 })
      } else {
        gsap.fromTo(
          heroBits,
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.1, delay: 0.15 }
        )
      }

      // headline decode
      const l1 = q('[data-decode-1]')[0]
      const l2 = q('[data-decode-2]')[0]
      if (l1) decode(l1, 'Code in.', { delay: 0.3 })
      if (l2) decode(l2, 'Docs out.', { delay: 0.75 })

      // stat count-ups fire on scroll
      q('[data-stat]').forEach((el) => {
        const v = Number(el.getAttribute('data-stat'))
        const suffix = el.getAttribute('data-suffix') ?? ''
        countUp(el, v, { suffix })
      })

      // section reveals
      revealBatch(q('[data-reveal]'))

      // step connector draws in
      const wires = q('[data-wire]')
      if (!prefersReducedMotion() && wires.length) {
        gsap.fromTo(
          wires,
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 0.8,
            ease: 'power2.inOut',
            transformOrigin: 'left center',
            scrollTrigger: { trigger: wires[0], start: 'top 85%', once: true },
          }
        )
      }
    },
    { scope }
  )

  return (
    <div ref={scope} className="min-h-screen bg-ink-950 text-ink-100">
      {/* top strip */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo size="medium" />
        <nav className="flex items-center gap-6 font-mono text-[13px]">
          <a href="#how" className="hidden text-ink-400 transition-colors hover:text-ink-100 sm:block">
            how it works
          </a>
          <a href="#features" className="hidden text-ink-400 transition-colors hover:text-ink-100 sm:block">
            features
          </a>
          <Link to="/app" className={buttonClasses('primary', 'sm')}>
            open app →
          </Link>
        </nav>
      </header>

      {/* hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(45,212,191,0.13) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            maskImage: 'radial-gradient(ellipse 75% 65% at 50% 35%, black 30%, transparent 75%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 75% 65% at 50% 35%, black 30%, transparent 75%)',
          }}
        />
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-14 px-6 pt-14 pb-24 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pt-24">
          <div>
            <p data-hero className="font-mono text-[13px] text-ink-400" style={{ opacity: 0 }}>
              <span className="text-phosphor-400">//</span> documentation, compiled
            </p>
            <h1 className="mt-5 font-display text-5xl leading-[1.08] tracking-tight sm:text-6xl xl:text-7xl">
              <span data-decode-1 className="block min-h-[1.08em]" />
              <span data-decode-2 className="block min-h-[1.08em] text-phosphor-300 glow-text-strong" />
            </h1>
            <p
              data-hero
              className="mt-6 max-w-md font-sans text-[17px] leading-relaxed text-ink-300"
              style={{ opacity: 0 }}
            >
              Paste a file or point at a repository. CodeToDocs reads the code, writes the manual,
              scores the result, and draws the diagrams.
            </p>
            <div data-hero className="mt-8 flex flex-wrap items-center gap-3" style={{ opacity: 0 }}>
              <Link to="/app" className={buttonClasses('primary', 'md')}>
                $ get started
              </Link>
              <a href="#how" className={buttonClasses('ghost', 'md')}>
                how it works
              </a>
            </div>
            <p
              data-hero
              className="mt-6 font-mono text-[12px] text-ink-400 lg:hidden"
              style={{ opacity: 0 }}
            >
              ⌁ best experienced on a desktop
            </p>
          </div>

          <div data-hero style={{ opacity: 0 }}>
            <HeroDemo />
          </div>
        </div>
      </section>

      {/* stats band */}
      <section className="relative z-10 border-y border-ink-700 bg-ink-900">
        <div className="mx-auto flex max-w-5xl flex-col items-stretch justify-between gap-8 px-6 py-12 sm:flex-row sm:items-center">
          {STATS.map((s, i) => (
            <div key={s.label} className="flex items-center gap-8">
              {i > 0 && (
                <span aria-hidden className="hidden font-display text-2xl text-ink-700 sm:block">
                  │
                </span>
              )}
              <div>
                <div
                  data-stat={s.value}
                  data-suffix={s.suffix}
                  className="font-display text-5xl text-phosphor-300 glow-text tabular-nums"
                >
                  0{s.suffix}
                </div>
                <div className="mt-2 font-mono text-[11px] tracking-[0.18em] text-ink-400 uppercase">
                  {s.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="relative z-10 mx-auto max-w-6xl px-6 py-24">
        <div data-reveal>
          <p className="font-mono text-[13px] text-ink-400">
            <span className="text-phosphor-400">##</span> how it works
          </p>
          <h2 className="mt-3 font-display text-3xl tracking-tight sm:text-4xl">
            Three commands. That's the manual.
          </h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3 md:gap-0">
          {STEPS.map((step, i) => (
            <div key={step.cmd} className="flex items-stretch" data-reveal>
              {i > 0 && (
                <div className="relative hidden w-10 shrink-0 md:block">
                  <span
                    data-wire
                    className="absolute top-1/2 right-1 left-1 h-px bg-phosphor-600/60"
                  />
                </div>
              )}
              <Panel className="flex-1" tabBg="bg-ink-950">
                <div className="p-6">
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-[13px] text-phosphor-300">
                      <span className="text-phosphor-500">$</span> {step.cmd}
                    </span>
                    <span className="font-display text-2xl text-ink-700 select-none">{step.n}</span>
                  </div>
                  <p className="mt-4 font-sans text-[14.5px] leading-relaxed text-ink-300">
                    {step.body}
                  </p>
                </div>
              </Panel>
            </div>
          ))}
        </div>
      </section>

      {/* features */}
      <section id="features" className="relative z-10 border-t border-ink-700 bg-ink-900/50">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div data-reveal>
            <p className="font-mono text-[13px] text-ink-400">
              <span className="text-phosphor-400">##</span> built in
            </p>
            <h2 className="mt-3 font-display text-3xl tracking-tight sm:text-4xl">
              For repositories, not snippets.
            </h2>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} data-reveal>
                <Panel tabBg="bg-ink-950" className="h-full">
                  <div className="p-6">
                    <div className="font-display text-xl text-phosphor-400 glow-text select-none">
                      {f.glyph}
                    </div>
                    <h3 className="mt-4 font-mono text-[15px] font-semibold text-ink-100">
                      {f.title}
                    </h3>
                    <p className="mt-2 font-sans text-[14px] leading-relaxed text-ink-300">
                      {f.body}
                    </p>
                  </div>
                </Panel>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 border-t border-ink-700">
        <div className="mx-auto max-w-6xl px-6 py-24 text-center" data-reveal>
          <p className="font-mono text-[13px] text-ink-400">ready when you are</p>
          <Link
            to="/app"
            className="group mt-6 inline-block font-display text-3xl text-ink-100 transition-colors hover:text-phosphor-300 sm:text-5xl"
          >
            <span className="text-phosphor-400 transition-[text-shadow] group-hover:glow-text-strong">
              $
            </span>{' '}
            get started
            <span aria-hidden className="animate-caret-blink ml-2 text-phosphor-400">
              ▮
            </span>
          </Link>
          <p className="mt-6 font-sans text-[14px] text-ink-400">
            No account needed. Paste code, read the manual.
          </p>
        </div>
      </section>

      {/* footer */}
      <footer className="relative z-10 border-t border-ink-700 bg-ink-900">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-6 sm:flex-row">
          <Logo size="small" />
          <nav className="flex gap-6 font-mono text-[12px] text-ink-400">
            <Link to="/app" className="transition-colors hover:text-ink-100">
              app
            </Link>
            <a href="#how" className="transition-colors hover:text-ink-100">
              how it works
            </a>
            <a href="#features" className="transition-colors hover:text-ink-100">
              features
            </a>
          </nav>
          <p className="font-mono text-[12px] text-ink-400">© 2026 CodeToDocs</p>
        </div>
      </footer>

      <ScreenFX />
    </div>
  )
}

export default Landing
