import { buildApiUrl } from '../config/api';
import { isDemoMode } from '../demo/demoData';

const TOKEN_KEY = 'accessToken';
const USER_KEY = 'currentUser';

export type AuthUser = {
  id?: string;
  email: string;
  organizationName?: string;
  organization?: {
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
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
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
  if (isDemoMode()) return 'demo-token';
  return localStorage.getItem(TOKEN_KEY);
}

export function getCurrentUser(): AuthUser | null {
  if (isDemoMode()) {
    return {
      id: 'demo-user',
      email: 'pilot@carbonlite.ai',
      name: 'Pilot Reviewer',
      organizationName: 'KACH Canada Demo',
    };
  }

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

export function getUserDisplayName(user: AuthUser | null) {
  return user?.name || user?.email || '';
}
