import { buildReportingPeriodLabel, buildSourceEvidenceCounts } from './reportSemantics';
import { buildSourceEvidenceRows } from '../../components/FormalReportPreview';
import type {
  BuildCanonicalReportDataInput,
  CanonicalReportData,
} from './reportTypes';
import { buildCalculationQuality } from './buildCalculationQuality';
import { buildFacilityBreakdown } from './buildFacilityBreakdown';
import { buildFactorReviewSummary } from './buildFactorReviewSummary';
import { buildHotspotSummary } from './buildHotspotSummary';
import { buildInventorySummary } from './buildInventorySummary';
import { buildReadinessAssessment } from './buildReadinessAssessment';
import { buildReportLimitations } from './buildReportLimitations';
import { buildReportMetadata } from './buildReportMetadata';
import { buildReportTotals } from './buildReportTotals';
import { buildScopeBreakdown } from './buildScopeBreakdown';
import { buildSourceReviewSummary } from './buildSourceReviewSummary';

export function buildCanonicalReportData(input: BuildCanonicalReportDataInput): CanonicalReportData {
  input = { ...input, reportingPeriod: { ...input.reportingPeriod, label: buildReportingPeriodLabel(input.reportingPeriod) } };
  const sourceEvidenceRows = buildSourceEvidenceRows(input.activities, input.calculationDetails);
  const sourceReview = buildSourceReviewSummary({
    rows: input.reviewRows,
    calculationDetails: input.calculationDetails,
  });
  const reportTotals = buildReportTotals(input, sourceReview);
  const calculationQuality = buildCalculationQuality(input.calculationDetails);
  const scopeBreakdown = buildScopeBreakdown(input.calculationDetails);
  const facilityBreakdown = buildFacilityBreakdown(input.calculationDetails);
  const hotspots = buildHotspotSummary(input.calculationDetails);
  const factorReview = buildFactorReviewSummary(input.conversionFactorsUsed ?? [], input.calculationDetails);
  const inventory = buildInventorySummary({
    reportCountSummary: reportTotals.reportCountSummary,
    calculationDetails: input.calculationDetails,
    totalEstimatedEmissionsKgCO2e: input.totalEstimatedEmissionsKgCO2e,
  });
  const readiness = buildReadinessAssessment({
    calculationDetails: input.calculationDetails,
    inventoryBoundary: input.inventoryBoundary,
    sourceReviewSummary: sourceReview,
  });
  const limitations = buildReportLimitations({ sourceReviewSummary: sourceReview });
  const { metadata, documentControl, regulatoryReportingReference } = buildReportMetadata({
    ...input,
    reportCountSummary: reportTotals.reportCountSummary,
  });

  return {
    metadata,
    inventory,
    reportingPeriod: input.reportingPeriod,
    calculationQuality,
    sourceReview,
    scopeBreakdown,
    facilityBreakdown,
    hotspots,
    factorReview,
    readiness,
    limitations,
    regulatoryReportingReference,
    totalsByMetric: reportTotals.totalsByMetric,
    matchedActivityEmissions: input.matchedActivityEmissions,
    sourceEvidenceRows,
    sourceEvidenceCounts: buildSourceEvidenceCounts(sourceEvidenceRows),

    outputGeneratedDate: metadata.outputGeneratedDate,
    organizationName: metadata.organizationName,
    reportPeriod: metadata.reportPeriod,
    reportScopeLabel: metadata.reportScopeLabel,
    documentControl,
    executiveSummary: reportTotals.executiveSummary,
    reportCountSummary: reportTotals.reportCountSummary,
    primarySkippedReasons: reportTotals.primarySkippedReasons,
    hotspotAnalysis: hotspots,
    calculationCoverage: calculationQuality.calculationCoverage,
    coverageCounts: calculationQuality.coverageCounts,
    scopeSummary: scopeBreakdown.totals,
    sourceReviewSummary: sourceReview,
    reportingReadinessAssessment: readiness,
    dataReadinessSummary: calculationQuality.dataReadinessSummary,
    inventoryBoundary: input.inventoryBoundary,
    totalEstimatedEmissionsKgCO2e: input.totalEstimatedEmissionsKgCO2e,
    calculationDetails: input.calculationDetails,
  };
}
