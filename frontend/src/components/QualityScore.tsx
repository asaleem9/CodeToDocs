import './QualityScore.css'

interface QualityScoreBreakdown {
  hasOverview: boolean
  hasParameters: boolean
  hasReturnValues: boolean
  hasExamples: boolean
  hasUsage: boolean
  hasDependencies: boolean
  hasNotes: boolean
  codeBlocksCount: number
}

interface QualityScoreData {
  score: number
  breakdown: QualityScoreBreakdown
}

interface QualityScoreProps {
  qualityScore: QualityScoreData
}

function getQualityLabel(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 75) return 'Good'
  if (score >= 60) return 'Fair'
  if (score >= 40) return 'Basic'
  return 'Poor'
}

function getQualityColor(score: number): string {
  if (score >= 90) return '#10b981' // green
  if (score >= 75) return '#818cf8' // indigo
  if (score >= 60) return '#fbbf24' // yellow
  if (score >= 40) return '#fb923c' // orange
  return '#ef4444' // red
}

function QualityScore({ qualityScore }: QualityScoreProps) {
  const { score, breakdown } = qualityScore
  const label = getQualityLabel(score)
  const color = getQualityColor(score)

  return (
    <div className="quality-score-container">
      <div className="quality-score-header">
        <div className="quality-score-info">
          <span className="quality-score-label">Documentation Quality</span>
          <span className="quality-score-rating" style={{ color }}>
            {label}
          </span>
        </div>
        <div className="quality-score-value" style={{ color }}>
          {score}
        </div>
      </div>

      <div className="quality-score-bar-container">
        <div
          className="quality-score-bar"
          style={{
            width: `${score}%`,
            backgroundColor: color,
          }}
        ></div>
      </div>

      <div className="quality-score-breakdown">
        <div className="breakdown-item">
          <span className={breakdown.hasOverview ? 'check' : 'cross'}>
            {breakdown.hasOverview ? '✓' : '✗'}
          </span>
          <span>Overview/Description</span>
        </div>
        <div className="breakdown-item">
          <span className={breakdown.hasParameters ? 'check' : 'cross'}>
            {breakdown.hasParameters ? '✓' : '✗'}
          </span>
          <span>Parameters/Inputs</span>
        </div>
        <div className="breakdown-item">
          <span className={breakdown.hasReturnValues ? 'check' : 'cross'}>
            {breakdown.hasReturnValues ? '✓' : '✗'}
          </span>
          <span>Return Values</span>
        </div>
        <div className="breakdown-item">
          <span className={breakdown.hasExamples ? 'check' : 'cross'}>
            {breakdown.hasExamples ? '✓' : '✗'}
          </span>
          <span>Examples ({breakdown.codeBlocksCount} code blocks)</span>
        </div>
        <div className="breakdown-item">
          <span className={breakdown.hasDependencies ? 'check' : 'cross'}>
            {breakdown.hasDependencies ? '✓' : '✗'}
          </span>
          <span>Dependencies</span>
        </div>
        <div className="breakdown-item">
          <span className={breakdown.hasNotes ? 'check' : 'cross'}>
            {breakdown.hasNotes ? '✓' : '✗'}
          </span>
          <span>Notes/Best Practices</span>
        </div>
      </div>
    </div>
  )
}

export default QualityScore
