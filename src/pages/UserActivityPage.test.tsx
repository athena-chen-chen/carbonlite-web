import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  getActivityEvents,
  getActivityEventSummary,
  type ActivityEventItem,
} from '../services/activityEvents';
import { UserActivityPage } from './UserActivityPage';

vi.mock('../services/activityEvents', () => ({
  getActivityEvents: vi.fn(),
  getActivityEventSummary: vi.fn(),
}));

describe('UserActivityPage', () => {
  const event: ActivityEventItem = {
    id: 'event-1',
    organizationId: 'org-1',
    userId: 'user-1',
    eventName: 'DOCUMENT_UPLOADED',
    page: '/upload',
    entityType: 'Document',
    entityId: 'doc-1',
    metadata: {
      fileType: 'PDF',
      fileSize: 1200,
    },
    createdAt: '2026-06-05T12:00:00.000Z',
    user: {
      id: 'user-1',
      email: 'pilot@example.com',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getActivityEvents).mockResolvedValue({
      items: [event],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(getActivityEventSummary).mockResolvedValue({
      activeUsers: 1,
      documentsUploaded: 4,
      extractionAttempts: 3,
      successfulExtractions: 2,
      reportsGenerated: 1,
      pdfExports: 1,
      feedbackSubmitted: 1,
    });
  });

  it('renders pilot usage summary and activity events', async () => {
    render(<UserActivityPage />);

    expect(await screen.findByText('User Activity')).toBeInTheDocument();
    expect(screen.getByText('Documents Uploaded')).toBeInTheDocument();
    expect(screen.getAllByText('Document Uploaded').length).toBeGreaterThan(0);
    expect(screen.getByText('pilot@example.com')).toBeInTheDocument();
    expect(screen.getByText('Document · doc-1')).toBeInTheDocument();
    expect(screen.getByText(/fileType: PDF/)).toBeInTheDocument();
  });

  it('passes filters to the activity service', async () => {
    render(<UserActivityPage />);

    await screen.findByText('Document Uploaded');
    await userEvent.selectOptions(screen.getByLabelText(/Event/i), 'REPORT_EXPORTED_PDF');
    await userEvent.type(screen.getByLabelText(/Page/i), '/reports');
    await userEvent.type(screen.getByLabelText(/User/i), 'advisor@example.com');

    await waitFor(() => {
      expect(getActivityEvents).toHaveBeenLastCalledWith(
        expect.objectContaining({
          eventName: 'REPORT_EXPORTED_PDF',
          pagePath: '/reports',
          user: 'advisor@example.com',
        }),
      );
    });
  });
});
