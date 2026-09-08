import { apiFetch } from './api';
import { isAdminUser, requirePermission } from '../utils/permissions';
import { getCurrentUser } from './auth';

export const PILOT_REVIEWER_EMAIL_VALIDATION_MESSAGE =
  'Please enter a valid email address, for example name@example.com.';

export type CreatePilotReviewerInput = {
  name: string;
  email: string;
  workspaceName: string;
  expiresAt?: string;
};

export type CreatePilotReviewerResponse = {
  id?: string;
  name?: string;
  email: string;
  workspaceName?: string;
  workspace?: string;
  role?: string;
  accountType?: string;
  expiresAt?: string | null;
  expires?: string | null;
  status?: 'Active' | 'Deactivated' | 'Expired' | string;
  inviteLink?: string;
  setupUrl?: string;
  inviteUrl?: string;
  temporaryPassword?: string;
  message?: string;
};

export type DeactivatePilotReviewerResponse = {
  success: boolean;
  message: string;
  pilotReviewer?: {
    name?: string;
    email: string;
    workspaceName?: string;
    accountType?: string;
    role?: string;
    expiresAt?: string | null;
    status?: 'Active' | 'Deactivated' | 'Expired' | string;
  };
};

export type RegeneratePilotReviewerInviteResponse = Partial<CreatePilotReviewerResponse> & {
  success?: boolean;
  pilotReviewer?: DeactivatePilotReviewerResponse['pilotReviewer'];
};

export function normalizePilotReviewerEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (
    /[\[\]()"']|mailto:/i.test(normalized) ||
    !/^[^\s@()[\]"']+@[^\s@()[\]"']+\.[^\s@()[\]"']+$/.test(normalized) ||
    isKnownEmailDomainTypo(normalized)
  ) {
    throw new Error(PILOT_REVIEWER_EMAIL_VALIDATION_MESSAGE);
  }

  return normalized;
}

function isKnownEmailDomainTypo(email: string) {
  const domain = email.split('@')[1] ?? '';
  return ['gamil.com', 'gmai.com', 'gmial.com'].includes(domain);
}

export function createPilotReviewer(input: CreatePilotReviewerInput) {
  requirePermission(isAdminUser(getCurrentUser()));
  const email = normalizePilotReviewerEmail(input.email);

  return apiFetch<CreatePilotReviewerResponse>('/admin/pilot-reviewers', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name.trim(),
      email,
      workspace: input.workspaceName.trim() || 'CarbonLite Sample Workspace',
      workspaceName: input.workspaceName.trim() || 'CarbonLite Sample Workspace',
      expires: input.expiresAt || undefined,
      expiresAt: input.expiresAt || undefined,
      role: 'REVIEWER',
      accountType: 'PILOT_REVIEWER',
      invite: {
        delivery: 'SETUP_LINK',
        sendEmail: true,
        tokenExpiresHours: 72,
        passwordResetRequired: true,
      },
      accessScope: 'SAMPLE_WORKSPACE_ONLY',
      permissions: {
        canViewSampleData: true,
        canViewReports: true,
        canDownloadSampleExports: true,
        canSubmitFeedback: true,
        canUpload: false,
        canImport: false,
        canEditRecords: false,
        canDeleteRecords: false,
        canResetDemoData: false,
        canEditFactors: false,
        canManageUsers: false,
        canAccessAdminDashboard: false,
      },
    }),
  });
}

export function deactivatePilotReviewer(emailInput: string) {
  requirePermission(isAdminUser(getCurrentUser()));
  const email = normalizePilotReviewerEmail(emailInput);

  return apiFetch<DeactivatePilotReviewerResponse>('/admin/pilot-reviewers/deactivate', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function regeneratePilotReviewerInvite(emailInput: string) {
  requirePermission(isAdminUser(getCurrentUser()));
  const email = normalizePilotReviewerEmail(emailInput);

  return apiFetch<RegeneratePilotReviewerInviteResponse>(
    '/admin/pilot-reviewers/regenerate-invite',
    {
      method: 'POST',
      body: JSON.stringify({ email }),
    },
  );
}
