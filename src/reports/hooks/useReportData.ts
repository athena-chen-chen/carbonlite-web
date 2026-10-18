import { useEffect, useMemo, useRef, useState } from 'react';
import {
  EMPTY_ACTIVITY_USAGE_TOTALS,
  loadDefaultMetricsDateRange,
  loadMetricsOverview,
} from '../../services/metricsOverview';
import type {
  FormalActivityEmission,
  FormalConversionFactorUsed,
} from '../../components/FormalReportPreview';
import { getUserFriendlyErrorMessage } from '../../utils/userFriendlyErrors';
import { trackActivityEvent } from '../../services/activityEvents';
import type { CalculationAuditDetail } from '../../services/metrics';
import type { SpreadsheetReviewRowItem } from '../../services/spreadsheetReviewRows';
import {
  fetchOrganizationProfile,
  hasBackendOrganizationProfileSession,
  loadOrganizationProfile,
  ORGANIZATION_PROFILE_UPDATED_EVENT,
  profileToReportContextInventoryBoundary,
} from '../../services/organizationProfile';
import {
  getCurrentUser,
  getOrganizationId,
  getOrganizationName,
} from '../../services/auth';
import { summarizeInventoryBoundary } from '../../constants/inventoryBoundary';
import { startDevTiming } from '../../utils/performanceDiagnostics';
import { buildCanonicalReportData } from '../domain/buildCanonicalReportData';
import type { CanonicalReportData } from '../domain/reportTypes';

export type ReportScope = 'dateRange' | 'selectedDocuments' | 'selectedRecords';

export type ReportRouteState = {
  reportScope?: string;
  selectedRecordIds?: string[];
  selectedActivityRecordIds?: string[];
  selectedDocumentIds?: string[];
} | null;

