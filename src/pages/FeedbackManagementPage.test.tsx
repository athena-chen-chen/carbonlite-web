import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  getFeedbackList,
  updateFeedbackStatus,
  type FeedbackItem,
} from '../services/feedback';
import { FeedbackManagementPage } from './FeedbackManagementPage';

vi.mock('../services/feedback', () => ({
  getFeedbackList: vi.fn(),
  updateFeedbackStatus: vi.fn(),
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
    userAgent: 'Vitest',
    status: 'NEW',
    createdAt: '2026-06-04T12:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getFeedbackList).mockResolvedValue({
      items: [feedback],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
    vi.mocked(updateFeedbackStatus).mockResolvedValue({
      ...feedback,
      status: 'REVIEWED',
    });
  });

  it('loads feedback and filters by status', async () => {
    render(<FeedbackManagementPage />);

    expect(await screen.findByText('Review extracted rows')).toBeInTheDocument();
    expect(screen.getByText('Suggestion')).toBeInTheDocument();
    expect(getFeedbackList).toHaveBeenCalledWith('NEW');

    await userEvent.click(screen.getByRole('button', { name: /^Reviewed$/i }));

    expect(getFeedbackList).toHaveBeenCalledWith('REVIEWED');
  });

  it('updates feedback status', async () => {
    render(<FeedbackManagementPage />);

    await screen.findByText('Review extracted rows');
    await userEvent.selectOptions(
      screen.getByLabelText('Status for feedback feedback-1'),
      'REVIEWED',
    );

    expect(updateFeedbackStatus).toHaveBeenCalledWith('feedback-1', 'REVIEWED');
    expect(await screen.findByText('Feedback status updated.')).toBeInTheDocument();
  });
});
