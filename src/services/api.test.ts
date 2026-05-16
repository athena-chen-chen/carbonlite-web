import { FALLBACK_API_BASE_URL } from '../config/api';

async function loadApiFetch() {
  vi.resetModules();
  return import('./api');
}

describe('apiFetch authenticated requests', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses VITE_API_BASE_URL when provided', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://carbonlite-api.onrender.com/api');
    const { apiFetch } = await loadApiFetch();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await apiFetch('/documents');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://carbonlite-api.onrender.com/api/documents',
      expect.any(Object),
    );
  });

  it('falls back to localhost only when VITE_API_BASE_URL is missing', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    const { apiFetch } = await loadApiFetch();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await apiFetch('/documents');

    expect(fetchMock).toHaveBeenCalledWith(
      `${FALLBACK_API_BASE_URL}/documents`,
      expect.any(Object),
    );
  });

  it('attaches Authorization header when token exists', async () => {
    const { apiFetch } = await loadApiFetch();
    localStorage.setItem('accessToken', 'abc123');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await apiFetch('/documents');

    expect(fetchMock).toHaveBeenCalledWith(
      `${FALLBACK_API_BASE_URL}/documents`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer abc123',
        }),
      }),
    );
  });

  it('omits Authorization header when token does not exist', async () => {
    const { apiFetch } = await loadApiFetch();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await apiFetch('/documents');

    const [, options] = fetchMock.mock.calls[0];
    expect((options as RequestInit).headers).not.toHaveProperty('Authorization');
  });

  it('uses Bearer token format for protected API calls', async () => {
    const { apiFetch } = await loadApiFetch();
    localStorage.setItem('accessToken', 'protected-token');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await apiFetch('/activity-data');

    const [, options] = fetchMock.mock.calls[0];
    expect((options as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer protected-token',
    });
  });

  it('clears auth state and redirects to login on 401', async () => {
    const { apiFetch } = await loadApiFetch();
    localStorage.setItem('accessToken', 'expired-token');
    localStorage.setItem('currentUser', JSON.stringify({ email: 'user@example.com' }));
    const originalLocation = window.location;

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: 'http://localhost/upload' },
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('unauthorized', { status: 401 }),
    );

    await expect(apiFetch('/documents')).rejects.toThrow(/api 401/i);

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('currentUser')).toBeNull();
    expect(sessionStorage.getItem('authMessage')).toBe(
      'Session expired. Please log in again.',
    );
    expect(window.location.href).toBe('/login');

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });
});
