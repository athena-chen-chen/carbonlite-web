import { normalizeUnitKey } from './unitNormalization';
import {
  getActivityTypeLabel,
  normalizeActivityType as normalizeSharedActivityType,
} from './activityType';
import { normalizeUnitForDisplay } from './unitNormalization';

export type MatchableConversionFactor = {
  id: string;
  organizationId?: string | null;
  name: string;
  type?: string | null;
  activityType?: string | null;
  displayName?: string | null;
  inputUnit?: string | null;
  unit?: string | null;
  factorValue?: string | number | null;
  value?: string | number | null;
  resultUnit?: string | null;
  jurisdiction?: string | null;
  jurisdictionCountry?: string | null;
  jurisdictionRegion?: string | null;
  country?: string | null;
  region?: string | null;
  status?: string | null;
  isActive?: boolean | null;
  isSystemDefault?: boolean | null;
  isSystem?: boolean | null;
  isDefault?: boolean | null;
  sourceAuthority?: string | null;
  sourceName?: string | null;
  sourceReference?: string | null;
  sourceUrl?: string | null;
  sourceYear?: number | null;
  effectiveYear?: number | null;
  factorVersion?: string | null;
  factorSet?: string | null;
  factorStatus?: string | null;
  confidence?: string | null;
  boundary?: string | null;
  notes?: string | null;
  lastReviewedAt?: string | null;
  factorVersionId?: string | null;
  assumptions?: string | null;
  methodology?: string | null;
  consultantReviewRecommended?: boolean | null;
  isPilotEstimate?: boolean | null;
  factorYear?: number | null;
  defaultScope?: string | null;
  scope?: string | null;
  confidenceLevel?: string | null;
  verificationStatus?: string | null;
  verified?: boolean | null;
  updatedAt?: string | null;
  currentActiveVersion?: Partial<MatchableConversionFactor> | null;
  version?: Partial<MatchableConversionFactor> | null;
  factor?: {
    activityType?: string | null;
    displayName?: string | null;
    name?: string | null;
    isSystem?: boolean | null;
  } | null;
};

export type ConversionFactorMatch = {
  factor: MatchableConversionFactor;
  sourceLabel: 'Organization Custom Factor' | 'System Default Factor';
  factorYear?: number | null;
  usedPriorYearFallback?: boolean;
  exactYearMatch?: boolean;
  usedProxyFactor?: boolean;
  reviewRecommended?: boolean;
  proxyReason?: string | null;
};

export type ActivityYearResolution = {
  year: number | null;
  source:
    | 'servicePeriodEndDate'
    | 'servicePeriodStartDate'
    | 'recordDate'
    | 'billDate'
    | 'reportingYear'
    | 'unavailable';
  crossYearServicePeriod: boolean;
  reviewNote?: string | null;
};

export function resolveActivityYear(input: {
  servicePeriodEndDate?: string | null;
  servicePeriodStartDate?: string | null;
  periodEndDate?: string | null;
  periodStartDate?: string | null;
  periodEnd?: string | null;
  periodStart?: string | null;
  recordDate?: string | null;
  billDate?: string | null;
  reportingYear?: string | number | null;
}): ActivityYearResolution {
  const servicePeriodEndDate = input.servicePeriodEndDate ?? input.periodEndDate ?? input.periodEnd;
  const servicePeriodStartDate = input.servicePeriodStartDate ?? input.periodStartDate ?? input.periodStart;
  const endYear = getDateYear(servicePeriodEndDate);
  const startYear = getDateYear(servicePeriodStartDate);
  const crossYearServicePeriod = Boolean(startYear && endYear && startYear !== endYear);
  const reviewNote = crossYearServicePeriod
    ? 'Cross-year service period · Review recommended'
    : null;

  if (endYear) {
    return { year: endYear, source: 'servicePeriodEndDate', crossYearServicePeriod, reviewNote };
  }
  if (startYear) {
    return { year: startYear, source: 'servicePeriodStartDate', crossYearServicePeriod, reviewNote };
  }

  const recordYear = getDateYear(input.recordDate);
  if (recordYear) {
    return { year: recordYear, source: 'recordDate', crossYearServicePeriod: false };
  }

  const billYear = getDateYear(input.billDate);
  if (billYear) {
    return { year: billYear, source: 'billDate', crossYearServicePeriod: false };
  }

  const reportingYear = Number(input.reportingYear);
  if (Number.isInteger(reportingYear) && reportingYear >= 1900 && reportingYear <= 2100) {
    return { year: reportingYear, source: 'reportingYear', crossYearServicePeriod: false };
  }

  return { year: null, source: 'unavailable', crossYearServicePeriod: false };
}

