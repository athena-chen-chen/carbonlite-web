import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getConversionFactors } from '../services/conversionFactors';
import { ExcelInputTable } from './ExcelInputTable';

vi.mock('../services/activityData', () => ({
  createActivityData: vi.fn(),
}));

vi.mock('../services/conversionFactors', () => ({
  getConversionFactors: vi.fn(),
}));

function mockConversionFactors() {
  vi.mocked(getConversionFactors).mockResolvedValue({
    items: [
      {
        id: 'diesel-factor',
        name: 'Diesel factor',
        type: 'EMISSION',
        activityType: 'diesel',
        unit: 'liters',
        factorValue: 2.68,
        resultUnit: 'kgCO2e',
        isDefault: true,
        isSystemDefault: true,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'electricity-factor',
        name: 'Electricity factor',
        type: 'EMISSION',
        activityType: 'electricity',
        unit: 'kwh',
        factorValue: 0.12,
        resultUnit: 'kgCO2e',
        isDefault: true,
        isSystemDefault: true,
        createdAt: '',
        updatedAt: '',
      },
    ],
    page: 1,
    pageSize: 20,
    total: 2,
    totalPages: 1,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockConversionFactors();
});

describe('ExcelInputTable factor matching', () => {
  it('recomputes factor status when type, unit, or loaded factors change', async () => {
    render(<ExcelInputTable onSuccess={vi.fn()} />);

    expect(screen.getByRole('combobox')).toHaveValue('');
    expect(screen.getByPlaceholderText('Quantity')).toHaveValue(null);
    expect(screen.getByPlaceholderText('Auto-filled after type')).toHaveValue('');

    await userEvent.selectOptions(screen.getByRole('combobox'), 'ELECTRICITY');

    expect(await screen.findByText(/Matched: Electricity factor/i)).toBeInTheDocument();

    const unitInput = screen.getByDisplayValue('kWh');
    await userEvent.clear(unitInput);
    await userEvent.type(unitInput, 'MWh');

    expect(await screen.findByText(/No matching factor/i)).toBeInTheDocument();

    await userEvent.clear(screen.getByDisplayValue('MWh'));
    await userEvent.type(screen.getByPlaceholderText('Auto-filled after type'), 'kwh');

    expect(await screen.findByText(/Matched: Electricity factor/i)).toBeInTheDocument();
  });

  it('adds rows only when the Add Row button is clicked', async () => {
    const user = userEvent.setup();

    render(<ExcelInputTable onSuccess={vi.fn()} />);

    expect(screen.getAllByPlaceholderText('Quantity')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: /\+ add row/i }));

    expect(screen.getAllByPlaceholderText('Quantity')).toHaveLength(2);
  });

  it('does not add a row when Enter is pressed inside a quick entry input', async () => {
    const user = userEvent.setup();

    render(<ExcelInputTable onSuccess={vi.fn()} />);

    await user.type(screen.getByPlaceholderText('Quantity'), '120{enter}');

    expect(screen.getAllByPlaceholderText('Quantity')).toHaveLength(1);
  });

  it('removes draft rows before saving', async () => {
    const user = userEvent.setup();

    render(<ExcelInputTable onSuccess={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /\+ add row/i }));
    await user.click(screen.getByRole('button', { name: /\+ add row/i }));

    expect(screen.getAllByPlaceholderText('Quantity')).toHaveLength(3);

    await user.click(screen.getByRole('button', { name: /remove row 2/i }));

    expect(screen.getAllByPlaceholderText('Quantity')).toHaveLength(2);
  });

  it('keeps one empty draft row when removing the last row', async () => {
    const user = userEvent.setup();

    render(<ExcelInputTable onSuccess={vi.fn()} />);

    await user.selectOptions(screen.getByRole('combobox'), 'DIESEL');
    await user.type(screen.getByPlaceholderText('Quantity'), '120');

    await user.click(screen.getByRole('button', { name: /remove row 1/i }));

    expect(screen.getAllByPlaceholderText('Quantity')).toHaveLength(1);
    expect(screen.getByRole('combobox')).toHaveValue('');
    expect(screen.getByPlaceholderText('Quantity')).toHaveValue(null);
    expect(screen.getByPlaceholderText('Auto-filled after type')).toHaveValue('');
  });
});
