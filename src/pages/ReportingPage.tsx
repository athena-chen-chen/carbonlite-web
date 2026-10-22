import { DocumentScopeContext } from '../components/DocumentScopeContext';
import { PageHeader } from '../components/PageHeader';
import {
  DEFAULT_REPORT_OPTIONS,
  formatRegulatoryThresholdReference,
  formatCarbonCreditReadinessLevel,
  getCalculationScopeResolution,
  REGULATORY_REPORTING_REFERENCE_TITLE,
  REGULATORY_REPORTING_REFERENCE_TEXT,
} from '../reports/presentation/reportPresentationFormatters';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { buildCarbonCreditReadinessAssessment, CARBON_CREDIT_READINESS_DISCLAIMER } from '../components/MetricsSummarySection';
import {
  FORMAL_REPORT_DISCLAIMER,
  FormalReportPreview,
  formatSourceType,
  formatReportUnit,
  formatReviewReasons,
} from '../components/FormalReportPreview';
import { CollapsibleSection } from '../components/common/CollapsibleSection';
import { CollapsibleReportSection } from '../components/reports/CollapsibleReportSection';
import { ReportScopeSection } from '../components/reports/sections/ReportScopeSection';
import { PilotReviewerFeedbackPrompt } from '../components/PilotReviewerFeedbackPrompt';
import { canEditWorkspace, isPilotReviewer } from '../utils/permissions';

import { getWorkflowActivityEvents, trackActivityEvent, type ActivityEventItem } from '../services/activityEvents';
import { track } from '../services/analytics.service';

import { formatEmissionsWithUnit } from '../utils/numberFormatting';

import { getActivityTypeLabel } from '../utils/activityType';

import { getDisplaySourceLabel } from '../utils/reportCredibility';
import { buildFacilityThresholdReferenceRows, type FacilityRegulatoryThresholdReference } from '../utils/siteFacilityBreakdown';
import { buildEvidenceChainFromCalculationDetail, buildEvidenceChainSummaryRows } from '../utils/businessAuditTrail';

import { useSlowLoading } from '../hooks/useSlowLoading';

import {
  ActivityRecordsSection,
  AuditEvidenceChainSection,
  CalculationQualitySection,
  CarbonCreditReadinessSection,
  FacilityBreakdownSection,
  FacilityThresholdReferenceSection,
  InventoryBoundaryPanel,
  RegulatoryReportingReferenceSection,
  ReportActions,
  ReportEmptyState,
  ReportSectionControls,
  ScopeBreakdownSection,
  SourceDatasetReviewSection,
  type ReportActivityRecordRow,
} from '../reports/components/ReportPresentationSections';
import { useReportData, type ReportRouteState } from '../reports/hooks/useReportData';
import { useReportExports } from '../reports/hooks/useReportExports';
const REPORT_SECTION_DEFAULTS = {
  reportScope: true,
  executiveSummary: true,
  emissionsHotspots: false,
  scopeBreakdown: true,
  siteFacilityBreakdown: false,
  facilityThresholdReference: false,
  calculationQuality: true,
  calculationSummary: false,
  activityBreakdown: false,
  emissionFactorsUsed: false,
  calculationTraceability: false,
  sourceEvidence: false,
  auditEvidenceChain: false,
  recordsRequiringReview: false,
  dataQualityNotes: true,
  carbonCreditReadiness: false,
  regulatoryReportingReference: false,
  methodologyDisclaimer: true,
  activityRecords: false,
} as const;

type ReportSectionId = keyof typeof REPORT_SECTION_DEFAULTS;

const REGULATORY_REPORTING_REFERENCE_SUMMARY =
  'Reference only · Not an official filing or compliance determination';

const REVIEWED_REGULATORY_THRESHOLD_REFERENCES: FacilityRegulatoryThresholdReference[] = [];

