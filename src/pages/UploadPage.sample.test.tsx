import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { UploadPage } from './UploadPage';

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
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
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
});
