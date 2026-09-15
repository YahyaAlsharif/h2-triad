import { useEffect, useState } from 'react'
import { getHealth } from '../data/dashboardService'
export default function Header({ theme, toggleTheme }) {
  const [health, setHealth] = useState('checking')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    let mounted = true
    getHealth({ signal: controller.signal })
      .then(() => {
        if (mounted) setHealth('connected')
      })
      .catch(() => {
        if (mounted) setHealth('offline')
      })
      .finally(() => clearTimeout(timeout))
    return () => {
      mounted = false
      clearTimeout(timeout)
      controller.abort()
    }
  }, [attempt])
  return (
    <header className="site-header">
      <div className="header-inner">
        <a className="brand" href="#main" aria-label="H2-Triad home">
          <span className="brand-symbol" aria-hidden="true">
            H<span>2</span>
          </span>
          H2-Triad
        </a>
        <nav aria-label="Main navigation">
          <a href="#workspace">Digital Twin</a>
          <a href="#analysis">Demo analysis</a>
          <a href="#experiments">Demo records</a>
        </nav>
        <div className="header-actions">
          <details className="health-details">
            <summary>
              <span className={'status-dot ' + health} aria-hidden="true" />
              <span>
                {health === 'checking'
                  ? 'Connecting'
                  : health === 'connected'
                    ? 'System connected'
                    : 'System offline'}
              </span>
            </summary>
            <div className="health-popover">
              <strong>System connection</strong>
              <p>
                {health === 'connected'
                  ? 'FastAPI and SQLite are connected.'
                  : health === 'checking'
                    ? 'Checking FastAPI and SQLite…'
                    : 'Could not verify FastAPI and SQLite. Dataset loading and new scientific runs require the backend.'}
              </p>
              <button
                className="button secondary"
                onClick={() => {
                  setHealth('checking')
                  setAttempt((n) => n + 1)
                }}
              >
                Check again
              </button>
            </div>
          </details>
          <button
            className="theme-button"
            onClick={toggleTheme}
            aria-label={
              'Switch to ' + (theme === 'light' ? 'dark' : 'light') + ' mode'
            }
            title={
              'Switch to ' + (theme === 'light' ? 'dark' : 'light') + ' mode'
            }
          >
            {theme === 'light' ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden="true"
              >
                <path d="M20 14a8 8 0 0 1-10-10 8 8 0 1 0 10 10Z" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
