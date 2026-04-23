const RUNTIME_KEY = 'cl_runtime_v1';
export function getRuntime() {
  try {
    const raw = localStorage.getItem(RUNTIME_KEY);
    return raw ? JSON.parse(raw) as { apiBaseUrl?: string; useMockApi?: boolean } : {};
  } catch { return {}; }
}
export const runtime = getRuntime();
export const API_BASE_URL = runtime.apiBaseUrl || '/api';
export const USE_MOCK = !!runtime.useMockApi;
