import { normalizeSpreadsheetDate } from './ExcelInputTable';

describe('Excel date decoding with explicit workbook epoch', () => {
  it.each([
    [false, 46037, '2026-01-15'], [true, 44575, '2026-01-15'],
    [false, 45351, '2024-02-29'], [true, 43889, '2024-02-29'],
    [false, 46022, '2025-12-31'], [true, 44560, '2025-12-31'],
    [false, 46023, '2026-01-01'], [true, 44561, '2026-01-01'],
    [false, 46317, '2026-10-22'], [true, 44855, '2026-10-22'],
    [false, 46317.5, '2026-10-22'], [true, 44855.5, '2026-10-22'],
  ] as const)('decodes date1904=%s serial=%s as %s', (date1904, serial, expected) => {
    expect(normalizeSpreadsheetDate(serial, date1904)).toBe(expected);
  });
  it.each([false, true])('does not shift text or existing Date values (date1904=%s)', date1904 => {
    expect(normalizeSpreadsheetDate('2026-01-15', date1904)).toBe('2026-01-15');
    expect(normalizeSpreadsheetDate('2026-01-15T12:30:00Z', date1904)).toBe('2026-01-15');
    expect(normalizeSpreadsheetDate(new Date('2026-01-15T00:00:00Z'), date1904)).toBe('2026-01-15');
    expect(normalizeSpreadsheetDate(new Date('2026-01-15T23:59:00Z'), date1904)).toBe('2026-01-15');
    expect(normalizeSpreadsheetDate(new Date('invalid'), date1904)).toBe('');
  });
  it('keeps the existing 1900 default and the library leap-year quirk without another correction', () => {
    expect(normalizeSpreadsheetDate(46037)).toBe('2026-01-15');
    expect(normalizeSpreadsheetDate(59)).toBe('1900-02-28');
    expect(normalizeSpreadsheetDate(60)).toBe('1900-02-29');
    expect(normalizeSpreadsheetDate(61)).toBe('1900-03-01');
    expect(normalizeSpreadsheetDate(0, true)).toBe('1904-01-01');
  });
});
