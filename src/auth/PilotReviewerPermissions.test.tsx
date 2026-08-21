import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminRoute } from './AdminRoute';
import { AuthProvider } from './AuthProvider';
import {
  canClearActivityRecords,
  canImportActivityRecords,
  canManageActivityRecords,
  canManageConversionFactors,
  getCurrentUser,
  isAdminUser,
  isReadOnlyUser,
  login,
  type AuthUser,
} from '../services/auth';
import {
  bulkDeleteActivityData,
  clearActivityRecordsForCurrentCompany,
  createActivityData,
  deleteActivityData,
  getActivityDataList,
  resetDemoDataForCurrentCompany,
  updateActivityData,
} from '../services/activityData';
import {
  confirmDocumentImport,
  extractDocument,
} from '../services/documentExtraction';
import { deleteDocument, uploadDocument } from '../services/documents';
import {
  createConversionFactor,
  deleteConversionFactor,
  getConversionFactors,
  updateConversionFactor,
} from '../services/conversionFactors';
import {
  createPilotReviewer,
  deactivatePilotReviewer,
} from '../services/pilotReviewers';
import { loadMetricsOverview } from '../services/metricsOverview';
import { submitFeedback } from '../services/feedback';
import { FALLBACK_API_BASE_URL } from '../config/api';

const PILOT_REVIEWER: AuthUser = {
  id: 'reviewer-1',
  email: 'reviewer@example.com',
  role: 'REVIEWER',
  accountType: 'PILOT_REVIEWER',
  organizationId: 'sample-workspace',
  organizationName: 'CarbonLite Sample Workspace',
};

const PERMISSION_ERROR = 'You do not have permission to perform this action.';

function setPilotReviewerSession(user: AuthUser = PILOT_REVIEWER) {
  localStorage.setItem('accessToken', 'pilot-reviewer-token');
  localStorage.setItem('currentUser', JSON.stringify(user));
}

function sampleActivityInput() {
  return {
    activityType: 'ELECTRICITY',
    recordDate: '2026-07-20',
    quantity: 100,
    unit: 'kWh',
    jurisdictionCountry: 'Canada',
    jurisdictionRegion: 'British Columbia',
    sourceType: 'MANUAL',
  };
}

function sampleFactorInput() {
  return {
    name: 'Custom electricity factor',
    type: 'EMISSION',
    activityType: 'ELECTRICITY',
    inputUnit: 'kWh',
    unit: 'kWh',
    factorValue: 0.02,
    resultUnit: 'kgCO2e',
    sourceYear: 2025,
    sourceAuthority: 'Pilot reviewer test',
  };
}

