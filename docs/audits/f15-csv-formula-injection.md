# F15 — Spreadsheet formula injection at the CSV export boundary

## Current export audit

The existing CSV serializers converted values to strings, quoted commas/quotes/newlines (and, in the shared report helper, carriage returns), and doubled embedded quotes. They did not neutralize spreadsheet formulas. CSV quoting alone did not make user text such as `=SUM(1,2)` inert.

| Surface | Current serialization path | F15 treatment |
| --- | --- | --- |
| Technical Emissions Report CSV | `useReportExports` → `buildPilotCsv` → `escapeCsvValue` | Shared safe serializer, explicit numeric columns |
| Data Records export: all/filtered/selected | `ActivityDataPage` → `buildDataRecordsCsv` | Shared safe serializer, explicit numeric columns and mixed factor-name/value handling |
| Review-package Data Records | `buildReviewPackageDataRecordsCsv` → local `buildCsv` | Shared safe serializer |
| Site/facility totals | `buildReviewPackageSiteFacilityBreakdownCsv` → `buildCsv` | Shared safe serializer |
| Site/facility activity detail | `buildReviewPackageSiteFacilityActivityBreakdownCsv` → `buildCsv` | Shared safe serializer |
| Factor/source summary | `buildReviewPackageFactorSourceSummaryCsv` → `buildCsv` | Shared safe serializer |
| Calculation traceability | `buildReviewPackageCalculationTraceabilityCsv` → `buildCsv` | Shared safe serializer |
| Audit evidence | `buildReviewPackageAuditEvidenceCsv` → `buildCsv` | Shared safe serializer |
| Records needing attention | `buildReviewPackageRecordsRequiringReviewCsv` → `buildCsv` | Shared safe serializer |
| Calculation Results totals handler | Local `handleDownloadCSV`; its UI button is commented out | Reuses shared serializer, numeric total column; button remains disabled in source |
| Data Collection Guide template | Static example rows with local `escapeCSV` | Reuses shared serializer; no user-controlled values |
| Input Data template | Static `INPUT_TEMPLATE_HEADERS.join(',')`; no data rows | Already safe static content; unchanged |

The review-package builders are exported utilities; the audit covers them even where no active download is currently wired to them. Static public CSV fixtures/sample files and CSV input parsing are not export paths accepting user text.

### Cell semantics

User-controlled or source-derived text includes facility names/IDs, custom activity labels/categories, units, country/province labels, source filenames/sheets/references, notes/reasons, custom factor names, authority/document/URL labels, versions and selection explanations. Audit evidence additionally includes text IDs, report metadata, warnings, and calculation formula descriptions. These cells remain text even when they look numeric, such as a factor name `-123`.

Organization names are not columns in the audited CSV schemas. Dates are formatted text. No organization/PDF/UI output was changed to add CSV-specific prefixes.

Numeric columns include record numbers, quantities, costs, factor values, emissions, years, source rows, record counts, scope totals, and numeric activity/calculation versions. Numeric values reach serialization as **both numbers and preformatted strings**. Existing helpers round/format numeric values before serialization, and traceability/evidence include localized grouped display strings. Those existing formatting and calculation functions remain unchanged.

The Data Records “Emission Factor” column is mixed: it exports a factor name when present, otherwise the numeric factor value. F15 chooses text/number semantics from that source-field distinction, not from whether the name looks numeric.

Existing export tests covered positive numbers, schema labels, commas/quotes, and a multiline-capable test parser. They did not provide focused formula-prefix or negative-number security coverage.

## Implementation

A small shared helper in `src/utils/csv.ts` separates `neutralizeSpreadsheetText` from CSV syntax escaping. `escapeCsvValue` remains re-exported from `reportCsvExport.ts` for compatibility.

Order:

1. Determine numeric versus text semantics from the typed value and export schema.
2. For text, detect `=`, `+`, `-`, or `@` after leading whitespace/control characters. Also cover leading TAB/CR/LF and full-width formula-prefix variants.
3. Prefix dangerous text with an apostrophe, preserving its original whitespace/content, then force CSV quoting and double embedded quotes.
4. Apply ordinary CSV syntax escaping to other cells and join the existing rows.

