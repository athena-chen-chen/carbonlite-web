import { apiFetch } from './api';
import { isPlatformAdmin, requirePermission } from '../utils/permissions';
import { getCurrentUser } from './auth';

export const PILOT_REVIEWER_EMAIL_VALIDATION_MESSAGE =
  'Please enter a valid email address, for example name@example.com.';

export type InvitationPurpose = 'CUSTOMER' | 'DEMO';

export type CreatePilotReviewerInput = {
  name: string;
  email: string;
  workspaceName: string;
  invitationPurpose: InvitationPurpose;
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
  invitationPurpose?: InvitationPurpose;
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
  requirePermission(isPlatformAdmin(getCurrentUser()));
  if (input.invitationPurpose !== 'CUSTOMER' && input.invitationPurpose !== 'DEMO') {
    throw new Error('Choose Customer or Demo before creating the invitation.');
  }
  const email = normalizePilotReviewerEmail(input.email);

  return apiFetch<CreatePilotReviewerResponse>('/admin/pilot-reviewers', {
    method: 'POST',
    body: JSON.stringify({
      invitationPurpose: input.invitationPurpose,
      name: input.name.trim(),
      email,
      workspaceName: input.workspaceName.trim() || 'CarbonLite Sample Workspace',
      expiresAt: input.expiresAt || undefined,
    }),
  });
}

export function deactivatePilotReviewer(emailInput: string) {
  requirePermission(isPlatformAdmin(getCurrentUser()));
  const email = normalizePilotReviewerEmail(emailInput);

  return apiFetch<DeactivatePilotReviewerResponse>('/admin/pilot-reviewers/deactivate', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function regeneratePilotReviewerInvite(emailInput: string) {
  requirePermission(isPlatformAdmin(getCurrentUser()));
  const email = normalizePilotReviewerEmail(emailInput);

  return apiFetch<RegeneratePilotReviewerInviteResponse>(
    '/admin/pilot-reviewers/regenerate-invite',
    {
      method: 'POST',
      body: JSON.stringify({ email }),
    },
  );
}
