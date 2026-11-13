import { FormEvent, useMemo, useRef, useState } from 'react';
import {
  authorizeOrganizationAi,
  approveOrganizationRealData,
  configureOrganizationQuota,
  eraseOrganization,
  getCustomerPreflight,
  provisionPaidPilotCustomer,
  runOrganizationErasureDryRun,
  suspendCustomerOrganization,
  withdrawOrganizationAi,
  withdrawOrganizationRealData,
  type CustomerPreflightResponse,
  type OrganizationErasureDryRunResponse,
  type OrganizationErasureResponse,
  type OrganizationErasureInventory,
  type ProvisionPaidPilotCustomerResponse,
  type SuspendCustomerOrganizationResponse,
  type OrganizationQuotaInput,
} from '../services/customerSafeguards';
import {
  createPilotReviewer,
  deactivatePilotReviewer,
  normalizePilotReviewerEmail,
  regeneratePilotReviewerInvite,
  type CreatePilotReviewerResponse,
  type DeactivatePilotReviewerResponse,
  type InvitationPurpose,
  type RegeneratePilotReviewerInviteResponse,
} from '../services/pilotReviewers';
import { getUserFriendlyErrorMessage } from '../utils/userFriendlyErrors';

const DEFAULT_WORKSPACE = 'CarbonLite Sample Workspace';
const APPROVED_SYNTHETIC_PILOT_QUOTA: OrganizationQuotaInput = {
  enabled: true,
  periodDays: 28,
  uploadLimit: 20,
  dailyUploadLimit: 3,
  maxFileSizeBytes: 10_485_760,
  maxConcurrentExtractions: 1,
  maxImportRows: 500,
};
const EMPTY_QUOTA_DRAFT: OrganizationQuotaInput = {
  enabled: false,
  periodDays: 0,
  uploadLimit: 0,
  dailyUploadLimit: 0,
  maxFileSizeBytes: 0,
  maxConcurrentExtractions: 0,
  maxImportRows: 0,
};

