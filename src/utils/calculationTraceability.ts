import type { CalculationAuditDetail } from '../services/metrics';
import { getDisplaySourceLabel } from './reportCredibility';
import { formatActivityTypeLabel } from './activityAggregation';
import { formatEmissionsUnit, formatEmissionsWithUnit } from './numberFormatting';
import { formatCalculationStatusLabel } from './terminology';
import { normalizeUnitForDisplay } from './unitNormalization';

function formatNumber(value?: string | number | null) {
  return formatFactorValue(value);
}

export function formatFactorValue(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return '-';
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return value === null || value === undefined || value === '' ? '-' : String(value);
  }

  return numericValue.toLocaleString(undefined, {
    maximumSignificantDigits: 21,
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
    const displayNumerator = formatEmissionsUnit(resultNumerator);
    return normalizedDenominator ? `${displayNumerator}/${normalizedDenominator}` : displayNumerator;
  }

  const inputUnit = singularizeFactorDenominator(detail.factorInputUnit || detail.normalizedUnit || detail.activityUnit);
  const displayResultUnit = formatEmissionsUnit(resultUnit);
  return inputUnit ? `${displayResultUnit}/${inputUnit}` : displayResultUnit;
}

// Exact supported pairs mirror calculation-quality.service.ts. Never reconstruct a
// conversion coefficient from the API's three-decimal effective quantity.
function supportedConversion(from: string, to: string) {
  const key = `${from.toLowerCase()}:${to.toLowerCase()}`;
  if (key === 'mwh:kwh') return { multiplier: 1000, exponent: 3 };
  if (key === 'kwh:mwh') return { multiplier: 0.001, exponent: -3 };
  return null;
}

function finiteQuantity(value: unknown): number | null {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
    ? Number(value) : null;
}

function shiftDecimal(value: number, shift: number) {
  const [mantissa, exponent = '0'] = String(value).toLowerCase().split('e');
  return Number(`${mantissa}e${Number(exponent) + shift}`);
}

