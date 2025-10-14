import { useNavigate, useLocation } from 'react-router-dom'
import { useBatch } from '../contexts/BatchContext'
import './BatchProgressModal.css'

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
    <div className="batch-progress-modal">
      <div className="modal-header">
        <div className="modal-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span>Processing {getRepoName()}</span>
        </div>
        <button className="modal-close" onClick={handleCancel} title="Cancel batch">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      {progress && (
        <div className="modal-content">
          <div className="modal-progress-bar">
            <div
              className="modal-progress-fill"
              style={{ width: `${progress.percentage}%` }}
            ></div>
          </div>

          <div className="modal-stats">
            <span className="modal-stat">
              {progress.completed}/{progress.total} files
            </span>
            <span className="modal-percentage">{progress.percentage}%</span>
          </div>

          <div className="modal-current">
            <span className="modal-current-label">Current:</span>
            <span className="modal-current-text">{progress.current}</span>
          </div>

          {progress.failed > 0 && (
            <div className="modal-failed">
              {progress.failed} file{progress.failed !== 1 ? 's' : ''} failed
            </div>
          )}
        </div>
      )}

      <div className="modal-footer">
        <button className="view-details-btn" onClick={handleViewDetails}>
          View Details
        </button>
      </div>
    </div>
  )
}

export default BatchProgressModal
