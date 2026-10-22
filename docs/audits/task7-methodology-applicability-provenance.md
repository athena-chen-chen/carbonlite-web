# Task 7 — methodology applicability and factor provenance

Implemented on 2026-10-14. No factor values, seeds, scope rules, or report-page architecture were changed for Task 7. The database migration is prepared, validated, and **not applied**. Apply it before deploying the generated backend client/application.

## Before-coding audit

The following findings and implementation plan were reported to the user before Task 7 changes:

1. There are two factor models: legacy `ConversionFactor`, and governed `Factor` / `FactorVersion` / `FactorSource`.
2. Both have authority, document, URL, source year, methodology text, confidence, and review fields. Governed versions additionally provide source page, section, table, row, column, and citation.
3. `FactorSource.sourceVersion`, `sourceYear`, and `publishedDate` already exist. `FactorVersion.version`, `factorYear`, `effectiveFrom`, and `effectiveTo` separately describe factor identity/vintage/effectivity.
4. Applicability was absent in both models.
5. Component-gas versus direct CO2e basis was absent. The numeric factor and result-unit string alone were insufficient protection.
6. Existing `methodology` was unstructured text; structured document/version/method/level references were absent.
7. GWP provenance was absent.
8. Matching used activity, compatible units, jurisdiction, year, governance status, and existing deterministic/fallback priorities.
9. A verified/official offset EGDF could enter matching candidates because nothing excluded offset applicability.
10. A gas component could enter direct multiplication because no eligibility check interpreted its basis or explicit component result unit.
11. The smallest safe change was nullable typed applicability and emission basis plus optional structured provenance on both factor models.
12. Existing authority/document/version/year/publication/effectivity/table/section fields would be reused.
13. Only missing applicability, basis, methodology reference/level, sector requirements, quantity basis, and GWP references would be added.
14. Expected changes: Prisma/migration; factor DTOs, services and response mappings; backend/frontend matchers; calculation snapshots; existing provenance displays; focused tests.
15. Existing factor values and golden calculations would remain unchanged.

## After-implementation report

1. **Gap found.** Official authority and review status were previously conflated with eligibility for an ordinary inventory. Gas components and sector requirements had no explicit safety gates.
2. **Applicability.** Nullable `FactorApplicability` supports `CORPORATE_INVENTORY`, `ALBERTA_OFFSET_PROJECT`, `ALBERTA_TIER_SGRR`, and `REFERENCE_ONLY`. There are no overlapping eligibility booleans.
3. **Methodology provenance.** Nullable JSON `methodologyProvenance` has a typed frontend/backend contract and nested, validated API DTO. Optional fields: `methodologyDocument`, `methodologyVersion`, `methodologyMethod`, `methodologySection`, `methodologyLevel`, `sectorApplicability`, `quantityBasis`, `gwpSource`, and `gwpVersion`. Legacy factors can also record `sourceVersion` and `publishedDate` there because they have no `FactorSource` relation. Existing `methodology` text remains intact. Governed source version/publication and source table/section fields are reused rather than duplicated in the schema.
4. **Component distinction.** Nullable `EmissionBasis` supports `DIRECT_CO2E`, `CO2_COMPONENT`, `CH4_COMPONENT`, and `N2O_COMPONENT`. All component bases are excluded from inventory multiplication, even if their result-unit text says CO2e. Explicit CO2/CH4/N2O component units are also rejected if metadata is absent or inconsistent. Quantity basis is a separate optional `ENERGY_HHV` / `VOLUME` reference; offset applicability expresses the grid-displacement context. These independent concepts are not conflated into one enum.
5. **GWP support.** Optional source/version references are stored and displayed. They do not enable component-gas arithmetic. Component factors remain ineligible even when GWP metadata is supplied. No gas-component aggregation or GWP calculation engine was added.
6. **Migration.** Backend `prisma/migrations/20261014000000_factor_applicability_provenance/migration.sql` creates two enums and adds three nullable columns to each of `FactorVersion` and `ConversionFactor`: `applicability`, `emissionBasis`, and `methodologyProvenance`. No defaults, backfill, seeding, UPDATE, DELETE, or destructive operations. Prisma schema validation passes; the independently generated [schema diff](task7-migration-diff.sql) confirms exactly these additions. No production or other database migration was run.
7. **Backward compatibility.** Missing/null applicability and basis retain legacy eligibility. Direct compatible factors and previous ranking/fallback order are preserved. Existing 0.53 electricity, 49.44 natural gas, 2.31 gasoline, and 2.68 diesel values are untouched. Existing source-year semantics are not reinterpreted; future official factors should use governed versions for separately recorded factor vintage.
8. **Matching.** Backend calculation-quality matching, applicable-factor API matching, and the carbon branch of `matchBestFactor` use the eligibility gate. Frontend direct matching, governed conversion-assisted matching, and compatible-unit suggestions use its counterpart, including nested active versions. Explicit non-inventory applicability is excluded before ranking. Nonempty sector restrictions are excluded because current activities do not provide a governed regulatory sector. There is no filename/company inference. Production-readiness checks also require inventory eligibility; source authority remains distinct from calculation eligibility.
9. **Offset safety.** A test-only 2026 EGDF at 0.4303 tCO2e/MWh is representable but excluded. Normal 980 kWh Alberta inventory still selects 0.53 and yields 519.40 kgCO2e. Offset, TIER/SGRR, and reference-only exclusions are tested in legacy and governed backend/API candidates and frontend active versions.
10. **Component safety.** Tests exclude CO2, CH4, and N2O components and explicit `g CO2/L` units. Diesel 2681 g CO2/L and gasoline 2307 g CO2/L never become direct final CO2e calculations. Pilot direct factors remain unchanged. Sector-required factors cannot silently match.
11. **ENMAX.** Golden report total 338.06; scopes 148.32 / 189.74 / 0; optional completeness 0%. Natural gas remains 3 GJ × 49.44 = 148.32, ECCC, Canada (Generic), `GENERIC_JURISDICTION_FALLBACK`. A direct GJ factor remains preferred; 100 m3 cannot use an energy factor without an existing governed conversion. No universal GJ/m3 conversion was added.
12. **Messy Excel.** Canonical and both PDF profiles preserve total 579.40; scopes 0 / 519.40 / 60; coverage 100%; source review 9 / 3 / 6.
13. **Field Mapping.** Canonical/PDF and browser tests preserve total 2428.44; scopes 1228.74 / 662.50 / 537.20; four facility groups; optional completeness 0%; source review 5 / 5 / 0. ENMAX and Field Mapping browser export tests both pass.
14. **Technical Report and provenance display.** Existing golden executives remain two pages and technical packages nine pages with unchanged facts. Optional reference lines appear in Factor Details, calculation review/traceability, and Technical Emissions Report factor details. CSV uses its existing `Validation Note` column; column names/order do not change. A Factor Details UI fixture and PDF/CSV tests show document version and applicability without introducing TIER/SGRR/offset certification claims. A separate PDF integration test confirms optional metadata survives rendering with total 338.06 unchanged. Empty metadata produces no additional provenance lines.
15. **Build/typecheck.** Backend Nest build and frontend Vite build pass. Prisma client generation and schema validation pass. Full frontend typechecking remains blocked by existing repository errors, including missing Nest/shared-types dependencies, legacy form type mismatches, and existing metricsOverview/metrics-summary typing issues. The new governance helper, DTO-facing frontend contracts, Factor Details additions, and PDF provenance additions produce no new diagnostics in the diagnostic typecheck. Do not interpret the Vite build as a clean full-repository typecheck.
16. **Tests.** 67 backend tests across four suites; 229 focused frontend tests across fifteen files; two Chromium E2E tests pass. Tests cover legacy/null eligibility, explicit inventory, all non-inventory contexts, direct/component safety, sector requirements, source version versus vintage, immutable copied provenance, applicable-factor API safety, ENMAX GJ matching, golden reports, optional UI/PDF/CSV references, and existing report/export behavior. Test-only official references were never seeded into a production library.
17. **Deferred.** Actual governed official-factor ingestion and approval; regulatory sector collection; measured/supplier HHV conversion provenance where required; multi-gas aggregation with governed GWP sets; methodology-level validation; full TIER/SGRR or offset-project requirements; production migration rollout. None is represented as regulatory compliance.

