import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  EMPTY_ACTIVITY_USAGE_TOTALS,
  loadDefaultMetricsDateRange,
  loadMetricsOverview,
} from '../services/metricsOverview';
import {
  MetricsSummarySection,
  buildMetricsSummaryTableRows,
  type MissingFactorItem,
} from '../components/MetricsSummarySection';
import {
  FORMAL_REPORT_METHODOLOGY,
  FormalReportPreview,
  buildConversionFactorTraceabilityRows,
  buildReportExecutiveSummary,
  buildSourceEvidenceRows,
  formatSourceType,
  type FormalActivityEmission,
  type FormalConversionFactorUsed,
} from '../components/FormalReportPreview';
import { getCurrentUser, getOrganizationName } from '../services/auth';
import { createClientAuditLog } from '../services/auditLogs';
import { trackActivityEvent } from '../services/activityEvents';
import { track } from '../services/analytics.service';
import { trackEvent } from '../services/ga4.service';
import type { CalculationAuditDetail } from '../services/metrics';

type ActivityItem = {
  id: string;
  activityType: string;
  recordDate: string;
  quantity: string | number;
  unit: string;
  sourceType: string;
  sourceReference?: string | null;
  notes?: string | null;
};
const SCOPE_MAP: Record<string, 'Scope 1' | 'Scope 2' | 'Scope 3'> = {
  // Scope 1（直接排放）
  DIESEL: 'Scope 1',
  GASOLINE: 'Scope 1',
  NATURAL_GAS: 'Scope 1',
  PROPANE: 'Scope 1',

  // Scope 2（电力）
  ELECTRICITY: 'Scope 2',

  // Scope 3（其他）
  TRAVEL: 'Scope 3',
  WASTE: 'Scope 3',
  WATER: 'Scope 3',
  FREIGHT: 'Scope 3',
};

