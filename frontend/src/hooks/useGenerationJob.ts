import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import config from '../config'
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

// Only the single-doc endpoint fans out live SSE events (see A7) — every
// other endpoint (the PR flow) polls exactly as it always has.
const STREAMABLE_ENDPOINT = '/api/generate'
// Window for the very first frame after opening the connection — nothing
// has proven the stream works yet, so fail fast.
const STREAM_FALLBACK_INITIAL_MS = 4000
// Window used to rearm after any proof of life (a real event or a heartbeat
// comment). Must clear the backend's 15s heartbeat interval comfortably, or
// a healthy stream sitting quiet between deltas would false-trip to polling.
const STREAM_FALLBACK_LIVE_MS = 20000
const DELTA_FLUSH_MS = 80

// The SSE connection is a bare fetch(), not axios, so it needs its own copy
// of the identity the axios interceptor (main.tsx) attaches automatically.
function authHeader(): Record<string, string> {
  const token = localStorage.getItem('app_token') || localStorage.getItem('anon_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// A mid-stream chunk can land inside an unclosed ``` fence — close it for the
// renderer's copy without touching the accumulated source text, or ReactMarkdown
// swallows everything after it as one giant code block.
function closeDanglingFence(text: string): string {
  const fenceCount = (text.match(/```/g) || []).length
  return fenceCount % 2 === 1 ? `${text}\n\`\`\`` : text
}

// Runs a generation job to completion. Single-doc jobs (`/api/generate`) open
// an SSE stream for live token-by-token text and fall back — seamlessly, no
// visible error — to the existing 500ms polling if the stream can't be
// trusted: blocked entirely, a non-A7 backend (404), or one that opens but
// never actually delivers events. Every other job polls unchanged.
//
// Polling itself, and the phase/progress/statusLog/result/error/retry
// surface, are untouched by any of this — `streamText` is the only addition.
export function useGenerationJob() {
  const [phase, setPhase] = useState<JobPhase>('idle')
  const [progress, setProgress] = useState<number>(0)
  const [statusLog, setStatusLog] = useState<string[]>([])
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [error, setError] = useState<GenerationError | null>(null)
  const [streamText, setStreamText] = useState<string>('')

  const pollIntervalRef = useRef<number | null>(null)
  const lastRequestRef = useRef<{ endpoint: string; payload: unknown } | null>(null)

  const streamAbortRef = useRef<AbortController | null>(null)
  const streamActiveRef = useRef<boolean>(false)
  const streamFallbackTimerRef = useRef<number | null>(null)
  const streamTextRef = useRef<string>('')
  const streamFlushTimerRef = useRef<number | null>(null)

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }

  const clearStreamFallback = () => {
    if (streamFallbackTimerRef.current) {
      clearTimeout(streamFallbackTimerRef.current)
      streamFallbackTimerRef.current = null
    }
  }

  // Tears down the SSE side — abort the connection, drop its timers. Safe to
  // call whether or not a stream is actually open.
  const closeStream = () => {
    streamActiveRef.current = false
    clearStreamFallback()
    if (streamFlushTimerRef.current) {
      clearTimeout(streamFlushTimerRef.current)
      streamFlushTimerRef.current = null
    }
    if (streamAbortRef.current) {
      streamAbortRef.current.abort()
      streamAbortRef.current = null
    }
  }

  const fail = (err: any) => {
    stopPolling()
    closeStream()
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

  // The only way a stream ever hands off to polling — a transport error, a
  // non-OK status (no A7 backend), or the quiet-stream timer below. Guarded
  // by streamActiveRef so a stream that already finished, or already fell
  // back once, can't trigger this a second time.
  const fallbackToPolling = (jobId: string) => {
    if (!streamActiveRef.current) return
    closeStream()
    pollProgress(jobId)
  }

  const armStreamFallback = (jobId: string, ms: number) => {
    clearStreamFallback()
    streamFallbackTimerRef.current = window.setTimeout(() => fallbackToPolling(jobId), ms)
  }

  // Buffers deltas in a ref and flushes to React state at most every 80ms, so
  // ReactMarkdown re-parses the growing document at ~12fps instead of once
  // per token.
  const scheduleStreamFlush = () => {
    if (streamFlushTimerRef.current) return
    streamFlushTimerRef.current = window.setTimeout(() => {
      streamFlushTimerRef.current = null
      setStreamText(closeDanglingFence(streamTextRef.current))
    }, DELTA_FLUSH_MS)
  }

  // Applies one `event:`/`data:` SSE frame to hook state. Returns false for
  // frames with nothing to apply (heartbeat `: ping` comments, malformed
  // JSON) so the caller can skip the rest of its post-frame bookkeeping.
  const handleStreamFrame = (frame: string, jobId: string): boolean => {
    if (!frame.trim()) return false
    if (frame.startsWith(':')) {
      // A bare SSE comment — the backend's heartbeat. No application event to
      // apply, but it's still proof the connection is alive, so it needs to
      // keep the fallback timer from firing during a quiet stretch between
      // deltas exactly like a real event would.
      armStreamFallback(jobId, STREAM_FALLBACK_LIVE_MS)
      return false
    }

    let event = 'message'
    const dataLines: string[] = []
    for (const line of frame.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim()
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
    }
    if (dataLines.length === 0) return false

    let payload: any
    try {
      payload = JSON.parse(dataLines.join('\n'))
    } catch {
      return false
    }

    switch (event) {
      case 'snapshot':
        streamTextRef.current = payload.text || ''
        scheduleStreamFlush()
        if (payload.progress) {
          setProgress(payload.progress.percentage)
          const status = payload.progress.status
          if (status) setStatusLog((log) => (log[log.length - 1] === status ? log : [...log, status]))
        }
        // A reconnect to an already-finished job gets `done`/`error` set
        // right on the snapshot, with the backend writing the real done/error
        // frame immediately behind it on the same connection (see A7) — rearm
        // short rather than sitting on the long live-stream window for a
        // frame that's either about to land or, if something's actually
        // wrong, never will. Otherwise this is proof the connection is open
        // and talking, same as any other frame — rearm long enough to clear
        // the heartbeat interval.
        armStreamFallback(
          jobId,
          payload.done || payload.error ? STREAM_FALLBACK_INITIAL_MS : STREAM_FALLBACK_LIVE_MS
        )
        break

      case 'delta':
        streamTextRef.current += payload.text || ''
        scheduleStreamFlush()
        armStreamFallback(jobId, STREAM_FALLBACK_LIVE_MS) // a real delta proves the stream is live
        break

      case 'progress':
        setProgress(payload.percentage)
        if (payload.status) {
          setStatusLog((log) => (log[log.length - 1] === payload.status ? log : [...log, payload.status]))
        }
        armStreamFallback(jobId, STREAM_FALLBACK_LIVE_MS)
        break

      case 'done':
        closeStream()
        setResult({
          documentation: payload.result?.documentation,
          diagram: payload.result?.diagram,
          qualityScore: payload.result?.qualityScore,
          id: payload.result?.id,
          prInfo: payload.result?.prInfo,
        })
        showSuccessToast('Documentation generated successfully!')
        setPhase('done')
        setProgress(0)
        break

      case 'error':
        closeStream()
        setError({ message: payload.error, errorKind: payload.errorKind, retryable: payload.retryable })
        showErrorToast({ response: { data: { error: payload.error } } })
        setPhase('error')
        setProgress(0)
        break
    }

    return true
  }

  const openStream = (jobId: string) => {
    const controller = new AbortController()
    streamAbortRef.current = controller
    streamActiveRef.current = true
    streamTextRef.current = ''
    setStreamText('')

    armStreamFallback(jobId, STREAM_FALLBACK_INITIAL_MS)

    fetch(`${config.apiUrl}/api/generate/stream/${jobId}`, {
      headers: { Accept: 'text/event-stream', ...authHeader() },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok || !response.body) {
          fallbackToPolling(jobId)
          return
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (streamActiveRef.current) {
          const { value, done } = await reader.read()
          if (done) {
            // The connection closed cleanly (e.g. the backend went away)
            // without ever sending a done/error frame — streamActiveRef is
            // still true, so this isn't a resolved job, just a dead
            // connection. fallbackToPolling() is the guarded, idempotent
            // handoff either way (a no-op if the job already resolved a
            // moment earlier and closeStream() already flipped the ref).
            fallbackToPolling(jobId)
            return
          }
          buffer += decoder.decode(value, { stream: true })
          const frames = buffer.split('\n\n')
          buffer = frames.pop() || ''

          for (const frame of frames) {
            if (!handleStreamFrame(frame, jobId)) continue
            // done/error close the stream mid-loop — stop reading rather
            // than let the next read() race an already-aborted controller.
            if (!streamActiveRef.current) return
          }
        }
      })
      .catch(() => {
        // Covers a real transport failure and the AbortError from our own
        // closeStream() alike — fallbackToPolling() is a no-op once
        // streamActiveRef is already false, so this never double-fires.
        fallbackToPolling(jobId)
      })
  }

  const start = useCallback(async (endpoint: string, payload: unknown) => {
    lastRequestRef.current = { endpoint, payload }
    stopPolling()
    closeStream()
    setPhase('submitting')
    setError(null)
    setResult(null)
    setProgress(0)
    setStatusLog(['job accepted'])
    setStreamText('')

    try {
      const response = await axios.post(endpoint, payload, { withCredentials: true })
      const jobId = response.data.jobId
      setPhase('running')
      if (endpoint === STREAMABLE_ENDPOINT) {
        openStream(jobId)
      } else {
        pollProgress(jobId)
      }
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
    closeStream()
    setPhase('idle')
    setProgress(0)
    setStatusLog([])
    setResult(null)
    setError(null)
    setStreamText('')
  }, [])

  // Cleanup on unmount
  useEffect(
    () => () => {
      stopPolling()
      closeStream()
    },
    []
  )

  return { phase, progress, statusLog, result, error, streamText, start, retry, reset }
}
