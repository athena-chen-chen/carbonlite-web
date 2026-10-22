import type { CalculationAuditDetail } from '../services/metrics';
import type { InventoryBoundary } from '../constants/inventoryBoundary';
import { getInventoryBoundaryStatus } from '../constants/inventoryBoundary';
import type { CarbonLiteWorkflowStageId } from '../constants/carbonliteWorkflow';
import { getWorkflowStage } from '../constants/carbonliteWorkflow';
import {
  getCalculationCoverageCounts,
  isTrackedMetricDetail,
} from './reportCredibility';

export type ReportingReadinessStatus =
  | 'COMPLETE'
  | 'LIMITED'
  | 'NEEDS_ATTENTION'
  | 'NOT_APPLICABLE'
  | 'NOT_REVIEWED';

export type ReportingReadinessItemCode =
  | 'BOUNDARY_DEFINED'
  | 'SOURCE_REVIEW_COMPLETE'
  | 'SOURCE_ISSUES_RESOLVED'
  | 'REQUIRED_DATA_COMPLETE'
  | 'FACTORS_SELECTED'
  | 'FACTORS_REVIEWED'
  | 'CALCULATIONS_COMPLETE'
  | 'TRACEABILITY_COMPLETE'
  | 'REVIEWER_APPROVAL';

export type ReportingReadinessItem = {
  code: ReportingReadinessItemCode;
  label: string;
  workflowStageId: CarbonLiteWorkflowStageId;
  workflowStageLabel: string;
  status: ReportingReadinessStatus;
  evidence: string;
  action?: string;
  critical?: boolean;
};

export type SourceReviewReadinessSummary = {
  available: boolean;
  availability?: 'STRUCTURED_REVIEW_AVAILABLE' | 'DOCUMENT_LINEAGE_AVAILABLE' | 'NO_SOURCE_REVIEW';
  sourceType?: 'SPREADSHEET' | 'DOCUMENT' | 'MANUAL' | 'MIXED' | 'UNKNOWN';
  status?: 'COMPLETE' | 'LIMITED' | 'NOT_APPLICABLE' | 'NEEDS_ATTENTION';
  evidence?: string;
  limitation?: string | null;
  sourceDocumentCount?: number;
  importedCount?: number;
  sourceFiles?: string[];
  totalRows: number;
  readyCount?: number;
  trackedOnlyCount?: number;
  resolvedCount: number;
  needsReviewCount: number;
  needsReviewRows?: unknown[];
};

export type ReportingReadinessAssessment = {
  overallStatus: Exclude<ReportingReadinessStatus, 'COMPLETE'> | 'READY';
  items: ReportingReadinessItem[];
};

export type ReviewerApprovalInput = {
  approved?: boolean;
  reviewerName?: string | null;
  reviewedAt?: string | null;
};

export function buildReportingReadinessAssessment(input: {
  calculationDetails: CalculationAuditDetail[];
  inventoryBoundary?: InventoryBoundary | null;
  sourceReviewSummary?: SourceReviewReadinessSummary | null;
  reviewerApproval?: ReviewerApprovalInput | null;
}): ReportingReadinessAssessment {
  const items: ReportingReadinessItem[] = [
    buildBoundaryItem(input.inventoryBoundary),
    buildSourceDataReviewedItem(input.sourceReviewSummary),
    buildSourceIssuesResolvedItem(input.sourceReviewSummary),
    buildRequiredDataItem(input.calculationDetails),
    buildFactorsSelectedItem(input.calculationDetails),
    buildFactorsReviewedItem(input.calculationDetails),
    buildCalculationsCompleteItem(input.calculationDetails),
    buildTraceabilityItem(input.calculationDetails),
    buildReviewerApprovalItem(input.reviewerApproval),
  ];

  return {
    overallStatus: getOverallReadinessStatus(items),
    items,
  };
}

export function formatReadinessStatus(status: ReportingReadinessStatus | ReportingReadinessAssessment['overallStatus']) {
  const labels: Record<string, string> = {
    READY: 'Ready for Report Review',
    COMPLETE: 'Complete',
    LIMITED: 'Limited',
    NEEDS_ATTENTION: 'Needs attention',
    NOT_APPLICABLE: 'Not applicable',
    NOT_REVIEWED: 'Not reviewed',
  };

  return labels[status] ?? status;
}

