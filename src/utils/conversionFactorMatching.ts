import { isFactorAllowedForWorkspace, type FactorWorkspacePolicy } from './factorCalculationPolicy';
import { getCurrentUser } from '../services/auth';
import { isInventoryFactorEligible, type FactorGovernance } from './factorGovernance';
import { normalizeUnitKey } from './unitNormalization';
import {
  getActivityTypeLabel,
  normalizeActivityType as normalizeSharedActivityType,
} from './activityType';
import { normalizeUnitForDisplay } from './unitNormalization';

export type MatchableConversionFactor = FactorGovernance & {
  id: string;
  organizationId?: string | null;
  factorType?: string | null;
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
  sourceDocument?: string | null;
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
  isPlaceholder?: boolean | null;
  isUsableForCalculation?: boolean | null;
  usableForCalculation?: boolean | null;
  isCalculationEligible?: boolean | null;
  calculationEligible?: boolean | null;
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

export type MatchableUnitConversion = {
  id: string;
  activityType?: string | null;
  fromUnit?: string | null;
  toUnit?: string | null;
  conversionValue?: string | number | null;
  value?: string | number | null;
  factorValue?: string | number | null;
  conversionExpression?: string | null;
  jurisdiction?: string | null;
  jurisdictionCountry?: string | null;
  jurisdictionRegion?: string | null;
  country?: string | null;
  region?: string | null;
  sourceAuthority?: string | null;
  sourceName?: string | null;
  sourceReference?: string | null;
  sourceDocument?: string | null;
  sourceUrl?: string | null;
  sourceYear?: number | null;
  effectiveYear?: number | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  version?: string | number | null;
  conversionVersion?: string | null;
  status?: string | null;
  lifecycleStatus?: string | null;
  isActive?: boolean | null;
  isUsableForCalculation?: boolean | null;
  usableForCalculation?: boolean | null;
  isCalculationEligible?: boolean | null;
  calculationEligible?: boolean | null;
  confidence?: string | null;
  confidenceLevel?: string | null;
  verificationStatus?: string | null;
  verified?: boolean | null;
  notes?: string | null;
  updatedAt?: string | null;
};

export type FactorSelectionReason =
  | 'EXACT_MATCH'
  | 'PRIOR_YEAR_FALLBACK'
  | 'GENERIC_JURISDICTION_FALLBACK'
  | 'PILOT_DEFAULT_FALLBACK'
  | 'NEAREST_YEAR_PROXY';

export type UnitConversionSelectionReason =
  | 'EXACT_CONVERSION_MATCH'
  | 'PRIOR_YEAR_CONVERSION_FALLBACK'
  | 'GENERIC_JURISDICTION_CONVERSION_FALLBACK';

export type UnitConversionMatch = {
  conversion: MatchableUnitConversion;
  conversionValue: number;
  convertedQuantity?: number;
  fromUnit: string;
  toUnit: string;
  conversionYear?: number | null;
  conversionVersion?: string | null;
  sourceAuthority: string;
  sourceDocument?: string;
  sourceUrl?: string;
  sourceYear?: number | null;
  verificationStatus?: string | null;
  confidenceLevel?: string | null;
  usedPriorYearFallback?: boolean;
  usedGenericJurisdictionFallback?: boolean;
  exactYearMatch?: boolean;
  selectionReason: UnitConversionSelectionReason;
  selectionExplanation: string;
};

export type ConversionFactorMatch = {
  factor: MatchableConversionFactor;
  sourceLabel: 'Organization Custom Factor' | 'System Default Factor';
  conversion?: UnitConversionMatch;
  isConversionAssisted?: boolean;
  factorYear?: number | null;
  usedPriorYearFallback?: boolean;
  usedGenericJurisdictionFallback?: boolean;
  usedPilotDefaultFallback?: boolean;
  exactYearMatch?: boolean;
  usedProxyFactor?: boolean;
  reviewRecommended?: boolean;
  proxyReason?: string | null;
  selectionReason: FactorSelectionReason;
  selectionExplanation: string;
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
  quantity?: number | null;
  organizationId?: string | null;
  allowDemoFactorsForCalculations?: boolean;
  allowPlaceholderConfidence?: boolean;
  factors: MatchableConversionFactor[];
  unitConversions?: MatchableUnitConversion[];
}): ConversionFactorMatch | undefined {
  const activityType = normalizeActivityType(input.activityType);
  const inputUnit = normalizeUnit(input.inputUnit);
  const country = normalizeJurisdictionCountry(input.jurisdictionCountry) ?? 'Canada';
  const region = normalizeJurisdictionRegion(input.jurisdictionRegion);
  const recordYear = input.recordYear ?? null;
  const organizationId = String(input.organizationId ?? '').trim();
  const policy = resolveWorkspacePolicy(input);

  if (!activityType || !inputUnit) return undefined;
  if (activityType === 'ELECTRICITY' && !region) return undefined;

  const matchingFactors = input.factors.filter((factor) => {
    const factorKind = String(factor.type ?? 'EMISSION').trim().toUpperCase();

    return (
      factorKind === 'EMISSION' &&
      isUsableFactor(factor, policy) &&
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
      activityCountry: country,
      activityRegion: region,
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
      activityCountry: country,
      activityRegion: region,
    });
  }

  return findBestConversionAssistedMatch({
    ...input,
    activityType,
    inputUnit,
    country,
    region,
    recordYear,
    organizationId,
  });
}

