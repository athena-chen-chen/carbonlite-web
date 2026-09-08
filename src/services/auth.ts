import { buildApiUrl, isPublicSignupEnabled } from '../config/api';
import { getUserFriendlyErrorMessage } from '../utils/userFriendlyErrors';
export {
  canClearActivityRecords,
  canDeleteActivityRecords,
  canEditActivityRecords,
  canEditFactors,
  canEditWorkspace,
  canImportActivityRecords,
  canImportData,
  canManageActivityRecords,
  canManageConversionFactors,
  canManageUsers,
  canResetWorkspaceData,
  canViewAdmin,
  canViewCalculationReview,
  canViewDataRecords,
  canViewFactors,
  canViewReports,
  getAccountType,
  getUserRole,
  isAdmin,
  isAdminOrOwner,
  isAdminOrOwnerUser,
  isAdminUser,
  isInternalTestAccount,
  isPilotReviewer,
  isReadOnlyUser,
  requirePermission,
} from '../utils/permissions';

const TOKEN_KEY = 'accessToken';
const USER_KEY = 'currentUser';
const INVALID_LOGIN_MESSAGE = 'The email or password is incorrect.';
const EXPIRED_INVITE_MESSAGE =
  'This invite link has expired. Please contact hello@carbonliteapp.ca for a new link.';
const USED_INVITE_MESSAGE =
  'This invite link has already been used. Please log in or contact hello@carbonliteapp.ca.';
const DEACTIVATED_ACCOUNT_MESSAGE =
  'This account has been deactivated. Please contact hello@carbonliteapp.ca.';

export type AuthUser = {
  id?: string;
  email: string;
  role?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | 'REVIEWER' | 'USER';
  accountType?: 'INTERNAL_TEST' | 'PILOT_REVIEWER' | 'CUSTOMER' | string;
  account_type?: 'INTERNAL_TEST' | 'PILOT_REVIEWER' | 'CUSTOMER' | string;
  expiresAt?: string | null;
  status?: 'ACTIVE' | 'DISABLED' | 'PENDING' | string;
  organizationId?: string;
  organizationName?: string;
  organization?: {
    id?: string;
    name?: string;
  };
  name?: string;
};

export type AuthResponse = {
  accessToken: string;
  user?: AuthUser;
};

type RegisterInput = {
  organizationName: string;
  email: string;
  password: string;
};

type LoginInput = {
  email: string;
  password: string;
};

type PasswordResetRequestInput = {
  email: string;
};

type SetPasswordInput = {
  token: string;
  password: string;
};

function saveSession(response: AuthResponse, fallbackEmail: string) {
  localStorage.setItem(TOKEN_KEY, response.accessToken);
  localStorage.setItem(
    USER_KEY,
    JSON.stringify(response.user ?? { email: fallbackEmail }),
  );
}

export function isAccountExpired(user: AuthUser | null) {
  if (!user?.expiresAt) return false;
  const expiresAt = new Date(user.expiresAt).getTime();
  return Number.isFinite(expiresAt) && expiresAt <= Date.now();
}

function getFriendlyAuthError(response: Response, fallback: string, detail: string) {
  const normalizedDetail = detail.toLowerCase();

  if (normalizedDetail.includes('invite link has already been used')) {
    return USED_INVITE_MESSAGE;
  }
  if (
    normalizedDetail.includes('invite link has expired') ||
    normalizedDetail.includes('invite link is invalid') ||
    normalizedDetail.includes('invite link is invalid or has expired')
  ) {
    return EXPIRED_INVITE_MESSAGE;
  }
  if (response.status === 401) return INVALID_LOGIN_MESSAGE;
  if (response.status === 403 && normalizedDetail.includes('signup')) {
    return 'Public signup is currently disabled. CarbonLite pilot access is invite-only.';
  }
  if (normalizedDetail.includes('disabled') || normalizedDetail.includes('deactivated')) {
    return DEACTIVATED_ACCOUNT_MESSAGE;
  }
  if (response.status === 409 || normalizedDetail.includes('already')) {
    return 'Email already registered. Please log in instead.';
  }
  if (normalizedDetail.includes('invalid') || normalizedDetail.includes('password')) {
    return INVALID_LOGIN_MESSAGE;
  }
  if (response.status >= 500) return getUserFriendlyErrorMessage(null, 'unknown');
  return fallback;
}

async function authRequest(path: string, body: LoginInput | RegisterInput) {
  let response: Response;

  try {
    response = await fetch(buildApiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(getUserFriendlyErrorMessage(null, 'network'));
  }

  if (!response.ok) {
    const detail = await response.text();

    throw new Error(
      getFriendlyAuthError(
        response,
        path.includes('register')
          ? 'Registration failed. Please try again.'
          : INVALID_LOGIN_MESSAGE,
        detail,
      ),
    );
  }

  const data = (await response.json()) as AuthResponse;

  if (!data.accessToken) {
    throw new Error(getUserFriendlyErrorMessage(null, 'unknown'));
  }

  if (data.user?.status && String(data.user.status).toUpperCase() === 'DISABLED') {
    throw new Error(DEACTIVATED_ACCOUNT_MESSAGE);
  }

  if (isAccountExpired(data.user ?? null)) {
    throw new Error('This pilot reviewer access has expired. Please contact CarbonLite if you need continued access.');
  }

  saveSession(data, body.email);
  return data;
}

export async function register(input: RegisterInput) {
  if (!isPublicSignupEnabled()) {
    throw new Error('Public signup is currently disabled. CarbonLite pilot access is invite-only.');
  }

  return authRequest('/auth/register', input);
}

export async function login(input: LoginInput) {
  return authRequest('/auth/login', input);
}

export async function requestPasswordReset(input: PasswordResetRequestInput) {
  await passwordRequest('/auth/password-reset/request', {
    email: input.email.trim(),
  });
}

export async function setPasswordFromToken(input: SetPasswordInput) {
  await passwordRequest('/auth/password-reset/confirm', {
    token: input.token.trim(),
    password: input.password,
  });
}

async function passwordRequest(path: string, body: PasswordResetRequestInput | SetPasswordInput) {
  let response: Response;

  try {
    response = await fetch(buildApiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(getUserFriendlyErrorMessage(null, 'network'));
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      getFriendlyAuthError(
        response,
        path.includes('request')
          ? 'If an account exists for this email, a password reset link will be sent.'
          : 'Unable to set password. Please request a new invite or password reset link.',
        detail,
      ),
    );
  }
}

export function logout() {
  auditLogout();
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function auditLogout() {
  const token = getToken();
  if (!token) return;

  void fetch(buildApiUrl('/auth/logout'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).catch(() => {
    // Logout must not be blocked by audit logging.
  });
}

export function handleUnauthorized() {
  sessionStorage.setItem(
    'authMessage',
    'Your session has expired. Please sign in again.',
  );
  logout();

  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getCurrentUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function getOrganizationName(user: AuthUser | null) {
  return user?.organizationName || user?.organization?.name || 'Workspace';
}

export function getOrganizationId(user: AuthUser | null) {
  return user?.organizationId || user?.organization?.id || '';
}

export function getUserDisplayName(user: AuthUser | null) {
  return user?.name || user?.email || '';
}
