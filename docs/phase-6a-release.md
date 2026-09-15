# Phase 6A: public-release preparation

## Status

Working-tree cleanup and local release validation are complete. **Public
visibility is not yet approved:** historical copies remain, and dataset/model
license decisions remain open. No model training, history rewrite, commit, push,
visibility change, or deployment was performed.

Baseline: `main` at `e7daed96a560d3c05aa4cda46b2f45cb83aada55`, with a clean
starting tree and matching recorded `origin/main`. The two other recorded
branches are `phase4_cleanup` and `phase_3`; no tags were present. Remote server
refs and GitHub attachments were not independently audited during this phase.

## Cleanup and provenance

- Removed all 26 raw PDFs and both duplicate internal research reports.
- Archived the V0.1 HTML prototype, its style guide, and the acquisition guide.
- Renamed institutional access priorities to neutral research priorities.
- Preserved original acquisition/verification records and scientific provenance.
- Added a 26-document release manifest and 23 bibliographic citation records.
- Added MIT for original software/documentation with explicit exclusions for
  datasets, trained weights, publications, and third-party dependencies.
- Rebuilt the README around evidence, capabilities, limitations, quick start,
  architecture, and two real application screenshots (about 160 KiB combined).
- Added documentation navigation and corrected current/historical link boundaries.

The intended release tree contains 168 files, approximately 2.01 MiB, versus
143.87 MiB before cleanup (excluding Git history and ignored dependencies).
Git history remains approximately 146.85 MiB until a separately approved rewrite.

All 58 protected scientific files match Phase 5 (LF-normalized text and raw
binary SHA-256). See
[fingerprints](release-fingerprints.json). No scientific outputs changed.

## Security and rights audit

The initial inspection enumerated 632 local Git objects, including 509 blobs,
across 11 commits and 429 historical paths. Pattern scans covered text/commit
objects; all 26 unique PDFs were text-extracted and PNG metadata was inspected.
No confirmed password, token, private key, authenticated URL, or real `.env`
was found. No installed dedicated secret scanner was available. Pattern/text
inspection is not an exhaustive guarantee for arbitrary binary/image content.

Six historical acquisition scripts contain local absolute user paths. Historical
scratch files also retain extracted paper text and rendered publication pages.
These are included in the proposed rewrite scope. The commit author's Gmail is
intentionally public and is not a removal target.

Twenty articles have CC BY-NC-ND notices; two ACS supplements have saved official
CC BY-NC metadata. EXISTING-C's manuscript reuse terms are unclear; R3's embedded
third-party figure rights are not established by the article notice alone.
Conditionally permitted sources are also omitted for size and licensing clarity.
See [licensing and data boundaries](licensing-and-data.md).

## Validation results

| Check | Result |
| --- | --- |
| Model release suite | 22 passed; 1 refit test intentionally skipped |
| Backend suite | 72 passed |
| Standalone inference / CLI parity | Passed; supported, unsupported, malformed |
| Source-free dataset validation | 11,935 assertions passed |
| Optional source verification | 12,025 assertions passed for 18 originals restored temporarily outside the repository; missing/corrupt files rejected |
| Processed CSV/Parquet regeneration | Two temporary rebuilds match each other and checked-in bytes |
| Scientific fingerprint verification | 58 files unchanged |
| Frontend lint | Passed |
| Frontend formatting | Passed |
| Production build | Passed; bundled license notices emitted |
| Local Chrome browser suite | 26 passed, 51.8 seconds |
| Compose Chrome browser suite | 26 passed, 38.6 seconds |
| Compose configuration | Passed |
| Integrated Docker build/start | Passed; backend healthy and frontend running |
| Direct backend and frontend-proxied API smoke | Passed on both routes |
| README screenshots | Captured from actual Compose app and visually reviewed |
| Release manifest / local documentation links | Passed |
| Linux source-free checkout | 58 fingerprints verified; 22 model tests passed / 1 skipped; 72 backend tests passed |
| Workflow YAML | Parsed and formatting checked with installed Prettier |
| Current release security-pattern scan | No secret/path pattern matches in 168 intended release files |

Both API paths retain 119 observations, M-0082's greater-than 4.21 wt.% qualifier,
the default prediction 3.6083 with interval [1.1628, 6.6989], no prediction at
999 degrees C, and 400 supported cells in the default 20-by-20 landscape.

The original in-memory refit test is preserved behind `--run-refit`; release
checks do not execute it. A frozen Phase 5 inference regression replaces its
release coverage. A first version of that new test exposed module-name aliasing
when run in-process; isolating the smoke check in a subprocess fixed the test
without changing application/model code. The final suite passed.

Known existing warnings remain: CatBoost/scikit-learn tags and Starlette/AnyIO
deprecations; the lazy Plotly GL3D chunk is about 1.69 MB (537 kB gzip). Browser
validation uses desktop Chrome with viewport emulation, not physical devices or
all browser engines. Docker's frontend remains a development server.

## CI and dependencies

Added a non-deployment GitHub Actions workflow for pushes/PRs/manual invocation,
with read-only permissions, pinned action hashes, Python 3.10, Node 24, tests,
source-free dataset validation, scientific fingerprints, lint/format/build,
Playwright Chromium, Compose configuration, and three-day failure artifacts.
The hosted workflow cannot run until a separately authorized commit/push.
Its hosted Chromium/Ubuntu environment is distinct from the local Chrome run.
A source-free LF export was separately verified in Linux Python 3.10 containers
with networking disabled and a read-only source mount; model and backend suites
passed there as well.

Direct runtime dependencies use MIT, BSD, or Apache 2.0 licenses; no obvious
conflict with MIT original code was identified. Vite emits
`dist/THIRD-PARTY-LICENSES.md`; keep it with distributed frontend builds.
Scientific wheel notices remain in installed distribution metadata. Python
development pytest pins now agree; inference dependency versions are unchanged.

Cross-platform verification found Windows CRLF conversion in 33 metadata and
evaluation text files. Their LF-normalized contents match Git's baseline blobs.
Release fingerprints normalize text line endings and hash binary files verbatim;
`.gitattributes` fixes future text checkouts to LF. No scientific values or
trained model bytes were changed. The model and processed training CSV retain
their existing raw-byte hashes.

## Reproduce checks

Follow the root README. Additional local integration checks:

```sh
python scripts/release/verify_release.py
python scripts/release/http_smoke.py
node scripts/release/capture-screenshots.mjs
```

Use the integrated Python environment for inference/HTTP checks. Set
`PLAYWRIGHT_BASE_URL=http://localhost:5173` for browser tests against Compose.
Test outputs and scratch data remain ignored. No production credentials are
required; `.env.example` remains secret-free.

## Pending decisions

1. Separately approve and execute [history sanitization](history-sanitization.md).
2. Review dataset/model release rights; MIT applies only to original software
   and documentation.
3. Before public visibility, inspect actual GitHub refs, PRs, release assets,
   and attachments, and verify the cleaned remote state.
4. Phase 6B: production serving, hosting/deployment benchmarking, operational
   configuration, and any domain work. None was performed here.
