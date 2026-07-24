import { ApiError, apiFetch } from './api';
import { clampApiPageSize } from '../config/api';
import { track } from './analytics.service';
import { formatDateOnly } from '../utils/dateOnly';
import {
  canClearActivityRecords,
  canManageActivityRecords,
  getCurrentUser,
  getOrganizationId,
  requirePermission,
} from './auth';

export type ActivityDataInput = {
  activityType: string;
  recordDate: string | null;
  quantity: number;
  unit: string;
  jurisdictionCountry?: string;
  jurisdictionRegion?: string;
  recordYear?: number;
  sourceType: string;
  sourceReference?: string;
  notes?: string;
  facilityId?: string;
  assetId?: string;
  documentId?: string;
  sourceDocumentId?: string;
  sourceFileName?: string;
  sourcePage?: string | number;
  sourceRow?: string | number;
  sourceTextSnippet?: string;
  importBatchId?: string;
  dateEstimated?: boolean;
  customTypeLabel?: string;
  periodStart?: string;
  periodEnd?: string;
  matchingStatus?: string;
  reportTreatment?: string;
  scope?: string;
  matchedFactorId?: string;
  matchedFactorName?: string;
  matchedFactorSourceYear?: number;
  matchedFactorValue?: number;
  matchedFactorUnit?: string;
  matchedFactorVersion?: string;
  matchedFactorSourceAuthority?: string;
  matchedFactorSourceDocument?: string;
  matchedFactorVerificationStatus?: string;
  matchedFactorConfidenceLevel?: string;
  matchedFactorAssumptions?: string;
  calculatedEmissionsKgCO2e?: number;
  calculationStatus?: string;
  calculationMessage?: string;
};

