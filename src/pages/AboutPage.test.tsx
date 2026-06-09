import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AboutPage from './AboutPage';

function renderAboutPage() {
  return render(
    <MemoryRouter initialEntries={['/about']}>
      <Routes>
        <Route path="/about" element={<AboutPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AboutPage', () => {
  it('loads publicly and explains CarbonLite without requiring authentication', () => {
    renderAboutPage();

    expect(
      screen.getByRole('heading', { name: 'About CarbonLite AI', level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Pilot-stage validation' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Developed by KACH CANADA LTD.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('carbonliteai@gmail.com')).toHaveAttribute(
      'href',
      'mailto:carbonliteai@gmail.com',
    );
  });

  it('sets the requested SEO metadata', () => {
    const { unmount } = renderAboutPage();

    expect(document.title).toBe(
      'About CarbonLite AI | Carbon Reporting for SMEs',
    );
    expect(
      document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content,
    ).toBe(
      'Learn about CarbonLite AI, a Canadian-built carbon reporting workflow tool for SMEs and environmental consultants.',
    );
    expect(
      document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href,
    ).toBe('https://carbonliteapp.ca/about');

    unmount();
  });

  it('shows company, legal, and contact footer links', () => {
    renderAboutPage();

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
