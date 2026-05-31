import {
  type ActivityDataItem,
  getAllActivityData,
} from './activityData';
import {
  calculateMetrics,
  getMetricsSummary,
  type MetricsSummaryResponse,
} from './metrics';
import {
  getAllConversionFactors,
  type ConversionFactorItem,
} from './conversionFactors';
import {
  type ActivityUsageTotals,
  aggregateActivityUsage,
} from '../utils/activityAggregation';
import {
  findBestConversionFactorMatch,
  getFactorSourceAuthority,
  normalizeActivityType,
  normalizeUnit,
} from '../utils/conversionFactorMatching';

export const EMPTY_ACTIVITY_USAGE_TOTALS: ActivityUsageTotals = {
  fuel: 0,
  electricity: 0,
  fuelUnitLabel: 'Grouped by type and unit',
  electricityUnitLabel: 'kWh',
  fuelUsageBreakdown: [],
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
    estimatedEmissionsKgCO2e: number;
    sourceType: string;
    sourceReference?: string | null;
    notes?: string | null;
    factorId: string;
  }>;
  conversionFactorsUsed: Array<{
    factorId: string;
    activityType?: string | null;
    factorName: string;
    factorValue: string | number;
    inputUnit: string;
    resultUnit: string;
    sourceAuthority: string;
    sourceYear?: number | null;
    factorType: 'System' | 'Custom';
    verified: boolean;
  }>;
  totalRecords: number;
};

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
  const hasSelectedRecords = selectedRecordIds.length > 0;
  const hasSelectedDocuments = selectedDocumentIds.length > 0;
  const queriedActivities = await getAllActivityDataForMetrics();
  const selectedIdSet = new Set(selectedRecordIds);
  const selectedDocumentIdSet = new Set(selectedDocumentIds);
  const scopeFilteredActivities = hasSelectedRecords
    ? queriedActivities.filter((item) => selectedIdSet.has(item.id))
    : hasSelectedDocuments
    ? queriedActivities.filter((item) => isActivityFromSelectedDocument(item, selectedDocumentIdSet))
    : queriedActivities;
  const outsideScope = queriedActivities.length - scopeFilteredActivities.length;
  const activities = hasSelectedRecords || hasSelectedDocuments
    ? scopeFilteredActivities
    : scopeFilteredActivities.filter((item) =>
        isActivityWithinDateRange(item, options?.dateFrom, options?.dateTo),
      );
  const outsideDateRange =
    hasSelectedRecords || hasSelectedDocuments
      ? 0
      : scopeFilteredActivities.length - activities.length;
  const activityIds = activities.map((item) => item.id).filter(Boolean);

  if (options?.recalculate && activityIds.length > 0) {
    await calculateMetrics(activityIds);
  }

  const summary = await getMetricsSummary({
    periodStart: options?.dateFrom,
    periodEnd: options?.dateTo,
  });
  const conversionFactors = await getAllConversionFactors();
  const emissionsSummary = calculateEstimatedEmissions(
    activities,
    conversionFactors,
  );
  const processedRecords = emissionsSummary.matchedFactorsCount;
  const missingFactorRecords = emissionsSummary.missingFactors.length;
  const invalidDataRecords = emissionsSummary.invalidDataRecords;
  const skippedRecords =
    missingFactorRecords + outsideDateRange + outsideScope + invalidDataRecords;
  const skippedReasons = {
    missingFactor: missingFactorRecords,
    outsideDateRange,
    outsideScope,
    invalidData: invalidDataRecords,
  };
  const totalsByMetric = summary?.totalsByMetric ?? [];
  const carbonMetric = totalsByMetric.find((metric) =>
    String(metric.metricType).includes('CARBON'),
  );

  console.log('[MetricsOverview] records count', activities.length);
  console.log('[MetricsOverview] total records queried', queriedActivities.length);
  console.log('[MetricsOverview] records after date filter', activities.length);
  console.log('[MetricsOverview] matched factors count', emissionsSummary.matchedFactorsCount);
  console.log('[MetricsOverview] missing factor count', emissionsSummary.missingFactors.length);
  console.log('[MetricsOverview] skipped reasons', skippedReasons);
  console.log('[MetricsOverview] skipped records', skippedRecords);
  console.log(
    '[MetricsOverview] totalEstimatedEmissionsKgCO2e',
    emissionsSummary.totalEstimatedEmissionsKgCO2e,
  );

  return {
    activities,
    summary,
    usageTotals: aggregateActivityUsage(activities),
    carbonMetric,
    ...emissionsSummary,
    totalRecordsFound: queriedActivities.length,
    recordsIncluded: processedRecords,
    processedRecords,
    skippedRecords,
    skippedReasons,
    missingFactorRecords,
    totalRecords: activities.length,
  };
}

