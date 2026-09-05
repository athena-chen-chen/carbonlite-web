export type InventoryBoundary = {
  organizationWorkspace: string;
  reportingPeriod: string;
  geographicBoundary: string;
  includedFacilitiesOrLocations: string;
  includedScopes: string;
  scope3CoverageNote: string;
  exclusionsLimitations: string;
};

export const DEFAULT_INVENTORY_BOUNDARY: InventoryBoundary = {
  organizationWorkspace: 'CarbonLite Sample Workspace',
  reportingPeriod: 'Pilot sample reporting period',
  geographicBoundary:
    'Sample Canadian operations, including Alberta, British Columbia, and Ontario activity records',
  includedFacilitiesOrLocations:
    'Sample facilities or activity locations represented in the pilot dataset',
  includedScopes: 'Scope 1, Scope 2, and selected Scope 3 pilot activity types',
  scope3CoverageNote:
    'Current pilot Scope 3 coverage focuses on selected business travel and transportation-related activity records. Scope 3 coverage is limited in this pilot and does not represent a complete Scope 3 inventory.',
  exclusionsLimitations:
    'This sample inventory is for workflow review only and does not represent a certified or complete organizational GHG inventory.',
};

export function buildInventoryBoundary(
  organizationName?: string | null,
  reportingPeriod?: string | null,
): InventoryBoundary {
  return {
    ...DEFAULT_INVENTORY_BOUNDARY,
    organizationWorkspace:
      organizationName?.trim() || DEFAULT_INVENTORY_BOUNDARY.organizationWorkspace,
    reportingPeriod:
      reportingPeriod?.trim() || DEFAULT_INVENTORY_BOUNDARY.reportingPeriod,
  };
}

export function summarizeInventoryBoundary(
  boundary: InventoryBoundary,
  reportingPeriodSummary?: string | null,
) {
  const period = reportingPeriodSummary?.trim() || boundary.reportingPeriod;
  return `${period} · Scope 1, Scope 2, selected Scope 3 · Sample Canadian operations`;
}
