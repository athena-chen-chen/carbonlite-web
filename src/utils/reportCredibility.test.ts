import { describe, expect, it } from 'vitest';
import type { FormalConversionFactorUsed } from '../components/FormalReportPreview';
import type { CalculationAuditDetail } from '../services/metrics';
import {
  ELECTRICITY_PILOT_ASSUMPTION,
  EXACT_YEAR_ELECTRICITY_ASSUMPTION,
  PRIOR_YEAR_ELECTRICITY_ASSUMPTION,
  REFERENCE_ONLY_RESTRICTION,
  classifyReportFactorGovernance,
  formatReportAssumptions,
  formatTraceabilityReviewNote,
  isReportFactorPilotStage,
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
    factorInputUnit: 'kWh',
    factorResultUnit: 'kgCO2e',
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

  it('shows a genuine reference-only methodology assumption without weakening the restriction', () => {
    const assumption = 'Location-based grid average; transmission and distribution losses are excluded.';
    expect(formatReportAssumptions(factor({
      assumptions: assumption,
      factorProvenance: { applicability: 'REFERENCE_ONLY', emissionBasis: 'DIRECT_CO2E' },
    }))).toBe(`${REFERENCE_ONLY_RESTRICTION} Methodology assumption: ${assumption}`);
  });

  it('does not repeat legacy pilot or fallback wording for a reference-only factor', () => {
    expect(formatReportAssumptions(factor({
      factorYear: 2025,
      sourceYear: 2025,
      factorSelectionReason: 'PRIOR_YEAR_FALLBACK',
      factorProvenance: { applicability: 'REFERENCE_ONLY', emissionBasis: 'DIRECT_CO2E' },
    }))).toBe(REFERENCE_ONLY_RESTRICTION);
  });

  it('preserves genuine methodology assumptions verbatim', () => {
    const assumption = 'Location-based grid average; transmission and distribution losses are excluded.';
    expect(formatReportAssumptions(factor({ assumptions: assumption }))).toBe(assumption);
  });

  it('uses canonical governance metadata for pilot-stage classification', () => {
    expect(isReportFactorPilotStage(factor())).toBe(false);
    expect(isReportFactorPilotStage(factor({
      verified: false,
      factorStatus: 'PILOT_DEMO',
      verificationStatus: 'INTERNAL_REVIEW_REQUIRED',
      factorProvenance: null,
    }))).toBe(true);
    expect(isReportFactorPilotStage(factor({
      verified: false,
      factorStatus: 'REFERENCE_ONLY',
      factorProvenance: { applicability: 'REFERENCE_ONLY', emissionBasis: 'DIRECT_CO2E' },
    }))).toBe(false);
  });

  it('fails closed when report governance metadata is missing or incomplete', () => {
    expect(classifyReportFactorGovernance(factor({ factorProvenance: null })))
      .toBe('NEEDS_REVIEW');
    expect(classifyReportFactorGovernance(factor({
      factorProvenance: {
        applicability: 'CORPORATE_INVENTORY',
        emissionBasis: 'DIRECT_CO2E',
        factorStatus: 'ACTIVE',
        verificationStatus: 'VERIFIED',
      },
    }))).toBe('NEEDS_REVIEW');
  });

  it('delegates governed eligibility to the canonical inventory predicate', () => {
    expect(classifyReportFactorGovernance(factor())).toBe('CALCULATION_ELIGIBLE');
    expect(classifyReportFactorGovernance(factor({
      verified: true,
      factorStatus: 'REFERENCE_ONLY',
      factorProvenance: {
        applicability: 'REFERENCE_ONLY',
        emissionBasis: 'DIRECT_CO2E',
        calculationEligible: true,
        factorStatus: 'REFERENCE_ONLY',
        verificationStatus: 'VERIFIED',
      },
    }))).toBe('NEEDS_REVIEW');
    expect(classifyReportFactorGovernance(factor({
      factorProvenance: {
        applicability: 'CORPORATE_INVENTORY',
        emissionBasis: 'DIRECT_CO2E',
        calculationEligible: true,
        factorStatus: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        isActive: false,
      },
    }))).toBe('NEEDS_REVIEW');
    expect(classifyReportFactorGovernance(factor({
      factorId: 'pilot-electricity-ab-2026',
    }))).toBe('NEEDS_REVIEW');
  });
});
