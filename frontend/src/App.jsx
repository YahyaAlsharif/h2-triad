import { lazy, Suspense, useEffect, useState } from 'react'
import Header from './components/Header'
import Overview from './components/Overview'
import DigitalTwin from './components/DigitalTwin'
import ExperimentTable from './components/ExperimentTable'
import { getExperiments } from './data/dashboardService'
import { initialComparisonIds } from './data/mockExperiments'
import { useTheme } from './hooks/useTheme'
const Analysis = lazy(() => import('./components/Analysis'))
export default function App() {
  const [theme, toggleTheme] = useTheme()
  const [experiments, setExperiments] = useState([])
  const [loadState, setLoadState] = useState('loading')
  const [attempt, setAttempt] = useState(0)
  const [selectedIds, setSelectedIds] = useState(initialComparisonIds)
  const [configuration, setConfiguration] = useState(null)
  const [cohort, setCohort] = useState(null)
  useEffect(() => {
    const controller = new AbortController()
    getExperiments({ signal: controller.signal })
      .then(({ items, chart_cohort }) => {
        setExperiments(items)
        setCohort(chart_cohort)
        setLoadState('ready')
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setLoadState('error')
      })
    return () => controller.abort()
  }, [attempt])
  const toggleComparison = (id) =>
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length < 3
          ? [...current, id]
          : current,
    )
  function loadConfiguration(item) {
    setConfiguration({ ...item, key: Date.now() })
    document.getElementById('workspace').scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
      block: 'start',
    })
    requestAnimationFrame(() =>
      document
        .querySelector('#workspace select')
        ?.focus({ preventScroll: true }),
    )
  }
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to workspace
      </a>
      <Header theme={theme} toggleTheme={toggleTheme} />
      <main id="main" className="page-shell">
        <div className="page-heading">
          <h1>Hydrogen materials workspace</h1>
          <span className="demo-label">Demo data</span>
        </div>
        {loadState === 'loading' && (
          <div className="dataset-loading" role="status">
            Loading demo experiments…
          </div>
        )}
        {loadState === 'error' && (
          <div className="load-error" role="alert">
            <p>Could not load the demo dataset.</p>
            <button
              className="button secondary"
              onClick={() => {
                setLoadState('loading')
                setAttempt((n) => n + 1)
              }}
            >
              Retry dataset
            </button>
          </div>
        )}
        {experiments.length > 0 && <Overview experiments={experiments} />}
        <DigitalTwin
          key={configuration?.key || 'default'}
          configuration={configuration}
        />
        {loadState === 'ready' && experiments.length > 0 && (
          <>
            <Suspense
              fallback={
                <div className="dataset-loading" role="status">
                  Loading analysis…
                </div>
              }
            >
              <Analysis
                experiments={experiments}
                selectedIds={selectedIds}
                toggleComparison={toggleComparison}
                cohort={cohort}
              />
            </Suspense>
            <ExperimentTable
              experiments={experiments}
              selectedIds={selectedIds}
              toggleComparison={toggleComparison}
              loadConfiguration={loadConfiguration}
            />
          </>
        )}
        <footer className="page-footer">
          <span>H2-Triad</span>
          <p>Phase 2 prototype · Synthetic data · No trained model</p>
          <a href="#main">Back to top ↑</a>
        </footer>
      </main>
    </>
  )
}
