export function materialLabel(inputs) {
  return (
    inputs.material +
    (inputs.additive === 'None'
      ? ' · No additive'
      : ' + ' + inputs.concentration_wt_pct + ' wt% ' + inputs.additive)
  )
}
export function Conditions({ inputs, preparation = false }) {
  return (
    <span className="conditions">
      {inputs.temperature_c} °C · {inputs.pressure_bar} bar
      {preparation && (
        <>
          {' '}
          · {inputs.preparation_method} · {inputs.milling_hours} h milling ·{' '}
          {inputs.particle_size_nm} nm
        </>
      )}
    </span>
  )
}
export function Outcome({ value }) {
  return (
    <span className={'outcome outcome-' + value.toLowerCase()}>
      <span aria-hidden="true">
        {value === 'Promising' ? '↗' : value === 'Moderate' ? '−' : '↓'}
      </span>{' '}
      {value}
    </span>
  )
}
export function MeasurementDetails({ item }) {
  return (
    <dl className="measurement-details">
      <div>
        <dt>Measurement</dt>
        <dd>
          {item.measurement.mode} · {item.measurement.duration_minutes} min
        </dd>
      </div>
      <div>
        <dt>Capacity basis</dt>
        <dd>{item.measurement.capacity_basis}</dd>
      </div>
      <div>
        <dt>Source</dt>
        <dd>
          {item.source.is_demo ? 'Synthetic/demo · ' : ''}
          {item.source.label}
          <br />
          {item.source.reference}
        </dd>
      </div>
    </dl>
  )
}
