import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExcelInputTable } from './ExcelInputTable';
import { createActivityData, updateActivityData } from '../services/activityData';
import { getConversionFactors } from '../services/conversionFactors';
import { getFacilities } from '../services/facilities';

vi.mock('../services/activityData', () => ({
  createActivityData: vi.fn(),
  updateActivityData: vi.fn(),
}));

vi.mock('../services/conversionFactors', () => ({
  getConversionFactors: vi.fn(),
}));

vi.mock('../services/facilities', () => ({
  getFacilities: vi.fn(),
}));

vi.mock('../services/auth', () => ({
  getCurrentUser: vi.fn(() => ({
    id: 'user-1',
    organizationId: 'org-1',
  })),
  getOrganizationId: vi.fn(() => 'org-1'),
}));

describe('ExcelInputTable empty activity row UX', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getConversionFactors).mockResolvedValue({
      items: [
        {
          id: 'factor-diesel',
          name: 'Diesel factor',
          type: 'EMISSION',
          activityType: 'DIESEL',
          inputUnit: 'liters',
          unit: 'liters',
          factorValue: 2.68,
          resultUnit: 'kgCO2e',
          sourceAuthority: 'Demo / Placeholder',
          sourceYear: 2025,
          isSystemDefault: true,
          isDefault: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'factor-electricity-bc',
          name: 'BC electricity factor',
          type: 'EMISSION',
          activityType: 'ELECTRICITY',
          inputUnit: 'kWh',
          unit: 'kWh',
          factorValue: 0.011,
          resultUnit: 'kgCO2e',
          sourceAuthority: 'Demo / Placeholder',
          sourceYear: 2026,
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'British Columbia',
          isSystemDefault: true,
          isDefault: true,
          verified: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'factor-natural-gas',
          name: 'Natural gas factor',
          type: 'EMISSION',
          activityType: 'NATURAL_GAS',
          inputUnit: 'm3',
          unit: 'm3',
          factorValue: 1.89,
          resultUnit: 'kgCO2e',
          sourceAuthority: 'Demo / Placeholder',
          sourceYear: 2026,
          isSystemDefault: true,
          isDefault: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'factor-gasoline',
          name: 'Gasoline factor',
          type: 'EMISSION',
          activityType: 'GASOLINE',
          inputUnit: 'liters',
          unit: 'liters',
          factorValue: 2.31,
          resultUnit: 'kgCO2e',
          sourceAuthority: 'Demo / Placeholder',
          sourceYear: 2026,
          isSystemDefault: true,
          isDefault: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'factor-air-travel',
          name: 'Business travel flight factor',
          type: 'EMISSION',
          activityType: 'AIR_TRAVEL',
          inputUnit: 'km',
          unit: 'km',
          factorValue: 0.16,
          resultUnit: 'kgCO2e',
          sourceAuthority: 'Demo / Placeholder',
          sourceYear: 2026,
          isSystemDefault: true,
          isDefault: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'factor-hotel',
          name: 'Hotel stay factor',
          type: 'EMISSION',
          activityType: 'HOTEL',
          inputUnit: 'nights',
          unit: 'nights',
          factorValue: 18,
          resultUnit: 'kgCO2e',
          sourceAuthority: 'Demo / Placeholder',
          sourceYear: 2026,
          isSystemDefault: true,
          isDefault: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'factor-ground-transport',
          name: 'Ground transport taxi/rideshare factor',
          type: 'EMISSION',
          activityType: 'GROUND_TRANSPORT',
          inputUnit: 'km',
          unit: 'km',
          factorValue: 0.22,
          resultUnit: 'kgCO2e',
          sourceAuthority: 'Demo / Placeholder',
          sourceYear: 2026,
          isSystemDefault: true,
          isDefault: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      page: 1,
      pageSize: 100,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(getFacilities).mockResolvedValue([]);
    vi.mocked(createActivityData).mockResolvedValue({ id: 'activity-1' } as any);
    vi.mocked(updateActivityData).mockResolvedValue({ id: 'activity-1' } as any);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  function renderTable() {
    return render(<ExcelInputTable onSuccess={vi.fn()} />);
  }

  async function getActivityRow(rowNumber: number) {
    return screen.findByRole('group', { name: `Activity row ${rowNumber}` });
  }

  async function addEmptyRow(rowNumber = 1) {
    await userEvent.click(await screen.findByRole('button', { name: '+ Add Row' }));
    return getActivityRow(rowNumber);
  }

  async function addValidDieselRow(quantity = '100') {
    const row = await addEmptyRow(screen.queryAllByRole('group', { name: /Activity row/i }).length + 1);
    await userEvent.selectOptions(within(row).getByRole('combobox', { name: /Activity type/i }), 'DIESEL');
    await userEvent.type(within(row).getByPlaceholderText('Quantity'), quantity);
    await waitFor(() => {
      expect(within(row).getByText('Diesel factor')).toBeInTheDocument();
    });
    return row;
  }

  it('starts with a clear empty state and disabled Save All', async () => {
    renderTable();

    expect(await screen.findByText('No activity rows.')).toBeInTheDocument();
    expect(screen.getByText('Click "+ Add Row" to begin.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save All' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Remove row/i })).not.toBeInTheDocument();
    expect(screen.queryByText('No matching factor')).not.toBeInTheDocument();
  });

  it('adds an empty row without showing remove or missing factor warnings', async () => {
    renderTable();

    const row = await addEmptyRow();

    expect(within(row).getByRole('combobox', { name: /Activity type/i })).toHaveValue('');
    expect(within(row).getByPlaceholderText('Quantity')).toHaveValue(null);
    expect(screen.queryByText('No activity rows.')).not.toBeInTheDocument();
    expect(screen.queryByText('No matching factor')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remove row/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save All' })).toBeDisabled();
    expect(within(row).getByText('Scope')).toBeInTheDocument();
    expect(
      within(row).getByText('GHG Protocol category inferred from activity type.'),
    ).toBeInTheDocument();
    expect(within(row).getByText('Factor Status')).toBeInTheDocument();
    expect(
      within(row).getByText('Whether this record is ready for emissions calculation.'),
    ).toBeInTheDocument();
    expect(within(row).getByText('Matched Factor')).toBeInTheDocument();
    expect(
      within(row).getByText('Conversion factor matched by type, unit, province, and year.'),
    ).toBeInTheDocument();
    expect(within(row).getByText('Report Treatment')).toBeInTheDocument();
    expect(
      within(row).getByText('How this row will affect totals after saving.'),
    ).toBeInTheDocument();
  });

  it('uses the current pilot province dropdown for manual input', async () => {
    renderTable();

    const row = await addEmptyRow();
    const provinceSelect = within(row).getByRole('combobox', { name: /^Province$/i });

    expect(provinceSelect).toHaveDisplayValue('Select province');
    expect(within(provinceSelect).getByRole('option', { name: 'Alberta' })).toBeInTheDocument();
    expect(
      within(provinceSelect).getByRole('option', { name: 'British Columbia' }),
    ).toBeInTheDocument();
    expect(within(provinceSelect).getByRole('option', { name: 'Ontario' })).toBeInTheDocument();
    expect(within(provinceSelect).queryByRole('option', { name: 'Quebec' })).not.toBeInTheDocument();
    expect(within(provinceSelect).queryByRole('option', { name: 'Saskatchewan' })).not.toBeInTheDocument();
    expect(within(provinceSelect).queryByRole('option', { name: 'Nunavut' })).not.toBeInTheDocument();
  });

  it('shows remove after a type is selected and returns to empty state after removal', async () => {
    renderTable();

    const row = await addEmptyRow();
    await userEvent.selectOptions(within(row).getByRole('combobox', { name: /Activity type/i }), 'DIESEL');

    const removeButton = await screen.findByRole('button', { name: /Remove row 1/i });
    expect(removeButton).toBeInTheDocument();

    await userEvent.click(removeButton);

    expect(screen.getByText('No activity rows.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remove row/i })).not.toBeInTheDocument();
  });

  it('updates factor matching when type and unit are valid', async () => {
    renderTable();

    const row = await addEmptyRow();
    await userEvent.selectOptions(within(row).getByRole('combobox', { name: /Activity type/i }), 'DIESEL');

    await waitFor(() => {
      expect(within(row).getByText('Diesel factor')).toBeInTheDocument();
    });
    expect(screen.queryByText('No matching factor')).not.toBeInTheDocument();
  });

  it('shows tracked metric guidance for water rows', async () => {
    renderTable();

    const row = await addEmptyRow();
    await userEvent.selectOptions(within(row).getByRole('combobox', { name: /Activity type/i }), 'WATER');

    expect(within(row).getByText('Tracked Metric')).toBeInTheDocument();
    expect(within(row).getAllByText('Not Emissions Factor Required').length).toBeGreaterThan(0);
    expect(within(row).getByText('Tracked Only')).toBeInTheDocument();
    expect(within(row).getAllByText(/excluded from GHG total/i).length).toBeGreaterThan(0);
  });

  it.each([
    ['ELECTRICITY', 'British Columbia', 'Scope 2', 'Electricity - British Columbia'],
    ['NATURAL_GAS', '', 'Scope 1', 'Natural gas factor'],
    ['GASOLINE', '', 'Scope 1', 'Gasoline factor'],
    ['DIESEL', '', 'Scope 1', 'Diesel factor'],
    ['AIR_TRAVEL', '', 'Scope 3', 'Business travel flight factor'],
    ['HOTEL', '', 'Scope 3', 'Hotel stay factor'],
    ['GROUND_TRANSPORT', '', 'Scope 3', 'Ground transport taxi/rideshare factor'],
  ])('assigns scope and matched status for %s rows', async (activityType, province, scopeLabel, factorName) => {
    renderTable();

    const row = await addEmptyRow();
    await userEvent.selectOptions(
      within(row).getByRole('combobox', { name: /Activity type/i }),
      activityType,
    );
    await userEvent.type(within(row).getByPlaceholderText('Quantity'), '10');

    if (province) {
      await userEvent.selectOptions(
        within(row).getByRole('combobox', { name: /Province required for electricity records/i }),
        province,
      );
    }

    expect(within(row).getByText('Scope')).toBeInTheDocument();
    expect(within(row).getByText(scopeLabel)).toBeInTheDocument();
    expect(within(row).getByText('Matched')).toBeInTheDocument();
    expect(within(row).getByText('Included')).toBeInTheDocument();
    expect(within(row).getByText(factorName)).toBeInTheDocument();
  });

  it('keeps electricity province requirements concise until province is selected', async () => {
    renderTable();

    const row = await addEmptyRow();
    await userEvent.selectOptions(within(row).getByRole('combobox', { name: /Activity type/i }), 'ELECTRICITY');
    const provinceSelect = within(row).getByRole('combobox', {
      name: /Province required for electricity records/i,
    });

    expect(within(row).queryByText('Province *')).not.toBeInTheDocument();
    expect(provinceSelect).toHaveDisplayValue('Select province');
    expect(provinceSelect).toBeRequired();
    expect(within(provinceSelect).getByRole('option', { name: 'Alberta' })).toBeInTheDocument();
    expect(
      within(provinceSelect).getByRole('option', { name: 'British Columbia' }),
    ).toBeInTheDocument();
    expect(within(provinceSelect).getByRole('option', { name: 'Ontario' })).toBeInTheDocument();
    expect(within(provinceSelect).queryByRole('option', { name: 'Quebec' })).not.toBeInTheDocument();
    expect(within(provinceSelect).queryByRole('option', { name: 'Nunavut' })).not.toBeInTheDocument();
    expect(within(row).getByText('Missing Province')).toBeInTheDocument();
    expect(within(row).getByText('Select province to calculate.')).toBeInTheDocument();
    expect(within(row).getByText('Not selected')).toBeInTheDocument();
    expect(within(row).getByText('Province required')).toBeInTheDocument();
    expect(within(row).getByText('Current pilot coverage supports AB, BC, and ON.')).toBeInTheDocument();
    expect(
      screen.getAllByText(
        'Electricity emissions require a province-specific factor. Please select the province where the electricity was used.',
      ).length,
    ).toBe(1);
    expect(within(row).queryByText(/Electricity emissions require a province-specific factor/i)).not.toBeInTheDocument();
    expect(within(row).getByText('Excluded')).toBeInTheDocument();
    expect(within(row).getByText('Province required before calculation.')).toBeInTheDocument();
  });

  it('applies the bulk province to electricity rows and reruns factor matching', async () => {
    renderTable();

    const row = await addEmptyRow();
    await userEvent.selectOptions(within(row).getByRole('combobox', { name: /Activity type/i }), 'ELECTRICITY');
    const bulkProvinceSelect = screen.getByRole('combobox', {
      name: /Province to apply to selected electricity records/i,
    });

    expect(within(bulkProvinceSelect).getByRole('option', { name: 'Alberta' })).toBeInTheDocument();
    expect(within(bulkProvinceSelect).getByRole('option', { name: 'Ontario' })).toBeInTheDocument();
    expect(within(bulkProvinceSelect).queryByRole('option', { name: 'Quebec' })).not.toBeInTheDocument();

    await userEvent.selectOptions(
      bulkProvinceSelect,
      'British Columbia',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Apply province' }));

    expect(screen.getByRole('status')).toHaveTextContent('Province applied to electricity rows.');
    expect(
      within(row).getByRole('combobox', { name: /Province required for electricity records/i }),
    ).toHaveDisplayValue('British Columbia');
    expect(within(row).queryByText('Missing Province')).not.toBeInTheDocument();
    expect(within(row).getByText('Matched')).toBeInTheDocument();
    expect(within(row).getByText('British Columbia electricity factor matched.')).toBeInTheDocument();
    expect(within(row).getByText('Electricity - British Columbia')).toBeInTheDocument();
    expect(within(row).getByText('Scope 2')).toBeInTheDocument();
    expect(within(row).getByText('Included')).toBeInTheDocument();
  });

  it('matches a valid manual electricity row with the Alberta pilot factor', async () => {
    vi.mocked(getConversionFactors).mockResolvedValueOnce({
      items: [
        {
          id: 'factor-electricity-ab',
          name: 'Electricity - Alberta',
          type: 'EMISSION',
          activityType: 'ELECTRICITY',
          inputUnit: 'kWh',
          unit: 'kWh',
          factorValue: 0.12,
          resultUnit: 'kgCO2e',
          sourceAuthority: 'Demo / Placeholder',
          sourceYear: 2026,
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Alberta',
          isSystemDefault: true,
          isDefault: true,
          verified: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      page: 1,
      pageSize: 100,
      total: 1,
      totalPages: 1,
    });
    renderTable();

    const row = await addEmptyRow();
    await userEvent.selectOptions(
      within(row).getByRole('combobox', { name: /Activity type/i }),
      'ELECTRICITY',
    );
    await userEvent.type(within(row).getByPlaceholderText('Quantity'), '500');
    await userEvent.selectOptions(
      within(row).getByRole('combobox', { name: /Province required for electricity records/i }),
      'Alberta',
    );

    await waitFor(() => {
      expect(within(row).getByText('Matched')).toBeInTheDocument();
    });
    expect(within(row).getByText('Electricity - Alberta')).toBeInTheDocument();
    expect(within(row).getByText('Scope 2')).toBeInTheDocument();
    expect(within(row).getByText('Included')).toBeInTheDocument();
    expect(within(row).queryByText('Missing Province')).not.toBeInTheDocument();
  });

  it('normalizes manually selected electricity province and shows missing factor clearly', async () => {
    renderTable();

    const row = await addEmptyRow();
    await userEvent.selectOptions(within(row).getByRole('combobox', { name: /Activity type/i }), 'ELECTRICITY');
    await userEvent.selectOptions(
      within(row).getByRole('combobox', { name: /Province required for electricity records/i }),
      'Alberta',
    );

    expect(within(row).getByText('Missing Factor')).toBeInTheDocument();
    expect(within(row).getByText('No factor for selected province/year.')).toBeInTheDocument();
    expect(within(row).getByText('No factor found')).toBeInTheDocument();
    expect(within(row).getByText('Alberta · kWh')).toBeInTheDocument();
  });

  it('saves electricity rows missing province as requiring review', async () => {
    renderTable();

    const row = await addEmptyRow();
    await userEvent.selectOptions(within(row).getByRole('combobox', { name: /Activity type/i }), 'ELECTRICITY');
    await userEvent.type(within(row).getByPlaceholderText('Quantity'), '100');
    await userEvent.click(within(row).getByRole('button', { name: /Save row 1/i }));

    await waitFor(() => {
      expect(createActivityData).toHaveBeenCalledWith(
        expect.objectContaining({
          activityType: 'ELECTRICITY',
          quantity: 100,
          jurisdictionRegion: undefined,
          notes: expect.stringContaining('Status: MISSING_PROVINCE'),
        }),
      );
    });
    await waitFor(() => {
      expect(within(row).getByText('Requires Review')).toBeInTheDocument();
    });
    expect(within(row).getByText('Province is required before this electricity record can be calculated.')).toBeInTheDocument();
  });

  it('saves invalid-unit rows as requiring review instead of blocking save', async () => {
    renderTable();

    const row = await addEmptyRow();
    await userEvent.selectOptions(within(row).getByRole('combobox', { name: /Activity type/i }), 'DIESEL');
    await userEvent.type(within(row).getByPlaceholderText('Quantity'), '20');
    await userEvent.clear(within(row).getByPlaceholderText('Unit'));
    await userEvent.type(within(row).getByPlaceholderText('Unit'), 'bottles');

    await waitFor(() => {
      expect(within(row).getAllByText('Unit Mismatch').length).toBeGreaterThan(0);
      expect(within(row).getByText(/Submitted unit does not match available factor units/i)).toBeInTheDocument();
      expect(within(row).getAllByText(/Supported unit: liters/i).length).toBeGreaterThan(0);
    });

    await userEvent.click(within(row).getByRole('button', { name: /Save row 1/i }));

    await waitFor(() => {
      expect(createActivityData).toHaveBeenCalledWith(
        expect.objectContaining({
          activityType: 'DIESEL',
          quantity: 20,
          unit: 'bottles',
        }),
      );
    });
    await waitFor(() => {
      expect(within(row).getByText('Saved · Unit Mismatch')).toBeInTheDocument();
    });
    expect(within(row).getByRole('button', { name: /Save row 1/i })).toBeDisabled();
  });

  it('shows missing factor for unsupported activity types', async () => {
    renderTable();

    const row = await addEmptyRow();
    await userEvent.selectOptions(within(row).getByRole('combobox', { name: /Activity type/i }), 'CUSTOM');
    await userEvent.type(within(row).getByPlaceholderText('Quantity'), '5');
    await userEvent.type(within(row).getByPlaceholderText('Unit'), 'kWh');

    expect(within(row).getByText('Missing Factor')).toBeInTheDocument();
    expect(within(row).getByText('Excluded')).toBeInTheDocument();
  });

  it('requires a valid date and positive amount before save', async () => {
    renderTable();

    const row = await addEmptyRow();
    await userEvent.selectOptions(within(row).getByRole('combobox', { name: /Activity type/i }), 'DIESEL');
    await userEvent.clear(within(row).getByPlaceholderText('Quantity'));
    await userEvent.type(within(row).getByPlaceholderText('Quantity'), '0');
    await userEvent.clear(within(row).getByLabelText('Date'));
    await userEvent.click(within(row).getByRole('button', { name: /Save row 1/i }));

    expect(await within(row).findByText(/Missing date/i)).toBeInTheDocument();
    expect(within(row).getByText(/Quantity must be greater than 0/i)).toBeInTheDocument();
    expect(createActivityData).not.toHaveBeenCalled();
  });

  it('saves a single row from the row action', async () => {
    const onSuccess = vi.fn();
    render(<ExcelInputTable onSuccess={onSuccess} />);

    const row = await addValidDieselRow('100');
    await userEvent.click(within(row).getByRole('button', { name: /Save row 1/i }));

    await waitFor(() => {
      expect(createActivityData).toHaveBeenCalledWith(
        expect.objectContaining({
          activityType: 'DIESEL',
          quantity: 100,
          unit: 'liters',
        }),
      );
    });
    await waitFor(() => {
      expect(within(row).getAllByText('Saved').length).toBeGreaterThan(0);
    });
    expect(within(row).getByRole('button', { name: /Save row 1/i })).toBeDisabled();
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('saves multiple rows individually', async () => {
    renderTable();

    const firstRow = await addValidDieselRow('100');
    const secondRow = await addValidDieselRow('200');

    await userEvent.click(within(firstRow).getByRole('button', { name: /Save row 1/i }));
    await userEvent.click(within(secondRow).getByRole('button', { name: /Save row 2/i }));

    await waitFor(() => {
      expect(createActivityData).toHaveBeenCalledTimes(2);
    });
    expect(within(firstRow).getAllByText('Saved').length).toBeGreaterThan(0);
    expect(within(secondRow).getAllByText('Saved').length).toBeGreaterThan(0);
  });

  it('Save All saves unsaved rows and skips already saved rows', async () => {
    renderTable();

    const firstRow = await addValidDieselRow('100');
    await userEvent.click(within(firstRow).getByRole('button', { name: /Save row 1/i }));
    await waitFor(() => {
      expect(createActivityData).toHaveBeenCalledTimes(1);
    });

    await addValidDieselRow('200');
    await userEvent.click(screen.getByRole('button', { name: 'Save All' }));

    await waitFor(() => {
      expect(createActivityData).toHaveBeenCalledTimes(2);
    });
    expect(createActivityData).toHaveBeenLastCalledWith(
      expect.objectContaining({
        activityType: 'DIESEL',
        quantity: 200,
      }),
    );
  });

  it('removes an unsaved row', async () => {
    renderTable();

    const row = await addValidDieselRow('100');
    await userEvent.click(within(row).getByRole('button', { name: /Remove row 1/i }));

    expect(screen.getByText('No activity rows.')).toBeInTheDocument();
    expect(createActivityData).not.toHaveBeenCalled();
  });

  it('warns when navigating away with unsaved activity rows', async () => {
    renderTable();

    await addValidDieselRow('100');

    const event = new Event('beforeunload', { cancelable: true });
    const allowed = window.dispatchEvent(event);

    expect(allowed).toBe(false);
  });
});
