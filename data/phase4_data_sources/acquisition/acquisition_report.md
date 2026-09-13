# Phase 4 literature acquisition report

Completed public-source acquisition and organization on 2026-09-13. Inaccessible sources are recorded for future lawful access; completion does not mean every candidate PDF was obtainable.

## Counts

| Requested measure | Result |
|---|---:|
| Originally present scholarly papers | 6 |
| Additional originally present project-note PDFs | 3 |
| New full-article PDFs downloaded | 14 |
| New supplementary files downloaded | 2 |
| Core experimental Mg/MgH2 papers available | 15 |
| Extended primary papers available | 2 |
| Review/reference scholarly papers available | 3 (2 reviews + 1 methodology) |
| Newly added missing-paper entries | 30 (28 core candidates + 2 reviews) |
| Total unavailable identified papers | 32 (30 core candidates + 2 reviews) |
| Unresolved existing sources | 2 links; no unidentified local PDFs |
| Duplicate entries removed | 1 alternate ScienceDirect URL |
| Duplicate PDFs removed | 0; no duplicate hashes found |
| Unrelated papers excluded | 1; already absent, no file deleted |

The active missing list now contains 34 unique URLs: 32 normalized DOI links and 2 preserved unresolved links. Two identified papers were already represented in the original list; therefore 30 papers are newly added. The log has 58 rows: 52 DOI papers, 3 project notes, 2 unresolved links, and 1 excluded alloy-system paper.

## Acquired and retained sources

New full articles: FREE-2, FREE-3, FREE-4, FREE-5, FREE-7, FREE-8, FREE-9, FREE-10, FREE-11, FREE-12, FREE-14, FREE-15, FREE-16, and review R3. The 13 primary articles and R3 were downloaded from the official SciOpen PDF assets exposed by the journal's own PDF viewers. Exact download URLs are retained in the acquisition log and work evidence.

FREE-1 and R1 were already present and were not downloaded again. Existing-A (MgH2-FeNi2S4), Existing-B (MgH2-NaAlH4/CoTiO3), Existing-C (CaH2/MgB2/CaF2), and Existing-D (large magnesium review) were also retained. Existing-C is the supplied Helmholtz accepted manuscript, not the publisher version of record.

Two official ACS Figshare supplements were acquired: NOPDF-11, DOI 10.1021/acsami.6b13222, and NOPDF-23, DOI 10.1021/acsami.4c18239. Both parent identities and supplement titles match. The supplements contain supporting characterization/kinetic information. Their parent full articles remain missing; secondary comparison tables must not be treated as measurements from the parent experiment.

## Classification decisions

- MgH2-FeNi2S4 and Ni@C remain core experimental articles.
- MgH2-NaAlH4/CoTiO3 and CaH2/MgB2/CaF2 are organized as extended reactive composites.
- The large magnesium review and R3 are reviews/indexes. R1 is methodology only. None is core training evidence.
- The hackathon scientific summary, proposal, and Arabic decision map are retained in notes/non-training. Their hypothetical formulations are not measured samples.
- No acquired guide candidate required a different scientific scope from the guide. Folder placement now makes the required existing-file distinctions explicit.
- The unrelated “Critical evaluation of the Fe-Ni, Fe-Ti and Fe-Ni-Ti alloy systems” (S0966979506001178) is excluded. It was already absent from the original missing list and local files.

## Access corrections and guide discrepancies

The guide was preserved unchanged. All 52 listed DOI identities were checked against Crossref, with actual issue years retained. DOI-year and issue-year differences do not by themselves indicate incorrect identity.

1. The flat path `info/phase4_dataset_acquisition_guide.md` is the existing guide. The alternative nested path supplied in the initial request was absent.
2. The acquisition inventory in the guide is out of date: FREE-1 and R1 were already local. The unrelated alloy-system link had already been removed before this task.
3. FREE-6 and FREE-13 have OA metadata but their publisher routes did not deliver usable PDFs. FREE-13's SciOpen route returned 404. They remain access-blocked, not proven paywalled.
4. FREE-17's official journal PDF handler returned HTTP 500. Its full-text availability could not be realized in this session.
5. FREE-18's claimed “View Open Manuscript” route could not be confirmed. No legitimate accessible manuscript was found in the reasonable routes checked.
6. FREE-19 and FREE-20's guide-listed direct RSC PDFs were not freely reachable in this session. Publisher security/access responses prevented acquisition. The Adelaide repository candidate for FREE-20 did not load.
7. R2 and R4 are genuinely OA review articles, but their PDF routes returned access errors or HTML challenge pages. No HTML response was counted as a PDF.
8. FREE-15's Crossref title lost the subscript x in TMOx. The log uses the PDF title. R2's DOI, omitted from the guide's reference listing, was independently resolved as 10.3390/ma16041587.

