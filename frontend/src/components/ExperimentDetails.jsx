export function materialLabel(inputs) {
  return (
    inputs.material +
    (inputs.additive === 'None'
      ? ' · No additive'
      : ' + ' + inputs.concentration_wt_pct + '% ' + inputs.additive)
  )
}
export function Conditions({ inputs, preparation = false }) {
  return (
    <span className="conditions">
      {inputs.temperature_c} °C · {inputs.pressure_bar} bar
      {preparation && (
        <>
          {' '}
          ·{' '}
          {inputs.preparation_method === 'Ball milling'
            ? inputs.milling_hours + ' h milling'
            : inputs.preparation_method}{' '}
          · {inputs.particle_size_nm} nm
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
