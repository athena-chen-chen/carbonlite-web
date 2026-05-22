import { apiFetch } from './api';
import { clampApiPageSize } from '../config/api';

export type ConversionFactorInput = {
  name: string;
  type: string;
  activityType?: string;
  region?: string;
  country?: string;
  unit: string;
  factorValue: number;
  resultUnit: string;
  sourceName?: string;
  sourceReference?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  isDefault?: boolean;
};

export type ConversionFactorItem = {
  id: string;
  organizationId?: string | null;
  name: string;
  type: string;
  activityType?: string | null;
  region?: string | null;
  country?: string | null;
  unit: string;
  factorValue: string | number;
  resultUnit: string;
  sourceName?: string | null;
  sourceReference?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  isDefault: boolean;
  isSystemDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ConversionFactorListResponse = {
  items: ConversionFactorItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export async function createConversionFactor(input: ConversionFactorInput) {
  return apiFetch<ConversionFactorItem>('/conversion-factors', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getConversionFactors(params?: {
  page?: number;
  pageSize?: number;
  type?: string;
  activityType?: string;
  search?: string;
}) {
  const searchParams = new URLSearchParams();
  const safePageSize = params?.pageSize
    ? clampApiPageSize(params.pageSize)
    : undefined;

  if (params?.page) searchParams.set('page', String(params.page));
  if (safePageSize) searchParams.set('pageSize', String(safePageSize));
  if (params?.type) searchParams.set('type', params.type);
  if (params?.activityType) searchParams.set('activityType', params.activityType);
  if (params?.search) searchParams.set('search', params.search);

  const query = searchParams.toString();
  return apiFetch<ConversionFactorListResponse>(
    `/conversion-factors${query ? `?${query}` : ''}`,
  );
}

export async function getConversionFactorById(id: string) {
  return apiFetch<ConversionFactorItem>(`/conversion-factors/${id}`);
}

export async function deleteConversionFactor(id: string) {
  return apiFetch<{ id: string } | ConversionFactorItem>(
    `/conversion-factors/${id}`,
    {
      method: 'DELETE',
    },
  );
}
export async function updateConversionFactor(
  id: string,
  input: Partial<ConversionFactorInput>,
) {
  return apiFetch<ConversionFactorItem>(`/conversion-factors/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
