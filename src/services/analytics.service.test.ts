const posthogMock = vi.hoisted(() => ({
  init: vi.fn(), capture: vi.fn(), identify: vi.fn(), reset: vi.fn(),
  startSessionRecording: vi.fn(), captureException: vi.fn(),
}));
vi.mock('posthog-js', () => ({ default: posthogMock }));
const canary = 'SYNTHETIC_USER_TENANT_DOCUMENT_BEARER_UPLOAD';

async function loadAnalytics(key: string) {
  vi.resetModules();
  vi.stubEnv('VITE_POSTHOG_KEY', key);
  vi.stubEnv('VITE_POSTHOG_HOST', 'https://synthetic.example.invalid');
  return import('./analytics.service');
}

describe('PostHog pilot privacy hold', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });
  afterEach(() => { vi.unstubAllEnvs(); localStorage.clear(); });

  it.each(['', 'synthetic-configured-key'])('cannot initialize or enable collection with key %j', async key => {
    const service = await loadAnalytics(key);
    service.initAnalytics(); service.initAnalytics();
    expect(service.isAnalyticsEnabled()).toBe(false);
    Object.values(posthogMock).forEach(mock => expect(mock).not.toHaveBeenCalled());
  });

  it('does not transmit identity, URLs or sensitive custom properties', async () => {
    const service = await loadAnalytics('synthetic-configured-key');
    const user = { id: canary, email: `${canary}@example.invalid`, organizationId: canary };
    localStorage.setItem('currentUser', JSON.stringify(user));
    service.identify(user);
    service.track('PAGE_VIEW', { route: `/documents/${canary}?token=${canary}`, content: canary });
    service.track('EXTRACTION_FAILED', { error: new Error(canary), stack: canary });
    service.reset(); service.identify(null);
    Object.values(posthogMock).forEach(mock => expect(mock).not.toHaveBeenCalled());
    expect(JSON.parse(localStorage.getItem('currentUser')!)).toEqual(user);
  });

  it('does not inspect arbitrary payloads or disturb application execution', async () => {
    const service = await loadAnalytics('synthetic-configured-key');
    const read = vi.fn(() => { throw new Error('Synthetic metadata must not be read'); });
    const properties = Object.defineProperty({}, 'secret', { get: read });
    expect(service.track('SYNTHETIC', properties)).toBeUndefined();
    expect(read).not.toHaveBeenCalled();
  });
});
