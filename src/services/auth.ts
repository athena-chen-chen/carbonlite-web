import { buildApiUrl } from '../config/api';

const TOKEN_KEY = 'accessToken';
const USER_KEY = 'currentUser';

export type AuthUser = {
  id?: string;
  email: string;
  role?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | 'USER';
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

function saveSession(response: AuthResponse, fallbackEmail: string) {
  localStorage.setItem(TOKEN_KEY, response.accessToken);
  localStorage.setItem(
    USER_KEY,
    JSON.stringify(response.user ?? { email: fallbackEmail }),
  );
}

function getFriendlyAuthError(response: Response, fallback: string, detail: string) {
  const normalizedDetail = detail.toLowerCase();

  if (response.status === 401) return 'Invalid login. Please check your email and password.';
  if (response.status === 409 || normalizedDetail.includes('already')) {
    return 'Email already registered. Please log in instead.';
  }
  if (normalizedDetail.includes('invalid') || normalizedDetail.includes('password')) {
    return 'Invalid login. Please check your email and password.';
  }
  if (response.status >= 500) return 'Backend unavailable. Please try again later.';
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
    throw new Error('Backend unavailable. Please try again later.');
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
    throw new Error('Backend unavailable. Please try again later.');
  }

  saveSession(data, body.email);
  return data;
}

export async function register(input: RegisterInput) {
  return authRequest('/auth/register', input);
}

export async function login(input: LoginInput) {
  return authRequest('/auth/login', input);
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
    'Session expired. Please log in again.',
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
  const role = String(user?.role ?? 'MEMBER').toUpperCase();
  if (role === 'USER') return 'MEMBER';
  if (role === 'OWNER' || role === 'ADMIN' || role === 'MEMBER' || role === 'VIEWER') {
    return role;
  }
  return 'MEMBER';
}

export function isAdminUser(user: AuthUser | null) {
  return getUserRole(user) === 'ADMIN';
}

export function isAdminOrOwnerUser(user: AuthUser | null) {
  const role = getUserRole(user);
  return role === 'ADMIN' || role === 'OWNER';
}

export function canManageActivityRecords(user: AuthUser | null) {
  const role = getUserRole(user);
  return role === 'OWNER' || role === 'ADMIN' || role === 'MEMBER';
}

export function canImportActivityRecords(user: AuthUser | null) {
  return canManageActivityRecords(user);
}

export function canClearActivityRecords(user: AuthUser | null) {
  return isAdminOrOwnerUser(user);
}

export function canManageConversionFactors(user: AuthUser | null) {
  return isAdminOrOwnerUser(user);
}

export function isReadOnlyUser(user: AuthUser | null) {
  return getUserRole(user) === 'VIEWER';
}

export function requirePermission(allowed: boolean) {
  if (!allowed) {
    throw new Error('You do not have permission to perform this action.');
  }
}
