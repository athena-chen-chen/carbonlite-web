
import { api } from './http';
import { clampApiPageSize } from '../config/api';

export interface Emission {
  id: string;
  date: string; // ISO string
  scope: string;
  category: string;
  activity: string;
  amount: number;
  unit: string;
  factor: number;
  co2e: number;
  notes?: string | null;
  factorId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type EmissionsListResult = Paged<Emission> | Emission[];

export type EmissionListParams = Partial<{
  page: number;
  pageSize: number;
  q: string;
  from: string;             // YYYY-MM-DD or ISO
  to: string;               // YYYY-MM-DD or ISO
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}>;

export type CreateEmissionInput = {
  date: string;             // e.g. "2025-10-11"
  scope: string;
  category: string;
  activity: string;
  amount: number;
  unit: string;
  factor: number;
  notes?: string;
  factorId?: string;
};

export type UpdateEmissionInput = Partial<CreateEmissionInput>;

/** GET /api/emissions */
export async function listEmissions(params: EmissionListParams = {}): Promise<EmissionsListResult> {
  const safeParams = {
    ...params,
    ...(params.pageSize
      ? { pageSize: clampApiPageSize(params.pageSize) }
      : {}),
  };
  const { data } = await api.get('/emissions', { params: safeParams });
  return data as EmissionsListResult;
}

/** POST /api/emissions */
export async function createEmission(input: CreateEmissionInput): Promise<Emission> {
  const { data } = await api.post('/emissions', input);
  return data as Emission;
}

/** PUT /api/emissions/:id */
export async function updateEmission(id: string, input: UpdateEmissionInput): Promise<Emission> {
  const { data } = await api.put(`/emissions/${id}`, input);
  return data as Emission;
}

/** DELETE /api/emissions/:id */
export async function deleteEmission(id: string): Promise<{ id: string } | Emission> {
  const { data } = await api.delete(`/emissions/${id}`);
  return data;
}
