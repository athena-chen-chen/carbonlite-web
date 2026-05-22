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

export const EMPTY_ACTIVITY_USAGE_TOTALS: ActivityUsageTotals = {
  fuel: 0,
  electricity: 0,
  fuelUnitLabel: 'L / m3',
  electricityUnitLabel: 'kWh',
};

export type MetricsOverview = {
  activities: ActivityDataItem[];
  summary: MetricsSummaryResponse;
  usageTotals: ActivityUsageTotals;
  carbonMetric?: MetricsSummaryResponse['totalsByMetric'][number];
  totalEstimatedEmissionsKgCO2e: number;
  totalRecordsFound: number;
  processedRecords: number;
  skippedRecords: number;
  missingFactorRecords: number;
  matchedFactorsCount: number;
  missingFactors: Array<{
    activityDataId: string;
    activityType: string;
    unit: string;
  }>;
  totalRecords: number;
};

export async function loadMetricsOverview(options?: {
  recalculate?: boolean;
  dateFrom?: string;
  dateTo?: string;
}): Promise<MetricsOverview> {
  const activities = await getAllActivityDataForMetrics({
    dateFrom: options?.dateFrom,
    dateTo: options?.dateTo,
  });
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
  const skippedRecords = activities.length - processedRecords;
  const totalsByMetric = summary?.totalsByMetric ?? [];
  const carbonMetric = totalsByMetric.find((metric) =>
    String(metric.metricType).includes('CARBON'),
  );

  console.log('[MetricsOverview] records count', activities.length);
  console.log('[MetricsOverview] total records queried', activities.length);
  console.log('[MetricsOverview] records after date filter', activities.length);
  console.log('[MetricsOverview] matched factors count', emissionsSummary.matchedFactorsCount);
  console.log('[MetricsOverview] missing factor count', emissionsSummary.missingFactors.length);
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
    totalRecordsFound: activities.length,
    processedRecords,
    skippedRecords,
    missingFactorRecords,
    totalRecords: activities.length,
  };
}

async function getAllActivityDataForMetrics(options?: {
  dateFrom?: string;
  dateTo?: string;
}) {
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
  const missingFactors: MetricsOverview['missingFactors'] = [];

  activities.forEach((activity) => {
    const quantity = Number(activity.quantity ?? 0);
    const matchingFactor = findMatchingFactor(activity, conversionFactors);

    if (!matchingFactor) {
      missingFactors.push({
        activityDataId: activity.id,
        activityType: activity.activityType,
        unit: activity.unit,
      });
      return;
    }

    if (!Number.isFinite(quantity)) return;

    matchedFactorsCount += 1;
    totalEstimatedEmissionsKgCO2e += quantity * Number(matchingFactor.factorValue);
  });

  return {
    totalEstimatedEmissionsKgCO2e: roundEmissions(totalEstimatedEmissionsKgCO2e),
    matchedFactorsCount,
    missingFactors,
  };
}

function findMatchingFactor(
  activity: ActivityDataItem,
  conversionFactors: ConversionFactorItem[],
) {
  const activityType = normalizeActivityType(activity.activityType);
  const unit = normalizeUnit(activity.unit);
  const matches = conversionFactors.filter((factor) =>
    normalizeActivityType(factor.activityType) === activityType &&
    normalizeUnit(factor.unit) === unit &&
    Number.isFinite(Number(factor.factorValue)),
  );

  return matches.sort(compareFactorPriority)[0];
}

function compareFactorPriority(a: ConversionFactorItem, b: ConversionFactorItem) {
  const aCustom = isCustomFactor(a) ? 1 : 0;
  const bCustom = isCustomFactor(b) ? 1 : 0;

  if (aCustom !== bCustom) return bCustom - aCustom;
  if (Number(a.isDefault) !== Number(b.isDefault)) {
    return Number(b.isDefault) - Number(a.isDefault);
  }

  return String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? ''));
}

function isCustomFactor(factor: ConversionFactorItem) {
  return Boolean(factor.organizationId) || !factor.isSystemDefault;
}

function normalizeActivityType(value?: string | null) {
  return String(value ?? '').trim().toUpperCase();
}

function normalizeUnit(value?: string | null) {
  const unit = String(value ?? '').trim().toLowerCase();
  const compact = unit.replace(/[\s._-]+/g, '');

  const aliases: Record<string, string> = {
    l: 'l',
    liter: 'l',
    liters: 'l',
    litre: 'l',
    litres: 'l',
    kwh: 'kwh',
    kwhr: 'kwh',
    m3: 'm3',
    cubicmeter: 'm3',
    cubicmeters: 'm3',
    cubicmetre: 'm3',
    cubicmetres: 'm3',
    kg: 'kg',
    kilogram: 'kg',
    kilograms: 'kg',
    km: 'km',
    kilometer: 'km',
    kilometers: 'km',
    kilometre: 'km',
    kilometres: 'km',
  };

  return aliases[compact] ?? compact;
}

function roundEmissions(value: number) {
  return Math.round(value * 1000) / 1000;
}
