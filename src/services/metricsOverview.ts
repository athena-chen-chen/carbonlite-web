import {
  type ActivityDataItem,
  getAllActivityData,
} from './activityData';
import {
  getAllConversionFactors,
  type ConversionFactorItem,
} from './conversionFactors';
import {
  getCalculationSummary,
  type CalculationAuditDetail,
  type MetricsSummaryResponse,
} from './metrics';
import { getCurrentUser, getOrganizationId } from './auth';
import {
  type ActivityUsageTotals,
  aggregateActivityUsage,
} from '../utils/activityAggregation';
import {
  findBestConversionFactorMatch,
  getFactorInputUnit,
  getFactorResultUnit,
  getFactorSourceAuthority,
  getFactorValue,
  type MatchableConversionFactor,
} from '../utils/conversionFactorMatching';
import { normalizeUnitForDisplay } from '../utils/unitNormalization';
import { normalizeActivityType } from '../utils/activityType';
import { formatDateOnly, getDateOnlyYear } from '../utils/dateOnly';
import {
  getFactorAssumptionDisclosure,
  getFactorConfidenceLevel,
  getFactorSourceDocument,
  getFactorVerificationStatus,
  getFactorVersionLabel,
} from '../utils/factorCredibility';

export const EMPTY_ACTIVITY_USAGE_TOTALS: ActivityUsageTotals = {
  fuel: 0,
  electricity: 0,
  fuelUnitLabel: 'Grouped by type and unit',
  electricityUnitLabel: 'kWh',
  fuelUsageBreakdown: [],
  invalidFuelRecordCount: 0,
  invalidElectricityRecordCount: 0,
};

export type MetricsDateRange = {
  startDate: string;
  endDate: string;
  hasActivityRecords: boolean;
};

export type MetricsOverview = {
  activities: ActivityDataItem[];
  summary: MetricsSummaryResponse;
  usageTotals: ActivityUsageTotals;
  carbonMetric?: MetricsSummaryResponse['totalsByMetric'][number];
  totalEstimatedEmissionsKgCO2e: number;
  totalRecordsFound: number;
  recordsIncluded: number;
  processedRecords: number;
  skippedRecords: number;
  skippedReasons: {
    missingFactor: number;
    outsideDateRange: number;
    outsideScope: number;
    invalidData: number;
  };
  missingFactorRecords: number;
  matchedFactorsCount: number;
  missingFactors: Array<{
    activityDataId: string;
    activityType: string;
    unit: string;
    availableUnitsForActivityType?: string[];
  }>;
  matchedActivityEmissions: Array<{
    activityDataId: string;
    activityType: string;
    quantity: string | number;
    unit: string;
    normalizedUnit?: string | null;
    estimatedEmissionsKgCO2e: number;
    sourceType: string;
    sourceReference?: string | null;
    sourceDocumentId?: string | null;
    sourceFileName?: string | null;
    sourcePage?: string | number | null;
    sourceRow?: string | number | null;
    sourceTextSnippet?: string | null;
    notes?: string | null;
    factorId?: string | null;
    factorVersionId?: string | null;
    calculationFormula?: string | null;
    matchingMethod?: string | null;
    matchingMessage?: string | null;
  }>;
  conversionFactorsUsed: Array<{
    factorId?: string | null;
    factorVersionId?: string | null;
    activityType?: string | null;
    factorName: string;
    factorValue: string | number;
    inputUnit: string;
    resultUnit: string;
    jurisdiction?: string | null;
    factorYear?: number | null;
    factorStatus?: string | null;
    factorVersion?: string | null;
    confidenceLevel?: string | null;
    verificationStatus?: string | null;
    assumptions?: string | null;
    sourceAuthority: string;
    sourceDocument?: string | null;
    sourceUrl?: string | null;
    sourcePage?: string | number | null;
    sourceTable?: string | null;
    sourceYear?: number | null;
    reportingYear?: number | null;
    factorType: 'System' | 'Custom';
    verified: boolean;
    usedRecordsCount?: number;
    matchingMethod?: string | null;
    matchingMessage?: string | null;
  }>;
  calculationDetails: CalculationAuditDetail[];
  invalidRecordCount: number;
  dataQualityCoverage: number;
  totalRecords: number;
  recordsInScope: number;
};

type SupplementalCalculation = {
  activityId: string;
  activityType: string;
  quantity: number;
  unit: string;
  emissions: number;
  factor: MatchableConversionFactor;
};

type MatchedActivityEmission = NonNullable<
  MetricsSummaryResponse['matchedActivityEmissions']
>[number];
type UsedConversionFactor = NonNullable<
  MetricsSummaryResponse['conversionFactorsUsed']