function buildConversionFactorMatch(input: {
  factor: MatchableConversionFactor;
  sourceLabel: ConversionFactorMatch['sourceLabel'];
  recordYear: number | null;
  activityCountry?: string | null;
  activityRegion?: string | null;
  conversion?: UnitConversionMatch;
}): ConversionFactorMatch {
  const factorYear = getFactorYear(input.factor);
  const exactYearMatch = Boolean(input.recordYear && factorYear && Number(factorYear) === Number(input.recordYear));
  const usedPrior = usedPriorYearFallback(input.factor, input.recordYear);
  const usedFutureProxy = Boolean(input.recordYear && factorYear && Number(factorYear) > Number(input.recordYear));
  const usedProxyFactor = usedPrior || usedFutureProxy;
  const usedGenericJurisdictionFallback = isGenericJurisdictionFactor(input.factor);
  const usedPilotDefaultFallback = isPilotDefaultFactor(input.factor);
  const selectionReason = getSelectionReason({
    exactYearMatch,
    usedPrior,
    usedFutureProxy,
    usedGenericJurisdictionFallback,
    usedPilotDefaultFallback,
  });

  return {
    factor: input.factor,
    sourceLabel: input.sourceLabel,
    conversion: input.conversion,
    isConversionAssisted: Boolean(input.conversion),
    factorYear,
    usedPriorYearFallback: usedPrior,
    usedGenericJurisdictionFallback,
    usedPilotDefaultFallback,
    exactYearMatch,
    usedProxyFactor,
    reviewRecommended: usedProxyFactor || usedGenericJurisdictionFallback || usedPilotDefaultFallback,
    proxyReason: usedProxyFactor && input.recordYear && factorYear
      ? `No exact ${input.recordYear} factor was available. The nearest available factor was used for internal review only.`
      : null,
    selectionReason,
    selectionExplanation: buildSelectionExplanation({
      factor: input.factor,
      activityCountry: input.activityCountry,
      activityRegion: input.activityRegion,
      recordYear: input.recordYear,
      factorYear,
      selectionReason,
      exactYearMatch,
      usedPrior,
      usedFutureProxy,
      usedGenericJurisdictionFallback,
      usedPilotDefaultFallback,
    }),
  };
}

