import {
  buildPrimarySkippedReasonSummary,
  buildReportCountSummary,
  buildReportExecutiveSummary,
} from '../../components/FormalReportPreview';
import { buildMetricsSummaryTableRows } from '../../components/MetricsSummarySection';
import type { BuildCanonicalReportDataInput } from './reportTypes';
import type { SourceReviewSummary } from './reportTypes';

export function buildReportTotals(
  input: BuildCanonicalReportDataInput,
  sourceReviewSummary?: SourceReviewSummary,
) {
  const reportCountSummary = buildReportCountSummary(
    input.countSummary,
    input.calculationDetails,
    sourceReviewSummary,
  );
  const executiveSummary = buildReportExecutiveSummary({
    totalEstimatedEmissionsKgCO2e: input.totalEstimatedEmissionsKgCO2e,
    countSummary: reportCountSummary,
    matchedActivityEmissions: input.matchedActivityEmissions,
    calculationDetails: input.calculationDetails,
    sourceReviewSummary,
  });
  const primarySkippedReasons = buildPrimarySkippedReasonSummary(
    input.calculationDetails,
    reportCountSummary,
    sourceReviewSummary?.needsReviewRows,
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
