import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { getContactEmail, isPublicSignupEnabled } from '../config/api';
import { getCurrentUser } from '../services/auth';
import { isPilotReviewer } from '../utils/permissions';
import { getUserFriendlyErrorMessage } from '../utils/userFriendlyErrors';

export function LoginPage() {
  const { isAuthenticated, login, user } = useAuth();
  const navigate = useNavigate();
  const publicSignupEnabled = isPublicSignupEnabled();
  const contactEmail = getContactEmail();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    const message = sessionStorage.getItem('authMessage');
    sessionStorage.removeItem('authMessage');
    return message ? getUserFriendlyErrorMessage(message, 'login') : null;
  });
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={isPilotReviewer(user) ? '/metrics-summary' : '/upload'} replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await login(email.trim(), password);
      navigate(isPilotReviewer(getCurrentUser()) ? '/metrics-summary' : '/upload', { replace: true });
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err, 'login'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthPageShell title="Log in to CarbonLite" subtitle="Access uploads, records, factors, metrics, and reports.">
      <form onSubmit={handleSubmit} style={formStyle}>
        <label style={labelStyle}>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Password
          <div style={passwordInputWrapperStyle}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              style={passwordInputStyle}
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((visible) => !visible)}
              style={passwordToggleStyle}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </label>

        {error ? <div style={errorStyle}>{error}</div> : null}

        <button type="submit" disabled={submitting} style={primaryButtonStyle(submitting)}>
          {submitting ? 'Logging in...' : 'Log In'}
        </button>

        <div style={authLinksStyle}>
          <Link to="/forgot-password">Forgot password?</Link>
          <span aria-hidden="true">·</span>
          <Link to="/set-password">Set password from invite</Link>
        </div>

        {publicSignupEnabled ? (
          <p style={footerTextStyle}>
            New to CarbonLite? <Link to="/register">Create an account</Link>
          </p>
        ) : (
          <p style={inviteOnlyTextStyle}>
            CarbonLite pilot access is currently invite-only.
            <br />
            <br />
            If you are a pilot reviewer or would like to request access, please contact us at{' '}
            <a href={`mailto:${contactEmail}`} style={contactLinkStyle}>
              {contactEmail}
            </a>
            .
          </p>
        )}
      </form>
    </AuthPageShell>
  );
}

function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6A2 2 0 0 0 12 14a2 2 0 0 0 1.4-.6" />
      <path d="M9.9 4.2A10.5 10.5 0 0 1 12 4c6.5 0 10 8 10 8a17.8 17.8 0 0 1-3.1 4.3" />
      <path d="M6.1 6.1C3.4 7.9 2 12 2 12s3.5 8 10 8a9.8 9.8 0 0 0 5.1-1.4" />
    </svg>
  );
}

function AuthPageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={{ margin: 0 }}>{title}</h1>
        <p style={subtitleStyle}>{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  background: '#f8fafc',
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 430,
  padding: 28,
  borderRadius: 16,
  border: '1px solid #d1fae5',
  background: '#fff',
  boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08)',
};

const subtitleStyle: React.CSSProperties = {
  marginTop: 8,
  marginBottom: 24,
  color: '#64748b',
  lineHeight: 1.6,
};

const formStyle: React.CSSProperties = {
  display: 'grid',
  gap: 14,
};

const labelStyle: React.CSSProperties = {
  display: 'grid',
  gap: 6,
  color: '#0f172a',
  fontWeight: 700,
};

const inputStyle: React.CSSProperties = {
  padding: '11px 12px',
  borderRadius: 10,
  border: '1px solid #cbd5e1',
  fontSize: 15,
};

const passwordInputWrapperStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
};

const passwordInputStyle: React.CSSProperties = {
  ...inputStyle,
  width: '100%',
  paddingRight: 46,
  boxSizing: 'border-box',
};

const passwordToggleStyle: React.CSSProperties = {
  position: 'absolute',
  right: 8,
  top: '50%',
  transform: 'translateY(-50%)',
  width: 34,
  height: 34,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 0,
  borderRadius: 8,
  background: 'transparent',
  color: '#475569',
  cursor: 'pointer',
};

const errorStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 10,
  border: '1px solid #fecaca',
  background: '#fef2f2',
  color: '#991b1b',
};

function primaryButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '11px 16px',
    borderRadius: 10,
    border: '1px solid #059669',
    background: disabled ? '#9ca3af' : '#059669',
    color: '#fff',
    fontWeight: 800,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

const footerTextStyle: React.CSSProperties = {
  margin: '4px 0 0',
  color: '#64748b',
  textAlign: 'center',
};

const inviteOnlyTextStyle: React.CSSProperties = {
  ...footerTextStyle,
  lineHeight: 1.5,
};

const authLinksStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  gap: 8,
  flexWrap: 'wrap',
  color: '#64748b',
  fontSize: 14,
  fontWeight: 700,
};

const contactLinkStyle: React.CSSProperties = {
  color: '#047857',
  fontWeight: 800,
};
