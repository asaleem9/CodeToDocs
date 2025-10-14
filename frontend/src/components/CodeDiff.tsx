import { useMemo } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import './CodeDiff.css'

interface CodeDiffProps {
  oldCode: string
  newCode: string
  language?: string
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged'
  content: string
  lineNumber: number
}

function CodeDiff({ oldCode, newCode, language = 'javascript' }: CodeDiffProps) {
  const diffLines = useMemo(() => {
    const oldLines = oldCode.split('\n')
    const newLines = newCode.split('\n')
    const result: DiffLine[] = []

    // Simple line-by-line diff
    const maxLength = Math.max(oldLines.length, newLines.length)

    for (let i = 0; i < maxLength; i++) {
      const oldLine = oldLines[i]
      const newLine = newLines[i]

      if (oldLine === newLine) {
        result.push({
          type: 'unchanged',
          content: newLine || '',
          lineNumber: i + 1,
        })
      } else {
        if (oldLine !== undefined && !newLines.includes(oldLine)) {
          result.push({
            type: 'removed',
            content: oldLine,
            lineNumber: i + 1,
          })
        }
        if (newLine !== undefined && !oldLines.includes(newLine)) {
          result.push({
            type: 'added',
            content: newLine,
            lineNumber: i + 1,
          })
        }
      }
    }

    return result
  }, [oldCode, newCode])

  return (
    <div className="code-diff">
      <div className="diff-header">
        <div className="diff-stats">
          <span className="additions">
            +{diffLines.filter((l) => l.type === 'added').length}
          </span>
          <span className="deletions">
            -{diffLines.filter((l) => l.type === 'removed').length}
          </span>
        </div>
      </div>

      <div className="diff-content">
        {diffLines.map((line, index) => (
          <div
            key={index}
            className={`diff-line diff-line-${line.type}`}
          >
            <span className="line-number">{line.lineNumber}</span>
            <span className="line-indicator">
              {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
            </span>
            <SyntaxHighlighter
              language={language}
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                padding: 0,
                background: 'transparent',
                fontSize: '0.875rem',
              }}
              PreTag="span"
            >
              {line.content || ' '}
            </SyntaxHighlighter>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CodeDiff
