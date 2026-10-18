# Document-scoped review/report for partially imported files

Completed 2026-10-18. Scope: frontend selection eligibility and interactive scope context.

## Audit

- `UploadPage.tsx` previously allowed all document checkboxes. `selectedImportedDocuments` required normalized status `IMPORTED`; only that group could navigate to Reports. Ready/review-required documents entered draft-row review, and mixed groups disabled the action.
- `documents.service.ts::findAll` in the sibling API already returns `importedRecordCount` from `_count.activityData`. No additional endpoint or database change is needed.
- `UploadPage.tsx::handleSelectedDocumentsAction` uses `/reports` route state `{ reportScope: 'selectedDocuments', selectedDocumentIds }`.
- `useReportData::loadReportData` and `MetricsSummaryPage::loadSummary` already pass selected IDs through `loadMetricsOverview`. `metrics.ts::getCalculationSummary` serializes them as the `selectedDocumentIds` query parameter for `/metrics/calculation-summary`.
- API `CalculationQualityService::isInScope` checks linked source/document IDs. Its existing summary includes scoped ActivityData and persisted calculations, rather than unconfirmed review rows. `metricsOverview.ts::loadSourceReviewRows` separately requests source-review evidence for selected documents. Those rules remain unchanged.

## Result

| Area | Before | After |
| --- | --- | --- |
| Needs Review document with 0 imported records | Selectable for draft-row review | Reporting checkbox disabled with “No imported records are available for calculation review yet.”; Review Rows remains available |
| Needs Review document with imported records | Routed to draft review or incompatible with Imported selections | Eligible for imported-subset reporting while retaining Needs Review status and Review Rows |
| Checkbox behavior | Every visible document selectable | `hasImportedRecords`: count > 0; unknown/null/zero counts fail closed; select-all skips ineligible documents |
| Review Selected Data behavior | Status determined review/report/mixed actions | Empty selection remains disabled; eligible selection uses existing Generate Report action and selected-document route state |
| Document-scoped calculation scope | Existing backend ID filtering | Unchanged; imported records only, with a visible scope/count panel and link to Reports |
| Document-scoped report scope | Existing backend ID filtering | Unchanged; visible source filename(s), imported count, unresolved count, exclusion note and link to Calculation Review |
| Unresolved row handling | Existing separate review evidence | Remains excluded from emissions/coverage; visible alongside imported records; full report source-review evidence retained |
| Partial confirm follow-up | Existing record-level confirmation/idempotency | Unchanged; refreshed reads show updated imported/unresolved counts without frontend record creation |
| Multi-document behavior | Imported-only status groups | Any selected documents with imported records combine through the existing ID filter; zero-import documents are omitted |

Selection now consistently means the imported subset. The obsolete batch draft-review selection handler was removed; per-document Review Rows remains the way to correct unconfirmed rows. No confirmation handler or import payload was edited. Existing reporting action labels were retained to avoid unnecessary wording changes.

## Protected behavior

| Area | Changed? |
| --- | --- |
| Document status semantics / enum | NO |
| Partial confirm | NO |
| Record-level idempotency | NO |
| Calculation logic / snapshots | NO |
| Factor matching / applicability | NO |
| Report/PDF/CSV semantics | NO |
| Database | NO |
| Workspace-wide reporting | NO |
| Duplicate-file handling | NO |
| Tenant isolation | NO |
| Audit logic | NO |

No backend files were edited. Report builders, coverage formulas, PDF renderers and shared source-review status logic were not edited. The scope panel is interactive presentation only. Source-review availability is displayed as unavailable when the existing summary reports no available evidence.

## Validation

| Check | Result |
| --- | --- |
| Golden A | PASS: 579.40 kg CO₂e; 3 imported, 2 emissions-bearing calculations, 1 tracked metric, 6 unresolved; 100% calculation coverage |
| Golden C | PASS: 2,428.44 kg CO₂e; five imported records |
| Combined existing golden | PASS: 3,285.90 kg CO₂e |
| Frontend | PASS: `pnpm test --maxWorkers=2`; 87 Vitest files / 1,074 tests, plus two database-selection script tests |
| Backend | PASS: `pnpm --dir ../carbonlite-api test:unit`; 24 suites / 251 tests |
| Browser | PASS: `pnpm exec playwright test -c apps/web-e2e/playwright.config.ts partial-document-scope.spec.ts` |
| Typecheck | PASS: `pnpm typecheck` |
| Production build | PASS: `pnpm build:production` |

Browser coverage uses mocked API reads and the actual frontend: disabled empty-file selection, Needs Review badge and Review Rows retention, scoped Reports → Calculation Review → Reports continuity, Technical PDF download containing 579.40, fully imported Golden C, refreshed 4-imported/5-unresolved scope, repeat-read stability, and mixed-status multi-document selection. Unresolved fixture quantities deliberately contain large values; they do not enter the activity/calculation response.

The corrected-row browser case simulates the authoritative read after confirmation; it does not perform a new live-backend confirmation. Existing frontend and backend regression tests separately verify newly ready rows, partial confirmation and repeated-confirm idempotency. This is not a new live-database import certification. No confirmation/calculation writes are made by the scoped browser scenario.

Backend tests initially encountered sandbox restrictions on test-server ports; the approved rerun passed. Existing Browserslist and production chunk-size warnings remain.

## Files changed for this task

- `src/components/DocumentScopeContext.tsx` (new)
- `src/pages/UploadPage.tsx`
- `src/pages/MetricsSummaryPage.tsx`
- `src/pages/ReportingPage.tsx`
- `src/pages/UploadPage.test.ts`
- `src/pages/UploadPage.sample.test.tsx`
- `src/pages/MetricsSummaryPage.test.tsx`
- `src/pages/ReportingPage.test.tsx`
- `apps/web-e2e/tests/partial-document-scope.spec.ts` (new)
- `docs/audits/partial-document-review-report-scope.md` (this document)

The workspace contains earlier changes; the list identifies this task's contributions rather than all uncommitted work.
