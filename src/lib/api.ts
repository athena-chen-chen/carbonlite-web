import axios from 'axios';

import { API_BASE_URL } from './runtime';
import { getToken, handleUnauthorized } from '../services/auth';

export const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      handleUnauthorized();
    }

    return Promise.reject(error);
  },
);

//const RUNTIME_KEY = 'cl_runtime_v1';
// function getBaseURL() {
//   try {
//     const raw = localStorage.getItem(RUNTIME_KEY);
//     const cfg = raw ? JSON.parse(raw) : { apiBaseUrl: '/api' };
//     return cfg.apiBaseUrl || '/api';
//   } catch {
//     return '/api';
//   }
// }
