import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PilotReviewersPage from './PilotReviewersPage';
import {
  createPilotReviewer,
  deactivatePilotReviewer,
  regeneratePilotReviewerInvite,
} from '../services/pilotReviewers';
import {
  eraseOrganization,
  getCustomerPreflight,
  provisionPaidPilotCustomer,
  runOrganizationErasureDryRun,
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
  eraseOrganization: vi.fn(),
  getCustomerPreflight: vi.fn(),
  provisionPaidPilotCustomer: vi.fn(),
  runOrganizationErasureDryRun: vi.fn(),
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

const suspendedCustomerPreflight: CustomerPreflightResponse = {
  ...activeCustomerPreflight,
  organization: {
    ...activeCustomerPreflight.organization!,
    customerStatus: 'SUSPENDED',
  },
};

const erasureInventory = {
  organizationId: 'org-123',
  organizationSlug: 'acme-pilot',
  users: 1,
  memberships: 1,
  facilities: 2,
  assets: 3,
  documents: 4,
  physicalFiles: 5,
  documentExtractions: 6,
  spreadsheetReviewRows: 7,
  activityRecords: 8,
  calculationSnapshots: 9,
  importBatches: 10,
  metricResults: 11,
  reports: 12,
  reportArtifacts: 13,
  aiJobs: 14,
  customConversionFactors: 15,
  auditLogs: 16,
  feedback: 17,
  activityEvents: 18,
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
    expect(screen.queryByRole('region', { name: 'Organization erasure dry-run' })).not.toBeInTheDocument();
  });

  it('runs erasure dry-run only for the exact preflight organization and renders the inventory', async () => {
    const suspendedPreflight: CustomerPreflightResponse = {
      ...activeCustomerPreflight,
      organization: {
        ...activeCustomerPreflight.organization!,
        customerStatus: 'SUSPENDED',
      },
    };
    vi.mocked(getCustomerPreflight).mockResolvedValue(suspendedPreflight);
    vi.mocked(runOrganizationErasureDryRun).mockResolvedValue({
      status: 'DRY_RUN',
      dataDeleted: false,
      inventory: {
        organizationId: 'org-123',
        organizationSlug: 'acme-pilot',
        users: 1,
        memberships: 1,
        facilities: 2,
        assets: 3,
        documents: 4,
        physicalFiles: 5,
        documentExtractions: 6,
        spreadsheetReviewRows: 7,
        activityRecords: 8,
        calculationSnapshots: 9,
        importBatches: 10,
        metricResults: 11,
        reports: 12,
        reportArtifacts: 13,
        aiJobs: 14,
        customConversionFactors: 15,
        auditLogs: 16,
        feedback: 17,
        activityEvents: 18,
      },
    });

    render(<PilotReviewersPage />);
    await userEvent.type(screen.getByLabelText(/preflight email/i), 'customer@example.com');
    await userEvent.click(screen.getByRole('button', { name: /run preflight/i }));

    const dryRunCard = await screen.findByRole('region', {
      name: 'Organization erasure dry-run',
    });
    expect(within(dryRunCard).getByText('Acme Pilot')).toBeInTheDocument();
    expect(within(dryRunCard).getByText('org-123')).toBeInTheDocument();
    expect(within(dryRunCard).getAllByText('acme-pilot').length).toBeGreaterThan(0);
    expect(within(dryRunCard).getByText('SUSPENDED')).toBeInTheDocument();
    expect(within(dryRunCard).getByText('customer@example.com')).toBeInTheDocument();

    const confirmation = within(dryRunCard).getByLabelText(
      'Type the organization slug to confirm dry-run',
    );
    const button = within(dryRunCard).getByRole('button', {
      name: 'Run erasure dry-run',
    });
    expect(button).toBeDisabled();
    await userEvent.type(confirmation, 'wrong-slug');
    expect(button).toBeDisabled();
    await userEvent.clear(confirmation);
    await userEvent.type(confirmation, 'acme-pilot');
    expect(button).toBeEnabled();
    await userEvent.click(button);

    expect(runOrganizationErasureDryRun).toHaveBeenCalledTimes(1);
    expect(runOrganizationErasureDryRun).toHaveBeenCalledWith('org-123');
    expect(getCustomerPreflight).toHaveBeenCalledTimes(1);
    expect(provisionPaidPilotCustomer).not.toHaveBeenCalled();
    expect(suspendCustomerOrganization).not.toHaveBeenCalled();
    expect(await within(dryRunCard).findByText(
      'Erasure dry-run complete. No data was deleted.',
    )).toBeInTheDocument();
    expect(within(dryRunCard).getByText('DRY_RUN')).toBeInTheDocument();
    expect(within(dryRunCard).getByText('false')).toBeInTheDocument();
    expect(within(dryRunCard).getAllByText('Physical files').length).toBeGreaterThan(0);
    expect(within(dryRunCard).getAllByText('Calculation snapshots').length).toBeGreaterThan(0);
    expect(within(dryRunCard).getByText('Global and shared factor records are excluded from organization erasure.')).toBeInTheDocument();
    expect(within(dryRunCard).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(within(dryRunCard).queryByRole('button', { name: 'Erase' })).not.toBeInTheDocument();
    expect(within(dryRunCard).queryByRole('button', { name: 'Execute erasure' })).not.toBeInTheDocument();
  });

  it('keeps erasure dry-run disabled unless the preflight organization is suspended', async () => {
    vi.mocked(getCustomerPreflight).mockResolvedValue(activeCustomerPreflight);

    render(<PilotReviewersPage />);
    await userEvent.type(screen.getByLabelText(/preflight email/i), 'customer@example.com');
    await userEvent.click(screen.getByRole('button', { name: /run preflight/i }));

    const dryRunCard = await screen.findByRole('region', {
      name: 'Organization erasure dry-run',
    });
    expect(within(dryRunCard).getByText(
      'Erasure dry-run is available only when customer status is SUSPENDED.',
    )).toBeInTheDocument();
    expect(within(dryRunCard).getByLabelText(
      'Type the organization slug to confirm dry-run',
    )).toBeDisabled();
    expect(within(dryRunCard).getByRole('button', {
      name: 'Run erasure dry-run',
    })).toBeDisabled();
    expect(runOrganizationErasureDryRun).not.toHaveBeenCalled();
  });

  it.each(['ACTIVE', 'PENDING'])('does not expose actual erasure for %s organizations', async (customerStatus) => {
    vi.mocked(getCustomerPreflight).mockResolvedValue({
      ...activeCustomerPreflight,
      organization: {
        ...activeCustomerPreflight.organization!,
        customerStatus,
      },
    });

    render(<PilotReviewersPage />);
    await userEvent.type(screen.getByLabelText(/preflight email/i), 'customer@example.com');
    await userEvent.click(screen.getByRole('button', { name: /run preflight/i }));

    expect(await screen.findByRole('region', { name: 'Organization erasure dry-run' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Erase organization' })).not.toBeInTheDocument();
    expect(eraseOrganization).not.toHaveBeenCalled();
  });

  it('requires a same-organization successful dry-run and both exact confirmations before erasure', async () => {
    vi.mocked(getCustomerPreflight).mockResolvedValue(suspendedCustomerPreflight);
    vi.mocked(runOrganizationErasureDryRun).mockResolvedValue({
      status: 'DRY_RUN',
      dataDeleted: false,
      inventory: erasureInventory,
    });

    render(<PilotReviewersPage />);
    await userEvent.type(screen.getByLabelText(/preflight email/i), 'customer@example.com');
    await userEvent.click(screen.getByRole('button', { name: /run preflight/i }));

    expect(screen.queryByRole('region', { name: 'Erase organization' })).not.toBeInTheDocument();
    const dryRunCard = await screen.findByRole('region', { name: 'Organization erasure dry-run' });
    await userEvent.type(
      within(dryRunCard).getByLabelText('Type the organization slug to confirm dry-run'),
      'acme-pilot',
    );
    await userEvent.click(within(dryRunCard).getByRole('button', { name: 'Run erasure dry-run' }));

    const eraseCard = await screen.findByRole('region', { name: 'Erase organization' });
    expect(within(eraseCard).getByText(/cannot be undone/i)).toBeInTheDocument();
    expect(within(eraseCard).getByText('org-123')).toBeInTheDocument();
    expect(within(eraseCard).queryByRole('textbox', { name: /organization id/i })).not.toBeInTheDocument();
    const eraseButton = within(eraseCard).getByRole('button', { name: 'Permanently erase organization' });
    const slugInput = within(eraseCard).getByLabelText('Type the exact organization slug');
    const phraseInput = within(eraseCard).getByLabelText('Type ERASE ORGANIZATION to confirm');

    expect(eraseButton).toBeDisabled();
    await userEvent.type(slugInput, 'acme-pilot');
    expect(eraseButton).toBeDisabled();
    await userEvent.type(phraseInput, 'ERASE ORGANIZATION');
    expect(eraseButton).toBeEnabled();
    expect(eraseOrganization).not.toHaveBeenCalled();
  });

  it('invalidates dry-run eligibility when the lookup changes', async () => {
    vi.mocked(getCustomerPreflight).mockResolvedValue(suspendedCustomerPreflight);
    vi.mocked(runOrganizationErasureDryRun).mockResolvedValue({
      status: 'DRY_RUN',
      dataDeleted: false,
      inventory: erasureInventory,
    });

    render(<PilotReviewersPage />);
    const preflightEmail = screen.getByLabelText(/preflight email/i);
    await userEvent.type(preflightEmail, 'customer@example.com');
    await userEvent.click(screen.getByRole('button', { name: /run preflight/i }));
    const dryRunCard = await screen.findByRole('region', { name: 'Organization erasure dry-run' });
    await userEvent.type(
      within(dryRunCard).getByLabelText('Type the organization slug to confirm dry-run'),
      'acme-pilot',
    );
    await userEvent.click(within(dryRunCard).getByRole('button', { name: 'Run erasure dry-run' }));
    expect(await screen.findByRole('region', { name: 'Erase organization' })).toBeInTheDocument();

    await userEvent.type(preflightEmail, '.changed');

    expect(screen.queryByRole('region', { name: 'Erase organization' })).not.toBeInTheDocument();
    expect(eraseOrganization).not.toHaveBeenCalled();
  });

  it('rejects a dry-run result whose organization ID differs from preflight', async () => {
    vi.mocked(getCustomerPreflight).mockResolvedValue(suspendedCustomerPreflight);
    vi.mocked(runOrganizationErasureDryRun).mockResolvedValue({
      status: 'DRY_RUN',
      dataDeleted: false,
      inventory: { ...erasureInventory, organizationId: 'different-org' },
    });

    render(<PilotReviewersPage />);
    await userEvent.type(screen.getByLabelText(/preflight email/i), 'customer@example.com');
    await userEvent.click(screen.getByRole('button', { name: /run preflight/i }));
    const dryRunCard = await screen.findByRole('region', { name: 'Organization erasure dry-run' });
    await userEvent.type(within(dryRunCard).getByLabelText(/confirm dry-run/i), 'acme-pilot');
    await userEvent.click(within(dryRunCard).getByRole('button', { name: 'Run erasure dry-run' }));

    expect(await within(dryRunCard).findByText(/dry-run complete/i)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Erase organization' })).not.toBeInTheDocument();
    expect(eraseOrganization).not.toHaveBeenCalled();
  });

  it('submits the trusted erasure target exactly once, then performs read-only verification', async () => {
    vi.mocked(getCustomerPreflight)
      .mockResolvedValueOnce(suspendedCustomerPreflight)
      .mockResolvedValueOnce({
        lookup: { normalizedEmail: 'customer@example.com', organizationName: null },
        user: { exists: false, normalizedEmail: 'customer@example.com' },
        organization: null,
      });
    vi.mocked(runOrganizationErasureDryRun).mockResolvedValue({
      status: 'DRY_RUN',
      dataDeleted: false,
      inventory: erasureInventory,
    });
    vi.mocked(eraseOrganization).mockResolvedValue({
      status: 'ERASED',
      organizationIdHash: 'hashed-org-id',
      inventory: erasureInventory,
      deletedPhysicalFiles: 5,
      alreadyMissingPhysicalFiles: 0,
    });

    render(<PilotReviewersPage />);
    await userEvent.type(screen.getByLabelText(/preflight email/i), 'customer@example.com');
    await userEvent.click(screen.getByRole('button', { name: /run preflight/i }));
    const dryRunCard = await screen.findByRole('region', { name: 'Organization erasure dry-run' });
    await userEvent.type(
      within(dryRunCard).getByLabelText('Type the organization slug to confirm dry-run'),
      'acme-pilot',
    );
    await userEvent.click(within(dryRunCard).getByRole('button', { name: 'Run erasure dry-run' }));
    const eraseCard = await screen.findByRole('region', { name: 'Erase organization' });
    await userEvent.type(within(eraseCard).getByLabelText('Type the exact organization slug'), 'acme-pilot');
    await userEvent.type(within(eraseCard).getByLabelText('Type ERASE ORGANIZATION to confirm'), 'ERASE ORGANIZATION');
    await userEvent.click(within(eraseCard).getByRole('button', { name: 'Permanently erase organization' }));

    expect(window.confirm).toHaveBeenCalledWith(
      'Permanently erase Acme Pilot and its owned data? This cannot be undone.',
    );
    expect(eraseOrganization).toHaveBeenCalledTimes(1);
    expect(eraseOrganization).toHaveBeenCalledWith({
      organizationId: 'org-123',
      organizationSlug: 'acme-pilot',
    });
    expect(getCustomerPreflight).toHaveBeenCalledTimes(2);
    const result = await screen.findByRole('region', { name: 'Organization erasure result' });
    expect(within(result).getByText('Organization erased successfully.')).toBeInTheDocument();
    expect(within(result).getByText(/organization, user, and membership are no longer present/i)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Erase organization' })).not.toBeInTheDocument();
  });

  it('does not call erasure when final browser confirmation is cancelled', async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    vi.mocked(getCustomerPreflight).mockResolvedValue(suspendedCustomerPreflight);
    vi.mocked(runOrganizationErasureDryRun).mockResolvedValue({
      status: 'DRY_RUN',
      dataDeleted: false,
      inventory: erasureInventory,
    });

    render(<PilotReviewersPage />);
    await userEvent.type(screen.getByLabelText(/preflight email/i), 'customer@example.com');
    await userEvent.click(screen.getByRole('button', { name: /run preflight/i }));
    const dryRunCard = await screen.findByRole('region', { name: 'Organization erasure dry-run' });
    await userEvent.type(within(dryRunCard).getByLabelText(/confirm dry-run/i), 'acme-pilot');
    await userEvent.click(within(dryRunCard).getByRole('button', { name: 'Run erasure dry-run' }));
    const eraseCard = await screen.findByRole('region', { name: 'Erase organization' });
    await userEvent.type(within(eraseCard).getByLabelText('Type the exact organization slug'), 'acme-pilot');
    await userEvent.type(within(eraseCard).getByLabelText('Type ERASE ORGANIZATION to confirm'), 'ERASE ORGANIZATION');
    await userEvent.click(within(eraseCard).getByRole('button', { name: 'Permanently erase organization' }));

    expect(eraseOrganization).not.toHaveBeenCalled();
  });

  it('surfaces erasure failure without retrying or clearing trusted target state', async () => {
    vi.mocked(getCustomerPreflight).mockResolvedValue(suspendedCustomerPreflight);
    vi.mocked(runOrganizationErasureDryRun).mockResolvedValue({
      status: 'DRY_RUN',
      dataDeleted: false,
      inventory: erasureInventory,
    });
    vi.mocked(eraseOrganization).mockRejectedValue(new Error('Safe backend erasure error.'));

    render(<PilotReviewersPage />);
    await userEvent.type(screen.getByLabelText(/preflight email/i), 'customer@example.com');
    await userEvent.click(screen.getByRole('button', { name: /run preflight/i }));
    const dryRunCard = await screen.findByRole('region', { name: 'Organization erasure dry-run' });
    await userEvent.type(within(dryRunCard).getByLabelText(/confirm dry-run/i), 'acme-pilot');
    await userEvent.click(within(dryRunCard).getByRole('button', { name: 'Run erasure dry-run' }));
    const eraseCard = await screen.findByRole('region', { name: 'Erase organization' });
    await userEvent.type(within(eraseCard).getByLabelText('Type the exact organization slug'), 'acme-pilot');
    await userEvent.type(within(eraseCard).getByLabelText('Type ERASE ORGANIZATION to confirm'), 'ERASE ORGANIZATION');
    const eraseButton = within(eraseCard).getByRole('button', { name: 'Permanently erase organization' });
    await userEvent.click(eraseButton);

    expect(await within(eraseCard).findByText('Safe backend erasure error.')).toBeInTheDocument();
    expect(eraseOrganization).toHaveBeenCalledTimes(1);
    expect(eraseButton).toBeEnabled();
    expect(within(eraseCard).getByDisplayValue('acme-pilot')).toBeInTheDocument();
    expect(within(eraseCard).getByDisplayValue('ERASE ORGANIZATION')).toBeInTheDocument();
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