function findBestConversionAssistedMatch(input: {
  activityType: string;
  inputUnit: string;
  country: string;
  region: string | null;
  recordYear: number | null;
  quantity?: number | null;
  organizationId: string;
  allowDemoFactorsForCalculations?: boolean;
  allowPlaceholderConfidence?: boolean;
  factors: MatchableConversionFactor[];
  unitConversions?: MatchableUnitConversion[];
}): ConversionFactorMatch | undefined {
  if (!input.unitConversions?.length) return undefined;
  const policy = resolveWorkspacePolicy(input);

  const candidateFactors = input.factors.filter((factor) => {
    const factorKind = String(factor.type ?? 'EMISSION').trim().toUpperCase();
    const factorUnit = normalizeUnit(getFactorInputUnit(factor));

    return (
      factorKind === 'EMISSION' &&
      isUsableFactor(factor, policy) &&
      normalizeFactorActivityType(factor) === input.activityType &&
      !(input.activityType === 'ELECTRICITY' && isPlaceholderFactor(factor, input.allowPlaceholderConfidence)) &&
      factorUnit &&
      factorUnit !== input.inputUnit &&
      factorYearMatches(getFactorYear(factor), input.recordYear) &&
      countryMatches(getFactorCountry(factor), input.country) &&
      regionCompatibleForActivity(input.activityType, getFactorRegion(factor), input.region) &&
      hasUsableFactorValue(factor)
    );
  });

  const buildMatches = (
    factors: MatchableConversionFactor[],
    sourceLabel: ConversionFactorMatch['sourceLabel'],
  ) => factors
    .map((factor) => {
      const conversion = findBestUnitConversionMatch({
        activityType: input.activityType,
        fromUnit: input.inputUnit,
        toUnit: getFactorInputUnit(factor),
        jurisdictionCountry: input.country,
        jurisdictionRegion: input.region,
        recordYear: input.recordYear,
        quantity: input.quantity,
        unitConversions: input.unitConversions ?? [],
        ...resolveWorkspacePolicy(input),
      });

      return conversion
        ? buildConversionFactorMatch({
            factor,
            sourceLabel,
            recordYear: input.recordYear,
            activityCountry: input.country,
            activityRegion: input.region,
            conversion,
          })
        : null;
    })
    .filter((match): match is ConversionFactorMatch => Boolean(match));

  const organizationMatches = buildMatches(
    candidateFactors.filter((factor) =>
      input.organizationId
        ? String(factor.organizationId ?? '') === input.organizationId
        : Boolean(factor.organizationId) && !isSystemFactor(factor),
    ),
    'Organization Custom Factor',
  );
  if (organizationMatches.length > 0) {
    return organizationMatches.sort((a, b) => compareBestConversionAssistedMatch(a, b, input.recordYear))[0];
  }

  const systemMatches = buildMatches(
    candidateFactors.filter((factor) => isSystemFactor(factor)),
    'System Default Factor',
  );

  return systemMatches.sort((a, b) => compareBestConversionAssistedMatch(a, b, input.recordYear))[0];
}

export function findBestUnitConversionMatch(input: {
  activityType?: string | null;
  fromUnit?: string | null;
  toUnit?: string | null;
  jurisdictionCountry?: string | null;
  jurisdictionRegion?: string | null;
  recordYear?: number | null;
  quantity?: number | null;
  unitConversions: MatchableUnitConversion[];
  organizationId?: string | null;
  allowDemoFactorsForCalculations?: boolean;
}): UnitConversionMatch | undefined {
  const activityType = normalizeActivityType(input.activityType);
  const fromUnit = normalizeUnit(input.fromUnit);
  const toUnit = normalizeUnit(input.toUnit);
  const country = normalizeJurisdictionCountry(input.jurisdictionCountry) ?? 'Canada';
  const region = normalizeJurisdictionRegion(input.jurisdictionRegion);
  const recordYear = input.recordYear ?? null;

  if (!activityType || !fromUnit || !toUnit || fromUnit === toUnit) return undefined;

  const policy = resolveWorkspacePolicy(input);
  const conversion = input.unitConversions
    .filter((candidate) => (
      isFactorAllowedForWorkspace(candidate, policy) &&
      isUsableUnitConversion(candidate) &&
      normalizeActivityType(candidate.activityType) === activityType &&
      normalizeUnit(candidate.fromUnit) === fromUnit &&
      normalizeUnit(candidate.toUnit) === toUnit &&
      factorYearMatches(getUnitConversionYear(candidate), recordYear) &&
      countryMatches(getUnitConversionCountry(candidate), country) &&
      regionCompatibleForActivity(activityType, getUnitConversionRegion(candidate), region) &&
      hasUsableUnitConversionValue(candidate) &&
      hasRequiredUnitConversionProvenance(candidate)
    ))
    .sort((a, b) => compareBestApplicableUnitConversion(a, b, recordYear))[0];

  if (!conversion) return undefined;

  return buildUnitConversionMatch({
    conversion,
    fromUnit: normalizeUnitForDisplay(input.fromUnit).status === 'valid'
      ? normalizeUnitForDisplay(input.fromUnit).value
      : fromUnit,
    toUnit: normalizeUnitForDisplay(input.toUnit).status === 'valid'
      ? normalizeUnitForDisplay(input.toUnit).value
      : toUnit,
    recordYear,
    quantity: input.quantity,
  });
}