function buildBoundaryItem(boundary?: InventoryBoundary | null): ReportingReadinessItem {
  if (!boundary) {
    return withWorkflowStage('BOUNDARY', {
      code: 'BOUNDARY_DEFINED',
      label: 'Reporting boundary defined',
      status: 'NEEDS_ATTENTION',
      evidence: 'Reporting boundary is not fully specified.',
      action: 'Define included facilities, scopes, and exclusions.',
      critical: true,
    });
  }

  const complete = getInventoryBoundaryStatus(boundary) === 'Complete';
  if (complete && boundary.boundaryStatus !== 'REVIEWED') {
    return withWorkflowStage('BOUNDARY', {
      code: 'BOUNDARY_DEFINED',
      label: 'Reporting boundary reviewed',
      status: 'NEEDS_ATTENTION',
      evidence: 'Reporting boundary fields are complete, but boundary review has not been recorded.',
      action: 'Review boundary in Organization & Boundary.',
      critical: true,
    });
  }

  return withWorkflowStage('BOUNDARY', {
    code: 'BOUNDARY_DEFINED',
    label: complete ? 'Reporting boundary reviewed' : 'Reporting boundary defined',
    status: complete ? 'COMPLETE' : 'NEEDS_ATTENTION',
    evidence: complete
      ? `Reporting boundary v${boundary.boundaryVersion ?? 1} reviewed by ${boundary.boundaryReviewedBy || 'an authorized reviewer'}.`
      : 'Reporting boundary is not fully specified.',
    action: complete ? undefined : 'Define included facilities, scopes, and exclusions.',
    critical: true,
  });
}

function buildSourceDataReviewedItem(summary?: SourceReviewReadinessSummary | null): ReportingReadinessItem {
  if (summary?.availability === 'DOCUMENT_LINEAGE_AVAILABLE') {
    return withWorkflowStage('SOURCE_DATA', {
      code: 'SOURCE_REVIEW_COMPLETE',
      label: 'Source data assessed',
      status: 'LIMITED',
      evidence: summary.evidence ||
        `Source document lineage is available for ${summary.importedCount ?? 0} imported ${summary.importedCount === 1 ? 'record' : 'records'}.`,
      critical: false,
    });
  }

  if (!summary?.available) {
    return withWorkflowStage('SOURCE_DATA', {
      code: 'SOURCE_REVIEW_COMPLETE',
      label: 'Source data assessed',
      status: 'NOT_APPLICABLE',
      evidence: summary?.evidence || 'No source document is associated with this report scope.',
      critical: false,
    });
  }

  return withWorkflowStage('SOURCE_DATA', {
    code: 'SOURCE_REVIEW_COMPLETE',
    label: 'Structured source rows assessed',
    status: 'COMPLETE',
    evidence: `${summary.totalRows} structured source ${summary.totalRows === 1 ? 'row was' : 'rows were'} assessed.`,
    critical: false,
  });
}

function buildSourceIssuesResolvedItem(summary?: SourceReviewReadinessSummary | null): ReportingReadinessItem {
  if (summary?.availability === 'DOCUMENT_LINEAGE_AVAILABLE') {
    return withWorkflowStage('DATA_ISSUES', {
      code: 'SOURCE_ISSUES_RESOLVED',
      label: 'Source issues resolved',
      status: 'LIMITED',
      evidence: summary.limitation ||
        'Structured unresolved-source-row counts are not available for this document import.',
      critical: false,
    });
  }

  if (!summary?.available) {
    return withWorkflowStage('DATA_ISSUES', {
      code: 'SOURCE_ISSUES_RESOLVED',
      label: 'Source issues resolved',
      status: 'NOT_APPLICABLE',
      evidence: summary?.limitation || 'Source data validation is not applicable to manually entered records.',
      critical: false,
    });
  }

  const complete = summary.needsReviewCount === 0;
  return withWorkflowStage('DATA_ISSUES', {
    code: 'SOURCE_ISSUES_RESOLVED',
    label: 'Source issues resolved',
    status: complete ? 'COMPLETE' : 'NEEDS_ATTENTION',
    evidence: complete
      ? `${summary.resolvedCount} of ${summary.totalRows} source ${summary.totalRows === 1 ? 'row is' : 'rows are'} resolved/imported.`
      : `${summary.resolvedCount} of ${summary.totalRows} source ${summary.totalRows === 1 ? 'row is' : 'rows are'} resolved/imported; ${summary.needsReviewCount} still need attention.`,
    action: complete ? undefined : `Resolve ${summary.needsReviewCount} ${summary.needsReviewCount === 1 ? 'row' : 'rows'} in Input Review.`,
    critical: true,
  });
}

