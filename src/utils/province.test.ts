import { describe, expect, it } from 'vitest';
import {
  PILOT_SUPPORTED_PROVINCE_CODES,
  PILOT_SUPPORTED_PROVINCE_NAMES,
  getPilotProvinceCode,
  getProvinceLabel,
  isSupportedPilotProvince,
  normalizeProvince,
} from './province';

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

  it('defines current pilot province coverage in one place', () => {
    expect(PILOT_SUPPORTED_PROVINCE_CODES).toEqual(['AB', 'BC', 'ON']);
    expect(PILOT_SUPPORTED_PROVINCE_NAMES).toEqual([
      'Alberta',
      'British Columbia',
      'Ontario',
    ]);
    expect(getPilotProvinceCode('Alberta')).toBe('AB');
    expect(getPilotProvinceCode('BC')).toBe('BC');
    expect(getPilotProvinceCode('Ontario')).toBe('ON');
    expect(isSupportedPilotProvince('SK')).toBe(false);
    expect(isSupportedPilotProvince('Quebec')).toBe(false);
  });
});
