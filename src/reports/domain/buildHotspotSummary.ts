import { buildHotspotAnalysis } from '../../components/MetricsSummarySection';
import type { CalculationAuditDetail } from '../../services/metrics';

export function buildHotspotSummary(calculationDetails: CalculationAuditDetail[]) {
  return buildHotspotAnalysis(calculationDetails);
}
