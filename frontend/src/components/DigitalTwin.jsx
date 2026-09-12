import { useEffect, useRef, useState } from 'react'
import { defaultInputs, mockOptions } from '../data/mockExperiments'
import { inputsMatch, runDigitalTwin } from '../data/dashboardService'
import { Conditions, materialLabel, Outcome } from './ExperimentDetails'

function NumberField({
  name,
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled = false,
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        name={name}
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        required
        disabled={disabled}
        onChange={(event) =>
          onChange(
            name,
            event.target.value === '' ? '' : Number(event.target.value),
          )
        }
      />
    </label>
  )
}
export default function DigitalTwin({ configuration }) {
  const [inputs, setInputs] = useState(configuration?.inputs || defaultInputs)
  const [result, setResult] = useState(null)
  const [status, setStatus] = useState('idle')
  const controller = useRef(null)
  useEffect(() => () => controller.current?.abort(), [])
  const stale = result && !inputsMatch(inputs, result.inputs)
  const change = (name, value) => {
    setInputs((current) => {
      const next = { ...current, [name]: value }
      if (name === 'additive' && value === 'None') next.concentration_wt_pct = 0
      if (
        name === 'additive' &&
        current.additive === 'None' &&
        value !== 'None'
      )
        next.concentration_wt_pct = defaultInputs.concentration_wt_pct
      if (name === 'preparation_method')
        next.milling_hours =
          value === 'Ball milling' ? defaultInputs.milling_hours : 0
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
      if (error.name !== 'AbortError') setStatus('error')
    }
  }
  return (
    <section id="workspace" aria-labelledby="workspace-title">
      <div className="section-heading">
        <h2 id="workspace-title">Digital Twin</h2>
        <span className="secondary-text">Mock simulation</span>
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
                setInputs({ ...defaultInputs })
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
                onChange={(e) => change('material', e.target.value)}
              >
                {mockOptions.materials.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Additive / catalyst</span>
              <select
                value={inputs.additive}
                onChange={(e) => change('additive', e.target.value)}
              >
                {mockOptions.additives.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <NumberField
              name="concentration_wt_pct"
              label="Additive concentration (wt%)"
              value={inputs.concentration_wt_pct}
              onChange={change}
              min={0}
              max={30}
              step={0.5}
              disabled={inputs.additive === 'None'}
            />
            <label className="field">
              <span>Preparation method</span>
              <select
                value={inputs.preparation_method}
                onChange={(e) => change('preparation_method', e.target.value)}
              >
                {mockOptions.methods.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <NumberField
              name="milling_hours"
              label="Ball milling time (h)"
              value={inputs.milling_hours}
              onChange={change}
              min={0}
              max={48}
              step={0.5}
              disabled={inputs.preparation_method !== 'Ball milling'}
            />
            <NumberField
              name="particle_size_nm"
              label="Particle size (nm)"
              value={inputs.particle_size_nm}
              onChange={change}
              min={1}
              max={1000}
            />
          </fieldset>
          <h3 className="conditions-heading">Experimental conditions</h3>
          <fieldset disabled={status === 'running'} className="input-grid">
            <legend className="sr-only">Experimental conditions</legend>
            <NumberField
              name="temperature_c"
              label="Temperature (°C)"
              value={inputs.temperature_c}
              onChange={change}
              min={20}
              max={500}
            />
            <NumberField
              name="pressure_bar"
              label="Hydrogen pressure (bar)"
              value={inputs.pressure_bar}
              onChange={change}
              min={0.1}
              max={100}
              step={0.1}
            />
          </fieldset>
          <div className="form-footer">
            <button
              type="submit"
              className="button primary"
              disabled={status === 'running'}
            >
              {status === 'running' ? 'Running demo…' : 'Run Digital Twin'}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </form>
        <div className="twin-result" aria-busy={status === 'running'}>
          <div className="panel-heading">
            <h3>Prediction</h3>
            <span className="mock-tag">Mock result</span>
          </div>
          <div className="result-live" role="status" aria-live="polite">
            {status === 'running' ? (
              <div className="result-empty">
                <span className="loading-line" aria-hidden="true" />
                <h4>Loading demo result</h4>
                <p>Retrieving a saved fixture for this configuration.</p>
              </div>
            ) : status === 'error' ? (
              <div className="result-empty">
                <h4>Demo result unavailable</h4>
                <p>Run the Digital Twin again to retry.</p>
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
                    Hydrogen capacity
                    <strong>
                      — <small>wt%</small>
                    </strong>
                  </span>
                  <span>
                    Desorption temperature
                    <strong>
                      — <small>°C</small>
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
                    <h4>No fixture for these conditions</h4>
                    <p>
                      This demo has no saved result for the exact configuration.
                      Reset to the default to explore a complete result.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="result-outcome">
                      <Outcome value={result.outcome} />
                      <span>
                        Demo confidence{' '}
                        <strong>{result.confidence_pct}%</strong>
                      </span>
                    </div>
                    <div className="capacity-result">
                      <span>Estimated hydrogen capacity</span>
                      <strong>
                        {result.hydrogen_capacity_wt_pct.toFixed(1)}{' '}
                        <small>wt%</small>
                      </strong>
                    </div>
                    <div className="desorption-result">
                      <span>Estimated desorption temperature</span>
                      <strong>
                        {result.desorption_temperature_c} <small>°C</small>
                      </strong>
                    </div>
                    <p className="result-basis">
                      Capacity basis: total composite mass.
                    </p>
                    <p className="fixture-reference">Fixture {result.id}</p>
                  </>
                )}
              </div>
            )}
          </div>
          <p className="result-disclaimer">
            Illustrative values only. Capacity, temperature, and confidence are
            not model predictions or experimental evidence.
          </p>
        </div>
      </div>
    </section>
  )
}
