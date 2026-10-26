# CarbonLite P1 emission-factor methodology audit

Date: 2026-10-25  
Frontend baseline: `51c1a65200a7a3039529a79dcf0751f0886cd040`  
Backend baseline: `1f2110d09c7eadb142ed042996e0a1b41b1dd522`

## Outcome

No numerical factor was changed. Six ECCC electricity reference values were verified against the current official ECCC publication and retained exactly. Their metadata was corrected to distinguish publication year (2026), federal-offset applicability year (2025 or 2026), underlying NIR vintage, table, units, and boundary. The ECCC 49.44 kg CO2e/GJ natural-gas number was also verified numerically, but its source describes it as an approximate projection-model value that can vary by year, sector, and province.

Those seven records are now reference-only and are excluded from new automatic corporate-inventory calculations in both frontend and backend. Historical snapshots are not rewritten. The P0 workspace/tenant predicate is unchanged; a separate scientific applicability and dimensional check runs before ranking.

The machine-readable inventory is [factor-methodology-inventory-2026-10-25.json](./factor-methodology-inventory-2026-10-25.json). It records 23 legacy `ConversionFactor` rows, 30 factor identities, 34 governed versions, 30 sources, and the frontend-only/reference catalogs visible to pilot flows. Database evidence is a captured development snapshot, not a claim about current production state.

## Inventory and classification

| Class | Count | Material groups | Decision |
| --- | ---: | --- | --- |
| A — verified | 1 | Alberta EGDF 0.4303 t CO2e/MWh seed candidate | Verified against pinned repository evidence only; remains offset-project-only and absent from the captured database. External authoritative PDF verification remains required. |
| B — verified, metadata incomplete | 6 | ECCC electricity AB/BC/ON for federal-offset applicability years 2025 and 2026 | Values and g-to-kg conversion externally verified; provenance corrected; reference-only because the publication expressly limits the timing rule to the federal offset system. |
| C — value remediation required | 0 | None | No evidence justified changing a number. |
| D — unsupported / fail closed | 43 | CarbonLite demo/default electricity, fuels, travel, hotel, shipping, water and ground transport; ECCC Table A8 natural gas | Demo values remain available only under the existing persisted demo-workspace opt-in. They are not approved for paid-pilot corporate reporting. Table A8 natural gas is additionally blocked by the new methodology guard in every workspace. |
| E — duplicate / ambiguous | 14 | Seven duplicate governed pairs for diesel, gasoline, natural gas, air travel, hotel, shipping and water | Existing P0 test/demo restrictions prevent normal corporate selection; database cleanup remains deferred. |

The 43 class-D entries include repeated registry representations of the same small value families; they are not 43 independently supported methodologies. The material value families are electricity (0.53, 0.02, 0.12 kg CO2e/kWh demo values plus the six ECCC references), diesel 2.68 kg CO2e/L, gasoline 2.31 kg CO2e/L, natural gas 1.89 kg CO2e/m3 and 49.44 kg CO2e/GJ, air travel 0.115/0.16 kg CO2e/km, hotel 15/18 kg CO2e/night, shipping 0.09 kg CO2e/ton-km, ground transport 0.2 kg CO2e/km, and water tracked-only/fixture values.

## Electricity verification

ECCC *Emission factors and reference values*, version 4.0 (September 2026), Tables 5.2 and 5.3 publishes consumption intensity in g CO2e/kWh. Division by 1000 yields the exact stored values:

| Province | Federal-offset year 2025 / Table 5.2 | Federal-offset year 2026 / Table 5.3 |
| --- | ---: | ---: |
| Alberta | 0.490 | 0.438 |
| British Columbia | 0.015 | 0.018 |
| Ontario | 0.038 | 0.059 |

These are consumption intensities, not generation, marginal-grid, or lifecycle factors. ECCC defines the publication's timing approach in the federal GHG Offset Credit System context. CarbonLite does **not** interpret that context as an ECCC prohibition on corporate-inventory use. Numerical source validity, source regulatory context, and CarbonLite automatic-calculation eligibility are separate questions. CarbonLite retains the values as reference-only because it has not yet adopted and documented a sufficiently authoritative corporate-inventory methodology establishing their automatic use for SMB location-based Scope 2 reporting.

The CarbonLite pilot electricity values 0.53/0.02/0.12 are deliberately retained without promotion. Repository metadata calls them pilot estimates and instructs replacement before formal reporting. P0 permits them only in an explicitly opted-in demo workspace; historical Golden snapshots continue to disclose their exact value/version.

### Alberta 0.53 and EGDF trace

The repository does not establish that CarbonLite's historical `0.53 kg CO2e/kWh` value was derived from Alberta's Electricity Grid Displacement Factor. Its source metadata identifies it as a CarbonLite pilot/default estimate, without an authoritative table or derivation. A separate library record is explicitly identified as Alberta EGDF: `0.4303 t CO2e/MWh` for 2026 renewable grid displacement. That record is a marginal/displacement factor for Alberta offset-project quantification, is classified `ALBERTA_OFFSET_PROJECT`, and is ineligible for ordinary corporate inventory calculations. The otherwise arbitrary `0.52` in `canonicalRecordEvaluation.test.ts` is only a deterministic tie-break test value; it is not a library or Golden factor.

Accordingly, the `0.53` value must still receive methodology remediation before paid-pilot reporting, but it must not be relabelled as EGDF without evidence. It currently represents an unsupported pilot approximation presented as purchased-electricity consumption intensity, not a verified average/generation intensity, consumption intensity, or displacement factor.

Golden A and C both depend on this pilot value:

