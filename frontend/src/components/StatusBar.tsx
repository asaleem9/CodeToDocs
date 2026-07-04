import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useBatch } from '../contexts/BatchContext'

// Bottom status line — the most-TUI element in the shell.
function StatusBar() {
  const location = useLocation()
  const { user, isAuthenticated } = useAuth()
  const { isProcessing, progress } = useBatch()

  return (
    <footer className="relative z-10 flex h-7 shrink-0 items-center justify-between border-t border-ink-700 bg-ink-900 px-4 font-display text-[11px] text-ink-400 select-none">
      <span className="flex items-center gap-2">
        {isProcessing ? (
          <>
            <span className="text-amber">▮▮▮</span>
            <span className="text-ink-300">
              processing{progress ? ` ${progress.completed}/${progress.total}` : ''}
            </span>
          </>
        ) : (
          <>
            <span className="text-phosphor-400">●</span>
            <span>ready</span>
          </>
        )}
      </span>
      <span className="hidden md:block">{location.pathname}</span>
      <span>
        {isAuthenticated && user ? (
          <span className="text-ink-300">@{user.login}</span>
        ) : (
          'anonymous'
        )}
      </span>
    </footer>
  )
}

export default StatusBar
