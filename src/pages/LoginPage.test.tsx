import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthProvider';
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
      'http://localhost:3333/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'Password123!',
        }),
      }),
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
