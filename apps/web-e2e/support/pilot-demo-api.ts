import type { Page, Route } from '@playwright/test';

const now = '2026-07-25T12:00:00.000Z';
const organizationId = 'pilot-smoke-org';
const documentId = 'pilot-golden-document';
const importBatchId = 'pilot-golden-import-batch';
const sourceFileName = 'pilot-golden-dataset.csv';

type PilotDocument = {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  importedAt?: string | null;
  importBatchId?: string | null;
};

type GoldenRecord = {
  activityType: string;
  label: string;
  recordDate: string;
  quantity: number;
  unit: string;
  country: string;
  province: string;
  scope: 'SCOPE_1' | 'SCOPE_2' | 'SCOPE_3' | 'TRACKED_METRIC';
  factorId: string | null;
  factorName: string;
  factorValue: number | null;
  factorInputUnit: string | null;
  factorResultUnit: string | null;
  sourceAuthority: string;
  sourceDocument: string;
  confidenceLevel: string;
  verificationStatus: string;
  calculatedEmissionsKgCO2e: number;
  normalizedQuantity?: number;
  normalizedUnit?: string;
  notes: string;
};

type PilotActivity = GoldenRecord & {
  id: string;
  organizationId: string;
  documentId: string;
  sourceDocumentId: string;
  sourceFileName: string;
  importBatchId: string;
  sourceType: string;
  sourceReference: string;
  jurisdictionCountry: string;
  jurisdictionRegion: string;
  matchingStatus: string;
  calculationStatus: string;
  reportTreatment: string;
  matchedFactorId?: string | null;
  matchedFactorName?: string | null;
  matchedFactorSourceYear?: number | null;
  matchedFactorValue?: number | null;
  matchedFactorUnit?: string | null;
  matchedFactorSourceAuthority?: string | null;
  matchedFactorSourceDocument?: string | null;
  matchedFactorVerificationStatus?: string | null;
  matchedFactorConfidenceLevel?: string | null;
  createdAt: string;
  updatedAt: string;
};

type PilotConversionFactor = {
  id: string;
  organizationId: string | null;
  name: string;
  type: string;
  activityType: string;
  jurisdiction: string;
  unit: string;
  factorValue: number;
  resultUnit: string;
  sourceName: string;
  sourceReference: string;
  sourceAuthority: string;
  sourceDocument: string;
  sourceYear: number;
  sourceUrl: string;
  methodology: string;
  confidenceLevel: string;
  verificationStatus: string;
  verified: boolean;
  notes: string;
  isDefault: boolean;
  isSystemDefault: boolean;
  defaultScope: string;
  createdAt: string;
  updatedAt: string;
};

export type PilotDemoApiState = {
  documents: PilotDocument[];
  activities: PilotActivity[];
  conversionFactors: PilotConversionFactor[];
  extractionResults: Record<string, unknown>;
  loginRequests: number;
  resetRequests: number;
  uploadRequests: number;
  extractionRequests: number;
  importRequests: number;
  metricCalculationRequests: number;
  summaryRequests: number;
  unexpectedRequests: string[];
};

type DemoCredentials = {
  email: string;
  password: string;
};

