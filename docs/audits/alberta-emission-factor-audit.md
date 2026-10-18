# CarbonLite Alberta Emission Factor Audit

Read-only audit date: 2026-10-10

Scope: Alberta purchased electricity, natural gas, diesel, and gasoline factor inventory, matching, unit handling, calculation, display, and tests.

## A. Executive Summary

CarbonLite currently contains two visible Alberta electricity tracks:

- A backend seeded pilot/default Alberta electricity factor of `0.53 kgCO2e/kWh`, stored as CarbonLite system default metadata with `sourceYear: 2025`, `verified: false`, `FactorVersion.status: DRAFT`, and `confidenceLevel: DEMO` in the governed factor library.
- A frontend-only reference set that includes Alberta `0.49 kgCO2e/kWh` for 2025 and `0.438 kgCO2e/kWh` for 2026, labelled as ECCC electricity consumption intensity reference, but not proven to be seeded into the backend database by the inspected seed/migration path.

The `0.53 kgCO2e/kWh` value is not evidenced as an official Alberta purchased-electricity Scope 2 factor in the inspected repository. Its declared source is CarbonLite pilot/default metadata, not Alberta AQM, the Alberta Offset Handbook, or ECCC. It may be defensible only as a pilot estimate with explicit review disclosure, not as a formal 2026 SME inventory factor.

Fuel factors are closer to Alberta Handbook combustion CO2 component values but still lack official source metadata in the backend seed:

- Diesel `2.68 kgCO2e/L` is effectively aligned with the supplied Alberta Handbook CO2 component `2,681 g CO2/L`, but the stored unit says `kgCO2e`, not CO2-only.
- Gasoline `2.31 kgCO2e/L` is close to `2,307 g CO2/L` and to the complete CO2e value surfaced in secondary indexed text, but official source metadata is missing.
- Natural gas `1.89 kgCO2e/m3` is below the supplied Alberta Handbook `1,962 g CO2/m3` CO2 component and is not sourced as Alberta stationary combustion.

Paid pilot status: **conditional go for workflow demonstration only; no-go for formal Alberta inventory/reporting claims until factor provenance and methodology labels are corrected.**

## B. Existing Factor Inventory

