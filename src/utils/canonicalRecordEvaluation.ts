import { normalizeActivityType } from './activityType';
import {
  buildFactorUnitMismatchMessage,
  findBestConversionFactorMatch,
  getCompatibleFactorUnitLabels,
  getFactorSourceYear,
  getFactorValue,
  type ConversionFactorMatch,
  type MatchableConversionFactor,
  type MatchableUnitConversion,
  type UnitConversionMatch,
} from './conversionFactorMatching';
import { buildMatchedFactorSnapshot, type FactorSnapshotFields } from './factorCredibility';
import { inferDefaultScope } from './scopeClassification';
import { normalizeUnitForDisplay } from './unitNormalization';

export type CanonicalRecordStatus = 'READY' | 'TRACKED_ONLY' | 'NEEDS_REVIEW';

export type CanonicalRecordIssueCode =
  | 'MISSING_ACTIVITY_TYPE'
  | 'UNSUPPORTED_ACTIVITY_TYPE'
  | 'MISSING_QUANTITY'
  | 'INVALID_QUANTITY'
  | 'MISSING_UNIT'
  | 'INVALID_UNIT'
  | 'MISSING_PROVINCE'
  | 'UNIT_MISMATCH'
  | 'MISSING_FACTOR'
  | 'CALCULATION_FAILED';

export type CanonicalRecordIssue = {
  code: CanonicalRecordIssueCode;
  field:
    | 'activityType'
    | 'quantity'
    | 'unit'
    | 'jurisdictionRegion'
    | 'factor'
    | 'calculation';
  message: string;
};

export type CanonicalRecordEvaluation = {
  status: CanonicalRecordStatus;
  issues: CanonicalRecordIssue[];
  matchingStatus:
    | 'MATCHED'
    | 'TRACKED_ONLY'
    | 'MISSING_FACTOR'
    | 'MISSING_PROVINCE'
    | 'UNIT_MISMATCH'
    | 'REQUIRES_REVIEW';
  calculationStatus:
    | 'CALCULATED'
    | 'TRACKED_ONLY'
    | 'MISSING_FACTOR'
    | 'MISSING_PROVINCE'
    | 'UNIT_MISMATCH'
    | 'REQUIRES_REVIEW';
  reportTreatment: 'INCLUDED' | 'TRACKED_ONLY' | 'EXCLUDED';
  importEligible: boolean;
  calculationMessage: string;
  activityType: string;
  normalizedUnit: string;
  scope: string;
  matchedFactor?: ConversionFactorMatch;
  matchedFactorId?: string;
  matchedFactorName?: string;
  matchedFactorSourceYear?: number;
  convertedQuantity?: number;
  convertedUnit?: string;
  conversionSnapshot?: UnitConversionMatch;
  calculatedEmissionsKgCO2e: number | null;
  factorSnapshot: FactorSnapshotFields;
};

export type ActivityRecordEvaluationInput = {
  activityType?: string | null;
  quantity?: string | number | null;
  unit?: string | null;
  jurisdictionCountry?: string | null;
  jurisdictionRegion?: string | null;
  recordYear?: number | null;
  organizationId?: string | null;
  allowPlaceholderConfidence?: boolean;
  factors: MatchableConversionFactor[];
  unitConversions?: MatchableUnitConversion[];
};

const TRACKED_ONLY_ACTIVITY_TYPES = new Set(['WATER', 'WATER_USAGE']);