function buildRequiredDataItem(calculationDetails: CalculationAuditDetail[]): ReportingReadinessItem {
  const importedCount = calculationDetails.length;
  if (importedCount === 0) {
    return withWorkflowStage('DATA_ISSUES', {
      code: 'REQUIRED_DATA_COMPLETE',
      label: 'Required activity data complete',
      status: 'NOT_APPLICABLE',
      evidence: 'No imported activity records are in this report scope.',
      critical: true,
    });
  }

  const completeCount = calculationDetails.filter(hasRequiredActivityDataForTreatment).length;
  const complete = completeCount === importedCount;
  return withWorkflowStage('DATA_ISSUES', {
    code: 'REQUIRED_DATA_COMPLETE',
    label: 'Required activity data complete',
    status: complete ? 'COMPLETE' : 'NEEDS_ATTENTION',
    evidence: complete
      ? `Required fields are present for all ${importedCount} imported ${importedCount === 1 ? 'record' : 'records'}.`
      : `${completeCount} of ${importedCount} imported ${importedCount === 1 ? 'record has' : 'records have'} required fields for their intended treatment.`,
    action: complete ? undefined : 'Complete missing activity type, date, quantity, unit, and required jurisdiction fields.',
    critical: true,
  });
}

function buildFactorsSelectedItem(calculationDetails: CalculationAuditDetail[]): ReportingReadinessItem {
  const eligibleDetails = getEligibleEmissionBearingDetails(calculationDetails);
  if (eligibleDetails.length === 0) {
    return withWorkflowStage('FACTORS_CALCULATIONS', {
      code: 'FACTORS_SELECTED',
      label: 'Emission factors selected',
      status: 'NOT_APPLICABLE',
      evidence: 'No eligible emissions-bearing records are in this report scope.',
      critical: true,
    });
  }

  const selectedCount = eligibleDetails.filter(hasSelectedFactor).length;
  const complete = selectedCount === eligibleDetails.length;
  return withWorkflowStage('FACTORS_CALCULATIONS', {
    code: 'FACTORS_SELECTED',
    label: 'Emission factors selected',
    status: complete ? 'COMPLETE' : 'NEEDS_ATTENTION',
    evidence: `${selectedCount} of ${eligibleDetails.length} eligible emissions ${eligibleDetails.length === 1 ? 'record has a matched emission factor' : 'records have matched emission factors'}.`,
    action: complete ? undefined : `Select factors for ${eligibleDetails.length - selectedCount} eligible emissions ${eligibleDetails.length - selectedCount === 1 ? 'record' : 'records'}.`,
    critical: true,
  });
}

function buildFactorsReviewedItem(calculationDetails: CalculationAuditDetail[]): ReportingReadinessItem {
  const usedFactors = getCalculatedEmissionDetails(calculationDetails);
  if (usedFactors.length === 0) {
    return withWorkflowStage('FACTORS_CALCULATIONS', {
      code: 'FACTORS_REVIEWED',
      label: 'Emission factor validation',
      status: 'NOT_APPLICABLE',
      evidence: 'No emission factors are used in calculated records.',
      critical: true,
    });
  }

  const requiringReview = usedFactors.filter(factorRequiresReview);
  return withWorkflowStage('FACTORS_CALCULATIONS', {
    code: 'FACTORS_REVIEWED',
    label: 'Emission factor validation',
    status: requiringReview.length === 0 ? 'COMPLETE' : 'NEEDS_ATTENTION',
    evidence: requiringReview.length === 0
      ? `All ${usedFactors.length} record-level factor usages have reviewed or verified status.`
      : `${usedFactors.length} calculated ${usedFactors.length === 1 ? 'record uses an emission factor' : 'records use emission factors'}; ${requiringReview.length} record-level factor ${requiringReview.length === 1 ? 'usage needs' : 'usages need'} attention before formal use.`,
    action: requiringReview.length === 0
      ? undefined
      : 'Validate all factors and replace pilot-stage factors where appropriate.',
    critical: true,
  });
}

