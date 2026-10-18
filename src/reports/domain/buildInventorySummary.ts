import { isRecordRequiringCorrection, isTrackedMetricDetail } from '../../utils/reportCredibility';
import type { CalculationAuditDetail } from '../../services/metrics';
import type { MetricsCountSummary } from '../../components/MetricsSummarySection';
import type { InventorySummary } from './reportTypes';

export function buildInventorySummary(input: {
  reportCountSummary: MetricsCountSummary;
  calculationDetails: CalculationAuditDetail[];
  totalEstimatedEmissionsKgCO2e: number;
}): InventorySummary {
  return {
    importedRecordCount: input.reportCountSummary.totalRecordsFound,
    includedRecordCount: input.reportCountSummary.processedRecords,
    trackedMetricCount: input.calculationDetails.filter(isTrackedMetricDetail).length,
    importedNeedsReviewCount: input.calculationDetails.filter(isRecordRequiringCorrection).length,
    totalKgCO2e: input.totalEstimatedEmissionsKgCO2e,
  };
}
