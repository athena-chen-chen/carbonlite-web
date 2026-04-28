import { NavLink } from 'react-router-dom';

const linkBaseStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  textDecoration: 'none',
  color: '#222',
  fontWeight: 500,
};

export function AppNav() {
  return (
    <header
      style={{
        background: '#fff',
        borderBottom: '1px solid #e5e5e5',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 700 }}>CarbonLite AI 2.0</div>

        <nav style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <NavLink
            to="/"
            style={({ isActive }) => ({
              ...linkBaseStyle,
              background: isActive ? '#111' : 'transparent',
              color: isActive ? '#fff' : '#222',
            })}
          >
            Home
          </NavLink>

          <NavLink
            to="/activity-data"
            style={({ isActive }) => ({
              ...linkBaseStyle,
              background: isActive ? '#111' : 'transparent',
              color: isActive ? '#fff' : '#222',
            })}
          >
            Activity Data
          </NavLink>

          <NavLink
            to="/conversion-factors"
            style={({ isActive }) => ({
              ...linkBaseStyle,
              background: isActive ? '#111' : 'transparent',
              color: isActive ? '#fff' : '#222',
            })}
          >
            Conversion Factors
          </NavLink>

          <NavLink
            to="/metrics-summary"
            style={({ isActive }) => ({
              ...linkBaseStyle,
              background: isActive ? '#111' : 'transparent',
              color: isActive ? '#fff' : '#222',
            })}
          >
            Metrics Summary
          </NavLink>
          <NavLink to="/upload">Upload</NavLink>
        </nav>
      </div>
    </header>
  );
}