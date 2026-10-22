import { getDocuments, type DocumentItem, type DocumentListResponse } from './documents';

const documents = Array.from({ length: 25 }, (_, i): DocumentItem => ({
  id: `doc-${i + 1}`, organizationId: 'org-A', fileName: 'same-name.pdf', fileUrl: '', type: 'PDF',
  status: 'IMPORTED', importedRecordCount: 1, createdAt: new Date(Date.UTC(2026, 0, 25 - i)).toISOString(), updatedAt: '',
}));
function page(items: DocumentItem[], pageNumber: number, total = 25): DocumentListResponse {
  return { items, page: pageNumber, pageSize: 20, total, totalPages: Math.ceil(total / 20) };
}
function respond(value: DocumentListResponse) { return new Response(JSON.stringify(value), { status: 200 }); }
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => { resolve = yes; });
  return { promise, resolve };
}
beforeEach(() => {
  localStorage.setItem('currentUser', JSON.stringify({ organizationId: 'org-A' }));
});

it('loads all 25 documents across the default 20-item server boundary, preserving total and order', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(respond(page(documents.slice(0, 20), 1))).mockResolvedValueOnce(respond(page(documents.slice(20), 2)));
  await expect(getDocuments()).resolves.toEqual({ items: documents, total: 25 });
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(String(fetch.mock.calls[0][0])).toMatch(/\/documents$/);
  expect(String(fetch.mock.calls[1][0])).toMatch(/\/documents\?page=2&pageSize=20$/);
});

it('deduplicates overlapping page boundaries by ID while retaining distinct documents with identical names', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(respond(page(documents.slice(0, 20), 1))).mockResolvedValueOnce(respond(page(documents.slice(19), 2)));
  const result = await getDocuments();
  expect(result.items).toEqual(documents);
  expect(result.total).toBe(25);
});

it('follows a growing collection beyond the original last page', async () => {
  const all = Array.from({ length: 41 }, (_, i) => ({ ...documents[0], id: `growing-${i}` }));
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(respond(page(all.slice(0, 20), 1, 25)))
    .mockResolvedValueOnce(respond(page(all.slice(20, 40), 2, 41))).mockResolvedValueOnce(respond(page(all.slice(40), 3, 41)));
  expect(await getDocuments()).toEqual({ items: all, total: 41 });
  expect(fetch).toHaveBeenCalledTimes(3);
});

it('accepts a shrinking collection when the complete returned IDs match the latest authoritative total', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(respond(page(documents.slice(0, 20), 1)))
    .mockResolvedValueOnce(respond(page(documents.slice(20, 24), 2, 24)));
  expect(await getDocuments()).toEqual({ items: documents.slice(0, 24), total: 24 });
});

it('rejects a later-page failure and retries the whole collection without caching a partial result', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(respond(page(documents.slice(0, 20), 1)))
    .mockRejectedValueOnce(new Error('page 2 offline'))
    .mockResolvedValueOnce(respond(page(documents.slice(0, 20), 1))).mockResolvedValueOnce(respond(page(documents.slice(20), 2)));
  await expect(getDocuments()).rejects.toThrow();
  expect(await getDocuments()).toEqual({ items: documents, total: 25 });
  expect(fetch).toHaveBeenCalledTimes(4);
});

it.each([
  { ...page(documents.slice(20), 2), page: 1 },
  { ...page(documents.slice(20), 2), totalPages: 1 },
  { ...page(documents.slice(20), 2), pageSize: 0 },
  page([], 2),
  page(documents.slice(0, 20), 2),
])('rejects repeated, inconsistent, or incomplete pages rather than claiming a complete collection: %#', async (badPage) => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(respond(page(documents.slice(0, 20), 1))).mockResolvedValueOnce(respond(badPage));
  await expect(getDocuments()).rejects.toThrow(/pagination|collection|page/i);
});

it('does not accept a late page after the authenticated workspace changes', async () => {
  const pending = deferred<Response>();
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(respond(page(documents.slice(0, 20), 1))).mockReturnValueOnce(pending.promise);
  const request = getDocuments();
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  localStorage.setItem('currentUser', JSON.stringify({ organizationId: 'org-B' }));
  pending.resolve(respond(page(documents.slice(20), 2)));
  await expect(request).rejects.toThrow('workspace changed');
});

it('accepts a successful zero-document response with backend totalPages=0', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(respond(page([], 1, 0)));
  expect(await getDocuments()).toEqual({ items: [], total: 0 });
});
