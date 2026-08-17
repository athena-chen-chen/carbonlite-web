import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ForgotPasswordPage from './ForgotPasswordPage';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/forgot-password']}>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('requests a password reset link with a generic success message', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('', { status: 200 }),
    );

    renderPage();

    await userEvent.type(screen.getByLabelText(/email/i), 'reviewer@example.com');
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(
      await screen.findByText('If an account exists for this email, a password reset link will be sent.'),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/password-reset/request'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'reviewer@example.com' }),
      }),
    );
  });

  it('links back to login and set password from invite without exposing signup', () => {
    renderPage();

    expect(screen.getByRole('link', { name: /set password from invite/i })).toHaveAttribute('href', '/set-password');
    expect(screen.getByRole('link', { name: /back to login/i })).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('link', { name: /create account|sign up|register/i })).not.toBeInTheDocument();
  });
});
