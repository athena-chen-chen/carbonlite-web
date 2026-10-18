import type { CalculationAuditDetail } from '../../services/metrics';
import type { InventoryBoundary } from '../../constants/inventoryBoundary';
import { buildReportingReadinessAssessment } from '../../utils/reportingReadiness';
import type { SourceReviewSummary } from './reportTypes';

export function buildReadinessAssessment(input: {
  calculationDetails: CalculationAuditDetail[];
  inventoryBoundary: InventoryBoundary;
  sourceReviewSummary: SourceReviewSummary;
}) {
  return buildReportingReadinessAssessment(input);
}
