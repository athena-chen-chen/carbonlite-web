# Task 9B — real UI field-mapping import regression

October 17–18, 2026 (America/Edmonton). Scope: repair uploaded workbook extraction and add real browser/API regressions. No Task 10 work, schema migration, factor-value change or report-semantic change.

## Root cause and reproduction

There were two different spreadsheet entry paths:

- **Import Spreadsheet tab:** SheetJS browser parsing → `/spreadsheet-import/review-rows` → review → `/document-extraction/confirm` → persisted server calculations.
- **Upload Documents / Extract Data:** original workbook upload → `/document-extraction/extract` → provider-assisted document extraction → review → the same confirmation endpoint.

The second path treated an already structured XLSX table as a document for `gpt-4o-mini` to extract. It accepted the resulting subset without a workbook-derived source-row count. The reported manual source used this path: it retained uploaded bytes/hash, had no staged SpreadsheetImportReviewRow records, and its stored extraction and ActivityData each contained only Electricity, Natural Gas, Accommodation and Air Travel. Gasoline was absent **before** matching, eligibility, confirmation and deduplication.

A fresh browser/API run with the actual downloaded workbooks reproduced exactly that **4/5 Field Mapping failure**, excluding Gasoline and 808.50 kgCO2e. In that fresh run, the provider also omitted invalid Needs Review rows and supplied a province for the missing-province row: 6 extracted rows / 4 imported rather than the user's observed 9 / 3. Its two-workbook total was consequently 2602.14, not the user's 2199.34. This variability is additional evidence against relying on document extraction to enumerate a structured workbook. The user's original data were inspected read-only and were not repaired or force-imported.

The exact loss boundary is the provider-assisted extraction result. The old implementation did not archive the raw provider response before its operational-row filters, so no specific model-internal reason or historical filter tag is claimed. The fix removes that nondeterministic enumeration step for XLS/XLSX tables rather than changing the Gasoline matcher.

## Why previous automation passed

| Previous validation | What it actually covered | What it missed |
| --- | --- | --- |
| [Task 9A real combined workflow](../../apps/web-e2e/tests/real-api/pilot-rc-end-to-end.spec.ts), `real combined upload...` | Real browser **Import Spreadsheet** tab, structured staging, actual confirmation and database persistence. Fresh registration; no direct ActivityData seeding for Golden C. | The document-upload/XLSX extraction entry path used by the manual test. |
| [Field mapping report test](../../apps/web-e2e/tests/field-mapping-report.spec.ts) | Reads a workbook and drives upload/review/report UI with mocked API state. | Supplies `extractionResponseOverride` with five pre-normalized activities, fixture factors and a 2428.44 summary override. It does not exercise real extraction or backend confirmation/persistence. |
| Canonical report/PDF golden tests | Frozen totals and presentation from prepared calculation data. | Source ingestion and source completeness. |

The older automated workbook also differs from the supplied workbook: its dates are ISO strings; the supplied original and `(1)` copy use Excel serial dates. Both versions describe the same activities. This is a real fixture difference, but the omitted row was traced to the upload/extraction path, not an assumed date, province or unit defect. Both downloaded names have identical bytes (SHA-256 `d72851e703b3f1ffbf5b07c4212c044ddc88b53944811d8c1b7fb2def3010dc5`). The old automated fixture was retained unchanged.

## Fix

[Workbook parser](../../../carbonlite-api/src/document-extraction/spreadsheet-activity-rows.ts), `parseSpreadsheetActivityRows`, now enumerates XLS/XLSX cells locally using the same SheetJS version as the frontend. It recognizes column aliases, converts serial dates using the workbook date system, retains physical sheet/row identity and raw values, and preserves invalid/missing fields for review. A subtotal with no activity is excluded; unknown activities and nonnumeric quantities are retained. Missing province is not inferred from other rows. Original uploaded bytes/hash/download remain on the existing document path.

[Extraction service](../../../carbonlite-api/src/document-extraction/document-extraction.service.ts), `extract` / `extractStructuredActivityRecords`, reuses structured review-result persistence, audit/events and the existing review/confirmation/calculation flow. Supported Accommodation labels are aligned with the existing frontend HOTEL aliases. The first-worksheet contract matches the existing spreadsheet importer; this task does not implement multi-sheet import. Unrecognized activity/quantity headers return an actionable mapping error rather than silently selecting a subset. PDF/image/CSV provider extraction and JSON processing retain their existing paths.

Confirmation also checks the **existing rowless content key** when new local extraction supplies a physical row. This retains duplicate protection for matching legacy content identities during re-extraction. Separate physical rows with equal values still remain distinct. Tests cover both cases. No filename, facility, specific row number or Gasoline value is special-cased. No factor selection/applicability safeguard was relaxed.

The explicit six-remaining-rows reload check exposed a related source-status defect: document confirmation considered only SpreadsheetImportReviewRow statuses, so a source uploaded through Documents could become IMPORTED despite unresolved extraction rows. Confirmation now checks unimported extraction identities when there are no staging entities. Partial uploaded sources remain REVIEW_REQUIRED; completing them transitions to IMPORTED. The browser regression reopens Review Rows after the initial three imports and verifies exactly six remaining rows.

## Gasoline trace

Invariant activity values, denoted **V** below: **GASOLINE; 350; source unit L (normalized liters); Canada; British Columbia; Vancouver Fleet; `fuel_card_feb.csv`; 2026-02-05**. The worksheet is `Operations_2026`; its physical row is 4. The raw date cell is 46058. Each after-fix stage retains V; no quantity, province, facility or reference is invented or rewritten to obtain eligibility.

