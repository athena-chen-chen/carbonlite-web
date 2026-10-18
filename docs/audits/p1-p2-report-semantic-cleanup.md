# P1/P2 report semantic cleanup — October 16, 2026

## Before implementation audit

The implementation audit was reported in chat before editing code. Existing working-tree changes in both repositories were preserved.

| Question | Finding / owner |
| --- | --- |
| Where did “2025 reporting period” originate? | `FormalReportPreview` passed the first year extracted from `reportPeriod` plus “reporting period” to `summarizeInventoryBoundary`. This was a presentation projection, not a record filter. |
| Where does the actual date range originate? | `loadDefaultMetricsDateRange` → `deriveMetricsDateRange` uses activity record date extrema. `useReportData` stores the selected range, sends it to the summary endpoint, and places it in `CanonicalReportData.reportingPeriod`. For this scope: 2025-08-01 through 2026-10-14. |
| What is “reporting year”? | Calculation details derive it from each record's year/date. The API also has separate organization default/report reporting-year concepts. Neither replaces the selected report date range. The offending preview label was derived, not a configured reporting year. |
| Where did “3 source files” originate? | `buildSourceEvidenceSummaryRows` groups display rows by source label/type/import method. The PDF, workbook, and Manual Entry produce three groups; the preview heading and `SourceEvidenceSection` called all groups files. |
| Which evidence gets counted? | Imported activity origins, including tracked Water. Unimported/detected source-review rows are separate evidence and do not contribute file/input counts. |
| What did “8 factors” mean? | `buildFactorsReviewedItem` filters calculated emissions details and evaluates review status for every record. It counts eight record-level usages, not unique definitions or versions. |
| Where is traceability evaluated? | `reportingReadiness.getCalculationTraceabilityGaps` / `buildTraceabilityItem`, through the canonical readiness builder and preview's shared helper. |
| Which record failed? | `cmv8qhq0d001ngd6kbkogmrs1`: MANUAL Electricity, 980 kWh, activity date 2026-10-14, 519.40 kgCO2e. Source reference, filename and document identity are null. |
| What failed previously? | The old source predicate accepted only reference/file/document/snippet evidence. It rejected the manual origin without examining its real creation evidence. |
| Is durable manual lineage present? | Yes. `CREATE_ACTIVITY_RECORD` audit `cmv8qhq50001pgd6k4yho9eou` records actor `cmp37x9i30005gdcui8pa1ki6`, timestamp `2026-10-14T23:21:28.981Z`, and `newValue` containing the original record ID, MANUAL source type, activity type/date/quantity/unit. The record creation time is `2026-10-14T23:21:28.813Z`. |
| What was the actual gap? | The API calculation-summary projection did not expose the creation-audit evidence. ActivityData itself has no creator field. No schema change or synthetic audit event is needed. The general audit-log API is admin-only, so reports must not fetch it from the browser. |
| Which outputs consume these facts? | Report preview uses shared summary/readiness helpers; Executive and Technical PDFs consume canonical metadata/readiness/factor review. Technical PDF and Report UI show source evidence. CSV uses record-level calculation details and its existing schema is unchanged. |
| Which canonical owners should change? | Canonical period/source helpers and factor-review builder; shared readiness evaluator; API summary's provenance projection. Renderers display these facts. |

## Implementation

- Canonical period labels use valid start/end dates in the existing `YYYY-MM-DD to YYYY-MM-DD` style. Invalid/missing periods keep the existing supplied label. The preview no longer substitutes the first year. Inclusion and filtering are unchanged.
- Source counts use raw source type, activity ID, document ID and filename. Uploaded sources deduplicate by durable document identity, with filename fallback. Individual manual entries are counted separately; manual source types never become files even if a filename is present. The regression is **3 source inputs / 2 uploaded files / 1 manual entry**.
- Readiness explicitly describes **8 calculated records / 8 record-level factor usages**. Canonical factor review reuses the existing factor inventory helper, which deduplicates by factor-version ID, then factor ID, then its existing complete snapshot identity fallback. The captured live input contains duplicate natural-gas selection rows from supplemental merging; canonical review now derives **5** distinct selections without hardcoding it.
- Tightened the existing N/A placeholder expression in the factor inventory helper: it previously also matched “Natural Gas”. This is a presentation-only correction.
- API `buildSummary` reads organization-scoped, included-manual-record creation audits and projects only audit ID, actor ID, timestamp and original activity values into `manualSourceProvenance`. Original snapshot identity and MANUAL source type must match. No frontend creator guessing, file fabrication, database writes, migrations, or audit-event synthesis.
- Shared traceability requires valid manual creation evidence plus normal activity/factor/result lineage. Imported records still require real document identity or filename. A generic source-reference label alone is insufficient. Null calculation results do not pass numeric validation. Missing evidence stays incomplete, with record IDs and explicit gaps in the readiness action.
- CSV headers/order and values are unchanged. No calculation, factor matching, unit conversion, scope assignment, import, facility grouping, or Task 7 code changed.