export function buildCalculatedFormula(detail: CalculationAuditDetail) {
  if (detail.status === 'MISSING_JURISDICTION') {
    return 'Not calculated because province is missing.';
  }

  if (detail.status === 'MISSING_FACTOR') {
    return 'No matching emission factor was found.';
  }

  if (detail.status === 'INVALID_UNIT') {
    return 'Not calculated because the unit could not be normalized or matched.';
  }

  if (detail.status === 'TRACKED_ONLY') {
    return 'Tracked Metric. Not included in the GHG emissions total.';
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
  const effectiveUnit = formatFormulaUnit(detail.factorInputUnit || detail.normalizedUnit || detail.activityUnit);
  const differentUnits = !unitsMatch(activityUnit, effectiveUnit);
  const conversion = differentUnits ? supportedConversion(activityUnit, effectiveUnit) : null;
  const recorded = finiteQuantity(detail.activityQuantity);
  const supplied = finiteQuantity(detail.calculationQuantity)
    ?? (unitsMatch(detail.normalizedUnit, effectiveUnit) ? finiteQuantity(detail.normalizedQuantity) : null);
  const effective = supplied ?? (!differentUnits ? recorded : null);
  const savedResult = Number(detail.calculatedEmissionsKgCO2e);
  if (effective === null) {
    return `Recorded quantity: ${formatNumber(detail.activityQuantity)} ${activityUnit}; effective quantity unavailable; saved result: ${formatEmissionsWithUnit(savedResult)} (display rounded to 2 decimals).`;
  }
  const expected = recorded === null ? null : conversion ? shiftDecimal(recorded, conversion.exponent)
    : !differentUnits ? recorded : null;
  const differs = expected !== null && effective !== expected;
  const rounded = differs && Math.round(expected * 1000) / 1000 === effective;
  const quantityNote = rounded
    ? effective === 0 && expected !== 0
      ? ' (effective quantity rounded to zero, not an exact zero)'
      : ' (effective quantity rounded to 3 decimals)'
    : differs ? ' (effective quantity differs from supported conversion; saved quantity retained)' : '';
  const approximate = rounded || differs || (differentUnits && !conversion)
    || effective * Number(detail.factorValue) !== savedResult || Number(savedResult.toFixed(2)) !== savedResult;
  const roundingNote = approximate ? ' (saved result retained; display rounded to 2 decimals)' : '';
  const emissionsStep = `${formatNumber(effective)} ${effectiveUnit} × ${formatFactorValue(detail.factorValue)} ${factorUnit} ${approximate ? '≈' : '='} ${formatEmissionsWithUnit(savedResult)}${roundingNote}`;
  if (conversion && recorded !== null) {
    // A discrepancy beyond the documented rounding rule is not a conversion equality.
    const conversionStep = differs && !rounded
      ? `${formatNumber(recorded)} ${activityUnit} × ${formatNumber(conversion.multiplier)} = ${formatNumber(expected)} ${effectiveUnit}; supplied effective quantity: ${formatNumber(effective)} ${effectiveUnit}${quantityNote}`
      : `${formatNumber(recorded)} ${activityUnit} × ${formatNumber(conversion.multiplier)} ${rounded ? '≈' : '='} ${formatNumber(effective)} ${effectiveUnit}${quantityNote}`;
    return `${conversionStep}; ${emissionsStep}`;
  }
  return differentUnits || supplied !== null && supplied !== recorded
    ? `Recorded quantity: ${formatNumber(detail.activityQuantity)} ${activityUnit}; ${differentUnits ? 'conversion coefficient unavailable; ' : ''}${emissionsStep}${quantityNote}`
    : emissionsStep;
}

export function buildFormulaInputs(detail: CalculationAuditDetail) {
  if (detail.status === 'MISSING_JURISDICTION') {
    return 'Not calculated because province is missing.';
  }

  if (detail.status === 'INVALID_UNIT') {
    return 'Not calculated because the unit could not be normalized or matched.';
  }

  if (detail.status === 'TRACKED_ONLY') {
    return 'Tracked Metric. Not included in the GHG emissions total.';
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
  if (detail.status === 'TRACKED_ONLY') {
    return 'N/A — Tracked Metric';
  }

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
    const displayNumerator = formatEmissionsUnit(resultNumerator);
    const normalizedResultUnit = normalizedDenominator
      ? `${displayNumerator}/${normalizedDenominator}`
      : displayNumerator;
    return `${formatFactorValue(detail.factorValue)} ${normalizedResultUnit}`;
  }

  return `${formatFactorValue(detail.factorValue)} ${formatEmissionsUnit(resultUnit)}/${inputUnit}`;
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
  if (!status) return 'Needs Review';
  const labels: Record<string, string> = {
    CALCULATED: 'Calculated',
    MISSING_FACTOR: 'Missing Factor',
    INVALID_QUANTITY: 'Invalid quantity',
    INVALID_UNIT: 'Invalid unit',
    MISSING_DATA: 'Missing data',
    TRACKED_ONLY: 'Tracked Metric',
    OUTSIDE_SCOPE: 'Outside report scope',
    MATCHED: 'Factor Matched',
    MATCHED_PRIOR_YEAR: 'Factor Matched - Prior Year',
    NO_MATCH: 'Missing Factor',
    SKIPPED_MISSING_FACTOR: 'Missing Factor',
    SKIPPED_INVALID_UNIT: 'Invalid Unit',
    SKIPPED_MISSING_QUANTITY: 'Missing Quantity',
    SKIPPED_MISSING_JURISDICTION: 'Missing Jurisdiction',
    SKIPPED_TRACKED_ONLY: 'Tracked Metric',
    SKIPPED_NEEDS_REVIEW: 'Needs Review',
    SYSTEM_DEFAULT: 'CarbonLite system default factor',
    PLACEHOLDER: 'Placeholder factor',
  };
  return labels[status] || formatCalculationStatusLabel(status);
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