export function findBestConversionFactorMatch(input: {
  activityType?: string | null;
  inputUnit?: string | null;
  jurisdictionCountry?: string | null;
  jurisdictionRegion?: string | null;
  recordYear?: number | null;
  organizationId?: string | null;
  allowPlaceholderConfidence?: boolean;
  factors: MatchableConversionFactor[];
}): ConversionFactorMatch | undefined {
  const activityType = normalizeActivityType(input.activityType);
  const inputUnit = normalizeUnit(input.inputUnit);
  const country = normalizeJurisdictionCountry(input.jurisdictionCountry) ?? 'Canada';
  const region = normalizeJurisdictionRegion(input.jurisdictionRegion);
  const recordYear = input.recordYear ?? null;
  const organizationId = String(input.organizationId ?? '').trim();

  if (!activityType || !inputUnit) return undefined;
  if (activityType === 'ELECTRICITY' && !region) return undefined;

  const matchingFactors = input.factors.filter((factor) => {
    const factorKind = String(factor.type ?? 'EMISSION').trim().toUpperCase();

    return (
      factorKind === 'EMISSION' &&
      isUsableFactor(factor) &&
      normalizeFactorActivityType(factor) === activityType &&
      !(activityType === 'ELECTRICITY' && isPlaceholderFactor(factor, input.allowPlaceholderConfidence)) &&
      normalizeUnit(getFactorInputUnit(factor)) === inputUnit &&
      countryMatches(getFactorCountry(factor), country) &&
      regionCompatibleForActivity(activityType, getFactorRegion(factor), region) &&
      hasUsableFactorValue(factor)
    );
  });

  const organizationFactor = matchingFactors
    .filter((factor) =>
      organizationId
        ? String(factor.organizationId ?? '') === organizationId
        : Boolean(factor.organizationId) && !isSystemFactor(factor),
    )
    .sort((a, b) => compareBestApplicableFactor(a, b, recordYear))[0];

  if (organizationFactor) {
    return buildConversionFactorMatch({
      factor: organizationFactor,
      sourceLabel: 'Organization Custom Factor',
      recordYear,
    });
  }

  const systemFactor = matchingFactors
    .filter((factor) => isSystemFactor(factor))
    .sort((a, b) => compareBestApplicableFactor(a, b, recordYear))[0];

  if (systemFactor) {
    return buildConversionFactorMatch({
      factor: systemFactor,
      sourceLabel: 'System Default Factor',
      recordYear,
    });
  }

  return undefined;
}

function buildConversionFactorMatch(input: {
  factor: MatchableConversionFactor;
  sourceLabel: ConversionFactorMatch['sourceLabel'];
  recordYear: number | null;
}): ConversionFactorMatch {
  const factorYear = getFactorYear(input.factor);
  const exactYearMatch = Boolean(input.recordYear && factorYear && Number(factorYear) === Number(input.recordYear));
  const usedPrior = usedPriorYearFallback(input.factor, input.recordYear);
  const usedFutureProxy = Boolean(input.recordYear && factorYear && Number(factorYear) > Number(input.recordYear));
  const usedProxyFactor = usedPrior || usedFutureProxy;

  return {
    factor: input.factor,
    sourceLabel: input.sourceLabel,
    factorYear,
    usedPriorYearFallback: usedPrior,
    exactYearMatch,
    usedProxyFactor,
    reviewRecommended: usedProxyFactor,
    proxyReason: usedProxyFactor && input.recordYear && factorYear
      ? `No exact ${input.recordYear} factor was available. The nearest available factor was used for internal review only.`
      : null,
  };
}

