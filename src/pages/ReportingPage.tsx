import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  EMPTY_ACTIVITY_USAGE_TOTALS,
  loadDefaultMetricsDateRange,
  loadMetricsOverview,
} from '../services/metricsOverview';
import {
  buildDataReadinessSummary,
  buildCarbonCreditReadinessAssessment,
  buildHotspotAnalysis,
  CARBON_CREDIT_READINESS_DISCLAIMER,
  buildMetricsSummaryTableRows,
  formatHotspotExclusionNote,
  type HotspotAnalysis,
} from '../components/MetricsSummarySection';
import {
  FORMAL_REPORT_DISCLAIMER,
  FORMAL_REPORT_METHODOLOGY,
  FormalReportPreview,
  buildPrimarySkippedReasonSummary,
  buildReportCountSummary,
  buildReportExecutiveSummary,
  buildSourceEvidenceRows,
  buildSourceEvidenceSummaryRows,
  formatSourceType,
  formatReportJurisdiction,
  formatReportUnit,
  formatReviewReasons,
  type FormalActivityEmission,
  type FormalConversionFactorUsed,
} from '../components/FormalReportPreview';
import { CollapsibleSection } from '../components/common/CollapsibleSection';
import { CollapsibleReportSection } from '../components/reports/CollapsibleReportSection';
import { ReportScopeSection } from '../components/reports/sections/ReportScopeSection';
import { PilotReviewerFeedbackPrompt } from '../components/PilotReviewerFeedbackPrompt';
import { getCurrentUser, getOrganizationId, getOrganizationName } from '../services/auth';
import { canEditWorkspace, isPilotReviewer } from '../utils/permissions';
import { createClientAuditLog } from '../services/auditLogs';
import { getActivityEvents, trackActivityEvent, type ActivityEventItem } from '../services/activityEvents';
import { track } from '../services/analytics.service';
import { trackEvent } from '../services/ga4.service';
import type { CalculationAuditDetail } from '../services/metrics';
import {
  buildCalculatedFormula,
  formatCalculationStatus,
  formatFactorValue,
  formatRecordSource,
  formatTraceableFactor,
} from '../utils/calculationTraceability';
import {
  formatDisplayNumber,
  formatEmissionsValue,
  formatEmissionsWithUnit,
  formatPdfEmissionsWithUnit,
  formatPdfText,
} from '../utils/numberFormatting';
import {
  formatScopeClassification,
  formatScopeSource,
  resolveScopeClassification,
} from '../utils/scopeClassification';
import { getActivityTypeLabel, getFactorDisplayName } from '../utils/activityType';
import { formatDateOnly, getDateOnlyYear } from '../utils/dateOnly';
import { formatCredibilityLabel } from '../utils/factorCredibility';
import {
  formatReportAssumptions,
  formatReportFactorSource,
  formatReportFactorSummaryVerification,
  formatReportFactorUnit,
  formatReportFactorVersion,
  formatReportVerification,
  formatTraceabilityReviewNote,
  getCalculationCoverageCounts,
  getDisplaySourceLabel,
  getTrackedMetricAction,
  getTrackedMetricMessage,
  isRecordRequiringCorrection,
  isTrackedMetricDetail,
} from '../utils/reportCredibility';
import { buildPilotCsv } from '../utils/reportCsvExport';
import { getUserFriendlyErrorMessage } from '../utils/userFriendlyErrors';
import {
  ALBERTA_TIER_LARGE_EMITTER_THRESHOLD_TCO2E,
  buildFacilityThresholdReferenceRows,
  buildSiteFacilityRollup,
  FACILITY_REPORTING_THRESHOLD_TCO2E,
  FACILITY_THRESHOLD_REFERENCE_DISCLAIMER,
  type FacilityThresholdReferenceRow,
  type SiteFacilityBreakdownRow,
} from '../utils/siteFacilityBreakdown';
import {
  buildReviewPackageCalculationTraceabilityCsv,
  buildReviewPackageDataRecordsCsv,
  buildReviewPackageFactorSourceSummaryCsv,
  buildReviewPackageRecordsRequiringReviewCsv,
  buildReviewPackageSiteFacilityBreakdownCsv,
  getReviewPackageCsvFileName,
  type ReviewPackageCsvKind,
} from '../utils/reportReviewPackageCsvExport';
import {
  CARBONLITE_CALCULATION_COVERAGE_LABEL,
  getInventoryBoundaryStatus,
  summarizeInventoryBoundary,
  type InventoryBoundary,
} from '../constants/inventoryBoundary';
import {
  fetchOrganizationProfile,
  hasBackendOrganizationProfileSession,
  loadOrganizationProfile,
  ORGANIZATION_PROFILE_UPDATED_EVENT,
  profileToInventoryBoundary,
} from '../services/organizationProfile';
import { useSlowLoading } from '../hooks/useSlowLoading';
import { startDevTiming } from '../utils/performanceDiagnostics';
import type { SpreadsheetReviewRowItem } from '../services/spreadsheetReviewRows';

type ActivityItem = {
  id: string;
  activityType: string;
  recordDate: string;
  quantity: string | number;
  unit: string;
  sourceType: string;
  sourceReference?: string | null;
  sourceDocumentId?: string | null;
  sourceFileName?: string | null;
  sourcePage?: string | number | null;
  sourceRow?: string | number | null;
  sourceTextSnippet?: string | null;
  costCad?: string | number | null;
  costCurrency?: string | null;
  notes?: string | null;
};
const SCOPE_HELP = [
  {
    scope: 'Scope 1',
    label: 'Direct emissions',
    description:
      'Direct emissions from sources owned or controlled by the organization, such as natural gas, diesel, gasoline, or fleet fuel.',
    examples: 'Diesel, gasoline, natural gas, fleet fuel',
  },
  {
    scope: 'Scope 2',
    label: 'Purchased energy',
    description:
      'Indirect emissions from purchased electricity, steam, heating, or cooling.',
    examples: 'Electricity',
  },
  {
    scope: 'Scope 3',
    label: 'Selected indirect pilot estimates',
    description:
      'Selected Scope 3 activity records in this pilot, focused on business travel and transportation-related estimates. This does not represent a complete Scope 3 inventory.',
    examples: 'Air travel, business travel accommodation, ground transport, shipping',
  },
] as const;

const scopeLabelByName = Object.fromEntries(
  SCOPE_HELP.map((item) => [item.scope, item.label]),
) as Record<string, string>;

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
  recordsRequiringReview: false,
  dataQualityNotes: true,
  carbonCreditReadiness: false,
  regulatoryReportingReference: false,
  methodologyDisclaimer: true,
  activityRecords: false,
} as const;

type ReportOptions = {
  includeCarbonCreditReadinessNotes?: boolean;
};

const DEFAULT_REPORT_OPTIONS: ReportOptions = {
  includeCarbonCreditReadinessNotes: false,
};

type ReportSectionId = keyof typeof REPORT_SECTION_DEFAULTS;

const WORKFLOW_AUDIT_EVENT_NAMES = new Set([
  'FILE_UPLOADED',
  'DATA_EXTRACTED',
  'RECORDS_IMPORTED',
  'REPORT_GENERATED',
  'CSV_EXPORTED',
  'PDF_EXPORTED',
  'REPORT_GENERATION_FAILED',
  'IMPORT_FAILED',
]);

const REGULATORY_REPORTING_REFERENCE_TITLE = 'Regulatory Reporting Reference';
const REGULATORY_REPORTING_REFERENCE_SUMMARY =
  'Reference only · Not an official filing or compliance determination';
const REGULATORY_REPORTING_REFERENCE_TEXT =
  'This report is for emissions data readiness and internal workflow review only. It is not a CRA fuel charge return, official GHGRP submission, TIER compliance report, third-party verification, or regulatory compliance advice.';
const BASE_REGULATORY_REPORTING_SYSTEMS = [
  'Federal GHGRP Single Window reporting',
  'CRA fuel charge forms, where applicable',
] as const;
const ALBERTA_REGULATORY_REPORTING_SYSTEMS = [
  'Alberta SGRR / SWIM reporting',
  'Alberta TIER compliance reporting',
] as const;

