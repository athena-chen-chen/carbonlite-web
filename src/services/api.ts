import { getToken, handleUnauthorized } from './auth';
import { buildApiUrl } from '../config/api';

function buildApiErrorMessage(status: number, text: string) {
  const lowerText = text.toLowerCase();

  if (status === 400 && lowerText.includes('pagesize')) {
    return 'API 400: Page size is too large. Please refresh and try again.';
  }

  return `API ${status}: ${text}`;
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
    throw new Error(buildApiErrorMessage(response.status, text));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
