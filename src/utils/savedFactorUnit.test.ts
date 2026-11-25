import { describe, expect, it } from 'vitest';
import { formatSavedFactorUnit } from './savedFactorUnit';

describe('saved factor-unit formatting', () => {
  it.each([
    ['kgCO2e/kWh', 'kWh', 'ELECTRICITY'],
    ['kgCO2e/m3', 'm3', 'NATURAL_GAS'],
    ['kgCO2e/L', 'L', 'GASOLINE'],
    ['kgCO2e/Wh', 'kWh', 'ELECTRICITY'],
    ['kgCO2e/MWh', 'kWh', 'ELECTRICITY'],
    ['kgCO2e/(kWh*year)', 'kWh', 'ELECTRICITY'],
    ['kgCO2e/kWh/year', 'kWh', 'ELECTRICITY'],
    ['kgCO2e/passenger-km', 'passenger-km', 'AIR_TRAVEL'],
  ])('preserves the complete source unit %s', (source, input, activity) => {
    expect(formatSavedFactorUnit(source, input, activity)).toBe(source);
  });

  it.each([
    ['kgCO2e', 'kWh', 'ELECTRICITY', 'kgCO2e/kWh'],
    ['kgCO2e', ' kwh ', 'ELECTRICITY', 'kgCO2e/kWh'],
    ['kgCO2e', 'm³', 'NATURAL_GAS', 'kgCO2e/m3'],
    ['kgCO2e', 'L', 'GASOLINE', 'kgCO2e/liters'],
    ['kg CO₂e', 'GJ', 'NATURAL_GAS', 'kg CO₂e/GJ'],
    ['kgCO2e', 'passenger-km', 'AIR_TRAVEL', 'kgCO2e/passenger-km'],
  ])('adds only the supported input denominator: %s, %s', (source, input, activity, expected) => {
    expect(formatSavedFactorUnit(source, input, activity)).toBe(expected);
  });

  it.each([
    ['kgCO2e', 'Wh', 'ELECTRICITY'],
    ['kgCO2e', 'MWh', 'ELECTRICITY'],
    ['kgCO2e', 'm3/h', 'NATURAL_GAS'],
    ['kgCO2e', 'k/Wh', 'ELECTRICITY'],
    ['kgCO2e', 'unrecognized', 'ELECTRICITY'],
    ['kgCO2e', '', 'ELECTRICITY'],
    ['kgCO2e', 'kWh', 'UNSUPPORTED'],
    ['tCO2e', 'kWh', 'ELECTRICITY'],
    ['kgCO2e per kWh', 'kWh', 'ELECTRICITY'],
  ])('does not invent or convert an unsupported rate: %s, %s', (source, input, activity) => {
    expect(formatSavedFactorUnit(source, input, activity)).toBe(source);
  });

  it('does not invent a missing source unit', () => {
    expect(formatSavedFactorUnit(undefined, 'kWh', 'ELECTRICITY')).toBeUndefined();
    expect(formatSavedFactorUnit(' ', 'kWh', 'ELECTRICITY')).toBeUndefined();
  });
});
