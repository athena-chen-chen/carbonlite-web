import type { CalculationAuditDetail } from '../../services/metrics';
import { buildSiteFacilityRollup } from '../../utils/siteFacilityBreakdown';

export function buildFacilityBreakdown(calculationDetails: CalculationAuditDetail[]) {
  return buildSiteFacilityRollup(calculationDetails);
}