function buildCalculationsCompleteItem(calculationDetails: CalculationAuditDetail[]): ReportingReadinessItem {
  const coverage = getCalculationCoverageCounts(calculationDetails);
  if (coverage.eligibleEmissionBearingRecords === 0) {
    return withWorkflowStage('FACTORS_CALCULATIONS', {
      code: 'CALCULATIONS_COMPLETE',
      label: 'Calculations complete',
      status: 'NOT_APPLICABLE',
      evidence: 'No eligible emissions-bearing records are in this report scope.',
      critical: true,
    });
  }

  const complete = coverage.calculatedRecords === coverage.eligibleEmissionBearingRecords;
  return withWorkflowStage('FACTORS_CALCULATIONS', {
    code: 'CALCULATIONS_COMPLETE',
    label: 'Calculations complete',
    status: complete ? 'COMPLETE' : 'NEEDS_ATTENTION',
    evidence: `${coverage.calculatedRecords} of ${coverage.eligibleEmissionBearingRecords} eligible emissions ${coverage.eligibleEmissionBearingRecords === 1 ? 'record is' : 'records are'} calculated.`,
    action: complete
      ? undefined
      : `Resolve ${coverage.eligibleEmissionBearingRecords - coverage.calculatedRecords} uncalculated eligible emissions ${coverage.eligibleEmissionBearingRecords - coverage.calculatedRecords === 1 ? 'record' : 'records'}.`,
    critical: true,
  });
}

function buildTraceabilityItem(calculationDetails: CalculationAuditDetail[]): ReportingReadinessItem {
  const calculatedDetails = getCalculatedEmissionDetails(calculationDetails);
  if (calculatedDetails.length === 0) {
    return withWorkflowStage('RESULTS', {
      code: 'TRACEABILITY_COMPLETE',
      label: 'Calculation traceability complete',
      status: 'NOT_APPLICABLE',
      evidence: 'No calculated emissions records are available for traceability validation.',
      critical: true,
    });
  }

  const incomplete = calculatedDetails.filter((detail) => !hasCalculationTraceability(detail));
  return withWorkflowStage('RESULTS', {
    code: 'TRACEABILITY_COMPLETE',
    label: 'Calculation traceability complete',
    status: incomplete.length === 0 ? 'COMPLETE' : 'NEEDS_ATTENTION',
    evidence: incomplete.length === 0
      ? calculatedDetails.length === 1
        ? 'Required source, factor, and result lineage is present for the calculated emissions record.'
        : `Required source, factor, and result lineage is present for all ${calculatedDetails.length} calculated emissions records.`
      : `${calculatedDetails.length - incomplete.length} of ${calculatedDetails.length} calculated emissions ${calculatedDetails.length === 1 ? 'record has' : 'records have'} required source, factor, and result lineage.`,
    action: incomplete.length === 0
      ? undefined
      : `Add missing lineage: ${incomplete.map((detail) => `${detail.activityDataId}: ${getCalculationTraceabilityGaps(detail).join(', ')}`).join('; ')}.`,
    critical: true,
  });
}

function buildReviewerApprovalItem(approval?: ReviewerApprovalInput | null): ReportingReadinessItem {
  if (approval?.approved) {
    const reviewer = approval.reviewerName?.trim();
    return withWorkflowStage('REPORT', {
      code: 'REVIEWER_APPROVAL',
      label: 'Reviewer approval',
      status: 'COMPLETE',
      evidence: reviewer
        ? `Reviewer approval has been recorded by ${reviewer}.`
        : 'Reviewer approval has been recorded.',
      critical: false,
    });
  }

  return withWorkflowStage('REPORT', {
    code: 'REVIEWER_APPROVAL',
    label: 'Reviewer approval',
    status: 'NOT_REVIEWED',
    evidence: 'No reviewer approval has been recorded.',
    action: 'Assign a reviewer when the report is ready for formal review.',
    critical: false,
  });
}

function withWorkflowStage(
  workflowStageId: CarbonLiteWorkflowStageId,
  item: Omit<ReportingReadinessItem, 'workflowStageId' | 'workflowStageLabel'>,
): ReportingReadinessItem {
  const stage = getWorkflowStage(workflowStageId);
  return {
    ...item,
    workflowStageId,
    workflowStageLabel: `Stage ${stage.step}: ${stage.title}`,
  };
}

function getOverallReadinessStatus(items: ReportingReadinessItem[]): ReportingReadinessAssessment['overallStatus'] {
  const criticalItems = items.filter((item) => item.critical !== false);

  if (criticalItems.some((item) => item.status === 'NEEDS_ATTENTION')) return 'NEEDS_ATTENTION';
  if (criticalItems.some((item) => item.status === 'NOT_REVIEWED')) return 'NOT_REVIEWED';
  if (criticalItems.length > 0 && criticalItems.every((item) => item.status === 'NOT_APPLICABLE')) {
    return 'NOT_APPLICABLE';
  }

  return 'READY';
}

function getEligibleEmissionBearingDetails(calculationDetails: CalculationAuditDetail[]) {
  return calculationDetails.filter(
    (detail) => detail.status !== 'OUTSIDE_SCOPE' && !isTrackedMetricDetail(detail),
  );
}

