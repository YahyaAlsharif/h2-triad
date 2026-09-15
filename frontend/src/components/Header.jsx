import { useEffect, useState } from 'react'
import { getHealth } from '../data/dashboardService'
export default function Header({ theme, toggleTheme }) {
  const [health, setHealth] = useState('checking')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    let mounted = true
    let retryTimer
    const check = async () => {
      for (const delay of [0, 1000, 2500]) {
        if (delay)
          await new Promise((resolve) => {
            retryTimer = setTimeout(resolve, delay)
          })
        if (controller.signal.aborted) return
        try {
          await getHealth({ signal: controller.signal })
          if (mounted) setHealth('connected')
          return
        } catch {
          // A sleeping free instance can reject the first request while waking.
        }
      }
      if (mounted) setHealth('offline')
    }
    check()
    return () => {
      mounted = false
      clearTimeout(retryTimer)
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
                  ? 'Starting prediction service…'
                  : health === 'connected'
                    ? 'Prediction service ready'
                    : 'Prediction service unavailable'}
              </span>
            </summary>
            <div className="health-popover">
              <strong>System connection</strong>
              <p>
                {health === 'connected'
                  ? 'FastAPI, the scientific model, and demo data are available.'
                  : health === 'checking'
                    ? 'Waking and checking the prediction service…'
                    : 'Could not verify the prediction service. Dataset loading and new scientific runs require the backend.'}
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
