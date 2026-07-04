// Single source for language chip/dot colors (GitHub-linguist palette).
// Previously duplicated with diverging values in History.tsx and GitHub.tsx.

const LANGUAGE_COLORS: Record<string, string> = {
  javascript: '#f1e05a',
  typescript: '#3178c6',
  jsx: '#61dafb',
  tsx: '#3178c6',
  python: '#3572a5',
  java: '#b07219',
  go: '#00add8',
  rust: '#dea584',
  ruby: '#701516',
  php: '#4f5d95',
  'c++': '#f34b7d',
  c: '#555555',
  'c#': '#178600',
  swift: '#ffac45',
  kotlin: '#a97bff',
  scala: '#c22d40',
  html: '#e34c26',
  css: '#563d7c',
  shell: '#89e051',
  vue: '#41b883',
  dart: '#00b4ab',
  elixir: '#6e4a7e',
  haskell: '#5e5086',
  lua: '#000080',
  r: '#198ce7',
}

export function getLanguageColor(language: string | null | undefined): string {
  if (!language) return '#5d7268'
  return LANGUAGE_COLORS[language.toLowerCase()] ?? '#5d7268'
}
