import { useEffect, useRef, useState } from 'react'
import { getLandscape, inputsMatch } from '../data/scientificService'
import {
  conditionSummary,
  supportMessage,
} from '../data/scientificPresentation'
import SurfaceView from './SurfaceView'

export default function PredictionLandscape({ inputs, theme }) {
  const [state, setState] = useState({ status: 'idle', data: null })
  const controller = useRef(null)
  useEffect(() => () => controller.current?.abort(), [])
  const data = state.data
  const stale = data && !inputsMatch(inputs, data.inputs)
  async function generate() {
    controller.current?.abort()
    const abort = new AbortController()
    controller.current = abort
    setState({ status: 'loading', data: null })
    try {
      const response = await getLandscape(
        { ...inputs },
        { signal: abort.signal },
      )
      if (!abort.signal.aborted) setState({ status: 'ready', data: response })
    } catch (error) {
      if (!abort.signal.aborted)
        setState({ status: 'error', error: error.message, data: null })
    }
  }
  return (
    <section
      className="landscape-panel"
      aria-labelledby="landscape-title"
      aria-busy={state.status === 'loading'}
    >
      <div className="panel-heading">
        <div>
          <h3 id="landscape-title">Capacity response landscape</h3>
          <p className="secondary-text">
            Temperature × catalyst loading · other inputs fixed
          </p>
        </div>
        <button
          type="button"
          className="button secondary"
          onClick={generate}
          disabled={state.status === 'loading' || inputs.temperature_c === null}
        >
          {state.status === 'loading'
            ? 'Generating…'
            : state.status === 'error'
              ? 'Retry landscape'
              : data
                ? 'Update landscape'
                : 'Generate landscape'}
        </button>
      </div>
      <p className="scientific-note">
        Model response across temperature and loading, with other inputs fixed.
        Connecting grid predictions aids viewing; it is not a physical
        simulation, causal result, or experimentally verified continuous
        surface.
      </p>
      {inputs.temperature_c === null && (
        <p className="notice">
          Enter a numeric temperature to explore the landscape. Reported “room
          temperature” is not converted into a number.
        </p>
      )}
      <div role="status" aria-live="polite">
        {state.status === 'idle' && (
          <p className="landscape-placeholder">
            Generate a 20 × 20 grid using the Phase 4B capacity model.
            Unsupported cells remain empty.
          </p>
        )}
        {state.status === 'loading' && (
          <p className="landscape-placeholder">
            Validating and predicting the grid…
          </p>
        )}
        {state.status === 'error' && (
          <p className="notice">Could not load the landscape. {state.error}</p>
        )}
        {stale && (
          <p className="notice">
            Inputs changed. Update the landscape to use this configuration. The
            plot below shows the previous inputs.
          </p>
        )}
      </div>
      {data && (
        <>
          <p className="landscape-context">
            {conditionSummary(data.inputs)}
            <br />
            {data.inputs.catalyst_components || 'No catalyst components'} ·{' '}
            {data.inputs.support_material || 'Support unspecified'} ·{' '}
            {data.model_id}
          </p>
          <p className="secondary-text">
            {data.supported_cells} of {data.total_cells} cells supported ·{' '}
            {data.total_cells - data.supported_cells} masked. Eligibility
            follows mode-specific ranges and chemistry checks; it does not
            establish experimental coverage of every combination.
          </p>
          {data.supported_cells ? (
            <SurfaceView data={data} theme={theme} />
          ) : (
            <p className="landscape-placeholder">
              No supported cells for these fixed conditions. Review the reasons
              below.
            </p>
          )}
          <div className="selected-summary">
            <strong>Selected configuration</strong>
            {data.selected.status === 'predicted' ? (
              <p>
                AI prediction:{' '}
                {data.selected.prediction.hydrogen_capacity_wt_pct.toFixed(2)}{' '}
                wt.% H₂
                {data.selected.prediction.empirical_interval_90_wt_pct &&
                  ` · empirical 90% interval ${data.selected.prediction.empirical_interval_90_wt_pct.map((n) => n.toFixed(2)).join('–')} wt.% H₂`}
                {data.inputs.catalyst_loading_wt_pct === null &&
                  ' · unspecified loading has no Y coordinate and cannot be marked on this plot.'}
              </p>
            ) : (
              <p>
                No predicted height for the selected configuration.{' '}
                {data.selected.support.reasons.map(supportMessage).join(' ')}
              </p>
            )}
          </div>
          {data.selected.support.warnings.length > 0 && (
            <div className="notice">
              <strong>Selected-point warnings</strong>
              <ul>
                {data.selected.support.warnings.map((code) => (
                  <li key={code}>{supportMessage(code)}</li>
                ))}
              </ul>
            </div>
          )}
          {[...new Set(data.warnings.flat(2))].length > 0 && (
            <div className="notice">
              <strong>Grid support warnings</strong>
              <ul>
                {[...new Set(data.warnings.flat(2))].map((code) => (
                  <li key={code}>{supportMessage(code)}</li>
                ))}
              </ul>
            </div>
          )}
          {[...new Set(data.reasons.flat(2))].length > 0 && (
            <div className="notice">
              <strong>Masked-cell reasons</strong>
              <ul>
                {[...new Set(data.reasons.flat(2))].map((code) => (
                  <li key={code}>{supportMessage(code)}</li>
                ))}
              </ul>
            </div>
          )}
          <details className="landscape-data">
            <summary>View landscape data</summary>
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Landscape data table"
            >
              <table>
                <caption>
                  Model grid values; gaps are unsupported. Fixed inputs:{' '}
                  {conditionSummary(data.inputs)}.
                </caption>
                <thead>
                  <tr>
                    <th>Temperature (°C)</th>
                    <th>Loading (wt.%)</th>
                    <th>AI capacity (wt.% H₂)</th>
                    <th>Empirical 90% interval</th>
                    <th>Support notes</th>
                  </tr>
                </thead>
                <tbody>
                  {data.y.flatMap((y, j) =>
                    data.x.map((x, i) => (
                      <tr key={`${j}-${i}`}>
                        <td>{x.toFixed(2)}</td>
                        <td>{y.toFixed(2)}</td>
                        <td>{data.z[j][i]?.toFixed(2) ?? 'Unavailable'}</td>
                        <td>
                          {data.intervals[j][i]
                            ?.map((n) => n.toFixed(2))
                            .join('–') ?? '—'}
                        </td>
                        <td>
                          {[...data.reasons[j][i], ...data.warnings[j][i]]
                            .map(supportMessage)
                            .join(' ') || 'Within support rules'}
                        </td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  )
}
