import type { ReportLimitations, SourceReviewSummary } from './reportTypes';

export function buildReportLimitations(input: {
  sourceReviewSummary: SourceReviewSummary;
}): ReportLimitations {
  return {
    sourceReviewLimitation: input.sourceReviewSummary.limitation ?? null,
  };
}
