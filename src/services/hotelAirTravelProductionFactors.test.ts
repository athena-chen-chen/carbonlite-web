import { afterEach, describe, expect, it, vi } from 'vitest';
import { evaluateActivityRecord } from '../utils/canonicalRecordEvaluation';
import { getConversionFactors } from './conversionFactors';

const hotelFromBackend = {
  id: 'factor-library-hotel-canada-2026',
  organizationId: null,
  name: 'Hotel stay - Canada - occupied room-night - 2026',
  type: 'EMISSION',
  activityType: 'HOTEL',
  jurisdiction: 'Canada',
  region: 'Canada',
  country: 'Canada',
  inputUnit: 'room-night',
  unit: 'room-night',
  factorValue: 7.4,
  resultUnit: 'kgCO2e',
  sourceAuthority: 'UK Department for Energy Security and Net Zero',
  sourceDocument: '2026 Government greenhouse gas conversion factors for company reporting',
  sourceYear: 2026,
  factorStatus: 'VERIFIED',
  verificationStatus: 'VERIFIED',
  verified: true,
  applicability: 'CORPORATE_INVENTORY' as const,
  emissionBasis: 'DIRECT_CO2E' as const,
  isDefault: true,
  isSystemDefault: true,
  defaultScope: 'SCOPE_3',
  createdAt: '2026-10-30T00:00:00.000Z',
  updatedAt: '2026-10-30T00:00:00.000Z',
};

function mockFactorApi(items: unknown[]) {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
    items, page: 1, pageSize: 20, total: items.length, totalPages: 1,
  }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
}

describe('backend-provided travel factors', () => {
  afterEach(() => vi.restoreAllMocks());

  it('consumes the reviewed room-night factor through the API without a frontend catalog entry', async () => {
    mockFactorApi([hotelFromBackend]);
    const response = await getConversionFactors({ activityType: 'HOTEL' });
    const base = {
      activityType: 'HOTEL', quantity: 3,
      jurisdictionCountry: 'Canada', jurisdictionRegion: 'Ontario', recordYear: 2026,
      organizationId: 'paid-pilot-customer', allowDemoFactorsForCalculations: false,
      factors: response.items,
    };

    const calculated = evaluateActivityRecord({ ...base, unit: 'room-night' });
    expect(calculated).toMatchObject({
      calculationStatus: 'CALCULATED',
      matchedFactorId: hotelFromBackend.id,
    });
    expect(calculated.calculatedEmissionsKgCO2e).toBeCloseTo(22.2);
    expect(evaluateActivityRecord({ ...base, unit: 'nights' }).calculationStatus)
      .toBe('UNIT_MISMATCH');
  });

  it('keeps legacy hotel and generic air-travel values blocked', () => {
    const legacy = (activityType: string, unit: string, factorValue: number) => ({
      id: `legacy-${activityType}`,
      name: `Legacy ${activityType}`,
      activityType,
      unit,
      factorValue,
      resultUnit: 'kgCO2e',
      country: 'Canada',
      region: 'Canada',
      sourceYear: 2026,
      isSystemDefault: true,
      verified: false,
      verificationStatus: 'INTERNAL_REVIEW_REQUIRED',
    });

    expect(evaluateActivityRecord({
      activityType: 'HOTEL', quantity: 3, unit: 'nights',
      jurisdictionCountry: 'Canada', jurisdictionRegion: 'Ontario', recordYear: 2026,
      organizationId: 'paid-pilot-customer', factors: [legacy('HOTEL', 'nights', 15)],
    }).calculationStatus).toBe('FACTOR_NOT_APPROVED');
    expect(evaluateActivityRecord({
      activityType: 'AIR_TRAVEL', quantity: 4280, unit: 'km',
      jurisdictionCountry: 'Canada', jurisdictionRegion: 'Alberta', recordYear: 2026,
      organizationId: 'paid-pilot-customer', factors: [legacy('AIR_TRAVEL', 'km', 0.115)],
    }).calculationStatus).toBe('FACTOR_NOT_APPROVED');
  });
});
