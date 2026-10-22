import { describe, expect, it } from 'vitest';
import { getEventLogDateRange, formatEventLogDateTime, parseEventLogDateTime, validateEventLogCustomRange } from './eventLogDateRange';

describe('Event Log Mountain Time ranges', () => {
  it.each([
    ['2026-01-15T20:30:45.123Z', '2026-01-15T07:00:00.000Z'],
    ['2026-07-15T20:30:45.123Z', '2026-07-15T06:00:00.000Z'],
    ['2026-07-15T02:00:00.000Z', '2026-07-14T06:00:00.000Z'],
    ['2026-03-08T20:00:00.000Z', '2026-03-08T07:00:00.000Z'],
    ['2026-11-01T20:00:00.000Z', '2026-11-01T06:00:00.000Z'],
  ])('resolves Today at %s from Edmonton midnight', (now, start) => {
    expect(getEventLogDateRange('TODAY', new Date(now))).toEqual({ start, end: now });
  });

  it.each([
    ['LAST_HOUR', 1], ['LAST_24_HOURS', 24], ['LAST_7_DAYS', 168], ['LAST_30_DAYS', 720],
  ] as const)('uses elapsed hours for %s, including across DST', (period, hours) => {
    const now = new Date('2026-03-09T01:23:45.678Z');
    const range = getEventLogDateRange(period, now);
    expect(range.end).toBe(now.toISOString());
    expect(new Date(range.end).getTime() - new Date(range.start).getTime()).toBe(hours * 3_600_000);
  });

  it('converts Mountain wall time without browser-local parsing', () => {
    expect(formatEventLogDateTime('2026-01-15T07:00:00.000Z')).toBe('2026-01-15T00:00:00.000');
    expect(parseEventLogDateTime('2026-01-15T00:00')).toBe('2026-01-15T07:00:00.000Z');
    expect(parseEventLogDateTime('2026-07-15T00:00')).toBe('2026-07-15T06:00:00.000Z');
  });

  it('rejects nonexistent spring-forward wall times and invalid dates', () => {
    expect(parseEventLogDateTime('2026-03-08T02:30')).toBeNull();
    expect(parseEventLogDateTime('2026-02-30T10:00')).toBeNull();
    expect(parseEventLogDateTime('not a date')).toBeNull();
  });

  it('handles repeated fall-back wall times predictably and preserves preset instants', () => {
    expect(parseEventLogDateTime('2026-11-01T01:30')).toBe('2026-11-01T07:30:00.000Z');
    expect(parseEventLogDateTime('2026-11-01T01:30', '2026-11-01T08:30:00.000Z')).toBe('2026-11-01T08:30:00.000Z');
  });

  it.each(['2026-01-15T10:00', '2026-01-15T09:00'])('rejects end <= start: %s', (end) => {
    expect(validateEventLogCustomRange('2026-01-15T10:00', end)).toEqual({
      error: 'End date/time must be later than start date/time.', range: null,
    });
  });
});
