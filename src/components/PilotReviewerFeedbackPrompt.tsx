import { openFeedbackOverlay } from '../utils/feedbackOverlay';

export function PilotReviewerFeedbackPrompt() {
  return (
    <div style={promptStyle}>
      Have feedback on this page? Use{' '}
      <button type="button" onClick={openFeedbackOverlay} style={linkStyle}>
        Send Feedback
      </button>{' '}
      to share comments.
    </div>
  );
}

const promptStyle: React.CSSProperties = {
  marginBottom: 18,
  color: '#64748b',
  fontSize: 13,
  lineHeight: 1.5,
};

const linkStyle: React.CSSProperties = {
  border: 0,
  background: 'transparent',
  padding: 0,
  color: '#047857',
  cursor: 'pointer',
  font: 'inherit',
  fontWeight: 800,
  textDecoration: 'underline',
  textUnderlineOffset: 2,
};
