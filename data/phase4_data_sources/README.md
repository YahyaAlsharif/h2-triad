# Phase 4 literature source pool

Literature acquisition only. This directory is not a training dataset.

- `core_primary/`: 15 verified experimental Mg/MgH2 catalyst/additive articles.
- `extended_primary/reactive_hydride_composites/`: 2 verified reactive-composite articles; keep separate from core.
- `reviews_indexes/`: 2 reviews and 1 machine-learning methodology article; reference only.
- `notes_nontraining/`: 3 existing project documents; no measured training records may be inferred from them.
- `supplementary/`: 2 official ACS supplements, grouped by parent paper ID. Their main articles are still missing.
- `unresolved/`: notes about 2 unresolved original links; no unverified article is placed in core.
- `acquisition/acquisition_log.csv`: one row per unique identified paper, plus clearly marked notes, unresolved links, and excluded source.
- `acquisition/supplementary_manifest.csv`: parent DOI, file, and download provenance for supplements.
- `acquisition/verification_report.json`: final path, hash, and PDF-opening reconciliation.
- `acquisition/acquisition_report.md`: acquisition results, limitations, and classifications.
- `acquisition/file_change_manifest.csv`: exhaustive project-relative file change list.

The active missing-paper list remains at `info/data/papers_no_pdf.txt`. Its pre-cleanup contents are preserved in `acquisition/papers_no_pdf.original.txt`; that backup is historical evidence, not an active queue.

`downloaded=true` means the full article/document is locally present, including previously supplied files. New downloads are counted separately in the report. `has_supplement=true` can mean a supplement is cited or advertised; only the supplementary manifest proves local availability. `unknown` is deliberately different from false. An unavailable candidate is not full-text verified and its final experimental scope must be confirmed when obtained.

Acquisition evidence and session utilities in `acquisition/work/` are non-training material. Cached text was used only to identify and screen documents; it is not a scientific dataset. Utilities record session work and are not an idempotent acquisition pipeline.

Empty catalyst/alloy folders are intentional. Each article has one primary folder, even when it spans several catalyst categories. No scientific data extraction, estimation, or model training was performed.
