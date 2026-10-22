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

const FACTOR_ERROR = 'Conversion factors could not be loaded. Please try again.';
const IMPORTED_ERROR = 'Imported records could not be checked. Please retry the review before importing.';
const trackedRow = (rowId = 'water-1', sourceRow = 2) => savedRow({ rowId, sourceRow, status: 'TRACKED_ONLY', activityType: 'WATER', quantity: 18, unit: 'm3' });

it('factor failure is not cached or classified as missing; a new edit retries without remount', async () => {
  const { result, p } = await saved();
  vi.mocked(getAllConversionFactors).mockRejectedValueOnce(new Error('temporary outage')).mockResolvedValueOnce(factors);
  await act(async () => result.current.actions.updateParsedActivityField(0, 'quantity', '10'));
  expect(p.feedback.error).toHaveBeenLastCalledWith(FACTOR_ERROR);
  expect(result.current.state.parsedActivities[0].matchingStatus).not.toBe('MISSING_FACTOR');
  expect(result.current.state.parsedActivities[0].calculationStatus).not.toBe('MISSING_FACTOR');
  await act(async () => result.current.actions.updateParsedActivityField(0, 'quantity', '20'));
  expect(getAllConversionFactors).toHaveBeenCalledTimes(2);
  expect(result.current.state.parsedActivities[0]).toMatchObject({ quantity: { value: 20 }, matchingStatus: 'MATCHED', calculationStatus: 'CALCULATED', calculatedEmissionsKgCO2e: 46.2 });
  expect(p.feedback.error).toHaveBeenLastCalledWith(null);
});

it('successful empty factor results keep the existing cache policy and do not become transport errors', async () => {
  const { result, p } = await saved();
  vi.mocked(getAllConversionFactors).mockResolvedValue([]);
  await act(async () => result.current.actions.updateParsedActivityField(0, 'quantity', '10'));
  await act(async () => result.current.actions.updateParsedActivityField(0, 'quantity', '20'));
  expect(getAllConversionFactors).toHaveBeenCalledTimes(1);
  expect(result.current.state.parsedActivities[0].quantity.value).toBe(20);
  expect(p.feedback.error).not.toHaveBeenCalledWith(FACTOR_ERROR);
});

it('a late same-row factor failure cannot publish an error or poison the newer successful cache', async () => {
  const { result, p } = await saved(); const a = deferred<typeof factors>(); const b = deferred<typeof factors>();
  vi.mocked(getAllConversionFactors).mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
  act(() => result.current.actions.updateParsedActivityField(0, 'quantity', '10'));
  act(() => result.current.actions.updateParsedActivityField(0, 'quantity', '20'));
  await act(async () => b.resolve(factors));
  vi.mocked(p.feedback.error).mockClear();
  await act(async () => a.reject(new Error('old outage')));
  expect(p.feedback.error).not.toHaveBeenCalled();
  expect(result.current.state.parsedActivities[0].calculatedEmissionsKgCO2e).toBe(46.2);
  await act(async () => result.current.actions.updateParsedActivityField(0, 'quantity', '30'));
  expect(result.current.state.parsedActivities[0].calculatedEmissionsKgCO2e).toBe(69.3);
  expect(getAllConversionFactors).toHaveBeenCalledTimes(2);
});

