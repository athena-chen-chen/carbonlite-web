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
      enabled: boolean;
      periodDays: number;
      uploadLimit: number;
      dailyUploadLimit: number;
      maxFileSizeBytes: number;
      maxConcurrentExtractions: number;
      maxImportRows: number;
    } | null;
    aiAuthorization?: {
      status: string;
      provider: string;
      processingScope: string;
      consentVersion: string;
      effectiveAt: string | null;
      expiresAt: string | null;
      withdrawnAt: string | null;
      authorizedDataMode?: 'SYNTHETIC_TEST_ONLY' | 'REAL_CUSTOMER_DATA';
      realDataApprovalRevision?: number | null;
    } | null;
    realDataAuthorization?: {
      configuredStatus: 'SYNTHETIC_ONLY' | 'REAL_DATA_APPROVED' | 'WITHDRAWN';
      approvalRevision: number;
      policyVersion: string;
      effectiveAt: string;
      expiresAt: string | null;
      reviewDueAt: string | null;
      withdrawnAt: string | null;
      evidenceReferencesPresent: boolean;
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

export type OrganizationErasureInventory = {
  organizationId: string;
  organizationSlug: string;
  users: number;
  memberships: number;
  facilities: number;
  assets: number;
  documents: number;
  physicalFiles: number;
  documentExtractions: number;
  spreadsheetReviewRows: number;
  activityRecords: number;
  calculationSnapshots: number;
  importBatches: number;
  metricResults: number;
  reports: number;
  reportArtifacts: number;
  aiJobs: number;
  customConversionFactors: number;
  auditLogs: number;
  feedback: number;
  activityEvents: number;
  quotaPolicies: number;
  quotaPeriods: number;
  quotaUsages: number;
  aiAuthorizations: number;
  realDataAuthorizations: number;
};

export type OrganizationQuotaInput = {
  enabled: boolean;
  periodDays: number;
  uploadLimit: number;
  dailyUploadLimit: number;
  maxFileSizeBytes: number;
  maxConcurrentExtractions: number;
  maxImportRows: number;
};

export type OrganizationAiAuthorization = {
  organizationId: string;
  status: 'DISABLED' | 'ENABLED' | 'WITHDRAWN';
  consentVersion: string;
  provider: 'OPENAI';
  processingScope: 'DOCUMENT_EXTRACTION';
  effectiveAt: string;
  expiresAt: string | null;
  withdrawnAt: string | null;
  authorizedDataMode: 'SYNTHETIC_TEST_ONLY' | 'REAL_CUSTOMER_DATA';
  realDataApprovalRevision: number | null;
};

export type OrganizationRealDataAuthorization = {
  organizationId: string;
  decisionId: string;
  status: 'SYNTHETIC_ONLY' | 'REAL_DATA_APPROVED' | 'WITHDRAWN';
  approvalRevision: number;
  policyVersion: string;
  effectiveAt: string;
  expiresAt: string | null;
  reviewDueAt: string | null;
  withdrawnAt: string | null;
};

export type OrganizationErasureDryRunResponse = {
  status: 'DRY_RUN';
  inventory: OrganizationErasureInventory;
  dataDeleted: false;
};

export type OrganizationErasureResponse =
  | {
      status: 'ERASED';
      organizationIdHash: string;
      inventory: OrganizationErasureInventory;
      deletedPhysicalFiles: number;
      alreadyMissingPhysicalFiles: number;
    }
  | {
      status: 'ALREADY_ERASED';
      organizationIdHash: string;
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

export function runOrganizationErasureDryRun(organizationId: string) {
  requirePlatformAdmin();
  return apiFetch<OrganizationErasureDryRunResponse>(
    '/admin/workspace-erasure/dry-run',
    {
      method: 'POST',
      body: JSON.stringify({ organizationId }),
    },
  );
}

export function eraseOrganization(input: {
  organizationId: string;
  organizationSlug: string;
}) {
  requirePlatformAdmin();
  return apiFetch<OrganizationErasureResponse>(
    '/admin/workspace-erasure/erase',
    {
      method: 'POST',
      body: JSON.stringify({
        organizationId: input.organizationId,
        confirmationOrganizationId: input.organizationId,
        confirmationOrganizationSlug: input.organizationSlug,
        confirmErase: true,
      }),
    },
  );
}

export function configureOrganizationQuota(
  organizationId: string,
  input: OrganizationQuotaInput,
) {
  requirePlatformAdmin();
  return apiFetch<OrganizationQuotaInput & { organizationId: string }>(
    `/admin/organization-quotas/${encodeURIComponent(organizationId)}`,
    { method: 'PUT', body: JSON.stringify(input) },
  );
}

export function authorizeOrganizationAi(input: {
  organizationId: string;
  consentVersion: string;
  evidenceReference: string;
  authorizedRepresentativeReference: string;
  effectiveAt: string;
  expiresAt?: string;
  authorizedDataMode?: 'SYNTHETIC_TEST_ONLY' | 'REAL_CUSTOMER_DATA';
  realDataApprovalRevision?: number;
}) {
  requirePlatformAdmin();
  return apiFetch<OrganizationAiAuthorization>(
    `/admin/organizations/${encodeURIComponent(input.organizationId)}/ai-authorization`,
    {
      method: 'PUT',
      body: JSON.stringify({
        status: 'ENABLED',
        consentVersion: input.consentVersion,
        provider: 'OPENAI',
        processingScope: 'DOCUMENT_EXTRACTION',
        evidenceReference: input.evidenceReference,
        authorizedRepresentativeReference: input.authorizedRepresentativeReference,
        effectiveAt: input.effectiveAt,
        ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
        authorizedDataMode: input.authorizedDataMode ?? 'SYNTHETIC_TEST_ONLY',
        ...(input.realDataApprovalRevision
          ? { realDataApprovalRevision: input.realDataApprovalRevision }
          : {}),
      }),
    },
  );
}

export function approveOrganizationRealData(input: {
  organizationId: string;
  organizationSlug: string;
  policyVersion: string;
  agreementEvidenceReference: string;
  allowedDataScopeReference: string;
  privacySecurityReadinessReference: string;
  effectiveAt: string;
  expiresAt?: string;
  reviewDueAt?: string;
}) {
  requirePlatformAdmin();
  return apiFetch<{ result: 'APPROVED' | 'ALREADY_APPROVED'; authorization: OrganizationRealDataAuthorization }>(
    `/admin/organizations/${encodeURIComponent(input.organizationId)}/real-data-authorization`,
    {
      method: 'PUT',
      body: JSON.stringify({
        organizationId: input.organizationId,
        confirmationOrganizationId: input.organizationId,
        confirmationOrganizationSlug: input.organizationSlug,
        confirmRealDataApproval: true,
        policyVersion: input.policyVersion,
        agreementEvidenceReference: input.agreementEvidenceReference,
        allowedDataScopeReference: input.allowedDataScopeReference,
        privacySecurityReadinessReference: input.privacySecurityReadinessReference,
        effectiveAt: input.effectiveAt,
        ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
        ...(input.reviewDueAt ? { reviewDueAt: input.reviewDueAt } : {}),
      }),
    },
  );
}

export function withdrawOrganizationRealData(input: {
  organizationId: string;
  organizationSlug: string;
  withdrawalReason: string;
}) {
  requirePlatformAdmin();
  return apiFetch<{ result: 'WITHDRAWN' | 'ALREADY_WITHDRAWN'; authorization: OrganizationRealDataAuthorization }>(
    `/admin/organizations/${encodeURIComponent(input.organizationId)}/real-data-authorization/withdraw`,
    {
      method: 'POST',
      body: JSON.stringify({
        organizationId: input.organizationId,
        confirmationOrganizationId: input.organizationId,
        confirmationOrganizationSlug: input.organizationSlug,
        confirmWithdrawal: true,
        withdrawalReason: input.withdrawalReason,
      }),
    },
  );
}

export function withdrawOrganizationAi(input: {
  organizationId: string;
  withdrawalReference: string;
}) {
  requirePlatformAdmin();
  return apiFetch<OrganizationAiAuthorization>(
    `/admin/organizations/${encodeURIComponent(input.organizationId)}/ai-authorization/withdraw`,
    {
      method: 'POST',
      body: JSON.stringify({ withdrawalReference: input.withdrawalReference }),
    },
  );
}

function requirePlatformAdmin() {
  requirePermission(isPlatformAdmin(getCurrentUser()));
}
