import { act, renderHook, waitFor } from '@testing-library/react';
import { useDraftReview } from './useDraftReview';
import { confirmDocumentImport, extractDocument, getDocumentExtraction, type ExtractResponse, type ParsedActivity } from '../../../services/documentExtraction';
import { getAllActivityData } from '../../../services/activityData';
import { getAllConversionFactors } from '../../../services/conversionFactors';
import { calculateMetrics } from '../../../services/metrics';
import { buildDocumentImportRecordKey } from '../domain/importIdentity';
import type { SpreadsheetReviewRowInput } from '../../../services/spreadsheetReviewRows';
import type { DocumentItem } from '../inputData.types';

vi.mock('../../../services/documentExtraction', async importOriginal => ({ ...await importOriginal<typeof import('../../../services/documentExtraction')>(), confirmDocumentImport: vi.fn(), extractDocument: vi.fn(), getDocumentExtraction: vi.fn() }));
vi.mock('../../../services/activityData', () => ({ getAllActivityData: vi.fn(), createActivityData: vi.fn() }));
vi.mock('../../../services/conversionFactors', () => ({ getAllConversionFactors: vi.fn() }));
vi.mock('../../../services/metrics', () => ({ calculateMetrics: vi.fn() }));

const document: DocumentItem = { id: 'source', fileName: 'bill.pdf', type: 'PDF', fileUrl: '', status: 'REVIEW_REQUIRED', createdAt: '2026-03-01' };
const water: ParsedActivity = { activityType: 'WATER', recordDate: '2026-03-01', quantity: 18, unit: 'm3', sourceRow: 2 };
const extraction = (documentId = document.id, rows = [water]): ExtractResponse => ({ documentId, status: 'REVIEW_REQUIRED', parsedActivities: rows, sourceRowCount: rows.length, extractedRowCount: rows.length, possibleMissingRows: false, warning: null });
function options(): Parameters<typeof useDraftReview>[0] {
  return {
    documents: [document], uploading: false, canImportData: true, canSetProvinceOnDraftRows: true,
    organizationId: 'org-1', setProvincePermissionDeniedReason: 'Permission denied.',
    feedback: { error: vi.fn(), success: vi.fn() },
    collection: { loadDocuments: vi.fn(async () => {}), updateDocumentStatuses: vi.fn() },
    shouldRefreshDocument: () => false, confirm: vi.fn(async () => true), onWorkflowEvent: vi.fn(),
    formatImportCompletedMessage: count => `Imported ${count}`,
    events: { onConfirmStarted: vi.fn(), onValidationIssue: vi.fn(), onImportCompleted: vi.fn(async () => {}), onDocumentsExtracted: vi.fn() },
  };
}

