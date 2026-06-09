import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PrivacyPolicyPage from './PrivacyPolicyPage';

function renderPrivacyPage() {
  return render(
    <MemoryRouter initialEntries={['/privacy']}>
      <Routes>
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PrivacyPolicyPage', () => {
  it('loads publicly with the requested pilot-stage privacy information', () => {
    renderPrivacyPage();

    expect(
      screen.getByRole('heading', { name: 'Privacy Policy', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Effective date: June 9, 2026')).toBeInTheDocument();
    expect(
      screen.getByText(/uploaded files and extracted data are used/i),
    ).toHaveTextContent(/are not sold/i);
    expect(screen.getByText(/Vercel for frontend hosting/i)).toBeInTheDocument();
    expect(screen.getByText('carbonliteai@gmail.com')).toBeInTheDocument();
  });

  it('sets page-specific SEO metadata', () => {
    const { unmount } = renderPrivacyPage();

    expect(document.title).toBe('Privacy Policy | CarbonLite AI');
    expect(
      document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content,
    ).toBe('Privacy Policy for CarbonLite AI');
    expect(
      document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href,
    ).toBe('https://carbonliteapp.ca/privacy');

    unmount();
  });
});
