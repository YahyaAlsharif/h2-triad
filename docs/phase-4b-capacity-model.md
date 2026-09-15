# Phase 4B: H2 capacity model

> Historical delivery record. See the [current project README](../README.md) and [release/source rights](licensing-and-data.md) for the current checkout.

Phase 4B is a standalone, leakage-aware model package for the literature-derived Phase 4A dataset. It does not alter the Phase 3 FastAPI/React behavior and does not begin Phase 5.

## Data verification and hygiene

The training input contains 109 observations from 16 core papers and 36 samples: 50 absorption, 59 desorption, 88 ordinary reported, and 21 approximate author-reported values. CSV and Parquet are equivalent. Provenance lineage resolves to the canonical source/sample/measurement tables. Phase 3 synthetic records, extended reactive composites, cycling, activation-energy, and thermal-event records are excluded.

Three canonical whitespace-only cells were normalized to empty CSV fields/null Parquet values: two catalyst-particle-size fields in core samples and one additive-loading field in an excluded extended sample. Validation now rejects whitespace-only canonical fields. The corrected processed CSV SHA-256 is `c2dcf229718217bafead375164a8053eab61091ff86352c027776d9825d550e4`.

## Experimental progression

All reported scores are paper-held-out OOF results using `LeaveOneGroupOut(source_id)`. Preprocessing is fitted within each fold. Dummy and linear baselines preceded nonlinear models. Feature groups were added and removed incrementally, with exact catalyst identity isolated as Feature B. Regularized Random Forest, Extra Trees, and CatBoost were compared before bounded nested grouped tuning. No arbitrary augmentation was attempted because the source evidence does not provide measurement precision suitable for defensible perturbation.

The complete machine-readable leaderboard is in `model/evaluation/leaderboard.csv`. Key steps are:

| Experiment | Model / contract | MAE | RMSE | R2 |
| --- | --- | ---: | ---: | ---: |
| D0 | Median Dummy | 1.5243 | 1.9853 | -0.0979 |
| L0 | Compact Ridge | 1.4147 | 1.7556 | 0.1415 |
| B0 | CatBoost, full Feature A | 1.2716 | 1.6942 | 0.2005 |
| T0 | Random Forest, full Feature A | 1.2753 | 1.7126 | 0.1830 |
| T5 | Nested-tuned Random Forest, deployment | 1.1834 | 1.5884 | 0.2973 |
| T8 | Random Forest, simplified deployment | 1.1793 | 1.5816 | 0.3032 |
| B9 | CatBoost, identical simplified deployment | **1.1693** | **1.5493** | **0.3314** |

The fixed conservative CatBoost configuration won after the Random Forest-guided feature contract was locked. It improved Dummy MAE by 23.3%, Dummy RMSE by 22.0%, and source MAE for 13 of 16 papers. Its absorption MAE/RMSE is 1.2478/1.5871; desorption is 1.1029/1.5165. Median and worst paper MAE are 0.9459 and 1.8496.

## Feature and model decisions

The final predictor uses measurement mode, temperature, duration and log-duration, catalyst loading and missingness, catalyst presence, explicit component count, support material, and a support-reported indicator. Granular family, pressure, elemental multi-hot fields, preparation, milling, exact identity, and two interactions were removed because CatBoost ablations did not improve held-out generalization. Support information was retained: removing it worsened MAE by 0.0570 and RMSE by 0.0394. The full CatBoost ablation table is `model/evaluation/ablation_results.csv`; the preceding Random Forest feature-selection table is retained separately.

No ensemble was retained. Simple averaging with Random Forest changed MAE/RMSE to 1.1645/1.5568, and nested inverse-MAE weighting to 1.1646/1.5571. The tiny MAE gain came with worse RMSE, absorption error, and worst-paper behavior, failing the clear/distributed-benefit rule.

## Generalization and sensitivity

The primary chemistry-transfer sensitivity is the source-held-out/system-unseen slice: 88 OOF observations from catalyst-system groups absent from the corresponding training papers achieved MAE 1.0029, RMSE 1.3354, and R2 0.2342.

Grouping directly by `catalyst_system_group` is secondary only: MAE 1.4255, RMSE 1.9619, R2 -0.0721. Another catalyst system from the same paper may remain in training, so this is not overstated as the stronger transfer test.

Pressure-known rows scored MAE/RMSE/R2 1.1074/1.4776/0.3576; pressure-missing rows scored 1.2806/1.6703/0.2876. Retraining on pressure-known data alone was worse at 1.2731/1.6768/0.1727. Ordinary reported rows scored 1.0828/1.4285/0.4478, while approximate rows scored 1.5320/1.9770/-1.3086. Removing approximate values during retraining improved the restricted-data score, but retaining them preserves coverage and the primary result reports them transparently.

Cross-fitted empirical 90% intervals cover 86.2% overall, 86.0% of absorption rows, and 86.4% of desorption rows. Their 5.0876 wt.% H2 mean width is large and must be visible to users.

The grouped learning curve declines from mean MAE 1.3623 at 3 training papers to 1.0731 at 14, with substantial variance. Evidence is still data-limited; acquisition should prioritize new independent papers and catalyst diversity.

## Delivered boundary

`model/predict.py` loads one 49,470-byte CatBoost/preprocessing artifact and performs support validation before any prediction. Supported results may include the empirical interval; unsupported and malformed inputs return no numeric prediction. The artifact metadata records the data fingerprint, versions, seed, feature contract, metrics, uncertainty, and decisions. Inference runs offline.

Phase 5 should import this exact prediction function and preserve `exact literature measurement > supported AI prediction > unavailable`. The Activation Energy Predictor remains deferred.
