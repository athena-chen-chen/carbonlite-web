import {
  formatCount,
  formatDisplayNumber,
  formatEmissionsUnit,
  formatEmissionsValue,
  formatEmissionsWithUnit,
  formatPdfEmissionsUnit,
  formatPdfEmissionsWithUnit,
  formatPdfText,
  pluralize,
} from './numberFormatting';

describe('number formatting', () => {
  it('removes floating point artifacts and adds thousands separators', () => {
    expect(formatEmissionsValue(94826.599999999999)).toBe('94,826.60');
    expect(formatEmissionsValue(520130)).toBe('520,130');
    expect(formatEmissionsValue(23930)).toBe('23,930');
  });

  it('keeps useful decimals without changing internal precision callers', () => {
    expect(formatDisplayNumber(12.345)).toBe('12.35');
    expect(formatDisplayNumber(123.4)).toBe('123.40');
    expect(formatDisplayNumber(1234.5)).toBe('1,234.50');
  });

  it('formats count labels for singular, plural, and irregular nouns', () => {
    expect(pluralize(0, 'source file')).toBe('source files');
    expect(pluralize(1, 'source file')).toBe('source file');
    expect(formatCount(2, 'source file')).toBe('2 source files');
    expect(formatCount(1, 'activity', 'activities')).toBe('1 activity');
    expect(formatCount(3, 'activity', 'activities')).toBe('3 activities');
  });

  it('formats emissions units for display without changing caller values', () => {
    expect(formatEmissionsUnit('kgCO2e')).toBe('kg CO₂e');
    expect(formatEmissionsUnit('kg CO2e')).toBe('kg CO₂e');
    expect(formatEmissionsUnit('kgCO2e/kWh')).toBe('kg CO₂e/kWh');
    expect(formatEmissionsUnit('15 kgCO2e/night')).toBe('15 kgCO2e/night');
    expect(formatEmissionsUnit('kgCO2e / liters')).toBe('kg CO₂e/liters');
    expect(formatEmissionsUnit('kgCO2e', { ascii: true })).toBe('kg CO2e');
    expect(formatEmissionsWithUnit(321.6)).toBe('321.60 kg CO₂e');
  });

  it('formats PDF-facing emissions text without unsupported subscript glyphs', () => {
    expect(formatPdfEmissionsUnit('kgCO2e')).toBe('kg CO2e');
    expect(formatPdfEmissionsUnit('kgCO2e/kWh')).toBe('kg CO2e/kWh');
    expect(formatPdfEmissionsUnit('tCO2e/year')).toBe('t CO2e/year');
    expect(formatPdfEmissionsWithUnit(579.4)).toBe('579.40 kg CO2e');
    expect(formatPdfText('980 kWh × 0.53 kg CO₂e/kWh = 519.40 kg CO₂e')).toBe(
      '980 kWh × 0.53 kg CO2e/kWh = 519.40 kg CO2e',
    );
  });
});
