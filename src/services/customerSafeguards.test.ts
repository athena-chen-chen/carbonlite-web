import { FALLBACK_API_BASE_URL } from '../config/api';
import {
  eraseOrganization,
  getCustomerPreflight,
  provisionPaidPilotCustomer,
  runOrganizationErasureDryRun,
  suspendCustomerOrganization,
} from './customerSafeguards';

function setCurrentUser(platformRole: 'ADMIN' | 'USER') {
  localStorage.setItem('accessToken', 'safeguard-token');
  localStorage.setItem('currentUser', JSON.stringify({
    email: platformRole === 'ADMIN' ? 'platform@example.com' : 'customer@example.com',
    role: 'ADMIN',
    membershipRole: 'ADMIN',
    platformRole,
    accountType: 'CUSTOMER',
    organizationId: platformRole === 'ADMIN' ? 'platform-org' : 'customer-org',
  }));
}

describe('customer safeguard admin service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('normalizes email and makes only the requested read-only preflight call', async () => {
    setCurrentUser('ADMIN');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        lookup: { normalizedEmail: 'customer@example.com', organizationName: null },
        user: { exists: false, normalizedEmail: 'customer@example.com' },
        organization: null,
      }), { status: 200 }),
    );

    await getCustomerPreflight({ email: ' Customer@Example.com ' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      `${FALLBACK_API_BASE_URL}/admin/customer-provisioning/preflight?email=customer%40example.com`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer safeguard-token' }),
      }),
    );
  });

  it('supports an organization-name-only lookup', async () => {
    setCurrentUser('ADMIN');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        lookup: { normalizedEmail: null, organizationName: 'Acme Pilot' },
        user: { exists: false, normalizedEmail: null },
        organization: null,
      }), { status: 200 }),
    );

    await getCustomerPreflight({ organizationName: '  Acme Pilot  ' });

    expect(fetchMock).toHaveBeenCalledWith(
      `${FALLBACK_API_BASE_URL}/admin/customer-provisioning/preflight?organizationName=Acme+Pilot`,
      expect.any(Object),
    );
  });

  it('requires at least one lookup value without calling the API', () => {
    setCurrentUser('ADMIN');
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    expect(() => getCustomerPreflight({ email: ' ', organizationName: ' ' })).toThrow(
      'Enter an email or organization name to run preflight.',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('blocks a customer organization admin before calling any safeguard endpoint', () => {
    setCurrentUser('USER');
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    expect(() => getCustomerPreflight({ email: 'customer@example.com' })).toThrow(
      'You do not have permission to perform this action.',
    );
    expect(() => suspendCustomerOrganization({
      organizationId: 'customer-org',
      organizationSlug: 'customer-org',
    })).toThrow('You do not have permission to perform this action.');
    expect(() => provisionPaidPilotCustomer({
      organizationId: 'customer-org',
      organizationSlug: 'customer-org',
      primaryAdminUserId: 'customer-user',
    })).toThrow('You do not have permission to perform this action.');
    expect(() => runOrganizationErasureDryRun('customer-org')).toThrow(
      'You do not have permission to perform this action.',
    );
    expect(() => eraseOrganization({
      organizationId: 'customer-org',
      organizationSlug: 'customer-org',
    })).toThrow('You do not have permission to perform this action.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts only the trusted organization ID to the dry-run endpoint', async () => {
    setCurrentUser('ADMIN');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        status: 'DRY_RUN',
        inventory: {
          organizationId: 'org-123',
          organizationSlug: 'acme-pilot',
          users: 1,
          memberships: 1,
        },
        dataDeleted: false,
      }), { status: 200 }),
    );

    await runOrganizationErasureDryRun('org-123');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      `${FALLBACK_API_BASE_URL}/admin/workspace-erasure/dry-run`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ organizationId: 'org-123' }),
      }),
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/admin/workspace-erasure/erase'),
      expect.anything(),
    );
  });

  it('posts the exact guarded erasure DTO built from trusted values', async () => {
    setCurrentUser('ADMIN');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        status: 'ERASED',
        organizationIdHash: 'hashed-org-id',
        inventory: {
          organizationId: 'org-123',
          organizationSlug: 'acme-pilot',
          users: 1,
          memberships: 1,
        },
        deletedPhysicalFiles: 0,
        alreadyMissingPhysicalFiles: 0,
      }), { status: 200 }),
    );

    await eraseOrganization({
      organizationId: 'org-123',
      organizationSlug: 'acme-pilot',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      `${FALLBACK_API_BASE_URL}/admin/workspace-erasure/erase`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          organizationId: 'org-123',
          confirmationOrganizationId: 'org-123',
          confirmationOrganizationSlug: 'acme-pilot',
          confirmErase: true,
        }),
      }),
    );
  });

  it('builds the exact provisioning payload from trusted preflight values', async () => {
    setCurrentUser('ADMIN');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        organizationId: 'org-123',
        status: 'PROVISIONED',
        primaryAdminUserId: 'user-123',
        provisionedAt: '2026-11-11T12:00:00.000Z',
      }), { status: 200 }),
    );

    await provisionPaidPilotCustomer({
      organizationId: 'org-123',
      organizationSlug: 'acme-pilot',
      primaryAdminUserId: 'user-123',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      `${FALLBACK_API_BASE_URL}/admin/customer-provisioning/paid-pilot`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          organizationId: 'org-123',
          confirmationOrganizationId: 'org-123',
          confirmationOrganizationSlug: 'acme-pilot',
          primaryAdminUserId: 'user-123',
          confirmProvision: true,
        }),
      }),
    );
  });

  it('builds the exact suspension confirmation payload from trusted preflight values', async () => {
    setCurrentUser('ADMIN');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        organizationId: 'org-123',
        status: 'SUSPENDED',
        suspended: true,
      }), { status: 200 }),
    );

    await suspendCustomerOrganization({
      organizationId: 'org-123',
      organizationSlug: 'acme-pilot',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${FALLBACK_API_BASE_URL}/admin/customer-provisioning/suspend`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          organizationId: 'org-123',
          confirmationOrganizationId: 'org-123',
          confirmationOrganizationSlug: 'acme-pilot',
          confirmSuspend: true,
        }),
      }),
    );
  });
});
