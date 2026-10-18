import type { CalculationAuditDetail } from '../../services/metrics';
import { buildEmissionFactorsUsedInventory, type FormalConversionFactorUsed } from '../../components/FormalReportPreview';
import type { FactorReviewSummary } from './reportTypes';

export function buildFactorReviewSummary(
  factors: FormalConversionFactorUsed[] = [],
  calculationDetails: CalculationAuditDetail[] = [],
): FactorReviewSummary {
  const uniqueFactors = buildEmissionFactorsUsedInventory(factors, calculationDetails);
  return {
    factorsUsedCount: uniqueFactors.length,
    factorsRequiringReviewCount: uniqueFactors.filter((factor) => factor.verified === false).length,
    factors: uniqueFactors,
  };
}
