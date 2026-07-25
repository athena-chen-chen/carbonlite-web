import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { UploadPage } from './UploadPage';
import { getDocuments } from '../services/documents';
import { ApiError } from '../services/api';
import { extractDocument, getDocumentExtraction } from '../services/documentExtraction';

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
    Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
    vi.mocked(getDocuments).mockReset();
    vi.mocked(extractDocument).mockReset();
    vi.mocked(getDocumentExtraction).mockReset();
    vi.mocked(getDocuments).mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 0,
      total: 0,
      totalPages: 1,
    });
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

    await userEvent.click(await screen.findByRole('button', { name: /Retry Extract/i }));

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

  it('normalizes JSON preview rows and marks electricity without province for review', async () => {
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

    await userEvent.click(await screen.findByRole('button', { name: /Retry Extract/i }));

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
      await screen.findByText('Extraction failed. Please try again or upload the file again.'),
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
    expect(screen.getByRole('button', { name: /Re-upload Required/i })).toBeDisabled();
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

    await userEvent.click(await screen.findByRole('button', { name: /Preview Data/i }));

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
