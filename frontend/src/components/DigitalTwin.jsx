import { useEffect, useRef, useState } from 'react'
import {
  getLiterature,
  inputsMatch,
  runDigitalTwin,
} from '../data/scientificService'
import {
  conditionSummary,
  label,
  literatureValue,
  supportMessage,
} from '../data/scientificPresentation'
import PredictionLandscape from './PredictionLandscape'

function NumberField({ name, title, inputs, change, nullable = false, rule }) {
  return (
    <label className="field">
      <span>{title}</span>
      <input
        name={name}
        type="number"
        step="any"
        value={inputs[name] ?? ''}
        required={!nullable}
        onChange={(event) =>
          change(
            name,
            event.target.value === '' ? null : Number(event.target.value),
          )
        }
      />
      {rule && (
        <small className="field-hint">
          AI support: {rule.min}–{rule.max}
          {nullable ? '; blank = unspecified' : ''}
        </small>
      )}
    </label>
  )
}

function LiteratureLoader({ onLoad }) {
  const [state, setState] = useState({ status: 'idle', items: [] })
  const [selected, setSelected] = useState('')
  const controller = useRef(null)
  useEffect(() => () => controller.current?.abort(), [])
  async function load() {
    controller.current?.abort()
    const abort = new AbortController()
    controller.current = abort
    setState({ status: 'loading', items: [] })
    try {
      const body = await getLiterature({ signal: abort.signal })
      if (!abort.signal.aborted)
        setState({ status: 'ready', items: body.items })
    } catch (error) {
      if (!abort.signal.aborted)
        setState({ status: 'error', items: [], error: error.message })
    }
  }
  return (
    <details
      className="literature-loader"
      onToggle={(event) => {
        if (event.currentTarget.open && state.status === 'idle') load()
      }}
    >
      <summary>Load a literature configuration</summary>
      <p className="field-hint">
        Optional. Load the reported sample, conditions, and provenance; edit
        them to explore a new configuration.
      </p>
      {state.status === 'loading' && <p role="status">Loading literature…</p>}
      {state.status === 'error' && (
        <div role="alert">
          <p>{state.error}</p>
          <button type="button" className="text-button" onClick={load}>
            Retry literature
          </button>
        </div>
      )}
      {state.status === 'ready' && (
        <div className="preset-controls">
          <label className="field">
            <span>Literature observation</span>
            <select
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
            >
              <option value="">Select an observation</option>
              {state.items.map((item) => (
                <option key={item.measurement_id} value={item.measurement_id}>
                  {item.measurement_id} · {item.sample_label} ·{' '}
                  {item.inputs.measurement_mode} · {item.temperature_raw} ·{' '}
                  {item.duration_raw} · {literatureValue(item)} wt.%
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="button secondary"
            disabled={!selected}
            onClick={() =>
              onLoad(
                state.items.find((item) => item.measurement_id === selected),
              )
            }
          >
            Load configuration
          </button>
        </div>
      )}
    </details>
  )
}

function LiteratureDetails({ item }) {
  return (
    <article className="literature-observation">
      <div className="capacity-result">
        <span>Literature measurement</span>
        <strong>
          {literatureValue(item)} <small>wt.% H₂</small>
        </strong>
      </div>
      <p className="secondary-text">
        {label(item.value_qualifier)} · {item.capacity_basis} ·{' '}
        {item.measurement_id}
      </p>
      {item.reported_uncertainty_wt_pct !== null && (
        <p>Reported uncertainty: ±{item.reported_uncertainty_wt_pct} wt.% H₂</p>
      )}
      <p>{conditionSummary(item.inputs)}</p>
      <p className="source-title">
        {item.source.doi ? (
          <a
            href={`https://doi.org/${encodeURIComponent(item.source.doi)}`}
            target="_blank"
            rel="noreferrer"
          >
            {item.source.title}
          </a>
        ) : (
          item.source.title
        )}
      </p>
      <p className="secondary-text">
        {item.source.paper_id} · {item.source.year} · PDF page{' '}
        {item.source.source_pdf_page} · {item.source.source_locator}
      </p>
      <details className="evidence-details">
        <summary>Reported conditions and preparation</summary>
        <p>
          {item.temperature_raw} · {item.duration_raw} ·{' '}
          {item.pressure_raw || 'Pressure not reported'}
        </p>
        <dl className="measurement-details">
          {Object.entries(item.preparation)
            .filter(([, value]) => value)
            .map(([key, value]) => (
              <div key={key}>
                <dt>{label(key)}</dt>
                <dd>{value}</dd>
              </div>
            ))}
        </dl>
        {item.sample_note && <p>{item.sample_note}</p>}
        {item.source.extraction_note && <p>{item.source.extraction_note}</p>}
      </details>
    </article>
  )
}

export default function DigitalTwin({ options, theme }) {
  const defaults = options.default_inputs
  const [inputs, setInputs] = useState({ ...defaults })
  const [preset, setPreset] = useState(null)
  const [result, setResult] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const controller = useRef(null)
  useEffect(() => () => controller.current?.abort(), [])
  const stale = result && !inputsMatch(inputs, result.inputs)
  const profile = options.support_profile
  const ranges =
    profile.measurement_modes[inputs.measurement_mode]?.ranges || {}
  function change(name, value) {
    setInputs((current) => {
      const next = { ...current, [name]: value }
      if (name === 'temperature_c') next.temperature_reported = null
      if (name === 'pressure_bar')
        next.pressure_relation =
          value === null ? null : current.pressure_relation || '='
      if (
        [
          'catalyst_family',
          'catalyst_elements',
          'catalyst_components',
          'support_material',
        ].includes(name)
      ) {
        next.sample_id = null
        next.preparation_method = null
      }
      return next
    })
  }
  function normalized() {
    return {
      ...inputs,
      ...Object.fromEntries(
        ['catalyst_elements', 'catalyst_components'].map((key) => [
          key,
          [
            ...new Set(
              inputs[key]
                .split('|')
                .map((s) => s.trim())
                .filter(Boolean),
            ),
          ]
            .sort()
            .join('|'),
        ]),
      ),
    }
  }
  async function run(event) {
    event.preventDefault()
    controller.current?.abort()
    const abort = new AbortController()
    controller.current = abort
    const submitted = normalized()
    setInputs(submitted)
    setStatus('running')
    setError('')
    try {
      const response = await runDigitalTwin(submitted, { signal: abort.signal })
      if (!abort.signal.aborted) {
        setResult(response)
        setStatus('done')
      }
    } catch (error) {
      if (!abort.signal.aborted) {
        setError(error.message)
        setStatus('error')
      }
    }
  }
  const numberProps = { inputs, change }
  return (
    <section id="workspace" aria-labelledby="workspace-title">
      <div className="section-heading">
        <h2 id="workspace-title">Digital Twin</h2>
        <span className="secondary-text">
          Literature → AI prediction → unavailable
        </span>
      </div>
      <div className="twin-workspace">
        <form className="twin-form" onSubmit={run}>
          <div className="panel-heading">
            <div>
              <h3>Configure an experiment</h3>
              <p className="secondary-text">
                MgH₂ · capacity on a sample-mass basis
              </p>
            </div>
            <button
              type="button"
              className="text-button"
              disabled={status === 'running'}
              onClick={() => {
                setInputs({ ...defaults })
                setPreset(null)
                setResult(null)
                setStatus('idle')
              }}
            >
              Reset
            </button>
          </div>
          <fieldset
            disabled={status === 'running'}
            className="scientific-fields"
          >
            <legend className="sr-only">Scientific configuration</legend>
            <LiteratureLoader
              onLoad={(item) => {
                setInputs({ ...item.inputs })
                setPreset(item)
                setResult(null)
                setStatus('idle')
              }}
            />
            {preset && (
              <p className="loaded-note">
                Based on {preset.measurement_id} · {preset.sample_label}.{' '}
                {inputs.sample_id
                  ? 'Reported sample context retained; conditions are checked on each run.'
                  : 'Chemistry edited: custom sample.'}
              </p>
            )}
            <div className="input-grid">
              <label className="field">
                <span>Measurement mode</span>
                <select
                  value={inputs.measurement_mode}
                  onChange={(e) => change('measurement_mode', e.target.value)}
                >
                  {Object.keys(profile.measurement_modes).map((value) => (
                    <option key={value} value={value}>
                      {label(value)}
                    </option>
                  ))}
                </select>
              </label>
              <NumberField
                {...numberProps}
                name="duration_seconds"
                title="Duration (s)"
                rule={ranges.duration_seconds}
              />
              <NumberField
                {...numberProps}
                name="temperature_c"
                title="Temperature (°C)"
                rule={ranges.temperature_c}
                nullable={!!inputs.temperature_reported}
              />
              <NumberField
                {...numberProps}
                name="catalyst_loading_wt_pct"
                title="Catalyst loading (wt.%)"
                rule={ranges.catalyst_loading_wt_pct}
                nullable={ranges.catalyst_loading_wt_pct?.missing_allowed}
              />
            </div>
            {inputs.temperature_reported && (
              <p className="notice">
                Reported temperature: {inputs.temperature_reported}. No numeric
                temperature was reported. Entering one creates a new
                configuration.
              </p>
            )}
            <h3 className="conditions-heading">Catalyst chemistry</h3>
            <div className="input-grid">
              <label className="field">
                <span>Catalyst family</span>
                <select
                  value={inputs.catalyst_family}
                  onChange={(e) => change('catalyst_family', e.target.value)}
                >
                  {profile.catalyst_families.map((value) => (
                    <option key={value} value={value}>
                      {label(value)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Support material</span>
                <input
                  list="support-materials"
                  value={inputs.support_material ?? ''}
                  onChange={(e) =>
                    change('support_material', e.target.value || null)
                  }
                  placeholder="Unspecified"
                  maxLength={300}
                />
                <datalist id="support-materials">
                  {profile.support_materials.map((value) => (
                    <option key={value} value={value} />
                  ))}
                </datalist>
              </label>
              <label className="field">
                <span>Catalyst components</span>
                <input
                  value={inputs.catalyst_components}
                  required={inputs.catalyst_family !== 'none'}
                  maxLength={300}
                  onChange={(e) =>
                    change('catalyst_components', e.target.value)
                  }
                />
                <small className="field-hint">
                  Separate explicit components with |, e.g. NiO|ZnO.
                </small>
              </label>
              <label className="field">
                <span>Catalyst elements</span>
                <input
                  value={inputs.catalyst_elements}
                  required
                  maxLength={300}
                  onChange={(e) => change('catalyst_elements', e.target.value)}
                />
                <small className="field-hint">
                  Element symbols separated by |, e.g. Ni|Zn|O.
                </small>
              </label>
            </div>
            <h3 className="conditions-heading">Pressure context</h3>
            <div className="input-grid">
              <NumberField
                {...numberProps}
                name="pressure_bar"
                title="Hydrogen pressure (bar)"
                rule={ranges.pressure_bar}
                nullable
              />
              <label className="field">
                <span>Pressure relation</span>
                <select
                  value={inputs.pressure_relation ?? ''}
                  disabled={inputs.pressure_bar === null}
                  onChange={(e) => change('pressure_relation', e.target.value)}
                >
                  {inputs.pressure_bar === null && (
                    <option value="">Unspecified</option>
                  )}
                  {['=', '<', '>', '<=', '>='].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
                <small className="field-hint">
                  Pressure affects model eligibility, not the fitted capacity
                  response.
                </small>
              </label>
            </div>
          </fieldset>
          <div className="form-footer">
            <button
              type="submit"
              className="button primary"
              disabled={status === 'running'}
            >
              {status === 'running'
                ? 'Checking evidence and model…'
                : 'Run Digital Twin'}{' '}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </form>
        <div className="twin-result" aria-busy={status === 'running'}>
          <div className="panel-heading">
            <h3>Capacity result</h3>
            <span className="science-tag">
              {status === 'done'
                ? {
                    literature: 'Literature measurement',
                    predicted: 'AI prediction',
                    unavailable: 'Unavailable',
                  }[result.status]
                : 'Scientific evidence'}
            </span>
          </div>
          <div className="result-live" role="status" aria-live="polite">
            {status === 'running' ? (
              <div className="result-empty">
                <h4>Checking literature and model support</h4>
                <p>Using the submitted configuration.</p>
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
                  Set the conditions, then run the Digital Twin. Verified
                  literature takes precedence over supported model predictions.
                </p>
              </div>
            ) : (
              <div className="result-content">
                {stale && (
                  <p className="notice">
                    Inputs changed. Run again to update this result.
                  </p>
                )}
                <p className="result-configuration">
                  {conditionSummary(result.inputs)}
                </p>
                {result.status === 'literature' ? (
                  <>
                    {result.items.length > 1 && (
                      <p className="notice">
                        {result.items.length} matching observations, shown
                        separately.
                      </p>
                    )}
                    {result.items.map((item) => (
                      <LiteratureDetails
                        key={item.measurement_id}
                        item={item}
                      />
                    ))}
                  </>
                ) : result.status === 'predicted' ? (
                  <>
                    <div className="capacity-result">
                      <span>AI prediction</span>
                      <strong>
                        {result.prediction.hydrogen_capacity_wt_pct.toFixed(2)}{' '}
                        <small>wt.% H₂</small>
                      </strong>
                    </div>
                    {result.prediction.empirical_interval_90_wt_pct ? (
                      <div className="uncertainty">
                        <strong>
                          {result.prediction.empirical_interval_90_wt_pct
                            .map((n) => n.toFixed(2))
                            .join('–')}{' '}
                          wt.% H₂
                        </strong>
                        <span>Empirical 90% interval</span>
                      </div>
                    ) : (
                      <p>Empirical interval unavailable.</p>
                    )}
                    <p className="secondary-text">
                      {result.model_id} · within the documented support rules
                    </p>
                    <p className="scientific-note">
                      Intervals reflect literature-held-out errors, with{' '}
                      {(
                        options.model.uncertainty_evaluation.coverage * 100
                      ).toFixed(1)}
                      % observed coverage. They are not a confidence score or
                      guarantee.
                    </p>
                  </>
                ) : (
                  <div className="unsupported">
                    <h4>Prediction unavailable</h4>
                    <p>
                      No exact literature match and no supported AI prediction.
                    </p>
                    <ul>
                      {result.support.reasons.map((code) => (
                        <li key={code}>{supportMessage(code)}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.support?.warnings.length > 0 && (
                  <div className="notice">
                    <strong>Support warnings</strong>
                    <ul>
                      {result.support.warnings.map((code) => (
                        <li key={code}>{supportMessage(code)}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="result-disclaimer">
            For research prioritization and educational exploration. AI
            predictions are not certified laboratory results; laboratory
            confirmation is required.
          </p>
        </div>
      </div>
      <PredictionLandscape inputs={normalized()} theme={theme} />
    </section>
  )
}
