# Proposed history sanitization — not executed

Phase 6A changed only the working tree. HEAD remains the original Phase 5 commit
`e7daed96a560d3c05aa4cda46b2f45cb83aada55`. History rewriting and all remote updates
require separate explicit approval. This document is a procedure, not authorization.

## Exact scope

[history-removal-paths.txt](history-removal-paths.txt) enumerates **277 exact
historical paths**, expanded across all 11 inspected commits and all local refs:

- **35 PDF paths / 26 unique PDF blobs**: current corpus paths and original
  `info/data/` / `info/context/` aliases. Includes 23 third-party publications or
  supplements and 3 preliminary/internal project documents.
- **238 acquisition scratch paths** under
  `data/phase4_data_sources/acquisition/work/`: extracted publication text,
  rendered paper pages/contact sheets, metadata responses, scripts with local
  absolute paths, and temporary acquisition bookkeeping.
- **2 obsolete acquisition files**: `file_change_manifest.csv` and
  `papers_no_pdf.original.txt` in the acquisition directory.
- **2 deep-research report copies**: the root report and
  `info/context/hackathon-energy-deep-research-report.md`.

Reasons: unresolved manuscript/embedded-figure rights, internal/preliminary
context, redundant scratch material, and avoiding redistribution of roughly
142 MiB of source PDFs. Conditionally licensed papers are removed for size and
licensing clarity, not because their licenses prohibit all sharing.

The author's Gmail is intentionally public and must **not** be sanitized.
No confirmed credential was discovered; no credential replacement is currently
proposed. If any is discovered subsequently, revoke/rotate it before release.

Keep all canonical scientific data, model implementation, trained artifact,
evaluation outputs, source hashes/locators, citation records, acquisition log,
supplement manifest, and historical verification report.

## Backup and execution plan after approval

1. Preserve the completed uncommitted Phase 6A working tree, including untracked
   documentation/scripts/screenshots. A Git bundle alone does not preserve it.
   Create a separate private backup of the original Git object database/refs and
   the completed tree. Verify the backup before any destructive operation.
2. Read the actual remote branch/tag inventory without changing visibility.
   Compare it with the inspected `main`, `phase4_cleanup`, and `phase_3` refs;
   inspect any additional reachable history before choosing the rewrite scope.
3. Work in an isolated disposable mirror with independent object storage
   (`git clone --mirror --no-local ...`). Do not rewrite the working repository
   holding uncommitted changes. Do not publish local Codex capture refs.
4. Copy the reviewed exact path manifest outside the disposable mirror. Install
   the small `git-filter-repo` tool only if needed and separately authorized as
   part of the rewrite. Proposed command inside that disposable mirror:

   ```sh
   git filter-repo --invert-paths --paths-from-file /private/audit/history-removal-paths.txt
   ```

   Use the explicit path inventory, including historical aliases, rather than
   deleting only present-day paths. Process every publishable branch/tag.
5. Preserve the tool's old-to-new commit map privately. Removing early source
   additions changes affected commits and descendants, including Phase 5's hash;
   empty acquisition commits may disappear. Historical docs retain their original
   delivery meaning; explain remapped identifiers in the release record.
6. Verify excluded paths and all identified PDF blobs are unreachable; scan every
   remaining reachable text/blob and inspect refs, object sizes, and `git fsck`.
   Verify the protected scientific hashes, then apply the reviewed Phase 6A tree
   to the clean lineage without reintroducing removed files or old ancestry.
7. Re-run release verification and affected regression checks. Compare the cleaned
   publishable tree with the reviewed Phase 6A result. Keep the original backup
   private and outside any publishable repository.

No commit, force-push, branch deletion, or visibility change is included in the
current authorization. A later remote update must name approved refs explicitly;
do not blindly mirror-push local tool refs. Rewriting only a local clone does not
clean GitHub. Existing remote branch heads, pull-request refs, caches, release
assets, and forks/clones require their own inspection and appropriate action.

## Collaborator impact and release gate

Coordinate a pause before replacing shared history. Fresh clones are preferable;
merging old branches can restore removed history. Signatures, commit links, PR
diffs, and references to rewritten hashes can be affected. GitHub support policies
do not guarantee removal of non-sensitive cached content.

Follow [GitHub's history-removal guidance](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).
Public visibility remains blocked until the remote history is actually cleaned,
the final public tree is approved, and dataset/model licensing decisions are
resolved or explicitly accepted with accurately documented boundaries.
