import { getAccountType } from './permissions';
import { normalizeProvince as normalizeCanadianProvince } from './province';

export type ActivityRecordLike = {
  id?: string | number | null;
  organizationId?: string | null;
  activityType?: string | null;
  jurisdictionRegion?: string | null;
  province?: string | null;
};

export function normalizeActivityType(value: unknown) {
  const normalized = String(value ?? '').trim().toLowerCase();

  if (!normalized) return '';
  if (['electricity', 'electric', 'power'].includes(normalized)) {
    return 'ELECTRICITY';
  }

  return normalized.toUpperCase().replace(/[\s-]+/g, '_');
}

export function isElectricityActivityType(value: unknown) {
  return normalizeActivityType(value) === 'ELECTRICITY';
}

export function isElectricityRecord(record: Pick<ActivityRecordLike, 'activityType'>) {
  return isElectricityActivityType(record.activityType);
}

export function isMissingProvince(value: unknown) {
  const normalized = String(value ?? '').trim().toLowerCase();

  return (
    normalized === '' ||
    normalized === 'null' ||
    normalized === 'undefined' ||
    normalized === '-' ||
    normalized === '—' ||
    normalized === 'missing' ||
    normalized === 'missing province' ||
    normalized === 'unknown' ||
    normalized === 'not specified' ||
    normalized === 'province required' ||
    normalized === 'required' ||
    normalized === 'n/a' ||
    normalized === 'na' ||
    normalized === 'none'
  );
}

const PROVINCE_CODE_MAP: Record<string, string> = {
  alberta: 'AB',
  ab: 'AB',
  'british columbia': 'BC',
  bc: 'BC',
  ontario: 'ON',
  on: 'ON',
  saskatchewan: 'SK',
  sk: 'SK',
  manitoba: 'MB',
  mb: 'MB',
  quebec: 'QC',
  québec: 'QC',
  qc: 'QC',
  'nova scotia': 'NS',
  ns: 'NS',
  'new brunswick': 'NB',
  nb: 'NB',
  'newfoundland and labrador': 'NL',
  nl: 'NL',
  'prince edward island': 'PE',
  pei: 'PE',
  pe: 'PE',
  'northwest territories': 'NT',
  nt: 'NT',
  yukon: 'YT',
  yt: 'YT',
  nunavut: 'NU',
  nu: 'NU',
};

export function normalizeProvince(value: unknown) {
  const cleanValue = String(value ?? '').trim();
  const normalizedName = normalizeCanadianProvince(cleanValue);
  const normalized = String(normalizedName ?? cleanValue).trim().toLowerCase();

  return PROVINCE_CODE_MAP[normalized] ?? null;
}

export function normalizeProvinceForStorage(value: unknown) {
  return normalizeCanadianProvince(String(value ?? '').trim()) ?? '';
}

export function getRecordProvinceValue(record: Pick<ActivityRecordLike, 'jurisdictionRegion' | 'province'>) {
  return record.jurisdictionRegion ?? record.province ?? null;
}

export function getSetProvinceEligibleRecords<T extends ActivityRecordLike>(
  selectedRecords: T[],
  options: { canEdit: boolean; organizationId?: string | null } = { canEdit: true },
) {
  if (!options.canEdit) return [];

  const organizationId = String(options.organizationId ?? '').trim();

  return selectedRecords.filter((record) => {
    if (!record.id) return false;
    if (organizationId && record.organizationId && record.organizationId !== organizationId) {
      return false;
    }

    return isElectricityRecord(record);
  });
}

export function getMissingProvinceElectricityRecords<T extends ActivityRecordLike>(
  selectedRecords: T[],
  options: { canEdit: boolean; organizationId?: string | null } = { canEdit: true },
) {
  return getSetProvinceEligibleRecords(selectedRecords, options).filter((record) =>
    isMissingProvince(getRecordProvinceValue(record)),
  );
}

export function getSetProvinceDisabledReason(input: {
  canEdit: boolean;
  selectedCount: number;
  eligibleCount: number;
  selectedProvince?: string | null;
  isPilotReviewer?: boolean;
  isUpdating?: boolean;
  user?: {
    accountType?: string | null;
    account_type?: string | null;
    role?: string | null;
    organizationId?: string | null;
    companyId?: string | null;
    company_id?: string | null;
    workspaceId?: string | null;
    workspace_id?: string | null;
    tenantId?: string | null;
    tenant_id?: string | null;
    organization?: { id?: string | null } | null;
    company?: { id?: string | null } | null;
    workspace?: { id?: string | null } | null;
  } | null;
}) {
  const isPilotReviewer = input.isPilotReviewer ?? getAccountType(input.user as any) === 'PILOT_REVIEWER';

  if (isPilotReviewer) {
    return 'Pilot review accounts cannot edit draft rows.';
  }

  if (input.isUpdating) return 'Setting province...';
  if (!input.canEdit) {
    if (!hasSetProvinceCompanyContext(input.user)) {
      return 'Your account is not connected to a workspace.';
    }

    const role = String(input.user?.role ?? '').trim().toUpperCase();
    if (role === 'VIEWER' || role === 'REVIEWER') {
      return 'Your current role does not allow setting province.';
    }

    return 'This account has read-only access.';
  }
  if (input.selectedCount === 0) return 'No records selected.';
  if (input.eligibleCount === 0) return 'No selected electricity records.';
  if (!normalizeProvince(input.selectedProvince)) return 'Select a province before applying.';

  return null;
}

function hasSetProvinceCompanyContext(input: {
  organizationId?: string | null;
  companyId?: string | null;
  company_id?: string | null;
  workspaceId?: string | null;
  workspace_id?: string | null;
  tenantId?: string | null;
  tenant_id?: string | null;
  organization?: { id?: string | null } | null;
  company?: { id?: string | null } | null;
  workspace?: { id?: string | null } | null;
} | null | undefined) {
  return Boolean(
    input?.organizationId ||
      input?.organization?.id ||
      input?.companyId ||
      input?.company_id ||
      input?.company?.id ||
      input?.workspaceId ||
      input?.workspace_id ||
      input?.workspace?.id ||
      input?.tenantId ||
      input?.tenant_id,
  );
}