export default function PilotReviewersPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [invitationPurpose, setInvitationPurpose] = useState<InvitationPurpose | ''>('');
  const [expiresAt, setExpiresAt] = useState('');
  const [result, setResult] = useState<CreatePilotReviewerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deactivateEmail, setDeactivateEmail] = useState('');
  const [deactivateResult, setDeactivateResult] =
    useState<DeactivatePilotReviewerResponse | null>(null);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [regenerateEmail, setRegenerateEmail] = useState('');
  const [regenerateResult, setRegenerateResult] =
    useState<RegeneratePilotReviewerInviteResponse | null>(null);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [preflightEmail, setPreflightEmail] = useState('');
  const [preflightOrganizationName, setPreflightOrganizationName] = useState('');
  const [preflightResult, setPreflightResult] =
    useState<CustomerPreflightResponse | null>(null);
  const [preflightError, setPreflightError] = useState<string | null>(null);
  const [runningPreflight, setRunningPreflight] = useState(false);
  const [provisionSlugConfirmation, setProvisionSlugConfirmation] = useState('');
  const [provisionResult, setProvisionResult] =
    useState<ProvisionPaidPilotCustomerResponse | null>(null);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [provisioning, setProvisioning] = useState(false);
  const [slugConfirmation, setSlugConfirmation] = useState('');
  const [suspensionResult, setSuspensionResult] =
    useState<SuspendCustomerOrganizationResponse | null>(null);
  const [suspensionError, setSuspensionError] = useState<string | null>(null);
  const [suspending, setSuspending] = useState(false);
  const [erasureSlugConfirmation, setErasureSlugConfirmation] = useState('');
  const [erasureDryRunResult, setErasureDryRunResult] =
    useState<OrganizationErasureDryRunResponse | null>(null);
  const [erasureDryRunError, setErasureDryRunError] = useState<string | null>(null);
  const [runningErasureDryRun, setRunningErasureDryRun] = useState(false);
  const [eraseSlugConfirmation, setEraseSlugConfirmation] = useState('');
  const [erasePhraseConfirmation, setErasePhraseConfirmation] = useState('');
  const [erasureResult, setErasureResult] =
    useState<OrganizationErasureResponse | null>(null);
  const [erasureError, setErasureError] = useState<string | null>(null);
  const [erasureVerification, setErasureVerification] = useState<string | null>(null);
  const [erasingOrganization, setErasingOrganization] = useState(false);
  const [quotaDraft, setQuotaDraft] = useState<OrganizationQuotaInput>(EMPTY_QUOTA_DRAFT);
  const [quotaConfirmed, setQuotaConfirmed] = useState(false);
  const [savingQuota, setSavingQuota] = useState(false);
  const [quotaMessage, setQuotaMessage] = useState<string | null>(null);
  const [quotaError, setQuotaError] = useState<string | null>(null);
  const [aiConsentVersion, setAiConsentVersion] = useState('');
  const [aiEvidenceReference, setAiEvidenceReference] = useState('');
  const [aiRepresentativeReference, setAiRepresentativeReference] = useState('');
  const [aiEffectiveAt, setAiEffectiveAt] = useState('');
  const [aiExpiresAt, setAiExpiresAt] = useState('');
  const [aiConsentConfirmed, setAiConsentConfirmed] = useState(false);
  const [aiAuthorizedDataMode, setAiAuthorizedDataMode] = useState<'SYNTHETIC_TEST_ONLY' | 'REAL_CUSTOMER_DATA'>('SYNTHETIC_TEST_ONLY');
  const [aiWithdrawalReference, setAiWithdrawalReference] = useState('');
  const [savingAiAuthorization, setSavingAiAuthorization] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [realPolicyVersion, setRealPolicyVersion] = useState('0.2');
  const [realAgreementReference, setRealAgreementReference] = useState('');
  const [realAllowedDataScopeReference, setRealAllowedDataScopeReference] = useState('');
  const [realReadinessReference, setRealReadinessReference] = useState('');
  const [realEffectiveAt, setRealEffectiveAt] = useState('');
  const [realExpiresAt, setRealExpiresAt] = useState('');
  const [realReviewDueAt, setRealReviewDueAt] = useState('');
  const [realSlugConfirmation, setRealSlugConfirmation] = useState('');
  const [realApprovalConfirmed, setRealApprovalConfirmed] = useState(false);
  const [realWithdrawalReason, setRealWithdrawalReason] = useState('');
  const [savingRealAuthorization, setSavingRealAuthorization] = useState(false);
  const [realMessage, setRealMessage] = useState<string | null>(null);
  const [realError, setRealError] = useState<string | null>(null);
  const erasureRequestInFlight = useRef(false);

  const setupLink = useMemo(() => getInviteLink(result), [result]);
  const regeneratedSetupLink = useMemo(
    () => getInviteLink(regenerateResult),
    [regenerateResult],
  );
  const provisioningBlockers = getProvisioningBlockers(preflightResult);
  const eraseEligible = Boolean(
    preflightResult?.organization &&
    preflightResult.organization.customerStatus === 'SUSPENDED' &&
    erasureDryRunResult?.status === 'DRY_RUN' &&
    erasureDryRunResult.dataDeleted === false &&
    erasureDryRunResult.inventory.organizationId === preflightResult.organization.id,
  );

  function invalidateErasureState() {
    setErasureSlugConfirmation('');
    setErasureDryRunResult(null);
    setErasureDryRunError(null);
    setEraseSlugConfirmation('');
    setErasePhraseConfirmation('');
    setErasureResult(null);
    setErasureError(null);
    setErasureVerification(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);
    setCopyMessage(null);

    try {
      if (!invitationPurpose) {
        setError('Choose Customer or Demo before creating the invitation.');
        return;
      }

      const normalizedEmail = normalizePilotReviewerEmail(email);
      setEmail(normalizedEmail);

      const confirmationMessage = invitationPurpose === 'DEMO'
        ? `Create demo invitation for: ${normalizedEmail}? This seeds synthetic sample data.`
        : `Create customer invitation for: ${normalizedEmail}? No sample data will be created.`;
      if (!window.confirm(confirmationMessage)) {
        return;
      }

      const response = await createPilotReviewer({
        name,
        email: normalizedEmail,
        workspaceName,
        invitationPurpose,
        expiresAt,
      });
      setResult(response);
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err, 'unknown'));
    } finally {
      setSubmitting(false);
    }
  }

  function handlePurposeChange(purpose: InvitationPurpose) {
    setInvitationPurpose(purpose);
    if (purpose === 'DEMO' && !workspaceName.trim()) {
      setWorkspaceName(DEFAULT_WORKSPACE);
    } else if (purpose === 'CUSTOMER' && workspaceName === DEFAULT_WORKSPACE) {
      setWorkspaceName('');
    }
  }

  async function copyValue(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage(`${label} copied.`);
    } catch {
      setCopyMessage(`Unable to copy ${label.toLowerCase()}. Select and copy it manually.`);
    }
  }

  async function handleDeactivate(event: FormEvent) {
    event.preventDefault();
    setDeactivateError(null);
    setDeactivateResult(null);

    try {
      const normalizedEmail = normalizePilotReviewerEmail(deactivateEmail);
      setDeactivateEmail(normalizedEmail);

      if (
        !window.confirm(
          `Deactivate pilot reviewer account ${normalizedEmail}? This will prevent login and will not delete sample workspace data.`,
        )
      ) {
        return;
      }

      setDeactivating(true);
      const response = await deactivatePilotReviewer(normalizedEmail);
      setDeactivateResult(response);
    } catch (err) {
      setDeactivateError(getUserFriendlyErrorMessage(err, 'unknown'));
    } finally {
      setDeactivating(false);
    }
  }

  async function handleRegenerateInvite(event: FormEvent) {
    event.preventDefault();
    setRegenerateError(null);
    setRegenerateResult(null);
    setCopyMessage(null);

    try {
      const normalizedEmail = normalizePilotReviewerEmail(regenerateEmail);
      setRegenerateEmail(normalizedEmail);

      if (!window.confirm(`Regenerate invite link for: ${normalizedEmail}`)) {
        return;
      }

      setRegenerating(true);
      const response = await regeneratePilotReviewerInvite(normalizedEmail);
      setRegenerateResult(response);
    } catch (err) {
      setRegenerateError(getUserFriendlyErrorMessage(err, 'unknown'));
    } finally {
      setRegenerating(false);
    }
  }

  async function handlePreflight(event: FormEvent) {
    event.preventDefault();
    setPreflightError(null);
    setPreflightResult(null);
    setProvisionResult(null);
    setProvisionError(null);
    setProvisionSlugConfirmation('');
    setSuspensionResult(null);
    setSuspensionError(null);
    setSlugConfirmation('');
    setQuotaConfirmed(false);
    setQuotaMessage(null);
    setQuotaError(null);
    setAiConsentConfirmed(false);
    setAiMessage(null);
    setAiError(null);
    setRealSlugConfirmation('');
    setRealApprovalConfirmed(false);
    setRealMessage(null);
    setRealError(null);
    invalidateErasureState();
    setRunningPreflight(true);

    try {
      const normalizedEmail = preflightEmail.trim().toLowerCase();
      const organizationName = preflightOrganizationName.trim();
      setPreflightEmail(normalizedEmail);
      setPreflightOrganizationName(organizationName);
      const response = await getCustomerPreflight({
        email: normalizedEmail,
        organizationName,
      });
      setPreflightResult(response);
      setQuotaDraft(response.organization?.quota ?? EMPTY_QUOTA_DRAFT);
    } catch (err) {
      setPreflightError(getUserFriendlyErrorMessage(err, 'unknown'));
    } finally {
      setRunningPreflight(false);
    }
  }

  async function handleConfigureQuota() {
    const organization = preflightResult?.organization;
    if (!organization || !quotaConfirmed || !isValidQuota(quotaDraft)) return;
    if (!window.confirm(`Save the displayed quota policy for ${organization.name}?`)) return;

    setSavingQuota(true);
    setQuotaError(null);
    setQuotaMessage(null);
    try {
      await configureOrganizationQuota(organization.id, quotaDraft);
      setQuotaMessage('Organization quota configuration saved.');
      setQuotaConfirmed(false);
      const refreshed = await getCustomerPreflight({
        email: preflightEmail,
        organizationName: preflightOrganizationName,
      });
      setPreflightResult(refreshed);
      setQuotaDraft(refreshed.organization?.quota ?? EMPTY_QUOTA_DRAFT);
    } catch (err) {
      setQuotaError(getUserFriendlyErrorMessage(err, 'unknown'));
    } finally {
      setSavingQuota(false);
    }
  }

  async function handleAuthorizeAi() {
    const organization = preflightResult?.organization;
    if (
      !organization ||
      organization.customerStatus !== 'ACTIVE' ||
      !aiConsentConfirmed ||
      !aiConsentVersion.trim() ||
      !aiEvidenceReference.trim() ||
      !aiRepresentativeReference.trim() ||
      !aiEffectiveAt
    ) return;
    if (!window.confirm(`Authorize AI document extraction for ${organization.name}?`)) return;

    setSavingAiAuthorization(true);
    setAiError(null);
    setAiMessage(null);
    try {
      await authorizeOrganizationAi({
        organizationId: organization.id,
        consentVersion: aiConsentVersion.trim(),
        evidenceReference: aiEvidenceReference.trim(),
        authorizedRepresentativeReference: aiRepresentativeReference.trim(),
        effectiveAt: new Date(aiEffectiveAt).toISOString(),
        ...(aiExpiresAt ? { expiresAt: new Date(aiExpiresAt).toISOString() } : {}),
        authorizedDataMode: aiAuthorizedDataMode,
        ...(aiAuthorizedDataMode === 'REAL_CUSTOMER_DATA'
          ? { realDataApprovalRevision: organization.realDataAuthorization?.approvalRevision }
          : {}),
      });
      setAiMessage('AI document extraction authorization recorded.');
      setAiConsentConfirmed(false);
      setPreflightResult(await getCustomerPreflight({
        email: preflightEmail,
        organizationName: preflightOrganizationName,
      }));
    } catch (err) {
      setAiError(getUserFriendlyErrorMessage(err, 'unknown'));
    } finally {
      setSavingAiAuthorization(false);
    }
  }

  async function handleApproveRealData() {
    const organization = preflightResult?.organization;
    if (!organization || organization.customerStatus !== 'ACTIVE' ||
      realSlugConfirmation !== organization.slug || !realApprovalConfirmed ||
      !realAgreementReference.trim() || !realAllowedDataScopeReference.trim() ||
      !realReadinessReference.trim() || !realEffectiveAt) return;
    if (!window.confirm(`Approve the controlled real-data pilot for ${organization.name}?`)) return;

    setSavingRealAuthorization(true);
    setRealError(null);
    setRealMessage(null);
    try {
      await approveOrganizationRealData({
        organizationId: organization.id,
        organizationSlug: organization.slug,
        policyVersion: realPolicyVersion.trim(),
        agreementEvidenceReference: realAgreementReference.trim(),
        allowedDataScopeReference: realAllowedDataScopeReference.trim(),
        privacySecurityReadinessReference: realReadinessReference.trim(),
        effectiveAt: new Date(realEffectiveAt).toISOString(),
        ...(realExpiresAt ? { expiresAt: new Date(realExpiresAt).toISOString() } : {}),
        ...(realReviewDueAt ? { reviewDueAt: new Date(realReviewDueAt).toISOString() } : {}),
      });
      setRealMessage('Real-data pilot approval recorded for this organization.');
      setRealApprovalConfirmed(false);
      setRealSlugConfirmation('');
      setPreflightResult(await getCustomerPreflight({ email: preflightEmail, organizationName: preflightOrganizationName }));
    } catch (err) {
      setRealError(getUserFriendlyErrorMessage(err, 'unknown'));
    } finally {
      setSavingRealAuthorization(false);
    }
  }

  async function handleWithdrawRealData() {
    const organization = preflightResult?.organization;
    if (!organization || organization.realDataAuthorization?.configuredStatus !== 'REAL_DATA_APPROVED' ||
      realSlugConfirmation !== organization.slug || !realWithdrawalReason.trim()) return;
    if (!window.confirm(`Withdraw real-data approval for ${organization.name}? Real-customer-data ingestion will be blocked immediately.`)) return;

    setSavingRealAuthorization(true);
    setRealError(null);
    setRealMessage(null);
    try {
      await withdrawOrganizationRealData({
        organizationId: organization.id,
        organizationSlug: organization.slug,
        withdrawalReason: realWithdrawalReason.trim(),
      });
      setRealMessage('Real-data approval withdrawn. Any real-data AI authorization was also withdrawn.');
      setRealWithdrawalReason('');
      setRealSlugConfirmation('');
      setPreflightResult(await getCustomerPreflight({ email: preflightEmail, organizationName: preflightOrganizationName }));
    } catch (err) {
      setRealError(getUserFriendlyErrorMessage(err, 'unknown'));
    } finally {
      setSavingRealAuthorization(false);
    }
  }

  async function handleWithdrawAi() {
    const organization = preflightResult?.organization;
    if (!organization || !aiWithdrawalReference.trim()) return;
    if (!window.confirm(`Withdraw AI document extraction authorization for ${organization.name}?`)) return;

    setSavingAiAuthorization(true);
    setAiError(null);
    setAiMessage(null);
    try {
      await withdrawOrganizationAi({
        organizationId: organization.id,
        withdrawalReference: aiWithdrawalReference.trim(),
      });
      setAiMessage('AI document extraction authorization withdrawn.');
      setAiWithdrawalReference('');
      setPreflightResult(await getCustomerPreflight({
        email: preflightEmail,
        organizationName: preflightOrganizationName,
      }));
    } catch (err) {
      setAiError(getUserFriendlyErrorMessage(err, 'unknown'));
    } finally {
      setSavingAiAuthorization(false);
    }
  }

  async function handleProvisionCustomer() {
    const user = preflightResult?.user;
    const organization = preflightResult?.organization;
    if (!organization || !user?.id || provisioningBlockers.length > 0) return;
    if (provisionSlugConfirmation !== organization.slug) return;
    if (!window.confirm(
      `Provision ${organization.name} as an ACTIVE paid-pilot CUSTOMER? The selected user will become the organization OWNER.`,
    )) return;

    setProvisionError(null);
    setProvisionResult(null);
    setProvisioning(true);
    try {
      const response = await provisionPaidPilotCustomer({
        organizationId: organization.id,
        organizationSlug: organization.slug,
        primaryAdminUserId: user.id,
      });
      setProvisionResult(response);
      setProvisionSlugConfirmation('');
      setPreflightResult(await getCustomerPreflight({
        email: preflightEmail,
        organizationName: preflightOrganizationName,
      }));
    } catch (err) {
      setProvisionError(getUserFriendlyErrorMessage(err, 'unknown'));
    } finally {
      setProvisioning(false);
    }
  }

  async function handleSuspendCustomer() {
    const organization = preflightResult?.organization;
    if (!organization || organization.customerStatus !== 'ACTIVE') return;
    if (slugConfirmation !== organization.slug) return;
    if (!window.confirm(
      `Suspend access for ${organization.name}? Customer data will be retained, but login and existing sessions will be blocked.`,
    )) return;

    setSuspensionError(null);
    setSuspensionResult(null);
    setSuspending(true);
    try {
      const response = await suspendCustomerOrganization({
        organizationId: organization.id,
        organizationSlug: organization.slug,
      });
      setSuspensionResult(response);
      setSlugConfirmation('');
      setPreflightResult(await getCustomerPreflight({
        email: preflightEmail,
        organizationName: preflightOrganizationName,
      }));
    } catch (err) {
      setSuspensionError(getUserFriendlyErrorMessage(err, 'unknown'));
    } finally {
      setSuspending(false);
    }
  }

  async function handleErasureDryRun() {
    const organization = preflightResult?.organization;
    if (!organization || organization.customerStatus !== 'SUSPENDED') return;
    if (erasureSlugConfirmation !== organization.slug) return;

    setErasureDryRunError(null);
    setErasureDryRunResult(null);
    setRunningErasureDryRun(true);
    try {
      setErasureDryRunResult(
        await runOrganizationErasureDryRun(organization.id),
      );
      setErasureSlugConfirmation('');
    } catch (err) {
      setErasureDryRunError(getUserFriendlyErrorMessage(err, 'unknown'));
    } finally {
      setRunningErasureDryRun(false);
    }
  }

  async function handleEraseOrganization() {
    const organization = preflightResult?.organization;
    if (!organization || !eraseEligible || erasureRequestInFlight.current) return;
    if (eraseSlugConfirmation !== organization.slug) return;
    if (erasePhraseConfirmation !== 'ERASE ORGANIZATION') return;
    if (!window.confirm(
      `Permanently erase ${organization.name} and its owned data? This cannot be undone.`,
    )) return;

    erasureRequestInFlight.current = true;
    setErasingOrganization(true);
    setErasureError(null);
    setErasureResult(null);
    setErasureVerification(null);
    try {
      const response = await eraseOrganization({
        organizationId: organization.id,
        organizationSlug: organization.slug,
      });
      setErasureResult(response);
      setEraseSlugConfirmation('');
      setErasePhraseConfirmation('');
      setErasureSlugConfirmation('');
      setErasureDryRunResult(null);

      try {
        const verification = await getCustomerPreflight({
          email: preflightEmail,
          organizationName: preflightOrganizationName,
        });
        setPreflightResult(verification);
        setErasureVerification(
          !verification.user.exists && !verification.organization
            ? 'Read-only verification confirmed that the organization, user, and membership are no longer present.'
            : 'Read-only verification did not confirm complete removal. Review the current preflight result.',
        );
      } catch (verificationError) {
        setErasureVerification(
          `Organization erasure completed, but read-only verification failed: ${getUserFriendlyErrorMessage(verificationError, 'unknown')}`,
        );
      }
    } catch (err) {
      setErasureError(getUserFriendlyErrorMessage(err, 'unknown'));
    } finally {
      erasureRequestInFlight.current = false;
      setErasingOrganization(false);
    }
  }

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Organization Invitations</h1>
          <p style={subtitleStyle}>
            Invite a clean paid-pilot customer or create a synthetic demo workspace.
          </p>
        </div>
      </header>

      <section style={noticeStyle}>
        Choose the invitation purpose explicitly. Customer invitations create no sample data. Demo
        invitations create synthetic Golden Sample data for demonstrations and testing.
      </section>

      <form onSubmit={handleSubmit} style={formCardStyle}>
        <h2 style={sectionTitleStyle}>Create organization invitation</h2>

        <fieldset style={purposeFieldsetStyle}>
          <legend style={labelStyle}>Invitation purpose</legend>
          <label style={purposeOptionStyle}>
            <input
              type="radio"
              name="invitationPurpose"
              value="CUSTOMER"
              checked={invitationPurpose === 'CUSTOMER'}
              onChange={() => handlePurposeChange('CUSTOMER')}
              required
            />
            <span>
              <strong>Customer</strong> — creates a clean paid-pilot organization with no sample data.
            </span>
          </label>
          <label style={purposeOptionStyle}>
            <input
              type="radio"
              name="invitationPurpose"
              value="DEMO"
              checked={invitationPurpose === 'DEMO'}
              onChange={() => handlePurposeChange('DEMO')}
              required
            />
            <span>
              <strong>Demo</strong> — creates sample/demo workspace data for demonstrations and testing.
            </span>
          </label>
        </fieldset>

        <div style={fieldGridStyle}>
          <label style={labelStyle}>
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              placeholder="Alexander"
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Email
            <input
              type="text"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={(event) => setEmail(event.target.value.trim().toLowerCase())}
              required
              placeholder="alexander@example.com"
              autoComplete="email"
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Workspace
            <input
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
              required
              style={inputStyle}
            />
            <span style={helperTextStyle}>
              {invitationPurpose === 'CUSTOMER'
                ? 'Use the paid-pilot customer organization name.'
                : invitationPurpose === 'DEMO'
                  ? 'Use only a clearly synthetic workspace name.'
                  : 'Choose the invitation purpose first.'}
            </span>
          </label>

          <label style={labelStyle}>
            Optional expiration date
            <input
              type="date"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
              style={inputStyle}
            />
          </label>
        </div>

        <div style={readonlySummaryStyle}>
          {invitationPurpose === 'CUSTOMER' ? (
            <><strong>Customer invitation:</strong> No sample data will be created. The normal setup-link and password flow will be used before provisioning.</>
          ) : invitationPurpose === 'DEMO' ? (
            <><strong>Demo invitation:</strong> Synthetic Golden Sample data will be created for demo and internal testing use.</>
          ) : (
            <><strong>Purpose required:</strong> Select Customer or Demo to continue.</>
          )}
        </div>

        {error ? <div style={errorStyle}>{error}</div> : null}

        <button type="submit" disabled={submitting || !invitationPurpose} style={primaryButtonStyle(submitting || !invitationPurpose)}>
          {submitting ? 'Creating...' : 'Create invitation'}
        </button>
      </form>

      {result ? (
        <section style={resultCardStyle} aria-label="Pilot reviewer invite result">
          <h2 style={sectionTitleStyle}>Invite Ready</h2>
          <div style={resultGridStyle}>
            <ResultItem label="Name" value={result.name || name} />
            <ResultItem label="Email" value={result.email || email} />
            <ResultItem label="Workspace" value={result.workspaceName || result.workspace || workspaceName} />
            <ResultItem label="Invitation Purpose" value={result.invitationPurpose || invitationPurpose} />
            <ResultItem label="Account Type" value={result.accountType || 'PILOT_REVIEWER'} />
            <ResultItem label="Role" value={result.role || 'REVIEWER'} />
            <ResultItem label="Status" value={result.status || 'Active'} />
            <ResultItem label="Expires" value={result.expiresAt || result.expires || expiresAt || 'Not set'} />
          </div>

          {setupLink ? (
            <div style={copyBlockStyle}>
              <div style={warningStyle}>
                Copy this link now. For security, it may not be shown again.
              </div>
              <label style={labelStyle}>
                Password setup link
                <textarea readOnly value={setupLink} style={textareaStyle} />
              </label>
              <button type="button" onClick={() => copyValue(setupLink, 'Setup link')} style={secondaryButtonStyle}>
                Copy setup link
              </button>
            </div>
          ) : null}

          {result.temporaryPassword ? (
            <div style={copyBlockStyle}>
              <label style={labelStyle}>
                Secure temporary password
                <textarea readOnly value={result.temporaryPassword} style={textareaStyle} />
              </label>
              <button
                type="button"
                onClick={() => copyValue(result.temporaryPassword || '', 'Temporary password')}
                style={secondaryButtonStyle}
              >
                Copy temporary password
              </button>
              <p style={helperTextStyle}>
                Temporary passwords should be shown only once and must require password reset on first login.
              </p>
            </div>
          ) : null}

          {!setupLink && !result.temporaryPassword ? (
            <div style={warningStyle}>
              The backend created the reviewer but did not return a setup link or temporary password.
              Confirm email delivery or backend invite configuration before sharing access.
            </div>
          ) : null}

          {copyMessage ? <div style={successStyle}>{copyMessage}</div> : null}
        </section>
      ) : null}

      <form onSubmit={handleRegenerateInvite} style={formCardWithMarginStyle}>
        <h2 style={sectionTitleStyle}>Regenerate Invite Link</h2>
        <p style={helperTextStyle}>
          Generate a new set-password link for an active pilot reviewer. This does not
          change the reviewer role, account type, workspace, or permissions. Email is
          not sent automatically.
        </p>

        <div style={fieldGridStyle}>
          <label style={labelStyle}>
            Invite regeneration email
            <input
              type="text"
              inputMode="email"
              value={regenerateEmail}
              onChange={(event) => setRegenerateEmail(event.target.value)}
              onBlur={(event) => setRegenerateEmail(event.target.value.trim().toLowerCase())}
              required
              placeholder="name@example.com"
              autoComplete="email"
              style={inputStyle}
            />
          </label>
        </div>

        {regenerateError ? <div style={errorStyle}>{regenerateError}</div> : null}

        <button type="submit" disabled={regenerating} style={primaryButtonStyle(regenerating)}>
          {regenerating ? 'Regenerating...' : 'Regenerate Invite Link'}
        </button>
      </form>

      {regenerateResult ? (
        <section style={resultCardStyle} aria-label="Regenerated pilot reviewer invite">
          <h2 style={sectionTitleStyle}>Invite Link Regenerated</h2>
          <div style={resultGridStyle}>
            <ResultItem
              label="Email"
              value={
                regenerateResult.pilotReviewer?.email ||
                regenerateResult.email ||
                regenerateEmail
              }
            />
            <ResultItem
              label="Workspace"
              value={
                regenerateResult.pilotReviewer?.workspaceName ||
                regenerateResult.workspaceName ||
                regenerateResult.workspace ||
                DEFAULT_WORKSPACE
              }
            />
            <ResultItem
              label="Account Type"
              value={
                regenerateResult.pilotReviewer?.accountType ||
                regenerateResult.accountType ||
                'PILOT_REVIEWER'
              }
            />
            <ResultItem
              label="Role"
              value={
                regenerateResult.pilotReviewer?.role ||
                regenerateResult.role ||
                'REVIEWER'
              }
            />
            <ResultItem
              label="Status"
              value={
                regenerateResult.pilotReviewer?.status ||
                regenerateResult.status ||
                'Active'
              }
            />
          </div>

          {regeneratedSetupLink ? (
            <div style={copyBlockStyle}>
              <label style={labelStyle}>
                New password setup link
                <textarea readOnly value={regeneratedSetupLink} style={textareaStyle} />
              </label>
              <button
                type="button"
                onClick={() => copyValue(regeneratedSetupLink, 'Regenerated setup link')}
                style={secondaryButtonStyle}
              >
                Copy regenerated setup link
              </button>
            </div>
          ) : (
            <div style={warningStyle}>
              The backend regenerated the invite but did not return a setup link.
              Confirm backend invite configuration before sharing access.
            </div>
          )}

          {copyMessage ? <div style={successStyle}>{copyMessage}</div> : null}
        </section>
      ) : null}

      <form onSubmit={handleDeactivate} style={deactivateCardStyle}>
        <h2 style={sectionTitleStyle}>Deactivate Pilot Reviewer</h2>
        <p style={helperTextStyle}>
          Deactivation prevents login. It does not delete the reviewer account, admin
          users, records, reports, factors, or sample workspace data.
        </p>

        <div style={fieldGridStyle}>
          <label style={labelStyle}>
            Pilot reviewer email
            <input
              type="text"
              inputMode="email"
              value={deactivateEmail}
              onChange={(event) => setDeactivateEmail(event.target.value)}
              onBlur={(event) => setDeactivateEmail(event.target.value.trim().toLowerCase())}
              required
              placeholder="name@example.com"
              autoComplete="email"
              style={inputStyle}
            />
          </label>
        </div>

        {deactivateError ? <div style={errorStyle}>{deactivateError}</div> : null}
        {deactivateResult ? (
          <div style={successStyle}>
            {deactivateResult.message || 'This pilot reviewer account has been deactivated.'}
            {deactivateResult.pilotReviewer?.status ? (
              <div>Status: {deactivateResult.pilotReviewer.status}</div>
            ) : null}
          </div>
        ) : null}

        <button type="submit" disabled={deactivating} style={dangerButtonStyle(deactivating)}>
          {deactivating ? 'Deactivating...' : 'Deactivate Pilot Reviewer'}
        </button>
      </form>

      <section style={safeguardsSectionStyle} aria-labelledby="customer-safeguards-title">
        <h2 id="customer-safeguards-title" style={safeguardsTitleStyle}>Customer safeguards</h2>

        <form onSubmit={handlePreflight} style={formCardStyle}>
          <h3 style={sectionTitleStyle}>Customer preflight</h3>
          <p style={helperTextStyle}>
            Check an external pilot account and organization before creating, provisioning,
            suspending, or troubleshooting access.
          </p>
          <div style={fieldGridStyle}>
            <label style={labelStyle}>
              Preflight email
              <input
                type="text"
                inputMode="email"
                value={preflightEmail}
                onChange={(event) => {
                  setPreflightEmail(event.target.value);
                  invalidateErasureState();
                }}
                onBlur={(event) => setPreflightEmail(event.target.value.trim().toLowerCase())}
                placeholder="customer@example.com"
                autoComplete="email"
                style={inputStyle}
              />
            </label>
            <label style={labelStyle}>
              Organization name
              <input
                value={preflightOrganizationName}
                onChange={(event) => {
                  setPreflightOrganizationName(event.target.value);
                  invalidateErasureState();
                }}
                placeholder="Customer organization"
                style={inputStyle}
              />
            </label>
          </div>
          <p style={helperTextStyle}>Enter at least one lookup value. Preflight is read-only.</p>
          {preflightError ? <div style={errorStyle}>{preflightError}</div> : null}
          <button type="submit" disabled={runningPreflight} style={primaryButtonStyle(runningPreflight)}>
            {runningPreflight ? 'Running preflight...' : 'Run preflight'}
          </button>
        </form>

        {preflightResult ? (
          <section style={resultCardStyle} aria-label="Customer preflight result">
            <h3 style={sectionTitleStyle}>Preflight result</h3>
            <h4 style={summaryHeadingStyle}>User</h4>
            {!preflightResult.user.exists ? (
              <div style={warningStyle}>No matching user found.</div>
            ) : null}
            <div style={resultGridStyle}>
              <ResultItem label="Exists" value={yesNo(preflightResult.user.exists)} />
              <ResultItem label="Email" value={preflightResult.user.normalizedEmail || 'Not available'} />
              <ResultItem label="User ID" value={preflightResult.user.id || 'Not available'} />
              <ResultItem label="Platform role" value={preflightResult.user.platformRole || 'Not available'} />
              <ResultItem label="Account type" value={preflightResult.user.accountType || 'Not available'} />
              <ResultItem label="Active" value={optionalYesNo(preflightResult.user.isActive)} />
              <ResultItem label="Password setup required" value={optionalYesNo(preflightResult.user.passwordSetupRequired)} />
              <ResultItem label="Invitation status" value={preflightResult.user.invitationStatus || 'Not available'} />
              <ResultItem label="Membership role" value={preflightResult.user.membershipRole || 'Not available'} />
            </div>

            <h4 style={summaryHeadingStyle}>Organization</h4>
            {!preflightResult.organization ? (
              <div style={warningStyle}>No matching organization found.</div>
            ) : (
              <>
                <div style={resultGridStyle}>
                  <ResultItem label="Organization name" value={preflightResult.organization.name} />
                  <ResultItem label="Organization ID" value={preflightResult.organization.id} />
                  <ResultItem label="Slug" value={preflightResult.organization.slug} />
                  <ResultItem label="Customer status" value={preflightResult.organization.customerStatus} />
                  <ResultItem label="Provisioned at" value={preflightResult.organization.provisionedAt || 'Not provisioned'} />
                  <ResultItem label="Active" value={yesNo(preflightResult.organization.isActive)} />
                  <ResultItem label="Demo factors enabled" value={yesNo(preflightResult.organization.allowDemoFactorsForCalculations)} />
                </div>

                <h4 style={summaryHeadingStyle}>Data counts</h4>
                <div style={resultGridStyle}>
                  <ResultItem label="Activity records" value={String(preflightResult.organization.counts.activityData)} />
                  <ResultItem label="Reports" value={String(preflightResult.organization.counts.reports)} />
                  <ResultItem label="Documents" value={String(preflightResult.organization.counts.documents)} />
                  <ResultItem label="Golden Sample artifacts" value={String(preflightResult.organization.counts.goldenSampleArtifacts)} />
                  <ResultItem label="Memberships" value={String(preflightResult.organization.counts.memberships)} />
                </div>

                <h4 style={summaryHeadingStyle}>Quota</h4>
                {preflightResult.organization.quota ? (
                  <div style={resultGridStyle}>
                    <ResultItem label="Enabled" value={optionalYesNo(preflightResult.organization.quota.enabled)} />
                    <ResultItem label="Period days" value={optionalValue(preflightResult.organization.quota.periodDays)} />
                    <ResultItem label="Upload limit" value={optionalValue(preflightResult.organization.quota.uploadLimit)} />
                    <ResultItem label="Daily upload limit" value={optionalValue(preflightResult.organization.quota.dailyUploadLimit)} />
                    <ResultItem label="Max file size (bytes)" value={optionalValue(preflightResult.organization.quota.maxFileSizeBytes)} />
                    <ResultItem label="Extraction concurrency" value={optionalValue(preflightResult.organization.quota.maxConcurrentExtractions)} />
                    <ResultItem label="Import row limit" value={optionalValue(preflightResult.organization.quota.maxImportRows)} />
                  </div>
                ) : <p style={helperTextStyle}>No organization quota configured.</p>}

                <h4 style={summaryHeadingStyle}>Real-data authorization</h4>
                {preflightResult.organization.realDataAuthorization ? (
                  <div style={resultGridStyle}>
                    <ResultItem label="Status" value={preflightResult.organization.realDataAuthorization.configuredStatus} />
                    <ResultItem label="Approval revision" value={String(preflightResult.organization.realDataAuthorization.approvalRevision)} />
                    <ResultItem label="Policy version" value={preflightResult.organization.realDataAuthorization.policyVersion} />
                    <ResultItem label="Effective date" value={preflightResult.organization.realDataAuthorization.effectiveAt} />
                    <ResultItem label="Expiry" value={preflightResult.organization.realDataAuthorization.expiresAt || 'Not set'} />
                    <ResultItem label="Review due" value={preflightResult.organization.realDataAuthorization.reviewDueAt || 'Not set'} />
                    <ResultItem label="Withdrawn date" value={preflightResult.organization.realDataAuthorization.withdrawnAt || 'Not withdrawn'} />
                    <ResultItem label="Approval evidence recorded" value={yesNo(preflightResult.organization.realDataAuthorization.evidenceReferencesPresent)} />
                  </div>
                ) : <p style={helperTextStyle}>Synthetic-only by default. No real-data approval configured.</p>}

                <h4 style={summaryHeadingStyle}>AI authorization</h4>
                {preflightResult.organization.aiAuthorization ? (
                  <div style={resultGridStyle}>
                    <ResultItem label="Status" value={preflightResult.organization.aiAuthorization.status || 'Not available'} />
                    <ResultItem label="Provider" value={preflightResult.organization.aiAuthorization.provider || 'Not available'} />
                    <ResultItem label="Processing scope" value={preflightResult.organization.aiAuthorization.processingScope || 'Not available'} />
                    <ResultItem label="Consent version" value={preflightResult.organization.aiAuthorization.consentVersion || 'Not available'} />
                    <ResultItem label="Authorized data mode" value={preflightResult.organization.aiAuthorization.authorizedDataMode || 'SYNTHETIC_TEST_ONLY'} />
                    <ResultItem label="Real-data approval revision" value={optionalValue(preflightResult.organization.aiAuthorization.realDataApprovalRevision ?? undefined)} />
                    <ResultItem label="Effective date" value={preflightResult.organization.aiAuthorization.effectiveAt || 'Not available'} />
                    <ResultItem label="Expiry" value={preflightResult.organization.aiAuthorization.expiresAt || 'Not available'} />
                    <ResultItem label="Withdrawn date" value={preflightResult.organization.aiAuthorization.withdrawnAt || 'Not available'} />
                  </div>
                ) : <p style={helperTextStyle}>No organization AI authorization configured.</p>}
              </>
            )}
          </section>
        ) : null}

        {preflightResult?.organization ? (
          <section style={provisionCardStyle} aria-label="Organization real-data authorization">
            <h3 style={sectionTitleStyle}>Real-data pilot approval</h3>
            <p style={warningStyle}>
              Customer status and provisioning do not grant real-data permission. Approval is organization scoped,
              fail closed, and does not enable AI processing. Confirm the trusted organization and record only
              non-secret evidence references.
            </p>
            <div style={resultGridStyle}>
              <ResultItem label="Organization" value={preflightResult.organization.name} />
              <ResultItem label="Organization ID" value={preflightResult.organization.id} />
              <ResultItem label="Slug" value={preflightResult.organization.slug} />
              <ResultItem label="Lifecycle" value={preflightResult.organization.customerStatus} />
              <ResultItem label="Configured status" value={preflightResult.organization.realDataAuthorization?.configuredStatus ?? 'SYNTHETIC_ONLY'} />
              <ResultItem label="Approval revision" value={String(preflightResult.organization.realDataAuthorization?.approvalRevision ?? 0)} />
            </div>
            <div style={fieldGridStyle}>
              <label style={labelStyle}>Policy version
                <input value={realPolicyVersion} onChange={(event) => setRealPolicyVersion(event.target.value)} style={inputStyle} />
              </label>
              <label style={labelStyle}>Pilot agreement evidence reference
                <input value={realAgreementReference} onChange={(event) => setRealAgreementReference(event.target.value)} style={inputStyle} />
              </label>
              <label style={labelStyle}>Allowed-data scope reference
                <input value={realAllowedDataScopeReference} onChange={(event) => setRealAllowedDataScopeReference(event.target.value)} style={inputStyle} />
              </label>
              <label style={labelStyle}>Privacy/security readiness reference
                <input value={realReadinessReference} onChange={(event) => setRealReadinessReference(event.target.value)} style={inputStyle} />
              </label>
              <label style={labelStyle}>Effective date and time
                <input type="datetime-local" value={realEffectiveAt} onChange={(event) => setRealEffectiveAt(event.target.value)} style={inputStyle} />
              </label>
              <label style={labelStyle}>Optional expiry
                <input type="datetime-local" value={realExpiresAt} onChange={(event) => setRealExpiresAt(event.target.value)} style={inputStyle} />
              </label>
              <label style={labelStyle}>Optional review due
                <input type="datetime-local" value={realReviewDueAt} onChange={(event) => setRealReviewDueAt(event.target.value)} style={inputStyle} />
              </label>
              <label style={labelStyle}>Type the exact trusted organization slug
                <input value={realSlugConfirmation} onChange={(event) => setRealSlugConfirmation(event.target.value)} style={inputStyle} autoComplete="off" />
              </label>
            </div>
            <label style={purposeOptionStyle}>
              <input type="checkbox" checked={realApprovalConfirmed} onChange={(event) => setRealApprovalConfirmed(event.target.checked)} />
              <span>I confirm the organization completed the documented real-data go/no-go review under the displayed policy version.</span>
            </label>
            {preflightResult.organization.customerStatus !== 'ACTIVE' ? <div style={warningStyle}>Approval requires an ACTIVE customer organization.</div> : null}
            {!preflightResult.organization.quota?.enabled ? <div style={warningStyle}>Approval requires an enabled organization quota.</div> : null}
            {preflightResult.organization.counts.goldenSampleArtifacts > 0 || preflightResult.organization.allowDemoFactorsForCalculations
              ? <div style={warningStyle}>Approval is blocked while demo factors or Golden Sample artifacts are present.</div> : null}
            {realError ? <div style={errorStyle}>{realError}</div> : null}
            {realMessage ? <div style={successStyle}>{realMessage}</div> : null}
            <button
              type="button"
              onClick={handleApproveRealData}
              disabled={savingRealAuthorization || preflightResult.organization.customerStatus !== 'ACTIVE' ||
                !preflightResult.organization.quota?.enabled ||
                preflightResult.organization.counts.goldenSampleArtifacts > 0 ||
                preflightResult.organization.allowDemoFactorsForCalculations ||
                realSlugConfirmation !== preflightResult.organization.slug || !realApprovalConfirmed ||
                !realPolicyVersion.trim() || !realAgreementReference.trim() ||
                !realAllowedDataScopeReference.trim() || !realReadinessReference.trim() || !realEffectiveAt}
              style={primaryButtonStyle(savingRealAuthorization || realSlugConfirmation !== preflightResult.organization.slug || !realApprovalConfirmed)}
            >
              {savingRealAuthorization ? 'Saving approval...' : 'Approve controlled real-data pilot'}
            </button>
            <label style={labelStyle}>Withdrawal reason
              <input value={realWithdrawalReason} onChange={(event) => setRealWithdrawalReason(event.target.value)} style={inputStyle} />
            </label>
            <button
              type="button"
              onClick={handleWithdrawRealData}
              disabled={savingRealAuthorization || preflightResult.organization.realDataAuthorization?.configuredStatus !== 'REAL_DATA_APPROVED' ||
                realSlugConfirmation !== preflightResult.organization.slug || !realWithdrawalReason.trim()}
              style={dangerButtonStyle(savingRealAuthorization || preflightResult.organization.realDataAuthorization?.configuredStatus !== 'REAL_DATA_APPROVED' ||
                realSlugConfirmation !== preflightResult.organization.slug || !realWithdrawalReason.trim())}
            >Withdraw real-data approval</button>
          </section>
        ) : null}

        {preflightResult?.organization ? (
          <section style={provisionCardStyle} aria-label="Organization quota configuration">
            <h3 style={sectionTitleStyle}>Organization pilot quota</h3>
            <p style={helperTextStyle}>
              Quotas apply only to this trusted preflight organization. Loading the approved
              synthetic-pilot profile does not save it until you confirm and submit.
            </p>
            <div style={readonlySummaryStyle}>
              <div><strong>Organization:</strong> {preflightResult.organization.name}</div>
              <div><strong>Organization ID:</strong> {preflightResult.organization.id}</div>
            </div>
            <button
              type="button"
              onClick={() => {
                setQuotaDraft(APPROVED_SYNTHETIC_PILOT_QUOTA);
                setQuotaConfirmed(false);
                setQuotaMessage(null);
              }}
              style={secondaryButtonStyle}
            >
              Load approved synthetic-pilot profile
            </button>
            <label style={purposeOptionStyle}>
              <input
                type="checkbox"
                checked={quotaDraft.enabled}
                onChange={(event) => setQuotaDraft({ ...quotaDraft, enabled: event.target.checked })}
              />
              <span>Enable this organization quota policy</span>
            </label>
            <div style={fieldGridStyle}>
              {QUOTA_FIELDS.map(([key, label]) => (
                <label key={key} style={labelStyle}>
                  {label}
                  <input
                    type="number"
                    min={1}
                    value={quotaDraft[key] || ''}
                    onChange={(event) => setQuotaDraft({
                      ...quotaDraft,
                      [key]: Number(event.target.value),
                    })}
                    style={inputStyle}
                  />
                </label>
              ))}
            </div>
            <label style={purposeOptionStyle}>
              <input
                type="checkbox"
                checked={quotaConfirmed}
                onChange={(event) => setQuotaConfirmed(event.target.checked)}
              />
              <span>I confirm these limits are intended for this exact organization.</span>
            </label>
            {quotaError ? <div style={errorStyle}>{quotaError}</div> : null}
            {quotaMessage ? <div style={successStyle}>{quotaMessage}</div> : null}
            <button
              type="button"
              onClick={handleConfigureQuota}
              disabled={savingQuota || !quotaConfirmed || !isValidQuota(quotaDraft)}
              style={primaryButtonStyle(savingQuota || !quotaConfirmed || !isValidQuota(quotaDraft))}
            >
              {savingQuota ? 'Saving quota...' : 'Save organization quota'}
            </button>
          </section>
        ) : null}

        {preflightResult?.organization ? (
          <section style={provisionCardStyle} aria-label="Organization AI authorization">
            <h3 style={sectionTitleStyle}>AI document extraction authorization</h3>
            <p style={warningStyle}>
              AI document extraction is a separate organization-scoped authorization. Synthetic consent
              never authorizes real customer data. Real-data AI requires a currently effective real-data
              approval at the same revision.
            </p>
            <div style={resultGridStyle}>
              <ResultItem label="Organization" value={preflightResult.organization.name} />
              <ResultItem label="Organization ID" value={preflightResult.organization.id} />
              <ResultItem label="Status" value={preflightResult.organization.aiAuthorization?.status ?? 'NOT_CONFIGURED'} />
              <ResultItem label="Provider" value={preflightResult.organization.aiAuthorization?.provider ?? 'OPENAI'} />
              <ResultItem label="Scope" value={preflightResult.organization.aiAuthorization?.processingScope ?? 'DOCUMENT_EXTRACTION'} />
              <ResultItem label="Authorized data mode" value={preflightResult.organization.aiAuthorization?.authorizedDataMode ?? 'SYNTHETIC_TEST_ONLY'} />
              <ResultItem label="Effective at" value={preflightResult.organization.aiAuthorization?.effectiveAt ?? 'Not available'} />
              <ResultItem label="Expires at" value={preflightResult.organization.aiAuthorization?.expiresAt ?? 'Not set'} />
              <ResultItem label="Withdrawn at" value={preflightResult.organization.aiAuthorization?.withdrawnAt ?? 'Not withdrawn'} />
            </div>
            <div style={fieldGridStyle}>
              <label style={labelStyle}>Authorized data mode
                <select value={aiAuthorizedDataMode} onChange={(event) => setAiAuthorizedDataMode(event.target.value as 'SYNTHETIC_TEST_ONLY' | 'REAL_CUSTOMER_DATA')} style={inputStyle}>
                  <option value="SYNTHETIC_TEST_ONLY">Synthetic/test data only</option>
                  <option value="REAL_CUSTOMER_DATA">Real customer data</option>
                </select>
              </label>
              <label style={labelStyle}>
                Consent version
                <input value={aiConsentVersion} onChange={(event) => setAiConsentVersion(event.target.value)} style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Consent evidence reference
                <input value={aiEvidenceReference} onChange={(event) => setAiEvidenceReference(event.target.value)} style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Authorized representative reference
                <input value={aiRepresentativeReference} onChange={(event) => setAiRepresentativeReference(event.target.value)} style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Effective date and time
                <input type="datetime-local" value={aiEffectiveAt} onChange={(event) => setAiEffectiveAt(event.target.value)} style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Optional expiry date and time
                <input type="datetime-local" value={aiExpiresAt} onChange={(event) => setAiExpiresAt(event.target.value)} style={inputStyle} />
              </label>
            </div>
            <label style={purposeOptionStyle}>
              <input
                type="checkbox"
                checked={aiConsentConfirmed}
                onChange={(event) => setAiConsentConfirmed(event.target.checked)}
              />
              <span>I confirm that the organization has explicitly authorized AI document extraction for the selected data mode.</span>
            </label>
            {preflightResult.organization.customerStatus !== 'ACTIVE' ? (
              <div style={warningStyle}>AI authorization is available only after the customer organization is ACTIVE.</div>
            ) : null}
            {aiAuthorizedDataMode === 'REAL_CUSTOMER_DATA' && preflightResult.organization.realDataAuthorization?.configuredStatus !== 'REAL_DATA_APPROVED' ? (
              <div style={warningStyle}>Real-customer-data AI consent requires an effective real-data approval.</div>
            ) : null}
            {aiError ? <div style={errorStyle}>{aiError}</div> : null}
            {aiMessage ? <div style={successStyle}>{aiMessage}</div> : null}
            <button
              type="button"
              onClick={handleAuthorizeAi}
              disabled={
                savingAiAuthorization ||
                preflightResult.organization.customerStatus !== 'ACTIVE' ||
                !aiConsentConfirmed ||
                !aiConsentVersion.trim() ||
                !aiEvidenceReference.trim() ||
                !aiRepresentativeReference.trim() ||
                !aiEffectiveAt ||
                (aiAuthorizedDataMode === 'REAL_CUSTOMER_DATA' &&
                  preflightResult.organization.realDataAuthorization?.configuredStatus !== 'REAL_DATA_APPROVED')
              }
              style={primaryButtonStyle(
                savingAiAuthorization ||
                preflightResult.organization.customerStatus !== 'ACTIVE' ||
                !aiConsentConfirmed ||
                !aiConsentVersion.trim() ||
                !aiEvidenceReference.trim() ||
                !aiRepresentativeReference.trim() ||
                !aiEffectiveAt ||
                (aiAuthorizedDataMode === 'REAL_CUSTOMER_DATA' &&
                  preflightResult.organization.realDataAuthorization?.configuredStatus !== 'REAL_DATA_APPROVED'),
              )}
            >
              {savingAiAuthorization ? 'Saving authorization...' : 'Authorize AI document extraction'}
            </button>
            <label style={labelStyle}>
              Withdrawal evidence reference
              <input
                value={aiWithdrawalReference}
                onChange={(event) => setAiWithdrawalReference(event.target.value)}
                style={inputStyle}
              />
            </label>
            <button
              type="button"
              onClick={handleWithdrawAi}
              disabled={
                savingAiAuthorization ||
                preflightResult.organization.aiAuthorization?.status !== 'ENABLED' ||
                !aiWithdrawalReference.trim()
              }
              style={dangerButtonStyle(
                savingAiAuthorization ||
                preflightResult.organization.aiAuthorization?.status !== 'ENABLED' ||
                !aiWithdrawalReference.trim(),
              )}
            >
              Withdraw AI authorization
            </button>
          </section>
        ) : null}

        {erasureResult ? (
          <section style={successStyle} aria-label="Organization erasure result">
            <h3 style={sectionTitleStyle}>Organization erased successfully.</h3>
            <div style={resultGridStyle}>
              <ResultItem label="Status" value={erasureResult.status} />
              {'inventory' in erasureResult ? (
                <>
                  <ResultItem label="Organizations" value="1" />
                  {ERASURE_INVENTORY_FIELDS.map(([key, label]) => (
                    <ResultItem
                      key={key}
                      label={label}
                      value={String(erasureResult.inventory[key])}
                    />
                  ))}
                  <ResultItem label="Deleted physical files" value={String(erasureResult.deletedPhysicalFiles)} />
                  <ResultItem label="Already missing physical files" value={String(erasureResult.alreadyMissingPhysicalFiles)} />
                </>
              ) : null}
            </div>
            {erasureVerification ? <p>{erasureVerification}</p> : null}
          </section>
        ) : null}

        {preflightResult ? (
          <section style={provisionCardStyle} aria-label="Provision paid-pilot customer">
            <h3 style={sectionTitleStyle}>Provision paid-pilot customer</h3>
            <p style={helperTextStyle}>
              Convert an eligible invited pilot account into an ACTIVE CUSTOMER organization
              with the selected user as OWNER.
            </p>
            <div style={resultGridStyle}>
              <ResultItem label="Organization name" value={preflightResult.organization?.name || 'Not available'} />
              <ResultItem label="Organization ID" value={preflightResult.organization?.id || 'Not available'} />
              <ResultItem label="Organization slug" value={preflightResult.organization?.slug || 'Not available'} />
              <ResultItem label="User email" value={preflightResult.user.normalizedEmail || 'Not available'} />
              <ResultItem label="User ID" value={preflightResult.user.id || 'Not available'} />
              <ResultItem label="Customer status" value={preflightResult.organization?.customerStatus || 'Not available'} />
              <ResultItem label="Account type" value={preflightResult.user.accountType || 'Not available'} />
              <ResultItem label="Membership role" value={preflightResult.user.membershipRole || 'Not available'} />
              <ResultItem
                label="Golden Sample artifacts"
                value={preflightResult.organization
                  ? String(preflightResult.organization.counts.goldenSampleArtifacts)
                  : 'Not available'}
              />
            </div>

            {provisioningBlockers.length > 0 ? (
              <div style={warningStyle}>
                <strong>Provisioning unavailable:</strong>
                <ul style={reasonListStyle}>
                  {provisioningBlockers.map((reason) => <li key={reason}>{reason}</li>)}
                </ul>
              </div>
            ) : (
              <div style={readonlySummaryStyle}>
                All provisioning preconditions passed. Confirm the exact organization slug to continue.
              </div>
            )}

            <label style={labelStyle}>
              Type the organization slug to confirm provisioning
              <input
                value={provisionSlugConfirmation}
                onChange={(event) => setProvisionSlugConfirmation(event.target.value)}
                disabled={!preflightResult.organization || provisioningBlockers.length > 0}
                style={inputStyle}
                autoComplete="off"
              />
            </label>
            {provisionError ? <div style={errorStyle}>{provisionError}</div> : null}
            {provisionResult ? (
              <div style={successStyle}>
                {provisionResult.status === 'ALREADY_PROVISIONED'
                  ? 'This customer organization is already provisioned.'
                  : 'Customer organization provisioned.'}
                <div>Status: {provisionResult.status}</div>
                <div>Organization ID: {provisionResult.organizationId}</div>
                <div>Primary admin user ID: {provisionResult.primaryAdminUserId}</div>
                <div>Provisioned at: {provisionResult.provisionedAt}</div>
              </div>
            ) : null}
            <button
              type="button"
              onClick={handleProvisionCustomer}
              disabled={
                provisioning ||
                provisioningBlockers.length > 0 ||
                !preflightResult.organization ||
                provisionSlugConfirmation !== preflightResult.organization.slug
              }
              style={primaryButtonStyle(
                provisioning ||
                provisioningBlockers.length > 0 ||
                !preflightResult.organization ||
                provisionSlugConfirmation !== preflightResult.organization.slug,
              )}
            >
              {provisioning ? 'Provisioning...' : 'Provision paid-pilot customer'}
            </button>
          </section>
        ) : null}

        {preflightResult?.organization ? (
          <section style={suspendCardStyle} aria-label="Suspend customer access">
            <h3 style={sectionTitleStyle}>Suspend customer access</h3>
            <p style={helperTextStyle}>
              Suspension blocks login and existing authenticated sessions without deleting customer data.
            </p>
            <div style={readonlySummaryStyle}>
              <div><strong>Organization:</strong> {preflightResult.organization.name}</div>
              <div><strong>Slug:</strong> {preflightResult.organization.slug}</div>
            </div>
            <label style={labelStyle}>
              Type the organization slug to confirm
              <input
                value={slugConfirmation}
                onChange={(event) => setSlugConfirmation(event.target.value)}
                style={inputStyle}
                autoComplete="off"
              />
            </label>
            {preflightResult.organization.customerStatus !== 'ACTIVE' ? (
              <div style={warningStyle}>
                Suspension is available only when customer status is ACTIVE.
              </div>
            ) : null}
            {suspensionError ? <div style={errorStyle}>{suspensionError}</div> : null}
            {suspensionResult ? (
              <div style={successStyle}>
                {suspensionResult.status === 'ALREADY_SUSPENDED'
                  ? 'This customer organization is already suspended.'
                  : 'Customer access suspended.'}
                <div>Status: {suspensionResult.status}</div>
                <div>Organization ID: {suspensionResult.organizationId}</div>
              </div>
            ) : null}
            <button
              type="button"
              onClick={handleSuspendCustomer}
              disabled={
                suspending ||
                preflightResult.organization.customerStatus !== 'ACTIVE' ||
                slugConfirmation !== preflightResult.organization.slug
              }
              style={dangerButtonStyle(
                suspending ||
                preflightResult.organization.customerStatus !== 'ACTIVE' ||
                slugConfirmation !== preflightResult.organization.slug,
              )}
            >
              {suspending ? 'Suspending...' : 'Suspend customer'}
            </button>
          </section>
        ) : null}

        {preflightResult?.organization ? (
          <section style={erasureDryRunCardStyle} aria-label="Organization erasure dry-run">
            <h3 style={sectionTitleStyle}>Organization erasure dry-run</h3>
            <p style={helperTextStyle}>
              Preview what would be deleted if this organization were erased. This operation does not delete data.
            </p>
            <div style={resultGridStyle}>
              <ResultItem label="Organization name" value={preflightResult.organization.name} />
              <ResultItem label="Organization ID" value={preflightResult.organization.id} />
              <ResultItem label="Organization slug" value={preflightResult.organization.slug} />
              <ResultItem label="Lifecycle" value={preflightResult.organization.customerStatus} />
              <ResultItem label="User email" value={preflightResult.user.normalizedEmail || 'Not available'} />
            </div>
            {preflightResult.organization.customerStatus !== 'SUSPENDED' ? (
              <div style={warningStyle}>
                Erasure dry-run is available only when customer status is SUSPENDED.
              </div>
            ) : null}
            <label style={labelStyle}>
              Type the organization slug to confirm dry-run
              <input
                value={erasureSlugConfirmation}
                onChange={(event) => setErasureSlugConfirmation(event.target.value)}
                disabled={preflightResult.organization.customerStatus !== 'SUSPENDED'}
                style={inputStyle}
                autoComplete="off"
              />
            </label>
            {erasureDryRunError ? <div style={errorStyle}>{erasureDryRunError}</div> : null}
            {erasureDryRunResult ? (
              <div style={successStyle}>
                <strong>Erasure dry-run complete. No data was deleted.</strong>
                <div style={resultGridStyle}>
                  <ResultItem label="Status" value={erasureDryRunResult.status} />
                  <ResultItem label="dataDeleted" value={String(erasureDryRunResult.dataDeleted)} />
                  <ResultItem label="Organizations" value="1" />
                  {ERASURE_INVENTORY_FIELDS.map(([key, label]) => (
                    <ResultItem
                      key={key}
                      label={label}
                      value={String(erasureDryRunResult!.inventory[key])}
                    />
                  ))}
                </div>
                <p style={helperTextStyle}>
                  Global and shared factor records are excluded from organization erasure.
                </p>
              </div>
            ) : null}
            <button
              type="button"
              onClick={handleErasureDryRun}
              disabled={
                runningErasureDryRun ||
                preflightResult.organization.customerStatus !== 'SUSPENDED' ||
                erasureSlugConfirmation !== preflightResult.organization.slug
              }
              style={primaryButtonStyle(
                runningErasureDryRun ||
                preflightResult.organization.customerStatus !== 'SUSPENDED' ||
                erasureSlugConfirmation !== preflightResult.organization.slug,
              )}
            >
              {runningErasureDryRun ? 'Running erasure dry-run...' : 'Run erasure dry-run'}
            </button>

            {eraseEligible ? (
              <section style={eraseCardStyle} aria-label="Erase organization">
                <h3 style={dangerTitleStyle}>Erase organization</h3>
                <div style={destructiveWarningStyle}>
                  <strong>This permanently deletes this organization and its owned data. This action cannot be undone.</strong>
                </div>
                <div style={resultGridStyle}>
                  <ResultItem label="Organization name" value={preflightResult.organization.name} />
                  <ResultItem label="Organization ID" value={preflightResult.organization.id} />
                  <ResultItem label="Organization slug" value={preflightResult.organization.slug} />
                  <ResultItem label="Lifecycle" value={preflightResult.organization.customerStatus} />
                  <ResultItem label="User email" value={preflightResult.user.normalizedEmail || 'Not available'} />
                  <ResultItem label="Organizations" value="1" />
                  {ERASURE_INVENTORY_FIELDS.map(([key, label]) => (
                    <ResultItem
                      key={key}
                      label={label}
                      value={String(erasureDryRunResult!.inventory[key])}
                    />
                  ))}
                </div>
                <p style={helperTextStyle}>
                  Global/shared emission factors are not part of this organization deletion.
                </p>
                <label style={labelStyle}>
                  Type the exact organization slug
                  <input
                    value={eraseSlugConfirmation}
                    onChange={(event) => setEraseSlugConfirmation(event.target.value)}
                    style={inputStyle}
                    autoComplete="off"
                  />
                </label>
                <label style={labelStyle}>
                  Type ERASE ORGANIZATION to confirm
                  <input
                    value={erasePhraseConfirmation}
                    onChange={(event) => setErasePhraseConfirmation(event.target.value)}
                    style={inputStyle}
                    autoComplete="off"
                  />
                </label>
                {erasureError ? <div style={errorStyle}>{erasureError}</div> : null}
                <button
                  type="button"
                  onClick={handleEraseOrganization}
                  disabled={
                    erasingOrganization ||
                    eraseSlugConfirmation !== preflightResult.organization.slug ||
                    erasePhraseConfirmation !== 'ERASE ORGANIZATION'
                  }
                  style={dangerButtonStyle(
                    erasingOrganization ||
                    eraseSlugConfirmation !== preflightResult.organization.slug ||
                    erasePhraseConfirmation !== 'ERASE ORGANIZATION',
                  )}
                >
                  {erasingOrganization ? 'Erasing organization...' : 'Permanently erase organization'}
                </button>
              </section>
            ) : null}
          </section>
        ) : null}
      </section>
    </div>
  );
}

