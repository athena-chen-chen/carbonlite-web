# P2 final report provenance and wording cleanup

## Data-model audit (before implementation)

`demo-2025-kwh-alberta` is **not** `Factor.id` or `FactorVersion.id`.
It is the value of Prisma `FactorVersion.version`, generated in
`../carbonlite-api/prisma/seed.ts` as `demo-${sourceYear}-${unit}-${region}`
(lowercased and slugged). The seed uses `(factorId, version)` for its upsert.
The corresponding factor definition ID is `demo-factor-electricity-alberta`;
the version row has a separate generated CUID. This value is a deterministic
seed configuration key, with no revision component, despite being stored in
the business-version column. A source-year/unit/region combination does not
establish an independently maintained factor revision. It is omitted from
normal report provenance rather than relabeled as Factor ID.

`ECCC_EPR_2025_TABLE_A8` originates in
`src/services/conversionFactors.ts`, in `ECCC_NATURAL_GAS_GJ_FACTOR.factorVersion`
and `.factorSet`. This legacy frontend fallback is a `ConversionFactorItem`,
not a Prisma `FactorVersion` row. Its separate `.id` is
`eccc-natural-gas-canada-generic-gj-2025`. The value identifies a source
publication/year/table (ECCC projections report, 2025, Table A8), not a factor
revision or database row. It is omitted as a version; source publication,
year, authority and URL remain available. No document revision is invented.

Neither audited key is a true factor revision. Other text-valued business
versions remain valid; the fix does not impose numeric-version syntax.

### Provenance path

1. Prisma separates `Factor.id`, `FactorVersion.id`, `FactorVersion.version`,
   `FactorVersion.factorYear`, and `FactorSource.sourceVersion`.
2. `../carbonlite-api/src/conversion-factors/factors.service.ts::toDto` exposes
   `id`, `factorId`, `version`, `factorYear`, and source metadata separately.
   `matchedGovernedVersion` in `conversion-factors.service.ts` also carries
   the definition ID, version-row ID and provenance snapshot separately.
3. API `factor-governance.ts::snapshotFactorProvenance` copies `.version` to
   `.factorVersion` and retains `.sourceVersion` and `.factorYear` distinctly.
   `metrics/calculation-quality.service.ts::detail` retains that snapshot in
   `factorProvenance`; `uniqueFactors` carries it into the factors summary.
4. Frontend `factorCredibility.ts::getFactorVersionLabel` reads legacy
   `factorVersion` or the selected governed version's `version`.
   Matched activity snapshots store `matchedFactorVersion`.
   `services/metricsOverview.ts` carries selected versions and matched activity
   versions to calculation details and factor summaries without changing them.
5. `buildCanonicalReportData` keeps calculation details and passes factors to
   `buildFactorReviewSummary` / `buildEmissionFactorsUsedInventory`.
   Canonical identity, grouping, usage counts and stored snapshots are unchanged.
6. Report UI `EmissionFactorsUsedSection` uses `getDisplayFactorVersionLines`;
   Technical PDF `buildFactorDetailText` uses
   `getDisplayFactorProvenanceLines`. Both delegate version selection to
   `reportCredibility.ts::getDisplayFactorVersion`. Executive PDF has no factor
   revision detail to relabel.
7. Report CSV previously used `formatReportFactorVersion` (including its
   `Not specified` fallback). Data Records CSV used raw `matchedFactorVersion`.
   Audit Evidence CSV used `chain.factor.version`, formatted by the evidence
   builder. All three export boundaries now use `getDisplayFactorVersion` and
   leave absent revisions blank. Audit Evidence retains its existing Factor ID
   and Factor Version ID columns. No CSV headers or columns were added/renamed.

## Smallest safe implementation

Filter the audited `demo-<year>-<unit>-<region>` seed-key family and exact
`ECCC_EPR_2025_TABLE_A8` publication/table key in the existing display helper.
Continue excluding matching definition/version-row IDs and opaque CUID/UUID
values. Genuine revisions remain Factor Version. Do not change source data,
selection, factor identity, grouping, calculations or traceability evaluation.

