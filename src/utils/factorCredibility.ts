import {
  getFactorInputUnit,
  getFactorResultUnit,
  getFactorSourceAuthority,
  getFactorSourceYear,
  getFactorValue,
  type ConversionFactorMatch,
  type MatchableConversionFactor,
} from './conversionFactorMatching';
import { normalizeActivityType } from './activityType';

export const SCOPE_3_PILOT_ASSUMPTION =
  'Pilot-stage estimate. Scope 3 calculations can vary by methodology, boundary, and factor source. Consultant review recommended before official reporting.';

const FRIENDLY_LABELS: Record<string, string> = {
  OFFICIAL_SOURCE: 'Official Source',
  OFFICIAL_GOVERNMENT: 'Official Source',
  RECOGNIZED_SOURCE: 'Recognized Source',
  CONSULTANT_REVIEWED: 'Consultant Reviewed',
  INTERNAL_REVIEW_REQUIRED: 'Internal Review Required',
  PILOT_ESTIMATE: 'Pilot Estimate',
  DEMO: 'Pilot Estimate',
  DEMO_FACTOR: 'Pilot Estimate',
  PILOT_DEMO: 'Pilot Estimate',
  MISSING_SOURCE: 'Missing Source',
  TRACKED_ONLY: 'Tracked Only',
  NOT_EMISSIONS_FACTOR_REQUIRED: 'Tracked Only',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
  CUSTOM: 'Custom',
  DRAFT: 'Draft',
  USER_PROVIDED: 'User Provided',
  REVIEWED: 'Reviewed',
};

const SCOPE_3_ACTIVITY_TYPES = new Set([
  'AIR_TRAVEL',
  'HOTEL',
  'GROUND_TRANSPORT',
  'SHIPPING',
]);

export type FactorSnapshotFields = {
  matchedFactorValue?: number;
  matchedFactorUnit?: string;
  matchedFactorVersion?: string;
  matchedFactorSourceAuthority?: string;
  matchedFactorSourceDocument?: string;
  matchedFactorVerificationStatus?: string;
  matchedFactorConfidenceLevel?: string;
  matchedFactorAssumptions?: string;
};

function normalizeLabelKey(value?: string | null) {
  return String(value ?? '')
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .replace(/[()]/g, '')
    .toUpperCase();
}

export function formatCredibilityLabel(value?: string | null) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  return FRIENDLY_LABELS[normalizeLabelKey(text)] || text.replace(/_/g, ' ');
}

function getVersionObject(factor: MatchableConversionFactor) {
  return factor.currentActiveVersion ?? factor.version ?? null;
}

export function getFactorVersionLabel(factor?: MatchableConversionFactor | null) {
  if (!factor) return '';
  const version = getVersionObject(factor) as Record<string, unknown> | null;
  return String(
    (factor as Record<string, unknown>).factorVersion ??
      (factor as Record<string, unknown>).versionLabel ??
      version?.factorVersion ??
      version?.versionLabel ??
      version?.version ??
      '',
  ).trim();
}

export function getFactorSourceDocument(factor?: MatchableConversionFactor | null) {
  if (!factor) return '';
  const version = getVersionObject(factor) as Record<string, any> | null;
  return String(
    factor.sourceDocument ??
      factor.sourceReference ??
      version?.sourceDocument ??
      version?.sourceReference ??
      version?.source?.sourceDocument ??
      '',
  ).trim();
}

export function getFactorConfidenceLevel(factor?: MatchableConversionFactor | null) {
  if (!factor) return '';
  const version = getVersionObject(factor) as Record<string, unknown> | null;
  return String(version?.confidenceLevel ?? factor.confidenceLevel ?? '').trim();
}

export function getFactorVerificationStatus(factor?: MatchableConversionFactor | null) {
  if (!factor) return '';
  const version = getVersionObject(factor) as Record<string, unknown> | null;
  return String(version?.verificationStatus ?? factor.verificationStatus ?? '').trim();
}

export function getFactorAssumptions(factor?: MatchableConversionFactor | null) {
  if (!factor) return '';
  const version = getVersionObject(factor) as Record<string, unknown> | null;
  return String(
    factor.assumptions ??
      (version as Record<string, unknown> | null)?.assumptions ??
      factor.methodology ??
      factor.notes ??
      '',
  ).trim();
}