function buildUnitConversionMatch(input: {
  conversion: MatchableUnitConversion;
  fromUnit: string;
  toUnit: string;
  recordYear: number | null;
  quantity?: number | null;
}): UnitConversionMatch {
  const conversionValue = Number(getUnitConversionValue(input.conversion));
  const conversionYear = getUnitConversionYear(input.conversion);
  const exactYearMatch = Boolean(input.recordYear && conversionYear && Number(conversionYear) === Number(input.recordYear));
  const usedPrior = Boolean(input.recordYear && conversionYear && Number(conversionYear) < Number(input.recordYear));
  const usedGenericJurisdictionFallback = isGenericUnitConversion(input.conversion);
  const selectionReason = usedGenericJurisdictionFallback
    ? 'GENERIC_JURISDICTION_CONVERSION_FALLBACK'
    : usedPrior
    ? 'PRIOR_YEAR_CONVERSION_FALLBACK'
    : 'EXACT_CONVERSION_MATCH';
  const quantity = Number(input.quantity);
  const convertedQuantity = Number.isFinite(quantity) && quantity > 0
    ? quantity * conversionValue
    : undefined;

  return {
    conversion: input.conversion,
    conversionValue,
    convertedQuantity,
    fromUnit: input.fromUnit,
    toUnit: input.toUnit,
    conversionYear,
    conversionVersion: getUnitConversionVersion(input.conversion) || null,
    sourceAuthority: getUnitConversionSourceAuthority(input.conversion),
    sourceDocument: getUnitConversionSourceDocument(input.conversion) || undefined,
    sourceUrl: input.conversion.sourceUrl || undefined,
    sourceYear: input.conversion.sourceYear ?? null,
    verificationStatus: input.conversion.verificationStatus ?? null,
    confidenceLevel: input.conversion.confidenceLevel ?? input.conversion.confidence ?? null,
    usedPriorYearFallback: usedPrior,
    usedGenericJurisdictionFallback,
    exactYearMatch,
    selectionReason,
    selectionExplanation: buildUnitConversionSelectionExplanation({
      conversion: input.conversion,
      recordYear: input.recordYear,
      conversionYear,
      fromUnit: input.fromUnit,
      toUnit: input.toUnit,
      usedPrior,
      usedGenericJurisdictionFallback,
    }),
  };
}