export default function ReportingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const currentWorkspaceId = getOrganizationId(currentUser);
  const isPilotReviewerAccount = isPilotReviewer(currentUser);
  const canEditOrganizationBoundary = canEditWorkspace(currentUser);
  const canViewWorkflowHistory = !isPilotReviewerAccount;
  const routeState = location.state as {
    reportScope?: string;
    selectedRecordIds?: string[];
    selectedActivityRecordIds?: string[];
    selectedDocumentIds?: string[];
  } | null;
  const initialSelectedRecordIds =
    (routeState?.selectedActivityRecordIds ?? routeState?.selectedRecordIds ?? [])
      .filter((id): id is string => typeof id === 'string');
  const initialSelectedDocumentIds =
    (routeState?.selectedDocumentIds ?? [])
      .filter((id): id is string => typeof id === 'string');
  const [summary, setSummary] = useState<any>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [matchedActivityEmissions, setMatchedActivityEmissions] = useState<FormalActivityEmission[]>([]);
  const [conversionFactorsUsed, setConversionFactorsUsed] = useState<FormalConversionFactorUsed[]>([]);
  const [calculationDetails, setCalculationDetails] = useState<CalculationAuditDetail[]>([]);
  const [sourceReviewRows, setSourceReviewRows] = useState<SpreadsheetReviewRowItem[]>([]);
  const [usageTotals, setUsageTotals] = useState(EMPTY_ACTIVITY_USAGE_TOTALS);
  const [totalEstimatedEmissionsKgCO2e, setTotalEstimatedEmissionsKgCO2e] = useState(0);
  const [countSummary, setCountSummary] = useState({
    totalRecordsFound: 0,
    recordsInScope: 0,
    processedRecords: 0,
    skippedRecords: 0,
    missingFactorRecords: 0,
    skippedReasons: {
      missingFactor: 0,
      outsideDateRange: 0,
      outsideScope: 0,
      invalidData: 0,
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workflowEvents, setWorkflowEvents] = useState<ActivityEventItem[]>([]);
  const [workflowEventsLoading, setWorkflowEventsLoading] = useState(false);
  const [isWorkflowAuditOpen, setIsWorkflowAuditOpen] = useState(false);
  const [isInventoryBoundaryExpanded, setIsInventoryBoundaryExpanded] = useState(false);
  const [isReviewPackageMenuOpen, setIsReviewPackageMenuOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [periodStart, setPeriodStart] = useState(getDefaultFallbackStartDate());
  const [periodEnd, setPeriodEnd] = useState('2026-12-31');
  const [draftPeriodStart, setDraftPeriodStart] = useState(getDefaultFallbackStartDate());
  const [draftPeriodEnd, setDraftPeriodEnd] = useState('2026-12-31');
  const [dateRangeReady, setDateRangeReady] = useState(false);
  const [organizationProfile, setOrganizationProfile] = useState(() =>
    loadOrganizationProfile(getCurrentUser()),
  );
  const [reportScope, setReportScope] = useState<'dateRange' | 'selectedDocuments' | 'selectedRecords'>(
    initialSelectedDocumentIds.length || routeState?.reportScope === 'selectedDocuments'
      ? 'selectedDocuments'
      : initialSelectedRecordIds.length
      ? 'selectedRecords'
      : 'dateRange',
  );
  const [selectedRecordIds] = useState<string[]>(
    initialSelectedRecordIds,
  );
  const [selectedDocumentIds] = useState<string[]>(
    initialSelectedDocumentIds,
  );
  const [expandedSections, setExpandedSections] =
    useState<Record<ReportSectionId, boolean>>(REPORT_SECTION_DEFAULTS);
  const [previewExpansionRequest, setPreviewExpansionRequest] = useState({
    token: 0,
    expanded: false,
  });
  const isSlowPreparingReport = useSlowLoading(!dateRangeReady || loading);
  const dateCommitTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const inFlightRequestKeyRef = useRef<string | null>(null);
  const reviewPackageMenuRef = useRef<HTMLDivElement | null>(null);
  const trackedReportViewRef = useRef(false);
  async function loadWorkflowEvents() {
    if (!canViewWorkflowHistory) {
      setWorkflowEvents([]);
      setWorkflowEventsLoading(false);
      return;
    }

    setWorkflowEventsLoading(true);

    try {
      const response = await getActivityEvents({ pageSize: 20 });
      setWorkflowEvents(
        (response.items ?? []).filter((item) => WORKFLOW_AUDIT_EVENT_NAMES.has(item.eventName)),
      );
    } catch {
      setWorkflowEvents([]);
    } finally {
      setWorkflowEventsLoading(false);
    }
  }

  async function loadReportData() {
    const request = {
      recalculate: true,
      ...(reportScope === 'selectedRecords'
        ? { selectedActivityRecordIds: selectedRecordIds }
        : reportScope === 'selectedDocuments'
        ? { selectedDocumentIds }
        : { dateFrom: periodStart, dateTo: periodEnd }),
    };
    const requestKey = JSON.stringify(request);

    if (inFlightRequestKeyRef.current === requestKey) return;
    inFlightRequestKeyRef.current = requestKey;
    const endTiming = startDevTiming('loadReportData');
    setLoading(true);
    setError(null);

    try {
      const overview = await loadMetricsOverview(request);

      setSummary(overview.summary);
      setActivities(overview.activities);
      setMatchedActivityEmissions(overview.matchedActivityEmissions);
      setConversionFactorsUsed(overview.conversionFactorsUsed);
      setCalculationDetails(overview.calculationDetails);
      setSourceReviewRows(overview.sourceReviewRows ?? []);
      setUsageTotals(overview.usageTotals);
      setTotalEstimatedEmissionsKgCO2e(overview.totalEstimatedEmissionsKgCO2e);
      setCountSummary({
        totalRecordsFound: overview.totalRecordsFound,
        recordsInScope: overview.recordsInScope,
        processedRecords: overview.processedRecords,
        skippedRecords: overview.skippedRecords,
        missingFactorRecords: overview.missingFactorRecords,
        skippedReasons: overview.skippedReasons,
      });
    } catch {
      void trackActivityEvent({
        eventName: 'REPORT_GENERATION_FAILED',
        page: location.pathname,
        url: window.location.href,
        entityType: 'REPORT',
        metadata: {
          eventLabel: 'Report generation failed',
          reportScope,
          reportStatus: 'FAILED',
          friendlyError: 'Report generation failed: calculation summary could not be loaded.',
        },
      }).catch(() => {
        // Failure audit should not block the user-facing error.
      });
      setError(getUserFriendlyErrorMessage(null, 'reportGeneration'));
    } finally {
      if (inFlightRequestKeyRef.current === requestKey) {
        inFlightRequestKeyRef.current = null;
      }
      setLoading(false);
      endTiming();
    }
  }
  useEffect(() => {
    if (!dateRangeReady) return;
    loadReportData();
  }, [
    dateRangeReady,
    reloadKey,
    periodStart,
    periodEnd,
    reportScope,
    selectedRecordIds.join('|'),
    selectedDocumentIds.join('|'),
  ]);

  useEffect(() => {
    initializeDateRange();
    if (canViewWorkflowHistory) {
      void loadWorkflowEvents();
    }

    return () => {
      if (dateCommitTimerRef.current) {
        window.clearTimeout(dateCommitTimerRef.current);
      }
    };
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
    function refreshOrganizationProfile(event?: Event) {
      if (event instanceof CustomEvent && event.detail) {
        setOrganizationProfile(event.detail);
        return;
      }

      setOrganizationProfile(loadOrganizationProfile(getCurrentUser()));
    }

    window.addEventListener(ORGANIZATION_PROFILE_UPDATED_EVENT, refreshOrganizationProfile);
    window.addEventListener('storage', refreshOrganizationProfile);

    return () => {
      window.removeEventListener(ORGANIZATION_PROFILE_UPDATED_EVENT, refreshOrganizationProfile);
      window.removeEventListener('storage', refreshOrganizationProfile);
    };
  }, []);

  useEffect(() => {
    if (!hasBackendOrganizationProfileSession()) return;

    fetchOrganizationProfile(currentUser)
      .then(setOrganizationProfile)
      .catch(() => {
        setOrganizationProfile(loadOrganizationProfile(currentUser));
      });
  }, [currentUser?.id, currentWorkspaceId, currentUser?.email]);

  useEffect(() => {
    if (!isReviewPackageMenuOpen) return;

    function handleDocumentClick(event: MouseEvent) {
      const target = event.target as Node | null;
      if (target && reviewPackageMenuRef.current?.contains(target)) return;
      setIsReviewPackageMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsReviewPackageMenuOpen(false);
      }
    }

    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isReviewPackageMenuOpen]);

async function initializeDateRange() {
  try {
    const range = await loadDefaultMetricsDateRange();
    setPeriodStart(range.startDate);
    setPeriodEnd(range.endDate);
    setDraftPeriodStart(range.startDate);
    setDraftPeriodEnd(range.endDate);
  } catch {
    // Keep current-year fallback if activity records cannot be loaded.
  } finally {
    setDateRangeReady(true);
  }
}

function commitDateRange(nextStart = draftPeriodStart, nextEnd = draftPeriodEnd) {
  if (!isValidDateInput(nextStart) || !isValidDateInput(nextEnd)) return;
  if (nextStart > nextEnd) return;
  setPeriodStart(nextStart);
  setPeriodEnd(nextEnd);
}

function scheduleDateCommit(nextStart: string, nextEnd: string) {
  if (dateCommitTimerRef.current) {
    window.clearTimeout(dateCommitTimerRef.current);
  }

  if (!isValidDateInput(nextStart) || !isValidDateInput(nextEnd) || nextStart > nextEnd) {
    return;
  }

  dateCommitTimerRef.current = window.setTimeout(() => {
    commitDateRange(nextStart, nextEnd);
  }, 500);
}

function handleStartDateChange(value: string) {
  setDraftPeriodStart(value);
  scheduleDateCommit(value, draftPeriodEnd);
}

function handleEndDateChange(value: string) {
  setDraftPeriodEnd(value);
  scheduleDateCommit(draftPeriodStart, value);
}

function handleFullYear(year: string) {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  setDraftPeriodStart(start);
  setDraftPeriodEnd(end);
  commitDateRange(start, end);
}

function classifyScope(activityType?: string) {
  return formatScopeClassification(resolveScopeClassification({ activityType }).scope);
}

function getCalculationScopeResolution(item: CalculationAuditDetail) {
  return resolveScopeClassification({
    activityType: item.activityType,
    scopeOverride: item.scopeOverride,
    factorDefaultScope: item.factorDefaultScope,
    factorScope: item.factorScope,
  });
}

function hasAlbertaReportingContext(input: {
  inventoryBoundary: InventoryBoundary;
  calculationDetails: CalculationAuditDetail[];
  activities: ActivityItem[];
}) {
  const boundaryText = [
    input.inventoryBoundary.provinceOrTerritory,
    input.inventoryBoundary.geographicBoundary,
    input.inventoryBoundary.includedFacilitiesOrLocations,
  ].join(' ');

  if (/\balberta\b|\bab\b/i.test(boundaryText)) return true;

  return (
    input.calculationDetails.some((item) =>
      /\balberta\b|\bab\b/i.test(
        `${item.jurisdictionRegion ?? ''} ${item.jurisdiction ?? ''}`,
      ),
    ) ||
    input.activities.some((item) =>
      /\balberta\b|\bab\b/i.test(`${(item as any).jurisdictionRegion ?? ''} ${(item as any).jurisdiction ?? ''}`),
    )
  );
}

const scopeRows = useMemo(() => {
  return activities.map((item) => ({
    scope: classifyScope(item.activityType),
    activityType: getActivityTypeLabel(item.activityType),
    quantity: item.quantity,
    unit: formatReportUnit(item.unit),
    source: formatSourceType(item.sourceType, item.sourceFileName, item.sourceReference),
    reference: getDisplaySourceLabel(item),
  }));
}, [activities]);

  const scopeSummary = useMemo(() => {
  const summary = {
    'Scope 1': 0,
    'Scope 2': 0,
    'Scope 3': 0,
    Unclassified: 0,
  };

  calculationDetails.forEach((item) => {
    if (item.status !== 'CALCULATED') return;
    const emissions = Number(item.calculatedEmissionsKgCO2e ?? item.calculatedEmission ?? 0);
    if (!Number.isFinite(emissions)) return;
    const scope = getCalculationScopeResolution(item).scope;

    if (scope === 'TRACKED_METRIC') return;
    if (scope === 'UNCLASSIFIED') {
      summary.Unclassified += emissions;
      return;
    }

    summary[formatScopeClassification(scope)] += emissions;
  });

  return summary;
}, [calculationDetails]);

const unclassifiedCalculatedRecords = useMemo(
  () =>
    calculationDetails.filter(
      (item) =>
        item.status === 'CALCULATED' &&
        getCalculationScopeResolution(item).scope === 'UNCLASSIFIED',
    ),
  [calculationDetails],
);
const siteFacilityRollup = useMemo(
  () => buildSiteFacilityRollup(calculationDetails),
  [calculationDetails],
);
const siteFacilityBreakdownRows = siteFacilityRollup.rows;
const facilityThresholdReferenceRows = useMemo(
  () => buildFacilityThresholdReferenceRows(siteFacilityBreakdownRows),
  [siteFacilityBreakdownRows],
);

function downloadCsvFile(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

function getReviewPackageCsv(kind: ReviewPackageCsvKind) {
  switch (kind) {
    case 'data-records':
      return buildReviewPackageDataRecordsCsv(calculationDetails);
    case 'site-facility-breakdown':
      return buildReviewPackageSiteFacilityBreakdownCsv(
        siteFacilityBreakdownRows,
        calculationDetails,
      );
    case 'factor-source-summary':
      return buildReviewPackageFactorSourceSummaryCsv(conversionFactorsUsed);
    case 'calculation-traceability':
      return buildReviewPackageCalculationTraceabilityCsv(calculationDetails);
    case 'records-requiring-review':
      return buildReviewPackageRecordsRequiringReviewCsv(calculationDetails);
  }
}

function hasReviewPackageData(kind: ReviewPackageCsvKind) {
  if (kind === 'site-facility-breakdown') return siteFacilityBreakdownRows.length > 0;
  if (kind === 'factor-source-summary') return conversionFactorsUsed.length > 0;
  if (kind === 'records-requiring-review') {
    return calculationDetails.some(isRecordRequiringCorrection);
  }
  return calculationDetails.length > 0;
}

function handleExportReviewPackageCsv(kind: ReviewPackageCsvKind) {
  setIsReviewPackageMenuOpen(false);
  setError(null);

  if (!hasReviewPackageData(kind)) {
    setError(
      kind === 'records-requiring-review'
        ? 'No records currently require review.'
        : 'No records available to export.',
    );
    return;
  }

  const csv = getReviewPackageCsv(kind);
  downloadCsvFile(csv, getReviewPackageCsvFileName(kind));

  void trackActivityEvent({
    eventName: 'CSV_EXPORTED',
    page: location.pathname,
    url: window.location.href,
    entityType: 'REPORT',
    metadata: {
      exportKind: kind,
      exportedAt: new Date().toISOString(),
      exportStatus: 'EXPORTED',
      reportScope,
    },
  }).catch(() => {
    // Review package export should not be blocked by usage tracking.
  });
}

function handleDownloadCSV() {
  if (!hasReportOutput) return;

  const csv = buildPilotCsv(calculationDetails);
  downloadCsvFile(
    csv,
    `CarbonLite_Sample_Report_Export_v0.1_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`,
  );

  void trackActivityEvent({
    eventName: 'REPORT_EXPORTED_CSV',
    page: location.pathname,
    url: window.location.href,
    entityType: 'Report',
    metadata: {
      reportScope,
      recordsIncluded: reportCountSummary.processedRecords,
    },
  }).catch(() => {
    // Export should not be blocked by usage tracking.
  });
  void trackActivityEvent({
    eventName: 'CSV_EXPORTED',
    page: location.pathname,
    url: window.location.href,
    entityType: 'REPORT',
    metadata: {
      ...buildWorkflowReportSummary({
        calculationDetails,
        totalEstimatedEmissionsKgCO2e,
        countSummary,
        reportFormat: 'CSV',
        reportPeriod,
        reportScopeLabel,
      }),
      exportedRecords: calculationDetails.length,
      exportedAt: new Date().toISOString(),
      exportStatus: 'EXPORTED',
    },
  })
    .then(() => loadWorkflowEvents())
    .catch(() => {
      // CSV audit should not block export.
    });
}
 
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

function ensurePdfSpace(doc: jsPDF, y: number, requiredHeight = 50) {
  if (y + requiredHeight <= 276) return y;
  doc.addPage();
  return 18;
}

function drawPdfTextBlock(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth = 182,
  lineHeight = 4.5,
) {
  const lines = doc.splitTextToSize(formatPdfText(text), maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function formatPdfTableValue(value: unknown): unknown {
  if (typeof value === 'string' || typeof value === 'number') {
    return formatPdfText(value);
  }

  if (Array.isArray(value)) {
    return value.map(formatPdfTableValue);
  }

  return value;
}

function autoTablePdf(doc: jsPDF, options: Parameters<typeof autoTable>[1]) {
  autoTable(doc, {
    ...options,
    head: formatPdfTableValue(options.head) as typeof options.head,
    body: formatPdfTableValue(options.body) as typeof options.body,
    foot: formatPdfTableValue(options.foot) as typeof options.foot,
  });
}

function drawInventoryBoundaryPdfSection(
  doc: jsPDF,
  boundary: InventoryBoundary,
  startY: number,
) {
  const boundaryStatus = getInventoryBoundaryStatus(boundary);
  drawPdfSectionTitle(doc, 'Reporting Boundary', startY);
  autoTablePdf(doc, {
    startY: startY + 6,
    head: [['Boundary Field', 'Description']],
    body: [
      ['Configured reporting boundary', boundaryStatus],
      ['Organization / Workspace', formatBoundaryValue(boundary.organizationWorkspace)],
      ...(boundary.industry ? [['Industry', boundary.industry]] : []),
      ...(boundary.country ? [['Country', boundary.country]] : []),
      ...(boundary.provinceOrTerritory ? [['Province / Territory', boundary.provinceOrTerritory]] : []),
      ...(boundary.city ? [['City', boundary.city]] : []),
      ['Reporting period', formatBoundaryValue(boundary.reportingPeriod)],
      ['Geographic boundary', formatBoundaryValue(boundary.geographicBoundary)],
      ['Included facilities or locations', formatBoundaryValue(boundary.includedFacilitiesOrLocations)],
      ['Excluded facilities or locations', formatBoundaryValue(boundary.excludedFacilitiesOrLocations)],
      ['Included scopes', formatBoundaryValue(boundary.includedScopes)],
      ['Scope 3 coverage note', formatBoundaryValue(boundary.scope3CoverageNote)],
      ['Exclusions / limitations', formatBoundaryValue(boundary.exclusionsLimitations)],
      ['Boundary notes', formatBoundaryValue(boundary.boundaryNotes)],
      ['CarbonLite calculation coverage', CARBONLITE_CALCULATION_COVERAGE_LABEL],
      [
        'Coverage note',
        "This describes the activity categories CarbonLite currently calculates. It does not replace the organization's configured reporting boundary.",
      ],
    ],
    styles: { fontSize: 8, cellPadding: 1.8, valign: 'top' },
    headStyles: { fillColor: [4, 120, 87] },
    columnStyles: {
      0: { cellWidth: 54 },
      1: { cellWidth: 126 },
    },
  });

  return ((doc as any).lastAutoTable?.finalY ?? startY) + 8;
}

function drawRegulatoryReportingReferencePdfSection(
  doc: jsPDF,
  startY: number,
  regulatoryReportingSystems: string[],
) {
  const y = ensurePdfSpace(doc, startY, 58);
  drawPdfSectionTitle(doc, REGULATORY_REPORTING_REFERENCE_TITLE, y);
  autoTablePdf(doc, {
    startY: y + 6,
    head: [['Reference Note', 'Details']],
    body: [
      ['Purpose', REGULATORY_REPORTING_REFERENCE_TEXT],
      ['Relevant reporting systems may include', regulatoryReportingSystems.join('\n')],
      [
        'Important note',
        'Reference only. CarbonLite does not determine regulatory obligations. Consult a qualified professional before making regulatory filing or compliance decisions.',
      ],
    ],
    styles: { fontSize: 8, cellPadding: 1.8, valign: 'top' },
    headStyles: { fillColor: [71, 85, 105] },
    columnStyles: {
      0: { cellWidth: 54 },
      1: { cellWidth: 126 },
    },
  });

  return ((doc as any).lastAutoTable?.finalY ?? y) + 8;
}

function formatHotspotLevelForPdf(level: HotspotAnalysis['categoryHotspots'][number]['hotspotLevel']) {
  const labels = {
    HIGH: 'High',
    MEDIUM: 'Medium',
    LOW: 'Low',
  };

  return labels[level] ?? level;
}

function formatExcludedReasonForPdf(reason: HotspotAnalysis['excludedCategories'][number]['reason']) {
  const labels = {
    MISSING_FACTOR: 'Missing factor',
    INVALID_UNIT: 'Invalid unit',
    TRACKED_ONLY: 'Tracked operational metric, excluded from GHG total',
    NEEDS_REVIEW: 'Needs review',
    MISSING_JURISDICTION: 'Missing jurisdiction',
  };

  return labels[reason] ?? reason;
}

function drawEmissionsHotspotsPdfSection(
  doc: jsPDF,
  analysis: HotspotAnalysis,
  startY: number,
) {
  let y = ensurePdfSpace(doc, startY, 92);
  drawPdfSectionTitle(doc, 'Emissions Hotspots', y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  y = drawPdfTextBlock(
    doc,
    'This section highlights the activity categories contributing the largest share of calculated emissions. Hotspot analysis helps identify where the organization may want to focus first for review, data quality improvement, or reduction planning.',
    14,
    y + 7,
  ) + 2;
  y = drawPdfTextBlock(
    doc,
    'Hotspot analysis only includes records that were successfully calculated. Records requiring review, tracked-only metrics, missing factors, invalid units, or missing jurisdiction are excluded from hotspot totals and listed separately.',
    14,
    y,
  ) + 4;

  if (analysis.totalRecordCount <= 0) {
    y = ensurePdfSpace(doc, y, 20);
    doc.setTextColor(100, 116, 139);
    drawPdfTextBlock(
      doc,
      'Emissions hotspots are not available because no activity records were found.',
      14,
      y,
    );
    return y + 10;
  }

  if (!analysis.categoryHotspots.length || analysis.totalCalculatedEmissions <= 0) {
    y = ensurePdfSpace(doc, y, 24);
    doc.setTextColor(100, 116, 139);
    y = drawPdfTextBlock(
      doc,
      'Emissions hotspots are not available yet because no records could be calculated. Resolve calculation issues before using hotspot analysis.',
      14,
      y,
    ) + 4;
  } else {
    const top = analysis.categoryHotspots[0];
    const second = analysis.categoryHotspots[1];

    y = ensurePdfSpace(doc, y, 30);
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(14, y, 182, 25, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(6, 95, 70);
    doc.text(`Top Emissions Hotspot: ${top.displayName}`, 18, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(
      `${top.displayName} contributes ${formatDisplayNumber(top.percentageOfTotal)}% of calculated emissions. Focus first on this category because it represents the largest share of calculated emissions.`,
      18,
      y + 15,
      { maxWidth: 170 },
    );
    y += 32;

    if (second) {
      y = ensurePdfSpace(doc, y, 12);
      doc.setTextColor(71, 85, 105);
      y = drawPdfTextBlock(
        doc,
        `${top.displayName} and ${second.displayName} together represent ${formatDisplayNumber(top.percentageOfTotal + second.percentageOfTotal)}% of calculated emissions.`,
        14,
        y,
      ) + 3;
    }

    y = ensurePdfSpace(doc, y, 22 + analysis.categoryHotspots.slice(0, 5).length * 11);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('Top Emission Categories', 14, y);
    y += 8;

    analysis.categoryHotspots.slice(0, 5).forEach((row) => {
      y = ensurePdfSpace(doc, y, 12);
      const barWidth = Math.max(3, Math.min(86, row.percentageOfTotal * 0.86));
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(row.displayName, 14, y);
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(60, y - 4, 88, 5, 1.5, 1.5, 'F');
      doc.setFillColor(16, 185, 129);
      doc.roundedRect(60, y - 4, barWidth, 5, 1.5, 1.5, 'F');
      doc.setTextColor(15, 23, 42);
      doc.text(`${formatDisplayNumber(row.percentageOfTotal)}%`, 152, y);
      doc.text(formatPdfEmissionsWithUnit(row.emissions), 169, y);
      y += 10;
    });

    y += 2;
    y = ensurePdfSpace(doc, y, 42);
    autoTablePdf(doc, {
      startY: y,
      head: [['Rank', 'Category', 'Calculated Emissions', 'Share', 'Records', 'Hotspot Level', 'Focus Message']],
      body: analysis.categoryHotspots.map((row) => [
        row.rank,
        row.displayName,
        formatEmissionsWithUnit(row.emissions),
        `${formatDisplayNumber(row.percentageOfTotal)}%`,
        row.calculatedRecordCount,
        formatHotspotLevelForPdf(row.hotspotLevel),
        row.focusMessage,
      ]),
      styles: { fontSize: 6.5, cellPadding: 1.5 },
      headStyles: { fillColor: [15, 23, 42] },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 24 },
        2: { cellWidth: 27 },
        3: { cellWidth: 16 },
        4: { cellWidth: 14 },
        5: { cellWidth: 20 },
        6: { cellWidth: 70 },
      },
    });
    y = ((doc as any).lastAutoTable?.finalY ?? y) + 10;
  }

  if (analysis.focusRecommendations.length > 0) {
    y = ensurePdfSpace(doc, y, 34);
    autoTablePdf(doc, {
      startY: y,
      head: [['What to focus on first', 'Recommendation']],
      body: analysis.focusRecommendations.map((item) => [
        `${formatHotspotLevelForPdf(item.priority)} priority: ${item.title}`,
        item.message,
      ]),
      styles: { fontSize: 7, cellPadding: 1.6 },
      headStyles: { fillColor: [4, 120, 87] },
      columnStyles: {
        0: { cellWidth: 52 },
        1: { cellWidth: 130 },
      },
    });
    y = ((doc as any).lastAutoTable?.finalY ?? y) + 10;
  }

  if (analysis.excludedRecordCount > 0) {
    y = ensurePdfSpace(doc, y, 32);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(146, 64, 14);
    y = drawPdfTextBlock(
      doc,
      formatHotspotExclusionNote(analysis),
      14,
      y,
    ) + 3;
    const hasOnlyTrackedMetrics = analysis.excludedCategories.length > 0 &&
      analysis.excludedCategories.every((item) => item.reason === 'TRACKED_ONLY');
    autoTablePdf(doc, {
      startY: y,
      head: [hasOnlyTrackedMetrics
        ? ['Operational Metric', 'Treatment', 'Records']
        : ['Category', 'Treatment / Review Reason', 'Records']],
      body: analysis.excludedCategories.length
        ? analysis.excludedCategories.map((item) => [
            item.displayName,
            formatExcludedReasonForPdf(item.reason),
            item.excludedRecordCount,
          ])
        : [['Records requiring review', 'Needs review', analysis.excludedRecordCount]],
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [146, 64, 14] },
    });
    y = ((doc as any).lastAutoTable?.finalY ?? y) + 8;
  }

  return y;
}
const scopeNarrative = useMemo(() => {
  return buildScopeNarrative(scopeSummary);
}, [scopeSummary]);

function handleDownloadPDF() {
  if (!hasReportOutput) return;

  const doc = new jsPDF();
  const today = new Date().toISOString().slice(0, 10);
  const totalsByMetric = buildMetricsSummaryTableRows({
    usageTotals,
    totalEstimatedEmissionsKgCO2e,
    recordsIncluded: reportCountSummary.processedRecords,
  });
  const executiveSummary = buildReportExecutiveSummary({
    totalEstimatedEmissionsKgCO2e,
    countSummary: reportCountSummary,
    matchedActivityEmissions,
    calculationDetails,
  });
  const coverageCounts = getCalculationCoverageCounts(calculationDetails);
  const calculationCoverage =
    coverageCounts.eligibleEmissionBearingRecords > 0
      ? `${Math.round(
          (coverageCounts.calculatedRecords / coverageCounts.eligibleEmissionBearingRecords) *
            1000,
        ) / 10}%`
      : '0%';
  const hotspotAnalysis = buildHotspotAnalysis(calculationDetails);
  const primarySkippedReasons = buildPrimarySkippedReasonSummary(calculationDetails, reportCountSummary);
  drawReportPdfCover(doc, {
    organizationName,
    reportPeriod,
    reportScopeLabel,
    generatedDate: today,
  });

  doc.addPage();
  let nextY = drawInventoryBoundaryPdfSection(doc, inventoryBoundary, 18);

  nextY = ensurePdfSpace(doc, nextY + 4, 48);
  drawPdfSectionTitle(doc, 'Executive Summary', nextY);
  autoTablePdf(doc, {
    startY: nextY + 6,
    head: [['Executive Summary', 'Value']],
    body: [
      ['Estimated Emissions', executiveSummary.estimatedEmissions],
      ['Records Included in GHG Total', executiveSummary.recordsIncluded],
      ['Tracked Operational Metrics', executiveSummary.trackedMetrics],
      ['Imported Records Requiring Review', executiveSummary.recordsRequiringReview],
      ['Primary Activity Types', executiveSummary.primaryActivityTypes],
      ['Missing Factor Count', primarySkippedReasons.missingFactor],
      ['Calculation Coverage', executiveSummary.dataQualityCoverage],
    ],
  });

  nextY = (doc as any).lastAutoTable.finalY + 12;
  nextY = drawEmissionsHotspotsPdfSection(doc, hotspotAnalysis, nextY);

  nextY = ensurePdfSpace(doc, nextY, 52);
  drawPdfSectionTitle(doc, 'Calculation Quality Summary', nextY);
  autoTablePdf(doc, {
    startY: nextY + 6,
    head: [['Quality Measure', 'Value']],
    body: [
      ['Imported Report Records', reportCountSummary.totalRecordsFound],
      ['Records Calculated', reportCountSummary.processedRecords],
      ['Tracked Operational Metrics', primarySkippedReasons.trackedOnly],
      ['Imported Records Requiring Review', executiveSummary.recordsRequiringReview],
      ['Missing Factors', primarySkippedReasons.missingFactor],
      ['Missing Jurisdiction', primarySkippedReasons.missingJurisdiction],
      ['Invalid Unit', primarySkippedReasons.invalidUnit],
      ['Review Reasons', formatReviewReasons(primarySkippedReasons)],
      [
        'Calculation Coverage',
        calculationCoverage,
      ],
    ],
  });

  nextY = (doc as any).lastAutoTable.finalY + 12;
  drawPdfSectionTitle(doc, 'Source Dataset Review Status', nextY);
  autoTablePdf(doc, {
    startY: nextY + 6,
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    head: [['Source Review Measure', 'Value']],
    body: [
      ['Source Files', formatSourceReviewFiles(sourceReviewSummary)],
      ['Reviewable Source Rows', sourceReviewSummary.available ? sourceReviewSummary.totalRows : 'Not available'],
      ['Rows Resolved / Imported', sourceReviewSummary.available ? `${sourceReviewSummary.resolvedCount} of ${sourceReviewSummary.totalRows}` : 'Not available'],
      ['Ready Emissions Rows', sourceReviewSummary.available ? sourceReviewSummary.readyCount : 'Not available'],
      ['Tracked Operational Rows', sourceReviewSummary.available ? sourceReviewSummary.trackedOnlyCount : 'Not available'],
      ['Source Rows Still Requiring Review', sourceReviewSummary.available ? sourceReviewSummary.needsReviewCount : 'Not available'],
      ['Source Dataset Resolution', formatSourceReviewStatus(sourceReviewSummary)],
    ],
    styles: { fontSize: 8, cellPadding: 1.8, valign: 'top' },
    headStyles: { fillColor: [71, 85, 105] },
    columnStyles: {
      0: { cellWidth: 58 },
      1: { cellWidth: 122 },
    },
  });

  nextY = (doc as any).lastAutoTable.finalY + 12;
  drawPdfSectionTitle(doc, 'Data Quality Notes', nextY);
  autoTablePdf(doc, {
    startY: nextY + 6,
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    head: [['Readiness Signal', 'Value']],
    body: [
      ['Emissions Workflow Readiness', `${formatDisplayNumber(dataReadinessSummary.score)}% (${dataReadinessSummary.level})`],
      [
        'Optional Data Completeness',
        `${formatDisplayNumber(dataReadinessSummary.optionalDataCompleteness.score)}% · ${formatOptionalDataCompletenessDetail(dataReadinessSummary)}`,
      ],
      ['Calculated Records', dataReadinessSummary.recordsReadyForCalculation],
      ['Imported Records Requiring Review', dataReadinessSummary.recordsRequiringReview],
      ['Source Rows Still Requiring Review', sourceReviewSummary.available ? sourceReviewSummary.needsReviewCount : 'Not available'],
      ['Tracked Operational Metrics', dataReadinessSummary.trackedOnlyCount],
      ['Missing Factors', dataReadinessSummary.missingFactorCount],
      ['Missing Jurisdiction', dataReadinessSummary.missingJurisdictionCount],
      [
        'Calculation Coverage Meaning',
        `Calculated emission-bearing records divided by eligible emission-bearing records. ${coverageCounts.calculatedRecords} of ${coverageCounts.eligibleEmissionBearingRecords} eligible emission-bearing records were calculated as GHG emissions records; ${primarySkippedReasons.trackedOnly} record${primarySkippedReasons.trackedOnly === 1 ? ' was' : 's were'} tracked as operational ${primarySkippedReasons.trackedOnly === 1 ? 'metric' : 'metrics'} and excluded from the denominator.`,
      ],
      [
        'Emissions Workflow Readiness Meaning',
        'Percentage of draft or imported records that are complete enough to calculate, trace, and report without manual correction. Optional metadata such as cost is reported separately and does not reduce this score.',
      ],
      [
        'Coverage vs Readiness',
        'Calculation Coverage and Emissions Workflow Readiness may differ. Tracked-only operational metrics are retained for review but excluded from the calculated GHG emissions total and Calculation Coverage denominator by design.',
      ],
    ],
    styles: { fontSize: 8, cellPadding: 1.8, valign: 'top' },
    headStyles: { fillColor: [71, 85, 105] },
    columnStyles: {
      0: { cellWidth: 58 },
      1: { cellWidth: 122 },
    },
  });

  nextY = (doc as any).lastAutoTable.finalY + 12;
  if (nextY > 235) {
    doc.addPage();
    nextY = 18;
  }
  drawPdfSectionTitle(doc, 'Emissions Breakdown', nextY);
  autoTablePdf(doc, {
    startY: nextY + 6,
    head: [['Category', 'Metric Type', 'Unit', 'Total']],
    body: totalsByMetric.map((item) => [
      item.category === 'calculated' ? 'Calculated Result' : 'Input Data',
      item.metricType,
      item.unit,
      item.totalValue,
    ]),
  });

  nextY = (doc as any).lastAutoTable.finalY + 14;
  drawPdfSectionTitle(doc, 'Emissions by Scope', nextY);
  autoTablePdf(doc, {
    startY: nextY + 6,
    head: [['Scope', 'Description', 'Calculated Emissions', 'Share of Total']],
    body: [
      ...(['Scope 1', 'Scope 2', 'Scope 3'] as const).map((scope) => {
      const emissions = scopeSummary[scope] ?? 0;
      const share = totalEstimatedEmissionsKgCO2e > 0 ? (emissions / totalEstimatedEmissionsKgCO2e) * 100 : 0;
      return [
        scope,
        getScopeDescription(scope),
        formatEmissionsWithUnit(emissions),
        `${formatDisplayNumber(share)}%`,
      ];
      }),
      ...(scopeSummary.Unclassified > 0
        ? [[
            'Unclassified',
            'Calculated records requiring scope review',
            formatEmissionsWithUnit(scopeSummary.Unclassified),
            `${
              totalEstimatedEmissionsKgCO2e > 0
                ? formatDisplayNumber((scopeSummary.Unclassified / totalEstimatedEmissionsKgCO2e) * 100)
                : '0'
            }%`,
          ]]
        : []),
    ],
  });

  nextY = (doc as any).lastAutoTable.finalY + 14;
  drawPdfSectionTitle(doc, 'Emissions by Site / Facility', nextY);
  autoTablePdf(doc, {
    startY: nextY + 6,
    head: [['Site / Facility', 'Scope 1', 'Scope 2', 'Scope 3', 'Total', 'Included Records', 'Activity Type Breakdown']],
    body: siteFacilityBreakdownRows.length
      ? siteFacilityBreakdownRows.map((row) => [
          row.siteFacility,
          formatEmissionsWithUnit(row.scope1KgCO2e),
          formatEmissionsWithUnit(row.scope2KgCO2e),
          formatEmissionsWithUnit(row.scope3KgCO2e),
          formatEmissionsWithUnit(row.totalKgCO2e),
          row.includedRecords,
          formatSiteFacilityActivityBreakdown(row),
        ])
      : [['No calculated GHG records with site or facility totals.', '', '', '', '', '', '']],
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
  });

  if (facilityThresholdReferenceRows.length > 0) {
    nextY = (doc as any).lastAutoTable.finalY + 14;
    drawPdfSectionTitle(doc, 'Facility-Level Reporting Threshold Reference', nextY);
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(
      [
        formatPdfText(`Canada / federal context: ${formatDisplayNumber(FACILITY_REPORTING_THRESHOLD_TCO2E)} t CO₂e/year per facility is shown as a general screening reference only.`),
        formatPdfText(`Alberta only: ${formatDisplayNumber(ALBERTA_TIER_LARGE_EMITTER_THRESHOLD_TCO2E)} t CO₂e/year per facility is used only when a facility row has Alberta jurisdiction.`),
        FACILITY_THRESHOLD_REFERENCE_DISCLAIMER,
      ],
      14,
      nextY + 7,
      { maxWidth: 182 },
    );
    autoTablePdf(doc, {
      startY: nextY + 24,
      head: [['Site / Facility', 'Jurisdiction', 'Regulatory Reference', 'Threshold', 'Total Calculated Emissions', 'Status', 'Screening Note']],
      body: facilityThresholdReferenceRows.map((row) => [
        row.siteFacility,
        row.jurisdictionLabel,
        row.regulatoryReference,
        row.thresholdLabel,
        `${formatEmissionsWithUnit(row.totalKgCO2e)} (${formatThresholdTonnes(row.totalTCO2e)} t CO₂e)`,
        row.status,
        row.screeningNote,
      ]),
      rowPageBreak: 'avoid',
      showHead: 'everyPage',
    });
  }

  const activityStartY = (doc as any).lastAutoTable.finalY + 14;
  drawPdfSectionTitle(doc, 'Activity Breakdown', activityStartY);
  autoTablePdf(doc, {
    startY: activityStartY + 6,
    head: [['Activity Type', 'Quantity', 'Unit', 'Activity Jurisdiction', 'Estimated Emissions', 'Scope', 'Source Reference']],
    body: matchedActivityEmissions.length
      ? matchedActivityEmissions.map((item) => [
          getActivityTypeLabel(item.activityType),
          formatDisplayNumber(item.quantity),
          item.unit,
          formatReportJurisdiction(item.jurisdictionRegion ?? item.jurisdiction, item.jurisdictionCountry),
          formatEmissionsWithUnit(item.estimatedEmissionsKgCO2e),
          classifyScope(item.activityType),
          getDisplaySourceLabel(item),
        ])
      : [['No activity records with matching conversion factors.', '', '', '', '', '', '']],
  });

  nextY = (doc as any).lastAutoTable?.finalY ?? 115;
  if (nextY > 230) {
    doc.addPage();
    nextY = 18;
  }

  drawPdfSectionTitle(doc, 'Emission Factors Summary', nextY + 10);
  autoTablePdf(doc, {
    startY: nextY + 16,
    head: [[
      'Factor',
      'Value',
      'Unit',
      'Jurisdiction',
      'Source Year',
      'Verification',
      'Used Records',
    ]],
    body: conversionFactorsUsed.length
      ? conversionFactorsUsed.map((factor) => [
          getFactorDisplayName(factor.factorName) || getActivityTypeLabel(factor.activityType) || 'Factor not specified',
          formatFactorValue(factor.factorValue),
          formatReportFactorUnit(factor.resultUnit, factor.inputUnit),
          factor.jurisdiction || 'Not specified',
          factor.factorYear || factor.sourceYear || 'Not specified',
          formatReportFactorSummaryVerification(factor),
          factor.usedRecordsCount ?? 1,
        ])
      : [['No conversion factors found for this report scope.', '', '', '', '', '', '']],
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    styles: { fontSize: 7.8, cellPadding: 1.8 },
    headStyles: { fillColor: [15, 23, 42] },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 14 },
      2: { cellWidth: 22 },
      3: { cellWidth: 34 },
      4: { cellWidth: 18 },
      5: { cellWidth: 38 },
      6: { cellWidth: 16 },
    },
  });

  nextY = (doc as any).lastAutoTable?.finalY ?? 170;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  nextY = drawPdfTextBlock(
    doc,
    'Detailed source, version, confidence level, and assumptions are provided in the Factor Details / Assumptions section below.',
    14,
    nextY + 5,
    178,
    4,
  );
  if (conversionFactorsUsed.length > 0) {
    nextY += 10;
    if (nextY > 235) {
      doc.addPage();
      nextY = 20;
    }
    drawPdfSectionTitle(doc, 'Factor Details / Assumptions', nextY);
    nextY += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(51, 65, 85);

    conversionFactorsUsed.forEach((factor) => {
      nextY = ensurePdfSpace(doc, nextY, 31);
      const factorName = getFactorDisplayName(factor.factorName) || getActivityTypeLabel(factor.activityType) || 'Factor not specified';
      const factorText = [
        `Factor: ${factorName}`,
        `Value: ${formatFactorValue(factor.factorValue)} ${formatReportFactorUnit(factor.resultUnit, factor.inputUnit)}`,
        `Source: ${formatReportFactorSource(factor)}`,
        `Version: ${formatReportFactorVersion(factor)}`,
        `Verification: ${formatReportVerification(factor)}`,
        `Confidence: ${formatCredibilityLabel(factor.confidenceLevel) || 'Not specified'}`,
        `Assumption: ${formatReportAssumptions(factor)}`,
      ].join('\n');
      nextY = drawPdfTextBlock(doc, factorText, 14, nextY, 178, 4.1) + 5;
    });
  }

  nextY = ensurePdfSpace(doc, nextY, 58);

  drawPdfSectionTitle(doc, 'Calculation Traceability', nextY + 10);
  autoTablePdf(doc, {
    startY: nextY + 16,
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    head: [[
      'Activity',
      'Quantity',
      'Factor Used',
      'Calculation',
      'Scope',
      'Status',
      'Review Note',
    ]],
    body: calculationDetails.length
      ? calculationDetails.map((item) => [
          getActivityTypeLabel(item.activityType),
          `${formatDisplayNumber(item.activityQuantity)} ${formatReportUnit(item.activityUnit, item)}`,
          formatTraceableFactor(item),
          buildCalculatedFormula(item),
          formatScopeClassification(getCalculationScopeResolution(item).scope),
          formatCalculationStatus(item.status),
          formatTraceabilityReviewNote(item),
        ])
      : [['No calculation details available.', '', '', '', '', '', '']],
    styles: { fontSize: 7.2, cellPadding: 1.7 },
    headStyles: { fillColor: [15, 23, 42] },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 22 },
      2: { cellWidth: 26 },
      3: { cellWidth: 40 },
      4: { cellWidth: 17 },
      5: { cellWidth: 18 },
      6: { cellWidth: 37 },
    },
  });

  nextY = (doc as any).lastAutoTable?.finalY ?? 170;
  if (nextY > 230) {
    doc.addPage();
    nextY = 20;
  }

  const sourceEvidenceSummaryRows = buildSourceEvidenceSummaryRows(sourceEvidenceRows);
  const sourceEvidenceTrackedCount = sourceEvidenceSummaryRows.reduce(
    (total, item) => total + item.trackedMetrics,
    0,
  );

  drawPdfSectionTitle(doc, 'Source Evidence Summary', nextY + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(71, 85, 105);
  nextY = drawPdfTextBlock(
    doc,
    'This section summarizes the source files and import methods used to create the activity records included in this pilot report. Detailed record-level source evidence is provided in the appendix.',
    14,
    nextY + 18,
    180,
    4.1,
  );

  autoTablePdf(doc, {
    startY: nextY + 4,
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    head: [[
      'Source File',
      'Source Type',
      'Import Method',
      'Record-Level References',
      'Included GHG Records',
      'Tracked Metrics',
      'Imported Review Records',
    ]],
    body: sourceEvidenceSummaryRows.length
      ? sourceEvidenceSummaryRows.map((item) => [
          item.sourceFile,
          item.sourceType,
          item.importMethod,
          item.sourceReference,
          item.includedRecords,
          item.trackedMetrics,
          item.recordsRequiringReview,
        ])
      : [['No source evidence available.', '', '', '', '', '', '']],
    styles: { fontSize: 7.2, cellPadding: 1.7 },
    headStyles: { fillColor: [15, 23, 42] },
    columnStyles: {
      0: { cellWidth: 34 },
      1: { cellWidth: 28 },
      2: { cellWidth: 28 },
      3: { cellWidth: 34 },
      4: { cellWidth: 20 },
      5: { cellWidth: 18 },
      6: { cellWidth: 18 },
    },
  });

  nextY = (doc as any).lastAutoTable?.finalY ?? 170;
  if (sourceEvidenceTrackedCount > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    nextY = drawPdfTextBlock(
      doc,
      'Water is tracked as an operational metric and excluded from GHG emissions totals unless a reviewed water emissions factor is provided.',
      14,
      nextY + 5,
      178,
      4,
    );
  }
  if (nextY > 230) {
    doc.addPage();
    nextY = 20;
  }

  const sourceFiles = Array.from(
    new Set(sourceEvidenceRows.map((item) => item.sourceFile).filter(Boolean)),
  );
  drawPdfSectionTitle(doc, 'Workflow History Summary', nextY + 10);
  autoTablePdf(doc, {
    startY: nextY + 18,
    head: [['Workflow Step', 'Summary']],
    body: [
      [
        'File uploaded',
        sourceFiles.length
          ? sourceFiles.join(', ')
          : 'Source evidence requires review. The original file or source reference was not available.',
      ],
      [
        'Records imported',
        `${reportCountSummary.processedRecords} included emissions records, ${calculationDetails.filter(isTrackedMetricDetail).length} tracked metric, ${calculationDetails.filter(isRecordRequiringCorrection).length} imported records requiring review.`,
      ],
      [
        'Report generated',
        `${formatEmissionsWithUnit(totalEstimatedEmissionsKgCO2e)} total for ${reportPeriod}.`,
      ],
    ],
    styles: { fontSize: 7.2, cellPadding: 1.7 },
    headStyles: { fillColor: [71, 85, 105] },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 138 },
    },
  });

  nextY = (doc as any).lastAutoTable?.finalY ?? 170;
  if (nextY > 230) {
    doc.addPage();
    nextY = 20;
  }

  doc.setFontSize(14);
  doc.text('Imported Records Requiring Review', 14, nextY + 10);
  const reviewRows = calculationDetails.filter(isRecordRequiringCorrection);
  const trackedMetricRows = calculationDetails.filter(isTrackedMetricDetail);
  autoTablePdf(doc, {
    startY: nextY + 18,
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    head: [['Activity', 'Quantity', 'Unit', 'Issue Type', 'Issue Message', 'Source Reference', 'Action']],
    body: reviewRows.length
      ? reviewRows.map((item) => [
          getActivityTypeLabel(item.activityType),
          formatDisplayNumber(item.activityQuantity),
          formatReportUnit(item.activityUnit, item),
          formatCalculationStatus(item.status),
          item.matchingMessage || item.reason || 'Review this record before calculation.',
          formatRecordSource(item),
          item.status === 'MISSING_FACTOR' ? 'Create factor' : 'Fix record',
        ])
      : [['No imported activity records require review for this report scope.', '', '', '', '', '', '']],
    styles: { fontSize: 6.5, cellPadding: 1.5 },
    headStyles: { fillColor: [15, 23, 42] },
  });

  nextY = (doc as any).lastAutoTable?.finalY ?? 170;
  if (trackedMetricRows.length) {
    if (nextY > 230) {
      doc.addPage();
      nextY = 20;
    }

    doc.setFontSize(12);
    doc.text('Tracked Metrics', 14, nextY + 10);
    autoTablePdf(doc, {
      startY: nextY + 18,
      rowPageBreak: 'avoid',
      showHead: 'everyPage',
      head: [['Activity', 'Quantity', 'Unit', 'Status', 'Message', 'Source Reference', 'Action']],
      body: trackedMetricRows.map((item) => [
        getActivityTypeLabel(item.activityType),
        formatDisplayNumber(item.activityQuantity),
        formatReportUnit(item.activityUnit, item),
        'Tracked Metric',
        getTrackedMetricMessage(item),
        formatRecordSource(item),
        getTrackedMetricAction(),
      ]),
      styles: { fontSize: 6.5, cellPadding: 1.5 },
      headStyles: { fillColor: [15, 23, 42] },
    });
  }

  nextY = (doc as any).lastAutoTable?.finalY ?? 170;
  if (nextY > 230) {
    doc.addPage();
    nextY = 20;
  }

  nextY = drawRegulatoryReportingReferencePdfSection(doc, nextY + 10, regulatoryReportingSystems);
  nextY = ensurePdfSpace(doc, nextY, 42);

  drawPdfSectionTitle(doc, 'Methodology and Limitations', nextY + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  nextY += 18;
  FORMAL_REPORT_METHODOLOGY.forEach((paragraph) => {
    nextY = ensurePdfSpace(doc, nextY, 18);
    nextY = drawPdfTextBlock(doc, paragraph, 14, nextY, 180, 4.4) + 5;
  });

  doc.addPage('landscape');
  nextY = 18;
  drawPdfSectionTitle(doc, 'Appendix A: Imported Record-Level Source Evidence', nextY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(71, 85, 105);
  nextY = drawPdfTextBlock(
    doc,
    'Detailed record-level source evidence retained for imported activity records in this report scope. The main report body summarizes this information by source file.',
    14,
    nextY + 8,
    268,
    4.1,
  );
  autoTablePdf(doc, {
    startY: nextY + 4,
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    head: [[
      'Activity Type',
      'Quantity',
      'Unit',
      'Date',
      'Source File',
      'Source Type',
      'Import Method',
      'Source Reference',
      'Status',
      'Treatment',
      'Review Note',
    ]],
    body: sourceEvidenceRows.length
      ? sourceEvidenceRows.map((item) => [
          getActivityTypeLabel(item.activityType),
          item.quantity,
          item.unit,
          item.recordDate,
          item.sourceFile,
          item.sourceType,
          item.importMethod,
          item.sourceReference,
          item.matchingStatus,
          item.reportTreatment,
          item.notes,
        ])
      : [['No source evidence available.', '', '', '', '', '', '', '', '', '', '']],
    styles: { fontSize: 7, cellPadding: 1.5, valign: 'top' },
    headStyles: { fillColor: [15, 23, 42] },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 16 },
      2: { cellWidth: 11 },
      3: { cellWidth: 16 },
      4: { cellWidth: 36 },
      5: { cellWidth: 25 },
      6: { cellWidth: 25 },
      7: { cellWidth: 40 },
      8: { cellWidth: 20 },
      9: { cellWidth: 22 },
      10: { cellWidth: 36 },
    },
  });

  nextY = (doc as any).lastAutoTable?.finalY ?? 170;
  if (nextY > 165) {
    doc.addPage('landscape');
    nextY = 18;
  } else {
    nextY += 14;
  }

  drawPdfSectionTitle(doc, 'Appendix B: Source Rows Requiring Review', nextY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(71, 85, 105);
  nextY = drawPdfTextBlock(
    doc,
    'Source spreadsheet rows that remained unresolved after import review. These rows are not included in ActivityData or the GHG emissions total until corrected and imported.',
    14,
    nextY + 8,
    268,
    4.1,
  );
  autoTablePdf(doc, {
    startY: nextY + 4,
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    head: [[
      'Source Reference',
      'Source Row',
      'Activity',
      'Quantity',
      'Unit',
      'Jurisdiction',
      'Issue Type',
      'Issue',
      'Action',
    ]],
    body: sourceReviewSummary.available
      ? sourceReviewSummary.needsReviewRows.length
        ? sourceReviewSummary.needsReviewRows.map((row) => [
            row.sourceReference || row.rowId || 'Source row',
            row.sourceRow ?? '',
            getActivityTypeLabel(row.activityType || row.rawActivityType || 'UNKNOWN'),
            row.quantity ?? row.rawQuantity ?? '',
            formatReportUnit(row.unit || ''),
            formatReviewRowJurisdiction(row),
            formatSourceReviewIssueType(row),
            formatSourceReviewIssue(row),
            formatSourceReviewAction(row),
          ])
        : [['No source rows require review for this report scope.', '', '', '', '', '', '', '', '']]
      : [['Source dataset review status is not available for this report scope.', '', '', '', '', '', '', '', '']],
    styles: { fontSize: 6.6, cellPadding: 1.4, valign: 'top' },
    headStyles: { fillColor: [146, 64, 14] },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 18 },
      2: { cellWidth: 30 },
      3: { cellWidth: 20 },
      4: { cellWidth: 18 },
      5: { cellWidth: 28 },
      6: { cellWidth: 30 },
      7: { cellWidth: 58 },
      8: { cellWidth: 44 },
    },
  });

  if (includeCarbonCreditReadinessNotes) {
    doc.addPage('portrait');
    nextY = 20;

    drawPdfSectionTitle(doc, 'Optional Appendix: Carbon Credit Readiness Screening Notes', nextY + 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    nextY = drawPdfTextBlock(
      doc,
      'This optional section is an early screening note only. It is not a certification, verification, eligibility determination, or compliance assessment. CarbonLite does not determine carbon credit eligibility, certify emissions reductions, provide third-party verification, or replace professional advice.',
      14,
      nextY + 18,
      180,
      4.3,
    ) + 4;
    autoTablePdf(doc, {
      startY: nextY,
      head: [['Readiness Signal', 'Value']],
      body: [
        ['Readiness Level', formatCarbonCreditReadinessLevel(carbonCreditReadiness.readinessLevel)],
        ['Readiness Score', `${carbonCreditReadiness.score}/100`],
        [
          'Reduction Detected',
          carbonCreditReadiness.reductionAmount !== null && carbonCreditReadiness.reductionPercentage !== null
            ? `${formatEmissionsWithUnit(carbonCreditReadiness.reductionAmount)} (${formatDisplayNumber(carbonCreditReadiness.reductionPercentage)}%)`
            : 'Not assessed or not detected',
        ],
        ['Baseline Data', carbonCreditReadiness.checklist.find((item) => item.key === 'baseline-data')?.status ?? 'Not assessed'],
        ['Records Requiring Review', dataReadinessSummary.recordsRequiringReview],
        ['Tracked Operational Metrics', dataReadinessSummary.trackedOnlyCount],
        ['Disclaimer', CARBON_CREDIT_READINESS_DISCLAIMER],
      ],
      styles: { fontSize: 7.2, cellPadding: 1.7 },
      headStyles: { fillColor: [71, 85, 105] },
      columnStyles: {
        0: { cellWidth: 46 },
        1: { cellWidth: 134 },
      },
    });
  }

  doc.save(`carbonlite-pilot-data-readiness-report-${today}.pdf`);
  void createClientAuditLog({
    action: 'EXPORT_PDF',
    entityType: 'Report',
    description: `Exported PDF report for ${reportScopeLabel}`,
    page: location.pathname,
  }).catch(() => {
    // PDF export should not be blocked by audit logging.
  });
  void trackActivityEvent({
    eventName: 'REPORT_EXPORTED_PDF',
    page: location.pathname,
    url: window.location.href,
    entityType: 'Report',
    metadata: {
      reportScope,
      recordsIncluded: reportCountSummary.processedRecords,
    },
  }).catch(() => {
    // PDF export should not be blocked by usage tracking.
  });
  void trackActivityEvent({
    eventName: 'PDF_EXPORTED',
    page: location.pathname,
    url: window.location.href,
    entityType: 'REPORT',
    metadata: buildWorkflowReportSummary({
      calculationDetails,
      totalEstimatedEmissionsKgCO2e,
      countSummary,
      reportFormat: 'PDF',
      eventLabel: 'PDF report generated',
      exportStatus: 'EXPORTED',
      reportPeriod,
      reportScopeLabel,
    }),
  })
    .then(() => loadWorkflowEvents())
    .catch(() => {
      // PDF audit should not block export.
    });
  track('REPORT_PDF_EXPORTED', {
    reportType: 'emissions',
    reportScope,
    recordCount: reportCountSummary.processedRecords,
  });
}