function getInviteLink(
  result: CreatePilotReviewerResponse | RegeneratePilotReviewerInviteResponse | null,
) {
  return result?.inviteLink || result?.setupUrl || result?.inviteUrl || '';
}

function ResultItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={resultItemStyle}>
      <span style={resultLabelStyle}>{label}</span>
      <span style={resultValueStyle}>{value}</span>
    </div>
  );
}

function yesNo(value: boolean) {
  return value ? 'Yes' : 'No';
}

function optionalYesNo(value: boolean | undefined) {
  return value === undefined ? 'Not available' : yesNo(value);
}

function optionalValue(value: number | undefined) {
  return value === undefined ? 'Not available' : String(value);
}

function isValidQuota(value: OrganizationQuotaInput) {
  return (
    Number.isInteger(value.periodDays) && value.periodDays > 0 && value.periodDays <= 365 &&
    Number.isInteger(value.uploadLimit) && value.uploadLimit > 0 &&
    Number.isInteger(value.dailyUploadLimit) && value.dailyUploadLimit > 0 &&
    Number.isInteger(value.maxFileSizeBytes) && value.maxFileSizeBytes > 0 && value.maxFileSizeBytes <= 10_485_760 &&
    Number.isInteger(value.maxConcurrentExtractions) && value.maxConcurrentExtractions > 0 &&
    Number.isInteger(value.maxImportRows) && value.maxImportRows > 0
  );
}

