import type { FormalConversionFactorUsed } from '../components/FormalReportPreview';
import type { CalculationAuditDetail } from '../services/metrics';
import {
  buildCalculatedFormula,
  formatCalculationStatus,
  formatFactorValue,
} from './calculationTraceability';
import { getActivityTypeLabel, getFactorDisplayName } from './activityType';
import { formatDateOnly } from './dateOnly';
import { formatCredibilityLabel } from './factorCredibility';
import { formatDisplayNumber, formatEmissionsValue } from './numberFormatting';
import { escapeCsvValue } from './reportCsvExport';
import {
  isRecordRequiringCorrection,
  isTrackedMetricDetail,
} from './reportCredibility';
import {
  formatScopeClassification,
  resolveScopeClassification,
} from './scopeClassification';
import type { SiteFacilityBreakdownRow } from './siteFacilityBreakdown';

export type ReviewPackageCsvKind =
  | 'data-records'
  | 'site-facility-breakdown'
  | 'factor-source-summary'
  | 'calculation-traceability'
  | 'records-requiring-review';

type CsvPrimitive = string | number;

function buildCsv(headers: readonly string[], rows: CsvPrimitive[][]) {
  return [
    headers.join(','),
    ...rows.map((row) => headers.map((_, index) => escapeCsvValue(row[index] ?? '')).join(',')),
  ].join('\n');
}

function clean(value: unknown) {
  const text = String(value ?? '').trim();
  return text && text.toLowerCase() !== 'null' && text.toLowerCase() !== 'undefined'
    ? text
    : '';
}

function numberValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return clean(value);
  return String(Math.round((numeric + Number.EPSILON) * 1_000_000) / 1_000_000);
}

function displayNumberValue(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? formatDisplayNumber(numeric) : clean(value);
}

function getSiteFacility(detail: CalculationAuditDetail) {
  return clean(detail.facilityName ?? detail.facilityId) || 'Unassigned';
}

function getScope(detail: CalculationAuditDetail) {
  return formatScopeClassification(
    resolveScopeClassification({
      activityType: detail.activityType,
      scopeOverride: detail.scopeOverride,
      factorDefaultScope: detail.factorDefaultScope,
      factorScope: detail.factorScope,
    }).scope,
  );
}

function getTreatment(detail: CalculationAuditDetail) {
  if (isTrackedMetricDetail(detail)) return 'Tracked Only';
  return detail.status === 'CALCULATED' ? 'Included' : 'Excluded';
}

function getStatus(detail: CalculationAuditDetail) {
  if (isTrackedMetricDetail(detail)) return 'Tracked Metric';
  return formatCalculationStatus(detail.status);
}

function getSourceReference(detail: CalculationAuditDetail) {
  const parts = [
    detail.sourceFileName,
    detail.sourceReference,
    detail.sourcePage ? `Page ${detail.sourcePage}` : '',
    detail.sourceRow ? `Line item ${detail.sourceRow}` : '',
  ].map(clean).filter(Boolean);

  return parts.join(' · ');
}

function getCalculatedEmissions(detail: CalculationAuditDetail) {
  if (isTrackedMetricDetail(detail)) return '';
  return numberValue(detail.calculatedEmissionsKgCO2e ?? detail.calculatedEmission);
}

function getFactorName(detail: CalculationAuditDetail) {
  if (isTrackedMetricDetail(detail)) return '';
  return getFactorDisplayName(detail.factorDisplayName || detail.factorName) || clean(detail.factorName);
}

function getFactorUnit(detail: CalculationAuditDetail) {
  if (isTrackedMetricDetail(detail)) return '';
  return clean(detail.factorResultUnit || detail.factorInputUnit);
}

function getFormula(detail: CalculationAuditDetail) {
  if (isTrackedMetricDetail(detail)) return 'Tracked only — excluded from GHG total';
  if (detail.status !== 'CALCULATED') return getIssueType(detail) || 'Calculation not completed';
  return detail.calculationFormula || buildCalculatedFormula(detail);
}

function getIssueType(detail: CalculationAuditDetail) {
  const status = String(detail.status ?? '').trim().toUpperCase();
  const calculationStatus = String(detail.calculationStatus ?? '').trim().toUpperCase();
  const matchingStatus = String(detail.matchingStatus ?? '').trim().toUpperCase();
  const combined = `${status} ${calculationStatus} ${matchingStatus}`;

  if (combined.includes('MISSING_PROVINCE') || combined.includes('MISSING_JURISDICTION')) {
    return 'Missing Province';
  }
  if (combined.includes('MISSING_FACTOR')) return 'Missing Factor';
  if (combined.includes('UNIT_MISMATCH') || combined.includes('INVALID_UNIT')) return 'Unit Mismatch';
  if (combined.includes('UNSUPPORTED_ACTIVITY')) return 'Unsupported Activity';
  if (combined.includes('INVALID_QUANTITY')) return 'Invalid Amount';
  if (combined.includes('MISSING_DATA')) return 'Invalid Date';
  return formatCalculationStatus(detail.status);
}