const goldenRecords: GoldenRecord[] = [
  {
    activityType: 'ELECTRICITY',
    label: 'Electricity',
    recordDate: '2026-07-20',
    quantity: 12500,
    unit: 'kWh',
    country: 'Canada',
    province: 'Alberta',
    scope: 'SCOPE_2',
    factorId: 'pilot-electricity-ab-2025',
    factorName: 'Electricity - Alberta - 2025',
    factorValue: 0.53,
    factorInputUnit: 'kWh',
    factorResultUnit: 'kgCO2e/kWh',
    sourceAuthority: 'CarbonLite',
    sourceDocument: 'CarbonLite Pilot Electricity Factors',
    confidenceLevel: 'Medium',
    verificationStatus: 'Internal Review Required',
    calculatedEmissionsKgCO2e: 6625,
    notes: 'Matched to CarbonLite System Factor.',
  },
  {
    activityType: 'ELECTRICITY',
    label: 'Electricity',
    recordDate: '2026-07-20',
    quantity: 100,
    unit: 'kWh',
    country: 'Canada',
    province: 'British Columbia',
    scope: 'SCOPE_2',
    factorId: 'pilot-electricity-bc-2025',
    factorName: 'Electricity - British Columbia - 2025',
    factorValue: 0.02,
    factorInputUnit: 'kWh',
    factorResultUnit: 'kgCO2e/kWh',
    sourceAuthority: 'CarbonLite',
    sourceDocument: 'CarbonLite Pilot Electricity Factors',
    confidenceLevel: 'Medium',
    verificationStatus: 'Internal Review Required',
    calculatedEmissionsKgCO2e: 2,
    notes: 'Matched to CarbonLite System Factor.',
  },
  {
    activityType: 'ELECTRICITY',
    label: 'Electricity',
    recordDate: '2026-07-20',
    quantity: 1000,
    unit: 'kWh',
    country: 'Canada',
    province: 'Ontario',
    scope: 'SCOPE_2',
    factorId: 'pilot-electricity-on-2025',
    factorName: 'Electricity - Ontario - 2025',
    factorValue: 0.12,
    factorInputUnit: 'kWh',
    factorResultUnit: 'kgCO2e/kWh',
    sourceAuthority: 'CarbonLite',
    sourceDocument: 'CarbonLite Pilot Electricity Factors',
    confidenceLevel: 'Medium',
    verificationStatus: 'Internal Review Required',
    calculatedEmissionsKgCO2e: 120,
    notes: 'Matched to CarbonLite System Factor.',
  },
  {
    activityType: 'NATURAL_GAS',
    label: 'Natural Gas',
    recordDate: '2026-07-20',
    quantity: 1000,
    unit: 'm3',
    country: 'Canada',
    province: '',
    scope: 'SCOPE_1',
    factorId: 'pilot-natural-gas-canada-2025',
    factorName: 'Natural Gas - Canada - 2025',
    factorValue: 1.89,
    factorInputUnit: 'm3',
    factorResultUnit: 'kgCO2e/m3',
    sourceAuthority: 'CarbonLite',
    sourceDocument: 'CarbonLite Pilot Fuel Factors',
    confidenceLevel: 'Medium',
    verificationStatus: 'Internal Review Required',
    calculatedEmissionsKgCO2e: 1890,
    notes: 'Matched to CarbonLite System Factor.',
  },
  {
    activityType: 'GASOLINE',
    label: 'Gasoline',
    recordDate: '2026-07-20',
    quantity: 500,
    unit: 'liters',
    country: 'Canada',
    province: '',
    scope: 'SCOPE_1',
    factorId: 'pilot-gasoline-canada-2025',
    factorName: 'Gasoline - Canada - 2025',
    factorValue: 2.31,
    factorInputUnit: 'liters',
    factorResultUnit: 'kgCO2e/liter',
    sourceAuthority: 'CarbonLite',
    sourceDocument: 'CarbonLite Pilot Fuel Factors',
    confidenceLevel: 'Medium',
    verificationStatus: 'Internal Review Required',
    calculatedEmissionsKgCO2e: 1155,
    notes: 'Matched to CarbonLite System Factor.',
  },
  {
    activityType: 'DIESEL',
    label: 'Diesel',
    recordDate: '2026-07-20',
    quantity: 100,
    unit: 'liters',
    country: 'Canada',
    province: '',
    scope: 'SCOPE_1',
    factorId: 'pilot-diesel-canada-2025',
    factorName: 'Diesel - Canada - 2025',
    factorValue: 2.68,
    factorInputUnit: 'liters',
    factorResultUnit: 'kgCO2e/liter',
    sourceAuthority: 'CarbonLite',
    sourceDocument: 'CarbonLite Pilot Fuel Factors',
    confidenceLevel: 'Medium',
    verificationStatus: 'Internal Review Required',
    calculatedEmissionsKgCO2e: 268,
    notes: 'Matched to CarbonLite System Factor.',
  },
  {
    activityType: 'AIR_TRAVEL',
    label: 'Air Travel',
    recordDate: '2026-07-20',
    quantity: 5000,
    unit: 'km',
    country: 'Canada',
    province: '',
    scope: 'SCOPE_3',
    factorId: 'pilot-air-travel-canada-2025',
    factorName: 'Air Travel - Canada - 2025',
    factorValue: 0.115,
    factorInputUnit: 'km',
    factorResultUnit: 'kgCO2e/km',
    sourceAuthority: 'CarbonLite',
    sourceDocument: 'CarbonLite Pilot Travel Factors',
    confidenceLevel: 'Low',
    verificationStatus: 'Consultant Review Recommended',
    calculatedEmissionsKgCO2e: 575,
    notes: 'Pilot-stage Scope 3 estimate. Consultant review recommended before formal reporting.',
  },
  {
    activityType: 'HOTEL',
    label: 'Hotel',
    recordDate: '2026-07-20',
    quantity: 10,
    unit: 'nights',
    country: 'Canada',
    province: '',
    scope: 'SCOPE_3',
    factorId: 'pilot-hotel-canada-2025',
    factorName: 'Hotel - Canada - 2025',
    factorValue: 15,
    factorInputUnit: 'nights',
    factorResultUnit: 'kgCO2e/night',
    sourceAuthority: 'CarbonLite',
    sourceDocument: 'CarbonLite Pilot Travel Factors',
    confidenceLevel: 'Low',
    verificationStatus: 'Consultant Review Recommended',
    calculatedEmissionsKgCO2e: 150,
    notes: 'Pilot-stage Scope 3 estimate. Consultant review recommended before formal reporting.',
  },
  {
    activityType: 'WATER',
    label: 'Water',
    recordDate: '2026-07-20',
    quantity: 100,
    unit: 'm3',
    country: 'Canada',
    province: '',
    scope: 'TRACKED_METRIC',
    factorId: null,
    factorName: 'Water usage tracked only',
    factorValue: null,
    factorInputUnit: null,
    factorResultUnit: null,
    sourceAuthority: 'Not applicable',
    sourceDocument: 'Tracked metric',
    confidenceLevel: 'Not applicable',
    verificationStatus: 'Tracked Only',
    calculatedEmissionsKgCO2e: 0,
    notes: 'Water usage is tracked only and excluded from GHG emissions totals.',
  },
  {
    activityType: 'ELECTRICITY',
    label: 'Electricity',
    recordDate: '2026-07-20',
    quantity: 50,
    unit: 'MWh',
    country: 'Canada',
    province: 'Alberta',
    scope: 'SCOPE_2',
    factorId: 'pilot-electricity-ab-2025',
    factorName: 'Electricity - Alberta - 2025',
    factorValue: 0.53,
    factorInputUnit: 'kWh',
    factorResultUnit: 'kgCO2e/kWh',
    sourceAuthority: 'CarbonLite',
    sourceDocument: 'CarbonLite Pilot Electricity Factors',
    confidenceLevel: 'Medium',
    verificationStatus: 'Internal Review Required',
    calculatedEmissionsKgCO2e: 26500,
    normalizedQuantity: 50000,
    normalizedUnit: 'kWh',
    notes: 'Matched to CarbonLite System Factor. Quantity normalized from MWh to kWh.',
  },
];

