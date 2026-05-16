import { apiFetch } from './api';
import { demoActivityRecords, isDemoMode } from '../demo/demoData';

export type ActivityDataInput = {
  activityType: string;
  recordDate: string;
  quantity: number;
  unit: string;
  sourceType: string;
  sourceReference?: string;
  notes?: string;
  facilityId?: string;
  assetId?: string;
  documentId?: string;
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
  activityType: string;
  customTypeLabel?: string | null;
  recordDate: string;
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

export async function createActivityData(data: any) {
  if (isDemoMode()) {
    return {
      id: `demo-activity-${Date.now()}`,
      organizationId: 'demo-org',
      ...buildActivityDataPayload(data),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

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
  if (isDemoMode()) {
    return {
      items: demoActivityRecords.map((item) => ({
        ...item,
        organizationId: 'demo-org',
        createdAt: '2026-03-31T14:10:00.000Z',
        updatedAt: '2026-03-31T14:10:00.000Z',
      })),
      page: 1,
      pageSize: demoActivityRecords.length,
      total: demoActivityRecords.length,
      totalPages: 1,
    };
  }

  const searchParams = new URLSearchParams();

  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params?.facilityId) searchParams.set('facilityId', params.facilityId);
  if (params?.activityType) searchParams.set('activityType', params.activityType);
  if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom);
  if (params?.dateTo) searchParams.set('dateTo', params.dateTo);
  if (params?.search) searchParams.set('search', params.search);

  const query = searchParams.toString();
  return apiFetch<ActivityDataListResponse>(
    `/activity-data${query ? `?${query}` : ''}`,
  );
}

export async function getActivityDataById(id: string) {
  return apiFetch<ActivityDataItem>(`/activity-data/${id}`);
}
export async function updateActivityData(
  id: string,
  input: ActivityDataInput,
) {
  if (isDemoMode()) {
    return {
      id,
      organizationId: 'demo-org',
      ...buildActivityDataPayload(input),
      createdAt: '2026-03-31T14:10:00.000Z',
      updatedAt: new Date().toISOString(),
    };
  }

  const payload = buildActivityDataPayload(input);

  return apiFetch<ActivityDataItem>(`/activity-data/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteActivityData(id: string) {
  if (isDemoMode()) return;

  return apiFetch<void>(`/activity-data/${id}`, {
    method: 'DELETE',
  });
}
