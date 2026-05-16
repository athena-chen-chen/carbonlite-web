import axios from 'axios';
import { handleUnauthorized } from './auth';
import { API_BASE_URL } from '../config/api';

const TOKEN_KEY = 'accessToken';
const USER_KEY = 'currentUser';

// helpers to read/write auth data
export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setAuthToken(t: string | null) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}
export function getAuthUser(): any | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
export function setAuthUser(u: any | null) {
  if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
  else localStorage.removeItem(USER_KEY);
}

// create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  timeout: 15000,
});

// request: attach Authorization
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    (config.headers ||= {})['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// response: handle 401 globally (token expired etc.)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      handleUnauthorized();
    }
    return Promise.reject(err);
  }
);
