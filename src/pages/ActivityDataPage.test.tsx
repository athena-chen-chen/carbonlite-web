import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  bulkDeleteActivityData,
  deleteActivityData,
  getAllActivityData,
  getActivityDataList,
} from '../services/activityData';
import { ActivityDataPage } from './ActivityDataPage';

vi.mock('../components/ExcelInputTable', () => ({
  ExcelInputTable: () => <div>Quick Entry</div>,
}));

vi.mock('../services/activityData', () => ({
  bulkDeleteActivityData: vi.fn(),
  createActivityData: vi.fn(),
  deleteActivityData: vi.fn(),
  getAllActivityData: vi.fn(),
  getActivityDataList: vi.fn(),
  updateActivityData: vi.fn(),
}));

describe('ActivityDataPage delete flows', () => {
  const records = [
    {
      id: 'activity-1',
      activityType: 'DIESEL',
      recordDate: '2026-05-14',
      quantity: 100,
      unit: 'L',
      sourceType: 'MANUAL',
    },
    {
      id: 'activity-2',
      activityType: 'ELECTRICITY',
      recordDate: '2026-05-15',
      quantity: 200,
      unit: 'kWh',
      sourceType: 'AI_EXTRACTION',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockActivityRecords(records);
    vi.mocked(getAllActivityData).mockResolvedValue(records);
    vi.mocked(bulkDeleteActivityData).mockResolvedValue({ deletedCount: 1 });
    vi.mocked(deleteActivityData).mockResolvedValue({ deletedCount: 1 });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  function mockActivityRecords(items: typeof records) {
    vi.mocked(getAllActivityData).mockResolvedValue(items);
    vi.mocked(getActivityDataList).mockResolvedValue({
      items,
      page: 1,
      pageSize: 20,
      total: items.length,
      totalPages: 1,
    });
  }

  function mockActivityRecordsOnce(items: typeof records) {
    vi.mocked(getAllActivityData).mockResolvedValueOnce(items);
  }

  function mockInitialAndRefreshedRecords(refreshedItems: typeof records) {
    mockActivityRecordsOnce(records);
    mockActivityRecordsOnce(refreshedItems);
  }

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

    await userEvent.click(screen.getAllByRole('checkbox')[1]);

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

  it('deletes one selected record and removes it from the UI after backend refresh', async () => {
    mockInitialAndRefreshedRecords([records[1]]);
    render(<ActivityDataPage />);

    await screen.findByText('DIESEL');
    await userEvent.click(screen.getAllByRole('checkbox')[1]);
    await userEvent.click(
      screen.getByRole('button', { name: /Delete Selected \(1\)/i }),
    );

    expect(bulkDeleteActivityData).toHaveBeenCalledWith(['activity-1']);
    expect(getAllActivityData).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('1 record deleted.')).toBeInTheDocument();
    expect(screen.queryByText('DIESEL')).not.toBeInTheDocument();
    expect(screen.getByText('ELECTRICITY')).toBeInTheDocument();
  });

  it('shows a warning and refetches when backend reports zero deleted records', async () => {
    vi.mocked(bulkDeleteActivityData).mockResolvedValue({ deletedCount: 0 });
    mockInitialAndRefreshedRecords(records);
    render(<ActivityDataPage />);

    await screen.findByText('DIESEL');
    await userEvent.click(screen.getAllByRole('checkbox')[1]);
    await userEvent.click(
      screen.getByRole('button', { name: /Delete Selected \(1\)/i }),
    );

    expect(await screen.findByText(/No records were deleted/i)).toBeInTheDocument();
    expect(screen.getByText('DIESEL')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete Selected \(1\)/i })).toBeEnabled();
  });

  it('deletes one record from the row action and removes it from the UI after backend refresh', async () => {
    mockInitialAndRefreshedRecords([records[1]]);
    render(<ActivityDataPage />);

    await screen.findByText('DIESEL');
    await userEvent.click(screen.getAllByRole('button', { name: /^Delete$/i })[0]);

    expect(deleteActivityData).toHaveBeenCalledWith('activity-1');
    expect(getAllActivityData).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('1 record deleted.')).toBeInTheDocument();
    expect(screen.queryByText('DIESEL')).not.toBeInTheDocument();
    expect(screen.getByText('ELECTRICITY')).toBeInTheDocument();
  });

  it('deletes multiple selected records and confirms they are gone after backend refresh', async () => {
    vi.mocked(bulkDeleteActivityData).mockResolvedValue({ deletedCount: 2 });
    mockInitialAndRefreshedRecords([]);
    render(<ActivityDataPage />);

    await screen.findByText('DIESEL');
    await userEvent.click(screen.getAllByRole('checkbox')[0]);
    await userEvent.click(
      screen.getByRole('button', { name: /Delete Selected \(2\)/i }),
    );

    expect(bulkDeleteActivityData).toHaveBeenCalledWith(['activity-1', 'activity-2']);
    expect(getAllActivityData).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('2 records deleted.')).toBeInTheDocument();
    expect(screen.queryByText('DIESEL')).not.toBeInTheDocument();
    expect(screen.queryByText('ELECTRICITY')).not.toBeInTheDocument();
  });

  it('keeps selected rows visible and selected when delete is unauthorized', async () => {
    vi.mocked(bulkDeleteActivityData).mockRejectedValue(
      new Error('You can only delete your own activity records.'),
    );

    render(<ActivityDataPage />);

    await screen.findByText('DIESEL');
    await userEvent.click(screen.getAllByRole('checkbox')[1]);
    await userEvent.click(
      screen.getByRole('button', { name: /Delete Selected \(1\)/i }),
    );

    expect(await screen.findByText('You can only delete your own activity records.')).toBeInTheDocument();
    expect(screen.getByText('DIESEL')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete Selected \(1\)/i })).toBeEnabled();
  });

  it('keeps row visible when single delete is unauthorized', async () => {
    vi.mocked(deleteActivityData).mockRejectedValue(
      new Error('You can only delete your own activity records.'),
    );

    render(<ActivityDataPage />);

    await screen.findByText('DIESEL');
    await userEvent.click(screen.getAllByRole('button', { name: /^Delete$/i })[0]);

    expect(await screen.findByText('You can only delete your own activity records.')).toBeInTheDocument();
    expect(screen.getByText('DIESEL')).toBeInTheDocument();
  });
});
