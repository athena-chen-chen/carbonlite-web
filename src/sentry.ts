import * as Sentry from '@sentry/react';

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const OPERATIONS = ['FRONTEND', 'DOCUMENT_REQUEST', 'AUTHENTICATION', 'RENDER'] as const;
const CATEGORIES = ['Error', 'TypeError', 'RangeError', 'SyntaxError', 'ReferenceError', 'URIError', 'EvalError', 'HttpError', 'UnknownError'] as const;
type Transport = ReturnType<typeof Sentry.makeFetchTransport>;

function plain(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new Error('Invalid metadata');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.values(descriptors).some(d => !('value' in d))) throw new Error('Invalid metadata');
  return value as Record<string, unknown>;
}

// Bound inspection without invoking accessors, toJSON, or arbitrary object methods.
function bounded(value: unknown) {
  let nodes = 0;
  let bytes = 0;
  const ancestors = new Set<object>();
  function visit(item: unknown, depth: number) {
    if (++nodes > 512 || depth > 8) throw new Error('Oversized metadata');
    if (typeof item === 'string') {
      if (item.length > 2048) throw new Error('Oversized metadata');
      bytes += new TextEncoder().encode(item).length;
    } else if (item && typeof item === 'object') {
      if (ancestors.has(item)) throw new Error('Invalid metadata');
      if (!Array.isArray(item)) plain(item);
      const entries = Object.entries(Object.getOwnPropertyDescriptors(item));
      if (entries.length > 64) throw new Error('Oversized metadata');
      ancestors.add(item);
      for (const [key, descriptor] of entries) {
        if (key.length > 256 || !('value' in descriptor)) throw new Error('Invalid metadata');
        bytes += new TextEncoder().encode(key).length;
        visit(descriptor.value, depth + 1);
      }
      ancestors.delete(item);
    } else if (item !== null && item !== undefined && typeof item !== 'boolean' && !(typeof item === 'number' && Number.isFinite(item))) throw new Error('Invalid metadata');
    if (bytes > 16384) throw new Error('Oversized metadata');
  }
  visit(value, 0);
}

function httpStatus(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 400 || value > 599) throw new Error('Invalid status');
  return value;
}

function operation(path: unknown) {
  if (path === undefined) return 'FRONTEND';
  if (typeof path !== 'string' || path.length > 512) throw new Error('Invalid operation');
  if (/^\/documents(?:\/|$)/.test(path)) return 'DOCUMENT_REQUEST';
  if (/^\/(?:auth|login)(?:\/|$)/.test(path)) return 'AUTHENTICATION';
  return 'FRONTEND';
}

export function sanitizeSentryEvent(input: unknown): Sentry.ErrorEvent | null {
  try {
    bounded(input);
    const event = plain(input);
    if (event.type !== undefined && event.type !== 'error') return null;
    if (event.event_id !== undefined && (typeof event.event_id !== 'string' || !/^[0-9a-f]{32}$/.test(event.event_id))) return null;
    const contexts = event.contexts === undefined ? {} : plain(event.contexts);
    const metadata = contexts.carbonlite === undefined ? {} : plain(contexts.carbonlite);
    const tags = event.tags === undefined ? {} : plain(event.tags);
    const op = metadata.operation ?? tags.route ?? 'FRONTEND';
    if (!OPERATIONS.some(value => value === op)) return null;
    let category: unknown = metadata.errorCategory;
    if (category === undefined && event.exception !== undefined) {
      const values = plain(event.exception).values;
      if (!Array.isArray(values) || !values.length) return null;
      const type = plain(values[0]).type;
      category = CATEGORIES.some(value => value === type) ? type : 'UnknownError';
    }
    category ??= 'UnknownError';
    if (!CATEGORIES.some(value => value === category)) return null;
    const status = httpStatus(metadata.status);
    const requestId = metadata.requestId;
    if (requestId !== undefined && (typeof requestId !== 'string' || !UUID.test(requestId))) return null;
    const result: Sentry.ErrorEvent = {
      ...(typeof event.event_id === 'string' ? { event_id: event.event_id } : {}),
      type: undefined, platform: 'javascript', level: 'error',
      exception: { values: [{ type: String(category), value: 'Frontend failure; sanitized diagnostic only.' }] },
      contexts: { carbonlite: { operation: op, errorCategory: category, ...(status === undefined ? {} : { status }), ...(requestId === undefined ? {} : { requestId }) } },
    };
    return new TextEncoder().encode(JSON.stringify(result)).length <= 2048 ? result : null;
  } catch { return null; }
}

