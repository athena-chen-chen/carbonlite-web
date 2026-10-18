import type { CalculationAuditDetail } from '../../services/metrics';
import { resolveScopeClassification } from '../../utils/scopeClassification';
import { type FacilityRegulatoryThresholdReference } from '../../utils/siteFacilityBreakdown';

export function formatRegulatoryThresholdReference(reference: FacilityRegulatoryThresholdReference) {
  return [
    reference.authority ? `Authority: ${reference.authority}` : null,
    reference.programName ? `Program: ${reference.programName}` : null,
    reference.jurisdictionRegion || reference.jurisdictionCountry
      ? `Jurisdiction: ${[reference.jurisdictionRegion, reference.jurisdictionCountry].filter(Boolean).join(', ')}`
      : null,
    Number.isFinite(Number(reference.thresholdValue)) && reference.thresholdUnit
      ? `Threshold: ${Number(reference.thresholdValue).toLocaleString()} ${reference.thresholdUnit}`
      : null,
    reference.checkedDate ? `Checked: ${reference.checkedDate}` : null,
    reference.sourceUrl ? `Source: ${reference.sourceUrl}` : null,
    reference.notes ? `Notes: ${reference.notes}` : null,
  ].filter(Boolean).join(' · ');
}

export function formatCarbonCreditReadinessLevel(level: string) {
  const labels: Record<string, string> = {
    NOT_READY: 'Not ready',
    NEEDS_MORE_DATA: 'Needs more data',
    READY_FOR_PROFESSIONAL_REVIEW: 'Ready for professional review',
  };

  return labels[level] ?? level;
}

export function getCalculationScopeResolution(item: CalculationAuditDetail) {
  return resolveScopeClassification({
    activityType: item.activityType,
    scopeOverride: item.scopeOverride,
    factorDefaultScope: item.factorDefaultScope,
    factorScope: item.factorScope,
  });
}
export const REGULATORY_REPORTING_REFERENCE_TITLE = 'Regulatory Reporting Reference';
export const REGULATORY_REPORTING_REFERENCE_TEXT =
  'This report is for emissions data readiness and internal workflow review only. It is not a CRA fuel charge return, official GHGRP submission, TIER compliance report, third-party verification, or regulatory compliance advice.';

export type ReportOptions = {
  includeCarbonCreditReadinessNotes?: boolean;
};

export const DEFAULT_REPORT_OPTIONS: ReportOptions = {
  includeCarbonCreditReadinessNotes: false,
};
