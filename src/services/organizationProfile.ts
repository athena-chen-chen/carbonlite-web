import {
  DEFAULT_INVENTORY_BOUNDARY,
  type InventoryBoundary,
} from '../constants/inventoryBoundary';
import {
  DEFAULT_COUNTRY,
  DEFAULT_SAMPLE_WORKSPACE_CITY,
  DEFAULT_SAMPLE_WORKSPACE_INDUSTRY,
  DEFAULT_SAMPLE_WORKSPACE_PROVINCE,
  isKnownCanadianProvinceOrTerritory,
  isKnownIndustry,
} from '../constants/organizationProfileOptions';
import {
  getCurrentUser,
  getToken,
  getOrganizationId,
  getOrganizationName,
  type AuthUser,
} from './auth';
import { canEditWorkspace } from '../utils/permissions';
import { apiFetch } from './api';

export type OrganizationProfile = {
  organizationName: string;
  industry: string;
  otherIndustry?: string;
  country: string;
  provinceOrState: string;
  city: string;
  primaryContactName: string;
  primaryContactEmail: string;
  reportingPeriodStart: string;
  reportingPeriodEnd: string;
  geographicBoundary: string;
  includedFacilitiesOrLocations: string;
  excludedFacilitiesOrLocations: string;
  includedScopes: string;
  scope3CoverageNote: string;
  exclusionsAndLimitations: string;
  boundaryNotes: string;
};

const PROFILE_STORAGE_PREFIX = 'carbonlite:organization-profile:';
export const ORGANIZATION_PROFILE_UPDATED_EVENT = 'carbonlite:organization-profile-updated';
export const PRIMARY_CONTACT_EMAIL_ERROR = 'Please enter a valid email address.';

export const SAMPLE_WORKSPACE_PROFILE: OrganizationProfile = {
  organizationName: DEFAULT_INVENTORY_BOUNDARY.organizationWorkspace,
  industry: DEFAULT_SAMPLE_WORKSPACE_INDUSTRY,
  otherIndustry: '',
  country: DEFAULT_COUNTRY,
  provinceOrState: DEFAULT_SAMPLE_WORKSPACE_PROVINCE,
  city: DEFAULT_SAMPLE_WORKSPACE_CITY,
  primaryContactName: '',
  primaryContactEmail: '',
  reportingPeriodStart: '2026-01-01',
  reportingPeriodEnd: '2026-12-31',
  geographicBoundary: DEFAULT_INVENTORY_BOUNDARY.geographicBoundary,
  includedFacilitiesOrLocations: DEFAULT_INVENTORY_BOUNDARY.includedFacilitiesOrLocations,
  excludedFacilitiesOrLocations: 'No real customer facilities are included in the sample workspace.',
  includedScopes: DEFAULT_INVENTORY_BOUNDARY.includedScopes,
  scope3CoverageNote: DEFAULT_INVENTORY_BOUNDARY.scope3CoverageNote,
  exclusionsAndLimitations: DEFAULT_INVENTORY_BOUNDARY.exclusionsLimitations,
  boundaryNotes:
    'Current pilot supports selected units and activity types. Additional unit conversion and Scope 3 categories may be added in future versions.',
};

export function getDefaultOrganizationProfile(user: AuthUser | null = getCurrentUser()): OrganizationProfile {
  const organizationName = getOrganizationName(user);

  if (organizationName === SAMPLE_WORKSPACE_PROFILE.organizationName) {
    return SAMPLE_WORKSPACE_PROFILE;
  }

  return {
    ...SAMPLE_WORKSPACE_PROFILE,
    organizationName,
    industry: '',
    country: DEFAULT_COUNTRY,
    provinceOrState: '',
    city: '',
    excludedFacilitiesOrLocations: '',
  };
}

export function loadOrganizationProfile(user: AuthUser | null = getCurrentUser()): OrganizationProfile {
  const defaults = getDefaultOrganizationProfile(user);

  if (hasBackendOrganizationProfileSession()) {
    return defaults;
  }

  const key = getOrganizationProfileStorageKey(user);

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaults;

    return normalizeOrganizationProfile({
      ...defaults,
      ...(JSON.parse(raw) as Partial<OrganizationProfile>),
    });
  } catch {
    return defaults;
  }
}

export function saveOrganizationProfile(
  input: OrganizationProfile,
  user: AuthUser | null = getCurrentUser(),
) {
  if (!canEditWorkspace(user)) {
    throw new Error('You do not have permission to perform this action.');
  }

  const profile = normalizeOrganizationProfile(input);
  validateOrganizationProfile(profile);
  localStorage.setItem(getOrganizationProfileStorageKey(user), JSON.stringify(profile));
  window.dispatchEvent(new Event(ORGANIZATION_PROFILE_UPDATED_EVENT));
  return profile;
}

