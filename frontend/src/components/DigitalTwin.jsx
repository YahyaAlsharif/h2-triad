import { useEffect, useRef, useState } from 'react'
import { inputsMatch, runDigitalTwin } from '../data/dashboardService'
import {
  Conditions,
  materialLabel,
  Outcome,
  MeasurementDetails,
} from './ExperimentDetails'

function NumberField({
  name,
  label,
  inputs,
  change,
  constraints,
  disabled = false,
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        name={name}
        type="number"
        value={inputs[name]}
        {...constraints[name]}
        required
        disabled={disabled}
        onChange={(event) =>
          change(
            name,
            event.target.value === '' ? '' : Number(event.target.value),
          )
        }
      />
    </label>
  )
}
export default function DigitalTwin({ configuration, options }) {
  const defaults = options.default_inputs
  const [inputs, setInputs] = useState(configuration?.inputs || defaults)
  const [result, setResult] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const controller = useRef(null)
  useEffect(() => () => controller.current?.abort(), [])
  const stale = result && !inputsMatch(inputs, result.inputs)
  function change(name, value) {
    setInputs((current) => {
      const next = { ...current, [name]: value }
      if (name === 'additive') {
        const allowed = options.additives.find(
          (item) => item.value === value,
        ).allows_loading
        if (!allowed) next.concentration_wt_pct = 0
        else if (
          !options.additives.find((item) => item.value === current.additive)
            .allows_loading
        )
          next.concentration_wt_pct = defaults.concentration_wt_pct
      }
      if (name === 'preparation_method')
        next.milling_hours = options.methods.find(
          (item) => item.value === value,
        ).allows_milling
          ? defaults.milling_hours
          : 0
      return next
    })
  }
  async function run(event) {
    event.preventDefault()
    controller.current?.abort()
    controller.current = new AbortController()
    setStatus('running')
    try {
      const response = await runDigitalTwin(
        { ...inputs },
        { signal: controller.current.signal },
      )
      setResult(response)
      setStatus('done')
    } catch (error) {
      if (error.name !== 'AbortError') {
        setError(error.message)
        setStatus('error')
      }
    }
  }
  const numberProps = {
    inputs,
    change,
    constraints: options.numeric_constraints,
  }
  return (
    <section id="workspace" aria-labelledby="workspace-title">
      <div className="section-heading">
        <h2 id="workspace-title">Digital Twin</h2>
        <span className="secondary-text">Exact dataset lookup</span>
      </div>
      <div className="twin-workspace">
        <form className="twin-form" onSubmit={run}>
          <div className="panel-heading">
            <h3>Material & preparation</h3>
            <button
              className="text-button"
              type="button"
              disabled={status === 'running'}
              onClick={() => {
                setInputs({ ...defaults })
                setResult(null)
                setStatus('idle')
              }}
            >
              Reset
            </button>
          </div>
          {configuration && inputsMatch(inputs, configuration.inputs) && (
            <p className="loaded-note">Loaded from {configuration.id}</p>
          )}
          <fieldset disabled={status === 'running'} className="input-grid">
            <legend className="sr-only">Material and preparation</legend>
            <label className="field">
              <span>Base material</span>
              <select
                value={inputs.material}
                onChange={(event) => change('material', event.target.value)}
              >
                {options.materials.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Additive / catalyst</span>
              <select
                value={inputs.additive}
                onChange={(event) => change('additive', event.target.value)}
              >
                {options.additives.map(({ value }) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <NumberField
              {...numberProps}
              name="concentration_wt_pct"
              label="Additive concentration (wt%)"
              disabled={
                !options.additives.find(
                  (item) => item.value === inputs.additive,
                )?.allows_loading
              }
            />
            <label className="field">
              <span>Preparation method</span>
              <select
                value={inputs.preparation_method}
                onChange={(event) =>
                  change('preparation_method', event.target.value)
                }
              >
                {options.methods.map(({ value }) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <NumberField
              {...numberProps}
              name="milling_hours"
              label="Ball milling time (h)"
              disabled={
                !options.methods.find(
                  (item) => item.value === inputs.preparation_method,
                )?.allows_milling
              }
            />
            <NumberField
              {...numberProps}
              name="particle_size_nm"
              label="Particle size (nm)"
            />
          </fieldset>
          <h3 className="conditions-heading">Experimental conditions</h3>
          <fieldset disabled={status === 'running'} className="input-grid">
            <legend className="sr-only">Experimental conditions</legend>
            <NumberField
              {...numberProps}
              name="temperature_c"
              label="Temperature (°C)"
            />
            <NumberField
              {...numberProps}
              name="pressure_bar"
              label="Hydrogen pressure (bar)"
            />
          </fieldset>
          <div className="form-footer">
            <button
              type="submit"
              className="button primary"
              disabled={status === 'running'}
            >
              {status === 'running'
                ? 'Looking up records…'
                : 'Run Digital Twin'}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </form>
        <div className="twin-result" aria-busy={status === 'running'}>
          <div className="panel-heading">
            <h3>Stored result</h3>
            <span className="mock-tag">Dataset lookup</span>
          </div>
          <div className="result-live" role="status" aria-live="polite">
            {status === 'running' ? (
              <div className="result-empty">
                <span className="loading-line" aria-hidden="true" />
                <h4>Looking up stored experiments</h4>
                <p>Matching the exact material and conditions.</p>
              </div>
            ) : status === 'error' ? (
              <div className="result-empty">
                <h4>Could not retrieve a result</h4>
                <p>{error} Run the Digital Twin again to retry.</p>
              </div>
            ) : !result ? (
              <div className="result-empty">
                <div className="empty-glyph" aria-hidden="true">
                  →
                </div>
                <h4>Your configuration, in context.</h4>
                <p>
                  Set the material and conditions, then run the Digital Twin.
                </p>
                <div className="result-placeholder">
                  <span>
                    Stored hydrogen capacity
                    <strong>
                      — <small>wt%</small>
                    </strong>
                  </span>
                </div>
              </div>
            ) : (
              <div className="result-content">
                <div className="result-configuration">
                  <strong>{materialLabel(result.inputs)}</strong>
                  <Conditions inputs={result.inputs} preparation />
                </div>
                {stale && (
                  <p className="notice">
                    Inputs changed. Run again to update this result.
                  </p>
                )}
                {result.status === 'unavailable' ? (
                  <div className="unsupported">
                    <h4>No stored result for these conditions</h4>
                    <p>
                      No experiment matches this exact configuration. No
                      capacity is calculated or predicted.
                    </p>
                  </div>
                ) : (
                  <>
                    {result.items.length > 1 && (
                      <p className="notice">
                        {result.items.length} stored observations match.
                        Measurement metadata may differ; results are shown
                        separately.
                      </p>
                    )}
                    {result.items.map((record) => (
                      <div className="stored-observation" key={record.id}>
                        <div className="result-outcome">
                          <Outcome value={record.outcome} />
                          <span>
                            {record.source.is_demo
                              ? 'Synthetic/demo observation'
                              : record.source.kind}
                          </span>
                        </div>
                        <div className="capacity-result">
                          <span>Stored hydrogen capacity</span>
                          <strong>
                            {record.hydrogen_capacity_wt_pct.toFixed(1)}{' '}
                            <small>wt%</small>
                          </strong>
                        </div>
                        <p className="fixture-reference">
                          Experiment {record.id}
                        </p>
                        <MeasurementDetails item={record} />
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
          <p className="result-disclaimer">
            Exact lookup only. No trained model or scientific prediction engine
            exists. Synthetic/demo records are illustrative, not experimental
            evidence.
          </p>
        </div>
      </div>
    </section>
  )
}
