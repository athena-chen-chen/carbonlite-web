import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { getAccountType, getOrganizationName, getUserDisplayName, isPilotReviewer } from '../services/auth';
import { buildFeedbackMailtoHref } from '../utils/feedbackMailto';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/input-data', label: 'Input Data', activePaths: ['/upload'] },
  { to: '/data-collection-guide', label: 'Data Guide' },
  { to: '/data-records', label: 'Data Records', activePaths: ['/activity-records', '/activity-data'] },
  { to: '/conversion-factors', label: 'Factors' },
  { to: '/metrics-summary', label: 'Calculation Review' },
  { to: '/reports', label: 'Reports' },
] as const;

const adminNavItems = [
  { to: '/admin/pilot-reviewers', label: 'Pilot Reviewers' },
  { to: '/feedback', label: 'Feedback' },
  { to: '/activity', label: 'Activity', activePaths: ['/user-activity', '/admin/activity'] },
] as const;

const headerStyle: React.CSSProperties = {
  background: '#fff',
  borderBottom: '1px solid #e5e5e5',
  position: 'sticky',
  top: 0,
  zIndex: 2000,
  boxShadow: '0 1px 0 rgba(15, 23, 42, 0.04)',
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
  const showPilotReviewerBanner = isAuthenticated && isPilotReviewer(user);
  const visibleNavItems = showPilotReviewerBanner
    ? navItems.filter((item) => !['/', '/input-data'].includes(item.to))
    : navItems;
  const feedbackHref = buildFeedbackMailtoHref({
    pagePath: `${location.pathname}${location.search}${location.hash}`,
    userEmail: user?.email,
    workspaceName,
    accountType: getAccountType(user),
  });
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement | null>(null);
  const adminMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const userMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const isAdminSectionActive = adminNavItems.some(
    (item) =>
      location.pathname === item.to ||
      ('activePaths' in item && item.activePaths.includes(location.pathname)),
  );

  useEffect(() => {
    setIsAdminMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isAdminMenuOpen && !isUserMenuOpen) return undefined;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (
        target &&
        (adminMenuRef.current?.contains(target) ||
          adminMenuButtonRef.current?.contains(target) ||
          userMenuRef.current?.contains(target) ||
          userMenuButtonRef.current?.contains(target))
      ) {
        return;
      }
      setIsAdminMenuOpen(false);
      setIsUserMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        const userMenuWasOpen = isUserMenuOpen;
        setIsAdminMenuOpen(false);
        setIsUserMenuOpen(false);
        if (userMenuWasOpen) {
          userMenuButtonRef.current?.focus();
        } else {
          adminMenuButtonRef.current?.focus();
        }
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAdminMenuOpen, isUserMenuOpen]);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <header style={headerStyle}>
      <div>
        <div style={containerStyle}>
          <div style={brandBlockStyle}>
            <div style={brandStyle}>CarbonLite</div>
            {isAuthenticated ? (
              <div style={workspaceStyle}>Workspace: {workspaceName}</div>
            ) : null}
          </div>

          <div style={headerActionsStyle}>
            <nav style={navStyle}>
              {visibleNavItems.map((item) => (
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
                    onClick={() => {
                      setIsAdminMenuOpen((open) => !open);
                      setIsUserMenuOpen(false);
                    }}
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
              <div style={userDropdownStyle}>
                <button
                  ref={userMenuButtonRef}
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen((open) => !open);
                    setIsAdminMenuOpen(false);
                  }}
                  style={userMenuButtonStyle}
                  title={userLabel || 'Signed in'}
                  aria-haspopup="menu"
                  aria-expanded={isUserMenuOpen}
                >
                  <span style={userMenuLabelStyle}>{userLabel || 'Signed in'}</span>
                  <span aria-hidden="true">▾</span>
                </button>
                {isUserMenuOpen ? (
                  <div ref={userMenuRef} role="menu" style={userMenuStyle}>
                    <a
                      href={feedbackHref}
                      role="menuitem"
                      style={userMenuLinkStyle}
                      aria-label="Send feedback to CarbonLite"
                      title="Send feedback or report an issue with the CarbonLite pilot."
                    >
                      Send Feedback
                    </a>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      style={userMenuLogoutStyle}
                    >
                      Logout
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        {showPilotReviewerBanner ? (
          <div role="status" style={pilotReviewerBannerStyle}>
            Pilot review account · Sample data only · Not for formal reporting ·{' '}
            <a href={feedbackHref} style={pilotReviewerBannerLinkStyle}>
              Send Feedback
            </a>
          </div>
        ) : null}
      </div>
    </header>
  );
}

const userDropdownStyle: React.CSSProperties = {
  position: 'relative',
  flexShrink: 0,
};

const userMenuButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 10px',
  borderRadius: 999,
  border: '1px solid #bbf7d0',
  background: '#ecfdf5',
  color: '#047857',
  fontSize: 13,
  fontWeight: 800,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  maxWidth: 190,
};

const userMenuLabelStyle: React.CSSProperties = {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const pilotReviewerBannerStyle: React.CSSProperties = {
  borderTop: '1px solid #bae6fd',
  background: '#f0f9ff',
  color: '#075985',
  padding: '8px 24px',
  textAlign: 'center',
  fontSize: 13,
  fontWeight: 800,
};

const pilotReviewerBannerLinkStyle: React.CSSProperties = {
  color: '#0369a1',
  fontWeight: 900,
  textDecoration: 'underline',
  textUnderlineOffset: 2,
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

const userMenuStyle: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 8px)',
  right: 0,
  minWidth: 190,
  padding: 6,
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  background: '#fff',
  boxShadow: '0 16px 34px rgba(15, 23, 42, 0.16)',
  zIndex: 50,
};

const userMenuLinkStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  textDecoration: 'none',
  color: '#111827',
  background: 'transparent',
  fontSize: 14,
  fontWeight: 700,
  whiteSpace: 'nowrap',
};

const userMenuLogoutStyle: React.CSSProperties = {
  ...userMenuLinkStyle,
  border: 0,
  textAlign: 'left',
  color: '#dc2626',
  cursor: 'pointer',
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
