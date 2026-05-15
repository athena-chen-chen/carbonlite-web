import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div style={notFoundPageStyle}>
      <div style={notFoundCardStyle}>
        <div style={eyebrowStyle}>Invalid route</div>
        <h1 style={headingStyle}>Page not found</h1>
        <p style={bodyStyle}>
          The page you opened does not exist. You can return home or continue to the upload workflow.
        </p>

        <div style={actionsStyle}>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={primaryButtonStyle}
          >
            Go Home
          </button>
          <button
            type="button"
            onClick={() => navigate('/upload')}
            style={secondaryButtonStyle}
          >
            Open Upload
          </button>
        </div>
      </div>
    </div>
  );
}

const notFoundPageStyle: React.CSSProperties = {
  minHeight: '60vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
};

const notFoundCardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 560,
  padding: 32,
  borderRadius: 16,
  border: '1px solid #d1fae5',
  background: '#fff',
  boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08)',
  textAlign: 'center',
};

const eyebrowStyle: React.CSSProperties = {
  marginBottom: 10,
  color: '#047857',
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: 0,
  textTransform: 'uppercase',
};

const headingStyle: React.CSSProperties = {
  margin: 0,
  color: '#0f172a',
  fontSize: 32,
  fontWeight: 800,
};

const bodyStyle: React.CSSProperties = {
  margin: '14px auto 0',
  maxWidth: 440,
  color: '#64748b',
  lineHeight: 1.7,
};

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  gap: 12,
  flexWrap: 'wrap',
  marginTop: 24,
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: 10,
  border: '1px solid #059669',
  background: '#059669',
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: 10,
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#0f172a',
  fontWeight: 700,
  cursor: 'pointer',
};