function privateTransport(options: Parameters<typeof Sentry.makeFetchTransport>[0]): Transport {
  const delegate = Sentry.makeFetchTransport(options);
  return {
    flush: timeout => delegate.flush(timeout),
    send: envelope => {
      try {
        // beforeSend does not cover attachments, sessions, logs or transactions.
        // Rebuild the final envelope; never forward unknown item/header data.
        if (!Array.isArray(envelope) || envelope.length !== 2 || !Array.isArray(envelope[1]) || envelope[1].length !== 1) return Promise.resolve({});
        const item = envelope[1][0];
        if (!Array.isArray(item) || item.length !== 2 || plain(item[0]).type !== 'event') return Promise.resolve({});
        const event = sanitizeSentryEvent(item[1]);
        if (!event || !event.event_id) return Promise.resolve({});
        return delegate.send([{ sent_at: new Date().toISOString(), event_id: event.event_id }, [[{ type: 'event' }, event]]]);
      } catch { return Promise.resolve({}); }
    },
  };
}

export function initSentry() {
  if (!sentryDsn) return;
  Sentry.init({
    dsn: sentryDsn, defaultIntegrations: false,
    integrations: [Sentry.globalHandlersIntegration()],
    sendDefaultPii: false, sendClientReports: false, enableLogs: false,
    tracesSampleRate: 0,
    beforeSend: sanitizeSentryEvent,
    beforeSendTransaction: () => null,
    beforeSendLog: () => null,
    beforeBreadcrumb: () => null,
    transport: privateTransport,
  });
}

export function setSentryRouteContext(pathname: string) {
  if (!sentryDsn) return;
  try { Sentry.setTag('route', operation(pathname)); } catch { /* Drop unsafe metadata. */ }
}

function own(value: unknown, key: string): unknown {
  if (!value || typeof value !== 'object') return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (descriptor && !('value' in descriptor)) throw new Error('Invalid metadata');
  return descriptor?.value;
}

export function captureFrontendException(error: unknown, context?: Record<string, unknown>) {
  if (!sentryDsn) return;
  try {
    const input = context === undefined ? {} : plain(context);
    bounded(input);
    const rawStatus = own(error, 'status') ?? input.status;
    const status = httpStatus(rawStatus === 0 ? undefined : rawStatus);
    const category = status !== undefined ? 'HttpError' : error instanceof TypeError ? 'TypeError' : error instanceof Error ? 'Error' : 'UnknownError';
    const metadata: Record<string, unknown> = { operation: input.componentStack !== undefined ? 'RENDER' : operation(input.path), errorCategory: category, ...(status === undefined ? {} : { status }) };
    if (status === 503 && own(error, 'code') === 'DOCUMENT_DELETE_RECONCILIATION_REQUIRED') {
      const data = plain(own(error, 'data'));
      if (data.code !== 'DOCUMENT_DELETE_RECONCILIATION_REQUIRED' || typeof data.requestId !== 'string' || !UUID.test(data.requestId)) return;
      metadata.requestId = data.requestId;
    }
    Sentry.withScope(scope => {
      scope.setContext('carbonlite', metadata);
      Sentry.captureException(new Error('Frontend failure; sanitized diagnostic only.'));
    });
  } catch { /* Telemetry must never change application error handling. */ }
}

export const SentryErrorBoundary = Sentry.ErrorBoundary;
