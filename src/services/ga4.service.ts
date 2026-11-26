type GA4EventParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

// Pilot privacy hold: never load the GA script, create globals, or submit events.
// Keep the existing synchronous API so application call sites remain unaffected.
export function initGA4(): void {}

export function trackPageView(_path: string, _pageTitle: string): void {}

export function trackEvent(_eventName: string, _params: GA4EventParams = {}): void {}

export function isGA4Enabled(): boolean {
  return false;
}
