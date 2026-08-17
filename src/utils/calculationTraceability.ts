import type { CalculationAuditDetail } from '../services/metrics';
import { getDisplaySourceLabel } from './reportCredibility';
import { formatActivityTypeLabel } from './activityAggregation';
import { formatDisplayNumber, formatEmissionsValue } from './numberFormatting';
import { normalizeUnitForDisplay } from './unitNormalization';

function formatNumber(value?: string | number | null) {
  return formatDisplayNumber(value);
}

export function formatFactorValue(value?: string | number | null) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return value === null || value === undefined || value === '' ? '-' : String(value);
  }

  return numericValue.toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

function formatFormulaUnit(value?: string | number | null) {
  const normalized = normalizeUnitForDisplay(value);
  return normalized.status === 'valid' ? normalized.value : String(value ?? '').trim();
}

function singularizeFactorDenominator(unit?: string | number | null) {
  const clean = formatFormulaUnit(unit);
  const normalized = clean.toLowerCase();

  if (normalized === 'liters' || normalized === 'litres') return 'liter';
  if (normalized === 'liter' || normalized === 'litre') return 'liter';
  if (normalized === 'nights') return 'night';
  if (normalized === 'kilometers' || normalized === 'kilometres') return 'km';
  if (normalized === 'kilometer' || normalized === 'kilometre') return 'km';
  if (normalized === 'cubic meters' || normalized === 'cubic metres') return 'm3';
  return clean;
}

function unitsMatch(left?: string | number | null, right?: string | number | null) {
  const leftUnit = formatFormulaUnit(left).toLowerCase();
  const rightUnit = formatFormulaUnit(right).toLowerCase();
  return Boolean(leftUnit && rightUnit && leftUnit === rightUnit);
}

function formatFactorUnitForFormula(detail: CalculationAuditDetail) {
  const resultUnit = detail.factorResultUnit || 'kgCO2e';
  if (resultUnit.includes('/')) {
    const [resultNumerator, resultDenominator] = resultUnit.split('/');
    const normalizedDenominator = singularizeFactorDenominator(resultDenominator);
    return normalizedDenominator ? `${resultNumerator}/${normalizedDenominator}` : resultNumerator;
  }

  const inputUnit = singularizeFactorDenominator(detail.factorInputUnit || detail.normalizedUnit || detail.activityUnit);
  return inputUnit ? `${resultUnit}/${inputUnit}` : resultUnit;
}

function getConvertedFormulaQuantity(detail: CalculationAuditDetail) {
  const activityUnit = formatFormulaUnit(detail.activityUnit);
  const factorInputUnit = formatFormulaUnit(detail.factorInputUnit || detail.normalizedUnit);
  const activityQuantity = Number(detail.activityQuantity);

  if (!activityUnit || !factorInputUnit || unitsMatch(activityUnit, factorInputUnit)) return null;
  if (!Number.isFinite(activityQuantity)) return null;

  const normalizedQuantity = Number(detail.normalizedQuantity);
  if (Number.isFinite(normalizedQuantity) && normalizedQuantity > 0) {
    const conversionFactor = normalizedQuantity / activityQuantity;
    if (Number.isFinite(conversionFactor) && conversionFactor > 0) {
      return {
        quantity: normalizedQuantity,
        unit: factorInputUnit,
        conversionFactor,
      };
    }
  }

  if (activityUnit.toLowerCase() === 'mwh' && factorInputUnit.toLowerCase() === 'kwh') {
    return {
      quantity: activityQuantity * 1000,
      unit: 'kWh',
      conversionFactor: 1000,
    };
  }

  return null;
}

