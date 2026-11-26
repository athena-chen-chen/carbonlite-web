import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from './AuthProvider';
import { AdminRoute } from './AdminRoute';

function renderAdminRoute() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <AdminRoute>
          <div>Internal admin content</div>
        </AdminRoute>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('AdminRoute', () => {
  it.each([
    ['OWNER', 'USER', 'CUSTOMER', false],
    ['ADMIN', undefined, 'CUSTOMER', false],
    ['ADMIN', 'UNKNOWN', 'CUSTOMER', false],
    ['VIEWER', 'ADMIN', 'CUSTOMER', true],
    ['ADMIN', 'ADMIN', 'PILOT_REVIEWER', false],
  ] as const)('preserves explicit platform authority for %s / %s / %s', (role, platformRole, accountType, allowed) => {
    localStorage.setItem('accessToken', 'synthetic-token');
    localStorage.setItem('currentUser', JSON.stringify({ email: 'synthetic@example.invalid', role, platformRole, accountType }));
    renderAdminRoute();
    expect(Boolean(screen.queryByText('Internal admin content'))).toBe(allowed);
    expect(Boolean(screen.queryByText('Access Denied'))).toBe(!allowed);
  });

  it('allows platform administrators to view internal pages', () => {
    localStorage.setItem('accessToken', 'valid-token');
    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        email: 'admin@example.com',
        role: 'ADMIN',
        platformRole: 'ADMIN',
      }),
    );

    renderAdminRoute();

    expect(screen.getByText('Internal admin content')).toBeInTheDocument();
    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
  });

  it('denies customer organization administrators', () => {
    localStorage.setItem('accessToken', 'valid-token');
    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        email: 'customer-admin@example.com',
        role: 'ADMIN',
        membershipRole: 'ADMIN',
        platformRole: 'USER',
        accountType: 'CUSTOMER',
      }),
    );

    renderAdminRoute();

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByText('Internal admin content')).not.toBeInTheDocument();
  });

  it('shows a 403 page to normal users', () => {
    localStorage.setItem('accessToken', 'valid-token');
    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        email: 'user@example.com',
        role: 'USER',
      }),
    );

    renderAdminRoute();

    expect(screen.getByText('403')).toBeInTheDocument();
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(
      screen.getByText('You do not have permission to access this page.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Internal admin content')).not.toBeInTheDocument();
  });

  it('treats legacy sessions without a role as normal users', () => {
    localStorage.setItem('accessToken', 'valid-token');
    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        email: 'legacy@example.com',
      }),
    );

    renderAdminRoute();

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });
});
