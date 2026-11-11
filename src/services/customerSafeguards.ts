import { apiFetch } from './api';
import { getCurrentUser } from './auth';
import { normalizePilotReviewerEmail } from './pilotReviewers';
import { isPlatformAdmin, requirePermission } from '../utils/permissions';

export type CustomerPreflightLookup = {
  email?: string;
  organizationName?: string;
};

export type CustomerPreflightResponse = {
  lookup: {
    normalizedEmail: string | null;
    organizationName: string | null;
  };
  user: {
    exists: boolean;
    id?: string;
    normalizedEmail: string | null;
    platformRole?: string;
    accountType?: string;
    isActive?: boolean;
    passwordSetupRequired?: boolean;
    invitationStatus?: string;
    organizationId?: string | null;
    membershipRole?: string | null;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    customerStatus: string;
    provisionedAt: string | null;
    isActive: boolean;
    allowDemoFactorsForCalculations: boolean;
    counts: {
      activityData: number;
      reports: number;
      documents: number;
      goldenSampleArtifacts: number;
      memberships: number;
    };
    quota?: {
      enabled?: boolean;
      periodDays?: number;
      uploadLimit?: number;
      dailyUploadLimit?: number;
      maxFileSize?: number;
      extractionConcurrency?: number;
      importRowLimit?: number;
    } | null;
    aiAuthorization?: {
      status?: string;
      provider?: string;
      processingScope?: string;
      effectiveDate?: string | null;
      expiry?: string | null;
      withdrawnDate?: string | null;
    } | null;
  } | null;
};

export type SuspendCustomerOrganizationResponse = {
  organizationId: string;
  status: 'SUSPENDED' | 'ALREADY_SUSPENDED';
  suspended: boolean;
};

export type ProvisionPaidPilotCustomerResponse = {
  organizationId: string;
  status: 'PROVISIONED' | 'ALREADY_PROVISIONED';
  primaryAdminUserId: string;
  provisionedAt: string;
  alreadyProvisioned?: boolean;
};

export function getCustomerPreflight(input: CustomerPreflightLookup) {
  requirePlatformAdmin();
  const email = input.email?.trim()
    ? normalizePilotReviewerEmail(input.email)
    : '';
  const organizationName = input.organizationName?.trim() ?? '';
  if (!email && !organizationName) {
    throw new Error('Enter an email or organization name to run preflight.');
  }

  const query = new URLSearchParams();
  if (email) query.set('email', email);
  if (organizationName) query.set('organizationName', organizationName);
  return apiFetch<CustomerPreflightResponse>(
    `/admin/customer-provisioning/preflight?${query.toString()}`,
  );
}

export function suspendCustomerOrganization(input: {
  organizationId: string;
  organizationSlug: string;
}) {
  requirePlatformAdmin();
  return apiFetch<SuspendCustomerOrganizationResponse>(
    '/admin/customer-provisioning/suspend',
    {
      method: 'POST',
      body: JSON.stringify({
        organizationId: input.organizationId,
        confirmationOrganizationId: input.organizationId,
        confirmationOrganizationSlug: input.organizationSlug,
        confirmSuspend: true,
      }),
    },
  );
}

export function provisionPaidPilotCustomer(input: {
  organizationId: string;
  organizationSlug: string;
  primaryAdminUserId: string;
}) {
  requirePlatformAdmin();
  return apiFetch<ProvisionPaidPilotCustomerResponse>(
    '/admin/customer-provisioning/paid-pilot',
    {
      method: 'POST',
      body: JSON.stringify({
        organizationId: input.organizationId,
        confirmationOrganizationId: input.organizationId,
        confirmationOrganizationSlug: input.organizationSlug,
        primaryAdminUserId: input.primaryAdminUserId,
        confirmProvision: true,
      }),
    },
  );
}

function requirePlatformAdmin() {
  requirePermission(isPlatformAdmin(getCurrentUser()));
}
