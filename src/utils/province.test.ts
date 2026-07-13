import { describe, expect, it } from 'vitest';
import { getProvinceLabel, normalizeProvince } from './province';

describe('province helpers', () => {
  it.each([
    ['BC', 'British Columbia'],
    ['B.C.', 'British Columbia'],
    ['British Columbia', 'British Columbia'],
    ['AB', 'Alberta'],
    ['ON', 'Ontario'],
    ['Sk', 'Saskatchewan'],
    ['Qc', 'Quebec'],
    ['Québec', 'Quebec'],
    ['NU', 'Nunavut'],
    [null, null],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeProvince(input)).toBe(expected);
  });

  it('formats province labels safely', () => {
    expect(getProvinceLabel('BC')).toBe('British Columbia');
    expect(getProvinceLabel('')).toBe('Not specified');
  });
});