export function createPilotDemoApiState(): PilotDemoApiState {
  return {
    documents: [],
    activities: [],
    conversionFactors: buildConversionFactors(),
    extractionResults: {},
    loginRequests: 0,
    resetRequests: 0,
    uploadRequests: 0,
    extractionRequests: 0,
    importRequests: 0,
    metricCalculationRequests: 0,
    summaryRequests: 0,
    unexpectedRequests: [],
  };
}

export async function installPilotDemoApiMock(
  page: Page,
  state: PilotDemoApiState,
  credentials: DemoCredentials,
) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^.*\/api/, '');
    const method = request.method();

    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204 });
      return;
    }

    if (method === 'POST' && path === '/auth/login') {
      state.loginRequests += 1;
      const input = request.postDataJSON() as { email?: string; password?: string };
      if (input.email === credentials.email && input.password === credentials.password) {
        await fulfillJson(route, {
          accessToken: 'pilot-smoke-access-token',
          user: {
            id: 'pilot-smoke-user',
            email: credentials.email,
            role: 'ADMIN',
            organizationId,
            organizationName: 'CarbonLite Pilot Demo Workspace',
          },
        }, 201);
        return;
      }
      await fulfillJson(route, { message: 'Invalid credentials' }, 401);
      return;
    }

    if (method === 'POST' && path === '/auth/logout') {
      await fulfillJson(route, { ok: true });
      return;
    }

    if (method === 'GET' && path === '/documents') {
      await fulfillJson(route, paginated(state.documents));
      return;
    }

    if (method === 'POST' && path === '/admin/demo-data/reset') {
      state.resetRequests += 1;
      const activityRecordsDeleted = state.activities.length;
      const uploadedDocumentsDeleted = state.documents.length;
      const stagedRowsDeleted = Object.values(state.extractionResults).reduce(
        (total, extraction) => {
          const rows = (extraction as { parsedActivities?: unknown[] }).parsedActivities;
          return total + (Array.isArray(rows) ? rows.length : 0);
        },
        0,
      );
      const importBatchesDeleted = new Set(
        state.activities.map((activity) => activity.importBatchId).filter(Boolean),
      ).size;

      state.activities = [];
      state.documents = [];
      state.extractionResults = {};

      await fulfillJson(route, {
        activityRecordsDeleted,
        importBatchesDeleted,
        uploadedDocumentsDeleted,
        stagedRowsDeleted,
        metricsCacheCleared: activityRecordsDeleted,
        resetReports: 0,
      });
      return;
    }

    if (method === 'POST' && path === '/documents/upload') {
      state.uploadRequests += 1;
      const document: PilotDocument = {
        id: documentId,
        fileName: sourceFileName,
        fileUrl: `/storage/${sourceFileName}`,
        mimeType: 'text/csv',
        fileSize: 1454,
        type: 'SPREADSHEET',
        status: 'UPLOADED',
        createdAt: now,
        updatedAt: now,
        importedAt: null,
        importBatchId: null,
      };
      state.documents = [document];
      await fulfillJson(route, document, 201);
      return;
    }

    if (method === 'POST' && path === '/document-extraction/extract') {
      state.extractionRequests += 1;
      state.documents = state.documents.map((document) => ({
        ...document,
        status: 'REVIEW_REQUIRED',
        updatedAt: now,
      }));
      const response = buildExtractionResponse();
      state.extractionResults[documentId] = response;
      await fulfillJson(route, response);
      return;
    }

    if (method === 'GET' && path.startsWith('/document-extraction/')) {
      const result = state.extractionResults[path.split('/').pop() ?? ''];
      if (!result) {
        await fulfillJson(route, { message: 'No extraction results found for this document.' }, 404);
        return;
      }
      await fulfillJson(route, result);
      return;
    }

    if (method === 'POST' && path === '/document-extraction/confirm') {
      state.importRequests += 1;
      if (state.activities.length > 0) {
        await fulfillJson(route, {
          count: 0,
          createdIds: [],
          importBatchId,
          alreadyImported: true,
        });
        return;
      }

      state.activities = buildActivities();
      state.documents = state.documents.map((document) => ({
        ...document,
        status: 'IMPORTED',
        importedAt: now,
        importBatchId,
        updatedAt: now,
      }));
      await fulfillJson(route, {
        count: state.activities.length,
        createdIds: state.activities.map((activity) => activity.id),
        importBatchId,
        alreadyImported: false,
      });
      return;
    }

    if (method === 'POST' && path === '/metrics/calculate') {
      state.metricCalculationRequests += 1;
      await fulfillJson(route, {
        count: state.activities.filter((activity) => activity.scope !== 'TRACKED_METRIC').length,
        items: state.activities
          .filter((activity) => activity.scope !== 'TRACKED_METRIC')
          .map((activity) => ({
            activityDataId: activity.id,
            metricType: 'CARBON_EMISSION',
            metricResultId: `metric-${activity.id}`,
            factorId: activity.factorId,
            value: String(activity.calculatedEmissionsKgCO2e),
            unit: 'kgCO2e',
          })),
      });
      return;
    }

    if (method === 'GET' && path === '/activity-data') {
      await fulfillJson(route, paginated(state.activities));
      return;
    }

    if (
      method === 'GET' &&
      (path === '/metrics/summary' || path === '/metrics/calculation-summary')
    ) {
      state.summaryRequests += 1;
      await fulfillJson(route, buildCalculationSummary(state.activities));
      return;
    }

    if (method === 'GET' && path === '/conversion-factors') {
      await fulfillJson(route, paginated(state.conversionFactors));
      return;
    }

    if (method === 'GET' && path === '/facilities') {
      await fulfillJson(route, paginated([]));
      return;
    }

    if (method === 'POST' && (path === '/activity-events' || path === '/audit-logs/client-event')) {
      await fulfillJson(route, { ok: true }, 201);
      return;
    }

    state.unexpectedRequests.push(`${method} ${path}`);
    await fulfillJson(route, { message: `Unhandled pilot smoke API route: ${method} ${path}` }, 404);
  });
}

