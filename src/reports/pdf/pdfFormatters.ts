import { type DataReadinessSummary, type HotspotAnalysis } from '../../components/MetricsSummarySection';
import { type FormalConversionFactorUsed } from '../../components/FormalReportPreview';
import type { SpreadsheetReviewRowItem } from '../../services/spreadsheetReviewRows';
import { formatEmissionsWithUnit } from '../../utils/numberFormatting';
import { formatScopeClassification, resolveScopeClassification } from '../../utils/scopeClassification';
import { type SiteFacilityBreakdownRow } from '../../utils/siteFacilityBreakdown';
import { type InventoryBoundary } from '../../constants/inventoryBoundary';
import { formatCalculationStatusLabel } from '../../utils/terminology';
import { formatReadinessStatus, type ReportingReadinessAssessment } from '../../utils/reportingReadiness';
import type { ReportDocumentControlMetadata, SourceReviewSummary } from '../domain/reportTypes';

const REPORT_REVIEW_STATUS_NOT_REVIEWED = 'Not reviewed';

export function formatHotspotLevelForPdf(level: HotspotAnalysis['categoryHotspots'][number]['hotspotLevel']) {
  const labels = {
    HIGH: 'High',
    MEDIUM: 'Medium',
    LOW: 'Low',
  };

  return labels[level] ?? level;
}

export function formatExcludedReasonForPdf(reason: HotspotAnalysis['excludedCategories'][number]['reason']) {
  const labels = {
    MISSING_FACTOR: 'Missing factor',
    INVALID_UNIT: 'Invalid unit',
    TRACKED_ONLY: 'Tracked operational metric, excluded from GHG total',
    NEEDS_REVIEW: 'Needs attention',
    MISSING_JURISDICTION: 'Missing jurisdiction',
  };

  return labels[reason] ?? reason;
}

export function buildExecutiveLimitationsSentence(input: {
  factorReviewCount: number;
  sourceReviewSummary: SourceReviewSummary;
}) {
  const limitations = ['Results are pilot estimates.'];

  if (input.factorReviewCount > 0) {
    limitations.push(
      `${input.factorReviewCount} emission ${input.factorReviewCount === 1 ? 'factor needs' : 'factors need'} attention before formal use.`,
    );
  }

  const sourceLimitation = getSourceReviewLimitationSentence(input.sourceReviewSummary);
  if (sourceLimitation) {
    limitations.push(sourceLimitation);
  }

  limitations.push('CarbonLite does not provide regulatory assurance, third-party verification, or carbon credit eligibility determination.');
  return limitations.join(' ');
}

export function getSourceReviewLimitationSentence(summary: SourceReviewSummary) {
  if (summary.availability === 'STRUCTURED_REVIEW_AVAILABLE') {
    if (summary.needsReviewCount > 0) {
      return `${summary.needsReviewCount} source ${summary.needsReviewCount === 1 ? 'row still needs' : 'rows still need'} attention.`;
    }
    return 'No unresolved source-data issues are currently recorded for this report scope.';
  }

  if (summary.availability === 'DOCUMENT_LINEAGE_AVAILABLE') {
    return summary.limitation ||
      'Structured source-data counts are not available for this document import.';
  }

  return summary.limitation || 'Source data validation is not applicable to manually entered records.';
}

export function getPilotStageFactorCount(factors: FormalConversionFactorUsed[]) {
  return factors.filter(isPilotStageFactor).length;
}

export function isPilotStageFactor(factor: FormalConversionFactorUsed) {
  const sourceAuthority = normalizeFactorGovernanceText(factor.sourceAuthority);
  const factorType = normalizeFactorGovernanceText(factor.factorType);
  const governanceText = [
    factor.factorName,
    factor.factorStatus,
    factor.verificationStatus,
    factor.confidence,
    factor.confidenceLevel,
    factor.assumptions,
    factor.notes,
    factor.sourceAuthority,
    factor.sourceDocument,
    factor.factorSet,
  ]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    /\b(pilot|demo|draft|placeholder)\b/i.test(governanceText) ||
    /carbonlite/.test(governanceText) ||
    (sourceAuthority.includes('CARBONLITE') && factorType === 'SYSTEM')
  );
}

