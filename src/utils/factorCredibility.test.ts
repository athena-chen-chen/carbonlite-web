import {
  buildMatchedFactorSnapshot,
  getFactorCredibilityBadges,
} from './factorCredibility';

describe('factor credibility helpers', () => {
  const groundTransportFactor = {
    id: 'pilot-ground-transport-canada-2025',
    name: 'Ground Transport - Canada - 2025',
    type: 'EMISSION',
    activityType: 'GROUND_TRANSPORT',
    inputUnit: 'km',
    unit: 'km',
    factorValue: 0.2,
    resultUnit: 'kgCO2e',
    sourceAuthority: 'CarbonLite',
    sourceDocument: 'CarbonLite Default Factor Library v1.0',
    sourceUrl: '/methodology/default-factors',
    sourceYear: 2025,
    factorVersion: 'v1.0',
    confidenceLevel: 'LOW',
    verificationStatus: 'PILOT_ESTIMATE',
    assumptions: 'Pilot estimate for ground transport distance-based calculation.',
    consultantReviewRecommended: true,
    isSystemDefault: true,
    isDefault: true,
  };

  it('marks Scope 3 pilot factors for consultant review', () => {
    expect(getFactorCredibilityBadges('GROUND_TRANSPORT', groundTransportFactor)).toEqual([
      'Pilot Estimate',
      'Low Confidence',
      'Consultant Review Recommended',
    ]);
  });

  it('builds activity record factor snapshot fields from the matched factor', () => {
    expect(
      buildMatchedFactorSnapshot({
        factor: groundTransportFactor,
        sourceLabel: 'System Default Factor',
        factorYear: 2025,
        selectionReason: 'PILOT_DEFAULT_FALLBACK',
        selectionExplanation: 'A CarbonLite pilot/default factor was used and requires review before formal reporting.',
      }),
    ).toMatchObject({
      matchedFactorValue: 0.2,
      matchedFactorUnit: 'kgCO2e/km',
      matchedFactorVersion: 'v1.0',
      matchedFactorSourceAuthority: 'CarbonLite',
      matchedFactorSourceDocument: 'CarbonLite Default Factor Library v1.0',
      matchedFactorSourceUrl: '/methodology/default-factors',
      matchedFactorVerificationStatus: 'PILOT_ESTIMATE',
      matchedFactorConfidenceLevel: 'LOW',
      matchedFactorAssumptions: 'Pilot estimate for ground transport distance-based calculation.',
      factorSelectionReason: 'PILOT_DEFAULT_FALLBACK',
    });
  });
});
