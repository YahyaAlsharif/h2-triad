# Activation-energy model target assessment

The canonical table contains 50 usable reported activation-energy values from 16 papers (15 core MgH2 papers and one extended reactive-hydride paper), covering 37 distinct samples and 23 catalyst/control system labels. Coverage is strongly asymmetric: 37 dehydrogenation values versus 13 hydrogenation values.

Hydrogenation values come from only four independent core papers. A paper-grouped validation split would therefore leave at most three hydrogenation papers for training in a single holdout and fewer in multi-fold evaluation. The rows within those papers are heavily clustered: loading/composition series and controls share preparation, apparatus, temperature programs, and calculation choices.

Method coverage is heterogeneous:

| Method label | Observations |
| --- | ---: |
| Kissinger | 15 |
| JMAK/Arrhenius | 21 |
| Isothermal Arrhenius | 4 |
| Sharp-Jones model/Arrhenius | 2 |
| Isothermal kinetic model/Arrhenius | 8 |

One FREE-17 sample has two dehydrogenation values from different methods, intentionally retained as separate scientific results. EXISTING-A resolves two desorption stages. These are not independent materials and must not be treated as extra independent experiments.

Feature/provenance coverage is also inadequate for a robust dual-target predictor: 44 of 50 rows lack a recoverable calculation temperature range, 41 lack reported uncertainty, and 35 do not explicitly state the molar basis as H2. Catalyst loading and preparation coverage vary by paper. Method labels cannot safely be discarded because Kissinger/DSC and isothermal kinetic estimates are not interchangeable targets.

The dehydrogenation subset may support descriptive analysis or a future method-stratified pilot, but the proposed paired hydrogenation/dehydrogenation model is not defensible under paper-held-out validation today. More independently sourced hydrogenation activation energies, with consistent method and condition metadata, are required.

Model 2 recommendation: DEFER