>[number];
type CalculationExplanationRecord = NonNullable<MetricsSummaryResponse['records']>[number];

const VISIBLE_FACTOR_LIBRARY_MATCH_MESSAGE = 'Matched to CarbonLite System Factor.';

function firstFiniteNumber(...values: unknown[]) {
  for (const value of values) {
    const numberValue = Number(value);
    if (Number.isFinite(numberValue)) return numberValue;
  }

  return 0;
}

export async function loadMetricsOverview(options?: {
  recalculate?: boolean;
  dateFrom?: string;
  dateTo?: string;
  selectedRecordIds?: string[];
  selectedActivityRecordIds?: string[];
  selectedDocumentIds?: string[];
}): Promise<MetricsOverview> {
  const selectedRecordIds =
    options?.selectedActivityRecordIds ?? options?.selectedRecordIds ?? [];
  const selectedDocumentIds = options?.selectedDocumentIds ?? [];
  const summary = await getCalculationSummary({
    periodStart:
      selectedRecordIds.length || selectedDocumentIds.length
        ? undefined
        : options?.dateFrom,
    periodEnd:
      selectedRecordIds.length || selectedDocumentIds.length
        ? undefined
        : options?.dateTo,
    selectedActivityRecordIds: selectedRecordIds,
    selectedDocumentIds,
  });
  const activities = (summary.activities ?? []) as ActivityDataItem[];
  const normalizedApiDetails = normalizeApiCalculationDetails(summary.calculationDetails ?? []);
  const recordCalculationDetails = mergeCalculationRecordsIntoDetails(
    normalizedApiDetails,
    summary.records ?? [],
    activities,
  );
  const apiCalculationDetails = mergeMatchedEmissionsIntoCalculationDetails(
    recordCalculationDetails,
    summary.matchedActivityEmissions ?? [],
    activities,
    summary.conversionFactorsUsed ?? [],
  );
  const calculationSummaryForMatching = {
    ...summary,
    calculationDetails: apiCalculationDetails,
  };
  const calculatedDetailCount = apiCalculationDetails.filter(
    (detail) => detail.status === 'CALCULATED',
  ).length;
  const processedRecords = firstFiniteNumber(
    summary.recordsCalculated,
    summary.processedRecords,
    summary.recordsIncluded,
    summary.matchedActivityEmissions?.length,
    calculatedDetailCount,
  );
  const recordsInScope = firstFiniteNumber(
    summary.recordsInScope,
    activities.length,
    summary.calculationDetails?.length,
    processedRecords,
  );
  const totalRecordsFound = firstFiniteNumber(
    summary.totalRecordsFound,
    recordsInScope + firstFiniteNumber(summary.skippedRecords),
    activities.length,
  );
  const missingFactorRecords = firstFiniteNumber(
    summary.missingFactorCount,
    summary.missingFactorRecords,
    summary.skippedReasons?.missingFactor,
  );
  const skippedRecords = firstFiniteNumber(
    summary.skippedRecords,
    Math.max(0, recordsInScope - processedRecords),
  );
  const skippedReasons = {
    missingFactor: summary.skippedReasons?.missingFactor ?? 0,
    outsideDateRange: summary.skippedReasons?.outsideDateRange ?? 0,
    outsideScope: summary.skippedReasons?.outsideScope ?? 0,
    invalidData: summary.skippedReasons?.invalidData ?? 0,
  };
  const totalsByMetric = summary?.totalsByMetric ?? [];
  const carbonMetric = totalsByMetric.find((metric) =>
    String(metric.metricType).includes('CARBON'),
  );
  const supplementalCalculations = await buildSupplementalCalculations({
    activities,
    summary: calculationSummaryForMatching,
    processedRecords,
  });
  const supplementalActivityIds = new Set(
    supplementalCalculations.map((item) => item.activityId),
  );
  const supplementalEmissions = supplementalCalculations.reduce(
    (total, item) => total + item.emissions,
    0,
  );
  const mergedProcessedRecords = processedRecords + supplementalCalculations.length;
  const mergedMissingFactors = (summary.missingFactors ?? []).filter(
    (item) => !item.activityDataId || !supplementalActivityIds.has(item.activityDataId),
  );
  const mergedSkippedRecords = Math.max(0, skippedRecords - supplementalCalculations.length);
  const mergedMissingFactorRecords = Math.max(
    0,
    missingFactorRecords - supplementalCalculations.length,
  );
  const mergedSkippedReasons = {
    ...skippedReasons,
    missingFactor: Math.max(
      0,
      skippedReasons.missingFactor - supplementalCalculations.length,
    ),
  };
  const mergedCalculationDetails = mergeSupplementalCalculationDetails(
    apiCalculationDetails,
    supplementalCalculations,
    activities,
  );
  const mergedCalculationIssues = mergeCalculationDetailsIntoIssueItems(
    mergedMissingFactors,
    mergedCalculationDetails,
  );
  const mergedMatchedActivityEmissions = [
    ...(summary.matchedActivityEmissions ?? []),
    ...supplementalCalculations.map((item) =>
      buildSupplementalMatchedEmission(item, activities),
    ),
  ];
  const mergedConversionFactorsUsed = mergeConversionFactorsUsed(
    summary.conversionFactorsUsed ?? [],
    supplementalCalculations,
  );

  return {
    activities,
    summary,
    usageTotals: aggregateActivityUsage(activities),
    carbonMetric,
    totalEstimatedEmissionsKgCO2e:
      (summary.totalEstimatedEmissionsKgCO2e ?? 0) + supplementalEmissions,
    matchedFactorsCount: mergedProcessedRecords,
    missingFactors: mergedCalculationIssues,
    matchedActivityEmissions: mergedMatchedActivityEmissions,
    conversionFactorsUsed: mergedConversionFactorsUsed,
    calculationDetails: mergedCalculationDetails,
    invalidRecordCount: summary.invalidRecordCount ?? 0,
    dataQualityCoverage:
      totalRecordsFound > 0
        ? Math.round((mergedProcessedRecords / totalRecordsFound) * 1000) / 10
        : summary.dataQualityCoverage ?? 0,
    totalRecordsFound,
    recordsIncluded: mergedProcessedRecords,
    processedRecords: mergedProcessedRecords,
    skippedRecords: mergedSkippedRecords,
    skippedReasons: mergedSkippedReasons,
    missingFactorRecords: mergedMissingFactorRecords,
    totalRecords: recordsInScope,
    recordsInScope,
  };
}

