import type { CalculationAuditDetail } from '../../services/metrics';
import { resolveScopeClassification, formatScopeClassification } from '../../utils/scopeClassification';
import { formatEmissionsWithUnit } from '../../utils/numberFormatting';

export const REPORT_SCOPES = ['Scope 1', 'Scope 2', 'Scope 3'] as const;
export type ReportScope = typeof REPORT_SCOPES[number];
export type ScopeCoverageState = 'INCLUDED' | 'EXCLUDED' | 'NOT_ASSESSED';
// Only a trusted structured contract may supply declarations. Boundary prose is never parsed.
export type ScopeDeclarations = Partial<Record<ReportScope, ScopeCoverageState>>;
export type ScopePresentation = { state: ScopeCoverageState; calculatedRecords: number; conflict: boolean };
export type ScopeCoverage = Record<ReportScope, ScopePresentation>;

export function buildScopeCoverage(details: CalculationAuditDetail[], declarations: ScopeDeclarations = {}): ScopeCoverage {
  return Object.fromEntries(REPORT_SCOPES.map(scope => {
    const calculatedRecords = details.filter(detail => {
      const value = detail.calculatedEmissionsKgCO2e ?? detail.calculatedEmission;
      return detail.status === 'CALCULATED' && typeof value === 'number' &&
        Number.isFinite(value) && formatScopeClassification(resolveScopeClassification({
          activityType: detail.activityType, scopeOverride: detail.scopeOverride,
          factorDefaultScope: detail.factorDefaultScope, factorScope: detail.factorScope,
        }).scope) === scope;
    }).length;
    const declared = declarations[scope];
    const conflict = declared === 'EXCLUDED' && calculatedRecords > 0;
    return [scope, { state: conflict ? 'NOT_ASSESSED' : declared === 'EXCLUDED' ? 'EXCLUDED' :
      calculatedRecords > 0 ? 'INCLUDED' : 'NOT_ASSESSED', calculatedRecords, conflict }];
  })) as ScopeCoverage;
}

export function formatScopeResult(value: number, evidence?: ScopePresentation): string {
  if (evidence?.conflict) return 'Not assessed — coverage conflicts with calculated records';
  if (evidence?.state === 'EXCLUDED') return 'Excluded — not calculated';
  if (evidence?.state !== 'INCLUDED' || !evidence.calculatedRecords) return 'Not assessed';
  return formatEmissionsWithUnit(value);
}

export function scopeShare(value: number, total: number, evidence?: ScopePresentation): number | null {
  return evidence?.state === 'INCLUDED' && evidence.calculatedRecords > 0 && !evidence.conflict && total > 0
    ? value / total * 100 : null;
}

/** Numeric CSV cells remain numeric for assessed scopes; status text replaces unassessed totals. */
export function scopeCsvValue(value: number, evidence?: ScopePresentation): string | number {
  return evidence?.state === 'INCLUDED' && evidence.calculatedRecords > 0 && !evidence.conflict
    ? value : formatScopeResult(value, evidence);
}
