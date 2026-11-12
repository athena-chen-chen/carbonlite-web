import { apiFetch } from './api';

export type OrganizationAiStatus = {
  enabled: boolean;
  status: 'NOT_CONFIGURED' | 'DISABLED' | 'ENABLED' | 'WITHDRAWN';
  provider: 'OPENAI';
  processingScope: 'DOCUMENT_EXTRACTION';
  effectiveAt: string | null;
  expiresAt: string | null;
  withdrawnAt: string | null;
};

export function getOrganizationAiStatus() {
  return apiFetch<OrganizationAiStatus>('/ai-authorization/status');
}
