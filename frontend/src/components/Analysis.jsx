import { useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Conditions, materialLabel, Outcome } from './ExperimentDetails'

const seriesStyles = [
  { color: 'var(--accent)', dash: undefined },
  { color: 'var(--chart-blue)', dash: '6 3' },
  { color: 'var(--chart-amber)', dash: '2 4' },
]
function ChartTip({ active, payload, label, cohort }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <strong>{label} °C</strong>
      {payload.map((item) => (
        <div key={item.dataKey}>
          {item.name}
          <b>{item.value} wt%</b>
        </div>
      ))}
      <p>
        {cohort.inputs.pressure_bar} bar · {cohort.inputs.milling_hours} h
        milling · {cohort.inputs.particle_size_nm} nm
      </p>
    </div>
  )
}
const compareFields = [
  ['Temperature', (e) => e.inputs.temperature_c + ' °C'],
  ['Hydrogen pressure', (e) => e.inputs.pressure_bar + ' bar'],
  ['Preparation', (e) => e.inputs.preparation_method],
  ['Milling time', (e) => e.inputs.milling_hours + ' h'],
  ['Particle size', (e) => e.inputs.particle_size_nm + ' nm'],
  ['Measurement', (e) => e.measurement.mode],
  ['Duration', (e) => e.measurement.duration_minutes + ' min'],
  ['Capacity basis', (e) => e.measurement.capacity_basis],
]
export default function Analysis({
  experiments,
  selectedIds,
  toggleComparison,
  cohort,
}) {
  const series = cohort.additives.map((name, index) => ({
    name,
    ...seriesStyles[index % seriesStyles.length],
  }))
  const [visibleSeries, setVisibleSeries] = useState(
    series.map((item) => item.name),
  )
  const selected = selectedIds
    .map((id) => experiments.find((item) => item.id === id))
    .filter(Boolean)
  // Keep every condition except temperature matched; never combine unmatched records into a trend.
  const matched = experiments.filter(
    ({ inputs, measurement }) =>
      Object.entries(cohort.inputs).every(
        ([key, value]) => inputs[key] === value,
      ) &&
      Object.entries(cohort.measurement).every(
        ([key, value]) => measurement[key] === value,
      ),
  )
  const chartData = [
    ...new Set(matched.map((item) => item.inputs.temperature_c)),
  ]
    .sort((a, b) => a - b)
    .map((temperature) => ({
      temperature,
      ...Object.fromEntries(
        matched
          .filter((item) => item.inputs.temperature_c === temperature)
          .map((item) => [item.inputs.additive, item.hydrogen_capacity_wt_pct]),
      ),
    }))
  const differences = compareFields
    .filter(([, value]) => new Set(selected.map(value)).size > 1)
    .map(([name]) => name.toLowerCase())
  return (
    <section id="analysis" aria-labelledby="analysis-title">
      <div className="section-heading">
        <h2 id="analysis-title">Comparison & analysis</h2>
        <span className="secondary-text">Synthetic experiments</span>
      </div>
      <div className="analysis-layout">
        <div className="chart-panel">
          <h3>Capacity vs temperature</h3>
          <p className="chart-context">
            {cohort.inputs.material} + {cohort.inputs.concentration_wt_pct} wt%
            additive · {cohort.inputs.pressure_bar} bar
            <br />
            {cohort.inputs.milling_hours} h ball milling ·{' '}
            {cohort.inputs.particle_size_nm} nm ·{' '}
            {cohort.measurement.duration_minutes} min absorption
          </p>
          <div
            className="series-controls"
            role="group"
            aria-label="Chart additives"
          >
            {series.map((item) => (
              <button
                key={item.name}
                type="button"
                aria-pressed={visibleSeries.includes(item.name)}
                onClick={() =>
                  setVisibleSeries((current) =>
                    current.includes(item.name)
                      ? current.filter((name) => name !== item.name)
                      : [...current, item.name],
                  )
                }
              >
                <span
                  style={{
                    borderColor: item.color,
                    borderTopStyle: item.dash ? 'dashed' : 'solid',
                  }}
                  className="series-symbol"
                  aria-hidden="true"
                />
                {item.name}
              </button>
            ))}
          </div>
          <div className="chart-axis-label">Hydrogen capacity (wt%)</div>
          <div
            className="capacity-chart"
            role="group"
            aria-label="Mock capacity by temperature. Exact values are available in View chart data."
          >
            {visibleSeries.length ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart
                  data={chartData}
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
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    ticks={chartData.map((item) => item.temperature)}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'var(--muted)', fontSize: 13 }}
                    tickMargin={12}
                  />
                  <YAxis
                    domain={[0, 8]}
                    ticks={[0, 2, 4, 6, 8]}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'var(--muted)', fontSize: 13 }}
                  />
                  <Tooltip
                    content={<ChartTip cohort={cohort} />}
                    cursor={{ stroke: 'var(--control-border)' }}
                  />
                  {series
                    .filter((item) => visibleSeries.includes(item.name))
                    .map((item) => (
                      <Line
                        key={item.name}
                        type="linear"
                        name={item.name}
                        dataKey={item.name}
                        stroke={item.color}
                        strokeWidth={2.5}
                        strokeDasharray={item.dash}
                        dot={{ r: 4, strokeWidth: 2, fill: 'var(--surface)' }}
                        activeDot={{ r: 6 }}
                        isAnimationActive={false}
                      />
                    ))}
                </LineChart>
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
            <table>
              <caption className="sr-only">
                Matched mock experiments; capacity in wt% of total composite
                mass
              </caption>
              <thead>
                <tr>
                  <th>Temperature</th>
                  {series
                    .filter((s) => visibleSeries.includes(s.name))
                    .map((s) => (
                      <th key={s.name}>{s.name}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {chartData.map((row) => (
                  <tr key={row.temperature}>
                    <th>{row.temperature} °C</th>
                    {series
                      .filter((s) => visibleSeries.includes(s.name))
                      .map((s) => (
                        <td key={s.name}>{row[s.name]} wt%</td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
          <p className="chart-footnote">
            Matched preparation and pressure. Lines connect mock observations;
            they are not a fitted model.
          </p>
        </div>
        <div className="comparison-panel">
          <div className="panel-heading">
            <h3>Selected experiments</h3>
            <span className="secondary-text">{selected.length} / 3</span>
          </div>
          {selected.length > 0 ? (
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
                  : 'Matched preparation and test conditions.'}
              </p>
              <div className="selected-list">
                {selected.map((item) => (
                  <div className="selected-experiment" key={item.id}>
                    <div>
                      <span className="record-id">{item.id}</span>
                      <strong>{materialLabel(item.inputs)}</strong>
                      <Conditions inputs={item.inputs} preparation />
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
                          className={
                            new Set(selected.map(value)).size > 1
                              ? 'different-condition'
                              : ''
                          }
                          key={name}
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