describe('Pilot Reviewer permission regressions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('denies all admin and mutation capabilities for pilot reviewer accounts', () => {
    const reviewer = {
      ...PILOT_REVIEWER,
      role: 'ADMIN',
    } satisfies AuthUser;

    const deniedCapabilities = {
      accessAdminPages: isAdminUser(reviewer),
      uploadFiles: canImportActivityRecords(reviewer),
      importSpreadsheets: canImportActivityRecords(reviewer),
      manuallyAddRecords: canManageActivityRecords(reviewer),
      editRecords: canManageActivityRecords(reviewer),
      deleteRecords: canManageActivityRecords(reviewer),
      resetSampleData: canClearActivityRecords(reviewer),
      createFactors: canManageConversionFactors(reviewer),
      editFactors: canManageConversionFactors(reviewer),
      deleteFactors: canManageConversionFactors(reviewer),
      importFactorLibrary: canManageConversionFactors(reviewer),
      manageUsers: isAdminUser(reviewer),
    };

    expect(deniedCapabilities).toEqual({
      accessAdminPages: false,
      uploadFiles: false,
      importSpreadsheets: false,
      manuallyAddRecords: false,
      editRecords: false,
      deleteRecords: false,
      resetSampleData: false,
      createFactors: false,
      editFactors: false,
      deleteFactors: false,
      importFactorLibrary: false,
      manageUsers: false,
    });
    expect(isReadOnlyUser(reviewer)).toBe(true);
  });

  it('blocks pilot reviewer access to admin pages', () => {
    setPilotReviewerSession();

    render(
      <MemoryRouter>
        <AuthProvider>
          <AdminRoute>
            <div>Admin-only user management</div>
          </AdminRoute>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByText('Admin-only user management')).not.toBeInTheDocument();
  });

  it('blocks upload, import, record mutation, reset, factor mutation, and user management service calls before fetch', async () => {
    setPilotReviewerSession();
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const file = new File(['date,type,quantity'], 'sample.csv', { type: 'text/csv' });

    const rejectedActions = [
      uploadDocument({ file, type: 'SPREADSHEET' }),
      extractDocument('document-1'),
      confirmDocumentImport('document-1', []),
      createActivityData(sampleActivityInput()),
      updateActivityData('activity-1', sampleActivityInput()),
      deleteActivityData('activity-1'),
      bulkDeleteActivityData(['activity-1']),
      clearActivityRecordsForCurrentCompany(),
      resetDemoDataForCurrentCompany(),
      deleteDocument('document-1'),
      createConversionFactor(sampleFactorInput()),
      updateConversionFactor('factor-1', sampleFactorInput()),
      deleteConversionFactor('factor-1'),
    ];

    await Promise.all(
      rejectedActions.map((action) => expect(action).rejects.toThrow(PERMISSION_ERROR)),
    );
    expect(() =>
      createPilotReviewer({
        name: 'Reviewer Two',
        email: 'reviewer2@example.com',
        workspaceName: 'CarbonLite Sample Workspace',
      }),
    ).toThrow(PERMISSION_ERROR);
    expect(() => deactivatePilotReviewer('reviewer2@example.com')).toThrow(PERMISSION_ERROR);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('allows pilot reviewer login and read-only data, factor, calculation review, report-data, and feedback paths', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith('/auth/login')) {
        return new Response(
          JSON.stringify({
            accessToken: 'pilot-reviewer-token',
            user: PILOT_REVIEWER,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.includes('/activity-data')) {
        return new Response(
          JSON.stringify({
            items: [
              {
                id: 'activity-1',
                organizationId: 'sample-workspace',
                activityType: 'ELECTRICITY',
                recordDate: '2026-07-20',
                quantity: 100,
                unit: 'kWh',
                sourceType: 'IMPORT',
                createdAt: '2026-07-20T00:00:00.000Z',
                updatedAt: '2026-07-20T00:00:00.000Z',
              },
              {
                id: 'activity-other-org',
                organizationId: 'other-workspace',
                activityType: 'DIESEL',
                recordDate: '2026-07-20',
                quantity: 100,
                unit: 'liters',
                sourceType: 'IMPORT',
                createdAt: '2026-07-20T00:00:00.000Z',
                updatedAt: '2026-07-20T00:00:00.000Z',
              },
            ],
            page: 1,
            pageSize: 100,
            total: 2,
            totalPages: 1,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.includes('/conversion-factors')) {
        return new Response(
          JSON.stringify({
            items: [
              {
                id: 'system-factor',
                organizationId: null,
                name: 'Electricity - British Columbia',
                type: 'EMISSION',
                activityType: 'ELECTRICITY',
                unit: 'kWh',
                inputUnit: 'kWh',
                factorValue: 0.02,
                resultUnit: 'kgCO2e',
                isDefault: true,
                isSystemDefault: true,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
              },
              {
                id: 'company-factor',
                organizationId: 'sample-workspace',
                name: 'Company custom factor',
                type: 'EMISSION',
                activityType: 'DIESEL',
                unit: 'liters',
                inputUnit: 'liters',
                factorValue: 2.68,
                resultUnit: 'kgCO2e',
                isDefault: false,
                isSystemDefault: false,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
              },
              {
                id: 'other-company-factor',
                organizationId: 'other-workspace',
                name: 'Other company factor',
                type: 'EMISSION',
                activityType: 'DIESEL',
                unit: 'liters',
                inputUnit: 'liters',
                factorValue: 9.99,
                resultUnit: 'kgCO2e',
                isDefault: false,
                isSystemDefault: false,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
              },
            ],
            page: 1,
            pageSize: 100,
            total: 3,
            totalPages: 1,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.includes('/metrics/summary')) {
        return new Response(
          JSON.stringify({
            totalEstimatedEmissionsKgCO2e: 37285,
            totalsByMetric: [],
            activities: [],
            calculationDetails: [],
            matchedActivityEmissions: [],
            conversionFactorsUsed: [],
            totalRecordsFound: 10,
            recordsCalculated: 9,
            skippedRecords: 1,
            skippedReasons: {},
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.endsWith('/feedback')) {
        return new Response(
          JSON.stringify({
            id: 'feedback-1',
            type: 'OTHER',
            intent: 'Pilot review',
            message: 'Helpful review note',
            status: 'NEW',
            createdAt: '2026-08-20T00:00:00.000Z',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response('not found', { status: 404 });
    });

    await expect(
      login({ email: 'reviewer@example.com', password: 'Password123!' }),
    ).resolves.toMatchObject({ accessToken: 'pilot-reviewer-token' });
    expect(getCurrentUser()).toMatchObject({
      email: 'reviewer@example.com',
      accountType: 'PILOT_REVIEWER',
    });

    const dataRecords = await getActivityDataList();
    expect(dataRecords.items).toHaveLength(1);
    expect(dataRecords.items[0].id).toBe('activity-1');

    const factors = await getConversionFactors();
    expect(factors.items.map((item) => item.id)).toEqual(
      expect.arrayContaining(['system-factor', 'company-factor']),
    );
    expect(factors.items.map((item) => item.id)).not.toContain('other-company-factor');

    await expect(loadMetricsOverview()).resolves.toMatchObject({
      totalEstimatedEmissionsKgCO2e: 37285,
      totalRecordsFound: 10,
      processedRecords: 9,
    });

    await expect(
      submitFeedback({
        type: 'OTHER',
        intent: 'Pilot review',
        message: 'Helpful review note',
        page: '/reports',
        workspaceName: 'CarbonLite Sample Workspace',
        accountType: 'PILOT_REVIEWER',
      }),
    ).resolves.toMatchObject({
      id: 'feedback-1',
      status: 'NEW',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${FALLBACK_API_BASE_URL}/auth/login`,
      expect.objectContaining({ method: 'POST' }),
    );
    const requestedUrls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(requestedUrls).toEqual(
      expect.arrayContaining([
        expect.stringContaining('/activity-data'),
        expect.stringContaining('/conversion-factors'),
        expect.stringContaining('/metrics/summary'),
      ]),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${FALLBACK_API_BASE_URL}/feedback`,
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
