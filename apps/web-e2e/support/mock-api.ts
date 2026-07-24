import type { Page, Route } from '@playwright/test';

const now = '2026-06-13T16:00:00.000Z';

type TestDocument = {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type TestActivity = {
  id: string;
  organizationId: string;
  documentId: string;
  sourceDocumentId: string;
  sourceFileName: string;
  importBatchId: string;
  activityType: string;
  recordDate: string;
  quantity: number;
  unit: string;
  jurisdictionCountry: string;
  jurisdictionRegion: string;
  sourceType: string;
  sourceReference: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

type TestConversionFactor = {
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

export type CarbonLiteApiState = {
  documents: TestDocument[];
  activities: TestActivity[];
  conversionFactors: TestConversionFactor[];
  extractionResults: Record<string, unknown>;
  uploadRequests: number;
  extractionRequests: number;
  importRequests: number;
  metricGenerationRequests: number;
  summaryRequests: number;
  documentDeleteRequests: number;
  factorCreateRequests: number;
  factorDeleteRequests: number;
  unexpectedRequests: string[];
  releaseExtraction: () => void;
  extractionResponseGate: Promise<void>;
};

export function createCarbonLiteApiState(): CarbonLiteApiState {
  let releaseExtraction = () => {};
  const extractionResponseGate = new Promise<void>((resolve) => {
    releaseExtraction = resolve;
  });

  return {
    documents: [],
    activities: [],
    conversionFactors: buildSystemConversionFactors(),
    extractionResults: {},
    uploadRequests: 0,
    extractionRequests: 0,
    importRequests: 0,
    metricGenerationRequests: 0,
    summaryRequests: 0,
    documentDeleteRequests: 0,
    factorCreateRequests: 0,
    factorDeleteRequests: 0,
    unexpectedRequests: [],
    releaseExtraction,
    extractionResponseGate,
  };
}

export async function installCarbonLiteApiMock(
  page: Page,
  state: CarbonLiteApiState,
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

    if (method === 'GET' && path === '/documents') {
      await fulfillJson(route, paginated(state.documents));
      return;
    }

    if (method === 'POST' && path === '/documents/upload') {
      state.uploadRequests += 1;
      const document: TestDocument = {
        id: 'document-1',
        fileName: 'enmax-electricity.csv',
        fileUrl: '/storage/enmax-electricity.csv',
        mimeType: 'text/csv',
        fileSize: 113,
        type: 'SPREADSHEET',
        status: 'UPLOADED',
        createdAt: now,
        updatedAt: now,
      };
      state.documents = [document];
      await fulfillJson(route, document, 201);
      return;
    }

    if (method === 'DELETE' && path.startsWith('/documents/')) {
      state.documentDeleteRequests += 1;
      const documentId = path.split('/').pop();
      const deletedActivityRecords = state.activities.filter(
        (activity) => activity.sourceDocumentId === documentId,
      ).length;
      state.documents = state.documents.filter(
        (document) => document.id !== documentId,
      );
      state.activities = state.activities.filter(
        (activity) => activity.sourceDocumentId !== documentId,
      );
      await fulfillJson(route, {
        deletedDocument: true,
        deletedActivityRecords,
      });
      return;
    }

    if (method === 'POST' && path === '/admin/demo-data/reset') {
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
        state.activities
          .map((activity) => activity.importBatchId)
          .filter(Boolean),
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

    if (method === 'POST' && path === '/document-extraction/extract') {
      state.extractionRequests += 1;
      await state.extractionResponseGate;
      state.documents = state.documents.map((document) => ({
        ...document,
        status: 'REVIEW_REQUIRED',
        updatedAt: now,
      }));
      const response = {
        documentId: 'document-1',
        status: 'REVIEW_REQUIRED',
        parsedActivities: [
          {
            activityType: { value: 'ELECTRICITY', confidence: 'high' },
            recordDate: { value: '2026-05-31', confidence: 'high' },
            quantity: { value: 4280, confidence: 'high' },
            unit: { value: 'kWh', confidence: 'high' },
            jurisdictionCountry: { value: 'Canada', confidence: 'high' },
            jurisdictionRegion: { value: 'Alberta', confidence: 'high' },
            sourceType: 'AI_EXTRACTION',
            sourceReference: {
              value: 'enmax-electricity.csv',
              confidence: 'high',
            },
            sourceDocumentId: 'document-1',
            sourceFileName: 'enmax-electricity.csv',
            notes: { value: '', confidence: 'medium' },
          },
        ],
        sourceRowCount: 1,
        extractedRowCount: 1,
        possibleMissingRows: 0,
        warning: null,
        extractedAt: now,
      };
      state.extractionResults['document-1'] = response;
      await fulfillJson(route, response);
      return;
    }

    if (method === 'GET' && path.startsWith('/document-extraction/')) {
      const documentId = path.split('/').pop() ?? '';
      const result = state.extractionResults[documentId];
      if (!result) {
        await fulfillJson(route, {
          message: 'No extraction results found for this document.',
        }, 404);
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
          importBatchId: 'document-document-1',
          alreadyImported: true,
        });
        return;
      }

      state.activities = [buildImportedActivity()];
      state.documents = state.documents.map((document) => ({
        ...document,
        status: 'IMPORTED',
        updatedAt: now,
      }));
      await fulfillJson(route, {
        count: 1,
        createdIds: ['activity-1'],
        importBatchId: 'document-document-1',
        alreadyImported: false,
      });
      return;
    }

    if (method === 'POST' && path === '/metrics/calculate') {
      state.metricGenerationRequests += 1;
      await fulfillJson(route, {
        count: 1,
        items: [
          {
            activityDataId: 'activity-1',
            metricType: 'CARBON_EMISSION',
            metricResultId: 'metric-1',
            factorId: 'factor-electricity-ab-2026',
            value: '2140',
            unit: 'kgCO2e',
          },
        ],
      });
      return;
    }

    if (method === 'GET' && path === '/activity-data') {
      await fulfillJson(route, paginated(state.activities));
      return;
    }

    if (method === 'GET' && path === '/metrics/calculation-summary') {
      state.summaryRequests += 1;
      await fulfillJson(route, buildCalculationSummary(state.activities, url.searchParams));
      return;
    }

    if (method === 'GET' && path === '/conversion-factors') {
      await fulfillJson(route, paginated(state.conversionFactors));
      return;
    }

    if (method === 'POST' && path === '/conversion-factors') {
      state.factorCreateRequests += 1;
      const input = request.postDataJSON() as Record<string, unknown>;
      const created: TestConversionFactor = {
        id: `factor-custom-${state.factorCreateRequests}`,
        organizationId: 'organization-1',
        name: String(input.name),
        type: String(input.type),
        activityType: String(input.activityType),
        jurisdiction: String(input.jurisdiction ?? ''),
        unit: String(input.unit),
        factorValue: Number(input.factorValue),
        resultUnit: String(input.resultUnit),
        sourceName: String(input.sourceName ?? ''),
        sourceReference: String(input.sourceReference ?? ''),
        sourceAuthority: String(input.sourceAuthority ?? ''),
        sourceDocument: String(input.sourceDocument ?? ''),
        sourceYear: Number(input.sourceYear || 2026),
        sourceUrl: String(input.sourceUrl ?? ''),
        methodology: String(input.methodology ?? ''),
        confidenceLevel: String(input.confidenceLevel ?? ''),
        verificationStatus: String(input.verificationStatus ?? ''),
        verified: Boolean(input.verified),
        notes: String(input.notes ?? ''),
        isDefault: Boolean(input.isDefault),
        isSystemDefault: false,
        defaultScope: String(input.defaultScope ?? ''),
        createdAt: now,
        updatedAt: now,
      };
      state.conversionFactors = [...state.conversionFactors, created];
      await fulfillJson(route, created, 201);
      return;
    }

    if (method === 'DELETE' && path.startsWith('/conversion-factors/')) {
      state.factorDeleteRequests += 1;
      const factorId = path.split('/').pop();
      const deleted = state.conversionFactors.find(
        (factor) => factor.id === factorId,
      );
      state.conversionFactors = state.conversionFactors.filter(
        (factor) => factor.id !== factorId,
      );
      await fulfillJson(route, deleted ?? { id: factorId });
      return;
    }

    if (
      method === 'POST' &&
      (path === '/activity-events' || path === '/audit-logs/client-event')
    ) {
      await fulfillJson(route, {
        id: `event-${Date.now()}`,
        createdAt: now,
      }, 201);
      return;
    }

    state.unexpectedRequests.push(`${method} ${path}`);
    await fulfillJson(route, {
      message: `Unexpected E2E API request: ${method} ${path}`,
    }, 404);
  });
}

