# Task 8 — Alberta Official Factor Suitability Review

Review date: 2026-10-16. Decision scope: ordinary corporate Scope 1/2 inventories and CarbonLite governed-library admission. This is a source and suitability review; it does not load factors, approve calculation use, change defaults, or query a deployed database.

**Decision: electricity EGDF is NO for corporate Scope 2. Natural gas, gasoline and diesel combustion references are CONDITIONAL for corporate inventories, and NO as standalone direct CO2e multipliers in their published component form. Add or retain official references with their actual applicability and gas basis; none of the reviewed rows is an unconditional replacement corporate CO2e default.**

## Sources and edition boundary

1. Government of Alberta, [Carbon Offset Emission Factors Handbook v3.2](https://open.alberta.ca/dataset/f2109d83-2153-4481-a8b8-b00178e53999/resource/316751cf-0387-4acd-8e03-cd134bc4a5b2/download/epa-carbon-offset-emission-factors-handbook-v3-2-2025-08.pdf), August 20, 2025. Local official PDF inspected: `/Users/shuangchen/Downloads/Alberta -carbon-offset-emission-factors-handbook-v3-2-2025-08.pdf`. Table 1 p.5; Table 6 p.7; Table 7 pp.7–8; GWP direction in section 2.1 p.6. The introduction explicitly places common factors within Alberta offset protocols.
2. Government of Alberta, [Alberta Greenhouse Gas Quantification Methodologies v2.3](https://open.alberta.ca/dataset/5d79b86b-7811-413f-88d8-acd36cb9d6d2/resource/29984c25-29bc-46cd-83fb-1f54fb3e2f5c/download/epa-alberta-greenhouse-gas-quantification-methodologies-version-2-3-2023-09.pdf), September 2023. Local official PDF inspected: `/Users/shuangchen/Downloads/epa-alberta-greenhouse-gas-quantification-methodologies-version-2-3-2023-09.pdf`. Chapter 1 Methods 1-1, 1-2 and 1-6; Tables 1-1/1-2 p.1-9 (PDF p.20), Table 1-3 p.1-10 (PDF p.21). These are stationary-combustion methods. Alberta's [TIER source listing](https://www.alberta.ca/technology-innovation-and-emissions-reduction-regulation) identifies AQM as prescribed for TIER/SGRR facilities.
3. [Alberta's current offset-system listing](https://www.alberta.ca/alberta-emission-offset-system), checked on the review date, lists Handbook v3.3 for projects initiated on or after August 27, 2026, and v3.2 for projects initiated on or after August 20, 2025. This review preserves the earlier Task 7 v3.2 reference. It does not claim to verify v3.3 tables or establish v3.2 as the current edition for all new projects. New offset-project use needs an edition/effectivity check.
The supplied local PDFs are the primary evidence, checked by text extraction and visual inspection of table headings, units and footnotes. The online listing supplies edition context only; no internet factor replaces a supplied value. AQM's own introduction, PDF p.6, establishes TIER/SGRR scope and refers GWP selection to the applicable regulatory standards.

Source fingerprints (SHA-256): Handbook `d93504d5bfc0bc4a2aa8b9b0199569f141912ff6d201d5720c9f1ff09573aef9`; AQM `9fc18a181614d2852ef3ec3f90ced59d774db33136c109d9ee725fd94d71ccd6`.

All candidates below share authority **Alberta Environment and Protected Areas** and jurisdiction **Alberta, Canada**, within the identified method. Handbook publication is **2025-08-20**, source version **3.2**; AQM publication is **September 2023**, source version **2.3** (no publication day is established). Only the electricity rows have an explicit **2026 factor vintage** here. Fuel references have no separately established annual vintage: **INSUFFICIENT EVIDENCE** to assign one from publication year alone. National input data cited by an Alberta method do not establish a corporate applicability decision.

## Decision matrix and implementation scope

This matrix was reported before code/data changes. **H** means the supplied Handbook; **A** means the supplied AQM. `CONDITIONAL` means potentially usable in a separately justified stationary-combustion inventory method after the missing context is governed. It is not approval of the source's regulatory method as a generic corporate method. There is **INSUFFICIENT EVIDENCE** for an unconditional corporate replacement or a universal mobile/fleet factor in these references.

In the basis column, `CO2 / CH4 / N2O` means three separate records with `CO2_COMPONENT` / `CH4_COMPONENT` / `N2O_COMPONENT`. All fuel candidates need governed GWP source, version and time horizon, component identities and a calculation snapshot before deriving complete CO2e. **CarbonLite cannot calculate complete CO2e from any of these component sets today.** It can store restricted provenance; a stored numeric component or offset multiplier does not establish support for its full workflow.

| Candidate | Exact location; original value and unit | Basis | Source applicability / required input and additional context | Corporate inventory | Recommended CarbonLite action and reason | Task 8 implementation |
|---|---|---|---|---|---|---|
| 1. Renewable EGDF, 2026 | H Table 1 p.5; **0.4303 tCO2e/MWh** | `DIRECT_CO2E` | `ALBERTA_OFFSET_PROJECT`; renewable displaced MWh, approved protocol/baseline, initiation/edition rules, annual vintage | **NO** | `KEEP_EXISTING_FACTOR`: existing restricted official record is correct; corporate 0.53 remains frozen | Retain; tests only, no new record |
| 2. Line-loss EGDF, 2026 | H Table 1 p.5; **0.4588 tCO2e/MWh**, each of the three line-loss rows | `DIRECT_CO2E` | `ALBERTA_OFFSET_PROJECT`; increased on-site grid use, reduced grid use, or distributed renewable displacement at point of use; protocol, metering boundary, initiation/edition/vintage | **NO** | `ADD_AS_CONTEXT_SPECIFIC_FACTOR` only after an admission need is established; separate row identities; not a consumption-average Scope 2 factor | Deferred; tests for all three contexts, no record |
| 3. Natural Gas sector components | H Table 6 p.7; commercial grouping **1962 / 0.037 / 0.035 g/m³**; all sector rows below | CO2 / CH4 / N2O | Source context `ALBERTA_OFFSET_PROJECT`; sector, appropriate combustion use, compatible volume basis and protocol | **CONDITIONAL** | `ADD_AS_REFERENCE_ONLY`: preserve the original method; never use 1962 as direct CO2e | Document reference; no record |
| 4. AQM Natural Gas method/components | A Method 1-2, pp.1-2–1-3 (PDF 13–14), Eq.1-2; Method 1-6 pp.1-7–1-8; Tables 1-2/1-3 pp.1-9–1-10 (PDF 20–21). CO2 equation below; commercial CH4 **3.7e-8 t/m³ or 9.8e-7 t/GJ**, N2O **3.5e-8 t/m³ or 9.2e-7 t/GJ** | CO2 / CH4 / N2O | `ALBERTA_TIER_SGRR`; level, supplied/measured HHV, standard volume/energy basis, sector or equipment/NOx/load, Chapters 17/Appendix C | **CONDITIONAL** | `ADD_AS_REFERENCE_ONLY`: an equation and contextual components are not a generic GJ multiplier | Document method; no record or engine |
| 5. Motor Gasoline components | H Table 7 p.8; **2307 / 0.100 / 0.020 g/L** | CO2 / CH4 / N2O | Source context `ALBERTA_OFFSET_PROJECT`; litres, approved method, combustion equipment/use, fuel composition | **CONDITIONAL** | `ADD_AS_REFERENCE_ONLY`: 2307 g CO2/L is not 2.307 kgCO2e/L | Document reference; no record |
| 6. AQM Gasoline | A Table 1-1 p.1-9 (PDF 20); CO2 **2.307 t/kL or 0.0690 t/GJ**; CH4 **1e-4 t/kL or 3.0e-6 t/GJ**; N2O **2e-5 t/kL or 6e-7 t/GJ** | CO2 / CH4 / N2O | `ALBERTA_TIER_SGRR`; stationary combustion; Method 1-1/1-6; appropriate non-variable fuel, volume or HHV energy; fuel blend and biomass boundary | **CONDITIONAL** | `ADD_AS_REFERENCE_ONLY`: source provides components, not complete CO2e or a universal fleet factor | Document reference; no record |
| 7. AQM Gasoline in Alberta | A Table 1-1 p.1-9, notes 2/5; CO2 **2.174 t/kL or 0.06540 t/GJ**; CH4/N2O as candidate 6 | CO2 / CH4 / N2O | `ALBERTA_TIER_SGRR`; candidate 6 requirements plus RFS biofuel assumption, actual blend if known and Chapter 14 biomass CO2 | **CONDITIONAL** | `ADD_AS_REFERENCE_ONLY`: geographic label includes a blend methodology assumption | Document reference; no record |
| 8. Diesel components | H Table 7 p.8, Refineries and others / Upgraders; **2681 / 0.078 / 0.022 g/L**; starred federal v2.0 June 2024 reference | CO2 / CH4 / N2O | Source context `ALBERTA_OFFSET_PROJECT`; litres, applicable row/protocol, combustion use and source-specific component set | **CONDITIONAL** | `ADD_AS_REFERENCE_ONLY`: do not relabel CO2 as CO2e or mix N2O editions | Document reference; no record |
| 9. AQM Diesel | A Table 1-1 p.1-9, All industry / Upgraders; CO2 **2.681 t/kL or 0.0699 t/GJ**; CH4 **7.8e-5 t/kL or 2.0e-6 t/GJ**; N2O **2e-5 t/kL or 5.8e-7 t/GJ** | CO2 / CH4 / N2O | `ALBERTA_TIER_SGRR`; stationary combustion, Method 1-1/1-6, volume or HHV energy, blend and biomass boundary | **CONDITIONAL** | `ADD_AS_REFERENCE_ONLY`: AQM N2O is 0.020 g/L; Handbook is 0.022 g/L | Document reference; no record |
| 10. AQM Diesel in Alberta | A Table 1-1 p.1-9, notes 2/3; CO2 **2.610 t/kL or 0.06953 t/GJ**; CH4/N2O as candidate 9 | CO2 / CH4 / N2O | `ALBERTA_TIER_SGRR`; candidate 9 requirements plus RFS biofuel assumption, actual blend and separate biomass CO2 | **CONDITIONAL** | `ADD_AS_REFERENCE_ONLY`: source-specific blend treatment is not a universal corporate constant | Document reference; no record |

The `ADD_AS_REFERENCE_ONLY` recommendations above identify a permissible future admission category, not records inserted by this task. This review keeps references in this decision document: no database admission is needed to protect matching. For any later record, preserve the original offset/TIER method in provenance and use `REFERENCE_ONLY` for a deliberately informational copy. No candidate is recommended as `ADD_AS_CORPORATE_INVENTORY_FACTOR` today.

**Current calculation capability:** the existing model can represent the two electricity multipliers and their original units, but CarbonLite has no governed offset-project workflow; neither may enter corporate matching. It cannot execute AQM Method 1-2 or combine the fuel component sets into final CO2e. Documentary provenance fields do not enforce a complete TIER/SGRR or offset method.

**Current-factor decision: `KEEP_EXISTING_FACTOR`** for electricity 0.53 kgCO2e/kWh, Natural Gas - Canada Generic 49.44 kgCO2e/GJ, gasoline 2.31 kgCO2e/L and diesel 2.68 kgCO2e/L during the pilot. This is a freeze decision, not a new validation of their suitability for formal reporting. None is promoted to official Alberta status.

One tonne/kilolitre equals one kilogram/litre for the same gas. Unit conversion never converts CO2 into CO2e.

## Natural gas: AQM is a method, not one universal constant

Handbook Table 6 natural-gas rows, in **g of the named gas per m³**:

| Sector | CO2 | CH4 | N2O |
|---|---:|---:|---:|
| Electric Utilities | 1962 | 0.49 | 0.049 |
| Industrial | 1962 | 0.037 | 0.033 |
| Oil and Gas Sector Producer Consumption (non-marketable product) | 2112 | 6.4 | 0.060 |
| Pipelines | 1962 | 1.9 | 0.050 |
| Cement | 1962 | 0.037 | 0.034 |
| Manufacturing Industries | 1962 | 0.037 | 0.033 |
| Residential, Construction, Commercial/Institutional, Agriculture | 1962 | 0.037 | 0.035 |

The non-marketable producer row also changes CO2. Neither industry nor equipment should be inferred from a company name, filename or generic Natural Gas activity. These values are not complete CO2e factors.

AQM Method 1-2, Equation 1-2, pp.1-2–1-3 (PDF pp.13–14) defines:

`t CO2 = volume_m3 × (60.554 × HHV_MJ_per_m3 − 404.15) × 10^-6`

This requires measured/supplier HHV, standard-condition volume and the applicable methodology level. Method 1-2 serves Levels 1/2; Level 3 uses the prescribed higher-level method. Do not store the equation as an unconditional fixed natural-gas factor.

Specifically, Method 1-2 directs Level 3 facilities to Method 1-3, requiring measured carbon content and the relevant volume/energy/HHV information. A GJ invoice alone does not establish HHV, composition, method level, sector/technology or a governed GWP choice. Any method-specific derivation from measured energy and HHV would need those inputs and its own reviewed calculation snapshot; no universal GJ-to-m³ constant is justified.

AQM Table 1-2, commercial/institutional sector row, gives non-CO2 factors:

| Gas | Volume factor | Energy factor (HHV) |
|---|---:|---:|
| CH4 | 3.7 × 10^-8 t CH4/m³ | 9.8 × 10^-7 t CH4/GJ |
| N2O | 3.5 × 10^-8 t N2O/m³ | 9.2 × 10^-7 t N2O/GJ |

These do not supply an AQM universal CO2e/GJ factor. Technology-specific alternatives exist in Table 1-3, and AQM instructs use of energy-based non-CO2 factors when HHV is available. Sector, equipment and source method cannot be inferred from the fuel name alone.

For example, Table 1-3 boilers/furnaces/heaters use CH4 **3.7e-8 t/m³ or 9.7e-7 t/GJ**. NOx-controlled equipment uses N2O **1.0e-8 t/m³ or 2.7e-7 t/GJ**, while uncontrolled equipment uses **3.5e-8 t/m³ or 9.3e-7 t/GJ**. Turbines and engine stroke/mixture/load rows differ again. The table's volume-factor assumption of 1,020 Btu/scf is not permission to introduce a universal conversion; note 3 prefers energy factors when energy is available. Missing engine-load component cells must not be interpreted as zero emissions.

The existing CarbonLite **49.44 kgCO2e/GJ** reference is an ECCC Canada-generic Table A8 estimate in `src/services/conversionFactors.ts`; retain it for ordinary pilot energy-based calculations with its current review disclosure. This review does not establish it as an Alberta AQM factor or promote it to an official Alberta default. No universal GJ/m³ conversion is justified here. AQM candidates remain `ALBERTA_TIER_SGRR` or deliberately `REFERENCE_ONLY` until methodology support exists.

## Gasoline and diesel: preserve the blend boundary

AQM Table 1-1 p.1-9 publishes the following CO2 components:

| Source row | t CO2/kL | t CO2/GJ, HHV |
|---|---:|---:|
| Gasoline | 2.307 | 0.0690 |
| Gasoline in Alberta | 2.174 | 0.06540 |
| Diesel, All industry / Upgraders | 2.681 | 0.0699 |
| Diesel in Alberta | 2.610 | 0.06953 |

AQM Method 1-1 and Table 1-1 notes tie the Alberta rows to RFS biofuel content. Known actual composition may be used instead; biomass CO2 is handled separately under Chapter 14. These Alberta rows are not simply more geographically precise alternatives to the Handbook fossil-fuel rows.

AQM uses the general gasoline/diesel CH4 and N2O factors for the Alberta rows. Gasoline is 0.100 g CH4/L and 0.020 g N2O/L. Diesel is 0.078 g CH4/L and 0.020 g N2O/L. The Handbook's diesel 0.022 g N2O/L carries a footnote to the federal Emission Factors and Reference Values v2.0, June 2024; preserve that footnote and do not silently reconcile it with AQM v2.3.

Chapter 1 is stationary combustion. Corporate road-fleet or other mobile use requires an appropriate mobile methodology, including vehicle/equipment-specific non-CO2 treatment where applicable. An Alberta fuel purchase alone does not establish applicability.

## Admission and calculation decision

For each gas, store a separate component version with its true gas result unit and `CO2_COMPONENT`, `CH4_COMPONENT`, or `N2O_COMPONENT`. Use `ALBERTA_OFFSET_PROJECT` for the Handbook context, `ALBERTA_TIER_SGRR` for AQM regulatory references, or `REFERENCE_ONLY` for a deliberately informational copy. A corporate version is a separately justified methodology decision; do not relabel the source row to bypass matching restrictions.

A derived corporate CO2e factor may use `EF_CO2 + EF_CH4 × GWP_CH4 + EF_N2O × GWP_N2O` after all factors share the same denominator and mass units. Record the original component versions, full GWP source/version/horizon, sector/equipment, blend, quantity basis, reporting-year policy and reviewer decision. The result must be described as CarbonLite-derived rather than a CO2e value directly published in the Alberta table. The Handbook points to Alberta's compliance/forecasting standard for GWPs; do not invent a GWP set from publication year.

Task 7 currently excludes components and has no multi-gas aggregation engine. **Reference admission is useful now; automatic inventory calculation from these components is not supported.** A separately reviewed direct derivative could be admitted later, provided its eligibility conditions can be enforced. Where CarbonLite cannot enforce sector, technology, blend or HHV requirements, keep the version excluded from automatic matching.

Retain the existing 2026 EGDF library definition in `carbonlite-api/prisma/library/alberta-egdf-2026.ts`: 0.4303 tCO2e/MWh, Handbook v3.2, factor vintage 2026, `ALBERTA_OFFSET_PROJECT`, `DIRECT_CO2E`. Its source authority/status does not authorize corporate inventory use. Repository presence does not establish live database ingestion.

Do not promote the frozen pilot values 0.53 electricity, 49.44 Canada-generic natural gas, 2.31 gasoline or 2.68 diesel to official Alberta status based on proximity to these tables. The separate legacy 1.89 kgCO2e/m³ gas factor is also outside replacement scope. Preserve explicit review treatment until an inventory-eligible sourced or derived replacement is approved. Historical calculation snapshots retain their original factor version and provenance.

## Verification performed

Read prior CarbonLite audits, Task 7 eligibility behavior, existing EGDF library definition and generic gas reference. Checked supplied PDF text and visually checked Handbook pp.5, 7–8 and AQM PDF pp.13–14, 20–21 against numeric transcription. Checked Alberta's current edition listing online. No production code, factor data, database, migration or existing report was changed. Task 8 adds only safety tests and this expanded decision record.

| Check | Result |
|---|---|
| Focused frontend matching/governance and existing report regressions | **153 tests PASS across 8 files** |
| Existing backend governance, applicable-factor API, calculation-quality and exact EGDF library tests | **78 tests PASS across 4 suites**; mocked persistence, no database connection |
| Golden A | **PASS: 579.40 kgCO2e** |
| Golden B | **PASS: 338.06 kgCO2e** |
| Golden C | **PASS: 2428.44 kgCO2e** |
| Combined report | **PASS: 3285.90 kgCO2e**; 9 records, 8 calculated, 1 tracked, 100% coverage, complete 8/8 traceability, 5 factors, 8 usages |
| Normal Electricity, 1000 kWh | **PASS: 530 kgCO2e**; renewable and all three line-loss contexts excluded |
| Natural Gas, 3 GJ | **PASS: 148.32 kgCO2e**; actual ECCC fallback retained; no universal m³/GJ conversion |
| Gasoline, 100 L | **PASS: 231 kgCO2e**; official components excluded |
| Diesel, 100 L | **PASS: 268 kgCO2e**; no accidental 268.1 kgCO2e |
| Task 7 applicability/component boundaries | **PASS**; same-unit/jurisdiction collisions, legacy and governed active versions, native/SI-equivalent offset rows and misleading component unit labels |
| Historical provenance capture | **PASS**; source/method changes do not mutate the captured version/source snapshot |
| Factors added / replaced / reference-only / context-specific records added | **NONE / NONE / NONE / NONE** |
| Matcher / existing corporate factors / report code changed | **NO / NO / NO** |
| Neon development / Neon main modified | **NO / NO**; no seed, migration, data load or database command run |

Frontend command: `pnpm test src/utils/albertaOfficialFactorSuitability.test.ts src/utils/factorGovernance.test.ts src/test/officialAlbertaEgdf.test.tsx src/test/task7FactorFixtures.test.tsx src/utils/conversionFactorMatching.test.ts src/reports/domain/reportSemantics.test.tsx src/reports/domain/buildCanonicalReportData.test.ts src/reports/pdf/__tests__/pdfRenderers.test.ts`.

Backend tests: `factor-governance.spec.ts`, `conversion-factors.service.spec.ts`, `calculation-quality.service.spec.ts` and `prisma/library/alberta-egdf-2026.spec.ts`, using Jest with cache in `/private/tmp/task8-jest`. Existing report tests were executed without editing them; prior P2 provenance/wording cleanup remains frozen. Task 8 changes only this document and `src/utils/albertaOfficialFactorSuitability.test.ts`.
