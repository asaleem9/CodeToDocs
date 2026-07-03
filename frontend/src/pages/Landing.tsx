import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import Logo from '../components/Logo'
import './Landing.css'

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('revealed')
          observer.unobserve(el)
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return ref
}

function TypingCode() {
  const code = `function calculateTotal(items) {
  return items.reduce((sum, item) =>
    sum + (item.price * item.qty), 0
  );
}`
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      if (i < code.length) {
        setDisplayed(code.slice(0, i + 1))
        i++
      } else {
        setDone(true)
        clearInterval(interval)
      }
    }, 28)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="code-preview">
      <div className="preview-header">
        <div className="preview-dots">
          <span className="dot red" />
          <span className="dot yellow" />
          <span className="dot green" />
        </div>
        <span className="preview-title">example.ts</span>
      </div>
      <pre className="preview-code">
        {displayed}
        {!done && <span className="typing-cursor">|</span>}
      </pre>
    </div>
  )
}

function AnimatedStat({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const duration = 1200
          const steps = 40
          const increment = value / steps
          let current = 0
          const interval = setInterval(() => {
            current += increment
            if (current >= value) {
              setCount(value)
              clearInterval(interval)
            } else {
              setCount(Math.floor(current))
            }
          }, duration / steps)
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [value])

  return (
    <div className="stat" ref={ref}>
      <span className="stat-value">{count}{suffix}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}

function Landing() {
  const statsRef = useScrollReveal()
  const stepsRef = useScrollReveal()
  const featuresRef = useScrollReveal()
  const ctaRef = useScrollReveal()

  return (
    <div className="landing-page">
      {/* Hero */}
      <section className="hero">
        <div className="hero-glow hero-glow-1" />
        <div className="hero-glow hero-glow-2" />

        <div className="hero-content">
          <Logo size="large" />
          <h1 className="hero-title">
            Code in. <span className="gradient-text">Docs out.</span>
          </h1>
          <p className="hero-description">
            Paste code, get documentation. Instant, scored, visual.
          </p>
          <div className="hero-actions">
            <Link to="/app" className="btn btn-primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              Get Started
            </Link>
            <a href="#how-it-works" className="btn btn-secondary">
              How It Works
            </a>
          </div>
          <div className="mobile-notice">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            Desktop recommended
          </div>
        </div>

        <div className="hero-visual">
          <TypingCode />
          <div className="arrow-indicator">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </div>
          <div className="docs-preview">
            <div className="preview-header">
              <div className="preview-dots">
                <span className="dot red" />
                <span className="dot yellow" />
                <span className="dot green" />
              </div>
              <span className="preview-title">documentation.md</span>
            </div>
            <div className="preview-docs">
              <h3>calculateTotal</h3>
              <p>Computes the total price of items in a cart by summing each item's price multiplied by its quantity.</p>
              <div className="quality-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Quality: 95
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="stats-section" ref={statsRef}>
        <div className="scroll-reveal">
          <AnimatedStat value={180} suffix="x" label="Faster than manual" />
          <div className="stat-divider" />
          <AnimatedStat value={10} suffix="s" label="Per file, average" />
          <div className="stat-divider" />
          <AnimatedStat value={95} suffix="+" label="Quality score" />
        </div>
      </section>

      {/* How It Works */}
      <section className="steps-section" id="how-it-works" ref={stepsRef}>
        <div className="section-container scroll-reveal">
          <h2 className="section-title">Three steps. That's it.</h2>

          <div className="steps-row">
            <div className="step-card">
              <div className="step-number">1</div>
              <div className="step-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
              </div>
              <h3>Paste your code</h3>
              <p>Drop a file or paste a snippet</p>
            </div>

            <div className="step-connector" />

            <div className="step-card">
              <div className="step-number">2</div>
              <div className="step-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              <h3>AI generates docs</h3>
              <p>Comprehensive, scored, with diagrams</p>
            </div>

            <div className="step-connector" />

            <div className="step-card">
              <div className="step-number">3</div>
              <div className="step-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <h3>Export or automate</h3>
              <p>PDF, Markdown, or auto via webhooks</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section" id="features" ref={featuresRef}>
        <div className="section-container scroll-reveal">
          <h2 className="section-title">Built for real workflows</h2>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrap teal">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h3>Batch Processing</h3>
              <p>Document entire repos at once. 50 files concurrently with real-time progress.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrap amber">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                </svg>
              </div>
              <h3>GitHub Webhooks</h3>
              <p>Merge a PR, get docs automatically. Zero manual steps, forever.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrap indigo">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
              </div>
              <h3>Visual Diagrams</h3>
              <p>Auto-generated Mermaid flowcharts for every file. Architecture at a glance.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section" ref={ctaRef}>
        <div className="cta-glow" />
        <div className="cta-content scroll-reveal">
          <h2>Start documenting in seconds</h2>
          <Link to="/app" className="btn btn-primary btn-large">
            Try it now
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-section">
            <Logo size="small" showText={true} />
          </div>
          <div className="footer-links">
            <Link to="/app">App</Link>
            <a href="#how-it-works">How It Works</a>
            <a href="#features">Features</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2025 CodeToDocs</p>
        </div>
      </footer>
    </div>
  )
}

export default Landing
