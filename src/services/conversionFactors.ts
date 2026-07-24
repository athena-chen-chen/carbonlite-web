import { apiFetch } from './api';
import { clampApiPageSize } from '../config/api';
import {
  PILOT_SUPPORTED_PROVINCES,
  getPilotProvinceCode,
  normalizeProvince,
} from '../utils/province';
import { normalizeActivityType } from '../utils/activityType';
import {
  canManageConversionFactors,
  getCurrentUser,
  getOrganizationId,
  requirePermission,
} from './auth';

export type ConversionFactorInput = {
  name: string;
  type: string;
  factorType?: 'SYSTEM' | 'CUSTOM';
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
  factorVersion?: string;
  assumptions?: string;
  isPilotEstimate?: boolean;
  consultantReviewRecommended?: boolean;
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
  factorType?: 'SYSTEM' | 'CUSTOM' | string | null;
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
  factorVersion?: string | null;
  assumptions?: string | null;
  isPilotEstimate?: boolean | null;
  consultantReviewRecommended?: boolean | null;
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
  AB: 0.53,
  BC: 0.02,
  ON: 0.12,
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
    sourceDocument: 'CarbonLite MVP Default Factors v1.0',
    sourceYear: 2026,
    sourceUrl: '/methodology/default-factors',
    factorVersion: 'v1.0',
    assumptions:
      'Pilot default electricity factor. Replace with official reviewed factor before formal reporting.',
    methodology:
      'Demo factor for current CarbonLite pilot workflows. Replace with verified official provincial electricity factors before formal reporting.',
    confidenceLevel: 'LOW',
    verificationStatus: 'INTERNAL_REVIEW_REQUIRED',
    isPilotEstimate: true,
    consultantReviewRecommended: true,
    verified: false,
    notes: 'Current pilot coverage supports AB, BC, and ON only.',
    isDefault: true,
    isSystemDefault: true,
    defaultScope: 'SCOPE_2',
    scope: 'SCOPE_2',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }),
);

