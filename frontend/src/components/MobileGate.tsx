import Logo from './Logo'
import './MobileGate.css'

function MobileGate() {
  return (
    <div className="mobile-gate">
      <div className="mobile-gate-card">
        <div className="mobile-gate-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        </div>
        <h1>Desktop Only</h1>
        <p>
          CodeToDocs requires a desktop browser for the code editor, split-view panels, and batch processing tools.
        </p>
        <Logo size="small" showText={true} />
      </div>
    </div>
  )
}

export default MobileGate