Electricity Factor Details retain source publication/authority, Source Document
Version `v1.0`, and Factor Vintage `2025` when present in the snapshot, without
`Factor Version: demo-2025-kwh-alberta`.

Natural Gas Factor Details retain ECCC authority, the 2025 projections source
publication and Factor Vintage `2025` when present, without
`Factor Version: ECCC_EPR_2025_TABLE_A8`. Source Document Version appears only
if explicitly supplied by provenance (or an existing version in the document
title); the frontend fallback supplies no source document revision.

## Wording audit

| Location | Meaning | Action |
| --- | --- | --- |
| Technical PDF Appendix A description | Evidence includes uploaded sources and manual entry | Use "activity records" and "source input" |
| Report UI `ReportPresentationSections` Source Files / document-source fallback | Uploaded filenames in structured source review | Keep file wording |
| Technical PDF Source Files and `pdfFormatters` document-source fallback | Uploaded filenames/document lineage | Keep file wording |
| Report CSV / Audit Evidence CSV Source File | Actual source filename; manual entry has no file | Keep schema and file wording |
| Source evidence count displays in report UI and Technical PDF | Mixed-source totals | Already use source inputs / uploaded files / manual entry; preserve |
| Upload/download controls and workflow descriptions elsewhere | Uploaded files specifically | Keep file wording |

Final appendix sentence:

> Detailed record-level source evidence retained for activity records in this
> report scope. The main report body summarizes this information by source input.

## Validation

Final focused run: **13 test files passed, 129 tests passed**.

Focused tests cover genuine numeric and text revisions, seed/table keys in both
top-level and provenance snapshot fields, opaque database IDs, distinct document
versions and vintages, all three CSV export boundaries, mixed-source appendix
wording and genuine file labels. The combined canonical fixture asserts 9
records, 8 calculated records, 1 tracked metric, coverage 8/8, complete
traceability, total 3285.90, scopes 1377.06/1371.64/537.20, all five facility
totals, 2588 kWh, 11.50 GJ, 350 L, 5 factors and 8 usages (3/2/1/1/1).
Source counts remain 3 inputs / 2 uploaded files / 1 manual entry.

Golden PDF tests cover A 579.40, B 338.06 and C 2428.44, in both Executive and
Technical profiles, with page-count checks. No layout parameters changed.

`pnpm build` passes. The repository's standard typecheck is blocked by missing
`@nx/react/typings/cssmodule.d.ts`, `@nx/react/typings/image.d.ts` and `node`
type definitions. A diagnostic run overriding those configuration entries
reports unrelated workspace errors (including NestJS imports and existing UI
types), with no diagnostics in the changed production files. These are outside
this cleanup's scope.

The full test run reports 1019 passing tests, 13 failing tests and one additional
suite-load error (`node:test` is incompatible with this Vitest configuration).
An isolated copy restoring the pre-cleanup version display rule reproduces the
same 12 deterministic frontend failures in Factors, MetricsSummaryPage and
UploadPage.sample. A comparison run reproduces those same 12 failures with the
cleanup applied. ActivityDataPage's full-suite failure passes in both comparison
runs. No unrelated application or test behavior was changed to hide failures.

PDFKit rendered all eight validation PDFs (the three goldens and combined
provenance scenario, each in both profiles). Visual review of combined Factor
Details, Appendix A and Executive Summary confirms legible provenance, the new
source-input wording, unchanged summary values and no layout redesign.

## Files changed for this task

- `src/utils/reportCredibility.ts`
- `src/utils/reportCsvExport.ts`
- `src/utils/dataRecordsCsvExport.ts`
- `src/utils/reportReviewPackageCsvExport.ts`
- `src/reports/pdf/technicalReviewPdf.ts`
- `src/utils/factorProvenanceDisplay.test.ts`
- `src/utils/reportCsvExport.test.ts`
- `src/utils/dataRecordsCsvExport.test.ts`
- `src/utils/reportReviewPackageCsvExport.test.ts`
- `src/reports/domain/reportSemantics.test.tsx`
- `docs/audits/p2-final-report-provenance-wording.md`

Generated PDF validation images and the rendering script are scratch material
under `tmp/p2-provenance`; the isolated baseline source copy was removed.
