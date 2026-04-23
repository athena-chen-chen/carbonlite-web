import axios from 'axios';

import { API_BASE_URL } from './runtime';
export const api = axios.create({ baseURL: API_BASE_URL });

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


