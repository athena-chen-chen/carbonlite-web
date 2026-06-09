type GA4EventParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();
const sensitiveParameterPattern =
  /password|token|secret|content|ocr|invoice|file|documentText|base64/i;

let initialized = false;

export function initGA4() {
  if (!measurementId || initialized || typeof document === 'undefined') return;

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag(...args: unknown[]) {
      window.dataLayer.push(args);
    };

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  script.dataset.carbonliteGa4 = 'true';
  document.head.appendChild(script);

  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: false,
  });

  initialized = true;
}

export function trackPageView(path: string, pageTitle: string) {
  if (!measurementId) return;
  initGA4();

  window.gtag('event', 'page_view', {
    page_path: path.slice(0, 200),
    page_title: pageTitle.slice(0, 100),
  });
}

export function trackEvent(
  eventName: string,
  params: GA4EventParams = {},
) {
  if (!measurementId) return;
  initGA4();

  window.gtag('event', eventName, sanitizeParams(params));
}

export function isGA4Enabled() {
  return Boolean(measurementId);
}

function sanitizeParams(params: GA4EventParams) {
  return Object.fromEntries(
    Object.entries(params)
      .filter(([key]) => !sensitiveParameterPattern.test(key))
      .map(([key, value]) => [
        key,
        typeof value === 'string' ? value.slice(0, 200) : value,
      ]),
  );
}
