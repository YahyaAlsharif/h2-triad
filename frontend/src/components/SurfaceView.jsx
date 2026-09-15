import { useEffect, useState } from 'react'

// Load the substantial WebGL dependency only when there is a supported grid.
export default function SurfaceView(props) {
  const [state, setState] = useState({ status: 'loading' })
  useEffect(() => {
    let active = true
    import('./PlotSurface')
      .then((module) => {
        if (active) setState({ status: 'ready', Component: module.default })
      })
      .catch(() => {
        if (active) setState({ status: 'error' })
      })
    return () => {
      active = false
    }
  }, [])
  if (state.status === 'error')
    return (
      <div className="notice" role="alert">
        <p>
          Could not load the 3D view. The model values remain available in View
          landscape data. Reload the page to restore graphics after the
          connection recovers; unsaved inputs will reset.
        </p>
        <button
          type="button"
          className="text-button"
          onClick={() => window.location.reload()}
        >
          Reload page
        </button>
      </div>
    )
  if (state.status === 'loading')
    return (
      <p className="landscape-placeholder" role="status">
        Loading 3D view…
      </p>
    )
  const Component = state.Component
  return <Component {...props} />
}
