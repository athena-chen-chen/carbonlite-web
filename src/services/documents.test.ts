import { FALLBACK_API_BASE_URL } from '../config/api';
import { deleteDocument } from './documents';

describe('deleteDocument', () => {
  it('deletes the current user document with an authenticated request', async () => {
    localStorage.setItem('accessToken', 'owner-token');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 204 }),
    );

    await deleteDocument('doc-1');

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

  it('shows an ownership-friendly error when another organization document is rejected', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('forbidden', { status: 403 }),
    );

    await expect(deleteDocument('other-org-doc')).rejects.toThrow(
      'You can only delete your own uploaded documents.',
    );
  });

  it('does not delete imported activity data when deleting a document', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 204 }),
    );

    await deleteDocument('imported-doc');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      `${FALLBACK_API_BASE_URL}/documents/imported-doc`,
    );
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).includes('/activity-data')),
    ).toBe(false);
  });
});