it.each(['preview', 'extract'] as const)('%s factor failures recover on retry without treating the source as failed', async (operation) => {
  const p = options(); const { result } = renderHook(() => useDraftReview(p));
  vi.mocked(getAllConversionFactors).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(factors);
  const extracted = extraction('source', [{ ...water, activityType: 'GASOLINE', quantity: 350, unit: 'L', jurisdictionCountry: 'Canada', jurisdictionRegion: 'Alberta' }]);
  vi.mocked(getDocumentExtraction).mockResolvedValue(extracted); vi.mocked(extractDocument).mockResolvedValue(extracted);
  const run = () => operation === 'preview' ? result.current.actions.previewDocument(document) : result.current.actions.extractDocuments([document]);
  await act(run);
  expect(result.current.state.extractingId).toBeNull();
  expect(p.feedback.error).toHaveBeenLastCalledWith(FACTOR_ERROR);
  expect(p.collection.updateDocumentStatuses).not.toHaveBeenCalledWith(expect.anything(), 'EXTRACTION_FAILED');
  await act(run);
  expect(getAllConversionFactors).toHaveBeenCalledTimes(2);
  expect(result.current.state.parsedActivities[0]).toMatchObject({ calculationStatus: 'CALCULATED', calculatedEmissionsKgCO2e: 808.5, scope: 'SCOPE_1' });
  expect(result.current.summary.canConfirmImport).toBe(true);
});

it('Bulk Province recovers after failed factor retrieval via a later row evaluation', async () => {
  const { result, p } = await saved([savedRow({ activityType: 'ELECTRICITY', quantity: 100, unit: 'kWh', jurisdictionRegion: '' })]);
  vi.mocked(getAllConversionFactors).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(factors);
  act(() => result.current.actions.setBulkProvince('Alberta'));
  await act(() => result.current.actions.applyBulkProvinceToMissingRows());
  expect(p.feedback.error).toHaveBeenLastCalledWith(FACTOR_ERROR);
  expect(result.current.state.parsedActivities[0].matchingStatus).not.toBe('MISSING_FACTOR');
  await act(async () => result.current.actions.updateParsedActivityField(0, 'quantity', '200'));
  expect(getAllConversionFactors).toHaveBeenCalledTimes(2);
  expect(result.current.state.parsedActivities[0]).toMatchObject({ jurisdictionRegion: { value: 'Alberta' }, matchingStatus: 'MATCHED', calculatedEmissionsKgCO2e: 106 });
});

it('an obsolete Bulk Province factor failure does not overwrite a newer BC evaluation', async () => {
  const { result, p } = await saved([savedRow({ activityType: 'ELECTRICITY', quantity: 100, unit: 'kWh', jurisdictionRegion: '' })]);
  const a = deferred<typeof factors>(); const b = deferred<typeof factors>();
  vi.mocked(getAllConversionFactors).mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
  act(() => result.current.actions.setBulkProvince('Alberta'));
  let bulk!: Promise<void>;
  act(() => { bulk = result.current.actions.applyBulkProvinceToMissingRows(); });
  act(() => result.current.actions.updateParsedActivityField(0, 'jurisdictionRegion', 'BC'));
  await act(async () => b.resolve(factors));
  vi.mocked(p.feedback.error).mockClear();
  await act(async () => { a.reject(new Error('old bulk outage')); await bulk; });
  expect(p.feedback.error).not.toHaveBeenCalled();
  expect(result.current.state.parsedActivities[0]).toMatchObject({ jurisdictionRegion: { value: 'British Columbia' }, calculatedEmissionsKgCO2e: 2 });
});

it('initial imported-key failure is unavailable, blocks selection/confirm, and never writes', async () => {
  vi.mocked(getAllActivityData).mockRejectedValue(new Error('offline'));
  const { result, p } = await saved([trackedRow()]);
  expect(result.current.state.importedKeysStatus).toBe('unavailable');
  expect(p.feedback.error).toHaveBeenLastCalledWith(IMPORTED_ERROR);
  expect(result.current.summary.canConfirmImport).toBe(false);
  expect(result.current.summary.importableParsedActivities).toEqual([]);
  act(() => result.current.actions.selectAllParsedActivities());
  expect(result.current.state.parsedActivities[0].selected).toBe(false);
  await act(() => result.current.actions.handleConfirmImport());
  expect(confirmDocumentImport).not.toHaveBeenCalled();
});