function buildImportedActivity(): TestActivity {
  return {
    id: 'activity-1',
    organizationId: 'organization-1',
    documentId: 'document-1',
    sourceDocumentId: 'document-1',
    sourceFileName: 'enmax-electricity.csv',
    importBatchId: 'document-document-1',
    activityType: 'ELECTRICITY',
    recordDate: '2026-05-31',
    quantity: 4280,
    unit: 'kWh',
    jurisdictionCountry: 'Canada',
    jurisdictionRegion: 'Alberta',
    sourceType: 'AI_EXTRACTION',
    sourceReference: 'enmax-electricity.csv',
    notes: 'Imported from AI extraction.',
    createdAt: now,
    updatedAt: now,
  };
}

function buildSystemConversionFactors(): TestConversionFactor[] {
  return [
    buildSystemConversionFactor('AB', 'Alberta', 0.53),
    buildSystemConversionFactor('BC', 'British Columbia', 0.02),
    buildSystemConversionFactor('ON', 'Ontario', 0.12),
    {
      id: 'factor-ground-transport-ca-2025',
      organizationId: null,
      name: 'Ground Transport - Canada - 2025',
      type: 'EMISSION',
      activityType: 'GROUND_TRANSPORT',
      jurisdiction: 'Canada - National',
      unit: 'km',
      factorValue: 0.2,
      resultUnit: 'kgCO2e',
      sourceName: 'CarbonLite Pilot Estimate',
      sourceReference: 'CarbonLite pilot ground transport estimate',
      sourceAuthority: 'CarbonLite',
      sourceDocument: 'CarbonLite Pilot Ground Transport Estimate 2025',
      sourceYear: 2025,
      sourceUrl: '',
      methodology:
        'Pilot estimate for taxi, rideshare, rental car, mileage, and local business travel distance. Internal review required before formal reporting.',
      confidenceLevel: 'Pilot Estimate',
      verificationStatus: 'Internal Review Required',
      verified: false,
      notes: 'Pilot estimate for Scope 3 ground transport.',
      isDefault: true,
      isSystemDefault: true,
      defaultScope: 'SCOPE_3',
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function buildSystemConversionFactor(
  code: 'AB' | 'BC' | 'ON',
  province: string,
  factorValue: number,
): TestConversionFactor {
  return {
    id: `factor-electricity-${code.toLowerCase()}-2026`,
    organizationId: null,
    name: `Electricity - ${province} - 2026`,
    type: 'EMISSION',
    activityType: 'ELECTRICITY',
    jurisdiction: `${province}, Canada`,
    unit: 'kWh',
    factorValue,
    resultUnit: 'kgCO2e',
    sourceName: 'E2E verified fixture',
    sourceReference: 'Playwright calculation fixture',
    sourceAuthority: 'E2E verified fixture',
    sourceDocument: 'Playwright calculation fixture',
    sourceYear: 2026,
    sourceUrl: '',
    methodology: 'Quantity multiplied by factor value.',
    confidenceLevel: 'high',
    verificationStatus: 'Verified',
    verified: true,
    notes: `Regression smoke fixture for ${code}.`,
    isDefault: true,
    isSystemDefault: true,
    defaultScope: 'SCOPE_2',
    createdAt: now,
    updatedAt: now,
  };
}

export function seedImportedDocument(state: CarbonLiteApiState) {
  state.documents = [
    {
      id: 'document-1',
      fileName: 'enmax-electricity.csv',
      fileUrl: '/storage/enmax-electricity.csv',
      mimeType: 'text/csv',
      fileSize: 113,
      type: 'SPREADSHEET',
      status: 'IMPORTED',
      createdAt: now,
      updatedAt: now,
    },
  ];
  state.activities = [buildImportedActivity()];
}

export function seedFailedDocument(state: CarbonLiteApiState) {
  state.documents = [
    {
      id: 'document-1',
      fileName: 'enmax-electricity.csv',
      fileUrl: '/storage/enmax-electricity.csv',
      mimeType: 'text/csv',
      fileSize: 113,
      type: 'SPREADSHEET',
      status: 'EXTRACTION_FAILED',
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export function seedMissingFileDocument(state: CarbonLiteApiState) {
  state.documents = [
    {
      id: 'document-1',
      fileName: 'old-enmax-electricity.csv',
      fileUrl: '/storage/old-enmax-electricity.csv',
      mimeType: 'text/csv',
      fileSize: 113,
      type: 'SPREADSHEET',
      status: 'FILE_MISSING',
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function buildCalculationSummary(
  allActivities: TestActivity[],
  searchParams = new URLSearchParams(),
) {
  const periodStart = searchParams.get('periodStart');
  const periodEnd = searchParams.get('periodEnd');
  const activities = allActivities.filter((activity) => {
    const date = activity.recordDate.slice(0, 10);
    if (periodStart && date < periodStart) return false;
    if (periodEnd && date > periodEnd) return false;
    return true;
  });
  const hasRecords = activities.length > 0;
  const totalRecordsFound = allActivities.length;
  const records = hasRecords ? activities.length : 0;
  const emissions = hasRecords ? 2268.4 : 0;
  const electricity = hasRecords ? 4280 : 0;
  const outsideDateRange = totalRecordsFound - records;

  return {
    totalsByMetric: hasRecords
      ? [
          {
            metricType: 'CARBON_EMISSION',
            unit: 'kgCO2e',
            totalValue: String(emissions),
            count: records,
          },
          {
            metricType: 'ELECTRICITY',
            unit: 'kWh',
            totalValue: String(electricity),
            count: records,
          },
        ]
      : [],
    totalsByFacility: [],
    totalEstimatedEmissionsKgCO2e: emissions,
    totalRecordsFound,
    recordsInScope: records,
    recordsCalculated: records,
    recordsIncluded: records,
    processedRecords: records,
    skippedRecords: outsideDateRange,
    missingFactorCount: 0,
    missingFactorRecords: 0,
    invalidRecordCount: 0,
    dataQualityCoverage: hasRecords ? 100 : 0,
    skippedReasons: {
      missingFactor: 0,
      invalidQuantity: 0,
      invalidUnit: 0,
      outsideScope: 0,
      outsideDateRange,
      invalidData: 0,
    },
    usageTotals: {
      fuel: 0,
      electricity,
      fuelUnitLabel: 'Grouped by type and unit',
      electricityUnitLabel: 'kWh',
      fuelUsageBreakdown: [],
    },
    missingFactors: [],
    activities,
    matchedActivityEmissions: hasRecords
      ? [
          {
            activityDataId: 'activity-1',
            activityType: 'ELECTRICITY',
            quantity: 4280,
            unit: 'kWh',
            estimatedEmissionsKgCO2e: emissions,
            sourceType: 'AI_EXTRACTION',
            sourceReference: 'enmax-electricity.csv',
            notes: 'Imported from AI extraction.',
            factorId: 'factor-electricity-ab-2026',
          },
        ]
      : [],
    conversionFactorsUsed: hasRecords
      ? [
          {
            factorId: 'factor-electricity-ab-2026',
            activityType: 'ELECTRICITY',
            factorName: 'Electricity - Alberta - 2026',
            factorValue: 0.53,
            inputUnit: 'kWh',
            resultUnit: 'kgCO2e',
            jurisdiction: 'Alberta, Canada',
            reportingYear: 2026,
            sourceAuthority: 'E2E verified fixture',
            sourceDocument: 'Playwright calculation fixture',
            sourceUrl: null,
            sourceYear: 2026,
            factorType: 'System',
            verified: true,
            priority: 'VERIFIED_SYSTEM',
          },
        ]
      : [],
    calculationDetails: hasRecords
      ? [
          {
            activityDataId: 'activity-1',
            activityType: 'ELECTRICITY',
            recordDate: '2026-05-31',
            dateEstimated: false,
            reportingYear: 2026,
            jurisdiction: 'Alberta, Canada',
            jurisdictionCountry: 'Canada',
            jurisdictionRegion: 'Alberta',
            activityQuantity: 4280,
            activityUnit: 'kWh',
            factorId: 'factor-electricity-ab-2026',
            factorName: 'Electricity - Alberta - 2026',
            factorValue: 0.53,
            factorInputUnit: 'kWh',
            factorResultUnit: 'kgCO2e',
            factorPriority: 'VERIFIED_SYSTEM',
            factorSource: 'E2E verified fixture',
            sourceAuthority: 'E2E verified fixture',
            sourceDocument: 'Playwright calculation fixture',
            sourceYear: 2026,
            factorVerified: true,
            factorType: 'System',
            factorDefaultScope: 'SCOPE_2',
            calculatedEmissionsKgCO2e: emissions,
            status: 'CALCULATED',
            sourceType: 'AI_EXTRACTION',
            sourceReference: 'enmax-electricity.csv',
            sourceFileName: 'enmax-electricity.csv',
            sourceDocumentId: 'document-1',
            notes: 'Imported from AI extraction.',
          },
        ]
      : [],
  };
}

function paginated<T>(items: T[]) {
  return {
    items,
    page: 1,
    pageSize: 100,
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