function mergeCalculationDetailsIntoIssueItems(
  missingFactors: MetricsSummaryResponse['missingFactors'] = [],
  calculationDetails: CalculationAuditDetail[] = [],
) {
  const existingIds = new Set(
    missingFactors.map((item) => item.activityDataId).filter(Boolean),
  );
  const issueItems = [...missingFactors];

  calculationDetails.forEach((detail) => {
    if (detail.status === 'CALCULATED' || detail.status === 'OUTSIDE_SCOPE') return;
    if (existingIds.has(detail.activityDataId)) return;

    issueItems.push({
      activityDataId: detail.activityDataId,
      activityType: detail.activityType,
      unit: getIssueUnitLabel(detail),
      availableUnitsForActivityType: detail.availableUnitsForActivityType ?? [],
    });
  });

  return issueItems;
}

function getIssueUnitLabel(detail: CalculationAuditDetail) {
  if (detail.status === 'INVALID_UNIT') return 'Invalid unit';
  if (detail.status === 'MISSING_DATA' && !detail.activityUnit) return 'Missing unit';
  return detail.normalizedUnit || detail.activityUnit || 'Missing unit';
}

function normalizeApiCalculationDetails(
  calculationDetails: CalculationAuditDetail[],
): CalculationAuditDetail[] {
  return calculationDetails.map((detail) => {
    const activityType = normalizeActivityType(detail.activityType) ?? detail.activityType;
    const calculatedEmissionsKgCO2e = firstFiniteNullable(
      detail.calculatedEmissionsKgCO2e,
      detail.calculatedEmission,
    );
    const status = normalizeCalculationDetailStatus(detail, calculatedEmissionsKgCO2e);

    return {
      ...detail,
      activityType,
      status,
      scopeOverride: detail.scopeOverride ?? detail.scopeClassification ?? null,
      calculatedEmissionsKgCO2e,
      calculatedEmission: firstFiniteNullable(detail.calculatedEmission, calculatedEmissionsKgCO2e),
    };
  });
}

function firstFiniteNullable(...values: unknown[]) {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const numberValue = Number(value);
    if (Number.isFinite(numberValue)) return numberValue;
  }

  return null;
}

