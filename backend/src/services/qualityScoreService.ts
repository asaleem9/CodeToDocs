export interface QualityScore {
  score: number; // 0-100
  breakdown: {
    hasOverview: boolean;
    hasParameters: boolean;
    hasReturnValues: boolean;
    hasExamples: boolean;
    hasUsage: boolean;
    hasDependencies: boolean;
    hasNotes: boolean;
    codeBlocksCount: number;
  };
}

/**
 * Analyzes documentation quality and returns a score from 0 to 100
 * @param documentation - The markdown documentation to analyze
 * @returns QualityScore object with score and breakdown
 */
export function calculateQualityScore(documentation: string): QualityScore {
  const breakdown = {
    hasOverview: false,
    hasParameters: false,
    hasReturnValues: false,
    hasExamples: false,
    hasUsage: false,
    hasDependencies: false,
    hasNotes: false,
    codeBlocksCount: 0,
  };

  const lowerDoc = documentation.toLowerCase();

  // Check for overview/description (weighted: 15 points)
  breakdown.hasOverview =
    lowerDoc.includes('overview') ||
    lowerDoc.includes('description') ||
    lowerDoc.includes('## ') ||
    documentation.length > 100;

  // Check for parameters/inputs (weighted: 20 points)
  breakdown.hasParameters =
    lowerDoc.includes('parameter') ||
    lowerDoc.includes('input') ||
    lowerDoc.includes('argument') ||
    lowerDoc.includes('prop');

  // Check for return values/outputs (weighted: 20 points)
  breakdown.hasReturnValues =
    lowerDoc.includes('return') ||
    lowerDoc.includes('output') ||
    lowerDoc.includes('response');

  // Check for examples (weighted: 25 points)
  breakdown.hasExamples =
    lowerDoc.includes('example') ||
    lowerDoc.includes('usage') ||
    lowerDoc.includes('how to use');

  // Count code blocks (part of examples weight)
  const codeBlockMatches = documentation.match(/```[\s\S]*?```/g);
  breakdown.codeBlocksCount = codeBlockMatches ? codeBlockMatches.length : 0;
  breakdown.hasUsage = breakdown.codeBlocksCount > 0;

  // Check for dependencies (weighted: 10 points)
  breakdown.hasDependencies =
    lowerDoc.includes('dependencies') ||
    lowerDoc.includes('requirements') ||
    lowerDoc.includes('import') ||
    lowerDoc.includes('require');

  // Check for notes/considerations (weighted: 10 points)
  breakdown.hasNotes =
    lowerDoc.includes('note') ||
    lowerDoc.includes('important') ||
    lowerDoc.includes('warning') ||
    lowerDoc.includes('consideration') ||
    lowerDoc.includes('edge case') ||
    lowerDoc.includes('best practice');

  // Calculate score with weighted components
  let score = 0;

  // Overview (15 points)
  if (breakdown.hasOverview) score += 15;

  // Parameters (20 points)
  if (breakdown.hasParameters) score += 20;

  // Return values (20 points)
  if (breakdown.hasReturnValues) score += 20;

  // Examples (25 points)
  if (breakdown.hasExamples) score += 15;
  if (breakdown.hasUsage && breakdown.codeBlocksCount > 0) {
    // Additional points for code blocks (up to 10 points)
    score += Math.min(10, breakdown.codeBlocksCount * 5);
  }

  // Dependencies (10 points)
  if (breakdown.hasDependencies) score += 10;

  // Notes (10 points)
  if (breakdown.hasNotes) score += 10;

  // Ensure score is within 0-100 range
  score = Math.min(100, Math.max(0, score));

  return {
    score,
    breakdown,
  };
}

/**
 * Get a quality rating label based on score
 */
export function getQualityLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Fair';
  if (score >= 40) return 'Basic';
  return 'Poor';
}

/**
 * Get color for quality score
 */
export function getQualityColor(score: number): string {
  if (score >= 90) return '#10b981'; // green
  if (score >= 75) return '#818cf8'; // indigo
  if (score >= 60) return '#fbbf24'; // yellow
  if (score >= 40) return '#fb923c'; // orange
  return '#ef4444'; // red
}
