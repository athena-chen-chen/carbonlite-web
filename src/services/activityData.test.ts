import { FALLBACK_API_BASE_URL } from '../config/api';
import {
  bulkDeleteActivityData,
  deleteActivityData,
  getAllActivityData,
  getActivityDataList,
} from './activityData';

describe('getActivityDataList', () => {
  it('clamps pageSize to backend maximum of 100', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [],
          page: 1,
          pageSize: 100,
          total: 0,
          totalPages: 1,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    await getActivityDataList({ page: 1, pageSize: 1000 });

    expect(fetchMock).toHaveBeenCalledWith(
      `${FALLBACK_API_BASE_URL}/activity-data?page=1&pageSize=100`,
      expect.any(Object),
    );
  });

  it('loads every Activity Data page in batches of 100', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [{ id: 'activity-1' }],
            page: 1,
            pageSize: 100,
            total: 2,
            totalPages: 2,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [{ id: 'activity-2' }],
            page: 2,
            pageSize: 100,
            total: 2,
            totalPages: 2,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

    const items = await getAllActivityData();

    expect(items.map((item) => item.id)).toEqual(['activity-1', 'activity-2']);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `${FALLBACK_API_BASE_URL}/activity-data?page=1&pageSize=100`,
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${FALLBACK_API_BASE_URL}/activity-data?page=2&pageSize=100`,
      expect.any(Object),
    );
  });
});

describe('deleteActivityData', () => {
  it('calls DELETE /activity-data/:id with Authorization header', async () => {
    localStorage.setItem('accessToken', 'activity-token');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ deletedCount: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(deleteActivityData('activity-1')).resolves.toEqual({
      deletedCount: 1,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${FALLBACK_API_BASE_URL}/activity-data/activity-1`,
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({
          Authorization: 'Bearer activity-token',
        }),
      }),
    );
  });

  it('shows ownership-friendly error for another organization record', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('forbidden', { status: 403 }),
    );

    await expect(deleteActivityData('other-org-record')).rejects.toThrow(
      'You can only delete your own activity records.',
    );
  });

  it('accepts deletedCount when backend confirms a persisted delete', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ deletedCount: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(deleteActivityData('activity-1')).resolves.toEqual({
      deletedCount: 1,
    });
  });

  it('rejects when backend reports that zero records were deleted', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ deletedCount: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(deleteActivityData('missing-record')).rejects.toThrow(
      'Activity record was not deleted. Please refresh and try again.',
    );
  });
});

describe('bulkDeleteActivityData', () => {
  it('calls POST /activity-data/bulk-delete and requires persisted delete count', async () => {
    localStorage.setItem('accessToken', 'activity-token');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ deletedCount: 2 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(
      bulkDeleteActivityData(['activity-1', 'activity-2']),
    ).resolves.toEqual({ deletedCount: 2 });

    expect(fetchMock).toHaveBeenCalledWith(
      `${FALLBACK_API_BASE_URL}/activity-data/bulk-delete`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ ids: ['activity-1', 'activity-2'] }),
        headers: expect.objectContaining({
          Authorization: 'Bearer activity-token',
        }),
      }),
    );
  });

  it('rejects when bulk delete reports zero deleted records', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ deletedCount: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(bulkDeleteActivityData(['activity-1'])).rejects.toThrow(
      'Activity records were not deleted. Please refresh and try again.',
    );
  });
});
