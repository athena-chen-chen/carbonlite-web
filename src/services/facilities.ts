import { apiFetch } from './api';
import { getCurrentUser, getOrganizationId } from './auth';

export type FacilityItem = {
  id: string;
  organizationId?: string | null;
  name: string;
  country?: string | null;
  provinceState?: string | null;
  city?: string | null;
};

export async function getFacilities() {
  const items = await apiFetch<FacilityItem[]>('/facilities');
  const organizationId = getOrganizationId(getCurrentUser());

  if (!organizationId) return items;

  return items.filter((item) => !item.organizationId || item.organizationId === organizationId);
}
