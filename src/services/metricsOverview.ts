import {
  type ActivityDataItem,
  getAllActivityData,
} from './activityData';
import {
  getCalculationSummary,
  type CalculationAuditDetail,
  type MetricsSummaryResponse,
} from './metrics';
import {
  type ActivityUsageTotals,
  aggregateActivityUsage,
} from '../utils/activityAggregation';

export const EMPTY_ACTIVITY_USAGE_TOTALS: ActivityUsageTotals = {
  fuel: 0,
  electricity: 0,
  fuelUnitLabel: 'Grouped by type and unit',
  electricityUnitLabel: 'kWh',
  fuelUsageBreakdown: [],
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
    jurisdiction?: string | null;
    sourceAuthority: string;
    sourceDocument?: string | null;
    sourceUrl?: string | null;
    sourceYear?: number | null;
    reportingYear?: number | null;
    factorType: 'System' | 'Custom';
    verified: boolean;
  }>;
  calculationDetails: CalculationAuditDetail[];
  invalidRecordCount: number;
  dataQualityCoverage: number;
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
  const processedRecords = summary.recordsCalculated ?? 0;
  const missingFactorRecords = summary.missingFactorCount ?? 0;
  const skippedRecords = summary.skippedRecords ?? 0;
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

  return {
    activities,
    summary,
    usageTotals: summary.usageTotals ?? aggregateActivityUsage(activities),
    carbonMetric,
    totalEstimatedEmissionsKgCO2e:
      summary.totalEstimatedEmissionsKgCO2e ?? 0,
    matchedFactorsCount: processedRecords,
    missingFactors: summary.missingFactors ?? [],
    matchedActivityEmissions: summary.matchedActivityEmissions ?? [],
    conversionFactorsUsed: summary.conversionFactorsUsed ?? [],
    calculationDetails: summary.calculationDetails ?? [],
    invalidRecordCount: summary.invalidRecordCount ?? 0,
    dataQualityCoverage: summary.dataQualityCoverage ?? 0,
    totalRecordsFound: summary.totalRecordsFound ?? 0,
    recordsIncluded: processedRecords,
    processedRecords,
    skippedRecords,
    skippedReasons,
    missingFactorRecords,
    totalRecords: summary.recordsInScope ?? activities.length,
  };
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
