import { useEffect, useRef } from 'react'
import { countUp } from '../lib/motion'
import type { QualityScoreData } from '../types'

interface QualityScoreProps {
  qualityScore: QualityScoreData
}

function scoreTone(score: number) {
  if (score >= 75) return { text: 'text-phosphor-300', bar: 'bg-phosphor-500', label: 'pass' }
  if (score >= 60) return { text: 'text-amber', bar: 'bg-amber', label: 'warn' }
  return { text: 'text-red', bar: 'bg-red', label: 'fail' }
}

function verdict(score: number): string {
  if (score >= 90) return 'excellent'
  if (score >= 75) return 'good'
  if (score >= 60) return 'fair'
  if (score >= 40) return 'basic'
  return 'poor'
}

function Check({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2 font-mono text-[12.5px]">
      <span
        className={`w-9 shrink-0 font-semibold tracking-wide ${ok ? 'text-green' : 'text-red'}`}
      >
        {ok ? 'PASS' : 'FAIL'}
      </span>
      <span className="text-ink-300">{children}</span>
    </div>
  )
}

// Documentation quality as test-runner output: PASS/FAIL rows, a segmented
// bar, and a dot-matrix score that counts up.
function QualityScore({ qualityScore }: QualityScoreProps) {
  const { score, breakdown } = qualityScore
  const tone = scoreTone(score)
  const scoreRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (scoreRef.current) {
      countUp(scoreRef.current, score, { duration: 0.9, scrollTrigger: false })
    }
  }, [score])

  return (
    <div className="border border-ink-700 bg-ink-900">
      <div className="flex items-center justify-between border-b border-ink-700 px-4 py-2">
        <span className="font-display text-[11px] tracking-[0.12em] text-ink-300">
          [ QUALITY REPORT ]
        </span>
        <span className="font-mono text-[11px] text-ink-400">
          verdict: <span className={tone.text}>{verdict(score)}</span>
        </span>
      </div>

      <div className="grid gap-x-8 gap-y-1.5 px-4 py-3 sm:grid-cols-2">
        <Check ok={breakdown.hasOverview}>overview / description</Check>
        <Check ok={breakdown.hasParameters}>parameters / inputs</Check>
        <Check ok={breakdown.hasReturnValues}>return values</Check>
        <Check ok={breakdown.hasExamples}>
          examples ({breakdown.codeBlocksCount} code {breakdown.codeBlocksCount === 1 ? 'block' : 'blocks'})
        </Check>
        <Check ok={breakdown.hasDependencies}>dependencies</Check>
        <Check ok={breakdown.hasNotes}>notes / best practices</Check>
      </div>

      <div className="flex items-center gap-4 border-t border-ink-700 px-4 py-3">
        <div className="relative h-2.5 flex-1 overflow-hidden border border-ink-700 bg-ink-850">
          <div className={`h-full ${tone.bar}`} style={{ width: `${score}%` }} />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                'repeating-linear-gradient(90deg, transparent 0 6px, var(--color-ink-900) 6px 8px)',
            }}
          />
        </div>
        <span className={`font-display text-2xl tabular-nums ${tone.text}`}>
          <span ref={scoreRef}>{score}</span>
          <span className="text-ink-400">/100</span>
        </span>
      </div>
    </div>
  )
}

export default QualityScore