export default function ReportingPage() {
  const location = useLocation();
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
  const [missingFactors, setMissingFactors] = useState<MissingFactorItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
const dateCommitTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
const inFlightRequestKeyRef = useRef<string | null>(null);
const trackedReportViewRef = useRef(false);
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
        processedRecords: overview.processedRecords,
        skippedRecords: overview.skippedRecords,
        missingFactorRecords: overview.missingFactorRecords,
        skippedReasons: overview.skippedReasons,
      });
      setMissingFactors(overview.missingFactors);
      track('REPORT_GENERATED', {
        reportType: 'emissions',
        reportScope,
        recordCount: overview.processedRecords,
      });
      trackEvent('REPORT_GENERATED', {
        report_type: 'emissions',
        report_scope: reportScope,
        record_count: overview.processedRecords,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report data');
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
  const type = String(activityType ?? '').toUpperCase();

  if (['DIESEL', 'GASOLINE', 'NATURAL_GAS', 'PROPANE'].includes(type)) {
    return 'Scope 1';
  }

  if (type === 'ELECTRICITY') {
    return 'Scope 2';
  }

  return 'Scope 3';
}

  const totalsByFacility = summary?.totalsByFacility ?? [];

const scopeRows = useMemo(() => {
  return activities.map((item) => ({
    scope: classifyScope(item.activityType),
    activityType: item.activityType,
    quantity: item.quantity,
    unit: item.unit,
    source: formatSourceType(item.sourceType),
    reference: item.sourceReference ?? '-',
  }));
}, [activities]);

  const scopeSummary = useMemo(() => {
  const summary = {
    'Scope 1': 0,
    'Scope 2': 0,
    'Scope 3': 0,
  };

  activities.forEach((item) => {
    const scope = classifyScope(item.activityType);
    summary[scope] += Number(item.quantity || 0);
  });

  return summary;
}, [activities]);

function handleDownloadCSV() {
    const rows = [
      ['Scope', 'Activity Type', 'Quantity', 'Unit', 'Source'],
      ...scopeRows.map((r) => [
        r.scope,
        r.activityType,
        r.quantity,
        r.unit,
        r.source,
      ]),
    ];

    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `carbonlite-ai-report-${new Date()
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
      recordsIncluded: countSummary.processedRecords,
    },
  }).catch(() => {
    // Export should not be blocked by usage tracking.
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
      `Scope 3 emissions are associated with other indirect activities such as freight, waste, water, travel, or third-party services.`
    );
  }

  if (!lines.length) {
    lines.push(
      `No activity data was available for Scope 1, Scope 2, or Scope 3 classification.`
    );
  }

  lines.push(
    `Scope classification is based on activity type and is intended to support internal review and compliance preparation.`
  );

  return lines;
}
const scopeNarrative = useMemo(() => {
  return buildScopeNarrative(scopeSummary);
}, [scopeSummary]);

function handleDownloadPDF() {
  const doc = new jsPDF();
  const today = new Date().toISOString().slice(0, 10);
  const totalsByMetric = buildMetricsSummaryTableRows({
    usageTotals,
    totalEstimatedEmissionsKgCO2e,
    recordsIncluded: countSummary.processedRecords,
  });
  const executiveSummary = buildReportExecutiveSummary({
    totalEstimatedEmissionsKgCO2e,
    countSummary,
    matchedActivityEmissions,
  });
  const factorTraceabilityRows =
    buildConversionFactorTraceabilityRows(conversionFactorsUsed);

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
      ['Records Included', executiveSummary.recordsIncluded],
      ['Records Skipped', executiveSummary.recordsSkipped],
      ['Primary Activity Types', executiveSummary.primaryActivityTypes],
      ['Missing Factor Count', executiveSummary.missingFactorCount],
      ['Data Quality Coverage', executiveSummary.dataQualityCoverage],
    ],
  });

  let nextY = (doc as any).lastAutoTable.finalY + 12;
  drawPdfSectionTitle(doc, 'Calculation Quality Summary', nextY);
  autoTable(doc, {
    startY: nextY + 6,
    head: [['Quality Measure', 'Value']],
    body: [
      ['Total Records Found', countSummary.totalRecordsFound],
      ['Records Calculated', countSummary.processedRecords],
      ['Records Skipped', countSummary.skippedRecords],
      ['Missing Factors', countSummary.missingFactorRecords],
      ['Invalid Records', countSummary.skippedReasons.invalidData],
      [
        'Data Quality Coverage',
        countSummary.totalRecordsFound > 0
          ? `${Math.round(
              (countSummary.processedRecords / countSummary.totalRecordsFound) *
                1000,
            ) / 10}%`
          : '0%',
      ],
    ],
  });

  nextY = (doc as any).lastAutoTable.finalY + 12;
  drawPdfSectionTitle(doc, 'Methodology', nextY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  FORMAL_REPORT_METHODOLOGY.forEach((paragraph) => {
    const lines = doc.splitTextToSize(paragraph, 180);
    doc.text(lines, 14, nextY + 7);
    nextY += lines.length * 4.4 + 6;
  });

  if (nextY > 235) {
    doc.addPage();
    nextY = 18;
  }
  drawPdfSectionTitle(doc, 'Totals by Metric', nextY);
  autoTable(doc, {
    startY: nextY + 6,
    head: [['Metric Type', 'Unit', 'Total']],
    body: totalsByMetric.map((item) => [
      item.metricType,
      item.unit,
      item.totalValue,
    ]),
  });

  const activityStartY = (doc as any).lastAutoTable.finalY + 14;
  drawPdfSectionTitle(doc, 'Activity Breakdown', activityStartY);
  autoTable(doc, {
    startY: activityStartY + 6,
    head: [['Activity Type', 'Quantity', 'Unit', 'Estimated Emissions', 'Source Reference']],
    body: matchedActivityEmissions.length
      ? matchedActivityEmissions.map((item) => [
          item.activityType,
          item.quantity,
          item.unit,
          `${item.estimatedEmissionsKgCO2e} kgCO2e`,
          item.sourceReference ?? '',
        ])
      : [['No activity records with matching conversion factors.', '', '', '', '']],
  });

  nextY = (doc as any).lastAutoTable?.finalY ?? 115;
  if (nextY > 230) {
    doc.addPage();
    nextY = 18;
  }

  drawPdfSectionTitle(doc, 'Conversion Factors Used', nextY + 10);
  autoTable(doc, {
    startY: nextY + 16,
    head: [[
      'Activity Type',
      'Jurisdiction',
      'Input Unit',
      'Factor Value',
      'Result Unit',
      'Source Authority',
      'Source Document',
      'Source URL',
      'Source Year',
      'Verified',
      'System / Custom',
    ]],
    body: factorTraceabilityRows.length
      ? factorTraceabilityRows
      : [['No conversion factors found for this report scope.', '', '', '', '', '', '', '', '', '', '']],
    styles: { fontSize: 6.5, cellPadding: 1.5 },
    headStyles: { fillColor: [15, 23, 42] },
  });

  nextY = (doc as any).lastAutoTable?.finalY ?? 170;
  if (nextY > 230) {
    doc.addPage();
    nextY = 20;
  }

  drawPdfSectionTitle(doc, 'Calculation Details', nextY + 10);
  autoTable(doc, {
    startY: nextY + 16,
    head: [[
      'Activity Type',
      'Quantity',
      'Unit',
      'Factor Used',
      'Source',
      'Year',
      'Jurisdiction',
      'Emissions kgCO2e',
      'Status',
    ]],
    body: calculationDetails.length
      ? calculationDetails.map((item) => [
          item.activityType,
          item.activityQuantity,
          item.activityUnit,
          item.factorValue === null || item.factorValue === undefined
            ? ''
            : `${item.factorValue} ${item.factorResultUnit || ''} / ${item.factorInputUnit || item.activityUnit}`,
          item.factorSource,
          item.sourceYear ?? item.reportingYear,
          item.jurisdiction,
          item.calculatedEmissionsKgCO2e ?? '',
          item.status,
        ])
      : [['No calculation details available.', '', '', '', '', '', '', '', '']],
    styles: { fontSize: 6.5, cellPadding: 1.5 },
    headStyles: { fillColor: [15, 23, 42] },
  });

  nextY = (doc as any).lastAutoTable?.finalY ?? 170;
  if (nextY > 230) {
    doc.addPage();
    nextY = 20;
  }

  doc.setFontSize(14);
  doc.text('Source Evidence', 14, nextY + 10);

  autoTable(doc, {
    startY: nextY + 18,
    head: [['Source Document / File', 'Source Type', 'Record Count', 'Notes']],
    body: sourceEvidenceRows.length
      ? sourceEvidenceRows.map((item) => [
          item.sourceReference,
          item.sourceType,
          item.recordCount,
          item.notes,
        ])
      : [['No source evidence available.', '', '', '']],
  });

  doc.save(`carbonlite-ai-emissions-report-${today}.pdf`);
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
      recordsIncluded: countSummary.processedRecords,
    },
  }).catch(() => {
    // PDF export should not be blocked by usage tracking.
  });
  track('REPORT_PDF_EXPORTED', {
    reportType: 'emissions',
    reportScope,
    recordCount: countSummary.processedRecords,
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
  doc.text('CarbonLite AI', x + 19, y + 6);

  doc.setFontSize(9);
  doc.setTextColor(4, 120, 87);
  doc.text('Environmental Reporting Platform', x + 19, y + 12);

  doc.setDrawColor(203, 213, 225);
  doc.line(x, y + 28, 186, y + 28);

  doc.setFontSize(25);
  doc.setTextColor(15, 23, 42);
  doc.text('Emissions Summary Report', x, y + 62);

  doc.setFontSize(16);
  doc.setTextColor(4, 120, 87);
  doc.text(input.organizationName || 'Workspace', x, y + 78);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`Reporting period: ${input.reportPeriod}`, x, y + 102);
  doc.text(`Report scope: ${input.reportScopeLabel}`, x, y + 112);
  doc.text(`Generated date: ${input.generatedDate}`, x, y + 122);
  doc.text('Prepared by: CarbonLite AI', x, y + 132);

  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Prepared for review as part of a pilot emissions reporting workflow.',
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
const sourceEvidenceRows = buildSourceEvidenceRows(activities);

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h1>Government Reporting</h1>

      <p style={{ color: '#666', marginBottom: 20 }}>
        Prepare structured emissions summaries using imported activity records
        and calculated metrics.
      </p>
<div style={filterCardStyle}>
  <div style={{ width: '100%' }}>
    <label style={labelStyle}>Report Scope</label>
    <div style={scopeToggleStyle}>
      <button
        type="button"
        onClick={() => setReportScope('dateRange')}
        style={scopeButtonStyle(reportScope === 'dateRange')}
      >
        Date Range
      </button>
      <button
        type="button"
        onClick={() => {
          if (selectedDocumentIds.length) setReportScope('selectedDocuments');
        }}
        disabled={!selectedDocumentIds.length}
        style={scopeButtonStyle(reportScope === 'selectedDocuments', !selectedDocumentIds.length)}
      >
        Selected Documents
      </button>
      <button
        type="button"
        onClick={() => {
          if (selectedRecordIds.length) setReportScope('selectedRecords');
        }}
        disabled={!selectedRecordIds.length}
        style={scopeButtonStyle(reportScope === 'selectedRecords', !selectedRecordIds.length)}
      >
        Selected Records
      </button>
    </div>
  </div>

  <div>
    <label style={labelStyle}>Start Date</label>
    <input
      type="date"
      value={draftPeriodStart}
      onChange={(e) => handleStartDateChange(e.target.value)}
      onBlur={() => commitDateRange()}
      style={inputStyle}
      disabled={reportScope !== 'dateRange' || loading}
    />
  </div>

  <div>
    <label style={labelStyle}>End Date</label>
    <input
      type="date"
      value={draftPeriodEnd}
      onChange={(e) => handleEndDateChange(e.target.value)}
      onBlur={() => commitDateRange()}
      style={inputStyle}
      disabled={reportScope !== 'dateRange' || loading}
    />
  </div>

  {getFullYearShortcutYears().map((year) => (
    <button
      key={year}
      type="button"
      onClick={() => handleFullYear(year)}
      style={secondaryButtonStyle}
      disabled={reportScope !== 'dateRange' || loading}
    >
      {year} Full Year
    </button>
  ))}
</div>
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
        <button onClick={loadReportData} disabled={loading} style={secondaryButtonStyle}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>

        <button
          onClick={handleDownloadCSV}
          disabled={!activities.length}
          style={secondaryButtonStyle}
        >
          Download CSV
        </button>

        <button
          onClick={handleDownloadPDF}
          disabled={!activities.length}
          style={primaryButtonStyle}
        >
          Download PDF
        </button>
      </div>

      {error ? <div style={errorStyle}>{error}</div> : null}

      {loading ? (
        <>
          <div style={loadingNoticeStyle}>Loading summary...</div>
          <MetricsSummarySection
            usageTotals={usageTotals}
            totalEstimatedEmissionsKgCO2e={totalEstimatedEmissionsKgCO2e}
            countSummary={countSummary}
            missingFactors={missingFactors}
            emptyMessage={
              activities.length === 0 && countSummary.totalRecordsFound > 0
                ? 'No records found for selected period.'
                : 'No calculated metrics available.'
            }
            isLoading={!summary}
          />
        </>
      ) : (
        <>
          <MetricsSummarySection
            usageTotals={usageTotals}
            totalEstimatedEmissionsKgCO2e={totalEstimatedEmissionsKgCO2e}
            countSummary={countSummary}
            missingFactors={missingFactors}
            emptyMessage={
              activities.length === 0 && countSummary.totalRecordsFound > 0
                ? 'No records found for selected period.'
                : 'No calculated metrics available.'
            }
          />

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

          <Section title="Scope Breakdown">
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
                      <td style={tdStyle}>{item.recordDate?.slice(0, 10)}</td>
                      <td style={tdStyle}>{item.activityType}</td>
                      <td style={tdStyle}>{item.quantity}</td>
                      <td style={tdStyle}>{item.unit}</td>
                      <td style={tdStyle}>{formatSourceType(item.sourceType)}</td>
                      <td style={tdStyle}>{item.sourceReference ?? '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Section>

          <Section title="Methodology & Assumptions">
            <p style={{ color: '#555', lineHeight: 1.7 }}>
              Emissions estimates are calculated using imported activity data and
              configured conversion factors. Uploaded documents are processed using
              AI-assisted extraction and reviewed before import. This report is
              intended for internal reporting support and compliance preparation.
            </p>
          </Section>
          <Section title="Emissions by Scope">
  <div style={{ display: 'flex', gap: 16 }}>
    <Card title="Scope 1" value={scopeSummary['Scope 1']} icon="🏭" />
    <Card title="Scope 2" value={scopeSummary['Scope 2']} icon="⚡" />
    <Card title="Scope 3" value={scopeSummary['Scope 3']} icon="🌍" />
  </div>
</Section>
        </>
      )}
    </div>
  );
}

function Card({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: string;
}) {
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 28 }}>{icon}</div>
      <div style={{ marginTop: 10, color: '#666', fontSize: 14 }}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 26, fontWeight: 800 }}>
        {value}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={sectionStyle}>
      <h2 style={{ marginTop: 0, fontSize: 20 }}>{title}</h2>
      {children}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  borderRadius: 16,
  padding: 20,
  background: '#fff',
  border: '1px solid #eee',
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
};

const sectionStyle: React.CSSProperties = {
  borderRadius: 16,
  padding: 20,
  background: '#fff',
  border: '1px solid #eee',
  marginBottom: 20,
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
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

const primaryButtonStyle: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: 10,
  border: 'none',
  background: '#10b981',
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: 10,
  border: '1px solid #d1d5db',
  background: '#fff',
  color: '#111',
  fontWeight: 700,
  cursor: 'pointer',
};

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
