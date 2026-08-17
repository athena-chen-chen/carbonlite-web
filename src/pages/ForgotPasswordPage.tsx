import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { getContactEmail } from '../config/api';
import { requestPasswordReset } from '../services/auth';
import { getUserFriendlyErrorMessage } from '../utils/userFriendlyErrors';

const GENERIC_RESET_MESSAGE = 'If an account exists for this email, a password reset link will be sent.';

export default function ForgotPasswordPage() {
  const contactEmail = getContactEmail();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await requestPasswordReset({ email });
      setMessage(GENERIC_RESET_MESSAGE);
    } catch (err) {
      const friendly = getUserFriendlyErrorMessage(err, 'login');
      setError(friendly || GENERIC_RESET_MESSAGE);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={{ margin: 0 }}>Reset your CarbonLite password</h1>
        <p style={subtitleStyle}>
          Enter the email address for your invite-only CarbonLite account. If an account exists,
          we will send a password reset link.
        </p>

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

          {message ? <div style={successStyle}>{message}</div> : null}
          {error ? <div style={errorStyle}>{error}</div> : null}

          <button type="submit" disabled={submitting} style={primaryButtonStyle(submitting)}>
            {submitting ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <p style={footerTextStyle}>
          Have an invite token? <Link to="/set-password">Set password from invite</Link>
        </p>
        <p style={footerTextStyle}>
          Need access? Contact <a href={`mailto:${contactEmail}`} style={contactLinkStyle}>{contactEmail}</a>.
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

const contactLinkStyle: React.CSSProperties = {
  color: '#047857',
  fontWeight: 800,
};
