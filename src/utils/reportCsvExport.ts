import type { CalculationAuditDetail } from '../services/metrics';
import { getActivityTypeLabel } from './activityType';
import { formatCredibilityLabel } from './factorCredibility';
import {
  formatReportFactorVersion,
  formatReportJurisdiction,
  formatReportSourceReference,
  formatReportSourceType,
  formatReportVerification,
  formatTraceabilityReviewNote,
  isScope3PilotActivity,
  isTrackedMetricDetail,
} from './reportCredibility';
import {
  formatScopeClassification,
  formatScopeSource,
  resolveScopeClassification,
} from './scopeClassification';
import { formatDateOnly } from './dateOnly';
import { buildCalculatedFormula } from './calculationTraceability';

export const PILOT_CSV_HEADERS = [
  'Record No.',
  'Activity Type',
  'Record Date',
  'Quantity',
  'Quantity Display',
  'Unit',
  'Country',
  'Province / Jurisdiction',
  'Scope',
  'Report Treatment',
  'Calculation Status',
  'Matching Status',
  'Matched Factor Name',
  'Matched Factor Value',
  'Matched Factor Unit',
  'Factor Jurisdiction',
  'Factor Source Year',
  'Factor Version',
  'Factor Source Authority',
  'Factor Source Document',
  'Verification Status',
  'Confidence Level',
  'Consultant Review Recommended',
  'Formula',
  'Calculated Emissions kgCO2e',
  'Calculated Emissions Display',
  'Source File',
  'Source Type',
  'Import Method',
  'Source Reference',
  'Review Note',
] as const;

export type PilotCsvRow = Record<(typeof PILOT_CSV_HEADERS)[number], string | number>;

