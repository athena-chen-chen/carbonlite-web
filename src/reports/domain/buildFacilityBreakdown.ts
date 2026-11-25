import type { ScopeDeclarations } from './scopeCoverage';
import type { CalculationAuditDetail } from '../../services/metrics';
import { buildSiteFacilityRollup } from '../../utils/siteFacilityBreakdown';

export function buildFacilityBreakdown(calculationDetails: CalculationAuditDetail[], declarations?: ScopeDeclarations) {
  const result = buildSiteFacilityRollup(calculationDetails);
  for (const row of result.rows) {
    for (const scope of ['Scope 1', 'Scope 2', 'Scope 3'] as const) {
      const evidence = row.scopeCoverage?.[scope];
      if (evidence && declarations?.[scope] === 'EXCLUDED') {
        evidence.conflict = evidence.calculatedRecords > 0;
        evidence.state = evidence.conflict ? 'NOT_ASSESSED' : 'EXCLUDED';
      }
    }
  }
  return result;
}