export default function ReportingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location.state as ReportRouteState;
  const {
    currentUser,
    organizationName,
    summary,
    activities,
    matchedActivityEmissions,
    conversionFactorsUsed,
    calculationDetails,
    usageTotals,
    totalEstimatedEmissionsKgCO2e,
    countSummary,
    report: reportData,
    loading,
    error,
    isPreparingReportData,
    isExportReady,
    refetch: loadReportData,
    draftPeriodStart,
    draftPeriodEnd,
    reportScope,
    setReportScope,
    selectedRecordIds,
    selectedDocumentIds,
    reportScopeLabel,
    reportPeriod,
    inventoryBoundary,
    inventoryBoundarySummary,
    handleStartDateChange,
    handleEndDateChange,
    commitDateRange,
    handleFullYear,
  } = useReportData({
    routeState,
    page: location.pathname,
    url: typeof window !== 'undefined' ? window.location.href : '',
    regulatoryThresholdReferences: REVIEWED_REGULATORY_THRESHOLD_REFERENCES,
  });
  const isPilotReviewerAccount = isPilotReviewer(currentUser);
  const canEditOrganizationBoundary = canEditWorkspace(currentUser);
  const canViewWorkflowHistory = !isPilotReviewerAccount;
  const [workflowEvents, setWorkflowEvents] = useState<ActivityEventItem[]>([]);
  const [workflowEventsError, setWorkflowEventsError] = useState<string | null>(null);
  const [workflowEventsLoading, setWorkflowEventsLoading] = useState(false);
  const [isWorkflowAuditOpen, setIsWorkflowAuditOpen] = useState(false);
  const [isInventoryBoundaryExpanded, setIsInventoryBoundaryExpanded] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [expandedSections, setExpandedSections] =
    useState<Record<ReportSectionId, boolean>>(REPORT_SECTION_DEFAULTS);
  const [previewExpansionRequest, setPreviewExpansionRequest] = useState({
    token: 0,
    expanded: false,
  });
  const isSlowPreparingReport = useSlowLoading(isPreparingReportData);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const exportMenuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const trackedReportViewRef = useRef(false);
  async function loadWorkflowEvents() {
    if (!canViewWorkflowHistory) {
      setWorkflowEvents([]);
      setWorkflowEventsLoading(false);
      return;
    }

    setWorkflowEventsLoading(true);
    setWorkflowEventsError(null);

    try {
      const response = await getWorkflowActivityEvents({ pageSize: 20 });
      setWorkflowEvents(response.items ?? []);
    } catch {
      setWorkflowEventsError('Unable to load workflow history. Please refresh to try again.');
    } finally {
      setWorkflowEventsLoading(false);
    }
  }

  useEffect(() => {
    if (canViewWorkflowHistory) {
      void loadWorkflowEvents();
    }
  }, [canViewWorkflowHistory]);

  useEffect(() => {
    if (trackedReportViewRef.current) return;
    trackedReportViewRef.current = true;

    void trackActivityEvent({
      eventName: 'REPORT_VIEWED',
      page: location.pathname,
      url: window.location.href,
      entityType: 'Report',
      metadata: {
        reportScope,
        selectedRecordCount: selectedRecordIds.length,
        selectedDocumentCount: selectedDocumentIds.length,
      },
    }).catch(() => {
      // Usage tracking should never block report viewing.
    });
    track('REPORT_VIEWED', {
      reportType: 'emissions',
      reportScope,
    });
  }, [location.pathname, reportScope, selectedDocumentIds.length, selectedRecordIds.length]);

  useEffect(() => {
    if (!isExportMenuOpen) return;

    function handleDocumentClick(event: MouseEvent) {
      const target = event.target as Node | null;
      if (target && exportMenuRef.current?.contains(target)) return;
      setIsExportMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsExportMenuOpen(false);
        exportMenuTriggerRef.current?.focus();
      }
    }

    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExportMenuOpen]);

const generatedAt = new Date().toLocaleString();
const scopeSummary = reportData.scopeSummary;
const siteFacilityRollup = reportData.facilityBreakdown;
const siteFacilityBreakdownRows = siteFacilityRollup.rows;
const dataReadinessSummary = reportData.dataReadinessSummary;
const sourceReviewSummary = reportData.sourceReviewSummary;
const reportingCoverageCounts = reportData.coverageCounts;
const reportingCalculationCoverage = reportData.calculationCoverage;
const reportingReadinessAssessment = reportData.reportingReadinessAssessment;
const reportCountSummary = reportData.reportCountSummary;
const currentReportDocumentControl = reportData.documentControl;
const regulatoryReportingReference = reportData.regulatoryReportingReference;
const primarySkippedReasons = reportData.primarySkippedReasons;

const activityRecordRows = useMemo<ReportActivityRecordRow[]>(() => {
  return activities.map((item) => ({
    id: item.id,
    recordDate: item.recordDate,
    activityType: getActivityTypeLabel(item.activityType),
    quantity: item.quantity,
    unit: formatReportUnit(item.unit),
    source: formatSourceType(item.sourceType, item.sourceFileName, item.sourceReference),
    reference: getDisplaySourceLabel(item),
  }));
}, [activities]);

const unclassifiedCalculatedRecords = useMemo(
  () =>
    calculationDetails.filter(
      (item) =>
        item.status === 'CALCULATED' &&
        getCalculationScopeResolution(item).scope === 'UNCLASSIFIED',
    ),
  [calculationDetails],
);
const facilityThresholdReferenceRows = useMemo(
  () => buildFacilityThresholdReferenceRows(
    siteFacilityBreakdownRows,
    REVIEWED_REGULATORY_THRESHOLD_REFERENCES,
  ),
  [siteFacilityBreakdownRows],
);

function buildScopeNarrative(scopeSummary: Record<string, number>) {
  const scope1 = scopeSummary['Scope 1'] ?? 0;
  const scope2 = scopeSummary['Scope 2'] ?? 0;
  const scope3 = scopeSummary['Scope 3'] ?? 0;

  const lines = [];

  if (scope1 > 0) {
    lines.push(
      `Scope 1 emissions are associated with direct fuel use, such as diesel, gasoline, natural gas, or propane consumed by owned or controlled operations.`
    );
  }

  if (scope2 > 0) {
    lines.push(
      `Scope 2 emissions are associated with purchased electricity consumed by the organization.`
    );
  }

  if (scope3 > 0) {
    lines.push(
      `Scope 3 emissions shown here are selected pilot estimates for business travel and transportation-related activity records. They do not represent a complete Scope 3 inventory.`
    );
  }
  if ((scopeSummary.Unclassified ?? 0) > 0) {
    lines.push(
      `Some calculated emissions are unclassified and should be reviewed before relying on the scope breakdown.`
    );
  }

  if (!lines.length) {
    lines.push(
      `No activity data was available for Scope 1, Scope 2, or Scope 3 classification.`
    );
  }

  lines.push(
    `Scope classification is based on activity type and is intended to support internal review, consultant discussion, and data readiness.`
  );

  return lines;
}

