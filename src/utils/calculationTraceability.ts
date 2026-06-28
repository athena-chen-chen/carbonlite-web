import type { CalculationAuditDetail } from '../services/metrics';
import { formatActivityTypeLabel } from './activityAggregation';
import { formatDisplayNumber, formatEmissionsValue } from './numberFormatting';

function formatNumber(value?: string | number | null) {
  return formatDisplayNumber(value);
}

export function buildCalculatedFormula(detail: CalculationAuditDetail) {
  if (detail.calculationFormula) {
    return detail.calculationFormula;
  }

  if (
    detail.status !== 'CALCULATED' ||
    detail.factorValue === null ||
    detail.factorValue === undefined ||
    detail.calculatedEmissionsKgCO2e === null ||
    detail.calculatedEmissionsKgCO2e === undefined
  ) {
    return 'No factor available for this activity.';
  }

  return `${formatNumber(detail.activityQuantity)} × ${formatNumber(detail.factorValue)} = ${formatEmissionsValue(detail.calculatedEmissionsKgCO2e)} kgCO2e`;
}

export function buildFormulaInputs(detail: CalculationAuditDetail) {
  if (
    detail.status !== 'CALCULATED' ||
    detail.factorValue === null ||
    detail.factorValue === undefined
  ) {
    return 'No factor available for this activity.';
  }

  return `${formatNumber(detail.activityQuantity)} × ${formatNumber(detail.factorValue)}`;
}

export function formatTraceableFactor(detail: CalculationAuditDetail) {
  if (detail.factorValue === null || detail.factorValue === undefined) {
    return 'No factor available';
  }

  const resultUnit = detail.factorResultUnit || 'kgCO2e';
  const inputUnit = detail.factorInputUnit || detail.activityUnit;

  return `${formatNumber(detail.factorValue)} ${resultUnit}/${inputUnit}`;
}

export function formatTraceabilitySource(detail: CalculationAuditDetail) {
  const document = detail.sourceDocument ? ` — ${detail.sourceDocument}` : '';
  const year = detail.sourceYear ? ` ${detail.sourceYear}` : '';
  return detail.sourceAuthority
    ? `${detail.sourceAuthority}${year}${document}`
    : detail.factorSource || 'Source not specified';
}

export function buildCalculatedFromLine(detail?: CalculationAuditDetail) {
  if (!detail) return '';
  if (detail.status !== 'CALCULATED') return 'No factor available for this activity.';

  return `${formatNumber(detail.activityQuantity)} ${detail.activityUnit} ${formatActivityTypeLabel(detail.activityType).toLowerCase()} × ${formatTraceableFactor(detail)}`;
}

export function formatCalculationStatus(status?: string | null) {
  if (!status) return 'Needs review';
  const labels: Record<string, string> = {
    CALCULATED: 'Calculated',
    MISSING_FACTOR: 'No matching verified factor',
    INVALID_QUANTITY: 'Invalid quantity',
    INVALID_UNIT: 'Invalid unit',
    MISSING_DATA: 'Missing data',
    OUTSIDE_SCOPE: 'Outside report scope',
    MATCHED: 'Matched',
    MATCHED_PRIOR_YEAR: 'Using nearest prior year factor',
    NO_MATCH: 'No matching verified factor',
  };
  return labels[status] || status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (char) => char.toUpperCase());
}

export function formatMatchingMethod(detail: CalculationAuditDetail) {
  if (detail.matchingMessage) return detail.matchingMessage;

  const method = detail.matchingMethod || detail.matchedBy || detail.matchingStatus;
  if (!method) return detail.status === 'CALCULATED' ? 'Matched factor' : formatCalculationStatus(detail.status);

  const labels: Record<string, string> = {
    'exact province and year': 'Exact province/year match',
    'country-level fallback': 'Country-level fallback',
    'nearest prior year': 'Using nearest prior year factor',
    'organization custom verified factor': 'Organization custom verified factor',
    'legacy verified system factor': 'Legacy verified system factor',
    'demo factor allowed by organization setting': 'Demo factor allowed by organization setting',
    MATCHED_PRIOR_YEAR: 'Using nearest prior year factor',
    MATCHED: 'Matched factor',
  };
  return labels[method] || method;
}

export function formatRecordSource(detail: CalculationAuditDetail) {
  if (String(detail.sourceType).toUpperCase() === 'MANUAL') return 'Manual entry';

  const parts = [
    detail.sourceFileName,
    detail.sourceReference,
    detail.sourcePage ? `Page ${detail.sourcePage}` : '',
    detail.sourceRow ? `Row ${detail.sourceRow}` : '',
  ].filter((part): part is string => Boolean(String(part ?? '').trim()));

  return parts.join(' · ') || 'Source not specified';
}