export function normalizeFactorGovernanceText(value: unknown) {
  return String(value ?? '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .toUpperCase();
}

export function getReadinessItemStatus(
  assessment: ReportingReadinessAssessment,
  codeFragment: string,
) {
  const normalized = codeFragment.toLowerCase();
  return assessment.items.find((item) => item.code.toLowerCase().includes(normalized))?.status ??
    assessment.overallStatus;
}

export function formatExecutiveSourceReviewStatus(summary: SourceReviewSummary) {
  if (summary.availability === 'DOCUMENT_LINEAGE_AVAILABLE') return 'Document source lineage available';
  if (!summary.available) return 'Not applicable';
  return `${summary.totalRows} rows assessed; ${summary.resolvedCount} resolved/imported; ${summary.needsReviewCount} need attention`;
}

export function buildExecutiveKeyPriorities(input: {
  factorReviewCount: number;
  pilotStageFactorCount: number;
  sourceReviewSummary: SourceReviewSummary;
  readinessAssessment: ReportingReadinessAssessment;
  documentControl: ReportDocumentControlMetadata;
}) {
  const priorities: string[] = [];
  if (input.sourceReviewSummary.available && input.sourceReviewSummary.needsReviewCount > 0) {
    priorities.push(`Resolve the ${input.sourceReviewSummary.needsReviewCount} remaining source-data issue${input.sourceReviewSummary.needsReviewCount === 1 ? '' : 's'}.`);
  }
  if (input.factorReviewCount > 0) {
    priorities.push(formatExecutiveFactorPriority(
      input.factorReviewCount,
      input.pilotStageFactorCount,
    ));
  }
  const boundaryStatus = getReadinessItemStatus(input.readinessAssessment, 'boundary');
  if (boundaryStatus !== 'COMPLETE') {
    priorities.push('Complete the reporting boundary before formal use.');
  }
  if (input.documentControl.reviewStatus !== REPORT_REVIEW_STATUS_NOT_REVIEWED) {
    priorities.push(`Confirm reviewer status for ${input.documentControl.reportVersion}.`);
  } else {
    priorities.push('Assign a reviewer and complete report review before formal use.');
  }
  if (priorities.length === 0) {
    priorities.push('Maintain source, factor, and calculation evidence with the technical emissions report.');
  }
  return priorities;
}

export function formatExecutiveFactorPriority(factorReviewCount: number, pilotStageFactorCount: number) {
  if (pilotStageFactorCount > 0 && pilotStageFactorCount === factorReviewCount) {
    return factorReviewCount === 1
      ? 'Validate or replace the pilot-stage emission factor.'
      : `Validate or replace ${factorReviewCount} pilot-stage emission factors.`;
  }

  const reviewPhrase = factorReviewCount === 1
    ? 'Validate the emission factor before formal use'
    : factorReviewCount === 2
    ? 'Validate both emission factors before formal use'
    : `Validate ${factorReviewCount} emission factors before formal use`;

  return pilotStageFactorCount > 0
    ? `${reviewPhrase}; replace pilot-stage factors where appropriate.`
    : `${reviewPhrase}.`;
}

export function getScopeDescription(scope: string) {
  if (scope === 'Scope 1') return 'Direct fuel emissions';
  if (scope === 'Scope 2') return 'Purchased electricity';
  if (scope === 'Scope 3') return 'Selected Scope 3 pilot estimates';
  return 'Unclassified';
}

export function formatOptionalDataCompletenessDetail(summary: DataReadinessSummary) {
  const { costDataCount, totalRecords } = summary.optionalDataCompleteness;
  return `${costDataCount} of ${totalRecords} imported activity records include optional cost data`;
}

export function buildReadinessPdfRows(assessment: ReportingReadinessAssessment) {
  return assessment.items.map((item) => [
    `${item.workflowStageLabel}: ${item.label}`,
    formatReadinessStatus(item.status),
    [item.evidence, item.action].filter(Boolean).join(' Action: '),
  ]);
}

export function formatSourceReviewFiles(summary: SourceReviewSummary) {
  if (summary.availability === 'DOCUMENT_LINEAGE_AVAILABLE') {
    return summary.sourceFiles.length ? summary.sourceFiles.join(', ') : 'Document source file available';
  }
  if (!summary.available) return 'Not applicable';
  return summary.sourceFiles.length ? summary.sourceFiles.join(', ') : 'Source file not specified';
}

export function formatSourceReviewCount(summary: SourceReviewSummary, value: number) {
  if (summary.availability === 'DOCUMENT_LINEAGE_AVAILABLE') return 'Limited';
  if (!summary.available) return 'Not applicable';
  return value;
}

export function getSourceReviewAppendixEmptyMessage(summary: SourceReviewSummary) {
  if (summary.availability === 'DOCUMENT_LINEAGE_AVAILABLE') {
    return 'Document source lineage is available, but structured source-data rows are not available for this document import.';
  }
  return 'Source data validation is not applicable to manually entered records.';
}

export function getSourceReviewAppendixIntro(summary: SourceReviewSummary) {
  if (summary.availability === 'DOCUMENT_LINEAGE_AVAILABLE') {
    return 'Structured unresolved source-data rows are not available for this document import.';
  }
  if (!summary.available) {
    return 'Source data items that remain unresolved are not included in ActivityData or the GHG emissions total until corrected and imported.';
  }
  return 'Source data rows that remain unresolved after import validation are not included in ActivityData or the GHG emissions total until corrected and imported.';
}

export function getSourceReviewSectionNote(summary: SourceReviewSummary) {
  if (summary.availability === 'DOCUMENT_LINEAGE_AVAILABLE') {
    return 'Source document lineage is available for imported records. Structured unresolved-source-row counts are not available for this document import.';
  }
  if (!summary.available) {
    return 'Source data validation is not applicable when this report scope contains manually entered records with no associated source document.';
  }
  return 'Source data status is linked by source document ID. Unresolved source rows remain in spreadsheet review history and are not imported into ActivityData or included in emissions totals.';
}

export function formatSourceReviewStatus(summary: SourceReviewSummary) {
  if (summary.availability === 'DOCUMENT_LINEAGE_AVAILABLE') {
    return 'Document source lineage available; structured validation counts limited';
  }
  if (!summary.available) return 'Not applicable for manual-only report scope';
  return `${summary.resolvedCount} of ${summary.totalRows} source rows resolved/imported · ${summary.needsReviewCount} need attention`;
}

export function formatSourceReviewIssue(row: SpreadsheetReviewRowItem) {
  const issues = row.issues ?? [];
  if (issues.length > 0) {
    return issues.map((issue) => issue.message || issue.code).filter(Boolean).join('; ');
  }

  return row.calculationMessage || row.status || 'Needs attention';
}

export function formatSourceReviewIssueType(row: SpreadsheetReviewRowItem) {
  const issue = row.issues?.[0];
  return formatCalculationStatusLabel(
    issue?.code || row.calculationStatus || row.matchingStatus || row.status || 'NEEDS_REVIEW',
  ) || 'Needs Attention';
}

export function formatReviewRowJurisdiction(row: SpreadsheetReviewRowItem) {
  const parts = [row.jurisdictionRegion, row.jurisdictionCountry]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean);
  return parts.length ? parts.join(', ') : 'Not specified';
}