function handleExportMenuItem(callback: () => void | Promise<void>) {
  setIsExportMenuOpen(false);
  void callback();
  exportMenuTriggerRef.current?.focus();
}

const scopeNarrative = useMemo(() => {
  return buildScopeNarrative(scopeSummary);
}, [scopeSummary]);

function getFullYearShortcutYears() {
  const currentYear = new Date().getFullYear();
  return [String(currentYear - 1), String(currentYear)];
}

function getWorkflowMetadata(event: ActivityEventItem) {
  return (event.metadata ?? {}) as Record<string, unknown>;
}

function formatWorkflowEventTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatWorkflowEventActor(event: ActivityEventItem) {
  return event.userName || event.userEmail || event.user?.email || 'CarbonLite user';
}

function formatWorkflowEventLabel(event: ActivityEventItem) {
  const metadata = getWorkflowMetadata(event);
  const eventLabel = String(metadata.eventLabel ?? '').trim();
  if (eventLabel) return eventLabel;

  const labels: Record<string, string> = {
    DOCUMENT_UPLOADED: 'File uploaded',
    DOCUMENT_EXTRACT_SUCCEEDED: 'Draft records created',
    ACTIVITY_RECORD_IMPORTED: 'Import confirmed',
    ACTIVITY_RECORD_CREATED: 'Activity record created',
    ACTIVITY_RECORD_UPDATED: 'Activity record updated',
    REPORT_EXPORTED_PDF: 'PDF exported',
    REPORT_EXPORTED_CSV: 'CSV exported',
    FILE_UPLOADED: 'File uploaded',
    DATA_EXTRACTED: 'Draft records created',
    RECORDS_IMPORTED: 'Records imported',
    REPORT_GENERATED: 'Report generated',
    CSV_EXPORTED: 'CSV exported',
    PDF_EXPORTED: 'PDF report generated',
    IMPORT_FAILED: 'Import failed',
    REPORT_GENERATION_FAILED: 'Report generation failed',
  };

  return labels[event.eventName] ?? event.eventName.replace(/_/g, ' ').toLowerCase();
}

function formatWorkflowEventSummary(event: ActivityEventItem) {
  const metadata = getWorkflowMetadata(event);
  const sourceFile = String(metadata.sourceFileName ?? metadata.fileName ?? metadata.entityDisplayName ?? '').trim();
  const reportName = String(metadata.reportName ?? metadata.entityDisplayName ?? '').trim();
  const countLabel = (count: unknown, singular: string, plural = `${singular}s`) => {
    const numericCount = Number(count ?? 0);
    const displayCount = Number.isFinite(numericCount) ? numericCount : 0;
    return `${displayCount} ${displayCount === 1 ? singular : plural}`;
  };

  if (event.eventName === 'ACTIVITY_RECORD_IMPORTED') {
    return `${countLabel(metadata.createdRecordCount ?? metadata.count, 'activity record')} imported${sourceFile ? ` from ${sourceFile}` : ''}. ${countLabel(metadata.trackedMetricCount, 'tracked metric')}; ${countLabel(metadata.unresolvedRowCount, 'row')} still needing attention.`;
  }

  if (event.eventName === 'FILE_UPLOADED' || event.eventName === 'DOCUMENT_UPLOADED') {
    return `${sourceFile || 'Source file'} uploaded as ${metadata.sourceType || 'Source Information Needed'}.`;
  }

  if (event.eventName === 'DOCUMENT_EXTRACT_SUCCEEDED') {
    return `Draft records created${sourceFile ? ` from ${sourceFile}` : ''}: ${countLabel(metadata.extractedRowCount, 'draft record')}.`;
  }

  if (event.eventName === 'DATA_EXTRACTED') {
    return `Draft records created${sourceFile ? ` from ${sourceFile}` : ''}: ${countLabel(metadata.readyCount, 'ready record')}, ${countLabel(metadata.trackedMetricCount, 'tracked metric')}, ${countLabel(metadata.requiresReviewCount, 'record')} needing attention.`;
  }

  if (event.eventName === 'RECORDS_IMPORTED') {
    const parts = [
      `${countLabel(metadata.includedEmissionsCreated ?? metadata.includedEmissionsRecords, 'emissions record')} imported`,
      `${countLabel(metadata.trackedMetricsCreated ?? metadata.trackedOnlyRecords, 'tracked metric')} imported`,
    ];
    const alreadyImportedSkipped = Number(metadata.alreadyImportedSkipped ?? 0);
    const duplicateSkipped = Number(metadata.duplicateSkipped ?? 0);
    const needsReviewSkipped = Number(metadata.needsReviewSkipped ?? metadata.recordsRequiringReview ?? 0);
    const otherSkipped = Number(metadata.otherSkipped ?? 0);
    const totalRowsConsidered = Number(
      metadata.totalRowsConsidered ??
        metadata.documentReviewRowCount ??
        metadata.selectedRows,
    );

    if (alreadyImportedSkipped > 0) {
      parts.push(`${countLabel(alreadyImportedSkipped, 'previously imported record')} skipped`);
    }
    if (duplicateSkipped > 0) {
      parts.push(`${countLabel(duplicateSkipped, 'duplicate record')} skipped`);
    }
    if (needsReviewSkipped > 0) {
      parts.push(
        `${countLabel(needsReviewSkipped, 'record')} still ${
          needsReviewSkipped === 1 ? 'requires' : 'require'
        } review`,
      );
    }
    if (otherSkipped > 0) {
      parts.push(`${countLabel(otherSkipped, 'other row')} skipped`);
    }

    const totalText = Number.isFinite(totalRowsConsidered) && totalRowsConsidered > 0
      ? ` ${countLabel(totalRowsConsidered, 'row')} processed in total.`
      : '';

    return `Records processed${sourceFile ? ` from ${sourceFile}` : ''}: ${parts.join(', ')}.${totalText}`;
  }

  if (event.eventName === 'REPORT_GENERATED') {
    const total = Number(metadata.totalKgCO2e);
    const totalText = Number.isFinite(total)
      ? formatEmissionsWithUnit(total)
      : 'report total unavailable';
    return `${reportName || 'Report'} generated (${metadata.reportFormat || 'Report'}): ${totalText} total, ${countLabel(metadata.includedRecords, 'included record')}, ${countLabel(metadata.trackedMetrics, 'tracked metric')}.`;
  }

  if (event.eventName === 'CSV_EXPORTED' || event.eventName === 'REPORT_EXPORTED_CSV') {
    return `CSV exported: ${countLabel(metadata.exportedRecords ?? metadata.recordsIncluded ?? metadata.includedRecords, 'record')}, ${countLabel(metadata.trackedMetrics, 'tracked metric')}.`;
  }

  if (event.eventName === 'REPORT_EXPORTED_PDF') {
    return `PDF exported (${metadata.outputProfile || 'Report'}): ${countLabel(metadata.recordsIncluded ?? metadata.includedRecords, 'included record')}.`;
  }

  if (event.eventName === 'PDF_EXPORTED') {
    const total = Number(metadata.totalKgCO2e);
    const totalText = Number.isFinite(total)
      ? formatEmissionsWithUnit(total)
      : 'report total unavailable';
    return `PDF report generated: ${totalText} total, ${countLabel(metadata.includedRecords, 'included record')}, ${countLabel(metadata.trackedMetrics, 'tracked metric')}.`;
  }

  if (event.eventName === 'IMPORT_FAILED' || event.eventName === 'REPORT_GENERATION_FAILED') {
    return String(metadata.friendlyError ?? 'Workflow action failed. Review the source data and try again.');
  }

  return String(metadata.eventLabel ?? event.description ?? 'Workflow event recorded.');
}

