import type { CalculationAuditDetail } from '../../services/metrics';
import {
  formatScopeClassification,
  resolveScopeClassification,
} from '../../utils/scopeClassification';
import type { ScopeBreakdown } from './reportTypes';

export function buildScopeBreakdown(calculationDetails: CalculationAuditDetail[]): ScopeBreakdown {
  const totals: ScopeBreakdown['totals'] = {
    'Scope 1': 0,
    'Scope 2': 0,
    'Scope 3': 0,
    Unclassified: 0,
  };

  calculationDetails.forEach((item) => {
    if (item.status !== 'CALCULATED') return;
    const emissions = Number(item.calculatedEmissionsKgCO2e ?? item.calculatedEmission ?? 0);
    if (!Number.isFinite(emissions)) return;
    const scope = resolveScopeClassification({
      activityType: item.activityType,
      scopeOverride: item.scopeOverride,
      factorDefaultScope: item.factorDefaultScope,
      factorScope: item.factorScope,
    }).scope;

    if (scope === 'TRACKED_METRIC') return;
    if (scope === 'UNCLASSIFIED') {
      totals.Unclassified += emissions;
      return;
    }

    const label = formatScopeClassification(scope);
    if (label in totals) totals[label as keyof typeof totals] += emissions;
  });

  return { totals };
}