export type ReportActivityItem = {
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

type UseReportDataInput = {
  routeState: ReportRouteState;
  page: string;
  url: string;
  regulatoryThresholdReferences?: CanonicalReportData['regulatoryReportingReference']['thresholdReferences'];
};

const DEFAULT_COUNT_SUMMARY = {
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
};

export function useReportData({
  routeState,
  page,
  url,
  regulatoryThresholdReferences = [],
}: UseReportDataInput) {
  const currentUserRef = useRef<ReturnType<typeof getCurrentUser>>(getCurrentUser());
  const currentUser = currentUserRef.current;
  const currentWorkspaceId = getOrganizationId(currentUser);
  const organizationName = getOrganizationName(currentUser);
  const initialSelectedRecordIds = useMemo(
    () =>
      (routeState?.selectedActivityRecordIds ?? routeState?.selectedRecordIds ?? [])
        .filter((id): id is string => typeof id === 'string'),
    [routeState?.selectedActivityRecordIds, routeState?.selectedRecordIds],
  );
  const initialSelectedDocumentIds = useMemo(
    () => (routeState?.selectedDocumentIds ?? []).filter((id): id is string => typeof id === 'string'),
    [routeState?.selectedDocumentIds],
  );

  const [summary, setSummary] = useState<any>(null);
  const [activities, setActivities] = useState<ReportActivityItem[]>([]);
  const [matchedActivityEmissions, setMatchedActivityEmissions] = useState<FormalActivityEmission[]>([]);
  const [conversionFactorsUsed, setConversionFactorsUsed] = useState<FormalConversionFactorUsed[]>([]);
  const [calculationDetails, setCalculationDetails] = useState<CalculationAuditDetail[]>([]);
  const [sourceReviewRows, setSourceReviewRows] = useState<SpreadsheetReviewRowItem[]>([]);
  const [usageTotals, setUsageTotals] = useState(EMPTY_ACTIVITY_USAGE_TOTALS);
  const [totalEstimatedEmissionsKgCO2e, setTotalEstimatedEmissionsKgCO2e] = useState(0);
  const [countSummary, setCountSummary] = useState(DEFAULT_COUNT_SUMMARY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [periodStart, setPeriodStart] = useState(getDefaultFallbackStartDate());
  const [periodEnd, setPeriodEnd] = useState('2026-12-31');
  const [draftPeriodStart, setDraftPeriodStart] = useState(getDefaultFallbackStartDate());
  const [draftPeriodEnd, setDraftPeriodEnd] = useState('2026-12-31');
  const [dateRangeReady, setDateRangeReady] = useState(false);
  const [organizationProfile, setOrganizationProfile] = useState(() =>
    loadOrganizationProfile(getCurrentUser()),
  );
  const [reportScope, setReportScope] = useState<ReportScope>(
    initialSelectedDocumentIds.length || routeState?.reportScope === 'selectedDocuments'
      ? 'selectedDocuments'
      : initialSelectedRecordIds.length
      ? 'selectedRecords'
      : 'dateRange',
  );
  const [selectedRecordIds] = useState<string[]>(initialSelectedRecordIds);
  const [selectedDocumentIds] = useState<string[]>(initialSelectedDocumentIds);
  const dateCommitTimerRef = useRef<number | null>(null);
  const inFlightRequestKeyRef = useRef<string | null>(null);
  const latestRequestKeyRef = useRef<string | null>(null);
  const outputGeneratedDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

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
  const inventoryBoundary = useMemo(
    () => profileToReportContextInventoryBoundary(organizationProfile, reportPeriod),
    [organizationProfile, reportPeriod],
  );
  const inventoryBoundarySummary = summarizeInventoryBoundary(
    inventoryBoundary,
    reportPeriod,
  );

  const report = useMemo(
    () =>
      buildCanonicalReportData({
        activities,
        reviewRows: sourceReviewRows,
        calculationDetails,
        matchedActivityEmissions,
        conversionFactorsUsed,
        usageTotals,
        countSummary,
        totalEstimatedEmissionsKgCO2e,
        inventoryBoundary,
        reportingPeriod: {
          startDate: reportScope === 'dateRange' ? periodStart : null,
          endDate: reportScope === 'dateRange' ? periodEnd : null,
          label: reportPeriod,
        },
        organization: {
          name: organizationName,
          id: currentWorkspaceId,
          generatedBy: currentUser?.email,
        },
        reportScope,
        reportScopeLabel,
        selectedRecordIds,
        selectedDocumentIds,
        outputGeneratedDate,
        regulatoryThresholdReferences,
      }),
    [
      activities,
      sourceReviewRows,
      calculationDetails,
      matchedActivityEmissions,
      conversionFactorsUsed,
      usageTotals,
      countSummary,
      totalEstimatedEmissionsKgCO2e,
      inventoryBoundary,
      reportScope,
      periodStart,
      periodEnd,
      reportPeriod,
      organizationName,
      currentWorkspaceId,
      currentUser?.email,
      reportScopeLabel,
      selectedRecordIds,
      selectedDocumentIds,
      outputGeneratedDate,
      regulatoryThresholdReferences,
    ],
  );

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
    latestRequestKeyRef.current = requestKey;
    const endTiming = startDevTiming('loadReportData');
    setLoading(true);
    setError(null);

    try {
      const overview = await loadMetricsOverview(request);
      if (latestRequestKeyRef.current !== requestKey) return;

      setSummary(overview.summary);
      setActivities(overview.activities.map(row => ({ ...row, recordDate: row.recordDate ?? '' })));
      setMatchedActivityEmissions(overview.matchedActivityEmissions.map(row => ({ ...row, factorId: row.factorId ?? '' })));
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
      if (latestRequestKeyRef.current !== requestKey) return;

      void trackActivityEvent({
        eventName: 'REPORT_GENERATION_FAILED',
        page,
        url,
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
      if (latestRequestKeyRef.current === requestKey) {
        setLoading(false);
      }
      endTiming();
    }
  }

  useEffect(() => {
    if (!dateRangeReady) return;
    void loadReportData();
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

  return {
    currentUser,
    currentWorkspaceId,
    organizationName,
    summary,
    activities,
    matchedActivityEmissions,
    conversionFactorsUsed,
    calculationDetails,
    usageTotals,
    totalEstimatedEmissionsKgCO2e,
    countSummary,
    report,
    loading,
    error,
    dateRangeReady,
    isPreparingReportData: !dateRangeReady || loading,
    refetch: loadReportData,
    reload: () => setReloadKey((value) => value + 1),
    periodStart,
    periodEnd,
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
  };
}

function getReportScopeLabel(
  reportScope: ReportScope,
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
