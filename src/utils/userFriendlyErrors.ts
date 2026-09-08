import { getSupportEmail } from '../config/api';

export type ErrorMessageContext =
  | 'fileUpload'
  | 'dataExtraction'
  | 'draftRecordReview'
  | 'confirmImport'
  | 'activityRecords'
  | 'factorMatching'
  | 'conversionFactors'
  | 'organizationProfile'
  | 'calculationReview'
  | 'reportGeneration'
  | 'csvExport'
  | 'pdfExport'
  | 'feedbackSubmission'
  | 'login'
  | 'passwordReset'
  | 'inviteLink'
  | 'pageLoad'
  | 'permissionDenied'
  | 'pilotReviewerReadOnly'
  | 'network'
  | 'unknown';

function contactSupportMessage(prefix = 'Something went wrong. Please try again.') {
  return `${prefix} If the issue continues, contact ${getSupportEmail()}.`;
}

const contextMessages: Record<ErrorMessageContext, string> = {
  fileUpload: 'We could not upload this file. Please check the file type and try again.',
  dataExtraction: 'We could not extract data from this file. Please check the file format or try uploading it again.',
  draftRecordReview: 'We could not update the draft records. Please review the records and try again.',
  confirmImport: 'We could not import the selected records. Please review the records and try again.',
  activityRecords: 'We could not update activity records. Please refresh the page and try again.',
  factorMatching: 'Some records could not be matched to emission factors. Please review the highlighted records.',
  conversionFactors: 'We could not update conversion factors. Please refresh the page and try again.',
  organizationProfile:
    'Organization profile could not be saved. Please try again.',
  calculationReview: 'We could not load the calculation review. Please refresh the page and try again.',
  reportGeneration: 'We could not generate the report. Please try again after confirming imported records are available.',
  csvExport: 'We could not export the CSV file. Please try again.',
  pdfExport: 'We could not generate the PDF report. Please try again.',
  feedbackSubmission:
    'Your feedback could not be submitted right now. Please try again or contact hello@carbonliteapp.ca.',
  login: 'We could not sign you in. Please check your email and password and try again.',
  passwordReset: 'We could not process this password reset request. Please request a new reset link.',
  inviteLink: 'This invite link is invalid or has expired. Please contact CarbonLite support for a new link.',
  pageLoad:
    'Something went wrong while loading this page. Please refresh the page or contact hello@carbonliteapp.ca if the issue continues.',
  permissionDenied: 'You do not have permission to perform this action.',
  pilotReviewerReadOnly: 'This account is read-only for pilot review. Editing actions are disabled.',
  network: 'CarbonLite could not connect to the server. Please check your connection and try again.',
  unknown: contactSupportMessage(),
};

const unsafeErrorPatterns = [
  /internal\s+server\s+error/i,
  /unhandled\s+runtime\s+error/i,
  /render\/internal\s+server\s+details/i,
  /prisma/i,
  /\bP20\d{2}\b/,
  /database/i,
  /database_url/i,
  /\bsql\b/i,
  /foreign\s+key/i,
  /constraint/i,
  /jwt_secret|authorization\s*:/i,
  /stack\s*trace/i,
  /typeerror:|referenceerror:|syntaxerror:/i,
  /cannot\s+read\s+properties\s+of\s+(undefined|null)/i,
  /\bat\s+\S+\s*\(.+:\d+:\d+\)/i,
  /\/api\/[^\s]+/i,
  /\/users\/|\/var\/|\/tmp\/|c:\\\\/i,
  /access[_-]?token|reset[_-]?token|invite[_-]?token|token=|bearer\s+[a-z0-9._-]+|jwt/i,
  /\b[a-z0-9]{20,}\b/i,
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
  /\b(undefined|null|nan)\b/i,
  /not\s+authorized\s+to\s+read\s+feedback/i,
  /econnrefused|enotfound|etimedout/i,
];

const safeValidationPatterns = [
  /\brequired\b/i,
  /please enter a valid/i,
  /must be greater than/i,
  /unsupported file type/i,
  /file.*too large|payload too large/i,
  /province.*required/i,
  /unit is required/i,
  /quantity is required/i,
  /activity type is required/i,
];

