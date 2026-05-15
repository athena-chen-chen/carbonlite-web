import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

function renderProtectedRoute() {
  return render(
    <MemoryRouter initialEntries={['/upload']}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <div>Protected upload page</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  it('redirects to login without token', () => {
    renderProtectedRoute();

    expect(screen.getByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Protected upload page')).not.toBeInTheDocument();
  });

  it('allows protected page with token', () => {
    localStorage.setItem('accessToken', 'valid-token');

    renderProtectedRoute();

    expect(screen.getByText('Protected upload page')).toBeInTheDocument();
  });
});
