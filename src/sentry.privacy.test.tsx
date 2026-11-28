import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ envelopes: [] as unknown[], options: undefined as any }));
vi.mock('@sentry/react', async importOriginal => {
  const sdk = await importOriginal<typeof import('@sentry/react')>();
  return {
    ...sdk,
    init: (options: any) => { state.options = options; return sdk.init(options); },
    makeFetchTransport: () => ({ send: async (envelope: unknown) => { state.envelopes.push(envelope); return {}; }, flush: async () => true }),
  };
});
import * as Sentry from '@sentry/react';
let privacy: typeof import('./sentry');
const canary = 'PRIVATE_DOCUMENT_TENANT_USER_BEARER_UPLOAD';
const uuid = '2a72e299-e64b-4a27-b8a0-44ed813fa472';
const malicious = () => ({
  event_id: 'a'.repeat(32),
  exception: { values: [{ type: 'TypeError', value: canary, stacktrace: { frames: [{ filename: canary }] } }] },
  request: { url: `https://example.invalid/documents/${canary}?token=${canary}`, headers: { Authorization: `Bearer ${canary}` } },
  user: { id: canary }, tags: { tenant: canary }, extra: { upload: canary },
  breadcrumbs: [{ message: canary }], contexts: { react: { componentStack: canary } },
});
beforeAll(async () => {
  vi.stubEnv('VITE_SENTRY_DSN', 'https://synthetic@telemetry.example.invalid/1');
  privacy = await import('./sentry');
  privacy.initSentry();
});
beforeEach(() => { state.envelopes.length = 0; Sentry.getCurrentScope().clear(); Sentry.getIsolationScope().clear(); });
afterAll(async () => { await Sentry.close(); vi.unstubAllEnvs(); });

function assertPrivate(value: unknown) {
  const json = JSON.stringify(value);
  expect(json).not.toContain(canary);
  for (const key of ['stacktrace', 'breadcrumbs', 'Authorization', 'componentStack', 'filename', 'request', 'user', 'extra', 'tags']) expect(json).not.toContain(`"${key}"`);
  expect(new TextEncoder().encode(json).length).toBeLessThan(2048);
}

