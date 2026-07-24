import { describe, expect, it } from 'vitest';
import { getActivityTypeLabel, normalizeActivityType } from './activityType';

describe('activity type helpers', () => {
  it.each([
    ['Natural Gas', 'NATURAL_GAS'],
    ['natural-gas', 'NATURAL_GAS'],
    ['electricity', 'ELECTRICITY'],
    ['Electricity', 'ELECTRICITY'],
    ['ELECTRICITY', 'ELECTRICITY'],
    ['Hotel Stay', 'HOTEL'],
    ['Flights', 'AIR_TRAVEL'],
    ['Business Travel - Flight', 'AIR_TRAVEL'],
    ['Business Travel', 'AIR_TRAVEL'],
    ['Ground Transport', 'GROUND_TRANSPORT'],
    ['Business Travel - Ground Transport', 'GROUND_TRANSPORT'],
    ['Taxi', 'GROUND_TRANSPORT'],
    ['Rideshare', 'GROUND_TRANSPORT'],
    ['Rental Car', 'GROUND_TRANSPORT'],
    ['Waste', null],
    ['CUSTOM', null],
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
