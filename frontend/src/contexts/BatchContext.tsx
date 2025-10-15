import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import axios from 'axios'

interface BatchProgress {
  total: number
  completed: number
  current: string
  percentage: number
  failed: number
}

interface BatchContextType {
  isProcessing: boolean
  batchId: string
  progress: BatchProgress | null
  repoUrl: string
  startBatch: (repoUrl: string, maxFiles: number) => Promise<void>
  cancelBatch: () => Promise<void>
  navigateToBatch: () => void
}

const BatchContext = createContext<BatchContextType | undefined>(undefined)

export function BatchProvider({ children }: { children: ReactNode }) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [batchId, setBatchId] = useState('')
  const [progress, setProgress] = useState<BatchProgress | null>(null)
  const [repoUrl, setRepoUrl] = useState('')
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current)
      }
    }
  }, [])

  const startProgressPolling = (id: string) => {
    progressInterval.current = setInterval(async () => {
      try {
        const progressRes = await axios.get(`/api/batch/progress/${id}`)

        if (progressRes.data.progress) {
          setProgress(progressRes.data.progress)
        }

        if (progressRes.data.completed) {
          setIsProcessing(false)
          if (progressInterval.current) {
            clearInterval(progressInterval.current)
          }
        }

        if (progressRes.data.error) {
          setIsProcessing(false)
          if (progressInterval.current) {
            clearInterval(progressInterval.current)
          }
        }
      } catch (err) {
        console.error('Error polling progress:', err)
      }
    }, 1000)
  }

  const startBatch = async (url: string, maxFiles: number) => {
    try {
      setRepoUrl(url)
      setIsProcessing(true)
      setProgress(null)

      const response = await axios.post('/api/batch/start', {
        repoUrl: url,
        options: {
          maxFiles,
        }
      }, {
        withCredentials: true
      })

      setBatchId(response.data.batchId)
      startProgressPolling(response.data.batchId)
    } catch (error) {
      setIsProcessing(false)
      throw error
    }
  }

  const cancelBatch = async () => {
    if (!batchId) return

    try {
      await axios.delete(`/api/batch/${batchId}`)

      if (progressInterval.current) {
        clearInterval(progressInterval.current)
      }

      setIsProcessing(false)
      setProgress(null)
      setBatchId('')
    } catch (error) {
      throw error
    }
  }

  const navigateToBatch = () => {
    // This will be handled by the component that uses this context
    window.location.href = '/app/batch'
  }

  return (
    <BatchContext.Provider
      value={{
        isProcessing,
        batchId,
        progress,
        repoUrl,
        startBatch,
        cancelBatch,
        navigateToBatch,
      }}
    >
      {children}
    </BatchContext.Provider>
  )
}

export function useBatch() {
  const context = useContext(BatchContext)
  if (context === undefined) {
    throw new Error('useBatch must be used within a BatchProvider')
  }
  return context
}
