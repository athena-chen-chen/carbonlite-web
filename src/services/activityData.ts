import { apiFetch } from './api';
import { clampApiPageSize } from '../config/api';

export type ActivityDataInput = {
  activityType: string;
  recordDate: string | null;
  quantity: number;
  unit: string;
  sourceType: string;
  sourceReference?: string;
  notes?: string;
  facilityId?: string;
  assetId?: string;
  documentId?: string;
  sourceDocumentId?: string;
  sourceFileName?: string;
  dateEstimated?: boolean;
  customTypeLabel?: string;
  periodStart?: string;
  periodEnd?: string;
};

export type ActivityDataItem = {
  id: string;
  organizationId: string;
  facilityId?: string | null;
  assetId?: string | null;
  documentId?: string | null;
  sourceDocumentId?: string | null;
  sourceFileName?: string | null;
  dateEstimated?: boolean | null;
  activityType: string;
  customTypeLabel?: string | null;
  recordDate: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  quantity: string | number;
  unit: string;
  sourceType: string;
  sourceReference?: string | null;
  notes?: string | null;
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

const ACTIVITY_DATA_PAGE_SIZE = 100;

export async function createActivityData(data: any) {
  return apiFetch<ActivityDataItem>('/activity-data', {
    method: 'POST',
    body: JSON.stringify(buildActivityDataPayload(data)),
  });
}

function normalizeOptionalString(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function buildActivityDataPayload(input: ActivityDataInput): ActivityDataInput {
  return {
    activityType: input.activityType.trim(),
    recordDate: input.recordDate,
    quantity: Number(input.quantity),
    unit: input.unit.trim(),
    sourceType: input.sourceType.trim(),
    sourceReference: normalizeOptionalString(input.sourceReference),
    notes: normalizeOptionalString(input.notes),
    facilityId: normalizeOptionalString(input.facilityId),
    assetId: normalizeOptionalString(input.assetId),
    documentId: normalizeOptionalString(input.documentId),
    sourceDocumentId: normalizeOptionalString(input.sourceDocumentId),
    sourceFileName: normalizeOptionalString(input.sourceFileName),
    dateEstimated: Boolean(input.dateEstimated),
    customTypeLabel: normalizeOptionalString(input.customTypeLabel),
    periodStart: normalizeOptionalString(input.periodStart),
    periodEnd: normalizeOptionalString(input.periodEnd),
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
  return apiFetch<ActivityDataListResponse>(path);
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
  return apiFetch<ActivityDataItem>(`/activity-data/${id}`);
}
export async function updateActivityData(
  id: string,
  input: ActivityDataInput,
) {
  const payload = buildActivityDataPayload(input);

  return apiFetch<ActivityDataItem>(`/activity-data/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteActivityData(id: string) {
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

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : '';

    if (/api 403/i.test(message)) {
      throw new Error('You can only delete your own activity records.');
    }

    if (/api 404/i.test(message) || message === 'No activity record was deleted.') {
      throw new Error('Activity record was not deleted. Please refresh and try again.');
    }

    throw new Error('Unable to delete selected records. Please try again.');
  }
}

export async function bulkDeleteActivityData(ids: string[]) {
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

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : '';

    if (/api 403/i.test(message)) {
      throw new Error('You can only delete your own activity records.');
    }

    if (/api 404/i.test(message) || message === 'No activity records were deleted.') {
      throw new Error('Activity records were not deleted. Please refresh and try again.');
    }

    throw new Error('Unable to delete selected records. Please try again.');
  }
}