Typed numbers bypass text neutralization. Schema-declared numeric strings must match a numeric token grammar (including existing decimal/grouping displays) before bypassing it. Invalid formula-like strings in numeric columns fall back to safe text serialization. Text fields never receive this numeric-string exemption.

No stored data, input parsing, persistence, API responses, UI rendering, PDF formatters, report math, factor values, report hooks, or F10 export readiness/request identity logic changed. No dependency added. No backend/schema/migration changes. F01–F14 implementations remain untouched.

The apostrophe-plus-quoted-field approach follows the initial-open text mitigation described by [OWASP CSV Injection](https://community.owasp.org/attacks/CSV_Injection). It is an export representation change, not a transformation of canonical data.

## Verification

| Check | Result |
| --- | --- |
| Formula prefixes `=`, `+`, `-`, `@` | PASS |
| TAB, CR, LF, whitespace before formulas | PASS |
| Full-width formula prefixes | PASS |
| Negative numbers `-1`, `-1.5`, `-1000.25` | UNCHANGED |
| Positive numbers and zero | UNCHANGED |
| Numeric strings and grouped/localized numeric displays | UNCHANGED |
| Text `-123` versus numeric `-123` | PASS: distinct text/number handling |
| Harmless names/text/ordinary whitespace | UNCHANGED |
| Commas, doubled quotes, CR/LF, mixed formula/quotes | PASS |
| Full realistic malicious-text export fixtures | PASS |
| All active data-bearing CSV builders use shared protection | YES |
| Stored/canonical fixture data after export | UNCHANGED |
| F10 export guards and selected-scope request identity | PASS |
| Existing report builder/PDF/page regressions | PASS |

Tests ran in the requested layers:

- CSV serializer tests: 65 passed.
- Existing report/Data Records/review-package CSV tests plus full malicious-text export tests: 52 passed.
- F10 export hooks/report data/ReportingPage: 51 passed.
- Report domain builders, PDF renderer tests, ActivityDataPage, and MetricsSummaryPage: 174 passed.

**Total: 342 tests across 14 files passed.** Full CSV fixtures are parsed with the existing SheetJS dependency in raw-text mode to verify record/column counts and quoted multiline cells. Checks include filenames `=evil.csv`, facility `=SUM(1,2)`, source references beginning `@HYPERLINK`, multiline notes beginning `+CMD`, custom factor names, numeric strings, negative values, and unchanged emissions outputs such as 579.4, 2428.44, 3007.84, 808.5, 115.5, and 268. Existing decimal formatting is retained; explicit serializer inputs `579.40`, `808.50`, and `268.00` also retain their exact spelling.

Frontend typecheck: PASS. Production build: PASS (existing large-chunk advisory).

Pre-existing electricity factor-ID failure: NOT ENCOUNTERED in this validation scope; untouched. No backend tests or database changes were needed.

## Files changed for F15

- `src/utils/csv.ts` — shared boundary serializer
- `src/utils/csv.test.ts` — direct security/numeric/syntax coverage
- `src/utils/csvFormulaInjection.test.ts` — complete CSV fixtures across all builders
- `src/utils/reportCsvExport.ts` — safe serialization and numeric schema
- `src/utils/reportReviewPackageCsvExport.ts` — safe serialization and numeric schemas
- `src/utils/dataRecordsCsvExport.ts` — safe serialization and mixed factor field semantics
- `src/pages/MetricsSummaryPage.tsx` — dormant handler uses shared serializer
- `src/pages/DataCollectionGuidePage.tsx` — static template uses shared serializer
- This audit report

Pre-existing working-tree report/UI/test changes were preserved; F15 did not refactor those areas.

## Remaining CSV compatibility limits

Native Excel/LibreOffice execution was not exercised; the automated checks verify the exported representation, CSV parsing, numeric preservation, and guard behavior. Spreadsheet import settings and application behavior differ. A protective apostrophe may be visible or retained as data in downstream tools. Editing/saving/reopening or stripping protection in another application can reactivate formulas; OWASP explicitly notes that CSV has no universal mitigation across all spreadsheet applications and downstream consumers. This change protects CarbonLite's generated CSV boundary and does not guarantee safety after arbitrary downstream transformations.

F15 only; no F16 or unrelated security work performed.
