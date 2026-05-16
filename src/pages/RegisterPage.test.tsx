import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthProvider';
import { FALLBACK_API_BASE_URL } from '../config/api';
import { RegisterPage } from './RegisterPage';

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <AuthProvider>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/upload" element={<div>Upload page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('RegisterPage', () => {
  it('requires organization, email, and password before submitting', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    renderRegister();

    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/organization name/i)).toBeInvalid();
  });

  it('registers successfully and redirects to upload', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: 'registered-token',
          user: {
            id: 'user-2',
            email: 'new@example.com',
            organizationName: 'New Org',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    renderRegister();

    await userEvent.type(screen.getByLabelText(/organization name/i), 'New Org');
    await userEvent.type(screen.getByLabelText(/email/i), 'new@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'Password123!');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await screen.findByText('Upload page');

    expect(localStorage.getItem('accessToken')).toBe('registered-token');
    expect(fetchMock).toHaveBeenCalledWith(
      `${FALLBACK_API_BASE_URL}/auth/register`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          organizationName: 'New Org',
          email: 'new@example.com',
          password: 'Password123!',
        }),
      }),
    );
  });

  it('shows email already registered message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('email already registered', { status: 409 }),
    );

    renderRegister();

    await userEvent.type(screen.getByLabelText(/organization name/i), 'Existing Org');
    await userEvent.type(screen.getByLabelText(/email/i), 'existing@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'Password123!');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/email already registered/i)).toBeInTheDocument();
    expect(localStorage.getItem('accessToken')).toBeNull();
  });
});
