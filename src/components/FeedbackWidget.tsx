import { FormEvent, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { getAccountType, getOrganizationName } from '../services/auth';
import {
  submitFeedback,
  type FeedbackType,
} from '../services/feedback';
import { buildFeedbackMailtoHref } from '../utils/feedbackMailto';
import { getUserFriendlyErrorMessage } from '../utils/userFriendlyErrors';

const feedbackTypes: Array<{ value: FeedbackType; label: string }> = [
  { value: 'QUESTION', label: 'Question' },
  { value: 'SUGGESTION', label: 'Suggestion' },
  { value: 'BUG', label: 'Bug' },
  { value: 'OTHER', label: 'Other' },
];

const initialForm = {
  type: 'QUESTION' as FeedbackType,
  intent: '',
  message: '',
  email: '',
};

export function FeedbackWidget() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const pagePath = `${location.pathname}${location.search}${location.hash}`;
  const workspaceName = getOrganizationName(user);
  const accountType = getAccountType(user);
  const appVersion = import.meta.env.VITE_APP_VERSION || 'Not available';
  const feedbackHref = buildFeedbackMailtoHref({
    pagePath,
    userEmail: user?.email,
    workspaceName,
    accountType,
    appVersion,
  });

  useEffect(() => {
    if (!isOpen) return undefined;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setForm(initialForm);
        setError(null);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isAuthenticated) return null;

  function resetAndClose() {
    setIsOpen(false);
    setForm(initialForm);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.intent.trim() || !form.message.trim()) {
      setError('Please tell us what you were trying to do and what happened.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await submitFeedback({
        type: form.type,
        intent: form.intent.trim(),
        message: form.message.trim(),
        email: form.email.trim() || undefined,
        page: pagePath,
        url: `${window.location.origin}${location.pathname}${location.search}${location.hash}`,
        workspaceName,
        accountType,
        appVersion,
      });
      setSuccess('Thank you for your feedback.');
      setForm(initialForm);
      window.setTimeout(() => {
        setIsOpen(false);
        setSuccess(null);
      }, 900);
    } catch (err) {
      setError(getUserFriendlyErrorMessage(err, 'feedbackSubmission'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setForm((current) => ({ ...current, email: current.email || user?.email || '' }));
          setIsOpen(true);
          setError(null);
          setSuccess(null);
        }}
        style={floatingButtonStyle}
        aria-label="Send feedback to CarbonLite"
        title="Send feedback or report an issue with the CarbonLite pilot."
      >
        Send Feedback
      </button>

      {isOpen ? (
        <div style={overlayStyle} role="dialog" aria-modal="true" aria-labelledby="feedback-title">
          <div style={modalStyle}>
            <div style={modalHeaderStyle}>
              <div>
                <h2 id="feedback-title" style={titleStyle}>Send Feedback</h2>
                <p style={subtitleStyle}>
                  CarbonLite is currently in pilot stage. Your feedback helps improve workflow, factor transparency, and report clarity.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close feedback"
                onClick={resetAndClose}
                style={closeButtonStyle}
              >
                ×
              </button>
            </div>

            {success ? <div style={successStyle}>{success}</div> : null}
            {error ? <div style={errorStyle}>{error}</div> : null}

            <div style={contextStyle}>
              Context included: {pagePath} · {getAccountType(user)}
            </div>

            <form onSubmit={handleSubmit} style={formStyle}>
              <label style={labelStyle}>
                Feedback Type
                <select
                  value={form.type}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      type: event.target.value as FeedbackType,
                    }))
                  }
                  style={inputStyle}
                >
                  {feedbackTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>

              <label style={labelStyle}>
                What were you trying to do? (required)
                <textarea
                  value={form.intent}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, intent: event.target.value }))
                  }
                  required
                  rows={3}
                  style={textareaStyle}
                />
              </label>

              <label style={labelStyle}>
                What happened? (required)
                <textarea
                  value={form.message}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, message: event.target.value }))
                  }
                  required
                  rows={4}
                  style={textareaStyle}
                />
              </label>

              <label style={labelStyle}>
                Email (optional)
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, email: event.target.value }))
                  }
                  style={inputStyle}
                />
              </label>

              <div style={actionsStyle}>
                <a href={feedbackHref} style={emailButtonStyle}>
                  Send by email
                </a>
                <button type="button" onClick={resetAndClose} style={secondaryButtonStyle}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} style={primaryButtonStyle}>
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

