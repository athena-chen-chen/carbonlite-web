import { FALLBACK_API_BASE_URL } from '../config/api';
import {
  bulkDeleteActivityData,
  clearActivityRecordsForCurrentCompany,
  createActivityData,
  deleteActivityData,
  getAllActivityData,
  getActivityDataList,
  resetDemoDataForCurrentCompany,
  updateActivityData,
} from './activityData';

describe('createActivityData', () => {
  it('blocks viewer users from importing activity records', async () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({ email: 'viewer@example.com', role: 'VIEWER', organizationId: 'org-1' }),
    );
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(
      createActivityData({
        activityType: 'DIESEL',
        recordDate: '2026-05-29',
        quantity: 10,
        unit: 'L',
        sourceType: 'MANUAL',
      }),
    ).rejects.toThrow('You do not have permission to perform this action.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('allows member users to import activity records', async () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({ email: 'member@example.com', role: 'MEMBER', organizationId: 'org-1' }),
    );
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'activity-1', activityType: 'DIESEL' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(
      createActivityData({
        activityType: 'DIESEL',
        recordDate: '2026-05-29',
        quantity: 10,
        unit: 'L',
        sourceType: 'MANUAL',
      }),
    ).resolves.toMatchObject({ id: 'activity-1' });
    expect(fetchMock).toHaveBeenCalled();
  });

  it('sends estimated date metadata for fallback dates', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'activity-1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await createActivityData({
      activityType: 'WATER',
      recordDate: '2026-05-29',
      quantity: 10,
      unit: 'm3',
      sourceType: 'AI_EXTRACTION',
      sourceDocumentId: 'doc-1',
      sourceFileName: 'water.pdf',
      dateEstimated: true,
    });

    const requestBody = JSON.parse(
      String((fetchMock.mock.calls[0][1] as RequestInit).body),
    );
    expect(requestBody).toMatchObject({
      recordDate: '2026-05-29',
      sourceDocumentId: 'doc-1',
      sourceFileName: 'water.pdf',
      dateEstimated: true,
    });
  });

  it('sends canonical calculation fields when saving matched electricity records', async () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({ email: 'member@example.com', role: 'MEMBER', organizationId: 'org-1' }),
    );
    const savedRecord = {
      id: 'activity-electricity-bc',
      activityType: 'ELECTRICITY',
      matchingStatus: 'MATCHED',
      calculationStatus: 'CALCULATED',
      reportTreatment: 'INCLUDED',
      scope: 'SCOPE_2',
      matchedFactorId: 'factor-electricity-bc-2025',
      matchedFactorName: 'Electricity - British Columbia - 2025',
      matchedFactorSourceYear: 2025,
      matchedFactorValue: 0.02,
      matchedFactorUnit: 'kgCO2e/kWh',
      matchedFactorVersion: 'v1.0',
      matchedFactorSourceAuthority: 'CarbonLite',
      matchedFactorSourceDocument: 'CarbonLite MVP Default Factors v1.0',
      matchedFactorVerificationStatus: 'INTERNAL_REVIEW_REQUIRED',
      matchedFactorConfidenceLevel: 'LOW',
      matchedFactorAssumptions: 'Pilot default electricity factor.',
      calculatedEmissionsKgCO2e: 2,
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(savedRecord), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(
      createActivityData({
        activityType: 'ELECTRICITY',
        recordDate: '2026-07-20',
        quantity: 100,
        unit: 'kWh',
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'British Columbia',
        sourceType: 'MANUAL',
        matchingStatus: 'MATCHED',
        calculationStatus: 'CALCULATED',
        reportTreatment: 'INCLUDED',
        scope: 'SCOPE_2',
        matchedFactorId: 'factor-electricity-bc-2025',
        matchedFactorName: 'Electricity - British Columbia - 2025',
        matchedFactorSourceYear: 2025,
        matchedFactorValue: 0.02,
        matchedFactorUnit: 'kgCO2e/kWh',
        matchedFactorVersion: 'v1.0',
        matchedFactorSourceAuthority: 'CarbonLite',
        matchedFactorSourceDocument: 'CarbonLite MVP Default Factors v1.0',
        matchedFactorVerificationStatus: 'INTERNAL_REVIEW_REQUIRED',
        matchedFactorConfidenceLevel: 'LOW',
        matchedFactorAssumptions: 'Pilot default electricity factor.',
        calculatedEmissionsKgCO2e: 2,
        calculationMessage: 'Matched factor. Using latest available factor year: 2025.',
      }),
    ).resolves.toMatchObject(savedRecord);

    const requestBody = JSON.parse(
      String((fetchMock.mock.calls[0][1] as RequestInit).body),
    );
    expect(requestBody).toMatchObject({
      activityType: 'ELECTRICITY',
      recordDate: '2026-07-20',
      jurisdictionRegion: 'British Columbia',
      matchingStatus: 'MATCHED',
      calculationStatus: 'CALCULATED',
      reportTreatment: 'INCLUDED',
      scope: 'SCOPE_2',
      matchedFactorId: 'factor-electricity-bc-2025',
      matchedFactorName: 'Electricity - British Columbia - 2025',
      matchedFactorSourceYear: 2025,
      matchedFactorValue: 0.02,
      matchedFactorUnit: 'kgCO2e/kWh',
      matchedFactorVersion: 'v1.0',
      matchedFactorSourceAuthority: 'CarbonLite',
      matchedFactorSourceDocument: 'CarbonLite MVP Default Factors v1.0',
      matchedFactorVerificationStatus: 'INTERNAL_REVIEW_REQUIRED',
      matchedFactorConfidenceLevel: 'LOW',
      matchedFactorAssumptions: 'Pilot default electricity factor.',
      calculatedEmissionsKgCO2e: 2,
      calculationMessage: 'Matched factor. Using latest available factor year: 2025.',
    });
  });

  it('saves manual-entry selected dates as date-only payload values', async () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({ email: 'member@example.com', role: 'MEMBER', organizationId: 'org-1' }),
    );
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'activity-date', recordDate: '2026-07-20T00:00:00.000Z' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await createActivityData({
      activityType: 'ELECTRICITY',
      recordDate: '2026-07-20T06:00:00.000Z',
      quantity: 100,
      unit: 'kWh',
      jurisdictionCountry: 'Canada',
      jurisdictionRegion: 'Alberta',
      sourceType: 'MANUAL',
    });

    const requestBody = JSON.parse(
      String((fetchMock.mock.calls[0][1] as RequestInit).body),
    );
    expect(requestBody.recordDate).toBe('2026-07-20');
  });

  it('preserves edited activity record dates as date-only payload values', async () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({ email: 'member@example.com', role: 'MEMBER', organizationId: 'org-1' }),
    );
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'activity-date', recordDate: '2026-01-15T00:00:00.000Z' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await updateActivityData('activity-date', {
      activityType: 'DIESEL',
      recordDate: '2026-01-15T00:00:00.000Z',
      quantity: 10,
      unit: 'L',
      sourceType: 'MANUAL',
    });

    const requestBody = JSON.parse(
      String((fetchMock.mock.calls[0][1] as RequestInit).body),
    );
    expect(requestBody.recordDate).toBe('2026-01-15');
  });
});

