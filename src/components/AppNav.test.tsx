import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthProvider';
import { AppNav } from './AppNav';

describe('AppNav logout flow', () => {
  it('shows workspace and keeps feedback inside the user menu', async () => {
    localStorage.setItem('accessToken', 'valid-token');
    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        email: 'user@example.com',
        organizationName: 'KACH CANADA LTD.',
      }),
    );

    render(
      <MemoryRouter initialEntries={['/input-data']}>
        <AuthProvider>
          <AppNav />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText('CarbonLite')).toBeInTheDocument();
    expect(screen.getByText('Workspace: KACH CANADA LTD.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /user@example.com/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /send feedback/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /user@example.com/i }));

    expect(screen.getByRole('menuitem', { name: /send feedback/i })).toHaveAttribute(
      'href',
      expect.stringContaining('mailto:hello@carbonliteapp.ca'),
    );
    expect(screen.getByRole('menuitem', { name: /logout/i })).toBeInTheDocument();
  });

  it('keeps the app header above scrolling page content', () => {
    localStorage.setItem('accessToken', 'valid-token');
    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        email: 'user@example.com',
        organizationName: 'KACH CANADA LTD.',
      }),
    );

    render(
      <MemoryRouter initialEntries={['/data-records']}>
        <AuthProvider>
          <AppNav />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('banner')).toHaveStyle({
      position: 'sticky',
      top: '0px',
      zIndex: '2000',
    });
  });

  it('keeps all navigation tabs available without a special demo state', () => {
    localStorage.setItem('accessToken', 'valid-token');
    localStorage.setItem('carbonliteDemoMode', 'enabled');
    localStorage.setItem(
      'currentUser',
      JSON.stringify({ email: 'user@example.com', organizationName: 'KACH CANADA LTD.' }),
    );

    render(
      <MemoryRouter initialEntries={['/input-data']}>
        <AuthProvider>
          <AppNav />
        </AuthProvider>
      </MemoryRouter>,
    );

    [
      'Input Data',
      'Data Records',
      'Factors',
      'Calculation Review',
      'Reports',
    ].forEach((label) => {
      expect(screen.getByRole('link', { name: label })).toHaveAttribute('href');
    });
    expect(screen.queryByRole('button', { name: /exit demo/i })).not.toBeInTheDocument();
  });

  it('hides internal navigation from normal users', () => {
    localStorage.setItem('accessToken', 'valid-token');
    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        email: 'user@example.com',
        organizationName: 'Pilot Workspace',
        role: 'USER',
      }),
    );

    render(
      <MemoryRouter initialEntries={['/input-data']}>
        <AuthProvider>
          <AppNav />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.queryByRole('button', { name: /admin/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Feedback' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Activity' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Audit Log' })).not.toBeInTheDocument();
  });

  it('shows pilot reviewer banner and hides admin navigation for review accounts', () => {
    localStorage.setItem('accessToken', 'valid-token');
    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        email: 'reviewer@example.com',
        organizationName: 'CarbonLite Demo Workspace',
        role: 'ADMIN',
        accountType: 'PILOT_REVIEWER',
      }),
    );

    render(
      <MemoryRouter initialEntries={['/reports']}>
        <AuthProvider>
          <AppNav />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Pilot review account/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /send feedback/i })).toHaveAttribute(
      'href',
      expect.stringContaining('CarbonLite%20Pilot%20Feedback'),
    );
    expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Input Data' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Data Records' })).toHaveAttribute('href', '/data-records');
    expect(screen.getByRole('link', { name: 'Calculation Review' })).toHaveAttribute('href', '/metrics-summary');
    expect(screen.getByRole('link', { name: 'Reports' })).toHaveAttribute('href', '/reports');
    expect(screen.queryByRole('button', { name: /admin/i })).not.toBeInTheDocument();
  });

  it('shows admin feedback and activity navigation in a compact dropdown', async () => {
    localStorage.setItem('accessToken', 'valid-token');
    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        email: 'admin@example.com',
        organizationName: 'CarbonLite',
        role: 'ADMIN',
      }),
    );

    render(
      <MemoryRouter initialEntries={['/upload']}>
        <AuthProvider>
          <AppNav />
        </AuthProvider>
      </MemoryRouter>,
    );

    const adminButton = screen.getByRole('button', { name: /^Admin\s*▾?$/i });

    expect(adminButton).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByRole('link', { name: 'Feedback' })).not.toBeInTheDocument();

    await userEvent.click(adminButton);

    expect(adminButton).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('menuitem', { name: 'Pilot Reviewers' })).toHaveAttribute(
      'href',
      '/admin/pilot-reviewers',
    );
    expect(screen.getByRole('menuitem', { name: 'Feedback' })).toHaveAttribute('href', '/feedback');
    expect(screen.getByRole('menuitem', { name: 'Activity' })).toHaveAttribute('href', '/activity');
    expect(screen.queryByRole('link', { name: 'Audit Log' })).not.toBeInTheDocument();
  });


  it('clears token and redirects to login when logging out', async () => {
    localStorage.setItem('accessToken', 'valid-token');
    localStorage.setItem('currentUser', JSON.stringify({ email: 'user@example.com' }));

    render(
      <MemoryRouter initialEntries={['/input-data']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/input-data"
              element={
                <>
                  <AppNav />
                  <div>Input Data page</div>
                </>
              }
            />
            <Route path="/login" element={<div>Login page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: /user@example.com/i }));

    expect(screen.getByRole('menuitem', { name: /logout/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('menuitem', { name: /logout/i }));

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('currentUser')).toBeNull();
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });
});
