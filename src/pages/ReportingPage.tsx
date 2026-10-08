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
  buildFacilityThresholdReferenceRows,
  buildSiteFacilityRollup,
  FACILITY_THRESHOLD_REFERENCE_DISCLAIMER,
  type FacilityRegulatoryThresholdReference,
  type FacilityThresholdReferenceRow,
  type SiteFacilityBreakdownRow,
} from '../utils/siteFacilityBreakdown';
import {
  buildEvidenceChainFromCalculationDetail,
  buildEvidenceChainSummaryRows,
} from '../utils/businessAuditTrail';
import {
  CARBONLITE_CALCULATION_COVERAGE_LABEL,
  getInventoryBoundaryStatus,
  summarizeInventoryBoundary,
  type InventoryBoundary,
} from '../constants/inventoryBoundary';
import { formatCalculationStatusLabel } from '../utils/terminology';
import {
  buildReportingReadinessAssessment,
  formatReadinessStatus,
  type ReportingReadinessAssessment,
  type ReportingReadinessItem,
  type SourceReviewReadinessSummary,
} from '../utils/reportingReadiness';
import { getWorkflowStage } from '../constants/carbonliteWorkflow';
import {
  fetchOrganizationProfile,
  hasBackendOrganizationProfileSession,
  loadOrganizationProfile,
  ORGANIZATION_PROFILE_UPDATED_EVENT,
  profileToReportContextInventoryBoundary,
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
  auditEvidenceChain: false,
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

const PDF_MARGIN_MM = 14;
const LANDSCAPE_A4_WIDTH_MM = 297;
const PDF_APPENDIX_USABLE_WIDTH_MM = LANDSCAPE_A4_WIDTH_MM - PDF_MARGIN_MM * 2;
const PDF_APPENDIX_INNER_BUFFER_MM = 4;
const PDF_APPENDIX_TABLE_WIDTH_MM = PDF_APPENDIX_USABLE_WIDTH_MM - PDF_APPENDIX_INNER_BUFFER_MM;
const PDF_FOOTER_RESERVE_MM = 21;
const PDF_TOP_MARGIN_MM = 18;
const EXECUTIVE_SECTION_GAP_MM = 4;
const EXECUTIVE_SECTION_TITLE_TO_TABLE_MM = 5;
const FACTOR_DETAIL_TEXT_WIDTH_MM = 178;
const FACTOR_DETAIL_LINE_HEIGHT_MM = 4.1;
const FACTOR_DETAIL_BLOCK_SPACING_MM = 5;

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
const CARBONLITE_TEMPLATE_VERSION = 'CarbonLite Pilot Demo v0.1';
const REPORT_DOCUMENT_VERSION = '0.1';
const REPORT_STATUS_PILOT_DRAFT = 'Pilot Draft';
const REPORT_REVIEWER_NOT_ASSIGNED = 'Not yet assigned';
const REPORT_REVIEW_STATUS_NOT_REVIEWED = 'Not reviewed';
const BASE_REGULATORY_REPORTING_SYSTEMS = [
  'Federal GHGRP Single Window reporting',
] as const;
const ALBERTA_REGULATORY_REPORTING_SYSTEMS = [
  'Alberta SGRR / SWIM reporting',
  'Alberta TIER compliance reporting',
] as const;
const FEDERAL_FUEL_CHARGE_REMOVAL_DATE = '2025-04-01';
const FEDERAL_FUEL_CHARGE_CEASED_AFTER_DATE = '2025-03-31';
const FEDERAL_FUEL_CHARGE_REMOVAL_DATE_LABEL = 'April 1, 2025';
const FEDERAL_FUEL_CHARGE_CEASED_AFTER_DATE_LABEL = 'March 31, 2025';
const HISTORICAL_FEDERAL_FUEL_CHARGE_REFERENCE =
  `Historical federal fuel-charge requirements may be relevant for reporting periods before ${FEDERAL_FUEL_CHARGE_REMOVAL_DATE_LABEL}.`;
const TRANSITIONAL_FEDERAL_FUEL_CHARGE_REFERENCE =
  `Historical federal fuel-charge requirements may apply to activities before ${FEDERAL_FUEL_CHARGE_REMOVAL_DATE_LABEL}. The federal fuel charge ceased for activities after ${FEDERAL_FUEL_CHARGE_CEASED_AFTER_DATE_LABEL}.`;
const REVIEWED_REGULATORY_THRESHOLD_REFERENCES: FacilityRegulatoryThresholdReference[] = [];

type RegulatoryReportingReference = {
  currentSystems: string[];
  historicalNotes: string[];
  thresholdReferences: FacilityRegulatoryThresholdReference[];
};

type PdfDocumentControlMetadata = {
  reportId: string;
  reportVersion: string;
  reportStatus: string;
  generatedWith: string;
  generatedBy: string;
  reviewer: string;
  reviewStatus: string;
};

type ReportOutputProfile = 'EXECUTIVE_SUMMARY' | 'TECHNICAL_REVIEW';

type CanonicalReportData = {
  outputGeneratedDate: string;
  organizationName: string;
  reportPeriod: string;
  reportScopeLabel: string;
  documentControl: PdfDocumentControlMetadata;
  executiveSummary: ReturnType<typeof buildReportExecutiveSummary>;
  reportCountSummary: ReturnType<typeof buildReportCountSummary>;
  primarySkippedReasons: ReturnType<typeof buildPrimarySkippedReasonSummary>;
  hotspotAnalysis: HotspotAnalysis;
  calculationCoverage: string;
  coverageCounts: ReturnType<typeof getCalculationCoverageCounts>;
  scopeSummary: Record<'Scope 1' | 'Scope 2' | 'Scope 3' | 'Unclassified', number>;
  sourceReviewSummary: ReturnType<typeof buildSourceReviewSummary>;
  reportingReadinessAssessment: ReportingReadinessAssessment;
  dataReadinessSummary: ReturnType<typeof buildDataReadinessSummary>;
  totalsByMetric: ReturnType<typeof buildMetricsSummaryTableRows>;
  inventoryBoundary: InventoryBoundary;
  regulatoryReportingReference: RegulatoryReportingReference;
  totalEstimatedEmissionsKgCO2e: number;
  calculationDetails: CalculationAuditDetail[];
};

const REPORT_OUTPUT_PROFILE_LABELS: Record<ReportOutputProfile, string> = {
  EXECUTIVE_SUMMARY: 'Executive Summary',
  TECHNICAL_REVIEW: 'Technical Review Package',
};

export default function ReportingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUserRef = useRef<ReturnType<typeof getCurrentUser>>(getCurrentUser());
  const currentUser = currentUserRef.current;
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
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
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
  calculationDetails: CalculationAuditDetail[];
  activities: ActivityItem[];
}) {
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
  () => buildFacilityThresholdReferenceRows(
    siteFacilityBreakdownRows,
    REVIEWED_REGULATORY_THRESHOLD_REFERENCES,
  ),
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

function getPdfPageWidth(doc: jsPDF) {
  return doc.internal.pageSize.getWidth();
}

function getPdfPageHeight(doc: jsPDF) {
  return doc.internal.pageSize.getHeight();
}

function getPdfUsableWidth(doc: jsPDF, leftMargin = PDF_MARGIN_MM, rightMargin = PDF_MARGIN_MM) {
  return getPdfPageWidth(doc) - leftMargin - rightMargin;
}

function getPdfTextWidthFromX(doc: jsPDF, x: number, rightMargin = PDF_MARGIN_MM) {
  return Math.max(10, getPdfPageWidth(doc) - x - rightMargin);
}

function getPdfAppendixUsableWidth(doc: jsPDF) {
  return PDF_APPENDIX_TABLE_WIDTH_MM;
}

function getPdfBottomY(doc: jsPDF) {
  return getPdfPageHeight(doc) - PDF_FOOTER_RESERVE_MM;
}

function ensurePdfSpace(doc: jsPDF, y: number, requiredHeight = 50) {
  if (y + requiredHeight <= getPdfBottomY(doc)) return y;
  doc.addPage();
  return PDF_TOP_MARGIN_MM;
}

function ensurePdfSectionFits(doc: jsPDF, y: number, requiredHeight = 50) {
  return ensurePdfSpace(doc, y, requiredHeight);
}

function ensurePdfSpaceWithContinuation(
  doc: jsPDF,
  y: number,
  requiredHeight: number,
  continuationTitle?: string,
) {
  if (y + requiredHeight <= getPdfBottomY(doc)) return y;
  doc.addPage();
  if (!continuationTitle) return PDF_TOP_MARGIN_MM;

  drawPdfSectionTitle(doc, continuationTitle, PDF_TOP_MARGIN_MM);
  return PDF_TOP_MARGIN_MM + 8;
}

function estimatePdfTextBlockHeight(
  doc: jsPDF,
  text: string | string[],
  maxWidth: number,
  lineHeight = 4.5,
) {
  const lines = Array.isArray(text)
    ? text.flatMap((line) => doc.splitTextToSize(formatPdfText(line), maxWidth))
    : doc.splitTextToSize(formatPdfText(text), maxWidth);
  return lines.length * lineHeight;
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

function estimatePdfTableSectionHeight(rowCount: number, rowHeight: number, titleGap = EXECUTIVE_SECTION_TITLE_TO_TABLE_MM) {
  const headingHeight = 7;
  const tableHeaderHeight = rowHeight;
  return headingHeight + titleGap + tableHeaderHeight + rowCount * rowHeight;
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
    margin: { left: PDF_MARGIN_MM, right: PDF_MARGIN_MM, ...options.margin },
    head: formatPdfTableValue(options.head) as typeof options.head,
    body: formatPdfTableValue(options.body) as typeof options.body,
    foot: formatPdfTableValue(options.foot) as typeof options.foot,
  });
}