## Calculation history

`MetricResult.detailsJson.factorProvenance` captures factor ID, governed version ID/label, source document version/year/publication date, factor vintage, table/section, applicability, emission basis, and a deep copy of methodology/GWP references. Later source or methodology edits cannot mutate that stored JSON. Tests mutate a source from 3.2 to 3.3 after capture and assert the historical snapshot retains 3.2 and its original version identity.

The existing calculate endpoint previously skipped governed versions unless their ID also referred to a legacy conversion factor. It now persists a calculated governed result with a nullable legacy FK, its governed version ID, and the evaluator's value/unit/provenance. An integration-style service test verifies this persistence path. Existing explicit recalculation behavior still replaces the prior result; this task does not create an append-only calculation-history or frozen-report archive. Existing historical rows are not backfilled from current mutable source metadata.

## Main files

Backend:

- `prisma/schema.prisma` and the additive migration above.
- `src/conversion-factors/factor-governance.ts`, `dto/factor-governance.dto.ts`, create/update DTO inheritance.
- `conversion-factors.service.ts`, `factors.service.ts`.
- `src/metrics/calculation-quality.service.ts`, `metrics.utils.ts`, `metrics.service.ts`.
- Factor governance, matching, API, and persistence tests.

Frontend:

- `src/utils/factorGovernance.ts` and tests; `conversionFactorMatching.ts`.
- `src/services/conversionFactors.ts`, `factorVersions.ts`, `metrics.ts`, `metricsOverview.ts`.
- Existing `FactorDetailsPage`, `MetricsSummarySection`, and report calculation traceability display.
- `src/reports/pdf/pdfSections.ts`; `src/utils/reportCsvExport.ts`.
- Factor Details and PDF provenance tests. No Task 7 edit to ReportingPage architecture.

## Official references

The requested Handbook 3.2 / August 2025 and AQM 2.3 / September 2023 references remain pinned. Alberta's current [offset-system source listing](https://www.alberta.ca/alberta-emission-offset-system) also lists a newer Handbook edition; this task does not substitute it for the user's pinned reference or change any factor values. [Official AQM 2.3 PDF](https://open.alberta.ca/dataset/5d79b86b-7811-413f-88d8-acd36cb9d6d2/resource/29984c25-29bc-46cd-83fb-1f54fb3e2f5c/download/epa-alberta-greenhouse-gas-quantification-methodologies-version-2-3-2023-09.pdf). No official gas-component table was imported or converted into CO2e.
