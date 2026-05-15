import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getActivityDataList } from '../services/activityData';
import { ActivityDataPage } from './ActivityDataPage';

vi.mock('../components/ExcelInputTable', () => ({
  ExcelInputTable: () => <div>Quick Entry</div>,
}));

vi.mock('../services/activityData', () => ({
  createActivityData: vi.fn(),
  deleteActivityData: vi.fn(),
  getActivityDataList: vi.fn(),
  updateActivityData: vi.fn(),
}));

describe('ActivityDataPage bulk delete button', () => {
  beforeEach(() => {
    vi.mocked(getActivityDataList).mockResolvedValue({
      items: [
        {
          id: 'activity-1',
          activityType: 'DIESEL',
          recordDate: '2026-05-14',
          quantity: 100,
          unit: 'L',
          sourceType: 'MANUAL',
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it('uses neutral disabled state when no rows are selected and red enabled state when selected', async () => {
    render(<ActivityDataPage />);

    const deleteButton = await screen.findByRole('button', {
      name: /^Delete Selected$/i,
    });

    expect(deleteButton).toBeDisabled();
    expect(deleteButton).toHaveStyle({
      background: '#f3f4f6',
      color: '#6b7280',
    });

    const rowCheckbox = screen.getAllByRole('checkbox')[1];
    await userEvent.click(rowCheckbox);

    expect(
      screen.getByRole('button', { name: /Delete Selected \(1\)/i }),
    ).toBeEnabled();
    expect(
      screen.getByRole('button', { name: /Delete Selected \(1\)/i }),
    ).toHaveStyle({
      background: '#dc2626',
      color: '#fff',
    });
  });
});
