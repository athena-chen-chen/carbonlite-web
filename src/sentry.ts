import * as Sentry from '@sentry/react';

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

export function initSentry() {
  if (!sentryDsn) return;

  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION || undefined,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  });
}

export function setSentryRouteContext(pathname: string) {
  if (!sentryDsn) return;
  Sentry.setTag('route', pathname);
  Sentry.addBreadcrumb({
    category: 'navigation',
    message: pathname,
    level: 'info',
  });
}

export function captureFrontendException(error: unknown, context?: Record<string, unknown>) {
  if (!sentryDsn) return;

  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext('carbonlite', context);
    }
    Sentry.captureException(error);
  });
}

export const SentryErrorBoundary = Sentry.ErrorBoundary;
