import { vscDarkPlus, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'

// Two syntax themes, one per surface:
//  - terminalTheme: dark phosphor, for code shown in terminal panels
//  - paperTheme: ink on paper, for code blocks inside rendered documentation
// Hex values mirror the tokens in index.css.

type PrismTheme = { [key: string]: React.CSSProperties }

function override(base: PrismTheme, patches: PrismTheme): PrismTheme {
  const theme: PrismTheme = { ...base }
  for (const [selector, style] of Object.entries(patches)) {
    theme[selector] = { ...(theme[selector] ?? {}), ...style }
  }
  return theme
}

export const terminalTheme: PrismTheme = override(vscDarkPlus as PrismTheme, {
  'pre[class*="language-"]': {
    background: 'transparent',
    margin: 0,
    fontFamily: "'JetBrains Mono Variable', 'JetBrains Mono', monospace",
  },
  'code[class*="language-"]': {
    background: 'transparent',
    fontFamily: "'JetBrains Mono Variable', 'JetBrains Mono', monospace",
  },
  comment: { color: '#5d7268', fontStyle: 'italic' },
  string: { color: '#5eead4' },
  keyword: { color: '#ffb454' },
  function: { color: '#a7f3e4' },
  'function-variable': { color: '#a7f3e4' },
  number: { color: '#a7f3e4' },
  operator: { color: '#8ca69a' },
  punctuation: { color: '#8ca69a' },
})

export const paperTheme: PrismTheme = override(oneLight as PrismTheme, {
  'pre[class*="language-"]': {
    background: 'transparent',
    margin: 0,
    fontFamily: "'JetBrains Mono Variable', 'JetBrains Mono', monospace",
  },
  'code[class*="language-"]': {
    background: 'transparent',
    fontFamily: "'JetBrains Mono Variable', 'JetBrains Mono', monospace",
  },
  comment: { color: '#767c72', fontStyle: 'italic' },
  string: { color: '#0d9488' },
  keyword: { color: '#8a4d0f' },
})
