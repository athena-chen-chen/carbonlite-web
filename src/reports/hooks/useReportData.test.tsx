import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadOrganizationProfile, ORGANIZATION_PROFILE_UPDATED_EVENT } from '../../services/organizationProfile';
import { getCalculationSummary } from '../../services/metrics';
import { getSpreadsheetReviewRows } from '../../services/spreadsheetReviewRows';
import { useReportData, type ReportRouteState } from './useReportData';
import { loadDefaultMetricsDateRange, loadMetricsOverview, EMPTY_ACTIVITY_USAGE_TOTALS, type MetricsOverview } from '../../services/metricsOverview';

vi.mock('../../services/metricsOverview', async (original) => ({
  ...await original<typeof import('../../services/metricsOverview')>(),
  loadDefaultMetricsDateRange: vi.fn(), loadMetricsOverview: vi.fn(),
}));
vi.mock('../../services/metrics', () => ({ getCalculationSummary: vi.fn() }));
vi.mock('../../services/spreadsheetReviewRows', () => ({ getSpreadsheetReviewRows: vi.fn() }));
vi.mock('../../services/activityEvents', () => ({ trackActivityEvent: vi.fn().mockResolvedValue({}) }));
vi.mock('../../services/organizationProfile', async (original) => ({
  ...await original<typeof import('../../services/organizationProfile')>(),
  hasBackendOrganizationProfileSession: () => false,
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function overview(id: string, total: number): MetricsOverview {
  return {
    summary: {}, activities: [{ id, activityType: 'DIESEL', recordDate: '2026-01-01', quantity: 1, unit: 'L', sourceType: 'MANUAL' }],
    usageTotals: EMPTY_ACTIVITY_USAGE_TOTALS, matchedActivityEmissions: [], conversionFactorsUsed: [],
    calculationDetails: [], sourceReviewRows: [], totalEstimatedEmissionsKgCO2e: total,
    totalRecordsFound: 1, recordsInScope: 1, processedRecords: 1, recordsIncluded: 1,
    skippedRecords: 0, missingFactorRecords: 0, matchedFactorsCount: 0, missingFactors: [],
    invalidRecordCount: 0, dataQualityCoverage: 100, totalRecords: 1,
    skippedReasons: { missingFactor: 0, outsideDateRange: 0, outsideScope: 0, invalidData: 0 },
  } as MetricsOverview;
}
function mount(routeState: ReportRouteState = null) {
  return renderHook(({ routeState }) => useReportData({ routeState, page: '/reports', url: '' }), { initialProps: { routeState } });
}
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem('currentUser', JSON.stringify({ id: 'user', organizationId: 'workspace-A' }));
  vi.mocked(loadDefaultMetricsDateRange).mockResolvedValue({ startDate: '2026-01-01', endDate: '2026-03-31', hasActivityRecords: true });
  vi.mocked(loadMetricsOverview).mockResolvedValue(overview('A', 10));
});

describe('report request ownership', () => {
  it.each(['success', 'failure'] as const)('retains A but blocks export during Q2 loading and after %s', async (outcome) => {
    const { result } = mount();
    await waitFor(() => expect(result.current.isExportReady).toBe(true));
    const identityA = result.current.loadedIdentity;
    const pending = deferred<MetricsOverview>();
    vi.mocked(loadMetricsOverview).mockReturnValueOnce(pending.promise);
    act(() => result.current.commitDateRange('2026-04-01', '2026-06-30'));
    expect(result.current.isExportReady).toBe(false);
    expect(result.current.activities[0].id).toBe('A');
    expect(result.current.loadedIdentity).toBe(identityA);
    expect(result.current.requestedIdentity).not.toBe(identityA);
    await act(async () => outcome === 'success' ? pending.resolve(overview('B', 20)) : pending.reject(new Error('failed B')));
    expect(result.current.loading).toBe(false);
    if (outcome === 'success') {
      expect(result.current.isExportReady).toBe(true);
      expect(result.current.loadedIdentity).toBe(result.current.requestedIdentity);
      expect(result.current.report.totalEstimatedEmissionsKgCO2e).toBe(20);
      expect(result.current.report.reportPeriod).toBe('2026-04-01 to 2026-06-30');
      expect(result.current.activities[0].id).toBe('B');
    } else {
      expect(result.current.error).toBeTruthy();
      expect(result.current.isExportReady).toBe(false);
      expect(result.current.activities[0].id).toBe('A');
      expect(result.current.loadedIdentity).toBe(identityA);
    }
  });

  it('uses restored document selections and normalizes their set ordering and duplicates', async () => {
    const { result, rerender } = mount({ reportScope: 'selectedDocuments', selectedDocumentIds: ['B', 'A', 'A'] });
    await waitFor(() => expect(result.current.isExportReady).toBe(true));
    const key = result.current.requestedIdentity;
    const calls = vi.mocked(loadMetricsOverview).mock.calls.length;
    rerender({ routeState: { reportScope: 'selectedDocuments', selectedDocumentIds: ['A', 'B'] } });
    expect(result.current.requestedIdentity).toBe(key);
    expect(result.current.isExportReady).toBe(true);
    expect(loadMetricsOverview).toHaveBeenCalledTimes(calls);
    const pending = deferred<MetricsOverview>();
    vi.mocked(loadMetricsOverview).mockReturnValueOnce(pending.promise);
    rerender({ routeState: { reportScope: 'selectedDocuments', selectedDocumentIds: ['D', 'C'] } });
    expect(result.current.isExportReady).toBe(false);
    await act(async () => pending.resolve(overview('CD', 30)));
    expect(result.current.isExportReady).toBe(true);
    expect(result.current.selectedDocumentIds).toEqual(['C', 'D']);
    expect(result.current.activities[0].id).toBe('CD');
    expect(loadMetricsOverview).toHaveBeenLastCalledWith({ recalculate: true, requireSourceReviewRows: true, selectedDocumentIds: ['C', 'D'] });
  });

  it('ignores late A completion after B succeeds', async () => {
    const a = deferred<MetricsOverview>();
    vi.mocked(loadMetricsOverview).mockReturnValueOnce(a.promise);
    const { result } = mount();
    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalledTimes(1));
    act(() => result.current.handleFullYear('2027'));
    await waitFor(() => expect(result.current.isExportReady).toBe(true));
    const keyB = result.current.loadedIdentity;
    await act(async () => a.resolve(overview('late-A', 99)));
    expect(result.current.loadedIdentity).toBe(keyB);
    expect(result.current.report.totalEstimatedEmissionsKgCO2e).toBe(10);
    expect(result.current.report.reportPeriod).toBe('2027-01-01 to 2027-12-31');
  });

  it('rejects an obsolete same-key request across A → B → A', async () => {
    const oldA = deferred<MetricsOverview>();
    vi.mocked(loadMetricsOverview).mockReturnValueOnce(oldA.promise);
    const { result } = mount();
    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalledTimes(1));
    act(() => result.current.handleFullYear('2027'));
    await waitFor(() => expect(result.current.isExportReady).toBe(true));
    act(() => result.current.commitDateRange('2026-01-01', '2026-03-31'));
    await waitFor(() => expect(result.current.isExportReady).toBe(true));
    await act(async () => oldA.resolve(overview('obsolete', 99)));
    expect(result.current.activities[0].id).toBe('A');
    expect(result.current.totalEstimatedEmissionsKgCO2e).toBe(10);
  });

  it('includes workspace identity and keeps a failed same-request refresh unexportable', async () => {
    const { result, rerender } = mount();
    await waitFor(() => expect(result.current.isExportReady).toBe(true));
    const keyA = result.current.loadedIdentity;
    const pending = deferred<MetricsOverview>();
    vi.mocked(loadMetricsOverview).mockReturnValueOnce(pending.promise);
    localStorage.setItem('currentUser', JSON.stringify({ id: 'user', organizationId: 'workspace-B' }));
    rerender({ routeState: null });
    expect(result.current.requestedIdentity).not.toBe(keyA);
    expect(result.current.isExportReady).toBe(false);
    await act(async () => pending.resolve(overview('workspace-B', 20)));
    expect(result.current.isExportReady).toBe(true);
    vi.mocked(loadMetricsOverview).mockRejectedValueOnce(new Error('refresh failed'));
    await act(async () => result.current.refetch());
    expect(result.current.isCurrentData).toBe(true);
    expect(result.current.isExportReady).toBe(false);
  });
});


