import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthProvider';
import { FALLBACK_API_BASE_URL } from '../config/api';
import { LoginPage } from './LoginPage';

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/upload" element={<div>Upload page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('logs in successfully and redirects to upload', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: 'test-token',
          user: { id: 'user-1', email: 'user@example.com' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    renderLogin();

    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'Password123!');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));

    await screen.findByText('Upload page');

    expect(localStorage.getItem('accessToken')).toBe('test-token');
    expect(fetchMock).toHaveBeenCalledWith(
      `${FALLBACK_API_BASE_URL}/auth/login`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'Password123!',
        }),
      }),
    );
  });

  it('does not show public signup links when pilot access is invite-only', () => {
    vi.stubEnv('VITE_CONTACT_EMAIL', 'help@carbonliteapp.ca');

    renderLogin();

    expect(screen.getByRole('heading', { name: 'Log in to CarbonLite' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /CarbonLite AI/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /create an account/i })).not.toBeInTheDocument();
    expect(screen.getByText(/pilot access is currently invite-only/i)).toBeInTheDocument();
    expect(screen.getByText(/if you are a pilot reviewer/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'help@carbonliteapp.ca' })).toHaveAttribute(
      'href',
      'mailto:help@carbonliteapp.ca',
    );
  });

  it('falls back to the CarbonLite contact email when no contact email is configured', () => {
    renderLogin();

    expect(screen.getByRole('link', { name: 'carbonliteai@gmail.com' })).toHaveAttribute(
      'href',
      'mailto:carbonliteai@gmail.com',
    );
  });

  it('shows create account link only when local public signup is explicitly enabled', () => {
    vi.stubEnv('VITE_APP_ENV', 'local');
    vi.stubEnv('VITE_PUBLIC_SIGNUP_ENABLED', 'true');

    renderLogin();

    expect(screen.getByRole('link', { name: /create an account/i })).toHaveAttribute(
      'href',
      '/register',
    );
  });

  it('shows a friendly invalid login message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('invalid credentials', { status: 401 }),
    );

    renderLogin();

    await userEvent.type(screen.getByLabelText(/email/i), 'bad@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));

    expect(
      await screen.findByText(/invalid login/i),
    ).toBeInTheDocument();
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  it('shows backend unavailable when the API cannot be reached', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));

    renderLogin();

    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'Password123!');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByText(/backend unavailable/i)).toBeInTheDocument();
    });
  });

  it('shows session expired message from a 401 auto-logout redirect', () => {
    sessionStorage.setItem('authMessage', 'Session expired. Please log in again.');

    renderLogin();

    expect(screen.getByText('Session expired. Please log in again.')).toBeInTheDocument();
    expect(sessionStorage.getItem('authMessage')).toBeNull();
  });
});