function buildNeedsReviewEvaluation(input: {
  activityType: string;
  normalizedUnit?: string;
  issues: CanonicalRecordIssue[];
  matchingStatus?: CanonicalRecordEvaluation['matchingStatus'];
  calculationStatus?: CanonicalRecordEvaluation['calculationStatus'];
  calculationMessage?: string;
}): CanonicalRecordEvaluation {
  const primaryIssue = input.issues[0];
  const status =
    input.calculationStatus ??
    (primaryIssue?.code === 'MISSING_PROVINCE'
      ? 'MISSING_PROVINCE'
      : primaryIssue?.code === 'UNIT_MISMATCH' || primaryIssue?.code === 'INVALID_UNIT'
      ? 'UNIT_MISMATCH'
      : primaryIssue?.code === 'MISSING_FACTOR'
      ? 'MISSING_FACTOR'
      : 'REQUIRES_REVIEW');

  return {
    status: 'NEEDS_REVIEW',
    issues: input.issues,
    matchingStatus: input.matchingStatus ?? (status === 'CALCULATED' ? 'MATCHED' : status),
    calculationStatus: status,
    reportTreatment: 'EXCLUDED',
    importEligible: false,
    calculationMessage:
      input.calculationMessage ??
      primaryIssue?.message ??
      'This record requires review before it can be imported.',
    activityType: input.activityType,
    normalizedUnit: input.normalizedUnit ?? '',
    scope: inferDefaultScope(input.activityType),
    calculatedEmissionsKgCO2e: null,
    factorSnapshot: {},
  };
}

export function isImportEligible(evaluation: Pick<CanonicalRecordEvaluation, 'status'>) {
  return evaluation.status === 'READY' || evaluation.status === 'TRACKED_ONLY';
}