const carbonCreditReadiness = buildCarbonCreditReadinessAssessment(
  calculationDetails,
  dataReadinessSummary,
);
const includeCarbonCreditReadinessNotes = DEFAULT_REPORT_OPTIONS.includeCarbonCreditReadinessNotes === true;
const auditEvidenceChains = calculationDetails.map((detail) =>
  buildEvidenceChainFromCalculationDetail(detail, {
    report: {
      reportId: currentReportDocumentControl.reportId,
      reportVersion: currentReportDocumentControl.reportVersion,
    },
  }),
);
const auditEvidenceRows = buildEvidenceChainSummaryRows(auditEvidenceChains);
const sourceEvidenceRows = reportData.sourceEvidenceRows;
const latestWorkflowEvent = workflowEvents[0] ?? null;
const reportRecordCount = reportCountSummary.processedRecords;
const hasLoadedSummary = Boolean(summary);
const hasImportedActivityData = countSummary.totalRecordsFound > 0;
const hasReportOutput =
  countSummary.recordsInScope > 0 ||
  activities.length > 0 ||
  calculationDetails.length > 0 ||
  matchedActivityEmissions.length > 0 ||
  conversionFactorsUsed.length > 0;
const hasCalculableRecords = reportRecordCount > 0;
const hasNoDataInSystem = hasLoadedSummary && !loading && !hasImportedActivityData;
const hasNoRecordsForSelectedPeriod =
  hasLoadedSummary &&
  !loading &&
  hasImportedActivityData &&
  !hasReportOutput;
const hasRecordsRequiringReviewOnly =
  hasLoadedSummary &&
  !loading &&
  hasReportOutput &&
  !hasCalculableRecords;
const {
  exporting,
  exportError,
  exportExecutivePdf,
  exportTechnicalPdf,
  exportCsv,
} = useReportExports({
  report: reportData,
  hasReportOutput,
  isExportReady,
  page: location.pathname,
  url: typeof window !== 'undefined' ? window.location.href : '',
  reportScope,
  onWorkflowEventsRefresh: loadWorkflowEvents,
});
const exportDisabled = !hasReportOutput || !isExportReady || exporting !== null;
const exportDisabledTitle = exportDisabled
  ? exporting
    ? 'Export in progress.'
    : 'Generate a report before exporting.'
  : undefined;

function toggleReportSection(sectionId: ReportSectionId) {
  setExpandedSections((current) => ({
    ...current,
    [sectionId]: !current[sectionId],
  }));
}

