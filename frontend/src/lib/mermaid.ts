import mermaid from 'mermaid'

// One mermaid setup for the whole app (was initialized separately in Home,
// History, and Batch with identical dark configs). Diagrams render inside the
// paper docs surface, so the theme is ink-on-paper. Hex values mirror the
// paper/print tokens in index.css — mermaid can't read CSS variables at init.
mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    background: '#f2ecdf',
    primaryColor: '#e7dfcc',
    primaryTextColor: '#1a1c19',
    primaryBorderColor: '#a89a76',
    lineColor: '#494f49',
    secondaryColor: '#f8f4ea',
    secondaryBorderColor: '#d5c9ae',
    secondaryTextColor: '#1a1c19',
    tertiaryColor: '#f8f4ea',
    tertiaryBorderColor: '#d5c9ae',
    tertiaryTextColor: '#494f49',
    noteBkgColor: '#f8f4ea',
    noteBorderColor: '#a89a76',
    noteTextColor: '#1a1c19',
    fontFamily: "'JetBrains Mono Variable', 'JetBrains Mono', monospace",
    fontSize: '14px',
  },
})

function stripFences(diagram: string): string {
  let clean = diagram.trim()
  if (clean.startsWith('```mermaid')) {
    clean = clean.replace(/^```mermaid\n/, '').replace(/\n```$/, '')
  } else if (clean.startsWith('```')) {
    clean = clean.replace(/^```\n/, '').replace(/\n```$/, '')
  }
  return clean
}

let renderSeq = 0

/**
 * Render a mermaid diagram into `el`. Handles code-fence stripping and
 * failure display. Error text is set via textContent, never innerHTML —
 * the diagram source comes from generated content and can't be trusted.
 */
export async function renderMermaid(el: HTMLElement, diagram: string): Promise<boolean> {
  try {
    el.innerHTML = ''
    const { svg } = await mermaid.render(`mermaid-diagram-${++renderSeq}`, stripFences(diagram))
    el.innerHTML = svg
    return true
  } catch (error: any) {
    console.error('Error rendering diagram:', error)
    el.innerHTML = ''
    const wrap = document.createElement('div')
    wrap.className = 'mermaid-error'
    const title = document.createElement('p')
    title.textContent = 'Error rendering diagram'
    title.style.fontWeight = '600'
    const detail = document.createElement('p')
    detail.textContent = error?.message || 'Invalid diagram syntax'
    detail.style.fontSize = '0.875rem'
    wrap.style.color = 'var(--color-red)'
    wrap.style.padding = '1rem'
    wrap.append(title, detail)
    el.appendChild(wrap)
    return false
  }
}
