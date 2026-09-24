import type { CalculationAuditDetail } from '../services/metrics';
import { getActivityTypeLabel } from './activityType';
import {
  formatScopeClassification,
  resolveScopeClassification,
} from './scopeClassification';

export type SiteFacilityActivityBreakdownRow = {
  activityType: string;
  totalKgCO2e: number;
  includedRecords: number;
};

export type SiteFacilityBreakdownRow = {
  siteFacility: string;
  scope1KgCO2e: number;
  scope2KgCO2e: number;
  scope3KgCO2e: number;
  totalKgCO2e: number;
  includedRecords: number;
  activityBreakdown: SiteFacilityActivityBreakdownRow[];
};

export type SiteFacilityRollup = {
  organizationTotalKgCO2e: number;
  includedRecords: number;
  rows: SiteFacilityBreakdownRow[];
};

export type FacilityThresholdReferenceRow = {
  siteFacility: string;
  totalKgCO2e: number;
  totalTCO2e: number;
  percentOfReportingThreshold: number;
  screeningNote: FacilityThresholdScreeningNote;
};

export type FacilityThresholdScreeningNote =
  | 'Below threshold reference'
  | 'Approaching threshold — review recommended'
  | 'Above threshold reference — professional review recommended';

export const FACILITY_REPORTING_THRESHOLD_TCO2E = 10000;
export const ALBERTA_TIER_LARGE_EMITTER_THRESHOLD_TCO2E = 100000;
export const FACILITY_THRESHOLD_REFERENCE_DISCLAIMER =
  'Threshold screening only. This does not constitute regulatory compliance advice.';

export function buildSiteFacilityBreakdown(
  calculationDetails: CalculationAuditDetail[] = [],
): SiteFacilityBreakdownRow[] {
  return buildSiteFacilityRollup(calculationDetails).rows;
}

export function buildSiteFacilityRollup(
  calculationDetails: CalculationAuditDetail[] = [],
): SiteFacilityRollup {
  const rowsBySite = new Map<string, SiteFacilityBreakdownRow>();
  const activityBreakdownsBySite = new Map<string, Map<string, SiteFacilityActivityBreakdownRow>>();
  let organizationTotalKgCO2e = 0;
  let includedRecords = 0;

  calculationDetails.forEach((detail) => {
    if (detail.status !== 'CALCULATED') return;

    const emissions = Number(detail.calculatedEmissionsKgCO2e ?? detail.calculatedEmission ?? 0);
    if (!Number.isFinite(emissions)) return;

    const scope = resolveScopeClassification({
      activityType: detail.activityType,
      scopeOverride: detail.scopeOverride,
      factorDefaultScope: detail.factorDefaultScope,
      factorScope: detail.factorScope,
    }).scope;
    const scopeLabel = formatScopeClassification(scope);

    if (scopeLabel !== 'Scope 1' && scopeLabel !== 'Scope 2' && scopeLabel !== 'Scope 3') {
      return;
    }

    const siteFacility = getSiteFacilityLabel(detail);
    const row =
      rowsBySite.get(siteFacility) ??
      {
        siteFacility,
        scope1KgCO2e: 0,
        scope2KgCO2e: 0,
        scope3KgCO2e: 0,
        totalKgCO2e: 0,
        includedRecords: 0,
        activityBreakdown: [],
      };

    if (scopeLabel === 'Scope 1') row.scope1KgCO2e += emissions;
    if (scopeLabel === 'Scope 2') row.scope2KgCO2e += emissions;
    if (scopeLabel === 'Scope 3') row.scope3KgCO2e += emissions;

    row.totalKgCO2e += emissions;
    row.includedRecords += 1;
    rowsBySite.set(siteFacility, row);

    const activityType = getActivityTypeLabel(detail.activityType) || 'Activity not specified';
    const activityBreakdown =
      activityBreakdownsBySite.get(siteFacility) ?? new Map<string, SiteFacilityActivityBreakdownRow>();
    const activityRow =
      activityBreakdown.get(activityType) ??
      {
        activityType,
        totalKgCO2e: 0,
        includedRecords: 0,
      };
    activityRow.totalKgCO2e += emissions;
    activityRow.includedRecords += 1;
    activityBreakdown.set(activityType, activityRow);
    activityBreakdownsBySite.set(siteFacility, activityBreakdown);

    organizationTotalKgCO2e += emissions;
    includedRecords += 1;
  });

  const rows = Array.from(rowsBySite.values()).map((row) => ({
    ...row,
    activityBreakdown: Array.from(activityBreakdownsBySite.get(row.siteFacility)?.values() ?? [])
      .sort((a, b) => {
        if (b.totalKgCO2e !== a.totalKgCO2e) return b.totalKgCO2e - a.totalKgCO2e;
        return a.activityType.localeCompare(b.activityType);
      }),
  })).sort((a, b) => {
    if (b.totalKgCO2e !== a.totalKgCO2e) return b.totalKgCO2e - a.totalKgCO2e;
    return a.siteFacility.localeCompare(b.siteFacility);
  });

  return {
    organizationTotalKgCO2e,
    includedRecords,
    rows,
  };
}

export function buildFacilityThresholdReferenceRows(
  siteFacilityRows: SiteFacilityBreakdownRow[] = [],
): FacilityThresholdReferenceRow[] {
  return siteFacilityRows.map((row) => {
    const totalTCO2e = row.totalKgCO2e / 1000;
    const percentOfReportingThreshold =
      (totalTCO2e / FACILITY_REPORTING_THRESHOLD_TCO2E) * 100;

    return {
      siteFacility: row.siteFacility,
      totalKgCO2e: row.totalKgCO2e,
      totalTCO2e,
      percentOfReportingThreshold,
      screeningNote: getFacilityThresholdScreeningNote(percentOfReportingThreshold),
    };
  });
}

function getSiteFacilityLabel(detail: CalculationAuditDetail) {
  const value = String(detail.facilityName ?? detail.facilityId ?? '').trim();
  return value || 'Unassigned';
}

function getFacilityThresholdScreeningNote(
  percentOfReportingThreshold: number,
): FacilityThresholdScreeningNote {
  if (percentOfReportingThreshold >= 100) {
    return 'Above threshold reference — professional review recommended';
  }

  if (percentOfReportingThreshold >= 80) {
    return 'Approaching threshold — review recommended';
  }

  return 'Below threshold reference';
}
