# P1 facility and optional cost lineage regression

Verification date: 2026-10-14 (America/Edmonton).

The two source lineage defects are fixed in code. No report renderer repair, factor change, formula change, scope change, Facility entity creation, CSV schema change, or ReportPage restructuring was introduced.

## Before implementation: database evidence

A read-only Prisma query against the configured database found the five records from `carbonlite_field_mapping_test (1).xlsx`, imported on 2026-10-13. All five had `facilityId = null`, `facilityName = null`, and `costCad = Decimal(0)` (Prisma JSON serialized the Decimal as `"0"`).

| Activity | facilityId | facilityName | costCad |
|---|---|---|---|
| ELECTRICITY | null | null | Decimal(0) |
| NATURAL_GAS | null | null | Decimal(0) |
| GASOLINE | null | null | Decimal(0) |
| HOTEL | null | null | Decimal(0) |
| AIR_TRAVEL | null | null | Decimal(0) |

The document's saved `DocumentExtraction.extractedRows` contained `facilityName: { value: null, confidence: 'low' }` for every row and no cost field. There were no `SpreadsheetImportReviewRow` records for this source file: it used the document extraction/Confirm path. The original HTTP Confirm request is not retained; its fields below are derived from the current payload builder and verified by the browser regression.

## Electricity lineage at every boundary

| Stage | Before | Corrected behavior |
|---|---|---|
| Source spreadsheet | Location Name = Calgary HQ; no Cost column | Same |
| Spreadsheet column mapping | Existing local parser targets facilityName correctly | Same; existing mapping test passes |
| Document extraction mapping | Strict schema excludes facilityName and rejects extra fields | Schema permits nullable facilityName and instructs preserving source site text |
| Parsed extraction row | Saved facilityName.value = null; cost absent | Calgary HQ; costCad = null |
| Normalized review row | facilityName.value = null; cost missing | Calgary HQ; cost null |
| Saved review row | Saved extracted review has null name; no spreadsheet staging row | Extracted rows preserve facilityName and optional cost |
| Confirm HTTP payload | facility omitted; costCad omitted | facility = Calgary HQ; costCad omitted when missing |
| Backend Confirm normalization | facilityName = null; costCad = Number(null) = 0 | facilityName = Calgary HQ; costCad = null |
| ActivityData persistence | facilityId null; facilityName null; Decimal(0) | facilityId null; facilityName Calgary HQ; costCad null |
| ActivityData API | null facility name; decimal zero serialized as string | source facilityName and null cost survive serialization |
| Metrics/API normalization | No source name available; zero remains supplied cost | Facility entity name takes precedence over source text; null cost stays missing |
| useReportData | Passes normalized calculationDetails into canonical builder | Same architecture |
| buildCanonicalReportData | One Unassigned group; supplied-zero completeness 5/5 | Four source groups; missing-cost completeness 0/5 |
| buildFacilityBreakdown | Delegates to existing buildSiteFacilityRollup; label facilityName → facilityId → Unassigned | Same builder; entity/source precedence resolved before grouping |
| FacilityBreakdownSection | Renders canonical rows | Same; four groups |
| Technical PDF | Consumes canonical output facts | Same; expected names, totals, 0%, and 0 of 5 verified |
| CSV | Null → blank, zero → 0, positive → numeric | Same columns and formatting; all five Cost CAD cells blank |

The earliest facility break was the extraction schema: `additionalProperties: false` with no facilityName property. Backend source aliases also lacked `Location Name`/`locationName`; both preview and Confirm normalization now recognize those aliases.

The earliest cost break was `DocumentExtractionService.readOptionalNumber()`. `readAliasedField()` returns null for absent input, and `Number(null)` yielded zero. The guard now returns null before conversion. Actual numeric zero remains valid.

## Canonical ownership

`buildCalculationQuality()` delegates to the shared readiness builder, which calculates optional cost presence and coverage once for the canonical report. Report UI and Technical PDF consume `report.calculationQuality.dataReadinessSummary.optionalDataCompleteness` (the established equivalent of the requested direct fields). `buildReportOutputFacts()` exposes percent and counts from that summary. Neither renderer has a new completeness algorithm.

The counting rule already preserves explicit zero. The persistence defect required a boundary fix, not a change to that rule.

## After implementation: real PostgreSQL persistence

