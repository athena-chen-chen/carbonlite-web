type PilotReviewerFeedbackPromptProps = {
  feedbackHref: string;
};

export function PilotReviewerFeedbackPrompt({ feedbackHref }: PilotReviewerFeedbackPromptProps) {
  return (
    <div style={promptStyle}>
      Have feedback on this page? Use{' '}
      <a href={feedbackHref} style={linkStyle}>
        Send Feedback
      </a>{' '}
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
  color: '#047857',
  fontWeight: 800,
};
