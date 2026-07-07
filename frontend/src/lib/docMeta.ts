// Shared helpers for labelling a stored document — used by History and
// anything else that lists generated docs (e.g. the doc-view page).

interface DocTitleSource {
  type?: 'single' | 'batch'
  language: string
  batchInfo?: {
    repoUrl: string
  }
  prInfo?: {
    prNumber: number
    repository: string
  }
}

export function docTitle(doc: DocTitleSource): string {
  if (doc.type === 'batch' && doc.batchInfo) {
    return doc.batchInfo.repoUrl.split('/').slice(-2).join('/')
  }
  if (doc.prInfo) {
    return `PR #${doc.prInfo.prNumber} · ${doc.prInfo.repository.split('/')[1]}`
  }
  return `${doc.language} · manual`
}

export function formatDate(dateString: string): string {
  if (!dateString) return 'Unknown'

  const date = new Date(dateString)

  // Check if date is valid
  if (isNaN(date.getTime())) {
    console.warn('Invalid date:', dateString)
    return 'Invalid date'
  }

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}
