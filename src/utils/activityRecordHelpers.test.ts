import { describe, expect, it } from 'vitest';
import {
  getMissingProvinceElectricityRecords,
  getSetProvinceDisabledReason,
  getSetProvinceEligibleRecords,
  isElectricityActivityType,
  isElectricityRecord,
  isMissingProvince,
  normalizeActivityType,
  normalizeProvince,
} from './activityRecordHelpers';

describe('activity record helpers', () => {
  it.each([
    ['ELECTRICITY'],
    ['Electricity'],
    ['electricity'],
    ['electric'],
    ['Power'],
  ])('detects %s as electricity', (activityType) => {
    expect(isElectricityActivityType(activityType)).toBe(true);
    expect(isElectricityRecord({ activityType })).toBe(true);
    expect(normalizeActivityType(activityType)).toBe('ELECTRICITY');
  });

  it.each([
    null,
    undefined,
    '',
    '   ',
    '-',
    'missing',
    'Missing Province',
    'unknown',
    'not specified',
    'Province required',
    'N/A',
    'none',
  ])(
    'treats %s as missing province',
    (province) => {
      expect(isMissingProvince(province)).toBe(true);
    },
  );

  it('does not treat a valid province as missing', () => {
    expect(isMissingProvince('AB')).toBe(false);
  });

  it('normalizes Canadian province names and codes to province codes', () => {
    expect(normalizeProvince('Alberta')).toBe('AB');
    expect(normalizeProvince('AB')).toBe('AB');
    expect(normalizeProvince('British Columbia')).toBe('BC');
    expect(normalizeProvince('ON')).toBe('ON');
  });

  it('returns selected electricity records eligible for set province, including existing province values', () => {
    const eligible = getSetProvinceEligibleRecords(
      [
        { id: 'electric-1', organizationId: 'org-1', activityType: 'Power', jurisdictionRegion: '' },
        { id: 'electric-2', organizationId: 'org-1', activityType: 'ELECTRICITY', jurisdictionRegion: 'AB' },
        { id: 'electric-3', organizationId: 'org-1', activityType: 'ELECTRICITY', jurisdictionRegion: 'British Columbia' },
        { id: 'gas-1', organizationId: 'org-1', activityType: 'NATURAL_GAS', jurisdictionRegion: '' },
        { id: 'electric-other-org', organizationId: 'org-2', activityType: 'ELECTRICITY', jurisdictionRegion: '' },
        { id: '', organizationId: 'org-1', activityType: 'ELECTRICITY', jurisdictionRegion: '' },
      ],
      { canEdit: true, organizationId: 'org-1' },
    );

    expect(eligible.map((record) => record.id)).toEqual(['electric-1', 'electric-2', 'electric-3']);
  });

  it('returns missing-province electricity records separately for row guidance', () => {
    const missing = getMissingProvinceElectricityRecords(
      [
        { id: 'electric-1', organizationId: 'org-1', activityType: 'Power', jurisdictionRegion: '' },
        { id: 'electric-2', organizationId: 'org-1', activityType: 'ELECTRICITY', jurisdictionRegion: 'AB' },
        { id: 'gas-1', organizationId: 'org-1', activityType: 'NATURAL_GAS', jurisdictionRegion: '' },
      ],
      { canEdit: true, organizationId: 'org-1' },
    );

    expect(missing.map((record) => record.id)).toEqual(['electric-1']);
  });

  it.each([
    [
      { canEdit: true, selectedCount: 0, eligibleCount: 0, selectedProvince: '' },
      'No records selected.',
    ],
    [
      { canEdit: true, selectedCount: 2, eligibleCount: 0, selectedProvince: 'AB' },
      'No selected electricity records.',
    ],
    [
      { canEdit: true, selectedCount: 1, eligibleCount: 1, selectedProvince: '' },
      'Select a province before applying.',
    ],
    [
      { canEdit: true, selectedCount: 1, eligibleCount: 1, selectedProvince: 'AB', isUpdating: true },
      'Setting province...',
    ],
    [
      { canEdit: false, selectedCount: 1, eligibleCount: 1, selectedProvince: 'AB' },
      'Your account is not connected to a workspace.',
    ],
    [
      {
        canEdit: false,
        selectedCount: 1,
        eligibleCount: 1,
        selectedProvince: 'AB',
        user: { role: 'VIEWER', organizationId: 'org-1' },
      },
      'Your current role does not allow setting province.',
    ],
    [
      {
        canEdit: false,
        selectedCount: 1,
        eligibleCount: 1,
        selectedProvince: 'AB',
        user: { accountType: 'PILOT_REVIEWER' },
      },
      'Pilot review accounts cannot edit draft rows.',
    ],
  ])('returns disabled reason %s', (input, expected) => {
    expect(getSetProvinceDisabledReason(input)).toBe(expected);
  });
});