export function hasBackendOrganizationProfileSession() {
  return Boolean(getToken());
}

export async function fetchOrganizationProfile(
  user: AuthUser | null = getCurrentUser(),
) {
  const profile = await apiFetch<Partial<OrganizationProfile>>('/organization-profile');
  const normalizedProfile = normalizeOrganizationProfile({
    ...getDefaultOrganizationProfile(user),
    ...profile,
  });
  dispatchOrganizationProfileUpdated(normalizedProfile);
  return normalizedProfile;
}

export async function persistOrganizationProfile(
  input: OrganizationProfile,
  user: AuthUser | null = getCurrentUser(),
) {
  if (!canEditWorkspace(user)) {
    throw new Error('You do not have permission to perform this action.');
  }

  const profile = normalizeOrganizationProfile(input);
  validateOrganizationProfile(profile);
  const saved = await apiFetch<Partial<OrganizationProfile>>('/organization-profile', {
    method: 'PATCH',
    body: JSON.stringify(profile),
  });
  const normalizedSaved = normalizeOrganizationProfile({
    ...profile,
    ...saved,
  });

  dispatchOrganizationProfileUpdated(normalizedSaved);
  return normalizedSaved;
}

export function profileToInventoryBoundary(
  profile: OrganizationProfile,
  fallbackReportingPeriod?: string | null,
): InventoryBoundary {
  return {
    organizationWorkspace: profile.organizationName || SAMPLE_WORKSPACE_PROFILE.organizationName,
    industry: getDisplayIndustry(profile) || undefined,
    otherIndustry: profile.otherIndustry || undefined,
    country: profile.country || DEFAULT_COUNTRY,
    provinceOrTerritory: profile.provinceOrState || undefined,
    city: profile.city || undefined,
    reportingPeriod:
      formatReportingPeriod(profile) ||
      fallbackReportingPeriod ||
      DEFAULT_INVENTORY_BOUNDARY.reportingPeriod,
    geographicBoundary: profile.geographicBoundary || DEFAULT_INVENTORY_BOUNDARY.geographicBoundary,
    includedFacilitiesOrLocations:
      profile.includedFacilitiesOrLocations ||
      DEFAULT_INVENTORY_BOUNDARY.includedFacilitiesOrLocations,
    excludedFacilitiesOrLocations:
      profile.excludedFacilitiesOrLocations ||
      DEFAULT_INVENTORY_BOUNDARY.excludedFacilitiesOrLocations,
    includedScopes: profile.includedScopes || DEFAULT_INVENTORY_BOUNDARY.includedScopes,
    scope3CoverageNote: profile.scope3CoverageNote || DEFAULT_INVENTORY_BOUNDARY.scope3CoverageNote,
    exclusionsLimitations:
      profile.exclusionsAndLimitations || DEFAULT_INVENTORY_BOUNDARY.exclusionsLimitations,
    boundaryNotes: profile.boundaryNotes || DEFAULT_INVENTORY_BOUNDARY.boundaryNotes,
  };
}

function getDisplayIndustry(profile: Pick<OrganizationProfile, 'industry' | 'otherIndustry'>) {
  return profile.industry === 'Other'
    ? profile.otherIndustry || 'Other'
    : profile.industry;
}

export function formatReportingPeriod(profile: Pick<
  OrganizationProfile,
  'reportingPeriodStart' | 'reportingPeriodEnd'
>) {
  if (profile.reportingPeriodStart && profile.reportingPeriodEnd) {
    return `${profile.reportingPeriodStart} to ${profile.reportingPeriodEnd}`;
  }
  return profile.reportingPeriodStart || profile.reportingPeriodEnd || '';
}

function getOrganizationProfileStorageKey(user: AuthUser | null) {
  const id = getOrganizationId(user);
  const name = getOrganizationName(user);
  return `${PROFILE_STORAGE_PREFIX}${id || name}`;
}

