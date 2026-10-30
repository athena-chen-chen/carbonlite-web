import { afterEach, describe, expect, it, vi } from 'vitest';
import { evaluateActivityRecord } from '../utils/canonicalRecordEvaluation';
import { pilotConversionFactors } from '../test/pilotEmissionsFixture';
import { getConversionFactors } from './conversionFactors';

const factorFromBackend = {
  id: 'factor-library-natural-gas-alberta-2026',
  organizationId: null,
  name: 'Natural gas combustion - Alberta - 2026',
  type: 'EMISSION',
  activityType: 'NATURAL_GAS',
  jurisdiction: 'Alberta, Canada',
  region: 'Alberta',
  country: 'Canada',
  inputUnit: 'GJ',
  unit: 'GJ',
  factorValue: 51.3756446991404,
  resultUnit: 'kgCO2e',
  sourceAuthority: 'Environment and Climate Change Canada',
  sourceDocument: 'Emission factors and reference values',
  sourceYear: 2026,
  factorStatus: 'VERIFIED',
  verificationStatus: 'VERIFIED',
  verified: true,
  applicability: 'CORPORATE_INVENTORY' as const,
  emissionBasis: 'DIRECT_CO2E' as const,
  isDefault: true,
  isSystemDefault: true,
  defaultScope: 'SCOPE_1',
  createdAt: '2026-10-30T00:00:00.000Z',
  updatedAt: '2026-10-30T00:00:00.000Z',
};

const input = {
  activityType: 'NATURAL_GAS', quantity: 8.5, unit: 'GJ',
  jurisdictionCountry: 'Canada', jurisdictionRegion: 'Alberta', recordYear: 2026,
  organizationId: 'paid-pilot-customer', allowDemoFactorsForCalculations: false,
};

function mockFactorApi(items: unknown[]) {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
    items, page: 1, pageSize: 20, total: items.length, totalPages: 1,
  }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
}

describe('backend-provided Alberta 2026 natural-gas factor', () => {
  afterEach(() => vi.restoreAllMocks());

  it('flows through the conversion-factor API and calculates 8.5 GJ without a frontend catalog entry', async () => {
    mockFactorApi([factorFromBackend]);
    const response = await getConversionFactors({ activityType: 'NATURAL_GAS' });
    const result = evaluateActivityRecord({ ...input, factors: response.items });

    expect(response.items).toContainEqual(expect.objectContaining(factorFromBackend));
    expect(result).toMatchObject({
      matchingStatus: 'MATCHED', calculationStatus: 'CALCULATED',
      matchedFactorId: factorFromBackend.id,
      calculatedEmissionsKgCO2e: 436.6929799426934,
    });
  });

  it('keeps the frontend 49.44 reference and legacy demo natural gas ineligible', async () => {
    mockFactorApi([]);
    const response = await getConversionFactors({ activityType: 'NATURAL_GAS' });
    const reference = response.items.find(item => item.factorValue === 49.44);
    const legacyDemo = pilotConversionFactors.find(item => item.id === 'factor-natural-gas');

    expect(reference).toMatchObject({ applicability: 'REFERENCE_ONLY', verified: false });
    expect(evaluateActivityRecord({ ...input, recordYear: 2025, factors: [reference!] }).calculationStatus)
      .toBe('FACTOR_NOT_APPROVED');
    expect(evaluateActivityRecord({ ...input, quantity: 1, unit: 'm3', factors: [legacyDemo!] }).calculationStatus)
      .toBe('FACTOR_NOT_APPROVED');
  });
});