function drawReportPdfCover(
  doc: jsPDF,
  input: {
    organizationName: string;
    reportPeriod: string;
    reportScopeLabel: string;
    generatedDate: string;
  },
) {
  const x = 24;
  const y = 24;

  doc.setFillColor(6, 78, 59);
  doc.roundedRect(x, y, 14, 14, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('CL', x + 3.6, y + 9);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(16);
  doc.text('CarbonLite', x + 19, y + 6);

  doc.setFontSize(9);
  doc.setTextColor(4, 120, 87);
  doc.text('Pilot reporting workflow', x + 19, y + 12);

  doc.setDrawColor(203, 213, 225);
  doc.line(x, y + 28, 186, y + 28);

  doc.setFontSize(25);
  doc.setTextColor(15, 23, 42);
  doc.text('Pilot Emissions Data Readiness Report', x, y + 62, { maxWidth: 166 });

  doc.setFontSize(16);
  doc.setTextColor(4, 120, 87);
  doc.text(input.organizationName || 'Workspace', x, y + 78);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`Reporting period: ${input.reportPeriod}`, x, y + 102);
  doc.text(`Report scope: ${input.reportScopeLabel}`, x, y + 112);
  doc.text(`Generated date: ${input.generatedDate}`, x, y + 122);
  doc.text('Prepared by: CarbonLite', x, y + 132);

  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Prepared for review as part of a pilot emissions data readiness and reporting workflow.',
    x,
    270,
  );
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
}

