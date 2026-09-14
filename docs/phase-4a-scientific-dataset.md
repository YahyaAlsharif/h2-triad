# Phase 4A: literature extraction and ML-ready dataset

## Delivered outcome

Phase 4A converts the verified local primary-literature corpus into normalized, provenance-preserving scientific tables and a deterministic capacity-model input table. It does not train a model and does not integrate literature records into the Phase 3 SQLite application.

The canonical scientific dataset is under `data/phase4_dataset/`. It contains 18 verified primary papers, 45 distinct samples, 124 ordinary capacity observations, 50 activation-energy results, 36 cycling observations, and 27 non-isothermal thermal events. The default Model 1 artifact contains 109 usable, scalar, core-MgH2 capacity observations from all 16 core papers.

Phase 3's 12 SQLite records remain synthetic demonstration data. They were not read into, joined to, copied into, or used to shape the scientific records.

## Source scope

The source inventory is one row per verified full-text primary experimental article. Sixteen core MgH2 catalyst papers may contribute to the default capacity table. Two extended reactive-hydride composite papers remain canonical reference data but are excluded from that table.

Reviews, the LLM/methodology paper, project notes, unavailable articles, and unresolved links contribute no experimental rows. The two local ACS supplements contribute no rows because their parent full articles are unavailable; this preserves parent/supplement identity requirements.

FREE-17 is now a verified 16-page primary source at its canonical carbon-supported path. Its title, DOI, readability, PDF signature/EOF, and SHA-256 are recorded in the dataset and acquisition records. Historical provenance still states that the original publisher download route failed before a legitimate copy was subsequently obtained.

## Normalized design

The normalized tables are:

- `sources.csv`: paper identity, scope, local path, hash, page count, access/license metadata;
- `samples.csv`: distinct material configuration, machine-readable chemistry, loading, preparation, milling, size, and grouping metadata;
- `measurements.csv`: ordinary author-reported absorption/desorption capacity observations;
- `activation_energies.csv`: direction- and method-specific activation-energy results;
- `cycling.csv`: explicit cycle-number capacity/retention observations;
- `thermal_events.csv`: TPD/DSC/non-isothermal onset and peak temperatures.

This separation prevents onset temperatures, activation energies, cycling degradation, and ordinary isothermal capacity points from being treated as equivalent targets. Every fact row carries a stable ID, `sample_id`, `source_id`, PDF page, figure/table/section locator, and extraction type.

Chemistry is preserved at three levels: raw catalyst/additive name; a supported composition description; and pipe-delimited component and element fields. Support materials and explicitly identified in-situ products are retained. Unknown stoichiometry is never inferred.

See `data/phase4_dataset/schema.md` for field-level meanings and units, `extraction_notes.md` for extraction decisions, and `data_quality_report.md` for coverage and limitations.

## Extraction policy

All 18 primary PDFs and both local supplements were systematically inspected. Explicit tables, experimental text, results text, captions, and labelled values were preferred. Prior-work values cited inside a paper were excluded.

No graph was digitized in Phase 4A. The 109 ML-ready values are all author-reported. Graph-only values were omitted because enough explicit observations were available for the mandatory first model and digitization would add avoidable precision risk. Approximate author language remains marked as approximate.

Raw conditions remain beside normalized representations. Temperature uses Celsius, duration uses seconds, and the ML-facing pressure field is `pressure_bar`. Missing values are null, not zero. An ambiguous negative pressure string in FREE-17 is retained verbatim and left unnormalized.

## Derived capacity dataset

`processed/capacity_training.csv` and `processed/capacity_training.parquet` are generated from the three canonical tables, never edited independently. Eligibility requires:

- a core MgH2 source approved for capacity training;
- ordinary absorption or desorption, not cycling;
- a scalar finite nonnegative capacity;
- a numeric temperature and duration;
- complete measurement/sample/source foreign keys and provenance.

Pressure may be null where the article does not state it. Threshold, range, room-temperature-without-number, and extended-system observations remain canonical but are excluded from the default view.

Regenerate and validate from the repository root:

```bash
npm install --prefix scripts/phase4
npm run build --prefix scripts/phase4
npm test --prefix scripts/phase4
```

The build sorts on stable `measurement_id` and produces byte-deterministic CSV and Parquet files. Validation compares every record/field across formats.

## Validation guarantees

The Phase 4A checks cover:

- stable unique IDs and all foreign keys;
- verified primary-only source inventory;
- local PDF presence, signature, EOF marker, checksum, and FREE-17 identity/path/page metadata;
- absence of a root-level FREE-17 duplicate;
- nonnegative finite targets and normalized numerics without broad scientific cutoffs;
- populated page/locator/extraction provenance;
- exact canonical-to-processed lineage;
- exclusion of extended, cycling, synthetic/demo, Phase 3, and seed-data content;
- no baked train/test/fold field;
- no exact duplicate processed observations;
- byte-deterministic regeneration;
- CSV/Parquet record equivalence;
- documented null and unit conventions.

## Phase 4B handoff

Mandatory Model 1 target: `hydrogen_capacity_wt_pct`.

The processed table exposes sample chemistry/preparation, measurement mode, temperature, `pressure_bar`, duration, target, provenance, and grouping identifiers. `source_id`, `paper_id`, `experiment_group_id`, and `catalyst_system_group` are metadata for evaluation, not predictive inputs.

Phase 4B should start with `train.py`, `evaluate.py`, and `predict.py`; benchmark a simple linear baseline and appropriate tabular regressors such as Random Forest/Extra Trees, CatBoost, XGBoost, or equivalents; and select by measured paper-grouped performance. Entire `source_id` groups must be held out. A stricter catalyst-system grouped sensitivity result is recommended because within-paper curves and catalyst-series rows remain correlated.

Particle-size fields are too sparse for a mandatory baseline feature. Pressure needs missing-value handling and an explicit missingness indicator. Categorical chemistry fields should be encoded without using grouping/provenance IDs as predictors.

Model 2 is deferred. The activation table is scientifically useful, but hydrogenation coverage comes from only four papers and calculation methods are heterogeneous. The evidence is in `model_target_assessment.md`.

## Remaining roadmap

### Phase 4B — AI model development

- Mandatory Model 1: H2 Capacity Predictor.
- Benchmark appropriate tabular regression models; do not assume a neural network is best.
- Use paper-grouped validation and report stricter grouping sensitivity.
- Produce model artifacts, evaluation results, inference code, and a model card.
- Do not build an Activation Energy Predictor unless later evidence reverses the Phase 4A `DEFER` decision.

### Phase 5 — Full Digital Twin integration and visualization

Integrate React to FastAPI to SQLite while preserving:

```text
exact literature measurement
    >
supported AI prediction
    >
unavailable / outside supported domain
```

Model output must never be presented as an experimental measurement. Phase 5 also includes the approved 3D prediction landscape and the clearly labelled educational material schematic, plus integration tests, Docker reliability, and presentation polish. The schematic is not atomistic, molecular-dynamics, or DFT simulation.

### Phase 6 — release and submission

Reserve release/publication decisions, license and redistribution audit, reproducibility/security audit, deployment/domain choices, local Docker fallback, final documentation/model card, screenshots/video/pitch assets, and submission packaging for Phase 6.
