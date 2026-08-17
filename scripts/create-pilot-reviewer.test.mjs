import { describe, expect, it } from 'vitest';
import {
  assertSafeEnvironment,
  buildExpiresAt,
  buildInviteLinkFromResponse,
  buildPayload,
  getEndpoint,
  getFrontendUrl,
  requireEmail,
} from './create-pilot-reviewer.mjs';

describe('create-pilot-reviewer script helpers', () => {
  it('builds a read-only pilot reviewer payload', () => {
    const payload = buildPayload({
      name: 'Alexander',
      email: 'Alexander@Example.com',
      workspace: 'CarbonLite Sample Workspace',
      expires: '2026-09-14',
      inviteExpiresHours: 48,
    });

    expect(payload).toMatchObject({
      name: 'Alexander',
      email: 'alexander@example.com',
      workspace: 'CarbonLite Sample Workspace',
      workspaceName: 'CarbonLite Sample Workspace',
      accountType: 'PILOT_REVIEWER',
      role: 'REVIEWER',
      accessScope: 'SAMPLE_WORKSPACE_ONLY',
      expires: '2026-09-14T23:59:59.999Z',
      expiresAt: '2026-09-14T23:59:59.999Z',
      invite: {
        delivery: 'SETUP_LINK',
        sendEmail: true,
        tokenExpiresHours: 48,
        passwordResetRequired: true,
      },
      permissions: {
        canViewSampleData: true,
        canViewReports: true,
        canDownloadSampleExports: true,
        canSubmitFeedback: true,
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

  it('rejects missing required arguments and invalid email', () => {
    expect(() =>
      buildPayload({
        name: '',
        email: 'alexander@example.com',
        workspace: 'CarbonLite Sample Workspace',
        inviteExpiresHours: 72,
      }),
    ).toThrow(/Name is required/);

    expect(() => requireEmail('not-an-email')).toThrow(
      'Please enter a valid email address, for example alexander@example.com.',
    );
    expect(() => requireEmail('[alexander@example.com](mailto:alexander@example.com)')).toThrow(
      'Please enter a valid email address, for example alexander@example.com.',
    );
    expect(() => requireEmail('mailto:alexander@example.com')).toThrow(
      'Please enter a valid email address, for example alexander@example.com.',
    );
  });

  it('supports exact expiration dates and relative expiration', () => {
    expect(
      buildExpiresAt({
        expires: '2026-09-14',
        expiryDays: 30,
      }),
    ).toBe('2026-09-14T23:59:59.999Z');

    expect(
      buildExpiresAt({
        noExpiration: true,
        expiryDays: 30,
      }),
    ).toBeNull();
  });

  it('builds endpoints and invite links from environment values', () => {
    expect(getEndpoint({ API_BASE_URL: 'https://api.example.com/api/' })).toBe(
      'https://api.example.com/api/admin/pilot-reviewers',
    );
    expect(getFrontendUrl({ APP_URL: 'https://app.example.com/' })).toBe('https://app.example.com');
    expect(
      buildInviteLinkFromResponse(
        { setupToken: 'secure token' },
        { APP_URL: 'https://app.example.com' },
      ),
    ).toBe('https://app.example.com/set-password?token=secure%20token');
    expect(
      buildInviteLinkFromResponse(
        { inviteLink: 'https://pilot.example.com/set-password?token=invite' },
        { APP_URL: 'https://app.example.com' },
      ),
    ).toBe('https://pilot.example.com/set-password?token=invite');
    expect(
      buildInviteLinkFromResponse(
        { setupUrl: 'https://pilot.example.com/set-password?token=abc' },
        { APP_URL: 'https://app.example.com' },
      ),
    ).toBe('https://pilot.example.com/set-password?token=abc');
  });

  it('blocks production creation unless explicitly confirmed', () => {
    expect(() => assertSafeEnvironment({ APP_ENV: 'production' })).toThrow(/Refusing/);
    expect(
      assertSafeEnvironment({
        APP_ENV: 'production',
        CONFIRM_PRODUCTION_PILOT_REVIEWER_CREATE: 'CREATE_PILOT_REVIEWER_IN_PRODUCTION',
      }),
    ).toBe('production');
  });
});
