# CarbonLite Factor Library Audit — 2026-10-25

## 1. Executive conclusion

**Do not represent the current factor library as ready for real customer emissions reports or accurate regulatory reporting.** Workflow/usability testing can continue with explicit test/preliminary labels and no reliance on calculated results. Charging for a pilot that delivers quantitative preliminary emissions reports is **NO at the current gate**; draft labels alone do not resolve the P0 issues. A separately scoped, clearly disclosed usability service is a different commercial decision, not approval of these factors.

The read-only snapshot contains **117 registry records: 23 ConversionFactor, 30 Factor, 34 FactorVersion, 30 FactorSource**. The 57 numeric factor/version records form **50 meaningful candidate groups** under the grouping rules in section 4. All 34 governed versions are **DRAFT, DEMO, unverified**. No linked governed version is a verified official corporate inventory factor. One official FactorSource row exists but has no linked versions. An ECCC-attributed 49.44/GJ legacy entry has real numerical source support, with material method limitations.

**P0-1 / CRITICAL: demo exclusion does not protect ordinary customer calculations.** Pure evaluation against the snapshot, with `allowDemoFactorsForCalculations=false`, still selects the Alberta 0.53 DRAFT/DEMO version and unverified demo legacy fuel/hotel/travel/shipping defaults (K1; section 16). **P0-2: source, gas-basis, year and method are not established for those customer-selectable defaults.** A CALCULATED result proves arithmetic/matching, not scientific suitability. **P0-3 / CRITICAL: two verified, explicitly synthetic organization-specific diesel factors remain selectable within their own organizations despite demo=false.** No cross-tenant selection into an unrelated organization was demonstrated.

Headline dispositions: Alberta electricity **REPLACE_CANDIDATE**; natural gas 49.44/GJ **REVIEW / PASS_WITH_LIMITATION for source agreement only**; gasoline **REPLACE_CANDIDATE**; diesel **REPLACE_CANDIDATE**; accommodation **REPLACE_CANDIDATE**; Water **PASS for tracked-only exclusion**, not a zero-emissions assertion. No correction was implemented.

## 2. Scope and methodology

Audit date: October 25, 2026 (America/Edmonton). Snapshot time: **2026-10-25T07:36:37.260Z**. Target: confirmed project `carbonlite`, branch `development`, database `neondb`, schema `public`. The project/branch identity relies on the user's previously externally confirmed identity plus the repository's guarded `loadEnvironment('neon')` host check; no new Neon control-plane identity lookup was available. The SQL independently returned database and schema. All **49** migrations have non-null finish times and no rollback timestamp; no migration was run.

Connection setup included `options=-c default_transaction_read_only=on`; the Prisma Repeatable Read transaction executed `SET TRANSACTION READ ONLY` before any inventory SELECT. PostgreSQL returned both `transaction_read_only=on` and `default_transaction_read_only=on`. Four complete `SELECT * ... ORDER BY id` queries read every record from the requested public registries. Additional SELECTs read organization IDs/demo policy flags and aggregate tracked-activity states. No INSERT, UPDATE, DELETE, schema change, seed, or product endpoint mutation occurred. The initial sandboxed connection failed; the successful authorized connection used the same read-only safeguards.

Backend source audited at **78350bdd93b47f28c0fc03460ab8b662a731f0f7**. Relevant selection/evaluation files match HEAD. Frontend source at **9181e3f42293fc2f65f603c639bb5b0b0c280eec**. Pre-existing backend document-import refactor changes and the untracked structural assessment were left untouched. Runtime traces execute the read, normalize, match and evaluate methods **in memory**, with a fake Prisma object and the captured catalog; they do not call database mutations, services over HTTP, or a running deployed backend. They establish code-plus-catalog behavior, not a newly observed production HTTP execution.

Audit-only unit canonicalization equates `L/liter/liters/litre/litres`; no density, HHV, fuel blend, vehicle technology, or physical unit conversion is invented. Differences below use **current minus reference**, divided by reference for percent. A negative number means the current value is lower. Conditional examples are separate from approved replacements. Every missing scientific or temporal basis remains UNKNOWN/NOT DETERMINED.

Evidence abbreviations:

- **DB**: complete read-only registry snapshot, reproduced record-by-record in Appendix B.
- **K1**: backend `src/metrics/calculation-quality.service.ts` lines 124–145, 310–335, 659–905, 1050–1052, 1112–1124, 1320–1330; `src/metrics/calculation-snapshots.service.ts` lines 18–62; `src/conversion-factors/factor-governance.ts` lines 49–65. Read at the backend SHA above.
- **K2**: backend `src/conversion-factors/conversion-factors.service.ts` lines 454–661 and frontend `src/utils/conversionFactorMatching.ts`, `src/utils/factorGovernance.ts`, `src/utils/canonicalRecordEvaluation.ts` at the SHAs above.
- **K3**: read-only seed/migration source inspection: backend `prisma/seed.ts` defaultFactors; `prisma/migrations/20260513000000_system_default_conversion_factors/migration.sql`; `prisma/migrations/20261017233000_canonical_calculation_snapshots/migration.sql`; `prisma/library/alberta-egdf-2026.ts`. These were read, never invoked.

## 3. Official source hierarchy

The references below were read as actual documents/pages, not only search snippets. E1's publication identity is verified but its complete PDF was unavailable; that limit matters for selecting a final corporate electricity factor.

