import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { setPasswordFromToken } from '../services/auth';
import { getUserFriendlyErrorMessage } from '../utils/userFriendlyErrors';

export default function SetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialToken = useMemo(() => searchParams.get('token') ?? '', [searchParams]);
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (password.length < 10) {
      setError('Password must be at least 10 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      await setPasswordFromToken({ token, password });
      setMessage('Your password has been set. You can now log in.');
      window.setTimeout(() => navigate('/login'), 800);
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err, 'login'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={{ margin: 0 }}>Set your CarbonLite password</h1>
        <p style={subtitleStyle}>
          Use your invite or password reset token to set a password for your invite-only CarbonLite account.
        </p>

        <form onSubmit={handleSubmit} style={formStyle}>
          <label style={labelStyle}>
            Invite or reset token
            <input
              type="text"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              required
              autoComplete="one-time-code"
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            New password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={10}
              autoComplete="new-password"
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Confirm new password
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={10}
              autoComplete="new-password"
              style={inputStyle}
            />
          </label>

          {message ? <div style={successStyle}>{message}</div> : null}
          {error ? <div style={errorStyle}>{error}</div> : null}

          <button type="submit" disabled={submitting} style={primaryButtonStyle(submitting)}>
            {submitting ? 'Setting password...' : 'Set password'}
          </button>
        </form>

        <p style={footerTextStyle}>
          Need a new link? <Link to="/forgot-password">Request password reset</Link>
        </p>
        <p style={footerTextStyle}>
          <Link to="/login">Back to login</Link>
        </p>
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
  maxWidth: 460,
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

const errorStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 10,
  border: '1px solid #fecaca',
  background: '#fef2f2',
  color: '#991b1b',
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
  margin: '14px 0 0',
  color: '#64748b',
  textAlign: 'center',
  lineHeight: 1.5,
};
