const posthogMock = vi.hoisted(() => ({
  init: vi.fn(),
  capture: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
}));

vi.mock('posthog-js', () => ({
  default: posthogMock,
}));

async function loadAnalytics() {
  vi.resetModules();
  return import('./analytics.service');
}

describe('analytics service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    localStorage.clear();
  });

  it('does not initialize or capture events without a PostHog key', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', '');
    const analytics = await loadAnalytics();

    analytics.initAnalytics();
    analytics.track('PAGE_VIEW', { pageName: 'Home' });

    expect(posthogMock.init).not.toHaveBeenCalled();
    expect(posthogMock.capture).not.toHaveBeenCalled();
  });

  it('initializes PostHog with automatic capture and replay disabled', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test');
    vi.stubEnv('VITE_POSTHOG_HOST', 'https://us.i.posthog.com');
    const analytics = await loadAnalytics();

    analytics.initAnalytics();

    expect(posthogMock.init).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({
        api_host: 'https://us.i.posthog.com',
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        disable_session_recording: true,
        advanced_disable_flags: true,
        disable_surveys: true,
      }),
    );
  });

  it('tracks safe properties with organization context', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test');
    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        id: 'user-1',
        email: 'pilot@example.com',
        organizationId: 'org-1',
      }),
    );
    const analytics = await loadAnalytics();

    analytics.track('REPORT_GENERATED', {
      reportType: 'emissions',
      recordCount: 4,
      token: 'do-not-send',
      invoiceContent: 'sensitive text',
    });

    expect(posthogMock.capture).toHaveBeenCalledWith('REPORT_GENERATED', {
      organizationId: 'org-1',
      reportType: 'emissions',
      recordCount: 4,
    });
  });

  it('identifies and resets authenticated users', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test');
    const analytics = await loadAnalytics();

    analytics.identify({
      id: 'user-1',
      email: 'pilot@example.com',
      organizationId: 'org-1',
    });
    analytics.reset();

    expect(posthogMock.identify).toHaveBeenCalledWith('user-1', {
      email: 'pilot@example.com',
      organizationId: 'org-1',
    });
    expect(posthogMock.reset).toHaveBeenCalledTimes(1);
  });
});
