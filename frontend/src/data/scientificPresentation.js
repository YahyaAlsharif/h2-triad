export const label = (value) => value.replaceAll('_', ' ')
export const capacity = (value) =>
  value == null ? 'Not reported' : String(value)
export function literatureValue(item) {
  const prefixes = {
    reported: '',
    approximately: '≈ ',
    greater_than: '> ',
    less_than: '< ',
    greater_than_or_equal: '≥ ',
    less_than_or_equal: '≤ ',
    '>': '> ',
    '<': '< ',
    '>=': '≥ ',
    '<=': '≤ ',
  }
  if (item.value_qualifier === 'range')
    return `${capacity(item.capacity_lower_wt_pct)}–${capacity(item.capacity_upper_wt_pct)}`
  return (
    (prefixes[item.value_qualifier] ?? `${item.value_qualifier}: `) +
    capacity(item.hydrogen_capacity_wt_pct)
  )
}
export function supportMessage(code) {
  const special = {
    pressure_bar_missing:
      'Pressure is unspecified; the model allows this with reduced experimental context.',
    catalyst_loading_wt_pct_missing:
      'Catalyst loading is unspecified; the model uses its learned missing-value handling.',
    some_catalyst_elements_unseen:
      'Some elements were absent from training; interpret this prediction cautiously.',
    unseen_support_material: 'This support material was absent from training.',
    catalyst_elements_entirely_unseen:
      'None of these catalyst elements were represented in training.',
    unseen_catalyst_family:
      'This catalyst family is outside the model support profile.',
  }
  return special[code] || label(code)
}
export function conditionSummary(inputs) {
  return `${label(inputs.measurement_mode)} · ${inputs.temperature_c === null ? inputs.temperature_reported : inputs.temperature_c + ' °C'} · ${inputs.duration_seconds} s · ${inputs.catalyst_loading_wt_pct === null ? 'unspecified loading' : inputs.catalyst_loading_wt_pct + ' wt.% loading'} · ${inputs.pressure_bar === null ? 'pressure unspecified' : (inputs.pressure_relation === '=' ? '' : inputs.pressure_relation + ' ') + inputs.pressure_bar + ' bar'}`
}
