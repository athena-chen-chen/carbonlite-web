import { getSupportEmail } from '../config/api';

export type FeedbackMailtoContext = {
  pagePath?: string;
  userEmail?: string | null;
  workspaceName?: string | null;
  accountType?: string | null;
  appVersion?: string | null;
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
    '',
    'My feedback / issue:',
    '',
    '',
    'Thanks.',
  ].join('\n');

  return `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function formatContextValue(value?: string | null) {
  return value && value.trim() ? value.trim() : 'Not available';
}