| Stage | Values / context | Review, eligibility and matching | Factor candidate / selected | Identity, decision and persistence |
| --- | --- | --- | --- | --- |
| Before-fix uploaded extraction | Workbook contains V; saved extraction has no Gasoline row. | No review row/eligibility evaluation for Gasoline. | Candidate exists in Factors, but none selected for an absent row. | No Gasoline confirm payload, dedupe key, ActivityData or snapshot. |
| Spreadsheet parser | V, raw label Gasoline; physical row 4; serial date → date-only. | Candidate extraction row; not yet approved. | Not evaluated. | Source document + sheet + physical row retained; no ActivityData yet. |
| Normalized extracted row | V; activity GASOLINE; unit remains L. | Persisted in DocumentExtraction, source/extracted count 5/5. | Not yet authoritative. | This upload path has no SpreadsheetImportReviewRow staging entity. |
| UI review row | V. | Display Calculated; classification READY; selected; INCLUDED / MATCHED. | Canada-generic Gasoline 2.31 kgCO2e/liter. | New row eligible for confirmation. |
| Eligibility / frontend matching | V; unit normalized to liters. | No blocking validation issue; generic jurisdiction/prior-year assumptions disclosed. | Existing system Gasoline combustion, Canada (Generic), source year 2025, value 2.31. | Eligible; no new record yet. |
| Confirm payload | V plus uploaded document ID, sourceSheetName and sourceRow. | MATCHED / CALCULATED / INCLUDED in request. | Same candidate copied as advisory fields. | Posted to the real `/document-extraction/confirm`; client fields do not own saved calculations. |
| Backend confirmation / matching | V. | Server validates positive quantity and recomputes saved fields with existing policy. | Selects existing 2.31/liter Canada-generic factor; `SYSTEM_COUNTRY_YEAR`, generic/prior-year explanation. | Fresh document row; proceed to create. |
| Dedupe / idempotency | V. | Not already imported. | Selection unchanged. | Primary key `<documentId>::row:4`; existing rowless content key also checked. First confirm creates; repeated identical confirm creates 0. |
| ActivityData persistence | V. | CALCULATED / INCLUDED / SCOPE_1. | Stored matchedFactorValue 2.31. | Exactly one Gasoline ActivityData; source row/sheet/reference/facility retained. |
| Calculation snapshot | V; calculationQuantity 350 liters. | Persisted server result, authenticated actor/time/version. | Captured factor ID/value/unit/provenance. | 350 × 2.31 = **808.50 kgCO2e**, SCOPE_1; survives summary/report reads. |

The selected baseline remains an internal-review system factor with its existing warnings; this task does not relabel it as independently verified or regulatory-ready. The legacy DOCUMENT_AI source-type label remains on confirmation records for compatibility; it does not mean XLSX is still sent to the provider.

## Required outcomes

| Measure | Result |
| --- | --- |
| Gasoline imported | YES; one row, 808.50 kgCO2e |
| Field Mapping records / total | 5 / 2428.44 |
| Needs Review | 9 reviewable; initial import 3; 6 unresolved |
| Two-workbook records | 8; 7 calculated; 1 tracked |
| Two-workbook total | 3007.84 kgCO2e |
| Scope 1 / 2 / 3 | 1228.74 / 1181.90 / 597.20 |
| Facility groups | 5 |
| Calgary HQ | 1602.14 |
| Vancouver Fleet | 808.50 |
| Corporate Travel | 492.20 |
| Toronto Client Visit / Toronto Sales Trip | 60.00 / 45.00 |

## Validation and operating boundaries

Final evidence is summarized in [sanitized evidence](task9b-real-ui-field-mapping-evidence.json). The new [real API browser regression](../../apps/web-e2e/tests/real-api/field-mapping-import-regression.spec.ts) uploads the actual binary workbooks through Upload Documents → Extract Data → Review → Confirm, reads persisted ActivityData/snapshots, checks repeat confirmation = 0, and generates the report to verify the total and Vancouver facility. It runs both original and `(1)` filenames in newly registered workspaces without API mocks or direct ActivityData seeding.

The unchanged Task 9A Combined workflow and 3 → 1 → 0 partial-confirm test are rerun separately. Golden A is checked after the initial Needs Review import; Golden C is checked against exactly the five persisted Field Mapping records. The existing golden/report/Task 7/8 frontend suite also runs. Backend tests cover workbook row retention, provider bypass, optional zero/null costs and legacy idempotency. The older provider-schema lineage test now uses a PDF fixture, retaining all facility/cost assertions; actual XLSX extraction has separate regression coverage.

Final application verification: **4/4 real browser/API workflows**, **251/251 backend unit tests (24 suites)**, **155/155 focused frontend golden/Task 7/8 tests (9 files)**, backend typecheck and production build pass. The follow-up browser run **passes 2/2** with the source-evidence table's five references/five included records for both filenames. Full frontend/integration suites were not rerun for this focused regression; no broader release certification is claimed.

The environment helper first verifies that the running localhost API recognizes an identity from the operator-confirmed Neon development database. Only synthetic development workspaces are written; original manual-test imports remain untouched. At completion, **26 synthetic accounts were disabled** and stored sessions were verified rejected; source/calculation evidence was retained. No production deployment or migration occurs. **Neon main modified: NO.** Private credentials/browser traces remain outside committed evidence. Technical limitations and factor warnings from Task 9A remain applicable.
