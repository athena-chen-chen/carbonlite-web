import {
  canDeleteActivityRecords,
  canEditActivityRecords,
  canEditFactors,
  canEditWorkspace,
  canManageCompanyFactors,
  canImportData,
  canManageUsers,
  canResetWorkspaceData,
  canViewAdmin,
  canViewCalculationReview,
  canViewDataRecords,
  canViewFactors,
  canViewReports,
  getUserRole,
  isAdmin,
  isAdminOrOwner,
  isPilotReviewer,
  isReadOnlyUser,
} from './permissions';
import type { AuthUser } from '../services/auth';

describe('shared permission helpers', () => {
  const user = (role: AuthUser['role'], overrides: Partial<AuthUser> = {}): AuthUser => ({
    email: `${role?.toLowerCase() ?? 'user'}@example.com`,
    role,
    organizationId: 'org-1',
    ...overrides,
  });

  it('normalizes existing role values', () => {
    expect(getUserRole(user('OWNER'))).toBe('OWNER');
    expect(getUserRole(user('ADMIN'))).toBe('ADMIN');
    expect(getUserRole(user('EDITOR'))).toBe('EDITOR');
    expect(getUserRole(user('MEMBER'))).toBe('MEMBER');
    expect(getUserRole(user('VIEWER'))).toBe('VIEWER');
    expect(getUserRole(user('REVIEWER'))).toBe('VIEWER');
    expect(getUserRole(user('USER'))).toBe('MEMBER');
    expect(getUserRole(null)).toBe('VIEWER');
  });

  it('keeps pilot reviewer accounts read-only even when role is misconfigured', () => {
    const reviewer = user('ADMIN', {
      accountType: 'PILOT_REVIEWER',
    });

    expect(isPilotReviewer(reviewer)).toBe(true);
    expect(canEditFactors(reviewer)).toBe(false);
    expect(canEditWorkspace(reviewer)).toBe(false);
    expect(canImportData(reviewer)).toBe(false);
    expect(canEditActivityRecords(reviewer)).toBe(false);
    expect(canDeleteActivityRecords(reviewer)).toBe(false);
    expect(canResetWorkspaceData(reviewer)).toBe(false);
    expect(canManageUsers(reviewer)).toBe(false);
    expect(canViewAdmin(reviewer)).toBe(false);
    expect(isReadOnlyUser(reviewer)).toBe(true);
  });

  it('detects pilot reviewer accounts from backend snake_case account type', () => {
    const reviewer = user('ADMIN', {
      account_type: 'PILOT_REVIEWER',
    });

    expect(isPilotReviewer(reviewer)).toBe(true);
    expect(canImportData(reviewer)).toBe(false);
    expect(canManageUsers(reviewer)).toBe(false);
    expect(isReadOnlyUser(reviewer)).toBe(true);
  });

  it('allows pilot reviewers to view read-only workspace pages', () => {
    const reviewer = user('REVIEWER', {
      accountType: 'PILOT_REVIEWER',
    });

    expect(canViewDataRecords(reviewer)).toBe(true);
    expect(canViewFactors(reviewer)).toBe(true);
    expect(canViewCalculationReview(reviewer)).toBe(true);
    expect(canViewReports(reviewer)).toBe(true);
  });

  it('preserves admin and owner management permissions', () => {
    [user('ADMIN', { accountType: 'CUSTOMER' }), user('OWNER', { accountType: 'CUSTOMER' })].forEach((account) => {
      expect(isAdminOrOwner(account)).toBe(true);
      expect(canEditFactors(account)).toBe(true);
      expect(canManageCompanyFactors(account)).toBe(true);
      expect(canEditWorkspace(account)).toBe(true);
      expect(canImportData(account)).toBe(true);
      expect(canEditActivityRecords(account)).toBe(true);
      expect(canDeleteActivityRecords(account)).toBe(true);
      expect(canResetWorkspaceData(account)).toBe(true);
      expect(canManageUsers(account)).toBe(true);
      expect(canViewAdmin(account)).toBe(true);
    });

    expect(isAdmin(user('ADMIN'))).toBe(true);
    expect(isAdmin(user('OWNER'))).toBe(false);
  });

  it('allows internal test admins and owners to manage company factors', () => {
    expect(canManageCompanyFactors(user('ADMIN', { accountType: 'INTERNAL_TEST' }))).toBe(true);
    expect(canManageCompanyFactors(user('OWNER', { accountType: 'INTERNAL_TEST' }))).toBe(true);
  });

  it('does not allow unsupported account types to manage company factors', () => {
    const partnerAdmin = user('ADMIN', { accountType: 'PARTNER' });

    expect(canEditFactors(partnerAdmin)).toBe(true);
    expect(canManageCompanyFactors(partnerAdmin)).toBe(false);
  });

  it('allows customer editors to edit workspace settings without admin permissions', () => {
    const editor = user('EDITOR', { accountType: 'CUSTOMER' });

    expect(canImportData(editor)).toBe(true);
    expect(canEditActivityRecords(editor)).toBe(true);
    expect(canEditWorkspace(editor)).toBe(true);
    expect(canManageCompanyFactors(editor)).toBe(false);
    expect(canManageUsers(editor)).toBe(false);
    expect(canViewAdmin(editor)).toBe(false);
    expect(canResetWorkspaceData(editor)).toBe(false);
  });

  it('allows legacy regular USER accounts to edit their workspace settings', () => {
    const legacyUser = user('USER', { accountType: null });

    expect(isPilotReviewer(legacyUser)).toBe(false);
    expect(canEditWorkspace(legacyUser)).toBe(true);
    expect(canManageCompanyFactors(legacyUser)).toBe(false);
    expect(canManageUsers(legacyUser)).toBe(false);
    expect(canViewAdmin(legacyUser)).toBe(false);
    expect(canResetWorkspaceData(legacyUser)).toBe(false);
  });

  it('keeps customer USER accounts read-only for company factor management', () => {
    const customerUser = user('USER', { accountType: 'CUSTOMER' });

    expect(canManageCompanyFactors(customerUser)).toBe(false);
    expect(canEditFactors(customerUser)).toBe(false);
    expect(canViewFactors(customerUser)).toBe(true);
  });

  it('keeps member editable behavior but blocks dangerous admin-only actions', () => {
    const member = user('MEMBER');

    expect(canImportData(member)).toBe(true);
    expect(canEditActivityRecords(member)).toBe(true);
    expect(canDeleteActivityRecords(member)).toBe(true);
    expect(canEditFactors(member)).toBe(false);
    expect(canEditWorkspace(member)).toBe(false);
    expect(canResetWorkspaceData(member)).toBe(false);
    expect(canManageUsers(member)).toBe(false);
  });

  it('fails closed without company context', () => {
    const adminWithoutCompany = user('ADMIN', { organizationId: '' });

    expect(canImportData(adminWithoutCompany)).toBe(false);
    expect(canEditActivityRecords(adminWithoutCompany)).toBe(false);
    expect(canEditFactors(adminWithoutCompany)).toBe(false);
    expect(canEditWorkspace(adminWithoutCompany)).toBe(false);
    expect(canResetWorkspaceData(adminWithoutCompany)).toBe(false);
  });
});
