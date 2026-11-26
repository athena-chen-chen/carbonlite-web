// Public, versioned defaults. Never read tenant conversion-factor tables.
export const FACTOR_VERSION = 'ca-smb-2026-11-v1';
export const FACTOR_VERIFIED_ON = '2026-11-26';
export const SOURCES = {
  eccc: 'https://www.canada.ca/en/environment-climate-change/services/climate-change/pricing-pollution-how-it-will-work/output-based-pricing-system/federal-greenhouse-gas-offset-system/emission-factors-reference-values.html',
  vehicles: 'https://www.environnement.gouv.qc.ca/changements/ges/guide-quantification/guide-quantification-ges-en.pdf#page=28',
  gwp: 'https://www.canada.ca/en/environment-climate-change/services/climate-change/greenhouse-gas-emissions/quantification-guidance/global-warming-potentials.html',
} as const;
export const REGIONS = [
  ['AB', 'Alberta'], ['BC', 'British Columbia'], ['MB', 'Manitoba'], ['NB', 'New Brunswick'],
  ['NL', 'Newfoundland and Labrador'], ['NS', 'Nova Scotia'], ['NT', 'Northwest Territories'],
  ['NU', 'Nunavut'], ['ON', 'Ontario'], ['PE', 'Prince Edward Island'], ['QC', 'Quebec'],
  ['SK', 'Saskatchewan'], ['YT', 'Yukon'],
] as const;
export type Region = typeof REGIONS[number][0];
export const YEARS = [2025, 2026] as const;
export type Year = typeof YEARS[number];
export const GWP = { co2: 1, ch4: 28, n2o: 265 } as const; // IPCC AR5, 100 years.
export function gramsCO2e(co2: number, ch4: number, n2o: number) {
  return co2 + ch4 * GWP.ch4 + n2o * GWP.n2o;
}
// g CO2e/kWh consumed. ECCC EF&RV v4.0 Tables 5.2 (2025) and 5.3 (2026).
// Underlying NIR data years: 2022 and 2023 respectively; NOT measured 2025/26 grids.
const electricity = {
  2025: { AB: 490, BC: 15, MB: 1.4, NB: 350, NL: 18, NS: 700, NT: 190, NU: 820, ON: 38, PE: 350, QC: 1.7, SK: 670, YT: 70 },
  2026: { AB: 438, BC: 18, MB: 2.5, NB: 234, NL: 17, NS: 581, NT: 420, NU: 800, ON: 59, PE: 234, QC: 1.9, SK: 631, YT: 74 },
} satisfies Record<Year, Record<Region, number>>;
// Marketable commercial/institutional gas, g CO2/m3. Tables 1.2/1.3.
// CH4 0.037 and N2O 0.035 g/m3: Tables 2.2/2.3, commercial/institutional row.
const naturalGasCO2: Record<Region, number> = { AB: 1962, BC: 1966, MB: 1915, NB: 1919, NL: 1919, NS: 1919, NT: 1966, NU: 1966, ON: 1921, PE: 1919, QC: 1926, SK: 1920, YT: 1966 };
// Quebec 2025 Guide Table 6, printed p19 (PDF p28), Canadian NIR 1990–2022 source.
// Fixed technology defaults for estimates in either supported year, NOT year-specific
// fleet averages. Unblended fossil fuels, tailpipe only. Recompute from gas components.
export const VEHICLE_COMPONENTS = {
  gasoline: { co2: 2307, ch4: 0.11, n2o: 0.007, assumption: 'Light-duty gasoline vehicle, Tier 3' },
  diesel: { co2: 2681, ch4: 0.051, n2o: 0.22, assumption: 'Light-duty diesel vehicle, advanced control' },
} as const;
export const SOURCE_KEYS = ['electricity', 'naturalGas', 'gasoline', 'diesel'] as const;
export type Source = typeof SOURCE_KEYS[number];
export function factorsFor(region: string, year: number): Record<Source, number> | null {
  if (!REGIONS.some(([code]) => code === region) || !YEARS.some(y => y === year)) return null;
  const r = region as Region;
  return {
    electricity: electricity[year as Year][r],
    naturalGas: gramsCO2e(naturalGasCO2[r], 0.037, 0.035),
    gasoline: gramsCO2e(VEHICLE_COMPONENTS.gasoline.co2, VEHICLE_COMPONENTS.gasoline.ch4, VEHICLE_COMPONENTS.gasoline.n2o),
    diesel: gramsCO2e(VEHICLE_COMPONENTS.diesel.co2, VEHICLE_COMPONENTS.diesel.ch4, VEHICLE_COMPONENTS.diesel.n2o),
  };
}
