# Licensing, data, and source rights

## Original software and documentation

The root [MIT License](../LICENSE) covers original H2-Triad application code,
model implementation, scripts, tests, and original project documentation.
Copyright (c) 2026 H2-Triad contributors. The inspected history has one human
author/committer identity; the attribution does not claim ownership of research
publications or third-party contributions embedded in other works.

The MIT grant does **not** cover the curated scientific data, trained model
weights, copied publication content, publisher supplements, or third-party
dependencies. Quotations and third-party material retain their original rights.

## Scientific datasets and trained model

`data/phase4_dataset/` contains curated literature observations and provenance.
`model/artifacts/capacity_model.joblib` contains the fitted preprocessing and
CatBoost model; `model/evaluation/` contains the recorded evaluation outputs.
These artifacts are retained intentionally for reproducibility. No separate
blanket redistribution/commercial-use license is asserted for them in this
release. Dataset compilation rights, underlying publication rights, and the
appropriate model-artifact license remain an owner release decision. Public
availability would not by itself resolve those rights or grant an MIT license.

The records preserve author-reported facts, source qualifiers, page/section
locators, and normalized units. H2-Triad does not own the underlying research.
Source licenses should not be assumed to apply automatically to every fact,
compilation, or trained weight. Conversely, the software license does not
override a source's noncommercial or other restrictions.

The 119 accessible core observations include 109 training observations from
16 papers and 36 samples. Eligibility is explicit in `measurements.csv` and
`sources.csv`; the processed table preserves grouping and provenance IDs.
Nine reported-room-temperature observations and one threshold observation
remain accessible without entering the scalar training table. Two extended
reactive-composite sources, cycling, activation energies, and thermal events
are excluded from that training view. Synthetic/demo records live separately
in `backend/app/seed_data.json` and never supply literature or model training.

See [schema](../data/phase4_dataset/schema.md),
[extraction notes](../data/phase4_dataset/extraction_notes.md), and
[model card](../model/MODEL_CARD.md). The [release fingerprints](release-fingerprints.json)
record the unchanged scientific files at the Phase 5 baseline (SHA-256 of
LF-normalized text and raw binary bytes). The model artifact and processed
training CSV retain their original raw-byte fingerprints as well.

## Publications and supplementary material

No raw source PDFs are distributed in the intended release tree. The
[release manifest](../data/phase4_data_sources/release_manifest.csv) records all
26 removed documents, their identities, historical paths, hashes, source URLs,
license evidence, and removal reasons. Existing acquisition and verification
records describe the original private acquisition, not file availability in
this checkout. Their original statuses have not been rewritten.

[Bibliographic citations](../data/phase4_data_sources/citations.json) preserve
author lists and journal details from the saved Crossref acquisition responses,
without retaining their abstracts, full reference lists, or scratch responses.

- Twenty publisher-version articles carry CC BY-NC-ND 4.0 notices. This permits
  unchanged, attributed, noncommercial sharing under its conditions, not MIT
  relicensing. The R3 review also credits third-party figures reproduced with
  permission; blanket rights over those figures have not been established.
- EXISTING-C is an accepted manuscript without asserted redistribution terms.
- The two ACS supplements have CC BY-NC 4.0 licenses in saved official Figshare
  version 1 records. Those licenses do not establish rights over their missing
  parent articles. Neither supplement contributes training observations.
- Three preliminary project-note PDFs are excluded; they are not experimental
  evidence. Both internal deep-research report copies are also omitted.

License references: [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/)
and [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/).
Even conditionally redistributable papers are omitted because they dominate
repository size and are unnecessary for application execution.

### Obtain and verify a source

1. Find its DOI in `sources.csv` or the acquisition log; open `https://doi.org/DOI`.
2. Obtain the original through the publisher, a lawful institutional repository,
   or your own library access. Free access alone does not establish reuse rights.
3. Use the manifest's exact download provenance for version identification.
   Some publisher URLs may change or require access. Authors can also be found
   through the DOI; absence of an author list in an old row is not invented.
4. To verify original PDF bytes privately, restore the recorded relative paths
   beneath an external directory (or ignored `private-sources/`) and run:

   ```sh
   npm ci --prefix scripts/phase4
   npm test --prefix scripts/phase4 -- --source-root /path/to/private-source-root
   ```

This strict optional check requires all 18 primary PDFs and validates their
signatures and recorded SHA-256 hashes. A different legitimate version may
have a different hash; do not silently replace the recorded provenance.
Default dataset validation does not claim to reverify unavailable source PDFs.

## Third-party software

Direct dependency metadata shows no obvious conflict with MIT original code:

| Dependencies | License |
| --- | --- |
| React, React DOM, Recharts, Plotly, FastAPI, Pydantic | MIT |
| Uvicorn, HTTPX2, NumPy, pandas, SciPy, scikit-learn, joblib | BSD family |
| CatBoost, PyArrow | Apache 2.0 |
| Matplotlib | Matplotlib/PSF-style license |
| parquetjs-lite | MIT |

Dependencies retain their own copyright, license, and notice requirements.
Scientific wheels can bundle additional components, including numerical
libraries with their own notices. Preserve wheel metadata/license directories
in container distributions and Vite's third-party license output in frontend
builds. Do not strip those notices during packaging. This is a direct-dependency
sanity check, not an exhaustive legal certification of all transitive code.

## Release gate

Working-tree removal does not remove historical copies. History sanitization
and dataset/model rights review remain pending before public visibility.
No deployment or visibility change is part of Phase 6A.
