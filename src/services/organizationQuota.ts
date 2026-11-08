import { apiFetch } from './api';

export type OrganizationQuotaStatus = {
  enabled: boolean;
  period: { startsAt: string; endsAt: string } | null;
  uploads: {
    periodLimit: number;
    periodUsed: number;
    periodRemaining: number;
    dailyLimit: number;
    dailyUsed: number;
    dailyRemaining: number;
    maxFileSizeBytes: number;
  };
  extraction: {
    concurrentLimit: number;
    running: number;
    remaining: number;
  };
  importRows: { limit: number };
};

export function getOrganizationQuotaStatus() {
  return apiFetch<OrganizationQuotaStatus>('/organization-quota');
}
