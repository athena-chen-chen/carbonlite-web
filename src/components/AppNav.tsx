import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { getOrganizationName, getUserDisplayName } from '../services/auth';
import { isDemoMode } from '../demo/demoData';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/upload', label: 'Upload' },
  { to: '/data-records', label: 'Data Records' },
  { to: '/conversion-factors', label: 'Conversion Factors' },
  { to: '/metrics-summary', label: 'Metrics Summary' },
  { to: '/reports', label: 'Reports' },
  
] as const;

const headerStyle: React.CSSProperties = {
  background: '#fff',
  borderBottom: '1px solid #e5e5e5',
  position: 'sticky',
  top: 0,
  zIndex: 10,
};

const containerStyle: React.CSSProperties = {
  maxWidth: 1280,
  margin: '0 auto',
  padding: '16px 24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  flexWrap: 'nowrap',
};

const brandBlockStyle: React.CSSProperties = {
  display: 'grid',
  gap: 3,
  flexShrink: 0,
};

const brandStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
};

const workspaceStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: 12,
  fontWeight: 600,
};

const navStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  flexWrap: 'nowrap',
  alignItems: 'center',
  minWidth: 0,
  overflowX: 'auto',
};

const headerActionsStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 12,
  minWidth: 0,
};

const linkBaseStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  textDecoration: 'none',
  color: '#222',
  fontWeight: 500,
};

function getLinkStyle(isActive: boolean): React.CSSProperties {
  return {
    ...linkBaseStyle,
    background: isActive ? '#111' : 'transparent',
    color: isActive ? '#fff' : '#222',
  };
}

export function AppNav() {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const workspaceName = getOrganizationName(user);
  const userLabel = getUserDisplayName(user);
  const demoMode = isDemoMode();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <header style={headerStyle}>
      <div style={containerStyle}>
        <div style={brandBlockStyle}>
          <div style={brandStyle}>CarbonLite AI</div>
          {isAuthenticated ? (
            <div style={workspaceStyle}>Workspace: {workspaceName}</div>
          ) : null}
        </div>

        <div style={headerActionsStyle}>
          <nav style={navStyle}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                style={({ isActive }) => getLinkStyle(isActive)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {isAuthenticated ? (
            <div style={userChipStyle}>{userLabel || 'Signed in'}</div>
          ) : null}

          {demoMode ? <div style={demoChipStyle}>Demo Mode</div> : null}

          {isAuthenticated ? (
            <button type="button" onClick={handleLogout} style={logoutButtonStyle}>
              Logout
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

const logoutButtonStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid #dc2626',
  background: '#fff',
  color: '#dc2626',
  fontWeight: 700,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  flexShrink: 0,
};

const userChipStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: 999,
  background: '#ecfdf5',
  color: '#047857',
  fontSize: 13,
  fontWeight: 700,
  whiteSpace: 'nowrap',
  flexShrink: 0,
};

const demoChipStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: 999,
  background: '#eef2ff',
  color: '#3730a3',
  fontSize: 13,
  fontWeight: 800,
  whiteSpace: 'nowrap',
  flexShrink: 0,
};