function normalizeStatus(value?: string | null) {
  return String(value ?? '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .toUpperCase();
}

function csvNumber(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return '';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '';
  return String(Math.round((numeric + Number.EPSILON) * 1_000_000) / 1_000_000);
}

function displayNumber(value?: string | number | null) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value === null || value === undefined ? '' : String(value);
  return numeric.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

const CSV_STATUS_LABELS: Record<string, string> = {
  CALCULATED: 'Calculated',
  MATCHED: 'Matched',
  TRACKED_ONLY: 'Tracked Only',
  REQUIRES_REVIEW: 'Requires Review',
  MISSING_FACTOR: 'Missing Factor',
  MISSING_PROVINCE: 'Missing Province',
  MISSING_JURISDICTION: 'Missing Province',
  UNIT_MISMATCH: 'Unit Mismatch',
  INVALID_UNIT: 'Unit Mismatch',
  UNSUPPORTED_ACTIVITY: 'Unsupported Activity',
  NOT_IMPORTABLE: 'Not Importable',
  EXCLUDED: 'Excluded',
  INCLUDED: 'Included',
};

function formatCsvDisplayLabel(value?: string | null) {
  const normalized = normalizeStatus(value);
  if (!normalized) return '';
  return CSV_STATUS_LABELS[normalized] || formatCredibilityLabel(value) || normalized
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getScopeLabel(detail: CalculationAuditDetail) {
  const scope = resolveScopeClassification({
    activityType: detail.activityType,
    scopeOverride: detail.scopeOverride,
    factorDefaultScope: detail.factorDefaultScope,
    factorScope: detail.factorScope,
  }).scope;
  return formatScopeClassification(scope);
}

function getReportTreatment(detail: CalculationAuditDetail) {
  if (isTrackedMetricDetail(detail)) return 'Tracked Only';
  if (detail.status === 'CALCULATED') return 'Included';
  return 'Excluded';
}

function getCalculationStatus(detail: CalculationAuditDetail) {
  if (isTrackedMetricDetail(detail)) return 'Tracked Only';
  return formatCsvDisplayLabel(detail.calculationStatus || detail.status) || 'Not specified';
}

function getMatchingStatus(detail: CalculationAuditDetail) {
  if (isTrackedMetricDetail(detail)) return 'Tracked Only';
  if (detail.status === 'CALCULATED') return 'Matched';
  return formatCsvDisplayLabel(detail.matchingStatus || detail.status) || 'Not specified';
}

function singularizeFactorDenominator(unit?: string | null) {
  const clean = String(unit ?? '').trim();
  const normalized = clean.toLowerCase();

  if (normalized === 'liters' || normalized === 'litres') return 'liter';
  if (normalized === 'liter' || normalized === 'litre') return 'liter';
  if (normalized === 'nights') return 'night';
  if (normalized === 'kilometers' || normalized === 'kilometres') return 'km';
  if (normalized === 'kilometer' || normalized === 'kilometre') return 'km';
  if (normalized === 'cubic meters' || normalized === 'cubic metres') return 'm3';
  return clean;
}

export function formatCsvFactorUnit(detail: CalculationAuditDetail) {
  if (isTrackedMetricDetail(detail)) return 'No emissions factor applied';
  const resultUnit = detail.factorResultUnit || 'kgCO2e';
  if (resultUnit.includes('/')) {
    const [resultNumerator, resultDenominator] = resultUnit.split('/');
    const normalizedDenominator = singularizeFactorDenominator(resultDenominator);
    return normalizedDenominator ? `${resultNumerator}/${normalizedDenominator}` : resultNumerator;
  }
  const inputUnit = singularizeFactorDenominator(detail.factorInputUnit || detail.activityUnit);
  return inputUnit ? `${resultUnit}/${inputUnit}` : resultUnit;
}

function isNationalFactorValue(value?: string | null) {
  const text = String(value ?? '').trim().toLowerCase();
  return text === 'canada' || text === 'national' || text === 'canada - national' || text === 'canada (generic)';
}

export function formatCsvFactorJurisdiction(detail: CalculationAuditDetail) {
  if (isTrackedMetricDetail(detail)) return 'No emissions factor applied';
  const region = String(detail.factorJurisdictionRegion ?? '').trim();
  const country = String(detail.factorJurisdictionCountry ?? '').trim();

  if (isNationalFactorValue(region) || (!region && country.toLowerCase() === 'canada')) {
    return 'Canada (Generic)';
  }

  if (region || country) return formatReportJurisdiction(region, country);

  if (detail.status === 'CALCULATED') return 'Canada (Generic)';
  return 'Not specified';
}

function getMatchedFactorName(detail: CalculationAuditDetail) {
  if (isTrackedMetricDetail(detail)) return 'No emissions factor applied';
  return detail.factorDisplayName || detail.factorName || 'Not specified';
}

function buildRawCalculationFormula(detail: CalculationAuditDetail) {
  if (isTrackedMetricDetail(detail)) return 'Tracked only. Not included in emissions total.';
  if (detail.status !== 'CALCULATED') return formatTraceabilityReviewNote(detail);
  return buildCalculatedFormula(detail);
}

function usesPriorYearFactor(detail: CalculationAuditDetail) {
  const recordYear = Number(detail.recordYear ?? detail.reportingYear);
  const factorYear = Number(detail.factorYear ?? detail.sourceYear);
  return Number.isFinite(recordYear) && Number.isFinite(factorYear) && factorYear > 0 && factorYear < recordYear;
}

function getConsultantReviewRecommended(detail: CalculationAuditDetail) {
  if (isTrackedMetricDetail(detail)) return 'Not applicable';
  if (isScope3PilotActivity(detail.activityType)) return 'Yes - Scope 3 review recommended';
  const verification = formatReportVerification({
    activityType: detail.activityType,
    verified: detail.factorVerified,
    factorStatus: detail.factorStatus,
    verificationStatus: detail.factorVerificationStatus,
  });
  return /review|pilot|unverified|draft/i.test(verification)
    ? 'Review before formal reporting'
    : 'No';
}

function buildCsvReviewNote(detail: CalculationAuditDetail) {
  if (isTrackedMetricDetail(detail)) return 'Tracked only. Not included in emissions total.';
  if (detail.status !== 'CALCULATED') return formatTraceabilityReviewNote(detail);

  const factorType = String(detail.factorType ?? '').toUpperCase() === 'CUSTOM'
    ? 'Custom Factor'
    : 'CarbonLite System Factor';
  const notes = [`Matched to ${factorType}.`];

  if (usesPriorYearFactor(detail)) {
    notes.push('Using latest available prior-year factor because no factor was found for the record year.');
  }

  if (isScope3PilotActivity(detail.activityType)) {
    notes.push('Pilot-stage Scope 3 estimate. Consultant review recommended before formal reporting.');
  }

  return notes.join(' ');
}

function getSourceFile(detail: CalculationAuditDetail) {
  if (normalizeStatus(detail.sourceType) === 'MANUAL') return 'Manual Entry';
  return String(detail.sourceFileName ?? '').trim() || 'Not specified';
}

export function buildPilotCsvRows(calculationDetails: CalculationAuditDetail[]): PilotCsvRow[] {
  return calculationDetails.map((detail, index) => {
    const sourceType = formatReportSourceType(detail.sourceType, detail.sourceFileName, detail.sourceReference);
    const sourceReference = formatReportSourceReference({
      sourceFileName: detail.sourceFileName,
      sourceReference: detail.sourceReference,
      sourceType: detail.sourceType,
    });
    const calculatedEmissions = detail.calculatedEmissionsKgCO2e ?? detail.calculatedEmission;

    return {
      'Record No.': index + 1,
      'Activity Type': getActivityTypeLabel(detail.activityType),
      'Record Date': formatDateOnly(detail.recordDate),
      Quantity: csvNumber(detail.activityQuantity),
      'Quantity Display': `${displayNumber(detail.activityQuantity)} ${detail.activityUnit || ''}`.trim(),
      Unit: detail.activityUnit || 'Not specified',
      Country: detail.jurisdictionCountry || 'Canada',
      'Province / Jurisdiction': detail.jurisdictionRegion || detail.jurisdiction || 'Not specified',
      Scope: getScopeLabel(detail),
      'Report Treatment': getReportTreatment(detail),
      'Calculation Status': getCalculationStatus(detail),
      'Matching Status': getMatchingStatus(detail),
      'Matched Factor Name': getMatchedFactorName(detail),
      'Matched Factor Value': isTrackedMetricDetail(detail) ? '' : csvNumber(detail.factorValue),
      'Matched Factor Unit': formatCsvFactorUnit(detail),
      'Factor Jurisdiction': formatCsvFactorJurisdiction(detail),
      'Factor Source Year': isTrackedMetricDetail(detail) ? 'Not applicable' : detail.factorYear || detail.sourceYear || 'Not specified',
      'Factor Version': isTrackedMetricDetail(detail) ? 'Not applicable' : formatReportFactorVersion({
        factorVersion: detail.factorVersion,
        sourceDocument: detail.sourceDocument,
        sourceAuthority: detail.sourceAuthority,
      }),
      'Factor Source Authority': isTrackedMetricDetail(detail) ? 'Not applicable' : detail.sourceAuthority || detail.factorSource || 'Not specified',
      'Factor Source Document': isTrackedMetricDetail(detail) ? 'Not applicable' : detail.sourceDocument || 'Not specified',
      'Verification Status': isTrackedMetricDetail(detail)
        ? 'Tracked Only'
        : formatReportVerification({
            activityType: detail.activityType,
            verified: detail.factorVerified,
            factorStatus: detail.factorStatus,
            verificationStatus: detail.factorVerificationStatus,
          }),
      'Confidence Level': isTrackedMetricDetail(detail)
        ? 'Not applicable'
        : formatCredibilityLabel(detail.factorConfidenceLevel) || 'Not specified',
      'Consultant Review Recommended': getConsultantReviewRecommended(detail),
      Formula: buildRawCalculationFormula(detail),
      'Calculated Emissions kgCO2e': isTrackedMetricDetail(detail) ? 0 : csvNumber(calculatedEmissions),
      'Calculated Emissions Display': isTrackedMetricDetail(detail)
        ? 'Tracked only'
        : `${displayNumber(calculatedEmissions)} kgCO2e`,
      'Source File': getSourceFile(detail),
      'Source Type': sourceType,
      'Import Method': sourceType,
      'Source Reference': sourceReference,
      'Review Note': buildCsvReviewNote(detail),
    };
  });
}

export function escapeCsvValue(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function buildPilotCsv(calculationDetails: CalculationAuditDetail[]) {
  const rows = buildPilotCsvRows(calculationDetails);
  return [
    PILOT_CSV_HEADERS.join(','),
    ...rows.map((row) => PILOT_CSV_HEADERS.map((header) => escapeCsvValue(row[header])).join(',')),
  ].join('\n');
}
