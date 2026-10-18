import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { FactorDetailsPage } from './FactorDetailsPage';
import { getFactorVersion, getFactorVersions, getFactorHistory, getFactorVersionUsage } from '../services/factorVersions';
vi.mock('../services/factorVersions', () => ({ getFactorVersion: vi.fn(), getFactorVersions: vi.fn(), getFactorHistory: vi.fn(), getFactorVersionUsage: vi.fn() }));

describe('official reference factor detail', () => {
  it('renders actual applicability and methodology references without regulatory certification', async () => {
    const factor = { id: 'reference', factorId: 'egdf', displayName: 'Alberta Electricity Grid Displacement', version: '2026.1', factorValue: .4303, inputUnit: 'MWh', resultUnit: 'tCO2e', factorYear: 2026, jurisdictionRegion: 'Alberta', jurisdictionCountry: 'Canada', status: 'DRAFT', verified: false, confidenceLevel: 'OFFICIAL_GOVERNMENT', applicability: 'ALBERTA_OFFSET_PROJECT', emissionBasis: 'DIRECT_CO2E', source: { id: 'handbook', sourceAuthority: 'Alberta Environment and Protected Areas', sourceDocument: 'Carbon Offset Emission Factors Handbook', sourceVersion: '3.2', sourceYear: 2025, publishedDate: '2025-08-20', isOfficial: true, isActive: true, publisherType: 'GOVERNMENT' }, methodologyProvenance: { methodologyDocument: 'Alberta Greenhouse Gas Quantification Methodologies', methodologyVersion: '2.3', methodologyMethod: 'Method 1-1', methodologyLevel: 'Level 1 / 2' } };
    vi.mocked(getFactorVersion).mockResolvedValue(factor as never);
    vi.mocked(getFactorVersions).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(getFactorHistory).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(getFactorVersionUsage).mockResolvedValue({ reportsUsingThisFactor: 0, activityRecordsUsingThisFactor: 0, calculations: 0, organizations: 0, recentCalculations: [] });
    render(<MemoryRouter initialEntries={['/factor-versions/reference']}><Routes><Route path="/factor-versions/:factorVersionId" element={<FactorDetailsPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByText('Alberta Offset Project')).toBeInTheDocument();
    expect(screen.getByText('Method 1-1')).toBeInTheDocument();
    expect(screen.getByText('3.2')).toBeInTheDocument();
    expect(screen.getByText('2.3')).toBeInTheDocument();
    expect(screen.queryByText(/TIER compliant|SGRR compliant|Offset compliant|certified|Verified under AQM/i)).not.toBeInTheDocument();
  });
});
