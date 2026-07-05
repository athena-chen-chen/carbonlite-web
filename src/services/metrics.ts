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
  calculatedRecordCount?: number;
  skippedRecordCount?: number;
  totalRecordCount?: number;
  totalEmissions?: number;
  emissionsUnit?: 'kgCO2e' | 'tCO2e';
  categoryBreakdown?: Array<{
    activityType: string;
    emissions: number;
    recordCount: number;
    calculatedRecordCount: number;
    skippedRecordCount: number;
  }>;
  calculationIssues?: Array<{
    issueType: string;
    count: number;
    message: string;
  }>;
  hotspotSummary?: {
    totalCalculatedEmissions: number;
    emissionsUnit: 'kgCO2e' | 'tCO2e';
    calculatedRecordCount: number;
    excludedRecordCount: number;
    totalRecordCount: number;
    topCategory?: {
      activityType: string;
      emissions: number;
      percentageOfTotal: number;
    } | null;
    categoryHotspots: Array<{
      activityType: string;
      displayName: string;
      emissions: number;
      percentageOfTotal: number;
      recordCount: number;
      calculatedRecordCount: number;
      excludedRecordCount: number;
      rank: number;
      hotspotLevel: 'HIGH' | 'MEDIUM' | 'LOW';
      focusMessage: string;
    }>;
    excludedCategories: Array<{
      activityType: string;
      displayName: string;
      excludedRecordCount: number;
      reason: 'MISSING_FACTOR' | 'INVALID_UNIT' | 'TRACKED_ONLY' | 'NEEDS_REVIEW' | 'MISSING_JURISDICTION';
      message: string;
    }>;
    focusRecommendations: Array<{
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
      title: string;
      message: string;
      relatedActivityType?: string;
    }>;
  };
  dataQualitySummary?: {
    totalRecords: number;
    recordsReadyForCalculation: number;
    recordsRequiringReview: number;
    missingActivityTypeCount: number;
    missingQuantityCount: number;
    missingUnitCount: number;
    invalidUnitCount: number;
    missingDateCount: number;
    missingJurisdictionCount: number;
    missingFactorCount: number;
    trackedOnlyCount: number;
    sourceReferenceCoverage: number;
    costDataCoverage: number;
    dataReadinessScore: number;
    readinessLevel: 'Good' | 'Needs Review' | 'Incomplete';
    message: string;
    checklist: Array<{
      key: string;
      label: string;
      passed: boolean;
      count?: number;
      total?: number;
      message: string;
    }>;
  };
  skippedReasons?: {
    missingFactor: number;
    invalidQuantity: number;
    invalidUnit: number;
    outsideScope: number;
    outsideDateRange: number;
    invalidData: number;
    trackedOnly?: number;
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
  records?: CalculationExplanation[];
  matchedActivityEmissions?: Array<{
    activityDataId: string;
    activityType: string;
    quantity: number;
    unit: string;
    estimatedEmissionsKgCO2e: number;
    sourceType: string;
    sourceReference?: string | null;
    sourceFileName?: string | null;
    sourcePage?: string | number | null;
    sourceRow?: string | number | null;
    sourceTextSnippet?: string | null;
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
    sourcePage?: string | number | null;
    sourceRow?: string | number | null;
    sourceTextSnippet?: string | null;
  }>;
};