function setAllReportSections(expanded: boolean) {
  setExpandedSections(
    Object.keys(REPORT_SECTION_DEFAULTS).reduce(
      (next, key) => ({
        ...next,
        [key]: expanded,
      }),
      {} as Record<ReportSectionId, boolean>,
    ),
  );
  setPreviewExpansionRequest((current) => ({
    token: current.token + 1,
    expanded,
  }));
}

  return (
    <div style={reportsPageStyle}>
      <PageHeader title="Reports" />
      {reportScope === 'selectedDocuments' ? (
        <DocumentScopeContext selectedDocumentIds={selectedDocumentIds} importedRecordCount={activities.length}
          sourceFileNames={activities.flatMap((record) => record.sourceFileName ? [record.sourceFileName] : [])}
          sourceReview={reportData.sourceReview} loading={isPreparingReportData} destination="calculations" />
      ) : null}


      {isPilotReviewerAccount ? (
        <PilotReviewerFeedbackPrompt />
      ) : null}

      {/* <div style={paidPilotScopeCalloutStyle}>
        <span>Preparing a structured pilot review?</span>
        <button
          type="button"
          onClick={() => navigate('/paid-pilot-scope')}
          style={secondaryButtonStyle(false)}
        >
          View Paid Pilot Scope
        </button>
      </div> */}

      <div style={reportDisclaimerCalloutStyle}>
        <strong>Pilot report</strong>
        <p style={{ margin: 0 }}>Results are estimates and require professional review before formal use.</p>
        <p style={{ margin: 0 }}>CarbonLite does not provide regulatory assurance or third-party verification.</p>
        <details>
          <summary style={{ cursor: 'pointer' }}>View limitations</summary>
          <p style={{ margin: '8px 0 0' }}>{FORMAL_REPORT_DISCLAIMER}</p>
        </details>
      </div>

      <InventoryBoundaryPanel
        boundary={inventoryBoundary}
        summary={inventoryBoundarySummary}
        expanded={isInventoryBoundaryExpanded}
        onToggle={() => setIsInventoryBoundaryExpanded((expanded) => !expanded)}
        canEdit={canEditOrganizationBoundary}
        isPilotReviewerAccount={isPilotReviewerAccount}
        onEdit={() => navigate('/organization-profile')}
      />

      <ReportSectionControls
        onExpandAll={() => setAllReportSections(true)}
        onCollapseAll={() => setAllReportSections(false)}
      />

      <CollapsibleReportSection
        id="report-scope-report-section"
        title="Report Scope"
        summary={reportPeriod}
        expanded={expandedSections.reportScope}
        onToggle={() => toggleReportSection('reportScope')}
      >
        {isPilotReviewerAccount ? (
          <ReadOnlyReportScopeSummary
            reportPeriod={reportPeriod}
            reportScopeLabel={reportScopeLabel}
          />
        ) : (
          <ReportScopeSection
            reportScope={reportScope}
            selectedDocumentCount={selectedDocumentIds.length}
            selectedRecordCount={selectedRecordIds.length}
            draftPeriodStart={draftPeriodStart}
            draftPeriodEnd={draftPeriodEnd}
            loading={isPreparingReportData}
            fullYearShortcutYears={getFullYearShortcutYears()}
            onReportScopeChange={setReportScope}
            onStartDateChange={handleStartDateChange}
            onEndDateChange={handleEndDateChange}
            onCommitDateRange={commitDateRange}
            onFullYear={handleFullYear}
            styles={{
              filterCard: filterCardStyle,
              label: labelStyle,
              scopeToggle: scopeToggleStyle,
              input: inputStyle,
              secondaryButton: secondaryButtonStyle,
              scopeButton: scopeButtonStyle,
            }}
          />
        )}
      </CollapsibleReportSection>
      {!isPilotReviewerAccount && reportScope === 'selectedDocuments' ? (
        <div style={selectionNoticeStyle}>
          Report Scope: Selected Documents ({selectedDocumentIds.length})
        </div>
      ) : !isPilotReviewerAccount && reportScope === 'selectedRecords' ? (
        <div style={selectionNoticeStyle}>
          Report Scope: Selected Records ({selectedRecordIds.length})
        </div>
      ) : null}
      {!isPilotReviewerAccount && reportScope === 'selectedDocuments' && !loading && activities.length === 0 ? (
        <div style={emptyScopeNoticeStyle}>
          No activity records found for selected documents.
        </div>
      ) : null}
      <ReportActions
        loading={isPreparingReportData}
        exportDisabled={exportDisabled}
        exportDisabledTitle={exportDisabledTitle}
        hasNoDataInSystem={hasNoDataInSystem}
        isExportMenuOpen={isExportMenuOpen}
        exportMenuRef={exportMenuRef}
        exportMenuTriggerRef={exportMenuTriggerRef}
        onGenerate={loadReportData}
        onToggleExportMenu={() => setIsExportMenuOpen((open) => !open)}
        onExportExecutive={() => handleExportMenuItem(exportExecutivePdf)}
        onExportTechnical={() => handleExportMenuItem(exportTechnicalPdf)}
        onExportCsv={() => handleExportMenuItem(exportCsv)}
      />

      {error ? <div style={errorStyle}>{error}</div> : null}
      {exportError ? <div style={errorStyle}>{exportError}</div> : null}

      {hasNoDataInSystem ? (
        <ReportEmptyState onInputData={() => navigate('/input-data')} />
      ) : null}

      {hasNoRecordsForSelectedPeriod ? (
        <div style={dateRangeEmptyStateStyle}>
          No records found for the selected period.
        </div>
      ) : null}

      {isPreparingReportData ? (
        <div role="status" aria-live="polite" style={loadingNoticeStyle}>
          Preparing report data...
          {isSlowPreparingReport ? (
            <div style={slowLoadingTextStyle}>
              Still loading — this may take a few seconds.
            </div>
          ) : null}
        </div>
      ) : hasReportOutput ? (
        <>
          {hasRecordsRequiringReviewOnly ? (
            <div style={reviewOnlyNoticeStyle}>
              No emissions calculated because records need attention. Review the
              calculation issues and records needing attention below.
            </div>
          ) : null}

          <FormalReportPreview
            organizationName={organizationName}
            reportPeriod={reportPeriod}
            scopeLabel={reportScopeLabel}
            generatedAt={generatedAt}
            inventoryBoundary={inventoryBoundary}
            usageTotals={usageTotals}
            totalEstimatedEmissionsKgCO2e={totalEstimatedEmissionsKgCO2e}
            countSummary={countSummary}
            matchedActivityEmissions={matchedActivityEmissions}
            conversionFactorsUsed={conversionFactorsUsed}
            sourceEvidenceRows={sourceEvidenceRows}
            calculationDetails={calculationDetails}
            sourceReviewSummary={sourceReviewSummary}
            showSectionToolbar={false}
            sectionExpansionRequest={previewExpansionRequest}
          />

          <ActivityRecordsSection
            rows={activityRecordRows}
            expanded={expandedSections.activityRecords}
            onToggle={() => toggleReportSection('activityRecords')}
          />

          <CalculationQualitySection
            data={reportData.calculationQuality}
            readiness={reportData.readiness}
            sourceReview={reportData.sourceReview}
            primarySkippedReasonsText={formatReviewReasons(primarySkippedReasons)}
            expanded={expandedSections.dataQualityNotes}
            onToggle={() => toggleReportSection('dataQualityNotes')}
          />

          <SourceDatasetReviewSection
            data={reportData.sourceReview}
            expanded={expandedSections.dataQualityNotes}
            onToggle={() => toggleReportSection('dataQualityNotes')}
          />
          <AuditEvidenceChainSection
            rows={auditEvidenceRows}
            reportId={currentReportDocumentControl.reportId}
            expanded={expandedSections.auditEvidenceChain}
            onToggle={() => toggleReportSection('auditEvidenceChain')}
          />
          {includeCarbonCreditReadinessNotes ? (
            <CarbonCreditReadinessSection
              assessment={carbonCreditReadiness}
              readinessLevelLabel={formatCarbonCreditReadinessLevel(carbonCreditReadiness.readinessLevel)}
              recordsRequiringReview={dataReadinessSummary.recordsRequiringReview}
              trackedOnlyCount={dataReadinessSummary.trackedOnlyCount}
              disclaimer={CARBON_CREDIT_READINESS_DISCLAIMER}
              expanded={expandedSections.carbonCreditReadiness}
              onToggle={() => toggleReportSection('carbonCreditReadiness')}
            />
          ) : null}
          <ScopeBreakdownSection
            data={reportData.scopeBreakdown}
            unclassifiedCalculatedRecordCount={unclassifiedCalculatedRecords.length}
            expanded={expandedSections.scopeBreakdown}
            onToggle={() => toggleReportSection('scopeBreakdown')}
          />
          <FacilityBreakdownSection
            data={reportData.facilityBreakdown}
            expanded={expandedSections.siteFacilityBreakdown}
            onToggle={() => toggleReportSection('siteFacilityBreakdown')}
          />
          <FacilityThresholdReferenceSection
            rows={facilityThresholdReferenceRows}
            expanded={expandedSections.facilityThresholdReference}
            onToggle={() => toggleReportSection('facilityThresholdReference')}
          />
          <RegulatoryReportingReferenceSection
            regulatoryReportingReference={regulatoryReportingReference}
            title={REGULATORY_REPORTING_REFERENCE_TITLE}
            summary={REGULATORY_REPORTING_REFERENCE_SUMMARY}
            text={REGULATORY_REPORTING_REFERENCE_TEXT}
            expanded={expandedSections.regulatoryReportingReference}
            onToggle={() => toggleReportSection('regulatoryReportingReference')}
            formatReference={formatRegulatoryThresholdReference}
          />
        </>
      ) : null}

      {canViewWorkflowHistory && !isPilotReviewerAccount ? (
        <WorkflowAuditTrail
          events={workflowEvents}
          loading={workflowEventsLoading}
          error={workflowEventsError}
          isOpen={isWorkflowAuditOpen}
          latestEvent={latestWorkflowEvent}
          formatEventLabel={formatWorkflowEventLabel}
          formatEventTime={formatWorkflowEventTime}
          formatEventActor={formatWorkflowEventActor}
          formatEventSummary={formatWorkflowEventSummary}
          onToggle={() => setIsWorkflowAuditOpen((open) => !open)}
          onRefresh={loadWorkflowEvents}
        />
      ) : null}
    </div>
  );
}

