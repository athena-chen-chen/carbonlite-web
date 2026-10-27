import { escapeCsvValue } from './csv';
import { factorProvenanceLines } from './factorGovernance';
import type { CalculationAuditDetail } from '../services/metrics';
import type { CanonicalReportData } from '../reports/domain/reportTypes';
import { getActivityTypeLabel, getFactorDisplayName } from './activityType';
import { formatCredibilityLabel } from './factorCredibility';
import {
  getDisplayFactorVersion,
  formatReportImportMethod,
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

export { escapeCsvValue } from './csv';

export const PILOT_CSV_HEADERS = [
  'Record No.',
  'Activity Type',
  'Record Date',
  'Quantity',
  'Quantity Display',
  'Unit',
  'Cost CAD',
  'Site / Facility',
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
  'Factor Source URL',
  'Factor Selection Reason',
  'Factor Selection Explanation',
  'Verification Status',
  'Confidence Level',
  'Consultant Review Recommended',
  'Formula',
  'Calculated Emissions kgCO2e',
  'Calculated Emissions Display',
  'Source File',
  'Source Sheet',
  'Source Row',
  'Source Type',
  'Import Method',
  'Source Reference',
  'Validation Note',
] as const;

export type PilotCsvRow = Record<(typeof PILOT_CSV_HEADERS)[number], string | number>;

type CsvInput = CalculationAuditDetail[] | Pick<CanonicalReportData, 'calculationDetails'>;

function getCalculationDetailsForCsv(input: CsvInput) {
  return Array.isArray(input) ? input : input.calculationDetails;
}

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
  MATCHED: 'Factor Matched',
  TRACKED_ONLY: 'Tracked Metric',
  REQUIRES_REVIEW: 'Needs Attention',
  MISSING_FACTOR: 'Missing Factor',
  MISSING_PROVINCE: 'Missing Province',
  MISSING_JURISDICTION: 'Missing Province',
  UNIT_MISMATCH: 'Unit Mismatch',
  INVALID_UNIT: 'Unit Mismatch',
  UNSUPPORTED_ACTIVITY: 'Unsupported Activity',
  NOT_IMPORTABLE: 'Not Importable',
  EXCLUDED: 'Excluded',
  INCLUDED: 'Included in GHG Total',
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
  if (isTrackedMetricDetail(detail)) return 'TRACKED_ONLY';
  if (detail.status === 'CALCULATED') return 'INCLUDED';
  return 'EXCLUDED';
}

function getCalculationStatus(detail: CalculationAuditDetail) {
  if (isTrackedMetricDetail(detail)) return 'TRACKED_ONLY';
  return normalizeStatus(detail.calculationStatus || detail.status) || 'NOT_SPECIFIED';
}

function getMatchingStatus(detail: CalculationAuditDetail) {
  if (isTrackedMetricDetail(detail)) return 'NOT_APPLICABLE';
  if (detail.status === 'CALCULATED') {
    const matchingStatus = normalizeStatus(detail.matchingStatus);
    if (['MATCHED_PRIOR_YEAR', 'MATCHED_NEAREST_YEAR', 'MATCHED_GENERIC', 'MATCHED_FALLBACK'].includes(matchingStatus)) {
      return 'MATCHED';
    }
    return matchingStatus || 'MATCHED';
  }
  return normalizeStatus(detail.matchingStatus || detail.status) || 'NOT_SPECIFIED';
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
  if (isTrackedMetricDetail(detail)) return '';
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
  if (isTrackedMetricDetail(detail)) return '';
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
  if (isTrackedMetricDetail(detail)) return '';
  return getFactorDisplayName(detail.factorDisplayName || detail.factorName) || 'Not specified';
}

function buildRawCalculationFormula(detail: CalculationAuditDetail) {
  if (isTrackedMetricDetail(detail)) return 'Tracked metric. Not included in emissions total.';
  if (detail.status !== 'CALCULATED') return formatTraceabilityReviewNote(detail);
  return buildCalculatedFormula(detail);
}

function usesPriorYearFactor(detail: CalculationAuditDetail) {
  const recordYear = Number(detail.recordYear ?? detail.reportingYear);
  const factorYear = Number(detail.factorYear ?? detail.sourceYear);
  return Number.isFinite(recordYear) && Number.isFinite(factorYear) && factorYear > 0 && factorYear < recordYear;
}

function usesGenericJurisdictionFallback(detail: CalculationAuditDetail) {
  const reason = normalizeStatus(detail.factorSelectionReason);
  if (reason.includes('GENERIC_JURISDICTION')) return true;
  return formatCsvFactorJurisdiction(detail) === 'Canada (Generic)' &&
    !isNationalFactorValue(detail.jurisdictionRegion);
}

