const pageStyle: React.CSSProperties = {
  maxWidth: 680,
  margin: '64px auto',
  padding: '0 24px',
  textAlign: 'center',
};

const codeStyle: React.CSSProperties = {
  color: '#047857',
  fontSize: 14,
  fontWeight: 800,
  letterSpacing: 0,
};

const titleStyle: React.CSSProperties = {
  margin: '8px 0',
  color: '#0f172a',
  fontSize: 32,
};

const messageStyle: React.CSSProperties = {
  margin: 0,
  color: '#64748b',
  fontSize: 16,
};

export function AccessDeniedPage() {
  return (
    <div style={pageStyle}>
      <div style={codeStyle}>403</div>
      <h1 style={titleStyle}>Access Denied</h1>
      <p style={messageStyle}>You do not have permission to access this page.</p>
    </div>
  );
}
