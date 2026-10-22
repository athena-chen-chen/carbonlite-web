import {
  isInvalidUnit,
  isMissingUnit,
  normalizeUnitForDisplay,
  normalizeUnitKey,
} from './unitNormalization';

describe('unit normalization', () => {
  it.each(['L', 'l', 'liter', 'liters', 'litre', 'litres'])('normalizes fuel source unit %s without a mismatch', unit => {
    expect(normalizeUnitForDisplay(unit)).toEqual({ status: 'valid', value: 'liters' });
    expect(normalizeUnitKey(unit)).toBe('liters');
  });

  it('normalizes common unit variants for display', () => {
    expect(normalizeUnitForDisplay('LTR')).toEqual({ status: 'valid', value: 'liters' });
    expect(normalizeUnitForDisplay('m³')).toEqual({ status: 'valid', value: 'm3' });
    expect(normalizeUnitForDisplay('KWH')).toEqual({ status: 'valid', value: 'kWh' });
    expect(normalizeUnitForDisplay('Gj')).toEqual({ status: 'valid', value: 'GJ' });
    expect(normalizeUnitForDisplay('gJ')).toEqual({ status: 'valid', value: 'GJ' });
    expect(normalizeUnitForDisplay('gigajoule')).toEqual({ status: 'valid', value: 'GJ' });
    expect(normalizeUnitForDisplay('gigajoules')).toEqual({ status: 'valid', value: 'GJ' });
    expect(normalizeUnitForDisplay('metric tons')).toEqual({ status: 'valid', value: 'tonnes' });
    expect(normalizeUnitForDisplay('tkm')).toEqual({ status: 'valid', value: 'ton-km' });
    expect(normalizeUnitKey('GJ')).toBe('gj');
  });

  it('detects numeric OCR leftovers as invalid units', () => {
    expect(normalizeUnitForDisplay('20')).toEqual({ status: 'invalid', value: 'Invalid unit' });
    expect(isInvalidUnit('50')).toBe(true);
    expect(normalizeUnitKey('20')).toBe('');
  });

  it('detects missing internal values as missing units', () => {
    expect(normalizeUnitForDisplay(null)).toEqual({ status: 'missing', value: 'Missing unit' });
    expect(normalizeUnitForDisplay('undefined')).toEqual({ status: 'missing', value: 'Missing unit' });
    expect(isMissingUnit(null)).toBe(true);
  });
});
