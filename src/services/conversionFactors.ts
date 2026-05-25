import { apiFetch } from './api';
import { clampApiPageSize } from '../config/api';

export type ConversionFactorInput = {
  name: string;
  type: string;
  activityType?: string;
  region?: string;
  country?: string;
  inputUnit?: string;
  unit: string;
  factorValue: number;
  resultUnit: string;
  sourceName?: string;
  sourceReference?: string;
  sourceAuthority?: string;
  sourceDocument?: string;
  sourceYear?: number;
  sourceUrl?: string;
  methodology?: string;
  confidenceLevel?: string;
  verified?: boolean;
  notes?: string;
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
  inputUnit?: string | null;
  unit: string;
  factorValue: string | number;
  resultUnit: string;
  sourceName?: string | null;
  sourceReference?: string | null;
  sourceAuthority?: string | null;
  sourceDocument?: string | null;
  sourceYear?: number | null;
  sourceUrl?: string | null;
  methodology?: string | null;
  confidenceLevel?: string | null;
  verified?: boolean | null;
  notes?: string | null;
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

export async function getAllConversionFactors(params?: {
  type?: string;
  activityType?: string;
  search?: string;
}) {
  const firstPage = await getConversionFactors({
    ...params,
    page: 1,
    pageSize: 100,
  });
  const totalPages = Math.max(1, Number(firstPage.totalPages ?? 1));
  const items = [...(firstPage.items ?? [])];

  for (let page = 2; page <= totalPages; page += 1) {
    const nextPage = await getConversionFactors({
      ...params,
      page,
      pageSize: 100,
    });

    items.push(...(nextPage.items ?? []));
  }

  return items;
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
