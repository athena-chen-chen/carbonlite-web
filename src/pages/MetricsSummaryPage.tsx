import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  type ActivityUsageRecord,
} from '../utils/activityAggregation';
import {
  EMPTY_ACTIVITY_USAGE_TOTALS,
  loadDefaultMetricsDateRange,
  loadMetricsOverview,
} from '../services/metricsOverview';
import {
  buildMetricsSummaryTableRows,
  MetricsSummarySection,
  type MissingFactorItem,
} from '../components/MetricsSummarySection';


export function MetricsSummaryPage() {
  const location = useLocation();
  const [summary, setSummary] = useState<any>(null);
  const [activities, setActivities] = useState<ActivityUsageRecord[]>([]);
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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(
    () => (location.state as { metricsError?: string } | null)?.metricsError ?? null,
  );
  const [reloadKey, setReloadKey] = useState(0);
  const [periodStart, setPeriodStart] = useState(getDefaultFallbackStartDate());
  const [periodEnd, setPeriodEnd] = useState('2026-12-31');
  const [draftPeriodStart, setDraftPeriodStart] = useState(getDefaultFallbackStartDate());
  const [draftPeriodEnd, setDraftPeriodEnd] = useState('2026-12-31');
  const [dateRangeReady, setDateRangeReady] = useState(false);
  const inFlightRequestKeyRef = useRef<string | null>(null);
  const requestSequenceRef = useRef(0);
  const dateCommitTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  useEffect(() => {
    if (!dateRangeReady) return;
    loadSummary();
  }, [dateRangeReady, reloadKey, periodStart, periodEnd]);

  useEffect(() => {
    initializeDateRange();

    return () => {
      if (dateCommitTimerRef.current) {
        window.clearTimeout(dateCommitTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    function refreshMetrics() {
      window.sessionStorage.removeItem('carbonliteMetricsStale');
      setReloadKey((key) => key + 1);
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === 'carbonliteMetricsStale' && event.newValue === 'true') {
        refreshMetrics();
      }
    }

    window.addEventListener('carbonlite:metrics-stale', refreshMetrics);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('carbonlite:metrics-stale', refreshMetrics);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  async function loadSummary() {
    const request = {
      recalculate: true,
      dateFrom: periodStart,
      dateTo: periodEnd,
    };
    const requestKey = JSON.stringify(request);

    if (inFlightRequestKeyRef.current === requestKey) {
      return;
    }

    inFlightRequestKeyRef.current = requestKey;
    const requestSequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestSequence;
    setLoading(true);
    setError(null);
    try {
      const overview = await loadMetricsOverview(request);
      if (requestSequence !== requestSequenceRef.current) return;

      setSummary(overview.summary);
      setActivities(overview.activities);
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
      setLastUpdated(new Date());
    } catch (err) {
      if (requestSequence === requestSequenceRef.current) {
        setError('Unable to load metrics summary. Please try again.');
      }
    } finally {
      if (inFlightRequestKeyRef.current === requestKey) {
        inFlightRequestKeyRef.current = null;
      }
      if (requestSequence === requestSequenceRef.current) {
        setLoading(false);
      }
    }
  }

  function handleRefresh() {
    setReloadKey((key) => key + 1);
  }

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

// function handleDownloadCSV() {
//   const totalsByMetric = summary?.totalsByMetric ?? [];

//   const rows = [
//     ['Metric Type', 'Unit', 'Total Value'],
//     ...totalsByMetric.map((item: any) => [
//       item.metricType,
//       item.unit,
//       item.totalValue,
//     ]),
//   ];

//   const csv = rows.map((row) => row.join(',')).join('\n');
//   const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
//   const url = URL.createObjectURL(blob);

//   const link = document.createElement('a');
//   link.href = url;
//   link.download = 'carbonlite-metrics-summary.csv';
//   link.click();

//   URL.revokeObjectURL(url);
// }
function escapeCSV(value: unknown) {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function handleDownloadCSV() {
  const totalsByFacility = summary?.totalsByFacility ?? [];

  const rows = [
    ['Section', 'Metric Type', 'Facility', 'Unit', 'Total Value'],

    ...totalsByMetric.map((item: any) => [
      'Totals by Metric',
      item.metricType,
      '',
      item.unit,
      item.totalValue,
    ]),

    ...totalsByFacility.map((item: any) => [
      'Totals by Facility',
      item.metricType,
      item.facilityId ?? 'Unassigned',
      item.unit,
      item.totalValue,
    ]),
  ];

  const csv = rows
    .map((row) => row.map(escapeCSV).join(','))
    .join('\n');

  const blob = new Blob([csv], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `carbonlite-metrics-summary-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
function handleDownloadPDF() {
  const totalsByFacility = summary?.totalsByFacility ?? [];

  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('CarbonLite AI Metrics Summary', 14, 20);

  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);
  doc.text('Prepared for internal reporting and compliance preparation.', 14, 35);

  autoTable(doc, {
    startY: 45,
    head: [['Metric Type', 'Unit', 'Total Value']],
    body: totalsByMetric.map((item: any) => [
      item.metricType,
      item.unit,
      item.totalValue,
    ]),
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 12,
    head: [['Facility', 'Metric Type', 'Unit', 'Total Value']],
    body: totalsByFacility.map((item: any) => [
      item.facilityId ?? 'Unassigned',
      item.metricType,
      item.unit,
      item.totalValue,
    ]),
  });

  doc.save(
    `carbonlite-metrics-summary-${new Date().toISOString().slice(0, 10)}.pdf`,
  );
}
  const totalsByMetric = buildMetricsSummaryTableRows({
    usageTotals,
    totalEstimatedEmissionsKgCO2e,
    recordsIncluded: countSummary.processedRecords,
  });
  const hasLoadedSummary = lastUpdated !== null || summary !== null;
  const isInitialLoading = loading && !hasLoadedSummary;
  const isRefreshing = loading && hasLoadedSummary;

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 8 }}>Metrics Summary</h1>

      <p style={{ color: '#666', marginBottom: 24 }}>
        Your uploaded documents have been automatically converted into structured data and summarized.
      </p>
      <div style={filterCardStyle}>
        <div>
          <label style={labelStyle}>Start Date</label>
          <input
            type="date"
            value={draftPeriodStart}
            onChange={(e) => handleStartDateChange(e.target.value)}
            onBlur={() => commitDateRange()}
            style={dateInputStyle(false)}
          />
        </div>

        <div>
          <label style={labelStyle}>End Date</label>
          <input
            type="date"
            value={draftPeriodEnd}
            onChange={(e) => handleEndDateChange(e.target.value)}
            onBlur={() => commitDateRange()}
            style={dateInputStyle(false)}
          />
        </div>

        {getFullYearShortcutYears().map((year) => (
          <button
            key={year}
            type="button"
            onClick={() => handleFullYear(year)}
            style={secondaryButtonStyle(false)}
          >
            {year} Full Year
          </button>
        ))}
      </div>
 
      <div style={statusBarStyle}>
        <div style={statusTextStyle}>
          {isInitialLoading
            ? 'Calculating metrics...'
            : isRefreshing
            ? 'Refreshing metrics...'
            : lastUpdated
            ? `Last updated: ${formatLastUpdated(lastUpdated)}`
            : 'Updated automatically'}
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          style={refreshButtonStyle(loading)}
        >
          Refresh
        </button>
{/* <button
  type="button"
  onClick={handleDownloadCSV}
  disabled={!summary?.totalsByMetric?.length}
  style={{
    padding: '10px 16px',
    borderRadius: 10,
    border: '1px solid #10b981',
    background: '#fff',
    color: '#047857',
    fontWeight: 700,
    cursor: summary?.totalsByMetric?.length ? 'pointer' : 'not-allowed',
  }}
>
  Download CSV
</button> */}
{/* <button
  type="button"
  onClick={handleDownloadPDF}
  disabled={!summary?.totalsByMetric?.length}
  style={{
    padding: '10px 16px',
    borderRadius: 10,
    border: '1px solid #111827',
    background: '#111827',
    color: '#fff',
    fontWeight: 700,
    cursor: summary?.totalsByMetric?.length ? 'pointer' : 'not-allowed',
  }}
>
  Download PDF
</button> */}
      </div>
      {isInitialLoading ? (
        <div style={loadingNoticeStyle}>Loading summary...</div>
      ) : null}

      {error && <div style={warningStyle}>{error}</div>}

      <MetricsSummarySection
        usageTotals={usageTotals}
        totalEstimatedEmissionsKgCO2e={totalEstimatedEmissionsKgCO2e}
        countSummary={countSummary}
        missingFactors={missingFactors}
        emptyMessage={
          activities.length === 0 && countSummary.totalRecordsFound > 0
            ? 'No records found for selected period.'
            : undefined
        }
        isLoading={isInitialLoading}
      />
    </div>
  );
}

function formatLastUpdated(date: Date) {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
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

const warningStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 12,
  borderRadius: 10,
  border: '1px solid #fed7aa',
  background: '#fff7ed',
  color: '#9a3412',
};

const filterCardStyle: React.CSSProperties = {
  marginBottom: 18,
  padding: 16,
  borderRadius: 12,
  border: '1px solid #dbeafe',
  background: '#eff6ff',
  display: 'flex',
  alignItems: 'flex-end',
  gap: 12,
  flexWrap: 'wrap',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 6,
  color: '#1e3a8a',
  fontSize: 13,
  fontWeight: 700,
};

function dateInputStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '9px 10px',
    borderRadius: 8,
    border: '1px solid #bfdbfe',
    background: disabled ? '#f8fafc' : '#fff',
    color: disabled ? '#94a3b8' : '#0f172a',
    cursor: disabled ? 'not-allowed' : 'text',
  };
}

function secondaryButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid #bfdbfe',
    background: disabled ? '#f8fafc' : '#fff',
    color: disabled ? '#94a3b8' : '#1d4ed8',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

const statusBarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  marginBottom: 24,
  flexWrap: 'wrap',
};

const statusTextStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: 13,
  fontWeight: 700,
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

function refreshButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid #cbd5e1',
    background: disabled ? '#f8fafc' : '#fff',
    color: disabled ? '#94a3b8' : '#334155',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}
