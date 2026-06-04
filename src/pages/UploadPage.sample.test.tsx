import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { UploadPage } from './UploadPage';
import { getDocuments } from '../services/documents';
import { extractDocument } from '../services/documentExtraction';

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
    vi.mocked(getDocuments).mockReset();
    vi.mocked(extractDocument).mockReset();
    vi.mocked(getDocuments).mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 0,
      total: 0,
      totalPages: 1,
    });
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

  it('shows a friendly error when retry extraction returns 500', async () => {
    vi.mocked(getDocuments).mockResolvedValue({
      items: [failedDocument],
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(extractDocument).mockRejectedValue(
      new Error('API 500: Internal server error'),
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
      new Error('API 404: Uploaded file is no longer available. Please upload it again.'),
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
