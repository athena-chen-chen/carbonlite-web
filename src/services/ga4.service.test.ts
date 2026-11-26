const canary = 'SYNTHETIC_DOCUMENT_TENANT_BEARER_UPLOAD';
async function loadGA4(id: string) {
  vi.resetModules();
  vi.stubEnv('VITE_GA_MEASUREMENT_ID', id);
  return import('./ga4.service');
}

describe('GA pilot privacy hold', () => {
  beforeEach(() => { delete (window as Partial<Window>).gtag; delete (window as Partial<Window>).dataLayer; });
  afterEach(() => { vi.unstubAllEnvs(); delete (window as Partial<Window>).gtag; delete (window as Partial<Window>).dataLayer; vi.restoreAllMocks(); });

  it.each(['', 'G-SYNTHETIC'])('does not inject scripts, create globals or enable collection with id %j', async id => {
    const append = vi.spyOn(document.head, 'appendChild');
    const service = await loadGA4(id);
    service.initGA4(); service.initGA4();
    service.trackPageView(`/documents/${canary}?token=${canary}`, canary);
    service.trackEvent('SYNTHETIC', { content: canary });
    expect(service.isGA4Enabled()).toBe(false);
    expect(append).not.toHaveBeenCalled();
    expect(window.gtag).toBeUndefined(); expect(window.dataLayer).toBeUndefined();
  });

  it('does not submit to or mutate pre-existing globals', async () => {
    const send = vi.fn(); const queued = [['synthetic-existing-entry']];
    window.gtag = send; window.dataLayer = queued;
    const service = await loadGA4('G-SYNTHETIC');
    service.initGA4();
    service.trackPageView(`/documents/${canary}?secret=${canary}`, canary);
    service.trackEvent('DOCUMENT_UPLOADED', { user: canary, token: canary });
    expect(send).not.toHaveBeenCalled();
    expect(window.gtag).toBe(send); expect(window.dataLayer).toBe(queued);
    expect(queued).toEqual([['synthetic-existing-entry']]);
  });

  it('does not inspect arbitrary event properties or throw', async () => {
    const service = await loadGA4('G-SYNTHETIC');
    const read = vi.fn(() => { throw new Error('Synthetic metadata must not be read'); });
    expect(() => service.trackEvent('SYNTHETIC', Object.defineProperty({}, 'token', { get: read }))).not.toThrow();
    expect(read).not.toHaveBeenCalled();
  });
});
