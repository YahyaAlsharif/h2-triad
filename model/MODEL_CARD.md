# Model card: H2-TRIAD H2 capacity predictor v1

## Summary and intended use

`h2-triad-capacity-v1` estimates hydrogen absorption or desorption capacity, in wt.% H2, for MgH2 material/catalyst configurations inside the documented training domain. It is intended for research prioritization and educational exploration. It is not a certified laboratory predictor, process-control model, safety system, or substitute for experiment.

The champion is one `CatBoostRegressor` with 350 trees, depth 4, learning rate 0.03, L2 leaf regularization 10, seed 42, and single-threaded deterministic fitting. The 49,470-byte artifact serializes preprocessing and estimation together. Activation Energy Model remains deferred.

## Dataset and target

- Target: `hydrogen_capacity_wt_pct`.
- Evidence: 109 author-reported observations, 36 samples, and 16 independent core MgH2 papers.
- Modes: 50 absorption and 59 desorption observations.
- Values: 88 reported and 21 author-described approximate values; none were graph digitized.
- Excluded: Phase 3 synthetic/demo data, cycling, activation-energy, thermal-event, and extended reactive-composite records.
- Dataset SHA-256: `c2dcf229718217bafead375164a8053eab61091ff86352c027776d9825d550e4`.

Multiple observations within a paper are correlated through equipment, preparation, chemistry, and reporting practice. The dataset is small, catalyst families are imbalanced, pressure is missing in 39 rows, and there is no external laboratory validation.

## Feature and preprocessing contract

Raw predictive inputs are measurement mode, temperature, duration, catalyst loading, catalyst family, support material, and explicit catalyst components. Catalyst family is used only to derive `catalyst_present`; the granular family label is not one-hot encoded. Deterministic row-local features are log1p duration, loading-missing, support-reported, catalyst-present, and explicit component count.

The fitted predictor uses these ten fields:

- numeric: `temperature_c`, `duration_seconds`, `log_duration_seconds`, `catalyst_loading_wt_pct`, `loading_missing`, `support_reported`, `catalyst_present`, `explicit_component_count`;
- categorical: `measurement_mode`, `support_material`.

Numeric medians and categorical one-hot vocabularies are learned inside every training fold. Missing categorical support is explicit. Zero catalyst loading remains distinct from missing loading. Provenance IDs, grouping IDs, locators, extraction metadata, and the target cannot become predictors. Particle-size fields are excluded.

Pressure, granular catalyst family, elemental multi-hot features, preparation fields, milling details, exact catalyst identity, and engineered interactions were evaluated but not retained. `catalyst_elements` and the known family still participate in auditable support checking even when not represented directly in the estimator.

## Development and validation

The permanent progression covers median Dummy, Ridge/ElasticNet, incremental Feature A and identity-aware Feature B, regularized Random Forest and Extra Trees, shallow CatBoost, bounded grouped tuning, ablations, learning curves, and simple/weighted ensembles. Data augmentation: NOT USED. The source data does not report a defensible measurement-precision scale for input perturbations, so no synthetic experiment was fabricated.

Primary evidence is Leave-One-Group-Out by `source_id`: for each of 16 folds, preprocessing and fitting use 15 papers and predict the untouched paper. Hyperparameter search for promising models is nested and grouped inside the outer training papers. Every row receives exactly one held-out prediction. Random row splitting is not used as performance evidence.

The median Dummy baseline scored MAE 1.5243, RMSE 1.9853, and R2 -0.0979. Compact Ridge scored MAE 1.4147, RMSE 1.7556, and R2 0.1415. The champion scored:

| Paper-held-out metric | Result |
| --- | ---: |
| MAE | 1.1693 wt.% H2 |
| RMSE | 1.5493 wt.% H2 |
| R2 | 0.3314 |
| Median paper MAE | 0.9459 wt.% H2 |
| Worst paper MAE | 1.8496 wt.% H2 |
| Absorption MAE / RMSE | 1.2478 / 1.5871 wt.% H2 |
| Desorption MAE / RMSE | 1.1029 / 1.5165 wt.% H2 |

Relative to Dummy, MAE improved 23.3%, RMSE improved 22.0%, and paper MAE improved for 13 of 16 sources. Difficult papers remain visible in `per_source_metrics.csv`; FREE-9 is the worst held-out paper.

## Feature philosophy, ablations, and ensemble