export type ActivityDataItem = {
  id: string;
  organizationId: string;
  facilityId?: string | null;
  assetId?: string | null;
  documentId?: string | null;
  sourceDocumentId?: string | null;
  sourceFileName?: string | null;
  sourcePage?: string | number | null;
  sourceRow?: string | number | null;
  sourceTextSnippet?: string | null;
  importBatchId?: string | null;
  dateEstimated?: boolean | null;
  activityType: string;
  customTypeLabel?: string | null;
  recordDate: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  quantity: string | number;
  unit: string;
  jurisdictionCountry?: string | null;
  jurisdictionRegion?: string | null;
  recordYear?: number | null;
  sourceType: string;
  sourceReference?: string | null;
  notes?: string | null;
  matchingStatus?: string | null;
  reportTreatment?: string | null;
  scope?: string | null;
  matchedFactorId?: string | null;
  matchedFactorName?: string | null;
  matchedFactorSourceYear?: number | string | null;
  matchedFactorValue?: number | string | null;
  matchedFactorUnit?: string | null;
  matchedFactorVersion?: string | null;
  matchedFactorSourceAuthority?: string | null;
  matchedFactorSourceDocument?: string | null;
  matchedFactorVerificationStatus?: string | null;
  matchedFactorConfidenceLevel?: string | null;
  matchedFactorAssumptions?: string | null;
  calculatedEmissionsKgCO2e?: number | string | null;
  calculatedEmission?: number | string | null;
  calculationStatus?: string | null;
  calculationMessage?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ActivityDataListResponse = {
  items: ActivityDataItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type DeleteActivityDataResponse = void | {
  deletedCount?: number;
  count?: number;
};

export type ClearActivityRecordsResponse = {
  deletedActivityRecords: number;
  deletedCalculationDetails: number;
  deletedImportBatches: number;
  resetReports: number;
};

export type ResetDemoDataResponse = {
  activityRecordsDeleted: number;
  importBatchesDeleted: number;
  uploadedDocumentsDeleted: number;
  stagedRowsDeleted: number;
  metricsCacheCleared: number;
  resetReports?: number;
};

const ACTIVITY_DATA_PAGE_SIZE = 100;

export async function createActivityData(data: any) {
  requirePermission(canManageActivityRecords(getCurrentUser()));

  const payload = buildActivityDataPayload(data);

  const created = await apiFetch<ActivityDataItem>('/activity-data', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  track('ACTIVITY_RECORD_CREATED', {
    activityType: created.activityType,
    recordCount: 1,
  });

  return created;
}

function normalizeOptionalString(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function buildActivityDataPayload(input: ActivityDataInput): ActivityDataInput {
  return {
    activityType: input.activityType.trim(),
    recordDate: input.recordDate ? formatDateOnly(input.recordDate) : null,
    quantity: Number(input.quantity),
    unit: input.unit.trim(),
    jurisdictionCountry: normalizeOptionalString(input.jurisdictionCountry),
    jurisdictionRegion: normalizeOptionalString(input.jurisdictionRegion),
    recordYear: input.recordYear,
    sourceType: input.sourceType.trim(),
    sourceReference: normalizeOptionalString(input.sourceReference),
    notes: normalizeOptionalString(input.notes),
    facilityId: normalizeOptionalString(input.facilityId),
    assetId: normalizeOptionalString(input.assetId),
    documentId: normalizeOptionalString(input.documentId),
    sourceDocumentId: normalizeOptionalString(input.sourceDocumentId),
    sourceFileName: normalizeOptionalString(input.sourceFileName),
    sourcePage: input.sourcePage,
    sourceRow: input.sourceRow,
    sourceTextSnippet: normalizeOptionalString(input.sourceTextSnippet),
    importBatchId: normalizeOptionalString(input.importBatchId),
    dateEstimated: Boolean(input.dateEstimated),
    customTypeLabel: normalizeOptionalString(input.customTypeLabel),
    periodStart: normalizeOptionalString(input.periodStart),
    periodEnd: normalizeOptionalString(input.periodEnd),
    matchingStatus: normalizeOptionalString(input.matchingStatus),
    reportTreatment: normalizeOptionalString(input.reportTreatment),
    scope: normalizeOptionalString(input.scope),
    matchedFactorId: normalizeOptionalString(input.matchedFactorId),
    matchedFactorName: normalizeOptionalString(input.matchedFactorName),
    matchedFactorSourceYear: input.matchedFactorSourceYear,
    matchedFactorValue: input.matchedFactorValue,
    matchedFactorUnit: normalizeOptionalString(input.matchedFactorUnit),
    matchedFactorVersion: normalizeOptionalString(input.matchedFactorVersion),
    matchedFactorSourceAuthority: normalizeOptionalString(input.matchedFactorSourceAuthority),
    matchedFactorSourceDocument: normalizeOptionalString(input.matchedFactorSourceDocument),
    matchedFactorVerificationStatus: normalizeOptionalString(input.matchedFactorVerificationStatus),
    matchedFactorConfidenceLevel: normalizeOptionalString(input.matchedFactorConfidenceLevel),
    matchedFactorAssumptions: normalizeOptionalString(input.matchedFactorAssumptions),
    calculatedEmissionsKgCO2e: input.calculatedEmissionsKgCO2e,
    calculationStatus: normalizeOptionalString(input.calculationStatus),
    calculationMessage: normalizeOptionalString(input.calculationMessage),
  };
}

// export async function createActivityData(
//   input: ActivityDataInput,
// ): Promise<ActivityDataItem> {
//   const payload = buildActivityDataPayload(input);

//   return apiFetch<ActivityDataItem>('/activity-data', {
//     method: 'POST',
//     body: JSON.stringify(payload),
//   });
// }

export async function getActivityDataList(params?: {
  page?: number;
  pageSize?: number;
  facilityId?: string;
  activityType?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}) {
  const searchParams = new URLSearchParams();
  const safePageSize = params?.pageSize
    ? clampApiPageSize(params.pageSize)
    : undefined;

  if (params?.page) searchParams.set('page', String(params.page));
  if (safePageSize) searchParams.set('pageSize', String(safePageSize));
  if (params?.facilityId) searchParams.set('facilityId', params.facilityId);
  if (params?.activityType) searchParams.set('activityType', params.activityType);
  if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom);
  if (params?.dateTo) searchParams.set('dateTo', params.dateTo);
  if (params?.search) searchParams.set('search', params.search);

  const query = searchParams.toString();
  const path = `/activity-data${query ? `?${query}` : ''}`;
  const response = await apiFetch<ActivityDataListResponse>(path);
  const organizationId = getOrganizationId(getCurrentUser());

  if (!organizationId) return response;

  const items = (response.items ?? []).filter(
    (item) => !item.organizationId || item.organizationId === organizationId,
  );

  return {
    ...response,
    items,
    total: Math.min(Number(response.total ?? items.length), items.length),
    totalPages: Math.max(
      1,
      Math.ceil(
        items.length /
          Math.max(1, Number(response.pageSize ?? (items.length || 1))),
      ),
    ),
  };
}

export async function getAllActivityData(params?: {
  facilityId?: string;
  activityType?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}) {
  const firstPage = (await getActivityDataList({
    ...params,
    page: 1,
    pageSize: ACTIVITY_DATA_PAGE_SIZE,
  })) as ActivityDataListResponse;

  const totalPages = Math.max(1, Number(firstPage.totalPages ?? 1));
  const items = [...(firstPage.items ?? [])];

  for (let page = 2; page <= totalPages; page += 1) {
    const nextPage = (await getActivityDataList({
      ...params,
      page,
      pageSize: ACTIVITY_DATA_PAGE_SIZE,
    })) as ActivityDataListResponse;

    items.push(...(nextPage.items ?? []));
  }

  return items;
}

export async function getActivityDataById(id: string) {
  const item = await apiFetch<ActivityDataItem>(`/activity-data/${id}`);
  const organizationId = getOrganizationId(getCurrentUser());

  if (organizationId && item.organizationId && item.organizationId !== organizationId) {
    throw new Error('You do not have permission to perform this action.');
  }

  return item;
}
export async function updateActivityData(
  id: string,
  input: ActivityDataInput,
) {
  requirePermission(canManageActivityRecords(getCurrentUser()));

  const payload = buildActivityDataPayload(input);

  const updated = await apiFetch<ActivityDataItem>(`/activity-data/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  track('ACTIVITY_RECORD_UPDATED', {
    activityType: updated.activityType,
    recordCount: 1,
  });

  return updated;
}

export async function deleteActivityData(id: string) {
  requirePermission(canManageActivityRecords(getCurrentUser()));

  try {
    const path = `/activity-data/${id}`;
    const response = await apiFetch<DeleteActivityDataResponse>(path, {
      method: 'DELETE',
    });

    const deletedCount =
      response && typeof response === 'object'
        ? Number(response.deletedCount ?? response.count ?? 0)
        : 0;

    if (deletedCount <= 0) {
      throw new Error('No activity record was deleted.');
    }

    track('ACTIVITY_RECORD_DELETED', {
      recordCount: deletedCount,
    });

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : '';

    if (err instanceof ApiError && err.status === 403) {
      throw new Error('You do not have permission to perform this action.');
    }

    if (
      (err instanceof ApiError && err.status === 404) ||
      message === 'No activity record was deleted.'
    ) {
      throw new Error('Activity record was not deleted. Please refresh and try again.');
    }

    throw new Error('Unable to delete selected records. Please try again.');
  }
}

export async function bulkDeleteActivityData(ids: string[]) {
  requirePermission(canManageActivityRecords(getCurrentUser()));

  try {
    const path = '/activity-data/bulk-delete';
    const response = await apiFetch<DeleteActivityDataResponse>(path, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });

    const deletedCount =
      response && typeof response === 'object'
        ? Number(response.deletedCount ?? response.count ?? 0)
        : 0;

    if (deletedCount <= 0) {
      throw new Error('No activity records were deleted.');
    }

    track('ACTIVITY_RECORD_DELETED', {
      source: 'bulk_delete',
      recordCount: deletedCount,
    });

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : '';

    if (err instanceof ApiError && err.status === 403) {
      throw new Error('You do not have permission to perform this action.');
    }

    if (
      (err instanceof ApiError && err.status === 404) ||
      message === 'No activity records were deleted.'
    ) {
      throw new Error('Activity records were not deleted. Please refresh and try again.');
    }

    throw new Error('Unable to delete selected records. Please try again.');
  }
}

export async function clearActivityRecordsForCurrentCompany() {
  requirePermission(canClearActivityRecords(getCurrentUser()));

  try {
    const response = await apiFetch<ClearActivityRecordsResponse>(
      '/admin/activity-records/clear',
      {
        method: 'DELETE',
        body: JSON.stringify({ confirmation: 'CLEAR RECORDS' }),
      },
    );

    const summary = {
      deletedActivityRecords: Number(response?.deletedActivityRecords ?? 0),
      deletedCalculationDetails: Number(response?.deletedCalculationDetails ?? 0),
      deletedImportBatches: Number(response?.deletedImportBatches ?? 0),
      resetReports: Number(response?.resetReports ?? 0),
    };

    track('ACTIVITY_RECORDS_CLEARED', {
      source: 'admin_clear',
      recordCount: summary.deletedActivityRecords,
    });

    return summary;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      throw new Error('Please log in again before clearing activity records.');
    }

    if (err instanceof ApiError && err.status === 403) {
      throw new Error('Only admins and owners can clear activity records.');
    }

    throw new Error('Unable to clear activity records. Please try again.');
  }
}

export async function resetDemoDataForCurrentCompany() {
  requirePermission(canClearActivityRecords(getCurrentUser()));

  try {
    const response = await apiFetch<ResetDemoDataResponse>(
      '/admin/demo-data/reset',
      {
        method: 'POST',
        body: JSON.stringify({ confirmation: 'RESET DEMO DATA' }),
      },
    );

    const summary = {
      activityRecordsDeleted: Number(response?.activityRecordsDeleted ?? 0),
      importBatchesDeleted: Number(response?.importBatchesDeleted ?? 0),
      uploadedDocumentsDeleted: Number(response?.uploadedDocumentsDeleted ?? 0),
      stagedRowsDeleted: Number(response?.stagedRowsDeleted ?? 0),
      metricsCacheCleared: Number(response?.metricsCacheCleared ?? 0),
      resetReports: Number(response?.resetReports ?? 0),
    };

    track('DEMO_DATA_RESET', {
      source: 'admin_reset',
      recordCount: summary.activityRecordsDeleted,
      documentCount: summary.uploadedDocumentsDeleted,
    });

    return summary;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      throw new Error('Please log in again before resetting demo data.');
    }

    if (err instanceof ApiError && err.status === 403) {
      throw new Error('Only admins and owners can reset demo data.');
    }

    throw new Error('Unable to reset demo data. Please try again.');
  }
}