it.each(['success', 'failure'] as const)('waits for all B datasets and handles source-review %s atomically', async (outcome) => {
  const actual = await vi.importActual<typeof import('../../services/metricsOverview')>('../../services/metricsOverview');
  vi.mocked(loadMetricsOverview).mockImplementation(actual.loadMetricsOverview);
  vi.mocked(getCalculationSummary).mockResolvedValue({ totalsByMetric: [], activities: [], calculationDetails: [], totalEstimatedEmissionsKgCO2e: 10 } as any);
  vi.mocked(getSpreadsheetReviewRows).mockResolvedValue({ items: [] } as any);
  const { result, rerender } = mount({ reportScope: 'selectedDocuments', selectedDocumentIds: ['A'] });
  await waitFor(() => expect(result.current.isExportReady).toBe(true));
  const keyA = result.current.loadedIdentity;
  const review = deferred<Awaited<ReturnType<typeof getSpreadsheetReviewRows>>>();
  vi.mocked(getSpreadsheetReviewRows).mockReturnValueOnce(review.promise);
  vi.mocked(getCalculationSummary).mockResolvedValue({ totalsByMetric: [], activities: [], calculationDetails: [], totalEstimatedEmissionsKgCO2e: 20 } as any);
  rerender({ routeState: { reportScope: 'selectedDocuments', selectedDocumentIds: ['B'] } });
  await waitFor(() => expect(getSpreadsheetReviewRows).toHaveBeenCalledTimes(2));
  // B summary has completed, but the assembled report still belongs entirely to A.
  expect(result.current.loading).toBe(true);
  expect(result.current.isExportReady).toBe(false);
  expect(result.current.totalEstimatedEmissionsKgCO2e).toBe(10);
  expect(result.current.loadedIdentity).toBe(keyA);
  await act(async () => outcome === 'success' ? review.resolve({ items: [] } as any) : review.reject(new Error('review rows unavailable')));
  expect(result.current.loading).toBe(false);
  expect(result.current.isExportReady).toBe(outcome === 'success');
  expect(result.current.totalEstimatedEmissionsKgCO2e).toBe(outcome === 'success' ? 20 : 10);
  if (outcome === 'failure') {
    expect(result.current.loadedIdentity).toBe(keyA);
    expect(result.current.error).toBeTruthy();
  }
});