export function getCompatibleFactorUnitLabels(input: {
  activityType?: string | null;
  inputUnit?: string | null;
  jurisdictionCountry?: string | null;
  jurisdictionRegion?: string | null;
  recordYear?: number | null;
  organizationId?: string | null;
  allowDemoFactorsForCalculations?: boolean;
  allowPlaceholderConfidence?: boolean;
  factors: MatchableConversionFactor[];
}) {
  const activityType = normalizeActivityType(input.activityType);
  const country = normalizeJurisdictionCountry(input.jurisdictionCountry) ?? 'Canada';
  const region = normalizeJurisdictionRegion(input.jurisdictionRegion);
  const recordYear = input.recordYear ?? null;
  const organizationId = String(input.organizationId ?? '').trim();
  const policy = resolveWorkspacePolicy(input);

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
        isUsableFactor(factor, policy) &&
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

  const activityLabel = getActivityTypeLabel(activityType);
  if (inputUnit && availableUnitText) {
    const factorText = availableUnits.length === 1 ? 'the available emission factor' : 'available emission factors';
    const verb = availableUnits.length === 1 ? 'requires' : 'require';
    return `${activityLabel} is recorded in ${inputUnit}, but ${factorText} ${verb} ${availableUnitText}. No approved conversion path is available.`;
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

function getUnitConversionValue(conversion: MatchableUnitConversion) {
  return conversion.conversionValue ?? conversion.value ?? conversion.factorValue;
}

function getUnitConversionCountry(conversion: MatchableUnitConversion) {
  return conversion.jurisdictionCountry || conversion.country || null;
}

function getUnitConversionRegion(conversion: MatchableUnitConversion) {
  return (
    conversion.jurisdictionRegion ||
    conversion.region ||
    conversion.jurisdiction ||
    null
  );
}

function getUnitConversionYear(conversion: MatchableUnitConversion) {
  return conversion.effectiveYear ?? conversion.sourceYear ?? null;
}

function getUnitConversionSourceAuthority(conversion: MatchableUnitConversion) {
  return conversion.sourceAuthority || conversion.sourceName || '';
}

function getUnitConversionSourceDocument(conversion: MatchableUnitConversion) {
  return conversion.sourceDocument || conversion.sourceReference || '';
}

function getUnitConversionVersion(conversion: MatchableUnitConversion) {
  return String(conversion.conversionVersion ?? conversion.version ?? '').trim();
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
  return (
    normalizeStatus(factor.factorType) === 'SYSTEM' ||
    Boolean(factor.isSystemDefault ?? factor.isSystem ?? factor.factor?.isSystem)
  );
}

function normalizeStatus(value?: string | null) {
  return String(value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
}

function isUsableFactor(factor: MatchableConversionFactor, policy: FactorWorkspacePolicy) {
  const currentVersion = factor.currentActiveVersion ?? factor.version;
  if (!isFactorAllowedForWorkspace(factor, policy) || (currentVersion && !isFactorAllowedForWorkspace(currentVersion, policy))) return false;
  if (!isInventoryFactorEligible(factor) || (currentVersion && !isInventoryFactorEligible(currentVersion))) return false;
  const status = String(
    currentVersion?.factorStatus ??
      currentVersion?.status ??
      factor.factorStatus ??
      factor.status ??
      '',
  ).trim().toUpperCase();

  if (factor.isActive === false || currentVersion?.isActive === false) return false;
  if (
    factor.isUsableForCalculation === false ||
    factor.usableForCalculation === false ||
    factor.isCalculationEligible === false ||
    factor.calculationEligible === false ||
    currentVersion?.isUsableForCalculation === false ||
    currentVersion?.usableForCalculation === false ||
    currentVersion?.isCalculationEligible === false ||
    currentVersion?.calculationEligible === false
  ) {
    return false;
  }
  if (['ARCHIVED', 'DEPRECATED'].includes(status)) return false;

  return true;
}

function hasUsableFactorValue(factor: MatchableConversionFactor) {
  const value = getFactorValue(factor);
  return value !== null && value !== undefined && Number.isFinite(Number(value));
}

function isUsableUnitConversion(conversion: MatchableUnitConversion) {
  const status = normalizeStatus(conversion.lifecycleStatus ?? conversion.status);

  if (conversion.isActive === false) return false;
  if (
    conversion.isUsableForCalculation === false ||
    conversion.usableForCalculation === false ||
    conversion.isCalculationEligible === false ||
    conversion.calculationEligible === false
  ) {
    return false;
  }
  if (['ARCHIVED', 'DEPRECATED', 'RETIRED'].includes(status)) return false;

  return true;
}

function hasUsableUnitConversionValue(conversion: MatchableUnitConversion) {
  const value = Number(getUnitConversionValue(conversion));
  return Number.isFinite(value) && value > 0;
}

function hasRequiredUnitConversionProvenance(conversion: MatchableUnitConversion) {
  const sourceAuthority = getUnitConversionSourceAuthority(conversion);
  const sourceDocument = getUnitConversionSourceDocument(conversion);
  const sourceUrl = String(conversion.sourceUrl ?? '').trim();
  const sourceYear = Number(conversion.sourceYear);
  const verificationStatus = normalizeStatus(conversion.verificationStatus);

  return Boolean(
    sourceAuthority &&
      (sourceDocument || sourceUrl) &&
      Number.isInteger(sourceYear) &&
      sourceYear >= 1900 &&
      sourceYear <= 2100 &&
      verificationStatus,
  );
}

function isPlaceholderFactor(
  factor: MatchableConversionFactor,
  _allowPlaceholderConfidence = false,
) {
  const currentVersion = factor.currentActiveVersion ?? factor.version;
  return (
    normalizeJurisdictionRegion(getFactorRegion(factor)) === 'Province Required' ||
    factor.isPlaceholder === true ||
    currentVersion?.isPlaceholder === true
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

  const aGeneric = isGenericJurisdictionFactor(a);
  const bGeneric = isGenericJurisdictionFactor(b);
  if (aGeneric !== bGeneric) {
    return Number(aGeneric) - Number(bGeneric);
  }

  const aQuality = getFactorQualityRank(a);
  const bQuality = getFactorQualityRank(b);
  if (aQuality !== bQuality) return bQuality - aQuality;

  const aPilotDefault = isPilotDefaultFactor(a);
  const bPilotDefault = isPilotDefaultFactor(b);
  if (aPilotDefault !== bPilotDefault) {
    return Number(aPilotDefault) - Number(bPilotDefault);
  }

  const aIsDefault = Boolean(a.isDefault);
  const bIsDefault = Boolean(b.isDefault);
  if (aIsDefault !== bIsDefault) {
    return Number(bIsDefault) - Number(aIsDefault);
  }

  if (recordYear) {
    const aYear = Number(getFactorYear(a) ?? Number.NEGATIVE_INFINITY);
    const bYear = Number(getFactorYear(b) ?? Number.NEGATIVE_INFINITY);
    const aDistance = Number.isFinite(aYear) ? Math.abs(aYear - Number(recordYear)) : Number.POSITIVE_INFINITY;
    const bDistance = Number.isFinite(bYear) ? Math.abs(bYear - Number(recordYear)) : Number.POSITIVE_INFINITY;

    if (aDistance !== bDistance) return aDistance - bDistance;
    if (aYear !== bYear) return bYear - aYear;
  }

  const updatedAtComparison = String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? ''));
  if (updatedAtComparison !== 0) return updatedAtComparison;

  const nameComparison = String(a.name ?? '').localeCompare(String(b.name ?? ''));
  if (nameComparison !== 0) return nameComparison;

  return String(a.id ?? '').localeCompare(String(b.id ?? ''));
}

function compareBestConversionAssistedMatch(
  a: ConversionFactorMatch,
  b: ConversionFactorMatch,
  recordYear: number | null,
) {
  if (a.conversion && b.conversion) {
    const conversionComparison = compareBestApplicableUnitConversion(
      a.conversion.conversion,
      b.conversion.conversion,
      recordYear,
    );
    if (conversionComparison !== 0) return conversionComparison;
  }

  return compareBestApplicableFactor(a.factor, b.factor, recordYear);
}

function compareBestApplicableUnitConversion(
  a: MatchableUnitConversion,
  b: MatchableUnitConversion,
  recordYear: number | null,
) {
  if (recordYear) {
    const aYear = Number(getUnitConversionYear(a) ?? Number.NaN);
    const bYear = Number(getUnitConversionYear(b) ?? Number.NaN);
    const aExact = Number.isFinite(aYear) && aYear === Number(recordYear);
    const bExact = Number.isFinite(bYear) && bYear === Number(recordYear);

    if (Number(aExact) !== Number(bExact)) {
      return Number(bExact) - Number(aExact);
    }
  }

  const aGeneric = isGenericUnitConversion(a);
  const bGeneric = isGenericUnitConversion(b);
  if (aGeneric !== bGeneric) {
    return Number(aGeneric) - Number(bGeneric);
  }

  const aQuality = getUnitConversionQualityRank(a);
  const bQuality = getUnitConversionQualityRank(b);
  if (aQuality !== bQuality) return bQuality - aQuality;

  if (recordYear) {
    const aYear = Number(getUnitConversionYear(a) ?? Number.NEGATIVE_INFINITY);
    const bYear = Number(getUnitConversionYear(b) ?? Number.NEGATIVE_INFINITY);
    const aDistance = Number.isFinite(aYear) ? Math.abs(aYear - Number(recordYear)) : Number.POSITIVE_INFINITY;
    const bDistance = Number.isFinite(bYear) ? Math.abs(bYear - Number(recordYear)) : Number.POSITIVE_INFINITY;

    if (aDistance !== bDistance) return aDistance - bDistance;
    if (aYear !== bYear) return bYear - aYear;
  }

  const updatedAtComparison = String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? ''));
  if (updatedAtComparison !== 0) return updatedAtComparison;

  return String(a.id ?? '').localeCompare(String(b.id ?? ''));
}

