import type { AuthUser } from './auth';

type AnalyticsProperties = Record<string, unknown>;

// Pilot privacy hold: deliberately do not import or initialize the provider SDK.
// Environment keys and existing call sites cannot enable collection.
export function initAnalytics(): void {}

export function track(_eventName: string, _properties: AnalyticsProperties = {}): void {}

export function identify(_user: AuthUser | null): void {}

export function reset(): void {}

export function isAnalyticsEnabled(): boolean {
  return false;
}
