import { FALLBACK_API_BASE_URL } from '../config/api';
import { createPilotReviewer, normalizePilotReviewerEmail } from './pilotReviewers';

describe('pilot reviewer admin service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('creates a read-only pilot reviewer through the admin endpoint', async () => {
    localStorage.setItem('accessToken', 'admin-token');
    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        email: 'admin@example.com',
        role: 'ADMIN',
        organizationId: 'sample-org',
      }),
    );
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        email: 'alexander@example.com',
        setupUrl: 'https://app.example.com/set-password?token=secure-token',
      }), { status: 200 }),
    );

    await createPilotReviewer({
      name: 'Alexander',
      email: 'Alexander@Example.com',
      workspaceName: 'CarbonLite Sample Workspace',
      expiresAt: '2026-09-01',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${FALLBACK_API_BASE_URL}/admin/pilot-reviewers`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer admin-token',
          'Content-Type': 'application/json',
        }),
      }),
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toMatchObject({
      name: 'Alexander',
      email: 'alexander@example.com',
      workspace: 'CarbonLite Sample Workspace',
      workspaceName: 'CarbonLite Sample Workspace',
      expires: '2026-09-01',
      expiresAt: '2026-09-01',
      role: 'REVIEWER',
      accountType: 'PILOT_REVIEWER',
      invite: {
        delivery: 'SETUP_LINK',
        sendEmail: true,
        tokenExpiresHours: 72,
        passwordResetRequired: true,
      },
      accessScope: 'SAMPLE_WORKSPACE_ONLY',
      permissions: {
        canViewSampleData: true,
        canUpload: false,
        canImport: false,
        canEditRecords: false,
        canDeleteRecords: false,
        canResetDemoData: false,
        canEditFactors: false,
        canManageUsers: false,
        canAccessAdminDashboard: false,
      },
    });
  });

  it('blocks non-admin users before calling the API', async () => {
    localStorage.setItem('accessToken', 'viewer-token');
    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        email: 'reviewer@example.com',
        role: 'VIEWER',
        organizationId: 'sample-org',
      }),
    );
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    expect(() =>
      createPilotReviewer({
        name: 'Alexander',
        email: 'alexander@example.com',
        workspaceName: 'CarbonLite Sample Workspace',
      }),
    ).toThrow('You do not have permission to perform this action.');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects markdown mailto email values before calling the API', () => {
    localStorage.setItem('accessToken', 'admin-token');
    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        email: 'admin@example.com',
        role: 'ADMIN',
        organizationId: 'sample-org',
      }),
    );
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    expect(() =>
      createPilotReviewer({
        name: 'Alexander',
        email: '[mint_pp@hotmail.com](mailto:mint_pp@hotmail.com)',
        workspaceName: 'CarbonLite Sample Workspace',
      }),
    ).toThrow('Please enter a valid email address, for example name@example.com.');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('normalizes only plain email addresses', () => {
    expect(normalizePilotReviewerEmail(' Alexander@Example.com ')).toBe('alexander@example.com');
    expect(() => normalizePilotReviewerEmail('mailto:alexander@example.com')).toThrow(
      'Please enter a valid email address, for example name@example.com.',
    );
    expect(() => normalizePilotReviewerEmail('(alexander@example.com)')).toThrow(
      'Please enter a valid email address, for example name@example.com.',
    );
    expect(() => normalizePilotReviewerEmail('"alexander@example.com"')).toThrow(
      'Please enter a valid email address, for example name@example.com.',
    );
  });
});
