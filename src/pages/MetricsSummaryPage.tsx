import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
import type { CalculationAuditDetail } from '../services/metrics';
import {
  buildMetricsSummaryTableRows,
  MetricsSummarySection,
  type MissingFactorItem,
} from '../components/MetricsSummarySection';
import { CollapsibleSection } from '../components/common/CollapsibleSection';
import { PilotReviewerFeedbackPrompt } from '../components/PilotReviewerFeedbackPrompt';
import { trackActivityEvent } from '../services/activityEvents';
import { track } from '../services/analytics.service';
import { getCurrentUser } from '../services/auth';
import { isPilotReviewer } from '../utils/permissions';
import { openFeedbackOverlay } from '../utils/feedbackOverlay';
import {
  summarizeInventoryBoundary,
} from '../constants/inventoryBoundary';
import { getDateOnlyYear } from '../utils/dateOnly';
import {
  fetchOrganizationProfile,
  hasBackendOrganizationProfileSession,
  loadOrganizationProfile,
  ORGANIZATION_PROFILE_UPDATED_EVENT,
  profileToInventoryBoundary,
} from '../services/organizationProfile';


export function MetricsSummaryPage() {
  const location = useLocation();
  const currentUser = getCurrentUser();
  const showPilotReviewerWelcome = isPilotReviewer(currentUser);
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
  const [calculationDetails, setCalculationDetails] = useState<CalculationAuditDetail[]>([]);
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
  const [isInventoryBoundaryExpanded, setIsInventoryBoundaryExpanded] = useState(false);
  const [organizationProfile, setOrganizationProfile] = useState(() =>
    loadOrganizationProfile(currentUser),
  );
  const inFlightRequestKeyRef = useRef<string | null>(null);
  const requestSequenceRef = useRef(0);
  const dateCommitTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const trackedViewRef = useRef(false);

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
    if (trackedViewRef.current) return;
    trackedViewRef.current = true;

    void trackActivityEvent({
      eventName: 'METRICS_SUMMARY_VIEWED',
      page: location.pathname,
      url: window.location.href,
      entityType: 'MetricsSummary',
    }).catch(() => {
      // Usage tracking should never block metrics loading.
    });
    track('METRICS_SUMMARY_VIEWED', {
      page: 'Calculation Review',
    });
  }, [location.pathname]);

  useEffect(() => {
    function refreshOrganizationProfile() {
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
  }, [currentUser?.id, currentUser?.organizationId, currentUser?.email]);

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
      setCalculationDetails(overview.calculationDetails);
      setLastUpdated(new Date());
    } catch (err) {
      if (requestSequence === requestSequenceRef.current) {
        setError('Unable to load calculation review. Please try again.');
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
      'Calculation Summary',
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
  link.download = `carbonlite-calculation-review-${new Date()
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
  doc.text('CarbonLite Calculation Review', 14, 20);

  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);
  doc.text('Prepared for internal reporting review and data readiness discussions.', 14, 35);

  autoTable(doc, {
    startY: 45,
    head: [['Category', 'Metric Type', 'Unit', 'Total Value']],
    body: totalsByMetric.map((item: any) => [
      item.category === 'calculated' ? 'Calculated Result' : 'Input Data',
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
    `carbonlite-calculation-review-${new Date().toISOString().slice(0, 10)}.pdf`,
  );
}
  const totalsByMetric = buildMetricsSummaryTableRows({
    usageTotals,
    totalEstimatedEmissionsKgCO2e,
    recordsIncluded: countSummary.processedRecords,
  });
  const hasLoadedSummary = lastUpdated !== null || summary !== null;
  const isInitialLoading = !hasLoadedSummary && !error;
  const isRefreshing = loading && hasLoadedSummary;
  const inventoryBoundary = profileToInventoryBoundary(
    organizationProfile,
    'Pilot sample reporting period',
  );
  const inventoryBoundarySummary = summarizeInventoryBoundary(
    inventoryBoundary,
    `${getDateOnlyYear(periodEnd) ?? 2026} reporting period`,
  );

  return (
    <div
      role={showPilotReviewerWelcome ? 'region' : undefined}
      aria-label={showPilotReviewerWelcome ? 'Pilot reviewer welcome panel' : undefined}
      data-testid={showPilotReviewerWelcome ? 'pilot-reviewer-welcome-panel' : undefined}
      style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}
    >
      <h1 style={{ marginBottom: 8 }}>Calculation Review</h1>

      <p style={{ color: '#666', marginBottom: 24 }}>
        Internal workspace for validating emissions calculations, data quality, included and excluded records, and factor matching issues before generating a shareable report.
      </p>

      {showPilotReviewerWelcome ? (
        <>
          <PilotReviewerWelcomePanel />
          <PilotReviewerFeedbackPrompt />
        </>
      ) : null}

      <CollapsibleSection
        id="inventory-boundary"
        title="Inventory Boundary"
        summary={inventoryBoundarySummary}
        expanded={isInventoryBoundaryExpanded}
        onToggle={() => setIsInventoryBoundaryExpanded((expanded) => !expanded)}
        style={inventoryBoundaryCardStyle}
        contentStyle={inventoryBoundaryGridStyle}
      >
        <BoundaryField label="Organization / Workspace" value={inventoryBoundary.organizationWorkspace} />
        {inventoryBoundary.industry ? (
          <BoundaryField label="Industry" value={inventoryBoundary.industry} />
        ) : null}
        {inventoryBoundary.country ? (
          <BoundaryField label="Country" value={inventoryBoundary.country} />
        ) : null}
        {inventoryBoundary.provinceOrTerritory ? (
          <BoundaryField label="Province / Territory" value={inventoryBoundary.provinceOrTerritory} />
        ) : null}
        {inventoryBoundary.city ? (
          <BoundaryField label="City" value={inventoryBoundary.city} />
        ) : null}
        <BoundaryField label="Reporting period" value={inventoryBoundary.reportingPeriod} />
        <BoundaryField label="Geographic boundary" value={inventoryBoundary.geographicBoundary} />
        <BoundaryField label="Included facilities or locations" value={inventoryBoundary.includedFacilitiesOrLocations} />
        {inventoryBoundary.excludedFacilitiesOrLocations ? (
          <BoundaryField
            label="Excluded facilities or locations"
            value={inventoryBoundary.excludedFacilitiesOrLocations}
          />
        ) : null}
        <BoundaryField label="Included scopes" value={inventoryBoundary.includedScopes} />
        <BoundaryField label="Scope 3 coverage note" value={inventoryBoundary.scope3CoverageNote} />
        <BoundaryField label="Exclusions / limitations" value={inventoryBoundary.exclusionsLimitations} />
        {inventoryBoundary.boundaryNotes ? (
          <BoundaryField label="Boundary notes" value={inventoryBoundary.boundaryNotes} />
        ) : null}
      </CollapsibleSection>

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
        <div style={loadingNoticeStyle}>Loading calculation summary...</div>
      ) : null}

      {error && <div style={warningStyle}>{error}</div>}

      {!isInitialLoading ? (
        <MetricsSummarySection
          usageTotals={usageTotals}
          totalEstimatedEmissionsKgCO2e={totalEstimatedEmissionsKgCO2e}
          countSummary={countSummary}
          missingFactors={missingFactors}
          calculationDetails={calculationDetails}
          emptyMessage={
            activities.length === 0 && countSummary.totalRecordsFound > 0
              ? 'No records found for selected period.'
              : undefined
          }
          isLoading={false}
        />
      ) : null}
    </div>
  );
}

function BoundaryField({ label, value }: { label: string; value: string }) {
  return (
    <div style={inventoryBoundaryFieldStyle}>
      <span style={inventoryBoundaryLabelStyle}>{label}</span>
      <span style={inventoryBoundaryValueStyle}>{value}</span>
    </div>
  );
}

function PilotReviewerWelcomePanel() {
  return (
    <section aria-label="How to review CarbonLite" style={pilotReviewerPanelStyle}>
      <h2 style={pilotReviewerTitleStyle}>How to review CarbonLite</h2>
      <p style={pilotReviewerTextStyle}>This account is read-only and uses sample data only.</p>
      <p style={pilotReviewerPathLabelStyle}>Suggested review path:</p>
      <ol style={pilotReviewerListStyle}>
        <li>
          <Link to="/data-records" style={pilotReviewerLinkStyle}>Data Records</Link>
          <span style={pilotReviewerDescriptionStyle}> — review sample activity data</span>
        </li>
        <li>
          <Link to="/conversion-factors" style={pilotReviewerLinkStyle}>Factors</Link>
          <span style={pilotReviewerDescriptionStyle}> — review emission factor transparency</span>
        </li>
        <li>
          <Link to="/metrics-summary" style={pilotReviewerLinkStyle}>Calculation Review</Link>
          <span style={pilotReviewerDescriptionStyle}> — review totals and calculation trail</span>
        </li>
        <li>
          <Link to="/reports" style={pilotReviewerLinkStyle}>Reports</Link>
          <span style={pilotReviewerDescriptionStyle}> — review sample report structure and disclaimer</span>
        </li>
        <li>
          <button type="button" onClick={openFeedbackOverlay} style={pilotReviewerFeedbackLinkStyle}>
            Send Feedback
          </button>
          <span style={pilotReviewerDescriptionStyle}> — share comments or questions</span>
        </li>
      </ol>
    </section>
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

const pilotReviewerPanelStyle: React.CSSProperties = {
  marginBottom: 18,
  padding: 16,
  borderRadius: 12,
  border: '1px solid #bfdbfe',
  background: '#eff6ff',
  color: '#0f172a',
};

const pilotReviewerTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 18,
  lineHeight: 1.35,
};

const pilotReviewerTextStyle: React.CSSProperties = {
  margin: '8px 0 0',
  color: '#334155',
  lineHeight: 1.5,
};

const pilotReviewerPathLabelStyle: React.CSSProperties = {
  margin: '12px 0 6px',
  color: '#1e3a8a',
  fontWeight: 800,
};

const pilotReviewerListStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: 22,
  color: '#334155',
  lineHeight: 1.7,
};

const pilotReviewerLinkStyle: React.CSSProperties = {
  color: '#0369a1',
  fontWeight: 800,
};

const pilotReviewerFeedbackLinkStyle: React.CSSProperties = {
  ...pilotReviewerLinkStyle,
  border: 0,
  background: 'transparent',
  padding: 0,
  cursor: 'pointer',
  font: 'inherit',
  textDecoration: 'underline',
  textUnderlineOffset: 2,
};

const pilotReviewerDescriptionStyle: React.CSSProperties = {
  color: '#475569',
};

const inventoryBoundaryCardStyle: React.CSSProperties = {
  marginBottom: 18,
  padding: 16,
  borderRadius: 12,
  border: '1px solid #d1fae5',
  background: '#f0fdf4',
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
};

const inventoryBoundaryGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 10,
  marginTop: 14,
};

const inventoryBoundaryFieldStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 10,
  border: '1px solid #bbf7d0',
  background: '#fff',
};

const inventoryBoundaryLabelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 5,
  color: '#047857',
  fontSize: 12,
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: 0,
};

const inventoryBoundaryValueStyle: React.CSSProperties = {
  display: 'block',
  color: '#0f172a',
  fontWeight: 650,
  lineHeight: 1.45,
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
