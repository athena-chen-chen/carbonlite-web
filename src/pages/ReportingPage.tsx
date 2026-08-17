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
import { CollapsibleReportSection } from '../components/reports/CollapsibleReportSection';
import { ReportScopeSection } from '../components/reports/sections/ReportScopeSection';
import { getCurrentUser, getOrganizationName } from '../services/auth';
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
import { formatDisplayNumber, formatEmissionsValue } from '../utils/numberFormatting';
import {
  formatScopeClassification,
  formatScopeSource,
  resolveScopeClassification,
} from '../utils/scopeClassification';
import { getActivityTypeLabel } from '../utils/activityType';
import { formatDateOnly } from '../utils/dateOnly';
import { formatCredibilityLabel } from '../utils/factorCredibility';
import {
  formatReportAssumptions,
  formatReportFactorSource,
  formatReportFactorSummaryVerification,
  formatReportFactorUnit,
  formatReportFactorVersion,
  formatReportVerification,
  formatTraceabilityReviewNote,
  getDisplaySourceLabel,
  getTrackedMetricAction,
  getTrackedMetricMessage,
  isRecordRequiringCorrection,
  isTrackedMetricDetail,
} from '../utils/reportCredibility';
import { buildPilotCsv } from '../utils/reportCsvExport';
import { getUserFriendlyErrorMessage } from '../utils/userFriendlyErrors';

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
    label: 'Other indirect emissions',
    description:
      'Other indirect emissions from activities outside direct operations, such as business travel, hotels, shipping, waste, or supplier-related activities.',
    examples: 'Hotel, air travel, shipping, waste, suppliers',
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
  calculationQuality: true,
  calculationSummary: false,
  activityBreakdown: false,
  emissionFactorsUsed: false,
  calculationTraceability: false,
  sourceEvidence: false,
  recordsRequiringReview: false,
  dataQualityNotes: true,
  carbonCreditReadiness: false,
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

