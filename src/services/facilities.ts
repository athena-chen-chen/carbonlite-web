import { apiFetch } from './api';

export type FacilityItem = {
  id: string;
  name: string;
  country?: string | null;
  provinceState?: string | null;
  city?: string | null;
};

export function getFacilities() {
  return apiFetch<FacilityItem[]>('/facilities');
}