function WorkflowAuditTrail({
  events,
  loading,
  error,
  isOpen,
  latestEvent,
  formatEventLabel,
  formatEventTime,
  formatEventActor,
  formatEventSummary,
  onToggle,
  onRefresh,
}: {
  events: ActivityEventItem[];
  loading: boolean;
  error: string | null;
  isOpen: boolean;
  latestEvent: ActivityEventItem | null;
  formatEventLabel: (event: ActivityEventItem) => string;
  formatEventTime: (value: string) => string;
  formatEventActor: (event: ActivityEventItem) => string;
  formatEventSummary: (event: ActivityEventItem) => string;
  onToggle: () => void;
  onRefresh: () => void;
}) {
  return (
    <CollapsibleSection
      id="workflow-audit-trail"
      title="Audit Trail"
      summary={`Workflow history for this workspace.${latestEvent ? ` Latest event: ${formatEventLabel(latestEvent)} · ${formatEventTime(latestEvent.createdAt)}` : ''}`}
      expanded={isOpen}
      onToggle={onToggle}
      style={workflowAuditPanelStyle}
      contentStyle={workflowAuditBodyStyle}
    >
          <div style={workflowAuditActionsStyle}>
            <p style={workflowAuditSubtitleStyle}>
              Recent import and report workflow events for this workspace.
            </p>
            <button
              type="button"
              onClick={onRefresh}
              style={secondaryButtonStyle(loading)}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          {error ? <div role="alert">{error}</div> : null}
          {loading && events.length === 0 ? (
            <div style={workflowAuditEmptyStyle}>Loading workflow history...</div>
          ) : events.length === 0 && !error ? (
            <div style={workflowAuditEmptyStyle}>No workflow audit events recorded yet.</div>
          ) : (
            <ol style={workflowAuditListStyle}>
              {events.slice(0, 8).map((event) => (
                <li key={event.id} style={workflowAuditItemStyle}>
                  <div style={workflowAuditTimeStyle}>{formatEventTime(event.createdAt)}</div>
                  <div style={workflowAuditEventBodyStyle}>
                    <strong>{formatEventLabel(event)}</strong>
                    <span>{formatEventActor(event)}</span>
                    <p>{formatEventSummary(event)}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
    </CollapsibleSection>
  );
}

function DataQualityNote({
  label,
  value,
  detail,
}: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
}) {
  const valueTitle =
    typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;

  return (
    <div style={dataQualityNoteStyle}>
      <span>{label}</span>
      <strong style={dataQualityNoteValueStyle} title={valueTitle}>
        {value}
      </strong>
      {detail ? <span style={dataQualityNoteDetailStyle}>{detail}</span> : null}
    </div>
  );
}

function ReadOnlyReportScopeSummary({
  reportPeriod,
  reportScopeLabel,
}: {
  reportPeriod: string;
  reportScopeLabel: string;
}) {
  return (
    <div style={readOnlyReportScopeStyle}>
      <DataQualityNote label="Report scope" value={reportScopeLabel} />
      <DataQualityNote label="Reporting period" value={reportPeriod} />
      <p style={readOnlyReportScopeNoteStyle}>
        Pilot reviewer accounts can view report context but cannot change report settings.
      </p>
    </div>
  );
}

const reportsPalette = {
  primaryGreen: '#047857',
  primaryGreenHover: '#065F46',
  primaryText: '#0F172A',
  secondaryText: '#64748B',
  mutedText: '#94A3B8',
  border: '#E2E8F0',
  subtleBorder: '#F1F5F9',
  white: '#FFFFFF',
  subtleBackground: '#F8FAFC',
  disabledBackground: '#F1F5F9',
  successBackground: '#ECFDF5',
  successBorder: '#BBF7D0',
  warningBackground: '#FFFBEB',
  warningBorder: '#FDE68A',
  warningText: '#B45309',
  errorBackground: '#FEF2F2',
  errorBorder: '#FECACA',
  errorText: '#B91C1C',
  infoText: '#475569',
};

const reportsPageStyle: React.CSSProperties = {
  padding: 24,
  maxWidth: 1100,
  margin: '0 auto',
  color: reportsPalette.primaryText,
};

const readOnlyReportScopeStyle: React.CSSProperties = {
  display: 'grid',
  gap: 12,
};

const readOnlyReportScopeNoteStyle: React.CSSProperties = {
  margin: 0,
  color: reportsPalette.secondaryText,
  fontSize: 13,
  lineHeight: 1.5,
};

const dataQualityNoteStyle: React.CSSProperties = {
  display: 'grid',
  gap: 4,
  minWidth: 0,
  padding: 12,
  borderRadius: 12,
  background: reportsPalette.subtleBackground,
  border: `1px solid ${reportsPalette.border}`,
  color: reportsPalette.infoText,
};

const dataQualityNoteValueStyle: React.CSSProperties = {
  display: '-webkit-box',
  minWidth: 0,
  maxWidth: '100%',
  overflow: 'hidden',
  overflowWrap: 'anywhere',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 2,
};

const dataQualityNoteDetailStyle: React.CSSProperties = {
  color: reportsPalette.secondaryText,
  fontSize: 12,
  lineHeight: 1.4,
};

const reportDisclaimerCalloutStyle: React.CSSProperties = {
  display: 'grid',
  gap: 6,
  margin: '0 0 20px',
  padding: 14,
  borderRadius: 12,
  background: reportsPalette.subtleBackground,
  border: `1px solid ${reportsPalette.border}`,
  color: reportsPalette.infoText,
  lineHeight: 1.6,
};

const paidPilotScopeCalloutStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  margin: '0 0 20px',
  padding: 14,
  borderRadius: 12,
  background: reportsPalette.successBackground,
  border: `1px solid ${reportsPalette.successBorder}`,
  color: reportsPalette.primaryGreen,
  fontWeight: 800,
  flexWrap: 'wrap',
};

const workflowAuditPanelStyle: React.CSSProperties = {
  display: 'grid',
  gap: 0,
  marginTop: 24,
  marginBottom: 24,
  padding: 16,
  borderRadius: 12,
  border: `1px solid ${reportsPalette.border}`,
  background: reportsPalette.white,
  overflow: 'hidden',
  boxShadow: 'none',
};

const workflowAuditSubtitleStyle: React.CSSProperties = {
  margin: '4px 0 0',
  color: reportsPalette.secondaryText,
  fontSize: 13,
  lineHeight: 1.45,
};

const workflowAuditBodyStyle: React.CSSProperties = {
  display: 'grid',
  gap: 12,
  borderTop: `1px solid ${reportsPalette.border}`,
  padding: 16,
};

const workflowAuditActionsStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
};

const workflowAuditListStyle: React.CSSProperties = {
  display: 'grid',
  gap: 10,
  margin: 0,
  padding: 0,
  listStyle: 'none',
};

const workflowAuditItemStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '140px minmax(0, 1fr)',
  gap: 12,
  padding: 12,
  borderRadius: 10,
  background: reportsPalette.subtleBackground,
  border: `1px solid ${reportsPalette.border}`,
};

const workflowAuditTimeStyle: React.CSSProperties = {
  color: reportsPalette.secondaryText,
  fontSize: 12,
  fontWeight: 800,
};

const workflowAuditEventBodyStyle: React.CSSProperties = {
  display: 'grid',
  gap: 4,
  minWidth: 0,
  color: reportsPalette.infoText,
  lineHeight: 1.45,
};

const workflowAuditEmptyStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 10,
  background: reportsPalette.subtleBackground,
  color: reportsPalette.secondaryText,
  textAlign: 'center',
};