function getSuggestedFix(detail: CalculationAuditDetail) {
  const issueType = getIssueType(detail);
  if (issueType === 'Missing Province') return 'Select a province for electricity records.';
  if (issueType === 'Missing Factor') return 'Add or confirm an emission factor for this jurisdiction.';
  if (issueType === 'Unit Mismatch') return 'Convert unit or choose a supported unit.';
  if (issueType === 'Unsupported Activity') return 'Review unsupported activity type before import.';
  if (issueType === 'Invalid Amount') return 'Enter a valid positive activity quantity.';
  if (issueType === 'Invalid Date') return 'Enter or confirm the activity record date.';
  return 'Review this record before reporting.';
}

export function buildReviewPackageDataRecordsCsv(details: CalculationAuditDetail[]) {
  return buildCsv(
    [
      'Record Date',
      'Activity Type',
      'Quantity',
      'Unit',
      'Country',
      'Province',
      'Site / Facility',
      'Scope',
      'Treatment',
      'Status',
      'Emission Factor',
      'Factor Unit',
      'Calculated Emissions kgCO2e',
      'Source',
      'Source Reference',
      'Notes',
    ],
    details.map((detail) => [
      formatDateOnly(detail.recordDate),
      getActivityTypeLabel(detail.activityType),
      numberValue(detail.activityQuantity),
      clean(detail.activityUnit),
      clean(detail.jurisdictionCountry || detail.jurisdiction),
      clean(detail.jurisdictionRegion),
      getSiteFacility(detail),
      getScope(detail),
      getTreatment(detail),
      getStatus(detail),
      getFactorName(detail),
      getFactorUnit(detail),
      getCalculatedEmissions(detail),
      clean(detail.sourceType),
      getSourceReference(detail),
      clean(detail.notes || detail.matchingMessage || detail.reason),
    ]),
  );
}

export function buildReviewPackageSiteFacilityBreakdownCsv(
  rows: SiteFacilityBreakdownRow[],
  details: CalculationAuditDetail[] = [],
) {
  const countsBySite = new Map<string, { trackedMetrics: number; recordsRequiringReview: number }>();
  details.forEach((detail) => {
    const siteFacility = getSiteFacility(detail);
    const counts = countsBySite.get(siteFacility) ?? {
      trackedMetrics: 0,
      recordsRequiringReview: 0,
    };

    if (isTrackedMetricDetail(detail)) counts.trackedMetrics += 1;
    if (isRecordRequiringCorrection(detail)) counts.recordsRequiringReview += 1;
    countsBySite.set(siteFacility, counts);
  });

  return buildCsv(
    [
      'Site / Facility',
      'Scope 1 kgCO2e',
      'Scope 2 kgCO2e',
      'Scope 3 kgCO2e',
      'Total kgCO2e',
      'Included Records',
      'Tracked Metrics',
      'Records Requiring Review',
    ],
    rows.map((row) => [
      row.siteFacility || 'Unassigned',
      numberValue(row.scope1KgCO2e),
      numberValue(row.scope2KgCO2e),
      numberValue(row.scope3KgCO2e),
      numberValue(row.totalKgCO2e),
      row.includedRecords,
      countsBySite.get(row.siteFacility)?.trackedMetrics ?? 0,
      countsBySite.get(row.siteFacility)?.recordsRequiringReview ?? 0,
    ]),
  );
}

export function buildReviewPackageSiteFacilityActivityBreakdownCsv(rows: SiteFacilityBreakdownRow[]) {
  return buildCsv(
    [
      'Site / Facility',
      'Activity Type',
      'Scope',
      'Treatment',
      'Total Quantity',
      'Unit',
      'Total kgCO2e',
      'Included Records',
    ],
    rows.flatMap((row) =>
      row.activityBreakdown.map((activity) => [
      row.siteFacility || 'Unassigned',
        activity.activityType,
        '',
        'Included',
        '',
        '',
        numberValue(activity.totalKgCO2e),
        activity.includedRecords,
      ]),
    ),
  );
}

