import { apiFetch } from './api';
import { clampApiPageSize } from '../config/api';

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
  totalEstimatedEmissionsKgCO2e?: number;
  totalRecordsFound?: number;
  recordsInScope?: number;
  recordsCalculated?: number;
  recordsIncluded?: number;
  processedRecords?: number;
  skippedRecords?: number;
  missingFactorCount?: number;
  missingFactorRecords?: number;
  invalidRecordCount?: number;
  dataQualityCoverage?: number;
  skippedReasons?: {
    missingFactor: number;
    invalidQuantity: number;
    invalidUnit: number;
    outsideScope: number;
    outsideDateRange: number;
    invalidData: number;
  };
  usageTotals?: {
    fuel: number;
    electricity: number;
    fuelUnitLabel: string;
    electricityUnitLabel: string;
    fuelUsageBreakdown: Array<{
      activityType: string;
      total: number;
      unit: string;
    }>;
  };
  missingFactors?: Array<{
    activityDataId: string;
    activityType: string;
    unit: string;
    availableUnitsForActivityType?: string[];
  }>;
  calculationDetails?: CalculationAuditDetail[];
  matchedActivityEmissions?: Array<{
    activityDataId: string;
    activityType: string;
    quantity: number;
    unit: string;
    estimatedEmissionsKgCO2e: number;
    sourceType: string;
    sourceReference?: string | null;
    notes?: string | null;
    factorId: string;
  }>;
  conversionFactorsUsed?: Array<{
    factorId: string;
    activityType?: string | null;
    factorName: string;
    factorValue: string | number;
    inputUnit: string;
    resultUnit: string;
    jurisdiction?: string | null;
    reportingYear?: number | null;
    sourceAuthority: string;
    sourceDocument?: string | null;
    sourceUrl?: string | null;
    sourceYear?: number | null;
    factorType: 'System' | 'Custom';
    verified: boolean;
    priority?: string | null;
  }>;
  activities?: Array<{
    id: string;
    activityType: string;
    recordDate: string;
    quantity: number;
    unit: string;
    sourceType: string;
    sourceReference?: string | null;
    notes?: string | null;
    sourceDocumentId?: string | null;
    sourceFileName?: string | null;
  }>;
};

export type CalculationAuditDetail = {
  activityDataId: string;
  activityType: string;
  recordDate: string;
  dateEstimated: boolean;
  reportingYear: number;
  jurisdiction: string;
  activityQuantity: number;
  activityUnit: string;
  factorId?: string | null;
  factorName?: string | null;
  factorValue?: number | null;
  factorInputUnit?: string | null;
  factorResultUnit?: string | null;
  factorPriority?: string | null;
  factorSource: string;
  sourceAuthority?: string | null;
  sourceDocument?: string | null;
  sourceUrl?: string | null;
  sourceYear?: number | null;
  factorVerified: boolean;
  factorType?: 'System' | 'Custom' | null;
  calculatedEmissionsKgCO2e?: number | null;
  status:
    | 'CALCULATED'
    | 'MISSING_FACTOR'
    | 'INVALID_QUANTITY'
    | 'INVALID_UNIT'
    | 'OUTSIDE_SCOPE';
  reason?: string | null;
  availableUnitsForActivityType?: string[];
  sourceType: string;
  sourceReference?: string | null;
  sourceFileName?: string | null;
  sourceDocumentId?: string | null;
  notes?: string | null;
};

export async function calculateMetrics(activityDataIds: string[]) {
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
  const safePageSize = params?.pageSize
    ? clampApiPageSize(params.pageSize)
    : undefined;

  if (params?.page) searchParams.set('page', String(params.page));
  if (safePageSize) searchParams.set('pageSize', String(safePageSize));
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

export async function getCalculationSummary(params?: {
  periodStart?: string;
  periodEnd?: string;
  selectedActivityRecordIds?: string[];
  selectedDocumentIds?: string[];
}) {
  const searchParams = new URLSearchParams();
  if (params?.periodStart) searchParams.set('periodStart', params.periodStart);
  if (params?.periodEnd) searchParams.set('periodEnd', params.periodEnd);
  if (params?.selectedActivityRecordIds?.length) {
    searchParams.set(
      'selectedActivityRecordIds',
      params.selectedActivityRecordIds.join(','),
    );
  }
  if (params?.selectedDocumentIds?.length) {
    searchParams.set('selectedDocumentIds', params.selectedDocumentIds.join(','));
  }

  const query = searchParams.toString();
  return apiFetch<MetricsSummaryResponse>(
    `/metrics/calculation-summary${query ? `?${query}` : ''}`,
  );
}
