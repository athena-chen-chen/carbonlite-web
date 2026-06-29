import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  getAdminFeedbackList,
  updateAdminFeedbackStatus,
  type FeedbackItem,
} from '../services/feedback';
import { FeedbackManagementPage } from './FeedbackManagementPage';

vi.mock('../services/feedback', () => ({
  getAdminFeedbackList: vi.fn(),
  updateAdminFeedbackStatus: vi.fn(),
}));

describe('FeedbackManagementPage', () => {
  const feedback: FeedbackItem = {
    id: 'feedback-1',
    type: 'SUGGESTION',
    intent: 'Review extracted rows',
    message: 'It would help to show confidence by row.',
    email: 'advisor@example.com',
    page: '/upload',
    url: 'https://carbonliteapp.ca/upload',
    organizationId: 'org-1',
    userId: 'user-1',
    user: {
      id: 'user-1',
      email: 'pilot@example.com',
      name: 'Pilot User',
    },
    organization: {
      id: 'org-1',
      name: 'Pilot Organization',
    },
    appVersion: '2026.6.29',
    userAgent: 'Vitest',
    status: 'NEW',
    createdAt: '2026-06-04T12:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAdminFeedbackList).mockResolvedValue({
      items: [feedback],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(updateAdminFeedbackStatus).mockResolvedValue({
      ...feedback,
      status: 'REVIEWED',
    });
  });

  it('loads feedback and filters by status', async () => {
    render(<FeedbackManagementPage />);

    expect(await screen.findByText('Review extracted rows')).toBeInTheDocument();
    expect(screen.getByText('pilot@example.com')).toBeInTheDocument();
    expect(screen.getByText('Pilot Organization')).toBeInTheDocument();
    expect(screen.getByText('2026.6.29')).toBeInTheDocument();
    expect(screen.getByText('Suggestion')).toBeInTheDocument();
    expect(getAdminFeedbackList).toHaveBeenCalledWith('NEW');

    await userEvent.click(screen.getByRole('button', { name: /^Reviewed$/i }));

    expect(getAdminFeedbackList).toHaveBeenCalledWith('REVIEWED');
  });

  it('updates feedback status and removes the row from the current filter', async () => {
    render(<FeedbackManagementPage />);

    await screen.findByText('Review extracted rows');
    await userEvent.selectOptions(
      screen.getByLabelText('Status for feedback feedback-1'),
      'REVIEWED',
    );

    expect(updateAdminFeedbackStatus).toHaveBeenCalledWith('feedback-1', 'REVIEWED');
    expect(await screen.findByText('Feedback marked as Reviewed.')).toBeInTheDocument();
    expect(screen.queryByText('Review extracted rows')).not.toBeInTheDocument();
    expect(screen.getByText('No feedback in this status.')).toBeInTheDocument();
  });

  it('shows the admin empty state when no feedback exists', async () => {
    vi.mocked(getAdminFeedbackList).mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    });

    render(<FeedbackManagementPage />);

    expect(await screen.findByText('No feedback in this status.')).toBeInTheDocument();
  });

  it('uses compact date formatting without the year', async () => {
    render(<FeedbackManagementPage />);

    await screen.findByText('Review extracted rows');

    expect(screen.getByText(/Jun \d{1,2}, \d{1,2}:00/)).toBeInTheDocument();
    expect(screen.queryByText(/2026, \d{1,2}:00/)).not.toBeInTheDocument();
  });
});
