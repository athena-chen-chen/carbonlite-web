import {
  buildPrimarySkippedReasonSummary,
  buildReportCountSummary,
  buildReportExecutiveSummary,
} from '../../components/FormalReportPreview';
import { buildMetricsSummaryTableRows } from '../../components/MetricsSummarySection';
import type { BuildCanonicalReportDataInput } from './reportTypes';

export function buildReportTotals(input: BuildCanonicalReportDataInput) {
  const reportCountSummary = buildReportCountSummary(input.countSummary, input.calculationDetails);
  const executiveSummary = buildReportExecutiveSummary({
    totalEstimatedEmissionsKgCO2e: input.totalEstimatedEmissionsKgCO2e,
    countSummary: reportCountSummary,
    matchedActivityEmissions: input.matchedActivityEmissions,
    calculationDetails: input.calculationDetails,
  });
  const primarySkippedReasons = buildPrimarySkippedReasonSummary(
    input.calculationDetails,
    reportCountSummary,
  );
  const totalsByMetric = buildMetricsSummaryTableRows({
    usageTotals: input.usageTotals,
    totalEstimatedEmissionsKgCO2e: input.totalEstimatedEmissionsKgCO2e,
    recordsIncluded: reportCountSummary.processedRecords,
  });

  return {
    reportCountSummary,
    executiveSummary,
    primarySkippedReasons,
    totalsByMetric,
  };
}
