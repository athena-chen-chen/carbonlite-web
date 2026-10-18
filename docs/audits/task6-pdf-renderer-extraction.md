# Task 6 — PDF renderer extraction

Verified 2026-10-14 (America/Edmonton).

**TASK 6 = COMPLETE** for the structural extraction and golden export acceptance checks. The standard repository typecheck remains blocked by existing missing type definitions, as detailed below. No deployment or further broad refactor was performed.

## Before implementation audit

`ReportingPage.tsx` had **3,326 lines**. Approximately 1,800–2,000 lines were PDF drawing, layout, display formatting, and export side effects. The page imported `jsPDF` and `jspdf-autotable` directly.

The PDF constants were:

```text
PDF_MARGIN_MM
LANDSCAPE_A4_WIDTH_MM
PDF_APPENDIX_USABLE_WIDTH_MM
PDF_APPENDIX_INNER_BUFFER_MM
PDF_APPENDIX_TABLE_WIDTH_MM
PDF_FOOTER_RESERVE_MM
PDF_TOP_MARGIN_MM
EXECUTIVE_SECTION_GAP_MM
EXECUTIVE_SECTION_TITLE_TO_TABLE_MM
FACTOR_DETAIL_TEXT_WIDTH_MM
FACTOR_DETAIL_LINE_HEIGHT_MM
FACTOR_DETAIL_BLOCK_SPACING_MM
```

The entry functions were `downloadExecutiveSummaryPdf()` and `downloadTechnicalReviewPackagePdf()`. Both created jsPDF documents, drew the reports, saved them, and then emitted audit/activity/analytics side effects.

Shared layout helpers covered:

- `getPdfPageWidth`, `getPdfPageHeight`, `getPdfUsableWidth`, `getPdfTextWidthFromX`, `getPdfAppendixUsableWidth`, `getPdfBottomY`.
- `ensurePdfSpace`, `ensurePdfSectionFits`, `ensurePdfSpaceWithContinuation`.
- `estimatePdfTextBlockHeight`, `drawPdfTextBlock`, `estimatePdfTableSectionHeight`.
- `formatPdfTableValue`, `autoTablePdf`, `drawPdfSectionTitle`.
- `drawReportPdfCover`, `addPdfDocumentControlFooters`, `formatPdfDocumentControlFooter`, `getReportPdfFileName`.

Technical section helpers were `drawInventoryBoundaryPdfSection`, `drawRegulatoryReportingReferencePdfSection`, `drawEmissionsHotspotsPdfSection`, `drawFactorDetailsPdfSection`, `buildFactorDetailText`, `estimateFactorDetailBlockHeight`, and `drawFactorDetailBlock`.

PDF display helpers formatted source-review counts/files/issues/actions/appendices, boundary values/status/date, hotspot levels/exclusion reasons, optional-data counts, readiness table rows, facility activity summaries/thresholds, scope descriptions, and executive limitations/priorities.

### Closure and side-effect dependencies

Most totals, scopes, quality, source review, hotspots, factors, boundary, readiness, and document-control facts already came from CanonicalReportData.

The technical renderer still captured:

- `matchedActivityEmissions` from page state for its Activity Breakdown table.
- `sourceEvidenceRows` calculated by the page from activities and calculation details.
- The page's reviewed regulatory references and optional-appendix default.

Both renderers also captured `location.pathname`, `window.location.href`, `reportScope`, and `loadWorkflowEvents()` for export tracking. These were orchestration dependencies, not drawing inputs.

Each export's existing side effects were:

1. One `createClientAuditLog` call with `EXPORT_PDF`.
2. One `REPORT_EXPORTED_PDF` activity event.
3. One existing legacy `PDF_EXPORTED` activity event, followed by workflow refresh.
4. One analytics `REPORT_PDF_EXPORTED` call.

The technical legacy event did not include `outputProfile`; the executive legacy event did. This distinction was preserved and tested.

## Final architecture and APIs

```text
CanonicalReportData
    ↓
reports/pdf/
    pdfShared.ts
    pdfFormatters.ts
    pdfSections.ts
    executiveSummaryPdf.ts
    technicalReviewPdf.ts
    index.ts
    ↓
useReportExports
    ↓
ReportingPage
```

Renderer APIs:

```ts
buildExecutiveSummaryPdf(report: CanonicalReportData): jsPDF
buildTechnicalReviewPdf(report: CanonicalReportData): jsPDF
```