it('imported-key retry recognizes A/B as imported without remount', async () => {
  vi.mocked(getAllActivityData).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([
    { id: 'A', sourceDocumentId: 'source', sourceRow: 2 }, { id: 'B', sourceDocumentId: 'source', sourceRow: 3 },
  ] as any);
  const { result } = await saved([trackedRow(), trackedRow('water-2', 3)]);
  expect(result.current.state.importedKeysStatus).toBe('unavailable');
  await act(() => result.current.actions.previewDocument(document));
  expect(getAllActivityData).toHaveBeenCalledTimes(2);
  expect(result.current.state.importedKeysStatus).toBe('ready');
  expect(result.current.state.importedRecordKeys).toHaveLength(2);
  expect(result.current.summary.alreadyImportedParsedActivitiesCount).toBe(2);
  expect(result.current.summary.canConfirmImport).toBe(false);
  await act(() => result.current.actions.handleConfirmImport());
  expect(confirmDocumentImport).not.toHaveBeenCalled();
});

it('a failed refresh preserves previously known imported keys and badges', async () => {
  vi.mocked(getAllActivityData).mockResolvedValueOnce([{ id: 'A', sourceDocumentId: 'source', sourceRow: 2 }] as any).mockRejectedValueOnce(new Error('offline'));
  const { result } = await saved([trackedRow()]);
  const known = result.current.state.importedRecordKeys;
  expect(known).toHaveLength(1);
  await act(() => result.current.actions.previewDocument(document));
  expect(result.current.state.importedKeysStatus).toBe('unavailable');
  expect(result.current.state.importedRecordKeys).toEqual(known);
  expect(result.current.summary.alreadyImportedParsedActivitiesCount).toBe(1);
  expect(result.current.summary.canConfirmImport).toBe(false);
});

it('successful empty imported keys are known-empty and allow tracked-only import', async () => {
  const { result, p } = await saved([trackedRow()]);
  expect(result.current.state.importedKeysStatus).toBe('ready');
  expect(result.current.state.importedRecordKeys).toEqual([]);
  expect(result.current.summary.canConfirmImport).toBe(true);
  expect(p.feedback.error).not.toHaveBeenCalledWith(IMPORTED_ERROR);
  await act(() => result.current.actions.handleConfirmImport());
  expect(confirmDocumentImport).toHaveBeenCalledTimes(1);
});

it('confirm can retry an unavailable imported-key lookup and safely import after recovery', async () => {
  vi.mocked(getAllActivityData).mockRejectedValueOnce(new Error('offline')).mockResolvedValue([]);
  const { result } = await saved([trackedRow()]);
  expect(result.current.summary.canConfirmImport).toBe(false);
  await act(() => result.current.actions.handleConfirmImport());
  expect(getAllActivityData).toHaveBeenCalledTimes(3); // first attempt, retry, remaining rows
  expect(confirmDocumentImport).toHaveBeenCalledTimes(1);
  expect(result.current.state.parsedActivities).toEqual([]);
});

it('late imported-key failure from A cannot replace B keys or publish an error', async () => {
  const a = deferred<Awaited<ReturnType<typeof getAllActivityData>>>(); const b = deferred<Awaited<ReturnType<typeof getAllActivityData>>>();
  vi.mocked(getAllActivityData).mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
  const p = options(); const { result } = renderHook(() => useDraftReview(p));
  await act(() => result.current.actions.loadSavedSpreadsheetReview([trackedRow()], document));
  const other = { ...document, id: 'B' };
  await act(() => result.current.actions.loadSavedSpreadsheetReview([trackedRow()], other));
  await act(async () => b.resolve([{ id: 'existing-B', sourceDocumentId: 'B', sourceRow: 2 }] as any));
  const keys = result.current.state.importedRecordKeys;
  vi.mocked(p.feedback.error).mockClear();
  await act(async () => a.reject(new Error('old outage')));
  expect(result.current.state.importedKeysStatus).toBe('ready');
  expect(result.current.state.importedRecordKeys).toEqual(keys);
  expect(result.current.summary.alreadyImportedParsedActivitiesCount).toBe(1);
  expect(p.feedback.error).not.toHaveBeenCalled();
});

