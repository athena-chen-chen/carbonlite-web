import { findBestConversionFactorMatch } from './conversionFactorMatching';

const systemDiesel = {
  id: 'system-diesel',
  organizationId: null,
  name: 'System diesel',
  type: 'EMISSION',
  activityType: 'DIESEL',
  unit: 'L',
  factorValue: 2.68,
  isSystemDefault: true,
  isDefault: true,
  sourceAuthority: 'MVP Default',
  sourceYear: 2025,
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('findBestConversionFactorMatch', () => {
  it('uses organization custom diesel factor over system factor', () => {
    const match = findBestConversionFactorMatch({
      activityType: 'DIESEL',
      inputUnit: 'liters',
      organizationId: 'org-1',
      factors: [
        systemDiesel,
        {
          ...systemDiesel,
          id: 'custom-diesel',
          organizationId: 'org-1',
          name: 'Org diesel',
          factorValue: 3,
          isSystemDefault: false,
        },
      ],
    });

    expect(match?.factor.id).toBe('custom-diesel');
    expect(match?.sourceLabel).toBe('Organization Custom Factor');
  });

  it('falls back to system default factor when no organization custom factor exists', () => {
    const match = findBestConversionFactorMatch({
      activityType: 'DIESEL',
      inputUnit: 'L',
      organizationId: 'org-1',
      factors: [systemDiesel],
    });

    expect(match?.factor.id).toBe('system-diesel');
    expect(match?.sourceLabel).toBe('System Default Factor');
  });

  it('returns no match when activity type and input unit do not match', () => {
    const match = findBestConversionFactorMatch({
      activityType: 'ELECTRICITY',
      inputUnit: 'kWh',
      organizationId: 'org-1',
      factors: [systemDiesel],
    });

    expect(match).toBeUndefined();
  });

  it('does not use another organization custom factor', () => {
    const match = findBestConversionFactorMatch({
      activityType: 'DIESEL',
      inputUnit: 'L',
      organizationId: 'org-1',
      factors: [
        {
          ...systemDiesel,
          id: 'other-org-diesel',
          organizationId: 'org-2',
          name: 'Other org diesel',
          factorValue: 9,
          isSystemDefault: false,
        },
        systemDiesel,
      ],
    });

    expect(match?.factor.id).toBe('system-diesel');
    expect(match?.sourceLabel).toBe('System Default Factor');
  });
});
