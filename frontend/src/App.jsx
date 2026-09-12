import { useEffect, useState } from 'react'

const initialSystemState = {
  state: 'loading',
  api: 'checking',
  database: 'checking',
  message: '',
}

function StatusRow({ label, status }) {
  const isConnected = status === 'connected' || status === 'running'
  const statusText = isConnected
    ? status === 'running'
      ? 'Running'
      : 'Connected'
    : status === 'checking'
      ? 'Checking…'
      : 'Unavailable'

  return (
    <li className="flex items-center justify-between gap-6 border-b border-slate-200 py-4 last:border-0">
      <span className="font-medium text-slate-700">{label}</span>
      <span className="inline-flex items-center gap-2 font-mono text-sm text-slate-600">
        <span
          aria-hidden="true"
          className={`size-2 rounded-full ${
            isConnected ? 'bg-emerald-600' : status === 'checking' ? 'bg-amber-500' : 'bg-red-600'
          }`}
        />
        {statusText}
      </span>
    </li>
  )
}

export default function App() {
  const [system, setSystem] = useState(initialSystemState)

  useEffect(() => {
    const controller = new AbortController()

    async function loadHealth() {
      try {
        const response = await fetch('/api/health', { signal: controller.signal })
        const health = await response.json()

        if (!response.ok || health.api !== 'connected' || health.database !== 'connected') {
          throw new Error('The system health check did not pass.')
        }

        setSystem({
          state: 'ready',
          api: health.api,
          database: health.database,
          message: '',
        })
      } catch (error) {
        if (error.name === 'AbortError') return

        setSystem({
          state: 'error',
          api: 'unavailable',
          database: 'unavailable',
          message: 'Could not reach the system health endpoint. Confirm that the backend is running.',
        })
      }
    }

    loadHealth()
    return () => controller.abort()
  }, [])

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-5 py-12 text-slate-950">
      <section className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-blue-800">
          H2-TRIAD
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Hydrogen Digital Twin
        </h1>
        <p className="mt-3 text-slate-600">Phase 1 — System Check</p>

        <ul className="mt-8 border-y border-slate-200" aria-live="polite" aria-busy={system.state === 'loading'}>
          <StatusRow label="Frontend" status="running" />
          <StatusRow label="Backend" status={system.api} />
          <StatusRow label="Database" status={system.database} />
        </ul>

        {system.state === 'loading' && (
          <p className="mt-5 text-sm text-slate-500">Checking backend and SQLite connectivity…</p>
        )}

        {system.state === 'ready' && (
          <p className="mt-5 text-sm font-medium text-emerald-700">
            All Phase 1 services are operational.
          </p>
        )}

        {system.state === 'error' && (
          <p className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
            {system.message}
          </p>
        )}
      </section>
    </main>
  )
}

