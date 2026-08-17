import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SetPasswordPage from './SetPasswordPage';

function renderPage(initialEntry = '/set-password?token=invite-token') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/set-password" element={<SetPasswordPage />} />
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SetPasswordPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sets password from an invite token and returns to login', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('', { status: 200 }),
    );

    renderPage();

    expect(screen.getByLabelText(/invite or reset token/i)).toHaveValue('invite-token');
    await userEvent.type(screen.getByLabelText(/^new password/i), 'LongPassword123!');
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'LongPassword123!');
    await userEvent.click(screen.getByRole('button', { name: /^set password$/i }));

    expect(await screen.findByText('Your password has been set. You can now log in.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/password-reset/confirm'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          token: 'invite-token',
          password: 'LongPassword123!',
        }),
      }),
    );
    await waitFor(() => expect(screen.getByText('Login page')).toBeInTheDocument());
  });

  it('validates password length and matching confirmation before calling the API', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    renderPage('/set-password');

    await userEvent.type(screen.getByLabelText(/invite or reset token/i), 'invite-token');
    await userEvent.type(screen.getByLabelText(/^new password/i), 'short');
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'different');
    await userEvent.click(screen.getByRole('button', { name: /^set password$/i }));

    expect(screen.getByText('Password must be at least 10 characters.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