function getConsultantReviewRecommended(detail: CalculationAuditDetail) {
  if (isTrackedMetricDetail(detail)) return 'No';
  if (detail.status !== 'CALCULATED') return 'Yes';
  if (
    isScope3PilotActivity(detail.activityType) ||
    usesPriorYearFactor(detail) ||
    usesGenericJurisdictionFallback(detail)
  ) {
    return 'Yes';
  }

  const verification = formatReportVerification({
    activityType: detail.activityType,
    verified: detail.factorVerified,
    factorStatus: detail.factorStatus,
    verificationStatus: detail.factorVerificationStatus,
  });
  return /review|pilot|unverified|draft/i.test(verification)
    ? 'Yes'
    : 'No';
}

function buildCsvReviewNote(detail: CalculationAuditDetail) {
  if (isTrackedMetricDetail(detail)) return 'Tracked metric. Not included in the GHG emissions total.';
  if (detail.status !== 'CALCULATED') return formatTraceabilityReviewNote(detail);

  const usedPriorYear = usesPriorYearFactor(detail);
  const usedGenericJurisdiction = usesGenericJurisdictionFallback(detail);
  const notes = [buildMatchedFactorReviewIntro(detail, usedGenericJurisdiction)];

  if (usedGenericJurisdiction && usedPriorYear) {
    notes.push('A Canada-generic and prior-year fallback was used; consultant review is recommended before formal reporting.');
  } else if (usedGenericJurisdiction) {
    notes.push(buildGenericJurisdictionReviewNote(detail));
  } else if (usedPriorYear) {
    notes.push('A prior-year factor was used because no exact factor was available for the record year. Review before formal reporting.');
  } else if (getConsultantReviewRecommended(detail) === 'Yes') {
    notes.push('Review before formal reporting.');
  }

  return notes.filter(Boolean).join(' ');
}

function buildMatchedFactorReviewIntro(
  detail: CalculationAuditDetail,
  usedGenericJurisdiction: boolean,
) {
  if (isCarbonLiteDefaultFactor(detail)) {
    return 'Matched to a CarbonLite system-default factor.';
  }

  if (String(detail.factorType ?? '').toUpperCase() === 'CUSTOM') {
    return 'Matched to a custom factor.';
  }

  if (usedGenericJurisdiction) return '';

  const authority = formatReviewSourceAuthority(detail);
  return authority
    ? `Matched to a factor from ${authority}.`
    : 'Matched to a source-backed emission factor.';
}

function buildGenericJurisdictionReviewNote(detail: CalculationAuditDetail) {
  const authority = formatReviewSourceAuthority(detail);
  const authorityLabel = authority === 'Environment and Climate Change Canada' ? 'ECCC' : authority;
  const region = String(detail.jurisdictionRegion ?? '').trim();
  const unit = String(detail.activityUnit ?? detail.factorInputUnit ?? '').trim();
  const sourcePhrase = authorityLabel
    ? `Canada-generic ${authorityLabel} factor`
    : 'Canada-generic emission factor';
  const noSpecificPhrase = region && !isNationalFactorValue(region)
    ? ` because no ${region}-specific direct${unit ? ` ${unit}` : ''} factor was available`
    : '';

  return `${sourcePhrase} used${noSpecificPhrase}. Review before formal reporting.`;
}

function isCarbonLiteDefaultFactor(detail: CalculationAuditDetail) {
  const authority = normalizeStatus(detail.sourceAuthority || detail.factorSource);
  const reason = normalizeStatus(detail.factorSelectionReason);
  const factorType = normalizeStatus(detail.factorType);

  return (
    reason === 'PILOT_DEFAULT_FALLBACK' ||
    authority.includes('CARBONLITE') ||
    (factorType === 'SYSTEM' && !detail.sourceAuthority && !detail.sourceDocument)
  );
}

function formatReviewSourceAuthority(detail: CalculationAuditDetail) {
  const authority = String(detail.sourceAuthority || detail.factorSource || '').trim();
  if (!authority || /^source not specified$/i.test(authority)) return '';
  return authority;
}

function getSourceFile(detail: CalculationAuditDetail) {
  if (normalizeStatus(detail.sourceType) === 'MANUAL') return 'Manual Entry';
  return String(detail.sourceFileName ?? '').trim() || 'Not specified';
}

function getSiteFacility(detail: CalculationAuditDetail) {
  return String(detail.facilityName ?? detail.facilityId ?? '').trim();
}

function getActivityJurisdictionCountry(detail: CalculationAuditDetail) {
  return String(detail.jurisdictionCountry ?? '').trim();
}