export function buildReviewPackageFactorSourceSummaryCsv(factors: FormalConversionFactorUsed[]) {
  return buildCsv(
    [
      'Activity Type',
      'Factor Name',
      'Jurisdiction',
      'Scope',
      'Factor Value',
      'Factor Unit',
      'Factor Set',
      'Source',
      'Source Year',
      'Effective Year',
      'Status',
      'Confidence',
      'Boundary',
      'Source Reference / URL',
      'Notes',
    ],
    factors.map((factor) => [
      getActivityTypeLabel(factor.activityType),
      getFactorDisplayName(factor.factorName) || clean(factor.factorName),
      clean(factor.jurisdiction),
      clean((factor as { factorScope?: string | null }).factorScope),
      numberValue(factor.factorValue),
      clean(factor.resultUnit || factor.inputUnit),
      clean(factor.factorSet),
      clean(factor.sourceAuthority),
      clean(factor.sourceYear ?? factor.factorYear),
      clean(factor.effectiveYear ?? factor.sourceYear ?? factor.factorYear),
      formatCredibilityLabel(factor.verificationStatus || factor.factorStatus) ||
        clean(factor.verificationStatus || factor.factorStatus),
      formatCredibilityLabel(factor.confidence || factor.confidenceLevel) ||
        clean(factor.confidence || factor.confidenceLevel),
      clean(factor.boundary),
      clean(factor.sourceUrl || factor.sourceDocument),
      clean(factor.notes || factor.assumptions),
    ]),
  );
}

export function buildReviewPackageCalculationTraceabilityCsv(details: CalculationAuditDetail[]) {
  return buildCsv(
    [
      'Record Date',
      'Activity Year Used For Matching',
      'Activity Type',
      'Quantity',
      'Unit',
      'Site / Facility',
      'Province',
      'Scope',
      'Factor Name',
      'Factor Value',
      'Factor Unit',
      'Factor Effective Year',
      'Factor Set',
      'Factor Source',
      'Formula',
      'Calculated Emissions kgCO2e',
      'Treatment',
      'Status',
      'Source Reference',
      'Notes',
    ],
    details.map((detail) => [
      formatDateOnly(detail.recordDate),
      clean(detail.recordYear ?? detail.reportingYear),
      getActivityTypeLabel(detail.activityType),
      displayNumberValue(detail.activityQuantity),
      clean(detail.activityUnit),
      getSiteFacility(detail),
      clean(detail.jurisdictionRegion),
      getScope(detail),
      getFactorName(detail),
      isTrackedMetricDetail(detail) ? '' : formatFactorValue(detail.factorValue),
      getFactorUnit(detail),
      clean(detail.factorEffectiveYear ?? detail.sourceYear ?? detail.factorYear),
      clean(detail.factorSet),
      clean(detail.sourceAuthority || detail.factorSource || detail.sourceDocument),
      getFormula(detail),
      getCalculatedEmissions(detail),
      getTreatment(detail),
      getStatus(detail),
      getSourceReference(detail),
      clean(detail.notes || detail.matchingMessage || detail.reason),
    ]),
  );
}

export function buildReviewPackageRecordsRequiringReviewCsv(details: CalculationAuditDetail[]) {
  const reviewRows = details.filter((detail) => isRecordRequiringCorrection(detail));

  return buildCsv(
    [
      'Record Date',
      'Activity Type',
      'Quantity',
      'Unit',
      'Country',
      'Province',
      'Site / Facility',
      'Issue Type',
      'Status',
      'Reason',
      'Suggested Fix',
      'Source Reference',
      'Notes',
    ],
    reviewRows.map((detail) => [
      formatDateOnly(detail.recordDate),
      getActivityTypeLabel(detail.activityType),
      numberValue(detail.activityQuantity),
      clean(detail.activityUnit),
      clean(detail.jurisdictionCountry || detail.jurisdiction),
      clean(detail.jurisdictionRegion),
      getSiteFacility(detail),
      getIssueType(detail),
      getStatus(detail),
      clean(detail.matchingMessage || detail.reason || getIssueType(detail)),
      getSuggestedFix(detail),
      getSourceReference(detail),
      clean(detail.notes),
    ]),
  );
}

export function getReviewPackageCsvFileName(kind: ReviewPackageCsvKind, date = new Date()) {
  const dateText = formatDateOnly(date.toISOString());
  const nameByKind: Record<ReviewPackageCsvKind, string> = {
    'data-records': 'carbonlite-data-records',
    'site-facility-breakdown': 'carbonlite-site-facility-breakdown',
    'factor-source-summary': 'carbonlite-factor-source-summary',
    'calculation-traceability': 'carbonlite-calculation-traceability',
    'records-requiring-review': 'carbonlite-records-requiring-review',
  };

  return `${nameByKind[kind]}-${dateText}.csv`;
}
