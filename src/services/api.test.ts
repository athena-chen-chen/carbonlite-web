import { FALLBACK_API_BASE_URL, getContactEmail, isPublicSignupEnabled } from '../config/api';

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

    await expect(apiFetch('/documents')).rejects.toThrow(
      'Your session has expired. Please log in again.',
    );

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

  it('shows a friendly error for backend pageSize validation failures', async () => {
    const { apiFetch } = await loadApiFetch();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('pageSize must not be greater than 100', { status: 400 }),
    );

    await expect(apiFetch('/activity-data?pageSize=1000')).rejects.toThrow(
      'Too many records were requested. Please refresh and try again.',
    );
  });

  it('maps missing extraction previews to a friendly message and internal code', async () => {
    const { apiFetch } = await loadApiFetch();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Cannot GET /api/document-extraction/doc-1', { status: 404 }),
    );

    await expect(apiFetch('/document-extraction/doc-1')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      code: 'EXTRACTION_NOT_FOUND',
      message: 'Preview data is no longer available. Please extract the document again.',
    });
  });

  it('maps missing files to a friendly message and internal code', async () => {
    const { apiFetch } = await loadApiFetch();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          message: 'Uploaded file is no longer available. Please upload it again.',
          error: 'File Missing',
          statusCode: 404,
        }),
        { status: 404 },
      ),
    );

    await expect(apiFetch('/documents/doc-1/download')).rejects.toMatchObject({
      status: 404,
      code: 'FILE_MISSING',
      message: 'The original file is no longer available. Please upload it again.',
    });
  });

  it('maps extraction server errors to a friendly message without endpoint details', async () => {
    const { apiFetch } = await loadApiFetch();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Internal server error at /api/document-extraction/extract', {
        status: 500,
      }),
    );

    await expect(apiFetch('/document-extraction/extract')).rejects.toMatchObject({
      status: 500,
      code: 'EXTRACTION_FAILED',
      message: 'The document could not be processed. Please try again.',
    });
  });
});

describe('public signup environment gate', () => {
  it('is disabled by default', () => {
    expect(isPublicSignupEnabled({})).toBe(false);
  });

  it('is enabled only for local when explicitly configured', () => {
    expect(
      isPublicSignupEnabled({
        VITE_APP_ENV: 'local',
        VITE_PUBLIC_SIGNUP_ENABLED: 'true',
      } as Partial<ImportMetaEnv>),
    ).toBe(true);
    expect(
      isPublicSignupEnabled({
        VITE_APP_ENV: 'pilot',
        VITE_PUBLIC_SIGNUP_ENABLED: 'true',
      } as Partial<ImportMetaEnv>),
    ).toBe(false);
    expect(
      isPublicSignupEnabled({
        VITE_APP_ENV: 'production',
        VITE_PUBLIC_SIGNUP_ENABLED: 'true',
      } as Partial<ImportMetaEnv>),
    ).toBe(false);
  });
});

describe('contact email config', () => {
  it('uses configured contact email when present', () => {
    expect(
      getContactEmail({
        VITE_CONTACT_EMAIL: 'help@carbonliteapp.ca',
      } as Partial<ImportMetaEnv>),
    ).toBe('help@carbonliteapp.ca');
  });

  it('falls back to the legacy CarbonLite email when not configured', () => {
    expect(getContactEmail({})).toBe('help@carbonliteapp.ca');
  });
})