describe('central outbound privacy boundary', () => {
  it('rebuilds a strict allowlist from sensitive automatic error metadata', () => {
    const clean = privacy.sanitizeSentryEvent(malicious());
    expect(clean).not.toBeNull(); assertPrivate(clean);
    expect(Object.keys(clean!)).toEqual(['event_id', 'type', 'platform', 'level', 'exception', 'contexts']);
    expect(clean?.contexts?.carbonlite).toEqual({ operation: 'FRONTEND', errorCategory: 'TypeError' });
  });
  it('sanitizes direct SDK capture independently of the explicit helper', async () => {
    Sentry.captureEvent(malicious()); await Sentry.flush(1000);
    expect(state.envelopes.length).toBe(1); assertPrivate(state.envelopes);
  });
  it('preserves fixed categories, validated HTTP status and response reference', async () => {
    const error = Object.assign(new Error(canary), { status: 503, code: 'DOCUMENT_DELETE_RECONCILIATION_REQUIRED', data: { code: 'DOCUMENT_DELETE_RECONCILIATION_REQUIRED', requestId: uuid } });
    privacy.captureFrontendException(error, { path: `/documents/${canary}?q=${canary}`, technicalMessage: canary });
    await Sentry.flush(1000);
    expect(state.envelopes.length).toBe(1); assertPrivate(state.envelopes);
    expect(JSON.stringify(state.envelopes)).toContain(uuid);
    expect(JSON.stringify(state.envelopes)).toContain('DOCUMENT_REQUEST');
    expect(error.message).toBe(canary);
  });
  it('does not trust a caller context reference', async () => {
    privacy.captureFrontendException(new Error(canary), { requestId: uuid }); await Sentry.flush(1000);
    expect(JSON.stringify(state.envelopes)).not.toContain(uuid);
  });
  it('retains the SDK safety-net fallback even when its automatic event is dropped', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    function Broken(): React.ReactNode { throw new Error(canary); }
    try {
      render(<privacy.SentryErrorBoundary fallback={<div>Safe fallback</div>}><Broken /></privacy.SentryErrorBoundary>);
      expect(screen.getByText('Safe fallback')).toBeTruthy();
      await Sentry.flush(1000);
      assertPrivate(state.envelopes);
    } finally { log.mockRestore(); }
  });
  it('sends a sanitized diagnostic from the application error boundary', async () => {
    const { AppErrorBoundary } = await import('./components/AppErrorFallback');
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    function Broken(): React.ReactNode { throw new Error(canary); }
    try {
      render(<AppErrorBoundary showTechnicalDetails={false}><Broken /></AppErrorBoundary>);
      expect(screen.getByText('Something went wrong.')).toBeTruthy();
      await Sentry.flush(1000);
      expect(state.envelopes.length).toBe(1);
      assertPrivate(state.envelopes);
      expect(JSON.stringify(state.envelopes)).toContain('RENDER');
    } finally { log.mockRestore(); }
  });
  it('disables automatic performance, breadcrumbs, logs and default integrations', () => {
    expect(state.options.defaultIntegrations).toBe(false);
    expect(state.options.integrations.map((item: any) => item.name)).toEqual(['GlobalHandlers']);
    expect(state.options.tracesSampleRate).toBe(0);
    expect(state.options.enableLogs).toBe(false);
    expect(state.options.sendDefaultPii).toBe(false);
    expect(state.options.sendClientReports).toBe(false);
    expect(state.options.beforeSendTransaction({})).toBeNull();
    expect(state.options.beforeSendLog({})).toBeNull();
    expect(state.options.beforeBreadcrumb({})).toBeNull();
  });
  it('never stores raw navigation paths or query strings', () => {
    privacy.setSentryRouteContext(`/documents/${canary}?token=${canary}`);
    expect(Sentry.getIsolationScope().getScopeData().tags.route).toBe('DOCUMENT_REQUEST');
  });
  it.each(['transaction', 'session', 'sessions', 'attachment', 'log', 'span', 'replay_event', 'profile', 'client_report', 'feedback', 'unknown'])('blocks unsupported envelope item %s', async type => {
    const transport = state.options.transport({});
    await transport.send([{ arbitrary: canary }, [[{ type }, malicious()]]]);
    expect(state.envelopes).toEqual([]);
  });
  it('drops attachments and rebuilds envelope headers', async () => {
    const transport = state.options.transport({});
    await transport.send([{}, [[{ type: 'event' }, malicious()], [{ type: 'attachment' }, canary]]]);
    expect(state.envelopes).toEqual([]);
    await transport.send([{ trace: canary }, [[{ type: 'event', filename: canary }, malicious()]]]);
    expect(state.envelopes.length).toBe(1); assertPrivate(state.envelopes);
  });
  it.each([null, [], { type: 'transaction' }, { event_id: canary }, { contexts: { carbonlite: { status: 200 } } }, { contexts: { carbonlite: { requestId: canary } } }, { contexts: { carbonlite: { operation: canary } } }, { contexts: { carbonlite: { errorCategory: canary } } }, { extra: 'x'.repeat(2049) }])('rejects malformed or oversized metadata %#', input => {
    expect(privacy.sanitizeSentryEvent(input)).toBeNull();
  });
  it('rejects accessors, cycles and custom serialization without executing them', () => {
    const getter = vi.fn(() => canary);
    expect(privacy.sanitizeSentryEvent(Object.defineProperty({}, 'secret', { get: getter }))).toBeNull();
    const cycle: any = {}; cycle.extra = cycle;
    expect(privacy.sanitizeSentryEvent(cycle)).toBeNull();
    expect(privacy.sanitizeSentryEvent({ toJSON: getter })).toBeNull();
    expect(getter).not.toHaveBeenCalled();
  });
  it('drops excessive aggregate metadata', () => {
    expect(privacy.sanitizeSentryEvent({ extra: Array.from({ length: 20 }, () => 'x'.repeat(1000)) })).toBeNull();
  });
  it('drops an event without a valid transport identity', async () => {
    const transport = state.options.transport({});
    await transport.send([{}, [[{ type: 'event' }, {}]]]);
    expect(state.envelopes).toEqual([]);
  });
  it('rejects malformed reconciliation references without changing the error', async () => {
    const error = Object.assign(new Error(canary), { status: 503, code: 'DOCUMENT_DELETE_RECONCILIATION_REQUIRED', data: { code: 'DOCUMENT_DELETE_RECONCILIATION_REQUIRED', requestId: canary } });
    privacy.captureFrontendException(error, { path: '/documents/synthetic' });
    await Sentry.flush(1000);
    expect(state.envelopes).toEqual([]);
    expect(error.message).toBe(canary);
    expect(error.status).toBe(503);
  });
  it('invalid telemetry cannot throw into UI error handling', () => {
    expect(() => privacy.captureFrontendException(new Error(canary), { path: {} })).not.toThrow();
    expect(state.envelopes).toEqual([]);
  });
});