function buildExtractionResponse() {
  return {
    documentId,
    status: 'REVIEW_REQUIRED',
    parsedActivities: goldenRecords.map((record, index) => ({
      activityType: { value: record.activityType, confidence: 'high' },
      recordDate: { value: record.recordDate, confidence: 'high' },
      quantity: { value: record.quantity, confidence: 'high' },
      unit: { value: record.unit, confidence: 'high' },
      jurisdictionCountry: { value: record.country, confidence: 'high' },
      jurisdictionRegion: { value: record.province, confidence: record.province ? 'high' : 'medium' },
      sourceType: 'SPREADSHEET',
      sourceReference: { value: sourceFileName, confidence: 'high' },
      sourceDocumentId: documentId,
      sourceFileName,
      sourceRow: index + 2,
      notes: { value: record.notes, confidence: 'medium' },
      matchingStatus: record.scope === 'TRACKED_METRIC' ? 'TRACKED_ONLY' : 'MATCHED',
      reportTreatment: record.scope === 'TRACKED_METRIC' ? 'TRACKED_ONLY' : 'INCLUDED',
      scope: record.scope,
      matchedFactorId: record.factorId,
      matchedFactorName: record.factorName,
      matchedFactorSourceYear: record.factorId ? 2025 : null,
      calculatedEmissionsKgCO2e: record.calculatedEmissionsKgCO2e,
      calculationStatus: record.scope === 'TRACKED_METRIC' ? 'TRACKED_ONLY' : 'CALCULATED',
    })),
    sourceRowCount: goldenRecords.length,
    extractedRowCount: goldenRecords.length,
    possibleMissingRows: false,
    warning: null,
    extractedAt: now,
  };
}

