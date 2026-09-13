export type InventoryBoundary = {
  organizationWorkspace: string;
  industry?: string;
  otherIndustry?: string;
  country?: string;
  provinceOrTerritory?: string;
  city?: string;
  reportingPeriod: string;
  geographicBoundary: string;
  includedFacilitiesOrLocations: string;
  excludedFacilitiesOrLocations?: string;
  includedScopes: string;
  scope3CoverageNote: string;
  exclusionsLimitations: string;
  boundaryNotes?: string;
};

export const DEFAULT_INVENTORY_BOUNDARY: InventoryBoundary = {
  organizationWorkspace: 'CarbonLite Sample Workspace',
  reportingPeriod: 'Pilot sample reporting period',
  geographicBoundary:
    'Sample Canadian operations, including Alberta, British Columbia, and Ontario activity records',
  includedFacilitiesOrLocations:
    'Sample facilities or activity locations represented in the pilot dataset',
  excludedFacilitiesOrLocations:
    'No real customer facilities are included in the sample workspace.',
  includedScopes: 'Scope 1, Scope 2, and selected Scope 3 pilot activity types',
  scope3CoverageNote:
    'Current pilot Scope 3 coverage focuses on selected business travel and transportation-related activity records. Scope 3 coverage is limited in this pilot and does not represent a complete Scope 3 inventory.',
  exclusionsLimitations:
    'This sample inventory is for workflow review only and does not represent a certified or complete organizational GHG inventory.',
  boundaryNotes:
    'Current pilot supports selected units and activity types. Additional unit conversion support will be expanded later.',
};

export function buildInventoryBoundary(
  organizationName?: string | null,
  reportingPeriod?: string | null,
  overrides?: Partial<InventoryBoundary> | null,
): InventoryBoundary {
  const boundary = {
    ...DEFAULT_INVENTORY_BOUNDARY,
    ...(overrides ?? {}),
  };

  return {
    ...boundary,
    organizationWorkspace:
      organizationName?.trim() || boundary.organizationWorkspace,
    reportingPeriod:
      reportingPeriod?.trim() || boundary.reportingPeriod,
  };
}

export function summarizeInventoryBoundary(
  boundary: InventoryBoundary,
  reportingPeriodSummary?: string | null,
) {
  const period = reportingPeriodSummary?.trim() || boundary.reportingPeriod;
  const scopes = summarizeScopes(boundary.includedScopes);
  const geography = summarizeGeographicBoundary(boundary.geographicBoundary);

  return [period, scopes, geography].filter(Boolean).join(' · ');
}

function summarizeScopes(includedScopes?: string | null) {
  const normalized = String(includedScopes ?? '').trim();
  if (!normalized) return 'Scope 1, Scope 2, selected Scope 3';

  return normalized
    .replace(/\band selected Scope 3 pilot activity types\b/i, 'selected Scope 3')
    .replace(/\band selected Scope 3 pilot categories\b/i, 'selected Scope 3')
    .replace(/\bselected Scope 3 pilot activity types\b/i, 'selected Scope 3')
    .replace(/\bselected Scope 3 pilot categories\b/i, 'selected Scope 3')
    .replace(/\s+/g, ' ')
    .trim();
}

function summarizeGeographicBoundary(geographicBoundary?: string | null) {
  const normalized = String(geographicBoundary ?? '').trim();
  if (!normalized) return '';

  if (
    normalized === DEFAULT_INVENTORY_BOUNDARY.geographicBoundary ||
    /^sample canadian operations/i.test(normalized)
  ) {
    return 'Sample Canadian operations';
  }

  return normalized;
}
