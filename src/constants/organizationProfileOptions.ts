export const INDUSTRY_OPTIONS = [
  'Agriculture',
  'Construction',
  'Energy / Utilities',
  'Financial Services',
  'Food & Beverage',
  'Healthcare',
  'Hospitality',
  'Manufacturing',
  'Professional Services',
  'Real Estate',
  'Retail',
  'Technology',
  'Transportation / Logistics',
  'Other',
] as const;

export const COUNTRY_OPTIONS = ['Canada'] as const;

export const CANADA_PROVINCE_TERRITORY_OPTIONS = [
  'Alberta',
  'British Columbia',
  'Manitoba',
  'New Brunswick',
  'Newfoundland and Labrador',
  'Northwest Territories',
  'Nova Scotia',
  'Nunavut',
  'Ontario',
  'Prince Edward Island',
  'Quebec',
  'Saskatchewan',
  'Yukon',
] as const;

export const DEFAULT_COUNTRY = 'Canada';
export const DEFAULT_SAMPLE_WORKSPACE_INDUSTRY = 'Technology';
export const DEFAULT_SAMPLE_WORKSPACE_PROVINCE = 'Alberta';
export const DEFAULT_SAMPLE_WORKSPACE_CITY = 'Calgary';

export function isKnownIndustry(value: string) {
  return INDUSTRY_OPTIONS.some((option) => option === value);
}

export function isKnownCanadianProvinceOrTerritory(value: string) {
  return CANADA_PROVINCE_TERRITORY_OPTIONS.some((option) => option === value);
}
