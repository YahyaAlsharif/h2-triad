import { useState } from 'react'
import {
  CartesianGrid,
  Scatter,
  ScatterChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Conditions,
  materialLabel,
  Outcome,
  MeasurementDetails,
} from './ExperimentDetails'
import { deriveCohorts, cohortLabel } from '../data/analysis'

const seriesStyles = [
  { color: 'var(--accent)', shape: 'circle' },
  { color: 'var(--chart-blue)', shape: 'triangle' },
  { color: 'var(--chart-amber)', shape: 'square' },
]
function ChartTip({ active, payload }) {
  if (!active || !payload?.length) return null
  const record = payload[0].payload.record
  return (
    <div className="chart-tooltip">
      <strong>
        {record.id} · {materialLabel(record.inputs)}
      </strong>
      <div>
        {record.inputs.temperature_c} °C{' '}
        <b>{record.hydrogen_capacity_wt_pct} wt%</b>
      </div>
      <Conditions inputs={record.inputs} preparation />
      <MeasurementDetails item={record} />
    </div>
  )
}
const compareFields = [
  ['Base material', (e) => e.inputs.material],
  ['Additive', (e) => e.inputs.additive],
  ['Loading', (e) => e.inputs.concentration_wt_pct + ' wt%'],
  ['Temperature', (e) => e.inputs.temperature_c + ' °C'],
  ['Hydrogen pressure', (e) => e.inputs.pressure_bar + ' bar'],
  ['Preparation', (e) => e.inputs.preparation_method],
  ['Milling time', (e) => e.inputs.milling_hours + ' h'],
  ['Particle size', (e) => e.inputs.particle_size_nm + ' nm'],
  ['Measurement', (e) => e.measurement.mode],
  ['Duration', (e) => e.measurement.duration_minutes + ' min'],
  ['Capacity basis', (e) => e.measurement.capacity_basis],
]
function CohortChart({ cohort }) {
  const [hiddenSeries, setHiddenSeries] = useState([])
  const series = [...new Set(cohort.items.map((item) => item.inputs.additive))]
    .sort()
    .map((name, index) => ({
      name,
      ...seriesStyles[index % seriesStyles.length],
    }))
  const visible = cohort.items.filter(
    (item) => !hiddenSeries.includes(item.inputs.additive),
  )
  const temperatures = [
    ...new Set(cohort.items.map((item) => item.inputs.temperature_c)),
  ].sort((a, b) => a - b)
  return (
    <>
      <p className="chart-context">{cohortLabel(cohort)}</p>
      <div
        className="series-controls"
        role="group"
        aria-label="Chart additives"
      >
        {series.map((item) => (
          <button
            key={item.name}
            type="button"
            aria-pressed={!hiddenSeries.includes(item.name)}
            onClick={() =>
              setHiddenSeries((current) =>
                current.includes(item.name)
                  ? current.filter((name) => name !== item.name)
                  : [...current, item.name],
              )
            }
          >
            <span style={{ color: item.color }} aria-hidden="true">
              {item.shape === 'circle'
                ? '●'
                : item.shape === 'triangle'
                  ? '▲'
                  : '■'}
            </span>
            {item.name}
          </button>
        ))}
      </div>
      {temperatures.length < 2 && (
        <p className="chart-footnote">
          Only one temperature is available in this group. Points show
          individual stored observations.
        </p>
      )}
      <div className="chart-axis-label">Hydrogen capacity (wt%)</div>
      <div
        className="capacity-chart"
        role="group"
        aria-label="Stored capacity by temperature. Each point is an observation. Values and sources are available in View chart data."
      >
        {visible.length ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <ScatterChart
              margin={{ top: 16, right: 22, bottom: 8, left: -18 }}
              accessibilityLayer
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--border)"
                strokeDasharray="3 4"
              />
              <XAxis
                dataKey="temperature"
                name="Temperature"
                unit=" °C"
                type="number"
                domain={['dataMin', 'dataMax']}
                ticks={temperatures}
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--muted)', fontSize: 13 }}
                tickMargin={12}
              />
              <YAxis
                dataKey="capacity"
                name="Hydrogen capacity"
                unit=" wt%"
                type="number"
                domain={[0, 'auto']}
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--muted)', fontSize: 13 }}
              />
              <Tooltip
                content={<ChartTip />}
                cursor={{ stroke: 'var(--control-border)' }}
              />
              {series
                .filter((item) => !hiddenSeries.includes(item.name))
                .map((item) => (
                  <Scatter
                    key={item.name}
                    name={item.name}
                    fill={item.color}
                    shape={item.shape}
                    isAnimationActive={false}
                    data={cohort.items
                      .filter((record) => record.inputs.additive === item.name)
                      .map((record) => ({
                        temperature: record.inputs.temperature_c,
                        capacity: record.hydrogen_capacity_wt_pct,
                        record,
                      }))}
                  />
                ))}
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <div className="chart-empty">
            Select an additive to show its series.
          </div>
        )}
      </div>
      <p className="chart-x-label">Temperature (°C)</p>
      <details className="chart-data">
        <summary>View chart data</summary>
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Chart observations and provenance"
        >
          <table>
            <caption>{cohortLabel(cohort)}</caption>
            <thead>
              <tr>
                <th>Experiment</th>
                <th>Additive</th>
                <th>Temperature</th>
                <th>Capacity</th>
                <th>Provenance</th>
              </tr>
            </thead>
            <tbody>
              {visible
                .slice()
                .sort(
                  (a, b) =>
                    a.inputs.temperature_c - b.inputs.temperature_c ||
                    a.id.localeCompare(b.id),
                )
                .map((record) => (
                  <tr key={record.id}>
                    <th>{record.id}</th>
                    <td>{record.inputs.additive}</td>
                    <td>{record.inputs.temperature_c} °C</td>
                    <td>{record.hydrogen_capacity_wt_pct} wt%</td>
                    <td>
                      {record.source.is_demo ? 'Synthetic/demo · ' : ''}
                      {record.source.label}
                      <br />
                      {record.source.reference}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </details>
      <p className="chart-footnote">
        Matched preparation, pressure, loading, and measurement metadata.
        Sources may differ. No fitted curve, interpolation, or prediction.
        Overlapping points remain separate records in the data table.
      </p>
    </>
  )
}
export default function Analysis({
  experiments,
  selectedIds,
  toggleComparison,
}) {
  const cohorts = deriveCohorts(experiments)
  const [cohortKey, setCohortKey] = useState(null)
  const cohort = cohorts.find((item) => item.key === cohortKey) || cohorts[0]
  const selected = selectedIds
    .map((id) => experiments.find((item) => item.id === id))
    .filter(Boolean)
  const differences = compareFields
    .filter(([, value]) => new Set(selected.map(value)).size > 1)
    .map(([name]) => name.toLowerCase())
  return (
    <section id="analysis" aria-labelledby="analysis-title">
      <div className="section-heading">
        <h2 id="analysis-title">Comparison & analysis</h2>
        <span className="secondary-text">Stored observations</span>
      </div>
      <div className="analysis-layout">
        <div className="chart-panel">
          <h3>Capacity vs temperature</h3>
          <label className="cohort-selector">
            <span>Compatible conditions</span>
            <select
              value={cohort.key}
              onChange={(event) => setCohortKey(event.target.value)}
            >
              {cohorts.map((item) => (
                <option key={item.key} value={item.key}>
                  {cohortLabel(item)} · {item.items.length} records
                </option>
              ))}
            </select>
          </label>
          <CohortChart key={cohort.key} cohort={cohort} />
        </div>
        <div className="comparison-panel">
          <div className="panel-heading">
            <h3>Selected experiments</h3>
            <span className="secondary-text">{selected.length} / 3</span>
          </div>
          {selected.length ? (
            <>
              <p
                className={
                  differences.length
                    ? 'notice comparison-notice'
                    : 'comparison-context'
                }
              >
                {differences.length
                  ? 'Different conditions: ' +
                    differences.join(', ') +
                    '. Compare with care.'
                  : 'Matched preparation, material, and measurement conditions.'}
              </p>
              <div className="selected-list">
                {selected.map((item) => (
                  <div className="selected-experiment" key={item.id}>
                    <div>
                      <span className="record-id">{item.id}</span>
                      <strong>{materialLabel(item.inputs)}</strong>
                      <Conditions inputs={item.inputs} preparation />
                      <span className="secondary-text">
                        {item.measurement.mode} ·{' '}
                        {item.measurement.duration_minutes} min ·{' '}
                        {item.measurement.capacity_basis}
                      </span>
                      <span className="secondary-text">
                        {item.source.is_demo ? 'Synthetic/demo · ' : ''}
                        {item.source.label} · {item.source.reference}
                      </span>
                    </div>
                    <div className="selected-value">
                      <strong>
                        {item.hydrogen_capacity_wt_pct.toFixed(1)}{' '}
                        <small>wt%</small>
                      </strong>
                      <button
                        className="remove-button"
                        aria-label={'Remove ' + item.id + ' from comparison'}
                        onClick={() => toggleComparison(item.id)}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <details className="comparison-detail">
                <summary>Compare all conditions</summary>
                <div
                  className="table-scroll"
                  tabIndex={0}
                  role="region"
                  aria-label="Detailed comparison"
                >
                  <table>
                    <thead>
                      <tr>
                        <th>Condition</th>
                        {selected.map((item) => (
                          <th key={item.id}>{item.id}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {compareFields.map(([name, value]) => (
                        <tr
                          key={name}
                          className={
                            new Set(selected.map(value)).size > 1
                              ? 'different-condition'
                              : ''
                          }
                        >
                          <th>{name}</th>
                          {selected.map((item) => (
                            <td key={item.id}>{value(item)}</td>
                          ))}
                        </tr>
                      ))}
                      <tr>
                        <th>Outcome</th>
                        {selected.map((item) => (
                          <td key={item.id}>
                            <Outcome value={item.outcome} />
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <th>Provenance</th>
                        {selected.map((item) => (
                          <td key={item.id}>
                            {item.source.is_demo ? 'Synthetic/demo · ' : ''}
                            {item.source.label} · {item.source.reference}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          ) : (
            <div className="comparison-empty">
              <h4>No experiments selected</h4>
              <p>Select up to three experiments in the dataset below.</p>
            </div>
          )}
          <a href="#experiments" className="text-link">
            Choose experiments <span aria-hidden="true">↓</span>
          </a>
        </div>
      </div>
    </section>
  )
}
