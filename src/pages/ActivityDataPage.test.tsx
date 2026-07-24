import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import {
  bulkDeleteActivityData,
  deleteActivityData,
  getAllActivityData,
  getActivityDataList,
  resetDemoDataForCurrentCompany,
  updateActivityData,
} from '../services/activityData';
import { getAllConversionFactors } from '../services/conversionFactors';
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
  resetDemoDataForCurrentCompany: vi.fn(),
  updateActivityData: vi.fn(),
}));

vi.mock('../services/conversionFactors', () => ({
  getAllConversionFactors: vi.fn(),
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
    vi.mocked(getAllConversionFactors).mockResolvedValue([
      {
        id: 'factor-electricity-bc-2025',
        organizationId: null,
        name: 'Electricity - British Columbia - 2025',
        type: 'EMISSION',
        activityType: 'ELECTRICITY',
        inputUnit: 'kWh',
        unit: 'kWh',
        factorValue: 0.02,
        resultUnit: 'kgCO2e/kWh',
        sourceAuthority: 'CarbonLite',
        sourceYear: 2025,
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'British Columbia',
        isDefault: true,
        isSystemDefault: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ] as any);
    vi.mocked(bulkDeleteActivityData).mockResolvedValue({ deletedCount: 1 });
    vi.mocked(resetDemoDataForCurrentCompany).mockResolvedValue({
      activityRecordsDeleted: 2,
      importBatchesDeleted: 1,
      uploadedDocumentsDeleted: 1,
      stagedRowsDeleted: 3,
      metricsCacheCleared: 2,
      resetReports: 1,
    });
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

    expect(await screen.findByText('Diesel')).toBeInTheDocument();
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
    expect(await screen.findByText('Diesel')).toBeInTheDocument();
  });

  it('shows activity records in read-only mode for viewers', async () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({ email: 'viewer@example.com', role: 'VIEWER', organizationId: 'org-1' }),
    );

    renderPage();

    const row = await screen.findByTestId('activity-row-activity-1');

    expect(screen.getByText(/Read-only access:/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Add data$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Delete Selected/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/More actions for/i)).not.toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'View' })).toBeEnabled();
  });

  it('requires admins to type RESET DEMO DATA before confirming demo data reset', async () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({ email: 'admin@example.com', role: 'ADMIN' }),
    );
    localStorage.setItem('carbonlite-upload-review-draft', 'stale');
    const resetEventListener = vi.fn();
    window.addEventListener('carbonlite:demo-data-reset', resetEventListener);
    mockInitialAndRefreshedRecords([]);
    renderPage();

    await screen.findByText('Diesel');
    await userEvent.click(
      screen.getByRole('button', { name: /^Reset Demo Data$/i }),
    );

    const dialog = screen.getByRole('dialog', { name: 'Reset Demo Data' });
    const confirmButton = within(dialog).getByRole('button', {
      name: /^Reset Demo Data$/i,
    });

    expect(
      within(dialog).getByText(
        'This will permanently remove activity records, input review documents, extracted staging rows, and related calculated results for the current company. It will not delete users, facilities, emission factors, custom factors, or settings.',
      ),
    ).toBeInTheDocument();
    expect(confirmButton).toBeDisabled();

    await userEvent.type(
      within(dialog).getByLabelText(/Type RESET DEMO DATA to confirm/i),
      'RESET',
    );

    expect(confirmButton).toBeDisabled();

    await userEvent.type(
      within(dialog).getByLabelText(/Type RESET DEMO DATA to confirm/i),
      ' DEMO DATA',
    );

    expect(confirmButton).toBeEnabled();

    await userEvent.click(confirmButton);

    expect(resetDemoDataForCurrentCompany).toHaveBeenCalledTimes(1);
    expect(resetEventListener).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('carbonlite-upload-review-draft')).toBeNull();
    expect(await screen.findByText(/Demo data reset:/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        'No saved activity records yet. Add data from Input Data to create records for review.',
      ),
    ).toBeInTheDocument();
    window.removeEventListener('carbonlite:demo-data-reset', resetEventListener);
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

    await screen.findByText('Diesel');
    await userEvent.click(screen.getAllByRole('checkbox')[1]);
    await userEvent.click(
      screen.getByRole('button', { name: /Delete Selected \(1\)/i }),
    );

    expect(bulkDeleteActivityData).toHaveBeenCalledWith(['activity-1']);
    expect(getAllActivityData).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('1 record deleted.')).toBeInTheDocument();
    expect(screen.queryByText('Diesel')).not.toBeInTheDocument();
    expect(screen.getByText('Electricity')).toBeInTheDocument();
  });

  it('shows a warning and refetches when backend reports zero deleted records', async () => {
    vi.mocked(bulkDeleteActivityData).mockResolvedValue({ deletedCount: 0 });
    mockInitialAndRefreshedRecords(records);
    renderPage();

    await screen.findByText('Diesel');
    await userEvent.click(screen.getAllByRole('checkbox')[1]);
    await userEvent.click(
      screen.getByRole('button', { name: /Delete Selected \(1\)/i }),
    );

    expect(await screen.findByText(/No records were deleted/i)).toBeInTheDocument();
    expect(screen.getByText('Diesel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete Selected \(1\)/i })).toBeEnabled();
  });

  it('deletes one record from the row action and removes it from the UI after backend refresh', async () => {
    mockInitialAndRefreshedRecords([records[1]]);
    renderPage();

    await screen.findByText('Diesel');
    await clickFirstRowDeleteAction();

    expect(deleteActivityData).toHaveBeenCalledWith('activity-1');
    expect(getAllActivityData).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('1 record deleted.')).toBeInTheDocument();
    expect(screen.queryByText('Diesel')).not.toBeInTheDocument();
    expect(screen.getByText('Electricity')).toBeInTheDocument();
  });

  it('deletes multiple selected records and confirms they are gone after backend refresh', async () => {
    vi.mocked(bulkDeleteActivityData).mockResolvedValue({ deletedCount: 2 });
    mockInitialAndRefreshedRecords([]);
    renderPage();

    await screen.findByText('Diesel');
    await userEvent.click(screen.getAllByRole('checkbox')[0]);
    await userEvent.click(
      screen.getByRole('button', { name: /Delete Selected \(2\)/i }),
    );

    expect(bulkDeleteActivityData).toHaveBeenCalledWith(['activity-1', 'activity-2']);
    expect(getAllActivityData).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('2 records deleted.')).toBeInTheDocument();
    expect(screen.queryByText('Diesel')).not.toBeInTheDocument();
    expect(screen.queryByText('Electricity')).not.toBeInTheDocument();
  });

  it('keeps selected rows visible and selected when delete is unauthorized', async () => {
    vi.mocked(bulkDeleteActivityData).mockRejectedValue(
      new Error('You do not have permission to perform this action.'),
    );

    renderPage();

    await screen.findByText('Diesel');
    await userEvent.click(screen.getAllByRole('checkbox')[1]);
    await userEvent.click(
      screen.getByRole('button', { name: /Delete Selected \(1\)/i }),
    );

    expect(await screen.findByText('You do not have permission to perform this action.')).toBeInTheDocument();
    expect(screen.getByText('Diesel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete Selected \(1\)/i })).toBeEnabled();
  });

  it('keeps row visible when single delete is unauthorized', async () => {
    vi.mocked(deleteActivityData).mockRejectedValue(
      new Error('You do not have permission to perform this action.'),
    );

    renderPage();

    await screen.findByText('Diesel');
    await clickFirstRowDeleteAction();

    expect(await screen.findByText('You do not have permission to perform this action.')).toBeInTheDocument();
    expect(screen.getByText('Diesel')).toBeInTheDocument();
  });

  it('shows source references for imported records and manual fallback for manual records', async () => {
    renderPage();

    expect(await screen.findByText('Diesel')).toBeInTheDocument();
    expect(screen.getByText('Source Reference')).toBeInTheDocument();
    expect(screen.getAllByText('Manual Entry').length).toBeGreaterThan(0);
    expect(screen.getByText('Document')).toBeInTheDocument();
    expect(
      screen.getByText('utility.pdf · Utility bill usage · Page 1 · Line item 3'),
    ).toBeInTheDocument();
  });

  it('shows horizontal scroll hint as text above the records table', async () => {
    renderPage();

    expect(await screen.findByText('Scroll horizontally to view all columns →')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Scroll horizontally/i })).not.toBeInTheDocument();
  });

  it('opens the Columns menu, toggles columns, and closes on outside click or Escape', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Diesel');
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

    await screen.findByText('Diesel');
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

    await screen.findByText('Diesel');
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

  it('shows saved valid BC electricity records as matched even when stale notes say missing factor', async () => {
    mockActivityRecords([
      {
        id: 'activity-bc-electricity',
        activityType: 'ELECTRICITY',
        recordDate: '2026-07-20',
        quantity: 100,
        unit: 'kWh',
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'British Columbia',
        sourceType: 'MANUAL',
        sourceReference: 'manual',
        notes:
          'Created from MANUAL. Calculation status: Missing Factor. No conversion factor found for Electricity / kWh. Matched factor: N/A (N/A)',
      },
    ] as any);

    renderPage();

    expect(await screen.findByText('Electricity')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.queryByText('Missing Factor')).not.toBeInTheDocument();
  });

  it('uses canonical matched fields instead of stale missing factor notes', async () => {
    vi.mocked(getAllConversionFactors).mockResolvedValueOnce([] as any);
    mockActivityRecords([
      {
        id: 'activity-bc-electricity-canonical',
        activityType: 'ELECTRICITY',
        recordDate: '2026-07-20',
        quantity: 100,
        unit: 'kWh',
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'British Columbia',
        sourceType: 'MANUAL',
        sourceReference: 'manual',
        matchingStatus: 'MATCHED',
        calculationStatus: 'CALCULATED',
        reportTreatment: 'INCLUDED',
        scope: 'SCOPE_2',
        matchedFactorId: 'factor-electricity-bc-2025',
        matchedFactorName: 'Electricity - British Columbia - 2025',
        matchedFactorSourceYear: 2025,
        calculatedEmissionsKgCO2e: 2,
        notes:
          'Created from MANUAL. Calculation status: Missing Factor. No conversion factor found for Electricity / kWh.',
      },
    ] as any);

    renderPage();

    const row = await screen.findByTestId('activity-row-activity-bc-electricity-canonical');
    expect(within(row).getByText('Ready')).toBeInTheDocument();
    expect(within(row).queryByText('Missing Factor')).not.toBeInTheDocument();
  });

  it('shows identical BC electricity records with the same matched status even when one has stale saved metadata', async () => {
    mockActivityRecords([
      {
        id: 'activity-bc-electricity-old',
        activityType: 'Electricity',
        recordDate: '2026-07-20',
        quantity: 100,
        unit: 'KWH',
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'BC',
        sourceType: 'MANUAL',
        sourceReference: 'manual',
        notes:
          'Created from MANUAL. Calculation status: Missing Factor. No conversion factor found for Electricity / kWh.',
      },
      {
        id: 'activity-bc-electricity-new',
        activityType: 'ELECTRICITY',
        recordDate: '2026-07-20',
        quantity: 100,
        unit: 'kWh',
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'British Columbia',
        sourceType: 'MANUAL',
        sourceReference: 'manual',
        matchingStatus: 'MATCHED',
        reportTreatment: 'INCLUDED',
        scope: 'SCOPE_2',
        matchedFactorId: 'factor-electricity-bc-2025',
        matchedFactorName: 'Electricity - British Columbia - 2025',
        calculatedEmissionsKgCO2e: 2,
        calculationStatus: 'CALCULATED',
      },
    ] as any);

    renderPage();

    const oldRow = await screen.findByTestId('activity-row-activity-bc-electricity-old');
    const newRow = await screen.findByTestId('activity-row-activity-bc-electricity-new');

    expect(within(oldRow).getByText('Ready')).toBeInTheDocument();
    expect(within(newRow).getByText('Ready')).toBeInTheDocument();
    expect(within(oldRow).queryByText('Missing Factor')).not.toBeInTheDocument();
    expect(within(newRow).queryByText('Missing Factor')).not.toBeInTheDocument();
  });

  it('recalculates stale valid BC electricity records with matched canonical metadata', async () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({ email: 'admin@example.com', role: 'ADMIN', organizationId: 'org-1' }),
    );
    vi.mocked(updateActivityData).mockResolvedValue({} as any);
    mockActivityRecords([
      {
        id: 'activity-bc-electricity-stale',
        activityType: 'ELECTRICITY',
        recordDate: '2026-07-20',
        quantity: 100,
        unit: 'kWh',
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'British Columbia',
        sourceType: 'MANUAL',
        sourceReference: 'manual',
        notes:
          'Created from MANUAL. Calculation status: Missing Factor. No conversion factor found for Electricity / kWh.',
      },
    ] as any);

    renderPage();

    await screen.findByText('Electricity');
    await userEvent.click(
      screen.getByRole('button', { name: /^Recalculate Activity Records$/i }),
    );

    await waitFor(() => {
      expect(updateActivityData).toHaveBeenCalledWith(
        'activity-bc-electricity-stale',
        expect.objectContaining({
          matchingStatus: 'MATCHED',
          reportTreatment: 'INCLUDED',
          calculationStatus: 'CALCULATED',
          scope: 'SCOPE_2',
          matchedFactorId: 'factor-electricity-bc-2025',
          matchedFactorName: 'Electricity - British Columbia - 2025',
          matchedFactorSourceYear: 2025,
          calculatedEmissionsKgCO2e: 2,
          calculationMessage: 'Matched factor. Using latest available factor year: 2025.',
          notes:
            'Created from MANUAL. Calculation status: Missing Factor. No conversion factor found for Electricity / kWh.',
        }),
      );
    });
    expect(await screen.findByText(/1 record recalculated, 1 matched/i)).toBeInTheDocument();
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
    expect(screen.getByText('Electricity')).toBeInTheDocument();
    expect(screen.queryByText('Diesel')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Clear Filter' }));

    expect(screen.getByText('Diesel')).toBeInTheDocument();
    expect(screen.getByText('Electricity')).toBeInTheDocument();
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
    expect(screen.getByText('Electricity')).toBeInTheDocument();
    expect(screen.queryByText('Diesel')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Clear Filter' }));

    expect(screen.getByText('Diesel')).toBeInTheDocument();
    expect(screen.getByText('Electricity')).toBeInTheDocument();
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
    expect(within(dialog).getByText('Natural Gas')).toBeInTheDocument();
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
    expect(within(dialog).getByText('Diesel')).toBeInTheDocument();
    expect(within(dialog).getByText('2026-05-14')).toBeInTheDocument();
    expect(within(dialog).getAllByText('Manual Entry').length).toBeGreaterThan(0);

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Close activity record details' }),
    );

    expect(screen.queryByRole('dialog', { name: 'Activity Record Details' })).not.toBeInTheDocument();
  });

  it.each(['2026-07-20', '2026-01-15'])(
    'displays API activity record date %s without timezone shifting',
    async (recordDate) => {
      mockActivityRecords([
        {
          id: `activity-date-${recordDate}`,
          activityType: 'ELECTRICITY',
          recordDate: `${recordDate}T00:00:00.000Z`,
          quantity: 100,
          unit: 'kWh',
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Alberta',
          sourceType: 'MANUAL',
          sourceReference: 'manual',
        },
      ] as any);

      renderPage();

      const row = await screen.findByTestId(`activity-row-activity-date-${recordDate}`);
      expect(within(row).getByText(recordDate)).toBeInTheDocument();
      expect(within(row).queryByText('2026-07-21')).not.toBeInTheDocument();
      expect(within(row).queryByText('2026-01-16')).not.toBeInTheDocument();
    },
  );

  it('opens the edit panel with the same date-only value and preserves it on save', async () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({ email: 'admin@example.com', role: 'ADMIN', organizationId: 'org-1' }),
    );
    vi.mocked(updateActivityData).mockResolvedValue({} as any);
    mockActivityRecords([
      {
        id: 'activity-date-edit',
        activityType: 'DIESEL',
        recordDate: '2026-07-20T00:00:00.000Z',
        quantity: 10,
        unit: 'L',
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Alberta',
        sourceType: 'MANUAL',
        sourceReference: 'manual',
      },
    ] as any);

    renderPage();

    await screen.findByTestId('activity-row-activity-date-edit');
    await userEvent.click(screen.getByLabelText(/More actions for Diesel 2026-07-20/i));
    await userEvent.click(screen.getByRole('menuitem', { name: /^Edit$/i }));

    const dateInput = screen.getByLabelText('Date') as HTMLInputElement;
    expect(dateInput.value).toBe('2026-07-20');

    await userEvent.click(screen.getByRole('button', { name: /^Save$/i }));

    await waitFor(() => {
      expect(updateActivityData).toHaveBeenCalledWith(
        'activity-date-edit',
        expect.objectContaining({
          recordDate: '2026-07-20',
        }),
      );
    });
  });
});