describe('getActivityDataList', () => {
  it('filters returned activity records to the current organization', async () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({ email: 'member@example.com', role: 'MEMBER', organizationId: 'org-a' }),
    );
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [
            { id: 'activity-a', organizationId: 'org-a' },
            { id: 'activity-b', organizationId: 'org-b' },
          ],
          page: 1,
          pageSize: 100,
          total: 2,
          totalPages: 1,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    await expect(getActivityDataList()).resolves.toMatchObject({
      items: [{ id: 'activity-a', organizationId: 'org-a' }],
      total: 1,
    });
  });

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
      'You do not have permission to perform this action.',
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

describe('clearActivityRecordsForCurrentCompany', () => {
  it('blocks viewer users before calling the clear endpoint', async () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({ email: 'viewer@example.com', role: 'VIEWER', organizationId: 'org-1' }),
    );
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(clearActivityRecordsForCurrentCompany()).rejects.toThrow(
      'You do not have permission to perform this action.',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('calls DELETE /admin/activity-records/clear with confirmation and Authorization header', async () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({ email: 'admin@example.com', role: 'ADMIN', organizationId: 'org-1' }),
    );
    localStorage.setItem('accessToken', 'admin-token');
    const summary = {
      deletedActivityRecords: 4,
      deletedCalculationDetails: 4,
      deletedImportBatches: 1,
      resetReports: 2,
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(summary), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(clearActivityRecordsForCurrentCompany()).resolves.toEqual(summary);

    expect(fetchMock).toHaveBeenCalledWith(
      `${FALLBACK_API_BASE_URL}/admin/activity-records/clear`,
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ confirmation: 'CLEAR RECORDS' }),
        headers: expect.objectContaining({
          Authorization: 'Bearer admin-token',
        }),
      }),
    );
  });

  it('shows login-friendly error when unauthenticated', async () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({ email: 'admin@example.com', role: 'ADMIN', organizationId: 'org-1' }),
    );
    window.history.pushState({}, '', '/login');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('unauthorized', { status: 401 }),
    );

    await expect(clearActivityRecordsForCurrentCompany()).rejects.toThrow(
      'Please log in again before clearing activity records.',
    );
  });

  it('shows role-friendly error when user is not admin or owner', async () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({ email: 'admin@example.com', role: 'ADMIN', organizationId: 'org-1' }),
    );
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('forbidden', { status: 403 }),
    );

    await expect(clearActivityRecordsForCurrentCompany()).rejects.toThrow(
      'Only admins and owners can clear activity records.',
    );
  });

  it('shows a user-friendly error when clear endpoint fails', async () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({ email: 'admin@example.com', role: 'ADMIN', organizationId: 'org-1' }),
    );
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('server failed', { status: 500 }),
    );

    await expect(clearActivityRecordsForCurrentCompany()).rejects.toThrow(
      'Unable to clear activity records. Please try again.',
    );
  });
});

