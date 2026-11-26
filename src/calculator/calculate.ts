import { FACTOR_VERSION, SOURCE_KEYS, factorsFor, type Source } from './factors';
export type Inputs = Record<Source, string> & { region: string; year: string };
export type Row = { source: Source; quantity: number; factor: number; tonnes: number; percentage: number };
export type Estimate = { region: string; year: number; factorVersion: string; rows: Row[]; total: number; largest: Source[] };
export type Calculation = { ok: true; estimate: Estimate } | { ok: false; errors: Partial<Record<keyof Inputs | 'form', string>> };
// Product bounds, not scientific factor limits: above this range needs a reviewed inventory.
export const LIMITS: Record<Source, number> = { electricity: 100_000_000, naturalGas: 10_000_000, gasoline: 10_000_000, diesel: 10_000_000 };
export const LABELS: Record<Source, string> = { electricity: 'Electricity', naturalGas: 'Natural gas', gasoline: 'Gasoline', diesel: 'Diesel' };
export const UNITS: Record<Source, string> = { electricity: 'kWh', naturalGas: 'm³', gasoline: 'litres', diesel: 'litres' };
export const EMPTY_INPUTS: Inputs = { region: '', year: '2026', electricity: '', naturalGas: '', gasoline: '', diesel: '' };
export function calculate(input: Inputs): Calculation {
  const errors: Partial<Record<keyof Inputs | 'form', string>> = {};
  const year = /^\d{4}$/.test(input.year) ? Number(input.year) : NaN;
  const factors = factorsFor(input.region, year);
  if (!input.region) errors.region = 'Choose a province or territory.';
  if (!factors) errors.form = 'Verified factors are unavailable for this region or year. No estimate was calculated.';
  const quantities = {} as Record<Source, number>;
  for (const key of SOURCE_KEYS) {
    const value = input[key].trim();
    if (value && (!/^(?:\d+(?:\.\d{1,3})?|\.\d{1,3})$/.test(value) || value.length > 20)) {
      errors[key] = 'Enter a non-negative number with up to 3 decimal places; no commas or exponents.';
    }
    const quantity = value === '' ? 0 : Number(value);
    if (!Number.isFinite(quantity) || quantity < 0 || quantity > LIMITS[key]) errors[key] = `Enter a value between 0 and ${LIMITS[key].toLocaleString('en-CA')} ${UNITS[key]}.`;
    quantities[key] = quantity;
  }
  if (SOURCE_KEYS.every(key => quantities[key] === 0)) errors.form = 'Enter a positive amount for at least one source.';
  if (Object.keys(errors).length || !factors) return { ok: false, errors };
  const tonnes = SOURCE_KEYS.map(source => quantities[source] * factors[source] / 1_000_000);
  const total = tonnes.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(total) || total <= 0) return { ok: false, errors: { form: 'An estimate could not be calculated. Check the entered amounts.' } };
  const rows = SOURCE_KEYS.map((source, i) => ({ source, quantity: quantities[source], factor: factors[source], tonnes: tonnes[i], percentage: tonnes[i] / total * 100 }));
  const max = Math.max(...tonnes);
  return { ok: true, estimate: { region: input.region, year, factorVersion: FACTOR_VERSION, rows, total, largest: rows.filter(row => row.tonnes === max).map(row => row.source) } };
}
