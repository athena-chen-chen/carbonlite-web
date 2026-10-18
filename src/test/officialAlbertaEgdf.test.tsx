import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ALBERTA_EGDF_FACTOR_ID, ALBERTA_EGDF_NAME, ALBERTA_EGDF_TABLE, albertaEgdfLegacy, albertaEgdfVersion, albertaEgdfFactor, albertaEgdfSource } from '../../../carbonlite-api/prisma/library/alberta-egdf-2026';
import { ConversionFactorsPage } from '../pages/ConversionFactorsPage';
import { FactorDetailsPage } from '../pages/FactorDetailsPage';
import { getConversionFactors } from '../services/conversionFactors';
import { getFactorVersion, getFactorVersions, getFactorHistory, getFactorVersionUsage } from '../services/factorVersions';
import { findBestConversionFactorMatch } from '../utils/conversionFactorMatching';
import { isInventoryFactorEligible } from '../utils/factorGovernance';

vi.mock('../services/conversionFactors', () => ({ getConversionFactors: vi.fn(), createConversionFactor: vi.fn(), updateConversionFactor: vi.fn(), deleteConversionFactor: vi.fn() }));
vi.mock('../services/factorVersions', () => ({ getFactorVersion: vi.fn(), getFactorVersions: vi.fn(), getFactorHistory: vi.fn(), getFactorVersionUsage: vi.fn() }));
vi.mock('../services/auth', () => ({ getCurrentUser: vi.fn(() => ({ role: 'ADMIN' })), getOrganizationName: vi.fn(() => 'Development') }));
vi.mock('../utils/permissions', () => ({ canManageCompanyFactors: vi.fn(() => true), isPilotReviewer: vi.fn(() => false) }));
vi.mock('../components/AppDialog', () => ({ useAppDialog: () => ({ confirm: vi.fn(), showError: vi.fn() }) }));

const legacy = { ...albertaEgdfLegacy, id: ALBERTA_EGDF_FACTOR_ID, factorValue: albertaEgdfLegacy.factorValue.toString(), effectiveFrom: albertaEgdfLegacy.effectiveFrom.toISOString(), effectiveTo: albertaEgdfLegacy.effectiveTo.toISOString(), createdAt: '2026-10-16T00:00:00Z', updatedAt: '2026-10-16T00:00:00Z' };
const version = { ...albertaEgdfVersion, id: 'opaque-version-record', displayName: ALBERTA_EGDF_NAME, activityType: 'ELECTRICITY', factorValue: Number(albertaEgdfVersion.factorValue), effectiveFrom: albertaEgdfVersion.effectiveFrom.toISOString(), effectiveTo: albertaEgdfVersion.effectiveTo.toISOString(), source: { ...albertaEgdfSource, publishedDate: albertaEgdfSource.publishedDate.toISOString() } };

describe('official Alberta EGDF using the exact library seed records', () => {
  it('shows the official record and separate vintage/source provenance in Admin View', async () => {
    vi.mocked(getConversionFactors).mockResolvedValue({ items: [legacy], total: 1, page: 1, pageSize: 20, totalPages: 1 } as never);
    render(<MemoryRouter><ConversionFactorsPage /></MemoryRouter>);
    expect(await screen.findByText(ALBERTA_EGDF_NAME)).toBeInTheDocument();
    const row = screen.getByTestId(`factor-row-${ALBERTA_EGDF_FACTOR_ID}`);
    expect(within(row).getByText('2025')).toBeInTheDocument();
    expect(within(row).getByText('2026')).toBeInTheDocument();
    expect(within(row).getByText('2026.1')).toBeInTheDocument();
    await userEvent.click(within(row).getByRole('button', { name: 'View' }));
    for (const text of ['Alberta Offset Project', 'Direct CO2e', 'Aug 20, 2025', ALBERTA_EGDF_TABLE, '3.2', 'Factor Vintage']) {
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    }
    expect(screen.queryByText('opaque-version-record')).not.toBeInTheDocument();
  });

  it('shows the full governed factor title, original source units and human version', async () => {
    vi.mocked(getFactorVersion).mockResolvedValue(version as never);
    vi.mocked(getFactorVersions).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(getFactorHistory).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(getFactorVersionUsage).mockResolvedValue({ reportsUsingThisFactor: 0, activityRecordsUsingThisFactor: 0, calculations: 0, organizations: 0, recentCalculations: [] });
    render(<MemoryRouter initialEntries={['/factor-details/opaque-version-record']}><Routes><Route path="/factor-details/:factorVersionId" element={<FactorDetailsPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: ALBERTA_EGDF_NAME })).toBeInTheDocument();
    expect(screen.getByText('Factor Version: 2026.1')).toBeInTheDocument();
    expect(screen.getByText('Aug 20, 2025')).toBeInTheDocument();
    expect(screen.getAllByText(ALBERTA_EGDF_TABLE).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Alberta Offset Project').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/0\.4303/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('MWh').length).toBeGreaterThan(0);
    expect(screen.queryByText(/TIER compliant|Offset compliant|Certified/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Factor Version: opaque-version-record')).not.toBeInTheDocument();
  });

  it('keeps corporate 1000 kWh at 530 with both native and SI-equivalent offset candidates', () => {
    const inventory = { id: 'existing-alberta', name: 'Electricity - Alberta', activityType: 'ELECTRICITY', unit: 'kWh', resultUnit: 'kgCO2e', factorValue: 0.53, sourceYear: 2025, region: 'Alberta', country: 'Canada', isSystemDefault: true };
    const input = { activityType: 'ELECTRICITY', inputUnit: 'kWh', quantity: 1000, jurisdictionCountry: 'Canada', jurisdictionRegion: 'Alberta', recordYear: 2026 };
    for (const candidate of [legacy, { ...legacy, unit: 'kWh', resultUnit: 'kgCO2e' }, { ...albertaEgdfFactor, id: ALBERTA_EGDF_FACTOR_ID, name: ALBERTA_EGDF_NAME, currentActiveVersion: { ...version, inputUnit: 'kWh', resultUnit: 'kgCO2e' } }]) {
      expect(isInventoryFactorEligible(albertaEgdfVersion)).toBe(false);
      expect(findBestConversionFactorMatch({ ...input, factors: [candidate] })).toBeUndefined();
      const match = findBestConversionFactorMatch({ ...input, factors: [candidate, inventory] });
      expect(match?.factor.id).toBe(inventory.id);
      expect(1000 * Number(match?.factor.factorValue)).toBe(530);
    }
  });
});
