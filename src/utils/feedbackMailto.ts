import { getSupportEmail } from '../config/api';

export type FeedbackMailtoContext = {
  pagePath?: string;
  userEmail?: string | null;
  workspaceName?: string | null;
  accountType?: string | null;
  appVersion?: string | null;
  feedbackType?: string | null;
  message?: string | null;
  rating?: string | number | null;
  timestamp?: string;
};

export function buildFeedbackMailtoHref(context: FeedbackMailtoContext = {}) {
  const supportEmail = getSupportEmail();
  const subject = 'CarbonLite Pilot Feedback';
  const appVersion = context.appVersion || import.meta.env.VITE_APP_VERSION || 'Not available';
  const body = [
    'Hi CarbonLite team,',
    '',
    'I would like to share feedback about CarbonLite.',
    '',
    `Page: ${context.pagePath || 'Not available'}`,
    `User email: ${context.userEmail || 'Not provided'}`,
    `Workspace: ${context.workspaceName || 'Not available'}`,
    `Account type: ${formatContextValue(context.accountType)}`,
    `App version: ${appVersion}`,
    `Timestamp: ${context.timestamp || new Date().toISOString()}`,
    `Feedback type: ${formatContextValue(context.feedbackType)}`,
    `Rating: ${formatRating(context.rating)}`,
    '',
    'My feedback / issue:',
    '',
    context.message?.trim() || '',
    '',
    '',
    'Thanks.',
  ].join('\n');

  return `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function formatContextValue(value?: string | null) {
  return value && value.trim() ? value.trim() : 'Not available';
}

function formatRating(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return 'Not provided';
  return String(value);
}
