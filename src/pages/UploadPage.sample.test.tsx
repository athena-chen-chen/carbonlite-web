import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { UploadPage, classifyDraftRow } from './UploadPage';
import { getDocuments } from '../services/documents';
import { ApiError } from '../services/api';
import {
  confirmDocumentImport,
  extractDocument,
  getDocumentExtraction,
} from '../services/documentExtraction';
import { calculateMetrics } from '../services/metrics';

vi.mock('../components/ExcelInputTable', () => ({
  ExcelInputTable: () => <div>Activity Rows</div>,
}));

vi.mock('../components/AppDialog', () => ({
  useAppDialog: () => ({
    confirm: vi.fn(async () => true),
    showError: vi.fn(),
  }),
}));

vi.mock('../services/documents', () => ({
  deleteDocument: vi.fn(),
  getDocuments: vi.fn(() =>
    Promise.resolve({
      items: [],
      page: 1,
      pageSize: 0,
      total: 0,
      totalPages: 1,
    }),
  ),
  uploadDocument: vi.fn(),
}));

vi.mock('../services/documentExtraction', () => ({
  confirmDocumentImport: vi.fn(),
  extractDocument: vi.fn(),
  getDocumentExtraction: vi.fn(),
}));

vi.mock('../services/metrics', () => ({
  calculateMetrics: vi.fn(),
}));

vi.mock('../services/conversionFactors', () => ({
  getAllConversionFactors: vi.fn(() => Promise.resolve([])),
}));

