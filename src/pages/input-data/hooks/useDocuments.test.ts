import { act, renderHook } from '@testing-library/react';
import { useDocuments } from './useDocuments';
import { deleteDocument, getDocuments } from '../../../services/documents';

vi.mock('../../../services/documents', () => ({ getDocuments: vi.fn(), deleteDocument: vi.fn() }));

const document = { id: 'doc', fileName: 'bill.pdf', fileUrl: '', type: 'PDF', status: 'UPLOADED', createdAt: '2026-01-01', updatedAt: '2026-01-01' };
const response = { items: [document], page: 1, pageSize: 20, total: 1, totalPages: 1 };

beforeEach(() => { vi.mocked(getDocuments).mockReset(); vi.mocked(deleteDocument).mockReset(); });

it('loads documents and preserves the loading and shared feedback lifecycle', async () => {
  let finish!: (data: typeof response) => void;
  vi.mocked(getDocuments).mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const onError = vi.fn();
  const { result } = renderHook(() => useDocuments({ skipLoad: false, onError }));
  expect(result.current.items).toEqual([]);
  let pending!: Promise<void>;
  act(() => { pending = result.current.loadDocuments(); });
  expect(result.current.loading).toBe(true);
  expect(onError).toHaveBeenCalledWith(null);
  await act(async () => { finish(response); await pending; });
  expect(result.current.items).toEqual([document]);
  expect(result.current.loading).toBe(false);
  expect(getDocuments).toHaveBeenCalledWith();
});

it('refreshes without taking over the caller loading/error lifecycle and updates local statuses', async () => {
  vi.mocked(getDocuments).mockResolvedValue(response);
  const onError = vi.fn();
  const { result } = renderHook(() => useDocuments({ skipLoad: false, onError }));
  await act(async () => { expect(await result.current.refresh()).toEqual([document]); });
  expect(result.current.loading).toBe(false);
  expect(onError).not.toHaveBeenCalled();
  act(() => result.current.updateDocumentStatuses(['doc'], 'REVIEW_REQUIRED'));
  expect(result.current.items[0].status).toBe('REVIEW_REQUIRED');
  act(() => result.current.updateDocumentStatuses(['unrelated'], 'IMPORTED'));
  expect(result.current.items[0].status).toBe('REVIEW_REQUIRED');
});

it('preserves the current list and reports through the page callback when a load fails', async () => {
  const onError = vi.fn();
  const { result } = renderHook(() => useDocuments({ skipLoad: false, onError }));
  act(() => result.current.replace([document]));
  vi.mocked(getDocuments).mockRejectedValue(new Error('offline'));
  await act(() => result.current.loadDocuments());
  expect(result.current.items).toEqual([document]);
  expect(result.current.loading).toBe(false);
  expect(onError).toHaveBeenCalledWith(expect.any(String));
});

it('skips fetching for route-requested sample loading', async () => {
  const { result } = renderHook(() => useDocuments({ skipLoad: true, onError: vi.fn() }));
  await act(() => result.current.loadDocuments());
  expect(getDocuments).not.toHaveBeenCalled();
  expect(result.current.loading).toBe(false);
});

it('removes only successfully deleted source documents and exposes reset', async () => {
  vi.mocked(deleteDocument).mockResolvedValue({ deletedDocument: true, deletedActivityRecords: 0 });
  const { result } = renderHook(() => useDocuments({ skipLoad: false, onError: vi.fn() }));
  act(() => result.current.replace([document, { ...document, id: 'other' }]));
  vi.mocked(deleteDocument).mockRejectedValueOnce(new Error('offline'));
  await act(async () => { await expect(result.current.deleteSourceDocument('doc')).rejects.toThrow('offline'); });
  expect(result.current.items).toHaveLength(2);
  await act(() => result.current.deleteSourceDocument('doc'));
  expect(deleteDocument).toHaveBeenLastCalledWith('doc');
  expect(result.current.items.map(item => item.id)).toEqual(['other']);
  act(() => result.current.reset());
  expect(result.current.items).toEqual([]);
});

it('keeps a failed initial collection unavailable and supports retry without remount', async () => {
  vi.mocked(getDocuments).mockRejectedValueOnce(new Error('page 2 failed')).mockResolvedValueOnce({ items: [document], total: 1 });
  const { result } = renderHook(() => useDocuments({ skipLoad: false, onError: vi.fn() }));
  await act(() => result.current.loadDocuments());
  expect(result.current.hasLoaded).toBe(false);
  expect(result.current.error).toBeTruthy();
  await act(() => result.current.loadDocuments());
  expect(result.current.hasLoaded).toBe(true);
  expect(result.current.error).toBeNull();
  expect(result.current.total).toBe(1);
});

it('ignores an old workspace collection after a new workspace has loaded', async () => {
  const workspace = (organizationId: string) => localStorage.setItem('currentUser', JSON.stringify({ organizationId, role: 'ADMIN' }));
  workspace('A');
  let finish!: (value: { items: typeof document[]; total: number }) => void;
  vi.mocked(getDocuments).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const { result, rerender } = renderHook(() => useDocuments({ skipLoad: false, onError: vi.fn() }));
  let pending!: Promise<void>;
  act(() => { pending = result.current.loadDocuments(); });
  workspace('B');
  vi.mocked(getDocuments).mockResolvedValueOnce({ items: [{ ...document, id: 'B' }], total: 1 });
  await act(async () => { rerender(); });
  expect(result.current.items[0].id).toBe('B');
  await act(async () => { finish({ items: [document], total: 1 }); await pending; });
  expect(result.current.items.map(item => item.id)).toEqual(['B']);
});

