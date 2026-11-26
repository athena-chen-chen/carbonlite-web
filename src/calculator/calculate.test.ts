import { describe, expect, it } from 'vitest';
import { calculate, EMPTY_INPUTS, LIMITS, type Inputs } from './calculate';
import { factorsFor, FACTOR_VERSION, REGIONS, SOURCES } from './factors';
const input = (values: Partial<Inputs> = {}): Inputs => ({ ...EMPTY_INPUTS, region: 'AB', ...values });
describe('public calculator factors and deterministic engine', () => {
  it('selects applicable ECCC province/year tables, not one national average', () => {
    expect(factorsFor('AB', 2025)?.electricity).toBe(490);
    expect(factorsFor('AB', 2026)?.electricity).toBe(438);
    expect(factorsFor('QC', 2026)?.electricity).toBe(1.9);
    expect(factorsFor('NT', 2026)?.electricity).toBe(420);
    expect(factorsFor('PE', 2026)?.electricity).toBe(factorsFor('NB', 2026)?.electricity);
    for (const [region] of REGIONS) for (const year of [2025, 2026]) expect(Object.values(factorsFor(region, year)!)).toHaveLength(4);
  });
  it('converts natural-gas components using AR5 without reconverting electricity', () => {
    expect(factorsFor('AB', 2026)?.naturalGas).toBeCloseTo(1972.311, 9);
    expect(factorsFor('ON', 2026)?.naturalGas).toBeCloseTo(1931.311, 9);
    expect(factorsFor('AB', 2026)?.gasoline).toBeCloseTo(2311.935, 9);
    expect(factorsFor('AB', 2026)?.diesel).toBeCloseTo(2740.728, 9);
  });
  it('calculates a hand-worked four-source example in tonnes', () => {
    const result = calculate(input({ electricity: '10000', naturalGas: '1000', gasoline: '500', diesel: '250' }));
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected valid calculation');
    [4.38, 1.972311, 1.1559675, 0.685182].forEach((expected, i) => expect(result.estimate.rows[i].tonnes).toBeCloseTo(expected, 12));
    expect(result.estimate.total).toBeCloseTo(8.1934605, 10);
    expect(result.estimate.rows.reduce((sum, row) => sum + row.percentage, 0)).toBeCloseTo(100, 12);
    expect(result.estimate.largest).toEqual(['electricity']);
    expect(result.estimate.factorVersion).toBe(FACTOR_VERSION);
    expect(result.estimate.year).toBe(2026);
  });
  it('supports zero/empty optional sources and fractional amounts', () => {
    const result = calculate(input({ gasoline: '.001', electricity: '0' }));
    expect(result.ok).toBe(true);
    if (result.ok) { expect(result.estimate.total).toBeCloseTo(0.000002311935); expect(result.estimate.rows[2].percentage).toBe(100); }
  });
  it.each(['', '0', '0.000'])('rejects all-zero sources (%s)', electricity => expect(calculate(input({ electricity })).ok).toBe(false));
  it.each(['-1', 'NaN', 'Infinity', '1e4', '12x', '1,000', '1.2345', '0x12', '+2', '1.', '1/2', '9'.repeat(25)])('rejects invalid consumption %s', electricity => expect(calculate(input({ electricity })).ok).toBe(false));
  it('rejects values above product bounds without clipping or manufacturing totals', () => {
    expect(calculate(input({ electricity: String(LIMITS.electricity + 1) })).ok).toBe(false);
    expect(calculate(input({ diesel: String(LIMITS.diesel + 1) })).ok).toBe(false);
  });
  it.each([['XX', 2026], ['AB', 2024], ['AB', 2027], ['', 2026], ['AB', NaN]])('fails closed for absent region/year factors %s %s', (region, year) => {
    expect(factorsFor(String(region), Number(year))).toBeNull();
    const result = calculate(input({ region: String(region), year: String(year), electricity: '1000' }));
    expect(result.ok).toBe(false);
    expect('estimate' in result).toBe(false);
  });
  it('is deterministic and does not mutate caller inputs', () => {
    const value = Object.freeze(input({ electricity: '50' }));
    expect(calculate(value)).toEqual(calculate(value));
    expect(value.electricity).toBe('50');
  });
  it('uses official public sources', () => {
    expect(SOURCES.eccc).toMatch(/^https:\/\/www.canada.ca\//);
    expect(SOURCES.vehicles).toMatch(/^https:\/\/www.environnement.gouv.qc.ca\//);
  });
});
