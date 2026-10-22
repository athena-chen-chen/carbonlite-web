# Document-scoped flow aligned with the five-step workflow

## Before: implementation audit

1. Input Data keeps selected IDs in local `selectedDocumentIds` state. It derives selected documents from the existing document list.
2. The selected-file CTA switched from “Review Selected Data” with no eligible selection to “Generate Report” after selection.
3. The handler navigated directly to `/reports`, with `{ reportScope: 'selectedDocuments', selectedDocumentIds }` route state.
4. `/metrics-summary` already implements document-scoped Calculation Results. It accepts selectedDocumentIds and requests the calculation summary for that scope, bypassing workspace date filters for selected documents.
5. Selected IDs are string arrays. Explicit selected record IDs take priority on the results page.
6. Scope is carried in existing React Router location state; no new context/store/query system is needed. `DocumentScopeContext` renders the scope panel and links, rather than storing a second scope.
7. Reports' existing `useReportData` recognizes selectedDocumentIds / reportScope and requests the same scoped metrics overview. Direct Reports entry retains its date-range workspace behavior.
8. Document-scoped Calculation Results already had a plain Generate Report link inside its scope panel. Workspace-wide Calculation Results had no corresponding next-step CTA.
9. `loadMetricsOverview` calls the existing GET calculation-summary endpoint for selected scopes and GET metrics summary for workspace scopes. Its legacy recalculate option does not issue a calculate POST. No service or backend change is needed for this task.
10. Existing coverage included Input Data imported-subset eligibility, selected-document summary loading, Reports selected scope, golden report fixtures, field-mapping import/export, and partial-document browser tests. The partial-document browser test previously began with a direct jump from Input Data to Reports.

Eligibility is already `Number(importedRecordCount) > 0`, independent of document status. Zero-import files are disabled and skipped by select-all. The existing safe guard against mixed/ineligible selections and processing states is retained.

## After: smallest safe change

Input Data's selected-file CTA always reads **View Calculation Results** and navigates to `/metrics-summary` with the same selected-document state. Its helper says “Select one or more files with imported records” when no eligible selection exists. Review Data's introduction says “Select imported data to view calculation results.” Selected-file helper copy explains that unresolved source rows remain excluded.

The post-import success area also leads to Calculation Results; its direct View Reports button was removed. Existing global navigation remains available.

Calculation Results keeps its Step 4 title, subtitle, calculations, scopes, factors, and traceability. The existing document-scope Generate Report link is styled as a primary action near the header. Direct workspace entry also has a primary Generate Report link to the existing `/reports` route. Existing selected-record scope is carried when applicable; document scope is retained for document entry. Calculation Results' scope panel can also display filenames from returned calculation details.

Reports remains Step 5 and continues to render/export the existing Executive Summary, Technical Emissions Report, and CSV. It uses the same scope and calculations as before. The Generate Report navigation action on Calculation Results does not download a PDF or create a calculation.

## Preservation

- Document scope preserved into Reports: YES.
- Workspace-wide behavior preserved: YES.
- Partial-import behavior preserved: YES.
- Backend changed: NO.
- Database changed/migration: NO.
- Calculation logic changed: NO.
- Report calculation logic changed: NO.
- No factor, snapshot, persistence, relation, CSV schema, report output-content, audit-event, tenant-isolation, or workflow-step changes.
- Pre-existing working-tree changes were preserved.

## Tests and evidence

Focused component coverage checks the new CTA and disabled state, no selected-file Generate Report button, imported and Needs Review file eligibility, exclusion of zero-import files from select-all, existing route state, post-import navigation, Step 4, and exactly one Generate Report link with workspace/single-file/multi-file handoff.

The existing browser regression now traverses Input Data → Calculation Results → Reports for single and multiple documents. It checks Steps 4 and 5, imported/unresolved counts, report scope, totals and PDF output, no calculate/create/confirm POST simply from viewing, and subsequent corrected-subset refresh behavior. The independent field-mapping import/export browser test also passes.

Golden A (partially imported workbook): 3 imported, 2 calculated emissions records, 1 tracked metric, 6 unresolved source rows, total **579.40 kgCO2e**. Unresolved rows remain outside totals while the document remains Needs Review.

Golden C (field-mapping workbook): 5 imported records, **2428.44 kgCO2e**.

Two-workbook selected scope: 8 imported, 7 calculated emissions records, 1 tracked metric, 6 unresolved source rows, **3007.84 kgCO2e**, matching Reports and its exported technical PDF. Scope totals: Scope 1 **1228.74**, Scope 2 **1181.90**, Scope 3 **597.20**. Facility checks: Calgary HQ **1602.14**, Vancouver Fleet **808.50**, Corporate Travel **492.20**, Toronto Client Visit **60.00**, Toronto Sales Trip **45.00**.

A separate Manual Gasoline 50 L / 115.50 kgCO2e fixture is excluded from selected-document results and reports. Direct workspace results and their Reports continuation include it, producing **3123.34 kgCO2e**.

These browser checks use the repository's synthetic API fixtures; they do not constitute a new live-backend/database validation. Calculation Results and Reports screenshots were reviewed for the selected scope and primary next-step action.

## Files changed for this task

- `src/pages/UploadPage.tsx`
- `src/pages/UploadPage.sample.test.tsx`
- `src/pages/MetricsSummaryPage.tsx`
- `src/pages/MetricsSummaryPage.test.tsx`
- `src/components/DocumentScopeContext.tsx`
- `apps/web-e2e/tests/partial-document-scope.spec.ts`
- `docs/audits/document-scoped-five-step-flow.md`

## Final verification

- Golden A: 579.40 PASS.
- Golden C: 2428.44 PASS.
- Two-workbook scope: 3007.84 PASS.
- Frontend tests: PASS, 1,134 tests in 89 files; both database-script tests also pass (`npm test -- --maxWorkers=2`).
- Focused page tests: PASS, 165 across Input Data, Calculation Results, and Reports.
- Browser regressions: PASS, field-mapping import/export and partial/multiple-document workflow. The strengthened partial-document test was rerun successfully after adding facility/count assertions and screenshots.
- Backend tests: not run; backend untouched.
- Typecheck: PASS.
- Build: PASS, with existing bundle-size/Browserslist notices.
- Diff whitespace check: PASS.
