import { getToken, handleUnauthorized } from './auth';
import { buildApiUrl } from '../config/api';

function parseApiErrorBody(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function buildApiErrorMessage(status: number, text: string, parsedBody: unknown) {
  let message = text;

  if (parsedBody && typeof parsedBody === 'object') {
    const parsed = parsedBody as Record<string, unknown>;
    message = parsed.message ?? parsed.error ?? text;
  }

  const normalizedMessage = Array.isArray(message) ? message.join(', ') : String(message);
  const lowerText = text.toLowerCase();

  if (status === 400 && lowerText.includes('pagesize')) {
    return 'API 400: Page size is too large. Please refresh and try again.';
  }

  return `API ${status}: ${normalizedMessage}`;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly data: unknown,
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

  const response = await fetch(url, {
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
    }

    const text = await response.text();
    const parsedBody = parseApiErrorBody(text);
    throw new ApiError(
      response.status,
      buildApiErrorMessage(response.status, text, parsedBody),
      parsedBody,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
