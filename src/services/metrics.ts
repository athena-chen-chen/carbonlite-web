import { apiFetch } from './api';
import { demoMetricsSummary, isDemoMode } from '../demo/demoData';

export type CalculateMetricsResponse = {
  count: number;
  items: Array<{
    activityDataId: string;
    metricType: string;
    metricResultId: string;
    factorId: string | null;
    value: string;
    unit: string;
  }>;
};

export type MetricResultItem = {
  id: string;
  organizationId: string;
  facilityId?: string | null;
  activityDataId?: string | null;
  factorId?: string | null;
  metricType: string;
  value: string | number;
  unit: string;
  calculationDate: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  detailsJson?: unknown;
  createdAt: string;
  updatedAt: string;
};

export type MetricListResponse = {
  items: MetricResultItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type MetricsSummaryResponse = {
  totalsByMetric: Array<{
    metricType: string;
    unit: string;
    totalValue: string;
    count: number;
  }>;
  totalsByFacility: Array<{
    facilityId: string | null;
    metricType: string;
    unit: string;
    totalValue: string;
  }>;
};

export async function calculateMetrics(activityDataIds: string[]) {
  if (isDemoMode()) {
    return {
      count: activityDataIds.length,
      items: activityDataIds.map((id) => ({
        activityDataId: id,
        metricType: 'CARBON_EMISSION',
        metricResultId: `${id}-metric`,
        factorId: 'demo-factor',
        value: '0',
        unit: 'kg CO2e',
      })),
    };
  }

  return apiFetch<CalculateMetricsResponse>('/metrics/calculate', {
    method: 'POST',
    body: JSON.stringify({
      activityDataIds,
      metricTypes: ['CARBON_EMISSION'],
    }),
  });
}

export async function getMetricsList(params?: {
  page?: number;
  pageSize?: number;
  facilityId?: string;
  metricType?: string;
  periodStart?: string;
  periodEnd?: string;
}) {
  const searchParams = new URLSearchParams();

  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params?.facilityId) searchParams.set('facilityId', params.facilityId);
  if (params?.metricType) searchParams.set('metricType', params.metricType);
  if (params?.periodStart) searchParams.set('periodStart', params.periodStart);
  if (params?.periodEnd) searchParams.set('periodEnd', params.periodEnd);

  const query = searchParams.toString();
  return apiFetch<MetricListResponse>(`/metrics${query ? `?${query}` : ''}`);
}

export async function getMetricsSummary(params?: {
  facilityId?: string;
  metricType?: string;
  periodStart?: string;
  periodEnd?: string;
}) {
  if (isDemoMode()) {
    return demoMetricsSummary;
  }

  const searchParams = new URLSearchParams();

  if (params?.facilityId) searchParams.set('facilityId', params.facilityId);
  if (params?.metricType) searchParams.set('metricType', params.metricType);
  if (params?.periodStart) searchParams.set('periodStart', params.periodStart);
  if (params?.periodEnd) searchParams.set('periodEnd', params.periodEnd);

  const query = searchParams.toString();
  return apiFetch<MetricsSummaryResponse>(
    `/metrics/summary${query ? `?${query}` : ''}`,
  );
}