it('restores route scope before requesting data and preserves selected-record scope', async () => {
  const { result, rerender } = mount();
  await waitFor(() => expect(result.current.isExportReady).toBe(true));
  const pending = deferred<MetricsOverview>();
  vi.mocked(loadMetricsOverview).mockReturnValueOnce(pending.promise);
  rerender({ routeState: { reportScope: 'selectedDocuments', selectedDocumentIds: ['B', 'A'] } });
  expect(result.current.reportScope).toBe('selectedDocuments');
  expect(result.current.isExportReady).toBe(false);
  expect(loadMetricsOverview).toHaveBeenLastCalledWith({ recalculate: true, requireSourceReviewRows: true, selectedDocumentIds: ['A', 'B'] });
  await act(async () => pending.resolve(overview('docs', 20)));
  expect(result.current.report.reportScopeLabel).toBe('Selected Documents (2)');
  rerender({ routeState: { selectedActivityRecordIds: ['record-B', 'record-A', 'record-A'] } });
  expect(result.current.reportScope).toBe('selectedRecords');
  expect(result.current.isExportReady).toBe(false);
  await waitFor(() => expect(result.current.isExportReady).toBe(true));
  expect(loadMetricsOverview).toHaveBeenLastCalledWith({ recalculate: true, requireSourceReviewRows: true, selectedActivityRecordIds: ['record-A', 'record-B'] });
});