Identity-aware Feature B did not show a clear robust advantage. On the locked deployment contract, adding exact identity worsened CatBoost MAE by 0.0055 and RMSE by 0.0087. Removing the granular catalyst-family category improved MAE by 0.0338 and RMSE by 0.0293. Removing pressure, elements, preparation fields, and engineered interactions also improved held-out error; removing milling details improved RMSE materially but MAE only slightly. Removing support information worsened MAE by 0.0570 and RMSE by 0.0394, so support was retained. These are predictive ablations, not scientific causal evidence.

The best single Random Forest scored MAE 1.1793 and RMSE 1.5816. A simple CatBoost/Random-Forest mean scored MAE 1.1645 and RMSE 1.5568; nested inverse-MAE weighting scored 1.1646 and 1.5571. Both slightly reduced MAE but worsened RMSE, absorption MAE, and worst-paper MAE versus CatBoost. Neither met the predeclared clear, distributed improvement rule, so no ensemble was retained.

## Sensitivities

- Strong chemistry-transfer test: among the paper-held-out predictions, the 88 observations whose catalyst-system group was absent from all training papers scored MAE 1.0029, RMSE 1.3354, R2 0.2342.
- Secondary catalyst-system-group LOGO: MAE 1.4255, RMSE 1.9619, R2 -0.0721. This is not the stronger chemistry-transfer claim because rows from another catalyst system in the same paper may remain in training.
- Pressure-known OOF slice (70 rows): MAE 1.1074, RMSE 1.4776, R2 0.3576. Pressure-missing slice (39 rows): 1.2806, 1.6703, 0.2876. A pressure-known-only retraining sensitivity scored 1.2731 / 1.6768 / 0.1727; pressure itself was therefore excluded from V1.
- Ordinary reported OOF slice (88 rows): MAE 1.0828, RMSE 1.4285, R2 0.4478. Approximate slice (21 rows): 1.5320, 1.9770, -1.3086. Retraining without approximate observations scored MAE 1.0736, RMSE 1.4164, R2 0.4572, but approximate values remain in primary training to avoid shrinking already limited evidence.

## Uncertainty

The output interval uses signed 5th/95th residual quantiles, calibrated by grouped cross-fitting without the outer paper. Observed OOF coverage was 86.2% overall, 86.0% absorption, and 86.4% desorption. Mean interval width was 5.0876 wt.% H2 overall (5.2395 absorption, 4.9588 desorption). It passed the preset coverage gate and is emitted, but its large width is a warning about limited evidence—not a confidence score or formal guarantee.

## Learning behavior

Repeated paper-group learning curves improved in mean held-out-paper MAE from 1.3623 with 3 training papers to 1.0731 with 14. Variance remained high (standard deviation 0.4400 at 14 papers), and the 5-to-8-paper segment was not monotonic. The model is data-limited rather than convincingly saturated; more independent papers, especially diverse catalysts and better pressure reporting, are likely to help more than additional correlated rows.

## Supported domain

Support rules are derived from the training data and applied before inference:

| Mode | Temperature (C) | Duration (s) | Pressure (bar) | Loading (wt.%) |
| --- | ---: | ---: | ---: | ---: |
| Absorption | 50 to 299.85 | 60 to 12,000 | 20 to 50, or missing with warning | 0 to 15, required |
| Desorption | 180 to 374.85 | 180 to 27,000 | 0 to 0.05, or missing with warning | 0 to 15, or missing with warning |

Inputs also require a represented catalyst family, explicit elements with at least one of the 18 known element symbols, and explicit catalyst components for non-control catalysts. An entirely unseen element set or family is unavailable. An unseen exact catalyst/additive name is allowed when family/elements and numeric conditions are supported. Unseen preparation/support labels produce warnings. Full vocabularies are machine-readable in `support_profile.json`.

## Limitations and known failure modes

- Large errors occur for some held-out papers and rare families; small-slice R2 values can be unstable or strongly negative.
- Approximate author values are substantially harder than ordinary reported values.
- Missing pressure associates with higher error, although using pressure as a predictor reduced cross-paper generalization.
- The model may regress extreme capacities toward the center and must not extrapolate beyond support ranges.
- Feature importance describes importance to this predictive model, not scientific causal importance.
- Intervals are empirical, wide, and calibrated only on the same literature corpus.
- No independent lab campaign, temporal validation, or external material system validates this model.

Use the model to rank or explore supported experiments, retain provenance and uncertainty in the UI, and require laboratory confirmation for scientific conclusions.
