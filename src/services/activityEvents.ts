import { apiFetch } from './api';

export type ActivityEventMetadata = Record<string, unknown>;

export type ActivityEventItem = {
  id: string;
  organizationId?: string | null;
  userId?: string | null;
  eventName: string;
  page?: string | null;
  url?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: ActivityEventMetadata | null;
  userAgent?: string | null;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
};

export type ActivityEventQuery = {
  dateFrom?: string;
  dateTo?: string;
  eventName?: string;
  pagePath?: string;
  user?: string;
};

export type ActivityEventListResponse = {
  items: ActivityEventItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ActivityEventSummary = {
  activeUsers: number;
  documentsUploaded: number;
  extractionAttempts: number;
  successfulExtractions: number;
  reportsGenerated: number;
  pdfExports: number;
  feedbackSubmitted: number;
};

export type TrackActivityEventInput = {
  eventName: string;
  page?: string;
  url?: string;
  entityType?: string;
  entityId?: string;
  metadata?: ActivityEventMetadata;
};

function buildQuery(query: ActivityEventQuery) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  const suffix = params.toString();
  return suffix ? `?${suffix}` : '';
}

export function trackActivityEvent(input: TrackActivityEventInput) {
  return apiFetch<ActivityEventItem>('/activity-events', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getActivityEvents(query: ActivityEventQuery = {}) {
  return apiFetch<ActivityEventListResponse>(`/activity-events${buildQuery(query)}`);
}

export function getActivityEventSummary(query: ActivityEventQuery = {}) {
  return apiFetch<ActivityEventSummary>(`/activity-events/summary${buildQuery(query)}`);
}
