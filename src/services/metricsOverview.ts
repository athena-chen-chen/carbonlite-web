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
  aggregateActivityUsage,
  type ActivityUsageTotals,
} from '../utils/activityAggregation';

export type MetricsOverview = {
  activities: ActivityDataItem[];
  summary: MetricsSummaryResponse;
  usageTotals: ActivityUsageTotals;
  carbonMetric?: MetricsSummaryResponse['totalsByMetric'][number];
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
  const totalsByMetric = summary?.totalsByMetric ?? [];
  const carbonMetric = totalsByMetric.find((metric) =>
    String(metric.metricType).includes('CARBON'),
  );

  return {
    activities,
    summary,
    usageTotals: aggregateActivityUsage(activities),
    carbonMetric,
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