function normalizeCalculationDetailStatus(
  detail: CalculationAuditDetail,
  calculatedEmissionsKgCO2e: number | null,
): CalculationAuditDetail['status'] {
  const currentStatus = String(detail.status ?? '').trim().toUpperCase();
  const fallbackStatus = String(
    detail.calculationStatus ?? detail.explanationStatus ?? detail.matchingStatus ?? '',
  )
    .trim()
    .toUpperCase();

  const status = currentStatus || fallbackStatus;

  if (status === 'CALCULATED' || (status === 'MATCHED' && calculatedEmissionsKgCO2e !== null)) {
    return 'CALCULATED';
  }
  if (['MISSING_FACTOR', 'NO_FACTOR'].includes(status)) return 'MISSING_FACTOR';
  if (['INVALID_QUANTITY', 'INVALID_AMOUNT'].includes(status)) return 'INVALID_QUANTITY';
  if (['INVALID_UNIT', 'UNIT_MISMATCH'].includes(status)) return 'INVALID_UNIT';
  if (['MISSING_JURISDICTION', 'MISSING_PROVINCE', 'MISSING_REGION'].includes(status)) {
    return 'MISSING_JURISDICTION';
  }
  if (['TRACKED_ONLY', 'TRACKED_METRIC'].includes(status)) return 'TRACKED_ONLY';
  if (status === 'OUTSIDE_SCOPE') return 'OUTSIDE_SCOPE';
  if (calculatedEmissionsKgCO2e !== null) return 'CALCULATED';

  return 'MISSING_DATA';
}

function mergeCalculationRecordsIntoDetails(
  existingDetails: CalculationAuditDetail[],
  records: CalculationExplanationRecord[],
  activities: ActivityDataItem[],
) {
  if (records.length === 0) return existingDetails;

  const merged = [...existingDetails];
  const existingById = new Map(existingDetails.map((detail) => [detail.activityDataId, detail]));
  const activityById = new Map(activities.map((activity) => [activity.id, activity]));

  records.forEach((record) => {
    const activityDataId = String(record.activityRecordId ?? '').trim();
    if (!activityDataId) return;

    const existingDetail = existingById.get(activityDataId);
    if (isCompleteCalculatedDetail(existingDetail)) return;

    const emissions = firstFiniteNullable(record.calculatedEmissions);
    const status = normalizeRecordCalculationStatus(record, emissions);
    if (status !== 'CALCULATED' && existingDetail) return;

    const activity = activityById.get(activityDataId);
    const activityType =
      normalizeActivityType(record.activityType ?? activity?.activityType) ??
      String(record.activityType ?? activity?.activityType ?? '');
    const quantity = firstFiniteNumber(record.normalizedQuantity, record.quantity, activity?.quantity);
    const unit = String(record.normalizedUnit ?? record.unit ?? activity?.unit ?? '');
    const recordDate = record.recordDate ?? activity?.recordDate ?? '';
    const parsedRecordYear = Number(String(recordDate).slice(0, 4));
    const recordYear = record.recordYear ?? (Number.isFinite(parsedRecordYear) ? parsedRecordYear : null);

    const detail: CalculationAuditDetail = {
      ...existingDetail,
      activityDataId,
      activityType,
      recordDate,
      dateEstimated: Boolean(activity?.dateEstimated),
      reportingYear: recordYear ?? new Date().getFullYear(),
      recordYear,
      jurisdiction: record.jurisdiction ?? formatJurisdiction(activity),
      jurisdictionCountry: record.jurisdictionCountry ?? activity?.jurisdictionCountry ?? null,
      jurisdictionRegion: record.jurisdictionRegion ?? activity?.jurisdictionRegion ?? null,
      jurisdictionSource: record.jurisdictionSource ?? null,
      jurisdictionAssumed: record.jurisdictionAssumed ?? null,
      facilityName: record.facilityName ?? null,
      activityQuantity: quantity,
      activityUnit: unit,
      quantityUnit: String(record.unit ?? activity?.unit ?? unit),
      normalizedUnit: unit,
      factorId: record.factor?.factorId ?? null,
      factorVersionId: record.factor?.factorVersionId ?? null,
      factorVersion: activity?.matchedFactorVersion ?? record.factor?.factorVersion ?? null,
      factorName: record.factor?.activityType ?? null,
      factorValue: firstFiniteNumber(activity?.matchedFactorValue, record.factor?.factorValue) ?? null,
      factorInputUnit: record.factor?.inputUnit ?? null,
      factorResultUnit: activity?.matchedFactorUnit ?? record.factor?.resultUnit ?? record.resultUnit ?? null,
      factorYear: record.factor?.factorYear ?? record.factor?.sourceYear ?? activity?.matchedFactorSourceYear ?? null,
      factorJurisdictionRegion: record.factor?.jurisdiction ?? null,
      factorSource: activity?.matchedFactorSourceAuthority ?? record.factor?.sourceAuthority ?? 'Source not specified',
      sourceAuthority: activity?.matchedFactorSourceAuthority ?? record.factor?.sourceAuthority ?? null,
      sourceDocument: activity?.matchedFactorSourceDocument ?? record.factor?.sourceDocument ?? null,
      sourceUrl: record.factor?.sourceUrl ?? null,
      sourceYear: activity?.matchedFactorSourceYear ?? record.factor?.sourceYear ?? null,
      factorAssumptions: activity?.matchedFactorAssumptions ?? record.factor?.assumptions ?? null,
      factorVerified: Boolean(record.factor?.verified ?? record.factor?.isOfficial),
      factorConfidenceLevel: activity?.matchedFactorConfidenceLevel ?? record.factor?.confidenceLevel ?? null,
      factorVerificationStatus: activity?.matchedFactorVerificationStatus ?? record.factor?.verificationStatus ?? null,
      factorType: record.factor?.isSystem || record.factor?.isOfficial ? 'System' : null,
      calculatedEmission: emissions,
      calculatedEmissionsKgCO2e: emissions,
      calculationStatus: record.calculationStatus,
      matchingStatus: record.matching?.matched ? 'MATCHED' : null,
      matchedBy: record.matching?.matchedBy ?? null,
      matchingMethod: record.matching?.matchedBy ?? null,
      matchingMessage: record.matching?.message ?? null,
      status,
      reason: record.warning ?? null,
      sourceType: activity?.sourceType ?? 'UNKNOWN',
      sourceReference: activity?.sourceReference ?? null,
      sourceFileName: activity?.sourceFileName ?? null,
      sourcePage: activity?.sourcePage ?? null,
      sourceRow: activity?.sourceRow ?? null,
      sourceTextSnippet: activity?.sourceTextSnippet ?? null,
      sourceDocumentId: activity?.sourceDocumentId ?? null,
      notes: activity?.notes ?? null,
    };

    if (existingDetail) {
      const index = merged.findIndex((item) => item.activityDataId === activityDataId);
      merged[index] = detail;
    } else {
      merged.push(detail);
    }
    existingById.set(activityDataId, detail);
  });

  return merged;
}

