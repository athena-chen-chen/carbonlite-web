# Report correctness and traceability cleanup — October 16, 2026

## Audit before implementation

The findings below were reported in chat before editing implementation code.

1. **Natural Gas Used Records = 1:** the supplemental factor list has two rows with the same Natural Gas identity, each carrying `usedRecordsCount = 1`. Canonical `buildFactorReviewSummary` called `buildEmissionFactorsUsedInventory` without calculation details. On encountering the duplicate, the helper assigned the second row's count over the first instead of counting two usages. Report UI already supplied calculation details to this helper, explaining the inconsistent outputs.
2. **Grouping identity:** the existing helper used `factorVersionId`, then `factorId`, then a fallback snapshot key of factor name/value/input unit/result unit/source year/source authority. It did not group by matching status, fallback reason, activity jurisdiction, or source-row identity.
3. **Same Natural Gas selection:** both retained regression details use `factorId = eccc-natural-gas-canada-generic-gj-2025`, no governed version ID, and the same 49.44 kgCO2e/GJ selection. Different source records and fallback messages do not create different factors.
4. **Manual record:** `cmv8qhq0d001ngd6kbkogmrs1`, MANUAL Electricity, 980 kWh, Alberta, 2026-10-14, 519.40 kgCO2e.
5. **Persisted manual provenance:** ActivityData stores its ID, source type, creation timestamp, activity date/type/quantity/unit, jurisdiction, optional facility fields, and calculation/factor snapshot fields. The existing creation audit stores the actor and a JSON copy of the created record. The calculation summary exposes a minimal `manualSourceProvenance` projection.
6. **Creation audit already exists:** the earlier verified read-only capture identified `CREATE_ACTIVITY_RECORD` audit `cmv8qhq50001pgd6k4yho9eou`, actor `cmp37x9i30005gdcui8pa1ki6`, timestamp `2026-10-14T23:21:28.981Z`. `ActivityDataController.create` passes the authenticated user ID to `ActivityDataService.create`, which writes this audit with `newValue: created`. No new audit subsystem or event is necessary. A reproducible frontend gap was found: `mergeSupplementalCalculationDetails` replaced the whole original detail and discarded the real manual provenance. The exact latest live report cannot be reproduced from the current local database; see the validation limits below.
7. **Field rendered as Factor Version:** for the governed Electricity selection, Prisma `FactorVersion.version` → factor provenance snapshot `factorVersion` → API calculation detail / used-factor projection → CanonicalReportData → `getDisplayFactorVersion` → Technical Factor Details. The version database ID remains a separate `factorVersionId`.
8. **Meaning of `demo-2025-kwh-alberta`:** a real seeded version string, not the factor ID or version database ID. `prisma/seed.ts` builds `version = demo-${sourceYear}-${unit}-${region}` and upserts by the `(factorId, version)` unique key. The local DB independently returned `{ factorId: demo-factor-electricity-alberta, id: cmv8vg8eu0009gd3sxfn0w9z7, version: demo-2025-kwh-alberta }`. User Case A therefore applies: retain **Factor Version: demo-2025-kwh-alberta**.
9. **Five-row wording:** `formatExecutiveSourceReviewStatus` formats the canonical structured source-data counts; `executiveSummaryPdf` previously labeled that row simply “Source Review.” `buildSourceReviewSummary` counts structured review rows / spreadsheet row lineage, independently of ActivityData records.
10. **Smallest changes:** pass calculation details into the canonical factor validation builder; correct duplicate-count fallback; preserve manual provenance on supplemental detail replacement; extend the existing API audit projection with original jurisdiction/location; clarify structured-review labels; reuse one factor-version display rule in PDF/UI/CSV and audit evidence; add focused tests.

## Implementation

### Factor usage

- Canonical factor validation now receives the calculated activity details and counts their usages by the existing shared identity helper.
- With no record-level details, duplicate selection rows sum their usage counts instead of overwriting them.
- Version IDs remain the primary key. When only a factor ID and a real version label exist, the key includes both so genuinely different versions remain separate. Snapshot fallback remains available for older representations.
- The Report UI and both PDFs continue using shared factor facts. A synthetic pagination test was corrected to provide actual corresponding activity/factor identities rather than ten unused factor definitions.

Result:

| Factor | Used records |
| --- | ---: |
| Electricity - Alberta | 3 |
| Natural Gas - Canada Generic | 2 |
| Gasoline combustion | 1 |
| Hotel stays | 1 |
| Air travel | 1 |
| Total | 8 |

Unique selections: **5**, derived without hardcoding the dataset.

### Manual lineage

- Supplemental calculation replacement explicitly preserves the original detail's `manualSourceProvenance`. Missing evidence remains missing; no current user, timestamp, filename, document identity, page, or row is invented.
- The existing API projection now includes original `jurisdictionCountry`, `jurisdictionRegion`, `facilityId` and `facilityName`, read only from the immutable creation-audit snapshot. Null means the original value was absent, not inferred from today's record or organization settings.
- The actual manual creation service's existing audit is tested with actor, timestamp, original activity values, jurisdiction/location, factor identity/version/value, result snapshot, and null file/document fields. A later mutation of the test input does not change the stored audit snapshot.
- A frontend regression forces a manual record through supplemental matching and verifies both outcomes: genuine audit evidence stays complete; absent evidence remains incomplete.
- No creation service behavior, audit-event naming, historical record, or database schema changed.

### Source review and version display

