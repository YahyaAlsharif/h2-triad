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
- `acquisition/uqu_access_priorities.md`: ranked manual-access recommendations based on existing records.

The single active missing-paper queue is `acquisition/papers_no_pdf.txt`. Supplements do not substitute for missing parent articles. Historical file moves are recorded in the acquisition report; Git preserves the original queue and session bookkeeping.

`downloaded=true` means the full article/document is locally present, including previously supplied files. New downloads are counted separately in the report. `has_supplement=true` can mean a supplement is cited or advertised; only the supplementary manifest proves local availability. `unknown` is deliberately different from false. An unavailable candidate is not full-text verified and its final experimental scope must be confirmed when obtained.

Scratch acquisition work in `acquisition/work/` is ignored and is not part of the durable corpus. The acquisition log retains source URLs and access/identity decisions; the supplementary manifest retains parent links and recorded supplement provenance, and the verification report retains PDF hashes and page counts. Project documents use the non-training `project_note` scope.

Each article has one primary folder, even when it spans several catalyst categories. Unrepresented catalyst/alloy categories may have no tracked directory. No experimental extraction, scientific-data cleaning, estimation, or model training has occurred yet.
