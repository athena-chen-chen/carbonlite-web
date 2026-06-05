import { apiFetch } from './api';

export type AuditLogItem = {
  id: string;
  organizationId?: string | null;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  description?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  page?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  organization?: {
    id: string;
    name: string;
  } | null;
};

export type AuditLogListResponse = {
  items: AuditLogItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type AuditLogQuery = {
  dateFrom?: string;
  dateTo?: string;
  action?: string;
  entityType?: string;
  search?: string;
};

export function getAuditLogs(query: AuditLogQuery = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiFetch<AuditLogListResponse>(`/audit-logs${suffix}`);
}

export function createClientAuditLog(input: {
  action: string;
  entityType: string;
  entityId?: string;
  description?: string;
  page?: string;
}) {
  return apiFetch<AuditLogItem>('/audit-logs/client-event', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
