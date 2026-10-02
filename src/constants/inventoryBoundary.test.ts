import { describe, expect, it } from 'vitest';
import {
  CARBONLITE_CALCULATION_COVERAGE_LABEL,
  getInventoryBoundaryStatus,
  summarizeInventoryBoundary,
  type InventoryBoundary,
} from './inventoryBoundary';

const completeBoundary: InventoryBoundary = {
  organizationWorkspace: 'KACH CANADA LTD.',
  reportingPeriod: '2026 reporting period',
  geographicBoundary: 'Calgary HQ and Toronto Client Visit',
  includedFacilitiesOrLocations: 'Calgary HQ; Toronto Client Visit',
  excludedFacilitiesOrLocations: 'None',
  includedScopes: 'Scope 1, Scope 2, and selected Scope 3 pilot categories',
  scope3CoverageNote: 'Selected business travel records only.',
  exclusionsLimitations: 'None identified.',
};

describe('inventory boundary summaries', () => {
  it('marks incomplete configured boundaries instead of substituting calculation coverage', () => {
    const boundary = {
      ...completeBoundary,
      includedScopes: '',
      excludedFacilitiesOrLocations: '',
      exclusionsLimitations: '',
    };

    expect(getInventoryBoundaryStatus(boundary)).toBe('Not fully specified');
    expect(summarizeInventoryBoundary(boundary, '2026 reporting period')).toBe(
      '2026 reporting period · Boundary not fully specified',
    );
    expect(summarizeInventoryBoundary(boundary, '2026 reporting period')).not.toContain(
      CARBONLITE_CALCULATION_COVERAGE_LABEL,
    );
  });

  it('summarizes actual configured scopes only when the boundary is complete', () => {
    expect(getInventoryBoundaryStatus(completeBoundary)).toBe('Complete');
    expect(summarizeInventoryBoundary(completeBoundary, '2026 reporting period')).toBe(
      '2026 reporting period · Scope 1, Scope 2, selected Scope 3 · Calgary HQ and Toronto Client Visit',
    );
  });

  it('does not infer configured scopes from calculated activity coverage', () => {
    const boundary = {
      ...completeBoundary,
      includedScopes: '',
    };

    expect(summarizeInventoryBoundary(boundary, '2026 reporting period')).toBe(
      '2026 reporting period · Boundary not fully specified',
    );
  });
});