async function getAllActivityDataForMetrics(options?: {
  dateFrom?: string;
  dateTo?: string;
}) {
  if (!options?.dateFrom && !options?.dateTo) {
    return getAllActivityData();
  }

  return getAllActivityData({
    dateFrom: options?.dateFrom,
    dateTo: options?.dateTo,
  });
}

function calculateEstimatedEmissions(
  activities: ActivityDataItem[],
  conversionFactors: ConversionFactorItem[],
) {
  let totalEstimatedEmissionsKgCO2e = 0;
  let matchedFactorsCount = 0;
  let invalidDataRecords = 0;
  const missingFactors: MetricsOverview['missingFactors'] = [];
  const matchedActivityEmissions: MetricsOverview['matchedActivityEmissions'] = [];
  const conversionFactorsById = new Map<string, MetricsOverview['conversionFactorsUsed'][number]>();

  activities.forEach((activity) => {
    const quantity = Number(activity.quantity ?? 0);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      invalidDataRecords += 1;
      return;
    }

    const matchingFactor = findBestConversionFactorMatch({
      activityType: activity.activityType,
      inputUnit: activity.unit,
      organizationId: activity.organizationId,
      factors: conversionFactors,
    })?.factor;

    if (!matchingFactor) {
      missingFactors.push({
        activityDataId: activity.id,
        activityType: activity.activityType,
        unit: activity.unit,
        availableUnitsForActivityType: getAvailableUnitsForActivityType(
          activity.activityType,
          activity.unit,
          conversionFactors,
        ),
      });
      return;
    }

    const estimatedEmissionsKgCO2e = roundEmissions(
      quantity * Number(matchingFactor.factorValue),
    );

    matchedFactorsCount += 1;
    totalEstimatedEmissionsKgCO2e += estimatedEmissionsKgCO2e;
    matchedActivityEmissions.push({
      activityDataId: activity.id,
      activityType: activity.activityType,
      quantity: activity.quantity,
      unit: activity.unit,
      estimatedEmissionsKgCO2e,
      sourceType: activity.sourceType,
      sourceReference: activity.sourceReference,
      notes: activity.notes,
      factorId: matchingFactor.id,
    });

    conversionFactorsById.set(matchingFactor.id, {
      factorId: matchingFactor.id,
      activityType: matchingFactor.activityType,
      factorName: matchingFactor.name,
      factorValue: matchingFactor.factorValue,
      inputUnit: matchingFactor.inputUnit || matchingFactor.unit || '',
      resultUnit: matchingFactor.resultUnit || 'kgCO2e',
      sourceAuthority: getFactorSourceAuthority(matchingFactor),
      sourceYear: matchingFactor.sourceYear,
      factorType: matchingFactor.isSystemDefault ? 'System' : 'Custom',
      verified: Boolean(matchingFactor.verified),
    });
  });

  return {
    totalEstimatedEmissionsKgCO2e: roundEmissions(totalEstimatedEmissionsKgCO2e),
    matchedFactorsCount,
    invalidDataRecords,
    missingFactors,
    matchedActivityEmissions,
    conversionFactorsUsed: Array.from(conversionFactorsById.values()),
  };
}

function isActivityFromSelectedDocument(
  item: ActivityDataItem,
  selectedDocumentIdSet: Set<string>,
) {
  if (item.sourceDocumentId) return selectedDocumentIdSet.has(item.sourceDocumentId);
  if (item.documentId) return selectedDocumentIdSet.has(item.documentId);
  return false;
}

function isActivityWithinDateRange(
  item: ActivityDataItem,
  dateFrom?: string,
  dateTo?: string,
) {
  if (!dateFrom && !dateTo) return true;
  const recordDate = item.recordDate?.slice(0, 10);
  if (!recordDate) return false;
  if (dateFrom && recordDate < dateFrom) return false;
  if (dateTo && recordDate > dateTo) return false;
  return true;
}

function getAvailableUnitsForActivityType(
  activityType: string,
  missingUnit: string,
  conversionFactors: ConversionFactorItem[],
) {
  const normalizedActivityType = normalizeActivityType(activityType);
  const normalizedMissingUnit = normalizeUnit(missingUnit);
  const units = new Map<string, string>();

  conversionFactors.forEach((factor) => {
    const factorKind = String(factor.type ?? 'EMISSION').trim().toUpperCase();
    const inputUnit = factor.inputUnit || factor.unit || '';
    const normalizedInputUnit = normalizeUnit(inputUnit);

    if (
      factorKind !== 'EMISSION' ||
      normalizeActivityType(factor.activityType) !== normalizedActivityType ||
      !normalizedInputUnit ||
      normalizedInputUnit === normalizedMissingUnit
    ) {
      return;
    }

    units.set(normalizedInputUnit, inputUnit);
  });

  return Array.from(units.values()).sort((a, b) => a.localeCompare(b));
}


function roundEmissions(value: number) {
  return Math.round(value * 1000) / 1000;
}
