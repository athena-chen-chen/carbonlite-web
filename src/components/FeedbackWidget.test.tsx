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
        id: 'user-internal-id',
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
    await userEvent.selectOptions(screen.getByLabelText(/Feedback Type/i), 'CALCULATION');
    await userEvent.selectOptions(screen.getByLabelText(/Rating/i), '4');
    await userEvent.type(screen.getByLabelText(/^Message$/i), 'The calculation trail was helpful but a label was unclear');
    await userEvent.click(screen.getByRole('button', { name: /^Submit$/i }));

    expect(submitFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'OTHER',
        intent: 'Calculation feedback',
        message: expect.stringContaining('The calculation trail was helpful but a label was unclear'),
        email: 'pilot@example.com',
        page: '/upload',
        url: expect.stringContaining('/upload'),
        workspaceName: 'CarbonLite Sample Workspace',
        accountType: 'PILOT_REVIEWER',
        appVersion: expect.any(String),
      }),
    );
    const submittedMessage = vi.mocked(submitFeedback).mock.calls[0][0].message;
    expect(submittedMessage).toContain('Feedback type: Calculation');
    expect(submittedMessage).toContain('Rating: 4');
    expect(submittedMessage).toContain('Page path: /upload');
    expect(submittedMessage).toContain('User email: pilot@example.com');
    expect(submittedMessage).toContain('Account type: PILOT_REVIEWER');
    expect(submittedMessage).toContain('Workspace: CarbonLite Sample Workspace');
    expect(submittedMessage).not.toContain('user-internal-id');
    expect(submittedMessage).not.toContain('token');
    expect(await screen.findByText('Thank you. Your feedback has been submitted.')).toBeInTheDocument();
  });

  it('offers a mailto fallback with route and account context', async () => {
    renderWidget('/reports?period=2026');

    await userEvent.click(screen.getByRole('button', { name: /Send Feedback/i }));
    await userEvent.selectOptions(screen.getByLabelText(/Feedback Type/i), 'REPORT');
    await userEvent.selectOptions(screen.getByLabelText(/Rating/i), '5');
    await userEvent.type(screen.getByLabelText(/^Message$/i), 'The report wording is clear.');

    const emailLink = screen.getByRole('link', { name: /Send by email/i });
    expect(emailLink).toHaveAttribute('href', expect.stringContaining('mailto:hello@carbonliteapp.ca'));
    expect(emailLink).toHaveAttribute('href', expect.stringContaining('CarbonLite%20Pilot%20Feedback'));
    expect(emailLink).toHaveAttribute('href', expect.stringContaining('%2Freports%3Fperiod%3D2026'));
    expect(emailLink).toHaveAttribute('href', expect.stringContaining('PILOT_REVIEWER'));
    expect(emailLink).toHaveAttribute('href', expect.stringContaining('CarbonLite%20Sample%20Workspace'));
    expect(emailLink).toHaveAttribute('href', expect.stringContaining('Report'));
    expect(emailLink).toHaveAttribute('href', expect.stringContaining('5'));
    expect(emailLink).toHaveAttribute('href', expect.stringContaining('The%20report%20wording%20is%20clear'));
    expect(screen.getByText(/Context included: \/reports\?period=2026/)).toBeInTheDocument();
  });

  it('shows a friendly error if submission fails', async () => {
    vi.mocked(submitFeedback).mockRejectedValue(new Error('User not authorized to read feedback'));

    renderWidget('/reports');

    await userEvent.click(screen.getByRole('button', { name: /Send Feedback/i }));
    await userEvent.type(screen.getByLabelText(/^Message$/i), 'The report failed');
    await userEvent.click(screen.getByRole('button', { name: /^Submit$/i }));

    expect(
      await screen.findByText(
        'Your feedback could not be submitted right now. Please try again or contact hello@carbonliteapp.ca.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Send by email/i })).toHaveAttribute(
      'href',
      expect.stringContaining('mailto:hello@carbonliteapp.ca'),
    );
    await waitFor(() => expect(submitFeedback).toHaveBeenCalledTimes(1));
  });
});