describe('resetDemoDataForCurrentCompany', () => {
  it('blocks viewer users before calling the reset endpoint', async () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({ email: 'viewer@example.com', role: 'VIEWER', organizationId: 'org-1' }),
    );
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(resetDemoDataForCurrentCompany()).rejects.toThrow(
      'You do not have permission to perform this action.',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('calls POST /admin/demo-data/reset with confirmation and Authorization header', async () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({ email: 'admin@example.com', role: 'ADMIN', organizationId: 'org-1' }),
    );
    localStorage.setItem('accessToken', 'admin-token');
    const summary = {
      activityRecordsDeleted: 4,
      importBatchesDeleted: 1,
      uploadedDocumentsDeleted: 2,
      stagedRowsDeleted: 6,
      metricsCacheCleared: 4,
      resetReports: 1,
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(summary), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(resetDemoDataForCurrentCompany()).resolves.toEqual(summary);

    expect(fetchMock).toHaveBeenCalledWith(
      `${FALLBACK_API_BASE_URL}/admin/demo-data/reset`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ confirmation: 'RESET DEMO DATA' }),
        headers: expect.objectContaining({
          Authorization: 'Bearer admin-token',
        }),
      }),
    );
  });

  it('shows role-friendly error when user is not admin or owner', async () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({ email: 'admin@example.com', role: 'ADMIN', organizationId: 'org-1' }),
    );
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('forbidden', { status: 403 }),
    );

    await expect(resetDemoDataForCurrentCompany()).rejects.toThrow(
      'Only admins and owners can reset demo data.',
    );
  });
});
