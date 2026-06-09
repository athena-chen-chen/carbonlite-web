import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TermsOfUsePage from './TermsOfUsePage';

function renderTermsPage() {
  return render(
    <MemoryRouter initialEntries={['/terms']}>
      <Routes>
        <Route path="/terms" element={<TermsOfUsePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('TermsOfUsePage', () => {
  it('loads publicly with the requested pilot-stage terms', () => {
    renderTermsPage();

    expect(
      screen.getByRole('heading', { name: 'Terms of Use', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Effective date: June 9, 2026')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No Professional Advice' })).toBeInTheDocument();
    expect(screen.getByText(/Province of Alberta/i)).toBeInTheDocument();
    expect(screen.getByText('Shuang Chen')).toBeInTheDocument();
    expect(screen.getByText('carbonliteai@gmail.com')).toBeInTheDocument();
  });

  it('sets page-specific SEO metadata', () => {
    const { unmount } = renderTermsPage();

    expect(document.title).toBe('Terms of Use | CarbonLite AI');
    expect(
      document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content,
    ).toBe('Terms of Use for CarbonLite AI carbon reporting software.');
    expect(
      document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href,
    ).toBe('https://carbonliteapp.ca/terms');

    unmount();
  });

  it('shows the complete legal footer', () => {
    renderTermsPage();

    expect(screen.getByRole('link', { name: 'About CarbonLite' })).toHaveAttribute(
      'href',
      '/about',
    );
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
      'href',
      '/privacy',
    );
    expect(screen.getByRole('link', { name: 'Terms of Use' })).toHaveAttribute(
      'href',
      '/terms',
    );
    expect(screen.getByRole('link', { name: 'Contact Us' })).toHaveAttribute(
      'href',
      'mailto:carbonliteai@gmail.com',
    );
  });
});
