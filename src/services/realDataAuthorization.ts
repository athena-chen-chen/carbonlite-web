import { apiFetch } from './api';

export type RealDataAuthorizationStatus = {
  effectiveMode: 'SYNTHETIC_ONLY' | 'REAL_CUSTOMER_DATA';
  configuredStatus: 'NOT_CONFIGURED' | 'SYNTHETIC_ONLY' | 'REAL_DATA_APPROVED' | 'WITHDRAWN';
  policyVersion: string | null;
  effectiveAt: string | null;
  expiresAt: string | null;
  reviewDueAt: string | null;
  reason: string;
};

export function getRealDataAuthorizationStatus() {
  return apiFetch<RealDataAuthorizationStatus>('/real-data-authorization/status');
}