const QUOTA_FIELDS: ReadonlyArray<[
  Exclude<keyof OrganizationQuotaInput, 'enabled'>,
  string,
]> = [
  ['periodDays', 'Period days'],
  ['uploadLimit', 'Period upload limit'],
  ['dailyUploadLimit', 'Daily upload limit'],
  ['maxFileSizeBytes', 'Maximum file size (bytes)'],
  ['maxConcurrentExtractions', 'Extraction concurrency'],
  ['maxImportRows', 'Maximum spreadsheet rows'],
];

function getProvisioningBlockers(result: CustomerPreflightResponse | null) {
  if (!result) return ['Run preflight before provisioning.'];
  const blockers: string[] = [];
  const { user, organization } = result;
  if (!user.exists || !user.id) blockers.push('A matching user is required.');
  if (!organization) blockers.push('A matching organization is required.');
  if (organization && !['PENDING', 'PILOT'].includes(organization.customerStatus)) {
    blockers.push('Organization status must be PENDING or PILOT.');
  }
  if (organization && user.organizationId !== organization.id) {
    blockers.push('The user must belong to the selected organization.');
  }
  if (user.accountType !== 'PILOT_REVIEWER') {
    blockers.push('The user account type must be PILOT_REVIEWER.');
  }
  if (user.isActive !== true) blockers.push('The user must be active.');
  if (user.passwordSetupRequired !== false || user.invitationStatus === 'pending') {
    blockers.push('Password setup must be complete.');
  }
  if (organization && organization.counts.goldenSampleArtifacts > 0) {
    blockers.push('Golden Sample artifacts must be removed before provisioning.');
  }
  return blockers;
}