describe('report period handoff', () => {
  it.each(['selectedRecords','selectedDocuments','dateRange'])('retains an explicit narrow period with %s', async reportScope => {
    const route = {reportScope,periodStart:'2025-02-01',periodEnd:'2025-02-28', ...(reportScope === 'selectedRecords' ? {selectedActivityRecordIds:['A']} : reportScope === 'selectedDocuments' ? {selectedDocumentIds:['D']} : {})};
    const {result}=mount(route);
    await waitFor(()=>expect(result.current.isExportReady).toBe(true));
    expect(loadDefaultMetricsDateRange).not.toHaveBeenCalled();
    expect(loadMetricsOverview).toHaveBeenLastCalledWith(expect.objectContaining({dateFrom:'2025-02-01',dateTo:'2025-02-28'}));
    expect(result.current.report.reportingPeriod).toMatchObject({startDate:'2025-02-01',endDate:'2025-02-28',label:'2025-02-01 to 2025-02-28'});
  });
  it.each(['2026-02-30','invalid'])('blocks invalid incoming dates %s without widening', async periodStart=>{
    const {result}=mount({reportScope:'selectedRecords',selectedActivityRecordIds:['A'],periodStart,periodEnd:'2026-03-31'});
    await waitFor(()=>expect(result.current.error).toContain('valid reporting'));
    expect(result.current.isExportReady).toBe(false); expect(loadMetricsOverview).not.toHaveBeenCalled();
  });
  it('blocks an explicitly empty selection rather than loading every record',async()=>{
    const {result}=mount({reportScope:'selectedRecords',selectedActivityRecordIds:[],periodStart:'2026-01-01',periodEnd:'2026-01-31'});
    await waitFor(()=>expect(result.current.error).toContain('No records'));
    expect(result.current.isExportReady).toBe(false);expect(loadMetricsOverview).not.toHaveBeenCalled();
  });
  it('rejects late completion after a route changes only its period',async()=>{
    const pending=deferred<MetricsOverview>();vi.mocked(loadMetricsOverview).mockReturnValueOnce(pending.promise);
    const {result,rerender}=mount({reportScope:'selectedRecords',selectedActivityRecordIds:['A'],periodStart:'2025-01-01',periodEnd:'2025-12-31'});
    await waitFor(()=>expect(loadMetricsOverview).toHaveBeenCalledTimes(1));
    rerender({routeState:{reportScope:'selectedRecords',selectedActivityRecordIds:['A'],periodStart:'2026-01-01',periodEnd:'2026-12-31'}});
    expect(result.current.isExportReady).toBe(false);
    await waitFor(()=>expect(result.current.isExportReady).toBe(true));
    await act(async()=>pending.resolve(overview('obsolete',99)));
    expect(result.current.activities[0].id).not.toBe('obsolete');expect(result.current.report.reportingPeriod.startDate).toBe('2026-01-01');
  });
});


it('does not let delayed inferred defaults overwrite an explicitly applied period',async()=>{
 const pending=deferred<{startDate:string;endDate:string;hasActivityRecords:boolean}>();vi.mocked(loadDefaultMetricsDateRange).mockReturnValueOnce(pending.promise);
 const {result}=mount();act(()=>result.current.commitDateRange('2025-02-01','2025-02-28'));
 await waitFor(()=>expect(result.current.isExportReady).toBe(true));
 await act(async()=>pending.resolve({startDate:'2026-01-01',endDate:'2026-12-31',hasActivityRecords:true}));
 expect(result.current.report.reportingPeriod).toMatchObject({startDate:'2025-02-01',endDate:'2025-02-28'});
});


