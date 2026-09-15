# Literature provenance

This public-release tree contains source records, not raw publications.
[release_manifest.csv](release_manifest.csv) inventories all 26 omitted PDFs
with original paths, hashes, identities, source URLs, licenses, and reasons.

- [Canonical source table](../phase4_dataset/sources.csv): 18 primary papers,
  including 16 core training sources and 2 excluded extended composites.
- [Bibliographic citations](citations.json): 23 article/parent identities with
  author lists, journal details, and DOI links preserved from saved Crossref records.
- [Acquisition log](acquisition/acquisition_log.csv): 58 identified records,
  including unavailable candidates and excluded/project material.
- [Supplement manifest](acquisition/supplementary_manifest.csv): two ACS
  supplement records, their parent DOIs, download URLs, and licenses.
- [Verification report](acquisition/verification_report.json): historical
  full-text integrity and opening checks, not current file availability.
- [Acquisition report](acquisition/acquisition_report.md): dated decisions.
- [Research priorities](acquisition/research_priorities.md) and
  [missing-paper queue](acquisition/papers_no_pdf.txt): historical research leads.
- [Unresolved links](unresolved/README.md): identities not established.

Historical `downloaded`, `local_filename`, `local_pdf_path`, and verification
fields describe the original acquisition. They are preserved for reproducibility;
they do not promise that a PDF exists in this checkout. The missing-paper queue
tracks acquisition gaps, not intentional public-release omissions.

The model is already trained and uses the 109-row processed capacity table.
All 119 accessible core observations remain available to literature lookup.
Reviews, supplements without verified parent full text, and project notes do not
supply training observations.

See [source rights and independent acquisition](../../docs/licensing-and-data.md).
Free-to-read is not equivalent to permission to redistribute. Raw files are
excluded even where conditional sharing is permitted, to keep this repository
small and its licensing boundaries clear. History sanitization is still pending.
