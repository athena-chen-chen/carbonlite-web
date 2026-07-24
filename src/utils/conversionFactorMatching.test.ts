import {
  findBestConversionFactorMatch,
  normalizeActivityType,
  normalizeJurisdictionRegion,
} from './conversionFactorMatching';
import {
  pilotConversionFactors,
  pilotFactorCoverage,
  pilotUnsupportedElectricityProvinces,
} from '../test/pilotEmissionsFixture';

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
          verified: true,
          isSystemDefault: true,
          isDefault: true,
        },
      ],
    });

    expect(match?.factor.id).toBe('factor-electricity-ab');
  });

  it('uses the latest available prior-year electricity factor when exact year is unavailable', () => {
    const match = findBestConversionFactorMatch({
      activityType: 'Electricity',
      inputUnit: 'KWH',
      jurisdictionCountry: 'Canada',
      jurisdictionRegion: 'AB',
      recordYear: 2026,
      organizationId: 'org-1',
      factors: [
        {
          id: 'factor-electricity-ab-2024',
          organizationId: null,
          name: 'Electricity - Alberta - 2024',
          type: 'EMISSION',
          activityType: 'Electricity',
          inputUnit: 'kWh',
          factorValue: 0.5,
          resultUnit: 'kgCO2e/kWh',
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Alberta',
          sourceYear: 2024,
          isSystemDefault: true,
          isDefault: true,
        },
        {
          id: 'factor-electricity-ab-2025',
          organizationId: null,
          name: 'Electricity - Alberta - 2025',
          type: 'EMISSION',
          activityType: 'ELECTRICITY',
          inputUnit: 'kWh',
          factorValue: 0.53,
          resultUnit: 'kgCO2e/kWh',
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'AB',
          sourceYear: 2025,
          verified: false,
          isSystemDefault: true,
          isDefault: true,
        },
      ],
    });

    expect(match?.factor.id).toBe('factor-electricity-ab-2025');
    expect(match?.factorYear).toBe(2025);
    expect(match?.usedPriorYearFallback).toBe(true);
  });

  it('uses a prior-year province match when another province has the exact record year', () => {
    const match = findBestConversionFactorMatch({
      activityType: 'ELECTRICITY',
      inputUnit: 'kWh',
      jurisdictionCountry: 'Canada',
      jurisdictionRegion: 'Alberta',
      recordYear: 2026,
      organizationId: 'org-1',
      factors: [
        {
          id: 'factor-electricity-sk-2026',
          organizationId: null,
          name: 'Electricity - Saskatchewan - 2026',
          type: 'EMISSION',
          activityType: 'ELECTRICITY',
          unit: 'kWh',
          value: 0.64,
          resultUnit: 'kgCO2e/kWh',
          jurisdiction: 'Saskatchewan',
          sourceYear: 2026,
          isSystemDefault: true,
          isDefault: true,
        },
        {
          id: 'factor-electricity-ab-2025',
          organizationId: null,
          name: 'Electricity - Alberta - 2025',
          type: 'EMISSION',
          activityType: 'ELECTRICITY',
          unit: 'kWh',
          value: 0.53,
          resultUnit: 'kgCO2e/kWh',
          jurisdiction: 'Alberta',
          sourceYear: 2025,
          isSystemDefault: true,
          isDefault: true,
        },
      ],
    });

    expect(match?.factor.id).toBe('factor-electricity-ab-2025');
    expect(match?.factorYear).toBe(2025);
    expect(match?.usedPriorYearFallback).toBe(true);
  });

  it.each([
    [2025, false],
    [2026, true],
  ])('matches the exact Manual Entry Alberta diagnostic factor for record year %s', (recordYear, usedFallback) => {
    const match = findBestConversionFactorMatch({
      activityType: 'ELECTRICITY',
      inputUnit: 'kWh',
      jurisdictionCountry: 'Canada',
      jurisdictionRegion: 'Alberta',
      recordYear,
      organizationId: 'org-1',
      allowPlaceholderConfidence: true,
      factors: [
        {
          id: 'cmr75gv6l0007gdjbs0bz4d3j',
          name: 'Electricity - Alberta',
          activityType: 'ELECTRICITY',
          unit: 'kWh',
          jurisdiction: 'Alberta',
          sourceYear: 2025,
          factorValue: 0.53,
          isSystemDefault: true,
          confidenceLevel: 'Demo / Placeholder',
        },
      ],
    });

    expect(match?.factor.id).toBe('cmr75gv6l0007gdjbs0bz4d3j');
    expect(match?.factorYear).toBe(2025);
    expect(match?.usedPriorYearFallback).toBe(usedFallback);
  });

  it.each([
    ['British Columbia', 'bc-factor', 0.02],
    ['Ontario', 'on-factor', 0.12],
  ])('matches the Manual Entry %s diagnostic-style factor', (province, id, factorValue) => {
    const match = findBestConversionFactorMatch({
      activityType: 'ELECTRICITY',
      inputUnit: 'kWh',
      jurisdictionCountry: 'Canada',
      jurisdictionRegion: province,
      recordYear: 2026,
      organizationId: 'org-1',
      allowPlaceholderConfidence: true,
      factors: [
        {
          id,
          name: `Electricity - ${province}`,
          activityType: 'ELECTRICITY',
          unit: 'kWh',
          jurisdiction: province,
          sourceYear: 2025,
          factorValue,
          isSystemDefault: true,
          confidenceLevel: 'Demo / Placeholder',
        },
      ],
    });

    expect(match?.factor.id).toBe(id);
    expect(match?.factorYear).toBe(2025);
    expect(match?.usedPriorYearFallback).toBe(true);
  });

  it('does not use a future-year electricity factor for an earlier activity record', () => {
    const match = findBestConversionFactorMatch({
      activityType: 'ELECTRICITY',
      inputUnit: 'kWh',
      jurisdictionCountry: 'Canada',
      jurisdictionRegion: 'Alberta',
      recordYear: 2025,
      organizationId: 'org-1',
      factors: [
        {
          id: 'factor-electricity-ab-2026',
          organizationId: null,
          name: 'Electricity - Alberta - 2026',
          type: 'EMISSION',
          activityType: 'ELECTRICITY',
          inputUnit: 'kWh',
          factorValue: 0.53,
          resultUnit: 'kgCO2e/kWh',
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Alberta',
          sourceYear: 2026,
          isSystemDefault: true,
          isDefault: true,
        },
      ],
    });

    expect(match).toBeUndefined();
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

  it.each(pilotFactorCoverage)(
    'matches current pilot electricity factor coverage for %s',
    (province) => {
      const match = findBestConversionFactorMatch({
        activityType: 'ELECTRICITY',
        inputUnit: 'kWh',
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: province,
        recordYear: 2026,
        organizationId: 'org-1',
        factors: pilotConversionFactors,
      });

      expect(match?.factor.name).toContain(`Electricity - ${province}`);
      expect(match?.sourceLabel).toBe('System Default Factor');
    },
  );

  it.each(pilotUnsupportedElectricityProvinces)(
    'returns missing factor for unsupported pilot electricity province %s',
    (province) => {
      const match = findBestConversionFactorMatch({
        activityType: 'ELECTRICITY',
        inputUnit: 'kWh',
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: province,
        recordYear: 2026,
        organizationId: 'org-1',
        factors: pilotConversionFactors,
      });

      expect(match).toBeUndefined();
    },
  );

  it('matches pilot Ground Transport km records as Scope 3 without province', () => {
    const match = findBestConversionFactorMatch({
      activityType: 'Ground Transport',
      inputUnit: 'KM',
      jurisdictionCountry: 'Canada',
      jurisdictionRegion: null,
      recordYear: 2026,
      organizationId: 'org-1',
      factors: pilotConversionFactors,
    });

    expect(match?.factor.name).toBe('Ground Transport - Canada - 2025');
    expect(match?.factor.factorValue).toBe(0.2);
    expect(match?.factor.defaultScope).toBe('SCOPE_3');
    expect(match?.sourceLabel).toBe('System Default Factor');
    expect(match?.usedPriorYearFallback).toBe(true);
  });

  it('matches a Canada - National Ground Transport factor when the record has no province', () => {
    const match = findBestConversionFactorMatch({
      activityType: 'GROUND_TRANSPORT',
      inputUnit: 'km',
      jurisdictionCountry: 'Canada',
      jurisdictionRegion: '',
      recordYear: 2026,
      organizationId: 'org-1',
      factors: [
        {
          id: 'pilot-ground-transport-canada-2025',
          name: 'Ground Transport - Canada - 2025',
          type: 'EMISSION',
          activityType: 'GROUND_TRANSPORT',
          unit: 'km',
          factorValue: 0.2,
          resultUnit: 'kgCO2e',
          jurisdiction: 'Canada - National',
          sourceYear: 2025,
          isSystemDefault: true,
          isDefault: true,
          defaultScope: 'SCOPE_3',
        },
      ],
    });

    expect(match?.factor.id).toBe('pilot-ground-transport-canada-2025');
    expect(match?.factor.factorValue).toBe(0.2);
    expect(match?.factorYear).toBe(2025);
    expect(match?.usedPriorYearFallback).toBe(true);
  });

  it('does not match pilot Ground Transport when the unit is not km', () => {
    const match = findBestConversionFactorMatch({
      activityType: 'GROUND_TRANSPORT',
      inputUnit: 'miles',
      jurisdictionCountry: 'Canada',
      recordYear: 2026,
      organizationId: 'org-1',
      factors: pilotConversionFactors,
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
    expect(normalizeActivityType('Hotel Stay')).toBe('HOTEL');
    expect(normalizeActivityType('Accommodation')).toBe('HOTEL');
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
    ['Canada - National', 'Canada'],
    ['National', 'Canada'],
    ['Not province-specific', 'Canada'],
    [null, null],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeJurisdictionRegion(input)).toBe(expected);
  });
});
