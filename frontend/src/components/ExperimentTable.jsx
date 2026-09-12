import { useState } from 'react'
import {
  Conditions,
  materialLabel,
  Outcome,
  MeasurementDetails,
} from './ExperimentDetails'
export default function ExperimentTable({
  experiments,
  selectedIds,
  toggleComparison,
  loadConfiguration,
  optionsReady,
}) {
  const [query, setQuery] = useState('')
  const [outcome, setOutcome] = useState('All outcomes')
  const [sort, setSort] = useState('id')
  const [expanded, setExpanded] = useState(null)
  const visible = experiments
    .filter(
      (item) =>
        (outcome === 'All outcomes' || item.outcome === outcome) &&
        (
          materialLabel(item.inputs) +
          ' ' +
          item.id +
          ' ' +
          item.inputs.preparation_method
        )
          .toLowerCase()
          .includes(query.toLowerCase().trim()),
    )
    .sort((a, b) =>
      sort === 'capacity'
        ? b.hydrogen_capacity_wt_pct - a.hydrogen_capacity_wt_pct
        : a.id.localeCompare(b.id),
    )
  return (
    <section id="experiments" aria-labelledby="experiments-title">
      <div className="section-heading">
        <h2 id="experiments-title">Experimental dataset</h2>
        <span className="secondary-text" role="status">
          {visible.length} of {experiments.length} experiments
        </span>
      </div>
      <div className="dataset-panel">
        <div className="dataset-toolbar">
          <label className="search-field">
            <span className="sr-only">Search experiments</span>
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m16 16 5 5" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search material, additive, or ID"
            />
          </label>
          <label>
            <span className="sr-only">Filter by outcome</span>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
            >
              {[
                'All outcomes',
                ...new Set(experiments.map((item) => item.outcome)),
              ].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Sort experiments</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="id">Experiment ID</option>
              <option value="capacity">Highest capacity</option>
            </select>
          </label>
        </div>
        <p className="dataset-hint">
          Select up to 3 to compare. Review measurement basis and provenance in
          each record. Outcome labels are stored categories.
        </p>
        {visible.length ? (
          <table className="experiment-table">
            <caption className="sr-only">
              Stored experiments. Open each record for complete measurement
              conditions and provenance.
            </caption>
            <thead>
              <tr>
                <th>
                  <span className="sr-only">Compare</span>
                </th>
                <th>Material / additive</th>
                <th>Test conditions</th>
                <th>H₂ capacity</th>
                <th>Outcome</th>
                <th>
                  <span className="sr-only">Details</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <ExperimentRows
                  key={item.id}
                  item={item}
                  checked={selectedIds.includes(item.id)}
                  atLimit={selectedIds.length >= 3}
                  toggleComparison={toggleComparison}
                  expanded={expanded === item.id}
                  onExpand={() =>
                    setExpanded(expanded === item.id ? null : item.id)
                  }
                  loadConfiguration={loadConfiguration}
                  optionsReady={optionsReady}
                />
              ))}
            </tbody>
          </table>
        ) : (
          <div className="dataset-empty">
            <h3>No matching experiments</h3>
            <p>Try a different material or outcome.</p>
            <button
              className="button secondary"
              onClick={() => {
                setQuery('')
                setOutcome('All outcomes')
              }}
            >
              Clear filters
            </button>
          </div>
        )}
        <div className="dataset-footer">
          <span>
            {experiments.filter((item) => item.source.is_demo).length}{' '}
            synthetic/demo records · {experiments.length} total
          </span>
          <span>{selectedIds.length} selected for comparison</span>
        </div>
      </div>
    </section>
  )
}
function ExperimentRows({
  item,
  checked,
  atLimit,
  toggleComparison,
  expanded,
  onExpand,
  loadConfiguration,
  optionsReady,
}) {
  return (
    <>
      <tr className={checked ? 'is-selected' : ''}>
        <td className="selection-cell">
          <label
            className="checkbox-target"
            title={
              !checked && atLimit
                ? 'Remove a selected experiment to compare another'
                : 'Compare ' + item.id
            }
          >
            <input
              type="checkbox"
              aria-label={'Compare ' + item.id}
              checked={checked}
              disabled={!checked && atLimit}
              onChange={() => toggleComparison(item.id)}
            />
          </label>
        </td>
        <td className="material-cell">
          <span className="record-id">{item.id}</span>
          <strong>{materialLabel(item.inputs)}</strong>
        </td>
        <td className="test-cell">
          <Conditions inputs={item.inputs} />
          <span className="preparation-meta">
            {item.inputs.preparation_method} · {item.inputs.milling_hours} h
            milling · {item.inputs.particle_size_nm} nm
          </span>
        </td>
        <td className="capacity-cell">
          <strong>{item.hydrogen_capacity_wt_pct.toFixed(1)}</strong>{' '}
          <span>wt%</span>
        </td>
        <td className="outcome-cell">
          <Outcome value={item.outcome} />
        </td>
        <td className="details-cell">
          <button
            className="details-button"
            aria-expanded={expanded}
            aria-controls={expanded ? 'detail-' + item.id : undefined}
            aria-label={
              (expanded ? 'Hide' : 'Show') + ' details for ' + item.id
            }
            onClick={onExpand}
          >
            {expanded ? '−' : '+'}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="expanded-row" id={'detail-' + item.id}>
          <td colSpan={6}>
            <div className="experiment-detail">
              <MeasurementDetails item={item} />
              <button
                className="button secondary"
                disabled={!optionsReady}
                onClick={() => loadConfiguration(item)}
              >
                Use in Digital Twin <span aria-hidden="true">↑</span>
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