const ERASURE_INVENTORY_FIELDS: ReadonlyArray<[
  Exclude<keyof OrganizationErasureInventory, 'organizationId' | 'organizationSlug'>,
  string,
]> = [
  ['users', 'Users'],
  ['memberships', 'Memberships'],
  ['facilities', 'Facilities'],
  ['assets', 'Assets'],
  ['documents', 'Documents'],
  ['physicalFiles', 'Physical files'],
  ['documentExtractions', 'Document extractions'],
  ['spreadsheetReviewRows', 'Spreadsheet review rows'],
  ['activityRecords', 'ActivityData'],
  ['calculationSnapshots', 'Calculation snapshots'],
  ['importBatches', 'Import batches'],
  ['metricResults', 'Metric results'],
  ['reports', 'Reports'],
  ['reportArtifacts', 'Report artifacts'],
  ['customConversionFactors', 'Custom factors'],
  ['auditLogs', 'Audit logs'],
  ['activityEvents', 'Activity events'],
  ['aiJobs', 'AI jobs'],
  ['feedback', 'Feedback'],
  ['quotaPolicies', 'Quota policies'],
  ['quotaPeriods', 'Quota periods'],
  ['quotaUsages', 'Quota usage records'],
  ['aiAuthorizations', 'AI authorizations'],
  ['realDataAuthorizations', 'Real-data authorizations'],
];