export default function ReportingPage() {
  const location = useLocation();
  const navigate = useNavigate();
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
  const [reloadKey, setReloadKey] = useState(0);
  const [periodStart, setPeriodStart] = useState(getDefaultFallbackStartDate());
  const [periodEnd, setPeriodEnd] = useState('2026-12-31');
  const [draftPeriodStart, setDraftPeriodStart] = useState(getDefaultFallbackStartDate());
  const [draftPeriodEnd, setDraftPeriodEnd] = useState('2026-12-31');
  const [dateRangeReady, setDateRangeReady] = useState(false);
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
  const dateCommitTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const inFlightRequestKeyRef = useRef<string | null>(null);
  const trackedReportViewRef = useRef(false);
  async function loadWorkflowEvents() {
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
    setLoading(true);
    setError(null);

    try {
      const overview = await loadMetricsOverview(request);

      setSummary(overview.summary);
      setActivities(overview.activities);
      setMatchedActivityEmissions(overview.matchedActivityEmissions);
      setConversionFactorsUsed(overview.conversionFactorsUsed);
      setCalculationDetails(overview.calculationDetails);
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
    void loadWorkflowEvents();

    return () => {
      if (dateCommitTimerRef.current) {
        window.clearTimeout(dateCommitTimerRef.current);
      }
    };
  }, []);

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

function handleDownloadCSV() {
  if (!hasReportOutput) return;

  const csv = buildPilotCsv(calculationDetails);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `CarbonLite_Sample_Report_Export_v0.1_${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);

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
      `Scope 3 emissions are associated with other indirect activities such as freight, waste, travel, hotels, shipping, or third-party services.`
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
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
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
      doc.text(`${formatEmissionsValue(row.emissions)} kgCO2e`, 169, y);
      y += 10;
    });

    y += 2;
    y = ensurePdfSpace(doc, y, 42);
    autoTable(doc, {
      startY: y,
      head: [['Rank', 'Category', 'Calculated Emissions', 'Share', 'Records', 'Hotspot Level', 'Focus Message']],
      body: analysis.categoryHotspots.map((row) => [
        row.rank,
        row.displayName,
        `${formatEmissionsValue(row.emissions)} kgCO2e`,
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
    autoTable(doc, {
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
    autoTable(doc, {
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
  const hotspotAnalysis = buildHotspotAnalysis(calculationDetails);
  const primarySkippedReasons = buildPrimarySkippedReasonSummary(calculationDetails, reportCountSummary);
  drawReportPdfCover(doc, {
    organizationName,
    reportPeriod,
    reportScopeLabel,
    generatedDate: today,
  });

  doc.addPage();
  drawPdfSectionTitle(doc, 'Executive Summary', 18);
  autoTable(doc, {
    startY: 24,
    head: [['Executive Summary', 'Value']],
    body: [
      ['Estimated Emissions', executiveSummary.estimatedEmissions],
      ['Records Included in GHG Total', executiveSummary.recordsIncluded],
      ['Tracked Operational Metrics', executiveSummary.trackedMetrics],
      ['Records Requiring Review', executiveSummary.recordsRequiringReview],
      ['Primary Activity Types', executiveSummary.primaryActivityTypes],
      ['Missing Factor Count', primarySkippedReasons.missingFactor],
      ['Data Quality Coverage', executiveSummary.dataQualityCoverage],
    ],
  });

  let nextY = (doc as any).lastAutoTable.finalY + 12;
  nextY = drawEmissionsHotspotsPdfSection(doc, hotspotAnalysis, nextY);

  nextY = ensurePdfSpace(doc, nextY, 52);
  drawPdfSectionTitle(doc, 'Calculation Quality Summary', nextY);
  autoTable(doc, {
    startY: nextY + 6,
    head: [['Quality Measure', 'Value']],
    body: [
      ['Total Records Found', reportCountSummary.totalRecordsFound],
      ['Records Calculated', reportCountSummary.processedRecords],
      ['Tracked Operational Metrics', primarySkippedReasons.trackedOnly],
      ['Records Requiring Review', executiveSummary.recordsRequiringReview],
      ['Missing Factors', primarySkippedReasons.missingFactor],
      ['Missing Jurisdiction', primarySkippedReasons.missingJurisdiction],
      ['Invalid Unit', primarySkippedReasons.invalidUnit],
      ['Review Reasons', formatReviewReasons(primarySkippedReasons)],
      [
        'Data Quality Coverage',
        reportCountSummary.totalRecordsFound > 0
          ? `${Math.round(
              (reportCountSummary.processedRecords / reportCountSummary.totalRecordsFound) *
                1000,
            ) / 10}%`
          : '0%',
      ],
    ],
  });

  nextY = (doc as any).lastAutoTable.finalY + 12;
  drawPdfSectionTitle(doc, 'Data Quality Notes', nextY);
  autoTable(doc, {
    startY: nextY + 6,
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    head: [['Readiness Signal', 'Value']],
    body: [
      ['Data Readiness Score', `${formatDisplayNumber(dataReadinessSummary.score)}% (${dataReadinessSummary.level})`],
      ['Calculated Records', dataReadinessSummary.recordsReadyForCalculation],
      ['Records Requiring Review', dataReadinessSummary.recordsRequiringReview],
      ['Tracked Operational Metrics', dataReadinessSummary.trackedOnlyCount],
      ['Missing Factors', dataReadinessSummary.missingFactorCount],
      ['Missing Jurisdiction', dataReadinessSummary.missingJurisdictionCount],
      [
        'Data Quality Coverage Meaning',
        `${reportCountSummary.processedRecords} of ${reportCountSummary.totalRecordsFound} records were calculated as GHG emissions records; ${primarySkippedReasons.trackedOnly} record${primarySkippedReasons.trackedOnly === 1 ? ' was' : 's were'} tracked as operational ${primarySkippedReasons.trackedOnly === 1 ? 'metric' : 'metrics'}.`,
      ],
      [
        'Data Readiness Score Meaning',
        'Broader pilot readiness signal based on calculation coverage, factor match quality, jurisdiction completeness, source traceability, review status, and tracked operational metrics.',
      ],
      [
        'Coverage vs Readiness',
        'Data Quality Coverage and Data Readiness Score are related but not identical. Tracked operational metrics such as Water are retained for review and excluded from the calculated GHG emissions total by design.',
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
  autoTable(doc, {
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
  autoTable(doc, {
    startY: nextY + 6,
    head: [['Scope', 'Description', 'Calculated Emissions', 'Share of Total']],
    body: [
      ...(['Scope 1', 'Scope 2', 'Scope 3'] as const).map((scope) => {
      const emissions = scopeSummary[scope] ?? 0;
      const share = totalEstimatedEmissionsKgCO2e > 0 ? (emissions / totalEstimatedEmissionsKgCO2e) * 100 : 0;
      return [
        scope,
        getScopeDescription(scope),
        `${formatEmissionsValue(emissions)} kgCO2e`,
        `${formatDisplayNumber(share)}%`,
      ];
      }),
      ...(scopeSummary.Unclassified > 0
        ? [[
            'Unclassified',
            'Calculated records requiring scope review',
            `${formatEmissionsValue(scopeSummary.Unclassified)} kgCO2e`,
            `${
              totalEstimatedEmissionsKgCO2e > 0
                ? formatDisplayNumber((scopeSummary.Unclassified / totalEstimatedEmissionsKgCO2e) * 100)
                : '0'
            }%`,
          ]]
        : []),
    ],
  });

  const activityStartY = (doc as any).lastAutoTable.finalY + 14;
  drawPdfSectionTitle(doc, 'Activity Breakdown', activityStartY);
  autoTable(doc, {
    startY: activityStartY + 6,
    head: [['Activity Type', 'Quantity', 'Unit', 'Estimated Emissions', 'Scope', 'Source Reference']],
    body: matchedActivityEmissions.length
      ? matchedActivityEmissions.map((item) => [
          getActivityTypeLabel(item.activityType),
          formatDisplayNumber(item.quantity),
          item.unit,
          `${formatEmissionsValue(item.estimatedEmissionsKgCO2e)} kgCO2e`,
          classifyScope(item.activityType),
          getDisplaySourceLabel(item),
        ])
      : [['No activity records with matching conversion factors.', '', '', '', '', '']],
  });

  nextY = (doc as any).lastAutoTable?.finalY ?? 115;
  if (nextY > 230) {
    doc.addPage();
    nextY = 18;
  }

  drawPdfSectionTitle(doc, 'Emission Factors Summary', nextY + 10);
  autoTable(doc, {
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
          factor.factorName || getActivityTypeLabel(factor.activityType) || 'Factor not specified',
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
      const factorName = factor.factorName || getActivityTypeLabel(factor.activityType) || 'Factor not specified';
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
  autoTable(doc, {
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

  autoTable(doc, {
    startY: nextY + 4,
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    head: [[
      'Source File',
      'Source Type',
      'Import Method',
      'Source Reference',
      'Included GHG Records',
      'Tracked Metrics',
      'Review Records',
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
  autoTable(doc, {
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
        `${reportCountSummary.processedRecords} included emissions records, ${calculationDetails.filter(isTrackedMetricDetail).length} tracked metric, ${calculationDetails.filter(isRecordRequiringCorrection).length} records requiring review.`,
      ],
      [
        'Report generated',
        `${formatEmissionsValue(totalEstimatedEmissionsKgCO2e)} kgCO2e total for ${reportPeriod}.`,
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
  doc.text('Records Requiring Review', 14, nextY + 10);
  const reviewRows = calculationDetails.filter(isRecordRequiringCorrection);
  const trackedMetricRows = calculationDetails.filter(isTrackedMetricDetail);
  autoTable(doc, {
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
      : [['No records require review for this report scope.', '', '', '', '', '', '']],
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
    autoTable(doc, {
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
  drawPdfSectionTitle(doc, 'Appendix: Record-Level Source Evidence', nextY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(71, 85, 105);
  nextY = drawPdfTextBlock(
    doc,
    'Detailed record-level source evidence retained for traceability review. The main report body summarizes this information by source file.',
    14,
    nextY + 8,
    268,
    4.1,
  );
  autoTable(doc, {
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
    autoTable(doc, {
      startY: nextY,
      head: [['Readiness Signal', 'Value']],
      body: [
        ['Readiness Level', formatCarbonCreditReadinessLevel(carbonCreditReadiness.readinessLevel)],
        ['Readiness Score', `${carbonCreditReadiness.score}/100`],
        [
          'Reduction Detected',
          carbonCreditReadiness.reductionAmount !== null && carbonCreditReadiness.reductionPercentage !== null
            ? `${formatEmissionsValue(carbonCreditReadiness.reductionAmount)} kgCO2e (${formatDisplayNumber(carbonCreditReadiness.reductionPercentage)}%)`
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
  if (scope === 'Scope 3') return 'Other indirect emissions';
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

  if (event.eventName === 'FILE_UPLOADED') {
    return `${sourceFile || 'Source file'} uploaded as ${metadata.sourceType || 'Source Review Required'}.`;
  }

  if (event.eventName === 'DATA_EXTRACTED') {
    return `Draft records created${sourceFile ? ` from ${sourceFile}` : ''}: ${metadata.readyCount ?? 0} ready, ${metadata.trackedMetricCount ?? 0} tracked metric, ${metadata.requiresReviewCount ?? 0} requiring review.`;
  }

  if (event.eventName === 'RECORDS_IMPORTED') {
    return `Records imported${sourceFile ? ` from ${sourceFile}` : ''}: ${metadata.includedEmissionsRecords ?? 0} included emissions records, ${metadata.trackedOnlyRecords ?? 0} tracked metric, ${metadata.rowsNotImported ?? 0} rows not imported.`;
  }

  if (event.eventName === 'REPORT_GENERATED') {
    const total = Number(metadata.totalKgCO2e);
    const totalText = Number.isFinite(total)
      ? `${formatEmissionsValue(total)} kgCO2e`
      : 'report total unavailable';
    return `${reportName || 'Report'} generated (${metadata.reportFormat || 'Report'}): ${totalText} total, ${metadata.includedRecords ?? 0} included records, ${metadata.trackedMetrics ?? 0} tracked metrics.`;
  }

  if (event.eventName === 'CSV_EXPORTED') {
    return `CSV exported: ${metadata.exportedRecords ?? metadata.includedRecords ?? 0} records, ${metadata.trackedMetrics ?? 0} tracked metrics.`;
  }

  if (event.eventName === 'PDF_EXPORTED') {
    const total = Number(metadata.totalKgCO2e);
    const totalText = Number.isFinite(total)
      ? `${formatEmissionsValue(total)} kgCO2e`
      : 'report total unavailable';
    return `PDF report generated: ${totalText} total, ${metadata.includedRecords ?? 0} included records, ${metadata.trackedMetrics ?? 0} tracked metrics.`;
  }

  if (event.eventName === 'IMPORT_FAILED' || event.eventName === 'REPORT_GENERATION_FAILED') {
    return String(metadata.friendlyError ?? 'Workflow action failed. Review the source data and try again.');
  }

  return String(metadata.eventLabel ?? event.description ?? 'Workflow event recorded.');
}

const organizationName = getOrganizationName(getCurrentUser());
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
const dataReadinessSummary = buildDataReadinessSummary(calculationDetails);
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
}

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h1>Reports</h1>

      <p style={{ color: '#666', marginBottom: 20 }}>
        Polished reporting output for sharing emissions totals, scope summaries, included and excluded record counts, methodology notes, factor source notes, and disclaimers.
      </p>

      <div style={paidPilotScopeCalloutStyle}>
        <span>Preparing a structured pilot review?</span>
        <button
          type="button"
          onClick={() => navigate('/paid-pilot-scope')}
          style={secondaryButtonStyle(false)}
        >
          View Paid Pilot Scope
        </button>
      </div>

      <div style={reportDisclaimerCalloutStyle}>
        <strong>Important scope note</strong>
        <p>{FORMAL_REPORT_DISCLAIMER}</p>
      </div>

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
      </CollapsibleReportSection>
      {reportScope === 'selectedDocuments' ? (
        <div style={selectionNoticeStyle}>
          Report Scope: Selected Documents ({selectedDocumentIds.length})
        </div>
      ) : reportScope === 'selectedRecords' ? (
        <div style={selectionNoticeStyle}>
          Report Scope: Selected Records ({selectedRecordIds.length})
        </div>
      ) : null}
      {reportScope === 'selectedDocuments' && !loading && activities.length === 0 ? (
        <div style={emptyScopeNoticeStyle}>
          No activity records found for selected documents.
        </div>
      ) : null}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
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

        <button
          onClick={handleDownloadPDF}
          disabled={exportDisabled}
          title={exportDisabledTitle}
          style={primaryButtonStyle(exportDisabled)}
        >
          Download PDF
        </button>
      </div>

      {error ? <div style={errorStyle}>{error}</div> : null}

      {hasNoDataInSystem ? (
        <div style={reportEmptyStateStyle}>
          <h2 style={{ margin: 0, fontSize: 22 }}>No reporting data found.</h2>
          <p style={{ margin: '10px 0 18px', color: '#475569', lineHeight: 1.6 }}>
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

      {loading ? (
        <div style={loadingNoticeStyle}>Generating report output...</div>
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
            usageTotals={usageTotals}
            totalEstimatedEmissionsKgCO2e={totalEstimatedEmissionsKgCO2e}
            countSummary={countSummary}
            matchedActivityEmissions={matchedActivityEmissions}
            conversionFactorsUsed={conversionFactorsUsed}
            sourceEvidenceRows={sourceEvidenceRows}
            calculationDetails={calculationDetails}
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
            summary={`${dataReadinessSummary.recordsReadyForCalculation} calculated · ${dataReadinessSummary.recordsRequiringReview} requiring review`}
            expanded={expandedSections.dataQualityNotes}
            onToggle={() => toggleReportSection('dataQualityNotes')}
          >
            <div style={dataQualityNotesGridStyle}>
              <DataQualityNote label="Data Readiness" value={`${formatDisplayNumber(dataReadinessSummary.score)}% · ${dataReadinessSummary.level}`} />
              <DataQualityNote label="Calculated Records" value={dataReadinessSummary.recordsReadyForCalculation} />
              <DataQualityNote label="Records Requiring Review" value={dataReadinessSummary.recordsRequiringReview} />
              <DataQualityNote label="Tracked Operational Metrics" value={dataReadinessSummary.trackedOnlyCount} />
              <DataQualityNote label="Missing Factors" value={dataReadinessSummary.missingFactorCount} />
              <DataQualityNote label="Missing Jurisdiction" value={dataReadinessSummary.missingJurisdictionCount} />
            </div>
            <div style={dataQualityExplanationStyle}>
              <strong>How to read these metrics:</strong>
              <p>
                Data Quality Coverage reflects the percentage of records that were successfully calculated as GHG emissions records.
              </p>
              <p>
                Data Readiness Score is a broader pilot readiness signal based on calculation coverage, factor match quality, jurisdiction completeness, source traceability, review status, and tracked operational metrics.
              </p>
              <p>
                Data Quality Coverage and Data Readiness Score are related but not identical. Tracked operational metrics such as Water are retained for review and excluded from the calculated GHG emissions total by design.
              </p>
            </div>
            {dataReadinessSummary.recordsRequiringReview > 0 ? (
              <p style={{ color: '#64748b', lineHeight: 1.6, marginTop: 10 }}>
                Review reasons: {formatReviewReasons(primarySkippedReasons)}.
              </p>
            ) : dataReadinessSummary.trackedOnlyCount > 0 ? (
              <p style={{ color: '#64748b', lineHeight: 1.6, marginTop: 10 }}>
                Tracked operational metrics are retained for review but excluded from the calculated GHG emissions total.
              </p>
            ) : null}
            <p style={{ color: '#64748b', lineHeight: 1.6, marginTop: 10 }}>
              Hotspot analysis is based only on calculated records. Records requiring review are excluded until fixed.
            </p>
          </CollapsibleReportSection>
          {includeCarbonCreditReadinessNotes ? (
            <CollapsibleReportSection
              id="carbon-credit-readiness-report-section"
              title="Optional Carbon Credit Screening Notes"
              summary={`${formatCarbonCreditReadinessLevel(carbonCreditReadiness.readinessLevel)} · ${carbonCreditReadiness.score}/100`}
              expanded={expandedSections.carbonCreditReadiness}
              onToggle={() => toggleReportSection('carbonCreditReadiness')}
            >
              <p style={{ color: '#64748b', lineHeight: 1.6, margin: '0 0 12px' }}>
                This section is not included in standard pilot reports and does not determine eligibility for carbon credits.
              </p>
              <p style={{ color: '#64748b', lineHeight: 1.6, margin: '0 0 12px' }}>
                This optional section is an early screening note only. It is not a certification, verification, eligibility determination, or compliance assessment.
              </p>
              <div style={dataQualityNotesGridStyle}>
                <DataQualityNote label="Readiness Level" value={formatCarbonCreditReadinessLevel(carbonCreditReadiness.readinessLevel)} />
                <DataQualityNote label="Readiness Score" value={`${carbonCreditReadiness.score}/100`} />
                <DataQualityNote
                  label="Reduction Detected"
                  value={
                    carbonCreditReadiness.reductionAmount !== null && carbonCreditReadiness.reductionPercentage !== null
                      ? `${formatEmissionsValue(carbonCreditReadiness.reductionAmount)} kgCO2e · ${formatDisplayNumber(carbonCreditReadiness.reductionPercentage)}%`
                      : 'Not assessed or not detected'
                  }
                />
                <DataQualityNote label="Records Requiring Review" value={dataReadinessSummary.recordsRequiringReview} />
                <DataQualityNote label="Tracked Operational Metrics" value={dataReadinessSummary.trackedOnlyCount} />
              </div>
              <p style={{ color: '#555', lineHeight: 1.7, marginTop: 12 }}>
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
                value={`${formatDisplayNumber(scopeSummary['Scope 1'])} kgCO2e`}
                icon="🏭"
              />
              <Card
                title="Scope 2"
                subtitle={scopeLabelByName['Scope 2']}
                value={`${formatDisplayNumber(scopeSummary['Scope 2'])} kgCO2e`}
                icon="⚡"
              />
              <Card
                title="Scope 3"
                subtitle={scopeLabelByName['Scope 3']}
                value={`${formatDisplayNumber(scopeSummary['Scope 3'])} kgCO2e`}
                icon="🌍"
              />
              {scopeSummary.Unclassified > 0 ? (
                <Card
                  title="Unclassified"
                  subtitle="Requires scope review"
                  value={`${formatDisplayNumber(scopeSummary.Unclassified)} kgCO2e`}
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
        </>
      ) : null}

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
  const auditContentId = 'workflow-audit-trail-content';

  return (
    <section style={workflowAuditPanelStyle} aria-label="Audit Trail">
      <button
        type="button"
        onClick={onToggle}
        style={workflowAuditSummaryButtonStyle}
        aria-expanded={isOpen}
        aria-controls={auditContentId}
        aria-label={`${isOpen ? 'Collapse' : 'Expand'} Audit Trail`}
      >
        <span style={workflowAuditTitleBlockStyle}>
          <span style={workflowAuditTitleStyle}>Audit Trail</span>
          <span style={workflowAuditSubtitleStyle}>
            Workflow history for this workspace.
            {latestEvent ? ` Latest event: ${formatEventLabel(latestEvent)} · ${formatEventTime(latestEvent.createdAt)}` : ''}
          </span>
        </span>
        <span style={workflowAuditToggleStyle}>
          <span aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
          <span>{isOpen ? 'Collapse' : 'Expand'}</span>
        </span>
      </button>

      {isOpen ? (
        <div id={auditContentId} style={workflowAuditBodyStyle}>
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
        </div>
      ) : null}
    </section>
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
      <div style={{ marginTop: 10, color: '#666', fontSize: 14 }}>{title}</div>
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
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div style={dataQualityNoteStyle}>
      <span>{label}</span>
      <strong>{value}</strong>
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

const cardStyle: React.CSSProperties = {
  borderRadius: 16,
  padding: 20,
  background: '#fff',
  border: '1px solid #eee',
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
};

const cardSubtitleStyle: React.CSSProperties = {
  marginTop: 4,
  color: '#334155',
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
  border: '1px solid #fed7aa',
  background: '#fff7ed',
  color: '#9a3412',
  fontSize: 13,
  fontWeight: 700,
};

const scopeHelpStyle: React.CSSProperties = {
  marginBottom: 14,
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
};

const scopeHelpSummaryStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 12px',
  color: '#0f172a',
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
  background: '#dbeafe',
  color: '#1d4ed8',
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
  background: '#fff',
  border: '1px solid #e2e8f0',
};

const scopeHelpTextStyle: React.CSSProperties = {
  margin: '6px 0',
  color: '#475569',
  lineHeight: 1.5,
};

const scopeHelpExamplesStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: 13,
  fontWeight: 700,
};

const scopeHelpNoteStyle: React.CSSProperties = {
  color: '#475569',
  fontSize: 13,
  lineHeight: 1.5,
};

const dataQualityNotesGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 10,
};

const dataQualityNoteStyle: React.CSSProperties = {
  display: 'grid',
  gap: 4,
  padding: 12,
  borderRadius: 12,
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  color: '#334155',
};

const dataQualityExplanationStyle: React.CSSProperties = {
  display: 'grid',
  gap: 6,
  marginTop: 12,
  padding: 12,
  borderRadius: 12,
  background: '#f8fafc',
  border: '1px solid #cbd5e1',
  color: '#334155',
  lineHeight: 1.55,
};

const creditDisclaimerReportStyle: React.CSSProperties = {
  marginTop: 12,
  padding: 12,
  borderRadius: 12,
  background: '#fff7ed',
  border: '1px solid #fed7aa',
  color: '#7c2d12',
  lineHeight: 1.6,
  fontWeight: 700,
};

const reportDisclaimerCalloutStyle: React.CSSProperties = {
  display: 'grid',
  gap: 6,
  margin: '0 0 20px',
  padding: 14,
  borderRadius: 12,
  background: '#f8fafc',
  border: '1px solid #cbd5e1',
  color: '#334155',
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
  background: '#ecfdf5',
  border: '1px solid #bbf7d0',
  color: '#065f46',
  fontWeight: 800,
  flexWrap: 'wrap',
};

const workflowAuditPanelStyle: React.CSSProperties = {
  display: 'grid',
  gap: 0,
  marginTop: 24,
  marginBottom: 24,
  padding: 0,
  borderRadius: 14,
  border: '1px solid #dbe4ea',
  background: '#fff',
  overflow: 'hidden',
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
};

const workflowAuditSummaryButtonStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  width: '100%',
  border: 0,
  background: '#fff',
  padding: 16,
  textAlign: 'left',
  cursor: 'pointer',
};

const workflowAuditTitleBlockStyle: React.CSSProperties = {
  display: 'grid',
  gap: 4,
  minWidth: 0,
};

const workflowAuditTitleStyle: React.CSSProperties = {
  margin: 0,
  color: '#0f172a',
  fontSize: 18,
};

const workflowAuditToggleStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  borderRadius: 8,
  border: '1px solid #d1d5db',
  padding: '7px 10px',
  background: '#fff',
  color: '#334155',
  fontWeight: 800,
  whiteSpace: 'nowrap',
};

const workflowAuditSubtitleStyle: React.CSSProperties = {
  margin: '4px 0 0',
  color: '#64748b',
  fontSize: 13,
  lineHeight: 1.45,
};

const workflowAuditBodyStyle: React.CSSProperties = {
  display: 'grid',
  gap: 12,
  borderTop: '1px solid #e2e8f0',
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
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
};

const workflowAuditTimeStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: 12,
  fontWeight: 800,
};

const workflowAuditEventBodyStyle: React.CSSProperties = {
  display: 'grid',
  gap: 4,
  minWidth: 0,
  color: '#334155',
  lineHeight: 1.45,
};

const workflowAuditEmptyStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 10,
  background: '#f8fafc',
  color: '#64748b',
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
  borderBottom: '1px solid #ddd',
  color: '#475569',
};

const tdStyle: React.CSSProperties = {
  padding: 12,
  borderBottom: '1px solid #eee',
};

const emptyStyle: React.CSSProperties = {
  padding: 16,
  textAlign: 'center',
  color: '#666',
};

function primaryButtonStyle(disabled = false): React.CSSProperties {
  return {
    padding: '10px 16px',
    borderRadius: 10,
    border: 'none',
    background: disabled ? '#cbd5e1' : '#10b981',
    color: disabled ? '#64748b' : '#fff',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

function secondaryButtonStyle(disabled = false): React.CSSProperties {
  return {
    padding: '10px 16px',
    borderRadius: 10,
    border: '1px solid #d1d5db',
    background: disabled ? '#f1f5f9' : '#fff',
    color: disabled ? '#94a3b8' : '#111',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

const errorStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 12,
  borderRadius: 10,
  border: '1px solid #fecaca',
  background: '#fef2f2',
  color: '#991b1b',
};

const loadingNoticeStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 12,
  borderRadius: 10,
  border: '1px solid #bfdbfe',
  background: '#eff6ff',
  color: '#1d4ed8',
  fontWeight: 800,
};

const filterCardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'end',
  gap: 12,
  flexWrap: 'wrap',
  padding: 16,
  borderRadius: 16,
  background: '#fff',
  border: '1px solid #e5e7eb',
  marginBottom: 20,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 700,
  color: '#475569',
};

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #cbd5e1',
};

const scopeToggleStyle: React.CSSProperties = {
  display: 'inline-flex',
  gap: 6,
  padding: 4,
  borderRadius: 12,
  background: '#f1f5f9',
  border: '1px solid #e2e8f0',
};

function scopeButtonStyle(active: boolean, disabled = false): React.CSSProperties {
  return {
    padding: '8px 12px',
    borderRadius: 10,
    border: active ? '1px solid #10b981' : '1px solid transparent',
    background: active ? '#10b981' : '#fff',
    color: disabled ? '#94a3b8' : active ? '#fff' : '#334155',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

const selectionNoticeStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 12,
  borderRadius: 10,
  border: '1px solid #bbf7d0',
  background: '#f0fdf4',
  color: '#166534',
  fontWeight: 700,
};

const emptyScopeNoticeStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 12,
  borderRadius: 10,
  border: '1px solid #fde68a',
  background: '#fffbeb',
  color: '#92400e',
  fontWeight: 700,
};

const reviewOnlyNoticeStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 14,
  borderRadius: 12,
  border: '1px solid #fde68a',
  background: '#fffbeb',
  color: '#92400e',
  fontWeight: 800,
  lineHeight: 1.5,
};

const reportEmptyStateStyle: React.CSSProperties = {
  padding: 28,
  borderRadius: 16,
  border: '1px solid #dbeafe',
  background: '#eff6ff',
  color: '#0f172a',
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
};

const dateRangeEmptyStateStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 16,
  borderRadius: 12,
  border: '1px solid #fde68a',
  background: '#fffbeb',
  color: '#92400e',
  fontWeight: 800,
};