export type CalculationAuditDetail = {
  activityDataId: string;
  activityType: string;
  recordDate: string;
  dateEstimated: boolean;
  reportingYear: number;
  recordYear?: number | null;
  jurisdiction: string;
  jurisdictionCountry?: string | null;
  jurisdictionRegion?: string | null;
  jurisdictionSource?: 'record' | 'facility' | 'organization' | 'user' | 'unknown' | string | null;
  jurisdictionAssumed?: boolean | null;
  facilityId?: string | null;
  facilityName?: string | null;
  activityQuantity: number;
  activityUnit: string;
  quantityUnit?: string | null;
  normalizedUnit?: string | null;
  factorId?: string | null;
  factorVersionId?: string | null;
  factorName?: string | null;
  factorDisplayName?: string | null;
  factorValue?: number | null;
  factorInputUnit?: string | null;
  factorResultUnit?: string | null;
  factorYear?: number | null;
  factorJurisdictionCountry?: string | null;
  factorJurisdictionRegion?: string | null;
  factorStatus?: string | null;
  factorPriority?: string | null;
  factorSource: string;
  sourceAuthority?: string | null;
  sourceDocument?: string | null;
  sourceUrl?: string | null;
  factorSourcePage?: string | number | null;
  factorSourceTable?: string | null;
  sourceYear?: number | null;
  factorVerified: boolean;
  factorConfidenceLevel?: string | null;
  factorVerificationStatus?: string | null;
  factorType?: 'System' | 'Custom' | null;
  calculatedEmission?: number | null;
  calculatedEmissionsKgCO2e?: number | null;
  calculationFormula?: string | null;
  calculationStatus?: string | null;
  matchingStatus?: string | null;
  matchedBy?: string | null;
  matchingMethod?: string | null;
  matchingMessage?: string | null;
  explanationStatus?: string | null;
  explanationMatchedBy?: string | null;
  status:
    | 'CALCULATED'
    | 'MISSING_FACTOR'
    | 'INVALID_QUANTITY'
    | 'INVALID_UNIT'
    | 'MISSING_DATA'
    | 'MISSING_JURISDICTION'
    | 'TRACKED_ONLY'
    | 'OUTSIDE_SCOPE';
  reason?: string | null;
  availableUnitsForActivityType?: string[];
  sourceType: string;
  sourceReference?: string | null;
  sourceFileName?: string | null;
  sourcePage?: string | number | null;
  sourceRow?: string | number | null;
  sourceTextSnippet?: string | null;
  sourceDocumentId?: string | null;
  notes?: string | null;
};

export type CalculationExplanation = {
  activityRecordId: string;
  activityType: string;
  quantity: number | null;
  unit: string | null;
  normalizedQuantity?: number | null;
  normalizedUnit?: string | null;
  recordDate?: string | null;
  recordYear?: number | null;
  facilityName?: string | null;
  jurisdiction?: string | null;
  jurisdictionCountry?: string | null;
  jurisdictionRegion?: string | null;
  jurisdictionSource?: 'record' | 'facility' | 'organization' | 'user' | 'unknown' | string | null;
  jurisdictionAssumed?: boolean | null;
  calculationStatus: string;
  calculatedEmissions?: number | null;
  resultUnit?: string | null;
  factor?: {
    factorId?: string | null;
    factorVersionId?: string | null;
    activityType?: string | null;
    factorValue?: number | null;
    inputUnit?: string | null;
    resultUnit?: string | null;
    jurisdiction?: string | null;
    factorYear?: number | null;
    sourceAuthority?: string | null;
    sourceDocument?: string | null;
    sourceYear?: number | null;
    sourceUrl?: string | null;
    confidenceLevel?: string | null;
    verificationStatus?: string | null;
    verified?: boolean | null;
    isSystem?: boolean | null;
    isOfficial?: boolean | null;
  } | null;
  matching?: {
    matched: boolean;
    matchedBy:
      | 'EXACT'
      | 'COUNTRY_LEVEL'
      | 'SYSTEM_DEFAULT'
      | 'PRIOR_YEAR'
      | 'PLACEHOLDER'
      | 'TRACKED_ONLY'
      | 'NO_MATCH'
      | 'INVALID_UNIT';
    message: string;
  };
  formula?: string | null;
  warning?: string | null;
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
  const hasSelectedScope = Boolean(
    params?.selectedActivityRecordIds?.length || params?.selectedDocumentIds?.length,
  );

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
  const endpoint = hasSelectedScope
    ? '/metrics/calculation-summary'
    : '/metrics/summary';

  return apiFetch<MetricsSummaryResponse>(
    `${endpoint}${query ? `?${query}` : ''}`,
  );
}
