async function loadGA4() {
  vi.resetModules();
  return import('./ga4.service');
}

describe('GA4 service', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    document.head
      .querySelectorAll('script[data-carbonlite-ga4="true"]')
      .forEach((script) => script.remove());
    delete (window as Partial<Window>).gtag;
    window.dataLayer = [];
  });

  it('does not initialize when the measurement id is missing', async () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', '');
    const ga4 = await loadGA4();

    ga4.initGA4();
    ga4.trackEvent('LOGIN');

    expect(document.querySelector('script[data-carbonlite-ga4="true"]')).toBeNull();
    expect(window.dataLayer).toEqual([]);
  });

  it('loads GA4 and disables the automatic initial page view', async () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TEST123');
    const ga4 = await loadGA4();

    ga4.initGA4();

    const script = document.querySelector<HTMLScriptElement>(
      'script[data-carbonlite-ga4="true"]',
    );
    expect(script?.src).toContain(
      'googletagmanager.com/gtag/js?id=G-TEST123',
    );
    expect(window.dataLayer).toEqual(
      expect.arrayContaining([
        ['config', 'G-TEST123', { send_page_view: false }],
      ]),
    );
  });

  it('tracks page views and removes sensitive custom event parameters', async () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TEST123');
    const ga4 = await loadGA4();

    ga4.trackPageView('/reports?year=2026', 'Reports');
    ga4.trackEvent('REPORT_GENERATED', {
      report_type: 'emissions',
      record_count: 4,
      token: 'do-not-send',
      invoice_content: 'sensitive',
    });

    expect(window.dataLayer).toEqual(
      expect.arrayContaining([
        [
          'event',
          'page_view',
          {
            page_path: '/reports?year=2026',
            page_title: 'Reports',
          },
        ],
        [
          'event',
          'REPORT_GENERATED',
          {
            report_type: 'emissions',
            record_count: 4,
          },
        ],
      ]),
    );
  });
});
