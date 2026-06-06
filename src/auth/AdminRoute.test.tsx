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
  it('allows administrators to view internal pages', () => {
    localStorage.setItem('accessToken', 'valid-token');
    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        email: 'admin@example.com',
        role: 'ADMIN',
      }),
    );

    renderAdminRoute();

    expect(screen.getByText('Internal admin content')).toBeInTheDocument();
    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
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
