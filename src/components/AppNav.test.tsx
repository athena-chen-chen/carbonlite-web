import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthProvider';
import { AppNav } from './AppNav';

describe('AppNav logout flow', () => {
  it('shows workspace and user identity when authenticated', () => {
    localStorage.setItem('accessToken', 'valid-token');
    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        email: 'user@example.com',
        organizationName: 'KACH CANADA LTD.',
      }),
    );

    render(
      <MemoryRouter initialEntries={['/upload']}>
        <AuthProvider>
          <AppNav />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText('CarbonLite AI')).toBeInTheDocument();
    expect(screen.getByText('Workspace: KACH CANADA LTD.')).toBeInTheDocument();
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  it('keeps all navigation tabs available without a special demo state', () => {
    localStorage.setItem('accessToken', 'valid-token');
    localStorage.setItem('carbonliteDemoMode', 'enabled');
    localStorage.setItem(
      'currentUser',
      JSON.stringify({ email: 'user@example.com', organizationName: 'KACH CANADA LTD.' }),
    );

    render(
      <MemoryRouter initialEntries={['/upload']}>
        <AuthProvider>
          <AppNav />
        </AuthProvider>
      </MemoryRouter>,
    );

    [
      'Upload',
      'Data Records',
      'Conversion Factors',
      'Metrics Summary',
      'Reports',
    ].forEach((label) => {
      expect(screen.getByRole('link', { name: label })).toHaveAttribute('href');
    });
    expect(screen.queryByRole('button', { name: /exit demo/i })).not.toBeInTheDocument();
  });


  it('clears token and redirects to login when logging out', async () => {
    localStorage.setItem('accessToken', 'valid-token');
    localStorage.setItem('currentUser', JSON.stringify({ email: 'user@example.com' }));

    render(
      <MemoryRouter initialEntries={['/upload']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/upload"
              element={
                <>
                  <AppNav />
                  <div>Upload page</div>
                </>
              }
            />
            <Route path="/login" element={<div>Login page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /logout/i }));

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('currentUser')).toBeNull();
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });
});
