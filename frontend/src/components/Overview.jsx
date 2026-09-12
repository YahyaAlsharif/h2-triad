import { Conditions, materialLabel } from './ExperimentDetails'
export default function Overview({ experiments }) {
  const best = experiments.reduce((a, b) =>
    a.hydrogen_capacity_wt_pct > b.hydrogen_capacity_wt_pct ? a : b,
  )
  return (
    <div className="overview">
      <div>
        <span className="metric-label">Experiments</span>
        <strong>{experiments.length}</strong>
      </div>
      <div>
        <span className="metric-label">Promising outcomes</span>
        <strong>
          {experiments.filter((item) => item.outcome === 'Promising').length}
        </strong>
      </div>
      <div className="best-metric">
        <span className="metric-label">Highest mock capacity</span>
        <strong>
          {best.hydrogen_capacity_wt_pct.toFixed(1)}{' '}
          <span className="metric-unit">wt%</span>
          <span className="metric-note">
            {materialLabel(best.inputs)}
            <br />
            <Conditions inputs={best.inputs} preparation />
          </span>
        </strong>
      </div>
    </div>
  )
}
