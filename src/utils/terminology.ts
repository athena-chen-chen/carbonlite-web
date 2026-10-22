export const TERMINOLOGY = {
  emissionFactor: 'Emission Factor',
  emissionFactors: 'Emission Factors',
  conversionFactor: 'Conversion Factor',
  conversionFactors: 'Conversion Factors',
  readyForCalculation: 'Ready for Calculation',
  calculated: 'Calculated',
  needsReview: 'Needs Attention',
  trackedMetric: 'Tracked Metric',
  excluded: 'Excluded',
  includedInGhgTotal: 'Included in GHG Total',
  factorMatched: 'Factor Matched',
  providedByCarbonLite: 'Provided by CarbonLite',
  companyFactor: 'Company Factor',
  canadaGeneric: 'Canada (Generic)',
} as const;

export function normalizeTerminologyToken(value?: string | null) {
  return String(value ?? '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[()]/g, '')
    .replace(/[-\s]+/g, '_')
    .toUpperCase();
}

export function formatRecordDisplayStatus(input: {
  status?: string | null;
  calculationStatus?: string | null;
  matchingStatus?: string | null;
  reportTreatment?: string | null;
}) {
  const signals = [
    input.status,
    input.calculationStatus,
    input.matchingStatus,
    input.reportTreatment,
  ].map(normalizeTerminologyToken);

  if (signals.some((signal) => signal === 'TRACKED_ONLY' || signal === 'TRACKED_METRIC')) {
    return TERMINOLOGY.trackedMetric;
  }

  if (signals.some((signal) => signal === 'EXCLUDED' || signal === 'OUTSIDE_SCOPE')) {
    return TERMINOLOGY.excluded;
  }

  if (
    signals.some((signal) =>
      [
        'NEEDS_REVIEW',
        'REQUIRES_REVIEW',
        'MISSING_FACTOR',
        'MISSING_PROVINCE',
        'MISSING_JURISDICTION',
        'INVALID_UNIT',
        'UNIT_MISMATCH',
        'NO_MATCH',
        'SKIPPED_NEEDS_REVIEW',
      ].includes(signal),
    )
  ) {
    return TERMINOLOGY.needsReview;
  }

  if (
    signals.some((signal) => signal === 'CALCULATED' || signal === 'INCLUDED') ||
    signals.includes('MATCHED')
  ) {
    return TERMINOLOGY.calculated;
  }

  if (signals.includes('READY')) return TERMINOLOGY.readyForCalculation;

  return '';
}

export function formatCalculationStatusLabel(status?: string | null) {
  const normalized = normalizeTerminologyToken(status);
  const labels: Record<string, string> = {
    CALCULATED: TERMINOLOGY.calculated,
    READY: TERMINOLOGY.readyForCalculation,
    MATCHED: TERMINOLOGY.factorMatched,
    MATCHED_PRIOR_YEAR: 'Factor Matched - Prior Year',
    TRACKED_ONLY: TERMINOLOGY.trackedMetric,
    TRACKED_METRIC: TERMINOLOGY.trackedMetric,
    MISSING_FACTOR: 'Missing Factor',
    MISSING_PROVINCE: 'Missing Province',
    MISSING_JURISDICTION: 'Missing Province',
    MISSING_ACTIVITY_TYPE: 'Missing Activity Type',
    INVALID_QUANTITY: 'Invalid Quantity',
    INVALID_UNIT: 'Invalid Unit',
    UNIT_MISMATCH: 'Unit Mismatch',
    MISSING_UNIT: 'Missing Unit',
    MISSING_DATA: 'Missing Data',
    OUTSIDE_SCOPE: 'Outside Report Scope',
    NO_MATCH: 'Missing Factor',
    SKIPPED_MISSING_FACTOR: 'Missing Factor',
    SKIPPED_INVALID_UNIT: 'Invalid Unit',
    SKIPPED_MISSING_QUANTITY: 'Missing Quantity',
    SKIPPED_MISSING_JURISDICTION: 'Missing Province',
    SKIPPED_TRACKED_ONLY: TERMINOLOGY.trackedMetric,
    SKIPPED_NEEDS_REVIEW: TERMINOLOGY.needsReview,
    REQUIRES_REVIEW: TERMINOLOGY.needsReview,
    NEEDS_REVIEW: TERMINOLOGY.needsReview,
    INCLUDED: TERMINOLOGY.includedInGhgTotal,
    EXCLUDED: TERMINOLOGY.excluded,
    SYSTEM_DEFAULT: 'Provided by CarbonLite',
    PLACEHOLDER: 'Placeholder Factor',
  };

  if (!normalized) return '';
  return labels[normalized] ?? titleizeToken(normalized);
}

export function formatReportTreatmentLabel(value?: string | null) {
  const normalized = normalizeTerminologyToken(value);
  if (normalized === 'INCLUDED') return TERMINOLOGY.includedInGhgTotal;
  if (normalized === 'TRACKED_ONLY' || normalized === 'TRACKED_METRIC') return TERMINOLOGY.trackedMetric;
  if (normalized === 'EXCLUDED' || normalized === 'OUTSIDE_SCOPE') return TERMINOLOGY.excluded;
  return normalized ? titleizeToken(normalized) : '';
}

export function formatFactorMatchStatusLabel(value?: string | null) {
  const normalized = normalizeTerminologyToken(value);
  if (normalized === 'MATCHED') return TERMINOLOGY.factorMatched;
  if (normalized === 'MATCHED_PRIOR_YEAR') return 'Factor Matched - Prior Year';
  if (normalized === 'READY') return TERMINOLOGY.readyForCalculation;
  return formatCalculationStatusLabel(value);
}

export function formatFactorTypeSourceLabel(value?: string | null) {
  const normalized = normalizeTerminologyToken(value);
  if (normalized === 'SYSTEM' || normalized === 'SYSTEM_DEFAULT') {
    return TERMINOLOGY.providedByCarbonLite;
  }
  if (normalized === 'CUSTOM' || normalized === 'USER_PROVIDED' || normalized === 'COMPANY') {
    return TERMINOLOGY.companyFactor;
  }
  return normalized ? titleizeToken(normalized) : '';
}

export function formatJurisdictionDisplayLabel(region?: string | null, country?: string | null) {
  const normalizedRegion = normalizeTerminologyToken(region);
  const normalizedCountry = normalizeTerminologyToken(country);

  if (
    normalizedRegion === 'CANADA_GENERIC' ||
    normalizedRegion === 'CANADA' ||
    normalizedRegion === 'NATIONAL' ||
    (!normalizedRegion && normalizedCountry === 'CANADA')
  ) {
    return TERMINOLOGY.canadaGeneric;
  }

  const cleanRegion = String(region ?? '').trim();
  const cleanCountry = String(country ?? '').trim();
  if (cleanRegion && cleanCountry && !cleanRegion.toLowerCase().includes(cleanCountry.toLowerCase())) {
    return `${cleanRegion}, ${cleanCountry}`;
  }
  return cleanRegion || cleanCountry || '';
}

function titleizeToken(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
