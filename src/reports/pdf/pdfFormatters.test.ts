import { describe, expect, it } from 'vitest';
import type { FormalConversionFactorUsed } from '../../components/FormalReportPreview';
import { ELECTRICITY_PILOT_ASSUMPTION } from '../../utils/reportCredibility';
import { buildFactorReviewSummary } from '../domain/buildFactorReviewSummary';
import {
  formatExecutiveFactorPriority,
  getPilotStageFactorCount,
  isPilotStageFactor,
} from './pdfFormatters';

function factor(overrides: Partial<FormalConversionFactorUsed> = {}): FormalConversionFactorUsed {
  return {
    factorName: 'Electricity - Alberta - 2026 Location-based',
    activityType: 'ELECTRICITY',
    factorValue: 0.438,
    inputUnit: 'kWh',
    resultUnit: 'kgCO2e',
    jurisdiction: 'Alberta, Canada',
    factorYear: 2026,
    reportingYear: 2026,
    factorStatus: 'ACTIVE',
    verificationStatus: 'VERIFIED',
    verified: true,
    factorType: 'System',
    sourceAuthority: 'Environment and Climate Change Canada',
    assumptions: ELECTRICITY_PILOT_ASSUMPTION,
    factorSelectionReason: 'EXACT_MATCH',
    factorProvenance: {
      applicability: 'CORPORATE_INVENTORY',
      emissionBasis: 'DIRECT_CO2E',
      calculationEligible: true,
      factorStatus: 'ACTIVE',
      verificationStatus: 'VERIFIED',
    },
    ...overrides,
  };
}

describe('Executive PDF factor governance classification', () => {
  it('does not classify the approved Alberta factor as pilot-stage from stale assumption text', () => {
    expect(isPilotStageFactor(factor())).toBe(false);
  });

  it('keeps a genuinely provisional factor classified as pilot-stage', () => {
    expect(isPilotStageFactor(factor({
      verified: false,
      factorStatus: 'PILOT_DEMO',
      verificationStatus: 'INTERNAL_REVIEW_REQUIRED',
      factorProvenance: null,
    }))).toBe(true);
  });

  it('distinguishes approved, restricted, and pilot-stage factors in a mixed report', () => {
    const restricted = factor({
      factorName: 'Reference electricity factor',
      verified: false,
      factorStatus: 'REFERENCE_ONLY',
      verificationStatus: 'UNVERIFIED',
      factorProvenance: { applicability: 'REFERENCE_ONLY', emissionBasis: 'DIRECT_CO2E' },
    });
    const pilot = factor({
      factorName: 'Pilot electricity factor',
      verified: false,
      factorStatus: 'PILOT_DEMO',
      verificationStatus: 'INTERNAL_REVIEW_REQUIRED',
      factorProvenance: null,
    });

    expect(getPilotStageFactorCount([factor(), restricted, pilot])).toBe(1);
    expect(buildFactorReviewSummary([factor(), restricted, pilot]).factorsRequiringReviewCount).toBe(2);
    expect(formatExecutiveFactorPriority(2, 1))
      .toBe('Validate both emission factors before formal use; replace pilot-stage factors where appropriate.');
  });

  it('does not infer approval from a Reviewed label alone', () => {
    const reviewedOnly = factor({
      verified: false,
      verificationStatus: 'REVIEWED',
      factorProvenance: {
        applicability: 'CORPORATE_INVENTORY',
        emissionBasis: 'DIRECT_CO2E',
        calculationEligible: true,
        factorStatus: 'ACTIVE',
        verificationStatus: 'REVIEWED',
      },
    });

    expect(isPilotStageFactor(reviewedOnly)).toBe(false);
    expect(buildFactorReviewSummary([reviewedOnly]).factorsRequiringReviewCount).toBe(1);
  });
});