export function getCompatibleFactorUnitLabels(input: {
  activityType?: string | null;
  inputUnit?: string | null;
  jurisdictionCountry?: string | null;
  jurisdictionRegion?: string | null;
  recordYear?: number | null;
  organizationId?: string | null;
  allowPlaceholderConfidence?: boolean;
  factors: MatchableConversionFactor[];
}) {
  const activityType = normalizeActivityType(input.activityType);
  const country = normalizeJurisdictionCountry(input.jurisdictionCountry) ?? 'Canada';
  const region = normalizeJurisdictionRegion(input.jurisdictionRegion);
  const recordYear = input.recordYear ?? null;
  const organizationId = String(input.organizationId ?? '').trim();

  if (!activityType) return [];
  if (activityType === 'ELECTRICITY' && !region) return [];

  const labels = input.factors
    .filter((factor) => {
      const factorKind = String(factor.type ?? 'EMISSION').trim().toUpperCase();
      const factorOrganizationId = String(factor.organizationId ?? '').trim();
      const isAllowedScope =
        isSystemFactor(factor) ||
        (organizationId
          ? factorOrganizationId === organizationId
          : Boolean(factorOrganizationId) && !isSystemFactor(factor));

      return (
        isAllowedScope &&
        factorKind === 'EMISSION' &&
        isUsableFactor(factor) &&
        normalizeFactorActivityType(factor) === activityType &&
        !(activityType === 'ELECTRICITY' && isPlaceholderFactor(factor, input.allowPlaceholderConfidence)) &&
        factorYearMatches(getFactorYear(factor), recordYear) &&
        countryMatches(getFactorCountry(factor), country) &&
        regionCompatibleForActivity(activityType, getFactorRegion(factor), region) &&
        hasUsableFactorValue(factor)
      );
    })
    .map((factor) => normalizeUnitForDisplay(getFactorInputUnit(factor)))
    .filter((unit): unit is { status: 'valid'; value: string } => unit.status === 'valid')
    .map((unit) => unit.value);

  return Array.from(new Set(labels)).sort((a, b) => a.localeCompare(b));
}

export function hasCompatibleFactorWithDifferentUnit(input: Parameters<typeof getCompatibleFactorUnitLabels>[0]) {
  const inputUnit = normalizeUnit(input.inputUnit);
  if (!inputUnit) return false;

  return getCompatibleFactorUnitLabels(input).some((unit) => normalizeUnit(unit) !== inputUnit);
}

export function buildFactorUnitMismatchMessage(input: {
  activityType?: string | null;
  inputUnit?: string | null;
  availableUnits: string[];
}) {
  const activityType = normalizeActivityType(input.activityType);
  const unit = normalizeUnitForDisplay(input.inputUnit);
  const inputUnit = unit.status === 'valid' ? unit.value : String(input.inputUnit ?? '').trim();
  const availableUnits = input.availableUnits.filter(Boolean);
  const availableUnitText = availableUnits.length === 1
    ? availableUnits[0]
    : availableUnits.join(', ');

  if (activityType === 'NATURAL_GAS' && inputUnit && availableUnitText) {
    const verb = availableUnits.length === 1 ? 'uses' : 'use';
    return `Natural gas usage is in ${inputUnit}, but the available factor ${verb} ${availableUnitText}.`;
  }

  const activityLabel = getActivityTypeLabel(activityType);
  if (inputUnit && availableUnitText) {
    const verb = availableUnits.length === 1 ? 'uses' : 'use';
    return `${activityLabel} is in ${inputUnit}, but the available factor ${verb} ${availableUnitText}.`;
  }

  return 'Unit mismatch. This record is excluded from emissions totals.';
}

export function getFactorSourceAuthority(factor: MatchableConversionFactor) {
  return factor.sourceAuthority || factor.sourceName || '';
}

