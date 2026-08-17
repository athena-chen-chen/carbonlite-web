import { buildApiUrl, isPublicSignupEnabled } from '../config/api';

const TOKEN_KEY = 'accessToken';
const USER_KEY = 'currentUser';

export type AuthUser = {
  id?: string;
  email: string;
  role?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | 'REVIEWER' | 'USER';
  accountType?: 'INTERNAL_TEST' | 'PILOT_REVIEWER' | 'CUSTOMER' | string;
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

export function getAccountType(user: AuthUser | null) {
  const accountType = String(user?.accountType ?? 'CUSTOMER')
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

export function isAccountExpired(user: AuthUser | null) {
  if (!user?.expiresAt) return false;
  const expiresAt = new Date(user.expiresAt).getTime();
  return Number.isFinite(expiresAt) && expiresAt <= Date.now();
}

function getFriendlyAuthError(response: Response, fallback: string, detail: string) {
  const normalizedDetail = detail.toLowerCase();

  if (response.status === 401) return 'Invalid login. Please check your email and password.';
  if (response.status === 403 && normalizedDetail.includes('signup')) {
    return 'Public signup is currently disabled. CarbonLite pilot access is invite-only.';
  }
  if (normalizedDetail.includes('disabled')) {
    return 'This account is disabled. Please contact the CarbonLite team for access.';
  }
  if (response.status === 409 || normalizedDetail.includes('already')) {
    return 'Email already registered. Please log in instead.';
  }
  if (normalizedDetail.includes('invalid') || normalizedDetail.includes('password')) {
    return 'Invalid login. Please check your email and password.';
  }
  if (response.status >= 500) return 'Unable to connect to the server. Please check your connection and try again.';
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
    throw new Error('Unable to connect to the server. Please check your connection and try again.');
  }

  if (!response.ok) {
    const detail = await response.text();

    throw new Error(
      getFriendlyAuthError(
        response,
        path.includes('register')
          ? 'Registration failed. Please try again.'
          : 'Invalid login. Please check your email and password.',
        detail,
      ),
    );
  }

  const data = (await response.json()) as AuthResponse;

  if (!data.accessToken) {
    throw new Error('Something went wrong. Please try again. If the issue continues, contact support.');
  }

  if (data.user?.status && String(data.user.status).toUpperCase() === 'DISABLED') {
    throw new Error('This account is disabled. Please contact the CarbonLite team for access.');
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
    throw new Error('Unable to connect to the server. Please check your connection and try again.');
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

export function getUserRole(user: AuthUser | null) {
  if (!user) return 'VIEWER';

  const role = String(user.role ?? 'MEMBER').toUpperCase();
  if (role === 'REVIEWER') return 'VIEWER';
  if (role === 'USER') return 'MEMBER';
  if (role === 'OWNER' || role === 'ADMIN' || role === 'MEMBER' || role === 'VIEWER') {
    return role;
  }
  return 'MEMBER';
}

export function isAdminUser(user: AuthUser | null) {
  if (isPilotReviewer(user)) return false;
  return getUserRole(user) === 'ADMIN';
}

export function isAdminOrOwnerUser(user: AuthUser | null) {
  if (isPilotReviewer(user)) return false;
  const role = getUserRole(user);
  return role === 'ADMIN' || role === 'OWNER';
}

function hasCompanyContext(user: AuthUser | null) {
  return Boolean(user && getOrganizationId(user));
}

export function canManageActivityRecords(user: AuthUser | null) {
  if (!hasCompanyContext(user)) return false;
  if (isPilotReviewer(user)) return false;

  const role = getUserRole(user);
  return role === 'OWNER' || role === 'ADMIN' || role === 'MEMBER';
}

export function canImportActivityRecords(user: AuthUser | null) {
  return canManageActivityRecords(user);
}

export function canClearActivityRecords(user: AuthUser | null) {
  if (!hasCompanyContext(user)) return false;
  if (isPilotReviewer(user)) return false;

  return isAdminOrOwnerUser(user);
}

export function canManageConversionFactors(user: AuthUser | null) {
  if (!hasCompanyContext(user)) return false;
  if (isPilotReviewer(user)) return false;

  return isAdminOrOwnerUser(user);
}

export function isReadOnlyUser(user: AuthUser | null) {
  return getUserRole(user) === 'VIEWER' || isPilotReviewer(user);
}

export function requirePermission(allowed: boolean) {
  if (!allowed) {
    throw new Error('You do not have permission to perform this action.');
  }
}