const PILOT_GROUND_TRANSPORT_FACTOR: ConversionFactorItem = {
  id: 'pilot-ground-transport-canada-2025',
  organizationId: null,
  factorType: 'SYSTEM',
  name: 'Ground Transport - Canada - 2025',
  type: 'EMISSION',
  activityType: 'GROUND_TRANSPORT',
  jurisdiction: 'Canada - National',
  region: null,
  country: 'Canada',
  inputUnit: 'km',
  unit: 'km',
  factorValue: 0.2,
  resultUnit: 'kgCO2e',
  sourceName: 'CarbonLite Pilot Estimate',
  sourceReference: 'CarbonLite pilot ground transport estimate',
  sourceAuthority: 'CarbonLite',
  sourceDocument: 'CarbonLite Pilot Ground Transport Estimate 2025',
  sourceYear: 2025,
  sourceUrl: '/methodology/default-factors',
  factorVersion: 'v1.0',
  assumptions:
    'Pilot estimate for ground transport distance-based calculation. Consultant review recommended.',
  methodology:
    'Pilot estimate for taxi, rideshare, rental car, mileage, and local business travel distance. Internal review required before formal reporting.',
  confidenceLevel: 'LOW',
  verificationStatus: 'INTERNAL_REVIEW_REQUIRED',
  isPilotEstimate: true,
  consultantReviewRecommended: true,
  verified: false,
  notes:
    'Pilot estimate for Scope 3 ground transport. Replace with a reviewed factor before formal reporting.',
  isDefault: true,
  isSystemDefault: true,
  defaultScope: 'SCOPE_3',
  scope: 'SCOPE_3',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export async function createConversionFactor(input: ConversionFactorInput) {
  requirePermission(canManageConversionFactors(getCurrentUser()));

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

  return withPilotSystemFactors(filterConversionFactorsForCurrentCompany(response), params);
}

function filterConversionFactorsForCurrentCompany(
  response: ConversionFactorListResponse,
): ConversionFactorListResponse {
  const organizationId = getOrganizationId(getCurrentUser());
  if (!organizationId) return response;

  const items = (response.items ?? []).filter(
    (item) => !item.organizationId || item.organizationId === organizationId,
  );

  return {
    ...response,
    items,
    total: Math.min(Number(response.total ?? items.length), items.length),
    totalPages: Math.max(
      1,
      Math.ceil(
        items.length /
          Math.max(1, Number(response.pageSize ?? (items.length || 1))),
      ),
    ),
  };
}

function withPilotSystemFactors(
  response: ConversionFactorListResponse,
  params?: {
    activityType?: string;
    jurisdiction?: string;
    sourceYear?: number;
    search?: string;
  },
): ConversionFactorListResponse {
  const items = response.items ?? [];
  const pilotFactors = getPilotSystemFactorsForParams(params).filter(
    (pilotFactor) => !items.some((item) => isSamePilotSystemFactor(item, pilotFactor)),
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

function getPilotSystemFactorsForParams(params?: {
  activityType?: string;
  jurisdiction?: string;
  sourceYear?: number;
  search?: string;
}) {
  return [
    ...getPilotElectricityFactorsForParams(params),
    ...(matchesPilotGroundTransportParams(params) ? [PILOT_GROUND_TRANSPORT_FACTOR] : []),
  ];
}

function getPilotElectricityFactorsForParams(params?: {
  activityType?: string;
  jurisdiction?: string;
  sourceYear?: number;
  search?: string;
}) {
  const activityType = normalizeActivityType(params?.activityType);
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

function matchesPilotGroundTransportParams(params?: {
  activityType?: string;
  jurisdiction?: string;
  sourceYear?: number;
  search?: string;
}) {
  const activityType = normalizeActivityType(params?.activityType);
  if (activityType && activityType !== 'GROUND_TRANSPORT') return false;

  if (params?.sourceYear && params.sourceYear !== 2025) return false;

  const jurisdictionFilter = String(params?.jurisdiction ?? '').trim().toLowerCase();
  if (jurisdictionFilter) {
    return ['canada', 'canada - national', 'national', 'ca'].includes(jurisdictionFilter);
  }

  const searchFilter = String(params?.search ?? '').trim().toLowerCase();
  if (!searchFilter) return true;

  return [
    PILOT_GROUND_TRANSPORT_FACTOR.name,
    PILOT_GROUND_TRANSPORT_FACTOR.activityType,
    PILOT_GROUND_TRANSPORT_FACTOR.jurisdiction,
    PILOT_GROUND_TRANSPORT_FACTOR.country,
    PILOT_GROUND_TRANSPORT_FACTOR.sourceAuthority,
    PILOT_GROUND_TRANSPORT_FACTOR.confidenceLevel,
    PILOT_GROUND_TRANSPORT_FACTOR.verificationStatus,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(searchFilter));
}

function isSamePilotSystemFactor(
  item: ConversionFactorItem,
  pilotFactor: ConversionFactorItem,
) {
  const activityType = normalizeActivityType(item.activityType ?? item.name);
  const pilotActivityType = normalizeActivityType(pilotFactor.activityType ?? pilotFactor.name);
  if (activityType !== pilotActivityType) return false;

  if (pilotActivityType === 'ELECTRICITY') {
    return (
      getPilotProvinceCode(item.region ?? item.jurisdiction) ===
      getPilotProvinceCode(pilotFactor.region ?? pilotFactor.jurisdiction)
    );
  }

  return (
    String(item.inputUnit ?? item.unit ?? '').trim().toLowerCase() ===
      String(pilotFactor.inputUnit ?? pilotFactor.unit ?? '').trim().toLowerCase() &&
    Number(item.sourceYear ?? 0) === Number(pilotFactor.sourceYear ?? 0)
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
  const item = await apiFetch<ConversionFactorItem>(`/conversion-factors/${id}`);
  const organizationId = getOrganizationId(getCurrentUser());

  if (organizationId && item.organizationId && item.organizationId !== organizationId) {
    throw new Error('You do not have permission to perform this action.');
  }

  return item;
}

export async function deleteConversionFactor(id: string) {
  requirePermission(canManageConversionFactors(getCurrentUser()));

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
  requirePermission(canManageConversionFactors(getCurrentUser()));

  return apiFetch<ConversionFactorItem>(`/conversion-factors/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
