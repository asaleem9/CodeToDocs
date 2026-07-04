import { useNavigate, useLocation } from 'react-router-dom'
import { useBatch } from '../contexts/BatchContext'
import Panel from './ui/Panel'
import Button from './ui/Button'
import ProgressBar from './ui/ProgressBar'

function BatchProgressModal() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isProcessing, progress, repoUrl, cancelBatch } = useBatch()

  // Don't show modal on batch page or if not processing
  if (!isProcessing || location.pathname === '/app/batch') {
    return null
  }

  const handleViewDetails = () => {
    navigate('/app/batch')
  }

  const handleCancel = async () => {
    try {
      await cancelBatch()
    } catch (error) {
      console.error('Error canceling batch:', error)
    }
  }

  const getRepoName = () => {
    if (!repoUrl) return 'Repository'
    const parts = repoUrl.split('/')
    return parts[parts.length - 1] || 'Repository'
  }

  return (
    <div className="fixed right-6 bottom-10 z-50 w-[340px] max-w-[calc(100vw-3rem)]">
      <Panel title="JOB" active className="shadow-[0_16px_40px_rgba(0,0,0,0.55)]">
        <div className="flex flex-col gap-3 p-4 pt-5">
          <p className="truncate font-mono text-[13px] text-ink-100">
            processing <span className="text-phosphor-300">{getRepoName()}</span>
          </p>

          {progress && (
            <>
              <ProgressBar value={progress.percentage} />

              <div className="flex items-baseline justify-between font-mono text-[11px] text-ink-400">
                <span>
                  {progress.completed}/{progress.total} files
                </span>
                {progress.failed > 0 && (
                  <span className="text-red">
                    {progress.failed} file{progress.failed !== 1 ? 's' : ''} failed
                  </span>
                )}
              </div>

              <p className="truncate font-mono text-[12px] text-ink-400">
                <span className="text-ink-300">current:</span> {progress.current}
              </p>
            </>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-ink-700 pt-3">
            <Button size="sm" variant="ghost" onClick={handleViewDetails}>
              view details
            </Button>
            <Button size="sm" variant="danger" onClick={handleCancel}>
              cancel
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  )
}

export default BatchProgressModal