beforeEach(() => {
  vi.mocked(getDocumentExtraction).mockReset().mockResolvedValue(extraction());
  vi.mocked(extractDocument).mockReset().mockResolvedValue(extraction());
  vi.mocked(getAllActivityData).mockReset().mockResolvedValue([]);
  vi.mocked(getAllConversionFactors).mockReset().mockResolvedValue([]);
  vi.mocked(confirmDocumentImport).mockReset().mockResolvedValue({ count: 1, createdIds: ['water-created'] });
  vi.mocked(calculateMetrics).mockReset().mockResolvedValue({ count: 1, items: [] });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const factor = (activityType: string, region: string, value: number) => ({
  id: `${activityType}-${region}`, name: `${activityType} ${region}`, type: 'EMISSION', activityType,
  inputUnit: activityType === 'ELECTRICITY' ? 'kWh' : 'L', unit: activityType === 'ELECTRICITY' ? 'kWh' : 'L',
  factorValue: value, resultUnit: 'kgCO2e', jurisdictionCountry: 'Canada', jurisdictionRegion: region,
  sourceYear: 2026, effectiveYear: 2026, defaultScope: activityType === 'ELECTRICITY' ? 'SCOPE_2' : 'SCOPE_1',
  isDefault: true, isSystemDefault: true, createdAt: '2026-01-01', updatedAt: '2026-01-01',
});
const factors = [factor('GASOLINE', 'Alberta', 2.31), factor('DIESEL', 'Alberta', 2.68), factor('ELECTRICITY', 'Alberta', .53), factor('ELECTRICITY', 'British Columbia', .02)] as Awaited<ReturnType<typeof getAllConversionFactors>>;
const savedRow = (overrides: Partial<SpreadsheetReviewRowInput> = {}): SpreadsheetReviewRowInput => ({
  rowId: 'row-1', status: 'NEEDS_REVIEW', activityType: 'GASOLINE', recordDate: '2026-03-01', quantity: 1, unit: 'L',
  jurisdictionCountry: 'Canada', jurisdictionRegion: 'Alberta', issues: [], ...overrides,
});
async function saved(rows = [savedRow()]) {
  const p = options();
  const hook = renderHook(() => useDraftReview(p));
  await act(() => hook.result.current.actions.loadSavedSpreadsheetReview(rows, document));
  return { ...hook, p };
}

it.each([
  ['quantity', '10', '20', 46.2],
  ['unit', 'gallons', 'L', 2.31],
  ['activityType', 'DIESEL', 'GASOLINE', 2.31],
  ['jurisdictionRegion', 'Alberta', 'British Columbia', 2],
] as const)('latest same-row %s edit wins including canonical evaluation', async (field, first, second, emissions) => {
  const row = field === 'jurisdictionRegion' ? savedRow({ activityType: 'ELECTRICITY', unit: 'kWh', quantity: 100 }) : savedRow();
  const { result } = await saved([row]);
  const a = deferred<typeof factors>(); const b = deferred<typeof factors>();
  vi.mocked(getAllConversionFactors).mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
  act(() => result.current.actions.updateParsedActivityField(0, field, first));
  act(() => result.current.actions.updateParsedActivityField(0, field, second));
  await act(async () => b.resolve(factors));
  await waitFor(() => expect(result.current.state.parsedActivities[0].calculatedEmissionsKgCO2e).toBe(emissions));
  await act(async () => a.resolve(factors));
  const final = result.current.state.parsedActivities[0];
  expect(final[field].value).toBe(field === 'quantity' ? Number(second) : second);
  expect(final).toMatchObject({ matchingStatus: 'MATCHED', calculationStatus: 'CALCULATED', reportTreatment: 'INCLUDED', calculatedEmissionsKgCO2e: emissions });
});

it('evaluates different rows independently, even after indexes shift', async () => {
  const { result } = await saved([savedRow(), savedRow({ rowId: 'row-2' }), savedRow({ rowId: 'row-3' })]);
  const a = deferred<typeof factors>(); const b = deferred<typeof factors>();
  vi.mocked(getAllConversionFactors).mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
  act(() => result.current.actions.updateParsedActivityField(1, 'quantity', '10'));
  act(() => result.current.actions.updateParsedActivityField(2, 'quantity', '20'));
  act(() => result.current.actions.removeParsedActivity(0));
  await act(async () => b.resolve(factors));
  expect(result.current.state.parsedActivities[1].calculatedEmissionsKgCO2e).toBe(46.2);
  await act(async () => a.resolve(factors));
  expect(result.current.state.parsedActivities.map((row) => row.calculatedEmissionsKgCO2e)).toEqual([23.1, 46.2]);
});

it('does not restore a deleted row or overwrite its replacement at the same index', async () => {
  const { result } = await saved([savedRow({ rowId: '' })]);
  const a = deferred<typeof factors>();
  vi.mocked(getAllConversionFactors).mockReturnValueOnce(a.promise);
  act(() => result.current.actions.updateParsedActivityField(0, 'quantity', '10'));
  act(() => result.current.actions.removeParsedActivity(0));
  act(() => result.current.actions.addParsedActivity());
  await act(async () => a.resolve(factors));
  expect(result.current.state.parsedActivities).toHaveLength(1);
  expect(result.current.state.parsedActivities[0].quantity.value).toBe(0);
});

it('bulk Alberta cannot overwrite a later BC edit or restore removed rows', async () => {
  const rows = [savedRow({ activityType: 'ELECTRICITY', unit: 'kWh', quantity: 100, jurisdictionRegion: '' }), savedRow({ rowId: 'row-2', activityType: 'ELECTRICITY', unit: 'kWh', quantity: 100, jurisdictionRegion: '' })];
  const { result } = await saved(rows);
  const bulk = deferred<typeof factors>(); const bc = deferred<typeof factors>();
  vi.mocked(getAllConversionFactors).mockReturnValueOnce(bulk.promise).mockReturnValueOnce(bc.promise);
  act(() => result.current.actions.setBulkProvince('Alberta'));
  let bulkWork!: Promise<void>;
  act(() => { bulkWork = result.current.actions.applyBulkProvinceToMissingRows(); });
  act(() => result.current.actions.updateParsedActivityField(0, 'jurisdictionRegion', 'BC'));
  act(() => result.current.actions.removeParsedActivity(1));
  await act(async () => bc.resolve(factors));
  await act(async () => { bulk.resolve(factors); await bulkWork; });
  expect(result.current.state.parsedActivities).toHaveLength(1);
  expect(result.current.state.parsedActivities[0]).toMatchObject({ jurisdictionRegion: { value: 'British Columbia' }, calculatedEmissionsKgCO2e: 2 });
});

it('an invalid later edit cancels an earlier valid evaluation', async () => {
  const { result } = await saved(); const a = deferred<typeof factors>();
  vi.mocked(getAllConversionFactors).mockReturnValueOnce(a.promise);
  act(() => result.current.actions.updateParsedActivityField(0, 'quantity', '10'));
  act(() => result.current.actions.updateParsedActivityField(0, 'quantity', ''));
  await act(async () => a.resolve(factors));
  expect(result.current.state.parsedActivities[0]).toMatchObject({ quantity: { value: null }, calculatedEmissionsKgCO2e: null, selected: false });
});

it('pending evaluation preserves a later note and explicit deselection', async () => {
  const { result } = await saved(); const a = deferred<typeof factors>(); const b = deferred<typeof factors>();
  vi.mocked(getAllConversionFactors).mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
  act(() => result.current.actions.updateParsedActivityField(0, 'quantity', '10'));
  act(() => result.current.actions.updateParsedActivityField(0, 'notes', 'latest note'));
  act(() => result.current.actions.clearAllParsedActivities());
  await act(async () => b.resolve(factors));
  await act(async () => a.resolve(factors));
  expect(result.current.state.parsedActivities[0]).toMatchObject({ notes: { value: 'latest note' }, quantity: { value: 10 }, calculatedEmissionsKgCO2e: 23.1, selected: false });
});

const other = { ...document, id: 'B', fileName: 'B.pdf' };
const response = (id: string) => ({ ...extraction(id, [{ ...water, sourceReference: id }]), detectedSourceItems: [{ id: `${id}-fee`, type: 'UTILITY_FEE', reason: id }] });

it.each(['preview', 'extract'] as const)('ignores stale %s failures and keeps rows/detected items from B', async (operation) => {
  const a = deferred<ExtractResponse>(); const b = deferred<ExtractResponse>();
  const service = operation === 'preview' ? vi.mocked(getDocumentExtraction) : vi.mocked(extractDocument);
  service.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
  const p = { ...options(), documents: [document, other] };
  const { result } = renderHook(() => useDraftReview(p));
  let workA!: Promise<void>; let workB!: Promise<void>;
  act(() => { workA = operation === 'preview' ? result.current.actions.previewDocument(document) : result.current.actions.extractDocuments([document]); });
  act(() => { workB = operation === 'preview' ? result.current.actions.previewDocument(other) : result.current.actions.extractDocuments([other]); });
  await act(async () => { b.resolve(response('B')); await workB; });
  vi.mocked(p.feedback.error).mockClear(); vi.mocked(p.feedback.success).mockClear(); vi.mocked(p.collection.updateDocumentStatuses).mockClear();
  await act(async () => { a.reject(new Error('old failure')); await workA; });
  expect(result.current.state).toMatchObject({ previewDocumentId: 'B', extractingId: null, detectedSourceItems: [{ id: 'B-fee', documentId: 'B' }] });
  expect(result.current.state.parsedActivities[0].documentId).toBe('B');
  expect(p.feedback.error).not.toHaveBeenCalled(); expect(p.feedback.success).not.toHaveBeenCalled();
  expect(p.collection.updateDocumentStatuses).not.toHaveBeenCalled();
});

it.each(['preview', 'extract'] as const)('stale %s completion cannot stop the current spinner', async (operation) => {
  const a = deferred<ExtractResponse>(); const b = deferred<ExtractResponse>();
  const service = operation === 'preview' ? vi.mocked(getDocumentExtraction) : vi.mocked(extractDocument);
  service.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
  const { result } = renderHook(() => useDraftReview(options()));
  let wa!: Promise<void>; let wb!: Promise<void>;
  act(() => { wa = operation === 'preview' ? result.current.actions.previewDocument(document) : result.current.actions.extractDocuments([document]); });
  act(() => { wb = operation === 'preview' ? result.current.actions.previewDocument(other) : result.current.actions.extractDocuments([other]); });
  await act(async () => { a.resolve(response('source')); await wa; });
  expect(result.current.state.extractingId).toBe('B');
  await act(async () => { b.resolve(response('B')); await wb; });
  expect(result.current.state.extractingId).toBeNull();
});

it.each(['preview', 'extract'] as const)('clear/delete/reset invalidate pending %s success and failure', async (operation) => {
  for (const action of ['clearReview', 'clearSavedSpreadsheetReview', 'removeSourceDocument', 'loadSampleReview'] as const) {
    for (const outcome of ['success', 'failure']) {
      const pending = deferred<ExtractResponse>();
      const service = operation === 'preview' ? vi.mocked(getDocumentExtraction) : vi.mocked(extractDocument);
      service.mockReturnValueOnce(pending.promise);
      const p = options(); const { result, unmount } = renderHook(() => useDraftReview(p));
      let work!: Promise<void>;
      act(() => { work = operation === 'preview' ? result.current.actions.previewDocument(document) : result.current.actions.extractDocuments([document]); });
      act(() => action === 'removeSourceDocument' ? result.current.actions.removeSourceDocument(document.id) : result.current.actions[action]());
      const snapshot = result.current.state;
      vi.mocked(p.feedback.error).mockClear(); vi.mocked(p.feedback.success).mockClear();
      await act(async () => { outcome === 'success' ? pending.resolve(response('source')) : pending.reject(new Error('old')); await work; });
      expect(result.current.state).toEqual(snapshot);
      expect(result.current.state.extractingId).toBeNull();
      expect(p.feedback.error).not.toHaveBeenCalled(); expect(p.feedback.success).not.toHaveBeenCalled();
      unmount();
    }
  }
});

it('stale imported-key loading cannot overwrite B keys', async () => {
  const a = deferred<Awaited<ReturnType<typeof getAllActivityData>>>();
  const b = deferred<Awaited<ReturnType<typeof getAllActivityData>>>();
  vi.mocked(getAllActivityData).mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
  const { result } = renderHook(() => useDraftReview(options()));
  await act(() => result.current.actions.previewDocument(document));
  await act(() => result.current.actions.previewDocument(other));
  await act(async () => b.resolve([{ id: 'record-B', sourceDocumentId: 'B', sourceRow: 2 }] as any));
  const keysB = result.current.state.importedRecordKeys;
  expect(keysB[0]).toContain('B');
  await act(async () => a.resolve([{ id: 'record-A', sourceDocumentId: 'source', sourceRow: 2 }] as any));
  expect(result.current.state.importedRecordKeys).toEqual(keysB);
});

it('saved review replacement and clear reject pending saved-row application', async () => {
  const { result } = renderHook(() => useDraftReview(options()));
  let a!: ReturnType<typeof result.current.actions.loadSavedSpreadsheetReview>;
  let b!: ReturnType<typeof result.current.actions.loadSavedSpreadsheetReview>;
  act(() => { a = result.current.actions.loadSavedSpreadsheetReview([savedRow()], document); });
  act(() => { b = result.current.actions.loadSavedSpreadsheetReview([savedRow({ quantity: 20 })], other); });
  await act(async () => { await b; await a; });
  expect(result.current.state.previewDocumentId).toBe('B');
  expect(result.current.state.parsedActivities[0].quantity.value).toBe(20);
  act(() => { a = result.current.actions.loadSavedSpreadsheetReview([savedRow()], document); result.current.actions.clearReview(); });
  await act(async () => { await a; });
  expect(result.current.state.parsedActivities).toEqual([]);
});

it.each(['success', 'failure'] as const)('unmount prevents late preview %s feedback and side effects', async (outcome) => {
  const pending = deferred<ExtractResponse>(); vi.mocked(getDocumentExtraction).mockReturnValueOnce(pending.promise);
  const p = options(); const { result, unmount } = renderHook(() => useDraftReview(p));
  let work!: Promise<void>;
  act(() => { work = result.current.actions.previewDocument(document); });
  unmount(); vi.mocked(p.feedback.error).mockClear(); vi.mocked(p.feedback.success).mockClear();
  await act(async () => { outcome === 'success' ? pending.resolve(response('source')) : pending.reject(new Error('old')); await work; });
  expect(p.feedback.error).not.toHaveBeenCalled(); expect(p.feedback.success).not.toHaveBeenCalled();
  expect(p.collection.updateDocumentStatuses).not.toHaveBeenCalled();
});

it.each(['preview', 'extract'] as const)('late %s success cannot mix A metadata into B rows', async (operation) => {
  const a = deferred<ExtractResponse>(); const b = deferred<ExtractResponse>();
  const service = operation === 'preview' ? vi.mocked(getDocumentExtraction) : vi.mocked(extractDocument);
  service.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
  const { result } = renderHook(() => useDraftReview(options()));
  let wa!: Promise<void>; let wb!: Promise<void>;
  act(() => { wa = operation === 'preview' ? result.current.actions.previewDocument(document) : result.current.actions.extractDocuments([document]); });
  act(() => { wb = operation === 'preview' ? result.current.actions.previewDocument(other) : result.current.actions.extractDocuments([other]); });
  await act(async () => { b.resolve(response('B')); await wb; });
  await act(async () => { a.resolve(response('source')); await wa; });
  expect(result.current.state.previewDocumentIds).toEqual(['B']);
  expect(result.current.state.parsedActivities[0].documentId).toBe('B');
  expect(result.current.state.detectedSourceItems).toMatchObject([{ id: 'B-fee', documentId: 'B' }]);
});

it('clear invalidates row evaluation and late confirmation success/failure', async () => {
  for (const outcome of ['success', 'failure']) {
    const p = options(); const { result, unmount } = renderHook(() => useDraftReview(p));
    await act(() => result.current.actions.previewDocument(document));
    const pending = deferred<Awaited<ReturnType<typeof confirmDocumentImport>>>();
    vi.mocked(confirmDocumentImport).mockReturnValueOnce(pending.promise);
    let work!: Promise<void>;
    act(() => { work = result.current.actions.handleConfirmImport(); });
    await waitFor(() => expect(result.current.state.confirmingId).toBe('source'));
    act(() => result.current.actions.clearReview());
    vi.mocked(p.feedback.error).mockClear(); vi.mocked(p.feedback.success).mockClear();
    await act(async () => { outcome === 'success' ? pending.resolve({ count: 1, createdIds: ['already-created'] }) : pending.reject(new Error('old')); await work; });
    expect(result.current.state.parsedActivities).toEqual([]);
    expect(result.current.state.confirmingId).toBeNull();
    expect(p.feedback.error).not.toHaveBeenCalled(); expect(p.feedback.success).not.toHaveBeenCalled();
    expect(p.events.onImportCompleted).not.toHaveBeenCalled();
    if (outcome === 'success') expect(calculateMetrics).toHaveBeenCalledWith(['already-created']);
    unmount();
  }
  const { result } = await saved(); const pending = deferred<typeof factors>();
  vi.mocked(getAllConversionFactors).mockReturnValueOnce(pending.promise);
  act(() => result.current.actions.updateParsedActivityField(0, 'quantity', '10'));
  act(() => result.current.actions.clearReview());
  await act(async () => pending.resolve(factors));
  expect(result.current.state.parsedActivities).toEqual([]);
});

it('preserves partial confirmation 3 → 1 → 0 and tracked Water 18 m3', async () => {
  const rows = [water, { ...water, sourceRow: 3, quantity: 20 }, { ...water, sourceRow: 4, activityType: 'GASOLINE', quantity: 100, unit: '', jurisdictionCountry: 'Canada', jurisdictionRegion: 'Alberta' }];
  vi.mocked(getDocumentExtraction).mockResolvedValue(extraction('source', rows));
  vi.mocked(getAllConversionFactors).mockResolvedValue(factors);
  vi.mocked(confirmDocumentImport).mockResolvedValueOnce({ count: 2, createdIds: ['water-1', 'water-2'] }).mockResolvedValueOnce({ count: 1, createdIds: ['gasoline'] });
  const p = options();
  const spreadsheet = { ...document, fileName: 'partial.csv', type: 'SPREADSHEET' };
  p.documents = [spreadsheet];
  const { result } = renderHook(() => useDraftReview(p));
  await act(() => result.current.actions.previewDocument(spreadsheet));
  expect(result.current.state.parsedActivities).toHaveLength(3);
  expect(result.current.state.parsedActivities[0].quantity.value).toBe(18);
  await act(() => result.current.actions.handleConfirmImport());
  expect(result.current.state.parsedActivities).toHaveLength(1);
  expect(result.current.state.parsedActivities[0].sourceRow).toBe(4);
  vi.mocked(getAllActivityData).mockResolvedValue(rows.map((row, index) => ({ id: String(index), sourceDocumentId: 'source', sourceRow: row.sourceRow })) as any);
  await act(async () => result.current.actions.updateParsedActivityField(0, 'unit', 'L'));
  expect(result.current.summary.canConfirmImport).toBe(true);
  await act(() => result.current.actions.handleConfirmImport());
  expect(result.current.state.parsedActivities).toHaveLength(0);
  expect(confirmDocumentImport).toHaveBeenCalledTimes(2);
  expect(p.events.onImportCompleted).toHaveBeenLastCalledWith(expect.objectContaining({ rowsLeftForReview: 0, importedCount: 1 }));
});
