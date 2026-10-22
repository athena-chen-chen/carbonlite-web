# Internal factor library rename audit

## Before-change inventory (2026-10-18)

Old name: `CarbonLite MVP Default Factors v1.0`. New name: `CarbonLite Default Factor Library v1.0`.

### frontend display

- `carbonlite-web/src/pages/ConversionFactorsPage.tsx` — 1
- `carbonlite-web/src/services/conversionFactors.ts` — 1

### backend source/seed data

- `carbonlite-api/src/sample-data/golden-sample-data.service.ts` — 1

### tests

- `carbonlite-web/src/pages/MetricsSummaryPage.test.tsx` — 4
- `carbonlite-web/src/reports/pdf/__tests__/pdfRenderers.test.ts` — 1
- `carbonlite-web/src/pages/ConversionFactorsPage.test.tsx` — 4
- `carbonlite-web/src/components/FormalReportPreview.test.tsx` — 1
- `carbonlite-web/src/pages/UploadPage.test.ts` — 2
- `carbonlite-web/src/services/activityData.test.ts` — 3
- `carbonlite-web/src/utils/reportCsvExport.test.ts` — 1
- `carbonlite-web/src/utils/factorProvenanceDisplay.test.ts` — 2
- `carbonlite-web/src/utils/reportingReadiness.test.ts` — 1
- `carbonlite-web/src/utils/factorCredibility.test.ts` — 2
- `carbonlite-api/src/activity-data/activity-data.service.spec.ts` — 1
- `carbonlite-api/src/activity-data/activity-data.controller.spec.ts` — 3

### fixtures

No separate occurrences. Test fixtures are included under tests.

### documentation

- `carbonlite-web/docs/factor-governance-hardening-audit.md` — 1
- `carbonlite-web/docs/audits/alberta-emission-factor-audit.md` — 2

### database seed scripts

- `carbonlite-api/prisma/seed.ts` — 3

### migrations

- `carbonlite-api/prisma/migrations/20260629010000_system_factor_metadata/migration.sql` — 3

## Persistence and smallest safe change

- Frontend: dynamically generated provincial pilot factors and an Emission Factors fallback label. Other screens, report appendices, technical PDF and CSV consume returned current provenance or persisted calculation details; they have no separate hardcoded old label.
- Backend seed metadata is persisted to ConversionFactor.sourceDocument and FactorSource.sourceDocument; FactorVersion references FactorSource. New sample activities copy provenance at creation. Existing sample activities must not be rewritten.
- Read-only database audit: backend .env target has 10 ConversionFactor and 17 FactorSource rows with the exact old document; 187 ActivityData and 105 SpreadsheetImportReviewRow historical provenance fields also retain it. Backend .env.local target has 10 ConversionFactor and 10 FactorSource rows; 1 ActivityData and 0 review rows. Environment files are configuration targets, not proof of which database production currently uses. Production deployment status is not independently established.
- Forward migration required: YES. Update only sourceDocument with exact equality in ConversionFactor and FactorSource. Leave sourceAuthority, sourceReference, timestamps, values, units, IDs, versions, eligibility and all other fields unchanged. Never edit the existing migration.
- Rename the two frontend literals, backend seed/sample literal defaults and current synthetic fixtures/documentation. Preserve external-source provenance and unrelated MVP terminology.
- Current factor-library UI and newly calculated reports receive the new name after migration. Historical ActivityData calculationSnapshot/matched fields, MetricResult.detailsJson, review rows, audit history and previously exported PDFs remain unchanged; newly exported historical reports may correctly retain historical labels.
- Natural Gas 49.44 kgCO2e/GJ is a separate externally sourced direct-GJ reference. The existing internal m3 default is 1.89; neither is changed. Alberta electricity 0.53, gasoline 2.31 and diesel 2.68 stay unchanged.

## Verification

- Exact old-name occurrences updated: **34 across 18 existing files** (frontend runtime 2; backend sample default 1; tests/embedded fixtures 25; documentation 3; backend seed defaults 3). Two additional shorthand `Default Factors v1.0` fixtures in metrics overview and CSV now use the canonical full title.
- Migration added: `carbonlite-api/prisma/migrations/20261018010000_rename_internal_factor_library/migration.sql`. It changes only exact sourceDocument matches in ConversionFactor and FactorSource; the previously applied migration is unchanged. Source authority remains unchanged, including existing `CarbonLite System Defaults` values, as required by the naming-only scope. Existing sourceReference aliases also remain unchanged.
- Frontend: full suite **87 files / 1,074 tests PASS**, plus both database guard tests. After adding the final CSV historical/current provenance check and normalizing the two shorthand fixtures, focused metrics overview and CSV suites **2 files / 50 tests PASS** (one additional test). Current factor modal and technical PDF assert the new title and absence of the old label; generated pilot Alberta factor remains exactly 0.53.
- Backend: **24 suites / 256 tests PASS**. New tests assert 0.53 / 49.44 / 2.31 / 2.68 and identical complete matching/calculation summaries apart from the document label. Historical calculation snapshots remain byte-equivalent after library renaming; new snapshots receive the new name.
- Migration regression: **PASS**, actual SQL executed twice against session-local full-schema copies of both library tables in local PostgreSQL. Exact old values changed; current, unrelated, prefix/suffix and null values remained unchanged; every other field including timestamps compared equal. Second execution updated zero rows. Fingerprints of public ConversionFactor, FactorSource, FactorVersion, ActivityData, SpreadsheetImportReviewRow, MetricResult and AuditLog stayed unchanged. Re-run with Node 20: `node scripts/test-default-factor-library-rename.mjs` in carbonlite-api (requires local .env.local target).
- Golden A: **PASS 579.40 kgCO2e**; Golden B: **PASS 338.06 kgCO2e**; Golden C: **PASS 2428.44 kgCO2e**; combined: **PASS 3285.90 kgCO2e**. Existing PDF/domain/CSV/metrics regression coverage retained unchanged expected values.
- Frontend and backend typechecks: **PASS**. Frontend and backend builds: **PASS**. Frontend build reports its existing chunk-size warning. Backend checks used `/Users/shuangchen/.nvm/versions/node/v20.19.5/bin/node` because the default backend Homebrew Node runtime cannot load its ICU library.
- Historical snapshots modified: **NO**. Factor values modified: **NO**. Factor matching modified: **NO**. Calculation logic modified: **NO**. Report calculations/structure modified: **NO**.

## Remaining old-label occurrences and deployment

- No old title remains as a current runtime/seed default or current-library fixture value. Intentional test occurrences remain as absence assertions, migration input fixtures and historical-snapshot preservation evidence. The original migration retains its three historical literals; the forward migration retains two exact-match WHERE literals. This audit preserves the original inventory and title.
- Existing exported PDFs and historical persisted calculation evidence are not rewritten. Reports generated from historical snapshots may correctly show the old label.
- **Migration has not been deployed/applied to either configured database.** Current library data therefore still has the pre-change counts recorded above until deployment. Production identity and deployment status were not independently verified. No prisma db push, reseed, recalculation, broad LIKE replacement or historical backfill was performed.
