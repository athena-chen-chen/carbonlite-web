import { describe, expect, it } from 'vitest';
import { isFactorAllowedForWorkspace } from './factorCalculationPolicy';
import { evaluateActivityRecord } from './canonicalRecordEvaluation';
import { findBestConversionFactorMatch, getCompatibleFactorUnitLabels } from './conversionFactorMatching';
import { goldenReport } from '../reports/pdf/__tests__/goldenFixtures';
import { pilotConversionFactors } from '../test/pilotEmissionsFixture';

const policy = { organizationId: 'customer', allowDemoFactorsForCalculations: false };
const official = { id: 'official', name: 'Diesel', activityType: 'DIESEL', unit: 'L', factorValue: 2.68,
  resultUnit: 'kgCO2e', region: 'Alberta', country: 'Canada', sourceYear: 2026, isSystemDefault: true,
  verified: true, confidenceLevel: 'OFFICIAL_GOVERNMENT', sourceAuthority: 'Environment and Climate Change Canada' };
const input = { ...policy, activityType: 'DIESEL', unit: 'L', quantity: 10,
  jurisdictionCountry: 'Canada', jurisdictionRegion: 'Alberta', recordYear: 2026 };

describe('workspace factor policy contract', () => {
  it('allows official and legitimate own-tenant factors without ownership-based exclusion', () => {
    expect(isFactorAllowedForWorkspace(official, policy)).toBe(true);
    expect(isFactorAllowedForWorkspace({ ...official, organizationId: 'customer', sourceAuthority: 'Customer laboratory', name: 'Pressure test measurement' }, policy)).toBe(true);
    expect(isFactorAllowedForWorkspace({ name: 'Reviewed engineering estimate', confidenceLevel: 'CUSTOM' }, policy)).toBe(true);
  });

  it.each([
    { confidenceLevel: 'DEMO' }, { confidenceLevel: 'Low (Placeholder)' }, { status: 'SYNTHETIC_TEST' }, { status: 'TEST_ONLY' }, { isPilotEstimate: true },
    { sourceAuthority: 'Synthetic RC fixture' }, { sourceDocument: 'Manual test factor' },
    { name: 'Synthetic RC historical diesel' }, { factorSet: 'PILOT_DEFAULT_V0_1' },
    { sourceAuthority: 'CarbonLite System Defaults' },
    { sourceDocument: 'CarbonLite Default Factor Library v1.0' },
    { source: { sourceDocument: 'Pilot demo factor library' } },
    { factor: { displayName: 'Synthetic factor' } },
    { methodologyProvenance: { isTestOnly: true } },
  ])('rejects test metadata even with a verified flag: %j', metadata => {
    const factor = { ...official, ...metadata, verified: true };
    expect(isFactorAllowedForWorkspace(factor, policy)).toBe(false);
    expect(evaluateActivityRecord({ ...input, factors: [factor] }).calculationStatus).toBe('MISSING_FACTOR');
    expect(evaluateActivityRecord({ ...input, factors: [factor], allowDemoFactorsForCalculations: true }).calculationStatus).toBe('CALCULATED');
  });

  it.each([false, true])('rejects cross-tenant factors even when demo=%s and a system flag is present', allowDemoFactorsForCalculations => {
    expect(evaluateActivityRecord({ ...input, allowDemoFactorsForCalculations, factors: [{ ...official, organizationId: 'other' }] }).calculationStatus).toBe('MISSING_FACTOR');
  });

  it('excludes own-tenant synthetic overrides and falls back only to a legitimate factor', () => {
    const synthetic = { ...official, id: 'synthetic', organizationId: 'customer', sourceAuthority: 'Synthetic test only', isSystemDefault: false };
    expect(evaluateActivityRecord({ ...input, factors: [synthetic] }).calculationStatus).toBe('MISSING_FACTOR');
    expect(evaluateActivityRecord({ ...input, factors: [synthetic, official] }).matchedFactorId).toBe('official');
    expect(evaluateActivityRecord({ ...input, factors: [{ ...official, id: 'custom', organizationId: 'customer', isSystemDefault: false }] }).matchedFactorId).toBe('custom');
  });

  it('filters nested versions and compatible-unit suggestions, not just direct matches', () => {
    const factor = { ...official, currentActiveVersion: { confidenceLevel: 'DEMO' } };
    expect(findBestConversionFactorMatch({ ...input, inputUnit: 'L', factors: [factor] })).toBeUndefined();
    expect(getCompatibleFactorUnitLabels({ ...input, inputUnit: 'kg', factors: [factor] })).toEqual([]);
    expect(evaluateActivityRecord({ ...input, unit: 'kg', factors: [factor] }).calculationStatus).toBe('MISSING_FACTOR');
  });

  it('preserves province and tracked-only requirements with demo enabled', () => {
    expect(evaluateActivityRecord({ ...input, allowDemoFactorsForCalculations: true, activityType: 'ELECTRICITY', jurisdictionRegion: null, factors: [] }).calculationStatus).toBe('MISSING_PROVINCE');
    expect(evaluateActivityRecord({ ...input, activityType: 'WATER', unit: 'm3', factors: [] }).calculationStatus).toBe('TRACKED_ONLY');
  });
});

