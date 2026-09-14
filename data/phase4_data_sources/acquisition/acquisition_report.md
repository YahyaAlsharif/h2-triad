# Phase 4 literature acquisition report

Completed public-source acquisition and organization on 2026-09-13. Inaccessible sources are recorded for future lawful access; completion does not mean every candidate PDF was obtainable. On 2026-09-14, FREE-17 was subsequently supplied through a legitimate route, verified, and added without erasing the failed publisher-route history below.

## Counts

| Requested measure | Result |
|---|---:|
| Originally present scholarly papers | 6 |
| Additional originally present project-note PDFs | 3 |
| New full-article PDFs downloaded | 14 |
| New supplementary files downloaded | 2 |
| Subsequently supplied and verified full articles | 1 (FREE-17) |
| Core experimental Mg/MgH2 papers available | 16 |
| Extended primary papers available | 2 |
| Review/reference scholarly papers available | 3 (2 reviews + 1 methodology) |
| Newly added missing-paper entries | 30 (28 core candidates + 2 reviews) |
| Total unavailable identified papers | 31 (29 core candidates + 2 reviews) |
| Unresolved existing sources | 2 links; no unidentified local PDFs |
| Duplicate entries removed | 1 alternate ScienceDirect URL |
| Duplicate PDFs removed | 0; no duplicate hashes found |
| Unrelated papers excluded | 1; already absent, no file deleted |

The active missing list now contains 33 unique URLs: 31 normalized DOI links and 2 preserved unresolved links. The historical acquisition task added 30 entries; FREE-17 was later removed from the active queue after full-text verification. The log still has 58 rows: 52 DOI papers, 3 project notes, 2 unresolved links, and 1 excluded alloy-system paper.

## Acquired and retained sources

New full articles: FREE-2, FREE-3, FREE-4, FREE-5, FREE-7, FREE-8, FREE-9, FREE-10, FREE-11, FREE-12, FREE-14, FREE-15, FREE-16, and review R3. The 13 primary articles and R3 were downloaded from the official SciOpen PDF assets exposed by the journal's own PDF viewers. Exact download URLs are retained in the acquisition log.

FREE-1 and R1 were already present and were not downloaded again. Existing-A (MgH2-FeNi2S4), Existing-B (MgH2-NaAlH4/CoTiO3), Existing-C (CaH2/MgB2/CaF2), and Existing-D (large magnesium review) were also retained. Existing-C is the supplied Helmholtz accepted manuscript, not the publisher version of record.

FREE-17 was later supplied locally and verified as a readable, complete 16-page version-of-record article. It is filed at `core_primary/carbon_supported/FREE-17__2024__Ni_at_CNT.pdf` with SHA-256 `8e693025638d461050a612d77909ad8591a5e815b5ed317b65a867bd51443ee6`.

Two official ACS Figshare supplements were acquired: NOPDF-11, DOI 10.1021/acsami.6b13222, and NOPDF-23, DOI 10.1021/acsami.4c18239. Both parent identities and supplement titles match. The supplements contain supporting characterization/kinetic information. Their parent full articles remain missing; secondary comparison tables must not be treated as measurements from the parent experiment.

## Classification decisions

- MgH2-FeNi2S4 and Ni@C remain core experimental articles.
- MgH2-NaAlH4/CoTiO3 and CaH2/MgB2/CaF2 are organized as extended reactive composites.
- The large magnesium review and R3 are reviews/indexes. R1 is methodology only. None is core training evidence.
- The hackathon scientific summary, proposal, and Arabic decision map are retained in notes/non-training. Their hypothetical formulations are not measured samples.
- No acquired guide candidate required a different scientific scope from the guide. Folder placement now makes the required existing-file distinctions explicit.
- The unrelated “Critical evaluation of the Fe-Ni, Fe-Ti and Fe-Ni-Ti alloy systems” (S0966979506001178) is excluded. It was already absent from the original missing list and local files.

## Access corrections and guide discrepancies

During acquisition the guide was preserved unchanged; the subsequent repository cleanup added only a completion banner. All 52 listed DOI identities were checked against Crossref, with actual issue years retained. DOI-year and issue-year differences do not by themselves indicate incorrect identity.

1. The flat path `info/phase4_dataset_acquisition_guide.md` is the existing guide. The alternative nested path supplied in the initial request was absent.
2. The acquisition inventory in the guide is out of date: FREE-1 and R1 were already local. The unrelated alloy-system link had already been removed before this task.
3. FREE-6 and FREE-13 have OA metadata but their publisher routes did not deliver usable PDFs. FREE-13's SciOpen route returned 404. They remain access-blocked, not proven paywalled.
4. FREE-17's official journal PDF handler returned HTTP 500 during the original session and the ScienceDirect route was blocked. A legitimate copy was subsequently supplied and verified on 2026-09-14; it is no longer access-blocked or in the missing queue.
5. FREE-18's claimed “View Open Manuscript” route could not be confirmed. No legitimate accessible manuscript was found in the reasonable routes checked.
6. FREE-19 and FREE-20's guide-listed direct RSC PDFs were not freely reachable in this session. Publisher security/access responses prevented acquisition. The Adelaide repository candidate for FREE-20 did not load.
7. R2 and R4 are genuinely OA review articles, but their PDF routes returned access errors or HTML challenge pages. No HTML response was counted as a PDF.
8. FREE-15's Crossref title lost the subscript x in TMOx. The log uses the PDF title. R2's DOI, omitted from the guide's reference listing, was independently resolved as 10.3390/ma16041587.

