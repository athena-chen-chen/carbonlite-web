import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '../auth/AuthProvider';
import {
  getAdminActiveUsers,
  getAdminActivityEvents,
  getAdminActivityEventSummary,
  getActivityEvents,
  getActivityEventSummary,
  type ActivityEventItem,
} from '../services/activityEvents';
import { UserActivityPage } from './UserActivityPage';

vi.mock('../services/activityEvents', () => ({
  getAdminActiveUsers: vi.fn(),
  getAdminActivityEvents: vi.fn(),
  getAdminActivityEventSummary: vi.fn(),
  getActivityEvents: vi.fn(),
  getActivityEventSummary: vi.fn(),
}));

describe('UserActivityPage', () => {
  const event: ActivityEventItem = {
    id: 'event-1',
    organizationId: 'org-1',
    organizationName: 'Pilot Org',
    userId: 'user-1',
    userEmail: 'pilot@example.com',
    eventName: 'DOCUMENT_UPLOADED',
    activityType: 'DOCUMENT_UPLOADED',
    description: 'Uploaded document',
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
    localStorage.clear();
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
    vi.mocked(getAdminActivityEvents).mockResolvedValue({
      items: [event],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(getAdminActivityEventSummary).mockResolvedValue({
      today: 3,
      thisWeek: 7,
      thisMonth: 12,
      activeUsers: 2,
      documentsUploaded: 4,
      extractionAttempts: 3,
      successfulExtractions: 2,
      reportsGenerated: 1,
      pdfExports: 1,
      feedbackSubmitted: 1,
    });
    vi.mocked(getAdminActiveUsers).mockResolvedValue({
      items: [
        {
          userId: 'user-1',
          name: 'Pilot User',
          email: 'pilot@example.com',
          organizationName: 'Pilot Org',
          activityCount: 5,
          lastActiveAt: '2026-06-05T12:00:00.000Z',
          mostRecentActivityType: 'REPORT_GENERATED',
        },
      ],
    });
  });

  function renderPage(role: 'ADMIN' | 'USER' = 'USER') {
    localStorage.setItem('accessToken', 'valid-token');
    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        id: role === 'ADMIN' ? 'admin-1' : 'user-1',
        email: role === 'ADMIN' ? 'admin@example.com' : 'pilot@example.com',
        role,
      }),
    );

    render(
      <AuthProvider>
        <UserActivityPage />
      </AuthProvider>,
    );
  }

  it('renders pilot usage summary and activity events', async () => {
    renderPage();

    expect(await screen.findByText('User Activity')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('This Week')).toBeInTheDocument();
    expect(screen.getByText('This Month')).toBeInTheDocument();
    expect(screen.getAllByText('Document Uploaded').length).toBeGreaterThan(0);
    expect(screen.getByText('pilot@example.com')).toBeInTheDocument();
    expect(screen.getByText('Document · doc-1')).toBeInTheDocument();
    expect(screen.getByText('Uploaded document')).toBeInTheDocument();
    expect(getActivityEvents).toHaveBeenCalled();
    expect(getAdminActivityEvents).not.toHaveBeenCalled();
  });

  it('passes filters to the activity service', async () => {
    renderPage();

    await screen.findByText('Document Uploaded');
    await userEvent.selectOptions(screen.getByLabelText(/Activity Type/i), 'REPORT_EXPORTED_PDF');
    await userEvent.type(screen.getByLabelText(/Page/i), '/reports');

    await waitFor(() => {
      expect(getActivityEvents).toHaveBeenLastCalledWith(
        expect.objectContaining({
          activityType: 'REPORT_EXPORTED_PDF',
          pagePath: '/reports',
        }),
      );
    });
  });

  it('uses admin endpoints and filters across users and organizations for admins', async () => {
    renderPage('ADMIN');

    await screen.findByText('Document Uploaded');
    expect(screen.getByText('Pilot Org')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/User/i), 'advisor@example.com');
    await userEvent.type(screen.getByLabelText(/Organization/i), 'Client Org');

    await waitFor(() => {
      expect(getAdminActivityEvents).toHaveBeenLastCalledWith(
        expect.objectContaining({
          user: 'advisor@example.com',
          organization: 'Client Org',
        }),
      );
    });
    expect(getAdminActivityEventSummary).toHaveBeenCalled();
  });

  it('opens active users panel for admins and refreshes with date filters', async () => {
    renderPage('ADMIN');

    await screen.findByText('Document Uploaded');
    await userEvent.click(screen.getByRole('button', { name: /Active Users/i }));

    const panel = await screen.findByRole('region', { name: 'Active users' });
    expect(panel).toBeInTheDocument();
    expect(within(panel).getByText('Pilot User')).toBeInTheDocument();
    expect(within(panel).getByText('Pilot Org')).toBeInTheDocument();
    expect(within(panel).getByText('5')).toBeInTheDocument();
    expect(within(panel).getByText('Report Generated')).toBeInTheDocument();
    expect(getAdminActiveUsers).toHaveBeenCalledWith({ dateFrom: '', dateTo: '' });

    await userEvent.type(screen.getByLabelText(/Date from/i), '2026-06-01');

    await waitFor(() => {
      expect(getAdminActiveUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({ dateFrom: '2026-06-01' }),
      );
    });
  });

  it('does not show active users drilldown for normal users', async () => {
    renderPage();

    await screen.findByText('Document Uploaded');

    expect(screen.queryByRole('button', { name: /Active Users/i })).not.toBeInTheDocument();
    expect(getAdminActiveUsers).not.toHaveBeenCalled();
  });
});