it('recognizes the exact seeded demo owner without blocking arbitrary organization factors', () => {
  expect(isFactorAllowedForWorkspace({ organizationId: 'demo-org-id' }, { organizationId: 'demo-org-id' })).toBe(false);
  expect(isFactorAllowedForWorkspace({ organizationId: 'demo-org-id' }, { organizationId: 'demo-org-id', allowDemoFactorsForCalculations: true })).toBe(true);
  expect(isFactorAllowedForWorkspace({ organizationId: 'customer-with-demo-in-name' }, { organizationId: 'customer-with-demo-in-name' })).toBe(true);
});

it('preserves historical Golden A, Golden C and combined report totals without rematching factors', () => {
  const a = goldenReport('messy').report.inventory.totalKgCO2e;
  const c = goldenReport('field').report.inventory.totalKgCO2e;
  expect(a).toBe(579.4);
  expect(c).toBe(2428.44);
  expect(Number((a + c).toFixed(2))).toBe(3007.84);
});

it('reconciles fresh Golden A and C calculations after Alberta pilot electricity fails closed', () => {
  const approvedTestFactors = [
    { id: 'test-approved-hotel', name: 'Test-approved hotel', activityType: 'HOTEL', unit: 'nights', factorValue: 15, region: 'Canada', country: 'Canada' },
    { id: 'test-approved-natural-gas', name: 'Test-approved natural gas', activityType: 'NATURAL_GAS', unit: 'GJ', factorValue: 49.44, region: 'Canada', country: 'Canada' },
    { id: 'test-approved-gasoline', name: 'Test-approved gasoline', activityType: 'GASOLINE', unit: 'L', factorValue: 2.31, region: 'Canada', country: 'Canada' },
    { id: 'test-approved-air-travel', name: 'Test-approved air travel', activityType: 'AIR_TRAVEL', unit: 'km', factorValue: 0.115, region: 'Canada', country: 'Canada' },
  ].map(factor => ({
    ...factor, resultUnit: 'kgCO2e', sourceYear: 2026, isSystemDefault: true,
    applicability: 'CORPORATE_INVENTORY' as const,
    sourceAuthority: 'Example inventory agency', sourceDocument: 'Approved test-only corporate factor set',
  }));
  const factors = [...pilotConversionFactors, ...approvedTestFactors];
  const evaluate = (activityType: string, quantity: number, unit: string, jurisdictionRegion = 'Alberta') =>
    evaluateActivityRecord({
      activityType, quantity, unit, jurisdictionCountry: 'Canada', jurisdictionRegion,
      recordYear: 2026, organizationId: 'customer', allowDemoFactorsForCalculations: true, factors,
    });
  const goldenA = [
    evaluate('ELECTRICITY', 980, 'kWh'),
    evaluate('HOTEL', 4, 'nights', 'Ontario'),
    evaluate('WATER', 18, 'm3'),
    evaluate('DIESEL', 10, 'kg'),
    evaluate('ELECTRICITY', 760, 'kWh', ''),
    evaluate('Office Supplies', 10, 'kg'),
    evaluate('GASOLINE', 10, 'kg'),
    evaluate('DIESEL', 10, 'widgets'),
    evaluate('WATER', 0, 'widgets'),
  ];
  const goldenC = [
    evaluate('ELECTRICITY', 1250, 'kWh'),
    evaluate('NATURAL_GAS', 8.5, 'GJ'),
    evaluate('GASOLINE', 350, 'L', 'British Columbia'),
    evaluate('HOTEL', 3, 'nights', 'Ontario'),
    evaluate('AIR_TRAVEL', 4280, 'km'),
  ];
  const summarize = (rows: ReturnType<typeof evaluate>[]) => ({
    included: rows.filter(row => row.reportTreatment === 'INCLUDED').length,
    tracked: rows.filter(row => row.reportTreatment === 'TRACKED_ONLY').length,
    needsReview: rows.filter(row => row.status === 'NEEDS_REVIEW').length,
    total: Number(rows.reduce((sum, row) => sum + (row.calculatedEmissionsKgCO2e ?? 0), 0).toFixed(2)),
  });

  expect(summarize(goldenA)).toEqual({ included: 1, tracked: 1, needsReview: 7, total: 60 });
  expect(summarize(goldenC)).toEqual({ included: 4, tracked: 0, needsReview: 1, total: 1765.94 });
  expect(summarize([...goldenA, ...goldenC])).toEqual({ included: 5, tracked: 1, needsReview: 8, total: 1825.94 });
  expect(980 * .53).toBe(519.4);
  expect(1250 * .53).toBe(662.5);
  expect(Number((3007.84 - 519.4 - 662.5).toFixed(2))).toBe(1825.94);
});
