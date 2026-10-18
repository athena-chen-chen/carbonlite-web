import { describe, expect, it } from 'vitest';
import { getDisplayFactorVersionLines, getDisplayFactorProvenanceLines, getDisplayFactorJurisdiction } from './factorProvenanceDisplay';
import { buildFactorDetailText } from '../reports/pdf/pdfSections';

describe('factor provenance display', () => {
  it('keeps version-record IDs out of business version labels', () => {
    const factorVersionId = 'cmv8vg8eu0009gd3sxfn0w9z7';
    expect(getDisplayFactorVersionLines({ factorVersionId, factorVersion: factorVersionId,
      factorProvenance: { sourceVersion: 'v1.0' } })).toEqual(['Source Document Version: v1.0']);
    expect(getDisplayFactorVersionLines({ factorVersionId: 'abc123', factorVersion: 'abc123' })).toEqual([]);
    expect(getDisplayFactorVersionLines({ factorVersionId: 'abc123', factorVersion: null })).toEqual([]);
    expect(getDisplayFactorVersionLines({ factorVersion: 'factor_version_42021014c4a94c386f29eb341d0feb1a' })).toEqual([]);
  });
  it('never substitutes a factor identifier when only a source document version exists', () => {
    expect(getDisplayFactorVersionLines({ factorId: 'demo-2025-kwh-alberta', factorVersion: null, sourceVersion: 'v1.0' }))
      .toEqual(['Source Document Version: v1.0']);
    expect(getDisplayFactorVersionLines({ factorId: 'demo-2025-kwh-alberta', factorVersion: 'demo-2025-kwh-alberta', sourceVersion: 'v1.0' }))
      .toEqual(['Source Document Version: v1.0']);
    expect(getDisplayFactorVersionLines({ factorVersion: '2.1', sourceVersion: '3.2' }))
      .toEqual(['Factor Version: 2.1', 'Source Document Version: 3.2']);
  });
  it('shows meaningful factor and document versions separately', () => {
    expect(getDisplayFactorVersionLines({ factorVersion: 'v2.1', factorProvenance: { sourceVersion: '3.2' } }))
      .toEqual(['Factor Version: v2.1', 'Source Document Version: 3.2']);
    expect(getDisplayFactorVersionLines({ factorVersionId: 'record-id', factorProvenance: { factorVersion: 'demo-2025-kwh-alberta', sourceVersion: 'v1.0' } }))
      .toEqual(['Source Document Version: v1.0']);
  });
  it.each(['demo-2025-kwh-alberta', 'ECCC_EPR_2025_TABLE_A8'])('omits audited key %s while retaining document version and vintage', factorVersion => {
    const provenance = { factorVersion, sourceVersion: 'v1.0', factorYear: 2025 };
    expect(getDisplayFactorProvenanceLines({ factorVersion, factorProvenance: provenance }))
      .toEqual(['Source Document Version: v1.0', 'Factor Vintage: 2025']);
    expect(getDisplayFactorProvenanceLines({ factorProvenance: provenance }))
      .toEqual(['Source Document Version: v1.0', 'Factor Vintage: 2025']);
  });
  it('preserves text business revisions and falls back to a genuine methodology revision', () => {
    expect(getDisplayFactorVersionLines({ factorVersion: 'reviewed-release-October' })).toEqual(['Factor Version: reviewed-release-October']);
    expect(getDisplayFactorVersionLines({ factorVersion: 'demo-2025-kwh-alberta', methodologyProvenance: { factorVersion: '2026.1' } }))
      .toEqual(['Factor Version: 2026.1']);
  });
  it('assigns a version from the existing document title only to that document', () => {
    expect(getDisplayFactorVersionLines({ sourceDocument: 'CarbonLite MVP Default Factors v1.0' }))
      .toEqual(['Source Document Version: v1.0']);
    expect(getDisplayFactorVersionLines({ sourceDocument: 'CarbonLite default factors' })).toEqual([]);
    const lines = getDisplayFactorProvenanceLines({ sourceDocument: 'Handbook', factorProvenance: { sourceVersion: '3.2', applicability: 'REFERENCE_ONLY', emissionBasis: 'CO2_COMPONENT' } });
    expect(lines.filter(line => line.startsWith('Source Document Version:'))).toEqual(['Source Document Version: 3.2']);
    expect(lines).toContain('Applicability: Reference Only');
    expect(lines).toContain('Emission Basis: CO2 COMPONENT');
  });
  it.each([
    ['Alberta', 'Canada', 'Alberta, Canada'],
    ['Alberta, Canada', 'Canada', 'Alberta, Canada'],
    ['Canada (Generic)', 'Canada', 'Canada (Generic)'],
    ['Canada Generic', 'Canada', 'Canada (Generic)'],
    [null, 'Canada', 'Canada (Generic)'],
    [null, null, 'Not specified'],
  ])('formats persisted jurisdiction %s / %s', (factorJurisdictionRegion, factorJurisdictionCountry, expected) => {
    expect(getDisplayFactorJurisdiction({ factorJurisdictionRegion, factorJurisdictionCountry })).toBe(expected);
  });
  it('uses the same truthful version labels in Technical PDF factor text', () => {
    const text = buildFactorDetailText({ factorId: 'electricity', factorVersionId: 'cmv8vg8eu0009gd3sxfn0w9z7',
      factorName: 'Electricity - Alberta', factorValue: .53, inputUnit: 'kWh', resultUnit: 'kgCO2e',
      sourceAuthority: 'CarbonLite System Defaults', sourceDocument: 'CarbonLite MVP Default Factors v1.0', factorType: 'System' });
    expect(text).toContain('Source Document Version: v1.0');
    expect(text).not.toContain('cmv8vg8eu0009gd3sxfn0w9z7');
    expect(text).not.toMatch(/\nVersion:|\nFactor Version:/);
  });
});
