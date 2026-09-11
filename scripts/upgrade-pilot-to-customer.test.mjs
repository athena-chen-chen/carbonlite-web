import { describe, expect, it } from 'vitest';
import {
  assertSafeEnvironment,
  buildPayload,
  getEndpoint,
  normalizeCustomerRole,
  requireEmail,
} from './upgrade-pilot-to-customer.mjs';

describe('upgrade-pilot-to-customer script helpers', () => {
  it('builds a customer workspace upgrade payload without granting platform admin access', () => {
    const payload = buildPayload({
      email: ' Customer@Example.com ',
      workspace: ' Customer Pilot Workspace ',
      role: 'OWNER',
    });

    expect(payload).toMatchObject({
      email: 'customer@example.com',
      currentAccountType: 'PILOT_REVIEWER',
      accountType: 'CUSTOMER',
      workspaceName: 'Customer Pilot Workspace',
      createWorkspace: true,
      preserveSampleWorkspace: true,
      role: 'OWNER',
      accessScope: 'CUSTOMER_WORKSPACE_ONLY',
      permissions: {
        canUpload: true,
        canImport: true,
        canEditRecords: true,
        canDeleteRecords: true,
        canViewFactors: true,
        canGenerateReports: true,
        canEditOrganizationBoundary: true,
        canSubmitFeedback: true,
        canEditSystemFactors: false,
        canManagePlatformUsers: false,
        canAccessPlatformAdmin: false,
        canResetGlobalSampleData: false,
        canAccessOtherWorkspaces: false,
      },
    });
  });

  it('rejects missing workspace, invalid email, and non-customer-admin roles', () => {
    expect(() =>
      buildPayload({
        email: 'customer@example.com',
        workspace: '',
        role: 'ADMIN',
      }),
    ).toThrow(/Workspace is required/);

    expect(() => requireEmail('[customer@example.com](mailto:customer@example.com)')).toThrow(
      'Please enter a valid email address, for example customer@example.com.',
    );
    expect(() => requireEmail('mailto:customer@example.com')).toThrow(
      'Please enter a valid email address, for example customer@example.com.',
    );
    expect(() => normalizeCustomerRole('VIEWER')).toThrow('--role must be ADMIN or OWNER.');
  });

  it('normalizes supported customer workspace roles', () => {
    expect(normalizeCustomerRole()).toBe('ADMIN');
    expect(normalizeCustomerRole('admin')).toBe('ADMIN');
    expect(normalizeCustomerRole(' owner ')).toBe('OWNER');
  });

  it('builds the default upgrade endpoint from API_BASE_URL', () => {
    expect(getEndpoint({ API_BASE_URL: 'https://api.example.com/api/' })).toBe(
      'https://api.example.com/api/admin/pilot-reviewers/upgrade-to-customer',
    );
    expect(
      getEndpoint({
        PILOT_TO_CUSTOMER_UPGRADE_ENDPOINT: 'https://api.example.com/custom-upgrade',
      }),
    ).toBe('https://api.example.com/custom-upgrade');
  });

  it('blocks production upgrades unless explicitly confirmed', () => {
    expect(() => assertSafeEnvironment({ APP_ENV: 'production' })).toThrow(/Refusing/);
    expect(
      assertSafeEnvironment({
        APP_ENV: 'production',
        CONFIRM_PRODUCTION_PILOT_UPGRADE: 'UPGRADE_PILOT_TO_CUSTOMER_IN_PRODUCTION',
      }),
    ).toBe('production');
  });
});
