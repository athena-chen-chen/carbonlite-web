import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthProvider';
import { trackEvent } from '../services/ga4.service';
import CarbonLiteLandingPage from './LandingPage';

vi.mock('../services/ga4.service', () => ({
  trackEvent: vi.fn(),
}));

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

  it('shows public legal and contact links in the footer', () => {
    renderLanding();

    expect(screen.getByRole('link', { name: /about carbonlite/i })).toHaveAttribute(
      'href',
      '/about',
    );
    expect(screen.getByRole('link', { name: /privacy policy/i })).toHaveAttribute(
      'href',
      '/privacy',
    );
    expect(screen.getByRole('link', { name: /terms of use/i })).toHaveAttribute(
      'href',
      '/terms',
    );
    expect(screen.getByRole('link', { name: /contact us/i })).toHaveAttribute(
      'href',
      'mailto:carbonliteai@gmail.com',
    );
  });

  it('tracks the demo video CTA', async () => {
    renderLanding();

    await userEvent.click(screen.getByRole('link', { name: /watch demo/i }));

    expect(trackEvent).toHaveBeenCalledWith('DEMO_VIDEO_VIEWED', {
      video_name: 'CarbonLite AI demo',
      source: 'hero',
    });
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
