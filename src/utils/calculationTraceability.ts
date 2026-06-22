import type { CalculationAuditDetail } from '../services/metrics';
import { formatActivityTypeLabel } from './activityAggregation';
import { formatDisplayNumber, formatEmissionsValue } from './numberFormatting';

function formatNumber(value?: string | number | null) {
  return formatDisplayNumber(value);
}

export function buildCalculatedFormula(detail: CalculationAuditDetail) {
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
  return detail.sourceAuthority || detail.factorSource || 'Source not specified';
}

export function buildCalculatedFromLine(detail?: CalculationAuditDetail) {
  if (!detail) return '';
  if (detail.status !== 'CALCULATED') return 'No factor available for this activity.';

  return `${formatNumber(detail.activityQuantity)} ${detail.activityUnit} ${formatActivityTypeLabel(detail.activityType).toLowerCase()} × ${formatTraceableFactor(detail)}`;
}