it('failed imported-key reload after confirm keeps known keys and marks remaining review unavailable', async () => {
  vi.mocked(getAllActivityData).mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('reload failed'));
  const { result, p } = await saved([trackedRow(), savedRow({ rowId: 'blocked', sourceRow: 3, unit: '' })]);
  await act(() => result.current.actions.handleConfirmImport());
  expect(result.current.state.parsedActivities).toHaveLength(1);
  expect(result.current.state.importedKeysStatus).toBe('unavailable');
  expect(result.current.state.importedRecordKeys).toContain(buildDocumentImportRecordKey({ sourceDocumentId: 'source', sourceRow: 2 }));
  expect(result.current.summary.canConfirmImport).toBe(false);
  expect(p.feedback.error).toHaveBeenCalledWith(IMPORTED_ERROR);
});

it('a stale initial imported-key failure cannot undo a successful same-review confirm lookup', async () => {
  const initial = deferred<Awaited<ReturnType<typeof getAllActivityData>>>();
  vi.mocked(getAllActivityData).mockReturnValueOnce(initial.promise).mockResolvedValueOnce([{ id: 'known', sourceDocumentId: 'source', sourceRow: 2 }] as any);
  const { result, p } = await saved([trackedRow()]);
  expect(result.current.state.importedKeysStatus).toBe('unknown');
  await act(() => result.current.actions.handleConfirmImport());
  expect(result.current.state.importedKeysStatus).toBe('ready');
  vi.mocked(p.feedback.error).mockClear();
  await act(async () => initial.reject(new Error('old initial lookup')));
  expect(result.current.state.importedKeysStatus).toBe('ready');
  expect(result.current.summary.alreadyImportedParsedActivitiesCount).toBe(1);
  expect(p.feedback.error).not.toHaveBeenCalled();
  expect(confirmDocumentImport).not.toHaveBeenCalled();
});

it('clear rejects late row-factor failures without publishing errors', async () => {
  const { result, p } = await saved(); const pending = deferred<typeof factors>();
  vi.mocked(getAllConversionFactors).mockReturnValueOnce(pending.promise);
  act(() => result.current.actions.updateParsedActivityField(0, 'quantity', '20'));
  act(() => result.current.actions.clearReview());
  vi.mocked(p.feedback.error).mockClear();
  await act(async () => pending.reject(new Error('old factor lookup')));
  expect(p.feedback.error).not.toHaveBeenCalled();
  expect(result.current.state.parsedActivities).toEqual([]);
});

it('extraction completion does not hide an imported-key lookup failure', async () => {
  vi.mocked(getAllActivityData).mockRejectedValueOnce(new Error('offline'));
  const p = options(); const { result } = renderHook(() => useDraftReview(p));
  await act(() => result.current.actions.extractDocuments([document]));
  expect(result.current.state.importedKeysStatus).toBe('unavailable');
  expect(result.current.state.extractingId).toBeNull();
  expect(result.current.summary.canConfirmImport).toBe(false);
  expect(p.feedback.error).toHaveBeenLastCalledWith(IMPORTED_ERROR);
  expect(p.feedback.success).toHaveBeenLastCalledWith(null);
});

it('factor failure during confirm preflight is controlled and can recover on a later attempt', async () => {
  vi.mocked(getAllConversionFactors).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(factors);
  const { result, p } = await saved([trackedRow()]);
  await act(() => result.current.actions.handleConfirmImport());
  expect(p.feedback.error).toHaveBeenLastCalledWith(FACTOR_ERROR);
  expect(confirmDocumentImport).not.toHaveBeenCalled();
  expect(result.current.state.confirmingId).toBeNull();
  await act(() => result.current.actions.handleConfirmImport());
  expect(confirmDocumentImport).toHaveBeenCalledTimes(1);
  expect(getAllConversionFactors).toHaveBeenCalledTimes(2);
});