const floatingButtonStyle: CSSProperties = {
  position: 'fixed',
  right: 24,
  bottom: 24,
  zIndex: 40,
  border: '1px solid #047857',
  borderRadius: 999,
  background: '#047857',
  color: '#fff',
  padding: '12px 18px',
  fontSize: 14,
  fontWeight: 800,
  boxShadow: '0 14px 30px rgba(4, 120, 87, 0.25)',
  cursor: 'pointer',
};

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 60,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(15, 23, 42, 0.45)',
  padding: 20,
};

const modalStyle: CSSProperties = {
  width: 'min(540px, 100%)',
  borderRadius: 12,
  border: '1px solid #dbe4ea',
  background: '#fff',
  boxShadow: '0 24px 60px rgba(15, 23, 42, 0.25)',
  padding: 24,
};

const modalHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  alignItems: 'flex-start',
  marginBottom: 18,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 22,
  color: '#0f172a',
};

const subtitleStyle: CSSProperties = {
  margin: '6px 0 0',
  color: '#64748b',
  fontSize: 14,
};

const contextStyle: CSSProperties = {
  margin: '-6px 0 14px',
  border: '1px solid #e0f2fe',
  borderRadius: 8,
  background: '#f0f9ff',
  color: '#075985',
  padding: '8px 10px',
  fontSize: 12,
  fontWeight: 700,
};

const closeButtonStyle: CSSProperties = {
  border: '1px solid #d1d5db',
  borderRadius: 8,
  background: '#fff',
  color: '#334155',
  fontSize: 22,
  lineHeight: 1,
  width: 34,
  height: 34,
  cursor: 'pointer',
};

const formStyle: CSSProperties = {
  display: 'grid',
  gap: 14,
};

const labelStyle: CSSProperties = {
  display: 'grid',
  gap: 7,
  color: '#0f172a',
  fontSize: 13,
  fontWeight: 700,
};

const inputStyle: CSSProperties = {
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: 14,
  color: '#0f172a',
  background: '#fff',
};

const textareaStyle: CSSProperties = {
  ...inputStyle,
  resize: 'vertical',
  minHeight: 90,
  fontFamily: 'inherit',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 10,
  marginTop: 4,
};

const primaryButtonStyle: CSSProperties = {
  border: '1px solid #047857',
  borderRadius: 8,
  background: '#047857',
  color: '#fff',
  padding: '10px 16px',
  fontWeight: 800,
  cursor: 'pointer',
};

const secondaryButtonStyle: CSSProperties = {
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  background: '#fff',
  color: '#334155',
  padding: '10px 16px',
  fontWeight: 700,
  cursor: 'pointer',
};

const emailButtonStyle: CSSProperties = {
  ...secondaryButtonStyle,
  color: '#0369a1',
  borderColor: '#bae6fd',
  background: '#f0f9ff',
  textDecoration: 'none',
};

const successStyle: CSSProperties = {
  border: '1px solid #bbf7d0',
  borderRadius: 8,
  background: '#f0fdf4',
  color: '#166534',
  padding: '10px 12px',
  marginBottom: 12,
  fontWeight: 700,
};

const errorStyle: CSSProperties = {
  border: '1px solid #fecaca',
  borderRadius: 8,
  background: '#fef2f2',
  color: '#991b1b',
  padding: '10px 12px',
  marginBottom: 12,
  fontWeight: 700,
};
