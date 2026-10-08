import { evaluateActivityRecord, isImportEligible } from './canonicalRecordEvaluation';
import {
  findBestConversionFactorMatch,
  type MatchableConversionFactor,
} from './conversionFactorMatching';

const factors: MatchableConversionFactor[] = [
  {
    id: 'factor-electricity-ab-2025',
    factorType: 'SYSTEM',
    isSystem: true,
    type: 'EMISSION',
    name: 'Electricity - Alberta',
    activityType: 'ELECTRICITY',
    inputUnit: 'kWh',
    resultUnit: 'kgCO2e',
    factorValue: 0.53,
    jurisdictionCountry: 'Canada',
    jurisdictionRegion: 'Alberta',
    sourceYear: 2025,
    factorVersion: 'v1.0',
    sourceAuthority: 'CarbonLite pilot defaults',
    sourceReference: 'Pilot factor set',
    verificationStatus: 'INTERNAL_REVIEW_REQUIRED',
    confidenceLevel: 'PILOT_ESTIMATE',
  },
  {
    id: 'factor-hotel-canada-2025',
    factorType: 'SYSTEM',
    isSystem: true,
    type: 'EMISSION',
    name: 'Hotel stays',
    activityType: 'HOTEL',
    inputUnit: 'nights',
    resultUnit: 'kgCO2e',
    factorValue: 15,
    jurisdictionCountry: 'Canada',
    jurisdictionRegion: 'Canada (Generic)',
    sourceYear: 2025,
    factorVersion: 'v1.0',
    sourceAuthority: 'CarbonLite pilot defaults',
    sourceReference: 'Pilot factor set',
    verificationStatus: 'INTERNAL_REVIEW_REQUIRED',
    confidenceLevel: 'PILOT_ESTIMATE',
  },
  {
    id: 'factor-diesel-liters-2025',
    factorType: 'SYSTEM',
    isSystem: true,
    type: 'EMISSION',
    name: 'Diesel - Canada',
    activityType: 'DIESEL',
    inputUnit: 'liters',
    resultUnit: 'kgCO2e',
    factorValue: 2.68,
    jurisdictionCountry: 'Canada',
    jurisdictionRegion: 'Canada',
    sourceYear: 2025,
  },
];