const pageStyle: React.CSSProperties = {
  maxWidth: 980,
  margin: '0 auto',
  padding: 24,
};

const headerStyle: React.CSSProperties = {
  marginBottom: 18,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  color: '#0f172a',
};

const subtitleStyle: React.CSSProperties = {
  margin: '8px 0 0',
  color: '#64748b',
  lineHeight: 1.6,
};

const noticeStyle: React.CSSProperties = {
  marginBottom: 18,
  padding: 14,
  borderRadius: 12,
  border: '1px solid #bae6fd',
  background: '#f0f9ff',
  color: '#075985',
  lineHeight: 1.6,
  fontWeight: 700,
};

const formCardStyle: React.CSSProperties = {
  display: 'grid',
  gap: 16,
  padding: 18,
  borderRadius: 14,
  border: '1px solid #e2e8f0',
  background: '#fff',
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)',
};

const deactivateCardStyle: React.CSSProperties = {
  ...formCardStyle,
  marginTop: 18,
  borderColor: '#fecaca',
};

const safeguardsSectionStyle: React.CSSProperties = {
  display: 'grid',
  gap: 18,
  marginTop: 32,
  paddingTop: 24,
  borderTop: '2px solid #cbd5e1',
};

const safeguardsTitleStyle: React.CSSProperties = {
  ...titleStyle,
  fontSize: 24,
};