| Factor | Value | Unit | Year | Source | Methodology | Scope | Confidence | Code Location |
|---|---:|---|---:|---|---|---|---|---|
| Electricity - Alberta, backend seed legacy `ConversionFactor` | 0.53 | kgCO2e/kWh | 2025 | CarbonLite System Defaults | Pilot-stage jurisdiction-specific default; replace before formal reporting | Scope 2 | Low; Internal Review Required; unverified | `/Users/shuangchen/carbonlite-api/prisma/seed.ts:19`, `/Users/shuangchen/carbonlite-api/prisma/seed.ts:166`, `/Users/shuangchen/carbonlite-api/prisma/seed.ts:248` |
| Electricity - Alberta, backend governed `FactorVersion` created from seed | 0.53 | kgCO2e/kWh | 2025 | CarbonLite MVP Default Factors v1.0 | Same pilot metadata | Scope 2 | `DRAFT`, `DEMO`, unverified | `/Users/shuangchen/carbonlite-api/prisma/seed.ts:361`, `/Users/shuangchen/carbonlite-api/prisma/seed.ts:369`, `/Users/shuangchen/carbonlite-api/prisma/seed.ts:375` |
| Electricity emission factor, early migration generic | 0.53 | kgCO2e/kWh | UNKNOWN | CarbonLite system defaults / `mvp-seed` | UNKNOWN | UNKNOWN in row | UNKNOWN | `/Users/shuangchen/carbonlite-api/prisma/migrations/20260513000000_system_default_conversion_factors/migration.sql:40` |
| Electricity - Alberta - 2026, frontend injected pilot factor | 0.53 | kgCO2e/kWh | 2026 | CarbonLite MVP Default Factors v1.0 | Purchased electricity pilot workflow validation | Scope 2 | LOW; Internal Review Required; unverified | `/Users/shuangchen/carbonlite-web/src/services/conversionFactors.ts:198`, `/Users/shuangchen/carbonlite-web/src/services/conversionFactors.ts:217` |
| Electricity - Alberta - 2026 Reference, frontend injected reference | 0.438 | kgCO2e/kWh | 2026 | ECCC electricity consumption intensity reference | Purchased electricity consumption intensity | Scope 2 | HIGH; verified in frontend object | `/Users/shuangchen/carbonlite-web/src/services/conversionFactors.ts:204`, `/Users/shuangchen/carbonlite-web/src/services/conversionFactors.ts:262` |
| Natural gas combustion, backend seed | 1.89 | kgCO2e/m3 | 2025 | CarbonLite System Defaults | Pilot/default combustion factor | Scope 1 | Medium engineering estimate; Internal Review Required; unverified | `/Users/shuangchen/carbonlite-api/prisma/seed.ts:161`, `/Users/shuangchen/carbonlite-api/prisma/seed.ts:164` |
| Natural Gas - Canada Generic, frontend injected ECCC GJ factor | 49.44 | kgCO2e/GJ | 2025 | ECCC Table A8 national fuel energy emission factor | Canada-generic direct natural gas combustion by energy | Scope 1 | HIGH but Internal Review Required; not Alberta-specific | `/Users/shuangchen/carbonlite-web/src/services/conversionFactors.ts:356`, `/Users/shuangchen/carbonlite-web/src/services/conversionFactors.ts:368` |
| Diesel combustion, backend seed | 2.68 | kgCO2e/L or liters | 2025 | CarbonLite System Defaults | Pilot/default combustion factor | Scope 1 | Medium engineering estimate; Internal Review Required; unverified | `/Users/shuangchen/carbonlite-api/prisma/seed.ts:161`, `/Users/shuangchen/carbonlite-api/prisma/seed.ts:162` |
| Gasoline combustion, backend seed | 2.31 | kgCO2e/L or liters | 2025 | CarbonLite System Defaults | Pilot/default combustion factor | Scope 1 | Medium engineering estimate; Internal Review Required; unverified | `/Users/shuangchen/carbonlite-api/prisma/seed.ts:161`, `/Users/shuangchen/carbonlite-api/prisma/seed.ts:163` |
| Diesel / natural gas / gasoline, frontend pilot fixture | 2.68 / 1.89 / not present in this fixture slice | kgCO2e/L or kgCO2e/m3 | 2026 | CarbonLite Pilot Default Factor Set v0.1 | Pilot golden totals | Scope 1 | Pilot Estimate; Internal Review Required | `/Users/shuangchen/carbonlite-web/src/test/pilotEmissionsFixture.ts:167`, `/Users/shuangchen/carbonlite-web/src/test/pilotEmissionsFixture.ts:184` |

Deployed DB status is **UNKNOWN**. This audit inspected schema, migrations, seed files, services, frontend injections, and tests. It did not query a live production or staging database.

## C. Official Reference Comparison

Local PDF availability: both referenced PDFs exist in `/Users/shuangchen/Downloads`, but this environment lacks `pdfinfo`, `pdftotext`, PyPDF, pdfplumber, and PyMuPDF. `file` confirms the PDFs and page count for the Handbook. The Alberta web index confirms the AQM PDF exists and search-index text from the Alberta Handbook v3.1/v3.2 family exposes the 2026 EGDF schedule. The audit brief's page/table values are treated as source data, not instructions.

External references checked:

- Alberta AQM v2.3 PDF URL: `https://open.alberta.ca/dataset/5d79b86b-7811-413f-88d8-acd36cb9d6d2/resource/29984c25-29bc-46cd-83fb-1f54fb3e2f5c/download/epa-alberta-greenhouse-gas-quantification-methodologies-version-2-3-2023-09.pdf`
- Alberta Offset Handbook web-index text for the EGDF schedule and offset-use context: `https://open.alberta.ca/dataset/f2109d83-2153-4481-a8b8-b00178e53999/resource/99973308-0b0f-402e-acea-e1dc339f2e64/download/epa-carbon-offset-emission-factors-handbook-v3-1-2023-01.pdf`
- Alberta Standard for GHG Emission Offset Project Developers, Handbook/EGDF context: `https://open.alberta.ca/dataset/ba00d7a0-e37b-4792-a050-f56bfd968187/resource/beb74477-adf8-4654-b7bf-9a5fa80248b4/download/epa-standard-for-ghg-emission-offset-project-developers-v3-2-2023-04.pdf`