function normalizeRecordCalculationStatus(
  record: CalculationExplanationRecord,
  emissions: number | null,
): CalculationAuditDetail['status'] {
  return normalizeCalculationDetailStatus(
    {
      status: record.calculationStatus as CalculationAuditDetail['status'],
      calculationStatus: record.calculationStatus,
      matchingStatus: record.matching?.matchedBy,
    } as CalculationAuditDetail,
    emissions,
  );
}

function mergeMatchedEmissionsIntoCalculationDetails(
  existingDetails: CalculationAuditDetail[],
  matchedEmissions: MatchedActivityEmission[],
  activities: ActivityDataItem[],
  conversionFactorsUsed: UsedConversionFactor[],
) {
  if (matchedEmissions.length === 0) return existingDetails;

  const existingById = new Map(existingDetails.map((detail) => [detail.activityDataId, detail]));
  const activityById = new Map(activities.map((activity) => [activity.id, activity]));
  const factorById = new Map(
    conversionFactorsUsed
      .filter((factor) => factor.factorId)
      .map((factor) => [String(factor.factorId), factor]),
  );
  const merged = [...existingDetails];

  matchedEmissions.forEach((emission) => {
    const activityDataId = String(emission.activityDataId ?? '').trim();
    if (!activityDataId) return;
    const existingDetail = existingById.get(activityDataId);
    if (isCompleteCalculatedDetail(existingDetail)) return;

    const emissions = Number(emission.estimatedEmissionsKgCO2e);
    if (!Number.isFinite(emissions)) return;

    const activity = activityById.get(activityDataId);
    const factor = emission.factorId ? factorById.get(String(emission.factorId)) : undefined;
    const activityType =
      normalizeActivityType(emission.activityType ?? activity?.activityType) ??
      String(emission.activityType ?? activity?.activityType ?? '');
    const quantity = firstFiniteNumber(emission.quantity, activity?.quantity);
    const unit = String(emission.unit ?? activity?.unit ?? '');
    const recordDate = activity?.recordDate ?? '';
    const recordYear = Number(recordDate.slice(0, 4)) || null;
    const factorValue = Number(factor?.factorValue);

    const synthesizedDetail: CalculationAuditDetail = {
      ...existingDetail,
      activityDataId,
      activityType,
      recordDate,
      dateEstimated: Boolean(activity?.dateEstimated),
      reportingYear: recordYear ?? new Date().getFullYear(),
      recordYear,
      jurisdiction: formatJurisdiction(activity),
      jurisdictionCountry: activity?.jurisdictionCountry ?? null,
      jurisdictionRegion: activity?.jurisdictionRegion ?? null,
      activityQuantity: quantity,
      activityUnit: unit,
      quantityUnit: unit,
      normalizedUnit: unit,
      factorId: emission.factorId ?? null,
      factorVersionId: emission.factorVersionId ?? factor?.factorVersionId ?? null,
      factorVersion: factor?.factorVersion ?? null,
      factorName: factor?.factorName ?? null,
      factorValue: Number.isFinite(factorValue) ? factorValue : null,
      factorInputUnit: factor?.inputUnit ?? null,
      factorResultUnit: factor?.resultUnit ?? null,
      factorYear: factor?.sourceYear ?? factor?.reportingYear ?? null,
      factorStatus: factor?.factorStatus ?? null,
      factorPriority: factor?.priority ?? null,
      factorSource: factor?.sourceAuthority ?? 'Source not specified',
      sourceAuthority: factor?.sourceAuthority ?? null,
      sourceDocument: factor?.sourceDocument ?? null,
      sourceUrl: factor?.sourceUrl ?? null,
      sourceYear: factor?.sourceYear ?? null,
      factorAssumptions: factor?.assumptions ?? null,
      factorVerified: Boolean(factor?.verified),
      factorConfidenceLevel: factor?.confidenceLevel ?? null,
      factorVerificationStatus: factor?.verificationStatus ?? null,
      factorType: factor?.factorType ?? null,
      calculatedEmission: emissions,
      calculatedEmissionsKgCO2e: emissions,
      calculationStatus: 'CALCULATED',
      matchingStatus: 'MATCHED',
      matchedBy: 'matched activity emissions',
      matchingMethod: 'matched activity emissions',
      matchingMessage:
        'Calculated from matched activity emissions returned by the metrics summary API.',
      status: 'CALCULATED',
      sourceType: emission.sourceType ?? activity?.sourceType ?? 'UNKNOWN',
      sourceReference: emission.sourceReference ?? activity?.sourceReference ?? null,
      sourceFileName: emission.sourceFileName ?? activity?.sourceFileName ?? null,
      sourcePage: emission.sourcePage ?? activity?.sourcePage ?? null,
      sourceRow: emission.sourceRow ?? activity?.sourceRow ?? null,
      sourceTextSnippet: emission.sourceTextSnippet ?? activity?.sourceTextSnippet ?? null,
      sourceDocumentId: emission.sourceDocumentId ?? activity?.sourceDocumentId ?? null,
      notes: emission.notes ?? activity?.notes ?? null,
    };

    if (existingDetail) {
      const index = merged.findIndex((detail) => detail.activityDataId === activityDataId);
      merged[index] = synthesizedDetail;
    } else {
      merged.push(synthesizedDetail);
    }
    existingById.set(activityDataId, synthesizedDetail);
  });

  return merged;
}