- Golden A: `980 kWh × 0.53 = 519.40 kg CO2e`; plus `4 hotel nights × 15 = 60.00`, total `579.40`.
- Golden C: `1,250 kWh × 0.53 = 662.50 kg CO2e`; the other historical rows total `1,765.94`, giving `2,428.44`.
- Combined A+C: the Alberta-electricity contribution is `1,181.90 kg CO2e`, within the unchanged `3,007.84 kg CO2e` total.

No Golden value is changed in P1.5 because these are historical pinned pilot snapshots, not fresh production eligibility decisions.

## Natural gas and conversion integrity

ECCC's 2025 projections report, Table A8, publishes natural gas at 49.44 g CO2e/MJ, numerically equivalent to 49.44 kg CO2e/GJ. The same source calls Table A8 approximate and warns that actual factors vary by year, sector, and province. It does not establish the required corporate combustion boundary, HHV choice, GWP basis, or Alberta facility applicability. The record is retained but changed from default/active corporate use to reference-only.

No universal GJ↔m3 conversion was added. A direct compatible factor is required unless an existing conversion record has explicit activity, direction, jurisdiction, year, source, review status, and confidence metadata. Diesel in kg cannot use a litre factor without an approved density conversion and remains Needs Review.

The dimensional guard also rejects result units the current calculator cannot safely emit: gas-component results, g/t mass results, and denominator units that disagree with the represented activity input. It preserves legacy missing-unit compatibility and does not claim that legacy metadata is authoritative.

## Calculation, snapshot, report, and export consistency

New calculations apply `quantity × approved unit conversion (if present) × eligible factor`. Both deployed codebases apply the same scientific guard before factor ranking. A rejected reference cannot create a new calculated result or snapshot. Existing stored calculation snapshots remain immutable evidence of the factor/value/version used at calculation time, so later library changes do not alter historical report or CSV totals.

The remediation changes no report/export schema. Existing snapshot provenance fields continue to flow through canonical report data, PDF, and CSV. A historical snapshot using 49.44 remains reportable as historical evidence; recalculation must now return Missing Factor until a defensible corporate method is registered.

## Golden reconciliation

No audited factor value changed, so the requested Golden values remain exactly unchanged:

| Scenario | Before | After | Delta |
| --- | ---: | ---: | ---: |
| Golden A | 579.40 | 579.40 | 0.00 |
| Golden C | 2428.44 | 2428.44 | 0.00 |
| Combined A+C | 3007.84 | 3007.84 | 0.00 |

There is no factor-value delta to reconcile. Golden A/C are historical, pinned pilot fixtures and snapshots; this task does not rewrite them. The separate historical ENMAX/Golden B snapshot includes 3 GJ × 49.44 = 148.32 kg CO2e and remains historical evidence, but a fresh or recalculated Table A8 match now fails closed.

## Validation

- Focused factor/methodology regressions: 6 frontend files / 177 tests and 4 backend suites / 79 tests passed.
- Full frontend, run serially to avoid shared-auth-state interference: 108 files / 1468 tests passed. The same P0-plus-P1 candidate passed in clean worktrees; three path-dependent suites were rerun after linking their expected sibling API path, for an aggregate 108 files / 1468 tests.
- Full backend working-tree unit tests: 41 suites / 558 tests passed. The clean P0-plus-P1 candidate unit suite passed 40 suites / 504 tests.
- Backend safety configuration: 2 suites / 33 tests passed in the clean candidate.
- Frontend TypeScript and both frontend/backend builds passed in the working tree and clean candidate.
- Golden A, Golden C, and their combined total remain 579.40, 2428.44, and 3007.84 respectively, with zero delta.
- Full backend E2E passed against a reset, migrated, and deterministically seeded disposable local database: 35 suites / 230 tests. Legacy calculation fixtures now opt in to tenant-scoped reviewed E2E factors instead of weakening the production workspace or methodology predicates. The external-provider client is mocked globally for deterministic E2E, so no `OPENAI_API_KEY` is required and no provider request is made.
- The system-factor E2E seed preserves the public `liters` unit contract for diesel and gasoline. The disposable `carbonlite_e2e` database was removed after validation. Development and Neon databases were not changed.

Required validation is green. No commit was created because the shared backend worktree also contains a separately scoped document-eligibility refactor; changes should be separated and reviewed before committing.

## Remaining paid-pilot blockers

- Replace or independently substantiate every class-D demo value with a reviewed corporate-inventory methodology, including boundary, gas basis/GWP, geography, vintage, and authoritative citation.
- Register a corporate location-based Scope 2 method separately from federal-offset electricity tables.
- Resolve the seven governed duplicate pairs deterministically and clean the database in a separately approved data-remediation task.
- Establish approved natural-gas corporate factors by supported quantity basis; do not infer sector/equipment or a universal heating value.
- Verify the Alberta EGDF pinned source against the authoritative PDF before relying on it even for its already restricted offset-project purpose.
- Complete the separate paid-pilot report/readiness review; this task only prevents new calculation/snapshot/export contradictions.

## External sources checked

- Environment and Climate Change Canada, *Emission factors and reference values*, version 4.0, September 2026: electricity Tables 5.2/5.3, unit, NIR footnotes, consumption boundary, and federal-offset-only timing applicability.
- Environment and Climate Change Canada, *Greenhouse gas and air pollutant emissions projections – 2025*, Table A8: natural gas 49.44 g CO2e/MJ and the source's approximation/geography/sector caveat.

All other classifications are verified against repository evidence or the captured development snapshot and require external authoritative-source verification where noted.
