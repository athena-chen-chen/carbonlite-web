import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { getOrganizationName, getUserDisplayName } from '../services/auth';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/upload', label: 'Upload' },
  { to: '/data-collection-guide', label: 'Data Guide' },
  { to: '/data-records', label: 'Records', activePaths: ['/activity-records', '/activity-data'] },
  { to: '/conversion-factors', label: 'Factors' },
  { to: '/metrics-summary', label: 'Metrics' },
  { to: '/reports', label: 'Reports' },
] as const;

const adminNavItems = [
  { to: '/feedback', label: 'Feedback' },
  { to: '/activity', label: 'Activity', activePaths: ['/user-activity', '/admin/activity'] },
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
  gap: 14,
  flexWrap: 'wrap',
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
  gap: 6,
  flexWrap: 'nowrap',
  alignItems: 'center',
  minWidth: 0,
  overflow: 'visible',
};

const headerActionsStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 8,
  minWidth: 0,
  flex: '1 1 auto',
  flexWrap: 'wrap',
};

const linkBaseStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: 8,
  textDecoration: 'none',
  color: '#222',
  fontWeight: 500,
  fontSize: 14,
  whiteSpace: 'nowrap',
};

function getLinkStyle(isActive: boolean): React.CSSProperties {
  return {
    ...linkBaseStyle,
    background: isActive ? '#111' : 'transparent',
    color: isActive ? '#fff' : '#222',
  };
}

export function AppNav() {
  const { isAuthenticated, isAdmin, logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const workspaceName = getOrganizationName(user);
  const userLabel = getUserDisplayName(user);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement | null>(null);
  const adminMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const isAdminSectionActive = adminNavItems.some(
    (item) =>
      location.pathname === item.to ||
      ('activePaths' in item && item.activePaths.includes(location.pathname)),
  );

  useEffect(() => {
    setIsAdminMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isAdminMenuOpen) return undefined;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (
        target &&
        (adminMenuRef.current?.contains(target) ||
          adminMenuButtonRef.current?.contains(target))
      ) {
        return;
      }
      setIsAdminMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsAdminMenuOpen(false);
        adminMenuButtonRef.current?.focus();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAdminMenuOpen]);

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
                style={({ isActive }) =>
                  getLinkStyle(
                    isActive ||
                      Boolean(
                        'activePaths' in item &&
                          item.activePaths.includes(location.pathname),
                      ),
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            {isAdmin ? (
              <div style={adminDropdownStyle}>
                <button
                  ref={adminMenuButtonRef}
                  type="button"
                  onClick={() => setIsAdminMenuOpen((open) => !open)}
                  style={getAdminButtonStyle(isAdminSectionActive)}
                  aria-haspopup="menu"
                  aria-expanded={isAdminMenuOpen}
                >
                  Admin <span aria-hidden="true">▾</span>
                </button>
                {isAdminMenuOpen ? (
                  <div ref={adminMenuRef} role="menu" style={adminMenuStyle}>
                    {adminNavItems.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        role="menuitem"
                        style={({ isActive }) =>
                          getAdminMenuLinkStyle(
                            isActive ||
                              Boolean(
                                'activePaths' in item &&
                                  item.activePaths.includes(location.pathname),
                              ),
                          )
                        }
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </nav>

          {isAuthenticated ? (
            <div style={userChipStyle} title={userLabel || 'Signed in'}>
              {userLabel || 'Signed in'}
            </div>
          ) : null}

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
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #dc2626',
  background: '#fff',
  color: '#dc2626',
  fontWeight: 700,
  fontSize: 14,
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
  maxWidth: 150,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  flexShrink: 0,
};

const adminDropdownStyle: React.CSSProperties = {
  position: 'relative',
  flexShrink: 0,
};

function getAdminButtonStyle(isActive: boolean): React.CSSProperties {
  return {
    ...linkBaseStyle,
    border: 0,
    cursor: 'pointer',
    background: isActive ? '#111' : 'transparent',
    color: isActive ? '#fff' : '#222',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
  };
}

const adminMenuStyle: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 8px)',
  right: 0,
  minWidth: 150,
  padding: 6,
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  background: '#fff',
  boxShadow: '0 16px 34px rgba(15, 23, 42, 0.16)',
  zIndex: 50,
};

function getAdminMenuLinkStyle(isActive: boolean): React.CSSProperties {
  return {
    display: 'block',
    padding: '8px 10px',
    borderRadius: 8,
    textDecoration: 'none',
    color: isActive ? '#fff' : '#111827',
    background: isActive ? '#111' : 'transparent',
    fontSize: 14,
    fontWeight: 700,
    whiteSpace: 'nowrap',
  };
}