function formatJurisdiction(activity?: ActivityDataItem) {
  return [activity?.jurisdictionRegion, activity?.jurisdictionCountry]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(', ');
}

function isCompleteCalculatedDetail(detail?: CalculationAuditDetail) {
  return (
    detail?.status === 'CALCULATED' &&
    firstFiniteNullable(detail.calculatedEmissionsKgCO2e, detail.calculatedEmission) !== null
  );
}

async function buildSupplementalCalculations(input: {
  activities: ActivityDataItem[];
  summary: MetricsSummaryResponse;
  processedRecords: number;
}): Promise<SupplementalCalculation[]> {
  const { activities, summary, processedRecords } = input;

  if (activities.length === 0) return [];
  if (processedRecords > 0 && (summary.missingFactors?.length ?? 0) === 0) return [];

  let factors: ConversionFactorItem[];

  try {
    factors = await getAllConversionFactors({ type: 'EMISSION' });
  } catch {
    return [];
  }

  const existingCalculatedIds = new Set(
    (summary.calculationDetails ?? [])
      .filter((detail) => detail.status === 'CALCULATED')
      .map((detail) => detail.activityDataId),
  );
  const organizationId = getOrganizationId(getCurrentUser());

  return activities.flatMap((activity) => {
    if (existingCalculatedIds.has(activity.id)) return [];

    const activityType = normalizeActivityType(activity.activityType);
    if (!activityType || isTrackedOnlyActivity(activityType)) return [];

    const normalizedUnit = normalizeUnitForDisplay(activity.unit);
    if (normalizedUnit.status !== 'valid') return [];

    const quantity = Number(activity.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) return [];

    const match = findBestConversionFactorMatch({
      activityType,
      inputUnit: normalizedUnit.value,
      jurisdictionCountry: activity.jurisdictionCountry,
      jurisdictionRegion: activity.jurisdictionRegion,
      recordYear: getDateOnlyYear(activity.recordDate),
      organizationId,
      factors: factors as MatchableConversionFactor[],
    });

    if (!match) return [];

    const factorValue = Number(getFactorValue(match.factor));
    if (!Number.isFinite(factorValue)) return [];

    return [
      {
        activityId: activity.id,
        activityType,
        quantity,
        unit: normalizedUnit.value,
        emissions: quantity * factorValue,
        factor: match.factor,
      },
    ];
  });
}