function primaryButtonStyle(disabled = false): React.CSSProperties {
  return {
    padding: '10px 16px',
    borderRadius: 10,
    border: disabled ? `1px solid ${reportsPalette.border}` : `1px solid ${reportsPalette.primaryGreen}`,
    background: disabled ? reportsPalette.disabledBackground : reportsPalette.primaryGreen,
    color: disabled ? reportsPalette.mutedText : reportsPalette.white,
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

function secondaryButtonStyle(disabled = false): React.CSSProperties {
  return {
    padding: '10px 16px',
    borderRadius: 10,
    border: `1px solid ${reportsPalette.border}`,
    background: disabled ? reportsPalette.disabledBackground : reportsPalette.white,
    color: disabled ? reportsPalette.mutedText : reportsPalette.primaryText,
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

const errorStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 12,
  borderRadius: 10,
  border: `1px solid ${reportsPalette.errorBorder}`,
  background: reportsPalette.errorBackground,
  color: reportsPalette.errorText,
};

const loadingNoticeStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 12,
  borderRadius: 10,
  border: `1px solid ${reportsPalette.border}`,
  background: reportsPalette.subtleBackground,
  color: reportsPalette.infoText,
  fontWeight: 800,
};

const slowLoadingTextStyle: React.CSSProperties = {
  marginTop: 6,
  color: reportsPalette.infoText,
  fontSize: 13,
  fontWeight: 700,
};

const filterCardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'end',
  gap: 12,
  flexWrap: 'wrap',
  padding: 16,
  borderRadius: 12,
  background: reportsPalette.white,
  border: `1px solid ${reportsPalette.border}`,
  marginBottom: 20,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 700,
  color: reportsPalette.infoText,
};

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 10,
  border: `1px solid ${reportsPalette.border}`,
  color: reportsPalette.primaryText,
  background: reportsPalette.white,
};

