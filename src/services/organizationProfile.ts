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
import { canEditWorkspace, canReviewBoundary } from '../utils/permissions';
import { apiFetch } from './api';
import { trackBusinessAuditEvent } from './businessAuditEvents';

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
  boundaryStatus: 'NOT_DEFINED' | 'DRAFT' | 'REVIEWED';
  boundaryReviewedBy: string;
  boundaryReviewedByUserId: string;
  boundaryReviewedAt: string;
  boundaryVersion: number;
  boundaryReviewNote: string;
  boundaryReviewFingerprint: string;
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
  boundaryStatus: 'DRAFT',
  boundaryReviewedBy: '',
  boundaryReviewedByUserId: '',
  boundaryReviewedAt: '',
  boundaryVersion: 1,
  boundaryReviewNote: '',
  boundaryReviewFingerprint: '',
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
  const previous = loadOrganizationProfile(user);
  const profileWithBoundaryReview = applyBoundaryReviewInvalidation(previous, profile);
  validateOrganizationProfile(profileWithBoundaryReview);
  localStorage.setItem(getOrganizationProfileStorageKey(user), JSON.stringify(profileWithBoundaryReview));
  window.dispatchEvent(new Event(ORGANIZATION_PROFILE_UPDATED_EVENT));
  void trackOrganizationBoundaryAuditEvent('BOUNDARY_UPDATED', previous, profileWithBoundaryReview, user);
  return profileWithBoundaryReview;
}

export function hasBackendOrganizationProfileSession() {
  return Boolean(getToken());
}

export async function fetchOrganizationProfile(
  user: AuthUser | null = getCurrentUser(),
) {
  const profile = await apiFetch<Partial<OrganizationProfile>>('/organization-profile');
  const normalizedProfile = normalizeOrganizationProfile(
    profile,
    getDefaultOrganizationProfile(user),
  );
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
  const previous = await fetchOrganizationProfile(user).catch(() => loadOrganizationProfile(user));
  const profileWithBoundaryReview = applyBoundaryReviewInvalidation(previous, profile);
  validateOrganizationProfile(profileWithBoundaryReview);
  const saved = await apiFetch<Partial<OrganizationProfile>>('/organization-profile', {
    method: 'PATCH',
    // The persisted profile contract does not yet include review attestations.
    // Sending UI-only review fields makes the strict API reject ordinary saves.
    body: JSON.stringify(toPersistedOrganizationProfile(profileWithBoundaryReview)),
  });
  const normalizedSaved = normalizeOrganizationProfile({
    ...profileWithBoundaryReview,
    ...saved,
  });

  dispatchOrganizationProfileUpdated(normalizedSaved);
  void trackOrganizationBoundaryAuditEvent('BOUNDARY_UPDATED', previous, normalizedSaved, user);
  return normalizedSaved;
}

function toPersistedOrganizationProfile(profile: OrganizationProfile) {
  const {
    boundaryStatus: _status,
    boundaryReviewedBy: _reviewer,
    boundaryReviewedByUserId: _reviewerId,
    boundaryReviewedAt: _reviewedAt,
    boundaryVersion: _version,
    boundaryReviewNote: _reviewNote,
    boundaryReviewFingerprint: _fingerprint,
    ...persistedProfile
  } = profile;
  return persistedProfile;
}

export async function reviewOrganizationBoundary(input: {
  profile: OrganizationProfile;
  reviewNote?: string;
  user?: AuthUser | null;
}) {
  const user = input.user ?? getCurrentUser();
  if (!canReviewBoundary(user)) {
    throw new Error('Reviewer permission required.');
  }

  const reviewedProfile = markBoundaryReviewed(input.profile, user, input.reviewNote);
  const saved = hasBackendOrganizationProfileSession()
    ? await persistBoundaryReview(reviewedProfile, user)
    : saveBoundaryReviewLocally(reviewedProfile, user);
  void trackOrganizationBoundaryAuditEvent('BOUNDARY_REVIEWED', input.profile, saved, user);
  return saved;
}