it('retains later sources and total after delete, status update, and full refresh', async () => {
  const items = Array.from({ length: 25 }, (_, i) => ({ ...document, id: `doc-${i}` }));
  vi.mocked(getDocuments).mockResolvedValue({ items, total: 25 });
  vi.mocked(deleteDocument).mockResolvedValue({ deletedDocument: true, deletedActivityRecords: 0 });
  const { result } = renderHook(() => useDocuments({ skipLoad: false, onError: vi.fn() }));
  await act(() => result.current.loadDocuments());
  act(() => result.current.updateDocumentStatuses(['doc-24'], 'REVIEW_REQUIRED'));
  expect(result.current.total).toBe(25);
  await act(() => result.current.deleteSourceDocument('doc-24'));
  expect(result.current.total).toBe(24);
  expect(result.current.items).toHaveLength(24);
  expect(result.current.items.some(item => item.id === 'doc-23')).toBe(true);
  const updated = [{ ...document, id: 'new' }, ...items.slice(0, 24)];
  vi.mocked(getDocuments).mockResolvedValue({ items: updated, total: 25 });
  await act(() => result.current.refresh());
  expect(result.current.items).toEqual(updated);
  expect(result.current.total).toBe(25);
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const manyDocuments = Array.from({ length: 25 }, (_, i) => ({ ...document, id: `doc-${i + 1}` }));

it('keeps loading until the complete collection arrives and retains its authoritative total after deletion and refresh', async () => {
  const pending = deferred<typeof response>();
  vi.mocked(getDocuments).mockReturnValueOnce(pending.promise);
  const { result } = renderHook(() => useDocuments({ skipLoad: false, onError: vi.fn() }));
  let work!: Promise<void>;
  act(() => { work = result.current.loadDocuments(); });
  expect(result.current.loading).toBe(true);
  expect(result.current.hasLoaded).toBe(false);
  await act(async () => { pending.resolve({ ...response, items: manyDocuments, total: 25 }); await work; });
  expect(result.current.total).toBe(25);
  expect(result.current.items).toHaveLength(25);
  vi.mocked(deleteDocument).mockResolvedValue({ deletedDocument: true, deletedActivityRecords: 0 });
  await act(() => result.current.deleteSourceDocument('doc-25'));
  expect(result.current.items).toHaveLength(24);
  expect(result.current.total).toBe(24);
  const uploaded = { ...document, id: 'uploaded' };
  vi.mocked(getDocuments).mockResolvedValue({ ...response, items: [uploaded, ...manyDocuments.slice(0, 24)], total: 25 });
  await act(() => result.current.refresh());
  expect(result.current.items[0].id).toBe('uploaded');
  expect(result.current.items.at(-1)?.id).toBe('doc-24');
  expect(result.current.total).toBe(25);
});

it('a failed initial collection load is unavailable rather than a successful empty workspace and retry recovers', async () => {
  vi.mocked(getDocuments).mockRejectedValueOnce(new Error('page 2 failed')).mockResolvedValueOnce({ ...response, items: manyDocuments, total: 25 });
  const { result } = renderHook(() => useDocuments({ skipLoad: false, onError: vi.fn() }));
  await act(() => result.current.loadDocuments());
  expect(result.current.hasLoaded).toBe(false);
  expect(result.current.error).toBeTruthy();
  expect(result.current.loading).toBe(false);
  await act(() => result.current.loadDocuments());
  expect(result.current.hasLoaded).toBe(true);
  expect(result.current.error).toBeNull();
  expect(result.current.total).toBe(25);
});

it.each(['success', 'failure'] as const)('ignores late workspace A %s after B loads', async (outcome) => {
  localStorage.setItem('currentUser', JSON.stringify({ organizationId: 'A' }));
  const a = deferred<typeof response>();
  vi.mocked(getDocuments).mockReturnValueOnce(a.promise).mockResolvedValueOnce({ ...response, items: [{ ...document, id: 'B-only' }] });
  const onError = vi.fn();
  const { result, rerender } = renderHook(() => useDocuments({ skipLoad: false, onError }));
  let wa!: Promise<void>;
  act(() => { wa = result.current.loadDocuments(); });
  localStorage.setItem('currentUser', JSON.stringify({ organizationId: 'B' }));
  await act(async () => rerender());
  expect(result.current.items[0].id).toBe('B-only');
  onError.mockClear();
  await act(async () => { outcome === 'success' ? a.resolve(response) : a.reject(new Error('late A')); await wa; });
  expect(result.current.items.map((item) => item.id)).toEqual(['B-only']);
  expect(result.current.loading).toBe(false);
  expect(result.current.error).toBeNull();
  expect(onError).not.toHaveBeenCalled();
});

it('reset invalidates a pending load and an older completion cannot clear a newer spinner', async () => {
  const a = deferred<typeof response>(); const b = deferred<typeof response>();
  vi.mocked(getDocuments).mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
  const { result } = renderHook(() => useDocuments({ skipLoad: false, onError: vi.fn() }));
  let wa!: Promise<void>; let wb!: Promise<void>;
  act(() => { wa = result.current.loadDocuments(); result.current.reset(); wb = result.current.loadDocuments(); });
  await act(async () => { a.resolve(response); await wa; });
  expect(result.current.items).toEqual([]);
  expect(result.current.loading).toBe(true);
  await act(async () => { b.resolve(response); await wb; });
  expect(result.current.loading).toBe(false);
  expect(result.current.items).toEqual([document]);
});