function usedPriorYearFallback(factor: MatchableConversionFactor, recordYear: number | null) {
  const factorYear = getFactorYear(factor);
  return Boolean(recordYear && factorYear && Number(factorYear) < Number(recordYear));
}

function isGenericJurisdictionFactor(factor: MatchableConversionFactor) {
  return isNationalJurisdictionRegion(getFactorRegion(factor));
}

function isGenericUnitConversion(conversion: MatchableUnitConversion) {
  return isNationalJurisdictionRegion(getUnitConversionRegion(conversion));
}

function isPilotDefaultFactor(factor: MatchableConversionFactor) {
  const currentVersion = factor.currentActiveVersion ?? factor.version;
  const factorSet = normalizeStatus(String(currentVersion?.factorSet ?? factor.factorSet ?? ''));
  const confidence = normalizeStatus(String(currentVersion?.confidence ?? factor.confidence ?? ''));
  const confidenceLevel = normalizeStatus(String(currentVersion?.confidenceLevel ?? factor.confidenceLevel ?? ''));
  const verificationStatus = normalizeStatus(String(currentVersion?.verificationStatus ?? factor.verificationStatus ?? ''));
  const sourceAuthority = normalizeStatus(getFactorSourceAuthority(factor));

  return Boolean(
    factor.isPilotEstimate ||
      factorSet.includes('PILOT') ||
      confidence.includes('PILOT') ||
      confidenceLevel.includes('PILOT') ||
      verificationStatus.includes('PILOT') ||
      (sourceAuthority === 'CARBONLITE' && verificationStatus.includes('INTERNAL_REVIEW')),
  );
}

