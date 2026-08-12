import type { CalculationAuditDetail } from '../services/metrics';
import { getActivityTypeLabel, normalizeActivityType } from './activityType';
import { formatCredibilityLabel } from './factorCredibility';

export const ELECTRICITY_PILOT_ASSUMPTION =
  'Pilot-stage default electricity factor. Uses jurisdiction-specific electricity factor and latest available prior-year factor where no reporting-year factor exists. Replace with reviewed official factor before formal reporting.';

export const SCOPE_3_PILOT_ASSUMPTION =
  'Pilot-stage Scope 3 estimate. Scope 3 calculations can vary by methodology, boundary, and factor source. Consultant review recommended before official reporting.';

const SCOPE_3_ACTIVITY_TYPES = new Set([
  'AIR_TRAVEL',
  'HOTEL',
  'GROUND_TRANSPORT',
  'SHIPPING',
]);

function normalizeStatus(value?: string | null) {
  return String(value ?? '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .toUpperCase();
}

function cleanText(value?: string | number | null) {
  return String(value ?? '').trim();
}

function getFileExtension(value?: string | number | null) {
  const text = cleanText(value).toLowerCase();
  const match = text.match(/\.([a-z0-9]+)(?:[?#].*)?$/);
  return match?.[1] ?? '';
}

function sourceLooksLikePdfExtraction(value?: string | number | null) {
  return /pdf\s+extraction|ai\s+extraction/i.test(cleanText(value));
}

export function looksLikeInternalId(value?: string | number | null) {
  const text = cleanText(value);
  if (!text) return false;

  return (
    /^c[a-z0-9]{20,}$/i.test(text) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text) ||
    /^(factor|version|fv|cmr)[-_]?[a-z0-9]{10,}$/i.test(text)
  );
}

function parseVersionFromSource(value?: string | null) {
  const match = cleanText(value).match(/\bv\d+(?:\.\d+){0,3}\b/i);
  return match?.[0] ?? '';
}

export function formatReportFactorVersion(input: {
  factorVersion?: string | number | null;
  sourceDocument?: string | null;
  sourceReference?: string | null;
  sourceAuthority?: string | null;
}) {
  const direct = cleanText(input.factorVersion);
  if (direct && !looksLikeInternalId(direct)) return direct;

  const parsed =
    parseVersionFromSource(input.sourceDocument) ||
    parseVersionFromSource(input.sourceReference);
  if (parsed) return parsed;

  const source = `${input.sourceAuthority ?? ''} ${input.sourceDocument ?? ''}`.toLowerCase();
  if (source.includes('carbonlite') && source.includes('default factor')) return 'v1.0';

  return 'Not specified';
}

export function isScope3PilotActivity(activityType?: string | null) {
  const normalized = normalizeActivityType(activityType);
  return Boolean(normalized && SCOPE_3_ACTIVITY_TYPES.has(normalized));
}

function isElectricityActivity(activityType?: string | null) {
  return normalizeActivityType(activityType) === 'ELECTRICITY';
}

export function formatReportAssumptions(input: {
  activityType?: string | null;
  assumptions?: string | null;
  factorType?: string | null;
  sourceAuthority?: string | null;
  sourceDocument?: string | null;
}) {
  const direct = cleanText(input.assumptions);
  if (direct && !/^none documented$/i.test(direct)) return direct;

  if (isElectricityActivity(input.activityType)) {
    return ELECTRICITY_PILOT_ASSUMPTION;
  }

  if (isScope3PilotActivity(input.activityType)) {
    return SCOPE_3_PILOT_ASSUMPTION;
  }

  const source = `${input.factorType ?? ''} ${input.sourceAuthority ?? ''} ${input.sourceDocument ?? ''}`.toLowerCase();
  if (source.includes('carbonlite') || source.includes('system')) {
    return 'Pilot-stage CarbonLite default factor. Review source suitability before formal reporting.';
  }

  return 'Assumption not documented. Review recommended before formal reporting.';
}

export function formatReportVerification(input: {
  activityType?: string | null;
  verified?: boolean | null;
  factorStatus?: string | null;
  verificationStatus?: string | null;
}) {
  const status = input.verified
    ? 'Verified'
    : formatCredibilityLabel(input.factorStatus) ||
      formatCredibilityLabel(input.verificationStatus) ||
      'Unverified / user review required';

  if (isScope3PilotActivity(input.activityType) && !/consultant review recommended/i.test(status)) {
    return `${status} · Consultant Review Recommended`;
  }

  return status;
}

export function formatReportJurisdiction(
  jurisdiction?: string | null,
  country?: string | null,
) {
  const cleanRegion = cleanText(jurisdiction);
  const cleanCountry = cleanText(country);

  if (!cleanRegion && !cleanCountry) return 'Not specified';
  if (!cleanRegion) return cleanCountry;
  if (!cleanCountry) return cleanRegion;
  if (cleanRegion === cleanCountry) return cleanRegion;
  if (cleanRegion.toLowerCase().includes(cleanCountry.toLowerCase())) return cleanRegion;

  return `${cleanRegion}, ${cleanCountry}`;
}

export function isTrackedMetricDetail(
  detail: Pick<
    CalculationAuditDetail,
    | 'activityType'
    | 'status'
    | 'calculationStatus'
    | 'matchingStatus'
    | 'scopeClassification'
    | 'scopeOverride'
    | 'reason'
    | 'notes'
    | 'matchingMessage'
  > & {
    reportTreatment?: string | null;
    scope?: string | null;
    message?: string | null;
  },
) {
  const text = [
    detail.reason,
    detail.notes,
    detail.matchingMessage,
    detail.message,
  ].join(' ');

  return (
    normalizeActivityType(detail.activityType) === 'WATER' ||
    normalizeStatus(detail.status) === 'TRACKED_ONLY' ||
    normalizeStatus(detail.calculationStatus) === 'TRACKED_ONLY' ||
    normalizeStatus(detail.matchingStatus) === 'TRACKED_ONLY' ||
    normalizeStatus(detail.reportTreatment) === 'TRACKED_ONLY' ||
    normalizeStatus(detail.scopeClassification) === 'TRACKED_METRIC' ||
    normalizeStatus(detail.scopeOverride) === 'TRACKED_METRIC' ||
    normalizeStatus(detail.scope) === 'TRACKED_METRIC' ||
    /tracked[-\s]?only|tracked metric|no emission factor required/i.test(text)
  );
}

export function isRecordRequiringCorrection(detail: CalculationAuditDetail) {
  return (
    detail.status !== 'CALCULATED' &&
    detail.status !== 'OUTSIDE_SCOPE' &&
    !isTrackedMetricDetail(detail)
  );
}

export function getTrackedMetricMessage(detail: CalculationAuditDetail) {
  if (normalizeActivityType(detail.activityType) === 'WATER') {
    return 'Water is tracked as an operational metric and excluded from GHG emissions totals unless a reviewed water emissions factor is provided.';
  }

  return `${getActivityTypeLabel(detail.activityType)} is tracked separately and excluded from GHG emissions totals by design.`;
}

export function getTrackedMetricAction() {
  return 'No action required unless emissions factor is provided';
}

export function formatReportSourceType(
  sourceType?: string | null,
  sourceFileName?: string | null,
  sourceReference?: string | null,
) {
  const value = cleanText(sourceType).toUpperCase();
  const extension = getFileExtension(sourceFileName || sourceReference);
  const documentExtracted = value === 'DOCUMENT_AI' || value === 'AI_EXTRACTION';

  if (value === 'MANUAL') return 'Manual Entry';

  if (extension === 'xlsx' || extension === 'xls') {
    return documentExtracted ? 'Spreadsheet Import' : 'Uploaded Spreadsheet';
  }

  if (extension === 'csv') {
    return 'Uploaded CSV Import';
  }

  if (extension === 'pdf') {
    return documentExtracted ? 'PDF Extraction' : 'Uploaded PDF';
  }

  if (value === 'CSV') return 'Uploaded CSV Import';
  if (value === 'EXCEL' || value === 'SPREADSHEET') return 'Uploaded Spreadsheet';
  if (value === 'PASTE') return 'Pasted Spreadsheet Rows';
  if (value === 'AI-ASSISTED SPREADSHEET IMPORT') return 'Spreadsheet Import';
  if (value === 'AI-ASSISTED PDF EXTRACTION') return 'PDF Extraction';
  if (value === 'AI-ASSISTED IMPORT') return 'Document Import';
  if (documentExtracted) return 'Document Import';

  return sourceType ? cleanText(sourceType) : 'Unknown';
}

export function formatReportSourceReference(input: {
  sourceReference?: string | null;
  sourceType?: string | null;
  sourceFileName?: string | null;
}) {
  const sourceType = formatReportSourceType(input.sourceType, input.sourceFileName, input.sourceReference);
  if (sourceType === 'Manual Entry') return 'manual';

  const reference = cleanText(input.sourceReference);
  const sourceFile = cleanText(input.sourceFileName);
  const extension = getFileExtension(sourceFile || reference);

  if (sourceLooksLikePdfExtraction(reference) && (extension === 'xlsx' || extension === 'xls')) {
    return 'Spreadsheet import';
  }

  if (sourceType === 'Spreadsheet Import') return 'Spreadsheet import';
  if (sourceType === 'Uploaded CSV Import') return 'CSV import';
  if (sourceType === 'PDF Extraction') return 'PDF extraction';

  if (!reference) return 'Import batch';

  return reference;
}

export function getDisplaySourceLabel(input: {
  sourceReference?: string | null;
  sourceType?: string | null;
  sourceFileName?: string | null;
}) {
  const sourceType = formatReportSourceType(input.sourceType, input.sourceFileName, input.sourceReference);
  const sourceFile = cleanText(input.sourceFileName);
  const reference = formatReportSourceReference(input);

  if (sourceType === 'Manual Entry') return 'Manual Entry';
  if (sourceFile) return `${sourceFile} · ${sourceType}`;
  if (reference && reference !== 'Import batch') return `${reference} · ${sourceType}`;
  return sourceType;
}

export function formatTraceabilityReviewNote(detail: CalculationAuditDetail) {
  if (isTrackedMetricDetail(detail)) return getTrackedMetricMessage(detail);

  const calculationStatus = normalizeStatus(detail.calculationStatus);
  const matchingStatus = normalizeStatus(detail.matchingStatus);
  const recordYear = Number(detail.recordYear ?? detail.reportingYear);
  const factorYear = Number(detail.factorYear ?? detail.sourceYear);
  const usedPriorYear =
    Number.isFinite(recordYear) &&
    Number.isFinite(factorYear) &&
    factorYear > 0 &&
    factorYear < recordYear;

  if (matchingStatus === 'MISSING_FACTOR' || detail.status === 'MISSING_FACTOR') {
    return 'Factor required before inclusion.';
  }

  if (matchingStatus === 'MISSING_JURISDICTION' || detail.status === 'MISSING_JURISDICTION') {
    return 'Required jurisdiction must be added before inclusion.';
  }

  if (detail.status === 'INVALID_UNIT' || calculationStatus === 'INVALID_UNIT') {
    return 'Unit must match an available factor before inclusion.';
  }

  if (usedPriorYear) return 'Prior-year factor used; review before formal reporting.';
  if (isScope3PilotActivity(detail.activityType)) {
    return 'Pilot-stage Scope 3 estimate; consultant review recommended before formal reporting.';
  }

  const verification = formatReportVerification({
    activityType: detail.activityType,
    verified: detail.factorVerified,
    factorStatus: detail.factorStatus,
    verificationStatus: detail.factorVerificationStatus,
  });
  if (/review|unverified|pilot|draft/i.test(verification)) {
    return 'Review factor source before formal reporting.';
  }

  return 'Calculated with matched factor.';
}

export function buildSourceEvidenceNote(input: {
  activity?: {
    sourceTextSnippet?: string | null;
    notes?: string | null;
  };
  detail?: CalculationAuditDetail;
}) {
  const detail = input.detail;
  if (!detail) return input.activity?.sourceTextSnippet || input.activity?.notes || '';

  const calculationStatus = normalizeStatus(detail.calculationStatus);
  const matchingStatus = normalizeStatus(detail.matchingStatus);
  const hasEmissions = Number.isFinite(Number(detail.calculatedEmissionsKgCO2e ?? detail.calculatedEmission));
  const factorName = cleanText(detail.factorDisplayName || detail.factorName);
  const recordYear = Number(detail.recordYear ?? detail.reportingYear);
  const factorYear = Number(detail.factorYear ?? detail.sourceYear);
  const usedPriorYear =
    Number.isFinite(recordYear) &&
    Number.isFinite(factorYear) &&
    factorYear > 0 &&
    factorYear < recordYear;

  if (
    detail.status === 'CALCULATED' ||
    (calculationStatus === 'CALCULATED' && matchingStatus === 'MATCHED') ||
    (hasEmissions && factorName)
  ) {
    const matched = factorName
      ? `Matched factor: ${factorName}${Number.isFinite(factorYear) && factorYear > 0 ? ` - ${factorYear}` : ''}.`
      : 'Matched to CarbonLite System Factor.';
    const yearNote = usedPriorYear
      ? ' Using latest available prior-year factor because no factor was found for the record year.'
      : '';
    return `${matched}${yearNote}`;
  }

  if (isTrackedMetricDetail(detail)) return getTrackedMetricMessage(detail);
  if (matchingStatus === 'MISSING_FACTOR' || detail.status === 'MISSING_FACTOR') {
    return 'No matching conversion factor is available for this record.';
  }
  if (matchingStatus === 'MISSING_JURISDICTION' || detail.status === 'MISSING_JURISDICTION') {
    return 'Required jurisdiction information is missing for factor matching.';
  }
  if (detail.status === 'INVALID_UNIT' || calculationStatus === 'INVALID_UNIT') {
    return 'Submitted unit does not match available factor units.';
  }

  return 'Review this record before calculation.';
}
