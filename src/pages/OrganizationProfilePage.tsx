import { FormEvent, useEffect, useState } from 'react';
import { getCurrentUser } from '../services/auth';
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
    title: 'Organization Profile',
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
    title: 'Reporting Boundary',
    fields: [
      { key: 'geographicBoundary', label: 'Geographic Boundary', type: 'textarea' },
      { key: 'includedFacilitiesOrLocations', label: 'Included Facilities or Locations', type: 'textarea' },
      { key: 'excludedFacilitiesOrLocations', label: 'Excluded Facilities or Locations', type: 'textarea' },
      { key: 'includedScopes', label: 'Included Scopes', type: 'textarea' },
      { key: 'scope3CoverageNote', label: 'Scope 3 Coverage Note', type: 'textarea' },
      { key: 'exclusionsAndLimitations', label: 'Exclusions / Limitations', type: 'textarea' },
      { key: 'boundaryNotes', label: 'Boundary Notes', type: 'textarea' },
    ],
  },
];

export function OrganizationProfilePage() {
  const currentUser = getCurrentUser();
  const currentUserKey = `${currentUser?.id ?? ''}:${currentUser?.organizationId ?? ''}:${currentUser?.email ?? ''}`;
  const canEdit = canEditWorkspace(currentUser);
  const readOnlyReviewer = isPilotReviewer(currentUser);
  const [profile, setProfile] = useState<OrganizationProfile>(() =>
    loadOrganizationProfile(currentUser),
  );
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof OrganizationProfile, string>>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!hasBackendOrganizationProfileSession()) return undefined;

    let isMounted = true;

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
        error instanceof ApiError && error.status >= 500
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
        Define the workspace-level organization profile and reporting boundary used in
        Calculation Review and Reports.
      </p>

      {!canEdit ? (
        <div style={readOnlyNoticeStyle}>
          {readOnlyReviewer
            ? 'Pilot reviewer accounts can view boundary information but cannot edit workspace settings.'
            : 'Read-only access: you can view boundary information but cannot edit workspace settings.'}
        </div>
      ) : null}

      {successMessage ? <div style={successStyle}>{successMessage}</div> : null}
      {error ? <div style={errorStyle}>{error}</div> : null}

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
              {group.title === 'Organization Profile' ? (
                <p style={sectionNoteStyle}>
                  This workspace is configured for Canadian emissions reporting. Country is currently fixed to Canada.
                </p>
              ) : null}
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
      {group.title === 'Organization Profile' ? (
        <p style={sectionNoteStyle}>
          This workspace is configured for Canadian emissions reporting. Country is currently fixed to Canada.
        </p>
      ) : null}
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

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const pageStyle: React.CSSProperties = {
  maxWidth: 1100,
  margin: '0 auto',
  padding: 24,
};

const pageTitleStyle: React.CSSProperties = {
  margin: '0 0 8px',
  color: '#0f172a',
};

const pageIntroStyle: React.CSSProperties = {
  margin: '0 0 18px',
  color: '#475569',
  lineHeight: 1.5,
};

const formStyle: React.CSSProperties = {
  display: 'grid',
  gap: 16,
};

const sectionStyle: React.CSSProperties = {
  padding: 16,
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  background: '#fff',
};

const sectionTitleStyle: React.CSSProperties = {
  margin: '0 0 6px',
  fontSize: 18,
};

const sectionNoteStyle: React.CSSProperties = {
  margin: '0 0 14px',
  color: '#64748b',
  fontSize: 13,
  lineHeight: 1.45,
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 14,
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
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #cbd5e1',
    background: disabled ? '#f8fafc' : '#fff',
    color: disabled ? '#64748b' : '#0f172a',
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
    padding: '11px 16px',
    borderRadius: 10,
    border: 'none',
    background: disabled ? '#94a3b8' : '#10b981',
    color: '#fff',
    fontWeight: 800,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

const readOnlyNoticeStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 12,
  borderRadius: 10,
  border: '1px solid #bfdbfe',
  background: '#eff6ff',
  color: '#1e40af',
  fontWeight: 700,
};

const successStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 12,
  borderRadius: 10,
  border: '1px solid #bbf7d0',
  background: '#f0fdf4',
  color: '#166534',
  fontWeight: 700,
};

const errorStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 12,
  borderRadius: 10,
  border: '1px solid #fecaca',
  background: '#fef2f2',
  color: '#991b1b',
  fontWeight: 700,
};