| ID | Publisher / document / version and date | Location and purpose | Direct source / verification |
| --- | --- | --- | --- |
| E1 | ECCC, National Inventory Report 1990–2024, 2026; UNFCCC submission April 14, publication April 15, 2026 | Historical national inventory; corporate factor source candidate | [ECCC inventory landing page](https://www.canada.ca/en/environment-climate-change/services/climate-change/greenhouse-gas-emissions/inventory.html), [Canada's UNFCCC submission](https://unfccc.int/documents/656424). Complete PDF retrieval returned a blocked HTML response / fetch timeout: **OFFICIAL SOURCE NOT VERIFIED at full-table level**. E2 republishes selected values with NIR footnotes. |
| E2 | ECCC, Emission factors and reference values, v4.0, September 9, 2026 | Federal offset system; §§1,3.1,3.2; Tables 1.3,2.3,4.3,5.3/5.4 and footnotes 28,32,40,42 | [Official document](https://www.canada.ca/en/environment-climate-change/services/climate-change/pricing-pollution-how-it-will-work/output-based-pricing-system/federal-greenhouse-gas-offset-system/emission-factors-reference-values.html). Read directly. |
| E3 | ECCC, Greenhouse gas and air pollutant emissions projections – 2025; report-year 2025 | Annex A1.3.5, Table A8; approximate energy-based modeling factors; A1.9.3 discusses AR5 transition | [Official projections report](https://www.canada.ca/en/environment-climate-change/services/climate-change/greenhouse-gas-emissions/projections/2025-report.html). Read directly. |
| E4 | ECCC, Reporting greenhouse gas emissions data: technical guidance; current page concerns 2024/2025 requirements | §§2.4 and 3.2, facility reporting and separate gases | [Official technical guidance](https://www.canada.ca/en/environment-climate-change/services/climate-change/greenhouse-gas-emissions/facility-reporting/reporting/technical-guidance.html). Read directly; not silently certified as a new 2026 facility notice. |
| E5 | ECCC, Canada's Greenhouse Gas Quantification Requirements, v7.0, December 2023 | §2 fuel combustion/flaring; historical facility-method reference linked by E4 | [Official PDF](https://publications.gc.ca/collections/collection_2023/eccc/En81-28-2023-eng.pdf). Read relevant sections; not assumed to be a newly issued 2026 method. |
| A1 | Alberta Environment and Protected Areas, Carbon Offset Emission Factors Handbook, v3.3, August 2026 | Table 1 p6, Table 2 p7, Tables 4/5 p8, Table 6 p9; offset methods | [Current handbook PDF](https://open.alberta.ca/dataset/f2109d83-2153-4481-a8b8-b00178e53999/resource/31c9bf4d-d96e-43e8-afc9-a05574a5ca68/download/epa-carbon-offset-emission-factors-handbook-v3-3-2026-08.pdf). Browser fetch returned 403; direct HTTPS download succeeded and PDF text/tables were inspected. [Official applicability page](https://www.alberta.ca/alberta-emission-offset-system): new projects from August 27, 2026 use v3.3. |
| A2 | Alberta Environment and Parks, Methodology for the Electricity Displacement Factor, January 2023-effective calculation | pp4–6, marginal generation, operating/build margins, line losses | [Official PDF](https://open.alberta.ca/dataset/47299476-8943-4c8b-9205-432f1102d847/resource/667e1950-9ea2-4c84-8f9a-088451b7e937/download/aep-methodology-for-the-electricity-grid-displacement-factor.pdf). Direct HTTPS PDF read; browser fetch 403. |
| A3 | Alberta Environment and Protected Areas, Alberta Greenhouse Gas Quantification Methodologies, v2.3, September 2023 | Current catalog edition: Ch1; Ch15 pp15-7/15-9/15-10; Appendix C §C.4; TIER/SGRR | [Finalized official PDF](https://open.alberta.ca/dataset/5d79b86b-7811-413f-88d8-acd36cb9d6d2/resource/29984c25-29bc-46cd-83fb-1f54fb3e2f5c/download/epa-alberta-greenhouse-gas-quantification-methodologies-version-2-3-2023-09.pdf). Downloaded/read; catalog linked by [current Alberta regulation page](https://www.alberta.ca/technology-innovation-and-emissions-reduction-regulation). |
| A4 | Alberta, draft Chapter 15 Aggregate Facilities, supplied 2023 draft | Tables 15-3/15-4 and introductory applicability | [Supplied draft PDF](https://www.alberta.ca/system/files/custom_downloaded_images/epa-draft-alberta-greenhouse-gas-quantification-methodologies-chapter-15-aggregates.pdf). Read for comparison; final A3 governs the recommendation. |
| G1 | WRI/WBCSD, GHG Protocol Scope 2 Guidance, 2015 with published corrections | Ch6 pp53–54 grid-average vs marginal; Ch5 p34 and Appendix B p96 Scope 2 boundary | [Guidance PDF](https://ghgprotocol.org/sites/default/files/2023-03/Scope%202%20Guidance.pdf), [current guidance page](https://ghgprotocol.org/scope-2-guidance). Consultation drafts are not substituted for the published guidance. |
| G2 | ECCC, Global warming potentials, May 2, 2024 | AR4 vs AR5 100-year gas weights | [Official GWP reference](https://www.canada.ca/en/environment-climate-change/services/climate-change/greenhouse-gas-emissions/quantification-guidance/global-warming-potentials.html). Read directly. |
| G3 | Treasury Board of Canada Secretariat, Government of Canada's direct greenhouse gas emissions: Methodology, July 6, 2026 | Corporate-style organizational accounting, NIR factor sourcing, GWP, location/market methods | [Official methodology](https://www.canada.ca/en/treasury-board-secretariat/services/innovation/greening-government/results-reporting/government-canada-direct-greenhouse-gas-emissions-introduction/methodology.html). Read directly. |

No blog/vendor/AI summary was used as numerical authority. Database source names such as DEFRA, EPA and Environment Canada do not independently establish provenance.

## 4. Database inventory summary

| Registry | Rows | Observations |
| --- | ---: | --- |
| ConversionFactor | 23 | 13 system defaults; 10 organization-scoped records (including demo and synthetic); see complete records below. |
| Factor | 30 | Every identity has at least one version; identities are not additional independent numerical factors. |
| FactorVersion | 34 | All DRAFT / DEMO / verified=false; every effectiveFrom/effectiveTo is null. |
| FactorSource | 30 | All active; 1 official, 29 non-official. The official source has no versions. Several sourceYear=0 entries. |
| Total | 117 | 57 numeric records; 50 meaningful candidate groups; 7 duplicate pairs under the stated key. |

All 57 numeric rows lack effective dates. Source years and factor years are retained separately. SourceVersion lives on FactorSource for governed rows; the legacy natural-gas entry carries sourceVersion in methodologyProvenance. A missing field is not fabricated from a name. Scope is inherited only when represented on Factor; legacy factors do not acquire a scope merely because the activity usually suggests one.

Grouping key: registry, activity, represented scope, audit input unit, value, result unit, country, province, factorYear, sourceYear, authority, source document/version, methodology/provenance, applicability/basis, verified/status, tenant, system-default flag, confidence. IDs, creation/update timestamps and source IDs are retained in Appendix B, but are not themselves distinct methodologies. Registry remains in the key because governed and legacy paths have different eligibility. This is semantic grouping, not a claim of byte-identical records. There are no byte-identical complete rows including unique IDs.

Master table: one row per meaningful group. Complete current metadata and categories for every member are in Appendix B. For rows with numerical official comparators, these are **context-limited reference comparisons**, not authorization to replace data. Fuel conditional comparisons appear once in sections 8–9 rather than falsely assigning one universal fuel method to every tenant/version.

| Activity | Current Value | Unit | Current Source | Current Year | Jurisdiction | Current Methodology | Official Reference Value | Official Unit | Official Year | Official Source | Official Methodology | Numerical Difference | Percent Difference | Correct for CarbonLite corporate use? | Risk | Recommended Action | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M01 ELECTRICITY | 0.53 | kWh → kgCO2e | CarbonLite System Defaults / CarbonLite Default Factor Library v1.0 | factor UNKNOWN; source 2025 | Canada / Province Required | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; TEST_ONLY | P1; TEST_ONLY | Exclude from customer calculation; review replacement | DB; K1; section 16; `2938cdd2-b746-4381-b5c6-404a2dbd5cb8` |
| M02 AIR_TRAVEL | 0.115 | km → kgCO2e | CarbonLite System Defaults / CarbonLite Default Factor Library v1.0 | factor UNKNOWN; source 2025 | Canada / Canada (Generic) | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; REPLACE_CANDIDATE | P0; REPLACE_CANDIDATE | Exclude from customer calculation; review replacement | DB; K1; sections 6-10,12,16; `3a4fa79f-ee3a-4e48-9ac1-6469f7b2aaad` |
| M03 GASOLINE | 2.31 | L → kgCO2e | CarbonLite System Defaults / CarbonLite Default Factor Library v1.0 | factor UNKNOWN; source 2025 | Canada / Canada (Generic) | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; REPLACE_CANDIDATE | P0; REPLACE_CANDIDATE | Exclude from customer calculation; review replacement | DB; K1; sections 6-10,12,16; `72960476-10cf-41e4-9aa3-1e02bde56616` |
| M04 HOTEL | 15 | night → kgCO2e | CarbonLite System Defaults / CarbonLite Default Factor Library v1.0 | factor UNKNOWN; source 2025 | Canada / Canada (Generic) | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; REPLACE_CANDIDATE | P0; REPLACE_CANDIDATE | Exclude from customer calculation; review replacement | DB; K1; sections 6-10,12,16; `b1a8e266-367e-4c21-b64a-58e225750f17` |
| M05 NATURAL_GAS | 1.89 | m3 → kgCO2e | CarbonLite System Defaults / CarbonLite Default Factor Library v1.0 | factor UNKNOWN; source 2025 | Canada / Canada (Generic) | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; REPLACE_CANDIDATE | P0; REPLACE_CANDIDATE | Exclude from customer calculation; review replacement | DB; K1; sections 6-10,12,16; `babbf252-1188-48e2-a8ea-6da4609c0971` |
| M06 SHIPPING | 0.09 | ton-km → kgCO2e | CarbonLite System Defaults / CarbonLite Default Factor Library v1.0 | factor UNKNOWN; source 2025 | Canada / Canada (Generic) | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; REPLACE_CANDIDATE | P0; REPLACE_CANDIDATE | Exclude from customer calculation; review replacement | DB; K1; sections 6-10,12,16; `c594dc4f-d8a6-40e7-8bcd-d78ae1008e17` |
| M07 DIESEL | 2.68 | L → kgCO2e | UNKNOWN / UNKNOWN | factor UNKNOWN; source UNKNOWN | UNKNOWN / UNKNOWN | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; TEST_ONLY | P1; TEST_ONLY | Exclude from customer calculation; review replacement | DB; K1; section 16; `cmnry4rfn0001gd4z7tk6wkz6` |
| M08 GASOLINE | 2.31 | L → kgCO2e | UNKNOWN / UNKNOWN | factor UNKNOWN; source UNKNOWN | UNKNOWN / UNKNOWN | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; TEST_ONLY | P1; TEST_ONLY | Exclude from customer calculation; review replacement | DB; K1; section 16; `cmp1a8dp9001hgdi22fdru95n` |
| M09 NATURAL_GAS | 1.89 | m3 → kgCO2e | UNKNOWN / UNKNOWN | factor UNKNOWN; source UNKNOWN | UNKNOWN / UNKNOWN | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; TEST_ONLY | P1; TEST_ONLY | Exclude from customer calculation; review replacement | DB; K1; section 16; `cmp1a9tez001jgdi2xyp2gkxr` |
| M10 ELECTRICITY | 0.53 | kWh → kgCO2e | UNKNOWN / UNKNOWN | factor UNKNOWN; source UNKNOWN | UNKNOWN / UNKNOWN | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; TEST_ONLY | P1; TEST_ONLY | Exclude from customer calculation; review replacement | DB; K1; section 16; `cmp1ab2ki001lgdi2t5myivq1` |
| M11 AIR_TRAVEL | 0.115 | km → kgCO2e | UNKNOWN / UNKNOWN | factor UNKNOWN; source UNKNOWN | UNKNOWN / UNKNOWN | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; TEST_ONLY | P1; TEST_ONLY | Exclude from customer calculation; review replacement | DB; K1; section 16; `cmp1tgke20001gd490ymvo5s7` |
| M12 HOTEL | 15 | night → kgCO2e | UNKNOWN / UNKNOWN | factor UNKNOWN; source UNKNOWN | UNKNOWN / UNKNOWN | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; TEST_ONLY | P1; TEST_ONLY | Exclude from customer calculation; review replacement | DB; K1; section 16; `cmp27hbxz0001gdk3t00xkbf3` |
| M13 SHIPPING | 0.09 | ton-km → kgCO2e | UNKNOWN / UNKNOWN | factor UNKNOWN; source UNKNOWN | UNKNOWN / UNKNOWN | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; TEST_ONLY | P1; TEST_ONLY | Exclude from customer calculation; review replacement | DB; K1; section 16; `cmp27j18f0003gdk3je4govck` |
| M14 WATER | 0 | m3 → kgCO2e | CarbonLite Pilot Methodology / Water Emissions Placeholder Factor | factor UNKNOWN; source 2025 | Canada / Canada (Generic) | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; PASS_WITH_LIMITATION | P2; PASS_WITH_LIMITATION | Keep tracked-only; review dormant metadata | K1; DB; section 11; `cmqzqzf00000hgdlt58ufnc61` |
| M15 ELECTRICITY | 0.53 | kWh → kgCO2e | CarbonLite System Defaults / CarbonLite Default Factor Library v1.0 | factor UNKNOWN; source 2025 | Canada / Alberta | Demo/legacy; original UNKNOWN | 0.438 | kg CO2e/kWh | 2026 offset applicability | E2 Table 5.3 | Federal offset consumption | 0.092 | 21.005% | NOT APPROVED; TEST_ONLY | P1; TEST_ONLY | Exclude from customer calculation; review replacement | DB; K1; section 16; `cmr75gv6l0007gdjbs0bz4d3j` |
| M16 ELECTRICITY | 0.02 | kWh → kgCO2e | CarbonLite System Defaults / CarbonLite Default Factor Library v1.0 | factor UNKNOWN; source 2025 | Canada / British Columbia | Demo/legacy; original UNKNOWN | 0.018 | kg CO2e/kWh | 2026 offset applicability | E2 Table 5.3 | Federal offset consumption | 0.002 | 11.111% | NOT APPROVED; TEST_ONLY | P1; TEST_ONLY | Exclude from customer calculation; review replacement | DB; K1; section 16; `cmr75gvl7000bgdjbiw703b7y` |
| M17 ELECTRICITY | 0.12 | kWh → kgCO2e | CarbonLite System Defaults / CarbonLite Default Factor Library v1.0 | factor UNKNOWN; source 2025 | Canada / Ontario | Demo/legacy; original UNKNOWN | 0.059 | kg CO2e/kWh | 2026 offset applicability | E2 Table 5.3 | Federal offset consumption | 0.061 | 103.390% | NOT APPROVED; TEST_ONLY | P1; TEST_ONLY | Exclude from customer calculation; review replacement | DB; K1; section 16; `cmr75gvxj000fgdjbgis72awy` |
| M18 DIESEL | 999 | L → g CO2 | Synthetic RC test / Synthetic fixture, not an official factor | factor UNKNOWN; source UNKNOWN | UNKNOWN / UNKNOWN | SYNTHETIC_TEST | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; TEST_ONLY | P2; TEST_ONLY | Exclude from customer calculation; review replacement | K1; K2; DB; section 16; `cmvcnwowa009ogdhwljpjodax` |
| M19 DIESEL | 2.68 | L → kgCO2e | Synthetic test only / RC isolated history test | factor UNKNOWN; source 2026 | Canada / Alberta | SYNTHETIC_TEST | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; TEST_ONLY | P0; TEST_ONLY | Exclude from customer calculation; review replacement | K1; K2; DB; section 16; `cmvcwh23y00fmgdhwr0lzoz3a` |
| M20 DIESEL | 2.68 | L → kgCO2e | Synthetic RC fixture / Historical immutability fixture | factor UNKNOWN; source 2025 | Canada / Alberta | SYNTHETIC_TEST | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; TEST_ONLY | P0; TEST_ONLY | Exclude from customer calculation; review replacement | K1; K2; DB; section 16; `cmvd3jvgj005agd82349bllfy` |
| M21 DIESEL | 2.68 | L → kgCO2e | CarbonLite System Defaults / CarbonLite Default Factor Library v1.0 | factor UNKNOWN; source 2025 | Canada / Canada (Generic) | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; REPLACE_CANDIDATE | P0; REPLACE_CANDIDATE | Exclude from customer calculation; review replacement | DB; K1; sections 6-10,12,16; `d84e66a7-c94c-4458-bc33-5331519a9bb5` |
| M22 NATURAL_GAS | 49.44 | GJ → kgCO2e | Environment and Climate Change Canada / Greenhouse gas and air pollutant emissions projections – 2025 | factor UNKNOWN; source 2025 | Canada / Canada | DB corporate declaration; ECCC approximate projection | 49.44 | kg CO2e/GJ | 2025 publication | E3 Table A8 | Approximate projections | 0 | 0% (source agreement only) | NOT APPROVED; PASS_WITH_LIMITATION | P1; PASS_WITH_LIMITATION | Retain source value only as a disclosed estimate pending basis review | E3; K1; DB; `eccc-natural-gas-canada-generic-gj-2025` |
| M23 GROUND_TRANSPORT | 0.2 | km → kgCO2e | CarbonLite / CarbonLite Pilot Ground Transport Estimate 2025 | factor UNKNOWN; source 2025 | Canada / Canada - National | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; REPLACE_CANDIDATE | P0; REPLACE_CANDIDATE | Exclude from customer calculation; review replacement | DB; K1; sections 6-10,12,16; `pilot-ground-transport-canada-2025` |
| M24 DIESEL | 2.68 | L → kgCO2e | CarbonLite System Defaults / CarbonLite Default Factor Library v1.0 | factor 2025; source 2025 | Canada / Canada (Generic) | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; TEST_ONLY | P1; TEST_ONLY | Exclude from customer calculation; review replacement | DB; K1; section 16; `cmqzqzbba0001gdltz15zr6fj`, `cmr75gudi0001gdjb6zeliz8z` |
| M25 GASOLINE | 2.31 | L → kgCO2e | CarbonLite System Defaults / CarbonLite Default Factor Library v1.0 | factor 2025; source 2025 | Canada / Canada (Generic) | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; TEST_ONLY | P1; TEST_ONLY | Exclude from customer calculation; review replacement | DB; K1; section 16; `cmqzqzbwt0003gdltz5mch3pt`, `cmr75gurs0003gdjbw3dg3r6g` |
| M26 NATURAL_GAS | 1.89 | m3 → kgCO2e | CarbonLite System Defaults / CarbonLite Default Factor Library v1.0 | factor 2025; source 2025 | Canada / Canada (Generic) | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; TEST_ONLY | P1; TEST_ONLY | Exclude from customer calculation; review replacement | DB; K1; section 16; `cmqzqzcf40005gdltachk8elz`, `cmr75gv2j0005gdjbkrx1342n` |
| M27 ELECTRICITY | 0.02 | kWh → kgCO2e | CarbonLite System Defaults / CarbonLite Default Factor Library v1.0 | factor 2025; source 2025 | Canada / Province Required | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; TEST_ONLY | P1; TEST_ONLY | Exclude from customer calculation; review replacement | DB; K1; section 16; `cmqzqzcwf0007gdlttkgsf9u7` |
| M28 AIR_TRAVEL | 0.115 | km → kgCO2e | CarbonLite System Defaults / CarbonLite Default Factor Library v1.0 | factor 2025; source 2025 | Canada / Canada (Generic) | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; TEST_ONLY | P1; TEST_ONLY | Exclude from customer calculation; review replacement | DB; K1; section 16; `cmqzqzde80009gdlty02lj493`, `cmr75gwdq000jgdjbr50tve1l` |
| M29 HOTEL | 15 | night → kgCO2e | CarbonLite System Defaults / CarbonLite Default Factor Library v1.0 | factor 2025; source 2025 | Canada / Canada (Generic) | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; TEST_ONLY | P1; TEST_ONLY | Exclude from customer calculation; review replacement | DB; K1; section 16; `cmqzqzdu7000bgdltsshetyei`, `cmr75gwok000lgdjbcqs43scq` |
| M30 SHIPPING | 0.09 | ton-km → kgCO2e | CarbonLite System Defaults / CarbonLite Default Factor Library v1.0 | factor 2025; source 2025 | Canada / Canada (Generic) | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; TEST_ONLY | P1; TEST_ONLY | Exclude from customer calculation; review replacement | DB; K1; section 16; `cmqzqzebn000dgdltsb3lc5x4`, `cmr75gwz9000ngdjbf438bcx9` |
| M31 WATER | 0 | m3 → kgCO2e | CarbonLite Pilot Methodology / Water Emissions Placeholder Factor | factor 2025; source 2025 | Canada / Canada (Generic) | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; PASS_WITH_LIMITATION | P2; PASS_WITH_LIMITATION | Keep tracked-only; review dormant metadata | K1; DB; section 11; `cmqzqzfdk000jgdltbtf1fwz5`, `cmr75gx8w000pgdjb2ztwpnpx` |
| M32 ELECTRICITY | 0.53 | kWh → kgCO2e | CarbonLite System Defaults / CarbonLite Default Factor Library v1.0 | factor 2025; source 2025 | Canada / Alberta | Demo/legacy; original UNKNOWN | 0.438 | kg CO2e/kWh | 2026 offset applicability | E2 Table 5.3 | Federal offset consumption | 0.092 | 21.005% | NOT APPROVED; REPLACE_CANDIDATE | P0; REPLACE_CANDIDATE | Exclude from customer calculation; review replacement | DB; K1; sections 6-10,12,16; `cmr75gvgt0009gdjbmhpv7zdd` |
| M33 ELECTRICITY | 0.02 | kWh → kgCO2e | CarbonLite System Defaults / CarbonLite Default Factor Library v1.0 | factor 2025; source 2025 | Canada / British Columbia | Demo/legacy; original UNKNOWN | 0.018 | kg CO2e/kWh | 2026 offset applicability | E2 Table 5.3 | Federal offset consumption | 0.002 | 11.111% | NOT APPROVED; TEST_ONLY | P1; TEST_ONLY | Exclude from customer calculation; review replacement | DB; K1; section 16; `cmr75gvtr000dgdjb9a5pu2vf` |
| M34 ELECTRICITY | 0.12 | kWh → kgCO2e | CarbonLite System Defaults / CarbonLite Default Factor Library v1.0 | factor 2025; source 2025 | Canada / Ontario | Demo/legacy; original UNKNOWN | 0.059 | kg CO2e/kWh | 2026 offset applicability | E2 Table 5.3 | Federal offset consumption | 0.061 | 103.390% | NOT APPROVED; TEST_ONLY | P1; TEST_ONLY | Exclude from customer calculation; review replacement | DB; K1; section 16; `cmr75gw3g000hgdjbkp93dtvt` |
| M35 GROUND_TRANSPORT | 0.2 | km → kgCO2e | CarbonLite / CarbonLite Pilot Ground Transport Estimate 2025 | factor 2025; source 2025 | Canada / Canada - National | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; TEST_ONLY | P1; TEST_ONLY | Exclude from customer calculation; review replacement | DB; K1; section 16; `cmrw89g75000hgdyd4g30s8bm` |
| M36 WATER | 0.35 | m3 → kgCO2e | CarbonLite Pilot Methodology / Water Emissions Placeholder Factor | factor 2026; source 2026 | UNKNOWN / UNKNOWN | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; REVIEW | P2; REVIEW | Keep tracked-only; review dormant metadata | K1; DB; section 11; `factor_version_41eba184d6c179b71942506a65b4bc90` |
| M37 AIR_TRAVEL | 0.115 | km → kgCO2e | CarbonLite System Defaults / CarbonLite Default Factor Library v1.0 | factor UNKNOWN; source 2025 | UNKNOWN / UNKNOWN | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; TEST_ONLY | P1; TEST_ONLY | Exclude from customer calculation; review replacement | DB; K1; section 16; `factor_version_456d27103da9d2d8701a84760d27216a` |
| M38 HOTEL | 15 | night → kgCO2e | DEFRA / hotel-factor-2025 | factor UNKNOWN; source 0 | UNKNOWN / UNKNOWN | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; TEST_ONLY | P1; TEST_ONLY | Exclude from customer calculation; review replacement | DB; K1; section 16; `factor_version_4f56b437b9e87bcceaf38f1b843bb1cc` |
| M39 SHIPPING | 0.09 | ton-km → kgCO2e | EPA / freight-factor-2025 | factor UNKNOWN; source 0 | UNKNOWN / UNKNOWN | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; TEST_ONLY | P1; TEST_ONLY | Exclude from customer calculation; review replacement | DB; K1; section 16; `factor_version_54423760a3fec03379308e80ab056961` |
| M40 ELECTRICITY | 0.53 | kWh → kgCO2e | CarbonLite System Defaults / CarbonLite Default Factor Library v1.0 | factor 2025; source 2025 | Canada / Province Required | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; TEST_ONLY | P1; TEST_ONLY | Exclude from customer calculation; review replacement | DB; K1; section 16; `factor_version_6539de3878db6487936afc87baac2162` |
| M41 SHIPPING | 0.09 | ton-km → kgCO2e | CarbonLite System Defaults / CarbonLite Default Factor Library v1.0 | factor UNKNOWN; source 2025 | UNKNOWN / UNKNOWN | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; TEST_ONLY | P1; TEST_ONLY | Exclude from customer calculation; review replacement | DB; K1; section 16; `factor_version_79e1eb87a31b617a89402b9fa6c03e36` |
| M42 ELECTRICITY | 0.53 | kWh → kgCO2e | Alberta Grid Factor / alberta-grid-2025 | factor UNKNOWN; source 0 | UNKNOWN / UNKNOWN | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; TEST_ONLY | P1; TEST_ONLY | Exclude from customer calculation; review replacement | DB; K1; section 16; `factor_version_7d557bb25c4190b4f005bc4bc7c90fa4` |
| M43 GASOLINE | 2.31 | L → kgCO2e | Environment Canada / gasoline-standard-2025 | factor UNKNOWN; source 0 | UNKNOWN / UNKNOWN | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; TEST_ONLY | P1; TEST_ONLY | Exclude from customer calculation; review replacement | DB; K1; section 16; `factor_version_83ff331ba2fe8cfb05cb0727bdfd3c55` |
| M44 NATURAL_GAS | 1.89 | m3 → kgCO2e | CarbonLite System Defaults / CarbonLite Default Factor Library v1.0 | factor UNKNOWN; source 2025 | UNKNOWN / UNKNOWN | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; TEST_ONLY | P1; TEST_ONLY | Exclude from customer calculation; review replacement | DB; K1; section 16; `factor_version_865088c36de4afb626950e42928af21f` |
| M45 DIESEL | 2.68 | L → kgCO2e | Manual test factor / diesel-standard-2025 | factor UNKNOWN; source 0 | UNKNOWN / UNKNOWN | SYNTHETIC_TEST | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; TEST_ONLY | P2; TEST_ONLY | Exclude from customer calculation; review replacement | K1; K2; DB; section 16; `factor_version_94e43c1a90bff4ebf7a8d03fef362510` |
| M46 DIESEL | 2.68 | L → kgCO2e | CarbonLite System Defaults / CarbonLite Default Factor Library v1.0 | factor UNKNOWN; source 2025 | UNKNOWN / UNKNOWN | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; TEST_ONLY | P1; TEST_ONLY | Exclude from customer calculation; review replacement | DB; K1; section 16; `factor_version_ab681278627dfc51882aa3ee936d3017` |
| M47 HOTEL | 15 | night → kgCO2e | CarbonLite System Defaults / CarbonLite Default Factor Library v1.0 | factor UNKNOWN; source 2025 | UNKNOWN / UNKNOWN | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; TEST_ONLY | P1; TEST_ONLY | Exclude from customer calculation; review replacement | DB; K1; section 16; `factor_version_c75bdf165fbfb398e0fe2446f47450e9` |
| M48 NATURAL_GAS | 1.89 | m3 → kgCO2e | Environment Canada / natural-gas-standard-2025 | factor UNKNOWN; source 0 | UNKNOWN / UNKNOWN | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; TEST_ONLY | P1; TEST_ONLY | Exclude from customer calculation; review replacement | DB; K1; section 16; `factor_version_d4ef855af7ae2af1731b9618677e3a8b` |
| M49 GASOLINE | 2.31 | L → kgCO2e | CarbonLite System Defaults / CarbonLite Default Factor Library v1.0 | factor UNKNOWN; source 2025 | UNKNOWN / UNKNOWN | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; TEST_ONLY | P1; TEST_ONLY | Exclude from customer calculation; review replacement | DB; K1; section 16; `factor_version_dc505ba9628140a8887f4c0f37ee31de` |
| M50 AIR_TRAVEL | 0.115 | km → kgCO2e | DEFRA / flight-factor-2025 | factor UNKNOWN; source 0 | UNKNOWN / UNKNOWN | Demo/legacy; original UNKNOWN | NOT DETERMINED | — | — | — | — | NOT DETERMINED | NOT DETERMINED | NOT APPROVED; TEST_ONLY | P1; TEST_ONLY | Exclude from customer calculation; review replacement | DB; K1; section 16; `factor_version_e613689a131a714ca9dfa79a7097fdfe` |

## 5. Runtime factor-selection architecture

Both ConversionFactor and FactorVersion are authoritative at different stages. FactorSource records supply provenance; an official source row does not upgrade a version automatically. Factor is an identity/activity container. The server snapshot write path loads tenant-owned or system-default legacy records and active Factor identities with versions excluding ARCHIVED/DEPRECATED, then calls CalculationQualityService (K1).

Server selection precedence is:

1. Eligible, verified organization-specific legacy exact-region match.
2. Eligible governed exact province/year; then permitted country/year.
3. Governed latest prior year; then nearest available year (can include future or null-year proxies).
4. Verified system legacy exact region; then permitted country fallback.
5. Unverified system legacy exact region; then permitted country fallback.
6. Additional demo fallback when enabled.

The governed candidate filter admits VERIFIED/OFFICIAL, demo versions when allowed, **and any active system electricity DEMO version through isPilotElectricitySystemFactor even when demo=false**. That exception is central to the Alberta finding. In the legacy system-default branches, non-electricity estimate/demo factors are not excluded by a general demo policy. The literal `VERIFIED_SYSTEM` priority label is also returned for some unverified matches; it is not evidence of review (K1).

Explicit non-corporate applicability, explicit gas components and restricted sector provenance are rejected by isInventoryFactorEligible. Null applicability/emissionBasis preserve legacy eligibility. Result units explicitly identifying CO2/CH4/N2O components are rejected, but no registry-wide source-quality or GWP validation proves that a factor labelled kgCO2e is really complete CO2e (K1).

Jurisdiction resolution: row context, then facility, then source-text inference, then organization. A country-only earlier context can suppress a later province. Electricity requires exact province; selected non-electricity activities allow country fallback. SourceYear is used as a legacy factor-year proxy. Governed factorYear is explicit. EffectiveFrom/To are stored but not checked in the canonical matchFactor path. Verified=false is not a universal exclusion; official status does not necessarily require the same gate as a separate admin production-readiness check. Source active status is checked for governed candidates; official authority alone is not a selection gate.

Units: L/liters aliases normalize together; canonical backend evaluation adds kWh/MWh multipliers, not diesel mass-to-volume or generic GJ/m3 conversion. It multiplies quantity by the selected value and labels the result kgCO2e; it does not decompose gases or apply a GWP multiplier (K1). Existing inventory factors use kgCO2e except the deliberately blocked g CO2 fixture. A future tonne-valued factor needs explicit result-unit handling and review.

There are important path differences: getApplicableFactor requires equal normalized units, treats legacy source-year filtering differently and lacks the canonical electricity DEMO exception in its governed filter. Frontend matching has its own ranking, year proxies, governance checks and explicit placeholder flags. No factor-selection unification was attempted. Reports primarily project persisted server snapshots; factor-library updates do not automatically repair previously stored reports (K1/K2).

Tie behavior: governed ranking uses status, confidence and updatedAt, without final unique-ID ordering. Legacy matching uses source-year sorting layered on DB ordering; full ties can depend on unspecified DB order. The snapshot consistently chooses the recorded matches below, but there is no complete global deterministic tie policy. Date/province/year requirements are necessary but do not establish scientific method applicability.

## 6. Alberta Electricity

**Disposition: REPLACE_CANDIDATE; P0; original scientific methodology UNKNOWN.** The selected 0.53 record is `cmr75gvgt0009gdjbmhpv7zdd`, factorYear 2025, source CarbonLite Default Factor Library v1.0, status DRAFT, confidence DEMO. Its legacy counterpart is `cmr75gv6l0007gdjbs0bz4d3j`. Separate Province Required / jurisdiction-null records also contain 0.53; an older Province Required governed row contains 0.02. Full inventory includes BC 0.02 and Ontario 0.12, not only Alberta.

The most direct provenance for 0.53 is **CarbonLite's own demo seed/migration**, with an explicit instruction to replace before client reporting (DB; K3). No inspected record cites an official Alberta table containing exactly 0.53 with a defensible vintage. `alberta-grid-2025` is only a bare source label with sourceYear=0 and no URL. It is **not established** that 0.53 is an EGDF, old consumption factor, generation average, marginal factor or TIER benchmark. Numerical proximity cannot establish origin.

E2 Table 5.3 explicitly assigns Alberta **438 g CO2e/kWh** to 2026 offset reductions; footnote 40 attributes the values to the 2025 NIR, historical data through 2023. Table 5.4 instead shows **346**, tied to the 2026 NIR and subsequent offset applicability. Its heading repeats 2026 while the surrounding applicability text says 2027: record that editorial conflict, do not silently choose. The offset timing rule is specific to that system. [E2](https://www.canada.ca/en/environment-climate-change/services/climate-change/pricing-pollution-how-it-will-work/output-based-pricing-system/federal-greenhouse-gas-offset-system/emission-factors-reference-values.html)

A1 Table 1 p6 lists 2026 EGDF **0.4303 tCO2e/MWh** for renewable displacement and **0.4588** with line losses. The 2025 values are 0.4602 and 0.4907; a project's applicable schedule depends on initiation/vintage rules. A2 pp4–6 defines a marginal-generation method combining operating/build margins, with the 2023-effective base factor 0.52 and loss-adjusted 0.55. These offset values and a TIER performance benchmark measure different things from purchased-electricity inventory emissions. [A1](https://open.alberta.ca/dataset/f2109d83-2153-4481-a8b8-b00178e53999/resource/31c9bf4d-d96e-43e8-afc9-a05574a5ca68/download/epa-carbon-offset-emission-factors-handbook-v3-3-2026-08.pdf), [A2](https://open.alberta.ca/dataset/47299476-8943-4c8b-9205-432f1102d847/resource/667e1950-9ea2-4c84-8f9a-088451b7e937/download/aep-methodology-for-the-electricity-grid-displacement-factor.pdf)

**Recommendation for a normal Alberta SMB's 2026 location-based Scope 2:** use an ECCC NIR provincial grid-average factor representing electricity serving the load, with a documented historical data-year proxy when same-year data are unavailable. Confirm generation/consumption boundaries, imports/exports, and treatment of T&D losses before finalizing the numeric default. GHG Protocol excludes marginal factors for this method; TBS provides Canadian organizational-accounting precedent for NIR sourcing. Do not import the offset system's mandatory one-year timing rule as a corporate rule. **438 is a verified official offset comparator, not an automatically approved corporate 2026 default.** The newer NIR-derived 346 comparator also requires full-table/boundary review; the complete 2026 NIR PDF was not retrievable here. Actual full-year 2026 grid intensity cannot be observed on September 30, 2026. [G1](https://ghgprotocol.org/sites/default/files/2023-03/Scope%202%20Guidance.pdf), [G3](https://www.canada.ca/en/treasury-board-secretariat/services/innovation/greening-government/results-reporting/government-canada-direct-greenhouse-gas-emissions-introduction/methodology.html)

## 7. Natural Gas

**49.44/GJ: REVIEW; PASS_WITH_LIMITATION only for numerical source agreement; P1.** Exact DB ID: `eccc-natural-gas-canada-generic-gj-2025`. It is legacy, Canada-generic, sourceYear 2025, verified=false, INTERNAL_REVIEW_REQUIRED, CORPORATE_INVENTORY / DIRECT_CO2E by internal declaration. Provenance says ENERGY_HHV and ECCC_EPR_2025_TABLE_A8. It has no governed FactorVersion counterpart in this snapshot (DB).

E3 Table A8 publishes **49.44 g CO2e/MJ**, mathematically equal to **49.44 kg CO2e/GJ**. Its context is projections modeling, and the accompanying text describes approximate factors varying by year, sector and province. The table does not expose a CH4/N2O breakdown or establish a facility-specific gas composition, a particular combustion technology, an activity-year validity window, or an explicit HHV statement alongside that row. The report discusses an AR5 transition, but that does not prove the exact gas weighting of this row. [E3, Annex A1.3.5 Table A8 and A1.9.3](https://www.canada.ca/en/environment-climate-change/services/climate-change/greenhouse-gas-emissions/projections/2025-report.html)

Therefore its published gas label is CO2e, not a demonstrably CO2-only factor, but incorporation and allocation of each gas are **NOT DETERMINED at factor-component level**. CarbonLite must not apply a second GWP to this aggregate. The DB HHV assertion needs source-specific substantiation or an explicitly reviewed estimation policy. Report-year 2025 is not proof of exclusive 2025 activity applicability, and no source-imposed expiry was established. It can be a transparent provisional Canadian estimate, not Alberta-specific or compliance-certified.

A distinct volume-based method exists: A1 Table 5 supplies Alberta marketable gas CO2 1,962 g/m3; commercial/institutional CH4 0.037 and N2O 0.035 g/m3. Combining these with G2 AR5 gives **1.972311 kg CO2e/m3**, conditional on that combustion sector and the referenced volume basis. CarbonLite's legacy 1.89/m3 is 0.082311 lower, **4.173% below** that comparator. It is not automatically the factor for power generation, pipelines or unprocessed producer gas. [A1 Table 5 p8](https://open.alberta.ca/dataset/f2109d83-2153-4481-a8b8-b00178e53999/resource/31c9bf4d-d96e-43e8-afc9-a05574a5ca68/download/epa-carbon-offset-emission-factors-handbook-v3-3-2026-08.pdf), [G2](https://www.canada.ca/en/environment-climate-change/services/climate-change/greenhouse-gas-emissions/quantification-guidance/global-warming-potentials.html)

AQM A3 permits appropriate energy-based methods but requires HHV-consistent quantities. Chapter 15 Methods 15-6 and 15-9/10 distinguish measured HHV, sector and equipment; Appendix C.4 defines **15°C and 101.325 kPa absolute** for standard volumes. A measured standard m3 amount is needed for a per-m3 method; a supplied HHV-consistent GJ amount can support a permitted energy method without first inventing m3. Where conversion is required, use measured/supplied compatible HHV and the method's conditions, not a generic density or thermal constant. 15°C is a volume reference condition, not a temperature adjustment applied directly to a billed GJ amount. No GJ→m3 or facility recalculation was performed. [A3 Ch1; Ch15 pp15-7–15-10; Appendix C.4](https://open.alberta.ca/dataset/5d79b86b-7811-413f-88d8-acd36cb9d6d2/resource/29984c25-29bc-46cd-83fb-1f54fb3e2f5c/download/epa-alberta-greenhouse-gas-quantification-methodologies-version-2-3-2023-09.pdf)

## 8. Gasoline

**Disposition: REPLACE_CANDIDATE; P0 for selectable demo defaults.** Current 2.31 kgCO2e/L occurs in a system legacy row, a demo-org row and several DRAFT versions. Unit `liters` equals L for this comparison. Original published scientific provenance is not established (DB; K3).

A1 Table 6 uses Alberta-blended gasoline components **2,174 g CO2/L, 0.100 g CH4/L, 0.020 g N2O/L**. The reference reflects Alberta renewable-fuel treatment, not a generic pure-fossil or vehicle-fleet universal factor. [A1 Table 6 p9](https://open.alberta.ca/dataset/f2109d83-2153-4481-a8b8-b00178e53999/resource/31c9bf4d-d96e-43e8-afc9-a05574a5ca68/download/epa-carbon-offset-emission-factors-handbook-v3-3-2026-08.pdf)

A3 Tables 15-3/15-4 distinguish **2.307 kg CO2/L generic** from **2.174 Alberta**, and give 0.100/0.020 g CH4/N2O per L for this stationary aggregate-facility context. It separately addresses biogenic CO2 and known blend composition. Chapter 15 is not an SMB corporate or on-road fleet specification. [A3 pp15-7 and 15-9](https://open.alberta.ca/dataset/5d79b86b-7811-413f-88d8-acd36cb9d6d2/resource/29984c25-29bc-46cd-83fb-1f54fb3e2f5c/download/epa-alberta-greenhouse-gas-quantification-methodologies-version-2-3-2023-09.pdf)

Conditional AR5 calculations, applying CH4=28 and N2O=265 from G2:

- Generic stationary illustration: `(2307 + 0.100×28 + 0.020×265)/1000 = 2.315100 kg CO2e/L`. Current minus comparator: **−0.005100/L, −0.220293%**. For 350 L: 808.50 versus **810.285**, difference **−1.785 kg**.
- Alberta-blended stationary/offset illustration: `(2174 + 0.100×28 + 0.020×265)/1000 = 2.182100`. Current minus comparator: **+0.127900/L, +5.861326%**. For 350 L: **763.735**, current-minus-reference **+44.765 kg**.

The current 2.31 resembles rounded generic **CO2-only** 2.307 more closely than full 2.315100 CO2e, but rounding resemblance is **not proof of origin**. The pilot does not identify stationary versus mobile combustion, fleet technology, fuel blend or ownership/control. Accordingly the official-source-audited corporate result is **NOT DETERMINED** until that context is supplied. Do not select the larger/smaller illustration simply because it is closer. [G2](https://www.canada.ca/en/environment-climate-change/services/climate-change/greenhouse-gas-emissions/quantification-guidance/global-warming-potentials.html)

## 9. Diesel

**Disposition: REPLACE_CANDIDATE; P0 for selectable demo defaults.** Current 2.68 kgCO2e/L is repeated in system, demo-org, synthetic tenant and governed DRAFT rows. Its rounded proximity to CO2-only does not establish complete CO2e provenance (DB).

E2 Table 4.3's generic refinery/other illustration uses 2,681 g CO2/L, 0.078 g CH4/L, 0.022 g N2O/L. [E2 Table 4.3](https://www.canada.ca/en/environment-climate-change/services/climate-change/pricing-pollution-how-it-will-work/output-based-pricing-system/federal-greenhouse-gas-offset-system/emission-factors-reference-values.html)

A1's Alberta-blended table instead uses 2,610, 0.078 and 0.020 g/L. A3's stationary generic method uses 2.681 kg CO2/L and 0.078/0.020 g CH4/N2O/L. The 0.022 versus 0.020 N2O difference is an actual source/method distinction retained here. [A1 Table 6 p9](https://open.alberta.ca/dataset/f2109d83-2153-4481-a8b8-b00178e53999/resource/31c9bf4d-d96e-43e8-afc9-a05574a5ca68/download/epa-carbon-offset-emission-factors-handbook-v3-3-2026-08.pdf), [A3 Tables 15-3/15-4](https://open.alberta.ca/dataset/5d79b86b-7811-413f-88d8-acd36cb9d6d2/resource/29984c25-29bc-46cd-83fb-1f54fb3e2f5c/download/epa-alberta-greenhouse-gas-quantification-methodologies-version-2-3-2023-09.pdf)

AR5 calculations are conditional, not replacements:

| Method context | CO2 kg/L | CH4 g/L | N2O g/L | Calculated kg CO2e/L | Current minus reference | Percent |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| E2 generic reference | 2.681 | 0.078 | 0.022 | 2.689014 | −0.009014 | −0.335216% |
| A3 generic stationary | 2.681 | 0.078 | 0.020 | 2.688484 | −0.008484 | −0.315568% |
| A1/A3 Alberta blend | 2.610 | 0.078 | 0.020 | 2.617484 | +0.062516 | +2.388400% |

Each CO2e column is `CO2 + CH4×28/1000 + N2O×265/1000`. Biomass CO2 reporting and actual blend treatment require the chosen method; lifecycle fuel-production emissions must not be silently added to direct combustion. No generic Canada/Alberta value is selected for an unspecified mobile fleet. [G2](https://www.canada.ca/en/environment-climate-change/services/climate-change/greenhouse-gas-emissions/quantification-guidance/global-warming-potentials.html)

The pilot's **240 kg** diesel remains blocked: no supported density/mass-volume conversion was supplied. The frontend labels this UNIT_MISMATCH; the backend pure evaluator returns MISSING_FACTOR for the same incompatible unit. Neither calculates diesel emissions. This audit does not redefine either test status or invent a litre quantity (K1/K2).

## 10. Accommodation

**Disposition: REPLACE_CANDIDATE; P0 if represented as validated customer emissions.** All accommodation entries are HOTEL at 15 kgCO2e/night. They include system legacy, demo-org and governed DRAFT/DEMO records; a source named DEFRA / hotel-factor-2025 has sourceYear=0 and an empty URL. No record supplies a hotel-specific geography/year, occupied-room versus person-night definition, data boundary or full source table (DB; Appendix B).

**NO AUTHORITATIVE ALBERTA/ECCC FACTOR FOUND** for a universal 15 kgCO2e/night in the official documents and targeted Alberta.ca/Canada.ca searches inspected. This is a search limitation, not proof that no such source could ever exist. The factor is an internal demo/test assumption. Four nights ×15 =60 is valid arithmetic only. No foreign factor is substituted as Canadian. A future estimate should use independently reviewed location/property-specific evidence with a disclosed Scope 3 boundary; supplier operational data may be more defensible than an unsupported national constant. No secondary numerical replacement was adopted.

## 11. Water / tracked-only activities

**PASS for Water exclusion from current GHG totals.** Backend policy lists WATER, WASTE and WASTE_VOLUME as tracked-only; frontend canonical evaluation explicitly handles WATER/WATER_USAGE, leaving a policy-vocabulary difference for waste (K1/K2). The snapshot has Water factors 0 and a dormant DRAFT/DEMO 0.35/m3. Having a nonzero stored factor does not activate optional water emissions: canonical evaluation short-circuits Water before factor matching. No enablement path was demonstrated in these methods despite some explanatory UI text suggesting optional reviewed factors.

Stored-state aggregate evidence: 51 Water rows have TRACKED_ONLY calculation/matching/treatment and sum **0**; one additional Water row has TRACKED_ONLY calculation/treatment and null emissions; nine have null derived states/emissions. Four WASTE rows have null states/emissions. **No nonzero calculated Water/Waste emissions were observed in the queried ActivityData fields.** A second enforced read-only query found **no joined MetricResult rows** for these tracked activities and **zero non-null calculationSnapshot fields**. Thus no contradictory metric/snapshot emissions were found in the current database; deleted or external historical exports were not inspected. Water's physical emissions are not declared zero. A zero factor and the dormant 0.35 estimate are metadata/policy-review items (P2), not a reason to change current accounting behavior.

## 12. Other activity factors

AIR_TRAVEL **0.115 kgCO2e/km**, SHIPPING **0.09 kgCO2e/ton-km** and GROUND_TRANSPORT **0.2 kgCO2e/km** are internally labelled demo/pilot estimates in the records inspected; none has authoritative checked Canadian numerical support. Bare DEFRA or EPA source names with missing URLs/years are not validated provenance. These are SCOPE_3_ESTIMATE / DEMO where the stored text supports that classification, otherwise UNKNOWN. They require technology, passenger/freight/load allocation and boundary review before reporting. A generic transport km estimate must not silently double count a fuel-based Scope 1 record (DB; K1/K2).

No propane/steam/refrigerant numeric factor exists in this snapshot. No active LIFE_CYCLE, FEDERAL_OFFSET, ALBERTA_OFFSET, TIER, GRID_AVERAGE, CONSUMPTION_INTENSITY or GRID_DISPLACEMENT classification is assigned to an existing numeric row without evidence. External reference documents are categorized independently. The EGDF seed module exists in source but its proposed factor/source/version IDs are **absent from this database snapshot**; code availability does not prove seeding.

## 13. GWP treatment

CarbonLite exposes optional gwpSource/gwpVersion metadata but the snapshot has **zero populated factor-specific GWP references**, and the canonical evaluator multiplies an aggregate factor once. There is no computational AR4/AR5/AR6 selector or separate CH4/N2O conversion in the inspected calculation path. Therefore the current library-wide assumed GWP is **UNKNOWN**, not implicitly AR5 merely because results say kgCO2e (DB; K1/K2).

ECCC's official comparison gives AR4 CH4/N2O weights 25/298 and AR5 28/265, with AR5 applying to Canadian facility reporting from 2022. The conditional calculations here explicitly use AR5; they do not claim every regulatory/offset program shares an identical GWP rule. AR6 is not established for any current CarbonLite factor. [G2](https://www.canada.ca/en/environment-climate-change/services/climate-change/greenhouse-gas-emissions/quantification-guidance/global-warming-potentials.html)

Gas-basis assessment by candidate family:

| Family | Published/stored basis evidence | GWP treatment / risk |
| --- | --- | --- |
| 49.44/GJ | E3 explicitly labels aggregate CO2e; component/GWP derivation not exposed | Embedded aggregate conversion expected; exact GWP UNKNOWN, P1 |
| 0.53 electricity; 0.02 BC; 0.12 ON | DB labels kgCO2e but original official table absent | UNKNOWN; customer-selectable P0 |
| 2.31 gasoline; 2.68 diesel; 1.89/m3 gas | DB CO2e labels; no gas breakdown, some values resemble CO2-only references | Possible undercount/mislabel; not proved CO2-only; P0/P1 by selectability |
| Hotel/air/shipping/ground estimates | CO2e labels without authoritative gas/GWP derivation | UNKNOWN, high risk for reports |
| Water 0 /0.35 | Policy bypasses calculation | No GWP applied; metadata review P2 |
| Synthetic 999 g CO2 | Explicit component and REFERENCE_ONLY | Correctly rejected for inventory; retain TEST_ONLY classification |
| Synthetic verified diesel 2.68 | No gas derivation despite verified flag | TEST_ONLY; eligible within own tenant, P0/CRITICAL |

No automatic double GWP multiplication was found. A future process that applies GWPs again to already aggregated factors would double convert; this is a design risk, not an observed current double multiplication.

## 14. Jurisdiction and year applicability

For the activity **2026-09-30**, publication date, underlying factor/data year, permitted reporting year and effective dates must remain distinct. All current effective ranges are null; a stored year label does not establish legal/scientific applicability.

| Reference | Publication | Data/factor vintage | Reporting applicability / expiry finding |
| --- | --- | --- | --- |
| E1 NIR | 2026 | Inventory through 2024 | Historical corporate proxy candidate; not measured 2026 intensity. Full table not verified. |
| E2 Table 5.3 | September 2026 document | Cites NIR 2025 through 2023 | Explicit 2026 federal-offset table. It does not impose corporate timing. |
| E2 Table 5.4 | Same document | Cites NIR 2026 through 2024 | Surrounding text says 2027; heading says 2026. Conflict preserved. |
| A1 Table 1 | August 2026 v3.3 | Annual EGDF schedule; 2026 row | New project handbook rule from Aug27; existing projects follow initiation/crediting rules, not a blanket retroactive switch. |
| A3 | September 2023 v2.3, current linked catalog edition | Method-specific defaults/measurements | Applies to covered Alberta TIER/SGRR facilities; inspect current program and facility method before use. |
| E3 Table A8 | Report-year 2025 | Approximate modeling values, no row-specific annual validity | No 2026 corporate expiry/replacement rule established; HHV/sector/gas basis remains under review. |

Electricity grid average/consumption and generation-only intensity are not identical. Consumption accounting may reflect imports/exports, losses or transmission gases; G1's Scope 2 boundary excludes upstream fuel and customer T&D-loss Scope 3. Selecting a provincial figure still requires this boundary check. Market-based accounting instead requires appropriate contractual attributes/quality criteria; no such instruments are represented by the current pilot example. [G1 Ch5, Ch6, Appendix B](https://ghgprotocol.org/sites/default/files/2023-03/Scope%202%20Guidance.pdf)

## 15. Duplicate / ambiguous factors

Seven semantic duplicate pairs occur within governed registry groups, listed in Appendix A. More broadly the same quantities exist in legacy and governed registries with different status/source/tenant metadata. These are semantic overlaps rather than interchangeable records.

| Ambiguity | Risk | Evidence / consequence |
| --- | --- | --- |
| 0.53 Alberta versus Province Required versus null jurisdiction | HIGH | Distinct contexts; province-null rows must not supply Alberta simply by name. Exact province checks block some entries. |
| Province Required 0.02 versus 0.53, same broad activity/year | HIGH | No justified province/method; both remain demo records. |
| Legacy/gov duplicate 2.68, 2.31, 1.89,15,0.115,0.09 | HIGH | Status/registry changes affect eligibility and selected identity; agreement does not validate source. |
| System/default versus tenant overrides | CRITICAL for synthetic verified rows | Verified tenant match wins before governed; own-tenant synthetic selection possible. |
| Prior-year demo electricity selected in 2026 | CRITICAL | Demonstrated with demo=false; vintage does not establish a corporate method. |
| Missing effective ranges and incomplete tie-break | HIGH | Current snapshot trace is reproducible, global exact ties lack a final ID rule. |
| Dormant Water 0 versus0.35 | LOW current numerical impact | Tracked-only short-circuit prevents calculation; latent metadata conflict remains. |
| Official source registry row without linked versions | MEDIUM | Source existence can mislead reviewers into believing demo versions are officially supported. |

No duplicate was deleted and no status promoted. Record groups retain their original IDs and source metadata.

## 16. Synthetic/test contamination

**Test/demo leakage: YES. CRITICAL / P0.** The following are results of in-memory execution of existing backend code against the complete snapshot. The synthetic organization ID `audit-normal-customer` was never created in the DB; only system-default legacy rows and global governed rows were supplied, exactly reproducing query visibility. Organization policy was false. Scope was Canada/Alberta, year 2026.

| Activity | Unit | Quantity | Selected record | Factor | Status | Emissions kgCO2e | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ELECTRICITY | kWh | 980 | cmr75gvgt0009gdjbmhpv7zdd | 0.53 | CALCULATED | 519.4 | GOVERNED_PRIOR_YEAR |
| NATURAL_GAS | GJ | 8.5 | eccc-natural-gas-canada-generic-gj-2025 | 49.44 | CALCULATED | 420.24 | VERIFIED_SYSTEM |
| NATURAL_GAS | m3 | 1 | babbf252-1188-48e2-a8ea-6da4609c0971 | 1.89 | CALCULATED | 1.89 | VERIFIED_SYSTEM |
| GASOLINE | L | 350 | 72960476-10cf-41e4-9aa3-1e02bde56616 | 2.31 | CALCULATED | 808.5 | VERIFIED_SYSTEM |
| DIESEL | L | 1 | d84e66a7-c94c-4458-bc33-5331519a9bb5 | 2.68 | CALCULATED | 2.68 | VERIFIED_SYSTEM |
| DIESEL | kg | 240 | NONE | None | MISSING_FACTOR | None | — |
| HOTEL | nights | 4 | b1a8e266-367e-4c21-b64a-58e225750f17 | 15 | CALCULATED | 60 | VERIFIED_SYSTEM |
| AIR_TRAVEL | km | 1 | 3a4fa79f-ee3a-4e48-9ac1-6469f7b2aaad | 0.115 | CALCULATED | 0.115 | VERIFIED_SYSTEM |
| SHIPPING | ton-km | 1 | c594dc4f-d8a6-40e7-8bcd-d78ae1008e17 | 0.09 | CALCULATED | 0.09 | VERIFIED_SYSTEM |
| GROUND_TRANSPORT | km | 1 | pilot-ground-transport-canada-2025 | 0.2 | CALCULATED | 0.2 | VERIFIED_SYSTEM |
| WATER | m3 | 18 | NONE | None | TRACKED_ONLY | None | — |

The Alberta result is the actual DRAFT/DEMO governed version, not a fabricated test catalog factor. Other selectable rows identify themselves as demonstration/pilot estimates. The misleading VERIFIED_SYSTEM priority does not change verified=false (DB; K1). A second pure selection trace evaluated each explicitly synthetic tenant with demo=false: both verified synthetic rows won ORGANIZATION_CUSTOM precedence; the 999 g CO2 reference-only row was rejected.

Explicit synthetic legacy entries:

| ID | Evidence | Own organization demo flag | Eligibility finding |
| --- | --- | --- | --- |
| cmvcnwowa009ogdhwljpjodax | Synthetic Task9 reference boundary test;999 g CO2/L; REFERENCE_ONLY / CO2_COMPONENT; unverified | false | Rejected in pure trace; ordinary system diesel chosen instead; TEST_ONLY P2 |
| cmvcwh23y00fmgdhwr0lzoz3a | Synthetic RC history factor;2.68/L; verified; corporate/direct; Alberta | false | **Selected in own-tenant pure trace** as ORGANIZATION_CUSTOM; TEST_ONLY P0 |
| cmvd3jvgj005agd82349bllfy | Synthetic RC historical diesel;2.68/L; verified; null governance; Alberta | false | **Selected in own-tenant pure trace** as ORGANIZATION_CUSTOM; TEST_ONLY P0 |

These tenant rows are not system defaults and should not enter an unrelated customer's visible catalog. That tenant boundary is represented by the server query; this audit does not claim cross-tenant leakage. However the policy flag does not intrinsically exclude a synthetic verified row within its own tenant, and global demo defaults demonstrably leak into an ordinary false-policy evaluation. Confirm tenant purpose before permitting customer use; no account flags were changed.

## 17. Current pilot calculation impact

The historical golden result is preserved: **1,808.14 kgCO2e**. It is a workflow/test baseline, not an audited emissions total. The actual code/catalog trace reproduces electricity519.4, gas420.24, gasoline808.5, accommodation60, tracked Water and blocked diesel.

| Activity / input | CURRENT CARBONLITE RESULT kgCO2e | OFFICIAL-SOURCE-AUDITED RESULT kgCO2e | DIFFERENCE current minus audited | Evidence / limitation |
| --- | ---: | --- | --- | --- |
| Alberta electricity980kWh |519.40|NOT DETERMINED for final corporate2026 method|NOT DETERMINED|Verified E2 offset comparator0.438 gives429.24, difference+90.16. Newer NIR-derived0.346 comparator gives339.08, difference+180.32. Neither is silently approved. |
| Natural gas8.5GJ |420.24|420.24 at published E3 estimate; final method-specific corporate result NOT DETERMINED|0 against E3 estimate only|49.44 source arithmetic verified; HHV, sector/GWP and year limitations remain. |
| Gasoline350L |808.50|NOT DETERMINED|NOT DETERMINED|Conditional generic stationary810.285; Alberta-blended stationary763.735; fuel use/technology/blend unspecified. |
| Water18m3 |Excluded,0 total contribution|Excluded under current policy|0 policy contribution|Not a claim of zero physical water emissions. |
| Accommodation4nights |60.00|NOT DETERMINED|NOT DETERMINED|No authoritative Canadian15/night evidence found. |
| Diesel240kg |Not calculated|Not calculated without compatible quantity/method|N/A|No density invented; frontend/backend status wording differs. |
| Total |1808.14|**NOT DETERMINED**|**NOT DETERMINED**|Do not sum mixed-method comparators into a purported audited total. |

## 18. Paid-pilot blockers

| Priority | Issue | Gate |
| --- | --- | --- |
| P0 | Demo=false still selects global DEMO/legacy demo defaults | Resolve calculation eligibility before customer report reliance. |
| P0 | 0.53 electricity has no established official corporate source/vintage | Approve an electricity methodology/boundary and evidence-backed version. |
| P0 | Gasoline/diesel/hotel and other selectable estimates lack complete source/gas/method support | Replace or explicitly exclude unapproved categories from customer reports. |
| P0 | Verified synthetic own-tenant diesel bypasses demo=false | Isolate fixtures and enforce policy; verify tenant catalog before report generation. |
| P1 |49.44 numeric source is real but HHV/sector/GWP applicability is not fully substantiated|Treat as disclosed approximation until reviewed, not certified accuracy. |
| P1 |Combustion sector/vehicle technology/blend are not represented sufficiently to choose among official methods|Obtain activity context; approve component/GWP method. |
| P2 |No effective dates, sourceYear=0, copied publication dates, unlinked official source, weak tie-break metadata|Correct provenance and temporal governance through a separate approved change. |
| P2 |Dormant Water0.35 and divergent tracked waste vocabulary|Review future policy without changing current exclusion here. |
| P3 |Redundant semantic duplicate identities/source rows|Cleanup only after approved migration plan preserving historical snapshots. |

Gate answers for current state:

1. Workflow/usability testing: **YES / SAFE**, with explicit test purpose and no accuracy reliance.
2. Accept payment for a controlled pilot delivering preliminary emissions reports: **NO / NOT SAFE at the current reporting gate**. Preliminary labelling alone is insufficient. Reassess after blockers or a separately approved manual-reviewed reporting process.
3. Represent outputs as “accurate regulatory emissions reporting”: **NO / NOT SAFE**. Corporate methods and regulatory obligations are distinct; current library evidence does not satisfy either claim generally.
4. Before the first paid customer report: resolve the P0s, approve all included factor methods and gas/year boundaries, substantiate 49.44 if used, independently review outputs, and preserve historical evidence rather than overwrite it.

These are product/data-readiness conclusions from this audit, not a legal determination about permissible sales.

## 19. Recommended corrections

Recommendations only; none implemented:

1. Enforce the ordinary-customer exclusion of demo/synthetic/unapproved factors across every selection path. Explicitly remove the pilot-electricity exception only in a separately authorized change with compatibility/eligibility review. Verify both global and tenant overrides.
2. Approve a corporate location-based Scope 2 methodology using the latest applicable ECCC NIR provincial data and a transparent vintage proxy; verify consumption/generation/T&D boundaries. Keep EGDF, marginal, offset and TIER references outside default corporate selection.
3. Review fuel gases, combustion use/technology and renewable blend. Store authoritative CO2/CH4/N2O source components and the chosen GWP, or a traceable preaggregated CO2e factor. Do not merely relabel 2.31/2.68 as verified.
4. Require hotel/travel/shipping evidence before including their estimates in real customer totals; distinguish Canadian evidence from unsupported foreign-source labels. Review49.44/GJ's approximate role and HHV basis explicitly.
5. Review effective ranges, official source links, row/table locators, source/factor/reporting years and duplicate precedence. Preserve old calculation snapshots and issue explicit reviewed recalculations rather than silently rewriting historical reports.

## 20. Proposed factor-governance model

Keep immutable source, factor identity, factor version and calculation snapshot boundaries. A future version should represent: activity/use; combustion sector/technology; scope/boundary; raw and canonical input unit; mass/volume/HHV-or-LHV basis and standard conditions; country/province/grid boundary; fuel blend and biogenic CO2 treatment; publication, data/factor and reporting-application years separately; effective range and replacement rules; full official title/publisher/version/URL/page/table/row; numeric CO2,CH4,N2O components with gas units; GWP source/version/horizon; aggregate CO2e and whether GWP is already embedded; methodology and inventory/regulatory/offset/TIER/estimate applicability; permitted activity context; review status/actor/evidence; tenant/system ownership; demo/test isolation.

Selection must require a reviewed applicable method for its reporting purpose, then explicit jurisdiction/date/unit/context compatibility, then a documented override/version/tie policy. Null legacy governance should be visibly unreviewed rather than assumed scientifically eligible. Scope 2 location and market methods need distinct evidence and output fields. Component factors must not be mistaken for direct aggregate CO2e, and preaggregated factors must not be converted twice. Runtime result units must be dimensionally validated. Preserve selected values and provenance in calculation snapshots, independently of future library changes.

### Appendix A. Semantic duplicate groups and record-level classifications

- M24: `cmqzqzbba0001gdltz15zr6fj`, `cmr75gudi0001gdjb6zeliz8z`
- M25: `cmqzqzbwt0003gdltz5mch3pt`, `cmr75gurs0003gdjbw3dg3r6g`
- M26: `cmqzqzcf40005gdltachk8elz`, `cmr75gv2j0005gdjbkrx1342n`
- M28: `cmqzqzde80009gdlty02lj493`, `cmr75gwdq000jgdjbr50tve1l`
- M29: `cmqzqzdu7000bgdltsshetyei`, `cmr75gwok000lgdjbcqs43scq`
- M30: `cmqzqzebn000dgdltsb3lc5x4`, `cmr75gwz9000ngdjbf438bcx9`
- M31: `cmqzqzfdk000jgdltbtf1fwz5`, `cmr75gx8w000pgdjb2ztwpnpx`

| Registry | Record ID | Candidate group | Methodology categories | Rating | Severity | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| ConversionFactor | 2938cdd2-b746-4381-b5c6-404a2dbd5cb8 | M01 | LEGACY, DEMO | TEST_ONLY | P1 | DB; K1; section 16 |
| ConversionFactor | 3a4fa79f-ee3a-4e48-9ac1-6469f7b2aaad | M02 | LEGACY, DEMO, SCOPE_3_ESTIMATE | REPLACE_CANDIDATE | P0 | DB; K1; sections 6-10,12,16 |
| ConversionFactor | 72960476-10cf-41e4-9aa3-1e02bde56616 | M03 | LEGACY, DEMO | REPLACE_CANDIDATE | P0 | DB; K1; sections 6-10,12,16 |
| ConversionFactor | b1a8e266-367e-4c21-b64a-58e225750f17 | M04 | LEGACY, DEMO, SCOPE_3_ESTIMATE | REPLACE_CANDIDATE | P0 | DB; K1; sections 6-10,12,16 |
| ConversionFactor | babbf252-1188-48e2-a8ea-6da4609c0971 | M05 | LEGACY, DEMO | REPLACE_CANDIDATE | P0 | DB; K1; sections 6-10,12,16 |
| ConversionFactor | c594dc4f-d8a6-40e7-8bcd-d78ae1008e17 | M06 | LEGACY, DEMO, SCOPE_3_ESTIMATE | REPLACE_CANDIDATE | P0 | DB; K1; sections 6-10,12,16 |
| ConversionFactor | cmnry4rfn0001gd4z7tk6wkz6 | M07 | LEGACY, DEMO | TEST_ONLY | P1 | DB; K1; section 16 |
| ConversionFactor | cmp1a8dp9001hgdi22fdru95n | M08 | LEGACY, DEMO | TEST_ONLY | P1 | DB; K1; section 16 |
| ConversionFactor | cmp1a9tez001jgdi2xyp2gkxr | M09 | LEGACY, DEMO | TEST_ONLY | P1 | DB; K1; section 16 |
| ConversionFactor | cmp1ab2ki001lgdi2t5myivq1 | M10 | LEGACY, DEMO | TEST_ONLY | P1 | DB; K1; section 16 |
| ConversionFactor | cmp1tgke20001gd490ymvo5s7 | M11 | LEGACY, DEMO, SCOPE_3_ESTIMATE | TEST_ONLY | P1 | DB; K1; section 16 |
| ConversionFactor | cmp27hbxz0001gdk3t00xkbf3 | M12 | LEGACY, DEMO, SCOPE_3_ESTIMATE | TEST_ONLY | P1 | DB; K1; section 16 |
| ConversionFactor | cmp27j18f0003gdk3je4govck | M13 | LEGACY, DEMO, SCOPE_3_ESTIMATE | TEST_ONLY | P1 | DB; K1; section 16 |
| ConversionFactor | cmqzqzf00000hgdlt58ufnc61 | M14 | LEGACY, DEMO, UNKNOWN (physical emissions) | PASS_WITH_LIMITATION | P2 | K1; DB; section 11 |
| ConversionFactor | cmr75gv6l0007gdjbs0bz4d3j | M15 | LEGACY, DEMO | TEST_ONLY | P1 | DB; K1; section 16 |
| ConversionFactor | cmr75gvl7000bgdjbiw703b7y | M16 | LEGACY, DEMO | TEST_ONLY | P1 | DB; K1; section 16 |
| ConversionFactor | cmr75gvxj000fgdjbgis72awy | M17 | LEGACY, DEMO | TEST_ONLY | P1 | DB; K1; section 16 |
| ConversionFactor | cmvcnwowa009ogdhwljpjodax | M18 | LEGACY, SYNTHETIC_TEST, UNKNOWN (official methodology) | TEST_ONLY | P2 | K1; K2; DB; section 16 |
| ConversionFactor | cmvcwh23y00fmgdhwr0lzoz3a | M19 | LEGACY, SYNTHETIC_TEST, CORPORATE_INVENTORY (DB declaration), UNKNOWN (official methodology) | TEST_ONLY | P0 | K1; K2; DB; section 16 |
| ConversionFactor | cmvd3jvgj005agd82349bllfy | M20 | LEGACY, SYNTHETIC_TEST, UNKNOWN (official methodology) | TEST_ONLY | P0 | K1; K2; DB; section 16 |
| ConversionFactor | d84e66a7-c94c-4458-bc33-5331519a9bb5 | M21 | LEGACY, DEMO | REPLACE_CANDIDATE | P0 | DB; K1; sections 6-10,12,16 |
| ConversionFactor | eccc-natural-gas-canada-generic-gj-2025 | M22 | LEGACY, CORPORATE_INVENTORY (DB declaration), UNKNOWN (sector/GWP detail) | PASS_WITH_LIMITATION | P1 | E3; K1; DB |
| ConversionFactor | pilot-ground-transport-canada-2025 | M23 | LEGACY, DEMO, SCOPE_3_ESTIMATE | REPLACE_CANDIDATE | P0 | DB; K1; sections 6-10,12,16 |
| FactorVersion | cmqzqzbba0001gdltz15zr6fj | M24 | DEMO | TEST_ONLY | P1 | DB; K1; section 16 |
| FactorVersion | cmqzqzbwt0003gdltz5mch3pt | M25 | DEMO | TEST_ONLY | P1 | DB; K1; section 16 |
| FactorVersion | cmqzqzcf40005gdltachk8elz | M26 | DEMO | TEST_ONLY | P1 | DB; K1; section 16 |
| FactorVersion | cmqzqzcwf0007gdlttkgsf9u7 | M27 | DEMO | TEST_ONLY | P1 | DB; K1; section 16 |
| FactorVersion | cmqzqzde80009gdlty02lj493 | M28 | DEMO, SCOPE_3_ESTIMATE | TEST_ONLY | P1 | DB; K1; section 16 |
| FactorVersion | cmqzqzdu7000bgdltsshetyei | M29 | DEMO, SCOPE_3_ESTIMATE | TEST_ONLY | P1 | DB; K1; section 16 |
| FactorVersion | cmqzqzebn000dgdltsb3lc5x4 | M30 | DEMO, SCOPE_3_ESTIMATE | TEST_ONLY | P1 | DB; K1; section 16 |
| FactorVersion | cmqzqzfdk000jgdltbtf1fwz5 | M31 | DEMO, UNKNOWN (physical emissions) | PASS_WITH_LIMITATION | P2 | K1; DB; section 11 |
| FactorVersion | cmr75gudi0001gdjb6zeliz8z | M24 | DEMO | TEST_ONLY | P1 | DB; K1; section 16 |
| FactorVersion | cmr75gurs0003gdjbw3dg3r6g | M25 | DEMO | TEST_ONLY | P1 | DB; K1; section 16 |
| FactorVersion | cmr75gv2j0005gdjbkrx1342n | M26 | DEMO | TEST_ONLY | P1 | DB; K1; section 16 |
| FactorVersion | cmr75gvgt0009gdjbmhpv7zdd | M32 | DEMO | REPLACE_CANDIDATE | P0 | DB; K1; sections 6-10,12,16 |
| FactorVersion | cmr75gvtr000dgdjb9a5pu2vf | M33 | DEMO | TEST_ONLY | P1 | DB; K1; section 16 |
| FactorVersion | cmr75gw3g000hgdjbkp93dtvt | M34 | DEMO | TEST_ONLY | P1 | DB; K1; section 16 |
| FactorVersion | cmr75gwdq000jgdjbr50tve1l | M28 | DEMO, SCOPE_3_ESTIMATE | TEST_ONLY | P1 | DB; K1; section 16 |
| FactorVersion | cmr75gwok000lgdjbcqs43scq | M29 | DEMO, SCOPE_3_ESTIMATE | TEST_ONLY | P1 | DB; K1; section 16 |
| FactorVersion | cmr75gwz9000ngdjbf438bcx9 | M30 | DEMO, SCOPE_3_ESTIMATE | TEST_ONLY | P1 | DB; K1; section 16 |
| FactorVersion | cmr75gx8w000pgdjb2ztwpnpx | M31 | DEMO, UNKNOWN (physical emissions) | PASS_WITH_LIMITATION | P2 | K1; DB; section 11 |
| FactorVersion | cmrw89g75000hgdyd4g30s8bm | M35 | DEMO, SCOPE_3_ESTIMATE | TEST_ONLY | P1 | DB; K1; section 16 |
| FactorVersion | factor_version_41eba184d6c179b71942506a65b4bc90 | M36 | DEMO, UNKNOWN (physical emissions) | REVIEW | P2 | K1; DB; section 11 |
| FactorVersion | factor_version_456d27103da9d2d8701a84760d27216a | M37 | DEMO, SCOPE_3_ESTIMATE | TEST_ONLY | P1 | DB; K1; section 16 |
| FactorVersion | factor_version_4f56b437b9e87bcceaf38f1b843bb1cc | M38 | DEMO, SCOPE_3_ESTIMATE | TEST_ONLY | P1 | DB; K1; section 16 |
| FactorVersion | factor_version_54423760a3fec03379308e80ab056961 | M39 | DEMO, SCOPE_3_ESTIMATE | TEST_ONLY | P1 | DB; K1; section 16 |
| FactorVersion | factor_version_6539de3878db6487936afc87baac2162 | M40 | DEMO | TEST_ONLY | P1 | DB; K1; section 16 |
| FactorVersion | factor_version_79e1eb87a31b617a89402b9fa6c03e36 | M41 | DEMO, SCOPE_3_ESTIMATE | TEST_ONLY | P1 | DB; K1; section 16 |
| FactorVersion | factor_version_7d557bb25c4190b4f005bc4bc7c90fa4 | M42 | DEMO | TEST_ONLY | P1 | DB; K1; section 16 |
| FactorVersion | factor_version_83ff331ba2fe8cfb05cb0727bdfd3c55 | M43 | DEMO | TEST_ONLY | P1 | DB; K1; section 16 |
| FactorVersion | factor_version_865088c36de4afb626950e42928af21f | M44 | DEMO | TEST_ONLY | P1 | DB; K1; section 16 |
| FactorVersion | factor_version_94e43c1a90bff4ebf7a8d03fef362510 | M45 | SYNTHETIC_TEST, DEMO, UNKNOWN (official methodology) | TEST_ONLY | P2 | K1; K2; DB; section 16 |
| FactorVersion | factor_version_ab681278627dfc51882aa3ee936d3017 | M46 | DEMO | TEST_ONLY | P1 | DB; K1; section 16 |
| FactorVersion | factor_version_c75bdf165fbfb398e0fe2446f47450e9 | M47 | DEMO, SCOPE_3_ESTIMATE | TEST_ONLY | P1 | DB; K1; section 16 |
| FactorVersion | factor_version_d4ef855af7ae2af1731b9618677e3a8b | M48 | DEMO | TEST_ONLY | P1 | DB; K1; section 16 |
| FactorVersion | factor_version_dc505ba9628140a8887f4c0f37ee31de | M49 | DEMO | TEST_ONLY | P1 | DB; K1; section 16 |
| FactorVersion | factor_version_e613689a131a714ca9dfa79a7097fdfe | M50 | DEMO, SCOPE_3_ESTIMATE | TEST_ONLY | P1 | DB; K1; section 16 |
| Factor | demo-factor-air-travel | M28 | Identity; see linked version categories | TEST_ONLY | P1 | DB; linked versions (not an independent numeric factor) |
| Factor | demo-factor-air-travel-canada-generic | M28 | Identity; see linked version categories | TEST_ONLY | P1 | DB; linked versions (not an independent numeric factor) |
| Factor | demo-factor-diesel | M24 | Identity; see linked version categories | TEST_ONLY | P1 | DB; linked versions (not an independent numeric factor) |
| Factor | demo-factor-diesel-canada-generic | M24 | Identity; see linked version categories | TEST_ONLY | P1 | DB; linked versions (not an independent numeric factor) |
| Factor | demo-factor-electricity | M27 | Identity; see linked version categories | TEST_ONLY | P1 | DB; linked versions (not an independent numeric factor) |
| Factor | demo-factor-electricity-alberta | M32 | Identity; see linked version categories | REPLACE_CANDIDATE | P0 | DB; linked versions (not an independent numeric factor) |
| Factor | demo-factor-electricity-british-columbia | M33 | Identity; see linked version categories | TEST_ONLY | P1 | DB; linked versions (not an independent numeric factor) |
| Factor | demo-factor-electricity-ontario | M34 | Identity; see linked version categories | TEST_ONLY | P1 | DB; linked versions (not an independent numeric factor) |
| Factor | demo-factor-gasoline | M25 | Identity; see linked version categories | TEST_ONLY | P1 | DB; linked versions (not an independent numeric factor) |
| Factor | demo-factor-gasoline-canada-generic | M25 | Identity; see linked version categories | TEST_ONLY | P1 | DB; linked versions (not an independent numeric factor) |
| Factor | demo-factor-ground-transport-canada-national | M35 | Identity; see linked version categories | TEST_ONLY | P1 | DB; linked versions (not an independent numeric factor) |
| Factor | demo-factor-hotel | M29 | Identity; see linked version categories | TEST_ONLY | P1 | DB; linked versions (not an independent numeric factor) |
| Factor | demo-factor-hotel-canada-generic | M29 | Identity; see linked version categories | TEST_ONLY | P1 | DB; linked versions (not an independent numeric factor) |
| Factor | demo-factor-natural-gas | M26 | Identity; see linked version categories | TEST_ONLY | P1 | DB; linked versions (not an independent numeric factor) |
| Factor | demo-factor-natural-gas-canada-generic | M26 | Identity; see linked version categories | TEST_ONLY | P1 | DB; linked versions (not an independent numeric factor) |
| Factor | demo-factor-shipping | M30 | Identity; see linked version categories | TEST_ONLY | P1 | DB; linked versions (not an independent numeric factor) |
| Factor | demo-factor-shipping-canada-generic | M30 | Identity; see linked version categories | TEST_ONLY | P1 | DB; linked versions (not an independent numeric factor) |
| Factor | demo-factor-water | M31 | Identity; see linked version categories | PASS_WITH_LIMITATION | P2 | DB; linked versions (not an independent numeric factor) |
| Factor | demo-factor-water-canada-generic | M31 | Identity; see linked version categories | PASS_WITH_LIMITATION | P2 | DB; linked versions (not an independent numeric factor) |
| Factor | factor_31e22bf5d6388b74de7697ad833d98f7 | M45, M46 | Identity; see linked version categories | TEST_ONLY | P1 | DB; linked versions (not an independent numeric factor) |
| Factor | factor_521f5c1938759e396246b36a5d390549 | M47 | Identity; see linked version categories | TEST_ONLY | P1 | DB; linked versions (not an independent numeric factor) |
| Factor | factor_672814aba889909bd5d07866bd654798 | M43, M49 | Identity; see linked version categories | TEST_ONLY | P1 | DB; linked versions (not an independent numeric factor) |
| Factor | factor_6cfabb1d1b89150d7068d39d78bc57e8 | M44, M48 | Identity; see linked version categories | TEST_ONLY | P1 | DB; linked versions (not an independent numeric factor) |
| Factor | factor_75785ad970cf55694f3dcaae0ce7f58a | M40 | Identity; see linked version categories | TEST_ONLY | P1 | DB; linked versions (not an independent numeric factor) |
| Factor | factor_7b915e8c1743a4c4e49b5b50fcd1e886 | M41 | Identity; see linked version categories | TEST_ONLY | P1 | DB; linked versions (not an independent numeric factor) |
| Factor | factor_815964abcf5a6f302fa662f3e588769a | M38 | Identity; see linked version categories | TEST_ONLY | P1 | DB; linked versions (not an independent numeric factor) |
| Factor | factor_a4f3d2b5c2490ee5a530c3a0016a8a7f | M39 | Identity; see linked version categories | TEST_ONLY | P1 | DB; linked versions (not an independent numeric factor) |
| Factor | factor_bc2cc7737bd439bd1c5654e57f97a543 | M42 | Identity; see linked version categories | TEST_ONLY | P1 | DB; linked versions (not an independent numeric factor) |
| Factor | factor_ca32b3fd962d671ee7a8285883081edb | M37, M50 | Identity; see linked version categories | TEST_ONLY | P1 | DB; linked versions (not an independent numeric factor) |
| Factor | factor_ce17faff1ec82f34654f0c8a1c01db5a | M36 | Identity; see linked version categories | REVIEW | P2 | DB; linked versions (not an independent numeric factor) |
| FactorSource | official-source-eccc-2025-emission-factors-reference-values | No linked version | Provenance only; source identity is not method approval | REVIEW | P2 | DB; source metadata not independently certified by its official flag |
| FactorSource | source_0df6dae2ab953ff6d5974265655a1c37 | M50 | Provenance only; source identity is not method approval | TEST_ONLY | P1 | DB; source metadata not independently certified by its official flag |
| FactorSource | source_474dccf3aed31b4bf851913665f8ad73 | M39 | Provenance only; source identity is not method approval | TEST_ONLY | P1 | DB; source metadata not independently certified by its official flag |
| FactorSource | source_614f914d21439eece1d12ea855083c76 | M48 | Provenance only; source identity is not method approval | TEST_ONLY | P1 | DB; source metadata not independently certified by its official flag |
| FactorSource | source_62054368b7bb755b9a7d892b9daf4e14 | M45 | Provenance only; source identity is not method approval | TEST_ONLY | P2 | DB; source metadata not independently certified by its official flag |
| FactorSource | source_7e7a03a779e076dcd07211a7fe59adbc | M42 | Provenance only; source identity is not method approval | TEST_ONLY | P1 | DB; source metadata not independently certified by its official flag |
| FactorSource | source_852e60b57bff7d69bddd2f996bfa22c2 | M43 | Provenance only; source identity is not method approval | TEST_ONLY | P1 | DB; source metadata not independently certified by its official flag |
| FactorSource | source_aa70d88a99fd705842ed54dacfc378c3 | M37, M40, M41, M44, M46, M47, M49 | Provenance only; source identity is not method approval | TEST_ONLY | P1 | DB; source metadata not independently certified by its official flag |
| FactorSource | source_c0976ad7b3b3d528980bf86aa33b0628 | M36 | Provenance only; source identity is not method approval | REVIEW | P2 | DB; source metadata not independently certified by its official flag |
| FactorSource | source_f6fe4ca95a1a1b4ba95432dd5e5b2ead | M38 | Provenance only; source identity is not method approval | TEST_ONLY | P1 | DB; source metadata not independently certified by its official flag |
| FactorSource | source_missing_default | No linked version | Provenance only; source identity is not method approval | REVIEW | P2 | DB; source metadata not independently certified by its official flag |
| FactorSource | system-source-air-travel-km-2025 | M28 | Provenance only; source identity is not method approval | TEST_ONLY | P1 | DB; source metadata not independently certified by its official flag |
| FactorSource | system-source-air-travel-km-2025-canada-generic | M28 | Provenance only; source identity is not method approval | TEST_ONLY | P1 | DB; source metadata not independently certified by its official flag |
| FactorSource | system-source-diesel-liters-2025 | M24 | Provenance only; source identity is not method approval | TEST_ONLY | P1 | DB; source metadata not independently certified by its official flag |
| FactorSource | system-source-diesel-liters-2025-canada-generic | M24 | Provenance only; source identity is not method approval | TEST_ONLY | P1 | DB; source metadata not independently certified by its official flag |
| FactorSource | system-source-electricity-kwh-2025 | M27 | Provenance only; source identity is not method approval | TEST_ONLY | P1 | DB; source metadata not independently certified by its official flag |
| FactorSource | system-source-electricity-kwh-2025-alberta | M32 | Provenance only; source identity is not method approval | REPLACE_CANDIDATE | P0 | DB; source metadata not independently certified by its official flag |
| FactorSource | system-source-electricity-kwh-2025-british-columbia | M33 | Provenance only; source identity is not method approval | TEST_ONLY | P1 | DB; source metadata not independently certified by its official flag |
| FactorSource | system-source-electricity-kwh-2025-ontario | M34 | Provenance only; source identity is not method approval | TEST_ONLY | P1 | DB; source metadata not independently certified by its official flag |
| FactorSource | system-source-gasoline-liters-2025 | M25 | Provenance only; source identity is not method approval | TEST_ONLY | P1 | DB; source metadata not independently certified by its official flag |
| FactorSource | system-source-gasoline-liters-2025-canada-generic | M25 | Provenance only; source identity is not method approval | TEST_ONLY | P1 | DB; source metadata not independently certified by its official flag |
| FactorSource | system-source-ground-transport-km-2025-canada-national | M35 | Provenance only; source identity is not method approval | TEST_ONLY | P1 | DB; source metadata not independently certified by its official flag |
| FactorSource | system-source-hotel-nights-2025 | M29 | Provenance only; source identity is not method approval | TEST_ONLY | P1 | DB; source metadata not independently certified by its official flag |
| FactorSource | system-source-hotel-nights-2025-canada-generic | M29 | Provenance only; source identity is not method approval | TEST_ONLY | P1 | DB; source metadata not independently certified by its official flag |
| FactorSource | system-source-natural-gas-m3-2025 | M26 | Provenance only; source identity is not method approval | TEST_ONLY | P1 | DB; source metadata not independently certified by its official flag |
| FactorSource | system-source-natural-gas-m3-2025-canada-generic | M26 | Provenance only; source identity is not method approval | TEST_ONLY | P1 | DB; source metadata not independently certified by its official flag |
| FactorSource | system-source-shipping-ton-km-2025 | M30 | Provenance only; source identity is not method approval | TEST_ONLY | P1 | DB; source metadata not independently certified by its official flag |
| FactorSource | system-source-shipping-ton-km-2025-canada-generic | M30 | Provenance only; source identity is not method approval | TEST_ONLY | P1 | DB; source metadata not independently certified by its official flag |
| FactorSource | system-source-water-m3-2025 | M31 | Provenance only; source identity is not method approval | PASS_WITH_LIMITATION | P2 | DB; source metadata not independently certified by its official flag |
| FactorSource | system-source-water-m3-2025-canada-generic | M31 | Provenance only; source identity is not method approval | PASS_WITH_LIMITATION | P2 | DB; source metadata not independently certified by its official flag |

### Appendix B. Complete read-only registry inventory

The following JSON contains **every column returned for all117 requested records**, including IDs, raw units, all source/jurisdiction/year/governance fields, flags and timestamps. FactorSource and Factor identities are retained even when not themselves numeric candidates. Null and sourceYear0 remain explicit. Audit category/rating/severity are in Appendix A; no raw database field was changed. This appendix is the machine-readable inventory within the permitted Markdown artifact; no separate workbook or CSV was created.

```json
{
  "ConversionFactor": [
    {
      "id": "2938cdd2-b746-4381-b5c6-404a2dbd5cb8",
      "organizationId": null,
      "name": "Electricity - Province Required",
      "type": "EMISSION",
      "activityType": "ELECTRICITY",
      "region": null,
      "country": "Canada",
      "unit": "kWh",
      "factorValue": "0.53",
      "resultUnit": "kgCO2e",
      "sourceName": "CarbonLite System Defaults",
      "sourceReference": "CarbonLite MVP Default Factors v1.0",
      "effectiveFrom": null,
      "effectiveTo": null,
      "isDefault": true,
      "createdAt": "2026-05-13T21:26:17.121Z",
      "updatedAt": "2026-07-22T15:18:49.513Z",
      "isSystemDefault": true,
      "sourceAuthority": "CarbonLite System Defaults",
      "sourceDocument": "CarbonLite Default Factor Library v1.0",
      "sourceYear": 2025,
      "sourceUrl": "https://carbonlite.ai/methodology/default-factors",
      "methodology": "Electricity emission factors vary by province. Replace with official provincial electricity factors before production use.",
      "confidenceLevel": "Low (Placeholder)",
      "verified": false,
      "notes": "Placeholder electricity factor for pilot testing only.",
      "jurisdiction": "Province Required",
      "verificationStatus": "Internal Review Required",
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "3a4fa79f-ee3a-4e48-9ac1-6469f7b2aaad",
      "organizationId": null,
      "name": "Air travel",
      "type": "EMISSION",
      "activityType": "AIR_TRAVEL",
      "region": null,
      "country": "Canada",
      "unit": "km",
      "factorValue": "0.115",
      "resultUnit": "kgCO2e",
      "sourceName": "CarbonLite System Defaults",
      "sourceReference": "CarbonLite MVP Default Factors v1.0",
      "effectiveFrom": null,
      "effectiveTo": null,
      "isDefault": true,
      "createdAt": "2026-05-13T21:26:17.121Z",
      "updatedAt": "2026-07-22T15:18:47.489Z",
      "isSystemDefault": true,
      "sourceAuthority": "CarbonLite System Defaults",
      "sourceDocument": "CarbonLite Default Factor Library v1.0",
      "sourceYear": 2025,
      "sourceUrl": "https://carbonlite.ai/methodology/default-factors",
      "methodology": "Used for pilot validation. Intended for demonstration workflows only. Replace with official ECCC or provincial emission factors before production reporting.",
      "confidenceLevel": "Medium (Engineering Estimate)",
      "verified": false,
      "notes": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "jurisdiction": "Canada (Generic)",
      "verificationStatus": "Internal Review Required",
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "72960476-10cf-41e4-9aa3-1e02bde56616",
      "organizationId": null,
      "name": "Gasoline combustion",
      "type": "EMISSION",
      "activityType": "GASOLINE",
      "region": null,
      "country": "Canada",
      "unit": "liters",
      "factorValue": "2.31",
      "resultUnit": "kgCO2e",
      "sourceName": "CarbonLite System Defaults",
      "sourceReference": "CarbonLite MVP Default Factors v1.0",
      "effectiveFrom": null,
      "effectiveTo": null,
      "isDefault": true,
      "createdAt": "2026-05-13T21:26:17.121Z",
      "updatedAt": "2026-07-22T15:18:45.480Z",
      "isSystemDefault": true,
      "sourceAuthority": "CarbonLite System Defaults",
      "sourceDocument": "CarbonLite Default Factor Library v1.0",
      "sourceYear": 2025,
      "sourceUrl": "https://carbonlite.ai/methodology/default-factors",
      "methodology": "Used for pilot validation. Intended for demonstration workflows only. Replace with official ECCC or provincial emission factors before production reporting.",
      "confidenceLevel": "Medium (Engineering Estimate)",
      "verified": false,
      "notes": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "jurisdiction": "Canada (Generic)",
      "verificationStatus": "Internal Review Required",
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "b1a8e266-367e-4c21-b64a-58e225750f17",
      "organizationId": null,
      "name": "Hotel stays",
      "type": "EMISSION",
      "activityType": "HOTEL",
      "region": null,
      "country": "Canada",
      "unit": "nights",
      "factorValue": "15",
      "resultUnit": "kgCO2e",
      "sourceName": "CarbonLite System Defaults",
      "sourceReference": "CarbonLite MVP Default Factors v1.0",
      "effectiveFrom": null,
      "effectiveTo": null,
      "isDefault": true,
      "createdAt": "2026-05-13T21:26:17.121Z",
      "updatedAt": "2026-07-22T15:18:47.875Z",
      "isSystemDefault": true,
      "sourceAuthority": "CarbonLite System Defaults",
      "sourceDocument": "CarbonLite Default Factor Library v1.0",
      "sourceYear": 2025,
      "sourceUrl": "https://carbonlite.ai/methodology/default-factors",
      "methodology": "Used for pilot validation. Intended for demonstration workflows only. Replace with official ECCC or provincial emission factors before production reporting.",
      "confidenceLevel": "Medium (Engineering Estimate)",
      "verified": false,
      "notes": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "jurisdiction": "Canada (Generic)",
      "verificationStatus": "Internal Review Required",
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "babbf252-1188-48e2-a8ea-6da4609c0971",
      "organizationId": null,
      "name": "Natural gas combustion",
      "type": "EMISSION",
      "activityType": "NATURAL_GAS",
      "region": null,
      "country": "Canada",
      "unit": "m3",
      "factorValue": "1.89",
      "resultUnit": "kgCO2e",
      "sourceName": "CarbonLite System Defaults",
      "sourceReference": "CarbonLite MVP Default Factors v1.0",
      "effectiveFrom": null,
      "effectiveTo": null,
      "isDefault": true,
      "createdAt": "2026-05-13T21:26:17.121Z",
      "updatedAt": "2026-07-22T15:18:45.919Z",
      "isSystemDefault": true,
      "sourceAuthority": "CarbonLite System Defaults",
      "sourceDocument": "CarbonLite Default Factor Library v1.0",
      "sourceYear": 2025,
      "sourceUrl": "https://carbonlite.ai/methodology/default-factors",
      "methodology": "Used for pilot validation. Intended for demonstration workflows only. Replace with official ECCC or provincial emission factors before production reporting.",
      "confidenceLevel": "Medium (Engineering Estimate)",
      "verified": false,
      "notes": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "jurisdiction": "Canada (Generic)",
      "verificationStatus": "Internal Review Required",
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "c594dc4f-d8a6-40e7-8bcd-d78ae1008e17",
      "organizationId": null,
      "name": "Shipping",
      "type": "EMISSION",
      "activityType": "SHIPPING",
      "region": null,
      "country": "Canada",
      "unit": "ton-km",
      "factorValue": "0.09",
      "resultUnit": "kgCO2e",
      "sourceName": "CarbonLite System Defaults",
      "sourceReference": "CarbonLite MVP Default Factors v1.0",
      "effectiveFrom": null,
      "effectiveTo": null,
      "isDefault": true,
      "createdAt": "2026-05-13T21:26:17.121Z",
      "updatedAt": "2026-07-22T15:18:48.841Z",
      "isSystemDefault": true,
      "sourceAuthority": "CarbonLite System Defaults",
      "sourceDocument": "CarbonLite Default Factor Library v1.0",
      "sourceYear": 2025,
      "sourceUrl": "https://carbonlite.ai/methodology/default-factors",
      "methodology": "Used for pilot validation. Intended for demonstration workflows only. Replace with official ECCC or provincial emission factors before production reporting.",
      "confidenceLevel": "Medium (Engineering Estimate)",
      "verified": false,
      "notes": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "jurisdiction": "Canada (Generic)",
      "verificationStatus": "Internal Review Required",
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "cmnry4rfn0001gd4z7tk6wkz6",
      "organizationId": "demo-org-id",
      "name": "Diesel emission factor",
      "type": "EMISSION",
      "activityType": "DIESEL",
      "region": null,
      "country": null,
      "unit": "liters",
      "factorValue": "2.68",
      "resultUnit": "kgCO2e",
      "sourceName": "Manual test factor",
      "sourceReference": "diesel-standard-2025",
      "effectiveFrom": null,
      "effectiveTo": null,
      "isDefault": true,
      "createdAt": "2026-04-09T20:45:19.713Z",
      "updatedAt": "2026-05-11T16:24:11.980Z",
      "isSystemDefault": false,
      "sourceAuthority": null,
      "sourceDocument": null,
      "sourceYear": null,
      "sourceUrl": null,
      "methodology": null,
      "confidenceLevel": null,
      "verified": false,
      "notes": null,
      "jurisdiction": null,
      "verificationStatus": null,
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "cmp1a8dp9001hgdi22fdru95n",
      "organizationId": "demo-org-id",
      "name": "Gasoline emission factor",
      "type": "EMISSION",
      "activityType": "GASOLINE",
      "region": null,
      "country": null,
      "unit": "liters",
      "factorValue": "2.31",
      "resultUnit": "kgCO2e",
      "sourceName": "Environment Canada",
      "sourceReference": "gasoline-standard-2025",
      "effectiveFrom": null,
      "effectiveTo": null,
      "isDefault": true,
      "createdAt": "2026-05-11T14:13:41.124Z",
      "updatedAt": "2026-05-11T14:13:41.124Z",
      "isSystemDefault": false,
      "sourceAuthority": null,
      "sourceDocument": null,
      "sourceYear": null,
      "sourceUrl": null,
      "methodology": null,
      "confidenceLevel": null,
      "verified": false,
      "notes": null,
      "jurisdiction": null,
      "verificationStatus": null,
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "cmp1a9tez001jgdi2xyp2gkxr",
      "organizationId": "demo-org-id",
      "name": "Natural gas emission factor",
      "type": "EMISSION",
      "activityType": "NATURAL_GAS",
      "region": null,
      "country": null,
      "unit": "m3",
      "factorValue": "1.89",
      "resultUnit": "kgCO2e",
      "sourceName": "Environment Canada",
      "sourceReference": "natural-gas-standard-2025",
      "effectiveFrom": null,
      "effectiveTo": null,
      "isDefault": true,
      "createdAt": "2026-05-11T14:14:48.710Z",
      "updatedAt": "2026-05-11T14:14:48.710Z",
      "isSystemDefault": false,
      "sourceAuthority": null,
      "sourceDocument": null,
      "sourceYear": null,
      "sourceUrl": null,
      "methodology": null,
      "confidenceLevel": null,
      "verified": false,
      "notes": null,
      "jurisdiction": null,
      "verificationStatus": null,
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "cmp1ab2ki001lgdi2t5myivq1",
      "organizationId": "demo-org-id",
      "name": "Alberta electricity emission factor",
      "type": "EMISSION",
      "activityType": "ELECTRICITY",
      "region": null,
      "country": null,
      "unit": "kWh",
      "factorValue": "0.53",
      "resultUnit": "kgCO2e",
      "sourceName": "Alberta Grid Factor",
      "sourceReference": "alberta-grid-2025",
      "effectiveFrom": null,
      "effectiveTo": null,
      "isDefault": true,
      "createdAt": "2026-05-11T14:15:47.328Z",
      "updatedAt": "2026-05-11T14:15:47.328Z",
      "isSystemDefault": false,
      "sourceAuthority": null,
      "sourceDocument": null,
      "sourceYear": null,
      "sourceUrl": null,
      "methodology": null,
      "confidenceLevel": null,
      "verified": false,
      "notes": null,
      "jurisdiction": null,
      "verificationStatus": null,
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "cmp1tgke20001gd490ymvo5s7",
      "organizationId": "demo-org-id",
      "name": "Air travel emission factor",
      "type": "EMISSION",
      "activityType": "AIR_TRAVEL",
      "region": null,
      "country": null,
      "unit": "km",
      "factorValue": "0.115",
      "resultUnit": "kgCO2e",
      "sourceName": "DEFRA",
      "sourceReference": "flight-factor-2025",
      "effectiveFrom": null,
      "effectiveTo": null,
      "isDefault": true,
      "createdAt": "2026-05-11T23:11:56.401Z",
      "updatedAt": "2026-05-11T23:11:56.401Z",
      "isSystemDefault": false,
      "sourceAuthority": null,
      "sourceDocument": null,
      "sourceYear": null,
      "sourceUrl": null,
      "methodology": null,
      "confidenceLevel": null,
      "verified": false,
      "notes": null,
      "jurisdiction": null,
      "verificationStatus": null,
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "cmp27hbxz0001gdk3t00xkbf3",
      "organizationId": "demo-org-id",
      "name": "Hotel stay emission factor",
      "type": "EMISSION",
      "activityType": "HOTEL",
      "region": null,
      "country": null,
      "unit": "nights",
      "factorValue": "15",
      "resultUnit": "kgCO2e",
      "sourceName": "DEFRA",
      "sourceReference": "hotel-factor-2025",
      "effectiveFrom": null,
      "effectiveTo": null,
      "isDefault": true,
      "createdAt": "2026-05-12T05:44:26.808Z",
      "updatedAt": "2026-05-12T05:44:26.808Z",
      "isSystemDefault": false,
      "sourceAuthority": null,
      "sourceDocument": null,
      "sourceYear": null,
      "sourceUrl": null,
      "methodology": null,
      "confidenceLevel": null,
      "verified": false,
      "notes": null,
      "jurisdiction": null,
      "verificationStatus": null,
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "cmp27j18f0003gdk3je4govck",
      "organizationId": "demo-org-id",
      "name": "Freight shipping emission factor",
      "type": "EMISSION",
      "activityType": "SHIPPING",
      "region": null,
      "country": null,
      "unit": "ton-km",
      "factorValue": "0.09",
      "resultUnit": "kgCO2e",
      "sourceName": "EPA",
      "sourceReference": "freight-factor-2025",
      "effectiveFrom": null,
      "effectiveTo": null,
      "isDefault": true,
      "createdAt": "2026-05-12T05:45:46.180Z",
      "updatedAt": "2026-05-12T05:45:46.180Z",
      "isSystemDefault": false,
      "sourceAuthority": null,
      "sourceDocument": null,
      "sourceYear": null,
      "sourceUrl": null,
      "methodology": null,
      "confidenceLevel": null,
      "verified": false,
      "notes": null,
      "jurisdiction": null,
      "verificationStatus": null,
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "cmqzqzf00000hgdlt58ufnc61",
      "organizationId": null,
      "name": "Water usage tracked only",
      "type": "EMISSION",
      "activityType": "WATER",
      "region": null,
      "country": "Canada",
      "unit": "m3",
      "factorValue": "0",
      "resultUnit": "kgCO2e",
      "sourceName": "CarbonLite Pilot Methodology",
      "sourceReference": "Water Emissions Placeholder Factor",
      "effectiveFrom": null,
      "effectiveTo": null,
      "isDefault": true,
      "createdAt": "2026-06-29T21:46:29.425Z",
      "updatedAt": "2026-07-22T15:18:49.195Z",
      "isSystemDefault": true,
      "sourceAuthority": "CarbonLite Pilot Methodology",
      "sourceDocument": "Water Emissions Placeholder Factor",
      "sourceYear": 2025,
      "sourceUrl": "https://carbonlite.ai/methodology/water-emissions",
      "methodology": "Estimated indirect emissions associated with municipal water treatment and distribution. Used for pilot workflow validation only.",
      "confidenceLevel": "Pilot Estimate",
      "verified": false,
      "notes": "Tracked metric with optional estimated emissions. Not intended for regulatory reporting.",
      "jurisdiction": "Canada (Generic)",
      "verificationStatus": "Internal Review Required",
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "cmr75gv6l0007gdjbs0bz4d3j",
      "organizationId": null,
      "name": "Electricity - Alberta",
      "type": "EMISSION",
      "activityType": "ELECTRICITY",
      "region": null,
      "country": "Canada",
      "unit": "kWh",
      "factorValue": "0.53",
      "resultUnit": "kgCO2e",
      "sourceName": "CarbonLite System Defaults",
      "sourceReference": "CarbonLite MVP Default Factors v1.0",
      "effectiveFrom": null,
      "effectiveTo": null,
      "isDefault": true,
      "createdAt": "2026-07-05T02:06:21.405Z",
      "updatedAt": "2026-07-22T15:18:46.356Z",
      "isSystemDefault": true,
      "sourceAuthority": "CarbonLite System Defaults",
      "sourceDocument": "CarbonLite Default Factor Library v1.0",
      "sourceYear": 2025,
      "sourceUrl": "https://carbonlite.ai/methodology/default-factors",
      "methodology": "Electricity emission factors vary by province. Replace with official provincial electricity factors before production use.",
      "confidenceLevel": "Low",
      "verified": false,
      "notes": "Placeholder electricity factor for pilot testing only.",
      "jurisdiction": "Alberta",
      "verificationStatus": "Internal Review Required",
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "cmr75gvl7000bgdjbiw703b7y",
      "organizationId": null,
      "name": "Electricity - British Columbia",
      "type": "EMISSION",
      "activityType": "ELECTRICITY",
      "region": null,
      "country": "Canada",
      "unit": "kWh",
      "factorValue": "0.02",
      "resultUnit": "kgCO2e",
      "sourceName": "CarbonLite System Defaults",
      "sourceReference": "CarbonLite MVP Default Factors v1.0",
      "effectiveFrom": null,
      "effectiveTo": null,
      "isDefault": true,
      "createdAt": "2026-07-05T02:06:21.931Z",
      "updatedAt": "2026-07-22T15:18:46.747Z",
      "isSystemDefault": true,
      "sourceAuthority": "CarbonLite System Defaults",
      "sourceDocument": "CarbonLite Default Factor Library v1.0",
      "sourceYear": 2025,
      "sourceUrl": "https://carbonlite.ai/methodology/default-factors",
      "methodology": "Electricity emission factors vary by province. Replace with official provincial electricity factors before production use.",
      "confidenceLevel": "Low",
      "verified": false,
      "notes": "Placeholder electricity factor for pilot testing only.",
      "jurisdiction": "British Columbia",
      "verificationStatus": "Internal Review Required",
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "cmr75gvxj000fgdjbgis72awy",
      "organizationId": null,
      "name": "Electricity - Ontario",
      "type": "EMISSION",
      "activityType": "ELECTRICITY",
      "region": null,
      "country": "Canada",
      "unit": "kWh",
      "factorValue": "0.12",
      "resultUnit": "kgCO2e",
      "sourceName": "CarbonLite System Defaults",
      "sourceReference": "CarbonLite MVP Default Factors v1.0",
      "effectiveFrom": null,
      "effectiveTo": null,
      "isDefault": true,
      "createdAt": "2026-07-05T02:06:22.375Z",
      "updatedAt": "2026-07-22T15:18:47.105Z",
      "isSystemDefault": true,
      "sourceAuthority": "CarbonLite System Defaults",
      "sourceDocument": "CarbonLite Default Factor Library v1.0",
      "sourceYear": 2025,
      "sourceUrl": "https://carbonlite.ai/methodology/default-factors",
      "methodology": "Electricity emission factors vary by province. Replace with official provincial electricity factors before production use.",
      "confidenceLevel": "Low",
      "verified": false,
      "notes": "Placeholder electricity factor for pilot testing only.",
      "jurisdiction": "Ontario",
      "verificationStatus": "Internal Review Required",
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "cmvcnwowa009ogdhwljpjodax",
      "organizationId": "cmvcmkjht001kgdfa4d81fwbj",
      "name": "Synthetic Task 9 reference boundary test",
      "type": "EMISSION",
      "activityType": "DIESEL",
      "region": null,
      "country": null,
      "unit": "L",
      "factorValue": "999",
      "resultUnit": "g CO2",
      "sourceName": null,
      "sourceReference": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "isDefault": false,
      "createdAt": "2026-10-17T17:20:13.066Z",
      "updatedAt": "2026-10-17T17:20:13.066Z",
      "isSystemDefault": false,
      "sourceAuthority": "Synthetic RC test",
      "sourceDocument": "Synthetic fixture, not an official factor",
      "sourceYear": null,
      "sourceUrl": null,
      "methodology": null,
      "confidenceLevel": null,
      "verified": false,
      "notes": null,
      "jurisdiction": null,
      "verificationStatus": null,
      "applicability": "REFERENCE_ONLY",
      "emissionBasis": "CO2_COMPONENT",
      "methodologyProvenance": null
    },
    {
      "id": "cmvcwh23y00fmgdhwr0lzoz3a",
      "organizationId": "cmvcw6wls00b5gdhw5u0qbyxh",
      "name": "Synthetic RC history factor",
      "type": "EMISSION",
      "activityType": "DIESEL",
      "region": "Alberta",
      "country": "Canada",
      "unit": "L",
      "factorValue": "2.68",
      "resultUnit": "kgCO2e",
      "sourceName": null,
      "sourceReference": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "isDefault": false,
      "createdAt": "2026-10-17T21:20:00.237Z",
      "updatedAt": "2026-10-18T00:52:11.911Z",
      "isSystemDefault": false,
      "sourceAuthority": "Synthetic test only",
      "sourceDocument": "RC isolated history test",
      "sourceYear": 2026,
      "sourceUrl": null,
      "methodology": null,
      "confidenceLevel": null,
      "verified": true,
      "notes": null,
      "jurisdiction": "Alberta",
      "verificationStatus": null,
      "applicability": "CORPORATE_INVENTORY",
      "emissionBasis": "DIRECT_CO2E",
      "methodologyProvenance": null
    },
    {
      "id": "cmvd3jvgj005agd82349bllfy",
      "organizationId": "cmvd3jths0050gd82lgqv29hl",
      "name": "Synthetic RC historical diesel",
      "type": "EMISSION",
      "activityType": "DIESEL",
      "region": "Alberta",
      "country": "Canada",
      "unit": "L",
      "factorValue": "2.68",
      "resultUnit": "kgCO2e",
      "sourceName": null,
      "sourceReference": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "isDefault": false,
      "createdAt": "2026-10-18T00:38:08.899Z",
      "updatedAt": "2026-10-18T02:13:04.716Z",
      "isSystemDefault": false,
      "sourceAuthority": "Synthetic RC fixture",
      "sourceDocument": "Historical immutability fixture",
      "sourceYear": 2025,
      "sourceUrl": "https://example.com/rc-fixture",
      "methodology": null,
      "confidenceLevel": null,
      "verified": true,
      "notes": null,
      "jurisdiction": null,
      "verificationStatus": null,
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "d84e66a7-c94c-4458-bc33-5331519a9bb5",
      "organizationId": null,
      "name": "Diesel combustion",
      "type": "EMISSION",
      "activityType": "DIESEL",
      "region": null,
      "country": "Canada",
      "unit": "liters",
      "factorValue": "2.68",
      "resultUnit": "kgCO2e",
      "sourceName": "CarbonLite System Defaults",
      "sourceReference": "CarbonLite MVP Default Factors v1.0",
      "effectiveFrom": null,
      "effectiveTo": null,
      "isDefault": true,
      "createdAt": "2026-05-13T21:26:17.121Z",
      "updatedAt": "2026-07-22T15:18:44.811Z",
      "isSystemDefault": true,
      "sourceAuthority": "CarbonLite System Defaults",
      "sourceDocument": "CarbonLite Default Factor Library v1.0",
      "sourceYear": 2025,
      "sourceUrl": "https://carbonlite.ai/methodology/default-factors",
      "methodology": "Used for pilot validation. Intended for demonstration workflows only. Replace with official ECCC or provincial emission factors before production reporting.",
      "confidenceLevel": "Medium (Engineering Estimate)",
      "verified": false,
      "notes": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "jurisdiction": "Canada (Generic)",
      "verificationStatus": "Internal Review Required",
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "eccc-natural-gas-canada-generic-gj-2025",
      "organizationId": null,
      "name": "Natural Gas - Canada Generic",
      "type": "EMISSION",
      "activityType": "NATURAL_GAS",
      "region": "Canada",
      "country": "Canada",
      "unit": "GJ",
      "factorValue": "49.44",
      "resultUnit": "kgCO2e",
      "sourceName": "ECCC Table A8 national fuel energy emission factor",
      "sourceReference": "Table A8: Mass of CO2 equivalent emissions emitted per quantity of energy for various fuels",
      "effectiveFrom": null,
      "effectiveTo": null,
      "isDefault": true,
      "createdAt": "2026-10-18T00:04:13.465Z",
      "updatedAt": "2026-10-18T00:04:13.465Z",
      "isSystemDefault": true,
      "sourceAuthority": "Environment and Climate Change Canada",
      "sourceDocument": "Greenhouse gas and air pollutant emissions projections – 2025",
      "sourceYear": 2025,
      "sourceUrl": "https://www.canada.ca/en/environment-climate-change/services/climate-change/greenhouse-gas-emissions/projections/2025-report.html",
      "methodology": "Table A8 publishes Natural Gas at 49.44 g CO2e/MJ. CarbonLite stores the equivalent direct factor as 49.44 kg CO2e/GJ.",
      "confidenceLevel": "HIGH",
      "verified": false,
      "notes": "Canada-generic fallback estimate from ECCC Table A8. Not Alberta-specific, facility-specific, or compliance-certified.",
      "jurisdiction": "Canada (Generic)",
      "verificationStatus": "INTERNAL_REVIEW_REQUIRED",
      "applicability": "CORPORATE_INVENTORY",
      "emissionBasis": "DIRECT_CO2E",
      "methodologyProvenance": {
        "quantityBasis": "ENERGY_HHV",
        "sourceVersion": "ECCC_EPR_2025_TABLE_A8"
      }
    },
    {
      "id": "pilot-ground-transport-canada-2025",
      "organizationId": null,
      "name": "Ground Transport - Canada - 2025",
      "type": "EMISSION",
      "activityType": "GROUND_TRANSPORT",
      "region": null,
      "country": "Canada",
      "unit": "km",
      "factorValue": "0.2",
      "resultUnit": "kgCO2e",
      "sourceName": "CarbonLite",
      "sourceReference": "CarbonLite Pilot Ground Transport Estimate 2025",
      "effectiveFrom": null,
      "effectiveTo": null,
      "isDefault": true,
      "createdAt": "2026-07-22T15:18:48.321Z",
      "updatedAt": "2026-07-22T15:18:48.321Z",
      "isSystemDefault": true,
      "sourceAuthority": "CarbonLite",
      "sourceDocument": "CarbonLite Pilot Ground Transport Estimate 2025",
      "sourceYear": 2025,
      "sourceUrl": "https://carbonlite.ai/methodology/ground-transport-emissions",
      "methodology": "Estimated Scope 3 emissions for ground transport distance including taxi, rideshare, rental car, mileage, and local business travel. Used for pilot workflow validation only.",
      "confidenceLevel": "Pilot Estimate",
      "verified": false,
      "notes": "Pilot estimate for Scope 3 ground transport. Replace with a reviewed factor before formal reporting.",
      "jurisdiction": "Canada - National",
      "verificationStatus": "Internal Review Required",
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    }
  ],
  "Factor": [
    {
      "id": "demo-factor-air-travel",
      "activityType": "AIR_TRAVEL",
      "displayName": "Air travel",
      "category": "TRANSPORT",
      "scope": "Scope 3",
      "description": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "isSystem": true,
      "isActive": true,
      "createdAt": "2026-06-29T21:46:27.221Z",
      "updatedAt": "2026-06-29T21:46:27.221Z"
    },
    {
      "id": "demo-factor-air-travel-canada-generic",
      "activityType": "AIR_TRAVEL",
      "displayName": "Air travel",
      "category": "TRANSPORT",
      "scope": "Scope 3",
      "description": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "isSystem": true,
      "isActive": true,
      "createdAt": "2026-07-05T02:06:22.889Z",
      "updatedAt": "2026-07-22T15:18:47.626Z"
    },
    {
      "id": "demo-factor-diesel",
      "activityType": "DIESEL",
      "displayName": "Diesel combustion",
      "category": "FUEL",
      "scope": "Scope 1",
      "description": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "isSystem": true,
      "isActive": true,
      "createdAt": "2026-06-29T21:46:24.384Z",
      "updatedAt": "2026-06-29T21:46:24.384Z"
    },
    {
      "id": "demo-factor-diesel-canada-generic",
      "activityType": "DIESEL",
      "displayName": "Diesel combustion",
      "category": "FUEL",
      "scope": "Scope 1",
      "description": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "isSystem": true,
      "isActive": true,
      "createdAt": "2026-07-05T02:06:20.215Z",
      "updatedAt": "2026-07-22T15:18:45.105Z"
    },
    {
      "id": "demo-factor-electricity",
      "activityType": "ELECTRICITY",
      "displayName": "Electricity - Province Required",
      "category": "ELECTRICITY",
      "scope": "Scope 2",
      "description": "Placeholder electricity factor for pilot testing only.",
      "isSystem": true,
      "isActive": true,
      "createdAt": "2026-06-29T21:46:26.576Z",
      "updatedAt": "2026-07-22T15:18:49.823Z"
    },
    {
      "id": "demo-factor-electricity-alberta",
      "activityType": "ELECTRICITY",
      "displayName": "Electricity - Alberta",
      "category": "ELECTRICITY",
      "scope": "Scope 2",
      "description": "Placeholder electricity factor for pilot testing only.",
      "isSystem": true,
      "isActive": true,
      "createdAt": "2026-07-05T02:06:21.704Z",
      "updatedAt": "2026-07-22T15:18:46.499Z"
    },
    {
      "id": "demo-factor-electricity-british-columbia",
      "activityType": "ELECTRICITY",
      "displayName": "Electricity - British Columbia",
      "category": "ELECTRICITY",
      "scope": "Scope 2",
      "description": "Placeholder electricity factor for pilot testing only.",
      "isSystem": true,
      "isActive": true,
      "createdAt": "2026-07-05T02:06:22.162Z",
      "updatedAt": "2026-07-22T15:18:46.889Z"
    },
    {
      "id": "demo-factor-electricity-ontario",
      "activityType": "ELECTRICITY",
      "displayName": "Electricity - Ontario",
      "category": "ELECTRICITY",
      "scope": "Scope 2",
      "description": "Placeholder electricity factor for pilot testing only.",
      "isSystem": true,
      "isActive": true,
      "createdAt": "2026-07-05T02:06:22.516Z",
      "updatedAt": "2026-07-22T15:18:47.273Z"
    },
    {
      "id": "demo-factor-gasoline",
      "activityType": "GASOLINE",
      "displayName": "Gasoline combustion",
      "category": "FUEL",
      "scope": "Scope 1",
      "description": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "isSystem": true,
      "isActive": true,
      "createdAt": "2026-06-29T21:46:25.309Z",
      "updatedAt": "2026-06-29T21:46:25.309Z"
    },
    {
      "id": "demo-factor-gasoline-canada-generic",
      "activityType": "GASOLINE",
      "displayName": "Gasoline combustion",
      "category": "FUEL",
      "scope": "Scope 1",
      "description": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "isSystem": true,
      "isActive": true,
      "createdAt": "2026-07-05T02:06:20.802Z",
      "updatedAt": "2026-07-22T15:18:45.704Z"
    },
    {
      "id": "demo-factor-ground-transport-canada-national",
      "activityType": "GROUND_TRANSPORT",
      "displayName": "Ground Transport - Canada - 2025",
      "category": "TRANSPORT",
      "scope": "Scope 3",
      "description": "Pilot estimate for Scope 3 ground transport. Replace with a reviewed factor before formal reporting.",
      "isSystem": true,
      "isActive": true,
      "createdAt": "2026-07-22T15:18:48.552Z",
      "updatedAt": "2026-07-22T15:18:48.552Z"
    },
    {
      "id": "demo-factor-hotel",
      "activityType": "HOTEL",
      "displayName": "Hotel stays",
      "category": "HOTEL",
      "scope": "Scope 3",
      "description": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "isSystem": true,
      "isActive": true,
      "createdAt": "2026-06-29T21:46:27.805Z",
      "updatedAt": "2026-06-29T21:46:27.805Z"
    },
    {
      "id": "demo-factor-hotel-canada-generic",
      "activityType": "HOTEL",
      "displayName": "Hotel stays",
      "category": "HOTEL",
      "scope": "Scope 3",
      "description": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "isSystem": true,
      "isActive": true,
      "createdAt": "2026-07-05T02:06:23.278Z",
      "updatedAt": "2026-07-22T15:18:48.038Z"
    },
    {
      "id": "demo-factor-natural-gas",
      "activityType": "NATURAL_GAS",
      "displayName": "Natural gas combustion",
      "category": "NATURAL_GAS",
      "scope": "Scope 1",
      "description": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "isSystem": true,
      "isActive": true,
      "createdAt": "2026-06-29T21:46:25.956Z",
      "updatedAt": "2026-06-29T21:46:25.956Z"
    },
    {
      "id": "demo-factor-natural-gas-canada-generic",
      "activityType": "NATURAL_GAS",
      "displayName": "Natural gas combustion",
      "category": "NATURAL_GAS",
      "scope": "Scope 1",
      "description": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "isSystem": true,
      "isActive": true,
      "createdAt": "2026-07-05T02:06:21.179Z",
      "updatedAt": "2026-07-22T15:18:46.060Z"
    },
    {
      "id": "demo-factor-shipping",
      "activityType": "SHIPPING",
      "displayName": "Shipping",
      "category": "SHIPPING",
      "scope": "Scope 3",
      "description": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "isSystem": true,
      "isActive": true,
      "createdAt": "2026-06-29T21:46:28.422Z",
      "updatedAt": "2026-06-29T21:46:28.422Z"
    },
    {
      "id": "demo-factor-shipping-canada-generic",
      "activityType": "SHIPPING",
      "displayName": "Shipping",
      "category": "SHIPPING",
      "scope": "Scope 3",
      "description": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "isSystem": true,
      "isActive": true,
      "createdAt": "2026-07-05T02:06:23.630Z",
      "updatedAt": "2026-07-22T15:18:48.983Z"
    },
    {
      "id": "demo-factor-water",
      "activityType": "WATER",
      "displayName": "Water usage tracked only",
      "category": "WATER",
      "scope": null,
      "description": "Tracked metric with optional estimated emissions. Not intended for regulatory reporting.",
      "isSystem": true,
      "isActive": true,
      "createdAt": "2026-06-29T21:46:29.782Z",
      "updatedAt": "2026-06-29T21:46:29.782Z"
    },
    {
      "id": "demo-factor-water-canada-generic",
      "activityType": "WATER",
      "displayName": "Water usage tracked only",
      "category": "WATER",
      "scope": null,
      "description": "Tracked metric with optional estimated emissions. Not intended for regulatory reporting.",
      "isSystem": true,
      "isActive": true,
      "createdAt": "2026-07-05T02:06:24.007Z",
      "updatedAt": "2026-07-22T15:18:49.370Z"
    },
    {
      "id": "factor_31e22bf5d6388b74de7697ad833d98f7",
      "activityType": "DIESEL",
      "displayName": "Diesel emission factor",
      "category": "FUEL",
      "scope": "Scope 1",
      "description": null,
      "isSystem": false,
      "isActive": true,
      "createdAt": "2026-04-09T20:45:19.713Z",
      "updatedAt": "2026-05-11T16:24:11.980Z"
    },
    {
      "id": "factor_521f5c1938759e396246b36a5d390549",
      "activityType": "HOTEL",
      "displayName": "Hotel emission factor",
      "category": "HOTEL",
      "scope": null,
      "description": null,
      "isSystem": true,
      "isActive": true,
      "createdAt": "2026-05-13T21:26:17.121Z",
      "updatedAt": "2026-05-13T21:26:17.121Z"
    },
    {
      "id": "factor_672814aba889909bd5d07866bd654798",
      "activityType": "GASOLINE",
      "displayName": "Gasoline emission factor",
      "category": "FUEL",
      "scope": "Scope 1",
      "description": null,
      "isSystem": false,
      "isActive": true,
      "createdAt": "2026-05-11T14:13:41.124Z",
      "updatedAt": "2026-05-11T14:13:41.124Z"
    },
    {
      "id": "factor_6cfabb1d1b89150d7068d39d78bc57e8",
      "activityType": "NATURAL_GAS",
      "displayName": "Natural gas emission factor",
      "category": "NATURAL_GAS",
      "scope": "Scope 1",
      "description": null,
      "isSystem": false,
      "isActive": true,
      "createdAt": "2026-05-11T14:14:48.710Z",
      "updatedAt": "2026-05-11T14:14:48.710Z"
    },
    {
      "id": "factor_75785ad970cf55694f3dcaae0ce7f58a",
      "activityType": "ELECTRICITY",
      "displayName": "Electricity emission factor",
      "category": "ELECTRICITY",
      "scope": "Scope 2",
      "description": null,
      "isSystem": true,
      "isActive": true,
      "createdAt": "2026-05-13T21:26:17.121Z",
      "updatedAt": "2026-05-13T21:26:17.121Z"
    },
    {
      "id": "factor_7b915e8c1743a4c4e49b5b50fcd1e886",
      "activityType": "SHIPPING",
      "displayName": "Shipping emission factor",
      "category": "SHIPPING",
      "scope": null,
      "description": null,
      "isSystem": true,
      "isActive": true,
      "createdAt": "2026-05-13T21:26:17.121Z",
      "updatedAt": "2026-05-13T21:26:17.121Z"
    },
    {
      "id": "factor_815964abcf5a6f302fa662f3e588769a",
      "activityType": "HOTEL",
      "displayName": "Hotel stay emission factor",
      "category": "HOTEL",
      "scope": null,
      "description": null,
      "isSystem": false,
      "isActive": true,
      "createdAt": "2026-05-12T05:44:26.808Z",
      "updatedAt": "2026-05-12T05:44:26.808Z"
    },
    {
      "id": "factor_a4f3d2b5c2490ee5a530c3a0016a8a7f",
      "activityType": "SHIPPING",
      "displayName": "Freight shipping emission factor",
      "category": "SHIPPING",
      "scope": null,
      "description": null,
      "isSystem": false,
      "isActive": true,
      "createdAt": "2026-05-12T05:45:46.180Z",
      "updatedAt": "2026-05-12T05:45:46.180Z"
    },
    {
      "id": "factor_bc2cc7737bd439bd1c5654e57f97a543",
      "activityType": "ELECTRICITY",
      "displayName": "Alberta electricity emission factor",
      "category": "ELECTRICITY",
      "scope": "Scope 2",
      "description": null,
      "isSystem": false,
      "isActive": true,
      "createdAt": "2026-05-11T14:15:47.328Z",
      "updatedAt": "2026-05-11T14:15:47.328Z"
    },
    {
      "id": "factor_ca32b3fd962d671ee7a8285883081edb",
      "activityType": "AIR_TRAVEL",
      "displayName": "Air travel emission factor",
      "category": "TRANSPORT",
      "scope": null,
      "description": null,
      "isSystem": false,
      "isActive": true,
      "createdAt": "2026-05-11T23:11:56.401Z",
      "updatedAt": "2026-05-11T23:11:56.401Z"
    },
    {
      "id": "factor_ce17faff1ec82f34654f0c8a1c01db5a",
      "activityType": "WATER",
      "displayName": "Water",
      "category": "WATER",
      "scope": null,
      "description": "Estimated indirect emissions associated with municipal water treatment and distribution. Used for pilot workflow validation only.",
      "isSystem": false,
      "isActive": true,
      "createdAt": "2026-05-29T22:34:31.493Z",
      "updatedAt": "2026-05-30T04:48:05.501Z"
    }
  ],
  "FactorVersion": [
    {
      "id": "cmqzqzbba0001gdltz15zr6fj",
      "factorId": "demo-factor-diesel",
      "version": "demo-v1-liters",
      "factorValue": "2.68",
      "inputUnit": "liters",
      "resultUnit": "kgCO2e",
      "jurisdictionCountry": "Canada",
      "jurisdictionRegion": "Canada (Generic)",
      "factorYear": 2025,
      "effectiveFrom": null,
      "effectiveTo": null,
      "status": "DRAFT",
      "confidenceLevel": "DEMO",
      "sourceId": "system-source-diesel-liters-2025",
      "notes": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "createdAt": "2026-06-29T21:46:24.646Z",
      "updatedAt": "2026-06-29T21:46:24.646Z",
      "verified": false,
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNotes": "Internal review required before production use.",
      "approvalSource": null,
      "sourcePage": null,
      "sourceSection": null,
      "sourceTable": null,
      "sourceRow": null,
      "sourceColumn": null,
      "citationText": null,
      "methodology": "Used for pilot validation. Intended for demonstration workflows only. Replace with official ECCC or provincial emission factors before production reporting.",
      "verificationStatus": "Internal Review Required",
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "cmqzqzbwt0003gdltz5mch3pt",
      "factorId": "demo-factor-gasoline",
      "version": "demo-v1-liters",
      "factorValue": "2.31",
      "inputUnit": "liters",
      "resultUnit": "kgCO2e",
      "jurisdictionCountry": "Canada",
      "jurisdictionRegion": "Canada (Generic)",
      "factorYear": 2025,
      "effectiveFrom": null,
      "effectiveTo": null,
      "status": "DRAFT",
      "confidenceLevel": "DEMO",
      "sourceId": "system-source-gasoline-liters-2025",
      "notes": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "createdAt": "2026-06-29T21:46:25.421Z",
      "updatedAt": "2026-06-29T21:46:25.421Z",
      "verified": false,
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNotes": "Internal review required before production use.",
      "approvalSource": null,
      "sourcePage": null,
      "sourceSection": null,
      "sourceTable": null,
      "sourceRow": null,
      "sourceColumn": null,
      "citationText": null,
      "methodology": "Used for pilot validation. Intended for demonstration workflows only. Replace with official ECCC or provincial emission factors before production reporting.",
      "verificationStatus": "Internal Review Required",
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "cmqzqzcf40005gdltachk8elz",
      "factorId": "demo-factor-natural-gas",
      "version": "demo-v1-m3",
      "factorValue": "1.89",
      "inputUnit": "m3",
      "resultUnit": "kgCO2e",
      "jurisdictionCountry": "Canada",
      "jurisdictionRegion": "Canada (Generic)",
      "factorYear": 2025,
      "effectiveFrom": null,
      "effectiveTo": null,
      "status": "DRAFT",
      "confidenceLevel": "DEMO",
      "sourceId": "system-source-natural-gas-m3-2025",
      "notes": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "createdAt": "2026-06-29T21:46:26.080Z",
      "updatedAt": "2026-06-29T21:46:26.080Z",
      "verified": false,
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNotes": "Internal review required before production use.",
      "approvalSource": null,
      "sourcePage": null,
      "sourceSection": null,
      "sourceTable": null,
      "sourceRow": null,
      "sourceColumn": null,
      "citationText": null,
      "methodology": "Used for pilot validation. Intended for demonstration workflows only. Replace with official ECCC or provincial emission factors before production reporting.",
      "verificationStatus": "Internal Review Required",
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "cmqzqzcwf0007gdlttkgsf9u7",
      "factorId": "demo-factor-electricity",
      "version": "demo-2025-kwh",
      "factorValue": "0.02",
      "inputUnit": "kWh",
      "resultUnit": "kgCO2e",
      "jurisdictionCountry": "Canada",
      "jurisdictionRegion": "Province Required",
      "factorYear": 2025,
      "effectiveFrom": null,
      "effectiveTo": null,
      "status": "DRAFT",
      "confidenceLevel": "DEMO",
      "sourceId": "system-source-electricity-kwh-2025",
      "notes": "Placeholder electricity factor for pilot testing only.",
      "createdAt": "2026-06-29T21:46:26.703Z",
      "updatedAt": "2026-07-22T15:18:50.102Z",
      "verified": false,
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNotes": "Internal review required before production use.",
      "approvalSource": null,
      "sourcePage": null,
      "sourceSection": null,
      "sourceTable": null,
      "sourceRow": null,
      "sourceColumn": null,
      "citationText": null,
      "methodology": "Electricity emission factors vary by province. Replace with official provincial electricity factors before production use.",
      "verificationStatus": "Internal Review Required",
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "cmqzqzde80009gdlty02lj493",
      "factorId": "demo-factor-air-travel",
      "version": "demo-v1-km",
      "factorValue": "0.115",
      "inputUnit": "km",
      "resultUnit": "kgCO2e",
      "jurisdictionCountry": "Canada",
      "jurisdictionRegion": "Canada (Generic)",
      "factorYear": 2025,
      "effectiveFrom": null,
      "effectiveTo": null,
      "status": "DRAFT",
      "confidenceLevel": "DEMO",
      "sourceId": "system-source-air-travel-km-2025",
      "notes": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "createdAt": "2026-06-29T21:46:27.345Z",
      "updatedAt": "2026-06-29T21:46:27.345Z",
      "verified": false,
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNotes": "Internal review required before production use.",
      "approvalSource": null,
      "sourcePage": null,
      "sourceSection": null,
      "sourceTable": null,
      "sourceRow": null,
      "sourceColumn": null,
      "citationText": null,
      "methodology": "Used for pilot validation. Intended for demonstration workflows only. Replace with official ECCC or provincial emission factors before production reporting.",
      "verificationStatus": "Internal Review Required",
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "cmqzqzdu7000bgdltsshetyei",
      "factorId": "demo-factor-hotel",
      "version": "demo-v1-nights",
      "factorValue": "15",
      "inputUnit": "nights",
      "resultUnit": "kgCO2e",
      "jurisdictionCountry": "Canada",
      "jurisdictionRegion": "Canada (Generic)",
      "factorYear": 2025,
      "effectiveFrom": null,
      "effectiveTo": null,
      "status": "DRAFT",
      "confidenceLevel": "DEMO",
      "sourceId": "system-source-hotel-nights-2025",
      "notes": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "createdAt": "2026-06-29T21:46:27.919Z",
      "updatedAt": "2026-06-29T21:46:27.919Z",
      "verified": false,
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNotes": "Internal review required before production use.",
      "approvalSource": null,
      "sourcePage": null,
      "sourceSection": null,
      "sourceTable": null,
      "sourceRow": null,
      "sourceColumn": null,
      "citationText": null,
      "methodology": "Used for pilot validation. Intended for demonstration workflows only. Replace with official ECCC or provincial emission factors before production reporting.",
      "verificationStatus": "Internal Review Required",
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "cmqzqzebn000dgdltsb3lc5x4",
      "factorId": "demo-factor-shipping",
      "version": "demo-v1-ton-km",
      "factorValue": "0.09",
      "inputUnit": "ton-km",
      "resultUnit": "kgCO2e",
      "jurisdictionCountry": "Canada",
      "jurisdictionRegion": "Canada (Generic)",
      "factorYear": 2025,
      "effectiveFrom": null,
      "effectiveTo": null,
      "status": "DRAFT",
      "confidenceLevel": "DEMO",
      "sourceId": "system-source-shipping-ton-km-2025",
      "notes": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "createdAt": "2026-06-29T21:46:28.547Z",
      "updatedAt": "2026-06-29T21:46:28.547Z",
      "verified": false,
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNotes": "Internal review required before production use.",
      "approvalSource": null,
      "sourcePage": null,
      "sourceSection": null,
      "sourceTable": null,
      "sourceRow": null,
      "sourceColumn": null,
      "citationText": null,
      "methodology": "Used for pilot validation. Intended for demonstration workflows only. Replace with official ECCC or provincial emission factors before production reporting.",
      "verificationStatus": "Internal Review Required",
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "cmqzqzfdk000jgdltbtf1fwz5",
      "factorId": "demo-factor-water",
      "version": "demo-v1-m3",
      "factorValue": "0",
      "inputUnit": "m3",
      "resultUnit": "kgCO2e",
      "jurisdictionCountry": "Canada",
      "jurisdictionRegion": "Canada (Generic)",
      "factorYear": 2025,
      "effectiveFrom": null,
      "effectiveTo": null,
      "status": "DRAFT",
      "confidenceLevel": "DEMO",
      "sourceId": "system-source-water-m3-2025",
      "notes": "Tracked metric with optional estimated emissions. Not intended for regulatory reporting.",
      "createdAt": "2026-06-29T21:46:29.913Z",
      "updatedAt": "2026-06-29T21:46:29.913Z",
      "verified": false,
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNotes": "Internal review required before production use.",
      "approvalSource": null,
      "sourcePage": null,
      "sourceSection": null,
      "sourceTable": null,
      "sourceRow": null,
      "sourceColumn": null,
      "citationText": null,
      "methodology": "Estimated indirect emissions associated with municipal water treatment and distribution. Used for pilot workflow validation only.",
      "verificationStatus": "Internal Review Required",
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "cmr75gudi0001gdjb6zeliz8z",
      "factorId": "demo-factor-diesel-canada-generic",
      "version": "demo-2025-liters-canada-generic",
      "factorValue": "2.68",
      "inputUnit": "liters",
      "resultUnit": "kgCO2e",
      "jurisdictionCountry": "Canada",
      "jurisdictionRegion": "Canada (Generic)",
      "factorYear": 2025,
      "effectiveFrom": null,
      "effectiveTo": null,
      "status": "DRAFT",
      "confidenceLevel": "DEMO",
      "sourceId": "system-source-diesel-liters-2025-canada-generic",
      "notes": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "createdAt": "2026-07-05T02:06:20.358Z",
      "updatedAt": "2026-07-22T15:18:45.254Z",
      "verified": false,
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNotes": "Internal review required before production use.",
      "approvalSource": null,
      "sourcePage": null,
      "sourceSection": null,
      "sourceTable": null,
      "sourceRow": null,
      "sourceColumn": null,
      "citationText": null,
      "methodology": "Used for pilot validation. Intended for demonstration workflows only. Replace with official ECCC or provincial emission factors before production reporting.",
      "verificationStatus": "Internal Review Required",
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "cmr75gurs0003gdjbw3dg3r6g",
      "factorId": "demo-factor-gasoline-canada-generic",
      "version": "demo-2025-liters-canada-generic",
      "factorValue": "2.31",
      "inputUnit": "liters",
      "resultUnit": "kgCO2e",
      "jurisdictionCountry": "Canada",
      "jurisdictionRegion": "Canada (Generic)",
      "factorYear": 2025,
      "effectiveFrom": null,
      "effectiveTo": null,
      "status": "DRAFT",
      "confidenceLevel": "DEMO",
      "sourceId": "system-source-gasoline-liters-2025-canada-generic",
      "notes": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "createdAt": "2026-07-05T02:06:20.872Z",
      "updatedAt": "2026-07-22T15:18:45.775Z",
      "verified": false,
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNotes": "Internal review required before production use.",
      "approvalSource": null,
      "sourcePage": null,
      "sourceSection": null,
      "sourceTable": null,
      "sourceRow": null,
      "sourceColumn": null,
      "citationText": null,
      "methodology": "Used for pilot validation. Intended for demonstration workflows only. Replace with official ECCC or provincial emission factors before production reporting.",
      "verificationStatus": "Internal Review Required",
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "cmr75gv2j0005gdjbkrx1342n",
      "factorId": "demo-factor-natural-gas-canada-generic",
      "version": "demo-2025-m3-canada-generic",
      "factorValue": "1.89",
      "inputUnit": "m3",
      "resultUnit": "kgCO2e",
      "jurisdictionCountry": "Canada",
      "jurisdictionRegion": "Canada (Generic)",
      "factorYear": 2025,
      "effectiveFrom": null,
      "effectiveTo": null,
      "status": "DRAFT",
      "confidenceLevel": "DEMO",
      "sourceId": "system-source-natural-gas-m3-2025-canada-generic",
      "notes": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "createdAt": "2026-07-05T02:06:21.259Z",
      "updatedAt": "2026-07-22T15:18:46.216Z",
      "verified": false,
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNotes": "Internal review required before production use.",
      "approvalSource": null,
      "sourcePage": null,
      "sourceSection": null,
      "sourceTable": null,
      "sourceRow": null,
      "sourceColumn": null,
      "citationText": null,
      "methodology": "Used for pilot validation. Intended for demonstration workflows only. Replace with official ECCC or provincial emission factors before production reporting.",
      "verificationStatus": "Internal Review Required",
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "cmr75gvgt0009gdjbmhpv7zdd",
      "factorId": "demo-factor-electricity-alberta",
      "version": "demo-2025-kwh-alberta",
      "factorValue": "0.53",
      "inputUnit": "kWh",
      "resultUnit": "kgCO2e",
      "jurisdictionCountry": "Canada",
      "jurisdictionRegion": "Alberta",
      "factorYear": 2025,
      "effectiveFrom": null,
      "effectiveTo": null,
      "status": "DRAFT",
      "confidenceLevel": "DEMO",
      "sourceId": "system-source-electricity-kwh-2025-alberta",
      "notes": "Placeholder electricity factor for pilot testing only.",
      "createdAt": "2026-07-05T02:06:21.774Z",
      "updatedAt": "2026-07-22T15:18:46.570Z",
      "verified": false,
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNotes": "Internal review required before production use.",
      "approvalSource": null,
      "sourcePage": null,
      "sourceSection": null,
      "sourceTable": null,
      "sourceRow": null,
      "sourceColumn": null,
      "citationText": null,
      "methodology": "Electricity emission factors vary by province. Replace with official provincial electricity factors before production use.",
      "verificationStatus": "Internal Review Required",
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "cmr75gvtr000dgdjb9a5pu2vf",
      "factorId": "demo-factor-electricity-british-columbia",
      "version": "demo-2025-kwh-british-columbia",
      "factorValue": "0.02",
      "inputUnit": "kWh",
      "resultUnit": "kgCO2e",
      "jurisdictionCountry": "Canada",
      "jurisdictionRegion": "British Columbia",
      "factorYear": 2025,
      "effectiveFrom": null,
      "effectiveTo": null,
      "status": "DRAFT",
      "confidenceLevel": "DEMO",
      "sourceId": "system-source-electricity-kwh-2025-british-columbia",
      "notes": "Placeholder electricity factor for pilot testing only.",
      "createdAt": "2026-07-05T02:06:22.239Z",
      "updatedAt": "2026-07-22T15:18:46.962Z",
      "verified": false,
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNotes": "Internal review required before production use.",
      "approvalSource": null,
      "sourcePage": null,
      "sourceSection": null,
      "sourceTable": null,
      "sourceRow": null,
      "sourceColumn": null,
      "citationText": null,
      "methodology": "Electricity emission factors vary by province. Replace with official provincial electricity factors before production use.",
      "verificationStatus": "Internal Review Required",
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "cmr75gw3g000hgdjbkp93dtvt",
      "factorId": "demo-factor-electricity-ontario",
      "version": "demo-2025-kwh-ontario",
      "factorValue": "0.12",
      "inputUnit": "kWh",
      "resultUnit": "kgCO2e",
      "jurisdictionCountry": "Canada",
      "jurisdictionRegion": "Ontario",
      "factorYear": 2025,
      "effectiveFrom": null,
      "effectiveTo": null,
      "status": "DRAFT",
      "confidenceLevel": "DEMO",
      "sourceId": "system-source-electricity-kwh-2025-ontario",
      "notes": "Placeholder electricity factor for pilot testing only.",
      "createdAt": "2026-07-05T02:06:22.589Z",
      "updatedAt": "2026-07-22T15:18:47.344Z",
      "verified": false,
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNotes": "Internal review required before production use.",
      "approvalSource": null,
      "sourcePage": null,
      "sourceSection": null,
      "sourceTable": null,
      "sourceRow": null,
      "sourceColumn": null,
      "citationText": null,
      "methodology": "Electricity emission factors vary by province. Replace with official provincial electricity factors before production use.",
      "verificationStatus": "Internal Review Required",
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "cmr75gwdq000jgdjbr50tve1l",
      "factorId": "demo-factor-air-travel-canada-generic",
      "version": "demo-2025-km-canada-generic",
      "factorValue": "0.115",
      "inputUnit": "km",
      "resultUnit": "kgCO2e",
      "jurisdictionCountry": "Canada",
      "jurisdictionRegion": "Canada (Generic)",
      "factorYear": 2025,
      "effectiveFrom": null,
      "effectiveTo": null,
      "status": "DRAFT",
      "confidenceLevel": "DEMO",
      "sourceId": "system-source-air-travel-km-2025-canada-generic",
      "notes": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "createdAt": "2026-07-05T02:06:22.958Z",
      "updatedAt": "2026-07-22T15:18:47.728Z",
      "verified": false,
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNotes": "Internal review required before production use.",
      "approvalSource": null,
      "sourcePage": null,
      "sourceSection": null,
      "sourceTable": null,
      "sourceRow": null,
      "sourceColumn": null,
      "citationText": null,
      "methodology": "Used for pilot validation. Intended for demonstration workflows only. Replace with official ECCC or provincial emission factors before production reporting.",
      "verificationStatus": "Internal Review Required",
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "cmr75gwok000lgdjbcqs43scq",
      "factorId": "demo-factor-hotel-canada-generic",
      "version": "demo-2025-nights-canada-generic",
      "factorValue": "15",
      "inputUnit": "nights",
      "resultUnit": "kgCO2e",
      "jurisdictionCountry": "Canada",
      "jurisdictionRegion": "Canada (Generic)",
      "factorYear": 2025,
      "effectiveFrom": null,
      "effectiveTo": null,
      "status": "DRAFT",
      "confidenceLevel": "DEMO",
      "sourceId": "system-source-hotel-nights-2025-canada-generic",
      "notes": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "createdAt": "2026-07-05T02:06:23.348Z",
      "updatedAt": "2026-07-22T15:18:48.116Z",
      "verified": false,
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNotes": "Internal review required before production use.",
      "approvalSource": null,
      "sourcePage": null,
      "sourceSection": null,
      "sourceTable": null,
      "sourceRow": null,
      "sourceColumn": null,
      "citationText": null,
      "methodology": "Used for pilot validation. Intended for demonstration workflows only. Replace with official ECCC or provincial emission factors before production reporting.",
      "verificationStatus": "Internal Review Required",
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "cmr75gwz9000ngdjbf438bcx9",
      "factorId": "demo-factor-shipping-canada-generic",
      "version": "demo-2025-ton-km-canada-generic",
      "factorValue": "0.09",
      "inputUnit": "ton-km",
      "resultUnit": "kgCO2e",
      "jurisdictionCountry": "Canada",
      "jurisdictionRegion": "Canada (Generic)",
      "factorYear": 2025,
      "effectiveFrom": null,
      "effectiveTo": null,
      "status": "DRAFT",
      "confidenceLevel": "DEMO",
      "sourceId": "system-source-shipping-ton-km-2025-canada-generic",
      "notes": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "createdAt": "2026-07-05T02:06:23.733Z",
      "updatedAt": "2026-07-22T15:18:49.054Z",
      "verified": false,
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNotes": "Internal review required before production use.",
      "approvalSource": null,
      "sourcePage": null,
      "sourceSection": null,
      "sourceTable": null,
      "sourceRow": null,
      "sourceColumn": null,
      "citationText": null,
      "methodology": "Used for pilot validation. Intended for demonstration workflows only. Replace with official ECCC or provincial emission factors before production reporting.",
      "verificationStatus": "Internal Review Required",
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "cmr75gx8w000pgdjb2ztwpnpx",
      "factorId": "demo-factor-water-canada-generic",
      "version": "demo-2025-m3-canada-generic",
      "factorValue": "0",
      "inputUnit": "m3",
      "resultUnit": "kgCO2e",
      "jurisdictionCountry": "Canada",
      "jurisdictionRegion": "Canada (Generic)",
      "factorYear": 2025,
      "effectiveFrom": null,
      "effectiveTo": null,
      "status": "DRAFT",
      "confidenceLevel": "DEMO",
      "sourceId": "system-source-water-m3-2025-canada-generic",
      "notes": "Tracked metric with optional estimated emissions. Not intended for regulatory reporting.",
      "createdAt": "2026-07-05T02:06:24.080Z",
      "updatedAt": "2026-07-22T15:18:49.442Z",
      "verified": false,
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNotes": "Internal review required before production use.",
      "approvalSource": null,
      "sourcePage": null,
      "sourceSection": null,
      "sourceTable": null,
      "sourceRow": null,
      "sourceColumn": null,
      "citationText": null,
      "methodology": "Estimated indirect emissions associated with municipal water treatment and distribution. Used for pilot workflow validation only.",
      "verificationStatus": "Internal Review Required",
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "cmrw89g75000hgdyd4g30s8bm",
      "factorId": "demo-factor-ground-transport-canada-national",
      "version": "demo-2025-km-canada-national",
      "factorValue": "0.2",
      "inputUnit": "km",
      "resultUnit": "kgCO2e",
      "jurisdictionCountry": "Canada",
      "jurisdictionRegion": "Canada - National",
      "factorYear": 2025,
      "effectiveFrom": null,
      "effectiveTo": null,
      "status": "DRAFT",
      "confidenceLevel": "DEMO",
      "sourceId": "system-source-ground-transport-km-2025-canada-national",
      "notes": "Pilot estimate for Scope 3 ground transport. Replace with a reviewed factor before formal reporting.",
      "createdAt": "2026-07-22T15:18:48.641Z",
      "updatedAt": "2026-07-22T15:18:48.641Z",
      "verified": false,
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNotes": "Internal review required before production use.",
      "approvalSource": null,
      "sourcePage": null,
      "sourceSection": null,
      "sourceTable": null,
      "sourceRow": null,
      "sourceColumn": null,
      "citationText": null,
      "methodology": "Estimated Scope 3 emissions for ground transport distance including taxi, rideshare, rental car, mileage, and local business travel. Used for pilot workflow validation only.",
      "verificationStatus": "Internal Review Required",
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "factor_version_41eba184d6c179b71942506a65b4bc90",
      "factorId": "factor_ce17faff1ec82f34654f0c8a1c01db5a",
      "version": "v1-41eba184",
      "factorValue": "0.35",
      "inputUnit": "m3",
      "resultUnit": "kgCO2e",
      "jurisdictionCountry": null,
      "jurisdictionRegion": null,
      "factorYear": 2026,
      "effectiveFrom": null,
      "effectiveTo": null,
      "status": "DRAFT",
      "confidenceLevel": "DEMO",
      "sourceId": "source_c0976ad7b3b3d528980bf86aa33b0628",
      "notes": "Demo factor. Verify before client or regulatory reporting.",
      "createdAt": "2026-05-29T22:34:31.493Z",
      "updatedAt": "2026-05-30T04:48:05.501Z",
      "verified": false,
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNotes": null,
      "approvalSource": null,
      "sourcePage": null,
      "sourceSection": null,
      "sourceTable": null,
      "sourceRow": null,
      "sourceColumn": null,
      "citationText": null,
      "methodology": null,
      "verificationStatus": null,
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "factor_version_456d27103da9d2d8701a84760d27216a",
      "factorId": "factor_ca32b3fd962d671ee7a8285883081edb",
      "version": "v1-456d2710",
      "factorValue": "0.115",
      "inputUnit": "km",
      "resultUnit": "kgCO2e",
      "jurisdictionCountry": null,
      "jurisdictionRegion": null,
      "factorYear": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "status": "DRAFT",
      "confidenceLevel": "DEMO",
      "sourceId": "source_aa70d88a99fd705842ed54dacfc378c3",
      "notes": "Demo factor. Verify before client or regulatory reporting.",
      "createdAt": "2026-05-13T21:26:17.121Z",
      "updatedAt": "2026-05-13T21:26:17.121Z",
      "verified": false,
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNotes": null,
      "approvalSource": null,
      "sourcePage": null,
      "sourceSection": null,
      "sourceTable": null,
      "sourceRow": null,
      "sourceColumn": null,
      "citationText": null,
      "methodology": null,
      "verificationStatus": null,
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "factor_version_4f56b437b9e87bcceaf38f1b843bb1cc",
      "factorId": "factor_815964abcf5a6f302fa662f3e588769a",
      "version": "v1-4f56b437",
      "factorValue": "15",
      "inputUnit": "nights",
      "resultUnit": "kgCO2e",
      "jurisdictionCountry": null,
      "jurisdictionRegion": null,
      "factorYear": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "status": "DRAFT",
      "confidenceLevel": "DEMO",
      "sourceId": "source_f6fe4ca95a1a1b4ba95432dd5e5b2ead",
      "notes": "Demo factor. Verify before client or regulatory reporting.",
      "createdAt": "2026-05-12T05:44:26.808Z",
      "updatedAt": "2026-05-12T05:44:26.808Z",
      "verified": false,
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNotes": null,
      "approvalSource": null,
      "sourcePage": null,
      "sourceSection": null,
      "sourceTable": null,
      "sourceRow": null,
      "sourceColumn": null,
      "citationText": null,
      "methodology": null,
      "verificationStatus": null,
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "factor_version_54423760a3fec03379308e80ab056961",
      "factorId": "factor_a4f3d2b5c2490ee5a530c3a0016a8a7f",
      "version": "v1-54423760",
      "factorValue": "0.09",
      "inputUnit": "ton-km",
      "resultUnit": "kgCO2e",
      "jurisdictionCountry": null,
      "jurisdictionRegion": null,
      "factorYear": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "status": "DRAFT",
      "confidenceLevel": "DEMO",
      "sourceId": "source_474dccf3aed31b4bf851913665f8ad73",
      "notes": "Demo factor. Verify before client or regulatory reporting.",
      "createdAt": "2026-05-12T05:45:46.180Z",
      "updatedAt": "2026-05-12T05:45:46.180Z",
      "verified": false,
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNotes": null,
      "approvalSource": null,
      "sourcePage": null,
      "sourceSection": null,
      "sourceTable": null,
      "sourceRow": null,
      "sourceColumn": null,
      "citationText": null,
      "methodology": null,
      "verificationStatus": null,
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "factor_version_6539de3878db6487936afc87baac2162",
      "factorId": "factor_75785ad970cf55694f3dcaae0ce7f58a",
      "version": "v1-6539de38",
      "factorValue": "0.53",
      "inputUnit": "kWh",
      "resultUnit": "kgCO2e",
      "jurisdictionCountry": "Canada",
      "jurisdictionRegion": "Province Required",
      "factorYear": 2025,
      "effectiveFrom": null,
      "effectiveTo": null,
      "status": "DRAFT",
      "confidenceLevel": "DEMO",
      "sourceId": "source_aa70d88a99fd705842ed54dacfc378c3",
      "notes": "Placeholder electricity factor for pilot testing only.",
      "createdAt": "2026-05-13T21:26:17.121Z",
      "updatedAt": "2026-05-13T21:26:17.121Z",
      "verified": false,
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNotes": "Internal review required before production use.",
      "approvalSource": null,
      "sourcePage": null,
      "sourceSection": null,
      "sourceTable": null,
      "sourceRow": null,
      "sourceColumn": null,
      "citationText": null,
      "methodology": "Electricity emission factors vary by province. Replace with official provincial electricity factors before production use.",
      "verificationStatus": "Internal Review Required",
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "factor_version_79e1eb87a31b617a89402b9fa6c03e36",
      "factorId": "factor_7b915e8c1743a4c4e49b5b50fcd1e886",
      "version": "v1-79e1eb87",
      "factorValue": "0.09",
      "inputUnit": "ton-km",
      "resultUnit": "kgCO2e",
      "jurisdictionCountry": null,
      "jurisdictionRegion": null,
      "factorYear": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "status": "DRAFT",
      "confidenceLevel": "DEMO",
      "sourceId": "source_aa70d88a99fd705842ed54dacfc378c3",
      "notes": "Demo factor. Verify before client or regulatory reporting.",
      "createdAt": "2026-05-13T21:26:17.121Z",
      "updatedAt": "2026-05-13T21:26:17.121Z",
      "verified": false,
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNotes": null,
      "approvalSource": null,
      "sourcePage": null,
      "sourceSection": null,
      "sourceTable": null,
      "sourceRow": null,
      "sourceColumn": null,
      "citationText": null,
      "methodology": null,
      "verificationStatus": null,
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "factor_version_7d557bb25c4190b4f005bc4bc7c90fa4",
      "factorId": "factor_bc2cc7737bd439bd1c5654e57f97a543",
      "version": "v1-7d557bb2",
      "factorValue": "0.53",
      "inputUnit": "kWh",
      "resultUnit": "kgCO2e",
      "jurisdictionCountry": null,
      "jurisdictionRegion": null,
      "factorYear": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "status": "DRAFT",
      "confidenceLevel": "DEMO",
      "sourceId": "source_7e7a03a779e076dcd07211a7fe59adbc",
      "notes": "Demo factor. Verify before client or regulatory reporting.",
      "createdAt": "2026-05-11T14:15:47.328Z",
      "updatedAt": "2026-05-11T14:15:47.328Z",
      "verified": false,
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNotes": null,
      "approvalSource": null,
      "sourcePage": null,
      "sourceSection": null,
      "sourceTable": null,
      "sourceRow": null,
      "sourceColumn": null,
      "citationText": null,
      "methodology": null,
      "verificationStatus": null,
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "factor_version_83ff331ba2fe8cfb05cb0727bdfd3c55",
      "factorId": "factor_672814aba889909bd5d07866bd654798",
      "version": "v1-83ff331b",
      "factorValue": "2.31",
      "inputUnit": "liters",
      "resultUnit": "kgCO2e",
      "jurisdictionCountry": null,
      "jurisdictionRegion": null,
      "factorYear": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "status": "DRAFT",
      "confidenceLevel": "DEMO",
      "sourceId": "source_852e60b57bff7d69bddd2f996bfa22c2",
      "notes": "Demo factor. Verify before client or regulatory reporting.",
      "createdAt": "2026-05-11T14:13:41.124Z",
      "updatedAt": "2026-05-11T14:13:41.124Z",
      "verified": false,
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNotes": null,
      "approvalSource": null,
      "sourcePage": null,
      "sourceSection": null,
      "sourceTable": null,
      "sourceRow": null,
      "sourceColumn": null,
      "citationText": null,
      "methodology": null,
      "verificationStatus": null,
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "factor_version_865088c36de4afb626950e42928af21f",
      "factorId": "factor_6cfabb1d1b89150d7068d39d78bc57e8",
      "version": "v1-865088c3",
      "factorValue": "1.89",
      "inputUnit": "m3",
      "resultUnit": "kgCO2e",
      "jurisdictionCountry": null,
      "jurisdictionRegion": null,
      "factorYear": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "status": "DRAFT",
      "confidenceLevel": "DEMO",
      "sourceId": "source_aa70d88a99fd705842ed54dacfc378c3",
      "notes": "Demo factor. Verify before client or regulatory reporting.",
      "createdAt": "2026-05-13T21:26:17.121Z",
      "updatedAt": "2026-05-13T21:26:17.121Z",
      "verified": false,
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNotes": null,
      "approvalSource": null,
      "sourcePage": null,
      "sourceSection": null,
      "sourceTable": null,
      "sourceRow": null,
      "sourceColumn": null,
      "citationText": null,
      "methodology": null,
      "verificationStatus": null,
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "factor_version_94e43c1a90bff4ebf7a8d03fef362510",
      "factorId": "factor_31e22bf5d6388b74de7697ad833d98f7",
      "version": "v1-94e43c1a",
      "factorValue": "2.68",
      "inputUnit": "liters",
      "resultUnit": "kgCO2e",
      "jurisdictionCountry": null,
      "jurisdictionRegion": null,
      "factorYear": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "status": "DRAFT",
      "confidenceLevel": "DEMO",
      "sourceId": "source_62054368b7bb755b9a7d892b9daf4e14",
      "notes": "Demo factor. Verify before client or regulatory reporting.",
      "createdAt": "2026-04-09T20:45:19.713Z",
      "updatedAt": "2026-05-11T16:24:11.980Z",
      "verified": false,
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNotes": null,
      "approvalSource": null,
      "sourcePage": null,
      "sourceSection": null,
      "sourceTable": null,
      "sourceRow": null,
      "sourceColumn": null,
      "citationText": null,
      "methodology": null,
      "verificationStatus": null,
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "factor_version_ab681278627dfc51882aa3ee936d3017",
      "factorId": "factor_31e22bf5d6388b74de7697ad833d98f7",
      "version": "v1-ab681278",
      "factorValue": "2.68",
      "inputUnit": "liters",
      "resultUnit": "kgCO2e",
      "jurisdictionCountry": null,
      "jurisdictionRegion": null,
      "factorYear": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "status": "DRAFT",
      "confidenceLevel": "DEMO",
      "sourceId": "source_aa70d88a99fd705842ed54dacfc378c3",
      "notes": "Demo factor. Verify before client or regulatory reporting.",
      "createdAt": "2026-05-13T21:26:17.121Z",
      "updatedAt": "2026-05-13T21:26:17.121Z",
      "verified": false,
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNotes": null,
      "approvalSource": null,
      "sourcePage": null,
      "sourceSection": null,
      "sourceTable": null,
      "sourceRow": null,
      "sourceColumn": null,
      "citationText": null,
      "methodology": null,
      "verificationStatus": null,
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "factor_version_c75bdf165fbfb398e0fe2446f47450e9",
      "factorId": "factor_521f5c1938759e396246b36a5d390549",
      "version": "v1-c75bdf16",
      "factorValue": "15",
      "inputUnit": "nights",
      "resultUnit": "kgCO2e",
      "jurisdictionCountry": null,
      "jurisdictionRegion": null,
      "factorYear": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "status": "DRAFT",
      "confidenceLevel": "DEMO",
      "sourceId": "source_aa70d88a99fd705842ed54dacfc378c3",
      "notes": "Demo factor. Verify before client or regulatory reporting.",
      "createdAt": "2026-05-13T21:26:17.121Z",
      "updatedAt": "2026-05-13T21:26:17.121Z",
      "verified": false,
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNotes": null,
      "approvalSource": null,
      "sourcePage": null,
      "sourceSection": null,
      "sourceTable": null,
      "sourceRow": null,
      "sourceColumn": null,
      "citationText": null,
      "methodology": null,
      "verificationStatus": null,
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "factor_version_d4ef855af7ae2af1731b9618677e3a8b",
      "factorId": "factor_6cfabb1d1b89150d7068d39d78bc57e8",
      "version": "v1-d4ef855a",
      "factorValue": "1.89",
      "inputUnit": "m3",
      "resultUnit": "kgCO2e",
      "jurisdictionCountry": null,
      "jurisdictionRegion": null,
      "factorYear": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "status": "DRAFT",
      "confidenceLevel": "DEMO",
      "sourceId": "source_614f914d21439eece1d12ea855083c76",
      "notes": "Demo factor. Verify before client or regulatory reporting.",
      "createdAt": "2026-05-11T14:14:48.710Z",
      "updatedAt": "2026-05-11T14:14:48.710Z",
      "verified": false,
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNotes": null,
      "approvalSource": null,
      "sourcePage": null,
      "sourceSection": null,
      "sourceTable": null,
      "sourceRow": null,
      "sourceColumn": null,
      "citationText": null,
      "methodology": null,
      "verificationStatus": null,
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "factor_version_dc505ba9628140a8887f4c0f37ee31de",
      "factorId": "factor_672814aba889909bd5d07866bd654798",
      "version": "v1-dc505ba9",
      "factorValue": "2.31",
      "inputUnit": "liters",
      "resultUnit": "kgCO2e",
      "jurisdictionCountry": null,
      "jurisdictionRegion": null,
      "factorYear": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "status": "DRAFT",
      "confidenceLevel": "DEMO",
      "sourceId": "source_aa70d88a99fd705842ed54dacfc378c3",
      "notes": "Demo factor. Verify before client or regulatory reporting.",
      "createdAt": "2026-05-13T21:26:17.121Z",
      "updatedAt": "2026-05-13T21:26:17.121Z",
      "verified": false,
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNotes": null,
      "approvalSource": null,
      "sourcePage": null,
      "sourceSection": null,
      "sourceTable": null,
      "sourceRow": null,
      "sourceColumn": null,
      "citationText": null,
      "methodology": null,
      "verificationStatus": null,
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    },
    {
      "id": "factor_version_e613689a131a714ca9dfa79a7097fdfe",
      "factorId": "factor_ca32b3fd962d671ee7a8285883081edb",
      "version": "v1-e613689a",
      "factorValue": "0.115",
      "inputUnit": "km",
      "resultUnit": "kgCO2e",
      "jurisdictionCountry": null,
      "jurisdictionRegion": null,
      "factorYear": null,
      "effectiveFrom": null,
      "effectiveTo": null,
      "status": "DRAFT",
      "confidenceLevel": "DEMO",
      "sourceId": "source_0df6dae2ab953ff6d5974265655a1c37",
      "notes": "Demo factor. Verify before client or regulatory reporting.",
      "createdAt": "2026-05-11T23:11:56.401Z",
      "updatedAt": "2026-05-11T23:11:56.401Z",
      "verified": false,
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNotes": null,
      "approvalSource": null,
      "sourcePage": null,
      "sourceSection": null,
      "sourceTable": null,
      "sourceRow": null,
      "sourceColumn": null,
      "citationText": null,
      "methodology": null,
      "verificationStatus": null,
      "applicability": null,
      "emissionBasis": null,
      "methodologyProvenance": null
    }
  ],
  "FactorSource": [
    {
      "id": "official-source-eccc-2025-emission-factors-reference-values",
      "sourceAuthority": "Environment and Climate Change Canada",
      "sourceDocument": "Emission Factors and Reference Values",
      "sourceVersion": "2025",
      "sourceYear": 2025,
      "sourceUrl": "https://publications.gc.ca/collections/collection_2025/eccc/En84-294-2025-eng.pdf",
      "sourcePage": null,
      "sourceTable": null,
      "publishedDate": "2025-01-01T00:00:00.000Z",
      "notes": "Seeded source only. CarbonLite does not mark existing demo factor values as official unless manually verified against the publication.",
      "createdAt": "2026-06-29T21:46:23.486Z",
      "updatedAt": "2026-07-22T15:18:44.484Z",
      "page": "",
      "tableReference": "",
      "sourceShortName": "ECCC",
      "country": "Canada",
      "jurisdictionRegion": "Canada",
      "publisherType": "GOVERNMENT",
      "description": "Official source registry entry for ECCC 2025 emission factors and reference values. Factor values must still be reviewed before being marked verified.",
      "isOfficial": true,
      "isActive": true
    },
    {
      "id": "source_0df6dae2ab953ff6d5974265655a1c37",
      "sourceAuthority": "DEFRA",
      "sourceDocument": "flight-factor-2025",
      "sourceVersion": "",
      "sourceYear": 0,
      "sourceUrl": "",
      "sourcePage": null,
      "sourceTable": null,
      "publishedDate": "2026-06-27T22:53:16.971Z",
      "notes": "Demo factor. Verify before client or regulatory reporting.",
      "createdAt": "2026-06-27T22:53:16.971Z",
      "updatedAt": "2026-06-27T22:53:16.971Z",
      "page": "",
      "tableReference": "",
      "sourceShortName": null,
      "country": null,
      "jurisdictionRegion": null,
      "publisherType": "UNKNOWN",
      "description": null,
      "isOfficial": false,
      "isActive": true
    },
    {
      "id": "source_474dccf3aed31b4bf851913665f8ad73",
      "sourceAuthority": "EPA",
      "sourceDocument": "freight-factor-2025",
      "sourceVersion": "",
      "sourceYear": 0,
      "sourceUrl": "",
      "sourcePage": null,
      "sourceTable": null,
      "publishedDate": "2026-06-27T22:53:16.971Z",
      "notes": "Demo factor. Verify before client or regulatory reporting.",
      "createdAt": "2026-06-27T22:53:16.971Z",
      "updatedAt": "2026-06-27T22:53:16.971Z",
      "page": "",
      "tableReference": "",
      "sourceShortName": null,
      "country": null,
      "jurisdictionRegion": null,
      "publisherType": "UNKNOWN",
      "description": null,
      "isOfficial": false,
      "isActive": true
    },
    {
      "id": "source_614f914d21439eece1d12ea855083c76",
      "sourceAuthority": "Environment Canada",
      "sourceDocument": "natural-gas-standard-2025",
      "sourceVersion": "",
      "sourceYear": 0,
      "sourceUrl": "",
      "sourcePage": null,
      "sourceTable": null,
      "publishedDate": "2026-06-27T22:53:16.971Z",
      "notes": "Demo factor. Verify before client or regulatory reporting.",
      "createdAt": "2026-06-27T22:53:16.971Z",
      "updatedAt": "2026-06-27T22:53:16.971Z",
      "page": "",
      "tableReference": "",
      "sourceShortName": null,
      "country": null,
      "jurisdictionRegion": null,
      "publisherType": "UNKNOWN",
      "description": null,
      "isOfficial": false,
      "isActive": true
    },
    {
      "id": "source_62054368b7bb755b9a7d892b9daf4e14",
      "sourceAuthority": "Manual test factor",
      "sourceDocument": "diesel-standard-2025",
      "sourceVersion": "",
      "sourceYear": 0,
      "sourceUrl": "",
      "sourcePage": null,
      "sourceTable": null,
      "publishedDate": "2026-06-27T22:53:16.971Z",
      "notes": "Demo factor. Verify before client or regulatory reporting.",
      "createdAt": "2026-06-27T22:53:16.971Z",
      "updatedAt": "2026-06-27T22:53:16.971Z",
      "page": "",
      "tableReference": "",
      "sourceShortName": null,
      "country": null,
      "jurisdictionRegion": null,
      "publisherType": "UNKNOWN",
      "description": null,
      "isOfficial": false,
      "isActive": true
    },
    {
      "id": "source_7e7a03a779e076dcd07211a7fe59adbc",
      "sourceAuthority": "Alberta Grid Factor",
      "sourceDocument": "alberta-grid-2025",
      "sourceVersion": "",
      "sourceYear": 0,
      "sourceUrl": "",
      "sourcePage": null,
      "sourceTable": null,
      "publishedDate": "2026-06-27T22:53:16.971Z",
      "notes": "Demo factor. Verify before client or regulatory reporting.",
      "createdAt": "2026-06-27T22:53:16.971Z",
      "updatedAt": "2026-06-27T22:53:16.971Z",
      "page": "",
      "tableReference": "",
      "sourceShortName": null,
      "country": null,
      "jurisdictionRegion": null,
      "publisherType": "UNKNOWN",
      "description": null,
      "isOfficial": false,
      "isActive": true
    },
    {
      "id": "source_852e60b57bff7d69bddd2f996bfa22c2",
      "sourceAuthority": "Environment Canada",
      "sourceDocument": "gasoline-standard-2025",
      "sourceVersion": "",
      "sourceYear": 0,
      "sourceUrl": "",
      "sourcePage": null,
      "sourceTable": null,
      "publishedDate": "2026-06-27T22:53:16.971Z",
      "notes": "Demo factor. Verify before client or regulatory reporting.",
      "createdAt": "2026-06-27T22:53:16.971Z",
      "updatedAt": "2026-06-27T22:53:16.971Z",
      "page": "",
      "tableReference": "",
      "sourceShortName": null,
      "country": null,
      "jurisdictionRegion": null,
      "publisherType": "UNKNOWN",
      "description": null,
      "isOfficial": false,
      "isActive": true
    },
    {
      "id": "source_aa70d88a99fd705842ed54dacfc378c3",
      "sourceAuthority": "CarbonLite System Defaults",
      "sourceDocument": "CarbonLite Default Factor Library v1.0",
      "sourceVersion": "v1.0",
      "sourceYear": 2025,
      "sourceUrl": "https://carbonlite.ai/methodology/default-factors",
      "sourcePage": null,
      "sourceTable": null,
      "publishedDate": "2026-06-27T22:53:16.971Z",
      "notes": "System default metadata. Verify applicable official factors before client or regulatory reporting.",
      "createdAt": "2026-06-27T22:53:16.971Z",
      "updatedAt": "2026-06-27T22:53:16.971Z",
      "page": "",
      "tableReference": "",
      "sourceShortName": "CarbonLite",
      "country": "Canada",
      "jurisdictionRegion": "Province Required",
      "publisherType": "CUSTOM",
      "description": "CarbonLite MVP system factor metadata for pilot workflow validation.",
      "isOfficial": false,
      "isActive": true
    },
    {
      "id": "source_c0976ad7b3b3d528980bf86aa33b0628",
      "sourceAuthority": "CarbonLite Pilot Methodology",
      "sourceDocument": "Water Emissions Placeholder Factor",
      "sourceVersion": "",
      "sourceYear": 2026,
      "sourceUrl": "",
      "sourcePage": null,
      "sourceTable": null,
      "publishedDate": "2026-06-27T22:53:16.971Z",
      "notes": "Demo factor. Verify before client or regulatory reporting.",
      "createdAt": "2026-06-27T22:53:16.971Z",
      "updatedAt": "2026-06-27T22:53:16.971Z",
      "page": "",
      "tableReference": "",
      "sourceShortName": null,
      "country": null,
      "jurisdictionRegion": null,
      "publisherType": "UNKNOWN",
      "description": null,
      "isOfficial": false,
      "isActive": true
    },
    {
      "id": "source_f6fe4ca95a1a1b4ba95432dd5e5b2ead",
      "sourceAuthority": "DEFRA",
      "sourceDocument": "hotel-factor-2025",
      "sourceVersion": "",
      "sourceYear": 0,
      "sourceUrl": "",
      "sourcePage": null,
      "sourceTable": null,
      "publishedDate": "2026-06-27T22:53:16.971Z",
      "notes": "Demo factor. Verify before client or regulatory reporting.",
      "createdAt": "2026-06-27T22:53:16.971Z",
      "updatedAt": "2026-06-27T22:53:16.971Z",
      "page": "",
      "tableReference": "",
      "sourceShortName": null,
      "country": null,
      "jurisdictionRegion": null,
      "publisherType": "UNKNOWN",
      "description": null,
      "isOfficial": false,
      "isActive": true
    },
    {
      "id": "source_missing_default",
      "sourceAuthority": "CarbonLite system defaults",
      "sourceDocument": "Pilot demo factor library",
      "sourceVersion": "",
      "sourceYear": 0,
      "sourceUrl": "",
      "sourcePage": null,
      "sourceTable": null,
      "publishedDate": "2026-06-27T22:53:17.814Z",
      "notes": "Fallback source for migrated factor versions that were missing a source reference.",
      "createdAt": "2026-06-27T22:53:17.814Z",
      "updatedAt": "2026-06-27T22:53:17.814Z",
      "page": "",
      "tableReference": "",
      "sourceShortName": null,
      "country": null,
      "jurisdictionRegion": null,
      "publisherType": "UNKNOWN",
      "description": null,
      "isOfficial": false,
      "isActive": true
    },
    {
      "id": "system-source-air-travel-km-2025",
      "sourceAuthority": "CarbonLite System Defaults",
      "sourceDocument": "CarbonLite Default Factor Library v1.0",
      "sourceVersion": "v1.0",
      "sourceYear": 2025,
      "sourceUrl": "https://carbonlite.ai/methodology/default-factors",
      "sourcePage": null,
      "sourceTable": null,
      "publishedDate": "2025-01-01T00:00:00.000Z",
      "notes": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "createdAt": "2026-06-29T21:46:27.087Z",
      "updatedAt": "2026-06-29T21:46:27.087Z",
      "page": "",
      "tableReference": "",
      "sourceShortName": "CarbonLite",
      "country": "Canada",
      "jurisdictionRegion": "Canada (Generic)",
      "publisherType": "CUSTOM",
      "description": "CarbonLite MVP system factor metadata for pilot workflow validation.",
      "isOfficial": false,
      "isActive": true
    },
    {
      "id": "system-source-air-travel-km-2025-canada-generic",
      "sourceAuthority": "CarbonLite System Defaults",
      "sourceDocument": "CarbonLite Default Factor Library v1.0",
      "sourceVersion": "v1.0",
      "sourceYear": 2025,
      "sourceUrl": "https://carbonlite.ai/methodology/default-factors",
      "sourcePage": null,
      "sourceTable": null,
      "publishedDate": "2025-01-01T00:00:00.000Z",
      "notes": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "createdAt": "2026-07-05T02:06:22.821Z",
      "updatedAt": "2026-07-22T15:18:47.556Z",
      "page": "",
      "tableReference": "",
      "sourceShortName": "CarbonLite",
      "country": "Canada",
      "jurisdictionRegion": "Canada (Generic)",
      "publisherType": "CUSTOM",
      "description": "CarbonLite MVP system factor metadata for pilot workflow validation.",
      "isOfficial": false,
      "isActive": true
    },
    {
      "id": "system-source-diesel-liters-2025",
      "sourceAuthority": "CarbonLite System Defaults",
      "sourceDocument": "CarbonLite Default Factor Library v1.0",
      "sourceVersion": "v1.0",
      "sourceYear": 2025,
      "sourceUrl": "https://carbonlite.ai/methodology/default-factors",
      "sourcePage": null,
      "sourceTable": null,
      "publishedDate": "2025-01-01T00:00:00.000Z",
      "notes": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "createdAt": "2026-06-29T21:46:24.270Z",
      "updatedAt": "2026-06-29T21:46:24.270Z",
      "page": "",
      "tableReference": "",
      "sourceShortName": "CarbonLite",
      "country": "Canada",
      "jurisdictionRegion": "Canada (Generic)",
      "publisherType": "CUSTOM",
      "description": "CarbonLite MVP system factor metadata for pilot workflow validation.",
      "isOfficial": false,
      "isActive": true
    },
    {
      "id": "system-source-diesel-liters-2025-canada-generic",
      "sourceAuthority": "CarbonLite System Defaults",
      "sourceDocument": "CarbonLite Default Factor Library v1.0",
      "sourceVersion": "v1.0",
      "sourceYear": 2025,
      "sourceUrl": "https://carbonlite.ai/methodology/default-factors",
      "sourcePage": null,
      "sourceTable": null,
      "publishedDate": "2025-01-01T00:00:00.000Z",
      "notes": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "createdAt": "2026-07-05T02:06:20.129Z",
      "updatedAt": "2026-07-22T15:18:44.953Z",
      "page": "",
      "tableReference": "",
      "sourceShortName": "CarbonLite",
      "country": "Canada",
      "jurisdictionRegion": "Canada (Generic)",
      "publisherType": "CUSTOM",
      "description": "CarbonLite MVP system factor metadata for pilot workflow validation.",
      "isOfficial": false,
      "isActive": true
    },
    {
      "id": "system-source-electricity-kwh-2025",
      "sourceAuthority": "CarbonLite System Defaults",
      "sourceDocument": "CarbonLite Default Factor Library v1.0",
      "sourceVersion": "v1.0",
      "sourceYear": 2025,
      "sourceUrl": "https://carbonlite.ai/methodology/default-factors",
      "sourcePage": null,
      "sourceTable": null,
      "publishedDate": "2025-01-01T00:00:00.000Z",
      "notes": "Placeholder electricity factor for pilot testing only.",
      "createdAt": "2026-06-29T21:46:26.457Z",
      "updatedAt": "2026-06-29T21:46:28.926Z",
      "page": "",
      "tableReference": "",
      "sourceShortName": "CarbonLite",
      "country": "Canada",
      "jurisdictionRegion": "Province Required",
      "publisherType": "CUSTOM",
      "description": "CarbonLite MVP system factor metadata for pilot workflow validation.",
      "isOfficial": false,
      "isActive": true
    },
    {
      "id": "system-source-electricity-kwh-2025-alberta",
      "sourceAuthority": "CarbonLite System Defaults",
      "sourceDocument": "CarbonLite Default Factor Library v1.0",
      "sourceVersion": "v1.0",
      "sourceYear": 2025,
      "sourceUrl": "https://carbonlite.ai/methodology/default-factors",
      "sourcePage": null,
      "sourceTable": null,
      "publishedDate": "2025-01-01T00:00:00.000Z",
      "notes": "Placeholder electricity factor for pilot testing only.",
      "createdAt": "2026-07-05T02:06:21.637Z",
      "updatedAt": "2026-07-22T15:18:46.427Z",
      "page": "",
      "tableReference": "",
      "sourceShortName": "CarbonLite",
      "country": "Canada",
      "jurisdictionRegion": "Alberta",
      "publisherType": "CUSTOM",
      "description": "CarbonLite MVP system factor metadata for pilot workflow validation.",
      "isOfficial": false,
      "isActive": true
    },
    {
      "id": "system-source-electricity-kwh-2025-british-columbia",
      "sourceAuthority": "CarbonLite System Defaults",
      "sourceDocument": "CarbonLite Default Factor Library v1.0",
      "sourceVersion": "v1.0",
      "sourceYear": 2025,
      "sourceUrl": "https://carbonlite.ai/methodology/default-factors",
      "sourcePage": null,
      "sourceTable": null,
      "publishedDate": "2025-01-01T00:00:00.000Z",
      "notes": "Placeholder electricity factor for pilot testing only.",
      "createdAt": "2026-07-05T02:06:22.004Z",
      "updatedAt": "2026-07-22T15:18:46.821Z",
      "page": "",
      "tableReference": "",
      "sourceShortName": "CarbonLite",
      "country": "Canada",
      "jurisdictionRegion": "British Columbia",
      "publisherType": "CUSTOM",
      "description": "CarbonLite MVP system factor metadata for pilot workflow validation.",
      "isOfficial": false,
      "isActive": true
    },
    {
      "id": "system-source-electricity-kwh-2025-ontario",
      "sourceAuthority": "CarbonLite System Defaults",
      "sourceDocument": "CarbonLite Default Factor Library v1.0",
      "sourceVersion": "v1.0",
      "sourceYear": 2025,
      "sourceUrl": "https://carbonlite.ai/methodology/default-factors",
      "sourcePage": null,
      "sourceTable": null,
      "publishedDate": "2025-01-01T00:00:00.000Z",
      "notes": "Placeholder electricity factor for pilot testing only.",
      "createdAt": "2026-07-05T02:06:22.446Z",
      "updatedAt": "2026-07-22T15:18:47.203Z",
      "page": "",
      "tableReference": "",
      "sourceShortName": "CarbonLite",
      "country": "Canada",
      "jurisdictionRegion": "Ontario",
      "publisherType": "CUSTOM",
      "description": "CarbonLite MVP system factor metadata for pilot workflow validation.",
      "isOfficial": false,
      "isActive": true
    },
    {
      "id": "system-source-gasoline-liters-2025",
      "sourceAuthority": "CarbonLite System Defaults",
      "sourceDocument": "CarbonLite Default Factor Library v1.0",
      "sourceVersion": "v1.0",
      "sourceYear": 2025,
      "sourceUrl": "https://carbonlite.ai/methodology/default-factors",
      "sourcePage": null,
      "sourceTable": null,
      "publishedDate": "2025-01-01T00:00:00.000Z",
      "notes": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "createdAt": "2026-06-29T21:46:25.144Z",
      "updatedAt": "2026-06-29T21:46:25.144Z",
      "page": "",
      "tableReference": "",
      "sourceShortName": "CarbonLite",
      "country": "Canada",
      "jurisdictionRegion": "Canada (Generic)",
      "publisherType": "CUSTOM",
      "description": "CarbonLite MVP system factor metadata for pilot workflow validation.",
      "isOfficial": false,
      "isActive": true
    },
    {
      "id": "system-source-gasoline-liters-2025-canada-generic",
      "sourceAuthority": "CarbonLite System Defaults",
      "sourceDocument": "CarbonLite Default Factor Library v1.0",
      "sourceVersion": "v1.0",
      "sourceYear": 2025,
      "sourceUrl": "https://carbonlite.ai/methodology/default-factors",
      "sourcePage": null,
      "sourceTable": null,
      "publishedDate": "2025-01-01T00:00:00.000Z",
      "notes": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "createdAt": "2026-07-05T02:06:20.732Z",
      "updatedAt": "2026-07-22T15:18:45.631Z",
      "page": "",
      "tableReference": "",
      "sourceShortName": "CarbonLite",
      "country": "Canada",
      "jurisdictionRegion": "Canada (Generic)",
      "publisherType": "CUSTOM",
      "description": "CarbonLite MVP system factor metadata for pilot workflow validation.",
      "isOfficial": false,
      "isActive": true
    },
    {
      "id": "system-source-ground-transport-km-2025-canada-national",
      "sourceAuthority": "CarbonLite",
      "sourceDocument": "CarbonLite Pilot Ground Transport Estimate 2025",
      "sourceVersion": "v1.0",
      "sourceYear": 2025,
      "sourceUrl": "https://carbonlite.ai/methodology/ground-transport-emissions",
      "sourcePage": null,
      "sourceTable": null,
      "publishedDate": "2025-01-01T00:00:00.000Z",
      "notes": "Pilot estimate for Scope 3 ground transport. Replace with a reviewed factor before formal reporting.",
      "createdAt": "2026-07-22T15:18:48.484Z",
      "updatedAt": "2026-07-22T15:18:48.484Z",
      "page": "",
      "tableReference": "",
      "sourceShortName": "CarbonLite",
      "country": "Canada",
      "jurisdictionRegion": "Canada - National",
      "publisherType": "CUSTOM",
      "description": "CarbonLite MVP system factor metadata for pilot workflow validation.",
      "isOfficial": false,
      "isActive": true
    },
    {
      "id": "system-source-hotel-nights-2025",
      "sourceAuthority": "CarbonLite System Defaults",
      "sourceDocument": "CarbonLite Default Factor Library v1.0",
      "sourceVersion": "v1.0",
      "sourceYear": 2025,
      "sourceUrl": "https://carbonlite.ai/methodology/default-factors",
      "sourcePage": null,
      "sourceTable": null,
      "publishedDate": "2025-01-01T00:00:00.000Z",
      "notes": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "createdAt": "2026-06-29T21:46:27.692Z",
      "updatedAt": "2026-06-29T21:46:27.692Z",
      "page": "",
      "tableReference": "",
      "sourceShortName": "CarbonLite",
      "country": "Canada",
      "jurisdictionRegion": "Canada (Generic)",
      "publisherType": "CUSTOM",
      "description": "CarbonLite MVP system factor metadata for pilot workflow validation.",
      "isOfficial": false,
      "isActive": true
    },
    {
      "id": "system-source-hotel-nights-2025-canada-generic",
      "sourceAuthority": "CarbonLite System Defaults",
      "sourceDocument": "CarbonLite Default Factor Library v1.0",
      "sourceVersion": "v1.0",
      "sourceYear": 2025,
      "sourceUrl": "https://carbonlite.ai/methodology/default-factors",
      "sourcePage": null,
      "sourceTable": null,
      "publishedDate": "2025-01-01T00:00:00.000Z",
      "notes": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "createdAt": "2026-07-05T02:06:23.208Z",
      "updatedAt": "2026-07-22T15:18:47.950Z",
      "page": "",
      "tableReference": "",
      "sourceShortName": "CarbonLite",
      "country": "Canada",
      "jurisdictionRegion": "Canada (Generic)",
      "publisherType": "CUSTOM",
      "description": "CarbonLite MVP system factor metadata for pilot workflow validation.",
      "isOfficial": false,
      "isActive": true
    },
    {
      "id": "system-source-natural-gas-m3-2025",
      "sourceAuthority": "CarbonLite System Defaults",
      "sourceDocument": "CarbonLite Default Factor Library v1.0",
      "sourceVersion": "v1.0",
      "sourceYear": 2025,
      "sourceUrl": "https://carbonlite.ai/methodology/default-factors",
      "sourcePage": null,
      "sourceTable": null,
      "publishedDate": "2025-01-01T00:00:00.000Z",
      "notes": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "createdAt": "2026-06-29T21:46:25.825Z",
      "updatedAt": "2026-06-29T21:46:25.825Z",
      "page": "",
      "tableReference": "",
      "sourceShortName": "CarbonLite",
      "country": "Canada",
      "jurisdictionRegion": "Canada (Generic)",
      "publisherType": "CUSTOM",
      "description": "CarbonLite MVP system factor metadata for pilot workflow validation.",
      "isOfficial": false,
      "isActive": true
    },
    {
      "id": "system-source-natural-gas-m3-2025-canada-generic",
      "sourceAuthority": "CarbonLite System Defaults",
      "sourceDocument": "CarbonLite Default Factor Library v1.0",
      "sourceVersion": "v1.0",
      "sourceYear": 2025,
      "sourceUrl": "https://carbonlite.ai/methodology/default-factors",
      "sourcePage": null,
      "sourceTable": null,
      "publishedDate": "2025-01-01T00:00:00.000Z",
      "notes": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "createdAt": "2026-07-05T02:06:21.110Z",
      "updatedAt": "2026-07-22T15:18:45.990Z",
      "page": "",
      "tableReference": "",
      "sourceShortName": "CarbonLite",
      "country": "Canada",
      "jurisdictionRegion": "Canada (Generic)",
      "publisherType": "CUSTOM",
      "description": "CarbonLite MVP system factor metadata for pilot workflow validation.",
      "isOfficial": false,
      "isActive": true
    },
    {
      "id": "system-source-shipping-ton-km-2025",
      "sourceAuthority": "CarbonLite System Defaults",
      "sourceDocument": "CarbonLite Default Factor Library v1.0",
      "sourceVersion": "v1.0",
      "sourceYear": 2025,
      "sourceUrl": "https://carbonlite.ai/methodology/default-factors",
      "sourcePage": null,
      "sourceTable": null,
      "publishedDate": "2025-01-01T00:00:00.000Z",
      "notes": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "createdAt": "2026-06-29T21:46:28.281Z",
      "updatedAt": "2026-06-29T21:46:28.281Z",
      "page": "",
      "tableReference": "",
      "sourceShortName": "CarbonLite",
      "country": "Canada",
      "jurisdictionRegion": "Canada (Generic)",
      "publisherType": "CUSTOM",
      "description": "CarbonLite MVP system factor metadata for pilot workflow validation.",
      "isOfficial": false,
      "isActive": true
    },
    {
      "id": "system-source-shipping-ton-km-2025-canada-generic",
      "sourceAuthority": "CarbonLite System Defaults",
      "sourceDocument": "CarbonLite Default Factor Library v1.0",
      "sourceVersion": "v1.0",
      "sourceYear": 2025,
      "sourceUrl": "https://carbonlite.ai/methodology/default-factors",
      "sourcePage": null,
      "sourceTable": null,
      "publishedDate": "2025-01-01T00:00:00.000Z",
      "notes": "Default system factor included with CarbonLite MVP. Not intended for regulatory reporting.",
      "createdAt": "2026-07-05T02:06:23.558Z",
      "updatedAt": "2026-07-22T15:18:48.913Z",
      "page": "",
      "tableReference": "",
      "sourceShortName": "CarbonLite",
      "country": "Canada",
      "jurisdictionRegion": "Canada (Generic)",
      "publisherType": "CUSTOM",
      "description": "CarbonLite MVP system factor metadata for pilot workflow validation.",
      "isOfficial": false,
      "isActive": true
    },
    {
      "id": "system-source-water-m3-2025",
      "sourceAuthority": "CarbonLite Pilot Methodology",
      "sourceDocument": "Water Emissions Placeholder Factor",
      "sourceVersion": "v1.0",
      "sourceYear": 2025,
      "sourceUrl": "https://carbonlite.ai/methodology/water-emissions",
      "sourcePage": null,
      "sourceTable": null,
      "publishedDate": "2025-01-01T00:00:00.000Z",
      "notes": "Tracked metric with optional estimated emissions. Not intended for regulatory reporting.",
      "createdAt": "2026-06-29T21:46:29.662Z",
      "updatedAt": "2026-06-29T21:46:29.662Z",
      "page": "",
      "tableReference": "",
      "sourceShortName": "CarbonLite",
      "country": "Canada",
      "jurisdictionRegion": "Canada (Generic)",
      "publisherType": "CUSTOM",
      "description": "CarbonLite MVP system factor metadata for pilot workflow validation.",
      "isOfficial": false,
      "isActive": true
    },
    {
      "id": "system-source-water-m3-2025-canada-generic",
      "sourceAuthority": "CarbonLite Pilot Methodology",
      "sourceDocument": "Water Emissions Placeholder Factor",
      "sourceVersion": "v1.0",
      "sourceYear": 2025,
      "sourceUrl": "https://carbonlite.ai/methodology/water-emissions",
      "sourcePage": null,
      "sourceTable": null,
      "publishedDate": "2025-01-01T00:00:00.000Z",
      "notes": "Tracked metric with optional estimated emissions. Not intended for regulatory reporting.",
      "createdAt": "2026-07-05T02:06:23.938Z",
      "updatedAt": "2026-07-22T15:18:49.298Z",
      "page": "",
      "tableReference": "",
      "sourceShortName": "CarbonLite",
      "country": "Canada",
      "jurisdictionRegion": "Canada (Generic)",
      "publisherType": "CUSTOM",
      "description": "CarbonLite MVP system factor metadata for pilot workflow validation.",
      "isOfficial": false,
      "isActive": true
    }
  ]
}
```

### Appendix C. Read-only proof and source integrity

```json
{
  "state": [
    {
      "database": "neondb",
      "schema": "public",
      "read_only": "on",
      "default_read_only": "on",
      "snapshot_time": "2026-10-25T07:36:37.260Z"
    }
  ],
  "environment": "guarded Neon development",
  "migrations": [
    {
      "applied": 49
    }
  ],
  "trackedActivityStates": [
    {
      "activity": "WASTE",
      "calculationStatus": null,
      "matchingStatus": null,
      "reportTreatment": null,
      "count": 4,
      "emissions": null
    },
    {
      "activity": "WATER",
      "calculationStatus": "TRACKED_ONLY",
      "matchingStatus": "TRACKED_ONLY",
      "reportTreatment": "TRACKED_ONLY",
      "count": 51,
      "emissions": "0"
    },
    {
      "activity": "WATER",
      "calculationStatus": "TRACKED_ONLY",
      "matchingStatus": null,
      "reportTreatment": "TRACKED_ONLY",
      "count": 1,
      "emissions": null
    },
    {
      "activity": "WATER",
      "calculationStatus": null,
      "matchingStatus": null,
      "reportTreatment": null,
      "count": 9,
      "emissions": null
    }
  ],
  "organizationDemoPolicyCounts": {
    "False": 83,
    "True": 1
  },
  "note": "No DB write attempt was used to test read-only enforcement; transaction settings were queried.",
  "trackedFollowup": {
    "state": [
      {
        "read_only": "on"
      }
    ],
    "metricStates": [],
    "snapshotStates": [
      {
        "activity": "WASTE",
        "snapshot_count": 0,
        "nonzero_snapshot_count": 0
      },
      {
        "activity": "WATER",
        "snapshot_count": 0,
        "nonzero_snapshot_count": 0
      }
    ]
  },
  "syntheticPureSelection": [
    {
      "examined": "cmvcnwowa009ogdhwljpjodax",
      "ownTenantSelectedId": "d84e66a7-c94c-4458-bc33-5331519a9bb5",
      "priority": "VERIFIED_SYSTEM",
      "syntheticSelected": false
    },
    {
      "examined": "cmvcwh23y00fmgdhwr0lzoz3a",
      "ownTenantSelectedId": "cmvcwh23y00fmgdhwr0lzoz3a",
      "priority": "ORGANIZATION_CUSTOM",
      "syntheticSelected": true
    },
    {
      "examined": "cmvd3jvgj005agd82349bllfy",
      "ownTenantSelectedId": "cmvd3jvgj005agd82349bllfy",
      "priority": "ORGANIZATION_CUSTOM",
      "syntheticSelected": true
    }
  ]
}
```

Official PDF SHA256 checksums (of successfully retrieved source bytes):

- `egdf`: `dc4f46559e5aca639edab552e82ed466450f4b433a81a2a9fb24ff747e5d7cd4`
- `handbook-v33`: `1799e604dc64ad49d35ed27383784c3d3ed8776cd964889754d9d8f8783c90bc`
- `aqm-v23`: `9fc18a181614d2852ef3ec3f90ced59d774db33136c109d9ee725fd94d71ccd6`

Audit files created: only `docs/audits/carbonlite-factor-library-audit-2026-10-25.md`. The intentionally excluded `docs/structural-refactor-assessment-2026-10-24.md` remains untouched. Existing backend work remains untouched. No product code, factor data, tests, configuration, provider settings, account statuses or migration state was changed. No commit, push, tag or deployment was performed by this audit.