| CarbonLite Factor | Official Reference | Status | Explanation |
|---|---|---|---|
| Electricity - Alberta `0.53 kgCO2e/kWh` | Alberta Offset Handbook Table 1 EGDF 2026: `0.4303 tCO2e/MWh`; with line loss: `0.4588 tCO2e/MWh` | NOT APPLICABLE / INSUFFICIENT EVIDENCE | EGDF values are offset/displacement factors, not automatically purchased-electricity Scope 2 inventory factors. Difference from `0.53` alone is not a defect. Repository metadata does not show an official purchased-electricity source for `0.53`. |
| Electricity - Alberta frontend reference `0.438 kgCO2e/kWh` | ECCC electricity consumption intensity reference, not verified against local PDF in this run | INSUFFICIENT EVIDENCE | The value is labelled as purchased electricity consumption intensity and is methodologically closer to Scope 2 than EGDF, but it appears frontend-injected and not seeded in backend. Source page/table are unknown. |
| Natural gas `1.89 kgCO2e/m3` | Handbook Table 6: Natural Gas CO2 combustion `1,962 g CO2/m3` per audit brief | POSSIBLE MISMATCH | Stored value is 1.89 kgCO2e/m3, about 3.7% below the CO2-only component supplied. If CarbonLite intends Alberta stationary combustion CO2e, source and CH4/N2O treatment are missing. |
| Diesel `2.68 kgCO2e/L` | Handbook Table 7: Diesel CO2 combustion `2,681 g CO2/L` per audit brief | VERIFIED VALUE PROXIMITY / MISSING SOURCE | Numeric value is effectively the CO2 component rounded to 2 decimals. Stored label says kgCO2e; if CH4/N2O are included, expected CO2e may be higher. Official page/table metadata is missing. |
| Gasoline `2.31 kgCO2e/L` | Handbook Table 7: Motor Gasoline CO2 combustion `2,307 g CO2/L` per audit brief | VERIFIED VALUE PROXIMITY / MISSING SOURCE | Numeric value is close to CO2 component rounded to 2 decimals. Stored label says kgCO2e; official metadata and gas-component boundary are missing. |

Official reference notes:

- Alberta Offset Handbook EGDFs apply to emission offset projects that displace, reduce, or increase Alberta grid electricity usage, not automatically to GHG Protocol purchased-electricity Scope 2 reporting.
- Combustion CO2 components are not automatically full CO2e. Do not combine upstream extraction/production or line-loss factors into direct combustion without a declared methodology.

## D. Factor Matching and Calculation Risks

