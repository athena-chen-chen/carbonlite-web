import { fetchOrganizationProfile, getDefaultOrganizationProfile, persistOrganizationProfile } from './organizationProfile';
import type { AuthUser } from './auth';

const user: AuthUser = { id: 'rc-admin', email: 'rc-admin@example.com', role: 'ADMIN', accountType: 'CUSTOMER', organizationId: 'rc-workspace', organizationName: 'RC workspace' };

it('saves material boundary fields against the strict API and reloads canonical server values', async () => {
  localStorage.setItem('accessToken', 'synthetic-token');
  localStorage.setItem('currentUser', JSON.stringify(user));
  let serverProfile: Record<string, unknown> = {
    organizationName: 'RC workspace', industry: 'Technology', country: 'Canada', provinceOrState: 'Alberta',
    geographicBoundary: '', includedScopes: '', includedFacilitiesOrLocations: '',
  };
  const reviewFields = ['boundaryStatus', 'boundaryReviewedBy', 'boundaryReviewedByUserId', 'boundaryReviewedAt', 'boundaryVersion', 'boundaryReviewNote', 'boundaryReviewFingerprint'];
  const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
    if (!url.endsWith('/organization-profile')) return new Response('{}', { status: 404 });
    if (options?.method === 'PATCH') {
      const body = JSON.parse(String(options.body));
      // Reproduce the backend's forbidNonWhitelisted contract.
      if (reviewFields.some(field => field in body)) return new Response(JSON.stringify({ message: 'property should not exist' }), { status: 400 });
      serverProfile = body;
    }
    return new Response(JSON.stringify(serverProfile), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  try {
    const profile = { ...getDefaultOrganizationProfile(user), ...serverProfile, geographicBoundary: 'Canadian operations', includedScopes: 'Scope 1 and Scope 2', includedFacilitiesOrLocations: 'Calgary', reportingPeriodStart: '2025-08-01', reportingPeriodEnd: '2026-10-14' };
    await expect(persistOrganizationProfile(profile, user)).resolves.toMatchObject({ geographicBoundary: 'Canadian operations' });
    expect(await fetchOrganizationProfile(user)).toMatchObject({ geographicBoundary: 'Canadian operations', includedScopes: 'Scope 1 and Scope 2', reportingPeriodStart: '2025-08-01', reportingPeriodEnd: '2026-10-14' });
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'PATCH')).toHaveLength(1);
    expect(serverProfile).not.toHaveProperty('boundaryStatus');
    expect(serverProfile).not.toHaveProperty('boundaryReviewedAt');
  } finally {
    vi.unstubAllGlobals();
  }
});
