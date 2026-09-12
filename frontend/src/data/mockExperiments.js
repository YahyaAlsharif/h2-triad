// Phase 2 fixtures only. These records are synthetic, not literature or lab evidence.
// Units are explicit so a future API can preserve the same response contract.
export const mockOptions = {
  materials: ['MgH₂', 'NaAlH₄'],
  additives: ['Ni', 'Fe–Ni / N-C', 'TiF₃', 'None'],
  methods: ['Ball milling', 'Solution mixing'],
}
export const defaultInputs = {
  material: 'MgH₂',
  additive: 'Ni',
  concentration_wt_pct: 5,
  preparation_method: 'Ball milling',
  milling_hours: 4,
  particle_size_nm: 100,
  temperature_c: 300,
  pressure_bar: 10,
}
const record = (
  id,
  additive,
  temperature,
  capacity,
  outcome,
  overrides = {},
) => ({
  id,
  inputs: {
    ...defaultInputs,
    additive,
    temperature_c: temperature,
    ...overrides,
  },
  hydrogen_capacity_wt_pct: capacity,
  outcome,
  measurement: {
    mode: 'Hydrogen absorption',
    duration_minutes: 20,
    capacity_basis: 'Total composite mass',
  },
  source: {
    kind: 'mock',
    label: 'Synthetic demo fixture',
    reference: 'Phase 2 / ' + id,
  },
})
export const mockExperiments = [
  record('EXP-001', 'Ni', 250, 4.8, 'Moderate'),
  record('EXP-002', 'Ni', 275, 5.5, 'Promising'),
  record('EXP-003', 'Ni', 300, 6.1, 'Promising'),
  record('EXP-004', 'Fe–Ni / N-C', 250, 5.2, 'Moderate'),
  record('EXP-005', 'Fe–Ni / N-C', 275, 5.9, 'Promising'),
  record('EXP-006', 'Fe–Ni / N-C', 300, 6.4, 'Promising'),
  record('EXP-007', 'TiF₃', 250, 4.4, 'Moderate'),
  record('EXP-008', 'TiF₃', 275, 5.1, 'Moderate'),
  record('EXP-009', 'TiF₃', 300, 5.8, 'Promising'),
  record('EXP-010', 'None', 300, 3.2, 'Limited', { concentration_wt_pct: 0 }),
  record('EXP-011', 'Ni', 300, 6.3, 'Promising', {
    pressure_bar: 20,
    milling_hours: 8,
    particle_size_nm: 80,
  }),
  record('EXP-012', 'TiF₃', 280, 3.8, 'Moderate', {
    material: 'NaAlH₄',
    concentration_wt_pct: 3,
    preparation_method: 'Solution mixing',
    milling_hours: 0,
    particle_size_nm: 150,
  }),
]
export const mockPredictionFixtures = [
  {
    id: 'DEMO-NI-300',
    inputs: { ...defaultInputs },
    outcome: 'Promising',
    confidence_pct: 84,
    hydrogen_capacity_wt_pct: 6.2,
    desorption_temperature_c: 285,
  },
  {
    id: 'DEMO-FENI-300',
    inputs: { ...defaultInputs, additive: 'Fe–Ni / N-C' },
    outcome: 'Promising',
    confidence_pct: 87,
    hydrogen_capacity_wt_pct: 6.5,
    desorption_temperature_c: 270,
  },
  {
    id: 'DEMO-TIF3-300',
    inputs: { ...defaultInputs, additive: 'TiF₃' },
    outcome: 'Moderate',
    confidence_pct: 78,
    hydrogen_capacity_wt_pct: 5.7,
    desorption_temperature_c: 295,
  },
  {
    id: 'DEMO-BASELINE-300',
    inputs: { ...defaultInputs, additive: 'None', concentration_wt_pct: 0 },
    outcome: 'Limited',
    confidence_pct: 72,
    hydrogen_capacity_wt_pct: 3.4,
    desorption_temperature_c: 340,
  },
].map((fixture) => ({
  ...fixture,
  source: { kind: 'mock', label: 'Synthetic demo fixture' },
}))
export const initialComparisonIds = ['EXP-003', 'EXP-006', 'EXP-009']
export const inputKeys = Object.keys(defaultInputs)
export const mockChartCohort = {
  inputs: {
    material: 'MgH₂',
    concentration_wt_pct: 5,
    pressure_bar: 10,
    milling_hours: 4,
    particle_size_nm: 100,
    preparation_method: 'Ball milling',
  },
  measurement: {
    mode: 'Hydrogen absorption',
    duration_minutes: 20,
    capacity_basis: 'Total composite mass',
  },
  additives: ['Ni', 'Fe–Ni / N-C', 'TiF₃'],
}
