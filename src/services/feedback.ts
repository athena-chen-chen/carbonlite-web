import { apiFetch } from './api';
import { track } from './analytics.service';

export type FeedbackType = 'BUG' | 'SUGGESTION' | 'QUESTION' | 'OTHER';
export type FeedbackStatus = 'NEW' | 'REVIEWED' | 'CLOSED';

export type FeedbackItem = {
  id: string;
  type: FeedbackType;
  intent: string;
  message: string;
  email?: string | null;
  page?: string | null;
  url?: string | null;
  organizationId: string;
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
