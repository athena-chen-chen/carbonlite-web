import { apiFetch } from './api';

describe('apiFetch authenticated requests', () => {
  it('attaches Authorization header when token exists', async () => {
    localStorage.setItem('accessToken', 'abc123');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await apiFetch('/documents');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3333/api/documents',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer abc123',
        }),
      }),
    );
  });

  it('omits Authorization header when token does not exist', async () => {
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
