# Phase 4A literature dataset schema

## Scope and conventions

The canonical dataset contains only verified full-text primary experimental articles. Reviews, methodology papers, project notes, inaccessible parent articles, and the synthetic Phase 3 SQLite seed records are excluded. The two extended reactive-hydride papers are retained in canonical tables for provenance but are excluded from the default MgH2 catalyst training view.

An empty CSV field means an unavailable, unreported, inapplicable, or deliberately unresolved value and becomes `null` in Parquet. A textual note distinguishes these cases when the distinction matters. Missing numeric values are never encoded as zero. A real reported zero, such as the source's `0 MPa` dehydrogenation condition, remains numeric zero with its raw representation preserved.

Normalized units are:

- temperature: degrees Celsius (`temperature_c`), using `C = K - 273.15` when the source reports kelvin;
- pressure: bar (`pressure_bar`), using `1 MPa = 10 bar` when a numeric absolute value is recoverable;
- duration: seconds (`duration_seconds`), using exact time-unit arithmetic;
- capacity: mass percent hydrogen (`hydrogen_capacity_wt_pct`) on the source-stated basis;
- activation energy: kJ/mol, with `molar_basis` preserving whether the paper explicitly states H2.

Raw temperature, pressure, duration, ratio, and particle-size strings are retained beside normalized values. Relational pressure qualifiers such as `<` are stored in `pressure_relation`. A physically ambiguous extracted pressure string is left unnormalized.

## `sources.csv`

One row per verified primary paper.

| Field | Meaning |
| --- | --- |
| `source_id` | Stable dataset grouping key. Phase 4B must use it for paper-held-out validation. |
| `paper_id` | Existing acquisition identifier such as `FREE-17`. |
| `doi`, `title`, `year`, `journal` | Bibliographic identity copied from verified acquisition records/PDFs. |
| `local_pdf_path`, `sha256`, `page_count` | Local full-text provenance and integrity fields. |
| `dataset_scope` | `core_mgh2` or `extended_reactive_composite`. |
| `source_type` | Always `primary_experimental_article` in this table. |
| `full_text_verified`, `readable` | Full-text verification flags. |
| `access_type`, `license_name`, `license_url` | Existing access/license information; blank when reuse terms are not asserted. |
| `included_in_capacity_training` | Whether observations from the source may enter the default derived view. |
| `source_note` | Source-level provenance caveat. |

Author lists are not duplicated here because the acquisition record did not consistently store them. DOI, title, path, and hash provide an unambiguous resolution path; FREE-17's full author list is documented in `extraction_notes.md` as part of its identity verification.

## `samples.csv`

One row per scientifically distinct material configuration used by at least one retained quantitative record or comparison.

| Field group | Fields and meaning |
| --- | --- |
| Identity | `sample_id`, `source_id`, `sample_label`, `experiment_group_id` |
| Material | `base_material`, `material_class`, `catalyst_additive_raw`, `catalyst_family` |
| Machine-readable chemistry | `catalyst_composition`, pipe-delimited `catalyst_components`, pipe-delimited `catalyst_elements`, `support_material` |
| Loading | `additive_loading_wt_pct`, `additive_ratio_raw` |
| Preparation | `preparation_method`, `milling_time_h`, `milling_speed_rpm`, `ball_to_powder_ratio`, `milling_atmosphere` |
| Catalyst history | `catalyst_synthesis_method`, `catalyst_pretreatment` |
| Size | `mgh2_particle_size_raw`, `catalyst_particle_size_raw` |
| Grouping | `catalyst_system_group` for stricter material-family holdout; `control_type` |
| Caveat | `sample_note` |

Components and elements are transcriptions of supported composition, not inferred stoichiometry. In-situ products are included only when the paper explicitly identifies them. A blank support can mean not applicable or not recoverable; Phase 4B should distinguish controls and unsupported catalysts using the other sample fields rather than treating blank as a chemical zero.

## `measurements.csv`

One row per retained ordinary absorption/desorption capacity observation. Separate time points from the same curve remain separate observations.

| Field group | Fields and meaning |
| --- | --- |
| Identity/FKs | `measurement_id`, `sample_id`, `source_id` |
| Experiment | `measurement_mode`, `experiment_type` |
| Conditions | raw and normalized temperature/pressure/duration fields plus `pressure_relation` |
| Target | `hydrogen_capacity_wt_pct`; optional `capacity_lower_wt_pct`/`capacity_upper_wt_pct` for an explicitly reported range |
| Semantics | `capacity_basis`, `value_qualifier`, `reported_uncertainty_wt_pct`, `cycle_number` |
| Provenance | `source_pdf_page`, `source_locator`, `extraction_type`, `extraction_note` |
| Derivation gate | `include_in_default_training` |

`value_qualifier` distinguishes ordinary reported values from `approximately`, `greater_than`, or `range`. Thresholds and ranges stay canonical but do not enter the default scalar-target table. `cycle_number` is retained for schema clarity but is empty here because actual cycling observations live in `cycling.csv`.

## `activation_energies.csv`

One row per activation-energy result. `reaction_direction`, `calculation_method`, and `molar_basis` prevent scientifically different values from being merged. A repeated sample/direction is valid when a different method or resolved reaction stage produced the value. The table also retains uncertainty, recoverable experimental range, PDF page, locator, extraction type, and caveat.

## `cycling.csv`

One row per explicitly reported cycle/mode observation. It stores cycle number, mode, conditions, duration, capacity, retention, retention reference, and source provenance. `combined` is used only when the paper reports a reversible/retained capacity without assigning it to absorption or desorption. These rows are canonical but never enter the default capacity training artifact.

## `thermal_events.csv`

Onset and peak temperatures from TPD/DSC/non-isothermal experiments are stored separately from isothermal capacity observations. `event_type`, `reaction_direction`, heating rate, pressure, and provenance keep these temperatures scientifically distinct.

## Processed capacity table

`processed/capacity_training.csv` and `.parquet` are deterministic joins of eligible `measurements.csv` rows to `samples.csv` and `sources.csv`. They contain 109 rows and 33 fields. Their target is `hydrogen_capacity_wt_pct`; `source_id` and `paper_id` are grouping metadata and must not be predictive features. `experiment_group_id` and `catalyst_system_group` permit stricter sensitivity analyses.

The builder requires a finite, nonnegative target, numeric temperature, numeric duration, core MgH2 scope, and an explicit eligibility flag. Pressure may be null because it is not consistently reported. No split or fold assignment is stored.
