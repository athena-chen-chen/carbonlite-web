import type { CSSProperties } from 'react';

export function AppErrorFallback() {
  return (
    <div style={fallbackStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Something went wrong.</h1>
        <p style={textStyle}>Please refresh the page or contact support.</p>
        <button type="button" onClick={() => window.location.reload()} style={buttonStyle}>
          Refresh page
        </button>
      </div>
    </div>
  );
}

const fallbackStyle: CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#f8fafc',
  padding: 24,
};

const cardStyle: CSSProperties = {
  maxWidth: 460,
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  background: '#fff',
  padding: 28,
  boxShadow: '0 20px 50px rgba(15, 23, 42, 0.12)',
};

const titleStyle: CSSProperties = {
  margin: 0,
  color: '#0f172a',
  fontSize: 26,
};

const textStyle: CSSProperties = {
  color: '#475569',
  lineHeight: 1.6,
};

const buttonStyle: CSSProperties = {
  border: '1px solid #047857',
  borderRadius: 8,
  background: '#047857',
  color: '#fff',
  padding: '10px 14px',
  fontWeight: 800,
  cursor: 'pointer',
};