describe('UploadPage sample workflow', () => {
  const failedDocument = {
    id: 'doc-1',
    fileName: 'failed-invoice.pdf',
    fileUrl: '',
    type: 'PDF',
    status: 'EXTRACTION_FAILED',
    fileSize: 100,
    createdAt: '2026-05-31T00:00:00.000Z',
    updatedAt: '2026-05-31T00:00:00.000Z',
  };

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        email: 'admin@example.com',
        role: 'ADMIN',
        accountType: 'CUSTOMER',
        organizationId: 'org-1',
      }),
    );
    Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
    vi.mocked(getDocuments).mockReset();
    vi.mocked(extractDocument).mockReset();
    vi.mocked(getDocumentExtraction).mockReset();
    vi.mocked(confirmDocumentImport).mockReset();
    vi.mocked(calculateMetrics).mockReset();
    vi.mocked(getDocuments).mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 0,
      total: 0,
      totalPages: 1,
    });
    vi.mocked(confirmDocumentImport).mockImplementation(
      async (_documentId, activities) => ({
        count: activities.length,
        createdIds: activities.map((_, index) => `created-${index + 1}`),
        importBatchId: 'document-import-batch',
        alreadyImported: false,
      }),
    );
    vi.mocked(calculateMetrics).mockResolvedValue({ count: 0, items: [] });
  });

  it('classifies tracked-only Water rows as importable tracked metrics, not review errors', () => {
    const row = {
      selected: true,
      documentId: 'doc-water',
      documentFileName: 'pilot-golden-dataset.csv',
      dateEstimated: false,
      activityType: { value: 'Water', confidence: 'high' },
      recordDate: { value: '2026-07-20', confidence: 'high' },
      quantity: { value: 100, confidence: 'high' },
      unit: { value: 'm3', confidence: 'high' },
      jurisdictionCountry: { value: 'Canada', confidence: 'high' },
      jurisdictionRegion: { value: '', confidence: 'high' },
      sourceReference: { value: 'pilot-golden-dataset.csv', confidence: 'high' },
      matchingStatus: 'TRACKED_ONLY',
      reportTreatment: 'TRACKED_ONLY',
      scope: 'TRACKED_METRIC',
      calculationStatus: 'TRACKED_ONLY',
      calculationMessage: 'Water usage is tracked only and excluded from GHG emissions totals.',
      notes: { value: 'Water tracked only', confidence: 'high' },
    } as const;

    expect(classifyDraftRow(row)).toBe('TRACKED_METRIC');
  });

  it('shows pilot reviewers a read-only sample review path instead of import tools', async () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        email: 'reviewer@example.com',
        role: 'VIEWER',
        accountType: 'PILOT_REVIEWER',
        organizationId: 'sample-workspace',
      }),
    );

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    const workflow = screen.getByLabelText(/CarbonLite input workflow/i);
    expect(workflow).toHaveTextContent('Upload / Manual Entry');
    expect(workflow).toHaveTextContent('Review extracted rows');
    expect(workflow).toHaveTextContent('Confirm activity records');
    expect(workflow).toHaveTextContent('Match emission factors');
    expect(workflow).toHaveTextContent('Review calculations');
    expect(workflow).toHaveTextContent('Generate report');
    expect(workflow).toHaveTextContent(
      'This reviewer account uses preloaded sample data and is read-only. Upload and import actions are disabled.',
    );
    expect(await screen.findByText(/sample data is already loaded/i)).toBeInTheDocument();
    expect(screen.getByText(/pilot reviewer accounts use preloaded sample data/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /data records/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /calculation review/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reports/i })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /upload documents/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /load sample data/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Activity Rows')).not.toBeInTheDocument();
  });

  it('keeps customer viewers read-only without pilot-reviewer wording or Set Province controls', async () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        email: 'viewer@example.com',
        role: 'VIEWER',
        accountType: 'CUSTOMER',
        organizationId: 'org-1',
      }),
    );

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Read-only access: you can view existing records/i)).toBeInTheDocument();
    expect(screen.queryByText(/pilot reviewer accounts use preloaded sample data/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Set Province' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Confirm Import/i })).not.toBeInTheDocument();
  });

  it('clears Input Review documents when demo data reset is broadcast', async () => {
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          id: 'doc-reset',
          fileName: 'stale-import.xlsx',
          fileUrl: '',
          type: 'SPREADSHEET',
          status: 'IMPORTED',
          fileSize: 100,
          createdAt: '2026-07-20T00:00:00.000Z',
          updatedAt: '2026-07-20T00:00:00.000Z',
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('stale-import.xlsx')).toBeInTheDocument();

    window.dispatchEvent(new Event('carbonlite:demo-data-reset'));

    expect(await screen.findByText('No documents waiting for review.')).toBeInTheDocument();
    expect(screen.getByText('Upload a file or add records manually to begin.')).toBeInTheDocument();
    expect(screen.queryByText('stale-import.xlsx')).not.toBeInTheDocument();
  });

  it('renders the Input Review row action menu in a fixed portal', async () => {
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          id: 'doc-actions',
          fileName: 'pilot-import.xlsx',
          fileUrl: '',
          type: 'SPREADSHEET',
          status: 'IMPORTED',
          fileSize: 100,
          createdAt: '2026-07-20T00:00:00.000Z',
          updatedAt: '2026-07-20T00:00:00.000Z',
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 768,
    });

    const menuButton = await screen.findByRole('button', {
      name: /Open document actions for pilot-import.xlsx/i,
    });
    Object.defineProperty(menuButton, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        x: 760,
        y: 120,
        top: 120,
        right: 794,
        bottom: 154,
        left: 760,
        width: 34,
        height: 34,
        toJSON: () => {},
      }),
    });

    await userEvent.click(menuButton);

    const menu = screen.getByRole('menu', {
      name: /More actions for pilot-import.xlsx/i,
    });
    expect(menu).toBeInTheDocument();
    expect(menu).toHaveStyle({
      position: 'fixed',
      top: '160px',
      right: '230px',
      zIndex: '1000',
    });
    expect(within(menu).getByRole('menuitem', { name: 'View' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('uses status-aware selected document action labels', async () => {
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          id: 'doc-ready',
          fileName: 'ready-upload.xlsx',
          fileUrl: '',
          type: 'SPREADSHEET',
          status: 'REVIEW_REQUIRED',
          fileSize: 100,
          createdAt: '2026-07-20T00:00:00.000Z',
          updatedAt: '2026-07-20T00:00:00.000Z',
        },
        {
          id: 'doc-imported',
          fileName: 'imported-upload.xlsx',
          fileUrl: '',
          type: 'SPREADSHEET',
          status: 'IMPORTED',
          fileSize: 100,
          createdAt: '2026-07-21T00:00:00.000Z',
          updatedAt: '2026-07-21T00:00:00.000Z',
        },
      ],
      page: 1,
      pageSize: 20,
      total: 2,
      totalPages: 1,
    });

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('ready-upload.xlsx')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review Rows' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Imported Records' })).toBeInTheDocument();

    const selectedAction = screen.getByRole('button', { name: 'Review Selected Data' });
    expect(selectedAction).toBeDisabled();

    await userEvent.click(screen.getByLabelText('Select document ready-upload.xlsx'));
    expect(screen.getByRole('button', { name: 'Review Selected Data' })).toBeEnabled();

    await userEvent.click(screen.getByLabelText('Select document imported-upload.xlsx'));
    expect(screen.getByRole('button', { name: 'Select Compatible Documents' })).toBeDisabled();

    await userEvent.click(screen.getByLabelText('Select document ready-upload.xlsx'));
    expect(screen.getByRole('button', { name: 'Generate Report' })).toBeEnabled();
  });

  it('opens Manual Entry when route state requests manual input focus', async () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/input-data',
            state: { focusInputMethod: 'manual' },
          },
        ]}
      >
        <UploadPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: /^Manual Entry$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Manual Entry/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('heading', { name: /^Upload Documents$/i })).not.toBeInTheDocument();
  });

  it('loads sample files without enabling a hidden demo mode', async () => {
    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    await userEvent.click(
      await screen.findByRole('button', { name: /load sample data/i }),
    );

    expect(
      screen.getByText(
        'Sample files loaded. You can review, import, edit, and generate reports like a real workflow.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Prairie Logistics - diesel fuel invoice.pdf')).toBeInTheDocument();
    expect(screen.getByText('NorthGrid utility bill - March 2026.pdf')).toBeInTheDocument();
    expect(screen.queryByText(/Demo Mode/i)).not.toBeInTheDocument();
    expect(localStorage.getItem('carbonliteDemoMode')).toBeNull();
  });

  it('lets users load a sample JSON file for extraction', async () => {
    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /Use Sample JSON/i }));

    expect(screen.getByText('Sample JSON loaded. Click Extract Data.')).toBeInTheDocument();
    expect(screen.getByText(/carbonlite-sample-activity-records\.json/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Extract Data/i })).toBeEnabled();
  });

  it('shows loading state while retry extraction is running', async () => {
    let resolveExtract!: (value: any) => void;
    vi.mocked(getDocuments).mockResolvedValue({
      items: [failedDocument],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(extractDocument).mockReturnValue(
      new Promise((resolve) => {
        resolveExtract = resolve;
      }) as any,
    );

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    const retryButton = await screen.findByRole('button', { name: /Retry Extract/i });
    await waitFor(() => expect(retryButton).toBeEnabled());
    await userEvent.click(retryButton);

    expect(screen.getByRole('button', { name: /Extracting/i })).toBeDisabled();

    resolveExtract({
      documentId: 'doc-1',
      status: 'PROCESSED',
      parsedActivities: [
        {
          activityType: 'DIESEL',
          recordDate: '2026-05-01',
          quantity: 100,
          unit: 'L',
          sourceReference: 'failed-invoice.pdf',
        },
      ],
      sourceRowCount: 1,
      extractedRowCount: 1,
      possibleMissingRows: 0,
      warning: null,
    });

    expect(
      await screen.findByText(/Extraction completed. Review the preview below/i),
    ).toBeInTheDocument();
  });

  it('normalizes JSON preview rows and marks electricity records without province for review', async () => {
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          ...failedDocument,
          id: 'json-doc',
          fileName: 'activity-records.json',
          type: 'SPREADSHEET',
        },
      ],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(extractDocument).mockResolvedValue({
      documentId: 'json-doc',
      status: 'REVIEW_REQUIRED',
      parsedActivities: [
        {
          activityType: 'electricity',
          amount: '12500',
          unit: 'kWh',
          country: 'CAN',
          province: '',
          startDate: '2026-01-01',
          endDate: '2026-01-31',
          facilityName: 'Calgary Main Office',
          serviceLocation: 'Calgary, AB',
          notes: 'Optional note',
        },
        {
          activityType: 'Natural Gas',
          amount: '100',
          unit: 'm3',
          country: 'canada',
          province: 'AB',
          date: '2026-02-01',
        },
      ],
      sourceRowCount: 2,
      extractedRowCount: 2,
      possibleMissingRows: 0,
      warning: null,
    });

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    const retryButton = await screen.findByRole('button', { name: /Retry Extract/i });
    await waitFor(() => expect(retryButton).toBeEnabled());
    await userEvent.click(retryButton);

    expect((await screen.findAllByText('Missing Province')).length).toBeGreaterThan(0);
    expect(screen.getByText('Scroll horizontally to view all columns →')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Electricity')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Natural Gas')).toBeInTheDocument();
    expect(screen.getAllByDisplayValue('Canada').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('2026-01-01 to 2026-01-31')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Optional note')).toBeInTheDocument();
    expect(
      screen.queryByText(
        'Missing Province: Electricity records require province before factor matching.',
      ),
    ).not.toBeInTheDocument();

    const electricityRow = screen.getByDisplayValue('Electricity').closest('tr');
    expect(electricityRow).toBeTruthy();
    expect(within(electricityRow!).getByRole('checkbox')).not.toBeChecked();
    expect(within(electricityRow!).getByRole('checkbox')).toBeDisabled();
    expect(within(electricityRow!).getByText('Province required')).toBeInTheDocument();
    expect(
      within(electricityRow!)
        .getAllByText('Missing Province')
        .some(
          (element) =>
            element.getAttribute('title') ===
            'Electricity records require province before factor matching.',
        ),
    ).toBe(true);
    expect(within(electricityRow!).queryByText('-')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Select All/i }));
    expect(within(electricityRow!).getByRole('checkbox')).not.toBeChecked();
  });

  it('enables customer admins to set province on missing-province draft rows', async () => {
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          ...failedDocument,
          id: 'province-doc',
          fileName: 'province-missing.xlsx',
          type: 'SPREADSHEET',
        },
      ],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(extractDocument).mockResolvedValue({
      documentId: 'province-doc',
      status: 'REVIEW_REQUIRED',
      parsedActivities: [
        {
          activityType: 'electricity',
          amount: '1000',
          unit: 'kWh',
          country: 'Canada',
          province: '',
          startDate: '2026-01-01',
        },
      ],
      sourceRowCount: 1,
      extractedRowCount: 1,
      possibleMissingRows: 0,
      warning: null,
    });

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /Retry Extract/i }));

    const row = screen.getByDisplayValue('Electricity').closest('tr');
    expect(row).toBeTruthy();
    expect(within(row!).getByText('Province required')).toBeInTheDocument();

    const setProvinceButton = screen.getByRole('button', { name: 'Set Province' });
    expect(setProvinceButton).toBeDisabled();
    expect(setProvinceButton).toHaveAttribute('title', 'Select a province to apply.');

    await userEvent.selectOptions(screen.getByLabelText('Province'), 'Alberta');
    expect(setProvinceButton).toBeEnabled();

    await userEvent.click(setProvinceButton);

    expect(within(row!).getByDisplayValue('Alberta')).toBeInTheDocument();
    await waitFor(() => {
      expect(within(row!).queryByText('Province required')).not.toBeInTheDocument();
    });
    expect(within(row!).getByText('Ready')).toBeInTheDocument();
    expect(within(row!).getByRole('checkbox')).toBeEnabled();
    expect(within(row!).getByRole('checkbox')).toBeChecked();
  });

  it('keeps unsupported electricity provinces in JSON preview for factor review', async () => {
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          ...failedDocument,
          id: 'json-doc',
          fileName: 'activity-records.json',
          type: 'SPREADSHEET',
        },
      ],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(extractDocument).mockResolvedValue({
      documentId: 'json-doc',
      status: 'REVIEW_REQUIRED',
      parsedActivities: [
        {
          activityType: 'electricity',
          amount: '1000',
          unit: 'kWh',
          country: 'Canada',
          province: 'SK',
          startDate: '2026-01-01',
          notes: 'Unsupported pilot province should be factor-reviewed later.',
        },
      ],
      sourceRowCount: 1,
      extractedRowCount: 1,
      possibleMissingRows: 0,
      warning: null,
    });

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /Retry Extract/i }));

    const row = screen.getByDisplayValue('Electricity').closest('tr');
    expect(row).toBeTruthy();
    expect(within(row!).getByDisplayValue('Saskatchewan')).toBeInTheDocument();
    expect(within(row!).getAllByText('Missing Factor').length).toBeGreaterThan(0);
    expect(within(row!).getByText('Excluded')).toBeInTheDocument();
    expect(
      within(row!)
        .getAllByText('Missing Factor')
        .some(
          (element) =>
            element.getAttribute('title') ===
            'Electricity factor not available for this province in the current pilot.',
        ),
    ).toBe(true);
    expect(within(row!).queryByText('Missing Province')).not.toBeInTheDocument();
    expect(within(row!).queryByText('Province required')).not.toBeInTheDocument();
    expect(within(row!).getByRole('checkbox')).not.toBeChecked();
    expect(within(row!).getByRole('checkbox')).toBeDisabled();
  });

  it('keeps unsupported activity rows visible and not importable in the review table', async () => {
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          ...failedDocument,
          id: 'custom-doc',
          fileName: 'custom-activity.csv',
          type: 'SPREADSHEET',
        },
      ],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(extractDocument).mockResolvedValue({
      documentId: 'custom-doc',
      status: 'REVIEW_REQUIRED',
      parsedActivities: [
        {
          activityType: 'CUSTOM',
          amount: '25',
          unit: 'widgets',
          country: 'Canada',
          province: '',
          startDate: '2026-07-25',
          dateEstimated: true,
          notes: 'Unsupported activity should remain readable during review.',
        },
      ],
      sourceRowCount: 1,
      extractedRowCount: 1,
      possibleMissingRows: 0,
      warning: null,
    });

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    const retryButton = await screen.findByRole('button', { name: /Retry Extract/i });
    await waitFor(() => expect(retryButton).toBeEnabled());
    await userEvent.click(retryButton);

    const unsupportedSelect = screen.getByDisplayValue('Custom (Unsupported)');
    const row = unsupportedSelect.closest('tr');
    expect(row).toBeTruthy();

    expect(within(row!).getAllByText(/Unsupported Activity/i).length).toBeGreaterThan(0);
    expect(within(row!).getAllByText(/Unsupported Activity Type/i).length).toBeGreaterThan(0);
    expect(within(row!).getByDisplayValue('Custom (Unsupported)')).toBeInTheDocument();
    expect(within(row!).getByDisplayValue('25')).toBeInTheDocument();
    expect(within(row!).getByDisplayValue('widgets')).toBeInTheDocument();
    expect(within(row!).getByDisplayValue('Canada')).toBeInTheDocument();
    expect(within(row!).getByDisplayValue('Unsupported activity should remain readable during review.')).toBeInTheDocument();
    expect(within(row!).getByText('Date estimated: 2026-07-25')).toBeInTheDocument();

    expect(within(row!).getByRole('checkbox')).not.toBeChecked();
    expect(within(row!).getByRole('checkbox')).toBeDisabled();
  });

  it('imports selected ready rows while leaving invalid draft rows for review', async () => {
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          ...failedDocument,
          id: 'mixed-doc',
          fileName: 'mixed-activity-records.csv',
          type: 'SPREADSHEET',
        },
      ],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(extractDocument).mockResolvedValue({
      documentId: 'mixed-doc',
      status: 'REVIEW_REQUIRED',
      parsedActivities: [
        { activityType: 'Electricity', amount: 12500, unit: 'kWh', country: 'Canada', province: 'AB', startDate: '2026-07-20' },
        { activityType: 'Electricity', amount: 100, unit: 'kWh', country: 'Canada', province: 'BC', startDate: '2026-07-20' },
        { activityType: 'Electricity', amount: 1000, unit: 'kWh', country: 'Canada', province: 'ON', startDate: '2026-07-20' },
        { activityType: 'Natural Gas', amount: 1000, unit: 'm3', country: 'Canada', startDate: '2026-07-20' },
        { activityType: 'Gasoline', amount: 500, unit: 'liters', country: 'Canada', startDate: '2026-07-20' },
        { activityType: 'Diesel', amount: 100, unit: 'liters', country: 'Canada', startDate: '2026-07-20' },
        { activityType: 'Air Travel', amount: 5000, unit: 'km', country: 'Canada', startDate: '2026-07-20' },
        { activityType: 'Business Travel - Accommodation', amount: 10, unit: 'nights', country: 'Canada', startDate: '2026-07-20' },
        { activityType: 'Shipping', amount: 50, unit: 'kg', country: 'Canada', startDate: '2026-07-20', dateEstimated: true },
        { activityType: 'Water', amount: 100, unit: 'm3', country: 'Canada', startDate: '2026-07-20' },
        { activityType: 'CUSTOM', amount: 25, unit: 'widgets', country: 'Canada', startDate: '2026-07-20' },
        { activityType: 'Electricity', amount: 500, unit: 'kWh', country: 'Canada', province: '', startDate: '2026-07-20' },
        { activityType: 'Electricity', amount: 700, unit: 'kWh', country: 'Canada', province: 'SK', startDate: '2026-07-20' },
      ],
      sourceRowCount: 13,
      extractedRowCount: 13,
      possibleMissingRows: 0,
      warning: null,
    });

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    const retryButton = await screen.findByRole('button', { name: /Retry Extract/i });
    await waitFor(() => expect(retryButton).toBeEnabled());
    await userEvent.click(retryButton);

    expect(screen.getByText('Extracted rows: 13')).toBeInTheDocument();
    expect(screen.getByText(/File: mixed-activity-records\.csv/i)).toBeInTheDocument();
    expect(screen.getByText(/Source type: Spreadsheet import/i)).toBeInTheDocument();
    expect(screen.queryByText(/Document ID:/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Ready:/i)).toHaveTextContent(/Tracked metrics:/i);
    expect(screen.getByText(/Ready:/i)).toHaveTextContent(/Requires review:/i);

    const checkboxes = screen.getAllByLabelText(/Select preview row/i) as HTMLInputElement[];
    const importableCheckboxes = checkboxes.filter((checkbox) => !checkbox.disabled);
    const reviewOnlyCheckboxes = checkboxes.filter((checkbox) => checkbox.disabled);
    expect(importableCheckboxes.length).toBeGreaterThan(0);
    expect(reviewOnlyCheckboxes.length).toBeGreaterThan(0);
    const selectedImportableCheckboxes = importableCheckboxes.filter(
      (checkbox) => checkbox.checked,
    );
    expect(selectedImportableCheckboxes.length).toBeGreaterThan(0);
    expect(reviewOnlyCheckboxes.every((checkbox) => !checkbox.checked)).toBe(true);

    const waterRow = checkboxes[9].closest('tr');
    expect(waterRow).toBeTruthy();
    expect(within(waterRow!).getByText('Tracked Metric')).toBeInTheDocument();
    expect(within(waterRow!).getByText('Tracked Only')).toBeInTheDocument();
    expect(within(waterRow!).getByRole('checkbox')).toBeChecked();

    const confirmButton = screen.getByRole('button', { name: 'Confirm Import' });
    expect(confirmButton).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: 'Confirm Import' }));

    await waitFor(() => {
      expect(confirmDocumentImport).toHaveBeenCalledTimes(1);
    });
    const importedActivities = vi.mocked(confirmDocumentImport).mock.calls[0][1];
    expect(importedActivities).toHaveLength(selectedImportableCheckboxes.length);
    expect(importedActivities.map((activity) => activity.activityType)).toContain('WATER');
    expect(importedActivities.map((activity) => activity.activityType)).not.toContain('CUSTOM');
    expect(importedActivities).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ jurisdictionRegion: 'Saskatchewan' }),
      ]),
    );
    expect(
      await screen.findByText(/Imported 10 activity record\(s\).*3 rows were left in draft because they require review/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Extracted rows: 3')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Custom (Unsupported)')).toBeInTheDocument();
    expect(screen.getAllByText('Missing Province').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Missing Factor').length).toBeGreaterThan(0);
  });

  it('auto-applies a default estimated date and imports the row without row-by-row suggestion', async () => {
    const uploadDate = failedDocument.createdAt.slice(0, 10);
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          ...failedDocument,
          id: 'missing-date-doc',
          fileName: 'missing-date.csv',
          type: 'SPREADSHEET',
        },
      ],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(extractDocument).mockResolvedValue({
      documentId: 'missing-date-doc',
      status: 'REVIEW_REQUIRED',
      parsedActivities: [
        {
          activityType: 'Natural Gas',
          amount: 100,
          unit: 'm3',
          country: 'Canada',
          startDate: '/',
        },
      ],
      sourceRowCount: 1,
      extractedRowCount: 1,
      possibleMissingRows: 0,
      warning: null,
    });

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /Retry Extract/i }));

    const row = screen.getByDisplayValue('Natural Gas').closest('tr');
    expect(row).toBeTruthy();
    expect(within(row!).getByDisplayValue(uploadDate)).toBeInTheDocument();
    expect(within(row!).getByText(`Date estimated: ${uploadDate}`)).toBeInTheDocument();
    expect(within(row!).queryByText(/Use Suggestion/i)).not.toBeInTheDocument();
    expect(within(row!).queryByText('Missing Date')).not.toBeInTheDocument();
    expect(within(row!).getByText('Ready')).toBeInTheDocument();
    expect(within(row!).getByRole('checkbox')).toBeChecked();
    expect(screen.getByRole('button', { name: 'Confirm Import' })).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: 'Confirm Import' }));

    await waitFor(() => {
      expect(confirmDocumentImport).toHaveBeenCalledTimes(1);
    });
    const importedActivities = vi.mocked(confirmDocumentImport).mock.calls[0][1];
    expect(importedActivities).toHaveLength(1);
    expect(importedActivities[0]).toMatchObject({
      activityType: 'NATURAL_GAS',
      recordDate: uploadDate,
      dateEstimated: true,
    });
  });

  it('shows completion, clears draft review, and redirects after a full successful import', async () => {
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          ...failedDocument,
          id: 'complete-import-doc',
          fileName: 'complete-import.csv',
          type: 'SPREADSHEET',
        },
      ],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(extractDocument).mockResolvedValue({
      documentId: 'complete-import-doc',
      status: 'REVIEW_REQUIRED',
      parsedActivities: [
        {
          activityType: 'Natural Gas',
          amount: 100,
          unit: 'm3',
          country: 'Canada',
          startDate: '2026-07-20',
        },
      ],
      sourceRowCount: 1,
      extractedRowCount: 1,
      possibleMissingRows: 0,
      warning: null,
    });

    render(
      <MemoryRouter initialEntries={['/input-data']}>
        <Routes>
          <Route path="/input-data" element={<UploadPage />} />
          <Route path="/calculation-review" element={<div>Calculation Review route</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /Retry Extract/i }));

    expect(screen.getByText('Draft Records Review')).toBeInTheDocument();
    expect(screen.getByText('Extracted rows: 1')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Confirm Import' }));

    expect(
      await screen.findByText(
        'Import completed successfully. The selected records have been saved as Data Records. 1 record imported. 0 records require review. Redirecting to Calculation Review...',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Draft Records Review')).not.toBeInTheDocument();
    expect(confirmDocumentImport).toHaveBeenCalledTimes(1);
    expect(calculateMetrics).toHaveBeenCalledWith(['created-1']);

    await waitFor(() => {
      expect(screen.getByText('Calculation Review route')).toBeInTheDocument();
    }, { timeout: 2500 });
  });

  it('clears preview row selection when an edit makes the row invalid', async () => {
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          ...failedDocument,
          id: 'json-doc',
          fileName: 'activity-records.json',
          type: 'SPREADSHEET',
        },
      ],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(extractDocument).mockResolvedValue({
      documentId: 'json-doc',
      status: 'PROCESSED',
      parsedActivities: [
        {
          activityType: 'Electricity',
          amount: 12500,
          unit: 'kWh',
          country: 'Canada',
          province: 'AB',
          startDate: '2026-01-01',
        },
      ],
      sourceRowCount: 1,
      extractedRowCount: 1,
      possibleMissingRows: 0,
      warning: null,
    });

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /Retry Extract/i }));

    const row = screen.getByDisplayValue('Electricity').closest('tr');
    expect(row).toBeTruthy();
    expect(within(row!).getByRole('checkbox')).toBeChecked();
    expect(within(row!).getByText('Ready')).toBeInTheDocument();

    await userEvent.clear(screen.getByDisplayValue('Alberta'));

    await waitFor(() => {
      expect(within(row!).getAllByText('Missing Province').length).toBeGreaterThan(0);
    });
    expect(within(row!).getByText('Province required')).toBeInTheDocument();
    expect(
      within(row!)
        .getAllByText('Missing Province')
        .some(
          (element) =>
            element.getAttribute('title') ===
            'Electricity records require province before factor matching.',
        ),
    ).toBe(true);
    expect(within(row!).getByRole('checkbox')).not.toBeChecked();
    expect(within(row!).getByRole('checkbox')).toBeDisabled();
  });

  it('shows a friendly error when retry extraction returns 500', async () => {
    vi.mocked(getDocuments).mockResolvedValue({
      items: [failedDocument],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(extractDocument).mockRejectedValue(
      new ApiError(
        500,
        'The document could not be processed. Please try again.',
        null,
        'EXTRACTION_FAILED',
        'Internal server error',
      ),
    );

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /Retry Extract/i }));

    expect(extractDocument).toHaveBeenCalledWith('doc-1');
    expect(
      await screen.findByText('We could not extract data from this file. Please check the file format or try uploading it again.'),
    ).toBeInTheDocument();
    expect(await screen.findByText('Needs Attention')).toBeInTheDocument();
  });

  it('marks retry extraction as file missing when backend returns 404', async () => {
    vi.mocked(getDocuments).mockResolvedValue({
      items: [failedDocument],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(extractDocument).mockRejectedValue(
      new ApiError(
        404,
        'The original file is no longer available. Please upload it again.',
        null,
        'FILE_MISSING',
        'Uploaded file is no longer available. Please upload it again.',
      ),
    );

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /Retry Extract/i }));

    expect(extractDocument).toHaveBeenCalledWith('doc-1');
    expect(
      await screen.findByText('This file is no longer available. Please upload it again.'),
    ).toBeInTheDocument();
    expect((await screen.findAllByText('Re-upload Required')).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Upload Again/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /^Delete$/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Open document actions for failed-invoice.pdf/i }),
    ).not.toBeInTheDocument();
  });

  it('shows a friendly error when saved extraction preview is missing', async () => {
    vi.mocked(getDocuments).mockResolvedValue({
      items: [
        {
          ...failedDocument,
          status: 'REVIEW_REQUIRED',
        },
      ],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(getDocumentExtraction).mockRejectedValue(
      new ApiError(
        404,
        'Preview data is no longer available. Please extract the document again.',
        null,
        'EXTRACTION_NOT_FOUND',
        'Cannot GET /api/document-extraction/doc-1',
      ),
    );

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /Review Rows/i }));

    expect(getDocumentExtraction).toHaveBeenCalledWith('doc-1');
    expect(
      await screen.findByText('Preview data is no longer available. Please extract the document again.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Cannot GET|API 404|document-extraction/i)).not.toBeInTheDocument();
  });

  it('keeps document available and shows no-data message when retry finds no rows', async () => {
    vi.mocked(getDocuments).mockResolvedValue({
      items: [failedDocument],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(extractDocument).mockResolvedValue({
      documentId: 'doc-1',
      status: 'NO_DATA_FOUND',
      parsedActivities: [],
      sourceRowCount: 0,
      extractedRowCount: 0,
      possibleMissingRows: 0,
      warning: null,
    });

    render(
      <MemoryRouter>
        <UploadPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /Retry Extract/i }));

    expect(extractDocument).toHaveBeenCalledWith('doc-1');
    expect(
      await screen.findByText('No emissions data detected. You can view the file or retry extraction.'),
    ).toBeInTheDocument();
    expect(await screen.findByText('Needs Attention')).toBeInTheDocument();
    expect(screen.getByText('failed-invoice.pdf')).toBeInTheDocument();
  });
});
