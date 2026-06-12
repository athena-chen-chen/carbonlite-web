import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import {
  getConversionFactors,
} from '../services/conversionFactors';
import {
  getFactorTraceability,
  getFactorJurisdiction,
  ConversionFactorsPage,
} from './ConversionFactorsPage';

vi.mock('../services/conversionFactors', () => ({
  createConversionFactor: vi.fn(),
  deleteConversionFactor: vi.fn(),
  getConversionFactors: vi.fn(),
  updateConversionFactor: vi.fn(),
}));

vi.mock('../services/auth', () => ({
  getCurrentUser: vi.fn(() => ({
    email: 'consultant@example.com',
    organizationName: 'KACH CANADA LTD.',
  })),
  getOrganizationName: vi.fn(() => 'KACH CANADA LTD.'),
}));

const baseFactor = {
  id: 'factor-1',
  organizationId: null,
  name: 'Diesel default',
  type: 'EMISSION',
  activityType: 'DIESEL',
  unit: 'L',
  factorValue: 2.68,
  resultUnit: 'kgCO2e',
  sourceName: null,
  sourceReference: null,
  isDefault: true,
  isSystemDefault: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('ConversionFactorsPage traceability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides MVP traceability defaults for system factors without confirmed sources', () => {
    expect(getFactorTraceability(baseFactor)).toMatchObject({
      sourceAuthority: 'MVP Default',
      sourceDocument: 'Pilot default factor library',
      methodology:
        'Used for pilot workflow validation; replace with verified ECCC/Alberta factors before production reporting',
      verified: false,
    });
  });

  it('uses canonical jurisdiction and falls back to legacy region/country fields', () => {
    expect(
      getFactorJurisdiction({
        ...baseFactor,
        jurisdiction: 'Alberta, Canada',
        region: 'Legacy region',
      }),
    ).toBe('Alberta, Canada');
    expect(
      getFactorJurisdiction({
        ...baseFactor,
        jurisdiction: null,
        region: 'British Columbia',
        country: 'Canada',
      }),
    ).toBe('British Columbia, Canada');
  });

  it('displays system factor traceability and verified badge only for verified factors', async () => {
    vi.mocked(getConversionFactors).mockResolvedValue({
      items: [
        baseFactor,
        {
          ...baseFactor,
          id: 'factor-2',
          organizationId: 'org-1',
          name: 'Custom electricity',
          activityType: 'ELECTRICITY',
          jurisdiction: 'Alberta, Canada',
          unit: 'kWh',
          sourceAuthority: 'Environment and Climate Change Canada',
          sourceDocument: 'Canada National Inventory Report',
          sourceYear: 2025,
          sourceUrl: 'https://example.com/source',
          methodology: 'ISO-aligned methodology review.',
          verified: true,
          notes: 'Reviewed by consultant.',
          isSystemDefault: false,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 2,
      totalPages: 1,
    });

    render(
      <MemoryRouter>
        <ConversionFactorsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('MVP Default')).toBeInTheDocument();
    expect(screen.getByText('Environment and Climate Change Canada')).toBeInTheDocument();
    expect(screen.getByText('Verified', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('Unverified')).toBeInTheDocument();
    expect(screen.getByText('Alberta, Canada')).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('button', { name: 'Details' })[1]);

    expect(screen.getByText('Canada National Inventory Report')).toBeInTheDocument();
    expect(screen.getByText('ISO-aligned methodology review.')).toBeInTheDocument();
    expect(screen.getByText('Reviewed by consultant.')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('sends activity type, jurisdiction, and year filters to the backend', async () => {
    vi.mocked(getConversionFactors).mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    });

    render(
      <MemoryRouter>
        <ConversionFactorsPage />
      </MemoryRouter>,
    );

    await screen.findByText('No conversion factors yet.');
    await userEvent.selectOptions(screen.getByLabelText('Activity Type'), 'ELECTRICITY');
    await userEvent.type(screen.getByLabelText('Jurisdiction'), 'Alberta');
    await userEvent.type(screen.getByLabelText('Source Year'), '2025');
    await userEvent.click(screen.getByRole('button', { name: 'Apply Filters' }));

    expect(getConversionFactors).toHaveBeenLastCalledWith({
      activityType: 'ELECTRICITY',
      jurisdiction: 'Alberta',
      sourceYear: 2025,
    });
  });

  it('prefills a custom factor form from missing factor route state', async () => {
    vi.mocked(getConversionFactors).mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    });

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/conversion-factors',
            state: {
              prefillFactor: {
                activityType: 'WATER',
                unit: 'm3',
                resultUnit: 'kgCO2e',
                type: 'EMISSION',
              },
            },
          },
        ]}
      >
        <ConversionFactorsPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText(/Add a conversion factor for WATER \/ m3/i),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('WATER')).toBeInTheDocument();
    expect(screen.getByDisplayValue('m3')).toBeInTheDocument();
    expect(screen.getByDisplayValue('kgCO2e')).toBeInTheDocument();
    expect(screen.getByDisplayValue('EMISSION')).toBeInTheDocument();
  });
});
