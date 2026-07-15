import { apiFetch } from './api';
import { clampApiPageSize } from '../config/api';
import {
  PILOT_SUPPORTED_PROVINCES,
  getPilotProvinceCode,
  normalizeProvince,
} from '../utils/province';

export type ConversionFactorInput = {
  name: string;
  type: string;
  activityType?: string;
  jurisdiction?: string;
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
  verificationStatus?: string;
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
  jurisdiction?: string | null;
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
  verificationStatus?: string | null;
  verified?: boolean | null;
  notes?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  isDefault: boolean;
  isSystemDefault: boolean;
  defaultScope?: string | null;
  scope?: string | null;
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

const PILOT_ELECTRICITY_FACTOR_VALUES: Record<string, number> = {
  AB: 0.52,
  BC: 0.012,
  ON: 0.03,
};

const PILOT_ELECTRICITY_FACTORS: ConversionFactorItem[] = PILOT_SUPPORTED_PROVINCES.map(
  (province) => ({
    id: `pilot-electricity-${province.code.toLowerCase()}-2026`,
    organizationId: null,
    name: `Electricity - ${province.name} - 2026`,
    type: 'EMISSION',
    activityType: 'ELECTRICITY',
    jurisdiction: `${province.name}, Canada`,
    region: province.name,
    country: 'Canada',
    inputUnit: 'kWh',
    unit: 'kWh',
    factorValue: PILOT_ELECTRICITY_FACTOR_VALUES[province.code],
    resultUnit: 'kgCO2e',
    sourceName: 'CarbonLite Pilot Electricity Factors',
    sourceReference: `CarbonLite pilot ${province.code} electricity factor`,
    sourceAuthority: 'CarbonLite',
    sourceDocument: 'CarbonLite Pilot Electricity Factors 2026',
    sourceYear: 2026,
    sourceUrl: '/methodology/default-factors',
    methodology:
      'Demo factor for current CarbonLite pilot workflows. Replace with verified official provincial electricity factors before formal reporting.',
    confidenceLevel: 'Demo Factor',
    verificationStatus: 'Pilot Demo',
    verified: true,
    notes: 'Current pilot coverage supports AB, BC, and ON only.',
    isDefault: true,
    isSystemDefault: true,
    defaultScope: 'SCOPE_2',
    scope: 'SCOPE_2',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }),
);

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
  jurisdiction?: string;
  sourceYear?: number;
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
  if (params?.jurisdiction) searchParams.set('jurisdiction', params.jurisdiction);
  if (params?.sourceYear) searchParams.set('sourceYear', String(params.sourceYear));
  if (params?.search) searchParams.set('search', params.search);

  const query = searchParams.toString();
  const response = await apiFetch<ConversionFactorListResponse>(
    `/conversion-factors${query ? `?${query}` : ''}`,
  );

  return withPilotElectricityFactors(response, params);
}

function withPilotElectricityFactors(
  response: ConversionFactorListResponse,
  params?: {
    activityType?: string;
    jurisdiction?: string;
    sourceYear?: number;
    search?: string;
  },
): ConversionFactorListResponse {
  const items = response.items ?? [];
  const pilotFactors = getPilotElectricityFactorsForParams(params).filter(
    (pilotFactor) => !items.some((item) => isSameElectricityRegionFactor(item, pilotFactor)),
  );

  if (pilotFactors.length === 0) return response;

  const nextItems = [...items, ...pilotFactors];

  return {
    ...response,
    items: nextItems,
    total: Math.max(Number(response.total ?? 0), nextItems.length),
    totalPages: Math.max(1, Number(response.totalPages ?? 1)),
  };
}

function getPilotElectricityFactorsForParams(params?: {
  activityType?: string;
  jurisdiction?: string;
  sourceYear?: number;
  search?: string;
}) {
  const activityType = String(params?.activityType ?? '').trim().toUpperCase();
  if (activityType && activityType !== 'ELECTRICITY') return [];

  if (params?.sourceYear && params.sourceYear !== 2026) return [];

  const jurisdictionFilter = String(params?.jurisdiction ?? params?.search ?? '').trim();
  if (!jurisdictionFilter) return PILOT_ELECTRICITY_FACTORS;

  const normalizedFilter = jurisdictionFilter.toLowerCase();
  const pilotCode = getPilotProvinceCode(jurisdictionFilter);

  return PILOT_ELECTRICITY_FACTORS.filter((factor) => {
    const factorProvince = normalizeProvince(factor.region ?? factor.jurisdiction);
    const factorCode = getPilotProvinceCode(factorProvince);

    return (
      (pilotCode && factorCode === pilotCode) ||
      String(factorProvince ?? '').toLowerCase().includes(normalizedFilter) ||
      String(factorCode ?? '').toLowerCase() === normalizedFilter
    );
  });
}

function isSameElectricityRegionFactor(
  item: ConversionFactorItem,
  pilotFactor: ConversionFactorItem,
) {
  const activityType = String(item.activityType ?? '').trim().toUpperCase();
  if (activityType !== 'ELECTRICITY') return false;

  return (
    getPilotProvinceCode(item.region ?? item.jurisdiction) ===
    getPilotProvinceCode(pilotFactor.region ?? pilotFactor.jurisdiction)
  );
}

export async function getAllConversionFactors(params?: {
  type?: string;
  activityType?: string;
  jurisdiction?: string;
  sourceYear?: number;
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
