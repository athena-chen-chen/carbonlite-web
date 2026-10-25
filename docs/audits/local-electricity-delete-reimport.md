# Electricity missing factor after deleting and re-importing a PDF

Investigated 2026-10-25 against frontend `ae3f095cf7cd0e027e2f3d8c46c1a7467f3e2bc0`.

## Finding and evidence

The reproducible defect is frontend province normalization. Saved pilot PDF extractions in the configured Neon database contain both `Alberta` and `Alberta (AB)` for the 980 kWh electricity row dated 2026-09-30. These are raw extraction fields, without `matchingStatus` or `calculationStatus`. The database also contains the system Alberta electricity factor at 0.53 kgCO2e/kWh with jurisdiction `Alberta`. Inspection used explicit read-only database transactions; no factors, documents, or accounting records were changed.

Before the fix, `normalizePreviewProvince` → `normalizeProvince` → `normalizeJurisdictionRegion` transforms `Alberta (AB)` into `Alberta (ab)`. Electricity requires an exact province match, so frontend `evaluateActivityRecord` derives `MISSING_FACTOR`. The other emissions rows can match their Canada-wide factors, Water remains tracked-only, and Diesel kg remains a unit mismatch.

A deterministic hook regression reproduces exactly that six-row status pattern. Plain `Alberta` on both extractions passes before the fix. Changing only the second extraction's province to the observed `Alberta (AB)` fails before the fix, with either a new document ID or a reused ID. Both variants pass after the fix. Thus deletion and identity reuse are not necessary causes: re-extraction supplies a different spelling.

There is also a runtime configuration discrepancy with the task context: a read of the running `http://localhost:5173/src/config/api.ts` reported `VITE_API_BASE_URL=http://localhost:3333/api`. That API's health endpoint reported environment `local`; the local backend `.env` points to Neon. The published frontend bundle uses `https://carbonlite-api.onrender.com/api`. No configuration was changed.

The published frontend bundle has the same province alias normalization limitation. This defect is therefore input-dependent, not intrinsically localhost-only. Successful production imports are consistent with canonical province output; the exact extraction response from the reported successful production attempt was not captured. No production upload/delete cycle was performed, since it would modify production data. The investigation establishes the defect and reproduces the symptom, but cannot prove which browser attempt produced each retained extraction.

## Lifecycle trace

| Stage | Behavior and conclusion |
| --- | --- |
| Upload | `useDocumentUpload` clears the file input after upload. Selecting/uploading begins a new review generation. File hash duplicate detection queries existing documents; it is not a persisted review-row cache. |
| Extract | Each PDF extraction calls the API. Saved raw province fields can differ between extractions of the pilot PDF. |
| Build review rows | `buildEditableParsedActivities` creates rows with the current document ID and normalizes extraction fields, including province. This is where the composite province spelling was mishandled. |
| Province assignment | Both name and code are present in `Alberta (AB)`; no inference or default province is required. Bulk province assignment is unrelated. |
| Factor match | `enrichDraftRowsWithCalculationStatus` invokes `buildDocumentImportActivityPayload` and frontend `evaluateActivityRecord`. Exact electricity province matching correctly rejects the malformed normalized province. Raw PDF rows do not take the canonical-ready bypass. |
| Delete | The backend deletes the source and cascades extraction deletion, preserving previously imported accounting records. The frontend document collection increments its request generation and removes the document. `removeSourceDocument` removes review rows, detected items, preview IDs, and relevant imported keys, and invalidates pending review work. |
| Async invalidation | Review generations and row revisions reject obsolete extraction and row-evaluation responses. The regression needs no late responses to fail. |
| Factor catalog | The hook retains its catalog across deletion; the regression uses the exact same correct catalog on both imports and verifies one catalog fetch. Clearing it would not repair malformed province text. |
| Imported/document keys | Imported keys are scoped by document identity and refreshed for the active review. New rows receive local row identities. The regression covers both new and reused document IDs with the same filename. |
| Storage | Review rows and the factor catalog are hook state/refs, without localStorage/sessionStorage persistence. Auth uses localStorage; deletion marks metrics stale in sessionStorage. Neither transforms province values. |
| Re-import | Same file bytes/hash/filename do not preserve a deleted extraction. A fresh extraction can return the composite province spelling and trigger frontend `MISSING_FACTOR`. |

## Narrow fix and validation

`normalizeProvince` now recognizes a full Canadian province name followed by its matching two-letter abbreviation. Both parts must agree with the existing province table. Conflicting/unknown pairs stay unresolved; unsupported pilot provinces remain unsupported. No factor eligibility, matching policy, data, backend, UploadPage logic, configuration, or F17/F18/F19 changes were made.

Regression: `useDraftReview.lookup.test.ts`, three cases covering unchanged province spelling, composite spelling with a new ID, and composite spelling with a reused ID. Each case extracts six pilot rows, asserts the first match at 0.53 / 519.4 kgCO2e, deletes review state, re-extracts the same filename, and asserts all six statuses again. This isolates the review lifecycle; upload transport and backend deletion are not simulated by this test.

Validation: 311 tests passed across 11 relevant files, including UploadPage, upload/deletion hooks, review races/lookups, province handling, factor governance, matching, and canonical evaluation. TypeScript checking and `git diff --check` passed. Before the fix, the two composite-province lifecycle cases failed with only Electricity switching to `MISSING_FACTOR`.

## Hotfix freeze validation

The freeze review confirmed that the only runtime change is the province normalization above. Focused province, draft-review lookup/lifecycle, canonical evaluation, and factor matching suites passed: 111 tests across four files. The three lifecycle cases preserve Natural Gas 8.5 GJ, Gasoline 350 L, Water 18 m3 tracked-only, Accommodation 4 nights, and Diesel 240 kg unit mismatch alongside Electricity 980 kWh at 0.53 / 519.4 kgCO2e.

The initial default-concurrency `pnpm test` run passed 1,438 Vitest tests and failed two report-scope handoff assertions in unchanged `MetricsSummaryPage.test.tsx`. All 75 tests in that file passed in isolation on both the previous release and this hotfix. A complete rerun with `pnpm test --maxWorkers=2` passed all 1,440 Vitest tests across 107 files, plus both Node script tests. This is consistent with concurrency-sensitive test behavior; its cause was not established or changed in this hotfix. `pnpm run typecheck`, `pnpm build`, and `git diff --check` passed. The build emitted Browserslist-age and bundle-size warnings.

`docs/structural-refactor-assessment-2026-10-24.md` is a known excluded untracked document from prior structural assessment work. It contains illustrative code and proposals, not runtime application changes; no history for this exact path exists in available Git refs. It is unrelated to this defect and remains untouched and excluded from the hotfix. The separate backend checkout remains at release `78350bdd93b47f28c0fc03460ab8b662a731f0f7`; its pre-existing uncommitted structural work was not modified by this freeze. No factor data, eligibility policy, backend, configuration, or deployment changes were made.
