import { act, renderHook, waitFor } from '@testing-library/react';
import { useDraftReview } from './useDraftReview';
import { confirmDocumentImport, extractDocument, getDocumentExtraction, type ExtractResponse, type ParsedActivity } from '../../../services/documentExtraction';
import { getAllActivityData } from '../../../services/activityData';
import { getAllConversionFactors } from '../../../services/conversionFactors';
import { calculateMetrics } from '../../../services/metrics';
import { buildDocumentImportRecordKey } from '../domain/importIdentity';
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

it('previews backend rows, retains tracked metric eligibility and uses the local cache on later previews', async () => {
  const p = options();
  const { result } = renderHook(() => useDraftReview(p));
  await act(() => result.current.actions.previewDocument(document));
  expect(result.current.state.previewDocumentId).toBe('source');
  expect(result.current.state.parsedActivities[0].quantity.value).toBe(18);
  expect(result.current.state.parsedActivities[0].selected).toBe(true);
  expect(result.current.summary.trackedImportableCount).toBe(1);
  expect(result.current.summary.canConfirmImport).toBe(true);
  await act(() => result.current.actions.previewDocument(document));
  expect(getDocumentExtraction).toHaveBeenCalledTimes(1);
  expect(result.current.state.parsedActivities).toHaveLength(1);
});

it('retains backend refresh for spreadsheet/current Save All previews', async () => {
  const { result } = renderHook(() => useDraftReview({ ...options(), shouldRefreshDocument: () => true }));
  await act(() => result.current.actions.previewDocument(document));
  await act(() => result.current.actions.previewDocument(document));
  expect(getDocumentExtraction).toHaveBeenCalledTimes(2);
});

it.each(['preview', 'extract'] as const)('guards stale %s responses so request A cannot replace newer request B', async (operation) => {
  let finishA!: (data: ExtractResponse) => void;
  let finishB!: (data: ExtractResponse) => void;
  const service = operation === 'preview' ? vi.mocked(getDocumentExtraction) : vi.mocked(extractDocument);
  service.mockReturnValueOnce(new Promise(resolve => { finishA = resolve; })).mockReturnValueOnce(new Promise(resolve => { finishB = resolve; }));
  const other = { ...document, id: 'newer', fileName: 'newer.pdf' };
  const { result } = renderHook(() => useDraftReview({ ...options(), documents: [document, other] }));
  let a!: Promise<void>;
  let b!: Promise<void>;
  act(() => { a = operation === 'preview' ? result.current.actions.previewDocument(document) : result.current.actions.extractDocuments([document]); });
  act(() => { b = operation === 'preview' ? result.current.actions.previewDocument(other) : result.current.actions.extractDocuments([other]); });
  await act(async () => { finishB(extraction('newer', [{ ...water, quantity: 25 }])); await b; });
  await act(async () => { finishA(extraction('source')); await a; });
  expect(result.current.state.previewDocumentId).toBe('newer');
  expect(result.current.state.parsedActivities[0].documentId).toBe('newer');
  expect(result.current.state.parsedActivities[0].quantity.value).toBe(25);
});

it('keeps detected source evidence outside the activity rows', async () => {
  vi.mocked(getDocumentExtraction).mockResolvedValue({ ...extraction(), detectedSourceItems: [{ id: 'fee', type: 'UTILITY_FEE', reason: 'No supported quantity' }] });
  const { result } = renderHook(() => useDraftReview(options()));
  await act(() => result.current.actions.previewDocument(document));
  expect(result.current.state.parsedActivities).toHaveLength(1);
  expect(result.current.state.detectedSourceItems).toMatchObject([{ id: 'fee', type: 'UTILITY_FEE', documentId: 'source' }]);
});

it('keeps imported row identities and prevents selecting an already imported row', async () => {
  const key = buildDocumentImportRecordKey({ sourceDocumentId: 'source', sourceRow: 2 });
  vi.mocked(getAllActivityData).mockResolvedValue([{ id: 'existing', sourceDocumentId: 'source', sourceRow: 2 }] as Awaited<ReturnType<typeof getAllActivityData>>);
  const { result } = renderHook(() => useDraftReview(options()));
  await act(() => result.current.actions.previewDocument(document));
  await waitFor(() => expect(result.current.state.importedRecordKeys).toContain(key));
  act(() => result.current.actions.selectAllParsedActivities());
  expect(result.current.state.parsedActivities[0].selected).toBe(false);
  expect(result.current.summary.canConfirmImport).toBe(false);
  expect(result.current.validation.isParsedActivityAlreadyImported(result.current.state.parsedActivities[0])).toBe(true);
});

