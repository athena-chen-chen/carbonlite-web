import { API_BASE_URL } from '../config/api';

const RUNTIME_KEY = 'cl_runtime_v1';
export function getRuntime() {
  try {
    const raw = localStorage.getItem(RUNTIME_KEY);
    return raw ? JSON.parse(raw) as { apiBaseUrl?: string; useMockApi?: boolean } : {};
  } catch { return {}; }
}
export const runtime = getRuntime();
export const RUNTIME_API_BASE_URL = runtime.apiBaseUrl || API_BASE_URL;
export const USE_MOCK = !!runtime.useMockApi;