export function buildCalculatedFormula(detail: CalculationAuditDetail) {
  if (detail.status === 'MISSING_JURISDICTION') {
    return 'Not calculated because province is missing.';
  }

  if (detail.status === 'MISSING_FACTOR') {
    return 'No matching conversion factor was found.';
  }

  if (detail.status === 'INVALID_UNIT') {
    return 'Not calculated because the unit could not be normalized or matched.';
  }

  if (detail.status === 'TRACKED_ONLY') {
    return 'Tracked only. Not included in emissions total.';
  }

  if (detail.status === 'INVALID_QUANTITY') {
    return 'Not calculated because quantity is missing or invalid.';
  }

  if (detail.status === 'MISSING_DATA') {
    return 'Not calculated because required data is missing.';
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

  const activityUnit = formatFormulaUnit(detail.activityUnit);
  const factorUnit = formatFactorUnitForFormula(detail);
  const convertedQuantity = getConvertedFormulaQuantity(detail);
  const emissionsStepQuantity = convertedQuantity?.quantity ?? detail.activityQuantity;
  const emissionsStepUnit = convertedQuantity?.unit ?? activityUnit;
  const emissionsStep = `${formatNumber(emissionsStepQuantity)} ${emissionsStepUnit} × ${formatFactorValue(detail.factorValue)} ${factorUnit} = ${formatEmissionsValue(detail.calculatedEmissionsKgCO2e)} kgCO2e`;

  if (convertedQuantity) {
    return `${formatNumber(detail.activityQuantity)} ${activityUnit} × ${formatNumber(convertedQuantity.conversionFactor)} = ${formatNumber(convertedQuantity.quantity)} ${convertedQuantity.unit}; ${emissionsStep}`;
  }

  return emissionsStep;
}

export function buildFormulaInputs(detail: CalculationAuditDetail) {
  if (detail.status === 'MISSING_JURISDICTION') {
    return 'Not calculated because province is missing.';
  }

  if (detail.status === 'INVALID_UNIT') {
    return 'Not calculated because the unit could not be normalized or matched.';
  }

  if (detail.status === 'TRACKED_ONLY') {
    return 'Tracked only. Not included in emissions total.';
  }

  if (
    detail.status !== 'CALCULATED' ||
    detail.factorValue === null ||
    detail.factorValue === undefined
  ) {
    return 'No factor available for this activity.';
  }

  return `${formatNumber(detail.activityQuantity)} × ${formatFactorValue(detail.factorValue)}`;
}

export function formatTraceableFactor(detail: CalculationAuditDetail) {
  if (detail.status === 'MISSING_JURISDICTION') {
    return 'Not selected';
  }

  if (detail.factorValue === null || detail.factorValue === undefined) {
    return 'No factor available';
  }

  const resultUnit = detail.factorResultUnit || 'kgCO2e';
  const inputUnit = singularizeFactorDenominator(detail.factorInputUnit || detail.activityUnit);
  if (resultUnit.includes('/')) {
    const [resultNumerator, resultDenominator] = resultUnit.split('/');
    const normalizedDenominator = singularizeFactorDenominator(resultDenominator);
    const normalizedResultUnit = normalizedDenominator
      ? `${resultNumerator}/${normalizedDenominator}`
      : resultNumerator;
    return `${formatFactorValue(detail.factorValue)} ${normalizedResultUnit}`;
  }

  return `${formatFactorValue(detail.factorValue)} ${resultUnit}/${inputUnit}`;
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
  if (detail.status !== 'CALCULATED') return buildCalculatedFormula(detail);

  return `${formatNumber(detail.activityQuantity)} ${detail.activityUnit} ${formatActivityTypeLabel(detail.activityType).toLowerCase()} × ${formatTraceableFactor(detail)}`;
}

export function formatCalculationStatus(status?: string | null) {
  if (!status) return 'Needs review';
  const labels: Record<string, string> = {
    CALCULATED: 'Calculated',
    MISSING_FACTOR: 'Missing Factor',
    INVALID_QUANTITY: 'Invalid quantity',
    INVALID_UNIT: 'Invalid unit',
    MISSING_DATA: 'Missing data',
    TRACKED_ONLY: 'Tracked Metric',
    OUTSIDE_SCOPE: 'Outside report scope',
    MATCHED: 'Matched',
    MATCHED_PRIOR_YEAR: 'Using nearest prior year factor',
    NO_MATCH: 'Missing Factor',
    SKIPPED_MISSING_FACTOR: 'Missing Factor',
    SKIPPED_INVALID_UNIT: 'Invalid Unit',
    SKIPPED_MISSING_QUANTITY: 'Missing Quantity',
    SKIPPED_MISSING_JURISDICTION: 'Missing Jurisdiction',
    SKIPPED_TRACKED_ONLY: 'Tracked Metric',
    SKIPPED_NEEDS_REVIEW: 'Requires Review',
    SYSTEM_DEFAULT: 'CarbonLite system default factor',
    PLACEHOLDER: 'Placeholder factor',
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
    SYSTEM_DEFAULT: 'CarbonLite system default factor',
    PLACEHOLDER: 'Placeholder factor',
    TRACKED_ONLY: 'Tracked metric',
    INVALID_UNIT: 'Invalid unit',
    NO_MATCH: 'No matching factor',
    EXACT: 'Exact match',
    OFFICIAL_EXACT_REGION_YEAR: 'Exact province/year match',
    SYSTEM_EXACT_REGION_YEAR: 'System province/year match',
    OFFICIAL_COUNTRY_YEAR: 'Country-level factor',
    SYSTEM_COUNTRY_YEAR: 'Canada-level system factor',
    ORGANIZATION_CUSTOM_EXACT: 'Organization custom factor',
    COUNTRY_LEVEL: 'Country-level fallback',
    PRIOR_YEAR: 'Using nearest prior year factor',
    MATCHED_PRIOR_YEAR: 'Using nearest prior year factor',
    MATCHED: 'Matched factor',
  };
  return labels[method] || method;
}

export function formatRecordSource(detail: CalculationAuditDetail) {
  const baseLabel = getDisplaySourceLabel({
    sourceFileName: detail.sourceFileName,
    sourceReference: detail.sourceReference,
    sourceType: detail.sourceType,
  });
  if (baseLabel === 'Manual Entry') return baseLabel;

  const locationParts = [
    detail.sourcePage ? `Page ${detail.sourcePage}` : '',
    detail.sourceRow ? `Row ${detail.sourceRow}` : '',
  ].filter((part): part is string => Boolean(String(part ?? '').trim()));

  return [baseLabel, ...locationParts].join(' · ') || 'Source not specified';
}
