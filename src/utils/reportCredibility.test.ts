import { describe, expect, it } from 'vitest';
import type { FormalConversionFactorUsed } from '../components/FormalReportPreview';
import type { CalculationAuditDetail } from '../services/metrics';
import {
  ELECTRICITY_PILOT_ASSUMPTION,
  EXACT_YEAR_ELECTRICITY_ASSUMPTION,
  PRIOR_YEAR_ELECTRICITY_ASSUMPTION,
  formatReportAssumptions,
  formatTraceabilityReviewNote,
} from './reportCredibility';

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
    sourceDocument: 'Emission factors and reference values',
    assumptions: ELECTRICITY_PILOT_ASSUMPTION,
    factorSelectionReason: 'EXACT_MATCH',
    factorProvenance: {
      applicability: 'CORPORATE_INVENTORY',
      emissionBasis: 'DIRECT_CO2E',
      calculationEligible: true,
      verificationStatus: 'VERIFIED',
      factorStatus: 'ACTIVE',
    },
    ...overrides,
  };
}

function detail(overrides: Partial<CalculationAuditDetail> = {}): CalculationAuditDetail {
  return {
    activityDataId: 'activity-1',
    activityType: 'ELECTRICITY',
    recordDate: '2026-11-17',
    dateEstimated: false,
    reportingYear: 2026,
    recordYear: 2026,
    jurisdiction: 'Alberta, Canada',
    jurisdictionCountry: 'Canada',
    jurisdictionRegion: 'Alberta',
    activityQuantity: 1,
    activityUnit: 'kWh',
    factorName: 'Electricity - Alberta - 2026 Location-based',
    factorValue: 0.438,
    factorYear: 2026,
    sourceYear: 2026,
    factorSource: 'Environment and Climate Change Canada',
    factorStatus: 'ACTIVE',
    factorVerified: true,
    factorVerificationStatus: 'VERIFIED',
    factorSelectionReason: 'EXACT_MATCH',
    factorProvenance: {
      applicability: 'CORPORATE_INVENTORY',
      emissionBasis: 'DIRECT_CO2E',
      calculationEligible: true,
      verificationStatus: 'VERIFIED',
      factorStatus: 'ACTIVE',
    },
    calculatedEmissionsKgCO2e: 0.438,
    calculationStatus: 'CALCULATED',
    matchingStatus: 'MATCHED',
    status: 'CALCULATED',
    sourceType: 'IMPORT',
    ...overrides,
  };
}

describe('report factor-governance wording', () => {
  it('replaces the legacy pilot assumption for a verified exact-year corporate-inventory factor', () => {
    expect(formatReportAssumptions(factor())).toBe(EXACT_YEAR_ELECTRICITY_ASSUMPTION);
    expect(formatTraceabilityReviewNote(detail())).toBe('Calculated with matched factor.');
    expect(formatTraceabilityReviewNote(detail({ factorVerificationStatus: 'REVIEWED' })))
      .toBe('Calculated with matched factor.');
  });

  it('describes a prior-year fallback only when the match evidence supports it', () => {
    expect(formatReportAssumptions(factor({
      factorYear: 2025,
      sourceYear: 2025,
      factorSelectionReason: 'PRIOR_YEAR_FALLBACK',
    }))).toBe(PRIOR_YEAR_ELECTRICITY_ASSUMPTION);
    expect(formatTraceabilityReviewNote(detail({
      factorYear: 2025,
      sourceYear: 2025,
      factorSelectionReason: 'PRIOR_YEAR_FALLBACK',
    }))).toBe('Prior-year factor used; review before formal reporting.');
  });

  it('keeps reference-only factors explicitly ineligible', () => {
    const referenceOnly = { applicability: 'REFERENCE_ONLY' as const, emissionBasis: 'DIRECT_CO2E' as const };
    expect(formatReportAssumptions(factor({ factorProvenance: referenceOnly })))
      .toBe('Reference-only factor; not eligible for corporate-inventory calculation.');
    expect(formatTraceabilityReviewNote(detail({
      factorYear: 2025,
      sourceYear: 2025,
      factorSelectionReason: 'PRIOR_YEAR_FALLBACK',
      factorProvenance: referenceOnly,
    })))
      .toBe('Reference-only factor is not eligible for corporate-inventory calculation.');
  });

  it('preserves genuine methodology assumptions verbatim', () => {
    const assumption = 'Location-based grid average; transmission and distribution losses are excluded.';
    expect(formatReportAssumptions(factor({ assumptions: assumption }))).toBe(assumption);
  });
});
