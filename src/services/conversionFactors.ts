import type { FactorGovernance } from '../utils/factorGovernance';
import { apiFetch } from './api';
import { clampApiPageSize } from '../config/api';
import {
  PILOT_SUPPORTED_PROVINCES,
  getPilotProvinceCode,
  normalizeProvince,
} from '../utils/province';
import { normalizeActivityType } from '../utils/activityType';
import { canManageCompanyFactors, requirePermission } from '../utils/permissions';
import {
  getCurrentUser,
  getOrganizationId,
} from './auth';

export type ConversionFactorInput = FactorGovernance & {
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
  effectiveYear?: number;
  sourceUrl?: string;
  factorVersion?: string;
  factorSet?: string;
  factorStatus?: string;
  confidence?: string;
  boundary?: string;
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

export type ConversionFactorItem = FactorGovernance & {
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
  effectiveYear?: number | null;
  sourceUrl?: string | null;
  factorVersion?: string | null;
  factorSet?: string | null;
  factorStatus?: string | null;
  confidence?: string | null;
  boundary?: string | null;
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

const VALID_VERIFICATION_STATUSES = new Set([
  'UNREVIEWED',
  'INTERNAL_REVIEW_REQUIRED',
  'REVIEWED',
  'VERIFIED',
  'OFFICIAL_SOURCE',
  'PILOT_ESTIMATE',
  'DRAFT',
  'ACTIVE',
]);

const VALID_CONFIDENCE_LEVELS = new Set([
  'HIGH',
  'MEDIUM',
  'LOW',
  'PLACEHOLDER',
  'PILOT_ESTIMATE',
]);

function normalizeGovernanceValue(value?: string | null) {
  return String(value ?? '').trim().replace(/[\s-]+/g, '_').toUpperCase();
}

function validateConversionFactorInput(input: Partial<ConversionFactorInput>) {
  const errors: string[] = [];
  const factorValue = Number(input.factorValue);

  if (input.factorValue !== undefined && (!Number.isFinite(factorValue) || factorValue < 0)) {
    errors.push('Factor value must be a valid number greater than or equal to 0.');
  }

  if (input.unit !== undefined && !String(input.unit).trim()) {
    errors.push('Unit is required.');
  }

  if (input.activityType !== undefined && !normalizeActivityType(input.activityType)) {
    errors.push('Activity type must be recognized.');
  }

  if (input.effectiveFrom && input.effectiveTo) {
    const effectiveFrom = Date.parse(input.effectiveFrom);
    const effectiveTo = Date.parse(input.effectiveTo);
    if (Number.isFinite(effectiveFrom) && Number.isFinite(effectiveTo) && effectiveFrom > effectiveTo) {
      errors.push('Effective from must be before or equal to effective to.');
    }
  }

  if (input.sourceYear !== undefined) {
    const sourceYear = Number(input.sourceYear);
    if (!Number.isInteger(sourceYear) || sourceYear < 1900 || sourceYear > 2100) {
      errors.push('Source year must be a plausible four-digit year.');
    }
  }

  if (input.sourceUrl) {
    try {
      const origin = typeof window === 'undefined' ? 'https://carbonlite.local' : window.location.origin;
      const parsed = new URL(input.sourceUrl, origin);
      if (!['http:', 'https:'].includes(parsed.protocol) && !parsed.pathname.startsWith('/methodology/')) {
        errors.push('Source URL must be an http(s) URL or a CarbonLite methodology path.');
      }
    } catch {
      errors.push('Source URL must be a valid URL.');
    }
  }

  const verificationStatus = normalizeGovernanceValue(input.verificationStatus);
  if (verificationStatus && !VALID_VERIFICATION_STATUSES.has(verificationStatus)) {
    errors.push('Verification status is not recognized.');
  }

  const confidenceLevel = normalizeGovernanceValue(input.confidenceLevel ?? input.confidence);
  if (confidenceLevel && !VALID_CONFIDENCE_LEVELS.has(confidenceLevel)) {
    errors.push('Confidence level is not recognized.');
  }

  const factorType = normalizeGovernanceValue(input.factorType);
  const sourceAuthority = String(input.sourceAuthority ?? '').trim();
  const sourceDocument = String(input.sourceDocument ?? '').trim();
  const isInternalPilotDefault =
    sourceAuthority.toLowerCase() === 'carbonlite' ||
    normalizeGovernanceValue(input.factorSet).includes('PILOT') ||
    Boolean(input.isPilotEstimate);

  if (factorType !== 'CUSTOM' && !isInternalPilotDefault) {
    if (!sourceAuthority) errors.push('Source authority is required for non-internal factors.');
    if (!sourceDocument) errors.push('Source document is required for non-internal factors.');
  }

  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }
}

const PILOT_ELECTRICITY_FACTOR_VALUES: Record<string, number> = {
  AB: 0.53,
  BC: 0.02,
  ON: 0.12,
};

const OFFICIAL_ELECTRICITY_FACTOR_VALUES: Record<number, Record<string, number>> = {
  2025: {
    AB: 0.49,
    BC: 0.015,
    ON: 0.038,
  },
  2026: {
    AB: 0.438,
    BC: 0.018,
    ON: 0.059,
  },
};

const PILOT_ELECTRICITY_FACTORS: ConversionFactorItem[] = PILOT_SUPPORTED_PROVINCES.map(
  (province) => {
    const isUnsupportedAlbertaPilot = province.code === 'AB';
    return {
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
      sourceDocument: 'CarbonLite Default Factor Library v1.0',
      sourceYear: 2026,
      effectiveYear: 2026,
      sourceUrl: '/methodology/default-factors',
      factorVersion: 'v1.0',
      factorSet: 'PILOT_DEFAULT_V0_1',
      factorStatus: isUnsupportedAlbertaPilot ? 'REFERENCE_ONLY' : 'ACTIVE',
      confidence: 'PILOT_ESTIMATE',
      boundary: 'Purchased electricity consumption intensity for pilot workflow validation.',
      assumptions:
        'Pilot default electricity factor. Replace with official reviewed factor before formal reporting.',
      methodology:
        'Demo factor for current CarbonLite pilot workflows. Replace with verified official provincial electricity factors before formal reporting.',
      confidenceLevel: 'LOW',
      verificationStatus: 'INTERNAL_REVIEW_REQUIRED',
      isPilotEstimate: true,
      consultantReviewRecommended: true,
      verified: false,
      notes: isUnsupportedAlbertaPilot
        ? 'Historical pilot reference only. No approved corporate-inventory methodology authorizes automatic Scope 2 use.'
        : 'Current pilot coverage supports BC and ON only.',
      applicability: isUnsupportedAlbertaPilot ? 'REFERENCE_ONLY' : undefined,
      isDefault: !isUnsupportedAlbertaPilot,
      isSystemDefault: true,
      defaultScope: 'SCOPE_2',
      scope: 'SCOPE_2',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
  },
);

const OFFICIAL_ELECTRICITY_FACTORS: ConversionFactorItem[] = Object.entries(
  OFFICIAL_ELECTRICITY_FACTOR_VALUES,
).flatMap(([year, values]) =>
  PILOT_SUPPORTED_PROVINCES.map((province) => ({
    id: `eccc-electricity-${province.code.toLowerCase()}-${year}`,
    organizationId: null,
    factorType: 'SYSTEM',
    name: `Electricity - ${province.name} - ${year} Reference`,
    type: 'EMISSION',
    activityType: 'ELECTRICITY',
    jurisdiction: `${province.name}, Canada`,
    region: province.name,
    country: 'Canada',
    inputUnit: 'kWh',
    unit: 'kWh',
    factorValue: values[province.code],
    resultUnit: 'kgCO2e',
    sourceName: 'ECCC electricity consumption intensity reference',
    sourceReference: `Table ${Number(year) === 2025 ? '5.2' : '5.3'}; federal offset applicability ${year}; NIR historical data through ${Number(year) === 2025 ? 2022 : 2023}`,
    sourceAuthority: 'Environment and Climate Change Canada',
    sourceDocument: 'Emission factors and reference values, version 4.0 (September 2026)',
    sourceYear: 2026,
    effectiveYear: Number(year),
    sourceUrl: 'https://www.canada.ca/en/environment-climate-change/services/climate-change/pricing-pollution-how-it-will-work/output-based-pricing-system/federal-greenhouse-gas-offset-system/emission-factors-reference-values.html',
    factorVersion: `ECCC_REFERENCE_${year}`,
    factorSet: `ECCC_REFERENCE_${year}`,
    factorStatus: 'REFERENCE_ONLY',
    confidence: 'HIGH',
    confidenceLevel: 'HIGH',
    verificationStatus: 'ACTIVE',
    boundary: 'Electricity consumption intensity published in a federal offset-program context; that context does not itself establish CarbonLite SMB Scope 2 automatic-use policy.',
    assumptions:
      'The year is federal offset applicability, not a measured annual corporate grid-intensity year. CarbonLite retains this as reference-only because it has not adopted and documented a sufficiently authoritative corporate-inventory methodology for automatic use.',
    methodology:
      'Published g CO2e/kWh divided by 1000 to kg CO2e/kWh. Corporate Scope 2 use requires separate NIR boundary and vintage review.',
    isPilotEstimate: false,
    consultantReviewRecommended: true,
    verified: true,
    notes:
      'The value is numerically source-valid. Reference-only status is a CarbonLite governance decision, not a claim that ECCC prohibits corporate-inventory use. No upstream/lifecycle or marginal-grid substitution is made.',
    applicability: 'REFERENCE_ONLY',
    emissionBasis: 'DIRECT_CO2E',
    methodologyProvenance: { sourceVersion: 'ECCC_OFFSET_EFR_V4_2026', sourceTable: Number(year) === 2025 ? '5.2' : '5.3', factorYear: Number(year) },
    isDefault: false,
    isSystemDefault: true,
    defaultScope: 'SCOPE_2',
    scope: 'SCOPE_2',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  })),
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
  effectiveYear: 2025,
  sourceUrl: '/methodology/default-factors',
  factorVersion: 'v1.0',
  factorSet: 'PILOT_DEFAULT_V0_1',
  factorStatus: 'GENERIC_ESTIMATE',
  confidence: 'LOW',
  boundary: 'Generic distance-based Scope 3 ground transport estimate.',
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

const ECCC_NATURAL_GAS_GJ_FACTOR: ConversionFactorItem = {
  id: 'eccc-natural-gas-canada-generic-gj-2025',
  organizationId: null,
  factorType: 'SYSTEM',
  name: 'Natural Gas - Canada Generic',
  type: 'EMISSION',
  activityType: 'NATURAL_GAS',
  jurisdiction: 'Canada (Generic)',
  region: 'Canada',
  country: 'Canada',
  inputUnit: 'GJ',
  unit: 'GJ',
  factorValue: 49.44,
  resultUnit: 'kgCO2e',
  sourceName: 'ECCC Table A8 national fuel energy emission factor',
  sourceReference: 'Table A8: Mass of CO2 equivalent emissions emitted per quantity of energy for various fuels',
  sourceAuthority: 'Environment and Climate Change Canada',
  sourceDocument: 'Greenhouse gas and air pollutant emissions projections – 2025',
  sourceYear: 2025,
  sourceUrl: 'https://www.canada.ca/en/environment-climate-change/services/climate-change/greenhouse-gas-emissions/projections/2025-report.html',
  factorVersion: 'ECCC_EPR_2025_TABLE_A8',
  factorSet: 'ECCC_EPR_2025_TABLE_A8',
  factorStatus: 'REFERENCE_ONLY',
  confidence: 'HIGH',
  boundary: 'Approximate national projection-model reference; corporate combustion, HHV and GWP applicability not established.',
  assumptions:
    'ECCC Table A8 national Natural Gas CO2e estimate. The source identifies this as an approximate estimate and notes that actual emission factors may vary by year, sector, and province.',
  methodology:
    'Table A8 publishes Natural Gas at 49.44 g CO2e/MJ. CarbonLite stores the equivalent direct factor as 49.44 kg CO2e/GJ.',
  confidenceLevel: 'HIGH',
  verificationStatus: 'INTERNAL_REVIEW_REQUIRED',
  isPilotEstimate: false,
  consultantReviewRecommended: true,
  verified: false,
  notes:
    'Reference only. No reviewed corporate HHV/sector/province method is available; do not use as an automatic GJ fallback.',
  applicability: 'REFERENCE_ONLY',
  emissionBasis: 'DIRECT_CO2E',
  methodologyProvenance: { sourceVersion: 'ECCC_EPR_2025_TABLE_A8', sourceTable: 'A8' },
  isDefault: false,
  isSystemDefault: true,
  defaultScope: 'SCOPE_1',
  scope: 'SCOPE_1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export async function createConversionFactor(input: ConversionFactorInput) {
  requirePermission(canManageCompanyFactors(getCurrentUser()));
  validateConversionFactorInput(input);

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
    ...getOfficialElectricityFactorsForParams(params),
    ...(matchesPilotGroundTransportParams(params) ? [PILOT_GROUND_TRANSPORT_FACTOR] : []),
    ...(matchesEcccNaturalGasGJParams(params) ? [ECCC_NATURAL_GAS_GJ_FACTOR] : []),
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

function getOfficialElectricityFactorsForParams(params?: {
  activityType?: string;
  jurisdiction?: string;
  sourceYear?: number;
  search?: string;
}) {
  const activityType = normalizeActivityType(params?.activityType);
  if (activityType && activityType !== 'ELECTRICITY') return [];

  // sourceYear is the publication year. effectiveYear carries the federal
  // offset applicability year; do not silently conflate the two.
  if (params?.sourceYear && params.sourceYear !== 2026) return [];

  const jurisdictionFilter = String(params?.jurisdiction ?? '').trim();
  const searchFilter = String(params?.search ?? '').trim().toLowerCase();
  const combinedFilter = jurisdictionFilter || searchFilter;
  const normalizedFilter = combinedFilter.toLowerCase();
  const pilotCode = getPilotProvinceCode(combinedFilter);

  return OFFICIAL_ELECTRICITY_FACTORS.filter((factor) => {
    const factorProvince = normalizeProvince(factor.region ?? factor.jurisdiction);
    const factorCode = getPilotProvinceCode(factorProvince);
    const matchesJurisdiction = !combinedFilter || (
      (pilotCode && factorCode === pilotCode) ||
      String(factorProvince ?? '').toLowerCase().includes(normalizedFilter) ||
      String(factorCode ?? '').toLowerCase() === normalizedFilter ||
      [
        factor.name,
        factor.factorSet,
        factor.sourceAuthority,
        factor.sourceName,
      ].some((value) => String(value ?? '').toLowerCase().includes(normalizedFilter))
    );

    return (
      (!params?.sourceYear || Number(factor.sourceYear) === Number(params.sourceYear)) &&
      matchesJurisdiction
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
    return isCanadaNationalJurisdiction(jurisdictionFilter);
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

function matchesEcccNaturalGasGJParams(params?: {
  activityType?: string;
  jurisdiction?: string;
  sourceYear?: number;
  search?: string;
}) {
  const activityType = normalizeActivityType(params?.activityType);
  if (activityType && activityType !== 'NATURAL_GAS') return false;

  if (params?.sourceYear && params.sourceYear !== 2025) return false;

  const jurisdictionFilter = String(params?.jurisdiction ?? '').trim().toLowerCase();
  if (jurisdictionFilter && !isCanadaNationalJurisdiction(jurisdictionFilter)) {
    return false;
  }

  const searchFilter = String(params?.search ?? '').trim().toLowerCase();
  if (!searchFilter) return true;

  return [
    ECCC_NATURAL_GAS_GJ_FACTOR.name,
    ECCC_NATURAL_GAS_GJ_FACTOR.activityType,
    ECCC_NATURAL_GAS_GJ_FACTOR.jurisdiction,
    ECCC_NATURAL_GAS_GJ_FACTOR.country,
    ECCC_NATURAL_GAS_GJ_FACTOR.inputUnit,
    ECCC_NATURAL_GAS_GJ_FACTOR.sourceAuthority,
    ECCC_NATURAL_GAS_GJ_FACTOR.sourceDocument,
    ECCC_NATURAL_GAS_GJ_FACTOR.sourceReference,
    ECCC_NATURAL_GAS_GJ_FACTOR.factorSet,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(searchFilter));
}

function isCanadaNationalJurisdiction(value?: string | null) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_–—-]+/g, ' ')
    .replace(/\s+/g, ' ');

  return [
    'canada',
    'canada national',
    'national',
    'ca',
    'ca national',
  ].includes(normalized);
}

function isSamePilotSystemFactor(
  item: ConversionFactorItem,
  pilotFactor: ConversionFactorItem,
) {
  const activityType = normalizeActivityType(item.activityType ?? item.name);
  const pilotActivityType = normalizeActivityType(pilotFactor.activityType ?? pilotFactor.name);
  if (activityType !== pilotActivityType) return false;
  if (!isUsableSystemFactor(item)) return false;

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

function isUsableSystemFactor(item: ConversionFactorItem) {
  const status = String(item.factorStatus ?? '').trim().toUpperCase();
  const unit = String(item.inputUnit ?? item.unit ?? '').trim();
  const value = item.factorValue;

  if (['ARCHIVED', 'DEPRECATED'].includes(status)) return false;
  if (!unit) return false;
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return false;

  return true;
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
  requirePermission(canManageCompanyFactors(getCurrentUser()));

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
  requirePermission(canManageCompanyFactors(getCurrentUser()));
  validateConversionFactorInput(input);

  return apiFetch<ConversionFactorItem>(`/conversion-factors/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