function isTrackedOnlyActivity(activityType: string) {
  return ['WATER'].includes(activityType);
}

function getFactorDefaultScope(factor: MatchableConversionFactor) {
  return factor.currentActiveVersion?.defaultScope ?? factor.version?.defaultScope ?? factor.defaultScope ?? null;
}

function getFactorScope(factor: MatchableConversionFactor) {
  return factor.currentActiveVersion?.scope ?? factor.version?.scope ?? factor.scope ?? null;
}

function mergeSupplementalCalculationDetails(
  existingDetails: CalculationAuditDetail[],
  supplementalCalculations: SupplementalCalculation[],
  activities: ActivityDataItem[],
) {
  if (supplementalCalculations.length === 0) return existingDetails;

  const replacements = new Map(
    supplementalCalculations.map((item) => [
      item.activityId,
      buildSupplementalCalculationDetail(item, activities),
    ]),
  );
  const merged = existingDetails.map((detail) =>
    replacements.get(detail.activityDataId) ?? detail,
  );
  const existingIds = new Set(existingDetails.map((detail) => detail.activityDataId));

  supplementalCalculations.forEach((item) => {
    if (!existingIds.has(item.activityId)) {
      merged.push(buildSupplementalCalculationDetail(item, activities));
    }
  });

  return merged;
}

function buildSupplementalCalculationDetail(
  item: SupplementalCalculation,
  activities: ActivityDataItem[],
): CalculationAuditDetail {
  const activity = activities.find((candidate) => candidate.id === item.activityId);
  const factorValue = Number(getFactorValue(item.factor));
  const factorInputUnit = getFactorInputUnit(item.factor);
  const factorResultUnit = getFactorResultUnit(item.factor);
  const sourceAuthority = getFactorSourceAuthority(item.factor);
  const recordDate = activity?.recordDate ?? '';
  const recordYear = Number(recordDate.slice(0, 4)) || new Date().getFullYear();

  return {
    activityDataId: item.activityId,
    activityType: item.activityType,
    recordDate,
    dateEstimated: false,
    reportingYear: recordYear,
    recordYear,
    jurisdiction: item.factor.jurisdiction ?? '',
    activityQuantity: item.quantity,
    activityUnit: item.unit,
    quantityUnit: item.unit,
    normalizedUnit: item.unit,
    factorId: item.factor.id,
    factorVersionId: item.factor.currentActiveVersion?.id ?? item.factor.version?.id ?? null,
    factorVersion: getFactorVersionLabel(item.factor) || null,
    factorName: item.factor.name,
    factorDisplayName: item.factor.displayName ?? item.factor.name,
    factorValue,
    factorInputUnit,
    factorResultUnit,
    factorYear: item.factor.sourceYear ?? null,
    factorStatus: item.factor.status ?? null,
    factorSource: sourceAuthority || 'Source not specified',
    sourceAuthority,
    sourceDocument: getFactorSourceDocument(item.factor) || null,
    sourceYear: item.factor.sourceYear ?? null,
    factorAssumptions: getFactorAssumptionDisclosure(item.activityType, item.factor) || null,
    factorVerified: Boolean(item.factor.verified),
    factorConfidenceLevel: getFactorConfidenceLevel(item.factor) || null,
    factorVerificationStatus: getFactorVerificationStatus(item.factor) || null,
    factorType: item.factor.organizationId ? 'Custom' : 'System',
    factorDefaultScope: getFactorDefaultScope(item.factor),
    factorScope: getFactorScope(item.factor),
    calculatedEmission: item.emissions,
    calculatedEmissionsKgCO2e: item.emissions,
    calculationFormula: `${item.quantity} × ${factorValue} = ${item.emissions}`,
    calculationStatus: 'CALCULATED',
    matchingStatus: 'MATCHED',
    matchedBy: 'frontend factor-library compatibility match',
    matchingMethod: 'MATCHED',
    matchingMessage: VISIBLE_FACTOR_LIBRARY_MATCH_MESSAGE,
    status: 'CALCULATED',
    sourceType: activity?.sourceType ?? 'MANUAL',
    sourceReference: activity?.sourceReference ?? null,
    sourceFileName: activity?.sourceFileName ?? null,
    sourcePage: activity?.sourcePage ?? null,
    sourceRow: activity?.sourceRow ?? null,
    sourceTextSnippet: activity?.sourceTextSnippet ?? null,
    sourceDocumentId: activity?.sourceDocumentId ?? null,
    notes: activity?.notes ?? null,
  };
}

