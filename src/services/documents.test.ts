import { FALLBACK_API_BASE_URL } from '../config/api';
import { deleteDocument } from './documents';

describe('deleteDocument', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('deletes the current user document with an authenticated request', async () => {
    localStorage.setItem('accessToken', 'owner-token');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        deletedDocument: true,
        deletedActivityRecords: 3,
      }), { status: 200 }),
    );

    await expect(deleteDocument('doc-1')).resolves.toEqual({
      deletedDocument: true,
      deletedActivityRecords: 3,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${FALLBACK_API_BASE_URL}/documents/doc-1`,
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({
          Authorization: 'Bearer owner-token',
        }),
      }),
    );
  });

  it('keeps old 204 delete responses working with zero related activity records', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 204 }),
    );

    await expect(deleteDocument('doc-without-activity')).resolves.toEqual({
      deletedDocument: true,
      deletedActivityRecords: 0,
    });
  });

  it('shows an ownership-friendly error when another organization document is rejected', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('forbidden', { status: 403 }),
    );

    await expect(deleteDocument('other-org-doc')).rejects.toThrow(
      'You can only delete your own uploaded documents.',
    );
  });

  it('uses the document delete endpoint for backend cascade deletion', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        deletedDocument: true,
        deletedActivityRecords: 2,
      }), { status: 200 }),
    );

    await expect(deleteDocument('imported-doc')).resolves.toEqual({
      deletedDocument: true,
      deletedActivityRecords: 2,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      `${FALLBACK_API_BASE_URL}/documents/imported-doc`,
    );
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).includes('/activity-data')),
    ).toBe(false);
  });
});
