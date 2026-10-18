import type { CanonicalReportData } from '../domain/reportTypes';

export function buildReportOutputFacts(report: CanonicalReportData) {
  const optionalDataCompleteness = report.calculationQuality.dataReadinessSummary.optionalDataCompleteness;

  return {
    totalKgCO2e: report.inventory.totalKgCO2e,
    reportPeriod: report.reportingPeriod.label,
    importedRecordCount: report.inventory.importedRecordCount,
    includedRecordCount: report.inventory.includedRecordCount,
    trackedMetricCount: report.inventory.trackedMetricCount,
    scopeTotals: report.scopeBreakdown.totals,
    calculationCoverage: report.calculationQuality.calculationCoverage,
    calculatedRecordCount: report.calculationQuality.coverageCounts.calculatedRecords,
    eligibleRecordCount: report.calculationQuality.coverageCounts.eligibleEmissionBearingRecords,
    optionalDataCompletenessPercent: optionalDataCompleteness.score,
    optionalCostPresentCount: optionalDataCompleteness.costDataCount,
    optionalCostTotalCount: optionalDataCompleteness.totalRecords,
    sourceReview: report.sourceReview,
    facilityBreakdown: report.facilityBreakdown,
    factorReview: report.factorReview,
  };
}