The public PDF module also exports the unchanged `getReportPdfFileName()` helper. Renderers return documents; `useReportExports` saves them and owns audit, activity-event, analytics, error, and refresh orchestration. The hook contains no PDF drawing code. The page no longer passes renderer callbacks defined inside itself.

- `pdfShared.ts`: page dimensions/constants, space/pagination, text/table drawing, cover, filenames, and document-control footers.
- `pdfFormatters.ts`: existing PDF-only display wording and table formatting.
- `pdfSections.ts`: technical boundary, regulatory, hotspot, and factor-detail drawing.
- `executiveSummaryPdf.ts`: the complete executive renderer.
- `technicalReviewPdf.ts`: the complete technical renderer.
- `index.ts`: the small public renderer API.

Shared UI/PDF formatting remains outside the drawing layer in `reports/presentation/reportPresentationFormatters.ts`: regulatory reference text, carbon-credit level labels, the existing scope-resolution adapter, and the existing optional-appendix default. This prevents a page → PDF drawing dependency and avoids duplicating the shared default.

No PDF module imports ReportingPage, fetches data, queries APIs, rematches factors, recalculates emissions, or logs export events. No report-domain module imports jsPDF.

## Necessary additive snapshot fields

To remove the two raw page closures without changing table behavior, CanonicalReportData now carries:

- `matchedActivityEmissions`: the existing input projection, unchanged.
- `sourceEvidenceRows`: produced by the same existing `buildSourceEvidenceRows(input.activities, input.calculationDetails)` call previously owned by the page.

These are additive presentation fields needed by the typed, single-argument renderer API. Existing domain rules and builders were not redesigned. A regression verifies that the original activity projection is retained and original source evidence is preserved rather than regenerated from normalized fields with different source text. The page also consumes the same canonical source-evidence projection for its existing UI.

Existing canonical totals, readiness, source-review availability, optional completeness, facility grouping, hotspot rules, and factor-review counts remain authoritative.

## Business-logic audit and preserved concerns

The following legacy behavior was identified and preserved rather than silently redesigned:

- Carbon-credit readiness is not present in CanonicalReportData. The optional appendix still uses the existing assessment helper. Its shared default remains disabled. Canonicalizing that optional assessment is a separate follow-up concern.
- Executive pilot-stage wording still uses the existing factor-label/governance-text detector. The authoritative factor-review count continues to come from canonical `factorReview`; no new factor-review algorithm was introduced. A future canonical presentation projection could own the pilot-stage wording signal.
- Tracked/review rows are selected from canonical calculationDetails through the existing shared classification helpers because no corresponding canonical row subsets exist. Their semantics were not changed or copied into a new classifier.
- Scope shares are the same display-only division of canonical scope totals by the canonical total.
- Facility threshold display uses canonical facility groups and canonical regulatory reference inputs. It does not rebuild facility grouping.
- Existing source-review formatters branch on canonical availability/status solely for display wording; they do not reclassify source data.

The unused legacy factor-review count helper was removed from the page rather than introduced as another PDF business-rule owner.

## Line count

| Measure | Lines |
|---|---:|
| ReportingPage before | 3,326 |
| ReportingPage after | 1,206 |
| Removed from ReportingPage | **2,120** |

The reduced page retains page controls/state, presentation composition, and its existing Workflow Audit Trail. Those were inspected but not extracted or redesigned in this task.

## Golden results

| Scenario | Total kgCO2e | Scope 1 | Scope 2 | Scope 3 | Optional cost | Executive pages | Technical pages |
|---|---:|---:|---:|---:|---|---:|---:|
| Messy Excel | 579.40 | 0 | 519.40 | 60.00 | 100%, 3/3 | 2 | 9 |
| ENMAX | 338.06 | 148.32 | 189.74 | 0 | 0%, 0/3 | 2 | 9 |
| Field Mapping | 2428.44 | 1228.74 | 662.50 | 537.20 | 0%, 0/5 | 2 | 9 |

