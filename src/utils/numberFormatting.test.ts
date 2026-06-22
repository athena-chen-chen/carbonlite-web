import { formatDisplayNumber, formatEmissionsValue } from './numberFormatting';

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
});
