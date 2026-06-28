import { apiFetch } from './api';

export type PublisherType =
  | 'GOVERNMENT'
  | 'INDUSTRY_BODY'
  | 'STANDARD_BODY'
  | 'COMPANY'
  | 'CUSTOM'
  | 'UNKNOWN';

export type FactorSource = {
  id: string;
  sourceAuthority: string;
  sourceShortName?: string | null;
  sourceDocument: string;
  sourceVersion?: string | null;
  sourceYear: number;
  sourceUrl?: string | null;
  country?: string | null;
  jurisdictionRegion?: string | null;
  publisherType: PublisherType;
  description?: string | null;
  notes?: string | null;
  isOfficial: boolean;
  isActive: boolean;
  trustLabel: string;
  usedByFactors: number;
  linkedFactorVersions?: Array<{
    id: string;
    factorName?: string | null;
    activityType?: string | null;
    version: string;
    factorYear?: number | null;
    status: string;
    confidenceLevel: string;
  }>;
};

export type FactorSourcesResponse = {
  items: FactorSource[];
  total: number;
};

export function getFactorSources(includeArchived = false) {
  const query = includeArchived ? '?includeArchived=true' : '';
  return apiFetch<FactorSourcesResponse>(`/factor-sources${query}`);
}

export function getFactorSource(id: string) {
  return apiFetch<FactorSource>(`/factor-sources/${id}`);
}

export function archiveFactorSource(id: string) {
  return apiFetch<{
    archived: boolean;
    deleted: boolean;
    usedByFactors: number;
    source?: FactorSource;
  }>(`/factor-sources/${id}`, {
    method: 'DELETE',
  });
}
