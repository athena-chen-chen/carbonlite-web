import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthProvider';
import CarbonLiteLandingPage from './LandingPage';

function renderLanding() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <CarbonLiteLandingPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('LandingPage auth buttons', () => {
  it('shows Login when user is not authenticated', () => {
    renderLanding();

    expect(screen.getAllByRole('button', { name: /login/i }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /dashboard/i })).not.toBeInTheDocument();
  });

  it('uses sample workflow wording without demo mode routing', () => {
    renderLanding();

    const sampleButton = screen.getByRole('button', { name: /see sample workflow/i });
    expect(sampleButton).toBeInTheDocument();
    expect(screen.queryByText(/start demo mode/i)).not.toBeInTheDocument();
  });

  it('shows Dashboard and Logout instead of Login when authenticated', () => {
    localStorage.setItem('accessToken', 'valid-token');
    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        email: 'user@example.com',
        organization: { name: 'KACH CANADA LTD.' },
      }),
    );

    renderLanding();

    expect(screen.queryByRole('button', { name: /^login$/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /dashboard/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    expect(screen.getByText('Workspace: KACH CANADA LTD.')).toBeInTheDocument();
  });
});