function buildActivities(): PilotActivity[] {
  return goldenRecords.map((record, index) => ({
    ...record,
    id: `pilot-activity-${index + 1}`,
    organizationId,
    documentId,
    sourceDocumentId: documentId,
    sourceFileName,
    importBatchId,
    sourceType: 'SPREADSHEET',
    sourceReference: sourceFileName,
    jurisdictionCountry: record.country,
    jurisdictionRegion: record.province,
    matchingStatus: record.scope === 'TRACKED_METRIC' ? 'TRACKED_ONLY' : 'MATCHED',
    calculationStatus: record.scope === 'TRACKED_METRIC' ? 'TRACKED_ONLY' : 'CALCULATED',
    reportTreatment: record.scope === 'TRACKED_METRIC' ? 'TRACKED_ONLY' : 'INCLUDED',
    matchedFactorId: record.factorId,
    matchedFactorName: record.factorName,
    matchedFactorSourceYear: record.factorId ? 2025 : null,
    matchedFactorValue: record.factorValue,
    matchedFactorUnit: record.factorResultUnit,
    matchedFactorSourceAuthority: record.sourceAuthority,
    matchedFactorSourceDocument: record.sourceDocument,
    matchedFactorVerificationStatus: record.verificationStatus,
    matchedFactorConfidenceLevel: record.confidenceLevel,
    createdAt: now,
    updatedAt: now,
  }));
}

