export const FALLBACK_API_BASE_URL = 'http://localhost:3333/api';

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