The corrected compiled backend Confirm service imported the actual XLSX fixture's five rows into a temporary document inside a PostgreSQL transaction. The same transaction queried the persisted ActivityData rows and asserted all values before deliberately rolling back. No persistent Facility entities were created; no original records were changed.

| Activity | facilityId | facilityName | costCad |
|---|---|---|---|
| ELECTRICITY | null | Calgary HQ | null |
| NATURAL_GAS | null | Calgary HQ | null |
| GASOLINE | null | Vancouver Fleet | null |
| HOTEL | null | Toronto Sales Trip | null |
| AIR_TRAVEL | null | Corporate Travel | null |

This verifies database writes and readback, rather than relying solely on browser mock storage. The original five defective records remain unchanged. Correcting existing reports requires a fresh import after the backend fix is deployed, or a separately reviewed source-based historical repair. The regression does not infer names or costs for historical records.

## Verified report results

| Facility | kgCO2e |
|---|---:|
| Calgary HQ | 1082.74 |
| Vancouver Fleet | 808.50 |
| Toronto Sales Trip | 45.00 |
| Corporate Travel | 492.20 |

- Imported/calculated: 5/5.
- Total: 2428.44 kgCO2e.
- Scope 1 / 2 / 3: 1228.74 / 662.50 / 537.20.
- Source Review: 5 reviewable, 5 resolved/imported, 0 requiring review; Spreadsheet / File Import classification retained.
- Optional cost: 0 present / 5 total; 0%.
- Natural Gas: 49.44 kgCO2e/GJ, Canada (Generic), Environment and Climate Change Canada, GENERIC_JURISDICTION_FALLBACK; golden domain/export tests preserve the existing provenance. Browser Confirm also asserts the authority and fallback reason.
- Messy Excel: 214.55 / 64 / 720 remain supplied costs; canonical completeness 3/3 and 100%, CSV numeric values retained.
- ENMAX: 338.06 kgCO2e, 0/3 costs present, blank CSV costs; browser export regression passes.
- Technical PDF: 0%, 0 of 5, four expected names, Calgary 1082.74; text content asserted and relevant pages visually inspected.
- CSV: five blank Cost CAD cells and all four source facility names; no columns changed.

## Files changed for this task

Backend repository:

- `src/document-extraction/document-extraction.service.ts`: nullable extraction metadata, review metadata preservation, facility aliases, absent-number guard.
- `src/document-extraction/document-extraction.lineage.spec.ts`: extraction schema/preview, null/blank/zero/positive cost, and all-five Confirm persistence tests.
- `src/metrics/calculation-quality.service.ts`: facility entity name precedes imported free-text name.

Web repository:

- `src/services/metricsOverview.ts`: canonical entity-name precedence during metadata normalization.
- `src/services/metricsOverview.test.ts`: entity/source/missing facility precedence regressions.
- `src/reports/domain/reportBuilders.test.ts`: explicit null/undefined/zero/positive canonical cost counting.
- `apps/web-e2e/support/mock-api.ts`: generic configurable extraction response and preservation of import payload metadata.
- `apps/web-e2e/tests/field-mapping-report.spec.ts`: actual XLSX upload/Confirm, payload/calculation/provenance, Reports, source review, facility groups, PDF and CSV regression.
- `apps/web-e2e/fixtures/carbonlite_field_mapping_test.xlsx`: source fixture generated from the supplied workbook specification.
- This audit.

Existing workspace changes were preserved. The backend extraction file and several frontend/test files already had unrelated uncommitted changes before this task.

## Validation and limits

- Backend focused Jest: 60 tests pass across extraction normalization, lineage, and calculation quality.
- Frontend focused Vitest: 231 tests pass across 11 files, including canonical builders, UI/PDF presentation, spreadsheet mapping, golden report values, and CSV.
- Playwright Chromium: field-mapping upload/Confirm/report/PDF/CSV and ENMAX export regressions pass. API/extraction responses are controlled mocks; live AI extraction was not invoked. Actual PostgreSQL Confirm persistence was independently verified as described above.
- Backend Nest build and frontend Vite build pass.
- Standard frontend tsc cannot start because the existing config references missing Node and `@nx/react` type definitions. An adjusted diagnostic run exposes existing repository-wide type errors; no typecheck pass is claimed.
- The full frontend suite currently has 13 failures across four files, including existing upload/navigation and factor expectations. The focused regression suites pass; no all-tests-pass claim is made.
- `git diff --check` passes in both repositories.
- Changes have not been deployed. Original historical rows have not been backfilled.
