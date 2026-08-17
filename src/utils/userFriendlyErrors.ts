export type ErrorMessageContext =
  | 'fileUpload'
  | 'dataExtraction'
  | 'draftRecordReview'
  | 'confirmImport'
  | 'activityRecords'
  | 'factorMatching'
  | 'conversionFactors'
  | 'calculationReview'
  | 'reportGeneration'
  | 'csvExport'
  | 'pdfExport'
  | 'feedbackSubmission'
  | 'login'
  | 'permissionDenied'
  | 'network'
  | 'unknown';

const contextMessages: Record<ErrorMessageContext, string> = {
  fileUpload: 'We could not upload this file. Please check the file type and try again.',
  dataExtraction: 'We could not extract data from this file. Please check the file format or try uploading it again.',
  draftRecordReview: 'We could not update the draft records. Please review the records and try again.',
  confirmImport: 'We could not import the selected records. Please review the records and try again.',
  activityRecords: 'We could not update activity records. Please refresh the page and try again.',
  factorMatching: 'Some records could not be matched to emission factors. Please review the highlighted records.',
  conversionFactors: 'We could not update conversion factors. Please refresh the page and try again.',
  calculationReview: 'We could not load the calculation review. Please refresh the page and try again.',
  reportGeneration: 'We could not generate the report. Please try again after confirming imported records are available.',
  csvExport: 'We could not export the CSV file. Please try again.',
  pdfExport: 'We could not generate the PDF report. Please try again.',
  feedbackSubmission: 'Your feedback could not be submitted. Please try again or contact support.',
  login: 'Invalid login. Please check your email and password.',
  permissionDenied: 'You do not have permission to perform this action.',
  network: 'Unable to connect to the server. Please check your connection and try again.',
  unknown: 'Something went wrong. Please try again. If the issue continues, contact support.',
};

const unsafeErrorPatterns = [
  /internal\s+server\s+error/i,
  /prisma/i,
  /database/i,
  /\bsql\b/i,
  /foreign\s+key/i,
  /constraint/i,
  /stack\s*trace/i,
  /\bat\s+\S+\s*\(.+:\d+:\d+\)/i,
  /\/api\/[^\s]+/i,
  /\/users\/|\/var\/|\/tmp\/|c:\\\\/i,
  /access[_-]?token|bearer\s+[a-z0-9._-]+|jwt/i,
  /\b[a-z0-9]{20,}\b/i,
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
  /\b(undefined|null|nan)\b/i,
  /not\s+authorized\s+to\s+read\s+feedback/i,
];

export function getUserFriendlyErrorMessage(
  error: unknown,
  context: ErrorMessageContext = 'unknown',
) {
  if (context === 'permissionDenied') return contextMessages.permissionDenied;

  const rawMessage = getRawErrorMessage(error);
  const normalized = rawMessage.toLowerCase();

  if (!rawMessage || isUnsafeErrorMessage(rawMessage)) {
    return getContextFallback(context);
  }

  if (/network|failed\s+to\s+fetch|load\s+failed|connection/i.test(rawMessage)) {
    return contextMessages.network;
  }

  if (/session.*expired|unauthorized|401/i.test(rawMessage)) {
    return 'Your session has expired. Please sign in again.';
  }

  if (/forbidden|permission|not authorized|403/i.test(rawMessage)) {
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

  return rawMessage;
}

export function isUnsafeErrorMessage(message: string) {
  const trimmed = message.trim();
  if (!trimmed) return true;
  return unsafeErrorPatterns.some((pattern) => pattern.test(trimmed));
}

function getContextFallback(context: ErrorMessageContext) {
  return contextMessages[context] || contextMessages.unknown;
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