describe('current report validation', () => {
  it('recovers invalid then valid dates equal to the already loaded scope without refetch', async () => {
    const { result } = mount();
    await waitFor(() => expect(result.current.isExportReady).toBe(true));
    // Establish the same explicit period before a segmented input is cleared.
    act(() => result.current.commitDateRange('2026-01-01', '2026-03-31'));
    await waitFor(() => expect(result.current.isExportReady).toBe(true));
    const calls = vi.mocked(loadMetricsOverview).mock.calls.length;
    act(() => { result.current.handleEndDateChange(''); result.current.commitDateRange('2026-01-01', ''); });
    expect(result.current.error).toContain('valid reporting');
    expect(result.current.isExportReady).toBe(false);
    act(() => { result.current.handleEndDateChange('2026-03-31'); result.current.commitDateRange('2026-01-01', '2026-03-31'); });
    expect(result.current.error).toBeNull();
    expect(result.current.isExportReady).toBe(true);
    expect(loadMetricsOverview).toHaveBeenCalledTimes(calls);
  });

  it('keeps valid unapplied draft dates unexportable while underlying data settles', async () => {
    const pending = deferred<MetricsOverview>();
    vi.mocked(loadMetricsOverview).mockReturnValueOnce(pending.promise);
    const { result } = mount();
    await waitFor(() => expect(loadMetricsOverview).toHaveBeenCalledTimes(1));
    act(() => result.current.handleEndDateChange('2026-01-31'));
    await act(async () => pending.resolve(overview('old-scope', 10)));
    expect(result.current.isExportReady).toBe(false);
    act(() => result.current.commitDateRange('2026-01-01', '2026-01-31'));
    await waitFor(() => expect(result.current.isExportReady).toBe(true));
    expect(result.current.reportPeriod).toBe('2026-01-01 to 2026-01-31');
  });

  it('cancels a queued draft commit when a newer period is applied', async () => {
    const { result } = mount();
    await waitFor(() => expect(result.current.isExportReady).toBe(true));
    vi.useFakeTimers();
    try {
      act(() => result.current.handleEndDateChange('2026-01-31'));
      await act(async () => result.current.commitDateRange('2026-02-01', '2026-02-28'));
      await act(async () => vi.advanceTimersByTimeAsync(600));
      expect(result.current.reportPeriod).toBe('2026-02-01 to 2026-02-28');
      expect(result.current.draftPeriodStart).toBe('2026-02-01');
      expect(result.current.draftPeriodEnd).toBe('2026-02-28');
      expect(result.current.isExportReady).toBe(true);
    } finally { vi.useRealTimers(); }
  });
});

it.each(['selectedRecords', 'selectedDocuments'] as const)('clears an invalid selection error when current %s become valid', async reportScope => {
  const { result, rerender } = mount({reportScope, selectedActivityRecordIds:[], selectedDocumentIds:[]});
  await waitFor(() => expect(result.current.error).toContain('No records'));
  expect(result.current.isExportReady).toBe(false);
  rerender({routeState:{reportScope, ...(reportScope==='selectedRecords' ? {selectedActivityRecordIds:['A']} : {selectedDocumentIds:['D']})}});
  await waitFor(() => expect(result.current.isExportReady).toBe(true));
  expect(result.current.error).toBeNull();
});

