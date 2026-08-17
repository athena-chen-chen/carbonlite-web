import { getToken, handleUnauthorized } from './auth';
import { buildApiUrl } from '../config/api';
import { captureFrontendException } from '../sentry';
import { getUserFriendlyErrorMessage } from '../utils/userFriendlyErrors';

export type ApiErrorCode =
  | 'FILE_MISSING'
  | 'EXTRACTION_NOT_FOUND'
  | 'EXTRACTION_FAILED'
  | 'TIMEOUT'
  | 'PAGE_SIZE_TOO_LARGE'
  | 'MISSING_UNIT'
  | 'MISSING_QUANTITY'
  | 'MISSING_ACTIVITY_TYPE'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'SERVER_ERROR'
  | 'REQUEST_FAILED';

function parseApiErrorBody(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractBackendMessage(text: string, parsedBody: unknown) {
  let message: unknown = text;

  if (parsedBody && typeof parsedBody === 'object') {
    const parsed = parsedBody as Record<string, unknown>;
    message = parsed.message ?? parsed.error ?? text;
  }

  return Array.isArray(message) ? message.join(', ') : String(message);
}

function getApiErrorCode(
  status: number,
  path: string,
  backendMessage: string,
): ApiErrorCode {
  const lowerMessage = backendMessage.toLowerCase();
  const lowerPath = path.toLowerCase();

  if (/file is no longer available|file.*missing|uploaded file.*available/i.test(backendMessage)) {
    return 'FILE_MISSING';
  }

  if (status === 404 && lowerPath.includes('/document-extraction/')) {
    return 'EXTRACTION_NOT_FOUND';
  }

  if (status >= 500 && lowerPath.includes('/document-extraction')) {
    return 'EXTRACTION_FAILED';
  }

  if (status === 400 && lowerMessage.includes('pagesize')) {
    return 'PAGE_SIZE_TOO_LARGE';
  }

  if (status === 400 && /\bunit\b.*required|required.*\bunit\b/.test(lowerMessage)) {
    return 'MISSING_UNIT';
  }

  if (status === 400 && /\bquantity\b.*required|required.*\bquantity\b/.test(lowerMessage)) {
    return 'MISSING_QUANTITY';
  }

  if (
    status === 400 &&
    /activity\s*type.*required|required.*activity\s*type|activitytype.*required|required.*activitytype/.test(
      lowerMessage,
    )
  ) {
    return 'MISSING_ACTIVITY_TYPE';
  }

  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status >= 500) return 'SERVER_ERROR';

  return 'REQUEST_FAILED';
}

function getFriendlyApiErrorMessage(code: ApiErrorCode) {
  switch (code) {
    case 'FILE_MISSING':
      return 'The original file is no longer available. Please upload it again.';
    case 'EXTRACTION_NOT_FOUND':
      return 'Preview data is no longer available. Please extract the document again.';
    case 'EXTRACTION_FAILED':
      return getUserFriendlyErrorMessage(null, 'dataExtraction');
    case 'TIMEOUT':
      return 'The request took too long. Please try again.';
    case 'PAGE_SIZE_TOO_LARGE':
      return 'Too many records were requested. Please refresh and try again.';
    case 'MISSING_UNIT':
      return 'Unit is required.';
    case 'MISSING_QUANTITY':
      return 'Quantity is required.';
    case 'MISSING_ACTIVITY_TYPE':
      return 'Activity type is required.';
    case 'UNAUTHORIZED':
      return 'Your session has expired. Please sign in again.';
    case 'FORBIDDEN':
      return 'You do not have permission to perform this action.';
    case 'NOT_FOUND':
      return 'The requested information is no longer available.';
    case 'SERVER_ERROR':
      return 'Something went wrong while processing your request. Please try again. If the issue continues, contact support.';
    default:
      return getUserFriendlyErrorMessage(null, 'unknown');
  }
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly data: unknown,
    public readonly code: ApiErrorCode,
    public readonly technicalMessage?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const token = getToken();
  const isFormData = options?.body instanceof FormData;
  const url = buildApiUrl(path);

  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options?.headers ?? {}),
      },
      ...options,
    });
  } catch (error) {
    const isTimeout =
      error instanceof DOMException && error.name === 'AbortError';
    const apiError = new ApiError(
      0,
      getFriendlyApiErrorMessage(isTimeout ? 'TIMEOUT' : 'REQUEST_FAILED'),
      null,
      isTimeout ? 'TIMEOUT' : 'REQUEST_FAILED',
      error instanceof Error ? error.message : String(error),
    );
    captureFrontendException(apiError, {
      path,
      code: apiError.code,
      technicalMessage: apiError.technicalMessage,
    });
    throw apiError;
  }

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
    }

    const text = await response.text();
    const parsedBody = parseApiErrorBody(text);
    const backendMessage = extractBackendMessage(text, parsedBody);
    const code = getApiErrorCode(response.status, path, backendMessage);
    const apiError = new ApiError(
      response.status,
      getFriendlyApiErrorMessage(code),
      parsedBody,
      code,
      backendMessage,
    );

    if (response.status >= 500 || code === 'EXTRACTION_FAILED') {
      captureFrontendException(apiError, {
        path,
        status: response.status,
        code,
        technicalMessage: backendMessage,
      });
    }

    throw apiError;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