function drawPdfSectionTitle(doc: jsPDF, title: string, y: number) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(title, 14, y);
  doc.setDrawColor(16, 185, 129);
  doc.line(14, y + 2, 52, y + 2);
}
function getScopeDescription(scope: string) {
  if (scope === 'Scope 1') return 'Direct fuel emissions';
  if (scope === 'Scope 2') return 'Purchased electricity';
  if (scope === 'Scope 3') return 'Selected Scope 3 pilot estimates';
  return 'Unclassified';
}

function getReportScopeLabel(
  reportScope: 'dateRange' | 'selectedDocuments' | 'selectedRecords',
  selectedRecordCount: number,
  selectedDocumentCount: number,
) {
  if (reportScope === 'selectedRecords') {
    return `Selected Records (${selectedRecordCount})`;
  }

  if (reportScope === 'selectedDocuments') {
    return `Selected Documents (${selectedDocumentCount})`;
  }

  return 'Date Range';
}

function isValidDateInput(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getDefaultFallbackStartDate() {
  return `${new Date().getFullYear() - 1}-01-01`;
}

function getFullYearShortcutYears() {
  const currentYear = new Date().getFullYear();
  return [String(currentYear - 1), String(currentYear)];
}

function buildWorkflowReportSummary(input: {
  calculationDetails: CalculationAuditDetail[];
  totalEstimatedEmissionsKgCO2e: number;
  countSummary: {
    totalRecordsFound: number;
    recordsInScope?: number;
    processedRecords: number;
    skippedRecords: number;
    missingFactorRecords: number;
    skippedReasons?: any;
  };
  reportFormat: string;
  reportPeriod: string;
  reportScopeLabel: string;
}) {
  const reportCounts = buildReportCountSummary(input.countSummary, input.calculationDetails);
  const scopeTotals = {
    scope1KgCO2e: 0,
    scope2KgCO2e: 0,
    scope3KgCO2e: 0,
  };

  input.calculationDetails.forEach((detail) => {
    if (detail.status !== 'CALCULATED') return;
    const emissions = Number(detail.calculatedEmissionsKgCO2e ?? detail.calculatedEmission ?? 0);
    if (!Number.isFinite(emissions)) return;
    const scope = resolveScopeClassification({
      activityType: detail.activityType,
      scopeOverride: detail.scopeOverride,
      factorDefaultScope: detail.factorDefaultScope,
      factorScope: detail.factorScope,
    }).scope;

    if (scope === 'SCOPE_1') scopeTotals.scope1KgCO2e += emissions;
    if (scope === 'SCOPE_2') scopeTotals.scope2KgCO2e += emissions;
    if (scope === 'SCOPE_3') scopeTotals.scope3KgCO2e += emissions;
  });

  return {
    reportName: 'CarbonLite Pilot Emissions Data Readiness Report',
    reportPeriod: input.reportPeriod,
    reportScope: input.reportScopeLabel,
    reportFormat: input.reportFormat,
    totalKgCO2e: input.totalEstimatedEmissionsKgCO2e,
    ...scopeTotals,
    includedRecords: reportCounts.processedRecords,
    trackedMetrics: input.calculationDetails.filter(isTrackedMetricDetail).length,
    recordsRequiringReview: input.calculationDetails.filter(isRecordRequiringCorrection).length,
    reportStatus: 'GENERATED',
    generatedAt: new Date().toISOString(),
  };
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
  const sourceFile = String(metadata.sourceFileName ?? metadata.entityDisplayName ?? '').trim();
  const reportName = String(metadata.reportName ?? metadata.entityDisplayName ?? '').trim();
  const countLabel = (count: unknown, singular: string, plural = `${singular}s`) => {
    const numericCount = Number(count ?? 0);
    const displayCount = Number.isFinite(numericCount) ? numericCount : 0;
    return `${displayCount} ${displayCount === 1 ? singular : plural}`;
  };

  if (event.eventName === 'FILE_UPLOADED') {
    return `${sourceFile || 'Source file'} uploaded as ${metadata.sourceType || 'Source Review Required'}.`;
  }

  if (event.eventName === 'DATA_EXTRACTED') {
    return `Draft records created${sourceFile ? ` from ${sourceFile}` : ''}: ${countLabel(metadata.readyCount, 'ready record')}, ${countLabel(metadata.trackedMetricCount, 'tracked metric')}, ${countLabel(metadata.requiresReviewCount, 'record')} requiring review.`;
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

  if (event.eventName === 'CSV_EXPORTED') {
    return `CSV exported: ${countLabel(metadata.exportedRecords ?? metadata.includedRecords, 'record')}, ${countLabel(metadata.trackedMetrics, 'tracked metric')}.`;
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

const organizationName = getOrganizationName(currentUser);
const generatedAt = new Date().toLocaleString();
const reportScopeLabel = getReportScopeLabel(
  reportScope,
  selectedRecordIds.length,
  selectedDocumentIds.length,
);
const reportPeriod =
  reportScope === 'dateRange'
    ? `${periodStart} to ${periodEnd}`
    : reportScope === 'selectedDocuments'
    ? 'Selected documents'
    : 'Selected records';
const inventoryBoundary = profileToInventoryBoundary(organizationProfile, reportPeriod);
const inventoryBoundarySummary = summarizeInventoryBoundary(
  inventoryBoundary,
  `${getDateOnlyYear(periodEnd) ?? 2026} reporting period`,
);
const hasAlbertaContext = hasAlbertaReportingContext({
  inventoryBoundary,
  calculationDetails,
  activities,
});
const regulatoryReportingSystems = hasAlbertaContext
  ? [...BASE_REGULATORY_REPORTING_SYSTEMS, ...ALBERTA_REGULATORY_REPORTING_SYSTEMS]
  : [...BASE_REGULATORY_REPORTING_SYSTEMS];
const dataReadinessSummary = buildDataReadinessSummary(calculationDetails);
const sourceReviewSummary = buildSourceReviewSummary(sourceReviewRows);
const carbonCreditReadiness = buildCarbonCreditReadinessAssessment(
  calculationDetails,
  dataReadinessSummary,
);
const includeCarbonCreditReadinessNotes = DEFAULT_REPORT_OPTIONS.includeCarbonCreditReadinessNotes === true;
const reportCountSummary = buildReportCountSummary(countSummary, calculationDetails);
const primarySkippedReasons = buildPrimarySkippedReasonSummary(calculationDetails, reportCountSummary);
const sourceEvidenceRows = buildSourceEvidenceRows(activities, calculationDetails);
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
const exportDisabled = !hasReportOutput;
const exportDisabledTitle = exportDisabled
  ? 'Generate a report before exporting.'
  : undefined;
const isPreparingReportData = !dateRangeReady || loading;

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
      <div style={reportsHeaderStyle}>
        <div>
          <h1 style={reportsTitleStyle}>Reports</h1>

          <p style={reportsSubtitleStyle}>
            Review your emissions summary, data quality, reporting boundary, and exportable review package.
          </p>
        </div>
      </div>

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
        <strong>Important scope note</strong>
        <p>{FORMAL_REPORT_DISCLAIMER}</p>
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

      <div style={sectionControlsStyle}>
        <button
          type="button"
          onClick={() => setAllReportSections(true)}
          style={secondaryButtonStyle(false)}
        >
          Expand all
        </button>
        <button
          type="button"
          onClick={() => setAllReportSections(false)}
          style={secondaryButtonStyle(false)}
        >
          Collapse all
        </button>
      </div>

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
            loading={loading}
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
      <div style={reportActionsStyle}>
        <button
          onClick={loadReportData}
          disabled={loading || hasNoDataInSystem}
          style={secondaryButtonStyle(loading || hasNoDataInSystem)}
          title={hasNoDataInSystem ? 'Upload and import activity data before generating a report.' : undefined}
        >
          {loading ? 'Generating...' : 'Generate Report'}
        </button>

        <button
          onClick={handleDownloadCSV}
          disabled={exportDisabled}
          title={exportDisabledTitle}
          style={secondaryButtonStyle(exportDisabled)}
        >
          Download CSV
        </button>

        <div ref={reviewPackageMenuRef} style={reviewPackageMenuWrapperStyle}>
          <button
            type="button"
            onClick={() => setIsReviewPackageMenuOpen((open) => !open)}
            disabled={exportDisabled}
            title={exportDisabledTitle}
            aria-haspopup="menu"
            aria-expanded={isReviewPackageMenuOpen}
            aria-controls="review-package-export-menu"
            style={primaryButtonStyle(exportDisabled)}
          >
            Export Review Package
          </button>
          {isReviewPackageMenuOpen ? (
            <div
              id="review-package-export-menu"
              role="menu"
              aria-label="Export review package"
              style={reviewPackageMenuStyle}
            >
              <p style={reviewPackageMenuHelpStyle}>
                Download CSV files for internal review, consultant review, or pilot workflow validation. These exports are not official regulatory submissions.
              </p>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleExportReviewPackageCsv('data-records')}
                style={reviewPackageMenuItemStyle}
              >
                Export Data Records CSV
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleExportReviewPackageCsv('site-facility-breakdown')}
                style={reviewPackageMenuItemStyle}
              >
                Export Site / Facility Breakdown
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleExportReviewPackageCsv('factor-source-summary')}
                style={reviewPackageMenuItemStyle}
              >
                Export Factor Source Summary
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleExportReviewPackageCsv('calculation-traceability')}
                style={reviewPackageMenuItemStyle}
              >
                Export Calculation Traceability
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleExportReviewPackageCsv('records-requiring-review')}
                style={reviewPackageMenuItemStyle}
              >
                Export Records Requiring Review
              </button>
            </div>
          ) : null}
        </div>

        <button
          onClick={handleDownloadPDF}
          disabled={exportDisabled}
          title={exportDisabledTitle}
          style={secondaryButtonStyle(exportDisabled)}
        >
          Download PDF
        </button>
      </div>

      {error ? <div style={errorStyle}>{error}</div> : null}

      {hasNoDataInSystem ? (
        <div style={reportEmptyStateStyle}>
          <h2 style={{ margin: 0, fontSize: 22 }}>No reporting data found.</h2>
          <p style={{ margin: '10px 0 18px', color: reportsPalette.infoText, lineHeight: 1.6 }}>
            Add and import activity data to generate your first emissions report.
          </p>
          <button
            type="button"
            onClick={() => navigate('/input-data')}
            style={primaryButtonStyle(false)}
          >
            Go to Input Data
          </button>
        </div>
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
              No emissions calculated because records require review. Review the
              calculation issues and records requiring review below.
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
            showSectionToolbar={false}
            sectionExpansionRequest={previewExpansionRequest}
          />

          <CollapsibleReportSection
            id="activity-records-report-section"
            title="Activity Records"
            summary={`${activities.length} activity record${activities.length === 1 ? '' : 's'}`}
            expanded={expandedSections.activityRecords}
            onToggle={() => toggleReportSection('activityRecords')}
          >
            <table style={tableStyle}>
              <thead>
                <tr>
              <th style={thStyle}>Date</th>
<th style={thStyle}>Activity Type</th>
<th style={thStyle}>Quantity</th>
<th style={thStyle}>Unit</th>
<th style={thStyle}>Source</th>
<th style={thStyle}>Reference</th>
                </tr>
              </thead>
              <tbody>
                {scopeRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={emptyStyle}>
                      No activity records available.
                    </td>
                  </tr>
                ) : (
                  activities.map((item) => (
                    <tr key={item.id}>
                      <td style={tdStyle}>{formatDateOnly(item.recordDate)}</td>
                      <td style={tdStyle}>{getActivityTypeLabel(item.activityType)}</td>
                      <td style={tdStyle}>{formatDisplayNumber(item.quantity)}</td>
                      <td style={tdStyle}>{formatReportUnit(item.unit)}</td>
                      <td style={tdStyle}>{formatSourceType(item.sourceType, item.sourceFileName, item.sourceReference)}</td>
                      <td style={tdStyle}>{getDisplaySourceLabel(item)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CollapsibleReportSection>

          <CollapsibleReportSection
            id="data-quality-notes-report-section"
            title="Data Quality Notes"
            summary={`${dataReadinessSummary.recordsReadyForCalculation} calculated · ${dataReadinessSummary.recordsRequiringReview} imported requiring review`}
            expanded={expandedSections.dataQualityNotes}
            onToggle={() => toggleReportSection('dataQualityNotes')}
          >
            <div style={dataQualityNotesGridStyle}>
              <DataQualityNote label="Emissions Workflow Readiness" value={`${formatDisplayNumber(dataReadinessSummary.score)}% · ${dataReadinessSummary.level}`} />
              <DataQualityNote
                label="Optional Data Completeness"
                value={`${formatDisplayNumber(dataReadinessSummary.optionalDataCompleteness.score)}%`}
                detail={formatOptionalDataCompletenessDetail(dataReadinessSummary)}
              />
              <DataQualityNote label="Calculated Records" value={dataReadinessSummary.recordsReadyForCalculation} />
              <DataQualityNote label="Imported Records Requiring Review" value={dataReadinessSummary.recordsRequiringReview} />
              <DataQualityNote
                label="Source Rows Still Requiring Review"
                value={sourceReviewSummary.available ? sourceReviewSummary.needsReviewCount : 'Not available'}
              />
              <DataQualityNote label="Tracked Operational Metrics" value={dataReadinessSummary.trackedOnlyCount} />
              <DataQualityNote label="Missing Factors" value={dataReadinessSummary.missingFactorCount} />
              <DataQualityNote label="Missing Jurisdiction" value={dataReadinessSummary.missingJurisdictionCount} />
            </div>
            <div style={dataQualityExplanationStyle}>
              <strong>How to read these metrics:</strong>
              <p>
                Calculation Coverage is calculated emission-bearing records divided by eligible emission-bearing records. Tracked-only operational metrics are retained for review but excluded from the denominator.
              </p>
              <p>
                Emissions Workflow Readiness is the percentage of draft or imported records that are complete enough to calculate, trace, and report without manual correction. Optional metadata such as cost is reported separately and does not reduce this score.
              </p>
              <p>
                Calculation Coverage and Emissions Workflow Readiness may differ. Tracked-only operational metrics such as Water are retained for review and excluded from the calculated GHG emissions total by design.
              </p>
              <p>
                Accommodation estimates are treated as selected business-travel-related Scope 3 activity records in this pilot.
              </p>
            </div>
            {dataReadinessSummary.recordsRequiringReview > 0 ? (
              <p style={{ color: reportsPalette.secondaryText, lineHeight: 1.6, marginTop: 10 }}>
                Review reasons: {formatReviewReasons(primarySkippedReasons)}.
              </p>
            ) : dataReadinessSummary.trackedOnlyCount > 0 ? (
              <p style={{ color: reportsPalette.secondaryText, lineHeight: 1.6, marginTop: 10 }}>
                Tracked operational metrics are retained for review but excluded from the calculated GHG emissions total.
              </p>
            ) : null}
            <p style={{ color: reportsPalette.secondaryText, lineHeight: 1.6, marginTop: 10 }}>
              Hotspot analysis is based only on calculated records. Records requiring review are excluded until fixed.
            </p>
          </CollapsibleReportSection>
          <CollapsibleReportSection
            id="source-dataset-review-status-report-section"
            title="Source Dataset Review Status"
            summary={formatSourceReviewStatus(sourceReviewSummary)}
            expanded={expandedSections.dataQualityNotes}
            onToggle={() => toggleReportSection('dataQualityNotes')}
          >
            <div style={dataQualityNotesGridStyle}>
              <DataQualityNote label="Source Files" value={formatSourceReviewFiles(sourceReviewSummary)} />
              <DataQualityNote label="Reviewable Source Rows" value={sourceReviewSummary.available ? sourceReviewSummary.totalRows : 'Not available'} />
              <DataQualityNote
                label="Rows Resolved / Imported"
                value={sourceReviewSummary.available ? `${sourceReviewSummary.resolvedCount} of ${sourceReviewSummary.totalRows}` : 'Not available'}
              />
              <DataQualityNote label="Ready Emissions Rows" value={sourceReviewSummary.available ? sourceReviewSummary.readyCount : 'Not available'} />
              <DataQualityNote label="Tracked Operational Rows" value={sourceReviewSummary.available ? sourceReviewSummary.trackedOnlyCount : 'Not available'} />
              <DataQualityNote label="Source Rows Still Requiring Review" value={sourceReviewSummary.available ? sourceReviewSummary.needsReviewCount : 'Not available'} />
            </div>
            <p style={{ color: reportsPalette.secondaryText, lineHeight: 1.6, marginTop: 10 }}>
              Source dataset review status is joined by source document ID. Unresolved source rows remain in spreadsheet review history and are not imported into ActivityData or included in emissions totals.
            </p>
            {sourceReviewSummary.needsReviewRows.length > 0 ? (
              <table style={{ ...tableStyle, marginTop: 12 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Source Reference</th>
                    <th style={thStyle}>Activity</th>
                    <th style={thStyle}>Quantity</th>
                    <th style={thStyle}>Unit</th>
                    <th style={thStyle}>Issue</th>
                    <th style={thStyle}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sourceReviewSummary.needsReviewRows.map((row) => (
                    <tr key={row.id || row.rowId || row.sourceReference || row.sourceRow}>
                      <td style={tdStyle}>{row.sourceReference || row.rowId || 'Source row'}</td>
                      <td style={tdStyle}>{getActivityTypeLabel(row.activityType || row.rawActivityType || 'UNKNOWN')}</td>
                      <td style={tdStyle}>{row.quantity ?? row.rawQuantity ?? ''}</td>
                      <td style={tdStyle}>{formatReportUnit(row.unit || '')}</td>
                      <td style={tdStyle}>{formatSourceReviewIssue(row)}</td>
                      <td style={tdStyle}>{formatSourceReviewAction(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </CollapsibleReportSection>
          {includeCarbonCreditReadinessNotes ? (
            <CollapsibleReportSection
              id="carbon-credit-readiness-report-section"
              title="Optional Carbon Credit Screening Notes"
              summary={`${formatCarbonCreditReadinessLevel(carbonCreditReadiness.readinessLevel)} · ${carbonCreditReadiness.score}/100`}
              expanded={expandedSections.carbonCreditReadiness}
              onToggle={() => toggleReportSection('carbonCreditReadiness')}
            >
              <p style={{ color: reportsPalette.secondaryText, lineHeight: 1.6, margin: '0 0 12px' }}>
                This section is not included in standard pilot reports and does not determine eligibility for carbon credits.
              </p>
              <p style={{ color: reportsPalette.secondaryText, lineHeight: 1.6, margin: '0 0 12px' }}>
                This optional section is an early screening note only. It is not a certification, verification, eligibility determination, or compliance assessment.
              </p>
              <div style={dataQualityNotesGridStyle}>
                <DataQualityNote label="Readiness Level" value={formatCarbonCreditReadinessLevel(carbonCreditReadiness.readinessLevel)} />
                <DataQualityNote label="Readiness Score" value={`${carbonCreditReadiness.score}/100`} />
                <DataQualityNote
                  label="Reduction Detected"
                  value={
                    carbonCreditReadiness.reductionAmount !== null && carbonCreditReadiness.reductionPercentage !== null
                      ? `${formatEmissionsWithUnit(carbonCreditReadiness.reductionAmount)} · ${formatDisplayNumber(carbonCreditReadiness.reductionPercentage)}%`
                      : 'Not assessed or not detected'
                  }
                />
                <DataQualityNote label="Records Requiring Review" value={dataReadinessSummary.recordsRequiringReview} />
                <DataQualityNote label="Tracked Operational Metrics" value={dataReadinessSummary.trackedOnlyCount} />
              </div>
              <p style={{ color: reportsPalette.infoText, lineHeight: 1.7, marginTop: 12 }}>
                {carbonCreditReadiness.summary}
              </p>
              <p style={creditDisclaimerReportStyle}>
                {CARBON_CREDIT_READINESS_DISCLAIMER}
              </p>
            </CollapsibleReportSection>
          ) : null}
          <CollapsibleReportSection
            id="scope-breakdown-report-section"
            title="Emissions by Scope"
            summary={`Scope 1: ${formatDisplayNumber(scopeSummary['Scope 1'])} · Scope 2: ${formatDisplayNumber(scopeSummary['Scope 2'])} · Scope 3: ${formatDisplayNumber(scopeSummary['Scope 3'])}`}
            expanded={expandedSections.scopeBreakdown}
            onToggle={() => toggleReportSection('scopeBreakdown')}
          >
            <ScopeExplanation />
            <div style={scopeCardGridStyle}>
              <Card
                title="Scope 1"
                subtitle={scopeLabelByName['Scope 1']}
                value={formatEmissionsWithUnit(scopeSummary['Scope 1'])}
                icon="🏭"
              />
              <Card
                title="Scope 2"
                subtitle={scopeLabelByName['Scope 2']}
                value={formatEmissionsWithUnit(scopeSummary['Scope 2'])}
                icon="⚡"
              />
              <Card
                title="Scope 3"
                subtitle={scopeLabelByName['Scope 3']}
                value={formatEmissionsWithUnit(scopeSummary['Scope 3'])}
                icon="🌍"
              />
              {scopeSummary.Unclassified > 0 ? (
                <Card
                  title="Unclassified"
                  subtitle="Requires scope review"
                  value={formatEmissionsWithUnit(scopeSummary.Unclassified)}
                  icon="?"
                />
              ) : null}
            </div>
            {unclassifiedCalculatedRecords.length > 0 ? (
              <div style={scopeUnclassifiedWarningStyle}>
                {unclassifiedCalculatedRecords.length} calculated record(s) could not be assigned to Scope 1, 2, or 3 and should be reviewed.
              </div>
            ) : null}
          </CollapsibleReportSection>
          <CollapsibleReportSection
            id="site-facility-breakdown-report-section"
            title="Emissions by Site / Facility"
            summary={
              siteFacilityBreakdownRows.length > 0
                ? `Organization total: ${formatEmissionsWithUnit(siteFacilityRollup.organizationTotalKgCO2e)} · ${siteFacilityBreakdownRows.length} site/facility ${siteFacilityBreakdownRows.length === 1 ? 'group' : 'groups'}`
                : 'No calculated site/facility totals'
            }
            expanded={expandedSections.siteFacilityBreakdown}
            onToggle={() => toggleReportSection('siteFacilityBreakdown')}
          >
            <p style={sectionDescriptionStyle}>
              Organization total: <strong>{formatEmissionsWithUnit(siteFacilityRollup.organizationTotalKgCO2e)}</strong>. This section summarizes calculated emissions by the facility, site, or location assigned to each activity record. Records without a specified site are grouped under “Unassigned”.
            </p>
            <SiteFacilityBreakdownTable rows={siteFacilityBreakdownRows} />
          </CollapsibleReportSection>
          {facilityThresholdReferenceRows.length > 0 ? (
            <CollapsibleReportSection
              id="facility-threshold-reference-report-section"
              title="Facility-Level Reporting Threshold Reference"
              summary={`${formatDisplayNumber(FACILITY_REPORTING_THRESHOLD_TCO2E)} t CO₂e/year Canada / federal context · Alberta rows only use ${formatDisplayNumber(ALBERTA_TIER_LARGE_EMITTER_THRESHOLD_TCO2E)} t CO₂e/year Alberta TIER reference`}
              expanded={expandedSections.facilityThresholdReference}
              onToggle={() => toggleReportSection('facilityThresholdReference')}
            >
              <p style={sectionDescriptionStyle}>
                Canada / federal context is shown separately from province-specific screening. Alberta TIER is evaluated only for rows with Alberta jurisdiction; unsupported or missing jurisdictions are marked as not evaluated.
              </p>
              <p style={thresholdDisclaimerStyle}>{FACILITY_THRESHOLD_REFERENCE_DISCLAIMER}</p>
              <FacilityThresholdReferenceTable rows={facilityThresholdReferenceRows} />
            </CollapsibleReportSection>
          ) : null}
          <CollapsibleReportSection
            id="regulatory-reporting-reference-report-section"
            title={REGULATORY_REPORTING_REFERENCE_TITLE}
            summary={REGULATORY_REPORTING_REFERENCE_SUMMARY}
            expanded={expandedSections.regulatoryReportingReference}
            onToggle={() => toggleReportSection('regulatoryReportingReference')}
          >
            <RegulatoryReportingReferenceContent regulatoryReportingSystems={regulatoryReportingSystems} />
          </CollapsibleReportSection>
        </>
      ) : null}

      {canViewWorkflowHistory ? (
        <WorkflowAuditTrail
          events={workflowEvents}
          loading={workflowEventsLoading}
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

function RegulatoryReportingReferenceContent({
  regulatoryReportingSystems,
}: {
  regulatoryReportingSystems: string[];
}) {
  return (
    <div style={regulatoryReferenceContentStyle}>
      <p style={sectionDescriptionStyle}>
        {REGULATORY_REPORTING_REFERENCE_TEXT}
      </p>
      <div>
        <p style={regulatoryReferenceIntroStyle}>Relevant reporting systems may include:</p>
        <ul style={regulatoryReferenceListStyle}>
          {regulatoryReportingSystems.map((system) => (
            <li key={system}>{system}</li>
          ))}
        </ul>
      </div>
      <p style={thresholdDisclaimerStyle}>
        Reference only. CarbonLite does not determine regulatory obligations. Consult a qualified professional before making regulatory filing or compliance decisions.
      </p>
    </div>
  );
}

function WorkflowAuditTrail({
  events,
  loading,
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
          {loading && events.length === 0 ? (
            <div style={workflowAuditEmptyStyle}>Loading workflow history...</div>
          ) : events.length === 0 ? (
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

function Card({
  title,
  subtitle,
  value,
  icon,
}: {
  title: string;
  subtitle?: string;
  value: string;
  icon: string;
}) {
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 28 }}>{icon}</div>
      <div style={{ marginTop: 10, color: reportsPalette.secondaryText, fontSize: 14 }}>{title}</div>
      {subtitle ? <div style={cardSubtitleStyle}>{subtitle}</div> : null}
      <div style={{ marginTop: 6, fontSize: 26, fontWeight: 800 }}>
        {value}
      </div>
    </div>
  );
}

function ScopeExplanation() {
  return (
    <details style={scopeHelpStyle}>
      <summary style={scopeHelpSummaryStyle} aria-label="What do emissions scopes mean?">
        <span style={scopeHelpIconStyle} aria-hidden="true">i</span>
        What do scopes mean?
      </summary>
      <div style={scopeHelpGridStyle}>
        {SCOPE_HELP.map((item) => (
          <div key={item.scope} style={scopeHelpItemStyle}>
            <strong>{item.scope}: {item.label}</strong>
            <p style={scopeHelpTextStyle}>{item.description}</p>
            <div style={scopeHelpExamplesStyle}>Examples: {item.examples}</div>
          </div>
        ))}
        <div style={scopeHelpNoteStyle}>
          Water is treated as a tracked operational metric unless a reviewed water emissions factor is enabled.
        </div>
      </div>
    </details>
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
  return (
    <div style={dataQualityNoteStyle}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <span style={dataQualityNoteDetailStyle}>{detail}</span> : null}
    </div>
  );
}

function formatOptionalDataCompletenessDetail(
  summary: ReturnType<typeof buildDataReadinessSummary>,
) {
  const { costDataCount, totalRecords } = summary.optionalDataCompleteness;
  return `${costDataCount} of ${totalRecords} imported records include optional cost data`;
}

function buildSourceReviewSummary(rows: SpreadsheetReviewRowItem[]) {
  const reviewRows = rows.filter((row) => !isSourceReviewSummaryRow(row));
  const readyRows = reviewRows.filter((row) => normalizeReviewStatus(row.status) === 'READY');
  const trackedRows = reviewRows.filter((row) => normalizeReviewStatus(row.status) === 'TRACKED_ONLY');
  const needsReviewRows = reviewRows.filter((row) => normalizeReviewStatus(row.status) === 'NEEDS_REVIEW');
  const resolvedCount = readyRows.length + trackedRows.length;
  const totalRows = reviewRows.length;

  return {
    available: totalRows > 0,
    sourceFiles: uniqueReviewValues(reviewRows.map((row) => row.sourceFileName)),
    totalRows,
    readyCount: readyRows.length,
    trackedOnlyCount: trackedRows.length,
    resolvedCount,
    needsReviewCount: needsReviewRows.length,
    resolutionPercent: totalRows > 0 ? Math.round((resolvedCount / totalRows) * 1000) / 10 : 0,
    needsReviewRows,
  };
}

function normalizeReviewStatus(value?: string | null) {
  return String(value ?? '').trim().toUpperCase();
}

function uniqueReviewValues(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean)),
  );
}

function isSourceReviewSummaryRow(row: SpreadsheetReviewRowItem) {
  const text = [
    row.sourceReference,
    row.rawActivityType,
    row.activityType,
    row.notes,
    row.rawRecordDate,
  ]
    .map((value) => String(value ?? '').replace(/[_-]+/g, ' ').trim().toUpperCase())
    .join(' ');

  return /\b(SUBTOTAL|SUB TOTAL|GRAND TOTAL|TOTAL|SUMMARY)\b/.test(text);
}

function formatSourceReviewFiles(summary: ReturnType<typeof buildSourceReviewSummary>) {
  if (!summary.available) return 'Not available';
  return summary.sourceFiles.length ? summary.sourceFiles.join(', ') : 'Source file not specified';
}

function formatSourceReviewStatus(summary: ReturnType<typeof buildSourceReviewSummary>) {
  if (!summary.available) return 'Not available for manual-only report scope';
  return `${summary.resolvedCount} of ${summary.totalRows} source rows resolved/imported · ${summary.needsReviewCount} require review`;
}

function formatSourceReviewIssue(row: SpreadsheetReviewRowItem) {
  const issues = row.issues ?? [];
  if (issues.length > 0) {
    return issues.map((issue) => issue.message || issue.code).filter(Boolean).join('; ');
  }

  return row.calculationMessage || row.status || 'Review required';
}

function formatSourceReviewIssueType(row: SpreadsheetReviewRowItem) {
  const issue = row.issues?.[0];
  return issue?.code || row.calculationStatus || row.matchingStatus || row.status || 'NEEDS_REVIEW';
}

function formatReviewRowJurisdiction(row: SpreadsheetReviewRowItem) {
  const parts = [row.jurisdictionRegion, row.jurisdictionCountry]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean);
  return parts.length ? parts.join(', ') : 'Not specified';
}

function formatSourceReviewAction(row: SpreadsheetReviewRowItem) {
  const issueType = formatSourceReviewIssueType(row).toUpperCase();

  if (issueType.includes('PROVINCE') || issueType.includes('JURISDICTION')) {
    return 'Add the missing province/jurisdiction and re-import or update the row.';
  }
  if (issueType.includes('UNIT')) {
    return 'Correct the unit to a supported factor unit and rerun review.';
  }
  if (issueType.includes('QUANTITY')) {
    return 'Enter a numeric quantity and rerun review.';
  }
  if (issueType.includes('ACTIVITY')) {
    return 'Map the raw activity to a supported activity type.';
  }
  if (issueType.includes('FACTOR')) {
    return 'Add or select a matching emissions factor before including in GHG totals.';
  }

  return 'Review and correct this source row before importing it into the report scope.';
}

function SiteFacilityBreakdownTable({ rows }: { rows: SiteFacilityBreakdownRow[] }) {
  if (rows.length === 0) {
    return (
      <div style={emptySiteFacilityStyle}>
        No calculated GHG records are available for site or facility totals.
      </div>
    );
  }

  return (
    <div style={siteFacilityTableWrapStyle}>
      <table style={siteFacilityTableStyle}>
        <thead>
          <tr>
            <th style={siteFacilityThStyle}>Site / Facility</th>
            <th style={siteFacilityThStyle}>Scope 1</th>
            <th style={siteFacilityThStyle}>Scope 2</th>
            <th style={siteFacilityThStyle}>Scope 3</th>
            <th style={siteFacilityThStyle}>Total</th>
            <th style={siteFacilityThStyle}>Included Records</th>
            <th style={siteFacilityThStyle}>Activity Type Breakdown</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.siteFacility}>
              <td style={siteFacilityTdStyle}>{row.siteFacility}</td>
              <td style={siteFacilityTdStyle}>{formatEmissionsWithUnit(row.scope1KgCO2e)}</td>
              <td style={siteFacilityTdStyle}>{formatEmissionsWithUnit(row.scope2KgCO2e)}</td>
              <td style={siteFacilityTdStyle}>{formatEmissionsWithUnit(row.scope3KgCO2e)}</td>
              <td style={siteFacilityTotalTdStyle}>{formatEmissionsWithUnit(row.totalKgCO2e)}</td>
              <td style={siteFacilityTdStyle}>{row.includedRecords}</td>
              <td style={siteFacilityTdStyle}>{formatSiteFacilityActivityBreakdown(row)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FacilityThresholdReferenceTable({ rows }: { rows: FacilityThresholdReferenceRow[] }) {
  return (
    <div style={siteFacilityTableWrapStyle}>
      <table style={thresholdReferenceTableStyle}>
        <thead>
          <tr>
            <th style={siteFacilityThStyle}>Site / Facility</th>
            <th style={siteFacilityThStyle}>Jurisdiction</th>
            <th style={siteFacilityThStyle}>Regulatory reference</th>
            <th style={siteFacilityThStyle}>Threshold</th>
            <th style={siteFacilityThStyle}>Total calculated emissions</th>
            <th style={siteFacilityThStyle}>Status</th>
            <th style={siteFacilityThStyle}>Screening note</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.siteFacility}>
              <td style={siteFacilityTdStyle}>{row.siteFacility}</td>
              <td style={siteFacilityTdStyle}>{row.jurisdictionLabel}</td>
              <td style={siteFacilityTdStyle}>{row.regulatoryReference}</td>
              <td style={siteFacilityTdStyle}>{row.thresholdLabel}</td>
              <td style={siteFacilityTotalTdStyle}>
                {formatEmissionsWithUnit(row.totalKgCO2e)} ({formatThresholdTonnes(row.totalTCO2e)} t CO₂e)
              </td>
              <td style={siteFacilityTdStyle}>{row.status}</td>
              <td style={siteFacilityTdStyle}>{row.screeningNote}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatSiteFacilityActivityBreakdown(row: SiteFacilityBreakdownRow) {
  if (row.activityBreakdown.length === 0) return 'No activity breakdown available';

  return row.activityBreakdown
    .map(
      (item) =>
        `${item.activityType}: ${formatEmissionsWithUnit(item.totalKgCO2e)} (${item.includedRecords} ${item.includedRecords === 1 ? 'record' : 'records'})`,
    )
    .join('; ');
}

function formatThresholdTonnes(value: number) {
  return formatThresholdNumber(value, value >= 100 ? 0 : 1);
}

function formatThresholdNumber(value: number, maximumFractionDigits: number) {
  if (!Number.isFinite(value)) return '-';

  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  });
}

function InventoryBoundaryPanel({
  boundary,
  summary,
  expanded,
  onToggle,
  canEdit,
  isPilotReviewerAccount,
  onEdit,
}: {
  boundary: InventoryBoundary;
  summary: string;
  expanded: boolean;
  onToggle: () => void;
  canEdit: boolean;
  isPilotReviewerAccount: boolean;
  onEdit: () => void;
}) {
  const boundaryStatus = getInventoryBoundaryStatus(boundary);
  const boundaryComplete = boundaryStatus === 'Complete';

  return (
    <CollapsibleSection
      id="report-reporting-boundary"
      title="Reporting Boundary"
      summary={summary}
      expanded={expanded}
      onToggle={onToggle}
      style={inventoryBoundaryPanelStyle}
      contentStyle={inventoryBoundaryGridStyle}
    >
      <div style={reportingBoundaryIntroStyle}>
        <span>
          {isPilotReviewerAccount
            ? 'Pilot review account · Sample boundary information · Read-only'
            : 'This reporting boundary is read-only on Reports and comes from Organization & Boundary settings.'}
        </span>
        {canEdit ? (
          <button
            type="button"
            onClick={onEdit}
            style={reportingBoundaryEditButtonStyle}
          >
            Edit in Organization & Boundary
          </button>
        ) : !isPilotReviewerAccount ? (
          <span style={reportingBoundaryReadOnlyTextStyle}>
            This reporting boundary is read-only for your account.
          </span>
        ) : null}
      </div>

      {!boundaryComplete ? (
        <div style={reportingBoundaryWarningStyle}>
          Reporting boundary information is incomplete. Calculation results may still be reviewed,
          but boundary assumptions should be confirmed before formal reporting.
        </div>
      ) : null}

      <div style={reportingBoundaryGroupStyle}>
        <h3 style={reportingBoundaryGroupHeadingStyle}>Configured reporting boundary</h3>
        <DataQualityNote label="Boundary status" value={boundaryStatus} />
        <DataQualityNote label="Organization / Workspace" value={formatBoundaryValue(boundary.organizationWorkspace)} />
        {boundary.industry ? (
          <DataQualityNote label="Industry" value={boundary.industry} />
        ) : null}
        {boundary.country ? (
          <DataQualityNote label="Country" value={boundary.country} />
        ) : null}
        {boundary.provinceOrTerritory ? (
          <DataQualityNote label="Province / Territory" value={boundary.provinceOrTerritory} />
        ) : null}
        {boundary.city ? (
          <DataQualityNote label="City" value={boundary.city} />
        ) : null}
        <DataQualityNote label="Reporting period" value={formatBoundaryValue(boundary.reportingPeriod)} />
        <DataQualityNote label="Geographic boundary" value={formatBoundaryValue(boundary.geographicBoundary)} />
        <DataQualityNote
          label="Included facilities or locations"
          value={formatBoundaryValue(boundary.includedFacilitiesOrLocations)}
        />
        <DataQualityNote
          label="Excluded facilities or locations"
          value={formatBoundaryValue(boundary.excludedFacilitiesOrLocations)}
        />
        <DataQualityNote label="Included scopes" value={formatBoundaryValue(boundary.includedScopes)} />
        <DataQualityNote label="Scope 3 coverage note" value={formatBoundaryValue(boundary.scope3CoverageNote)} />
        <DataQualityNote label="Exclusions / limitations" value={formatBoundaryValue(boundary.exclusionsLimitations)} />
        <DataQualityNote label="Boundary notes" value={formatBoundaryValue(boundary.boundaryNotes)} />
      </div>

      <div style={reportingBoundaryGroupStyle}>
        <h3 style={reportingBoundaryGroupHeadingStyle}>CarbonLite calculation coverage</h3>
        <DataQualityNote label="Pilot calculation coverage" value={CARBONLITE_CALCULATION_COVERAGE_LABEL} />
        <div style={calculationCoverageNoteStyle}>
          This describes the activity categories CarbonLite currently calculates. It does not
          replace the organization's configured reporting boundary.
        </div>
      </div>
    </CollapsibleSection>
  );
}

function formatBoundaryValue(value?: string | null) {
  const trimmed = String(value ?? '').trim();
  return trimmed || 'Not specified';
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

function formatCarbonCreditReadinessLevel(level: string) {
  const labels: Record<string, string> = {
    NOT_READY: 'Not ready',
    NEEDS_MORE_DATA: 'Needs more data',
    READY_FOR_PROFESSIONAL_REVIEW: 'Ready for professional review',
  };

  return labels[level] ?? level;
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

const reportsHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
  flexWrap: 'wrap',
  marginBottom: 20,
};

const reportsTitleStyle: React.CSSProperties = {
  margin: 0,
};

const reportsSubtitleStyle: React.CSSProperties = {
  color: reportsPalette.secondaryText,
  margin: '8px 0 0',
  lineHeight: 1.5,
};

const reportActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  marginBottom: 24,
  flexWrap: 'wrap',
  alignItems: 'center',
};

const cardStyle: React.CSSProperties = {
  borderRadius: 12,
  padding: 20,
  background: reportsPalette.white,
  border: `1px solid ${reportsPalette.border}`,
  boxShadow: 'none',
};

const cardSubtitleStyle: React.CSSProperties = {
  marginTop: 4,
  color: reportsPalette.infoText,
  fontSize: 13,
  fontWeight: 800,
  lineHeight: 1.3,
};

const scopeCardGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
  gap: 16,
};

const scopeUnclassifiedWarningStyle: React.CSSProperties = {
  marginTop: 12,
  padding: 12,
  borderRadius: 8,
  border: `1px solid ${reportsPalette.warningBorder}`,
  background: reportsPalette.warningBackground,
  color: reportsPalette.warningText,
  fontSize: 13,
  fontWeight: 700,
};

const sectionDescriptionStyle: React.CSSProperties = {
  margin: '0 0 12px',
  color: reportsPalette.infoText,
  lineHeight: 1.6,
};

const thresholdDisclaimerStyle: React.CSSProperties = {
  margin: '0 0 12px',
  color: reportsPalette.infoText,
  fontSize: 13,
  fontWeight: 700,
};

const regulatoryReferenceContentStyle: React.CSSProperties = {
  display: 'grid',
  gap: 12,
};

const regulatoryReferenceIntroStyle: React.CSSProperties = {
  margin: '0 0 6px',
  color: reportsPalette.infoText,
  fontSize: 13,
  fontWeight: 800,
};

const regulatoryReferenceListStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: 20,
  color: reportsPalette.infoText,
  lineHeight: 1.7,
};

const siteFacilityTableWrapStyle: React.CSSProperties = {
  overflowX: 'auto',
};

const siteFacilityTableStyle: React.CSSProperties = {
  width: '100%',
  minWidth: 920,
  borderCollapse: 'collapse',
  fontSize: 13,
};

const thresholdReferenceTableStyle: React.CSSProperties = {
  ...siteFacilityTableStyle,
  minWidth: 820,
};

const siteFacilityThStyle: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'left',
  borderBottom: `1px solid ${reportsPalette.border}`,
  color: reportsPalette.infoText,
  background: reportsPalette.subtleBackground,
  fontWeight: 800,
};

const siteFacilityTdStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderBottom: `1px solid ${reportsPalette.subtleBorder}`,
  color: reportsPalette.primaryText,
  verticalAlign: 'top',
};

const siteFacilityTotalTdStyle: React.CSSProperties = {
  ...siteFacilityTdStyle,
  fontWeight: 800,
};

const emptySiteFacilityStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 10,
  border: `1px solid ${reportsPalette.border}`,
  background: reportsPalette.subtleBackground,
  color: reportsPalette.infoText,
};

const scopeHelpStyle: React.CSSProperties = {
  marginBottom: 14,
  borderRadius: 12,
  border: `1px solid ${reportsPalette.border}`,
  background: reportsPalette.subtleBackground,
};

const scopeHelpSummaryStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 12px',
  color: reportsPalette.primaryText,
  fontWeight: 800,
  cursor: 'pointer',
};

const scopeHelpIconStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 18,
  height: 18,
  borderRadius: 999,
  background: reportsPalette.successBackground,
  color: reportsPalette.primaryGreen,
  fontSize: 12,
  fontWeight: 900,
};

const scopeHelpGridStyle: React.CSSProperties = {
  display: 'grid',
  gap: 10,
  padding: '0 12px 12px',
};

const scopeHelpItemStyle: React.CSSProperties = {
  padding: 10,
  borderRadius: 10,
  background: reportsPalette.white,
  border: `1px solid ${reportsPalette.border}`,
};

const scopeHelpTextStyle: React.CSSProperties = {
  margin: '6px 0',
  color: reportsPalette.infoText,
  lineHeight: 1.5,
};

const scopeHelpExamplesStyle: React.CSSProperties = {
  color: reportsPalette.secondaryText,
  fontSize: 13,
  fontWeight: 700,
};

const scopeHelpNoteStyle: React.CSSProperties = {
  color: reportsPalette.infoText,
  fontSize: 13,
  lineHeight: 1.5,
};

const dataQualityNotesGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 10,
};

const inventoryBoundaryPanelStyle: React.CSSProperties = {
  display: 'grid',
  margin: '0 0 20px',
  padding: 16,
  borderRadius: 12,
  border: `1px solid ${reportsPalette.border}`,
  background: reportsPalette.white,
  color: reportsPalette.primaryText,
};

const inventoryBoundaryGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 10,
  marginTop: 14,
};

const reportingBoundaryIntroStyle: React.CSSProperties = {
  gridColumn: '1 / -1',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  flexWrap: 'wrap',
  padding: 12,
  borderRadius: 12,
  background: reportsPalette.subtleBackground,
  border: `1px solid ${reportsPalette.border}`,
  color: reportsPalette.infoText,
  fontSize: 13,
  lineHeight: 1.45,
};

const reportingBoundaryWarningStyle: React.CSSProperties = {
  gridColumn: '1 / -1',
  padding: 12,
  borderRadius: 10,
  border: '1px solid #fde68a',
  background: '#fffbeb',
  color: '#92400e',
  fontSize: 13,
  lineHeight: 1.5,
};

const reportingBoundaryGroupStyle: React.CSSProperties = {
  gridColumn: '1 / -1',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 10,
};

const reportingBoundaryGroupHeadingStyle: React.CSSProperties = {
  gridColumn: '1 / -1',
  margin: '4px 0 0',
  fontSize: 15,
  color: reportsPalette.primaryText,
};

const calculationCoverageNoteStyle: React.CSSProperties = {
  gridColumn: '1 / -1',
  color: reportsPalette.infoText,
  fontSize: 13,
  lineHeight: 1.5,
};

const reportingBoundaryEditButtonStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: `1px solid ${reportsPalette.border}`,
  background: reportsPalette.white,
  color: reportsPalette.primaryText,
  cursor: 'pointer',
  fontWeight: 800,
};

const reportingBoundaryReadOnlyTextStyle: React.CSSProperties = {
  color: reportsPalette.secondaryText,
  fontWeight: 700,
};

const readOnlyReportScopeStyle: React.CSSProperties = {
  display: 'grid',
  gap: 12,
};

const reviewPackageMenuWrapperStyle: React.CSSProperties = {
  position: 'relative',
  display: 'inline-flex',
};

const reviewPackageMenuStyle: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 8px)',
  left: 0,
  zIndex: 30,
  width: 320,
  padding: 10,
  borderRadius: 12,
  border: `1px solid ${reportsPalette.border}`,
  background: reportsPalette.white,
  boxShadow: '0 20px 42px rgba(15, 23, 42, 0.12)',
};

