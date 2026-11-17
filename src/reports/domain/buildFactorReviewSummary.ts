import type { CalculationAuditDetail } from '../../services/metrics';
import { buildEmissionFactorsUsedInventory, type FormalConversionFactorUsed } from '../../components/FormalReportPreview';
import { reportFactorNeedsReview } from '../../utils/reportCredibility';
import type { FactorReviewSummary } from './reportTypes';

export function buildFactorReviewSummary(
  factors: FormalConversionFactorUsed[] = [],
  calculationDetails: CalculationAuditDetail[] = [],
): FactorReviewSummary {
  const uniqueFactors = buildEmissionFactorsUsedInventory(factors, calculationDetails);
  return {
    factorsUsedCount: uniqueFactors.length,
    factorsRequiringReviewCount: uniqueFactors.filter(reportFactorNeedsReview).length,
    factors: uniqueFactors,
  };
}