- Executive label: **Structured Source Data Status** when canonical availability is `STRUCTURED_REVIEW_AVAILABLE`; document-only/unavailable review keeps the general Source Review label.
- Shared readiness label/evidence explicitly names structured source rows. Five structured rows remain separate from nine ActivityData records.
- Executive Factor Validation explicitly says **5 of 5 unique emission factors**.
- A shared version formatter now serves normal provenance, CSV and audit evidence. Real version strings remain visible. Factor IDs, version IDs, source-document versions and guessed `v1.0` defaults are not substituted as factor versions.
- The Report UI names Factor Version and Source Document Version separately when those values exist. CSV retains the exact existing schema/header order; only misleading version values are corrected. Missing factor version is `Not specified`.

## Verification

| Item | Result |
| --- | --- |
| Issue 1 Natural Gas Used Records | FIXED: 2 |
| Factor usage total | 8 |
| Issue 2 manual traceability | FIXED in API/frontend pipeline and new-entry tests |
| Calculation traceability | 8/8 for the retained previously verified regression capture |
| Manual audit event added | NO — already existed |
| Historical data fabricated | NO |
| Issue 3 source-review wording | FIXED: Structured Source Data Status |
| Issue 4 version semantics | FIXED shared ID/document fallback; audited real seeded version remains Factor Version |
| Calculation totals changed | NO |
| Matcher/applicability/unit/scope/import/facility logic changed | NO |
| Combined regression | PASS: 3285.90 kgCO2e |
| Golden A/B/C | PASS: 579.40 / 338.06 / 2428.44 |
| Executive PDF | PASS: regenerated, content assertions and visual inspection |
| Technical PDF | PASS: regenerated, counts reconciled and visual inspection |
| CSV | PASS: regenerated, 9 rows / 8 emissions values totaling 3285.90; same schema |
| Frontend/report tests | PASS: 216 tests across 18 files, including regeneration check |
| Backend tests | PASS: 55 tests across creation/provenance/calculation suites |
| API typecheck | PASS |
| Production web build | PASS |
| Standard web typecheck | BLOCKED by existing missing @nx/react and Node type definitions |

A diagnostic web typecheck overriding the unavailable type packages reports the same **99 pre-existing error signatures** as the earlier saved baseline, with no new signatures. Unrelated type/configuration cleanup was intentionally excluded.

Unchanged combined facts:

- Activity records: 9; calculated: 8; tracked Water: 1; coverage: 100%, 8/8.
- Scopes: 1377.06 / 1371.64 / 537.20 kgCO2e.
- Electricity: 2588 kWh; Natural Gas: 11.50 GJ; Gasoline: 350 L.
- Factors: normal corporate Electricity 0.53 kgCO2e/kWh; Natural Gas 49.44 kgCO2e/GJ; Gasoline 2.31 kgCO2e/liter. EGDF safeguards unchanged.
- Facilities: Calgary HQ 1082.74; Unassigned 857.46; Vancouver Fleet 808.50; Corporate Travel 492.20; Toronto Sales Trip 45.00.
- Source evidence: 3 inputs / 2 uploaded files / 1 manual entry. Structured review rows: 5.

### Current live-data limitation

The current local development database has the audited Electricity version row but no MANUAL Electricity record matching 980 kWh. The previous Neon credentials no longer authenticate. The generated deliverables use the **retained previously verified read-only combined capture**, including its genuine manual audit evidence, through the real frontend overview and canonical report builders. This is not a fresh live-database acceptance claim. No historical event was created or backfilled, and the original captured record did not need guessed history. Re-entry is not required for that captured record's existing audit; availability of the record in the user's current environment must be established separately.

## Regenerated deliverables

- `output/reports/report-correctness/executive.pdf` — 2 pages.
- `output/reports/report-correctness/technical.pdf` — 11 pages.
- `output/reports/report-correctness/activity-records.csv` — unchanged schema, 9 rows.
- `output/reports/report-correctness/README.md` — source-capture and live-data limitations.

Representative cover/results/readiness, factor summary/details and source-evidence pages were rendered to PNG and inspected. No PDF layout redesign was made.

## Files changed in this request

- `src/components/FormalReportPreview.tsx`
- `src/components/FormalReportPreview.test.tsx`
- `src/components/reports/sections/EmissionFactorsUsedSection.tsx`
- `src/reports/domain/buildCanonicalReportData.ts`
- `src/reports/domain/buildFactorReviewSummary.ts`
- `src/reports/domain/reportSemantics.test.tsx`
- `src/reports/pdf/executiveSummaryPdf.ts`
- `src/services/metrics.ts`
- `src/services/metricsOverview.ts`
- `src/services/metricsOverview.test.ts`
- `src/utils/reportingReadiness.ts`
- `src/utils/reportCredibility.ts`
- `src/utils/factorProvenanceDisplay.ts`
- `src/utils/factorProvenanceDisplay.test.ts`
- `src/utils/reportCsvExport.ts`
- `src/utils/reportCsvExport.test.ts`
- `src/utils/businessAuditTrail.ts`
- `src/pages/ReportingPage.test.tsx`
- `../carbonlite-api/src/metrics/calculation-quality.service.ts`
- `../carbonlite-api/src/metrics/manual-source-provenance.spec.ts`
- This audit and the deliverables above.

Existing unrelated working-tree changes were preserved. Temporary captures, comparisons, rendered QA pages and test logs are under `tmp/report-correctness/`; retained source captures are under `tmp/report-semantic-api/`. Nothing was deployed.