function buildCalculationSummary(activities: PilotActivity[]) {
  if (activities.length === 0) {
    return {
      totalsByMetric: [],
      totalsByFacility: [],
      totalEstimatedEmissionsKgCO2e: 0,
      totalRecordsFound: 0,
      recordsInScope: 0,
      recordsCalculated: 0,
      recordsIncluded: 0,
      processedRecords: 0,
      skippedRecords: 0,
      missingFactorCount: 0,
      missingFactorRecords: 0,
      invalidRecordCount: 0,
      dataQualityCoverage: 0,
      skippedReasons: {
        missingFactor: 0,
        invalidQuantity: 0,
        invalidUnit: 0,
        outsideScope: 0,
        outsideDateRange: 0,
        invalidData: 0,
        trackedOnly: 0,
      },
      calculationDetails: [],
      records: [],
      matchedActivityEmissions: [],
      conversionFactorsUsed: [],
      activities: [],
    };
  }

  const calculationDetails = activities.map(buildCalculationDetail);
  const calculatedActivities = activities.filter((activity) => activity.scope !== 'TRACKED_METRIC');
  const total = sum(calculatedActivities.map((activity) => activity.calculatedEmissionsKgCO2e));
  const scope1 = sum(calculatedActivities.filter((activity) => activity.scope === 'SCOPE_1').map((activity) => activity.calculatedEmissionsKgCO2e));
  const scope2 = sum(calculatedActivities.filter((activity) => activity.scope === 'SCOPE_2').map((activity) => activity.calculatedEmissionsKgCO2e));
  const scope3 = sum(calculatedActivities.filter((activity) => activity.scope === 'SCOPE_3').map((activity) => activity.calculatedEmissionsKgCO2e));

  return {
    totalsByMetric: [
      { metricType: 'CARBON_EMISSION', unit: 'kgCO2e', totalValue: String(total), count: calculatedActivities.length },
      { metricType: 'ELECTRICITY', unit: 'kWh', totalValue: '63600', count: 4 },
      { metricType: 'WATER', unit: 'm3', totalValue: '100', count: 1 },
    ],
    totalsByFacility: [
      { facilityId: null, metricType: 'CARBON_EMISSION', unit: 'kgCO2e', totalValue: String(total) },
    ],
    totalEstimatedEmissionsKgCO2e: total,
    totalRecordsFound: activities.length,
    recordsInScope: activities.length,
    recordsCalculated: calculatedActivities.length,
    recordsIncluded: calculatedActivities.length,
    processedRecords: calculatedActivities.length,
    skippedRecords: activities.length - calculatedActivities.length,
    missingFactorCount: 0,
    missingFactorRecords: 0,
    invalidRecordCount: 0,
    dataQualityCoverage: 90,
    calculatedRecordCount: calculatedActivities.length,
    skippedRecordCount: activities.length - calculatedActivities.length,
    totalRecordCount: activities.length,
    totalEmissions: total,
    emissionsUnit: 'kgCO2e',
    categoryBreakdown: buildCategoryBreakdown(calculatedActivities),
    calculationIssues: [
      {
        issueType: 'TRACKED_ONLY',
        count: 1,
        message: 'Water records are tracked only and excluded from GHG totals.',
      },
    ],
    dataQualitySummary: {
      totalRecords: activities.length,
      recordsReadyForCalculation: calculatedActivities.length,
      recordsRequiringReview: 0,
      missingActivityTypeCount: 0,
      missingQuantityCount: 0,
      missingUnitCount: 0,
      invalidUnitCount: 0,
      missingDateCount: 0,
      missingJurisdictionCount: 0,
      missingFactorCount: 0,
      trackedOnlyCount: 1,
      sourceReferenceCoverage: 100,
      costDataCoverage: 0,
      dataReadinessScore: 90,
      readinessLevel: 'Good',
      message: 'Pilot golden dataset is ready for calculation review.',
      checklist: [],
    },
    skippedReasons: {
      missingFactor: 0,
      invalidQuantity: 0,
      invalidUnit: 0,
      outsideScope: 0,
      outsideDateRange: 0,
      invalidData: 0,
      trackedOnly: 1,
    },
    usageTotals: {
      fuel: 1600,
      electricity: 63600,
      fuelUnitLabel: 'mixed units',
      electricityUnitLabel: 'kWh',
      fuelUsageBreakdown: [
        { activityType: 'NATURAL_GAS', total: 1000, unit: 'm3' },
        { activityType: 'GASOLINE', total: 500, unit: 'liters' },
        { activityType: 'DIESEL', total: 100, unit: 'liters' },
      ],
    },
    hotspotSummary: {
      totalCalculatedEmissions: total,
      emissionsUnit: 'kgCO2e',
      calculatedRecordCount: calculatedActivities.length,
      excludedRecordCount: 1,
      totalRecordCount: activities.length,
      topCategory: {
        activityType: 'ELECTRICITY',
        emissions: scope2,
        percentageOfTotal: (scope2 / total) * 100,
      },
      categoryHotspots: [],
      excludedCategories: [
        {
          activityType: 'WATER',
          displayName: 'Water',
          excludedRecordCount: 1,
          reason: 'TRACKED_ONLY',
          message: 'Water usage is tracked only and excluded from GHG totals.',
        },
      ],
      focusRecommendations: [],
    },
    calculationDetails,
    records: calculationDetails,
    matchedActivityEmissions: calculatedActivities.map((activity) => ({
      activityDataId: activity.id,
      activityType: activity.activityType,
      quantity: activity.quantity,
      unit: activity.unit,
      estimatedEmissionsKgCO2e: activity.calculatedEmissionsKgCO2e,
      sourceType: activity.sourceType,
      sourceReference: activity.sourceReference,
      sourceFileName: activity.sourceFileName,
      sourceDocumentId: activity.sourceDocumentId,
      sourceRow: activity.id.split('-').pop(),
      notes: activity.notes,
      factorId: activity.factorId,
    })),
    conversionFactorsUsed: buildConversionFactorsUsed(calculatedActivities),
    activities: activities.map((activity) => ({
      id: activity.id,
      activityType: activity.activityType,
      recordDate: activity.recordDate,
      quantity: activity.quantity,
      unit: activity.unit,
      sourceType: activity.sourceType,
      sourceReference: activity.sourceReference,
      sourceFileName: activity.sourceFileName,
      sourceDocumentId: activity.sourceDocumentId,
      sourceRow: activity.id.split('-').pop(),
      notes: activity.notes,
    })),
    scopeTotals: {
      scope1,
      scope2,
      scope3,
    },
  };
}