export function profileToInventoryBoundary(
  profile: OrganizationProfile,
  fallbackReportingPeriod?: string | null,
): InventoryBoundary {
  const isSampleWorkspace = profile.organizationName === SAMPLE_WORKSPACE_PROFILE.organizationName;

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
    geographicBoundary: getBoundaryProfileValue(
      profile.geographicBoundary,
      DEFAULT_INVENTORY_BOUNDARY.geographicBoundary,
      isSampleWorkspace,
    ),
    includedFacilitiesOrLocations:
      getBoundaryProfileValue(
        profile.includedFacilitiesOrLocations,
        DEFAULT_INVENTORY_BOUNDARY.includedFacilitiesOrLocations,
        isSampleWorkspace,
      ),
    excludedFacilitiesOrLocations:
      getBoundaryProfileValue(
        profile.excludedFacilitiesOrLocations,
        DEFAULT_INVENTORY_BOUNDARY.excludedFacilitiesOrLocations ?? '',
        isSampleWorkspace,
      ),
    includedScopes: getBoundaryProfileValue(
      profile.includedScopes,
      DEFAULT_INVENTORY_BOUNDARY.includedScopes,
      isSampleWorkspace,
    ),
    scope3CoverageNote: getBoundaryProfileValue(
      profile.scope3CoverageNote,
      DEFAULT_INVENTORY_BOUNDARY.scope3CoverageNote,
      isSampleWorkspace,
    ),
    exclusionsLimitations:
      getBoundaryProfileValue(
        profile.exclusionsAndLimitations,
        DEFAULT_INVENTORY_BOUNDARY.exclusionsLimitations,
        isSampleWorkspace,
      ),
    boundaryNotes: getBoundaryProfileValue(
      profile.boundaryNotes,
      DEFAULT_INVENTORY_BOUNDARY.boundaryNotes ?? '',
      isSampleWorkspace,
    ),
    boundaryStatus: profile.boundaryStatus,
    boundaryReviewedBy: profile.boundaryReviewedBy || undefined,
    boundaryReviewedAt: profile.boundaryReviewedAt || undefined,
    boundaryVersion: profile.boundaryVersion,
    boundaryReviewNote: profile.boundaryReviewNote || undefined,
  };
}

export function profileToReportContextInventoryBoundary(
  profile: OrganizationProfile,
  reportingPeriod?: string | null,
): InventoryBoundary {
  const boundary = profileToInventoryBoundary(profile, reportingPeriod);
  const selectedReportingPeriod = reportingPeriod?.trim();

  return {
    ...boundary,
    reportingPeriod: selectedReportingPeriod || boundary.reportingPeriod,
  };
}