A source-level discrepancy was also noticed: Existing-A's printed supplementary locator names a different DOI, 10.1016/j.sipas.2020.100009. No supplement was assigned using that mismatched locator. This is a PDF source issue, not a correction to the guide.

The remaining NOPDF candidates were checked using publisher information, focused legitimate-source searches, and OA repository metadata. No full article was obtained. The UMPSA copy for NOPDF-3 is explicitly staff restricted; that restriction was respected. The log distinguishes metadata/abstract screening from actual full-text verification. Failure to retrieve a file is not a universal claim that no free copy exists anywhere.

## Suggested later extraction priorities

Among available papers, FREE-9 (NaH/TiO2 precursor-ratio comparisons), FREE-15 (Mn/Cu catalyst-family comparison), FREE-14 (Ni-Nb compositions/controls), and FREE-3 (LDH-derived catalyst compositions/controls) are strong starting points. Existing-A supplies the project's FeNi2S4 primary evidence. These priorities concern experimental design and source richness; no values were extracted or compared for a training table.

## Final reconciliation

All 25 organized PDFs (20 scholarly articles, 3 notes, 2 supplements) open at their final paths and match the saved, previously verified files by SHA-256 and page count. No duplicate PDF hash remains. Previously confirmed titles, DOIs, full-text completeness, and scientific relevance were reused under the requested lighter verification standard.

All 52 guide DOI entries are represented exactly once in the log. Every unavailable identified paper occurs once in the active missing list, alongside the two unresolved original links. Core, extended, reference, and project-note folders are separate. Each supplement is linked to its parent DOI. No experimental dataset, cleaned data, synthetic record, or model was created. The application and acquisition guide were not edited; nothing was staged, committed, pushed, or switched to another branch.

## Files changed

Nine original PDFs were moved and renamed into the source pool; `info/data/papers_no_pdf.txt` was modified. The 14 new full PDFs, 2 supplements, acquisition log, supplementary manifest, verification report, source-pool README, unresolved README, this report, original-list backup, and acquisition evidence files were created inside the project.

`file_change_manifest.csv` is the exhaustive one-row-per-file list of created, moved/renamed, and modified files, including all supporting session evidence. Paths are relative to the project root. The following table lists every original-file move:

| Original path | Final path |
|---|---|
| info/data/Catalytic mechanisms of nickel nanoparticles for the improved dehydriding kinetics of magnesium hydride.pdf | data/phase4_data_sources/core_primary/carbon_supported/FREE-1__2024__Ni_at_C.pdf |
| info/data/1-s2.0-S2213956722000160-main.pdf | data/phase4_data_sources/core_primary/sulfides/EXISTING-A__2023__MgH2_FeNi2S4.pdf |
| info/data/1-s2.0-S2213956724000896-main.pdf | data/phase4_data_sources/extended_primary/reactive_hydride_composites/EXISTING-B__2024__MgH2_NaAlH4_CoTiO3.pdf |
| info/data/suarezalcantara-journsolstatchem.pdf | data/phase4_data_sources/extended_primary/reactive_hydride_composites/EXISTING-C__2011__CaH2_MgB2_CaF2.pdf |
| info/data/1-s2.0-S2213956725003639-main.pdf | data/phase4_data_sources/reviews_indexes/EXISTING-D__2025__Magnesium_global_review.pdf |
| info/data/From LLM to Agent_ A large-language-model-driven machine learning framework for catalyst design of MgH2 dehydrogenation.pdf | data/phase4_data_sources/reviews_indexes/R1__2026__LLM_Agent_methodology.pdf |
| info/context/H2_TRIAD_Team_Decision_Map_AR.pdf | data/phase4_data_sources/notes_nontraining/NOTE-1__Team_Decision_Map_AR.pdf |
| info/context/الهاكثون.pdf | data/phase4_data_sources/notes_nontraining/NOTE-2__Hackathon_Project_Proposal.pdf |
| info/data/الهاكثون (البيانات).pdf | data/phase4_data_sources/notes_nontraining/NOTE-3__Hackathon_Scientific_Summary.pdf |