const scopeToggleStyle: React.CSSProperties = {
  display: 'inline-flex',
  gap: 6,
  padding: 4,
  borderRadius: 12,
  background: reportsPalette.disabledBackground,
  border: `1px solid ${reportsPalette.border}`,
};

function scopeButtonStyle(active: boolean, disabled = false): React.CSSProperties {
  return {
    padding: '8px 12px',
    borderRadius: 10,
    border: active ? `1px solid ${reportsPalette.primaryGreen}` : '1px solid transparent',
    background: active ? reportsPalette.primaryGreen : reportsPalette.white,
    color: disabled ? reportsPalette.mutedText : active ? reportsPalette.white : reportsPalette.infoText,
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

const selectionNoticeStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 12,
  borderRadius: 10,
  border: `1px solid ${reportsPalette.successBorder}`,
  background: reportsPalette.successBackground,
  color: reportsPalette.primaryGreen,
  fontWeight: 700,
};

const emptyScopeNoticeStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 12,
  borderRadius: 10,
  border: `1px solid ${reportsPalette.warningBorder}`,
  background: reportsPalette.warningBackground,
  color: reportsPalette.warningText,
  fontWeight: 700,
};

const reviewOnlyNoticeStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 14,
  borderRadius: 12,
  border: `1px solid ${reportsPalette.warningBorder}`,
  background: reportsPalette.warningBackground,
  color: reportsPalette.warningText,
  fontWeight: 800,
  lineHeight: 1.5,
};

const dateRangeEmptyStateStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 16,
  borderRadius: 12,
  border: `1px solid ${reportsPalette.warningBorder}`,
  background: reportsPalette.warningBackground,
  color: reportsPalette.warningText,
  fontWeight: 800,
};
