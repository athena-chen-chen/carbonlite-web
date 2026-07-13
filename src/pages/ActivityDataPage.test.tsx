import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
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
      sourceDocumentId: 'doc-manual',
    },
    {
      id: 'activity-2',
      activityType: 'ELECTRICITY',
      recordDate: '2026-05-15',
      quantity: 200,
      unit: 'kWh',
      sourceType: 'AI_EXTRACTION',
      sourceFileName: 'utility.pdf',
      sourceReference: 'Utility bill usage',
      sourcePage: 1,
      sourceRow: 3,
      sourceDocumentId: 'doc-utility',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    class ResizeObserverMock {
      callback: ResizeObserverCallback;

      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
      }

      observe(target: Element) {
        Object.defineProperty(target, 'scrollWidth', {
          configurable: true,
          value: 1200,
        });
        Object.defineProperty(target, 'clientWidth', {
          configurable: true,
          value: 900,
        });
        this.callback([], this as unknown as ResizeObserver);
      }

      disconnect() {}
      unobserve() {}
    }

    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    mockActivityRecords(records);
    vi.mocked(getAllActivityData).mockResolvedValue(records);
    vi.mocked(bulkDeleteActivityData).mockResolvedValue({ deletedCount: 1 });
    vi.mocked(deleteActivityData).mockResolvedValue({ deletedCount: 1 });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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

  function renderPage(initialEntry: any = '/data-records') {
    return render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <ActivityDataPage />
      </MemoryRouter>,
    );
  }

  function InputDataRouteProbe() {
    const location = useLocation();
    const routeState = location.state as { focusInputMethod?: string } | null;

    return <div>Input Data focus: {routeState?.focusInputMethod ?? 'none'}</div>;
  }

  async function clickFirstRowDeleteAction() {
    await userEvent.click(screen.getAllByLabelText(/More actions for/i)[0]);
    await userEvent.click(screen.getByRole('menuitem', { name: /^Delete$/i }));
  }

  it('navigates Add data to Input Data with manual entry focused', async () => {
    render(
      <MemoryRouter initialEntries={['/data-records']}>
        <Routes>
          <Route path="/data-records" element={<ActivityDataPage />} />
          <Route path="/input-data" element={<InputDataRouteProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: /^Add data$/i }));

    expect(screen.getByText('Input Data focus: manual')).toBeInTheDocument();
  });

  it('shows an initial loading state inside the records table card', async () => {
    let resolveRecords: (value: typeof records) => void = () => {};
    vi.mocked(getAllActivityData).mockReturnValue(
      new Promise((resolve) => {
        resolveRecords = resolve;
      }) as ReturnType<typeof getAllActivityData>,
    );

    renderPage();

    expect(screen.getByText('Loading activity records...')).toBeInTheDocument();
    expect(
      screen.queryByText(/No activity records yet/i),
    ).not.toBeInTheDocument();

    resolveRecords(records);

    expect(await screen.findByText('DIESEL')).toBeInTheDocument();
  });

  it('shows a retryable error state when activity records fail to load', async () => {
    vi.mocked(getAllActivityData)
      .mockRejectedValueOnce(new Error('Network failed'))
      .mockResolvedValueOnce(records);

    renderPage();

    expect(
      await screen.findByText('Unable to load activity records.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Please try again.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(getAllActivityData).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText('DIESEL')).toBeInTheDocument();
  });

  it('uses neutral disabled state when no rows are selected and red enabled state when selected', async () => {
    renderPage();

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
    renderPage();

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
    renderPage();

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
    renderPage();

    await screen.findByText('DIESEL');
    await clickFirstRowDeleteAction();

    expect(deleteActivityData).toHaveBeenCalledWith('activity-1');
    expect(getAllActivityData).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('1 record deleted.')).toBeInTheDocument();
    expect(screen.queryByText('DIESEL')).not.toBeInTheDocument();
    expect(screen.getByText('ELECTRICITY')).toBeInTheDocument();
  });

  it('deletes multiple selected records and confirms they are gone after backend refresh', async () => {
    vi.mocked(bulkDeleteActivityData).mockResolvedValue({ deletedCount: 2 });
    mockInitialAndRefreshedRecords([]);
    renderPage();

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

    renderPage();

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

    renderPage();

    await screen.findByText('DIESEL');
    await clickFirstRowDeleteAction();

    expect(await screen.findByText('You can only delete your own activity records.')).toBeInTheDocument();
    expect(screen.getByText('DIESEL')).toBeInTheDocument();
  });

  it('shows source references for imported records and manual fallback for manual records', async () => {
    renderPage();

    expect(await screen.findByText('DIESEL')).toBeInTheDocument();
    expect(screen.getByText('Source Reference')).toBeInTheDocument();
    expect(screen.getAllByText('Manual Entry').length).toBeGreaterThan(0);
    expect(screen.getByText('Document')).toBeInTheDocument();
    expect(
      screen.getByText('utility.pdf · Utility bill usage · Page 1 · Line item 3'),
    ).toBeInTheDocument();
  });

  it('shows horizontal scroll hint as text above the records table', async () => {
    renderPage();

    expect(await screen.findByText('Scroll horizontally →')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Scroll horizontally/i })).not.toBeInTheDocument();
  });

  it('opens the Columns menu, toggles columns, and closes on outside click or Escape', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('DIESEL');
    const moreColumnsButton = screen.getByRole('button', { name: /^Columns$/i });

    expect(moreColumnsButton).toHaveAttribute('aria-expanded', 'false');

    await user.click(moreColumnsButton);

    expect(moreColumnsButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu', { name: /Activity table columns/i })).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: /Source Reference/i }));

    expect(screen.queryByRole('columnheader', { name: 'Source Reference' })).not.toBeInTheDocument();
    expect(screen.getByRole('menu', { name: /Activity table columns/i })).toBeInTheDocument();

    await user.click(document.body);

    expect(moreColumnsButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu', { name: /Activity table columns/i })).not.toBeInTheDocument();

    await user.click(moreColumnsButton);
    expect(moreColumnsButton).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard('{Escape}');

    expect(moreColumnsButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders row action menu in a portal and closes on outside click or Escape', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('DIESEL');
    const actionButton = screen.getAllByLabelText(/More actions for/i)[0];

    expect(actionButton).toHaveAttribute('aria-expanded', 'false');

    await user.click(actionButton);

    const menu = screen.getByRole('menu');
    expect(actionButton).toHaveAttribute('aria-expanded', 'true');
    expect(menu.parentElement).toBe(document.body);
    expect(screen.getByRole('menuitem', { name: /^Edit$/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /^Delete$/i })).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(actionButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menuitem', { name: /^Edit$/i })).not.toBeInTheDocument();

    await user.click(actionButton);
    expect(screen.getByRole('menuitem', { name: /^Edit$/i })).toBeInTheDocument();

    await user.click(document.body);

    expect(actionButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menuitem', { name: /^Edit$/i })).not.toBeInTheDocument();
  });

  it('limits electricity edit province options to provinces with factor coverage', async () => {
    renderPage();

    await screen.findByText('DIESEL');
    await userEvent.click(screen.getAllByLabelText(/More actions for/i)[1]);
    await userEvent.click(screen.getByRole('menuitem', { name: /^Edit$/i }));

    const provinceSelect = screen.getByRole('combobox', {
      name: /Province required for electricity records/i,
    });

    expect(within(provinceSelect).getByRole('option', { name: 'Alberta' })).toBeInTheDocument();
    expect(
      within(provinceSelect).getByRole('option', { name: 'British Columbia' }),
    ).toBeInTheDocument();
    expect(within(provinceSelect).getByRole('option', { name: 'Ontario' })).toBeInTheDocument();
    expect(within(provinceSelect).queryByRole('option', { name: 'Quebec' })).not.toBeInTheDocument();
    expect(within(provinceSelect).queryByRole('option', { name: 'Nunavut' })).not.toBeInTheDocument();
  });

  it('filters records by document id from the URL and clears the filter', async () => {
    renderPage({
      pathname: '/activity-records',
      search: '?documentId=doc-utility',
      state: { sourceDocumentName: '37_mixed_utility_report_missing_units.pdf' },
    });

    expect(await screen.findByText('Showing records from:')).toBeInTheDocument();
    expect(
      screen.getByText('37_mixed_utility_report_missing_units.pdf'),
    ).toBeInTheDocument();
    expect(screen.getByText('ELECTRICITY')).toBeInTheDocument();
    expect(screen.queryByText('DIESEL')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Clear Filter' }));

    expect(screen.getByText('DIESEL')).toBeInTheDocument();
    expect(screen.getByText('ELECTRICITY')).toBeInTheDocument();
  });

  it('shows a document-specific empty state when no imported records match', async () => {
    renderPage({
      pathname: '/activity-records',
      search: '?documentId=doc-empty',
      state: { sourceDocumentName: 'empty-upload.pdf' },
    });

    expect(await screen.findByText('empty-upload.pdf')).toBeInTheDocument();
    expect(
      screen.getByText('No records have been imported from this document.'),
    ).toBeInTheDocument();
  });

  it('filters to the requested record id and clears the filter', async () => {
    renderPage({
      pathname: '/activity-records',
      search: '?recordId=activity-2',
    });

    expect(
      await screen.findByText('Showing 1 record requiring attention.'),
    ).toBeInTheDocument();
    expect(screen.getByText('ELECTRICITY')).toBeInTheDocument();
    expect(screen.queryByText('DIESEL')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Clear Filter' }));

    expect(screen.getByText('DIESEL')).toBeInTheDocument();
    expect(screen.getByText('ELECTRICITY')).toBeInTheDocument();
  });

  it('shows a friendly empty state when requested record is missing', async () => {
    renderPage({
      pathname: '/activity-records',
      search: '?recordId=missing-record',
    });

    expect(
      await screen.findByText('The requested record could not be found.'),
    ).toBeInTheDocument();
  });

  it('marks existing records with missing required fields as incomplete and still allows viewing details', async () => {
    mockActivityRecords([
      {
        id: 'activity-incomplete',
        activityType: 'NATURAL_GAS',
        recordDate: null,
        quantity: 950,
        unit: null,
        sourceType: 'AI_EXTRACTION',
        sourceFileName: '37_mixed_utility_report_missing_units.pdf',
        sourceReference: null,
        sourceDocumentId: 'doc-missing-unit',
      } as any,
    ]);

    renderPage();

    const row = await screen.findByTestId('activity-row-activity-incomplete');

    expect(within(row).getByText('Requires Review')).toBeInTheDocument();
    expect(within(row).getByText('⚠ Missing')).toBeInTheDocument();
    expect(within(row).getByText('Missing unit')).toBeInTheDocument();
    expect(within(row).getByText('Requires Review')).toHaveAttribute(
      'title',
      'This record requires required fields before calculations can be performed.',
    );
    await userEvent.click(within(row).getByRole('button', { name: 'View' }));

    const dialog = screen.getByRole('dialog', { name: 'Activity Record Details' });
    expect(within(dialog).getByText('Requires Review')).toBeInTheDocument();
    expect(within(dialog).getByText('NATURAL_GAS')).toBeInTheDocument();
    expect(within(dialog).getByText('Missing unit')).toBeInTheDocument();
    expect(
      within(row).getByText('37_mixed_utility_report_missing_units.pdf'),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText('37_mixed_utility_report_missing_units.pdf'),
    ).toBeInTheDocument();
  });

  it('shows source unavailable when imported source metadata is missing', async () => {
    mockActivityRecords([
      {
        id: 'activity-missing-source',
        activityType: 'DIESEL',
        recordDate: '2026-06-01',
        quantity: 100,
        unit: 'L',
        sourceType: 'AI_EXTRACTION',
        sourceFileName: null,
        sourceReference: null,
      } as any,
    ]);

    renderPage();

    const row = await screen.findByTestId('activity-row-activity-missing-source');

    expect(within(row).getByText('Missing Source')).toBeInTheDocument();
    expect(within(row).getByText('Source unavailable')).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'View' })).toBeEnabled();
  });

  it('opens record details on the same page when View is clicked', async () => {
    renderPage();

    const row = await screen.findByTestId('activity-row-activity-1');
    await userEvent.click(within(row).getByRole('button', { name: 'View' }));

    const dialog = screen.getByRole('dialog', { name: 'Activity Record Details' });
    expect(within(dialog).getByText('Activity Record Details')).toBeInTheDocument();
    expect(within(dialog).getByText('DIESEL')).toBeInTheDocument();
    expect(within(dialog).getByText('2026-05-14')).toBeInTheDocument();
    expect(within(dialog).getAllByText('Manual Entry').length).toBeGreaterThan(0);

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Close activity record details' }),
    );

    expect(screen.queryByRole('dialog', { name: 'Activity Record Details' })).not.toBeInTheDocument();
  });
});
