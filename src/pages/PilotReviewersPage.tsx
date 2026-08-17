import { FormEvent, useMemo, useState } from 'react';
import {
  createPilotReviewer,
  type CreatePilotReviewerResponse,
} from '../services/pilotReviewers';
import { getUserFriendlyErrorMessage } from '../utils/userFriendlyErrors';

const DEFAULT_WORKSPACE = 'CarbonLite Sample Workspace';

export default function PilotReviewersPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [workspaceName, setWorkspaceName] = useState(DEFAULT_WORKSPACE);
  const [expiresAt, setExpiresAt] = useState('');
  const [result, setResult] = useState<CreatePilotReviewerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setupLink = useMemo(
    () => result?.inviteLink || result?.setupUrl || result?.inviteUrl || '',
    [result],
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);
    setCopyMessage(null);

    try {
      const response = await createPilotReviewer({
        name,
        email,
        workspaceName,
        expiresAt,
      });
      setResult(response);
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err, 'unknown'));
    } finally {
      setSubmitting(false);
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

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Pilot Reviewers</h1>
          <p style={subtitleStyle}>
            Create invite-only, read-only pilot reviewer accounts for the sample workspace.
          </p>
        </div>
      </header>

      <section style={noticeStyle}>
        Pilot reviewers use sample data only. They can view records, Calculation Review, reports, and
        submit feedback, but cannot upload, import, edit, delete, reset demo data, edit factors, or access admin pages.
      </section>

      <form onSubmit={handleSubmit} style={formCardStyle}>
        <h2 style={sectionTitleStyle}>Create Pilot Reviewer</h2>

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
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
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
              Only sample/demo workspaces should be used for pilot reviewers.
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
          <strong>Account settings:</strong> Account type `PILOT_REVIEWER`, role `REVIEWER`,
          setup-link invite, password reset required, sample-workspace-only access.
        </div>

        {error ? <div style={errorStyle}>{error}</div> : null}

        <button type="submit" disabled={submitting} style={primaryButtonStyle(submitting)}>
          {submitting ? 'Creating...' : 'Create Pilot Reviewer'}
        </button>
      </form>

      {result ? (
        <section style={resultCardStyle} aria-label="Pilot reviewer invite result">
          <h2 style={sectionTitleStyle}>Invite Ready</h2>
          <div style={resultGridStyle}>
            <ResultItem label="Name" value={result.name || name} />
            <ResultItem label="Email" value={result.email || email} />
            <ResultItem label="Workspace" value={result.workspaceName || result.workspace || workspaceName} />
            <ResultItem label="Account Type" value={result.accountType || 'PILOT_REVIEWER'} />
            <ResultItem label="Role" value={result.role || 'REVIEWER'} />
            <ResultItem label="Expires" value={result.expiresAt || result.expires || expiresAt || 'Not set'} />
          </div>

          {setupLink ? (
            <div style={copyBlockStyle}>
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
    </div>
  );
}

function ResultItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={resultItemStyle}>
      <span style={resultLabelStyle}>{label}</span>
      <span style={resultValueStyle}>{value}</span>
    </div>
  );
}

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
