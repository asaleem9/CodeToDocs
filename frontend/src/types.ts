// Shared frontend types used across pages, hooks, and components.

export interface QualityScoreBreakdown {
  hasOverview: boolean
  hasParameters: boolean
  hasReturnValues: boolean
  hasExamples: boolean
  hasUsage: boolean
  hasDependencies: boolean
  hasNotes: boolean
  codeBlocksCount: number
}

export interface QualityScoreData {
  score: number
  breakdown: QualityScoreBreakdown
}
