import { FormEvent, useEffect, useState } from 'react';
import { getCurrentUser, getOrganizationId } from '../services/auth';
import {
  CANADA_PROVINCE_TERRITORY_OPTIONS,
  INDUSTRY_OPTIONS,
  DEFAULT_COUNTRY,
} from '../constants/organizationProfileOptions';
import { canEditWorkspace, isPilotReviewer } from '../utils/permissions';
import { getUserFriendlyErrorMessage } from '../utils/userFriendlyErrors';
import { ApiError } from '../services/api';
import {
  fetchOrganizationProfile,
  hasBackendOrganizationProfileSession,
  isValidPrimaryContactEmail,
  loadOrganizationProfile,
  persistOrganizationProfile,
  PRIMARY_CONTACT_EMAIL_ERROR,
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
  const readOnlyReviewer = isPilotReviewer(currentUser);
  const [profile, setProfile] = useState<OrganizationProfile>(() =>
    loadOrganizationProfile(currentUser),
  );
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof OrganizationProfile, string>>>({});
  const [isSaving, setIsSaving] = useState(false);
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

  return (
    <div style={pageStyle}>
      <h1 style={pageTitleStyle}>Organization & Boundary</h1>
      <p style={pageIntroStyle}>
        Define your organization, reporting period, facilities, and emissions boundary used
        throughout CarbonLite.
      </p>

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

      {readOnlyReviewer ? (
        <div style={formStyle}>
          {fieldGroups.map((group) => (
            <ReadOnlyProfileSection key={group.title} group={group} profile={profile} />
          ))}
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={formStyle} noValidate>
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
            <button type="submit" disabled={isSaving} style={saveButtonStyle(isSaving)}>
              {isSaving ? 'Saving...' : 'Save Organization Profile'}
            </button>
          ) : null}
        </form>
      )}
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

function getSectionNote(title: string) {
  switch (title) {
    case 'Organization':
      return 'This workspace is set up for Canadian emissions reporting. Country is currently fixed to Canada.';
    case 'Reporting Period':
      return 'Set the date range used for Calculation Review and Reports.';
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
  padding: '28px 24px 48px',
  color: '#0f172a',
};

const pageTitleStyle: React.CSSProperties = {
  margin: '0 0 8px',
  color: '#0f172a',
  fontSize: 32,
  lineHeight: 1.15,
};

const pageIntroStyle: React.CSSProperties = {
  maxWidth: 760,
  margin: '0 0 24px',
  color: '#64748b',
  lineHeight: 1.55,
  fontSize: 16,
};

const formStyle: React.CSSProperties = {
  display: 'grid',
  gap: 24,
};

const sectionStyle: React.CSSProperties = {
  padding: 22,
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  background: '#fff',
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

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 16,
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
