import { normalizeJurisdictionRegion } from './conversionFactorMatching';

export const CANADIAN_PROVINCES = [
  { value: 'Alberta', label: 'Alberta', abbreviation: 'AB' },
  { value: 'British Columbia', label: 'British Columbia', abbreviation: 'BC' },
  { value: 'Saskatchewan', label: 'Saskatchewan', abbreviation: 'SK' },
  { value: 'Manitoba', label: 'Manitoba', abbreviation: 'MB' },
  { value: 'Ontario', label: 'Ontario', abbreviation: 'ON' },
  { value: 'Quebec', label: 'Quebec', abbreviation: 'QC' },
  { value: 'New Brunswick', label: 'New Brunswick', abbreviation: 'NB' },
  { value: 'Nova Scotia', label: 'Nova Scotia', abbreviation: 'NS' },
  { value: 'Prince Edward Island', label: 'Prince Edward Island', abbreviation: 'PE' },
  { value: 'Newfoundland and Labrador', label: 'Newfoundland and Labrador', abbreviation: 'NL' },
  { value: 'Yukon', label: 'Yukon', abbreviation: 'YT' },
  { value: 'Northwest Territories', label: 'Northwest Territories', abbreviation: 'NT' },
  { value: 'Nunavut', label: 'Nunavut', abbreviation: 'NU' },
] as const;

export const CANADIAN_PROVINCE_OPTIONS = CANADIAN_PROVINCES.map((province) => province.value);
export const ELECTRICITY_FACTOR_PROVINCE_OPTIONS = [
  'Alberta',
  'British Columbia',
  'Ontario',
];

export function getProvinceOptionsForActivity(
  activityType?: string | null,
  currentProvince?: string | null,
  fallbackOptions = CANADIAN_PROVINCE_OPTIONS,
) {
  const baseOptions =
    String(activityType ?? '').trim().toUpperCase() === 'ELECTRICITY'
      ? ELECTRICITY_FACTOR_PROVINCE_OPTIONS
      : fallbackOptions;
  const normalizedCurrentProvince = normalizeProvince(currentProvince);
  const normalizedOptions = baseOptions
    .map((option) => normalizeProvince(option))
    .filter((option): option is string => Boolean(option));
  const uniqueOptions = Array.from(new Set(normalizedOptions));

  return normalizedCurrentProvince && !uniqueOptions.includes(normalizedCurrentProvince)
    ? [...uniqueOptions, normalizedCurrentProvince]
    : uniqueOptions;
}

export function normalizeProvince(value?: string | null): string | null {
  const normalized = normalizeJurisdictionRegion(value);
  if (!normalized) return null;

  const alias = PROVINCE_ALIAS_MAP[normalized.toLowerCase()];
  return alias ?? normalized;
}

export function getProvinceLabel(value?: string | null): string {
  return normalizeProvince(value) ?? cleanProvinceValue(value) ?? 'Not specified';
}

const PROVINCE_ALIAS_MAP: Record<string, string> = {
  sk: 'Saskatchewan',
  sask: 'Saskatchewan',
  saskatchewan: 'Saskatchewan',
  mb: 'Manitoba',
  manitoba: 'Manitoba',
  qc: 'Quebec',
  pq: 'Quebec',
  que: 'Quebec',
  qué: 'Quebec',
  quebec: 'Quebec',
  québec: 'Quebec',
  nb: 'New Brunswick',
  'new brunswick': 'New Brunswick',
  ns: 'Nova Scotia',
  'nova scotia': 'Nova Scotia',
  pe: 'Prince Edward Island',
  pei: 'Prince Edward Island',
  'prince edward island': 'Prince Edward Island',
  nl: 'Newfoundland and Labrador',
  'newfoundland and labrador': 'Newfoundland and Labrador',
  yt: 'Yukon',
  yukon: 'Yukon',
  nt: 'Northwest Territories',
  'northwest territories': 'Northwest Territories',
  nu: 'Nunavut',
  nunavut: 'Nunavut',
};

function cleanProvinceValue(value?: string | null) {
  const cleanValue = String(value ?? '').trim();
  return cleanValue || null;
}
