import {
  canClearActivityRecords,
  canImportActivityRecords,
  canManageActivityRecords,
  canManageConversionFactors,
  getUserRole,
  isReadOnlyUser,
  type AuthUser,
} from './auth';

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
    expect(getUserRole(null)).toBe('MEMBER');
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