const reviewPackageMenuHelpStyle: React.CSSProperties = {
  margin: '0 0 8px',
  color: reportsPalette.secondaryText,
  fontSize: 12,
  lineHeight: 1.45,
};

const reviewPackageMenuItemStyle: React.CSSProperties = {
  width: '100%',
  display: 'block',
  padding: '8px 10px',
  border: 0,
  borderRadius: 8,
  background: 'transparent',
  color: reportsPalette.primaryText,
  fontSize: 13,
  fontWeight: 700,
  textAlign: 'left',
  cursor: 'pointer',
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
  padding: 12,
  borderRadius: 12,
  background: reportsPalette.subtleBackground,
  border: `1px solid ${reportsPalette.border}`,
  color: reportsPalette.infoText,
};

const dataQualityNoteDetailStyle: React.CSSProperties = {
  color: reportsPalette.secondaryText,
  fontSize: 12,
  lineHeight: 1.4,
};

const dataQualityExplanationStyle: React.CSSProperties = {
  display: 'grid',
  gap: 6,
  marginTop: 12,
  padding: 12,
  borderRadius: 12,
  background: reportsPalette.subtleBackground,
  border: `1px solid ${reportsPalette.border}`,
  color: reportsPalette.infoText,
  lineHeight: 1.55,
};

const creditDisclaimerReportStyle: React.CSSProperties = {
  marginTop: 12,
  padding: 12,
  borderRadius: 12,
  background: reportsPalette.warningBackground,
  border: `1px solid ${reportsPalette.warningBorder}`,
  color: reportsPalette.warningText,
  lineHeight: 1.6,
  fontWeight: 700,
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

const sectionControlsStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
  flexWrap: 'wrap',
  marginBottom: 12,
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: 12,
  borderBottom: `1px solid ${reportsPalette.border}`,
  color: reportsPalette.infoText,
  background: reportsPalette.subtleBackground,
};

const tdStyle: React.CSSProperties = {
  padding: 12,
  borderBottom: `1px solid ${reportsPalette.subtleBorder}`,
  color: reportsPalette.primaryText,
};

const emptyStyle: React.CSSProperties = {
  padding: 16,
  textAlign: 'center',
  color: reportsPalette.secondaryText,
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

const reportEmptyStateStyle: React.CSSProperties = {
  padding: 28,
  borderRadius: 12,
  border: `1px solid ${reportsPalette.border}`,
  background: reportsPalette.subtleBackground,
  color: reportsPalette.primaryText,
  boxShadow: 'none',
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