## Validation and acceptance

| Acceptance item | Result |
| --- | --- |
| Reporting-period semantics | FIXED: 2025-08-01 to 2026-10-14 |
| Source evidence semantics | FIXED: 3 inputs / 2 files / 1 manual entry |
| Factor-count semantics | FIXED: 8 usages versus 5 distinct selections |
| Calculation traceability | 8 of 8 complete with existing creation-audit evidence |
| Manual entry requires a fake source file | NO |
| Calculation coverage | Unchanged: 100%, 8/8; Water excluded |
| Calculations / matcher changed | NO / NO |
| Golden A/B/C | PASS: 579.40 / 338.06 / 2428.44 |
| Combined regression | PASS: 3285.90 |
| Report UI | PASS: component and ReportingPage tests |
| Executive PDF | PASS: golden profiles, combined facts, visual inspection |
| Technical PDF | PASS: golden profiles, combined facts, visual inspection |
| Web build | PASS |
| API typecheck | PASS |
| Web typecheck | BLOCKED: existing tsconfig references unavailable @nx/react and Node types. A diagnostic run overriding those options reports existing unrelated type errors. No error references the changed semantic helpers, readiness, canonical builder, or PDF renderer. |

Combined scope totals remain **1377.06 / 1371.64 / 537.20 kgCO2e**. Usage remains **2588 kWh Electricity / 11.50 GJ Natural Gas / 350 L Gasoline**. Facility totals remain **Calgary HQ 1082.74; Unassigned 857.46; Vancouver Fleet 808.50; Corporate Travel 492.20; Toronto Sales Trip 45.00**.

Read-only runtime validation captured the existing nine-record workspace using the updated API summary, then ran it through the real frontend `loadMetricsOverview` path (including the existing pilot factor augmentation/supplemental calculation path) and canonical builder. All eight calculated records have no traceability gaps. The raw API alone currently calculates three Electricity records; this existing behavior was preserved. No database mutation or deployment was performed.

Final verification: **196 web tests passed across 16 files**, including the captured-data runtime check; **40 API tests passed**.

Focused coverage includes period validity, source classification, distinct factor-version identity, real/missing/mismatched manual evidence, imported evidence with/without source identity, null results, combined scopes/facilities/usage/coverage, Report UI and both PDFs. Existing golden PDF profiles retain their two-page Executive / nine-page Technical expectations. The nine-record combined Technical fixture has eleven pages. Representative PDF covers, results/readiness, and source-evidence pages were rendered and inspected.

## Files changed for this task

Web:

- `src/reports/domain/reportSemantics.ts`
- `src/reports/domain/reportSemantics.test.tsx`
- `src/reports/domain/buildCanonicalReportData.ts`
- `src/reports/domain/buildFactorReviewSummary.ts`
- `src/reports/domain/reportTypes.ts`
- `src/reports/pdf/technicalReviewPdf.ts`
- `src/reports/pdf/__tests__/pdfRenderers.test.ts` (repair missing factor setup in existing provenance tests)
- `src/components/FormalReportPreview.tsx`
- `src/components/FormalReportPreview.test.tsx`
- `src/components/reports/sections/SourceEvidenceSection.tsx`
- `src/services/metrics.ts`
- `src/utils/reportingReadiness.ts`
- `src/utils/reportingReadiness.test.ts`
- `src/pages/ReportingPage.test.tsx`
- `docs/audits/p1-p2-report-semantic-cleanup.md`

API (adjacent repository; applied with filesystem approval):

- `../carbonlite-api/src/metrics/calculation-quality.service.ts`
- `../carbonlite-api/src/metrics/manual-source-provenance.spec.ts`

Temporary runtime evidence and logs are under `tmp/report-semantic-api/`; generated QA PDFs/PNGs are under `/private/tmp/report-semantic-pdfs/`.
