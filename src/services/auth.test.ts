import {
  canClearActivityRecords,
  canImportActivityRecords,
  canManageActivityRecords,
  canManageConversionFactors,
  getUserRole,
  isReadOnlyUser,
  login,
  register,
  type AuthUser,
} from './auth';
import { FALLBACK_API_BASE_URL } from '../config/api';

describe('user role permissions', () => {
  const user = (role: AuthUser['role']): AuthUser => ({
    email: `${role?.toLowerCase() ?? 'none'}@example.com`,
    role,
    organizationId: 'org-1',
  });

  it('supports Owner, Admin, Member, Viewer, and legacy User roles', () => {
    expect(getUserRole(user('OWNER'))).toBe('OWNER');
    expect(getUserRole(user('ADMIN'))).toBe('ADMIN');
    expect(getUserRole(user('MEMBER'))).toBe('MEMBER');
    expect(getUserRole(user('VIEWER'))).toBe('VIEWER');
    expect(getUserRole(user('USER'))).toBe('MEMBER');
    expect(getUserRole(null)).toBe('VIEWER');
  });

  it('fails closed when there is no authenticated company context', () => {
    expect(canImportActivityRecords(null)).toBe(false);
    expect(canManageActivityRecords(null)).toBe(false);
    expect(canClearActivityRecords(null)).toBe(false);
    expect(canManageConversionFactors(null)).toBe(false);

    const adminWithoutCompany: AuthUser = {
      email: 'admin@example.com',
      role: 'ADMIN',
    };

    expect(canImportActivityRecords(adminWithoutCompany)).toBe(false);
    expect(canManageActivityRecords(adminWithoutCompany)).toBe(false);
    expect(canClearActivityRecords(adminWithoutCompany)).toBe(false);
    expect(canManageConversionFactors(adminWithoutCompany)).toBe(false);
  });

  it('keeps viewers read-only and limits dangerous actions to owner/admin', () => {
    expect(canImportActivityRecords(user('VIEWER'))).toBe(false);
    expect(canManageActivityRecords(user('VIEWER'))).toBe(false);
    expect(canClearActivityRecords(user('VIEWER'))).toBe(false);
    expect(canManageConversionFactors(user('VIEWER'))).toBe(false);
    expect(isReadOnlyUser(user('VIEWER'))).toBe(true);

    expect(canImportActivityRecords(user('MEMBER'))).toBe(true);
    expect(canManageActivityRecords(user('MEMBER'))).toBe(true);
    expect(canClearActivityRecords(user('MEMBER'))).toBe(false);
    expect(canManageConversionFactors(user('MEMBER'))).toBe(false);

    expect(canClearActivityRecords(user('ADMIN'))).toBe(true);
    expect(canManageConversionFactors(user('ADMIN'))).toBe(true);
    expect(canClearActivityRecords(user('OWNER'))).toBe(true);
    expect(canManageConversionFactors(user('OWNER'))).toBe(true);
  });
});

describe('public signup controls', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('blocks public registration by default before calling the API', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(
      register({
        organizationName: 'Unknown Org',
        email: 'unknown@example.com',
        password: 'Password123!',
      }),
    ).rejects.toThrow(
      'Public signup is currently disabled. CarbonLite pilot access is invite-only.',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('allows registration only when local public signup is explicitly enabled', async () => {
    vi.stubEnv('VITE_APP_ENV', 'local');
    vi.stubEnv('VITE_PUBLIC_SIGNUP_ENABLED', 'true');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: 'registered-token',
          user: { email: 'new@example.com', role: 'MEMBER', organizationId: 'org-1' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    await expect(
      register({
        organizationName: 'Local Org',
        email: 'new@example.com',
        password: 'Password123!',
      }),
    ).resolves.toMatchObject({ accessToken: 'registered-token' });

    expect(fetchMock).toHaveBeenCalledWith(
      `${FALLBACK_API_BASE_URL}/auth/register`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('keeps pilot registration disabled even if the signup flag is accidentally true', async () => {
    vi.stubEnv('VITE_APP_ENV', 'pilot');
    vi.stubEnv('VITE_PUBLIC_SIGNUP_ENABLED', 'true');
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(
      register({
        organizationName: 'Pilot Org',
        email: 'pilot-signup@example.com',
        password: 'Password123!',
      }),
    ).rejects.toThrow(
      'Public signup is currently disabled. CarbonLite pilot access is invite-only.',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps backend registration disablement to the invite-only message', async () => {
    vi.stubEnv('VITE_APP_ENV', 'local');
    vi.stubEnv('VITE_PUBLIC_SIGNUP_ENABLED', 'true');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          message: 'Public signup is currently disabled. CarbonLite pilot access is invite-only.',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    await expect(
      register({
        organizationName: 'Blocked Org',
        email: 'blocked@example.com',
        password: 'Password123!',
      }),
    ).rejects.toThrow(
      'Public signup is currently disabled. CarbonLite pilot access is invite-only.',
    );
  });

  it('shows a clear disabled-user login message when backend rejects the account', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'User account disabled' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(
      login({ email: 'disabled@example.com', password: 'Password123!' }),
    ).rejects.toThrow(
      'This account is disabled. Please contact the CarbonLite team for access.',
    );
  });
});