function getActivityJurisdictionRegion(detail: CalculationAuditDetail) {
  return String(detail.jurisdictionRegion ?? '').trim();
}

export function buildPilotCsvRows(input: CsvInput): PilotCsvRow[] {
  return getCalculationDetailsForCsv(input).map((detail, index) => {
    const sourceType = formatReportSourceType(detail.sourceType, detail.sourceFileName, detail.sourceReference);
    const importMethod = formatReportImportMethod(detail.sourceType, detail.sourceFileName, detail.sourceReference);
    const sourceReference = String(detail.sourceReference ?? '').trim() || formatReportSourceReference({
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
      'Cost CAD': csvNumber(detail.costCad),
      'Site / Facility': getSiteFacility(detail),
      Country: getActivityJurisdictionCountry(detail),
      'Province / Jurisdiction': getActivityJurisdictionRegion(detail),
      Scope: getScopeLabel(detail),
      'Report Treatment': getReportTreatment(detail),
      'Calculation Status': getCalculationStatus(detail),
      'Matching Status': getMatchingStatus(detail),
      'Matched Factor Name': getMatchedFactorName(detail),
      'Matched Factor Value': isTrackedMetricDetail(detail) ? '' : csvNumber(detail.factorValue),
      'Matched Factor Unit': formatCsvFactorUnit(detail),
      'Factor Jurisdiction': formatCsvFactorJurisdiction(detail),
      'Factor Source Year': isTrackedMetricDetail(detail) ? '' : detail.factorYear || detail.sourceYear || 'Not specified',
      'Factor Version': isTrackedMetricDetail(detail) ? '' : getDisplayFactorVersion({
        factorVersion: detail.factorVersion,
        factorId: detail.factorId,
        factorVersionId: detail.factorVersionId,
        factorProvenance: detail.factorProvenance,
        sourceDocument: detail.sourceDocument,
        sourceAuthority: detail.sourceAuthority,
      }),
      'Factor Source Authority': isTrackedMetricDetail(detail) ? '' : detail.sourceAuthority || detail.factorSource || 'Not specified',
      'Factor Source Document': isTrackedMetricDetail(detail) ? '' : detail.sourceDocument || 'Not specified',
      'Factor Source URL': isTrackedMetricDetail(detail) ? '' : detail.sourceUrl || '',
      'Factor Selection Reason': isTrackedMetricDetail(detail) ? '' : detail.factorSelectionReason || '',
      'Factor Selection Explanation': isTrackedMetricDetail(detail) ? '' : detail.factorSelectionExplanation || '',
      'Verification Status': isTrackedMetricDetail(detail)
        ? ''
        : formatReportVerification({
            activityType: detail.activityType,
            verified: detail.factorVerified,
            factorStatus: detail.factorStatus,
            verificationStatus: detail.factorVerificationStatus,
          }),
      'Confidence Level': isTrackedMetricDetail(detail)
        ? ''
        : formatCredibilityLabel(detail.factorConfidenceLevel) || 'Not specified',
      'Consultant Review Recommended': getConsultantReviewRecommended(detail),
      Formula: buildRawCalculationFormula(detail),
      'Calculated Emissions kgCO2e': isTrackedMetricDetail(detail) ? '' : csvNumber(calculatedEmissions),
      'Calculated Emissions Display': isTrackedMetricDetail(detail)
        ? 'Tracked Metric'
        : detail.status === 'CALCULATED'
        ? `${displayNumber(calculatedEmissions)} kgCO2e`
        : 'Not calculated',
      'Source File': getSourceFile(detail),
      'Source Sheet': String(detail.sourceSheetName ?? '').trim(),
      'Source Row': csvNumber(detail.sourceRow),
      'Source Type': sourceType,
      'Import Method': importMethod,
      'Source Reference': sourceReference,
      'Validation Note': [buildCsvReviewNote(detail), ...factorProvenanceLines(detail.factorProvenance)].filter(Boolean).join('; '),
    };
  });
}

const NUMERIC_CSV_HEADERS = new Set<string>([
  'Record No.', 'Quantity', 'Cost CAD', 'Matched Factor Value',
  'Factor Source Year', 'Calculated Emissions kgCO2e', 'Source Row',
]);

export function buildPilotCsv(input: CsvInput) {
  const rows = buildPilotCsvRows(input);
  return [
    PILOT_CSV_HEADERS.join(','),
    ...rows.map((row) => PILOT_CSV_HEADERS.map((header) =>
      escapeCsvValue(row[header], NUMERIC_CSV_HEADERS.has(header) ? 'number' : 'text'),
    ).join(',')),
  ].join('\n');
}
