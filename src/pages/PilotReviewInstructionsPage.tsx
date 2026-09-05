import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

const reviewPath = [
  { label: 'Data Records', to: '/data-records' },
  { label: 'Factors', to: '/conversion-factors' },
  { label: 'Calculation Review', to: '/metrics-summary' },
  { label: 'Reports', to: '/reports' },
  { label: 'Send Feedback', to: 'feedback' },
];

const focusQuestions = [
  'Is the workflow clear?',
  'Are factor assumptions clear?',
  'Is the calculation trail understandable?',
  'Does the report look professional?',
  'What would be needed before a paid pilot?',
];

export default function PilotReviewInstructionsPage() {
  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <p style={eyebrowStyle}>Pilot reviewer guide</p>
        <h1 style={titleStyle}>Pilot Review Instructions</h1>
        <p style={subtitleStyle}>
          Use this guide to review the CarbonLite sample workspace safely and consistently.
        </p>
      </header>

      <section style={noticeStyle}>
        <strong>This account uses sample data only.</strong>
        <span>This account is read-only.</span>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Suggested Review Path</h2>
        <ol style={orderedListStyle}>
          {reviewPath.map((item) => (
            <li key={item.label} style={listItemStyle}>
              {item.to === 'feedback' ? (
                <span>{item.label}</span>
              ) : (
                <Link to={item.to} style={linkStyle}>
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>What To Focus On</h2>
        <ul style={unorderedListStyle}>
          {focusQuestions.map((question) => (
            <li key={question} style={listItemStyle}>
              {question}
            </li>
          ))}
        </ul>
      </section>

      <section style={reminderStyle}>
        <strong>Reminder:</strong>{' '}
        This is for workflow review only and is not a certified GHG report.
      </section>
    </div>
  );
}

const pageStyle: CSSProperties = {
  maxWidth: 880,
  margin: '0 auto',
  padding: '0 24px 32px',
  display: 'grid',
  gap: 18,
};

const headerStyle: CSSProperties = {
  display: 'grid',
  gap: 8,
};

const eyebrowStyle: CSSProperties = {
  margin: 0,
  color: '#047857',
  fontSize: 13,
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: 0,
};

const titleStyle: CSSProperties = {
  margin: 0,
  color: '#0f172a',
  fontSize: 32,
  lineHeight: 1.15,
};

const subtitleStyle: CSSProperties = {
  margin: 0,
  color: '#475569',
  fontSize: 16,
  lineHeight: 1.6,
};

const noticeStyle: CSSProperties = {
  display: 'grid',
  gap: 6,
  padding: 16,
  borderRadius: 12,
  border: '1px solid #bfdbfe',
  background: '#eff6ff',
  color: '#1e3a8a',
  lineHeight: 1.55,
};

const sectionStyle: CSSProperties = {
  padding: 18,
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  background: '#fff',
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)',
};

const sectionTitleStyle: CSSProperties = {
  margin: '0 0 12px',
  color: '#0f172a',
  fontSize: 20,
};

const orderedListStyle: CSSProperties = {
  margin: 0,
  paddingLeft: 24,
  display: 'grid',
  gap: 10,
};

const unorderedListStyle: CSSProperties = {
  ...orderedListStyle,
};

const listItemStyle: CSSProperties = {
  color: '#334155',
  lineHeight: 1.55,
  fontWeight: 650,
};

const linkStyle: CSSProperties = {
  color: '#047857',
  fontWeight: 850,
  textDecoration: 'none',
};

const reminderStyle: CSSProperties = {
  padding: 16,
  borderRadius: 12,
  border: '1px solid #fed7aa',
  background: '#fff7ed',
  color: '#9a3412',
  lineHeight: 1.55,
};
