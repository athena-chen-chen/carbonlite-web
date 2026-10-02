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
  jurisdictionCountry: string | null;
  jurisdictionRegion: string | null;
  jurisdictionSource: string;
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
  jurisdictionCountry: string | null;
  jurisdictionRegion: string | null;
  jurisdictionLabel: string;
  regulatoryReference: string;
  thresholdLabel: string;
  thresholdTCO2e: number | null;
  totalKgCO2e: number;
  totalTCO2e: number;
  percentOfThreshold: number | null;
  status: FacilityThresholdScreeningStatus;
  screeningNote: FacilityThresholdScreeningNote;
};

export type FacilityThresholdScreeningStatus =
  | 'Below threshold / informational only'
  | 'Approaching threshold — review recommended'
  | 'Above threshold reference — professional review recommended'
  | 'Not evaluated';

export type FacilityThresholdScreeningNote =
  | 'Below threshold / informational only'
  | 'Approaching threshold — review recommended'
  | 'Above threshold reference — professional review recommended'
  | `Jurisdiction-specific threshold screening is not currently configured for ${string}.`
  | 'Jurisdiction required for facility-level threshold screening.'
  | 'Facility includes records from multiple jurisdictions; review jurisdiction before screening.';

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
  const jurisdictionBySite = new Map<string, Set<string>>();
  const jurisdictionSourcesBySite = new Map<string, Set<string>>();
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
        jurisdictionCountry: null,
        jurisdictionRegion: null,
        jurisdictionSource: 'unknown',
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
    const jurisdictionKey = getJurisdictionKey(detail);
    const jurisdictionSet = jurisdictionBySite.get(siteFacility) ?? new Set<string>();
    jurisdictionSet.add(jurisdictionKey);
    jurisdictionBySite.set(siteFacility, jurisdictionSet);
    const sourceSet = jurisdictionSourcesBySite.get(siteFacility) ?? new Set<string>();
    sourceSet.add(String(detail.jurisdictionSource ?? 'record'));
    jurisdictionSourcesBySite.set(siteFacility, sourceSet);

    organizationTotalKgCO2e += emissions;
    includedRecords += 1;
  });

  const rows = Array.from(rowsBySite.values()).map((row) => ({
    ...row,
    ...resolveFacilityJurisdiction(
      jurisdictionBySite.get(row.siteFacility) ?? new Set<string>(),
      jurisdictionSourcesBySite.get(row.siteFacility) ?? new Set<string>(),
    ),
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
    const jurisdictionRegion = normalizeJurisdictionRegion(row.jurisdictionRegion);
    const jurisdictionCountry = normalizeJurisdictionCountry(row.jurisdictionCountry);
    const jurisdictionLabel = formatJurisdictionLabel(jurisdictionRegion, jurisdictionCountry);

    if (!jurisdictionRegion) {
      return {
        siteFacility: row.siteFacility,
        jurisdictionCountry,
        jurisdictionRegion,
        jurisdictionLabel,
        regulatoryReference: 'Not configured',
        thresholdLabel: '—',
        thresholdTCO2e: null,
        totalKgCO2e: row.totalKgCO2e,
        totalTCO2e,
        percentOfThreshold: null,
        status: 'Not evaluated',
        screeningNote: 'Jurisdiction required for facility-level threshold screening.',
      };
    }

    if (jurisdictionRegion === 'Multiple jurisdictions') {
      return {
        siteFacility: row.siteFacility,
        jurisdictionCountry,
        jurisdictionRegion,
        jurisdictionLabel,
        regulatoryReference: 'Not configured',
        thresholdLabel: '—',
        thresholdTCO2e: null,
        totalKgCO2e: row.totalKgCO2e,
        totalTCO2e,
        percentOfThreshold: null,
        status: 'Not evaluated',
        screeningNote: 'Facility includes records from multiple jurisdictions; review jurisdiction before screening.',
      };
    }

    if (jurisdictionRegion !== 'Alberta') {
      return {
        siteFacility: row.siteFacility,
        jurisdictionCountry,
        jurisdictionRegion,
        jurisdictionLabel,
        regulatoryReference: 'Not configured',
        thresholdLabel: '—',
        thresholdTCO2e: null,
        totalKgCO2e: row.totalKgCO2e,
        totalTCO2e,
        percentOfThreshold: null,
        status: 'Not evaluated',
        screeningNote: `Jurisdiction-specific threshold screening is not currently configured for ${jurisdictionRegion}.`,
      };
    }

    const percentOfThreshold =
      (totalTCO2e / ALBERTA_TIER_LARGE_EMITTER_THRESHOLD_TCO2E) * 100;

    return {
      siteFacility: row.siteFacility,
      jurisdictionCountry,
      jurisdictionRegion,
      jurisdictionLabel,
      regulatoryReference: 'Alberta TIER pilot screening reference',
      thresholdLabel: `${ALBERTA_TIER_LARGE_EMITTER_THRESHOLD_TCO2E.toLocaleString()} t CO₂e/year`,
      thresholdTCO2e: ALBERTA_TIER_LARGE_EMITTER_THRESHOLD_TCO2E,
      totalKgCO2e: row.totalKgCO2e,
      totalTCO2e,
      percentOfThreshold,
      status: getFacilityThresholdScreeningStatus(percentOfThreshold),
      screeningNote: getFacilityThresholdScreeningNote(percentOfThreshold),
    };
  });
}