export function getFactorInputUnit(factor: MatchableConversionFactor) {
  const currentVersion = factor.currentActiveVersion ?? factor.version;

  return currentVersion?.inputUnit || currentVersion?.unit || factor.inputUnit || factor.unit || '';
}

export function getFactorValue(factor: MatchableConversionFactor) {
  const currentVersion = factor.currentActiveVersion ?? factor.version;

  return currentVersion?.factorValue ?? currentVersion?.value ?? factor.factorValue ?? factor.value;
}

export function getFactorResultUnit(factor: MatchableConversionFactor) {
  const currentVersion = factor.currentActiveVersion ?? factor.version;

  return currentVersion?.resultUnit || factor.resultUnit || 'kgCO2e';
}

export function getFactorSourceYear(factor: MatchableConversionFactor) {
  return getFactorYear(factor);
}

function getFactorCountry(factor: MatchableConversionFactor) {
  const currentVersion = factor.currentActiveVersion ?? factor.version;
  return currentVersion?.jurisdictionCountry || factor.jurisdictionCountry || factor.country || null;
}

function getFactorRegion(factor: MatchableConversionFactor) {
  const currentVersion = factor.currentActiveVersion ?? factor.version;
  return (
    currentVersion?.jurisdictionRegion ||
    factor.jurisdictionRegion ||
    factor.region ||
    factor.jurisdiction ||
    null
  );
}

function getFactorYear(factor: MatchableConversionFactor) {
  const currentVersion = factor.currentActiveVersion ?? factor.version;
  return (
    currentVersion?.effectiveYear ??
    currentVersion?.sourceYear ??
    currentVersion?.factorYear ??
    factor.effectiveYear ??
    factor.sourceYear ??
    factor.factorYear ??
    null
  );
}

export function normalizeFactorActivityType(factor: MatchableConversionFactor) {
  const candidate =
    factor.activityType ||
    factor.factor?.activityType ||
    factor.displayName ||
    factor.factor?.displayName ||
    factor.name ||
    factor.factor?.name ||
    '';

  return normalizeActivityType(candidate);
}

function isSystemFactor(factor: MatchableConversionFactor) {
  return Boolean(factor.isSystemDefault ?? factor.isSystem ?? factor.factor?.isSystem);
}

function isUsableFactor(factor: MatchableConversionFactor) {
  const currentVersion = factor.currentActiveVersion ?? factor.version;
  const status = String(
    currentVersion?.factorStatus ??
      currentVersion?.status ??
      factor.factorStatus ??
      factor.status ??
      '',
  ).trim().toUpperCase();

  if (factor.isActive === false || currentVersion?.isActive === false) return false;
  if (['ARCHIVED', 'DEPRECATED'].includes(status)) return false;

  return true;
}

function hasUsableFactorValue(factor: MatchableConversionFactor) {
  const value = getFactorValue(factor);
  return value === null || value === undefined || Number.isFinite(Number(value));
}

function isPlaceholderFactor(
  factor: MatchableConversionFactor,
  allowPlaceholderConfidence = false,
) {
  const currentVersion = factor.currentActiveVersion ?? factor.version;
  return (
    normalizeJurisdictionRegion(getFactorRegion(factor)) === 'Province Required' ||
    (!allowPlaceholderConfidence &&
      String(currentVersion?.confidenceLevel ?? factor.confidenceLevel ?? '').toLowerCase().includes('placeholder'))
  );
}

