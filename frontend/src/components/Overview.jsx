import { Conditions, materialLabel } from './ExperimentDetails'
import { measurementKey } from '../data/analysis'
export default function Overview({ experiments }) {
  const comparableMeasurement =
    new Set(experiments.map(measurementKey)).size === 1
  const best = comparableMeasurement
    ? experiments.reduce((a, b) =>
        a.hydrogen_capacity_wt_pct > b.hydrogen_capacity_wt_pct ? a : b,
      )
    : null
  return (
    <div className="overview">
      <div>
        <span className="metric-label">Experiments</span>
        <strong>{experiments.length}</strong>
      </div>
      <div>
        <span className="metric-label">Stored promising outcomes</span>
        <strong>
          {experiments.filter((item) => item.outcome === 'Promising').length}
        </strong>
      </div>
      <div className="best-metric">
        <span className="metric-label">
          Highest stored capacity · conditions apply
        </span>
        {best ? (
          <>
            <strong>
              {best.hydrogen_capacity_wt_pct.toFixed(1)}{' '}
              <span className="metric-unit">wt%</span>
              <span className="metric-note">
                {materialLabel(best.inputs)}
                <br />
                <Conditions inputs={best.inputs} preparation />
              </span>
            </strong>
            <p className="metric-note">
              {best.measurement.mode} · {best.measurement.duration_minutes} min
              · {best.measurement.capacity_basis}
              <br />
              {best.source.is_demo ? 'Synthetic/demo · ' : ''}
              {best.source.label} · {best.source.reference}
            </p>
          </>
        ) : (
          <p className="metric-note">
            Different measurement modes, durations, or bases. Review compatible
            groups in Analysis.
          </p>
        )}
      </div>
    </div>
  )
}