A source-level discrepancy was also noticed: Existing-A's printed supplementary locator names a different DOI, 10.1016/j.sipas.2020.100009. No supplement was assigned using that mismatched locator. This is a PDF source issue, not a correction to the guide.

The remaining NOPDF candidates were checked using publisher information, focused legitimate-source searches, and OA repository metadata. No full article was obtained. The UMPSA copy for NOPDF-3 is explicitly staff restricted; that restriction was respected. The log distinguishes metadata/abstract screening from actual full-text verification. Failure to retrieve a file is not a universal claim that no free copy exists anywhere.

## Phase 4A extraction status

The original extraction priorities were completed in Phase 4A together with the rest of the verified primary corpus. The normalized scientific tables and quality report are in `data/phase4_dataset/`. This current-status note does not rewrite the acquisition-only history later in this report.

## Final reconciliation

All 26 organized PDFs (21 scholarly articles, 3 notes, 2 supplements) open at their final paths. FREE-17 was independently checked for title, DOI, readability, 16-page count, PDF signature/EOF, and SHA-256; the other 25 retain their saved verification. No duplicate PDF hash remains.

All 52 guide DOI entries are represented exactly once in the log. Every unavailable identified paper occurs once in the active missing list, alongside the two unresolved original links. Core, extended, reference, and project-note folders are separate. Each supplement is linked to its parent DOI. No experimental dataset, cleaned data, synthetic record, or model was created. During the acquisition session the application and acquisition guide were not edited; nothing was staged, committed, pushed, or switched to another branch.

## Files changed

Nine original PDFs were moved and renamed into the source pool; the missing-paper queue was updated and now lives at `data/phase4_data_sources/acquisition/papers_no_pdf.txt`. The 14 new full PDFs, 2 supplements, acquisition log, supplementary manifest, verification report, source-pool README, unresolved README, and this report remain in the project.

The acquisition-session file manifest and original-list backup were removed during repository cleanup because Git history preserves them. The manifest contained only action/original-path/final-path bookkeeping; its nine original PDF moves are preserved below. Paths are relative to the project root.

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

## Repository cleanup on 2026-09-13

Cleanup was prepared on `phase4_cleanup`, directly from acquisition commit `7ec85f4` on `main`. The starting working tree was clean. Removed 238 scratch files (about 20.3 MiB) from `acquisition/work/` and added that path to `.gitignore`. The redundant session manifest and original-list backup were also removed; the original queue is recoverable from commit `e253aa3`, and the original PDF move map remains above.

The active queue moved unchanged to `acquisition/papers_no_pdf.txt`; the now-empty `info/data/` directory was removed. Its four priority/identity sections, 32 unique DOI URLs and two unresolved links remain intact. The root/source-pool READMEs and unresolved pointer were updated, and the historical guide received only a completion banner. [UQU access priorities](uqu_access_priorities.md) provide 5 MUST GET, 5 HIGH and 22 USEFUL recommendations, including two reference-only reviews, without changing the active queue's decisions.

Metadata cleanup decoded the journal name for NOPDF-11 and NOPDF-23 and changed NOTE-1 through NOTE-3 from `methodology_only` to the non-training `project_note` scope. All 52 DOI fields and DOI URLs were already normalized. No other acquisition-log field changed. Before deleting cached Figshare responses, their supplement DOIs, repository versions and recorded license names/URLs were retained in `supplementary_manifest.csv`. Those licenses describe the supplement records, not the missing parent articles. Download URLs, article identities, source classifications, access limitations, PDF hashes, page counts and the mismatched EXISTING-A supplementary locator remain in durable records.

Cleanup validation matched all 25 PDFs to the existing SHA-256 verification report, with no duplicate hashes or source PDFs outside this corpus. All 15 core and both extended article paths resolve; the 58 log records and 52 DOI identities remain unique. The queue content matches its pre-move Git blob. No application source, scientific measurements, source PDFs or verification results changed. No extraction or training was performed.

At cleanup, the PDF corpus is approximately 136.5 MiB, `.git` is 140.6 MiB, and the source working tree plus `.git` is approximately 277.7 MiB (excluding ignored dependencies, runtime files and caches). Removing scratch files from the working tree does not remove historical Git objects. Normal Git remains reasonable for this corpus. As a practical review trigger, reconsider storage when the corpus or Git history approaches roughly 1 GiB, binary revisions accumulate rapidly, or clone/fetch times become inconvenient; this is not a Git limit. No Git LFS configuration, migration or history rewrite was performed. Installed Git LFS reported no tracked LFS files, and every PDF's Git filter is unspecified. No `.gitattributes` file was added.

The repository is private; storing publisher PDFs here does not automatically grant redistribution rights if it later becomes public. Existing coverage remains concentrated in JMA (15 of 16 core papers), with seven core articles filed under oxides. FREE-17 adds one Transactions of Nonferrous Metals Society of China article. The missing parents and unresolved identities remain acquisition gaps, not verified training sources.

Changes are left uncommitted and unstaged for review. All 238 tracked scratch paths are absent on disk and appear as unstaged deletions; Git's index will retain their old entries until the deletions are staged. No scratch content remains in the working corpus, and future scratch work is ignored. Nothing was pushed.
