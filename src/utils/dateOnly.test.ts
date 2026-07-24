import {
  formatDateOnly,
  getDateOnlyYear,
  getTodayDateOnly,
  isValidDateOnly,
} from './dateOnly';

describe('dateOnly helpers', () => {
  it('formats date-only strings without timezone conversion', () => {
    expect(formatDateOnly('2026-07-20')).toBe('2026-07-20');
    expect(formatDateOnly('2026-07-20T00:00:00.000Z')).toBe('2026-07-20');
  });

  it('derives years from the date-only portion', () => {
    expect(getDateOnlyYear('2026-07-20')).toBe(2026);
    expect(getDateOnlyYear('2026-12-31T23:59:59.999Z')).toBe(2026);
  });

  it('uses local calendar parts for today defaults', () => {
    expect(getTodayDateOnly(new Date(2026, 6, 20, 23, 30))).toBe('2026-07-20');
  });

  it('validates real date-only values', () => {
    expect(isValidDateOnly('2026-07-20')).toBe(true);
    expect(isValidDateOnly('2026-02-31')).toBe(false);
  });
});
