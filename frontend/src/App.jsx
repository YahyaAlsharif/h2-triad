import { lazy, Suspense, useEffect, useState } from 'react'
import Header from './components/Header'
import Overview from './components/Overview'
import DigitalTwin from './components/DigitalTwin'
import ExperimentTable from './components/ExperimentTable'
import { getExperiments, getDomainOptions } from './data/dashboardService'
import { useTheme } from './hooks/useTheme'
const Analysis = lazy(() => import('./components/Analysis'))
function useResource(loader) {
  const [state, setState] = useState({ status: 'loading', data: null })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    loader({ signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setState({ status: 'ready', data })
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({ status: 'error', data: null, error: error.message })
      })
    return () => controller.abort()
  }, [loader, attempt])
  return [
    state,
    () => {
      setState({ status: 'loading', data: null })
      setAttempt((n) => n + 1)
    },
  ]
}
export default function App() {
  const [theme, toggleTheme] = useTheme()
  const [dataset, retryDataset] = useResource(getExperiments)
  const [domain, retryOptions] = useResource(getDomainOptions)
  const [selection, setSelection] = useState([])
  const [configuration, setConfiguration] = useState(null)
  const experiments = dataset.data?.items || []
  const selectedIds = selection.filter((id) =>
    experiments.some((item) => item.id === id),
  )
  const toggleComparison = (id) =>
    setSelection(
      selectedIds.includes(id)
        ? selectedIds.filter((item) => item !== id)
        : selectedIds.length < 3
          ? [...selectedIds, id]
          : selectedIds,
    )
  function loadConfiguration(item) {
    setConfiguration({ ...item, key: (configuration?.key || 0) + 1 })
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
          {experiments.some((item) => item.source.is_demo) && (
            <span className="demo-label">Contains demo data</span>
          )}
        </div>
        {dataset.status === 'loading' && (
          <div className="dataset-loading" role="status">
            Loading experiments…
          </div>
        )}
        {dataset.status === 'error' && (
          <div className="load-error" role="alert">
            <p>Could not load the dataset. {dataset.error}</p>
            <button className="button secondary" onClick={retryDataset}>
              Retry dataset
            </button>
          </div>
        )}
        {dataset.status === 'ready' && experiments.length === 0 && (
          <div className="dataset-empty" role="status">
            <h2>No experiments available</h2>
            <p>The backend database contains no experimental records.</p>
            <button className="button secondary" onClick={retryDataset}>
              Reload dataset
            </button>
          </div>
        )}
        {experiments.length > 0 && <Overview experiments={experiments} />}
        {domain.status === 'ready' && domain.data.default_inputs ? (
          <DigitalTwin
            key={configuration?.key || 'default'}
            configuration={configuration}
            options={domain.data}
          />
        ) : (
          <section id="workspace" aria-labelledby="workspace-title">
            <h2 id="workspace-title">Digital Twin</h2>
            {domain.status === 'loading' ? (
              <p className="dataset-loading" role="status">
                Loading configuration options…
              </p>
            ) : domain.status === 'error' ? (
              <div className="load-error" role="alert">
                <p>Could not load configuration options. {domain.error}</p>
                <button className="button secondary" onClick={retryOptions}>
                  Retry options
                </button>
              </div>
            ) : (
              <p className="dataset-empty" role="status">
                No stored configurations are available.
              </p>
            )}
          </section>
        )}
        {experiments.length > 0 && (
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
              />
            </Suspense>
            <ExperimentTable
              experiments={experiments}
              selectedIds={selectedIds}
              toggleComparison={toggleComparison}
              loadConfiguration={loadConfiguration}
              optionsReady={
                domain.status === 'ready' && !!domain.data.default_inputs
              }
            />
          </>
        )}
        <footer className="page-footer">
          <span>H2-Triad</span>
          <p>Phase 3 · Dataset-backed exact lookup · No trained model</p>
          <a href="#main">Back to top ↑</a>
        </footer>
      </main>
    </>
  )
}
