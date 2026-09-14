# Phase 4A data quality report

## Inventory

| Metric | Count |
| --- | ---: |
| Verified primary papers inspected | 18 |
| Core MgH2 papers contributing usable rows | 16 |
| Extended primary papers retained canonically | 2 |
| Canonical samples | 45 |
| Canonical ordinary capacity observations | 124 |
| Default usable capacity observations | 109 |
| Samples represented in the default table | 36 |
| Activation-energy observations | 50 |
| Cycling observations | 36 |
| Thermal onset/peak events | 27 |

The 109-row default table contains 50 absorption and 59 desorption observations. All 109 are explicitly author-reported; zero are graph-digitized. Eighty-eight use an ordinary reported qualifier and 21 preserve an approximation qualifier.

## Ranges and coverage

For the default capacity table:

- temperature: 50 to 374.85 C;
- normalized reported pressure: 0 to 50 bar among non-null values;
- duration: 60 to 27,000 s;
- capacity: 0.20 to 7.20 wt.% H2.

The `0 bar` value is a source-reported dehydrogenation condition and not an imputed missing value. Vacuum/ambiguous conditions are otherwise textual with a null normalized pressure.

The most represented catalyst-family labels by observation are: no additive/control 21; carbon-supported oxide 12; carbon-supported bimetal 10; bimetallic oxide 9; alkali-modified oxide 7; bimetallic alloy 7; carbon-supported carbide/metal 6; carbon-supported metal/oxide 6. Remaining families contribute five or fewer rows each. Counts reflect retained time points, not independent studies.

## Important feature missingness

| Feature | Missing rows | Missing share |
| --- | ---: | ---: |
| `pressure_bar` | 39 | 35.8% |
| `catalyst_loading_wt_pct` | 4 | 3.7% |
| `support_material` | 58 | 53.2% |
| `milling_time_h` | 13 | 11.9% |
| `milling_speed_rpm` | 27 | 24.8% |
| `mgh2_particle_size_raw` | 102 | 93.6% |
| `catalyst_particle_size_raw` | 93 | 85.3% |

Blank support fields combine unsupported/not-applicable configurations and cases where no separate support was recoverable; Phase 4B should derive an explicit support-presence feature from the chemistry fields rather than equate blank with zero. Particle-size fields are too sparse for a default mandatory feature and should initially be optional or excluded from baseline models.

## Duplicates, normalization, and provenance

No exact duplicate exists across sample, mode, normalized conditions, duration, and capacity in the processed table. Several near-duplicates are intentional time points from the same curve or parallel controls under the same conditions. They must remain grouped by paper and should also be stress-tested with `experiment_group_id` or `catalyst_system_group`.

Unit conversions use 1 MPa = 10 bar, C = K - 273.15, and exact second conversion. Raw units are retained. Missingness is null, never zero. Source PDF page, figure/table/section locator, and extraction type are populated for every fact row.

## Limitations and imbalance

- The corpus is small at the independent-paper level: 16 core papers despite 109 rows.
- Multiple points from a curve and multiple samples from one paper are correlated. A random-row split would leak paper-specific protocol and chemistry information.
- Pressure is missing for 35.8% of training rows and pressure protocols differ between laboratories.
- The corpus is dominated by recent Journal of Magnesium and Alloys papers and by oxide/carbon-supported catalyst systems.
- Controls contribute 21 rows. Some catalyst families contain only one paper, so family-held-out validation will be high variance.
- Catalyst loading is well covered numerically, but one paired Mn/Cu study does not report a recoverable loading.
- Particle size, uncertainty, replicate count, and exact capacity basis are rarely stated.
- Approximate author-reported values remain lower precision than table values even though they are not digitized.
- The dataset is an auditable high-precision subset, not an exhaustive digitization of every plotted curve.

Phase 4B must hold out entire `source_id` groups, report uncertainty across grouped folds, compare simple/tabular baselines, and avoid treating row count as independent sample size.
