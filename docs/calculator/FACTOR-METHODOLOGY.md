# Public small-business calculator factor bundle

Version: ca-smb-2026-11-v1. Verified 2026-11-26. No tenant factors or API lookups.
Baseline: 086ac30bfcd680834d5d22f0e15a862756a8fd79, tree 25b6ef1c4a564385de0ce71128bc74bd04aeda03.

## Sources and applicability

1. ECCC, Emission Factors and Reference Values v4.0, September 2026:
https://www.canada.ca/en/environment-climate-change/services/climate-change/pricing-pollution-how-it-will-work/output-based-pricing-system/federal-greenhouse-gas-offset-system/emission-factors-reference-values.html

Electricity: Table 5.2 for 2025, Table 5.3 for 2026, all 13 provinces/territories,
g CO2e/kWh consumed. Table footnotes 38/40 identify underlying inventory data
from 2022/2023, respectively. These are the published offset-system applicable-year
reference values, not contemporaneous measured business grid intensities.
PEI uses New Brunswick per footnotes 39/41. No generation-intensity substitution.
The source is used as a transparent screening convention, not a compliance claim.

Gas: marketable CO2 column in Tables 1.2 (2025) and 1.3 (2026), g CO2/m3.
CH4=0.037, N2O=0.035 g/m3 from commercial/institutional rows of Tables 2.2/2.3.
The marketable gas CO2 values and these two components are identical in both years.
Assumption: ordinary commercial heating using utility standard-volume m3;
not producer gas, industrial process gas, GJ or vehicle natural gas.

2. Quebec Ministry of the Environment, Greenhouse Gas Emissions Quantification
Guide, February 2025, Table 6, printed p19 / PDF page28:
https://www.environnement.gouv.qc.ca/changements/ges/guide-quantification/guide-quantification-ges-en.pdf#page=28

Verified visually against the table. Source attribution continuing on printed p20:
National Inventory Report 1990-2022, Part II, Table A6.1-15.
Gasoline: Light-duty Gasoline Vehicles, Tier 3, components 2307 CO2, 0.11 CH4,
0.007 N2O g/L. Diesel: Light-duty Diesel Vehicles, Advanced Control, components
2681 CO2, 0.051 CH4, 0.22 N2O g/L. These are Canadian technology defaults,
not Quebec grid values, and not year-specific fleet averages.
The 2025 published defaults are deliberately disclosed as fixed proxies for both
supported estimate years. Latest 2026 NIR mobile-table bytes could not be retrieved
(the UNFCCC download returned a non-PDF response); no claim of 2026 mobile-factor
verification is made. No unverified factor from that download was used.
Do not use these defaults for heavy vehicles, older technologies, stationary
fuel combustion or specific renewable/ethanol/biodiesel blends. Fossil-fuel basis;
no biofuel fraction inferred from province. This can overstate fossil CO2 for blends.

3. ECCC Global Warming Potentials (100-year IPCC AR5):
https://www.canada.ca/en/environment-climate-change/services/climate-change/greenhouse-gas-emissions/quantification-guidance/global-warming-potentials.html
CO2=1, CH4=28, N2O=265. Gas components combined before mass conversion.
Never apply GWP again to electricity's published CO2e value.

## Arithmetic and boundaries

All factors in g CO2e per source unit. Tonnes = quantity * factor / 1,000,000.
Natural gas Alberta: 1962 + 0.037*28 + 0.035*265 = 1972.311 g CO2e/m3.
Gasoline: 2311.935 g CO2e/L. Diesel: 2740.728 g CO2e/L.

Example: Alberta 2026, 10000 kWh + 1000 m3 + 500 L gasoline + 250 L diesel:
4.38 + 1.972311 + 1.1559675 + 0.685182 = 8.1934605 tCO2e.
Percentages and totals use unrounded source results. UI rounds to 3 decimals and
shows <0.001 for positive smaller values. Percentages may differ from 100 by rounding.

Only entered sources, location-based electricity and direct combustion. No upstream
fuel emissions, offsets, renewable-energy contractual claims, Scope 3 inventory,
refrigerants or assurance. Multiple regions must be estimated separately.

Only 2025/2026 supported. Unsupported region/year returns no estimate.
Input bounds (product screening limits, not regulatory thresholds): 100 million kWh,
10 million m3, 10 million L per fuel. No negative values, commas, exponent notation,
non-finite values or more than 3 decimal places. At least one positive quantity.
Empty/zero optional sources contribute zero, not missing-factor estimates.

## Privacy and verification

Calculator inputs live only in React state. No storage, API, analytics, request
parameters or CTA query strings. Existing Sentry allowlist and analytics-off services
remain byte-identical. Existing protected routes are unchanged; /calculator is public.
Paid Pilot link reuses /pilot; workflow link reuses /#workflow. No form endpoint added.

Focused unit/UI regressions cover selection, conversions, missing factors, bounds,
rounding, labels, public routing, no fetch/storage/analytics and CTA destinations.
Actual mobile/desktop inspection supplements jsdom tests; it is not a production run.