function getBoundaryProfileValue(value: string, sampleDefault: string, isSampleWorkspace: boolean) {
  const trimmed = String(value ?? '').trim();

  if (isSampleWorkspace) return trimmed || sampleDefault;
  if (!trimmed || trimmed === sampleDefault) return '';

  return trimmed;
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

function normalizeOrganizationProfile(
  input: Partial<OrganizationProfile>,
  defaults: OrganizationProfile = SAMPLE_WORKSPACE_PROFILE,
): OrganizationProfile {
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
    boundaryStatus: normalizeBoundaryStatus(input.boundaryStatus, input, defaults),
    boundaryReviewedBy: clean(input.boundaryReviewedBy ?? defaults.boundaryReviewedBy),
    boundaryReviewedByUserId: clean(input.boundaryReviewedByUserId ?? defaults.boundaryReviewedByUserId),
    boundaryReviewedAt: clean(input.boundaryReviewedAt ?? defaults.boundaryReviewedAt),
    boundaryVersion: normalizeBoundaryVersion(input.boundaryVersion, defaults.boundaryVersion),
    boundaryReviewNote: clean(input.boundaryReviewNote ?? defaults.boundaryReviewNote),
    boundaryReviewFingerprint: clean(input.boundaryReviewFingerprint ?? defaults.boundaryReviewFingerprint),
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

export function getBoundaryMaterialFingerprint(profile: Pick<
  OrganizationProfile,
  | 'organizationName'
  | 'country'
  | 'provinceOrState'
  | 'reportingPeriodStart'
  | 'reportingPeriodEnd'
  | 'geographicBoundary'
  | 'includedFacilitiesOrLocations'
  | 'excludedFacilitiesOrLocations'
  | 'includedScopes'
  | 'scope3CoverageNote'
  | 'exclusionsAndLimitations'
  | 'boundaryNotes'
>) {
  const materialFields = [
    profile.organizationName,
    profile.country,
    profile.provinceOrState,
    profile.reportingPeriodStart,
    profile.reportingPeriodEnd,
    profile.geographicBoundary,
    profile.includedFacilitiesOrLocations,
    profile.excludedFacilitiesOrLocations,
    profile.includedScopes,
    profile.scope3CoverageNote,
    profile.exclusionsAndLimitations,
    profile.boundaryNotes,
  ];

  return materialFields
    .map((value) => clean(value).replace(/\s+/g, ' ').toLowerCase())
    .join('|');
}

export function getBoundaryDisplayStatus(profile: Pick<OrganizationProfile, 'boundaryStatus'>) {
  const labels = {
    NOT_DEFINED: 'Not Defined',
    DRAFT: 'Draft',
    REVIEWED: 'Reviewed',
  } as const;
  return labels[profile.boundaryStatus] ?? 'Draft';
}

function markBoundaryReviewed(
  profile: OrganizationProfile,
  user: AuthUser | null,
  reviewNote?: string,
): OrganizationProfile {
  const reviewer = getReviewerDisplayName(user);
  return normalizeOrganizationProfile({
    ...profile,
    boundaryStatus: 'REVIEWED',
    boundaryReviewedBy: reviewer,
    boundaryReviewedByUserId: user?.id ?? '',
    boundaryReviewedAt: new Date().toISOString(),
    boundaryVersion: Math.max(1, Number(profile.boundaryVersion) || 1),
    boundaryReviewNote: clean(reviewNote),
    boundaryReviewFingerprint: getBoundaryMaterialFingerprint(profile),
  });
}

function saveBoundaryReviewLocally(profile: OrganizationProfile, user: AuthUser | null) {
  localStorage.setItem(getOrganizationProfileStorageKey(user), JSON.stringify(profile));
  dispatchOrganizationProfileUpdated(profile);
  return profile;
}

async function persistBoundaryReview(profile: OrganizationProfile, user: AuthUser | null) {
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

function applyBoundaryReviewInvalidation(
  previous: OrganizationProfile,
  next: OrganizationProfile,
): OrganizationProfile {
  const nextFingerprint = getBoundaryMaterialFingerprint(next);
  const previousFingerprint = previous.boundaryReviewFingerprint || getBoundaryMaterialFingerprint(previous);
  const materialChanged = nextFingerprint !== previousFingerprint;

  if (previous.boundaryStatus === 'REVIEWED' && materialChanged) {
    return {
      ...next,
      boundaryStatus: 'DRAFT',
      boundaryReviewedBy: '',
      boundaryReviewedByUserId: '',
      boundaryReviewedAt: '',
      boundaryReviewNote: '',
      boundaryReviewFingerprint: '',
      boundaryVersion: Math.max(1, previous.boundaryVersion) + 1,
    };
  }

  return {
    ...next,
    boundaryVersion: Math.max(1, previous.boundaryVersion || next.boundaryVersion || 1),
  };
}

function normalizeBoundaryStatus(
  value: unknown,
  input: Partial<OrganizationProfile>,
  defaults: OrganizationProfile,
) {
  const normalized = clean(String(value ?? '')).toUpperCase();
  if (normalized === 'REVIEWED') return 'REVIEWED';
  if (normalized === 'NOT_DEFINED') return 'NOT_DEFINED';
  if (normalized === 'DRAFT') return 'DRAFT';

  const fingerprint = getBoundaryMaterialFingerprint({
    ...defaults,
    ...input,
  } as OrganizationProfile);
  return fingerprint.replace(/\|/g, '').trim() ? 'DRAFT' : 'NOT_DEFINED';
}

function normalizeBoundaryVersion(value: unknown, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : Math.max(1, fallback || 1);
}

function getReviewerDisplayName(user: AuthUser | null) {
  return clean(user?.name) || clean(user?.email) || 'Reviewer';
}

async function trackOrganizationBoundaryAuditEvent(
  eventType: 'BOUNDARY_UPDATED' | 'BOUNDARY_REVIEWED',
  before: OrganizationProfile,
  after: OrganizationProfile,
  user: AuthUser | null,
) {
  if (!getToken()) return;

  try {
    await trackBusinessAuditEvent({
      organizationId: getOrganizationId(user),
      eventType,
      entityType: 'REPORTING_BOUNDARY',
      entityId: getOrganizationId(user) || after.organizationName,
      actorType: 'USER',
      actorUserId: user?.id,
      actorDisplayName: getReviewerDisplayName(user),
      previousVersion: before.boundaryVersion,
      newVersion: after.boundaryVersion,
      reason: eventType === 'BOUNDARY_REVIEWED'
        ? 'Reporting boundary reviewed by an authorized user.'
        : 'Reporting boundary material fields changed.',
      beforeSnapshot: before,
      afterSnapshot: after,
      metadata: {
        boundaryStatus: after.boundaryStatus,
        boundaryReviewedAt: after.boundaryReviewedAt,
        boundaryReviewedBy: after.boundaryReviewedBy,
      },
    });
  } catch {
    // Boundary saves should not fail if audit persistence is temporarily unavailable.
  }
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