export function evaluateActivityRecord(
  input: ActivityRecordEvaluationInput,
): CanonicalRecordEvaluation {
  const activityType = normalizeActivityType(input.activityType) ?? '';
  const quantityText = String(input.quantity ?? '').trim();
  const quantity = Number(input.quantity);
  const unit = normalizeUnitForDisplay(input.unit);
  const normalizedUnit = unit.status === 'valid' ? unit.value : '';
  const issues: CanonicalRecordIssue[] = [];

  if (!String(input.activityType ?? '').trim()) {
    issues.push({
      code: 'MISSING_ACTIVITY_TYPE',
      field: 'activityType',
      message: 'Activity type is required before this record can be calculated.',
    });
  } else if (!activityType) {
    issues.push({
      code: 'UNSUPPORTED_ACTIVITY_TYPE',
      field: 'activityType',
      message: 'Unsupported activity type. Review this row before import.',
    });
  }

  if (!quantityText) {
    issues.push({
      code: 'MISSING_QUANTITY',
      field: 'quantity',
      message: 'Quantity is required before this record can be calculated.',
    });
  } else if (!Number.isFinite(quantity) || quantity <= 0) {
    issues.push({
      code: 'INVALID_QUANTITY',
      field: 'quantity',
      message: 'Quantity must be a valid number greater than 0 before this record can be calculated.',
    });
  }

  if (unit.status === 'missing') {
    issues.push({
      code: 'MISSING_UNIT',
      field: 'unit',
      message: 'Unit is required before this record can be calculated.',
    });
  } else if (unit.status === 'invalid') {
    issues.push({
      code: 'INVALID_UNIT',
      field: 'unit',
      message: 'Invalid unit detected. Please review this record.',
    });
  }

  if (issues.length > 0) {
    return buildNeedsReviewEvaluation({ activityType, normalizedUnit, issues });
  }

  if (activityType === 'ELECTRICITY' && !String(input.jurisdictionRegion ?? '').trim()) {
    return buildNeedsReviewEvaluation({
      activityType,
      normalizedUnit,
      issues: [
        {
          code: 'MISSING_PROVINCE',
          field: 'jurisdictionRegion',
          message: 'Electricity records require province before factor matching.',
        },
      ],
      matchingStatus: 'MISSING_PROVINCE',
      calculationStatus: 'MISSING_PROVINCE',
    });
  }

  if (TRACKED_ONLY_ACTIVITY_TYPES.has(activityType)) {
    return {
      status: 'TRACKED_ONLY',
      issues: [],
      matchingStatus: 'TRACKED_ONLY',
      calculationStatus: 'TRACKED_ONLY',
      reportTreatment: 'TRACKED_ONLY',
      importEligible: true,
      calculationMessage:
        'Water usage is a tracked metric and excluded from GHG emissions totals.',
      activityType,
      normalizedUnit,
      scope: 'TRACKED_METRIC',
      calculatedEmissionsKgCO2e: null,
      factorSnapshot: {},
    };
  }

  const match = findBestConversionFactorMatch({
    activityType,
    inputUnit: normalizedUnit,
    jurisdictionCountry: input.jurisdictionCountry,
    jurisdictionRegion: input.jurisdictionRegion,
    recordYear: input.recordYear,
    quantity,
    organizationId: input.organizationId,
    allowPlaceholderConfidence: input.allowPlaceholderConfidence,
    factors: input.factors,
    unitConversions: input.unitConversions,
  });

  if (!match) {
    const compatibleUnits = getCompatibleFactorUnitLabels({
      activityType,
      inputUnit: normalizedUnit,
      jurisdictionCountry: input.jurisdictionCountry,
      jurisdictionRegion: input.jurisdictionRegion,
      recordYear: input.recordYear,
      organizationId: input.organizationId,
      allowPlaceholderConfidence: input.allowPlaceholderConfidence,
      factors: input.factors,
    }).filter((compatibleUnit) => compatibleUnit.toLowerCase() !== normalizedUnit.toLowerCase());

    if (compatibleUnits.length > 0) {
      return buildNeedsReviewEvaluation({
        activityType,
        normalizedUnit,
        issues: [
          {
            code: 'UNIT_MISMATCH',
            field: 'unit',
            message: buildFactorUnitMismatchMessage({
              activityType,
              inputUnit: normalizedUnit,
              availableUnits: compatibleUnits,
            }),
          },
        ],
        matchingStatus: 'UNIT_MISMATCH',
        calculationStatus: 'UNIT_MISMATCH',
      });
    }

    return buildNeedsReviewEvaluation({
      activityType,
      normalizedUnit,
      issues: [
        {
          code: 'MISSING_FACTOR',
          field: 'factor',
          message: 'No matching emission factor is available for this record.',
        },
      ],
      matchingStatus: 'MISSING_FACTOR',
      calculationStatus: 'MISSING_FACTOR',
    });
  }

  const factorValue = Number(getFactorValue(match.factor));
  const calculationQuantity = match.conversion?.convertedQuantity ?? quantity;
  const calculatedEmissionsKgCO2e = calculationQuantity * factorValue;

  if (!Number.isFinite(factorValue) || !Number.isFinite(calculationQuantity) || !Number.isFinite(calculatedEmissionsKgCO2e)) {
    return buildNeedsReviewEvaluation({
      activityType,
      normalizedUnit,
      issues: [
        {
          code: 'CALCULATION_FAILED',
          field: 'calculation',
          message: 'Calculation failed. Review the selected factor and quantity.',
        },
      ],
      matchingStatus: 'MISSING_FACTOR',
      calculationStatus: 'MISSING_FACTOR',
    });
  }

  const factorYear = getFactorSourceYear(match.factor) ?? match.factorYear ?? undefined;

  return {
    status: 'READY',
    issues: [],
    matchingStatus: 'MATCHED',
    calculationStatus: 'CALCULATED',
    reportTreatment: 'INCLUDED',
    importEligible: true,
    calculationMessage: match.usedProxyFactor && match.proxyReason
      ? `Proxy factor · Review recommended. ${match.proxyReason}`
      : match.usedPriorYearFallback && factorYear
      ? `Matched factor. Using latest available factor year: ${factorYear}.`
      : 'Matched factor. This record is included in emissions totals.',
    activityType,
    normalizedUnit,
    scope: inferDefaultScope(activityType),
    matchedFactor: match,
    matchedFactorId: match.factor.id,
    matchedFactorName: match.factor.name,
    matchedFactorSourceYear: factorYear ?? undefined,
    convertedQuantity: match.conversion?.convertedQuantity,
    convertedUnit: match.conversion?.toUnit,
    conversionSnapshot: match.conversion,
    calculatedEmissionsKgCO2e,
    factorSnapshot: buildMatchedFactorSnapshot(match),
  };
}
