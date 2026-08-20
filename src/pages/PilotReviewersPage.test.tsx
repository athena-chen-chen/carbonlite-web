import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PilotReviewersPage from './PilotReviewersPage';
import { createPilotReviewer } from '../services/pilotReviewers';

vi.mock('../services/pilotReviewers', async () => {
  const actual = await vi.importActual<typeof import('../services/pilotReviewers')>(
    '../services/pilotReviewers',
  );

  return {
    ...actual,
    createPilotReviewer: vi.fn(),
  };
});

describe('PilotReviewersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('creates a pilot reviewer with sample workspace defaults and shows setup link', async () => {
    vi.mocked(createPilotReviewer).mockResolvedValue({
      name: 'Alexander',
      email: 'alexander@example.com',
      workspaceName: 'CarbonLite Sample Workspace',
      accountType: 'PILOT_REVIEWER',
      role: 'REVIEWER',
      expiresAt: '2026-09-01',
      inviteLink: 'https://app.example.com/set-password?token=secure-token',
    });

    render(<PilotReviewersPage />);

    expect(screen.getByRole('heading', { name: 'Pilot Reviewers' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('CarbonLite Sample Workspace')).toBeInTheDocument();
    expect(screen.getByText(/cannot upload, import, edit, delete, reset demo data/i)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/^name/i), 'Alexander');
    await userEvent.type(screen.getByLabelText(/^email/i), 'alexander@example.com');
    await userEvent.type(screen.getByLabelText(/optional expiration date/i), '2026-09-01');
    await userEvent.click(screen.getByRole('button', { name: /create pilot reviewer/i }));

    expect(createPilotReviewer).toHaveBeenCalledWith({
      name: 'Alexander',
      email: 'alexander@example.com',
      workspaceName: 'CarbonLite Sample Workspace',
      expiresAt: '2026-09-01',
    });
    expect(await screen.findByRole('heading', { name: 'Invite Ready' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://app.example.com/set-password?token=secure-token')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /copy setup link/i }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'https://app.example.com/set-password?token=secure-token',
    );
    expect(screen.getByText('Setup link copied.')).toBeInTheDocument();
  });

  it('warns if backend does not return an invite credential', async () => {
    vi.mocked(createPilotReviewer).mockResolvedValue({
      name: 'Alexander',
      email: 'alexander@example.com',
      workspaceName: 'CarbonLite Sample Workspace',
      accountType: 'PILOT_REVIEWER',
      role: 'REVIEWER',
    });

    render(<PilotReviewersPage />);

    await userEvent.type(screen.getByLabelText(/^name/i), 'Alexander');
    await userEvent.type(screen.getByLabelText(/^email/i), 'alexander@example.com');
    await userEvent.click(screen.getByRole('button', { name: /create pilot reviewer/i }));

    expect(
      await screen.findByText(/did not return a setup link or temporary password/i),
    ).toBeInTheDocument();
  });

  it('shows a friendly validation error for markdown email values', async () => {
    render(<PilotReviewersPage />);

    await userEvent.type(screen.getByLabelText(/^name/i), 'Mint');
    fireEvent.change(screen.getByLabelText(/^email/i), {
      target: {
        value: '[mint_pp@hotmail.com](mailto:mint_pp@hotmail.com)',
      },
    });
    await userEvent.click(screen.getByRole('button', { name: /create pilot reviewer/i }));

    expect(
      await screen.findByText(
        'Please enter a valid email address, for example name@example.com.',
      ),
    ).toBeInTheDocument();
    expect(createPilotReviewer).not.toHaveBeenCalled();
  });
});
