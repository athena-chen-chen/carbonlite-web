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

describe('ExcelInputTable factor matching', () => {
  it('recomputes factor status when type, unit, or loaded factors change', async () => {
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
          createdAt: '',
          updatedAt: '',
        },
      ],
      page: 1,
      pageSize: 20,
      total: 2,
      totalPages: 1,
    });

    render(<ExcelInputTable onSuccess={vi.fn()} />);

    expect(await screen.findByText(/Matched: Diesel factor/i)).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByRole('combobox'), 'ELECTRICITY');

    expect(await screen.findByText(/Matched: Electricity factor/i)).toBeInTheDocument();

    const unitInput = screen.getByDisplayValue('kWh');
    await userEvent.clear(unitInput);
    await userEvent.type(unitInput, 'MWh');

    expect(await screen.findByText(/No matching factor/i)).toBeInTheDocument();

    await userEvent.clear(screen.getByDisplayValue('MWh'));
    await userEvent.type(screen.getByPlaceholderText('L'), 'kwh');

    expect(await screen.findByText(/Matched: Electricity factor/i)).toBeInTheDocument();
  });
});