function getSiteFacilityLabel(detail: CalculationAuditDetail) {
  const value = String(detail.facilityName ?? detail.facilityId ?? '').trim();
  return value || 'Unassigned';
}

function getJurisdictionKey(detail: CalculationAuditDetail) {
  const region = normalizeJurisdictionRegion(detail.jurisdictionRegion);
  const country = normalizeJurisdictionCountry(detail.jurisdictionCountry);
  return `${region ?? ''}|${country ?? ''}`;
}

function resolveFacilityJurisdiction(
  jurisdictionKeys: Set<string>,
  jurisdictionSources: Set<string>,
) {
  const populatedKeys = Array.from(jurisdictionKeys).filter((key) => key !== '|');
  if (populatedKeys.length === 1) {
    const [jurisdictionRegion, jurisdictionCountry] = populatedKeys[0].split('|');
    return {
      jurisdictionCountry: jurisdictionCountry || null,
      jurisdictionRegion: jurisdictionRegion || null,
      jurisdictionSource: Array.from(jurisdictionSources).filter(Boolean).join(', ') || 'unknown',
    };
  }

  if (populatedKeys.length > 1) {
    return {
      jurisdictionCountry: null,
      jurisdictionRegion: 'Multiple jurisdictions',
      jurisdictionSource: Array.from(jurisdictionSources).filter(Boolean).join(', ') || 'record',
    };
  }

  return {
    jurisdictionCountry: null,
    jurisdictionRegion: null,
    jurisdictionSource: Array.from(jurisdictionSources).filter(Boolean).join(', ') || 'unknown',
  };
}

function normalizeJurisdictionCountry(value: string | null | undefined) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return null;
  if (/^ca$|^canada$/i.test(normalized)) return 'Canada';
  return normalized;
}

function normalizeJurisdictionRegion(value: string | null | undefined) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return null;
  if (/^ab$|^alta\.?$/i.test(normalized)) return 'Alberta';
  if (/^on$|^ont\.?$/i.test(normalized)) return 'Ontario';
  return normalized;
}

function formatJurisdictionLabel(region: string | null, country: string | null) {
  if (region && country) return `${region}, ${country}`;
  if (region) return region;
  if (country) return country;
  return 'Not provided';
}

function getFacilityThresholdScreeningStatus(
  percentOfThreshold: number,
): FacilityThresholdScreeningStatus {
  if (percentOfThreshold >= 100) {
    return 'Above threshold reference — professional review recommended';
  }

  if (percentOfThreshold >= 80) {
    return 'Approaching threshold — review recommended';
  }

  return 'Below threshold / informational only';
}

function getFacilityThresholdScreeningNote(
  percentOfThreshold: number,
): FacilityThresholdScreeningNote {
  if (percentOfThreshold >= 100) {
    return 'Above threshold reference — professional review recommended';
  }

  if (percentOfThreshold >= 80) {
    return 'Approaching threshold — review recommended';
  }

  return 'Below threshold / informational only';
}
