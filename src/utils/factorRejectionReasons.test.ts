import { describe, expect, it } from 'vitest';
import { LEGITIMATE_OFFICIAL_FACTOR } from '../test/legitimateFactorMetadata';
import { pilotConversionFactors } from '../test/pilotEmissionsFixture';
import { evaluateActivityRecord } from './canonicalRecordEvaluation';
import type { MatchableConversionFactor } from './conversionFactorMatching';

const input = {
  activityType: 'ELECTRICITY',
  quantity: 100,
  unit: 'kWh',
  jurisdictionCountry: 'Canada',
  jurisdictionRegion: 'Alberta',
  recordYear: 2026,
  organizationId: 'customer',
};

const approved: MatchableConversionFactor = {
  id: 'approved-corporate-electricity',
  name: 'Approved corporate electricity',
  activityType: 'ELECTRICITY',
  inputUnit: 'kWh',
  resultUnit: 'kgCO2e',
  factorValue: 0.1,
  jurisdictionCountry: 'Canada',
  jurisdictionRegion: 'Alberta',
  sourceYear: 2026,
  isSystemDefault: true,
  applicability: 'CORPORATE_INVENTORY',
  emissionBasis: 'DIRECT_CO2E',
  ...LEGITIMATE_OFFICIAL_FACTOR,
};

describe('factor rejection reasons', () => {
  const fieldMappingCandidates: Array<[string, number, string, string, string]> = [
    ['ELECTRICITY', 0.53, 'kWh', 'Alberta', 'Electricity - Alberta'],
    ['NATURAL_GAS', 49.44, 'GJ', 'Alberta', 'Natural Gas - Canada Generic'],
    ['GASOLINE', 2.31, 'L', 'British Columbia', 'Gasoline combustion'],
    ['HOTEL', 15, 'nights', 'Ontario', 'Hotel stays'],
    ['AIR_TRAVEL', 0.115, 'km', 'Alberta', 'Air travel'],
  ];

  it('reports NO_FACTOR_FOUND when no matching candidate exists', () => {
    const result = evaluateActivityRecord({ ...input, factors: [] });
    expect(result).toMatchObject({
      matchingStatus: 'NO_FACTOR_FOUND',
      calculationStatus: 'NO_FACTOR_FOUND',
      calculationMessage: 'No matching emission factor is available for this record.',
    });
  });

  it('reports FACTOR_NOT_APPROVED when a matching candidate fails governance', () => {
    const result = evaluateActivityRecord({
      ...input,
      factors: [{ ...approved, applicability: 'REFERENCE_ONLY' }],
    });
    expect(result).toMatchObject({
      matchingStatus: 'FACTOR_NOT_APPROVED',
      calculationStatus: 'FACTOR_NOT_APPROVED',
      calculationMessage: 'Factor found, but it is not approved for automatic calculation.',
      importEligible: false,
    });
  });

  it('keeps the unsupported Alberta 0.53 pilot factor blocked', () => {
    const result = evaluateActivityRecord({
      ...input,
      allowDemoFactorsForCalculations: true,
      factors: pilotConversionFactors,
    });
    expect(result.calculationStatus).toBe('FACTOR_NOT_APPROVED');
    expect(result.matchedFactorId).toBeUndefined();
    expect(result.calculatedEmissionsKgCO2e).toBeNull();
  });

  it('keeps Alberta EGDF blocked from corporate inventory calculation', () => {
    const result = evaluateActivityRecord({
      ...input,
      factors: [{
        ...approved,
        id: 'alberta-egdf-offset-reference',
        name: 'Alberta EGDF offset reference',
        applicability: 'ALBERTA_OFFSET_PROJECT',
      }],
    });
    expect(result.calculationStatus).toBe('FACTOR_NOT_APPROVED');
    expect(result.calculatedEmissionsKgCO2e).toBeNull();
  });

  it.each(fieldMappingCandidates)('keeps current field-mapping candidate %s unapproved', (activityType, factorValue, unit, region, name) => {
    const isNaturalGasReference = activityType === 'NATURAL_GAS';
    const result = evaluateActivityRecord({
      ...input,
      activityType,
      quantity: 1,
      unit,
      jurisdictionRegion: region,
      factors: [{
        id: `current-${activityType.toLowerCase()}`,
        name,
        activityType,
        inputUnit: unit,
        resultUnit: 'kgCO2e',
        factorValue,
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: activityType === 'ELECTRICITY' ? region : 'Canada',
        sourceYear: 2025,
        isSystemDefault: true,
        verified: false,
        verificationStatus: 'INTERNAL_REVIEW_REQUIRED',
        applicability: isNaturalGasReference ? 'CORPORATE_INVENTORY' : undefined,
        emissionBasis: isNaturalGasReference ? 'DIRECT_CO2E' : undefined,
      }],
    });
    expect(result).toMatchObject({ matchingStatus: 'FACTOR_NOT_APPROVED', calculationStatus: 'FACTOR_NOT_APPROVED' });
    expect(result.calculatedEmissionsKgCO2e).toBeNull();
  });

  it('still calculates normally with an approved factor', () => {
    const futureFactor = {
      ...approved,
      id: 'future-library-factor-with-no-code-rule',
      name: 'Future library factor with approved metadata',
      status: 'VERIFIED',
      emissionBasis: undefined,
    };
    const result = evaluateActivityRecord({ ...input, factors: [futureFactor] });
    expect(result).toMatchObject({
      matchingStatus: 'MATCHED',
      calculationStatus: 'CALCULATED',
      matchedFactorId: futureFactor.id,
      calculatedEmissionsKgCO2e: 10,
    });
  });

  it('rejects the same future library factor when approval metadata is removed', () => {
    const result = evaluateActivityRecord({
      ...input,
      factors: [{
        ...approved,
        id: 'future-library-factor-with-no-code-rule',
        name: 'Future library factor with approval removed',
        status: 'VERIFIED',
        emissionBasis: undefined,
        verified: undefined,
      }],
    });
    expect(result.calculationStatus).toBe('FACTOR_NOT_APPROVED');
    expect(result.calculatedEmissionsKgCO2e).toBeNull();
  });

  it.each([
    { applicability: undefined },
    { resultUnit: undefined },
    { verified: false },
    { verificationStatus: 'INTERNAL_REVIEW_REQUIRED' },
    { applicability: 'REFERENCE_ONLY' as const },
  ])('fails closed for a future factor with incomplete or restricted governance: %j', governance => {
    const result = evaluateActivityRecord({
      ...input,
      factors: [{ ...approved, id: 'future-incomplete-factor', ...governance }],
    });
    expect(result.calculationStatus).toBe('FACTOR_NOT_APPROVED');
    expect(result.calculatedEmissionsKgCO2e).toBeNull();
  });
});
