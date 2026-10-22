import { PageHeader } from '../components/PageHeader';
import { FormEvent, useEffect, useState } from 'react';
import { getCurrentUser, getOrganizationId, getUserDisplayName, type AuthUser } from '../services/auth';
import {
  CANADA_PROVINCE_TERRITORY_OPTIONS,
  INDUSTRY_OPTIONS,
  DEFAULT_COUNTRY,
} from '../constants/organizationProfileOptions';
import {
  canEditWorkspace,
  canManageUsers,
  canReviewBoundary,
  formatOrganizationRole,
  getOrganizationRole,
  isPilotReviewer,
} from '../utils/permissions';
import { getUserFriendlyErrorMessage } from '../utils/userFriendlyErrors';
import { ApiError } from '../services/api';
import {
  fetchOrganizationProfile,
  getBoundaryDisplayStatus,
  hasBackendOrganizationProfileSession,
  isValidPrimaryContactEmail,
  loadOrganizationProfile,
  persistOrganizationProfile,
  PRIMARY_CONTACT_EMAIL_ERROR,
  reviewOrganizationBoundary,
  saveOrganizationProfile,
  type OrganizationProfile,
} from '../services/organizationProfile';
import { useSlowLoading } from '../hooks/useSlowLoading';
import { startDevTiming } from '../utils/performanceDiagnostics';

const fieldGroups: Array<{
  title: string;
  fields: Array<{
    key: keyof OrganizationProfile;
    label: string;
    type?: 'text' | 'email' | 'date' | 'textarea';
    required?: boolean;
  }>;
}> = [
  {
    title: 'Organization',
    fields: [
      { key: 'organizationName', label: 'Organization / Workspace', required: true },
      { key: 'industry', label: 'Industry', required: true },
      { key: 'country', label: 'Country', required: true },
      { key: 'provinceOrState', label: 'Province / Territory', required: true },
      { key: 'city', label: 'City' },
      { key: 'primaryContactName', label: 'Primary Contact Name' },
      { key: 'primaryContactEmail', label: 'Primary Contact Email', type: 'email' },
    ],
  },
  {
    title: 'Reporting Period',
    fields: [
      { key: 'reportingPeriodStart', label: 'Reporting Period Start', type: 'date' },
      { key: 'reportingPeriodEnd', label: 'Reporting Period End', type: 'date' },
    ],
  },
  {
    title: 'Operational Boundary',
    fields: [
      { key: 'geographicBoundary', label: 'Geographic Boundary', type: 'textarea' },
    ],
  },
  {
    title: 'Facilities / Sites',
    fields: [
      { key: 'includedFacilitiesOrLocations', label: 'Included Facilities or Locations', type: 'textarea' },
      { key: 'excludedFacilitiesOrLocations', label: 'Excluded Facilities or Locations', type: 'textarea' },
    ],
  },
  {
    title: 'Scope Coverage',
    fields: [
      { key: 'includedScopes', label: 'Included Scopes', type: 'textarea' },
      { key: 'scope3CoverageNote', label: 'Scope 3 Coverage Note', type: 'textarea' },
    ],
  },
  {
    title: 'Exclusions & Notes',
    fields: [
      { key: 'exclusionsAndLimitations', label: 'Exclusions / Limitations', type: 'textarea' },
      { key: 'boundaryNotes', label: 'Boundary Notes', type: 'textarea' },
    ],
  },
];