export function isScope3PilotEstimateFactor(
  activityType?: string | null,
  factor?: MatchableConversionFactor | null,
) {
  const normalizedActivityType = normalizeActivityType(activityType ?? factor?.activityType);
  if (!normalizedActivityType || !SCOPE_3_ACTIVITY_TYPES.has(normalizedActivityType)) {
    return false;
  }

  const confidence = normalizeLabelKey(getFactorConfidenceLevel(factor));
  const verification = normalizeLabelKey(getFactorVerificationStatus(factor));

  return Boolean(
    factor?.isPilotEstimate ||
      factor?.consultantReviewRecommended ||
      confidence.includes('LOW') ||
      confidence.includes('PILOT') ||
      confidence.includes('DEMO') ||
      verification.includes('PILOT') ||
      verification.includes('INTERNAL_REVIEW'),
  );
}

export function getFactorCredibilityBadges(
  activityType?: string | null,
  factor?: MatchableConversionFactor | null,
) {
  const badges: string[] = [];
  const verification = formatCredibilityLabel(getFactorVerificationStatus(factor));
  const confidence = formatCredibilityLabel(getFactorConfidenceLevel(factor));

  if (verification) badges.push(verification);
  if (confidence && confidence !== verification) badges.push(`${confidence} Confidence`);
  if (isScope3PilotEstimateFactor(activityType, factor)) {
    badges.push('Consultant Review Recommended');
  }

  return Array.from(new Set(badges));
}

export function getFactorAssumptionDisclosure(
  activityType?: string | null,
  factor?: MatchableConversionFactor | null,
) {
  return getFactorAssumptions(factor) || (isScope3PilotEstimateFactor(activityType, factor)
    ? SCOPE_3_PILOT_ASSUMPTION
    : '');
}

function singularizeFactorDenominator(unit?: string | null) {
  const clean = String(unit ?? '').trim();
  const normalized = clean.toLowerCase();

  if (normalized === 'liters' || normalized === 'litres' || normalized === 'liter' || normalized === 'litre') {
    return 'liter';
  }

  if (normalized === 'nights' || normalized === 'night') {
    return 'night';
  }

  if (
    normalized === 'kilometers' ||
    normalized === 'kilometres' ||
    normalized === 'kilometer' ||
    normalized === 'kilometre'
  ) {
    return 'km';
  }

  if (normalized === 'cubic meters' || normalized === 'cubic metres') {
    return 'm3';
  }

  return clean;
}

export function buildMatchedFactorSnapshot(match?: ConversionFactorMatch | null): FactorSnapshotFields {
  if (!match) return {};
  const factorValue = Number(getFactorValue(match.factor));
  const inputUnit = getFactorInputUnit(match.factor);
  const resultUnit = getFactorResultUnit(match.factor);
  const factorUnit = resultUnit.includes('/')
    ? (() => {
        const [resultNumerator, resultDenominator] = resultUnit.split('/');
        const normalizedDenominator = singularizeFactorDenominator(resultDenominator);
        return normalizedDenominator ? `${resultNumerator}/${normalizedDenominator}` : resultNumerator;
      })()
    : `${resultUnit}/${singularizeFactorDenominator(inputUnit) || 'unit'}`;

  return {
    matchedFactorValue: Number.isFinite(factorValue) ? factorValue : undefined,
    matchedFactorUnit: factorUnit,
    matchedFactorVersion: getFactorVersionLabel(match.factor) || undefined,
    matchedFactorSourceAuthority: getFactorSourceAuthority(match.factor) || undefined,
    matchedFactorSourceDocument: getFactorSourceDocument(match.factor) || undefined,
    matchedFactorVerificationStatus: getFactorVerificationStatus(match.factor) || undefined,
    matchedFactorConfidenceLevel: getFactorConfidenceLevel(match.factor) || undefined,
    matchedFactorAssumptions: getFactorAssumptionDisclosure(match.factor.activityType, match.factor) || undefined,
  };
}

export function getFactorSourceYearLabel(factor?: MatchableConversionFactor | null) {
  return factor ? getFactorSourceYear(factor) : null;
}