describe('canonical activity record evaluation', () => {
  it('classifies the golden imported records as ready, tracked-only, and import eligible', () => {
    const electricity = evaluateActivityRecord({
      activityType: 'Electricity',
      quantity: 980,
      unit: 'kWh',
      jurisdictionCountry: 'Canada',
      jurisdictionRegion: 'Alberta',
      recordYear: 2026,
      factors,
    });
    const water = evaluateActivityRecord({
      activityType: 'Water',
      quantity: 18,
      unit: 'm3',
      jurisdictionCountry: 'Canada',
      jurisdictionRegion: 'Alberta',
      recordYear: 2026,
      factors,
    });
    const hotel = evaluateActivityRecord({
      activityType: 'Business Travel - Accommodation',
      quantity: 4,
      unit: 'nights',
      jurisdictionCountry: 'Canada',
      jurisdictionRegion: 'Ontario',
      recordYear: 2026,
      factors,
    });

    expect(electricity).toMatchObject({
      status: 'READY',
      matchingStatus: 'MATCHED',
      calculationStatus: 'CALCULATED',
      reportTreatment: 'INCLUDED',
      importEligible: true,
      matchedFactorName: 'Electricity - Alberta',
      matchedFactorSourceYear: 2025,
      calculatedEmissionsKgCO2e: 519.4,
    });
    expect(isImportEligible(electricity)).toBe(true);

    expect(water).toMatchObject({
      status: 'TRACKED_ONLY',
      matchingStatus: 'TRACKED_ONLY',
      calculationStatus: 'TRACKED_ONLY',
      reportTreatment: 'TRACKED_ONLY',
      importEligible: true,
      calculatedEmissionsKgCO2e: null,
      factorSnapshot: {},
    });

    expect(hotel).toMatchObject({
      status: 'READY',
      matchingStatus: 'MATCHED',
      calculationStatus: 'CALCULATED',
      reportTreatment: 'INCLUDED',
      importEligible: true,
      matchedFactorName: 'Hotel stays',
      matchedFactorSourceYear: 2025,
      calculatedEmissionsKgCO2e: 60,
    });
  });

  it('classifies golden needs-review rows as not import eligible with specific issue codes', () => {
    const missingProvince = evaluateActivityRecord({
      activityType: 'Electricity',
      quantity: 760,
      unit: 'kWh',
      jurisdictionCountry: 'Canada',
      jurisdictionRegion: '',
      recordYear: 2026,
      factors,
    });
    const invalidQuantity = evaluateActivityRecord({
      activityType: 'Gasoline',
      quantity: 'approx 500',
      unit: 'liters',
      jurisdictionCountry: 'Canada',
      jurisdictionRegion: 'Alberta',
      recordYear: 2026,
      factors,
    });
    const dieselUnitMismatch = evaluateActivityRecord({
      activityType: 'Diesel',
      quantity: 240,
      unit: 'kg',
      jurisdictionCountry: 'Canada',
      jurisdictionRegion: 'Alberta',
      recordYear: 2026,
      factors,
    });

    expect(missingProvince.status).toBe('NEEDS_REVIEW');
    expect(missingProvince.importEligible).toBe(false);
    expect(missingProvince.issues.map((issue) => issue.code)).toContain('MISSING_PROVINCE');

    expect(invalidQuantity.status).toBe('NEEDS_REVIEW');
    expect(invalidQuantity.importEligible).toBe(false);
    expect(invalidQuantity.issues.map((issue) => issue.code)).toContain('INVALID_QUANTITY');

    expect(dieselUnitMismatch.status).toBe('NEEDS_REVIEW');
    expect(dieselUnitMismatch.importEligible).toBe(false);
    expect(dieselUnitMismatch.issues.map((issue) => issue.code)).toContain('UNIT_MISMATCH');
  });

  it('treats Natural Gas GJ as supported and calculates when a compatible GJ factor exists', () => {
    const evaluation = evaluateActivityRecord({
      activityType: 'Natural Gas',
      quantity: 3,
      unit: 'gigajoules',
      jurisdictionCountry: 'Canada',
      jurisdictionRegion: 'Alberta',
      recordYear: 2026,
      factors: [
        {
          id: 'factor-natural-gas-gj-2026',
          factorType: 'SYSTEM',
          isSystem: true,
          type: 'EMISSION',
          name: 'Natural Gas - Canada GJ',
          activityType: 'NATURAL_GAS',
          inputUnit: 'GJ',
          resultUnit: 'kgCO2e',
          factorValue: 49.87,
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Canada',
          sourceYear: 2026,
        },
      ],
    });

    expect(evaluation).toMatchObject({
      status: 'READY',
      matchingStatus: 'MATCHED',
      calculationStatus: 'CALCULATED',
      normalizedUnit: 'GJ',
      matchedFactorId: 'factor-natural-gas-gj-2026',
    });
    expect(evaluation.calculatedEmissionsKgCO2e).toBeCloseTo(149.61);
    expect(evaluation.issues).toEqual([]);
  });

  it('calculates Natural Gas GJ through a governed conversion-assisted m3 factor path', () => {
    const evaluation = evaluateActivityRecord({
      activityType: 'Natural Gas',
      quantity: 3,
      unit: 'GJ',
      jurisdictionCountry: 'Canada',
      jurisdictionRegion: 'Alberta',
      recordYear: 2026,
      factors: [
        {
          id: 'factor-natural-gas-m3-2026',
          factorType: 'SYSTEM',
          isSystem: true,
          type: 'EMISSION',
          name: 'Natural Gas - Alberta m3',
          activityType: 'NATURAL_GAS',
          inputUnit: 'm3',
          resultUnit: 'kgCO2e',
          factorValue: 1.89,
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Alberta',
          sourceYear: 2026,
        },
      ],
      unitConversions: [
        {
          id: 'conversion-natural-gas-gj-m3-ab-2026',
          activityType: 'NATURAL_GAS',
          fromUnit: 'GJ',
          toUnit: 'm3',
          conversionValue: 25,
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Alberta',
          sourceAuthority: 'Test authority',
          sourceDocument: 'Test heating value schedule',
          sourceYear: 2026,
          verificationStatus: 'REVIEWED',
          confidenceLevel: 'HIGH',
          lifecycleStatus: 'ACTIVE',
        },
      ],
    });

    expect(evaluation).toMatchObject({
      status: 'READY',
      matchingStatus: 'MATCHED',
      calculationStatus: 'CALCULATED',
      normalizedUnit: 'GJ',
      matchedFactorId: 'factor-natural-gas-m3-2026',
      convertedQuantity: 75,
      convertedUnit: 'm3',
    });
    expect(evaluation.matchedFactor?.isConversionAssisted).toBe(true);
    expect(evaluation.conversionSnapshot).toMatchObject({
      conversionValue: 25,
      sourceAuthority: 'Test authority',
      selectionReason: 'EXACT_CONVERSION_MATCH',
    });
    expect(evaluation.calculatedEmissionsKgCO2e).toBeCloseTo(141.75);
    expect(evaluation.issues).toEqual([]);
  });

  it('keeps Natural Gas GJ as Unit Mismatch when conversion provenance is missing', () => {
    const evaluation = evaluateActivityRecord({
      activityType: 'Natural Gas',
      quantity: 3,
      unit: 'GJ',
      jurisdictionCountry: 'Canada',
      jurisdictionRegion: 'Alberta',
      recordYear: 2026,
      factors: [
        {
          id: 'factor-natural-gas-m3-2026',
          factorType: 'SYSTEM',
          isSystem: true,
          type: 'EMISSION',
          name: 'Natural Gas - Alberta m3',
          activityType: 'NATURAL_GAS',
          inputUnit: 'm3',
          resultUnit: 'kgCO2e',
          factorValue: 1.89,
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Alberta',
          sourceYear: 2026,
        },
      ],
      unitConversions: [
        {
          id: 'conversion-natural-gas-gj-m3-ab-2026',
          activityType: 'NATURAL_GAS',
          fromUnit: 'GJ',
          toUnit: 'm3',
          conversionValue: 25,
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Alberta',
          sourceYear: 2026,
          verificationStatus: 'REVIEWED',
        },
      ],
    });

    expect(evaluation.status).toBe('NEEDS_REVIEW');
    expect(evaluation.matchingStatus).toBe('UNIT_MISMATCH');
    expect(evaluation.calculatedEmissionsKgCO2e).toBeNull();
    expect(evaluation.issues.map((issue) => issue.code)).toEqual(['UNIT_MISMATCH']);
  });

  it('uses deterministic factor tie-breaks after policy priority is exhausted', () => {
    const tiedFactors: MatchableConversionFactor[] = [
      {
        id: 'b-factor',
        factorType: 'SYSTEM',
        isSystem: true,
        type: 'EMISSION',
        name: 'Zulu Electricity Factor',
        activityType: 'ELECTRICITY',
        inputUnit: 'kWh',
        resultUnit: 'kgCO2e',
        factorValue: 0.52,
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Alberta',
        sourceYear: 2025,
      },
      {
        id: 'a-factor',
        factorType: 'SYSTEM',
        isSystem: true,
        type: 'EMISSION',
        name: 'Alpha Electricity Factor',
        activityType: 'ELECTRICITY',
        inputUnit: 'kWh',
        resultUnit: 'kgCO2e',
        factorValue: 0.51,
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Alberta',
        sourceYear: 2025,
      },
    ];

    expect(
      findBestConversionFactorMatch({
        activityType: 'ELECTRICITY',
        inputUnit: 'kWh',
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Alberta',
        recordYear: 2025,
        factors: tiedFactors,
      })?.factor.id,
    ).toBe('a-factor');
    expect(
      findBestConversionFactorMatch({
        activityType: 'ELECTRICITY',
        inputUnit: 'kWh',
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Alberta',
        recordYear: 2025,
        factors: [...tiedFactors].reverse(),
      })?.factor.id,
    ).toBe('a-factor');
  });
});
