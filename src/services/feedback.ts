import { apiFetch } from './api';
import { track } from './analytics.service';

export type FeedbackType = 'BUG' | 'SUGGESTION' | 'QUESTION' | 'OTHER';
export const FEEDBACK_EMAIL_VALIDATION_MESSAGE =
  'Please enter a valid email address.';
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
  const body = buildCreateFeedbackBody(input);
  const feedback = await apiFetch<FeedbackItem>('/feedback', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  track('FEEDBACK_SUBMITTED', {
    feedbackType: feedback.type,
    page: feedback.page,
  });

  return feedback;
}

function buildCreateFeedbackBody(input: CreateFeedbackInput) {
  const email = normalizeOptionalFeedbackEmail(input.email);

  return {
    type: input.type,
    intent: input.intent,
    message: appendFeedbackMetadata(input.message, input),
    ...(email ? { email } : {}),
    ...(input.page?.trim() ? { page: input.page.trim() } : {}),
    ...(input.url?.trim() ? { url: input.url.trim() } : {}),
  };
}

function appendFeedbackMetadata(message: string, input: CreateFeedbackInput) {
  const lines = [message.trim()];
  const existingMessage = message.toLowerCase();

  const metadata = [
    {
      label: 'Workspace',
      value: input.workspaceName,
    },
    {
      label: 'Account type',
      value: input.accountType,
    },
    {
      label: 'App version',
      value: input.appVersion,
    },
  ];

  const missingMetadataLines = metadata
    .filter((item) => item.value?.trim())
    .filter((item) => !existingMessage.includes(`${item.label.toLowerCase()}:`))
    .map((item) => `${item.label}: ${item.value?.trim()}`);

  if (missingMetadataLines.length > 0) {
    lines.push('', 'Feedback metadata:', ...missingMetadataLines);
  }

  return lines.join('\n');
}

function normalizeOptionalFeedbackEmail(email?: string) {
  const trimmed = email?.trim() ?? '';
  if (!trimmed) return undefined;

  if (!isValidFeedbackEmail(trimmed)) {
    throw new Error(FEEDBACK_EMAIL_VALIDATION_MESSAGE);
  }

  return trimmed.toLowerCase();
}

function isValidFeedbackEmail(email: string) {
  if (/[\s[\]()]/.test(email) || /mailto:/i.test(email)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