function getCalculatedEmissionDetails(calculationDetails: CalculationAuditDetail[]) {
  return getEligibleEmissionBearingDetails(calculationDetails).filter(
    (detail) => detail.status === 'CALCULATED',
  );
}

function hasRequiredActivityDataForTreatment(detail: CalculationAuditDetail) {
  const quantity = Number(detail.activityQuantity);
  if (!detail.activityType || !detail.recordDate || !detail.activityUnit) return false;
  if (!Number.isFinite(quantity) || quantity <= 0) return false;
  if (isTrackedMetricDetail(detail)) return true;
  if (detail.activityType === 'ELECTRICITY' && !detail.jurisdictionRegion) return false;
  return true;
}

function hasSelectedFactor(detail: CalculationAuditDetail) {
  return Boolean(
    detail.status === 'CALCULATED' &&
      (detail.factorId ||
        detail.factorVersionId ||
        detail.factorName ||
        Number.isFinite(Number(detail.factorValue))),
  );
}

function factorRequiresReview(detail: CalculationAuditDetail) {
  const verification = normalizeGovernanceText(detail.factorVerificationStatus || detail.factorStatus);
  const confidence = normalizeGovernanceText(detail.factorConfidenceLevel);
  const factorType = normalizeGovernanceText(detail.factorType);
  const sourceAuthority = normalizeGovernanceText(detail.sourceAuthority || detail.factorSource);
  const assumptions = normalizeGovernanceText(detail.factorAssumptions || detail.factorNotes || detail.notes);

  if (detail.factorVerified && ['VERIFIED', 'OFFICIAL_SOURCE', 'OFFICIAL'].includes(verification)) return false;
  if (verification.includes('INTERNAL_REVIEW') || verification.includes('PILOT') || verification.includes('DRAFT')) return true;
  if (confidence.includes('PILOT') || confidence.includes('PLACEHOLDER') || confidence === 'LOW') return true;
  if (assumptions.includes('PILOT') || assumptions.includes('REVIEW_RECOMMENDED')) return true;
  if (sourceAuthority === 'CARBONLITE' && factorType === 'SYSTEM') return true;

  return !detail.factorVerified && !['REVIEWED', 'VERIFIED', 'OFFICIAL_SOURCE', 'OFFICIAL'].includes(verification);
}

export function getCalculationTraceabilityGaps(detail: CalculationAuditDetail): string[] {
  const gaps: string[] = [];
  const sourceType = String(detail.sourceType ?? '').trim().toUpperCase();
  if (sourceType === 'MANUAL') {
    const origin = detail.manualSourceProvenance;
    if (!origin?.auditId || origin.activityDataId !== detail.activityDataId) gaps.push('manual creation audit');
    if (!origin?.actorId) gaps.push('manual creation actor');
    if (!origin?.createdAt || !Number.isFinite(Date.parse(origin.createdAt))) gaps.push('manual creation timestamp');
    if (!origin?.activityType || !origin.unit || !origin.recordDate ||
        !Number.isFinite(Date.parse(origin.recordDate)) || !Number.isFinite(origin.quantity) || origin.quantity <= 0) {
      gaps.push('original manual activity values');
    }
  } else if (!detail.sourceDocumentId && !detail.sourceFileName) {
    gaps.push('source document identity');
  }
  if (!detail.activityDataId || !detail.activityType || !detail.recordDate || !detail.activityUnit ||
      !Number.isFinite(Number(detail.activityQuantity)) || Number(detail.activityQuantity) <= 0) gaps.push('activity values');
  if (!detail.factorId && !detail.factorVersionId && !detail.factorName) gaps.push('factor identity');
  if (detail.factorValue === null || detail.factorValue === undefined || !Number.isFinite(Number(detail.factorValue)) ||
      !(detail.factorVersion || detail.sourceAuthority || detail.sourceDocument || detail.sourceYear)) gaps.push('factor snapshot');
  const result = detail.calculatedEmissionsKgCO2e ?? detail.calculatedEmission;
  if (result === null || result === undefined || !Number.isFinite(Number(result))) gaps.push('calculation result');
  return gaps;
}

function hasCalculationTraceability(detail: CalculationAuditDetail) {
  return getCalculationTraceabilityGaps(detail).length === 0;
}

function normalizeGovernanceText(value?: string | null) {
  return String(value ?? '').trim().replace(/[\s-]+/g, '_').toUpperCase();
}
