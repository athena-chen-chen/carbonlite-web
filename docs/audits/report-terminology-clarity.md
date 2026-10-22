# Report terminology clarity (2026-10-18)

The customer-facing technical output is **Technical Emissions Report**. Its PDF metadata title, cover, output-profile label, export menu, download filename, landing-page example, error message and new export-event descriptive text use the new name. Generated filenames begin `carbonlite-technical-emissions-report-`. The existing internal `TECHNICAL_REVIEW` profile key remains unchanged.

## Terminology audit

| Context | Updated terminology | Surfaces |
| --- | --- | --- |
| Technical Review Package | Technical Emissions Report | PDF metadata/cover, UI menu, filenames, export errors, new event descriptions, documentation |
| Source Dataset Review Status | Source Data Status | Report UI, technical PDF, activity details, executive source-data summary |
| Records/rows requiring review | Records/rows needing attention | Quality summaries, calculation trail, source evidence, report appendices, hotspot exclusions, CSV headings |
| Needs Review / Requires Review as a computed data issue | Needs Attention | Display mappings; canonical stored status codes unchanged |
| Factor Review | Factor Validation | Executive PDF, readiness checklist, supporting UI/documentation |
| Review Note for calculated validation/exclusion information | Validation Note | Calculation traceability, source evidence tables, report CSV header |
| Automatic review reasons/warnings | Attention reasons / Needs attention | Quality summaries, missing-factor messages, hotspot estimate-quality labels |
| Source rows reviewed (computed source assessment) | Source rows assessed | Readiness/source-data summaries and executive PDF |
| Report Review Status (human approval) | Reviewer Sign-off Status | PDF cover; same underlying approval status |
| Version review notes (human governance) | Reviewer Notes | Factor detail governance card; same stored notes |

Retained human contexts include Reviewer, Reviewer approval, Reviewer sign-off, qualified consultant/professional review, boundary reviewed by/at/status, professional factor verification statuses such as Internal Review Required, and human instructions to inspect source suitability before formal reporting. Input Review, Calculation Review and canonical workflow stage names remain human inspection/navigation contexts. Audit history and legacy stored issue/provenance text remain evidence, not terminology-rewrite targets. The existing business-audit Review Status label and boundary Review note remain unchanged.

## Preserved behavior and evidence

- No numerical values, factor matching, calculations, report scope/filtering, report data selection or report structure changed.
- No backend implementation, database rows, historical calculation snapshots, audit history, reviewer permissions, approval conditions or workflow enum values changed for this task.
- Canonical keys including `TECHNICAL_REVIEW`, `NEEDS_REVIEW`, `REQUIRES_REVIEW`, `SOURCE_REVIEW_COMPLETE` and `FACTORS_REVIEWED` are retained. CSV machine status values remain canonical.
- Export audit action/entity fields and event metadata remain unchanged; only the descriptive product label for new PDF exports is renamed. Historical events are not rewritten.
- Missing-source display sentinels accept both old and new wording so old evidence is not mistaken for valid provenance. The source-evidence tally accepts both legacy and new displayed attention labels, retaining existing counts.
- CSV column order and values remain unchanged; the requested `Review Note` header is now `Validation Note`. The unresolved-record CSV filename uses `records-needing-attention`, retaining its internal kind key.
- Legacy downloaded filenames remain in historical gitignore-cleanup documentation and ignore rules. The new PDF and unresolved-record CSV filename families are also ignored. Previously exported files are not edited.

## Verification

- Full frontend suite: **87 files, 1,075 tests PASS**, plus 2 database guard tests.
- Focused final check after the last automatic-warning wording adjustments: **5 files, 113 tests PASS**, including PDF renderers, metrics summary, CSV, reviewer permissions and combined report semantics.
- Typecheck: **PASS**. Build: **PASS**, with the existing chunk-size warning.
- Golden A: **579.40 PASS**; B: **338.06 PASS**; C: **2428.44 PASS**; combined: **3285.90 PASS** (kgCO2e).
- PDF QA: three technical and three executive reports rendered and visually inspected across all 33 pages. Technical reports remain 9 pages; executive summaries remain 2 pages. Updated labels fit existing tables and covers. Title, profile/filename, source status, validation note and preserved reviewer sign-off are asserted in PDF tests. Frozen canonical report inputs remain unchanged after both exports.
- Case-insensitive source audit: the old technical-report name does not remain in current runtime output labels, copy or metadata. The sole current source-test occurrence is an explicit negative assertion preventing the old name from returning.
- Browser report/download regressions: **2/2 PASS** in Chromium (field-mapping import/report/export and partial-document report scope).