it.each(['success', 'failure'] as const)('ignores an old scope validation/data %s after record-to-document navigation', async outcome => {
  const pending = deferred<MetricsOverview>();
  vi.mocked(loadMetricsOverview).mockReturnValueOnce(pending.promise);
  const {result,rerender}=mount({reportScope:'selectedRecords',selectedActivityRecordIds:['A'],periodStart:'2025-01-01',periodEnd:'2025-12-31'});
  await waitFor(()=>expect(loadMetricsOverview).toHaveBeenCalledTimes(1));
  rerender({routeState:{reportScope:'selectedDocuments',selectedDocumentIds:['D'],periodStart:'2026-01-01',periodEnd:'2026-01-31'}});
  await waitFor(()=>expect(result.current.isExportReady).toBe(true));
  const identity=result.current.loadedIdentity;
  await act(async()=>outcome==='success'?pending.resolve(overview('obsolete',99)):pending.reject(new Error('obsolete failure')));
  expect(result.current.error).toBeNull();
  expect(result.current.loadedIdentity).toBe(identity);
  expect(result.current.reportPeriod).toBe('2026-01-01 to 2026-01-31');
  expect(result.current.selectedDocumentIds).toEqual(['D']);
  expect(result.current.totalEstimatedEmissionsKgCO2e).toBe(10);
  expect(result.current.isExportReady).toBe(true);
});

it('preserves a real current-scope fetch failure when invalid drafts are corrected',async()=>{
  const {result}=mount();await waitFor(()=>expect(result.current.isExportReady).toBe(true));
  act(()=>result.current.commitDateRange('2026-01-01','2026-03-31'));
  vi.mocked(loadMetricsOverview).mockRejectedValueOnce(new Error('current failure'));
  await act(async()=>result.current.refetch());
  const fetchError=result.current.error;
  act(()=>result.current.commitDateRange('2026-01-01',''));
  expect(result.current.error).toContain('valid reporting');
  act(()=>result.current.commitDateRange('2026-01-01','2026-03-31'));
  expect(result.current.error).toBe(fetchError);
  expect(result.current.isExportReady).toBe(false);
  await act(async()=>result.current.refetch());
  expect(result.current.error).toBeNull();expect(result.current.isExportReady).toBe(true);
});

it('uses the current boundary while an edited period and pending data settle',async()=>{
  const {result}=mount();await waitFor(()=>expect(result.current.isExportReady).toBe(true));
  const pending=deferred<MetricsOverview>();vi.mocked(loadMetricsOverview).mockReturnValueOnce(pending.promise);
  act(()=>result.current.commitDateRange('2026-04-01','2026-06-30'));
  act(()=>{
    result.current.handleEndDateChange('');
    window.dispatchEvent(new CustomEvent(ORGANIZATION_PROFILE_UPDATED_EVENT,{detail:{...loadOrganizationProfile(),geographicBoundary:'Current synthetic Calgary boundary',boundaryStatus:'DRAFT',boundaryVersion:2}}));
  });
  await act(async()=>pending.resolve(overview('current-period',20)));
  expect(result.current.error).toContain('valid reporting');expect(result.current.isExportReady).toBe(false);
  act(()=>result.current.commitDateRange('2026-04-01','2026-06-30'));
  expect(result.current.error).toBeNull();expect(result.current.isExportReady).toBe(true);
  expect(result.current.report.inventoryBoundary).toMatchObject({geographicBoundary:'Current synthetic Calgary boundary',boundaryStatus:'DRAFT',boundaryVersion:2});
  expect(result.current.reportPeriod).toBe('2026-04-01 to 2026-06-30');
});

it('applies only the last rapid draft date edit after debounce',async()=>{
  const {result}=mount();await waitFor(()=>expect(result.current.isExportReady).toBe(true));
  const calls=vi.mocked(loadMetricsOverview).mock.calls.length;
  vi.useFakeTimers();
  try {
    act(()=>{result.current.handleEndDateChange('2026-01-31');result.current.handleEndDateChange('2026-02-28');result.current.handleEndDateChange('2026-05-31');});
    expect(result.current.isExportReady).toBe(false);
    await act(async()=>vi.advanceTimersByTimeAsync(600));
    expect(result.current.reportPeriod).toBe('2026-01-01 to 2026-05-31');
    expect(result.current.isExportReady).toBe(true);
    expect(loadMetricsOverview).toHaveBeenCalledTimes(calls+1);
  } finally {vi.useRealTimers();}
});
