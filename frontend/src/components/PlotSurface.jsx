import { useEffect, useRef, useState } from 'react'
import Plotly from 'plotly.js-gl3d-dist-min'

const camera = { eye: { x: 1.5, y: 1.6, z: 1.15 } }
export default function PlotSurface({ data, theme }) {
  const plot = useRef(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [compact, setCompact] = useState(false)
  useEffect(() => {
    const element = plot.current
    let disposed = false
    const styles = getComputedStyle(document.documentElement)
    const color = (name) => styles.getPropertyValue(name).trim()
    const traces = [
      {
        type: 'surface',
        name: 'AI capacity response',
        x: data.x,
        y: data.y,
        z: data.z,
        connectgaps: false,
        showscale: !compact,
        colorscale:
          theme === 'dark'
            ? [
                [0, '#233a34'],
                [1, '#93ddcd'],
              ]
            : [
                [0, '#e0efeb'],
                [1, '#08796e'],
              ],
        colorbar: { title: { text: 'wt.% H₂' }, thickness: 12, len: 0.65 },
        customdata: data.intervals.map((row, j) =>
          row.map((v, i) => [
            v
              ? v.map((n) => n.toFixed(2)).join('–') + ' wt.% H₂'
              : 'Unavailable',
            data.warnings[j][i].join(', ') || 'Within support rules',
          ]),
        ),
        hovertemplate:
          'Temperature: %{x:.2f} °C<br>Loading: %{y:.2f} wt.%<br>AI capacity: %{z:.2f} wt.% H₂<br>Empirical 90% interval: %{customdata[0]}<br>%{customdata[1]}<extra>Model grid</extra>',
        lighting: { ambient: 0.9, diffuse: 0.3, specular: 0, roughness: 1 },
      },
    ]
    if (
      data.selected.status === 'predicted' &&
      data.inputs.catalyst_loading_wt_pct !== null
    )
      traces.push({
        type: 'scatter3d',
        mode: 'markers',
        name: 'Selected configuration',
        x: [data.inputs.temperature_c],
        y: [data.inputs.catalyst_loading_wt_pct],
        z: [data.selected.prediction.hydrogen_capacity_wt_pct],
        marker: {
          size: 6,
          color: color('--chart-amber'),
          symbol: 'diamond',
          line: { color: color('--ink'), width: 2 },
        },
        hovertemplate:
          'Selected configuration<br>%{x} °C · %{y} wt.% loading<br>AI prediction: %{z:.2f} wt.% H₂<extra></extra>',
      })
    const axis = (text) => ({
      title: { text, font: { size: 12 } },
      gridcolor: color('--border'),
      zerolinecolor: color('--border'),
      tickfont: { size: 10 },
      showbackground: false,
    })
    Plotly.react(
      element,
      traces,
      {
        autosize: true,
        paper_bgcolor: color('--surface'),
        font: { color: color('--ink'), family: 'Segoe UI, sans-serif' },
        margin: { l: 12, r: 12, t: 12, b: 12 },
        showlegend: false,
        scene: {
          xaxis: axis(compact ? 'Temp. (°C)' : 'Temperature (°C)'),
          yaxis: axis('Loading (wt.%)'),
          // The full X/Y/Z key below the compact plot avoids clipped 3D titles.
          zaxis: axis(compact ? '' : 'H₂ capacity (wt.%)'),
          camera: compact ? { eye: { x: 2, y: 2, z: 1.5 } } : camera,
          aspectmode: 'cube',
          uirevision: 'camera',
        },
      },
      { responsive: true, displayModeBar: false, scrollZoom: false },
    )
      .then(() => {
        if (!disposed)
          element.on('plotly_webglcontextlost', () =>
            setError(
              'The 3D graphics context was lost. The data table remains available.',
            ),
          )
      })
      .catch(() => {
        if (!disposed)
          setError(
            'The 3D view is unavailable on this browser. The complete model grid is available in View landscape data.',
          )
      })
    const observer = new ResizeObserver(() => {
      if (!disposed) setCompact(element.clientWidth < 480)
      if (!disposed && element.data) Plotly.Plots.resize(element)
    })
    observer.observe(element)
    return () => {
      disposed = true
      observer.disconnect()
      Plotly.purge(element)
    }
  }, [data, theme, attempt, compact])
  return (
    <div className="surface-container">
      <div className="surface-controls">
        <p className="secondary-text">
          Drag to rotate · pinch to zoom · diamond marks the selected prediction
        </p>
        <button
          className="text-button"
          type="button"
          onClick={() =>
            Plotly.relayout(plot.current, {
              'scene.camera': compact
                ? { eye: { x: 2, y: 2, z: 1.5 } }
                : camera,
            })
          }
        >
          Reset view
        </button>
      </div>
      {error && (
        <div className="notice" role="alert">
          <p>{error}</p>
          <button
            className="text-button"
            type="button"
            onClick={() => {
              setError('')
              setAttempt((n) => n + 1)
            }}
          >
            Retry 3D view
          </button>
        </div>
      )}
      <div
        ref={plot}
        className={'prediction-surface' + (compact ? ' compact-surface' : '')}
        role="img"
        aria-label="3D model response landscape. Temperature and catalyst loading determine plotted model capacity. Read all values and support reasons in View landscape data."
      />
      {compact && (
        <p className="field-hint surface-axis-key">
          X: Temperature (°C) · Y: Catalyst loading (wt.%) · Z: Predicted H₂
          capacity (wt.% H₂)
        </p>
      )}
    </div>
  )
}
