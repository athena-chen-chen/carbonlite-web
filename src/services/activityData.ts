import { apiFetch } from './api';

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

export async function createActivityData(input: ActivityDataInput) {
  return apiFetch<ActivityDataItem>('/activity-data', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

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