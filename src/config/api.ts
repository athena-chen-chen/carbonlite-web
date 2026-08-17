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

export type CarbonLiteAppEnv = 'local' | 'pilot' | 'production';

export function getAppEnv(env: Partial<ImportMetaEnv> = import.meta.env): CarbonLiteAppEnv {
  const appEnv = String(env.VITE_APP_ENV ?? '').trim().toLowerCase();

  if (appEnv === 'pilot' || appEnv === 'production') return appEnv;
  return 'local';
}

export function isDemoResetAvailable(env: Partial<ImportMetaEnv> = import.meta.env) {
  return getAppEnv(env) !== 'production';
}

export function isPublicSignupEnabled(env: Partial<ImportMetaEnv> = import.meta.env) {
  return getAppEnv(env) === 'local' && env.VITE_PUBLIC_SIGNUP_ENABLED === 'true';
}

export function getContactEmail(env: Partial<ImportMetaEnv> = import.meta.env) {
  const configuredEmail = String(env.VITE_CONTACT_EMAIL ?? '').trim();
  return configuredEmail || 'help@carbonliteapp.ca';
}

export function getSupportEmail(env: Partial<ImportMetaEnv> = import.meta.env) {
  const configuredEmail = String(env.VITE_SUPPORT_EMAIL ?? env.VITE_CONTACT_EMAIL ?? '').trim();
  return configuredEmail || 'hello@carbonliteapp.ca';
}