function getFactorQualityRank(factor: MatchableConversionFactor) {
  const currentVersion = factor.currentActiveVersion ?? factor.version;
  const verificationStatus = normalizeStatus(String(currentVersion?.verificationStatus ?? factor.verificationStatus ?? ''));
  const confidenceLevel = normalizeStatus(String(currentVersion?.confidenceLevel ?? factor.confidenceLevel ?? ''));
  const factorStatus = normalizeStatus(String(currentVersion?.factorStatus ?? factor.factorStatus ?? factor.status ?? ''));
  let score = 0;

  if (factor.verified) score += 30;
  if (['OFFICIAL_SOURCE', 'OFFICIAL', 'VERIFIED'].includes(verificationStatus)) score += 25;
  if (['REVIEWED', 'CONSULTANT_REVIEWED'].includes(verificationStatus)) score += 15;
  if (verificationStatus === 'INTERNAL_REVIEW_REQUIRED') score -= 10;
  if (['HIGH', 'OFFICIAL_SOURCE'].includes(confidenceLevel)) score += 12;
  if (confidenceLevel === 'MEDIUM') score += 6;
  if (confidenceLevel === 'LOW') score -= 4;
  if (confidenceLevel.includes('PLACEHOLDER') || confidenceLevel.includes('PILOT')) score -= 12;
  if (factorStatus === 'ACTIVE') score += 5;
  if (isPilotDefaultFactor(factor)) score -= 20;

  return score;
}

function getUnitConversionQualityRank(conversion: MatchableUnitConversion) {
  const verificationStatus = normalizeStatus(conversion.verificationStatus);
  const confidenceLevel = normalizeStatus(conversion.confidenceLevel ?? conversion.confidence);
  const lifecycleStatus = normalizeStatus(conversion.lifecycleStatus ?? conversion.status);
  let score = 0;

  if (conversion.verified) score += 30;
  if (['OFFICIAL_SOURCE', 'OFFICIAL', 'VERIFIED'].includes(verificationStatus)) score += 25;
  if (['REVIEWED', 'CONSULTANT_REVIEWED'].includes(verificationStatus)) score += 15;
  if (verificationStatus === 'INTERNAL_REVIEW_REQUIRED') score -= 5;
  if (['HIGH', 'OFFICIAL_SOURCE'].includes(confidenceLevel)) score += 12;
  if (confidenceLevel === 'MEDIUM') score += 6;
  if (confidenceLevel === 'LOW') score -= 4;
  if (lifecycleStatus === 'ACTIVE') score += 5;

  return score;
}

function getSelectionReason(input: {
  exactYearMatch: boolean;
  usedPrior: boolean;
  usedFutureProxy: boolean;
  usedGenericJurisdictionFallback: boolean;
  usedPilotDefaultFallback: boolean;
}): FactorSelectionReason {
  if (input.usedPilotDefaultFallback) return 'PILOT_DEFAULT_FALLBACK';
  if (input.usedGenericJurisdictionFallback) return 'GENERIC_JURISDICTION_FALLBACK';
  if (input.usedPrior) return 'PRIOR_YEAR_FALLBACK';
  if (input.usedFutureProxy || !input.exactYearMatch) return 'NEAREST_YEAR_PROXY';
  return 'EXACT_MATCH';
}