function buildCalculationDetail(activity: PilotActivity) {
  const trackedOnly = activity.scope === 'TRACKED_METRIC';
  const quantityForFormula = activity.normalizedQuantity ?? activity.quantity;
  const unitForFormula = activity.normalizedUnit ?? activity.unit;
  return {
    activityDataId: activity.id,
    activityType: activity.activityType,
    recordDate: activity.recordDate,
    dateEstimated: false,
    reportingYear: 2026,
    recordYear: 2026,
    jurisdiction: activity.province || 'Canada - National',
    jurisdictionCountry: activity.country,
    jurisdictionRegion: activity.province || 'Canada - National',
    jurisdictionSource: 'record',
    jurisdictionAssumed: false,
    activityQuantity: activity.quantity,
    activityUnit: activity.unit,
    quantityUnit: activity.unit,
    normalizedQuantity: activity.normalizedQuantity ?? activity.quantity,
    normalizedUnit: activity.normalizedUnit ?? activity.unit,
    factorId: activity.factorId,
    factorVersionId: null,
    factorVersion: trackedOnly ? null : `${activity.sourceAuthority} 2025`,
    factorName: activity.factorName,
    factorDisplayName: activity.factorName,
    factorValue: activity.factorValue,
    factorInputUnit: activity.factorInputUnit,
    factorResultUnit: activity.factorResultUnit,
    factorYear: trackedOnly ? null : 2025,
    factorJurisdictionCountry: activity.country,
    factorJurisdictionRegion: activity.province || 'Canada - National',
    factorStatus: trackedOnly ? 'TRACKED_ONLY' : 'SYSTEM_FACTOR',
    factorSource: activity.sourceAuthority,
    sourceAuthority: activity.sourceAuthority,
    sourceDocument: activity.sourceDocument,
    sourceUrl: '',
    factorAssumptions: trackedOnly ? 'Tracked only; excluded from GHG total.' : 'Pilot system factor for structured feedback.',
    sourceYear: trackedOnly ? null : 2025,
    factorVerified: false,
    factorConfidenceLevel: activity.confidenceLevel,
    factorVerificationStatus: activity.verificationStatus,
    factorType: trackedOnly ? null : 'System',
    factorDefaultScope: activity.scope,
    factorScope: activity.scope,
    scopeClassification: activity.scope,
    calculatedEmission: activity.calculatedEmissionsKgCO2e,
    calculatedEmissionsKgCO2e: activity.calculatedEmissionsKgCO2e,
    calculationFormula: trackedOnly
      ? 'Tracked only; excluded from GHG total.'
      : `${quantityForFormula} ${unitForFormula} x ${activity.factorValue} ${activity.factorResultUnit} = ${activity.calculatedEmissionsKgCO2e} kgCO2e`,
    calculationStatus: trackedOnly ? 'TRACKED_ONLY' : 'CALCULATED',
    matchingStatus: trackedOnly ? 'TRACKED_ONLY' : 'MATCHED',
    matchedBy: trackedOnly ? 'Tracked metric rule' : 'CarbonLite System Factor',
    matchingMethod: trackedOnly ? 'Tracked only and excluded from GHG total.' : 'Matched to CarbonLite System Factor.',
    matchingMessage: trackedOnly ? 'Excluded from GHG total.' : 'Matched to CarbonLite System Factor.',
    explanationStatus: trackedOnly ? 'TRACKED_ONLY' : 'CALCULATED',
    explanationMatchedBy: trackedOnly ? 'Tracked metric rule' : 'CarbonLite System Factor',
    status: trackedOnly ? 'TRACKED_ONLY' : 'CALCULATED',
    reason: trackedOnly ? 'Water usage is tracked only and excluded from GHG totals.' : null,
    sourceType: activity.sourceType,
    sourceReference: activity.sourceReference,
    sourceFileName: activity.sourceFileName,
    sourceRow: activity.id.split('-').pop(),
    sourceDocumentId: activity.sourceDocumentId,
    notes: activity.notes,
  };
}

