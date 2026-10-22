# Field Mapping Gasoline import: current-path investigation

2026-10-18 (America/Edmonton). This recheck follows the supplied missing-Gasoline task. It does not start report, UX, factor or release work.

## Finding before implementation

The first failing historical boundary is **uploaded-XLSX extraction, before the normalized review row exists**. Two retained failing documents contain four extracted activities and four matching persisted activities: ELECTRICITY, NATURAL_GAS, HOTEL, AIR_TRAVEL. Neither contains GASOLINE; the extraction's source-row count is zero. The original workbook contains all five activities, including Gasoline on physical row 4. Reading ActivityData directly confirms that Gasoline is absent for those documents, rather than hidden by report scope or a missing document relation.

The existing [Task 9B investigation](task9b-real-ui-field-mapping-import-regression.md) already identified and repaired that path. The service, deterministic workbook parser and backend regression files have identical SHA-256 hashes to the previously verified fix. No new application bug is reproduced in the current development runtime.

The old Upload Documents → Extract Data implementation used provider-assisted extraction for structured XLSX tables, accepting an incomplete subset before review/confirmation. Raw provider responses were not archived before operational-row processing, so the evidence cannot identify a model-internal omission versus an intermediate provider-result filter. It does identify the exact lost-row boundary; it does not support blaming unit matching, British Columbia, facility lookup, CSV references or deduplication.

The smallest safe fix—already present—is deterministic XLS/XLSX parsing with the existing normalization, review, confirmation and server-calculation flow. No Gasoline/filename special case, additional backend implementation, factor or database migration is required now. This task strengthens regression evidence instead of modifying working application behavior.

## Diagnostic table

Gasoline invariant **G**: GASOLINE, 350, source unit L / matching unit liters, Canada / British Columbia, Vancouver Fleet, `fuel_card_feb.csv`, 2026-02-05, worksheet Operations_2026, physical row 4.

| Stage | Historical failure | Current real-browser state | Result and evidence |
| --- | --- | --- | --- |
| Raw spreadsheet | Gasoline is present | Service Date 46058; Record Category Gasoline; Consumption 350; UOM L; Region British Columbia; Location Name Vancouver Fleet; Original Document fuel_card_feb.csv | PASS: original binary and captured rawSourceRow |
| Field mapping / extraction | **First FAIL:** no Gasoline in four-row extraction | Exact alias mapping retains G; serial date becomes 2026-02-05; source/extracted row counts 5/5 | PASS: actual extract response, no API mock |
| Normalized review row | Not reached | G; activity GASOLINE; source unit L; physical sheet/row preserved | PASS: extracted normalized fields and actual UI values |
| Eligibility | Not reached | Calculated; INCLUDED; selected checkbox enabled and checked; confirm-eligible true | PASS: real draft table assertions |
| Factor match | Not reached | Existing 2.31/liters Canada-generic 2025 factor; generic-jurisdiction and prior-year fallbacks | PASS: request advisory fields and authoritative persisted snapshot |
| Confirm payload | Row absent | Five activities, exactly one Gasoline; quantity/unit/location/reference/identity and 808.50/SCOPE_1 present | PASS: actual HTTP request captured from browser |
| Backend receive / DTO | No Gasoline candidate | Actual confirm endpoint returns 201 and five distinct created IDs | PASS: same real endpoint and DTO; no direct ActivityData seeding |
| Backend filtering / dedupe | No Gasoline candidate | G passes existing validation; key `<documentId>::row:4`; existing rowless key remains checked; repeated confirm creates zero | PASS: actual response plus persisted records; no idempotence changes |
| DB persistence | Four rows; Gasoline absent | Exactly one Gasoline, 350 L, 808.50 kgCO2e, SCOPE_1; facility/reference retained; documentId = sourceDocumentId; importBatchId = document-<documentId> | PASS: persisted API read and direct database verification |
| Report scope | Correct four-row report | Field source has five references and five Included GHG Records; combined report contains Vancouver Fleet / 808.50 | PASS: real Reports screen and source-evidence table |

The original serial-date workbook has SHA-256 `d72851e703b3f1ffbf5b07c4212c044ddc88b53944811d8c1b7fb2def3010dc5`. Both original and `(1)` upload filenames are exercised. The older automated workbook has ISO date strings and a different hash; it is not substituted for the original in the real-browser test.

## Explicit checks

