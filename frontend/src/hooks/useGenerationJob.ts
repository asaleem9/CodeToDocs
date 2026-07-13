import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { showErrorToast, showSuccessToast } from '../utils/errorHandler'
import type { QualityScoreData } from '../types'

export type JobPhase = 'idle' | 'submitting' | 'running' | 'done' | 'error'

export interface GenerationResult {
  documentation: string
  diagram?: string
  qualityScore?: QualityScoreData
  /** Present when the backend stored the doc (currently the PR flow) — powers the share link. */
  id?: string
  /** Present for PR-doc jobs. */
  prInfo?: {
    prNumber: number
    repository: string
    branch: string
    author: string
  }
}

export interface GenerationError {
  message: string
  errorKind?: string
  retryable?: boolean
}

// Polls the async job endpoints CodeToDocs uses for single-document
// generation: POST an endpoint to get a jobId, then poll progress every
// 500ms until the job completes or errors, then fetch the result.
//
// The internals are the only thing that changes when SSE lands later — the
// phase/progress/statusLog/result/error/retry surface stays the same.
export function useGenerationJob() {
  const [phase, setPhase] = useState<JobPhase>('idle')
  const [progress, setProgress] = useState<number>(0)
  const [statusLog, setStatusLog] = useState<string[]>([])
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [error, setError] = useState<GenerationError | null>(null)

  const pollIntervalRef = useRef<number | null>(null)
  const lastRequestRef = useRef<{ endpoint: string; payload: unknown } | null>(null)

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }

  const fail = (err: any) => {
    stopPolling()
    const data = err?.response?.data
    const message = data?.error || 'Failed to generate documentation'
    setError({ message, errorKind: data?.errorKind, retryable: data?.retryable })
    showErrorToast(err)
    setPhase('error')
    setProgress(0)
  }

  const pollProgress = (jobId: string) => {
    pollIntervalRef.current = window.setInterval(async () => {
      try {
        const progressResponse = await axios.get(`/api/generate/progress/${jobId}`, {
          withCredentials: true,
        })

        setProgress(progressResponse.data.progress.percentage)
        const status = progressResponse.data.progress.status
        if (status) {
          setStatusLog((log) => (log[log.length - 1] === status ? log : [...log, status]))
        }

        // Check if completed
        if (progressResponse.data.completed || progressResponse.data.error) {
          stopPolling()

          if (progressResponse.data.error) {
            setError({
              message: progressResponse.data.error,
              errorKind: progressResponse.data.errorKind,
              retryable: progressResponse.data.retryable,
            })
            showErrorToast({ response: { data: { error: progressResponse.data.error } } })
            setPhase('error')
            setProgress(0)
            return
          }

          // Fetch the result
          const resultResponse = await axios.get(`/api/generate/result/${jobId}`, {
            withCredentials: true,
          })
          setResult({
            documentation: resultResponse.data.documentation,
            diagram: resultResponse.data.diagram,
            qualityScore: resultResponse.data.qualityScore,
            id: resultResponse.data.id,
            prInfo: resultResponse.data.prInfo,
          })
          showSuccessToast('Documentation generated successfully!')
          setPhase('done')
          setProgress(0)
        }
      } catch (err: any) {
        fail(err)
      }
    }, 500) // Poll every 500ms
  }

  const start = useCallback(async (endpoint: string, payload: unknown) => {
    lastRequestRef.current = { endpoint, payload }
    stopPolling()
    setPhase('submitting')
    setError(null)
    setResult(null)
    setProgress(0)
    setStatusLog(['job accepted'])

    try {
      const response = await axios.post(endpoint, payload, { withCredentials: true })
      const jobId = response.data.jobId
      setPhase('running')
      pollProgress(jobId)
    } catch (err: any) {
      fail(err)
    }
  }, [])

  const retry = useCallback(() => {
    if (!lastRequestRef.current) return
    const { endpoint, payload } = lastRequestRef.current
    start(endpoint, payload)
  }, [start])

  const reset = useCallback(() => {
    stopPolling()
    setPhase('idle')
    setProgress(0)
    setStatusLog([])
    setResult(null)
    setError(null)
  }, [])

  // Cleanup on unmount
  useEffect(() => stopPolling, [])

  return { phase, progress, statusLog, result, error, start, retry, reset }
}
