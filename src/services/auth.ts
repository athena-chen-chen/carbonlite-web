import { api, setAuthToken, setAuthUser } from './http';

export type LoginResponse = {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name?: string;
    role?: string;
  };
};

// call backend /auth/login
export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
  return data;
}

// call backend /auth/me to verify token
export async function fetchMe(): Promise<LoginResponse['user'] | null> {
  const { data } = await api.get('/auth/me');
  // your /auth/me returns just user info, not wrapped in {user:...}
  return data;
}

// high-level login: set localStorage
export async function performLogin(email: string, password: string) {
  const res = await loginRequest(email, password);
  setAuthToken(res.accessToken);
  setAuthUser(res.user);
  return res.user;
}

// logout: clear local state
export function performLogout() {
  setAuthToken(null);
  setAuthUser(null);
}
