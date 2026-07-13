import { describe, expect, it } from 'vitest';
import { getActivityTypeLabel, normalizeActivityType } from './activityType';

describe('activity type helpers', () => {
  it.each([
    ['Natural Gas', 'NATURAL_GAS'],
    ['natural-gas', 'NATURAL_GAS'],
    ['electricity', 'ELECTRICITY'],
    ['Hotel Stay', 'HOTEL'],
    ['Flights', 'AIR_TRAVEL'],
    ['Business Travel', 'BUSINESS_TRAVEL'],
    [null, null],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeActivityType(input)).toBe(expected);
  });

  it('formats canonical labels for display', () => {
    expect(getActivityTypeLabel('NATURAL_GAS')).toBe('Natural Gas');
    expect(getActivityTypeLabel('AIR_TRAVEL')).toBe('Air Travel');
    expect(getActivityTypeLabel(null)).toBe('Not specified');
  });
});