| Severity | Description | Evidence | Impact | Recommended Correction |
|---|---|---|---|---|
| P1 | `0.53 kgCO2e/kWh` has no official source evidence for 2026 Alberta purchased electricity. | Backend seed declares CarbonLite default source and unverified pilot metadata at `/Users/shuangchen/carbonlite-api/prisma/seed.ts:19` and `/Users/shuangchen/carbonlite-api/prisma/seed.ts:166`. Frontend injects a 2026 pilot factor at `/Users/shuangchen/carbonlite-web/src/services/conversionFactors.ts:198`. | Formal reports could present a pilot factor as a usable Scope 2 factor if users do not notice review language. | Keep pilot factor available only as demo/review-required, and add a sourced official purchased-electricity factor with page/table, methodology, location-based/market-based classification, line-loss treatment, and reporting year. |
| P1 | Backend calculation can use demo electricity governed factors through a special case even outside explicit `allowDemoFactors` filtering. | `isPilotElectricitySystemFactor` admits system DEMO electricity versions at `/Users/shuangchen/carbonlite-api/src/metrics/calculation-quality.service.ts:1055`; governed candidate filter includes it at `/Users/shuangchen/carbonlite-api/src/metrics/calculation-quality.service.ts:648`. Test expects a DRAFT/DEMO electricity factor to calculate at `/Users/shuangchen/carbonlite-api/src/metrics/calculation-quality.service.spec.ts:527`. | Demo electricity factors can enter calculated emissions totals. | Require an explicit organization setting or report mode for demo factors, and expose a hard review flag in all outputs when used. |
| P1 | Frontend can calculate supplemental emissions from the visible factor library when backend returns missing factors. | Supplemental path multiplies quantity by factor value at `/Users/shuangchen/carbonlite-web/src/services/metricsOverview.ts:1111`; marks details as calculated at `/Users/shuangchen/carbonlite-web/src/services/metricsOverview.ts:1200`. Test confirms fallback for diesel/gasoline/natural gas at `/Users/shuangchen/carbonlite-web/src/services/metricsOverview.test.ts:1493`. | UI totals can differ from backend authoritative calculations and may use frontend-injected factors. | Make backend the sole calculation authority or label supplemental calculations as preview-only and exclude them from formal totals. |
| P1 | Natural gas m3 factor is below Alberta Handbook CO2 component and lacks Alberta source metadata. | Seed value at `/Users/shuangchen/carbonlite-api/prisma/seed.ts:164`; metadata uses CarbonLite default source at `/Users/shuangchen/carbonlite-api/prisma/seed.ts:248`. | Scope 1 natural gas emissions may be understated for Alberta. | Add a sourced Alberta stationary combustion factor with CO2/CH4/N2O component treatment, or retire the m3 pilot factor for formal reporting. |
| P2 | Fuel factors use `kgCO2e` result units while supplied Alberta values are CO2 components. | Seed `resultUnit: kgCO2e` at `/Users/shuangchen/carbonlite-api/prisma/seed.ts:281`; diesel/gasoline/natural gas values at `/Users/shuangchen/carbonlite-api/prisma/seed.ts:162`. | Boundary ambiguity: users cannot tell whether non-CO2 gases are included. | Store gas basis in metadata, e.g. `CO2_ONLY`, `CO2E_AR5`, `CO2E_AR6`, and include CH4/N2O components when claiming CO2e. |
| P2 | Conversion factor DTO lacks page/table fields despite schema support in governed FactorSource/FactorVersion. | DTO only accepts source authority/document/year/url/methodology at `/Users/shuangchen/carbonlite-api/src/conversion-factors/dto/create-conversion-factor.dto.ts:57`; schema supports sourcePage/sourceTable/citation fields at `/Users/shuangchen/carbonlite-api/prisma/schema.prisma:487`. | UI/API-created factors may be impossible to audit to exact official table rows. | Add DTO/API support for source page, table, row, column, and citation text. |
| P2 | Electricity matching distinguishes province and year but not methodology family. | Matching selects by activity, unit, country, region, year, and status at `/Users/shuangchen/carbonlite-api/src/conversion-factors/conversion-factors.service.ts:516`; no location-based, market-based, EGDF, line-loss, or consumption/generation/displacement discriminator. | A future EGDF or line-loss factor could be selected for purchased electricity solely because metadata matches jurisdiction/year/unit. | Add factor methodology/boundary enum and require compatibility with record/reporting purpose. |
| P2 | Backend unit conversions are intentionally narrow. | Only MWh/kWh conversion is present at `/Users/shuangchen/carbonlite-api/src/metrics/calculation-quality.service.ts:1074`. Tests verify incompatible fuel units are skipped at `/Users/shuangchen/carbonlite-api/src/metrics/calculation-quality.service.spec.ts:796`. | Good safety posture, but natural gas GJ vs m3 cannot be calculated unless a distinct factor exists. | Preserve this behavior; add explicit sourced factors rather than implicit energy-volume conversion. |

Confirmed defects vs risks:

- Confirmed: `0.53` is stored as CarbonLite pilot/default metadata, not an official source-backed Alberta 2026 factor.
- Confirmed: frontend can calculate supplemental totals from visible factors after backend returns missing factors.
- Risk: EGDF factor misuse is not currently proven in seeded backend data, but the matching model lacks a methodology discriminator that would prevent it if such factors are added.
- Risk: deployed database may differ from seed/migration state; live DB was not inspected.

## E. Test Coverage Gaps

Existing coverage:

