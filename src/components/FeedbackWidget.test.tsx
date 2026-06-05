import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthProvider';
import { submitFeedback } from '../services/feedback';
import { FeedbackWidget } from './FeedbackWidget';

vi.mock('../services/feedback', () => ({
  submitFeedback: vi.fn(),
}));

describe('FeedbackWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('accessToken', 'token');
    localStorage.setItem(
      'currentUser',
      JSON.stringify({ email: 'pilot@example.com', organizationId: 'org-1' }),
    );
  });

  afterEach(() => {
    localStorage.clear();
  });

  function renderWidget(route = '/upload') {
    return render(
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>
          <FeedbackWidget />
        </AuthProvider>
      </MemoryRouter>,
    );
  }

  it('submits feedback with route and url context', async () => {
    vi.mocked(submitFeedback).mockResolvedValue({
      id: 'feedback-1',
      type: 'BUG',
      intent: 'Import records',
      message: 'The import button did not respond',
      organizationId: 'org-1',
      status: 'NEW',
      createdAt: new Date().toISOString(),
    });

    renderWidget('/upload');

    await userEvent.click(screen.getByRole('button', { name: /Feedback/i }));
    await userEvent.selectOptions(screen.getByLabelText(/Feedback Type/i), 'BUG');
    await userEvent.type(screen.getByLabelText(/What were you trying to do/i), 'Import records');
    await userEvent.type(screen.getByLabelText(/What happened/i), 'The import button did not respond');
    await userEvent.type(screen.getByLabelText(/Email/i), 'pilot@example.com');
    await userEvent.click(screen.getByRole('button', { name: /^Submit$/i }));

    expect(submitFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'BUG',
        intent: 'Import records',
        message: 'The import button did not respond',
        email: 'pilot@example.com',
        page: '/upload',
        url: expect.stringContaining('/upload'),
      }),
    );
    expect(await screen.findByText('Thank you for your feedback.')).toBeInTheDocument();
  });

  it('shows a friendly error if submission fails', async () => {
    vi.mocked(submitFeedback).mockRejectedValue(new Error('API unavailable'));

    renderWidget('/reports');

    await userEvent.click(screen.getByRole('button', { name: /Feedback/i }));
    await userEvent.type(screen.getByLabelText(/What were you trying to do/i), 'Generate report');
    await userEvent.type(screen.getByLabelText(/What happened/i), 'The report failed');
    await userEvent.click(screen.getByRole('button', { name: /^Submit$/i }));

    expect(await screen.findByText('Unable to submit feedback. Please try again.')).toBeInTheDocument();
    await waitFor(() => expect(submitFeedback).toHaveBeenCalledTimes(1));
  });
});