export function OrganizationProfilePage() {
  const currentUser = getCurrentUser();
  const currentUserKey = `${currentUser?.id ?? ''}:${getOrganizationId(currentUser)}:${currentUser?.email ?? ''}`;
  const canEdit = canEditWorkspace(currentUser);
  const canReview = canReviewBoundary(currentUser);
  const canManageMembers = canManageUsers(currentUser);
  const organizationRole = getOrganizationRole(currentUser);
  const readOnlyReviewer = isPilotReviewer(currentUser);
  const [profile, setProfile] = useState<OrganizationProfile>(() =>
    loadOrganizationProfile(currentUser),
  );
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof OrganizationProfile, string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isReviewingBoundary, setIsReviewingBoundary] = useState(false);
  const [boundaryReviewNote, setBoundaryReviewNote] = useState('');
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const isSlowProfileLoading = useSlowLoading(isProfileLoading);

  useEffect(() => {
    if (!hasBackendOrganizationProfileSession()) return undefined;

    let isMounted = true;
    const endTiming = startDevTiming('loadOrganizationBoundary');
    setIsProfileLoading(true);

    fetchOrganizationProfile(currentUser)
      .then((backendProfile) => {
        if (isMounted) {
          setProfile(backendProfile);
        }
      })
      .catch((error) => {
        if (isMounted) {
          if (readOnlyReviewer) {
            setProfile(loadOrganizationProfile(currentUser));
            setError('');
            return;
          }

          setError(getUserFriendlyErrorMessage(error, 'organizationProfile'));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsProfileLoading(false);
        }
        endTiming();
      });

    return () => {
      isMounted = false;
    };
  }, [currentUserKey, readOnlyReviewer]);

  function updateField(key: keyof OrganizationProfile, value: string) {
    if (!canEdit) return;
    setProfile((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: '' }));
  }

  function updateIndustry(value: string) {
    if (!canEdit) return;
    setProfile((current) => ({
      ...current,
      industry: value,
      otherIndustry: value === 'Other' ? current.otherIndustry ?? '' : '',
    }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    try {
      const profileToSave = {
        ...profile,
        country: DEFAULT_COUNTRY,
        primaryContactEmail: profile.primaryContactEmail.trim().toLowerCase(),
      };

      if (!isValidPrimaryContactEmail(profileToSave.primaryContactEmail)) {
        setFieldErrors((current) => ({
          ...current,
          primaryContactEmail: PRIMARY_CONTACT_EMAIL_ERROR,
        }));
        setSuccessMessage('');
        setError('');
        return;
      }

      setIsSaving(true);
      const saved = hasBackendOrganizationProfileSession()
        ? await persistOrganizationProfile(profileToSave, currentUser)
        : saveOrganizationProfile(profileToSave, currentUser);
      setProfile(saved);
      setSuccessMessage('Organization profile saved.');
      setError('');
      setFieldErrors({});
    } catch (error) {
      setSuccessMessage('');
      setError(
        error instanceof ApiError && error.status === 403
          ? readOnlyReviewer
            ? 'Read-only access: you can view boundary information but cannot edit workspace settings.'
            : 'Your account has read-only access to this workspace.'
          : error instanceof ApiError && error.status >= 500
          ? 'Organization profile could not be saved. Please try again.'
          : getUserFriendlyErrorMessage(error, 'organizationProfile'),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleReviewBoundary() {
    if (!canReview) {
      setSuccessMessage('');
      setError('Reviewer permission required to review the reporting boundary.');
      return;
    }

    try {
      setIsReviewingBoundary(true);
      const reviewedProfile = await reviewOrganizationBoundary({
        profile,
        reviewNote: boundaryReviewNote,
        user: currentUser,
      });
      setProfile(reviewedProfile);
      setBoundaryReviewNote('');
      setSuccessMessage('Reporting boundary marked as reviewed.');
      setError('');
    } catch (error) {
      setSuccessMessage('');
      setError(getUserFriendlyErrorMessage(error, 'organizationProfile'));
    } finally {
      setIsReviewingBoundary(false);
    }
  }

  return (
    <div style={pageStyle}>
      <PageHeader title="Organization & Boundary" />

      <div style={currentUserContextStyle}>
        <strong>Your role:</strong> {formatOrganizationRole(organizationRole)}
        <span style={currentUserContextDividerStyle}>|</span>
        <span>
          {canReview
            ? 'Boundary review available'
            : 'Reviewer permission required for boundary review'}
        </span>
      </div>

      {!canEdit ? (
        <div style={readOnlyNoticeStyle}>
          {readOnlyReviewer
            ? 'Read-only access: you can view boundary information but cannot edit workspace settings.'
            : 'Your account has read-only access to this workspace.'}
        </div>
      ) : null}

      {successMessage ? <div style={successStyle}>{successMessage}</div> : null}
      {error ? <div style={errorStyle}>{error}</div> : null}
      {isProfileLoading ? (
        <div role="status" aria-live="polite" style={loadingNoticeStyle}>
          Loading organization boundary...
          {isSlowProfileLoading ? (
            <div style={slowLoadingTextStyle}>
              Still loading — this may take a few seconds.
            </div>
          ) : null}
        </div>
      ) : null}

      <BoundaryReviewSection
        profile={profile}
        canReview={canReview}
        isReviewing={isReviewingBoundary}
        reviewNote={boundaryReviewNote}
        onReviewNoteChange={setBoundaryReviewNote}
        onReview={handleReviewBoundary}
      />

      {readOnlyReviewer ? (
        <div style={formStyle}>
          {fieldGroups.map((group) => (
            <ReadOnlyProfileSection key={group.title} group={group} profile={profile} />
          ))}
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={formStyle} noValidate aria-label="Organization profile and boundary form">
          {fieldGroups.map((group) => (
            <section key={group.title} style={sectionStyle} aria-labelledby={`${slugify(group.title)}-title`}>
              <h2 id={`${slugify(group.title)}-title`} style={sectionTitleStyle}>{group.title}</h2>
              <p style={sectionNoteStyle}>{getSectionNote(group.title)}</p>
              <div style={gridStyle}>
                {group.fields.map((field) => (
                  <label key={field.key} style={fieldStyle}>
                    <span style={labelStyle}>
                      {field.label}
                      {field.required ? ' *' : ''}
                    </span>
                    {field.key === 'industry' ? (
                      <>
                        <select
                          value={profile.industry}
                          onChange={(event) => updateIndustry(event.target.value)}
                          disabled={!canEdit}
                          required={field.required}
                          style={inputStyle(!canEdit)}
                        >
                          <option value="">Select industry</option>
                          {INDUSTRY_OPTIONS.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                        {profile.industry === 'Other' ? (
                          <input
                            type="text"
                            aria-label="Other industry"
                            placeholder="Enter industry"
                            value={profile.otherIndustry ?? ''}
                            onChange={(event) => updateField('otherIndustry', event.target.value)}
                            disabled={!canEdit}
                            maxLength={1200}
                            required
                            style={inputStyle(!canEdit)}
                          />
                        ) : null}
                      </>
                    ) : field.key === 'country' ? (
                      <input
                        type="text"
                        value={DEFAULT_COUNTRY}
                        readOnly
                        disabled
                        required={field.required}
                        style={inputStyle(true)}
                      />
                    ) : field.key === 'provinceOrState' ? (
                      <select
                        value={profile.provinceOrState}
                        onChange={(event) => updateField('provinceOrState', event.target.value)}
                        disabled={!canEdit}
                        required={field.required}
                        style={inputStyle(!canEdit)}
                      >
                        <option value="">Select province or territory</option>
                        {CANADA_PROVINCE_TERRITORY_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        value={profile[field.key]}
                        onChange={(event) => updateField(field.key, event.target.value)}
                        disabled={!canEdit}
                        maxLength={1200}
                        style={textareaStyle(!canEdit)}
                      />
                    ) : (
                      <input
                        type={field.type ?? 'text'}
                        value={profile[field.key]}
                        onChange={(event) => updateField(field.key, event.target.value)}
                        disabled={!canEdit}
                        maxLength={1200}
                        required={field.required}
                        style={inputStyle(!canEdit)}
                        aria-invalid={Boolean(fieldErrors[field.key])}
                        aria-describedby={fieldErrors[field.key] ? `${String(field.key)}-error` : undefined}
                      />
                    )}
                    {fieldErrors[field.key] ? (
                      <span id={`${String(field.key)}-error`} role="alert" style={fieldErrorStyle}>
                        {fieldErrors[field.key]}
                      </span>
                    ) : null}
                  </label>
                ))}
              </div>
            </section>
          ))}

          {canEdit ? (
            <div style={formFooterStyle}>
              <button type="submit" disabled={isSaving} style={saveButtonStyle(isSaving)}>
                {isSaving ? 'Saving...' : 'Save Organization Profile'}
              </button>
            </div>
          ) : null}
        </form>
      )}

      <div style={settingsSupplementalStackStyle}>
        <MembersAndAccessSection
          currentUser={currentUser}
          roleLabel={formatOrganizationRole(organizationRole)}
          canManageMembers={canManageMembers}
        />

        <DataPrivacySection />
      </div>
    </div>
  );
}

function BoundaryReviewSection({
  profile,
  canReview,
  isReviewing,
  reviewNote,
  onReviewNoteChange,
  onReview,
}: {
  profile: OrganizationProfile;
  canReview: boolean;
  isReviewing: boolean;
  reviewNote: string;
  onReviewNoteChange: (value: string) => void;
  onReview: () => void;
}) {
  return (
    <section style={sectionStyle} aria-labelledby="boundary-review-title">
      <h2 id="boundary-review-title" style={sectionTitleStyle}>Reporting Boundary Review</h2>
      <p style={sectionNoteStyle}>
        Record that an authorized user has reviewed the configured reporting boundary. This is separate
        from CarbonLite calculation coverage and is not a certification or external assurance opinion.
      </p>
      <div style={trustGridStyle}>
        <TrustFact label="Review status" value={getBoundaryDisplayStatus(profile)} />
        <TrustFact label="Boundary version" value={`v${profile.boundaryVersion || 1}`} />
        <TrustFact label="Reviewed by" value={profile.boundaryReviewedBy || 'Not assigned'} />
        <TrustFact label="Reviewed at" value={formatDateTime(profile.boundaryReviewedAt)} />
      </div>
      {profile.boundaryReviewNote ? (
        <div style={trustFactStyle}>
          <span style={labelStyle}>Review note</span>
          <span style={readOnlyValueStyle}>{profile.boundaryReviewNote}</span>
        </div>
      ) : null}
      <div style={reviewActionPanelStyle}>
        <label style={fieldStyle}>
          <span style={labelStyle}>Reviewer note</span>
          <textarea
            value={reviewNote}
            onChange={(event) => onReviewNoteChange(event.target.value)}
            disabled={!canReview || isReviewing}
            maxLength={1200}
            style={boundaryReviewNoteStyle(!canReview || isReviewing)}
          />
        </label>
        <button
          type="button"
          onClick={onReview}
          disabled={!canReview || isReviewing}
          title={canReview ? 'Record boundary review' : 'Reviewer permission required'}
          style={saveButtonStyle(!canReview || isReviewing)}
        >
          {isReviewing ? 'Recording Review...' : 'Review Boundary'}
        </button>
        <p style={permissionHelpStyle}>
          {canReview
            ? 'Use this after confirming the organization, period, facilities, scopes, and exclusions are correct.'
            : 'Only organization owners, admins, or reviewers can record boundary review.'}
        </p>
      </div>
    </section>
  );
}

function MembersAndAccessSection({
  currentUser,
  roleLabel,
  canManageMembers,
}: {
  currentUser: AuthUser | null;
  roleLabel: string;
  canManageMembers: boolean;
}) {
  const displayName = getUserDisplayName(currentUser).trim();
  const email = String(currentUser?.email ?? '').trim();
  const hasDistinctDisplayName = Boolean(displayName && email && displayName !== email);
  const summaryItems = hasDistinctDisplayName
    ? [
        { label: 'Current user', value: displayName || 'Unknown user' },
        { label: 'Email', value: email || 'Not available' },
        { label: 'Role', value: roleLabel },
        { label: 'Access status', value: currentUser ? 'Signed in' : 'Not signed in' },
      ]
    : [
        { label: 'User', value: email || displayName || 'Unknown user' },
        { label: 'Role', value: roleLabel },
        { label: 'Access status', value: currentUser ? 'Signed in' : 'Not signed in' },
      ];

  return (
    <section style={supplementalSectionStyle} aria-labelledby="members-access-title">
      <h2 id="members-access-title" style={sectionTitleStyle}>Members & Roles</h2>
      <p style={supplementalSectionNoteStyle}>
        Workspace data is visible to organization-authorized users according to role. Authorization checks
        are enforced by application permissions and must also be enforced by backend APIs.
      </p>
      <dl style={memberSummaryGridStyle}>
        {summaryItems.map((item) => (
          <ReadOnlySummaryItem key={item.label} label={item.label} value={item.value} />
        ))}
      </dl>
      <p style={memberHelpTextStyle}>
        {canManageMembers
          ? 'Member management is controlled by backend membership APIs when available.'
          : 'Only organization owners or admins can manage members.'}
      </p>
    </section>
  );
}

function DataPrivacySection() {
  const privacyItems = [
    {
      label: 'Data handling',
      value: 'CarbonLite processes uploaded operational data to extract source rows, calculate emissions, and prepare review outputs.',
    },
    {
      label: 'Retention',
      value: 'Workspace data is retained until deleted by an authorized workspace user or by CarbonLite support action. No automatic deletion window is currently shown in the app.',
    },
    {
      label: 'Deletion',
      value: 'Deleting source documents or records may remove active workspace content; minimal audit metadata may remain for traceability.',
    },
    {
      label: 'Backup / recovery',
      value: 'No customer-facing backup or point-in-time recovery guarantee is currently configured in the app UI.',
    },
    {
      label: 'Upload guidance',
      value: 'Upload only information you are authorized to provide. Avoid unnecessary personal or sensitive information in source files.',
    },
    {
      label: 'Exports',
      value: 'Reports and CSV exports may contain uploaded source references, calculated values, status, and audit metadata.',
    },
  ];

  return (
    <section style={supplementalSectionStyle} aria-labelledby="data-privacy-title">
      <h2 id="data-privacy-title" style={sectionTitleStyle}>Data & Privacy</h2>
      <p style={supplementalSectionNoteStyle}>
        This section describes the customer-facing posture currently visible in the app.
      </p>
      <dl style={privacyGridStyle}>
        {privacyItems.map((item) => (
          <InfoCard key={item.label} label={item.label} value={item.value} />
        ))}
      </dl>
    </section>
  );
}

function ReadOnlySummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={summaryItemStyle}>
      <dt style={summaryLabelStyle}>{label}</dt>
      <dd style={summaryValueStyle}>{value}</dd>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoCardStyle}>
      <dt style={infoCardLabelStyle}>{label}</dt>
      <dd style={infoCardBodyStyle}>{value}</dd>
    </div>
  );
}

function TrustFact({ label, value }: { label: string; value: string }) {
  return (
    <div style={trustFactStyle}>
      <span style={labelStyle}>{label}</span>
      <span style={readOnlyValueStyle}>{value}</span>
    </div>
  );
}

function ReadOnlyProfileSection({
  group,
  profile,
}: {
  group: (typeof fieldGroups)[number];
  profile: OrganizationProfile;
}) {
  return (
    <section style={sectionStyle} aria-labelledby={`${slugify(group.title)}-title`}>
      <h2 id={`${slugify(group.title)}-title`} style={sectionTitleStyle}>{group.title}</h2>
      <p style={sectionNoteStyle}>{getSectionNote(group.title)}</p>
      {group.title === 'Reporting Period' ? (
        <p style={readOnlyPeriodStyle}>
          {profile.reportingPeriodStart} to {profile.reportingPeriodEnd}
        </p>
      ) : null}
      <div style={gridStyle}>
        {group.fields.map((field) => (
          <div key={field.key} style={readOnlyFieldStyle}>
            <span style={labelStyle}>{field.label}</span>
            <span style={readOnlyValueStyle}>{getReadOnlyFieldValue(profile, field.key)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function getReadOnlyFieldValue(profile: OrganizationProfile, key: keyof OrganizationProfile) {
  if (key === 'industry') {
    return profile.industry === 'Other'
      ? profile.otherIndustry || 'Other'
      : profile.industry || 'Not specified';
  }

  return profile[key] || 'Not specified';
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Not reviewed';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not reviewed';
  return date.toLocaleString();
}

function getSectionNote(title: string) {
  switch (title) {
    case 'Organization':
      return 'This workspace is set up for Canadian emissions reporting. Country is currently fixed to Canada.';
    case 'Reporting Period':
      return 'Set the date range used for Calculation Results and Reports.';
    case 'Operational Boundary':
      return 'Define which operations and emissions sources are included in this workspace.';
    case 'Facilities / Sites':
      return 'List the locations included in this reporting boundary.';
    case 'Scope Coverage':
      return 'Summarize the scopes and selected Scope 3 activity types covered by this workspace.';
    case 'Exclusions & Notes':
      return 'Document material exclusions, assumptions, or boundary limitations for reviewers.';
    default:
      return '';
  }
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const pageStyle: React.CSSProperties = {
  maxWidth: 1100,
  margin: '0 auto',
  padding: '24px 24px 48px',
  color: '#0f172a',
};

const currentUserContextStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  alignItems: 'center',
  margin: '0 0 20px',
  color: '#334155',
  fontSize: 13,
};

const currentUserContextDividerStyle: React.CSSProperties = {
  color: '#cbd5e1',
};

const formStyle: React.CSSProperties = {
  display: 'grid',
  gap: 24,
};

const formFooterStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-start',
  paddingTop: 2,
};

const settingsSupplementalStackStyle: React.CSSProperties = {
  display: 'grid',
  gap: 24,
  marginTop: 24,
};

const sectionStyle: React.CSSProperties = {
  padding: 22,
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  background: '#fff',
};

const supplementalSectionStyle: React.CSSProperties = {
  ...sectionStyle,
  padding: 26,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: '0 0 8px',
  fontSize: 18,
  color: '#0f172a',
  lineHeight: 1.3,
};

const sectionNoteStyle: React.CSSProperties = {
  margin: '0 0 16px',
  color: '#64748b',
  fontSize: 13,
  lineHeight: 1.5,
};

const supplementalSectionNoteStyle: React.CSSProperties = {
  ...sectionNoteStyle,
  maxWidth: 920,
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 16,
};

const trustGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 14,
};

const trustFactStyle: React.CSSProperties = {
  display: 'grid',
  gap: 6,
  alignContent: 'start',
};

const reviewActionPanelStyle: React.CSSProperties = {
  display: 'grid',
  gap: 12,
  marginTop: 16,
  maxWidth: 680,
};

const permissionHelpStyle: React.CSSProperties = {
  margin: 0,
  color: '#64748b',
  fontSize: 13,
  lineHeight: 1.45,
};

const memberSummaryGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
  gap: 18,
  margin: 0,
};

const summaryItemStyle: React.CSSProperties = {
  display: 'grid',
  gap: 5,
  minWidth: 0,
};

const summaryLabelStyle: React.CSSProperties = {
  color: '#475569',
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 0,
};

const summaryValueStyle: React.CSSProperties = {
  margin: 0,
  color: '#0f172a',
  fontSize: 15,
  lineHeight: 1.45,
  overflowWrap: 'anywhere',
};

const memberHelpTextStyle: React.CSSProperties = {
  margin: '18px 0 0',
  color: '#64748b',
  fontSize: 13,
  lineHeight: 1.45,
};

const privacyGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: 16,
  margin: 0,
};

const infoCardStyle: React.CSSProperties = {
  display: 'grid',
  gap: 8,
  alignContent: 'start',
  padding: 16,
  borderRadius: 10,
  border: '1px solid #e5e7eb',
  background: '#f8fafc',
  minWidth: 0,
};

const infoCardLabelStyle: React.CSSProperties = {
  color: '#334155',
  fontSize: 13,
  fontWeight: 800,
};

const infoCardBodyStyle: React.CSSProperties = {
  margin: 0,
  color: '#334155',
  fontSize: 13,
  lineHeight: 1.55,
  overflowWrap: 'break-word',
};

const fieldStyle: React.CSSProperties = {
  display: 'grid',
  gap: 6,
};

const readOnlyFieldStyle: React.CSSProperties = {
  display: 'grid',
  gap: 6,
  alignContent: 'start',
};

const labelStyle: React.CSSProperties = {
  color: '#334155',
  fontSize: 13,
  fontWeight: 800,
};

const readOnlyValueStyle: React.CSSProperties = {
  minHeight: 42,
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
  color: '#0f172a',
  lineHeight: 1.45,
  whiteSpace: 'pre-wrap',
};

const readOnlyPeriodStyle: React.CSSProperties = {
  margin: '0 0 14px',
  color: '#0f172a',
  fontSize: 14,
  fontWeight: 800,
};

const fieldErrorStyle: React.CSSProperties = {
  color: '#991b1b',
  fontSize: 12,
  fontWeight: 700,
  lineHeight: 1.4,
};

function inputStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '11px 12px',
    borderRadius: 10,
    border: '1px solid #e2e8f0',
    background: disabled ? '#f1f5f9' : '#fff',
    color: disabled ? '#64748b' : '#0f172a',
    fontSize: 14,
  };
}

function textareaStyle(disabled: boolean): React.CSSProperties {
  return {
    ...inputStyle(disabled),
    minHeight: 92,
    resize: disabled ? 'none' : 'vertical',
    fontFamily: 'inherit',
  };
}

function boundaryReviewNoteStyle(disabled: boolean): React.CSSProperties {
  return {
    ...textareaStyle(disabled),
    minHeight: 72,
  };
}

function saveButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    justifySelf: 'start',
    padding: '11px 18px',
    borderRadius: 10,
    border: '1px solid transparent',
    background: disabled ? '#94a3b8' : '#047857',
    color: '#fff',
    fontWeight: 800,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

const readOnlyNoticeStyle: React.CSSProperties = {
  marginBottom: 20,
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
  color: '#475569',
  fontWeight: 700,
};

const successStyle: React.CSSProperties = {
  marginBottom: 20,
  padding: 12,
  borderRadius: 10,
  border: '1px solid #bbf7d0',
  background: '#ecfdf5',
  color: '#047857',
  fontWeight: 700,
};

const loadingNoticeStyle: React.CSSProperties = {
  marginBottom: 20,
  padding: 12,
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
  color: '#475569',
  fontWeight: 800,
};

const slowLoadingTextStyle: React.CSSProperties = {
  marginTop: 6,
  color: '#475569',
  fontSize: 13,
  fontWeight: 700,
};

const errorStyle: React.CSSProperties = {
  marginBottom: 20,
  padding: 12,
  borderRadius: 10,
  border: '1px solid #fecaca',
  background: '#fef2f2',
  color: '#b91c1c',
  fontWeight: 700,
};
