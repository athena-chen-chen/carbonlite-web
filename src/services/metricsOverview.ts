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
  normalizeActivityType,
  type MatchableConversionFactor,
} from '../utils/conversionFactorMatching';
import { normalizeUnitForDisplay } from '../utils/unitNormalization';

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
    confidenceLevel?: string | null;
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
  const calculatedDetailCount = (summary.calculationDetails ?? []).filter(
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
    summary,
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
    summary.calculationDetails ?? [],
    supplementalCalculations,
    activities,
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
    missingFactors: mergedMissingFactors,
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
  return ['WATER', 'WASTE', 'WASTE_VOLUME'].includes(activityType);
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
    factorName: item.factor.name,
    factorDisplayName: item.factor.displayName ?? item.factor.name,
    factorValue,
    factorInputUnit,
    factorResultUnit,
    factorYear: item.factor.sourceYear ?? null,
    factorStatus: item.factor.status ?? null,
    factorSource: sourceAuthority || 'Source not specified',
    sourceAuthority,
    sourceDocument: item.factor.sourceReference ?? null,
    sourceYear: item.factor.sourceYear ?? null,
    factorVerified: Boolean(item.factor.verified),
    factorType: item.factor.organizationId ? 'Custom' : 'System',
    calculatedEmission: item.emissions,
    calculatedEmissionsKgCO2e: item.emissions,
    calculationFormula: `${item.quantity} × ${factorValue} = ${item.emissions}`,
    calculationStatus: 'CALCULATED',
    matchingStatus: 'MATCHED',
    matchedBy: 'frontend factor-library compatibility match',
    matchingMethod: 'frontend factor-library compatibility match',
    matchingMessage:
      'Matched against the visible Conversion Factor Library while backend factor matching is updated.',
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
    matchingMethod: 'frontend factor-library compatibility match',
    matchingMessage:
      'Matched against the visible Conversion Factor Library while backend factor matching is updated.',
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
      activityType: item.activityType,
      factorName: item.factor.displayName ?? item.factor.name,
      factorValue: getFactorValue(item.factor),
      inputUnit: getFactorInputUnit(item.factor),
      resultUnit: getFactorResultUnit(item.factor),
      jurisdiction: item.factor.jurisdiction ?? null,
      factorYear: item.factor.sourceYear ?? null,
      factorStatus: item.factor.status ?? null,
      confidenceLevel: item.factor.confidenceLevel ?? null,
      sourceAuthority: getFactorSourceAuthority(item.factor) || 'Source not specified',
      sourceDocument: item.factor.sourceReference ?? null,
      sourceUrl: item.factor.sourceUrl ?? null,
      sourceYear: item.factor.sourceYear ?? null,
      factorType: item.factor.organizationId ? 'Custom' : 'System',
      verified: Boolean(item.factor.verified),
      usedRecordsCount: 1,
      matchingMethod: 'frontend factor-library compatibility match',
      matchingMessage:
        'Matched against the visible Conversion Factor Library while backend factor matching is updated.',
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
    .map((item) => item.recordDate?.slice(0, 10) ?? '')
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
