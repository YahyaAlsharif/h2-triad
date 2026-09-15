import { useLayoutEffect, useState } from 'react'
export function useTheme() {
  const [theme, setTheme] = useState(
    () => document.documentElement.dataset.theme || 'light',
  )
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('h2-triad-theme', theme)
    } catch {
      /* Storage can be unavailable in private contexts. */
    }
  }, [theme])
  return [
    theme,
    () => setTheme((current) => (current === 'light' ? 'dark' : 'light')),
  ]
}