- Messy Excel source review remains 9 / 3 / 6; legitimate costs remain 214.55, 64, and 720 in the golden data.
- ENMAX retains 3 GJ × 49.44 = 148.32 kgCO2e, Canada (Generic), Environment and Climate Change Canada, the existing generic fallback selection, and the 2025-01-01 to 2025-12-31 reporting period. Its document-lineage/Limited source-review behavior remains unchanged.
- Field Mapping retains source review 5 / 5 / 0 and four facility groups: Calgary HQ 1082.74, Vancouver Fleet 808.50, Toronto Sales Trip 45.00, Corporate Travel 492.20.
- Both profiles retain totals, scopes, readiness wording, section order, filenames, document metadata, covers, footers, fonts, margins, column order, appendices, and page breaks.

## Before/after PDF and visual comparison

Before production extraction, a temporary test harness invoked the original page-closure renderers using the same three golden inputs and captured both output profiles. The temporary harness was removed after capturing the baseline.

After extraction, renderer tests generated all six matching PDFs. Comparison found:

- All six filenames identical.
- All six page counts identical.
- All page drawing streams identical, not merely similar totals.
- PDFKit-rendered PNGs identical on **33 of 33 pages** across both profiles and all scenarios.
- Contact sheets and representative full pages were visually inspected for covers, headings, tables, wrapping, factor details, appendices, and document-control footers. No extraction-induced visible change was found.

The comparison does not depend solely on binary PDF equality: tests also inspect text semantics, page counts, metadata, canonical values, read-only behavior, and export side effects. Rendered image comparison independently covers layout. PDF creation timestamps and library-generated file IDs are not used as content-regression criteria.

[Machine-readable comparison evidence](task6-pdf-comparison.json) records all six profiles and all 33 rendered page comparisons. Generated PDFs and PNGs were QA intermediates under `/private/tmp`, not new product assets.

## Tests and validation

- **241 focused tests passed across 13 files**: direct renderer goldens/smokes, export orchestration, ReportingPage PDF/UI regressions, canonical builders/output facts, metrics goldens, spreadsheet mapping, readiness, FormalReportPreview, and CSV regression.
- Renderer generation covers standard calculated data, tracked metrics, Limited document lineage, facility groups, and missing optional costs.
- Deep-frozen snapshots verify that renderers do not mutate report data.
- Direct export tests verify exactly one existing audit/analytics event set for each PDF profile, one workflow refresh, unchanged metadata distinctions, and no success events after renderer failure.
- **2 Playwright export workflows passed**: field-mapping report/export/Audit Trail and ENMAX CSV/Executive/Technical PDF regression. Downloads succeed and the report page remains usable afterward.
- **Vite build passed**.
- Standard frontend typecheck remains blocked by the existing missing `node` and `@nx/react/typings` definitions. A diagnostic run with existing supported type settings still reports unrelated repository errors but reports no errors in the extracted PDF modules, shared presentation module, export hook, or additive canonical changes. No repository-wide typecheck pass is claimed.
- `git diff --check` passed.
- Explicit ReportingPage searches found none of: `jsPDF`, `autoTable`, `PDF_MARGIN_MM`, `ensurePdfSpace`, `drawPdfTextBlock`, `drawInventoryBoundaryPdfSection`, `drawEmissionsHotspotsPdfSection`, `drawFactorDetailsPdfSection`, `downloadTechnicalReviewPackagePdf`, `downloadExecutiveSummaryPdf`, or `getReportPdfFileName`.

## Files added

- Six modules under `src/reports/pdf/` listed above.
- `src/reports/presentation/reportPresentationFormatters.ts`.
- `src/reports/pdf/__tests__/goldenFixtures.ts`.
- `src/reports/pdf/__tests__/pdfRenderers.test.ts`.
- `src/reports/hooks/useReportExports.test.tsx`.
- This audit and `task6-pdf-comparison.json`.

## Files changed

- `src/pages/ReportingPage.tsx`.
- `src/reports/hooks/useReportExports.ts`.
- `src/reports/domain/reportTypes.ts` (additive snapshot presentation fields).
- `src/reports/domain/buildCanonicalReportData.ts` (same existing projections carried in the snapshot).
- `src/reports/domain/buildCanonicalReportData.test.ts` (projection preservation regression).
- `apps/web-e2e/tests/regression-smoke.spec.ts` (post-export page-usability assertions).

Existing uncommitted work was preserved. No dependencies were added. No intentional customer-visible behavior changed. CSV schema, Audit Trail behavior, report UI, factors, calculations, source review, cost completeness, facility grouping, and readiness semantics were not changed. No next refactor was started.