function buildCategoryBreakdown(activities: PilotActivity[]) {
  const byType = new Map<string, { emissions: number; recordCount: number }>();
  activities.forEach((activity) => {
    const current = byType.get(activity.activityType) ?? { emissions: 0, recordCount: 0 };
    current.emissions += activity.calculatedEmissionsKgCO2e;
    current.recordCount += 1;
    byType.set(activity.activityType, current);
  });
  return Array.from(byType.entries()).map(([activityType, item]) => ({
    activityType,
    emissions: item.emissions,
    recordCount: item.recordCount,
    calculatedRecordCount: item.recordCount,
    skippedRecordCount: 0,
  }));
}

function buildConversionFactorsUsed(activities: PilotActivity[]) {
  const factors = new Map<string, PilotActivity>();
  activities.forEach((activity) => {
    if (activity.factorId) factors.set(activity.factorId, activity);
  });
  return Array.from(factors.values()).map((activity) => ({
    factorId: activity.factorId,
    factorVersionId: null,
    activityType: activity.activityType,
    factorName: activity.factorName,
    factorValue: activity.factorValue,
    inputUnit: activity.factorInputUnit,
    resultUnit: activity.factorResultUnit,
    jurisdiction: activity.province || 'Canada - National',
    reportingYear: 2026,
    sourceAuthority: activity.sourceAuthority,
    sourceDocument: activity.sourceDocument,
    sourceUrl: '',
    factorVersion: `${activity.sourceAuthority} 2025`,
    sourceYear: 2025,
    factorStatus: 'SYSTEM_FACTOR',
    confidenceLevel: activity.confidenceLevel,
    verificationStatus: activity.verificationStatus,
    assumptions: activity.notes,
    factorType: 'System',
    verified: false,
    priority: 'Pilot',
  }));
}

function buildConversionFactors(): PilotConversionFactor[] {
  const uniqueFactors = new Map<string, GoldenRecord>();
  goldenRecords.forEach((record) => {
    if (record.factorId && !uniqueFactors.has(record.factorId)) {
      uniqueFactors.set(record.factorId, record);
    }
  });

  return Array.from(uniqueFactors.values()).map((record) => ({
      id: record.factorId ?? '',
      organizationId: null,
      name: record.factorName,
      type: 'SYSTEM',
      activityType: record.activityType,
      jurisdiction: record.province || 'Canada - National',
      unit: record.factorInputUnit ?? record.unit,
      factorValue: record.factorValue ?? 0,
      resultUnit: record.factorResultUnit ?? 'kgCO2e/unit',
      sourceName: record.sourceAuthority,
      sourceReference: record.sourceDocument,
      sourceAuthority: record.sourceAuthority,
      sourceDocument: record.sourceDocument,
      sourceYear: 2025,
      sourceUrl: '',
      methodology: 'Pilot estimate for structured feedback.',
      confidenceLevel: record.confidenceLevel,
      verificationStatus: record.verificationStatus,
      verified: false,
      notes: record.notes,
      isDefault: true,
      isSystemDefault: true,
      defaultScope: record.scope,
      createdAt: now,
      updatedAt: now,
    }));
}

function paginated<T>(items: T[]) {
  return {
    items,
    page: 1,
    pageSize: Math.max(items.length, 1),
    total: items.length,
    totalPages: 1,
  };
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}
