import { render, screen, within } from '@testing-library/react';
import { getCustomerMethodologyFactors } from '../services/conversionFactors';
import { CustomerMethodologyFactorsPage } from './CustomerMethodologyFactorsPage';

vi.mock('../services/conversionFactors', () => ({
  getCustomerMethodologyFactors: vi.fn(),
}));

const approvedFactors = [
  {
    activityType: 'GASOLINE',
    displayName: 'Motor gasoline combustion — Canada 2026',
    geography: 'Canada',
    applicabilityYear: 2026,
    factorValue: 2.3,
    inputUnit: 'L',
    resultUnit: 'kgCO2e',
    source: 'ECCC — National Inventory Report',
    sourceUrl: null,
    methodology: 'Direct combustion factor.',
    accountingBasis: 'Scope 1 — Direct combustion',
    assumptions: null,
    status: 'Approved' as const,
  },
  {
    activityType: 'NATURAL_GAS',
    displayName: 'Natural gas combustion — Alberta 2026 — GJ',
    geography: 'Alberta, Canada',
    applicabilityYear: 2026,
    factorValue: 50.3,
    inputUnit: 'GJ',
    resultUnit: 'kgCO2e',
    source: 'ECCC',
    sourceUrl: null,
    methodology: 'Direct combustion factor.',
    accountingBasis: 'Scope 1 — Direct combustion',
    assumptions: null,
    status: 'Approved' as const,
  },
  {
    activityType: 'NATURAL_GAS',
    displayName: 'Natural gas combustion — Alberta 2026 — m3',
    geography: 'Alberta, Canada',
    applicabilityYear: 2026,
    factorValue: 1.9,
    inputUnit: 'm3',
    resultUnit: 'kgCO2e',
    source: 'ECCC',
    sourceUrl: null,
    methodology: 'Direct combustion factor.',
    accountingBasis: 'Scope 1 — Direct combustion',
    assumptions: null,
    status: 'Approved' as const,
  },
  ...(['Short', 'Medium', 'Long'] as const).map((haul) => ({
    activityType: 'AIR_TRAVEL',
    displayName: `Air travel — ${haul} haul — EPA 2025`,
    geography: 'International',
    applicabilityYear: 2025,
    factorValue: 0.1,
    inputUnit: 'passenger-km',
    resultUnit: 'kgCO2e',
    source: 'EPA — 2025 GHG Emission Factors Hub',
    sourceUrl: 'https://www.epa.gov/',
    methodology: 'Distance-band factor.',
    accountingBasis: 'Scope 3 — Business travel',
    assumptions: null,
    status: 'Approved' as const,
  })),
  {
    activityType: 'ELECTRICITY',
    displayName: 'Electricity — Alberta 2026',
    geography: 'Alberta, Canada',
    applicabilityYear: 2026,
    factorValue: 0.47,
    inputUnit: 'kWh',
    resultUnit: 'kgCO2e',
    source: 'ECCC',
    sourceUrl: null,
    methodology: 'Grid-average electricity factor.',
    accountingBasis: 'Scope 2 — Location-based',
    assumptions: 'Location-based grid average.',
    status: 'Approved' as const,
  },
];

describe('CustomerMethodologyFactorsPage', () => {
  it('shows only the customer-safe, read-only methodology catalog', async () => {
    vi.mocked(getCustomerMethodologyFactors).mockResolvedValue({
      items: approvedFactors,
      total: approvedFactors.length,
    });

    render(<CustomerMethodologyFactorsPage />);

    expect(await screen.findByRole('heading', { name: 'Methodology & emission factors' })).toBeInTheDocument();
    expect(screen.getByText(String(approvedFactors.length))).toBeInTheDocument();
    expect(screen.getByText('Air travel — Short haul — EPA 2025')).toBeInTheDocument();
    expect(screen.getByText('Air travel — Medium haul — EPA 2025')).toBeInTheDocument();
    expect(screen.getByText('Air travel — Long haul — EPA 2025')).toBeInTheDocument();
    expect(screen.getByText('Natural gas combustion — Alberta 2026 — GJ')).toBeInTheDocument();
    expect(screen.getByText('Natural gas combustion — Alberta 2026 — m3')).toBeInTheDocument();
    expect(screen.getByText('Scope 2 — Location-based')).toBeInTheDocument();
    expect(screen.getAllByText('Approved')).toHaveLength(approvedFactors.length);

    const table = screen.getByRole('table');
    for (const internalLabel of ['Factor ID', 'FactorVersion ID', 'Verification status', 'Confidence level']) {
      expect(within(table).queryByText(internalLabel)).not.toBeInTheDocument();
    }
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText(/reference \/ legacy/i)).not.toBeInTheDocument();
  });
});