const suspendCardStyle: React.CSSProperties = {
  ...formCardStyle,
  borderColor: '#fca5a5',
  background: '#fffafa',
};

const provisionCardStyle: React.CSSProperties = {
  ...formCardStyle,
  borderColor: '#facc15',
  background: '#fffdf5',
};

const erasureDryRunCardStyle: React.CSSProperties = {
  ...formCardStyle,
  borderColor: '#93c5fd',
  background: '#f8fbff',
};

const eraseCardStyle: React.CSSProperties = {
  display: 'grid',
  gap: 16,
  padding: 18,
  borderRadius: 14,
  border: '2px solid #b91c1c',
  background: '#fff7f7',
};

const dangerTitleStyle: React.CSSProperties = {
  margin: 0,
  color: '#991b1b',
  fontSize: 20,
};

const destructiveWarningStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 10,
  border: '1px solid #ef4444',
  background: '#fef2f2',
  color: '#991b1b',
  lineHeight: 1.5,
};

const reasonListStyle: React.CSSProperties = {
  margin: '8px 0 0',
  paddingLeft: 20,
};

const summaryHeadingStyle: React.CSSProperties = {
  margin: '4px 0 0',
  color: '#334155',
  fontSize: 16,
};

const formCardWithMarginStyle: React.CSSProperties = {
  ...formCardStyle,
  marginTop: 18,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  color: '#0f172a',
  fontSize: 20,
};

const fieldGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 14,
};

const labelStyle: React.CSSProperties = {
  display: 'grid',
  gap: 6,
  color: '#0f172a',
  fontWeight: 800,
};

const purposeFieldsetStyle: React.CSSProperties = {
  display: 'grid',
  gap: 10,
  margin: 0,
  padding: 14,
  borderRadius: 10,
  border: '1px solid #cbd5e1',
};

const purposeOptionStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 10,
  color: '#334155',
  lineHeight: 1.5,
};

const inputStyle: React.CSSProperties = {
  padding: '11px 12px',
  borderRadius: 10,
  border: '1px solid #cbd5e1',
  fontSize: 15,
};

const helperTextStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: 13,
  fontWeight: 600,
  lineHeight: 1.45,
};

const readonlySummaryStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 10,
  border: '1px solid #d1fae5',
  background: '#ecfdf5',
  color: '#047857',
  lineHeight: 1.55,
};

const errorStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 10,
  border: '1px solid #fecaca',
  background: '#fef2f2',
  color: '#991b1b',
};

const warningStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 10,
  border: '1px solid #fed7aa',
  background: '#fff7ed',
  color: '#9a3412',
  lineHeight: 1.55,
};

const successStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 10,
  border: '1px solid #bbf7d0',
  background: '#f0fdf4',
  color: '#047857',
};

function primaryButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    justifySelf: 'start',
    padding: '11px 16px',
    borderRadius: 10,
    border: '1px solid #059669',
    background: disabled ? '#9ca3af' : '#059669',
    color: '#fff',
    fontWeight: 900,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

function dangerButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    ...primaryButtonStyle(disabled),
    border: '1px solid #b91c1c',
    background: disabled ? '#9ca3af' : '#b91c1c',
  };
}

const secondaryButtonStyle: React.CSSProperties = {
  justifySelf: 'start',
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#334155',
  fontWeight: 800,
  cursor: 'pointer',
};

const resultCardStyle: React.CSSProperties = {
  display: 'grid',
  gap: 16,
  marginTop: 18,
  padding: 18,
  borderRadius: 14,
  border: '1px solid #bbf7d0',
  background: '#fff',
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)',
};

const resultGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 10,
};

const resultItemStyle: React.CSSProperties = {
  display: 'grid',
  gap: 4,
  padding: 10,
  borderRadius: 10,
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
};

const resultLabelStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: 12,
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: 0,
};

const resultValueStyle: React.CSSProperties = {
  color: '#0f172a',
  fontWeight: 800,
  overflowWrap: 'anywhere',
};

const copyBlockStyle: React.CSSProperties = {
  display: 'grid',
  gap: 10,
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 82,
  resize: 'vertical',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
};
