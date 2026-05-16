import { getToken, handleUnauthorized } from './auth';
import { buildApiUrl } from '../config/api';

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const token = getToken();
  const isFormData = options?.body instanceof FormData;

  const response = await fetch(buildApiUrl(path), {
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
    throw new Error(`API ${response.status}: ${text}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
