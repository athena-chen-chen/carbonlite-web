import { render, screen, within } from '@testing-library/react';
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
      sourceAuthority: 'CarbonLite system defaults',
      sourceDocument: 'Pilot default factor library',
      methodology:
        'Used for pilot workflow validation; replace with verified ECCC/Alberta factors before production reporting',
      verified: false,
      notes: 'Demo factor. Verify before client or regulatory reporting.',
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

    expect(await screen.findByText('CarbonLite')).toBeInTheDocument();
    expect(screen.getByText('Environment and Climate Change Canada')).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('button', { name: 'View' })[1]);

    expect(screen.getAllByText('Verified').length).toBeGreaterThan(0);
    expect(screen.getByText('Alberta, Canada')).toBeInTheDocument();
    expect(screen.getByText('Canada National Inventory Report')).toBeInTheDocument();
    expect(screen.getByText('ISO-aligned methodology review.')).toBeInTheDocument();
    expect(screen.getByText('Reviewed by consultant.')).toBeInTheDocument();
    expect(screen.getByText(/Created:/)).toBeInTheDocument();
    expect(screen.getByText(/Updated:/)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows factor value in the table and keeps full governance details in the modal', async () => {
    vi.mocked(getConversionFactors).mockResolvedValue({
      items: [
        {
          ...baseFactor,
          jurisdiction: 'Alberta, Canada',
          sourceAuthority: 'CarbonLite system defaults',
          sourceYear: 2025,
          sourceUrl: 'https://example.com/factor-source',
          notes: 'Review before reporting.',
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });

    render(
      <MemoryRouter>
        <ConversionFactorsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('columnheader', { name: 'Factor Value' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Result Unit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Jurisdiction' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Verified' })).not.toBeInTheDocument();
    expect(screen.getByTestId('factor-value-factor-1')).toHaveTextContent('2.68');

    await userEvent.click(screen.getByRole('button', { name: 'View' }));

    expect(screen.getByText('kgCO2e')).toBeInTheDocument();
    expect(screen.getByText('Alberta, Canada')).toBeInTheDocument();
    expect(screen.getByText('2025')).toBeInTheDocument();
    expect(screen.getByText('https://example.com/factor-source')).toBeInTheDocument();
    expect(screen.getByText('Review before reporting.')).toBeInTheDocument();
  });

  it('renders consultant-friendly activity, factor, and source labels in the table', async () => {
    vi.mocked(getConversionFactors).mockResolvedValue({
      items: [
        {
          ...baseFactor,
          id: 'factor-gasoline',
          name: 'Gasoline emission factor',
          activityType: 'GASOLINE',
          sourceAuthority: 'CarbonLite system defaults',
        },
        {
          ...baseFactor,
          id: 'factor-natural-gas',
          name: 'Natural gas combustion factor',
          activityType: 'NATURAL_GAS',
          sourceAuthority: 'CarbonLite system defaults',
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

    await screen.findByTestId('factor-row-factor-gasoline');
    const table = screen.getByRole('table');

    expect(await within(table).findAllByText('Gasoline')).not.toHaveLength(0);
    expect(within(table).getAllByText('Natural Gas')).not.toHaveLength(0);
    expect(within(table).queryByText('GASOLINE')).not.toBeInTheDocument();
    expect(within(table).queryByText('NATURAL_GAS')).not.toBeInTheDocument();
    expect(within(table).queryByText('Gasoline emission factor')).not.toBeInTheDocument();
    expect(within(table).getAllByText('CarbonLite').length).toBeGreaterThan(0);
  });

  it('uses an overflow menu for edit and delete actions', async () => {
    vi.mocked(getConversionFactors).mockResolvedValue({
      items: [baseFactor],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });

    render(
      <MemoryRouter>
        <ConversionFactorsPage />
      </MemoryRouter>,
    );

    await screen.findByTestId('factor-row-factor-1');
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('More actions for Diesel default'));

    expect(screen.getByText('Locked')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeDisabled();
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeDisabled();
  });

  it('sorts conversion factors by factor value', async () => {
    vi.mocked(getConversionFactors).mockResolvedValue({
      items: [
        baseFactor,
        {
          ...baseFactor,
          id: 'factor-2',
          name: 'Electricity default',
          activityType: 'ELECTRICITY',
          unit: 'kWh',
          factorValue: 0.53,
        },
        {
          ...baseFactor,
          id: 'factor-3',
          name: 'Natural gas default',
          activityType: 'NATURAL_GAS',
          unit: 'm3',
          factorValue: 1.89,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 3,
      totalPages: 1,
    });

    render(
      <MemoryRouter>
        <ConversionFactorsPage />
      </MemoryRouter>,
    );

    await screen.findByTestId('factor-row-factor-1');
    await userEvent.selectOptions(screen.getByLabelText('Sort by Factor Value'), 'asc');

    expect(screen.getAllByTestId(/factor-value-/).map((cell) => cell.textContent)).toEqual([
      '0.53',
      '1.89',
      '2.68',
    ]);
  });

  it('filters conversion factors by factor value range', async () => {
    vi.mocked(getConversionFactors).mockResolvedValue({
      items: [
        baseFactor,
        {
          ...baseFactor,
          id: 'factor-2',
          name: 'Electricity default',
          activityType: 'ELECTRICITY',
          unit: 'kWh',
          factorValue: 0.53,
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

    expect(await screen.findByTestId('factor-row-factor-1')).toBeInTheDocument();
    expect(screen.getByTestId('factor-row-factor-2')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Min Factor Value'), '2');

    expect(screen.getByTestId('factor-row-factor-1')).toBeInTheDocument();
    expect(screen.queryByTestId('factor-row-factor-2')).not.toBeInTheDocument();
  });

  it('defaults custom factors to unverified when the create form opens', async () => {
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

    await userEvent.click(await screen.findByRole('button', { name: '+ Add Custom Factor' }));

    expect(screen.getByLabelText('Verified source and methodology')).not.toBeChecked();
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
