# Task 7 manual fixtures (dev/test only)

The opt-in seed is `scripts/e2e/seed-task7-factor-fixtures.mjs`, using the existing E2E Prisma-client loader and stable-ID upsert pattern. It is separate from the normal production seed and from the baseline E2E seed. No migration inserts fixtures. No existing factor values or matching rules change.

Use a **local** PostgreSQL database whose name contains `dev`, `local`, `test`, or `e2e`, with the Task 7 schema migration already applied and its Prisma client generated. The script refuses remote hosts, production/staging-looking URLs, missing opt-in, and any `NODE_ENV` other than `development` or `test`. Test mode also requires the existing E2E guard's `ALLOW_TEST_DB_RESET=true` and test/e2e database name. It does not load the API's `.env` implicitly.

For local development, supply an environment file containing the local database URL:

```sh
NODE_ENV=development ALLOW_TASK7_DEV_FIXTURES=true node --env-file=/absolute/path/to/local.env scripts/e2e/seed-task7-factor-fixtures.mjs
```

Alternatively, export the local `DATABASE_URL`, `NODE_ENV=development`, and `ALLOW_TASK7_DEV_FIXTURES=true`, then run `pnpm seed:task7-fixtures`. Run twice; the same one source, two factors, two versions, and two legacy records are updated. No unrelated rows are touched. All writes occur in one transaction.

| Factor ID (also legacy ConversionFactor ID) | Name | Value/unit | Applicability | Emission basis |
| --- | --- | --- | --- | --- |
| `dev-task7-alberta-electricity-grid-displacement-renewable-2026` | Alberta Electricity Grid Displacement - Renewable - 2026 | 0.4303 tCO2e/MWh | `ALBERTA_OFFSET_PROJECT` | `DIRECT_CO2E` |
| `dev-task7-alberta-diesel-co2-component` | Alberta Diesel Combustion - CO2 Component | 2681 g CO2/L | `REFERENCE_ONLY` | `CO2_COMPONENT` |

The governed version IDs are the factor IDs plus `-v1`; their version label is `dev-test-1`. The shared source ID is `dev-task7-source-alberta-offset-handbook-3-2`.

Task 7 has no `GRID_DISPLACEMENT` basis enum. Its actual model separates direct CO2e/component basis from applicability. Electricity uses `DIRECT_CO2E`, offset applicability, and the existing `methodology` / `methodologyProvenance.methodologyMethod` fields to expose **Grid Displacement**. Diesel uses `CO2_COMPONENT` and retains `g CO2` as its output unit; it is never converted to 2.681 kgCO2e/L. Eligibility is derived from existing Task 7 guards, with no new eligibility fields. `isDefault` is false. `isSystemDefault` is true to identify shared library records for the existing Admin list; applicability and emission basis independently prohibit inventory calculation use.

Source provenance uses Alberta Environment and Protected Areas, Carbon Offset Emission Factors Handbook, version 3.2, source year 2025, publication August 2025, and the requested Tables 1 and 7. The schema requires a full publication date, so August 1 is stored as a month placeholder, explicitly explained in notes. Electricity vintage is independently 2026. Diesel vintage remains unspecified because none was requested. The source URL points to Alberta's offset-system listing, not a claim that its current handbook is edition 3.2. All fixture records remain unverified drafts with demo confidence and explicit dev/test notes.

After seeding, point the local API at the same local database. In Admin Factors, locate each name and open View. Direct detail routes are `/factor-versions/<factor-id>-v1`. Inspect source authority, document, source version, factor year, applicability, emission basis, methodology, and table reference.

With the existing inventory factors present, verify:

- Electricity, 1000 kWh, Alberta, 2026 selects the existing 0.53 factor and yields **530 kgCO2e**. The newer offset fixture cannot match, including through convertible MWh units.
- Diesel, 100 L, Alberta, 2026 selects the existing 2.68 factor and yields **268 kgCO2e**. The component fixture cannot match; it cannot yield 268.1 kgCO2e. With no eligible direct factor, no matching fixture is returned.

Automated verification: `pnpm test src/test/task7FactorFixtures.test.tsx src/utils/factorGovernance.test.ts src/pages/FactorDetailsPage.test.tsx src/reports/domain/buildCanonicalReportData.test.ts src/reports/pdf/__tests__/pdfRenderers.test.ts`. This covers exact fixture matching in legacy/governed representations, unsafe-environment rejection, generated Prisma-enum validation, repeat upserts using an in-memory transaction test double, Admin detail provenance, and unchanged golden totals 579.40 / 338.06 / 2428.44. The transaction test is not a live database idempotence check.
