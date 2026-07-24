import { describe, expect, it } from 'vitest';
import {
  formatScopeClassification,
  getScopeDescription,
  getScopeLabel,
  inferDefaultScope,
  resolveScopeClassification,
} from './scopeClassification';

describe('scope classification', () => {
  it.each([
    ['DIESEL', 'SCOPE_1'],
    ['Gasoline', 'SCOPE_1'],
    ['natural gas', 'SCOPE_1'],
    ['ELECTRICITY', 'SCOPE_2'],
    ['Air Travel', 'SCOPE_3'],
    ['Business Travel - Flight', 'SCOPE_3'],
    ['HOTEL', 'SCOPE_3'],
    ['Hotel Stay', 'SCOPE_3'],
    ['Ground Transport', 'SCOPE_3'],
    ['SHIPPING', 'SCOPE_3'],
    ['WASTE', 'UNCLASSIFIED'],
    ['WATER', 'TRACKED_METRIC'],
  ])('maps %s to %s', (activityType, expectedScope) => {
    expect(inferDefaultScope(activityType)).toBe(expectedScope);
  });

  it('prefers manual override, then factor default scope, then activity mapping', () => {
    expect(
      resolveScopeClassification({
        activityType: 'ELECTRICITY',
        scopeOverride: 'Scope 3',
        factorDefaultScope: 'Scope 2',
      }),
    ).toEqual({ scope: 'SCOPE_3', source: 'override' });

    expect(
      resolveScopeClassification({
        activityType: 'DIESEL',
        factorDefaultScope: 'SCOPE_2',
      }),
    ).toEqual({ scope: 'SCOPE_2', source: 'factor' });

    expect(resolveScopeClassification({ activityType: 'DIESEL' })).toEqual({
      scope: 'SCOPE_1',
      source: 'default-mapping',
    });
  });

  it('keeps electricity in Scope 2 when matched factor scope metadata is stale', () => {
    expect(
      resolveScopeClassification({
        activityType: 'Electricity',
        factorDefaultScope: 'Scope 1',
        factorScope: 'Scope 1',
      }),
    ).toEqual({ scope: 'SCOPE_2', source: 'default-mapping' });
  });

  it('does not fall back unknown calculated activities to Scope 1', () => {
    const resolution = resolveScopeClassification({ activityType: 'UNKNOWN_ACTIVITY' });

    expect(resolution).toEqual({ scope: 'UNCLASSIFIED', source: 'unclassified' });
    expect(formatScopeClassification(resolution.scope)).toBe('Unclassified');
  });

  it('formats scope labels and descriptions', () => {
    expect(getScopeLabel('SCOPE_2')).toBe('Scope 2');
    expect(getScopeDescription('SCOPE_2')).toBe('Purchased energy');
    expect(getScopeLabel(null)).toBe('Not specified');
  });
});
