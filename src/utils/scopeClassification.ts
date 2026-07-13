import { normalizeActivityType } from './activityType';

export type ScopeClassification =
  | 'SCOPE_1'
  | 'SCOPE_2'
  | 'SCOPE_3'
  | 'TRACKED_METRIC'
  | 'UNCLASSIFIED';

export type ScopeSource = 'override' | 'factor' | 'default-mapping' | 'unclassified';

export type ScopeResolution = {
  scope: ScopeClassification;
  source: ScopeSource;
};

const DEFAULT_SCOPE_BY_ACTIVITY: Record<string, ScopeClassification> = {
  DIESEL: 'SCOPE_1',
  GASOLINE: 'SCOPE_1',
  NATURAL_GAS: 'SCOPE_1',
  PROPANE: 'SCOPE_1',

  ELECTRICITY: 'SCOPE_2',
  STEAM: 'SCOPE_2',
  PURCHASED_HEAT: 'SCOPE_2',
  PURCHASED_COOLING: 'SCOPE_2',

  HOTEL: 'SCOPE_3',
  AIR_TRAVEL: 'SCOPE_3',
  GROUND_TRANSPORT: 'SCOPE_3',
  SHIPPING: 'SCOPE_3',
  WASTE: 'SCOPE_3',
  BUSINESS_TRAVEL: 'SCOPE_3',
  TRAVEL: 'SCOPE_3',
  FREIGHT: 'SCOPE_3',

  WATER: 'TRACKED_METRIC',
};

export function inferDefaultScope(activityType?: string | null): ScopeClassification {
  const normalized = normalizeScopeActivityType(activityType);
  return DEFAULT_SCOPE_BY_ACTIVITY[normalized] ?? 'UNCLASSIFIED';
}

export function resolveScopeClassification(input: {
  activityType?: string | null;
  scopeOverride?: string | null;
  factorDefaultScope?: string | null;
  factorScope?: string | null;
}): ScopeResolution {
  const override = normalizeScopeClassification(input.scopeOverride);
  if (override) return { scope: override, source: 'override' };

  const normalizedActivityType = normalizeScopeActivityType(input.activityType);
  const inferred = inferDefaultScope(input.activityType);

  if (normalizedActivityType === 'ELECTRICITY') {
    return { scope: 'SCOPE_2', source: 'default-mapping' };
  }

  const factorScope =
    normalizeScopeClassification(input.factorDefaultScope) ??
    normalizeScopeClassification(input.factorScope);
  if (factorScope) return { scope: factorScope, source: 'factor' };

  return {
    scope: inferred,
    source: inferred === 'UNCLASSIFIED' ? 'unclassified' : 'default-mapping',
  };
}

export function normalizeScopeActivityType(activityType?: string | null) {
  return normalizeActivityType(activityType) ?? '';
}

export function normalizeScopeClassification(value?: string | null): ScopeClassification | null {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/^SCOPE_/, 'SCOPE_');

  if (['SCOPE_1', 'SCOPE1', '1'].includes(normalized)) return 'SCOPE_1';
  if (['SCOPE_2', 'SCOPE2', '2'].includes(normalized)) return 'SCOPE_2';
  if (['SCOPE_3', 'SCOPE3', '3'].includes(normalized)) return 'SCOPE_3';
  if (['TRACKED_METRIC', 'TRACKED_ONLY', 'OPERATIONAL_METRIC'].includes(normalized)) {
    return 'TRACKED_METRIC';
  }
  if (normalized === 'UNCLASSIFIED') return 'UNCLASSIFIED';

  return null;
}

export function formatScopeClassification(scope: ScopeClassification) {
  return getScopeLabel(scope);
}

export function getScopeLabel(scope?: string | null): string {
  const normalized = normalizeScopeClassification(scope);

  if (!normalized) return 'Not specified';

  switch (normalized) {
    case 'SCOPE_1':
      return 'Scope 1';
    case 'SCOPE_2':
      return 'Scope 2';
    case 'SCOPE_3':
      return 'Scope 3';
    case 'TRACKED_METRIC':
      return 'Tracked Metric';
    case 'UNCLASSIFIED':
      return 'Unclassified';
  }
}

export function getScopeDescription(scope?: string | null): string {
  const normalized = normalizeScopeClassification(scope);

  switch (normalized) {
    case 'SCOPE_1':
      return 'Direct emissions';
    case 'SCOPE_2':
      return 'Purchased energy';
    case 'SCOPE_3':
      return 'Other indirect emissions';
    case 'TRACKED_METRIC':
      return 'Operational metric';
    case 'UNCLASSIFIED':
      return 'Requires review';
    default:
      return 'Not specified';
  }
}

export function formatScopeSource(source: ScopeSource) {
  switch (source) {
    case 'override':
      return 'manual override';
    case 'factor':
      return 'factor default scope';
    case 'default-mapping':
      return 'default activity mapping';
    case 'unclassified':
      return 'requires review';
  }
}
