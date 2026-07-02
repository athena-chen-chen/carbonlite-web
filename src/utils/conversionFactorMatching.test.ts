import {
  findBestConversionFactorMatch,
  normalizeActivityType,
  normalizeJurisdictionRegion,
} from './conversionFactorMatching';

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

  it('matches uppercase activity types to display-name factors after the official library refactor', () => {
    const match = findBestConversionFactorMatch({
      activityType: 'NATURAL_GAS',
      inputUnit: 'm³',
      organizationId: 'org-1',
      factors: [
        {
          id: 'factor-natural-gas-version',
          organizationId: null,
          name: 'Natural Gas combustion',
          type: 'EMISSION',
          displayName: 'Natural Gas',
          activityType: null,
          inputUnit: 'm3',
          factorValue: 1.89,
          resultUnit: 'kgCO2e',
          status: 'DRAFT',
          isSystemDefault: true,
          isDefault: true,
        },
      ],
    });

    expect(match?.factor.id).toBe('factor-natural-gas-version');
  });

  it.each([
    ['DIESEL', 'liters', 'Diesel', 'liters'],
    ['GASOLINE', 'L', 'Gasoline emission factor', 'liters'],
  ])('matches %s / %s to %s / %s', (activityType, inputUnit, factorName, factorUnit) => {
    const match = findBestConversionFactorMatch({
      activityType,
      inputUnit,
      organizationId: 'org-1',
      factors: [
        {
          id: `factor-${activityType}`,
          organizationId: null,
          name: factorName,
          type: 'EMISSION',
          inputUnit: factorUnit,
          factorValue: 1,
          resultUnit: 'kgCO2e',
          isSystemDefault: true,
          isDefault: true,
        },
      ],
    });

    expect(match?.factor.id).toBe(`factor-${activityType}`);
  });

  it('matches electricity only when province matches', () => {
    const match = findBestConversionFactorMatch({
      activityType: 'ELECTRICITY',
      inputUnit: 'KWH',
      jurisdictionCountry: 'Canada',
      jurisdictionRegion: 'AB',
      recordYear: 2025,
      organizationId: 'org-1',
      factors: [
        {
          id: 'factor-electricity-ab',
          organizationId: null,
          name: 'Electricity - Alberta - 2025',
          type: 'EMISSION',
          inputUnit: 'kWh',
          factorValue: 1,
          resultUnit: 'kgCO2e',
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Alberta',
          sourceYear: 2025,
          isSystemDefault: true,
          isDefault: true,
        },
      ],
    });

    expect(match?.factor.id).toBe('factor-electricity-ab');
  });

  it('does not fall back across provinces for electricity', () => {
    const match = findBestConversionFactorMatch({
      activityType: 'ELECTRICITY',
      inputUnit: 'kWh',
      jurisdictionCountry: 'Canada',
      jurisdictionRegion: 'British Columbia',
      recordYear: 2025,
      organizationId: 'org-1',
      factors: [
        {
          id: 'factor-electricity-ab',
          organizationId: null,
          name: 'Electricity - Alberta - 2025',
          type: 'EMISSION',
          inputUnit: 'kWh',
          factorValue: 1,
          resultUnit: 'kgCO2e',
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Alberta',
          sourceYear: 2025,
          isSystemDefault: true,
          isDefault: true,
        },
      ],
    });

    expect(match).toBeUndefined();
  });

  it('does not match electricity when province is missing', () => {
    const match = findBestConversionFactorMatch({
      activityType: 'ELECTRICITY',
      inputUnit: 'kWh',
      organizationId: 'org-1',
      factors: [
        {
          id: 'factor-electricity-ab',
          organizationId: null,
          name: 'Electricity - Alberta - 2025',
          type: 'EMISSION',
          inputUnit: 'kWh',
          factorValue: 1,
          resultUnit: 'kgCO2e',
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Alberta',
          isSystemDefault: true,
          isDefault: true,
        },
      ],
    });

    expect(match).toBeUndefined();
  });

  it('does not match unsupported units without a factor', () => {
    const match = findBestConversionFactorMatch({
      activityType: 'DIESEL',
      inputUnit: 'GJ',
      organizationId: 'org-1',
      factors: [systemDiesel],
    });

    expect(match).toBeUndefined();
  });

  it('does not use archived or deprecated factor versions', () => {
    const match = findBestConversionFactorMatch({
      activityType: 'DIESEL',
      inputUnit: 'liters',
      organizationId: 'org-1',
      factors: [
        {
          ...systemDiesel,
          id: 'archived-diesel',
          status: 'ARCHIVED',
        },
        {
          ...systemDiesel,
          id: 'deprecated-diesel',
          status: 'DEPRECATED',
        },
      ],
    });

    expect(match).toBeUndefined();
  });
});

describe('normalizeActivityType', () => {
  it('normalizes display names and enum values consistently', () => {
    expect(normalizeActivityType('DIESEL')).toBe('DIESEL');
    expect(normalizeActivityType('Diesel')).toBe('DIESEL');
    expect(normalizeActivityType('Natural Gas')).toBe('NATURAL_GAS');
    expect(normalizeActivityType('NATURAL_GAS')).toBe('NATURAL_GAS');
    expect(normalizeActivityType('Gasoline emission factor')).toBe('GASOLINE');
    expect(normalizeActivityType('Electricity - Alberta - 2025')).toBe('ELECTRICITY');
    expect(normalizeActivityType('Water')).toBe('WATER');
  });
});

describe('normalizeJurisdictionRegion', () => {
  it.each([
    ['AB', 'Alberta'],
    ['Alta.', 'Alberta'],
    ['Alberta', 'Alberta'],
    ['BC', 'British Columbia'],
    ['B.C.', 'British Columbia'],
    ['British Columbia', 'British Columbia'],
    ['ON', 'Ontario'],
    ['Ont.', 'Ontario'],
    ['Ontario', 'Ontario'],
    [null, null],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeJurisdictionRegion(input)).toBe(expected);
  });
});
