import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PilotReviewersPage from './PilotReviewersPage';
import {
  createPilotReviewer,
  deactivatePilotReviewer,
  regeneratePilotReviewerInvite,
} from '../services/pilotReviewers';
import {
  getCustomerPreflight,
  provisionPaidPilotCustomer,
  suspendCustomerOrganization,
  type CustomerPreflightResponse,
} from '../services/customerSafeguards';

vi.mock('../services/pilotReviewers', async () => {
  const actual = await vi.importActual<typeof import('../services/pilotReviewers')>(
    '../services/pilotReviewers',
  );

  return {
    ...actual,
    createPilotReviewer: vi.fn(),
    deactivatePilotReviewer: vi.fn(),
    regeneratePilotReviewerInvite: vi.fn(),
  };
});

vi.mock('../services/customerSafeguards', () => ({
  getCustomerPreflight: vi.fn(),
  provisionPaidPilotCustomer: vi.fn(),
  suspendCustomerOrganization: vi.fn(),
}));

const pendingPilotPreflight: CustomerPreflightResponse = {
  lookup: {
    normalizedEmail: 'pilot@example.com',
    organizationName: null,
  },
  user: {
    exists: true,
    id: 'user-123',
    normalizedEmail: 'pilot@example.com',
    platformRole: 'USER',
    accountType: 'PILOT_REVIEWER',
    isActive: true,
    passwordSetupRequired: false,
    invitationStatus: 'completed',
    organizationId: 'org-123',
    membershipRole: 'VIEWER',
  },
  organization: {
    id: 'org-123',
    name: 'Acme Pilot',
    slug: 'acme-pilot',
    customerStatus: 'PENDING',
    provisionedAt: null,
    isActive: true,
    allowDemoFactorsForCalculations: false,
    counts: {
      activityData: 0,
      reports: 0,
      documents: 0,
      goldenSampleArtifacts: 0,
      memberships: 1,
    },
  },
};

const activeCustomerPreflight: CustomerPreflightResponse = {
  lookup: {
    normalizedEmail: 'customer@example.com',
    organizationName: null,
  },
  user: {
    exists: true,
    id: 'user-123',
    normalizedEmail: 'customer@example.com',
    platformRole: 'USER',
    accountType: 'CUSTOMER',
    isActive: true,
    passwordSetupRequired: false,
    invitationStatus: 'completed',
    organizationId: 'org-123',
    membershipRole: 'OWNER',
  },
  organization: {
    id: 'org-123',
    name: 'Acme Pilot',
    slug: 'acme-pilot',
    customerStatus: 'ACTIVE',
    provisionedAt: '2026-11-10T12:00:00.000Z',
    isActive: true,
    allowDemoFactorsForCalculations: false,
    counts: {
      activityData: 2,
      reports: 1,
      documents: 3,
      goldenSampleArtifacts: 0,
      memberships: 1,
    },
  },
};

