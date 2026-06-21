import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExcelInputTable } from './ExcelInputTable';
import { createActivityData } from '../services/activityData';
import { getConversionFactors } from '../services/conversionFactors';

vi.mock('../services/activityData', () => ({
  createActivityData: vi.fn(),
}));

vi.mock('../services/conversionFactors', () => ({
  getConversionFactors: vi.fn(),
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
      ],
      page: 1,
      pageSize: 100,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(createActivityData).mockResolvedValue({ id: 'activity-1' } as any);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  function renderTable() {
    return render(<ExcelInputTable onSuccess={vi.fn()} />);
  }

  async function addValidDieselRow(quantity = '100') {
    await userEvent.click(await screen.findByRole('button', { name: '+ Add Row' }));
    const rows = screen.getAllByRole('row');
    const row = rows[rows.length - 1];
    await userEvent.selectOptions(within(row).getByRole('combobox'), 'DIESEL');
    await userEvent.type(within(row).getByPlaceholderText('Quantity'), quantity);
    await waitFor(() => {
      expect(within(row).getByText(/Matched: Diesel factor/i)).toBeInTheDocument();
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

    await userEvent.click(await screen.findByRole('button', { name: '+ Add Row' }));

    expect(screen.getByRole('combobox')).toHaveValue('');
    expect(screen.getByPlaceholderText('Quantity')).toHaveValue(null);
    expect(screen.queryByText('No activity rows.')).not.toBeInTheDocument();
    expect(screen.queryByText('No matching factor')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remove row/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save All' })).toBeDisabled();
  });

  it('shows remove after a type is selected and returns to empty state after removal', async () => {
    renderTable();

    await userEvent.click(await screen.findByRole('button', { name: '+ Add Row' }));
    await userEvent.selectOptions(screen.getByRole('combobox'), 'DIESEL');

    const removeButton = await screen.findByRole('button', { name: /Remove row 1/i });
    expect(removeButton).toBeInTheDocument();

    await userEvent.click(removeButton);

    expect(screen.getByText('No activity rows.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remove row/i })).not.toBeInTheDocument();
  });

  it('updates factor matching when type and unit are valid', async () => {
    renderTable();

    await userEvent.click(await screen.findByRole('button', { name: '+ Add Row' }));
    await userEvent.selectOptions(screen.getByRole('combobox'), 'DIESEL');

    await waitFor(() => {
      expect(screen.getByText(/Matched: Diesel factor/i)).toBeInTheDocument();
    });
    expect(screen.queryByText('No matching factor')).not.toBeInTheDocument();
  });

  it('shows missing factor warning only after a typed row has no match', async () => {
    renderTable();

    await userEvent.click(await screen.findByRole('button', { name: '+ Add Row' }));
    await userEvent.selectOptions(screen.getByRole('combobox'), 'WATER');

    const row = screen.getByRole('row', { name: /WATER/i });
    expect(within(row).getByText('No matching factor')).toBeInTheDocument();
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