export function formatSourceReviewAction(row: SpreadsheetReviewRowItem) {
  const issueType = formatSourceReviewIssueType(row).toUpperCase();

  if (issueType.includes('PROVINCE') || issueType.includes('JURISDICTION')) {
    return 'Add the missing province/jurisdiction and re-import or update the row.';
  }
  if (issueType.includes('UNIT')) {
    return 'Correct the unit to a supported factor unit and rerun validation.';
  }
  if (issueType.includes('QUANTITY')) {
    return 'Enter a numeric quantity and rerun validation.';
  }
  if (issueType.includes('ACTIVITY')) {
    return 'Map the raw activity to a supported activity type.';
  }
  if (issueType.includes('FACTOR')) {
    return 'Add or select a matching emissions factor before including in GHG totals.';
  }

  return 'Correct this source row before importing it into the report scope.';
}

export function formatSourceEvidenceMethod(sourceType?: string | null, importMethod?: string | null) {
  const source = String(sourceType ?? '').trim();
  const method = String(importMethod ?? '').trim();

  if (!source) return method || 'Not specified';
  if (!method || source.toLowerCase() === method.toLowerCase()) return source;
  return `${source} / ${method}`;
}

export function formatSiteFacilityActivityBreakdown(row: SiteFacilityBreakdownRow) {
  if (row.activityBreakdown.length === 0) return 'No activity breakdown available';

  return row.activityBreakdown
    .map(
      (item) =>
        `${item.activityType}: ${formatEmissionsWithUnit(item.totalKgCO2e)} (${item.includedRecords} ${item.includedRecords === 1 ? 'record' : 'records'})`,
    )
    .join('; ');
}

export function formatThresholdTonnes(value: number) {
  return formatThresholdNumber(value, value >= 100 ? 0 : 1);
}

export function formatThresholdNumber(value: number, maximumFractionDigits: number) {
  if (!Number.isFinite(value)) return '-';

  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  });
}

export function formatBoundaryValue(value?: string | null) {
  const trimmed = String(value ?? '').trim();
  return trimmed || 'Not specified';
}

export function formatBoundaryReviewStatus(boundary: Pick<InventoryBoundary, 'boundaryStatus'>) {
  switch (boundary.boundaryStatus) {
    case 'REVIEWED':
      return 'Reviewed';
    case 'NOT_DEFINED':
      return 'Not Defined';
    case 'DRAFT':
    default:
      return 'Draft';
  }
}

export function formatBoundaryReviewedAt(value?: string | null) {
  if (!value) return 'Not reviewed';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not reviewed';
  return date.toLocaleString();
}

export function classifyScope(activityType?: string) {
  return formatScopeClassification(resolveScopeClassification({ activityType }).scope);
}