describe('PilotReviewersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('creates a demo invitation with sample workspace defaults and shows setup link', async () => {
    vi.mocked(createPilotReviewer).mockResolvedValue({
      name: 'Alexander',
      email: 'alexander@example.com',
      workspaceName: 'CarbonLite Sample Workspace',
      accountType: 'PILOT_REVIEWER',
      role: 'REVIEWER',
      status: 'Active',
      expiresAt: '2026-09-01',
      inviteLink: 'https://app.example.com/set-password?token=secure-token',
      invitationPurpose: 'DEMO',
    });

    render(<PilotReviewersPage />);

    expect(screen.getByRole('heading', { name: 'Organization Invitations' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create invitation/i })).toBeDisabled();

    await userEvent.click(screen.getByRole('radio', { name: /^demo/i }));
    expect(screen.getByDisplayValue('CarbonLite Sample Workspace')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/^name/i), 'Alexander');
    await userEvent.type(screen.getByLabelText(/^email/i), 'alexander@example.com');
    await userEvent.type(screen.getByLabelText(/optional expiration date/i), '2026-09-01');
    await userEvent.click(screen.getByRole('button', { name: /create invitation/i }));

    expect(window.confirm).toHaveBeenCalledWith(
      'Create demo invitation for: alexander@example.com? This seeds synthetic sample data.',
    );
    expect(createPilotReviewer).toHaveBeenCalledWith({
      name: 'Alexander',
      email: 'alexander@example.com',
      workspaceName: 'CarbonLite Sample Workspace',
      invitationPurpose: 'DEMO',
      expiresAt: '2026-09-01',
    });
    expect(await screen.findByRole('heading', { name: 'Invite Ready' })).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(
      screen.getByText('Copy this link now. For security, it may not be shown again.'),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://app.example.com/set-password?token=secure-token')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /copy setup link/i }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'https://app.example.com/set-password?token=secure-token',
    );
    expect(screen.getByText('Setup link copied.')).toBeInTheDocument();
  });

  it('creates a clean customer invitation with an explicit CUSTOMER purpose', async () => {
    vi.mocked(createPilotReviewer).mockResolvedValue({
      email: 'customer@example.com',
      workspaceName: 'Acme Paid Pilot',
      invitationPurpose: 'CUSTOMER',
      inviteLink: 'https://app.example.com/set-password?token=customer-token',
    });

    render(<PilotReviewersPage />);

    await userEvent.click(screen.getByRole('radio', { name: /^customer/i }));
    expect(screen.getByText(/No sample data will be created/i)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/^name/i), 'Customer Admin');
    await userEvent.type(screen.getByLabelText(/^email/i), 'Customer@Example.com');
    await userEvent.type(screen.getByLabelText(/^workspace/i), 'Acme Paid Pilot');
    await userEvent.click(screen.getByRole('button', { name: /create invitation/i }));

    expect(window.confirm).toHaveBeenCalledWith(
      'Create customer invitation for: customer@example.com? No sample data will be created.',
    );
    expect(createPilotReviewer).toHaveBeenCalledWith({
      name: 'Customer Admin',
      email: 'customer@example.com',
      workspaceName: 'Acme Paid Pilot',
      invitationPurpose: 'CUSTOMER',
      expiresAt: '',
    });
  });

  it('does not allow submission without an explicit invitation purpose', () => {
    render(<PilotReviewersPage />);

    expect(screen.getByRole('button', { name: /create invitation/i })).toBeDisabled();
    expect(createPilotReviewer).not.toHaveBeenCalled();
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

    await userEvent.click(screen.getByRole('radio', { name: /^demo/i }));
    await userEvent.type(screen.getByLabelText(/^name/i), 'Alexander');
    await userEvent.type(screen.getByLabelText(/^email/i), 'alexander@example.com');
    await userEvent.click(screen.getByRole('button', { name: /create invitation/i }));

    expect(
      await screen.findByText(/did not return a setup link or temporary password/i),
    ).toBeInTheDocument();
  });

  it('does not create a pilot reviewer when confirmation is cancelled', async () => {
    vi.mocked(window.confirm).mockReturnValue(false);

    render(<PilotReviewersPage />);

    await userEvent.click(screen.getByRole('radio', { name: /^demo/i }));
    await userEvent.type(screen.getByLabelText(/^name/i), 'Alexander');
    await userEvent.type(screen.getByLabelText(/^email/i), 'Alexander@Example.com');
    await userEvent.click(screen.getByRole('button', { name: /create invitation/i }));

    expect(window.confirm).toHaveBeenCalledWith(
      'Create demo invitation for: alexander@example.com? This seeds synthetic sample data.',
    );
    expect(createPilotReviewer).not.toHaveBeenCalled();
  });

  it('shows a friendly validation error for markdown email values', async () => {
    render(<PilotReviewersPage />);

    await userEvent.click(screen.getByRole('radio', { name: /^customer/i }));
    await userEvent.type(screen.getByLabelText(/^name/i), 'Mint');
    await userEvent.type(screen.getByLabelText(/^workspace/i), 'Mint Paid Pilot');
    fireEvent.change(screen.getByLabelText(/^email/i), {
      target: {
        value: '[mint_pp@hotmail.com](mailto:mint_pp@hotmail.com)',
      },
    });
    await userEvent.click(screen.getByRole('button', { name: /create invitation/i }));

    expect(
      await screen.findByText(
        'Please enter a valid email address, for example name@example.com.',
      ),
    ).toBeInTheDocument();
    expect(createPilotReviewer).not.toHaveBeenCalled();
  });

  it('shows a friendly validation error for common typo email domains', async () => {
    render(<PilotReviewersPage />);

    await userEvent.click(screen.getByRole('radio', { name: /^customer/i }));
    await userEvent.type(screen.getByLabelText(/^name/i), 'Alexander');
    await userEvent.type(screen.getByLabelText(/^workspace/i), 'Alexander Paid Pilot');
    await userEvent.type(screen.getByLabelText(/^email/i), 'alexander@gamil.com');
    await userEvent.click(screen.getByRole('button', { name: /create invitation/i }));

    expect(
      await screen.findByText(
        'Please enter a valid email address, for example name@example.com.',
      ),
    ).toBeInTheDocument();
    expect(window.confirm).not.toHaveBeenCalled();
    expect(createPilotReviewer).not.toHaveBeenCalled();
  });

  it('deactivates a pilot reviewer after confirmation and shows status', async () => {
    vi.mocked(deactivatePilotReviewer).mockResolvedValue({
      success: true,
      message: 'This pilot reviewer account has been deactivated.',
      pilotReviewer: {
        email: 'alexander@example.com',
        status: 'Deactivated',
      },
    });

    render(<PilotReviewersPage />);

    await userEvent.type(
      screen.getByLabelText(/pilot reviewer email/i),
      'Alexander@Example.com',
    );
    await userEvent.click(screen.getByRole('button', { name: /deactivate pilot reviewer/i }));

    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining('alexander@example.com'),
    );
    expect(deactivatePilotReviewer).toHaveBeenCalledWith('alexander@example.com');
    expect(
      await screen.findByText('This pilot reviewer account has been deactivated.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Status: Deactivated')).toBeInTheDocument();
  });

  it('regenerates an invite link for an active pilot reviewer', async () => {
    vi.mocked(regeneratePilotReviewerInvite).mockResolvedValue({
      success: true,
      message: 'Invite link regenerated.',
      inviteLink: 'https://www.carbonliteapp.ca/set-password?token=new-token',
      pilotReviewer: {
        email: 'alexander@example.com',
        workspaceName: 'CarbonLite Sample Workspace',
        accountType: 'PILOT_REVIEWER',
        role: 'REVIEWER',
        status: 'Active',
      },
    });

    render(<PilotReviewersPage />);

    await userEvent.type(
      screen.getByLabelText(/invite regeneration email/i),
      'Alexander@Example.com',
    );
    await userEvent.click(screen.getByRole('button', { name: /regenerate invite link/i }));

    expect(window.confirm).toHaveBeenCalledWith(
      'Regenerate invite link for: alexander@example.com',
    );
    expect(regeneratePilotReviewerInvite).toHaveBeenCalledWith('alexander@example.com');
    expect(
      await screen.findByRole('heading', { name: 'Invite Link Regenerated' }),
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('https://www.carbonliteapp.ca/set-password?token=new-token'),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /copy regenerated setup link/i }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'https://www.carbonliteapp.ca/set-password?token=new-token',
    );
    expect(screen.getByText('Regenerated setup link copied.')).toBeInTheDocument();
  });

  it('runs a read-only preflight, normalizes email, and renders only safe summary fields', async () => {
    vi.mocked(getCustomerPreflight).mockResolvedValue(activeCustomerPreflight);

    render(<PilotReviewersPage />);

    await userEvent.type(
      screen.getByLabelText(/preflight email/i),
      'Customer@Example.com',
    );
    await userEvent.click(screen.getByRole('button', { name: /run preflight/i }));

    expect(getCustomerPreflight).toHaveBeenCalledTimes(1);
    expect(getCustomerPreflight).toHaveBeenCalledWith({
      email: 'customer@example.com',
      organizationName: '',
    });
    expect((await screen.findAllByText('user-123')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Acme Pilot').length).toBeGreaterThan(0);
    expect(screen.getByText('No organization quota configured.')).toBeInTheDocument();
    expect(screen.getByText('No organization AI authorization configured.')).toBeInTheDocument();
    expect(screen.queryByText(/token|hash|credential|document contents/i)).not.toBeInTheDocument();
    expect(suspendCustomerOrganization).not.toHaveBeenCalled();
  });

  it('keeps provisioning hidden until preflight succeeds', () => {
    render(<PilotReviewersPage />);

    expect(screen.queryByRole('region', { name: 'Provision paid-pilot customer' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Provision paid-pilot customer' })).not.toBeInTheDocument();
  });

  it('requires the exact slug, submits trusted identifiers, and refreshes preflight after provisioning', async () => {
    vi.mocked(getCustomerPreflight)
      .mockResolvedValueOnce(pendingPilotPreflight)
      .mockResolvedValueOnce(activeCustomerPreflight);
    vi.mocked(provisionPaidPilotCustomer).mockResolvedValue({
      organizationId: 'org-123',
      status: 'PROVISIONED',
      primaryAdminUserId: 'user-123',
      provisionedAt: '2026-11-11T12:00:00.000Z',
    });

    render(<PilotReviewersPage />);
    await userEvent.type(screen.getByLabelText(/preflight email/i), 'pilot@example.com');
    await userEvent.click(screen.getByRole('button', { name: /run preflight/i }));

    const provisionButton = await screen.findByRole('button', {
      name: 'Provision paid-pilot customer',
    });
    const slugInput = screen.getByLabelText(/confirm provisioning/i);
    expect(provisionButton).toBeDisabled();
    expect(screen.queryByRole('textbox', { name: /organization id/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /user id/i })).not.toBeInTheDocument();

    await userEvent.type(slugInput, 'wrong-slug');
    expect(provisionButton).toBeDisabled();
    await userEvent.clear(slugInput);
    await userEvent.type(slugInput, 'acme-pilot');
    expect(provisionButton).toBeEnabled();
    await userEvent.click(provisionButton);

    expect(window.confirm).toHaveBeenCalledWith(
      'Provision Acme Pilot as an ACTIVE paid-pilot CUSTOMER? The selected user will become the organization OWNER.',
    );
    expect(provisionPaidPilotCustomer).toHaveBeenCalledTimes(1);
    expect(provisionPaidPilotCustomer).toHaveBeenCalledWith({
      organizationId: 'org-123',
      organizationSlug: 'acme-pilot',
      primaryAdminUserId: 'user-123',
    });
    expect(await screen.findByText('Customer organization provisioned.')).toBeInTheDocument();
    expect(getCustomerPreflight).toHaveBeenCalledTimes(2);
    expect(getCustomerPreflight).toHaveBeenLastCalledWith({
      email: 'pilot@example.com',
      organizationName: '',
    });
    expect(screen.getAllByText('ACTIVE').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CUSTOMER').length).toBeGreaterThan(0);
    expect(screen.getAllByText('OWNER').length).toBeGreaterThan(0);
    const suspendCard = screen.getByRole('region', { name: 'Suspend customer access' });
    const suspendButton = within(suspendCard).getByRole('button', { name: /suspend customer/i });
    expect(suspendButton).toBeDisabled();
    await userEvent.type(
      within(suspendCard).getByLabelText(/type the organization slug/i),
      'acme-pilot',
    );
    expect(suspendButton).toBeEnabled();
  });

  it.each([
    ['pending setup', { user: { ...pendingPilotPreflight.user, passwordSetupRequired: true } }, 'Password setup must be complete.'],
    ['Golden Sample data', { organization: { ...pendingPilotPreflight.organization!, counts: { ...pendingPilotPreflight.organization!.counts, goldenSampleArtifacts: 1 } } }, 'Golden Sample artifacts must be removed before provisioning.'],
    ['ACTIVE status', { organization: { ...pendingPilotPreflight.organization!, customerStatus: 'ACTIVE' } }, 'Organization status must be PENDING or PILOT.'],
    ['SUSPENDED status', { organization: { ...pendingPilotPreflight.organization!, customerStatus: 'SUSPENDED' } }, 'Organization status must be PENDING or PILOT.'],
    ['DEMO status', { organization: { ...pendingPilotPreflight.organization!, customerStatus: 'DEMO' } }, 'Organization status must be PENDING or PILOT.'],
    ['CUSTOMER account', { user: { ...pendingPilotPreflight.user, accountType: 'CUSTOMER' } }, 'The user account type must be PILOT_REVIEWER.'],
    ['missing user', { user: { exists: false, normalizedEmail: 'pilot@example.com' } }, 'A matching user is required.'],
  ])('disables provisioning for %s', async (_caseName, overrides, reason) => {
    vi.mocked(getCustomerPreflight).mockResolvedValue({
      ...pendingPilotPreflight,
      ...overrides,
    });

    render(<PilotReviewersPage />);
    await userEvent.type(screen.getByLabelText(/preflight email/i), 'pilot@example.com');
    await userEvent.click(screen.getByRole('button', { name: /run preflight/i }));

    expect(await screen.findByText(reason)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Provision paid-pilot customer' })).toBeDisabled();
    expect(provisionPaidPilotCustomer).not.toHaveBeenCalled();
  });

  it('handles an ALREADY_PROVISIONED response and refreshes current state', async () => {
    vi.mocked(getCustomerPreflight)
      .mockResolvedValueOnce(pendingPilotPreflight)
      .mockResolvedValueOnce(activeCustomerPreflight);
    vi.mocked(provisionPaidPilotCustomer).mockResolvedValue({
      organizationId: 'org-123',
      status: 'ALREADY_PROVISIONED',
      primaryAdminUserId: 'user-123',
      provisionedAt: '2026-11-11T12:00:00.000Z',
      alreadyProvisioned: true,
    });

    render(<PilotReviewersPage />);
    await userEvent.type(screen.getByLabelText(/preflight email/i), 'pilot@example.com');
    await userEvent.click(screen.getByRole('button', { name: /run preflight/i }));
    await userEvent.type(
      await screen.findByLabelText(/confirm provisioning/i),
      'acme-pilot',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Provision paid-pilot customer' }));

    expect(await screen.findByText('This customer organization is already provisioned.')).toBeInTheDocument();
    expect(provisionPaidPilotCustomer).toHaveBeenCalledTimes(1);
    expect(getCustomerPreflight).toHaveBeenCalledTimes(2);
  });

  it('supports organization-name-only preflight and requires at least one lookup value', async () => {
    vi.mocked(getCustomerPreflight)
      .mockRejectedValueOnce(new Error('Enter an email or organization name to run preflight.'))
      .mockResolvedValueOnce({
        lookup: { normalizedEmail: null, organizationName: 'Missing Org' },
        user: { exists: false, normalizedEmail: null },
        organization: null,
      });

    render(<PilotReviewersPage />);

    await userEvent.click(screen.getByRole('button', { name: /run preflight/i }));
    expect(await screen.findByText('Enter an email or organization name to run preflight.')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/organization name/i), '  Missing Org  ');
    await userEvent.click(screen.getByRole('button', { name: /run preflight/i }));

    expect(getCustomerPreflight).toHaveBeenLastCalledWith({
      email: '',
      organizationName: 'Missing Org',
    });
    expect(await screen.findByText('No matching user found.')).toBeInTheDocument();
    expect(screen.getByText('No matching organization found.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /suspend customer/i })).not.toBeInTheDocument();
  });

  it('requires the exact returned slug and uses the preflight organization ID to suspend', async () => {
    const suspendedPreflight: CustomerPreflightResponse = {
      ...activeCustomerPreflight,
      organization: {
        ...activeCustomerPreflight.organization!,
        customerStatus: 'SUSPENDED',
      },
    };
    vi.mocked(getCustomerPreflight)
      .mockResolvedValueOnce(activeCustomerPreflight)
      .mockResolvedValueOnce(suspendedPreflight);
    vi.mocked(suspendCustomerOrganization).mockResolvedValue({
      organizationId: 'org-123',
      status: 'SUSPENDED',
      suspended: true,
    });

    render(<PilotReviewersPage />);
    await userEvent.type(screen.getByLabelText(/preflight email/i), 'customer@example.com');
    await userEvent.click(screen.getByRole('button', { name: /run preflight/i }));

    const suspendButton = await screen.findByRole('button', { name: /suspend customer/i });
    const suspendCard = screen.getByRole('region', { name: 'Suspend customer access' });
    const suspensionSlugInput = within(suspendCard).getByLabelText(/type the organization slug/i);
    expect(suspendButton).toBeDisabled();
    await userEvent.type(suspensionSlugInput, 'wrong-slug');
    expect(suspendButton).toBeDisabled();
    await userEvent.clear(suspensionSlugInput);
    await userEvent.type(suspensionSlugInput, 'acme-pilot');
    expect(suspendButton).toBeEnabled();
    await userEvent.click(suspendButton);

    expect(window.confirm).toHaveBeenCalledWith(
      'Suspend access for Acme Pilot? Customer data will be retained, but login and existing sessions will be blocked.',
    );
    expect(suspendCustomerOrganization).toHaveBeenCalledWith({
      organizationId: 'org-123',
      organizationSlug: 'acme-pilot',
    });
    expect(await screen.findByText('Customer access suspended.')).toBeInTheDocument();
    expect(getCustomerPreflight).toHaveBeenCalledTimes(2);
    expect(screen.getAllByText('SUSPENDED').length).toBeGreaterThan(0);
  });

  it('disables suspension for a non-ACTIVE organization', async () => {
    vi.mocked(getCustomerPreflight).mockResolvedValue({
      ...activeCustomerPreflight,
      organization: {
        ...activeCustomerPreflight.organization!,
        customerStatus: 'PENDING',
      },
    });

    render(<PilotReviewersPage />);
    await userEvent.type(screen.getByLabelText(/preflight email/i), 'customer@example.com');
    await userEvent.click(screen.getByRole('button', { name: /run preflight/i }));
    const suspendCard = await screen.findByRole('region', { name: 'Suspend customer access' });
    await userEvent.type(within(suspendCard).getByLabelText(/type the organization slug/i), 'acme-pilot');

    expect(screen.getByRole('button', { name: /suspend customer/i })).toBeDisabled();
    expect(screen.getByText(/only when customer status is ACTIVE/i)).toBeInTheDocument();
  });

  it('handles an ALREADY_SUSPENDED race without a second mutation', async () => {
    vi.mocked(getCustomerPreflight)
      .mockResolvedValueOnce(activeCustomerPreflight)
      .mockResolvedValueOnce({
        ...activeCustomerPreflight,
        organization: {
          ...activeCustomerPreflight.organization!,
          customerStatus: 'SUSPENDED',
        },
      });
    vi.mocked(suspendCustomerOrganization).mockResolvedValue({
      organizationId: 'org-123',
      status: 'ALREADY_SUSPENDED',
      suspended: true,
    });

    render(<PilotReviewersPage />);
    await userEvent.type(screen.getByLabelText(/preflight email/i), 'customer@example.com');
    await userEvent.click(screen.getByRole('button', { name: /run preflight/i }));
    const suspendCard = await screen.findByRole('region', { name: 'Suspend customer access' });
    await userEvent.type(within(suspendCard).getByLabelText(/type the organization slug/i), 'acme-pilot');
    await userEvent.click(screen.getByRole('button', { name: /suspend customer/i }));

    expect(await screen.findByText('This customer organization is already suspended.')).toBeInTheDocument();
    expect(suspendCustomerOrganization).toHaveBeenCalledTimes(1);
    expect(getCustomerPreflight).toHaveBeenCalledTimes(2);
  });
});