function normalizeOrganizationProfile(input: Partial<OrganizationProfile>): OrganizationProfile {
  const defaults = SAMPLE_WORKSPACE_PROFILE;
  const apiInput = input as Partial<OrganizationProfile> & {
    province?: string | null;
    includedFacilities?: string | null;
    excludedFacilities?: string | null;
    exclusionsLimitations?: string | null;
  };

  return {
    organizationName: clean(input.organizationName ?? defaults.organizationName),
    ...normalizeIndustry(input.industry, input.otherIndustry),
    country: clean(input.country ?? defaults.country) || DEFAULT_COUNTRY,
    provinceOrState: clean(input.provinceOrState ?? apiInput.province),
    city: clean(input.city),
    primaryContactName: clean(input.primaryContactName),
    primaryContactEmail: clean(input.primaryContactEmail).toLowerCase(),
    reportingPeriodStart: clean(input.reportingPeriodStart),
    reportingPeriodEnd: clean(input.reportingPeriodEnd),
    geographicBoundary: clean(input.geographicBoundary ?? defaults.geographicBoundary),
    includedFacilitiesOrLocations: clean(
      input.includedFacilitiesOrLocations ??
        apiInput.includedFacilities ??
        defaults.includedFacilitiesOrLocations,
    ),
    excludedFacilitiesOrLocations: clean(
      input.excludedFacilitiesOrLocations ?? apiInput.excludedFacilities,
    ),
    includedScopes: clean(input.includedScopes ?? defaults.includedScopes),
    scope3CoverageNote: clean(input.scope3CoverageNote ?? defaults.scope3CoverageNote),
    exclusionsAndLimitations: clean(
      input.exclusionsAndLimitations ??
        apiInput.exclusionsLimitations ??
        defaults.exclusionsAndLimitations,
    ),
    boundaryNotes: clean(input.boundaryNotes ?? defaults.boundaryNotes),
  };
}

function dispatchOrganizationProfileUpdated(profile: OrganizationProfile) {
  window.dispatchEvent(
    new CustomEvent<OrganizationProfile>(ORGANIZATION_PROFILE_UPDATED_EVENT, {
      detail: profile,
    }),
  );
}

function validateOrganizationProfile(profile: OrganizationProfile) {
  if (!profile.organizationName) {
    throw new Error('Organization / Workspace is required.');
  }

  if (!profile.industry || !isKnownIndustry(profile.industry)) {
    throw new Error('Please select an industry.');
  }

  if (profile.industry === 'Other' && !profile.otherIndustry) {
    throw new Error('Please enter an industry.');
  }

  if (profile.country !== DEFAULT_COUNTRY) {
    throw new Error('Country must be Canada for the current pilot version.');
  }

  if (!profile.provinceOrState || !isKnownCanadianProvinceOrTerritory(profile.provinceOrState)) {
    throw new Error('Please select a province or territory.');
  }

  if (profile.primaryContactEmail && !isValidPrimaryContactEmail(profile.primaryContactEmail)) {
    throw new Error(PRIMARY_CONTACT_EMAIL_ERROR);
  }

  [profile.reportingPeriodStart, profile.reportingPeriodEnd]
    .filter(Boolean)
    .forEach((date) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error('Please enter valid reporting period dates.');
      }
    });

  if (
    profile.reportingPeriodStart &&
    profile.reportingPeriodEnd &&
    profile.reportingPeriodEnd <= profile.reportingPeriodStart
  ) {
    throw new Error('Reporting Period End must be after Reporting Period Start.');
  }

  Object.entries(profile).forEach(([key, value]) => {
    if (typeof value === 'string' && value.length > 1200) {
      throw new Error(`${key} is too long.`);
    }
  });
}

function clean(value?: string | null) {
  return String(value ?? '').trim();
}

export function isValidPrimaryContactEmail(email: string) {
  const normalized = clean(email).toLowerCase();
  if (!normalized) return true;
  if (/[\s[\]()]|mailto:/i.test(normalized)) return false;

  const parts = normalized.split('@');
  if (parts.length !== 2) return false;

  const [localPart, domain] = parts;
  if (!localPart || !domain || !domain.includes('.')) return false;
  if (domain.startsWith('.') || domain.endsWith('.')) return false;
  if (domain.split('.').some((part) => !part)) return false;

  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(normalized);
}

function normalizeIndustry(industry?: string | null, otherIndustry?: string | null) {
  const cleanedIndustry = clean(industry);
  const cleanedOtherIndustry = clean(otherIndustry);

  if (!cleanedIndustry) {
    return { industry: '', otherIndustry: cleanedOtherIndustry };
  }

  if (isKnownIndustry(cleanedIndustry)) {
    return {
      industry: cleanedIndustry,
      otherIndustry: cleanedIndustry === 'Other' ? cleanedOtherIndustry : '',
    };
  }

  return {
    industry: 'Other',
    otherIndustry: cleanedIndustry || cleanedOtherIndustry,
  };
}