- **Activity:** Gasoline normalizes to GASOLINE in both front and back ends. It is not remapped to FUEL/DIESEL, unknown or blank. Existing generic aliases are unchanged.
- **Units:** L, l, liter, liters, litre and litres all normalize to liters. Added tests also prove the same 2.31 factor match, British Columbia normalization, generic/prior-year reason and 350 × 2.31 = 808.50 for every variant.
- **Jurisdiction:** BC and British Columbia normalize equivalently. This non-electricity activity permits the existing Canada-generic fallback; no Alberta-only gate removes it.
- **Candidates:** the applicable legacy system candidate is Gasoline combustion, ID `72960476-10cf-41e4-9aa3-1e02bde56616`, 2.31 kgCO2e/liters, Canada (Generic), source year 2025. No BC-specific or exact-2026 Gasoline candidate exists. Four governed Gasoline versions also exist, all DRAFT / DEMO / unverified; the fresh ordinary workspaces do not enable demo-governed selection. Other activity types fail the activity-type candidate filter. Candidate identities and metadata are recorded in sanitized evidence; none was edited.
- **Selected result:** MATCHED / CALCULATED / INCLUDED; `SYSTEM_COUNTRY_YEAR`; `GENERIC_JURISDICTION_FALLBACK`. The saved explanation explicitly discloses British Columbia → Canada (Generic) and reporting year 2026 → source year 2025. Existing internal-review warnings remain; this is not an external-source verification upgrade.
- **Identity:** physical row 4 is distinct from rows 2, 3, 5 and 6. Legacy rowless identity is `<documentId>::fuel_card_feb.csv::GASOLINE::2026-02-05::350::L`. Source document, row, reference and import batch are nonempty; the row is neither overwritten nor treated as another upload. Separate identical physical rows and legacy re-extraction compatibility retain their existing backend tests.
- **Source / facility:** `fuel_card_feb.csv` stays ordinary source-reference metadata inside the XLSX. Vancouver Fleet stays a facility-name fallback; no preexisting canonical facility is required. The manual-entry comparison also uses that reference without uploading or linking another document.
- **Backend conditions:** controller passes activities through the existing array DTO; normalization checks canonical activity, valid date, positive quantity and nonempty unit. Confirmation merges only matching staged identities (there are no SpreadsheetImportReviewRow staging entities for uploaded XLSX), checks record keys and creates ActivityData through server-owned snapshot preparation. No Gasoline-specific filter exists. Fresh successful persistence disproves rejection at any of those steps.
- **Other entry paths:** current manual-entry Gasoline via the actual UI also persists 350 L / British Columbia / Vancouver Fleet / fuel_card_feb.csv → 808.50 / SCOPE_1, with the same generic factor selection. Previous spreadsheet/report fixture tests used prepared extracted rows and therefore could not detect provider-assisted XLSX row loss. The old Import Spreadsheet path already used browser-side tabular parsing; the lost-row defect belonged to Upload Documents → Extract Data.

## Changes in this task

Only tests and diagnostic artifacts change:

- [Real browser regression](../../apps/web-e2e/tests/real-api/field-mapping-import-regression.spec.ts): explicit Gasoline checkpoints at extraction, editable review, eligibility, confirm payload, created IDs, saved snapshot, dedupe and document relations; Golden C scopes/facilities; separate manual-entry comparison.
- [Unit normalization tests](../../src/utils/unitNormalization.test.ts) and [factor-matching tests](../../src/utils/conversionFactorMatching.test.ts): six liter aliases, BC normalization and unchanged generic-factor selection/value.
- This investigation and [sanitized evidence](field-mapping-gasoline-recheck-evidence.json).

A test-only synchronization fix waits for the UI's post-confirm metrics generation before issuing the independent repeat-confirm probe. One earlier renamed-file run inserted all five rows but exceeded the old 10-second navigation wait with `/metrics/calculate` still pending. The wait remains bounded at 30 seconds; no application calculation, navigation, import or retry behavior is changed.

## Validation and boundaries

Final results:

| Check | Result |
| --- | --- |
| Real browser upload → extract → review → confirm, original filename | PASS, 5/5 Field Mapping records |
| Same original binary uploaded as `(1).xlsx` | PASS, 5/5 Field Mapping records |
| Manual Gasoline entry through UI | PASS, 808.50 / SCOPE_1 / same 2.31 generic factor |
| Golden C records / calculated / tracked | PASS, 5 / 5 / 0 |
| Golden C Scope 1 / 2 / 3 | PASS, 1228.74 / 662.50 / 537.20 |
| Golden C total | PASS, 2428.44 kgCO2e |
| Golden C facilities | PASS: Calgary HQ 1082.74; Vancouver Fleet 808.50; Corporate Travel 492.20; Toronto Sales Trip 45.00 |
| Two-workbook records / calculated / tracked | PASS, 8 / 7 / 1 |
| Two-workbook Scope 1 / 2 / 3 | PASS, 1228.74 / 1181.90 / 597.20 |
| Two-workbook total | PASS, 3007.84 kgCO2e |
| Two-workbook facilities | PASS: Calgary HQ 1602.14; Vancouver Fleet 808.50; Corporate Travel 492.20; Toronto Client Visit 60.00; Toronto Sales Trip 45.00 |
| Partial-confirm safeguard through real UI | PASS: 9 reviewable; first 3 imported / 6 unresolved; corrected row +1; unchanged repeat +0; final 4 persisted, no duplicates |
| Direct DB verification | PASS: each fresh combined workspace has 8 stored rows and exactly one Gasoline with correct document/source/batch links |
| Actual document-scoped calculation-summary endpoint | PASS for both filenames: 5 in scope / 5 calculated / 2428.44 |
| Frontend full suite | PASS: 87 files / 1087 tests, plus 2 database guard tests |
| Backend full suite | PASS: 24 suites / 256 tests (rerun outside sandbox for HTTP socket tests) |
| Typecheck / build | PASS / PASS; existing Vite chunk-size warning |
| Existing failed imports / snapshots | PASS: complete document/extraction/ActivityData fingerprint unchanged |
| Synthetic account cleanup | PASS: 9 accounts created only for these runs disabled; all captured sessions rejected with 401; source/calculation evidence retained |

The final original/renamed/manual browser file passes 3/3 after test synchronization; the separate real UI partial-confirm test passes 1/1. The initial unmodified existing browser regressions also passed 3/3 before strengthening, confirming the runtime already contained the fix.

All imports use fresh synthetic tenants on the runtime-verified, operator-confirmed Neon development target, through localhost UI/API. Existing failed imports are read-only evidence; they are not re-extracted, repaired, recalculated or removed. A fingerprint covers both retained failed documents, their extractions and all associated ActivityData/snapshots.

Database schema/migration changes: NO. Existing/customer data changes: NO. Synthetic regression imports are created for validation and their test accounts are retired afterward. No factor values, matching rules, report logic, historical snapshots, tenant policy or file-content-hash duplicate handling are modified. No production deployment or production identity is inferred from the local development run.
