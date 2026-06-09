import posthog from 'posthog-js';
import { getCurrentUser, getOrganizationId, type AuthUser } from './auth';

type AnalyticsProperties = Record<string, unknown>;

const posthogKey = import.meta.env.VITE_POSTHOG_KEY?.trim();
const posthogHost =
  import.meta.env.VITE_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com';
const sensitivePropertyPattern =
  /password|token|secret|content|ocr|invoice|file|documentText|base64/i;

let initialized = false;

export function initAnalytics() {
  if (!posthogKey || initialized) return;

  posthog.init(posthogKey, {
    api_host: posthogHost,
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    advanced_disable_flags: true,
    disable_surveys: true,
    person_profiles: 'identified_only',
  });
  initialized = true;
}

export function track(
  eventName: string,
  properties: AnalyticsProperties = {},
) {
  if (!posthogKey) return;
  initAnalytics();

  const currentUser = getCurrentUser();
  const organizationId = getOrganizationId(currentUser);

  posthog.capture(eventName, {
    ...(organizationId ? { organizationId } : {}),
    ...sanitizeProperties(properties),
  });
}

export function identify(user: AuthUser | null) {
  if (!posthogKey || !user?.id) return;
  initAnalytics();

  posthog.identify(user.id, {
    email: user.email,
    organizationId: getOrganizationId(user) || undefined,
  });
}

export function reset() {
  if (!posthogKey) return;
  initAnalytics();
  posthog.reset();
}

export function isAnalyticsEnabled() {
  return Boolean(posthogKey);
}

function sanitizeProperties(properties: AnalyticsProperties) {
  return Object.fromEntries(
    Object.entries(properties)
      .filter(([key]) => !sensitivePropertyPattern.test(key))
      .map(([key, value]) => [key, sanitizeValue(value)]),
  );
}

function sanitizeValue(value: unknown): unknown {
  if (
    value === null ||
    value === undefined ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (typeof value === 'string') {
    return value.slice(0, 200);
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map(sanitizeValue);
  }

  if (typeof value === 'object') {
    return sanitizeProperties(value as AnalyticsProperties);
  }

  return String(value).slice(0, 200);
}