it('edits fields, enforces validation, selects importable rows, and adds/deletes rows', async () => {
  const { result } = renderHook(() => useDraftReview(options()));
  await act(() => result.current.actions.previewDocument(document));
  act(() => result.current.actions.clearAllParsedActivities());
  expect(result.current.state.parsedActivities[0].selected).toBe(false);
  act(() => result.current.actions.toggleParsedActivitySelected(0, true));
  expect(result.current.state.parsedActivities[0].selected).toBe(true);
  act(() => result.current.actions.updateParsedActivityField(0, 'unit', ''));
  expect(result.current.state.parsedActivities[0].selected).toBe(false);
  expect(result.current.validation.importValidationIssues).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'unit' })]));
  act(() => result.current.actions.selectAllParsedActivities());
  expect(result.current.state.parsedActivities[0].selected).toBe(false);
  act(() => result.current.actions.addParsedActivity());
  expect(result.current.state.parsedActivities).toHaveLength(2);
  act(() => result.current.actions.updateParsedActivityField(1, 'facilityName', 'Calgary HQ'));
  expect(result.current.state.parsedActivities[1].facilityName.value).toBe('Calgary HQ');
  act(() => result.current.actions.removeParsedActivity(1));
  expect(result.current.state.parsedActivities).toHaveLength(1);
});

it('re-evaluates Missing Province rows canonically after applying Alberta and reuses the factor cache', async () => {
  const electricity = { ...water, activityType: 'ELECTRICITY', quantity: 980, unit: 'kWh', jurisdictionCountry: 'Canada', jurisdictionRegion: '' };
  vi.mocked(getDocumentExtraction).mockResolvedValue(extraction('source', [electricity]));
  vi.mocked(getAllConversionFactors).mockResolvedValue([{
    id: 'electricity-ab', name: 'Electricity Alberta', type: 'EMISSION', activityType: 'ELECTRICITY',
    inputUnit: 'kWh', unit: 'kWh', factorValue: 0.53, resultUnit: 'kgCO2e',
    jurisdictionCountry: 'Canada', jurisdictionRegion: 'Alberta', sourceYear: 2026,
    effectiveYear: 2026, defaultScope: 'SCOPE_2', isDefault: true, isSystemDefault: true,
    createdAt: '2026-01-01', updatedAt: '2026-01-01',
  }]);
  const { result } = renderHook(() => useDraftReview(options()));
  await act(() => result.current.actions.previewDocument(document));
  expect(result.current.validation.missingProvinceRowIndexes).toEqual([0]);
  expect(result.current.summary.canConfirmImport).toBe(false);
  act(() => result.current.actions.setBulkProvince('Alberta'));
  await act(() => result.current.actions.applyBulkProvinceToMissingRows());
  expect(result.current.validation.missingProvinceRowIndexes).toEqual([]);
  expect(result.current.state.parsedActivities[0]).toMatchObject({ selected: true, calculatedEmissionsKgCO2e: 519.4 });
  expect(result.current.summary.canConfirmImport).toBe(true);
  expect(getAllConversionFactors).toHaveBeenCalledTimes(1);
  expect(getAllConversionFactors).toHaveBeenCalledWith({ type: 'EMISSION' });
});

it('confirms only importable tracked rows, keeps unresolved rows, and prevents an unchanged repeat import', async () => {
  const unresolved = { ...water, sourceRow: 3, activityType: 'NATURAL_GAS', unit: '' };
  vi.mocked(getDocumentExtraction).mockResolvedValue(extraction('source', [water, unresolved]));
  const p = options();
  const { result } = renderHook(() => useDraftReview(p));
  await act(() => result.current.actions.previewDocument(document));
  await act(() => result.current.actions.handleConfirmImport());
  expect(confirmDocumentImport).toHaveBeenCalledTimes(1);
  expect(vi.mocked(confirmDocumentImport).mock.calls[0][1]).toHaveLength(1);
  expect(vi.mocked(confirmDocumentImport).mock.calls[0][1][0]).toMatchObject({ activityType: 'WATER', quantity: 18, reportTreatment: 'TRACKED_ONLY' });
  expect(calculateMetrics).toHaveBeenCalledWith(['water-created']);
  expect(result.current.state.parsedActivities).toHaveLength(1);
  expect(result.current.state.parsedActivities[0].sourceRow).toBe(3);
  expect(result.current.state.parsedActivities[0].selected).toBe(false);
  expect(result.current.summary.canConfirmImport).toBe(false);
  await act(() => result.current.actions.handleConfirmImport());
  expect(confirmDocumentImport).toHaveBeenCalledTimes(1);
  expect(p.events.onImportCompleted).toHaveBeenCalledWith(expect.objectContaining({ importedCount: 1, trackedMetricCount: 1, rowsLeftForReview: 1 }));
});

it('clears review state and explicitly removes deleted source review rows', async () => {
  const { result } = renderHook(() => useDraftReview(options()));
  await act(() => result.current.actions.previewDocument(document));
  act(() => result.current.actions.removeSourceDocument('source'));
  expect(result.current.state.parsedActivities).toEqual([]);
  expect(result.current.state.previewDocumentId).toBeNull();
  await act(() => result.current.actions.previewDocument(document));
  act(() => { result.current.actions.setBulkProvince('Alberta'); result.current.actions.clearReview(); });
  expect(result.current.state).toMatchObject({ parsedActivities: [], detectedSourceItems: [], importedRecordKeys: [], bulkProvince: '', previewDocumentId: null, previewDocumentIds: [] });
});