export function getFriendlyErrorMessage(
  error: unknown,
  fallback: ErrorMessageContext | string = 'unknown',
) {
  if (isErrorMessageContext(fallback)) {
    return getUserFriendlyErrorMessage(error, fallback);
  }

  const sanitized = sanitizeErrorMessage(getRawErrorMessage(error));
  return sanitized || fallback || contextMessages.unknown;
}

export function getUserFriendlyErrorMessage(
  error: unknown,
  context: ErrorMessageContext = 'unknown',
) {
  if (context === 'pilotReviewerReadOnly') return contextMessages.pilotReviewerReadOnly;

  const rawMessage = getRawErrorMessage(error);
  const sanitizedMessage = sanitizeErrorMessage(rawMessage);
  const normalized = rawMessage.toLowerCase();

  if (!rawMessage || !sanitizedMessage) {
    return getContextFallback(context);
  }

  if (/network|failed\s+to\s+fetch|load\s+failed|connection/i.test(rawMessage)) {
    return contextMessages.network;
  }

  if (/session.*expired|unauthorized|401/i.test(rawMessage)) {
    return 'Your session has expired. Please sign in again.';
  }

  if (/invite link.*already.*used/i.test(rawMessage)) {
    return 'This invite link has already been used. Please log in or contact hello@carbonliteapp.ca.';
  }

  if (/invite link.*expired|invite link.*invalid/i.test(rawMessage)) {
    return contextMessages.inviteLink;
  }

  if (/pilot|read-only|read only|reviewer/i.test(rawMessage) && /read-only|read only|disabled/i.test(rawMessage)) {
    return contextMessages.pilotReviewerReadOnly;
  }

  if (/forbidden|permission|not authorized|403/i.test(rawMessage)) {
    if (/pilot|read-only|read only|reviewer/i.test(rawMessage)) {
      return contextMessages.pilotReviewerReadOnly;
    }
    return contextMessages.permissionDenied;
  }

  if (/unsupported file type/i.test(rawMessage)) {
    return 'Unsupported file type. Please upload an Excel, CSV, or PDF file.';
  }

  if (/file.*too large|payload too large|413/.test(normalized)) {
    return 'This file is too large to upload. Please try a smaller file.';
  }

  if (
    context === 'dataExtraction' &&
    /document could not be processed|extraction failed|extract data/i.test(rawMessage)
  ) {
    return contextMessages.dataExtraction;
  }

  if (
    context === 'confirmImport' &&
    /import failed|could not import|failed to import/i.test(rawMessage)
  ) {
    return contextMessages.confirmImport;
  }

  if (
    context === 'reportGeneration' &&
    /report generation failed|could not generate|failed to generate/i.test(rawMessage)
  ) {
    return contextMessages.reportGeneration;
  }

  if (context === 'feedbackSubmission') {
    return contextMessages.feedbackSubmission;
  }

  return sanitizedMessage;
}

export function isUnsafeErrorMessage(message: string) {
  const trimmed = message.trim();
  if (!trimmed) return true;
  if (safeValidationPatterns.some((pattern) => pattern.test(trimmed)) && !hasSensitiveMarker(trimmed)) {
    return false;
  }
  return unsafeErrorPatterns.some((pattern) => pattern.test(trimmed));
}

export const isSensitiveErrorMessage = isUnsafeErrorMessage;

export function sanitizeErrorMessage(message: string) {
  const trimmed = String(message ?? '').trim();
  if (!trimmed || isUnsafeErrorMessage(trimmed)) return '';
  return trimmed;
}

function getContextFallback(context: ErrorMessageContext) {
  return contextMessages[context] || contextMessages.unknown;
}

function isErrorMessageContext(value: string): value is ErrorMessageContext {
  return Object.prototype.hasOwnProperty.call(contextMessages, value);
}

function hasSensitiveMarker(message: string) {
  return unsafeErrorPatterns.some((pattern) => pattern.test(message));
}

function getRawErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const candidate = record.message ?? record.error;
    if (typeof candidate === 'string') return candidate;
  }
  return '';
}