- Diesel calculation: `1000 L x 2.68 = 2680 kgCO2e` at `/Users/shuangchen/carbonlite-api/src/metrics/calculation-quality.service.spec.ts:78`.
- Natural gas calculation: `1000 m3 x 1.89 = 1890 kgCO2e` at `/Users/shuangchen/carbonlite-api/src/metrics/calculation-quality.service.spec.ts:97`.
- Electricity requires jurisdiction at `/Users/shuangchen/carbonlite-api/src/metrics/calculation-quality.service.spec.ts:128`.
- Electricity selects Alberta by jurisdiction and reporting year at `/Users/shuangchen/carbonlite-api/src/metrics/calculation-quality.service.spec.ts:158` and `/Users/shuangchen/carbonlite-api/src/metrics/calculation-quality.service.spec.ts:195`.
- MWh to kWh conversion is tested at `/Users/shuangchen/carbonlite-api/src/metrics/calculation-quality.service.spec.ts:567`.
- Country-level fuel fallback is tested at `/Users/shuangchen/carbonlite-api/src/metrics/calculation-quality.service.spec.ts:592`.
- Invalid unit and incompatible fuel unit handling are tested at `/Users/shuangchen/carbonlite-api/src/metrics/calculation-quality.service.spec.ts:739` and `/Users/shuangchen/carbonlite-api/src/metrics/calculation-quality.service.spec.ts:796`.
- Frontend prevents generic electricity fallback without province at `/Users/shuangchen/carbonlite-web/src/services/metricsOverview.test.ts:1583`.

Gaps against requested scenarios A-H:

| Scenario | Coverage |
|---|---|
| A. Alberta electricity 2026 with official purchased-electricity factor | GAP: no backend seeded official 2026 Alberta purchased-electricity factor test. |
| B. Alberta electricity with EGDF/offset factor present | GAP: no test preventing EGDF/displacement/line-loss factor selection for Scope 2 inventory. |
| C. Alberta electricity missing province | COVERED. |
| D. Alberta electricity MWh to kWh | COVERED. |
| E. Natural gas Alberta m3 official stationary combustion | GAP: test uses 1.89 pilot value, not official Alberta Table 6 value. |
| F. Natural gas GJ should use separate GJ factor, not m3 conversion | PARTIAL: frontend has ECCC GJ factor injection and incompatible unit tests exist, but backend official GJ/m3 separation should be tested end-to-end. |
| G. Diesel/Gasoline L factors vs official components | PARTIAL: diesel tested; gasoline not visible in backend calculation-quality test slice. Neither validates official source metadata. |
| H. Frontend fallback cannot override backend formal totals | GAP: current tests assert fallback does calculate for fuels. |

## F. Paid Pilot Go/No-Go

Decision: **Go for paid pilot workflow demonstration with explicit constraints; no-go for formal Alberta emissions inventory or regulatory-ready reporting.**

Required pilot guardrails:

- Report language must say pilot/default factors require review before formal reporting.
- Any totals using `0.53`, `1.89`, `2.68`, or `2.31` from CarbonLite defaults should be marked estimated/pilot unless replaced by sourced official factors.
- Do not claim Alberta TIER, SGRR, AQM, offset, or GHG Protocol compliance from these defaults.
- Do not present EGDF values as Scope 2 purchased-electricity factors unless a methodology decision explicitly supports that use.

## G. Recommended Next Steps

1. Add official factor records for Alberta electricity, natural gas, diesel, and gasoline with exact source document, version, page, table, row, gas basis, scope, methodology family, and line-loss treatment.
2. Add a factor methodology/boundary enum: `PURCHASED_ELECTRICITY_LOCATION_BASED`, `PURCHASED_ELECTRICITY_MARKET_BASED`, `GRID_DISPLACEMENT_EGDF`, `GRID_USAGE_WITH_LINE_LOSS`, `DIRECT_COMBUSTION_CO2_ONLY`, `DIRECT_COMBUSTION_CO2E`, `UPSTREAM_FUEL_LIFECYCLE`.
3. Remove or quarantine frontend supplemental emissions from formal totals; use it only as preview/review guidance unless backend confirms the same calculation.
4. Add tests proving EGDF/offset factors cannot match purchased-electricity Scope 2 records by accident, and proving official Alberta fuel factors carry complete source metadata.
5. Query deployed databases and compare live `ConversionFactor`, `Factor`, `FactorVersion`, and `FactorSource` rows against seed/migration expectations before any pilot report is delivered.