function buildSupplementalMatchedEmission(
  item: SupplementalCalculation,
  activities: ActivityDataItem[],
) {
  const activity = activities.find((candidate) => candidate.id === item.activityId);

  return {
    activityDataId: item.activityId,
    activityType: item.activityType,
    quantity: item.quantity,
    unit: item.unit,
    normalizedUnit: item.unit,
    estimatedEmissionsKgCO2e: item.emissions,
    sourceType: activity?.sourceType ?? 'MANUAL',
    sourceReference: activity?.sourceReference ?? null,
    sourceDocumentId: activity?.sourceDocumentId ?? null,
    sourceFileName: activity?.sourceFileName ?? null,
    sourcePage: activity?.sourcePage ?? null,
    sourceRow: activity?.sourceRow ?? null,
    sourceTextSnippet: activity?.sourceTextSnippet ?? null,
    notes: activity?.notes ?? null,
    factorId: item.factor.id,
    factorVersionId: item.factor.currentActiveVersion?.id ?? item.factor.version?.id ?? null,
    calculationFormula: `${item.quantity} × ${Number(getFactorValue(item.factor))} = ${item.emissions}`,
    matchingMethod: 'MATCHED',
    matchingMessage: VISIBLE_FACTOR_LIBRARY_MATCH_MESSAGE,
  };
}

function mergeConversionFactorsUsed(
  existingFactors: MetricsOverview['conversionFactorsUsed'],
  supplementalCalculations: SupplementalCalculation[],
) {
  if (supplementalCalculations.length === 0) return existingFactors;

  const merged = [...existingFactors];
  const byFactorId = new Map(merged.map((factor) => [factor.factorId, factor]));

  supplementalCalculations.forEach((item) => {
    const existing = byFactorId.get(item.factor.id);
    if (existing) {
      existing.usedRecordsCount = (existing.usedRecordsCount ?? 1) + 1;
      return;
    }

    merged.push({
      factorId: item.factor.id,
      factorVersionId: item.factor.currentActiveVersion?.id ?? item.factor.version?.id ?? null,
      factorVersion: getFactorVersionLabel(item.factor) || null,
      activityType: item.activityType,
      factorName: item.factor.displayName ?? item.factor.name,
      factorValue: getFactorValue(item.factor),
      inputUnit: getFactorInputUnit(item.factor),
      resultUnit: getFactorResultUnit(item.factor),
      jurisdiction: item.factor.jurisdiction ?? null,
      factorYear: item.factor.sourceYear ?? null,
      factorStatus: item.factor.status ?? null,
      confidenceLevel: getFactorConfidenceLevel(item.factor) || null,
      verificationStatus: getFactorVerificationStatus(item.factor) || null,
      assumptions: getFactorAssumptionDisclosure(item.activityType, item.factor) || null,
      sourceAuthority: getFactorSourceAuthority(item.factor) || 'Source not specified',
      sourceDocument: getFactorSourceDocument(item.factor) || null,
      sourceUrl: item.factor.sourceUrl ?? null,
      sourceYear: item.factor.sourceYear ?? null,
      factorType: item.factor.organizationId ? 'Custom' : 'System',
      verified: Boolean(item.factor.verified),
      usedRecordsCount: 1,
      matchingMethod: 'MATCHED',
      matchingMessage: VISIBLE_FACTOR_LIBRARY_MATCH_MESSAGE,
    });
  });

  return merged;
}

export async function loadDefaultMetricsDateRange(): Promise<MetricsDateRange> {
  const activities = await getAllActivityData();
  return deriveMetricsDateRange(activities);
}

export function deriveMetricsDateRange(
  activities: Array<{ recordDate?: string | null }>,
  fallbackDate = new Date(),
): MetricsDateRange {
  const validDates = activities
    .map((item) => formatDateOnly(item.recordDate))
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
    .sort();

  if (validDates.length === 0) {
    const year = fallbackDate.getFullYear();
    return {
      startDate: `${year - 1}-01-01`,
      endDate: `${year}-12-31`,
      hasActivityRecords: false,
    };
  }

  const firstDate = validDates[0];
  const lastDate = validDates[validDates.length - 1];
  const firstYear = firstDate.slice(0, 4);
  const lastYear = lastDate.slice(0, 4);

  if (firstYear === lastYear) {
    return {
      startDate: `${firstYear}-01-01`,
      endDate: `${firstYear}-12-31`,
      hasActivityRecords: true,
    };
  }

  return {
    startDate: firstDate,
    endDate: lastDate,
    hasActivityRecords: true,
  };
}