function buildSelectionExplanation(input: {
  factor: MatchableConversionFactor;
  activityCountry?: string | null;
  activityRegion?: string | null;
  recordYear: number | null;
  factorYear: number | null | undefined;
  selectionReason: FactorSelectionReason;
  exactYearMatch: boolean;
  usedPrior: boolean;
  usedFutureProxy: boolean;
  usedGenericJurisdictionFallback: boolean;
  usedPilotDefaultFallback: boolean;
}) {
  const parts = [
    `Activity type matched ${getActivityTypeLabel(normalizeFactorActivityType(input.factor))}.`,
    `Unit matched ${normalizeUnitForDisplay(getFactorInputUnit(input.factor)).status === 'valid'
      ? normalizeUnitForDisplay(getFactorInputUnit(input.factor)).value
      : getFactorInputUnit(input.factor)}.`,
  ];

  const activityJurisdiction = formatJurisdictionForExplanation(input.activityRegion, input.activityCountry);
  const factorJurisdiction = formatFactorJurisdictionForExplanation(
    getFactorRegion(input.factor),
    getFactorCountry(input.factor),
  );

  if (input.usedGenericJurisdictionFallback) {
    if (activityJurisdiction) parts.push(`Activity jurisdiction is ${activityJurisdiction}.`);
  } else if (factorJurisdiction) {
    parts.push(`Jurisdiction matched ${factorJurisdiction}.`);
  }

  if (input.exactYearMatch && input.recordYear) parts.push(`Factor year matched activity year ${input.recordYear}.`);
  if (input.usedPrior && input.recordYear && input.factorYear) {
    parts.push(`No exact ${input.recordYear} factor was available; prior-year factor ${input.factorYear} was selected.`);
  }
  if (input.usedFutureProxy && input.recordYear && input.factorYear) {
    parts.push(`No exact or prior-year ${input.recordYear} factor was available; nearest factor ${input.factorYear} was selected for review.`);
  }
  if (input.usedGenericJurisdictionFallback) {
    const region = String(input.activityRegion ?? '').trim();
    const unit = normalizeUnitForDisplay(getFactorInputUnit(input.factor));
    const unitLabel = unit.status === 'valid' ? unit.value : getFactorInputUnit(input.factor);
    const factorYearText = input.factorYear ? `${input.factorYear} ` : '';
    parts.push(
      region && !isGenericJurisdictionValue(region)
        ? `No ${region}-specific direct ${unitLabel} factor was available; a ${factorYearText}Canada-generic factor was selected.`
        : `A ${factorYearText}Canada-generic factor was selected.`,
    );
  }
  if (input.usedPilotDefaultFallback) parts.push('A CarbonLite pilot/default factor was used and requires review before formal reporting.');

  return parts.join(' ');
}

function formatJurisdictionForExplanation(region?: string | null, country?: string | null) {
  const cleanRegion = String(region ?? '').trim();
  const cleanCountry = String(country ?? '').trim();

  if (!cleanRegion && !cleanCountry) return '';
  if (!cleanRegion) return cleanCountry;
  if (!cleanCountry) return cleanRegion;
  if (cleanRegion.toLowerCase() === cleanCountry.toLowerCase()) return cleanRegion;
  if (cleanRegion.toLowerCase().includes(cleanCountry.toLowerCase())) return cleanRegion;

  return `${cleanRegion}, ${cleanCountry}`;
}

function formatFactorJurisdictionForExplanation(region?: string | null, country?: string | null) {
  if (isGenericJurisdictionValue(region) || (!String(region ?? '').trim() && isGenericJurisdictionValue(country))) {
    return 'Canada (Generic)';
  }

  return formatJurisdictionForExplanation(region, country);
}

function buildUnitConversionSelectionExplanation(input: {
  conversion: MatchableUnitConversion;
  recordYear: number | null;
  conversionYear: number | null | undefined;
  fromUnit: string;
  toUnit: string;
  usedPrior: boolean;
  usedGenericJurisdictionFallback: boolean;
}) {
  const parts = [
    `Approved conversion matched ${input.fromUnit} to ${input.toUnit}.`,
    `Conversion provenance includes ${getUnitConversionSourceAuthority(input.conversion)}.`,
  ];

  const jurisdiction = [getUnitConversionRegion(input.conversion), getUnitConversionCountry(input.conversion)]
    .filter(Boolean)
    .join(', ');
  if (jurisdiction) parts.push(`Conversion jurisdiction matched ${jurisdiction}.`);
  if (input.recordYear && input.conversionYear && Number(input.conversionYear) === Number(input.recordYear)) {
    parts.push(`Conversion year matched activity year ${input.recordYear}.`);
  }
  if (input.usedPrior && input.recordYear && input.conversionYear) {
    parts.push(`No exact ${input.recordYear} conversion was available; prior-year conversion ${input.conversionYear} was selected.`);
  }
  if (input.usedGenericJurisdictionFallback) {
    parts.push('A broader Canada-generic conversion was used.');
  }

  return parts.join(' ');
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

function isGenericJurisdictionValue(value?: string | null) {
  const normalized = String(value ?? '')
    .trim()
    .replace(/[()]/g, '')
    .replace(/[-\s]+/g, '_')
    .toUpperCase();

  return ['', 'CANADA', 'NATIONAL', 'CANADA_GENERIC', 'CANADA_NATIONAL'].includes(normalized);
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

/** The server remains authoritative; absent/stale client policy fails closed. */
function resolveWorkspacePolicy(input: FactorWorkspacePolicy) {
  const user = getCurrentUser();
  const organizationId = input.organizationId || user?.organizationId;
  return {
    organizationId,
    allowDemoFactorsForCalculations: input.allowDemoFactorsForCalculations ??
      (Boolean(organizationId) && organizationId === user?.organizationId && user?.allowDemoFactorsForCalculations === true),
  };
}
