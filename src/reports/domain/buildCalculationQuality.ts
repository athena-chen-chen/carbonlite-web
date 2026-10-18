import { buildDataReadinessSummary } from '../../components/MetricsSummarySection';
import { getCalculationCoverageCounts } from '../../utils/reportCredibility';
import type { CalculationAuditDetail } from '../../services/metrics';
import type { CalculationQualitySummary } from './reportTypes';

export function buildCalculationQuality(
  calculationDetails: CalculationAuditDetail[],
): CalculationQualitySummary {
  const dataReadinessSummary = buildDataReadinessSummary(calculationDetails);
  const coverageCounts = getCalculationCoverageCounts(calculationDetails);
  const calculationCoverage =
    coverageCounts.eligibleEmissionBearingRecords > 0
      ? `${Math.round(
          (coverageCounts.calculatedRecords / coverageCounts.eligibleEmissionBearingRecords) * 1000,
        ) / 10}%`
      : 'Not applicable';

  return {
    calculationCoverage,
    coverageCounts,
    dataReadinessSummary,
  };
}
