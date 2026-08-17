import { apiFetch } from './api';
import { track } from './analytics.service';

export type FeedbackType = 'BUG' | 'SUGGESTION' | 'QUESTION' | 'OTHER';
export type FeedbackStatus =
  | 'NEW'
  | 'REVIEWED'
  | 'PLANNED'
  | 'RESOLVED'
  | 'DISMISSED'
  | 'CLOSED';

export type FeedbackSubmitter = {
  id?: string | null;
  email?: string | null;
  name?: string | null;
};

export type FeedbackOrganization = {
  id?: string | null;
  name?: string | null;
};

export type FeedbackItem = {
  id: string;
  type: FeedbackType;
  intent: string;
  message: string;
  email?: string | null;
  page?: string | null;
  url?: string | null;
  organizationId?: string | null;
  userId?: string | null;
  user?: FeedbackSubmitter | null;
  submitter?: FeedbackSubmitter | null;
  organization?: FeedbackOrganization | null;
  appVersion?: string | null;
  userAgent?: string | null;
  status: FeedbackStatus;
  createdAt: string;
};

export type CreateFeedbackInput = {
  type: FeedbackType;
  intent: string;
  message: string;
  email?: string;
  page?: string;
  url?: string;
  workspaceName?: string;
  accountType?: string;
  appVersion?: string;
};

export type FeedbackListResponse = {
  items: FeedbackItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export async function submitFeedback(input: CreateFeedbackInput) {
  const feedback = await apiFetch<FeedbackItem>('/feedback', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  track('FEEDBACK_SUBMITTED', {
    feedbackType: feedback.type,
    page: feedback.page,
  });

  return feedback;
}

export function getFeedbackList(status?: FeedbackStatus) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiFetch<FeedbackListResponse>(`/feedback${query}`);
}

export function updateFeedbackStatus(id: string, status: FeedbackStatus) {
  return apiFetch<FeedbackItem>(`/feedback/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function getAdminFeedbackList(status?: FeedbackStatus) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiFetch<FeedbackListResponse>(`/admin/feedback${query}`);
}

export function updateAdminFeedbackStatus(id: string, status: FeedbackStatus) {
  return apiFetch<FeedbackItem>(`/admin/feedback/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
