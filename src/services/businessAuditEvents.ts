import { apiFetch } from './api';
import type { BusinessAuditEvent } from '../utils/businessAuditTrail';

export type BusinessAuditEventListResponse = {
  items: BusinessAuditEvent[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type CreateBusinessAuditEventInput = Omit<BusinessAuditEvent, 'id' | 'occurredAt'> & {
  id?: string;
  occurredAt?: string;
};

function buildQuery(params: Record<string, string | number | null | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

export async function trackBusinessAuditEvent(input: CreateBusinessAuditEventInput) {
  return apiFetch<BusinessAuditEvent>('/business-audit-events', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getBusinessAuditEvents(params: {
  organizationId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  activityDataId?: string | null;
  sourceDocumentId?: string | null;
  reportId?: string | null;
  page?: number;
  pageSize?: number;
} = {}) {
  return apiFetch<BusinessAuditEventListResponse>(
    `/business-audit-events${buildQuery({
      organizationId: params.organizationId,
      entityType: params.entityType,
      entityId: params.entityId,
      activityDataId: params.activityDataId,
      sourceDocumentId: params.sourceDocumentId,
      reportId: params.reportId,
      page: params.page,
      pageSize: params.pageSize,
    })}`,
  );
}

export async function getActivityDataBusinessAuditTrail(activityDataId: string) {
  return getBusinessAuditEvents({
    entityType: 'ACTIVITY_DATA',
    entityId: activityDataId,
    activityDataId,
  });
}
