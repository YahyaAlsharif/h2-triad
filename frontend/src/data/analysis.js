// Presentation grouping only. Provenance does not determine scientific compatibility.
const fixedInputs = [
  'material',
  'concentration_wt_pct',
  'pressure_bar',
  'preparation_method',
  'milling_hours',
  'particle_size_nm',
]
export function measurementKey(record) {
  return JSON.stringify([
    record.measurement.mode,
    record.measurement.duration_minutes,
    record.measurement.capacity_basis,
  ])
}
export function deriveCohorts(experiments) {
  const groups = new Map()
  for (const record of experiments) {
    const key = JSON.stringify([
      ...fixedInputs.map((name) => record.inputs[name]),
      measurementKey(record),
    ])
    if (!groups.has(key))
      groups.set(key, {
        key,
        inputs: record.inputs,
        measurement: record.measurement,
        items: [],
      })
    groups.get(key).items.push(record)
  }
  return [...groups.values()].sort(
    (a, b) => b.items.length - a.items.length || a.key.localeCompare(b.key),
  )
}
export function cohortLabel(cohort) {
  const i = cohort.inputs
  const m = cohort.measurement
  return (
    i.material +
    ' · ' +
    i.concentration_wt_pct +
    ' wt% loading · ' +
    i.pressure_bar +
    ' bar · ' +
    i.preparation_method +
    ' · ' +
    i.milling_hours +
    ' h milling · ' +
    i.particle_size_nm +
    ' nm · ' +
    m.mode +
    ' · ' +
    m.duration_minutes +
    ' min · ' +
    m.capacity_basis
  )
}
