import { reportingPeriodError } from '../../utils/dateOnly';
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
  periodStart?: string;
  periodEnd?: string;
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
  const currentUser = getCurrentUser();
  const currentWorkspaceId = getOrganizationId(currentUser);
  const organizationName = getOrganizationName(currentUser);
  const initialSelectedRecordIds = useMemo(
    () =>
      normalizeIds(routeState?.selectedActivityRecordIds ?? routeState?.selectedRecordIds ?? []),
    [routeState?.selectedActivityRecordIds, routeState?.selectedRecordIds],
  );
  const initialSelectedDocumentIds = useMemo(
    () => normalizeIds(routeState?.selectedDocumentIds ?? []),
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
  // Request failures belong to a fetched scope; draft validation is derived below.
  const [requestFailure, setRequestFailure] = useState<{ identity: string; message: string } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [periodStart, setPeriodStart] = useState(getDefaultFallbackStartDate());
  const [periodEnd, setPeriodEnd] = useState('2026-12-31');
  const [draftPeriodStart, setDraftPeriodStart] = useState(getDefaultFallbackStartDate());
  const [draftPeriodEnd, setDraftPeriodEnd] = useState('2026-12-31');
  const [dateRangeReady, setDateRangeReady] = useState(false);
  const [periodOwner, setPeriodOwner] = useState(routeState);
  const [explicitPeriod, setExplicitPeriod] = useState(false);
  const incomingExplicit = routeState?.periodStart !== undefined || routeState?.periodEnd !== undefined;
  const hasExplicitPeriod = periodOwner === routeState ? explicitPeriod : incomingExplicit;
  const effectiveStart = periodOwner === routeState ? periodStart : routeState?.periodStart ?? periodStart;
  const effectiveEnd = periodOwner === routeState ? periodEnd : routeState?.periodEnd ?? periodEnd;
  const scopeError = reportingPeriodError(
    hasExplicitPeriod ? (periodOwner === routeState ? effectiveStart : routeState?.periodStart) : undefined,
    hasExplicitPeriod ? (periodOwner === routeState ? effectiveEnd : routeState?.periodEnd) : undefined,
  );
  const [organizationProfile, setOrganizationProfile] = useState(() =>
    loadOrganizationProfile(getCurrentUser()),
  );
  const selectedRecordIds = initialSelectedRecordIds;
  const selectedDocumentIds = initialSelectedDocumentIds;
  const restoredScope: ReportScope =
    selectedDocumentIds.length || routeState?.reportScope === 'selectedDocuments'
      ? 'selectedDocuments'
      : selectedRecordIds.length || routeState?.reportScope === 'selectedRecords' ? 'selectedRecords' : 'dateRange';
  const [scopeSelection, setScopeSelection] = useState({ routeState, scope: restoredScope });
  // Route restoration must change identity in this render, before effects start fetching.
  const reportScope = scopeSelection.routeState === routeState ? scopeSelection.scope : restoredScope;
  function setReportScope(scope: ReportScope) {
    setScopeSelection({ routeState, scope });
  }
  const dateCommitTimerRef = useRef<number | null>(null);
  const initializationGeneration = useRef(0);
  const inFlightRequestKeyRef = useRef<string | null>(null);
  const requestGenerationRef = useRef(0);
  const [loadedIdentity, setLoadedIdentity] = useState<string | null>(null);
  const request = {
    recalculate: true,
    requireSourceReviewRows: true,
    ...((reportScope === 'dateRange' || hasExplicitPeriod) ? { dateFrom: effectiveStart, dateTo: effectiveEnd } : {}),
    ...(reportScope === 'selectedRecords'
      ? { selectedActivityRecordIds: selectedRecordIds }
      : reportScope === 'selectedDocuments'
      ? { selectedDocumentIds }
      : {}),
  };
  const selectionError = (reportScope === 'selectedRecords' && !selectedRecordIds.length) ||
    (reportScope === 'selectedDocuments' && !selectedDocumentIds.length) ? 'No records or documents selected. Choose a reporting scope.' : null;
  const requestedIdentity = JSON.stringify({ workspaceId: currentWorkspaceId, scope: reportScope, ...request });
  const isCurrentData = loadedIdentity === requestedIdentity;
  const ownsDraft = periodOwner === routeState;
  const draftError = ownsDraft && (reportScope === 'dateRange' || hasExplicitPeriod)
    ? reportingPeriodError(draftPeriodStart, draftPeriodEnd) : null;
  const unappliedDates = ownsDraft && (draftPeriodStart !== periodStart || draftPeriodEnd !== periodEnd);
  const error = scopeError ?? selectionError ?? draftError ??
    (requestFailure?.identity === requestedIdentity ? requestFailure.message : null);
  const isExportReady = dateRangeReady && !loading && !error && !unappliedDates && isCurrentData;
  const outputGeneratedDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const reportScopeLabel = getReportScopeLabel(
    reportScope,
    selectedRecordIds.length,
    selectedDocumentIds.length,
  );
  const reportPeriod =
    reportScope === 'dateRange' || hasExplicitPeriod
      ? `${effectiveStart} to ${effectiveEnd}`
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
          startDate: reportScope === 'dateRange' || hasExplicitPeriod ? effectiveStart : null,
          endDate: reportScope === 'dateRange' || hasExplicitPeriod ? effectiveEnd : null,
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
      effectiveStart,
      effectiveEnd,
      hasExplicitPeriod,
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
    if (scopeError || selectionError) return;
    const requestKey = requestedIdentity;
    if (inFlightRequestKeyRef.current === requestKey) return;
    inFlightRequestKeyRef.current = requestKey;
    const generation = ++requestGenerationRef.current;
    const endTiming = startDevTiming('loadReportData');
    setLoading(true);
    setRequestFailure(null);

    try {
      const overview = await loadMetricsOverview(request);
      if (requestGenerationRef.current !== generation) return;

      const nextActivities = overview.activities.map(row => ({ ...row, recordDate: row.recordDate ?? '' }));
      const nextEmissions = overview.matchedActivityEmissions.map(row => ({ ...row, factorId: row.factorId ?? '' }));
      // React batches these updates: data and identity become visible together.
      setSummary(overview.summary);
      setActivities(nextActivities);
      setMatchedActivityEmissions(nextEmissions);
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
      setLoadedIdentity(requestKey);
    } catch {
      if (requestGenerationRef.current !== generation) return;

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
      setRequestFailure({ identity: requestKey, message: getUserFriendlyErrorMessage(null, 'reportGeneration') });
    } finally {
      if (requestGenerationRef.current === generation) {
        inFlightRequestKeyRef.current = null;
        setLoading(false);
      }
      endTiming();
    }
  }

  useEffect(() => {
    if (!dateRangeReady) return;
    void loadReportData();
    return () => {
      // A generation also distinguishes A → B → A and same-key retries.
      requestGenerationRef.current += 1;
      inFlightRequestKeyRef.current = null;
    };
  }, [dateRangeReady, reloadKey, requestedIdentity]);

  useEffect(() => {
    let cancelled = false;
    const generation = ++initializationGeneration.current;
    if (incomingExplicit) {
      setPeriodStart(routeState?.periodStart ?? ''); setPeriodEnd(routeState?.periodEnd ?? '');
      setDraftPeriodStart(routeState?.periodStart ?? ''); setDraftPeriodEnd(routeState?.periodEnd ?? '');
      setExplicitPeriod(true); setPeriodOwner(routeState); setDateRangeReady(true);
    } else {
      void loadDefaultMetricsDateRange().then(range => {
        if (cancelled || generation !== initializationGeneration.current) return;
        setPeriodStart(range.startDate); setPeriodEnd(range.endDate);
        setDraftPeriodStart(range.startDate); setDraftPeriodEnd(range.endDate);
      }).catch(() => undefined).finally(() => {
        if (!cancelled && generation === initializationGeneration.current) { setExplicitPeriod(false); setPeriodOwner(routeState); setDateRangeReady(true); }
      });
    }
    return () => { cancelled = true; if (dateCommitTimerRef.current) window.clearTimeout(dateCommitTimerRef.current); };
  }, [routeState]);

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

  function commitDateRange(nextStart = draftPeriodStart, nextEnd = draftPeriodEnd) {
    if (dateCommitTimerRef.current !== null) window.clearTimeout(dateCommitTimerRef.current);
    dateCommitTimerRef.current = null;
    initializationGeneration.current++;
    setDraftPeriodStart(nextStart);
    setDraftPeriodEnd(nextEnd);
    // Invalid drafts block export, but do not invalidate still-correct applied data.
    if (reportingPeriodError(nextStart, nextEnd)) return;
    setExplicitPeriod(true); setPeriodOwner(routeState); setDateRangeReady(true);
    setPeriodStart(nextStart);
    setPeriodEnd(nextEnd);
  }

  function scheduleDateCommit(nextStart: string, nextEnd: string) {
    // An operator edit supersedes inferred defaults immediately, even if incomplete.
    initializationGeneration.current++;
    if (dateCommitTimerRef.current !== null) window.clearTimeout(dateCommitTimerRef.current);
    dateCommitTimerRef.current = null;
    if (reportingPeriodError(nextStart, nextEnd)) return;
    dateCommitTimerRef.current = window.setTimeout(() => commitDateRange(nextStart, nextEnd), 500);
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
    requestedIdentity,
    loadedIdentity,
    isCurrentData,
    isExportReady,
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

function getDefaultFallbackStartDate() {
  return `${new Date().getFullYear() - 1}-01-01`;
}

function normalizeIds(ids: string[]) {
  return [...new Set(ids.filter((id): id is string => typeof id === 'string'))].sort();
}
