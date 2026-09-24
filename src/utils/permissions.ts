import type { AuthUser } from '../services/auth';

export function getAccountType(user: AuthUser | null) {
  const accountType = String(user?.accountType ?? user?.account_type ?? 'CUSTOMER')
    .trim()
    .toUpperCase();

  if (accountType === 'INTERNAL_TEST' || accountType === 'PILOT_REVIEWER' || accountType === 'CUSTOMER') {
    return accountType;
  }

  return 'CUSTOMER';
}

export function isPilotReviewer(user: AuthUser | null) {
  return getAccountType(user) === 'PILOT_REVIEWER';
}

export function isInternalTestAccount(user: AuthUser | null) {
  return getAccountType(user) === 'INTERNAL_TEST';
}

export function getUserRole(user: AuthUser | null) {
  if (!user) return 'VIEWER';

  const role = String(user.role ?? 'MEMBER').toUpperCase();
  if (role === 'REVIEWER') return 'VIEWER';
  if (role === 'USER') return 'MEMBER';
  if (role === 'OWNER' || role === 'ADMIN' || role === 'EDITOR' || role === 'MEMBER' || role === 'VIEWER') {
    return role;
  }
  return 'MEMBER';
}

export function isAdmin(user: AuthUser | null) {
  if (isPilotReviewer(user)) return false;
  return getUserRole(user) === 'ADMIN';
}

export function isOwner(user: AuthUser | null) {
  if (isPilotReviewer(user)) return false;
  return getUserRole(user) === 'OWNER';
}

export function isAdminOrOwner(user: AuthUser | null) {
  if (isPilotReviewer(user)) return false;
  const role = getUserRole(user);
  return role === 'ADMIN' || role === 'OWNER';
}

export function canViewDataRecords(user: AuthUser | null) {
  return hasCompanyContext(user);
}

export function canViewFactors(user: AuthUser | null) {
  return Boolean(user);
}

export function canViewCalculationReview(user: AuthUser | null) {
  return hasCompanyContext(user);
}

export function canViewReports(user: AuthUser | null) {
  return hasCompanyContext(user);
}

export function canImportData(user: AuthUser | null) {
  return canImportDraftRows(user);
}

export function canEditDraftRows(user: AuthUser | null) {
  return canImportDraftRows(user);
}

export function canUploadFiles(user: AuthUser | null) {
  return canContributeActivityData(user);
}

export function canImportDraftRows(user: AuthUser | null) {
  return canContributeActivityData(user);
}

export function canSetProvinceForActivityRecords(user: AuthUser | null) {
  return canContributeActivityData(user);
}

export function canEditActivityRecords(user: AuthUser | null) {
  if (!hasCompanyContext(user)) return false;
  if (isPilotReviewer(user)) return false;

  const rawRole = String(user?.role ?? '').trim().toUpperCase();
  return rawRole === 'OWNER' || rawRole === 'ADMIN' || rawRole === 'EDITOR' || rawRole === 'MEMBER';
}

export function canDeleteActivityRecords(user: AuthUser | null) {
  return canEditActivityRecords(user);
}

export function canResetWorkspaceData(user: AuthUser | null) {
  if (!hasCompanyContext(user)) return false;
  if (isPilotReviewer(user)) return false;

  return isAdminOrOwner(user);
}

export function canEditFactors(user: AuthUser | null) {
  if (!hasCompanyContext(user)) return false;
  if (isPilotReviewer(user)) return false;

  return isAdminOrOwner(user);
}

export function canManageCompanyFactors(user: AuthUser | null) {
  if (!hasCompanyContext(user)) return false;
  if (isPilotReviewer(user)) return false;

  const accountType = getFactorManagementAccountType(user);
  if (accountType !== 'CUSTOMER' && accountType !== 'INTERNAL_TEST') {
    return false;
  }

  return isAdminOrOwner(user);
}

export function canEditWorkspace(user: AuthUser | null) {
  if (!hasCompanyContext(user)) return false;
  if (isPilotReviewer(user)) return false;

  const rawRole = String(user?.role ?? '').trim().toUpperCase();
  if (rawRole === 'USER') return true;

  const role = getUserRole(user);
  return role === 'OWNER' || role === 'ADMIN' || role === 'EDITOR';
}

export function canManageUsers(user: AuthUser | null) {
  if (isPilotReviewer(user)) return false;

  return isAdminOrOwner(user);
}

export function canViewAdmin(user: AuthUser | null) {
  return canManageUsers(user);
}

export function isReadOnlyUser(user: AuthUser | null) {
  return getUserRole(user) === 'VIEWER' || isPilotReviewer(user);
}

export function requirePermission(allowed: boolean) {
  if (!allowed) {
    throw new Error('You do not have permission to perform this action.');
  }
}

export const isAdminUser = isAdmin;
export const isAdminOrOwnerUser = isAdminOrOwner;
export const canManageActivityRecords = canEditActivityRecords;
export const canEditImportedDraftRows = canEditDraftRows;
export const canSetProvince = canSetProvinceForActivityRecords;
export const canImportDraftActivityRows = canImportDraftRows;
export const canImportActivityRecords = canImportData;
export const canUploadActivityFiles = canUploadFiles;
export const canClearActivityRecords = canResetWorkspaceData;
export const canManageConversionFactors = canManageCompanyFactors;

function hasCompanyContext(user: AuthUser | null) {
  return Boolean(user && getOrganizationIdFromUser(user));
}

function getOrganizationIdFromUser(user: AuthUser | null) {
  return (
    user?.organizationId ||
    user?.organization?.id ||
    user?.companyId ||
    user?.company_id ||
    user?.company?.id ||
    user?.workspaceId ||
    user?.workspace_id ||
    user?.workspace?.id ||
    user?.tenantId ||
    user?.tenant_id ||
    ''
  );
}

function getFactorManagementAccountType(user: AuthUser | null) {
  const rawAccountType = user?.accountType ?? user?.account_type;
  if (rawAccountType === null || rawAccountType === undefined || String(rawAccountType).trim() === '') {
    return 'CUSTOMER';
  }

  return String(rawAccountType).trim().toUpperCase();
}

function canContributeActivityData(user: AuthUser | null) {
  if (!hasCompanyContext(user)) return false;
  if (isPilotReviewer(user)) return false;

  const accountType = getAccountType(user);
  if (accountType !== 'CUSTOMER' && accountType !== 'INTERNAL_TEST') {
    return false;
  }

  const rawRole = String(user?.role ?? '').trim().toUpperCase();
  const membershipRole = String(user?.membershipRole ?? '').trim().toUpperCase();
  if (rawRole === 'VIEWER' || rawRole === 'REVIEWER' || membershipRole === 'VIEWER' || membershipRole === 'REVIEWER') {
    return false;
  }

  return (
    rawRole === 'OWNER' ||
    rawRole === 'ADMIN' ||
    rawRole === 'EDITOR' ||
    rawRole === 'MEMBER' ||
    rawRole === 'USER'
  );
}
