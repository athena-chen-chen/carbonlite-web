import { apiFetch } from './api';

export type FactorVersionStatus =
  | 'DRAFT'
  | 'VERIFIED'
  | 'OFFICIAL'
  | 'DEPRECATED'
  | 'ARCHIVED';

export type FactorVersion = {
  id: string;
  factorId: string;
  displayName?: string | null;
  isSystem?: boolean | null;
  version: string;
  factorValue: number;
  inputUnit: string;
  resultUnit: string;
  jurisdictionCountry?: string | null;
  jurisdictionRegion?: string | null;
  factorYear?: number | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  status: FactorVersionStatus;
  confidenceLevel: string;
  methodology?: string | null;
  verificationStatus?: string | null;
  verified: boolean;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  approvalSource?: string | null;
  sourcePage?: string | null;
  sourceSection?: string | null;
  sourceTable?: string | null;
  sourceRow?: string | null;
  sourceColumn?: string | null;
  citationText?: string | null;
  notes?: string | null;
  source?: {
    id: string;
    sourceAuthority: string;
    sourceShortName?: string | null;
    sourceDocument: string;
    sourceVersion?: string | null;
    sourceYear: number;
    sourceUrl?: string | null;
    publishedDate?: string | null;
    page?: string | null;
    tableReference?: string | null;
    isOfficial: boolean;
    isActive: boolean;
    publisherType: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type FactorVersionsResponse = {
  items: FactorVersion[];
  total: number;
  currentActiveVersion?: FactorVersion | null;
};

export type FactorHistoryResponse = {
  items: Array<{
    id: string;
    factorId: string;
    factorVersionId?: string | null;
    oldFactorVersionId?: string | null;
    newFactorVersionId?: string | null;
    action: string;
    reason?: string | null;
    changedBy?: string | null;
    createdAt: string;
  }>;
  total: number;
};

export type FactorVersionUsage = {
  reportsUsingThisFactor: number;
  activityRecordsUsingThisFactor: number;
  calculations: number;
  organizations: number;
  recentCalculations: Array<{
    id: string;
    organizationId: string;
    activityDataId?: string | null;
    metricType: string;
    calculationDate: string;
  }>;
};

export function getFactorVersions(factorId: string, includeArchived = true) {
  const query = includeArchived ? '' : '?includeArchived=false';
  return apiFetch<FactorVersionsResponse>(`/factors/${factorId}/versions${query}`);
}

export function getFactorVersion(versionId: string) {
  return apiFetch<FactorVersion>(`/factor-versions/${versionId}`);
}

export function getFactorVersionUsage(versionId: string) {
  return apiFetch<FactorVersionUsage>(`/factor-versions/${versionId}/usage`);
}

export function getFactorHistory(factorId: string) {
  return apiFetch<FactorHistoryResponse>(`/factors/${factorId}/history`);
}

export function createFactorVersion(
  factorId: string,
  input: Partial<FactorVersion> & { reason?: string },
) {
  return apiFetch<FactorVersion>(`/factors/${factorId}/versions`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateDraftFactorVersion(
  versionId: string,
  input: Partial<FactorVersion> & { reason?: string },
) {
  return apiFetch<FactorVersion>(`/factor-versions/${versionId}/draft`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function verifyFactorVersion(
  versionId: string,
  input: { reason?: string; reviewNotes?: string; approvalSource?: string } = {},
) {
  return apiFetch<FactorVersion>(`/factor-versions/${versionId}/verify`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function deprecateFactorVersion(versionId: string, reason?: string) {
  return apiFetch<FactorVersion>(`/factor-versions/${versionId}/deprecate`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function archiveFactorVersion(versionId: string, reason?: string) {
  return apiFetch<FactorVersion>(`/factor-versions/${versionId}/archive`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}
