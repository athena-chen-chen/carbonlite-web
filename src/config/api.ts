export const FALLBACK_API_BASE_URL = 'http://localhost:3333/api';
export const MAX_API_PAGE_SIZE = 100;

export function getApiBaseUrl(env: ImportMetaEnv = import.meta.env) {
  return (env.VITE_API_BASE_URL || FALLBACK_API_BASE_URL).replace(/\/+$/, '');
}

export const API_BASE_URL = getApiBaseUrl();

export function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export function getApiOrigin() {
  return API_BASE_URL.replace(/\/api\/?$/, '');
}

export function clampApiPageSize(requestedPageSize?: number, fallback = 20) {
  const pageSize = Number(requestedPageSize ?? fallback);
  const normalizedPageSize = Number.isFinite(pageSize) && pageSize > 0
    ? pageSize
    : fallback;

  return Math.min(normalizedPageSize, MAX_API_PAGE_SIZE);
}

if (import.meta.env.DEV) {
  console.info('[CarbonLite API] API_BASE_URL', API_BASE_URL);
}
