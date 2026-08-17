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
      JSON.stringify({
        email: 'pilot@example.com',
        organizationId: 'org-1',
        organizationName: 'CarbonLite Sample Workspace',
        accountType: 'PILOT_REVIEWER',
      }),
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

    await userEvent.click(screen.getByRole('button', { name: /Send Feedback/i }));
    await userEvent.selectOptions(screen.getByLabelText(/Feedback Type/i), 'BUG');
    await userEvent.type(screen.getByLabelText(/What were you trying to do/i), 'Import records');
    await userEvent.type(screen.getByLabelText(/What happened/i), 'The import button did not respond');
    await userEvent.click(screen.getByRole('button', { name: /^Submit$/i }));

    expect(submitFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'BUG',
        intent: 'Import records',
        message: 'The import button did not respond',
        email: 'pilot@example.com',
        page: '/upload',
        url: expect.stringContaining('/upload'),
        workspaceName: 'CarbonLite Sample Workspace',
        accountType: 'PILOT_REVIEWER',
        appVersion: expect.any(String),
      }),
    );
    expect(await screen.findByText('Thank you for your feedback.')).toBeInTheDocument();
  });

  it('offers a mailto fallback with route and account context', async () => {
    renderWidget('/reports?period=2026');

    await userEvent.click(screen.getByRole('button', { name: /Send Feedback/i }));

    const emailLink = screen.getByRole('link', { name: /Send by email/i });
    expect(emailLink).toHaveAttribute('href', expect.stringContaining('mailto:hello@carbonliteapp.ca'));
    expect(emailLink).toHaveAttribute('href', expect.stringContaining('CarbonLite%20Pilot%20Feedback'));
    expect(emailLink).toHaveAttribute('href', expect.stringContaining('%2Freports%3Fperiod%3D2026'));
    expect(emailLink).toHaveAttribute('href', expect.stringContaining('PILOT_REVIEWER'));
    expect(emailLink).toHaveAttribute('href', expect.stringContaining('CarbonLite%20Sample%20Workspace'));
    expect(screen.getByText(/Context included: \/reports\?period=2026/)).toBeInTheDocument();
  });

  it('shows a friendly error if submission fails', async () => {
    vi.mocked(submitFeedback).mockRejectedValue(new Error('User not authorized to read feedback'));

    renderWidget('/reports');

    await userEvent.click(screen.getByRole('button', { name: /Send Feedback/i }));
    await userEvent.type(screen.getByLabelText(/What were you trying to do/i), 'Generate report');
    await userEvent.type(screen.getByLabelText(/What happened/i), 'The report failed');
    await userEvent.click(screen.getByRole('button', { name: /^Submit$/i }));

    expect(
      await screen.findByText('Your feedback could not be submitted. Please try again or contact support.'),
    ).toBeInTheDocument();
    await waitFor(() => expect(submitFeedback).toHaveBeenCalledTimes(1));
  });
});