function handleExportMenuItem(callback: () => void) {
  setIsExportMenuOpen(false);
  callback();
  exportMenuTriggerRef.current?.focus();
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
      ['Boundary review status', formatBoundaryReviewStatus(boundary)],
      ['Boundary version', `v${boundary.boundaryVersion ?? 1}`],
      ['Boundary reviewed by', boundary.boundaryReviewedBy || 'Not assigned'],
      ['Boundary reviewed at', formatBoundaryReviewedAt(boundary.boundaryReviewedAt)],
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
  regulatoryReportingReference: RegulatoryReportingReference,
) {
  const y = ensurePdfSpace(doc, startY, 58);
  const body = [
    ['Purpose', REGULATORY_REPORTING_REFERENCE_TEXT],
    [
      'Current regulatory/reporting references',
      regulatoryReportingReference.currentSystems.join('\n'),
    ],
    ...(regulatoryReportingReference.historicalNotes.length
      ? [[
          'Historical / period-specific reference',
          regulatoryReportingReference.historicalNotes.join('\n'),
        ]]
      : []),
    [
      'Regulatory threshold provenance',
      regulatoryReportingReference.thresholdReferences.length
        ? regulatoryReportingReference.thresholdReferences
            .map(formatRegulatoryThresholdReference)
            .join('\n')
        : 'Regulatory threshold screening is not yet configured with reviewed source provenance for this jurisdiction.',
    ],
    [
      'Important note',
      'Reference only. CarbonLite does not determine regulatory obligations. Consult a qualified professional before making regulatory filing or compliance decisions.',
    ],
  ];

  drawPdfSectionTitle(doc, REGULATORY_REPORTING_REFERENCE_TITLE, y);
  autoTablePdf(doc, {
    startY: y + 6,
    head: [['Reference Note', 'Details']],
    body,
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
  sourceReviewSummary?: SourceReviewSummary | null,
) {
  let y = ensurePdfSpace(doc, startY, 92);
  drawPdfSectionTitle(doc, 'Emissions Hotspots', y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  y = drawPdfTextBlock(
    doc,
    'This section highlights the activity categories contributing the largest share of current estimated emissions. Hotspot analysis helps identify where the organization may want to focus first for factor validation, data quality improvement, and, where estimates are confirmed, reduction planning.',
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

    y = ensurePdfSpace(doc, y, 38);
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(14, y, 182, 32, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(6, 95, 70);
    doc.text(`Top Emissions Hotspot: ${top.displayName}`, 18, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    y = drawPdfTextBlock(
      doc,
      top.focusMessage,
      18,
      y + 15,
      170,
      4.2,
    ) + 10;

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
      head: [['#', 'Category', 'Calculated Emissions', 'Share', 'Records', 'Hotspot Level', 'Confidence / Readiness', 'Focus Message']],
      body: analysis.categoryHotspots.map((row) => [
        row.rank,
        row.displayName,
        formatEmissionsWithUnit(row.emissions),
        `${formatDisplayNumber(row.percentageOfTotal)}%`,
        row.calculatedRecordCount,
        formatHotspotLevelForPdf(row.hotspotLevel),
        `${row.estimateConfidence}\n${row.decisionReadiness}`,
        row.focusMessage,
      ]),
      styles: { fontSize: 6.5, cellPadding: 1.5 },
      headStyles: { fillColor: [15, 23, 42] },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 22 },
        2: { cellWidth: 24 },
        3: { cellWidth: 13 },
        4: { cellWidth: 12 },
        5: { cellWidth: 16 },
        6: { cellWidth: 36 },
        7: { cellWidth: 50 },
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
      formatHotspotExclusionNote({ ...analysis, sourceReviewSummary }),
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

function buildCanonicalReportData(): CanonicalReportData {
  const outputGeneratedDate = new Date().toISOString().slice(0, 10);
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
      : 'Not applicable';

  return {
    outputGeneratedDate,
    organizationName,
    reportPeriod,
    reportScopeLabel,
    documentControl: currentReportDocumentControl,
    executiveSummary,
    reportCountSummary,
    primarySkippedReasons: buildPrimarySkippedReasonSummary(calculationDetails, reportCountSummary),
    hotspotAnalysis: buildHotspotAnalysis(calculationDetails),
    calculationCoverage,
    coverageCounts,
    scopeSummary,
    sourceReviewSummary,
    reportingReadinessAssessment,
    dataReadinessSummary,
    totalsByMetric,
    inventoryBoundary,
    regulatoryReportingReference,
    totalEstimatedEmissionsKgCO2e,
    calculationDetails,
  };
}

function handleDownloadPDF(profile: ReportOutputProfile = 'TECHNICAL_REVIEW') {
  if (!hasReportOutput) return;

  const canonicalData = buildCanonicalReportData();
  if (profile === 'EXECUTIVE_SUMMARY') {
    downloadExecutiveSummaryPdf(canonicalData);
    return;
  }

  downloadTechnicalReviewPackagePdf(canonicalData);
}

function downloadTechnicalReviewPackagePdf(canonicalData: CanonicalReportData) {
  const doc = new jsPDF();
  const today = canonicalData.outputGeneratedDate;
  const {
    calculationCoverage,
    coverageCounts,
    documentControl,
    executiveSummary,
    hotspotAnalysis,
    primarySkippedReasons,
    totalsByMetric,
  } = canonicalData;
  doc.setProperties({
    title: `CarbonLite Technical Review Package - ${documentControl.reportId}`,
    subject: `Report ID ${documentControl.reportId}; ${documentControl.reportVersion}; ${documentControl.reviewStatus}`,
    author: 'CarbonLite',
    creator: documentControl.generatedWith,
    keywords: `CarbonLite, technical review package, ${documentControl.reportId}, ${documentControl.reviewStatus}`,
  });
  drawReportPdfCover(doc, {
    organizationName,
    reportPeriod,
    reportScopeLabel,
    generatedDate: today,
    documentControl,
    outputProfile: 'TECHNICAL_REVIEW',
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
      ['Imported Activity Records', reportCountSummary.totalRecordsFound],
      ['Records Included in GHG Total', executiveSummary.recordsIncluded],
      ['Tracked Metrics', executiveSummary.trackedMetrics],
      ['Imported Activity Records Requiring Review', executiveSummary.recordsRequiringReview],
      ['Unresolved Source Rows Remaining in Input Review', formatSourceReviewCount(sourceReviewSummary, sourceReviewSummary.needsReviewCount)],
      ['Primary Activity Types', executiveSummary.primaryActivityTypes],
      ['Missing Factor Count', primarySkippedReasons.missingFactor],
      ['Calculation Coverage', executiveSummary.dataQualityCoverage],
    ],
  });

  nextY = (doc as any).lastAutoTable.finalY + 12;
  nextY = drawEmissionsHotspotsPdfSection(doc, hotspotAnalysis, nextY, sourceReviewSummary);

  nextY = ensurePdfSpace(doc, nextY, 52);
  drawPdfSectionTitle(doc, 'Calculation Quality Summary', nextY);
  autoTablePdf(doc, {
    startY: nextY + 6,
    head: [['Quality Measure', 'Value']],
    body: [
      ['Imported Activity Records', reportCountSummary.totalRecordsFound],
      ['Records Included in GHG Total', reportCountSummary.processedRecords],
      ['Tracked Metrics', primarySkippedReasons.trackedOnly],
      ['Imported Activity Records Requiring Review', executiveSummary.recordsRequiringReview],
      ['Unresolved Source Rows Remaining in Input Review', formatSourceReviewCount(sourceReviewSummary, sourceReviewSummary.needsReviewCount)],
      ['Missing Factors', primarySkippedReasons.missingFactor],
      ['Missing Jurisdiction', primarySkippedReasons.missingJurisdiction],
      ['Invalid Unit', primarySkippedReasons.invalidUnit],
      ['Imported Activity Review Reasons', formatReviewReasons(primarySkippedReasons)],
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
      ['Reviewable Source Rows', formatSourceReviewCount(sourceReviewSummary, sourceReviewSummary.totalRows)],
      ['Rows Resolved / Imported', sourceReviewSummary.available ? `${sourceReviewSummary.resolvedCount} of ${sourceReviewSummary.totalRows}` : formatSourceReviewCount(sourceReviewSummary, sourceReviewSummary.importedCount ?? 0)],
      ['Emission Rows Eligible for Import', formatSourceReviewCount(sourceReviewSummary, sourceReviewSummary.readyCount)],
      ['Tracked Operational Rows', formatSourceReviewCount(sourceReviewSummary, sourceReviewSummary.trackedOnlyCount)],
      ['Source Rows Still Requiring Review', formatSourceReviewCount(sourceReviewSummary, sourceReviewSummary.needsReviewCount)],
      ['Review Count Distinction', getSourceReviewSectionNote(sourceReviewSummary)],
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
  drawPdfSectionTitle(doc, 'Reporting Readiness Checklist', nextY);
  autoTablePdf(doc, {
    startY: nextY + 6,
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    head: [['Item', 'Status', 'Evidence']],
    body: [
      ...buildReadinessPdfRows(reportingReadinessAssessment),
      [
        'Calculation Coverage',
        calculationCoverage,
        `Calculated emission-bearing records divided by eligible emission-bearing records. ${coverageCounts.calculatedRecords} of ${coverageCounts.eligibleEmissionBearingRecords} eligible emission-bearing records were calculated as GHG emissions records; ${primarySkippedReasons.trackedOnly} record${primarySkippedReasons.trackedOnly === 1 ? ' was' : 's were'} tracked as operational ${primarySkippedReasons.trackedOnly === 1 ? 'metric' : 'metrics'} and excluded from the denominator.`,
      ],
      [
        'Optional Data Completeness',
        `${formatDisplayNumber(dataReadinessSummary.optionalDataCompleteness.score)}%`,
        formatOptionalDataCompletenessDetail(dataReadinessSummary),
      ],
    ],
    styles: { fontSize: 8, cellPadding: 1.8, valign: 'top' },
    headStyles: { fillColor: [71, 85, 105] },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 38 },
      2: { cellWidth: 92 },
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
    const facilityThresholdDescription = [
      'Regulatory threshold screening is not yet configured with reviewed source provenance for this jurisdiction.',
      'Reviewed regulatory source provenance is required before threshold screening.',
      FACILITY_THRESHOLD_REFERENCE_DISCLAIMER,
    ];
    const facilityThresholdTextHeight = estimatePdfTextBlockHeight(
      doc,
      facilityThresholdDescription,
      getPdfUsableWidth(doc),
      4.1,
    );
    nextY = ensurePdfSectionFits(
      doc,
      nextY,
      8 + facilityThresholdTextHeight + 18 + Math.min(facilityThresholdReferenceRows.length, 2) * 12,
    );
    drawPdfSectionTitle(doc, 'Facility-Level Reporting Threshold Reference', nextY);
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(
      facilityThresholdDescription,
      PDF_MARGIN_MM,
      nextY + 7,
      { maxWidth: getPdfUsableWidth(doc) },
    );
    autoTablePdf(doc, {
      startY: nextY + 10 + facilityThresholdTextHeight,
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
      : [['No activity records with matching emission factors.', '', '', '', '', '', '']],
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
      : [['No emission factors found for this report scope.', '', '', '', '', '', '']],
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
    nextY = drawFactorDetailsPdfSection(doc, conversionFactorsUsed, nextY);
  }

  nextY = ensurePdfSpace(doc, nextY, 66);

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
    head: [['Canonical Stage', 'Summary']],
    body: [
      [
        `Stage ${getWorkflowStage('SOURCE_DATA').step}: ${getWorkflowStage('SOURCE_DATA').title}`,
        sourceFiles.length
          ? sourceFiles.join(', ')
          : 'Source evidence requires review. The original file or source reference was not available.',
      ],
      [
        `Stage ${getWorkflowStage('DATA_ISSUES').step}: ${getWorkflowStage('DATA_ISSUES').title}`,
        `${reportCountSummary.processedRecords} emissions records and ${calculationDetails.filter(isTrackedMetricDetail).length} tracked metric were imported; ${formatSourceReviewCount(sourceReviewSummary, sourceReviewSummary.needsReviewCount)} unresolved source rows remain in Input Review. ${calculationDetails.filter(isRecordRequiringCorrection).length} imported activity records require review.`,
      ],
      [
        `Stage ${getWorkflowStage('REPORT').step}: ${getWorkflowStage('REPORT').title}`,
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
  doc.text('Imported Activity Records Requiring Review', 14, nextY + 10);
  const reviewRows = calculationDetails.filter(isRecordRequiringCorrection);
  const trackedMetricRows = calculationDetails.filter(isTrackedMetricDetail);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const reviewNoteY = drawPdfTextBlock(
    doc,
    'Unresolved source rows have not been imported into ActivityData and are not counted as imported activity records requiring review.',
    PDF_MARGIN_MM,
    nextY + 16,
    getPdfAppendixUsableWidth(doc),
    4,
  );
  autoTablePdf(doc, {
    startY: reviewNoteY + 3,
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

  nextY = drawRegulatoryReportingReferencePdfSection(doc, nextY + 10, regulatoryReportingReference);
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
    PDF_MARGIN_MM,
    nextY + 8,
    getPdfTextWidthFromX(doc, PDF_MARGIN_MM),
    4.1,
  );
  autoTablePdf(doc, {
    startY: nextY + 4,
    margin: { left: PDF_MARGIN_MM, right: PDF_MARGIN_MM },
    tableWidth: getPdfAppendixUsableWidth(doc),
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    head: [[
      'Activity Type',
      'Quantity',
      'Unit',
      'Date',
      'Source File',
      'Source / Import Method',
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
          formatSourceEvidenceMethod(item.sourceType, item.importMethod),
          item.sourceReference,
          item.matchingStatus,
          item.reportTreatment,
          item.notes,
        ])
      : [['No source evidence available.', '', '', '', '', '', '', '', '', '']],
    styles: { fontSize: 7.2, cellPadding: 1.35, valign: 'top', overflow: 'linebreak' },
    headStyles: { fillColor: [15, 23, 42] },
    columnStyles: {
      0: { cellWidth: 31 },
      1: { cellWidth: 13 },
      2: { cellWidth: 11 },
      3: { cellWidth: 17 },
      4: { cellWidth: 36 },
      5: { cellWidth: 27 },
      6: { cellWidth: 42 },
      7: { cellWidth: 23 },
      8: { cellWidth: 18 },
      9: { cellWidth: 47 },
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
    PDF_MARGIN_MM,
    nextY + 8,
    getPdfTextWidthFromX(doc, PDF_MARGIN_MM),
    4.1,
  );
  autoTablePdf(doc, {
    startY: nextY + 4,
    margin: { left: PDF_MARGIN_MM, right: PDF_MARGIN_MM },
    tableWidth: getPdfAppendixUsableWidth(doc),
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
      : [[getSourceReviewAppendixEmptyMessage(sourceReviewSummary), '', '', '', '', '', '', '', '']],
    styles: { fontSize: 6.4, cellPadding: 1.1, valign: 'top', overflow: 'linebreak' },
    headStyles: { fillColor: [146, 64, 14] },
    columnStyles: {
      0: { cellWidth: 27 },
      1: { cellWidth: 13 },
      2: { cellWidth: 23 },
      3: { cellWidth: 12 },
      4: { cellWidth: 9 },
      5: { cellWidth: 22 },
      6: { cellWidth: 23 },
      7: { cellWidth: 84 },
      8: { cellWidth: 52 },
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

  addPdfDocumentControlFooters(doc, documentControl);
  doc.save(getReportPdfFileName('TECHNICAL_REVIEW', documentControl, today));
  void createClientAuditLog({
    action: 'EXPORT_PDF',
    entityType: 'Report',
    description: `Exported technical review package for ${reportScopeLabel}`,
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
      outputProfile: 'TECHNICAL_REVIEW',
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
      eventLabel: 'Technical review package generated',
      outputProfile: 'TECHNICAL_REVIEW',
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
    outputProfile: 'TECHNICAL_REVIEW',
    reportScope,
    recordCount: reportCountSummary.processedRecords,
  });
}

function drawFactorDetailsPdfSection(
  doc: jsPDF,
  factors: FormalConversionFactorUsed[],
  startY: number,
) {
  const firstBlockHeight = factors[0] ? estimateFactorDetailBlockHeight(doc, factors[0]) : 0;
  let nextY = ensurePdfSpace(doc, startY, 8 + firstBlockHeight);

  drawPdfSectionTitle(doc, 'Factor Details / Assumptions', nextY);
  nextY += 8;

  factors.forEach((factor) => {
    const blockHeight = estimateFactorDetailBlockHeight(doc, factor);
    nextY = ensurePdfSpaceWithContinuation(
      doc,
      nextY,
      blockHeight,
      'Factor Details / Assumptions (continued)',
    );
    nextY = drawFactorDetailBlock(doc, factor, nextY);
  });

  return nextY;
}

function buildFactorDetailText(factor: FormalConversionFactorUsed) {
  const factorName =
    getFactorDisplayName(factor.factorName) ||
    getActivityTypeLabel(factor.activityType) ||
    'Factor not specified';

  return [
    `Factor: ${factorName}`,
    `Value: ${formatFactorValue(factor.factorValue)} ${formatReportFactorUnit(factor.resultUnit, factor.inputUnit)}`,
    `Source: ${formatReportFactorSource(factor)}`,
    `Version: ${formatReportFactorVersion(factor)}`,
    `Verification: ${formatReportVerification(factor)}`,
    `Confidence: ${formatCredibilityLabel(factor.confidenceLevel) || 'Not specified'}`,
    `Assumption: ${formatReportAssumptions(factor)}`,
  ].join('\n');
}

function estimateFactorDetailBlockHeight(doc: jsPDF, factor: FormalConversionFactorUsed) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  return (
    estimatePdfTextBlockHeight(
      doc,
      buildFactorDetailText(factor),
      FACTOR_DETAIL_TEXT_WIDTH_MM,
      FACTOR_DETAIL_LINE_HEIGHT_MM,
    ) + FACTOR_DETAIL_BLOCK_SPACING_MM
  );
}

function drawFactorDetailBlock(doc: jsPDF, factor: FormalConversionFactorUsed, y: number) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(51, 65, 85);
  return (
    drawPdfTextBlock(
      doc,
      buildFactorDetailText(factor),
      PDF_MARGIN_MM,
      y,
      FACTOR_DETAIL_TEXT_WIDTH_MM,
      FACTOR_DETAIL_LINE_HEIGHT_MM,
    ) + FACTOR_DETAIL_BLOCK_SPACING_MM
  );
}

function downloadExecutiveSummaryPdf(canonicalData: CanonicalReportData) {
  const doc = new jsPDF();
  const {
    calculationCoverage,
    coverageCounts,
    documentControl,
    executiveSummary,
    hotspotAnalysis,
    outputGeneratedDate,
    primarySkippedReasons,
    reportingReadinessAssessment,
    scopeSummary: pdfScopeSummary,
    sourceReviewSummary: pdfSourceReviewSummary,
  } = canonicalData;
  const factorReviewCount = getFactorReviewRequiredCount(conversionFactorsUsed);
  const keyPriorities = buildExecutiveKeyPriorities({
    factorReviewCount,
    sourceReviewSummary: pdfSourceReviewSummary,
    readinessAssessment: reportingReadinessAssessment,
    documentControl,
  });

  doc.setProperties({
    title: `CarbonLite Executive Summary - ${documentControl.reportId}`,
    subject: `Report ID ${documentControl.reportId}; ${documentControl.reportVersion}; ${documentControl.reviewStatus}`,
    author: 'CarbonLite',
    creator: documentControl.generatedWith,
    keywords: `CarbonLite, executive summary, ${documentControl.reportId}, ${documentControl.reviewStatus}`,
  });
  drawReportPdfCover(doc, {
    organizationName,
    reportPeriod,
    reportScopeLabel,
    generatedDate: outputGeneratedDate,
    documentControl,
    outputProfile: 'EXECUTIVE_SUMMARY',
  });

  doc.addPage();
  let nextY = 18;
  drawPdfSectionTitle(doc, 'Executive Snapshot', nextY);
  autoTablePdf(doc, {
    startY: nextY + EXECUTIVE_SECTION_TITLE_TO_TABLE_MM,
    head: [['Measure', 'Value']],
    body: [
      ['Estimated Emissions', executiveSummary.estimatedEmissions],
      ['Scope 1', formatEmissionsWithUnit(pdfScopeSummary['Scope 1'])],
      ['Scope 2', formatEmissionsWithUnit(pdfScopeSummary['Scope 2'])],
      ['Scope 3', formatEmissionsWithUnit(pdfScopeSummary['Scope 3'])],
      ['Imported Activity Records', reportCountSummary.totalRecordsFound],
      ['Records Included in GHG Total', reportCountSummary.processedRecords],
      [
        'Calculation Coverage',
        `${calculationCoverage} (${coverageCounts.calculatedRecords} of ${coverageCounts.eligibleEmissionBearingRecords} eligible emissions records calculated)`,
      ],
      ['Tracked Metrics', primarySkippedReasons.trackedOnly],
      ['Source Review', formatExecutiveSourceReviewStatus(pdfSourceReviewSummary)],
      [
        'Factor Review',
        `${factorReviewCount} of ${conversionFactorsUsed.length} emission ${conversionFactorsUsed.length === 1 ? 'factor' : 'factors'} require review before formal reporting.`,
      ],
      ['Boundary', formatReadinessStatus(getReadinessItemStatus(reportingReadinessAssessment, 'boundary'))],
      ['Reviewer', documentControl.reviewStatus],
    ],
    styles: { fontSize: 8.1, cellPadding: 1.25, valign: 'top' },
    headStyles: { fillColor: [15, 23, 42] },
    columnStyles: {
      0: { cellWidth: 62 },
      1: { cellWidth: 118 },
    },
  });

  nextY = ((doc as any).lastAutoTable?.finalY ?? nextY) + EXECUTIVE_SECTION_GAP_MM;
  nextY = ensurePdfSpace(
    doc,
    nextY,
    estimatePdfTableSectionHeight(Math.max(1, hotspotAnalysis.categoryHotspots.slice(0, 5).length), 6.4),
  );
  drawPdfSectionTitle(doc, 'Emissions Overview', nextY);
  const contributorRows = hotspotAnalysis.categoryHotspots.slice(0, 5).map((row) => [
    row.displayName,
    formatEmissionsWithUnit(row.emissions),
    `${formatDisplayNumber(row.percentageOfTotal)}%`,
  ]);
  autoTablePdf(doc, {
    startY: nextY + EXECUTIVE_SECTION_TITLE_TO_TABLE_MM,
    head: [['Top Estimated Contributors', 'Estimated Emissions', 'Share']],
    body: contributorRows.length
      ? contributorRows
      : [['No calculated emissions contributors available.', '', '']],
    styles: { fontSize: 7.8, cellPadding: 1.05, valign: 'top' },
    headStyles: { fillColor: [15, 23, 42] },
    columnStyles: {
      0: { cellWidth: 76 },
      1: { cellWidth: 56 },
      2: { cellWidth: 36 },
    },
  });

  nextY = ((doc as any).lastAutoTable?.finalY ?? nextY) + EXECUTIVE_SECTION_GAP_MM;
  nextY = ensurePdfSpace(
    doc,
    nextY,
    estimatePdfTableSectionHeight(reportingReadinessAssessment.items.length, 7.2),
  );
  drawPdfSectionTitle(doc, 'Reporting Readiness', nextY);
  autoTablePdf(doc, {
    startY: nextY + EXECUTIVE_SECTION_TITLE_TO_TABLE_MM,
    head: [['Checklist Item', 'Status', 'Evidence']],
    body: reportingReadinessAssessment.items.map((item) => [
      item.label,
      formatReadinessStatus(item.status),
      item.evidence,
    ]),
    styles: { fontSize: 6.9, cellPadding: 0.85, valign: 'top' },
    headStyles: { fillColor: [71, 85, 105] },
    columnStyles: {
      0: { cellWidth: 48 },
      1: { cellWidth: 30 },
      2: { cellWidth: 102 },
    },
  });

  nextY = ((doc as any).lastAutoTable?.finalY ?? nextY) + EXECUTIVE_SECTION_GAP_MM;
  nextY = ensurePdfSpace(
    doc,
    nextY,
    estimatePdfTableSectionHeight(Math.max(1, keyPriorities.length), 6.6),
  );
  drawPdfSectionTitle(doc, 'Key Review Priorities', nextY);
  autoTablePdf(doc, {
    startY: nextY + EXECUTIVE_SECTION_TITLE_TO_TABLE_MM,
    head: [['Priority', 'Action']],
    body: keyPriorities.map((priority, index) => [index + 1, priority]),
    styles: { fontSize: 7.4, cellPadding: 0.95, valign: 'top' },
    headStyles: { fillColor: [146, 64, 14] },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 158 },
    },
  });

  nextY = ((doc as any).lastAutoTable?.finalY ?? nextY) + EXECUTIVE_SECTION_GAP_MM;
  const limitationsText = buildExecutiveLimitationsSentence({
    factorReviewCount,
    sourceReviewSummary: pdfSourceReviewSummary,
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  const limitationsHeight = estimatePdfTextBlockHeight(doc, limitationsText, 180, 3.8);
  nextY = ensurePdfSpace(doc, nextY, 7 + 5 + limitationsHeight);
  drawPdfSectionTitle(doc, 'Limitations', nextY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(71, 85, 105);
  drawPdfTextBlock(
    doc,
    limitationsText,
    14,
    nextY + 7,
    180,
    3.8,
  );

  addPdfDocumentControlFooters(doc, documentControl);
  doc.save(getReportPdfFileName('EXECUTIVE_SUMMARY', documentControl, outputGeneratedDate));
  void createClientAuditLog({
    action: 'EXPORT_PDF',
    entityType: 'Report',
    description: `Exported executive summary for ${reportScopeLabel}`,
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
      outputProfile: 'EXECUTIVE_SUMMARY',
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
    metadata: {
      ...buildWorkflowReportSummary({
        calculationDetails,
        totalEstimatedEmissionsKgCO2e,
        countSummary,
        reportFormat: 'PDF',
        eventLabel: 'Executive summary generated',
        exportStatus: 'EXPORTED',
        reportPeriod,
        reportScopeLabel,
      }),
      outputProfile: 'EXECUTIVE_SUMMARY',
    },
  })
    .then(() => loadWorkflowEvents())
    .catch(() => {
      // PDF audit should not block export.
    });
  track('REPORT_PDF_EXPORTED', {
    reportType: 'emissions',
    outputProfile: 'EXECUTIVE_SUMMARY',
    reportScope,
    recordCount: reportCountSummary.processedRecords,
  });
}

function buildExecutiveLimitationsSentence(input: {
  factorReviewCount: number;
  sourceReviewSummary: SourceReviewSummary;
}) {
  const limitations = ['Results are pilot estimates.'];

  if (input.factorReviewCount > 0) {
    limitations.push(
      `${input.factorReviewCount} emission ${input.factorReviewCount === 1 ? 'factor requires' : 'factors require'} review before formal use.`,
    );
  }

  const sourceLimitation = getSourceReviewLimitationSentence(input.sourceReviewSummary);
  if (sourceLimitation) {
    limitations.push(sourceLimitation);
  }

  limitations.push('CarbonLite does not provide regulatory assurance, third-party verification, or carbon credit eligibility determination.');
  return limitations.join(' ');
}

function getSourceReviewLimitationSentence(summary: SourceReviewSummary) {
  if (summary.availability === 'STRUCTURED_REVIEW_AVAILABLE') {
    if (summary.needsReviewCount > 0) {
      return `${summary.needsReviewCount} source ${summary.needsReviewCount === 1 ? 'row still requires' : 'rows still require'} review.`;
    }
    return 'No unresolved source-review issues are currently recorded for this report scope.';
  }

  if (summary.availability === 'DOCUMENT_LINEAGE_AVAILABLE') {
    return summary.limitation ||
      'Structured source-review counts are not available for this document import.';
  }

  return summary.limitation || 'Source-document review is not applicable to manually entered records.';
}

function getReportPdfFileName(
  profile: ReportOutputProfile,
  documentControl: PdfDocumentControlMetadata,
  dateText: string,
) {
  const reportId = documentControl.reportId.toLowerCase();
  const version = documentControl.reportVersion.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const profileSlug =
    profile === 'EXECUTIVE_SUMMARY'
      ? 'executive-summary'
      : 'technical-review-package';

  return `carbonlite-${profileSlug}-${dateText}-${reportId}-${version}.pdf`;
}

function getFactorReviewRequiredCount(factors: FormalConversionFactorUsed[]) {
  return factors.filter((factor) => {
    const status = String(
      factor.verificationStatus ||
        factor.factorStatus ||
        factor.confidence ||
        factor.confidenceLevel ||
        '',
    ).toUpperCase();
    return (
      !factor.verified ||
      status.includes('REVIEW') ||
      status.includes('DRAFT') ||
      status.includes('LOW') ||
      status.includes('PLACEHOLDER') ||
      status.includes('PILOT')
    );
  }).length;
}

function getReadinessItemStatus(
  assessment: ReportingReadinessAssessment,
  codeFragment: string,
) {
  const normalized = codeFragment.toLowerCase();
  return assessment.items.find((item) => item.code.toLowerCase().includes(normalized))?.status ??
    assessment.overallStatus;
}

function formatExecutiveSourceReviewStatus(summary: SourceReviewSummary) {
  if (summary.availability === 'DOCUMENT_LINEAGE_AVAILABLE') return 'Document source lineage available';
  if (!summary.available) return 'Not applicable';
  return `${summary.totalRows} rows reviewed; ${summary.resolvedCount} resolved/imported; ${summary.needsReviewCount} require review`;
}

function buildExecutiveKeyPriorities(input: {
  factorReviewCount: number;
  sourceReviewSummary: SourceReviewSummary;
  readinessAssessment: ReportingReadinessAssessment;
  documentControl: PdfDocumentControlMetadata;
}) {
  const priorities: string[] = [];
  if (input.sourceReviewSummary.available && input.sourceReviewSummary.needsReviewCount > 0) {
    priorities.push(`Resolve the ${input.sourceReviewSummary.needsReviewCount} remaining source-data issue${input.sourceReviewSummary.needsReviewCount === 1 ? '' : 's'}.`);
  }
  if (input.factorReviewCount > 0) {
    priorities.push(input.factorReviewCount === 1
      ? 'Review or replace the pilot-stage emission factor.'
      : `Review or replace ${input.factorReviewCount} pilot-stage emission factors.`);
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
    priorities.push('Maintain source, factor, and calculation evidence with the technical review package.');
  }
  return priorities;
}

function drawReportPdfCover(
  doc: jsPDF,
  input: {
    organizationName: string;
    reportPeriod: string;
    reportScopeLabel: string;
    generatedDate: string;
    documentControl: PdfDocumentControlMetadata;
    outputProfile: ReportOutputProfile;
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
  doc.text(REPORT_OUTPUT_PROFILE_LABELS[input.outputProfile], x + 19, y + 12);

  doc.setDrawColor(203, 213, 225);
  doc.line(x, y + 28, 186, y + 28);

  doc.setFontSize(25);
  doc.setTextColor(15, 23, 42);
  doc.text(`CarbonLite ${REPORT_OUTPUT_PROFILE_LABELS[input.outputProfile]}`, x, y + 62, { maxWidth: 166 });

  doc.setFontSize(16);
  doc.setTextColor(4, 120, 87);
  doc.text(input.organizationName || 'Workspace', x, y + 78);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text('Report Information', x, y + 100);
  autoTablePdf(doc, {
    startY: y + 104,
    margin: { left: x, right: 24 },
    head: [],
    body: [
      ['Report ID', input.documentControl.reportId],
      ['Report Version', input.documentControl.reportVersion],
      ['Report Status', input.documentControl.reportStatus],
      ['Output Profile', REPORT_OUTPUT_PROFILE_LABELS[input.outputProfile]],
      ['Reporting Period', input.reportPeriod],
      ['Report Scope', input.reportScopeLabel],
      ['Generated Date', input.generatedDate],
      ['Prepared By', 'CarbonLite'],
      ['Reviewer', input.documentControl.reviewer],
      ['Review Status', input.documentControl.reviewStatus],
      ['Generated With', input.documentControl.generatedWith],
    ],
    styles: { fontSize: 8.5, cellPadding: 1.5, valign: 'top' },
    columnStyles: {
      0: { cellWidth: 42, fontStyle: 'bold', textColor: [51, 65, 85] },
      1: { cellWidth: 120 },
    },
  });

  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const rightMargin = 24;
  drawPdfTextBlock(
    doc,
    'Prepared for review as part of a pilot emissions data readiness and reporting workflow. This draft export is not approved, verified, certified, or assured.',
    x,
    pageHeight - 31,
    pageWidth - x - rightMargin,
    4.2,
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

function buildRegulatoryReportingReference({
  reportStartDate,
  reportEndDate,
  hasAlbertaContext,
  thresholdReferences = REVIEWED_REGULATORY_THRESHOLD_REFERENCES,
}: {
  reportStartDate?: string | null;
  reportEndDate?: string | null;
  hasAlbertaContext: boolean;
  thresholdReferences?: FacilityRegulatoryThresholdReference[];
}): RegulatoryReportingReference {
  const currentSystems = hasAlbertaContext
    ? [...BASE_REGULATORY_REPORTING_SYSTEMS, ...ALBERTA_REGULATORY_REPORTING_SYSTEMS]
    : [...BASE_REGULATORY_REPORTING_SYSTEMS];
  const historicalNotes: string[] = [];
  const startDate = normalizeDateOnlyForComparison(reportStartDate);
  const endDate = normalizeDateOnlyForComparison(reportEndDate);

  if (startDate && endDate) {
    if (endDate < FEDERAL_FUEL_CHARGE_REMOVAL_DATE) {
      historicalNotes.push(HISTORICAL_FEDERAL_FUEL_CHARGE_REFERENCE);
    } else if (startDate < FEDERAL_FUEL_CHARGE_REMOVAL_DATE) {
      historicalNotes.push(TRANSITIONAL_FEDERAL_FUEL_CHARGE_REFERENCE);
    }
  }

  return {
    currentSystems,
    historicalNotes,
    thresholdReferences,
  };
}

function normalizeDateOnlyForComparison(value?: string | null) {
  const candidate = String(value ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : null;
}

function formatRegulatoryThresholdReference(reference: FacilityRegulatoryThresholdReference) {
  return [
    reference.authority ? `Authority: ${reference.authority}` : null,
    reference.programName ? `Program: ${reference.programName}` : null,
    reference.jurisdictionRegion || reference.jurisdictionCountry
      ? `Jurisdiction: ${[reference.jurisdictionRegion, reference.jurisdictionCountry].filter(Boolean).join(', ')}`
      : null,
    Number.isFinite(Number(reference.thresholdValue)) && reference.thresholdUnit
      ? `Threshold: ${Number(reference.thresholdValue).toLocaleString()} ${reference.thresholdUnit}`
      : null,
    reference.checkedDate ? `Checked: ${reference.checkedDate}` : null,
    reference.sourceUrl ? `Source: ${reference.sourceUrl}` : null,
    reference.notes ? `Notes: ${reference.notes}` : null,
  ].filter(Boolean).join(' · ');
}

function buildPdfDocumentControlMetadata(input: {
  organizationName: string;
  organizationId?: string | null;
  reportPeriod: string;
  reportScope: string;
  reportScopeLabel: string;
  generatedBy?: string | null;
  periodEnd?: string | null;
  selectedRecordIds: string[];
  selectedDocumentIds: string[];
  activityDataIds: string[];
  activityRecordIds: string[];
  totalRecordsFound: number;
  processedRecords: number;
  totalEstimatedEmissionsKgCO2e: number;
}): PdfDocumentControlMetadata {
  const reportingYear = getDateOnlyYear(input.periodEnd) ?? getReportPeriodYear(input.reportPeriod) ?? 2026;
  const stablePayload = [
    input.organizationId || input.organizationName,
    input.reportPeriod,
    input.reportScope,
    input.reportScopeLabel,
    input.selectedRecordIds.slice().sort().join(','),
    input.selectedDocumentIds.slice().sort().join(','),
    input.activityDataIds.slice().sort().join(','),
    input.activityRecordIds.slice().sort().join(','),
    input.totalRecordsFound,
    input.processedRecords,
    Math.round(input.totalEstimatedEmissionsKgCO2e * 1000) / 1000,
  ].join('|');

  return {
    reportId: `CL-DRAFT-${reportingYear}-${stableHash(stablePayload)}`,
    reportVersion: REPORT_DOCUMENT_VERSION,
    reportStatus: REPORT_STATUS_PILOT_DRAFT,
    generatedWith: CARBONLITE_TEMPLATE_VERSION,
    generatedBy: String(input.generatedBy ?? '').trim() || 'Unknown user',
    reviewer: REPORT_REVIEWER_NOT_ASSIGNED,
    reviewStatus: REPORT_REVIEW_STATUS_NOT_REVIEWED,
  };
}

function getReportPeriodYear(reportPeriod: string) {
  const match = reportPeriod.match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : null;
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).toUpperCase().padStart(7, '0');
}

function addPdfDocumentControlFooters(doc: jsPDF, metadata: PdfDocumentControlMetadata) {
  const pageCount = doc.getNumberOfPages();

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    doc.setPage(pageNumber);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(formatPdfDocumentControlFooter(metadata, pageNumber, pageCount), pageWidth - 14, pageHeight - 7, {
      align: 'right',
    });
  }
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
}

function formatPdfDocumentControlFooter(
  metadata: Pick<PdfDocumentControlMetadata, 'reportId' | 'reportVersion'>,
  pageNumber: number,
  pageCount: number,
) {
  return `CarbonLite | Report ID ${metadata.reportId} | Version ${metadata.reportVersion} | Page ${pageNumber} of ${pageCount}`;
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
const inventoryBoundary = profileToReportContextInventoryBoundary(organizationProfile, reportPeriod);
const inventoryBoundarySummary = summarizeInventoryBoundary(
  inventoryBoundary,
  reportPeriod,
);
const hasAlbertaContext = hasAlbertaReportingContext({
  calculationDetails,
  activities,
});
const regulatoryReportingReference = buildRegulatoryReportingReference({
  reportStartDate: reportScope === 'dateRange' ? periodStart : null,
  reportEndDate: reportScope === 'dateRange' ? periodEnd : null,
  hasAlbertaContext,
});
const dataReadinessSummary = buildDataReadinessSummary(calculationDetails);
const sourceReviewSummary = buildSourceReviewSummary({
  rows: sourceReviewRows,
  calculationDetails,
});
const reportingCoverageCounts = getCalculationCoverageCounts(calculationDetails);
const reportingCalculationCoverage = reportingCoverageCounts.eligibleEmissionBearingRecords > 0
  ? `${Math.round(
      (reportingCoverageCounts.calculatedRecords / reportingCoverageCounts.eligibleEmissionBearingRecords) *
        1000,
    ) / 10}%`
  : 'Not applicable';
const reportingReadinessAssessment = buildReportingReadinessAssessment({
  calculationDetails,
  inventoryBoundary,
  sourceReviewSummary,
});
const carbonCreditReadiness = buildCarbonCreditReadinessAssessment(
  calculationDetails,
  dataReadinessSummary,
);
const includeCarbonCreditReadinessNotes = DEFAULT_REPORT_OPTIONS.includeCarbonCreditReadinessNotes === true;
const reportCountSummary = buildReportCountSummary(countSummary, calculationDetails);
const currentReportDocumentControl = buildPdfDocumentControlMetadata({
  organizationName,
  organizationId: currentWorkspaceId,
  reportPeriod,
  reportScope,
  reportScopeLabel,
  generatedBy: currentUser?.email,
  periodEnd,
  selectedRecordIds,
  selectedDocumentIds,
  activityDataIds: calculationDetails.map((detail) => detail.activityDataId),
  activityRecordIds: activities.map((activity) => activity.id),
  totalRecordsFound: reportCountSummary.totalRecordsFound,
  processedRecords: reportCountSummary.processedRecords,
  totalEstimatedEmissionsKgCO2e,
});
const auditEvidenceChains = calculationDetails.map((detail) =>
  buildEvidenceChainFromCalculationDetail(detail, {
    report: {
      reportId: currentReportDocumentControl.reportId,
      reportVersion: currentReportDocumentControl.reportVersion,
    },
  }),
);
const auditEvidenceRows = buildEvidenceChainSummaryRows(auditEvidenceChains);
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
            Stage {getWorkflowStage('REPORT').step}: {getWorkflowStage('REPORT').title}. Review your emissions summary, data quality, reporting boundary, and exportable review package. Review Status remains Not reviewed until a human reviewer completes review.
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

        <div ref={exportMenuRef} style={exportMenuWrapperStyle}>
          <button
            ref={exportMenuTriggerRef}
            type="button"
            onClick={() => setIsExportMenuOpen((open) => !open)}
            disabled={exportDisabled}
            title={exportDisabledTitle}
            aria-haspopup="menu"
            aria-expanded={isExportMenuOpen}
            aria-controls="report-export-menu"
            style={primaryButtonStyle(exportDisabled)}
          >
            <span style={exportButtonContentStyle}>
              Export reports
              <span aria-hidden="true" style={exportButtonChevronStyle}>▾</span>
            </span>
          </button>
          {isExportMenuOpen ? (
            <div
              id="report-export-menu"
              role="menu"
              aria-label="Export report"
              style={exportMenuStyle}
            >
              <button
                type="button"
                role="menuitem"
                disabled={exportDisabled}
                onClick={() => handleExportMenuItem(() => handleDownloadPDF('EXECUTIVE_SUMMARY'))}
                style={exportMenuItemStyle(exportDisabled)}
              >
                Executive Summary (PDF)
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={exportDisabled}
                onClick={() => handleExportMenuItem(() => handleDownloadPDF('TECHNICAL_REVIEW'))}
                style={exportMenuItemStyle(exportDisabled)}
              >
                Technical Review Package (PDF)
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={exportDisabled}
                onClick={() => handleExportMenuItem(handleDownloadCSV)}
                style={exportMenuItemStyle(exportDisabled)}
              >
                Data Export (CSV)
              </button>
            </div>
          ) : null}
        </div>
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
            sourceReviewSummary={sourceReviewSummary}
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
              <DataQualityNote label="Readiness Status" value={formatReadinessStatus(reportingReadinessAssessment.overallStatus)} />
              <DataQualityNote label="Calculation Coverage" value={reportingCalculationCoverage} />
              <DataQualityNote
                label="Optional Data Completeness"
                value={`${formatDisplayNumber(dataReadinessSummary.optionalDataCompleteness.score)}%`}
                detail={formatOptionalDataCompletenessDetail(dataReadinessSummary)}
              />
              <DataQualityNote label="Calculated Records" value={dataReadinessSummary.recordsReadyForCalculation} />
              <DataQualityNote label="Imported Activity Records Requiring Review" value={dataReadinessSummary.recordsRequiringReview} />
              <DataQualityNote
                label="Source Rows Still Requiring Review"
                value={formatSourceReviewCount(sourceReviewSummary, sourceReviewSummary.needsReviewCount)}
              />
              <DataQualityNote label="Tracked Operational Metrics" value={dataReadinessSummary.trackedOnlyCount} />
              <DataQualityNote label="Missing Factors" value={dataReadinessSummary.missingFactorCount} />
              <DataQualityNote label="Missing Jurisdiction" value={dataReadinessSummary.missingJurisdictionCount} />
            </div>
            <ReportingReadinessChecklist assessment={reportingReadinessAssessment} />
            <div style={dataQualityExplanationStyle}>
              <strong>How to read these metrics:</strong>
              <p>
                Calculation Coverage is calculated emission-bearing records divided by eligible emission-bearing records. Tracked metrics are retained for review but excluded from the denominator.
              </p>
              <p>
                Reporting Readiness is an evidence-based checklist. Optional metadata such as cost is reported separately and does not reduce readiness.
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
              <DataQualityNote label="Reviewable Source Rows" value={formatSourceReviewCount(sourceReviewSummary, sourceReviewSummary.totalRows)} />
              <DataQualityNote
                label="Rows Resolved / Imported"
                value={sourceReviewSummary.available ? `${sourceReviewSummary.resolvedCount} of ${sourceReviewSummary.totalRows}` : formatSourceReviewCount(sourceReviewSummary, sourceReviewSummary.importedCount ?? 0)}
              />
              <DataQualityNote label="Emission Rows Eligible for Import" value={formatSourceReviewCount(sourceReviewSummary, sourceReviewSummary.readyCount)} />
              <DataQualityNote label="Tracked Operational Rows" value={formatSourceReviewCount(sourceReviewSummary, sourceReviewSummary.trackedOnlyCount)} />
              <DataQualityNote label="Source Rows Still Requiring Review" value={formatSourceReviewCount(sourceReviewSummary, sourceReviewSummary.needsReviewCount)} />
            </div>
            <p style={{ color: reportsPalette.secondaryText, lineHeight: 1.6, marginTop: 10 }}>
              {getSourceReviewSectionNote(sourceReviewSummary)}
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
          <CollapsibleReportSection
            id="audit-evidence-chain-report-section"
            title="Audit / Evidence Chain"
            summary={`${auditEvidenceRows.length} source-to-report chain${auditEvidenceRows.length === 1 ? '' : 's'} · ${currentReportDocumentControl.reportId}`}
            expanded={expandedSections.auditEvidenceChain}
            onToggle={() => toggleReportSection('auditEvidenceChain')}
          >
            <p style={sectionDescriptionStyle}>
              Read-only evidence chain derived from linked source, review, factor, calculation, scope, and report metadata. Export Audit Evidence for the machine-readable version.
            </p>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Source</th>
                  <th style={thStyle}>Activity</th>
                  <th style={thStyle}>Factor</th>
                  <th style={thStyle}>Calculation</th>
                  <th style={thStyle}>Scope</th>
                  <th style={thStyle}>Report</th>
                  <th style={thStyle}>Warnings</th>
                </tr>
              </thead>
              <tbody>
                {auditEvidenceRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={emptyStyle}>
                      No evidence chains available for this report.
                    </td>
                  </tr>
                ) : (
                  auditEvidenceRows.slice(0, 25).map((row, index) => (
                    <tr key={`${row.source}-${row.activity}-${index}`}>
                      <td style={tdStyle}>{row.source}</td>
                      <td style={tdStyle}>{row.activity}</td>
                      <td style={tdStyle}>{row.factor}</td>
                      <td style={tdStyle}>{row.calculation}</td>
                      <td style={tdStyle}>{row.scope}</td>
                      <td style={tdStyle}>{row.report || currentReportDocumentControl.reportId}</td>
                      <td style={tdStyle}>{row.warnings || 'None'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {auditEvidenceRows.length > 25 ? (
              <p style={{ ...sectionDescriptionStyle, marginTop: 10 }}>
                Showing first 25 chains in the report preview. Export Audit Evidence for the full set.
              </p>
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
              summary="Regulatory threshold screening provenance not configured"
              expanded={expandedSections.facilityThresholdReference}
              onToggle={() => toggleReportSection('facilityThresholdReference')}
            >
              <p style={sectionDescriptionStyle}>
                Regulatory threshold screening is not yet configured with reviewed source provenance for this jurisdiction.
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
            <RegulatoryReportingReferenceContent regulatoryReportingReference={regulatoryReportingReference} />
          </CollapsibleReportSection>
        </>
      ) : null}

      {canViewWorkflowHistory && !isPilotReviewerAccount ? (
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
  regulatoryReportingReference,
}: {
  regulatoryReportingReference: RegulatoryReportingReference;
}) {
  return (
    <div style={regulatoryReferenceContentStyle}>
      <p style={sectionDescriptionStyle}>
        {REGULATORY_REPORTING_REFERENCE_TEXT}
      </p>
      <div>
        <p style={regulatoryReferenceIntroStyle}>Current regulatory/reporting references:</p>
        <ul style={regulatoryReferenceListStyle}>
          {regulatoryReportingReference.currentSystems.map((system) => (
            <li key={system}>{system}</li>
          ))}
        </ul>
      </div>
      {regulatoryReportingReference.historicalNotes.length ? (
        <div>
          <p style={regulatoryReferenceIntroStyle}>Historical / period-specific reference:</p>
          <ul style={regulatoryReferenceListStyle}>
            {regulatoryReportingReference.historicalNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div>
        <p style={regulatoryReferenceIntroStyle}>Regulatory threshold provenance:</p>
        {regulatoryReportingReference.thresholdReferences.length ? (
          <ul style={regulatoryReferenceListStyle}>
            {regulatoryReportingReference.thresholdReferences.map((reference) => (
              <li key={`${reference.jurisdictionRegion}-${reference.programName}`}>
                {formatRegulatoryThresholdReference(reference)}
              </li>
            ))}
          </ul>
        ) : (
          <p style={thresholdDisclaimerStyle}>
            Regulatory threshold screening is not yet configured with reviewed source provenance for this jurisdiction.
          </p>
        )}
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

function ReportingReadinessChecklist({
  assessment,
}: {
  assessment: ReportingReadinessAssessment;
}) {
  return (
    <div style={reportingReadinessChecklistStyle}>
      <h3 style={reportingReadinessChecklistTitleStyle}>Reporting Readiness Checklist</h3>
      {assessment.items.map((item) => (
        <div key={item.code} style={reportingReadinessRowStyle}>
          <span style={reportingReadinessBadgeStyle(item)}>{formatReadinessStatus(item.status)}</span>
          <div>
            <strong>{item.workflowStageLabel}: {item.label}</strong>
            <div style={reportingReadinessEvidenceStyle}>{item.evidence}</div>
            {item.action ? <div style={reportingReadinessActionStyle}>{item.action}</div> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatOptionalDataCompletenessDetail(
  summary: ReturnType<typeof buildDataReadinessSummary>,
) {
  const { costDataCount, totalRecords } = summary.optionalDataCompleteness;
  return `${costDataCount} of ${totalRecords} imported activity records include optional cost data`;
}

function buildReadinessPdfRows(assessment: ReportingReadinessAssessment) {
  return assessment.items.map((item) => [
    `${item.workflowStageLabel}: ${item.label}`,
    formatReadinessStatus(item.status),
    [item.evidence, item.action].filter(Boolean).join(' Action: '),
  ]);
}

type SourceReviewSummary = SourceReviewReadinessSummary & {
  sourceFiles: string[];
  readyCount: number;
  trackedOnlyCount: number;
  resolutionPercent: number;
  needsReviewRows: SpreadsheetReviewRowItem[];
};

function buildSourceReviewSummary(input: {
  rows: SpreadsheetReviewRowItem[];
  calculationDetails: CalculationAuditDetail[];
}): SourceReviewSummary {
  const reviewRows = input.rows.filter((row) => !isSourceReviewSummaryRow(row));
  const readyRows = reviewRows.filter((row) => normalizeReviewStatus(row.status) === 'READY');
  const trackedRows = reviewRows.filter((row) => normalizeReviewStatus(row.status) === 'TRACKED_ONLY');
  const needsReviewRows = reviewRows.filter((row) => normalizeReviewStatus(row.status) === 'NEEDS_REVIEW');
  const resolvedCount = readyRows.length + trackedRows.length;
  const totalRows = reviewRows.length;

  if (totalRows === 0) {
    return buildUnstructuredSourceReviewSummary(input.calculationDetails);
  }

  return {
    available: totalRows > 0,
    availability: 'STRUCTURED_REVIEW_AVAILABLE',
    sourceType: 'SPREADSHEET',
    status: needsReviewRows.length > 0 ? 'NEEDS_ATTENTION' : 'COMPLETE',
    evidence: `${totalRows} source ${totalRows === 1 ? 'row was' : 'rows were'} reviewed.`,
    limitation: needsReviewRows.length > 0
      ? `${needsReviewRows.length} source ${needsReviewRows.length === 1 ? 'row still requires' : 'rows still require'} review.`
      : 'No unresolved source-review issues are currently recorded for this report scope.',
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

function buildUnstructuredSourceReviewSummary(
  calculationDetails: CalculationAuditDetail[],
): SourceReviewSummary {
  const lineageDetails = calculationDetails.filter(hasDocumentSourceLineage);
  const sourceFiles = uniqueReviewValues(lineageDetails.map((detail) => detail.sourceFileName));
  const sourceDocumentCount = uniqueReviewValues(
    lineageDetails.map((detail) => detail.sourceDocumentId || detail.sourceFileName),
  ).length;

  if (lineageDetails.length > 0) {
    return {
      available: false,
      availability: 'DOCUMENT_LINEAGE_AVAILABLE',
      sourceType: 'DOCUMENT',
      status: 'LIMITED',
      evidence: `Source document lineage is available for ${lineageDetails.length} imported ${lineageDetails.length === 1 ? 'record' : 'records'}.`,
      limitation: 'Structured unresolved-source-row counts are not available for this document import.',
      sourceDocumentCount,
      importedCount: lineageDetails.length,
      sourceFiles,
      totalRows: 0,
      readyCount: 0,
      trackedOnlyCount: 0,
      resolvedCount: lineageDetails.length,
      needsReviewCount: 0,
      resolutionPercent: 0,
      needsReviewRows: [],
    };
  }

  return {
    available: false,
    availability: 'NO_SOURCE_REVIEW',
    sourceType: 'MANUAL',
    status: 'NOT_APPLICABLE',
    evidence: 'No source document is associated with this report scope.',
    limitation: 'Source-document review is not applicable to manually entered records.',
    sourceDocumentCount: 0,
    importedCount: calculationDetails.length,
    sourceFiles: [],
    totalRows: 0,
    readyCount: 0,
    trackedOnlyCount: 0,
    resolvedCount: 0,
    needsReviewCount: 0,
    resolutionPercent: 0,
    needsReviewRows: [],
  };
}

function hasDocumentSourceLineage(detail: CalculationAuditDetail) {
  const sourceType = String(detail.sourceType ?? '').toUpperCase();
  const fileName = String(detail.sourceFileName ?? '').trim();
  return Boolean(
    detail.sourceDocumentId ||
      sourceType.includes('DOCUMENT') ||
      sourceType.includes('PDF') ||
      /\.pdf$/i.test(fileName),
  );
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

function formatSourceReviewFiles(summary: SourceReviewSummary) {
  if (summary.availability === 'DOCUMENT_LINEAGE_AVAILABLE') {
    return summary.sourceFiles.length ? summary.sourceFiles.join(', ') : 'Document source file available';
  }
  if (!summary.available) return 'Not applicable';
  return summary.sourceFiles.length ? summary.sourceFiles.join(', ') : 'Source file not specified';
}

function formatSourceReviewCount(summary: SourceReviewSummary, value: number) {
  if (summary.availability === 'DOCUMENT_LINEAGE_AVAILABLE') return 'Limited';
  if (!summary.available) return 'Not applicable';
  return value;
}

function getSourceReviewAppendixEmptyMessage(summary: SourceReviewSummary) {
  if (summary.availability === 'DOCUMENT_LINEAGE_AVAILABLE') {
    return 'Document source lineage is available, but structured source-review rows are not available for this document import.';
  }
  return 'Source-document review is not applicable to manually entered records.';
}

function getSourceReviewSectionNote(summary: SourceReviewSummary) {
  if (summary.availability === 'DOCUMENT_LINEAGE_AVAILABLE') {
    return 'Source document lineage is available for imported records. Structured unresolved-source-row counts are not available for this document import.';
  }
  if (!summary.available) {
    return 'Source-document review is not applicable when this report scope contains manually entered records with no associated source document.';
  }
  return 'Source dataset review status is joined by source document ID. Unresolved source rows remain in spreadsheet review history and are not imported into ActivityData or included in emissions totals.';
}

function formatSourceReviewStatus(summary: SourceReviewSummary) {
  if (summary.availability === 'DOCUMENT_LINEAGE_AVAILABLE') {
    return 'Document source lineage available; structured review counts limited';
  }
  if (!summary.available) return 'Not applicable for manual-only report scope';
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
  return formatCalculationStatusLabel(
    issue?.code || row.calculationStatus || row.matchingStatus || row.status || 'NEEDS_REVIEW',
  ) || 'Needs Review';
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

function formatSourceEvidenceMethod(sourceType?: string | null, importMethod?: string | null) {
  const source = String(sourceType ?? '').trim();
  const method = String(importMethod ?? '').trim();

  if (!source) return method || 'Not specified';
  if (!method || source.toLowerCase() === method.toLowerCase()) return source;
  return `${source} / ${method}`;
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
        <DataQualityNote label="Boundary review status" value={formatBoundaryReviewStatus(boundary)} />
        <DataQualityNote label="Boundary version" value={`v${boundary.boundaryVersion ?? 1}`} />
        <DataQualityNote label="Boundary reviewed by" value={boundary.boundaryReviewedBy || 'Not assigned'} />
        <DataQualityNote label="Boundary reviewed at" value={formatBoundaryReviewedAt(boundary.boundaryReviewedAt)} />
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

function formatBoundaryReviewStatus(boundary: Pick<InventoryBoundary, 'boundaryStatus'>) {
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

function formatBoundaryReviewedAt(value?: string | null) {
  if (!value) return 'Not reviewed';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not reviewed';
  return date.toLocaleString();
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

const exportMenuWrapperStyle: React.CSSProperties = {
  position: 'relative',
  display: 'inline-flex',
};

const exportMenuStyle: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 8px)',
  left: 0,
  zIndex: 30,
  width: 260,
  padding: 6,
  borderRadius: 12,
  border: `1px solid ${reportsPalette.border}`,
  background: reportsPalette.white,
  boxShadow: '0 20px 42px rgba(15, 23, 42, 0.12)',
};

const exportButtonContentStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
};

const exportButtonChevronStyle: React.CSSProperties = {
  fontSize: 12,
  lineHeight: 1,
};

function exportMenuItemStyle(disabled = false): React.CSSProperties {
  return {
    width: '100%',
    display: 'block',
    padding: '9px 10px',
    border: 0,
    borderRadius: 8,
    background: 'transparent',
    color: disabled ? reportsPalette.mutedText : reportsPalette.primaryText,
    fontSize: 13,
    fontWeight: 700,
    textAlign: 'left',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

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

const reportingReadinessChecklistStyle: React.CSSProperties = {
  display: 'grid',
  gap: 8,
  marginTop: 12,
};

const reportingReadinessChecklistTitleStyle: React.CSSProperties = {
  margin: 0,
  color: reportsPalette.primaryText,
  fontSize: 15,
};

const reportingReadinessRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '130px 1fr',
  gap: 10,
  alignItems: 'start',
  padding: 10,
  borderRadius: 12,
  background: reportsPalette.white,
  border: `1px solid ${reportsPalette.border}`,
};

function reportingReadinessBadgeStyle(item: ReportingReadinessItem): React.CSSProperties {
  const palette = item.status === 'COMPLETE'
    ? { bg: '#dcfce7', fg: '#047857', border: '#bbf7d0' }
    : item.status === 'NEEDS_ATTENTION'
    ? { bg: '#fffbeb', fg: '#92400e', border: '#fde68a' }
    : { bg: '#f8fafc', fg: '#475569', border: '#cbd5e1' };

  return {
    display: 'inline-flex',
    justifyContent: 'center',
    width: 'fit-content',
    padding: '4px 8px',
    borderRadius: 999,
    background: palette.bg,
    color: palette.fg,
    border: `1px solid ${palette.border}`,
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: 'nowrap',
  };
}

const reportingReadinessEvidenceStyle: React.CSSProperties = {
  marginTop: 4,
  color: reportsPalette.secondaryText,
  fontSize: 12,
  lineHeight: 1.45,
};

const reportingReadinessActionStyle: React.CSSProperties = {
  marginTop: 4,
  color: reportsPalette.primaryGreen,
  fontSize: 12,
  fontWeight: 700,
  lineHeight: 1.45,
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
