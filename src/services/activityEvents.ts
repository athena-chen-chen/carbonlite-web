import { apiFetch } from './api';

export type ActivityEventMetadata = Record<string, unknown>;

export type ActivityEventItem = {
  id: string;
  organizationId?: string | null;
  organizationName?: string | null;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  eventName: string;
  activityType?: string | null;
  description?: string | null;
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
  activityType?: string;
  pagePath?: string;
  user?: string;
  organization?: string;
  organizationId?: string;
  hideTestAccounts?: boolean;
  page?: number;
  pageSize?: number;
};

export type ActivityEventListResponse = {
  items: ActivityEventItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ActivityEventSummary = {
  today?: number;
  thisWeek?: number;
  thisMonth?: number;
  activeUsers: number;
  organizations?: number;
  newUsers?: number;
  documentsUploaded: number;
  extractionAttempts: number;
  successfulExtractions: number;
  reportsGenerated: number;
  pdfExports: number;
  feedbackSubmitted: number;
};

export type ActiveUserItem = {
  userId: string;
  displayName?: string | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  organizationId?: string | null;
  organizationName?: string | null;
  activityCount: number;
  firstSeenAt?: string | null;
  lastActiveAt?: string | null;
  mostRecentActivityType?: string | null;
  isTestAccount?: boolean;
};

export type ActiveUsersResponse = {
  items: ActiveUserItem[];
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
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
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

export function getAdminActivityEvents(query: ActivityEventQuery = {}) {
  return apiFetch<ActivityEventListResponse>(`/admin/activity${buildQuery(query)}`);
}

export function getAdminActivityEventSummary(query: ActivityEventQuery = {}) {
  return apiFetch<ActivityEventSummary>(`/admin/activity/summary${buildQuery(query)}`);
}

export function getAdminActiveUsers(query: ActivityEventQuery = {}) {
  return apiFetch<ActiveUsersResponse>(`/admin/activity/active-users${buildQuery(query)}`);
}