function compareBestApplicableFactor(
  a: MatchableConversionFactor,
  b: MatchableConversionFactor,
  recordYear: number | null,
) {
  if (recordYear) {
    const aYear = Number(getFactorYear(a) ?? Number.NaN);
    const bYear = Number(getFactorYear(b) ?? Number.NaN);
    const aExact = Number.isFinite(aYear) && aYear === Number(recordYear);
    const bExact = Number.isFinite(bYear) && bYear === Number(recordYear);

    if (Number(aExact) !== Number(bExact)) {
      return Number(bExact) - Number(aExact);
    }
  }

  if (Number(a.isDefault) !== Number(b.isDefault)) {
    return Number(b.isDefault) - Number(a.isDefault);
  }

  if (recordYear) {
    const aYear = Number(getFactorYear(a) ?? Number.NEGATIVE_INFINITY);
    const bYear = Number(getFactorYear(b) ?? Number.NEGATIVE_INFINITY);
    const aDistance = Number.isFinite(aYear) ? Math.abs(aYear - Number(recordYear)) : Number.POSITIVE_INFINITY;
    const bDistance = Number.isFinite(bYear) ? Math.abs(bYear - Number(recordYear)) : Number.POSITIVE_INFINITY;

    if (aDistance !== bDistance) return aDistance - bDistance;
    if (aYear !== bYear) return bYear - aYear;
  }

  return String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? ''));
}

function usedPriorYearFallback(factor: MatchableConversionFactor, recordYear: number | null) {
  const factorYear = getFactorYear(factor);
  return Boolean(recordYear && factorYear && Number(factorYear) < Number(recordYear));
}

export function normalizeActivityType(value?: string | null) {
  return normalizeSharedActivityType(value) ?? '';
}

export function normalizeUnit(value?: string | null) {
  return normalizeUnitKey(value);
}

export function normalizeJurisdictionRegion(region?: string | null): string | null {
  const raw = String(region ?? '').split(',')[0];
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\(generic\)/g, '')
    .replace(/\s+/g, ' ');

  if (!normalized) return null;

  const aliases: Record<string, string> = {
    ab: 'Alberta',
    alta: 'Alberta',
    alberta: 'Alberta',
    bc: 'British Columbia',
    'b c': 'British Columbia',
    'british columbia': 'British Columbia',
    on: 'Ontario',
    ont: 'Ontario',
    ontario: 'Ontario',
    ca: 'Canada',
    national: 'Canada',
    canada: 'Canada',
    'canada generic': 'Canada',
    'canada national': 'Canada',
    'canada - national': 'Canada',
    'canada-level': 'Canada',
    'not province-specific': 'Canada',
    'province required': 'Province Required',
  };

  return aliases[normalized] ?? titleCase(normalized);
}

export function normalizeJurisdictionCountry(country?: string | null): string | null {
  const normalized = String(country ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!normalized) return null;
  if (['ca', 'can', 'canada'].includes(normalized)) return 'Canada';
  return titleCase(normalized);
}

function countryMatches(factorCountry?: string | null, recordCountry?: string | null) {
  const factor = normalizeJurisdictionCountry(factorCountry);
  const record = normalizeJurisdictionCountry(recordCountry);
  return !factor || !record || factor === record;
}

function regionCompatibleForActivity(
  activityType: string,
  factorRegion?: string | null,
  recordRegion?: string | null,
) {
  if (activityType === 'ELECTRICITY') {
    return regionMatchesExactly(factorRegion, recordRegion);
  }

  const normalizedFactorRegion = normalizeJurisdictionRegion(factorRegion);
  return (
    isNationalJurisdictionRegion(normalizedFactorRegion) ||
    regionMatchesExactly(factorRegion, recordRegion)
  );
}

function isNationalJurisdictionRegion(region?: string | null) {
  const normalized = normalizeJurisdictionRegion(region);
  return !normalized || normalized === 'Canada';
}

function regionMatchesExactly(factorRegion?: string | null, recordRegion?: string | null) {
  const factor = normalizeJurisdictionRegion(factorRegion);
  const record = normalizeJurisdictionRegion(recordRegion);
  return Boolean(factor && record && factor === record);
}

function factorYearMatches(factorYear?: number | null, recordYear?: number | null) {
  return !factorYear || !recordYear || Number(factorYear) <= Number(recordYear);
}

function getDateYear(value?: string | null) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const directYear = Number(text.slice(0, 4));
  if (/^\d{4}/.test(text) && Number.isInteger(directYear) && directYear >= 1900 && directYear <= 2100) {
    return directYear;
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  return year >= 1900 && year <= 2100 ? year : null;
}

function titleCase(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
