import { LEGITIMATE_OFFICIAL_FACTOR } from '../test/legitimateFactorMetadata';
import {
  hasImportedRecords,
  FILE_MISSING_EXPLANATION,
  FILE_MISSING_TOOLTIP,
  formatSourceReference,
  formatDocumentSourceTypeLabel,
  formatDocumentCreatedAt,
  formatDuplicateDocumentMessage,
  getDocumentActionModel,
  getDocumentStatusLabel,
  getDocumentDownloadUrl,
  getParsedActivityRowKey,
  getImportValidationIssues,
  buildDetectedSourceItems,
  classifyExtractedDocumentSourceItems,
  buildDraftRowAuditSummary,
  buildDocumentImportRecordKey,
  classifyDraftRow,
  resolveActivityRecordDate,
  buildDocumentImportActivityPayload,
  extractProvinceFromAddress,
} from './UploadPage';
import { evaluateActivityRecord } from '../utils/canonicalRecordEvaluation';

const albertaElectricity2025Factor = {
  id: 'factor-electricity-ab-2025',
  organizationId: null,
  factorType: 'SYSTEM',
  name: 'Electricity - Alberta',
  type: 'EMISSION',
  activityType: 'ELECTRICITY',
  inputUnit: 'kWh',
  unit: 'kWh',
  factorValue: 0.53,
  resultUnit: 'kgCO2e/kWh',
  sourceYear: 2025,
  effectiveYear: 2025,
  jurisdictionCountry: 'Canada',
  jurisdictionRegion: 'Alberta',
  ...LEGITIMATE_OFFICIAL_FACTOR,
  factorVersion: 'v1.0',
  verificationStatus: 'INTERNAL_REVIEW_REQUIRED',
  confidenceLevel: 'LOW',
  assumptions: 'Historical arithmetic only; numerical methodology is outside this test.',
  isSystemDefault: true,
  isDefault: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function buildImportRow(overrides: Record<string, any> = {}) {
  return {
    selected: true,
    documentId: 'doc-1',
    documentFileName: 'utility.pdf',
    dateEstimated: false,
    activityType: { value: 'DIESEL', confidence: 'high' },
    recordDate: { value: '2026-05-29', confidence: 'high' },
    quantity: { value: 100, confidence: 'high' },
    unit: { value: 'L', confidence: 'high' },
    sourceReference: { value: 'utility.pdf', confidence: 'high' },
    notes: { value: '', confidence: 'medium' },
    ...overrides,
  };
}

describe('duplicate document messaging', () => {
  it('shows the existing filename and upload date', () => {
    expect(
      formatDuplicateDocumentMessage({
        fileName: 'utility.xlsx',
        createdAt: '2026-05-30T10:30:00.000Z',
      }),
    ).toBe('utility.xlsx was already uploaded on 2026-05-30.');
  });
});

describe('document import factor matching metadata', () => {
  it('keeps detected waste source items separate from importable ActivityData rows', () => {
    const items = buildDetectedSourceItems([
      {
        type: 'WASTE_AND_RECYCLING',
        label: 'Waste & Recycling',
        importEligibility: 'NOT_IMPORTABLE',
        reason: 'INSUFFICIENT_ACTIVITY_QUANTITY',
        reasonDetail: 'No supported waste quantity was provided.',
        serviceDays: 30,
        sourceCostCad: 19.54,
        sourceDetails: [
          { label: 'Blue Cart', amountCad: 2.17 },
          { label: 'Black Cart', amountCad: 7.39 },
          { label: 'Green Cart', amountCad: 9.98 },
        ],
      },
    ], {
      id: 'document-enmax',
      fileName: '2025_August_01.pdf',
    });

    expect(items).toEqual([
      expect.objectContaining({
        documentId: 'document-enmax',
        documentFileName: '2025_August_01.pdf',
        sourceDocumentId: 'document-enmax',
        sourceFileName: '2025_August_01.pdf',
        type: 'WASTE_AND_RECYCLING',
        importEligibility: 'NOT_IMPORTABLE',
        serviceDays: 30,
        sourceCostCad: 19.54,
        reasonDetail: 'No supported waste quantity was provided.',
      }),
    ]);
  });

  it('splits EPCOR-style water review records from wastewater and waste service source evidence', () => {
    const classification = classifyExtractedDocumentSourceItems([
      {
        activityType: 'Water',
        quantity: 17.779,
        unit: 'm3',
        sourceReference: 'Water',
      },
      {
        activityType: 'Wastewater Collection and Treatment',
        quantity: 17.779,
        unit: 'm3',
        sourceReference: 'Wastewater based on water usage',
      },
      {
        activityType: 'Waste Services',
        sourceReference: 'Waste Services monthly fee',
        costCad: 42.63,
      },
    ], {
      id: 'document-epcor',
      fileName: 'sanitized-epcor.pdf',
    });

    expect(classification.reviewableActivities).toHaveLength(1);
    expect(classification.reviewableActivities[0]).toMatchObject({
      activityType: 'Water',
      quantity: 17.779,
      unit: 'm3',
    });
    expect(classification.detectedSourceItems).toEqual([
      expect.objectContaining({
        type: 'WASTEWATER',
        label: 'Wastewater Collection and Treatment',
        importEligibility: 'NOT_IMPORTABLE',
        sourceQuantity: 17.779,
        sourceUnit: 'm3',
        reason: 'NOT_SEPARATELY_MODELED',
      }),
      expect.objectContaining({
        type: 'WASTE_SERVICES',
        label: 'Waste Services',
        importEligibility: 'NOT_IMPORTABLE',
        sourceCostCad: 42.63,
        reason: 'INSUFFICIENT_ACTIVITY_QUANTITY',
      }),
    ]);
  });

  it('keeps unsupported spreadsheet rows reviewable instead of treating them as source evidence', () => {
    const classification = classifyExtractedDocumentSourceItems([
      {
        activityType: 'Office Supplies',
        quantity: 10,
        unit: 'each',
        sourceSheetName: 'Needs Review',
        sourceRow: 3,
      },
    ], {
      id: 'document-golden',
      fileName: 'Golden Test Data.xlsx',
    });

    expect(classification.reviewableActivities).toHaveLength(1);
    expect(classification.detectedSourceItems).toHaveLength(0);
  });

  it('keeps physical waste quantities as genuine unsupported ActivityData candidates', () => {
    const classification = classifyExtractedDocumentSourceItems([
      {
        activityType: 'Waste',
        quantity: 120,
        unit: 'kg',
        sourceReference: 'Waste disposal quantity',
      },
    ], {
      id: 'document-waste-quantity',
      fileName: 'waste-disposal.pdf',
    });

    expect(classification.reviewableActivities).toHaveLength(1);
    expect(classification.detectedSourceItems).toHaveLength(0);
    expect(getImportValidationIssues([
      buildImportRow({ activityType: { value: 'Waste', confidence: 'medium' }, quantity: { value: 120, confidence: 'high' }, unit: { value: 'kg', confidence: 'high' } }),
    ])).toEqual([
      {
        rowIndex: 0,
        field: 'activityType',
        message:
          'Unsupported Activity Type: This activity type is not supported in the current CarbonLite pilot.',
      },
    ]);
  });

  it('extracts province from the real ENMAX service address shape', () => {
    expect(
      extractProvinceFromAddress({
        value: '4100 Test Industrial Way, Calgary, AB',
        confidence: 'high',
      }),
    ).toBe('Alberta');
  });

  it('builds golden-style import audit summary counts from draft rows', () => {
    const readyRows = Array.from({ length: 9 }, (_, index) =>
      buildImportRow({
        documentId: 'golden-doc',
        documentFileName: 'Golden Test Data.xlsx',
        activityType: { value: index === 0 ? 'ELECTRICITY' : 'DIESEL', confidence: 'high' },
        jurisdictionRegion: { value: index === 0 ? 'Alberta' : '', confidence: 'high' },
      }),
    );
    const trackedMetricRow = buildImportRow({
      documentId: 'golden-doc',
      documentFileName: 'Golden Test Data.xlsx',
      activityType: { value: 'WATER', confidence: 'high' },
      unit: { value: 'm3', confidence: 'high' },
      matchingStatus: 'TRACKED_METRIC',
      reportTreatment: 'TRACKED_ONLY',
      scope: 'TRACKED_METRIC',
      calculationStatus: 'TRACKED_METRIC',
    });
    const reviewRows = [
      buildImportRow({
        activityType: { value: 'ELECTRICITY', confidence: 'high' },
        jurisdictionRegion: { value: '', confidence: 'high' },
      }),
      buildImportRow({
        activityType: { value: 'CUSTOM', confidence: 'high' },
      }),
      buildImportRow({
        quantity: { value: null, confidence: 'low' },
      }),
    ];

    expect(buildDraftRowAuditSummary([...readyRows, trackedMetricRow, ...reviewRows])).toEqual({
      draftRecordsCreated: 13,
      readyCount: 9,
      trackedMetricCount: 1,
      requiresReviewCount: 3,
      importableCount: 10,
    });
  });

  it('uses the latest canonical evaluation instead of stale needs-review status', () => {
    const correctedRow = buildImportRow({
      status: 'READY',
      activityType: { value: 'ELECTRICITY', confidence: 'high' },
      jurisdictionCountry: { value: 'Canada', confidence: 'high' },
      jurisdictionRegion: { value: 'Alberta', confidence: 'medium' },
      matchingStatus: 'MATCHED',
      calculationStatus: 'CALCULATED',
      reportTreatment: 'INCLUDED',
      scope: 'SCOPE_2',
    });

    expect(classifyDraftRow(correctedRow, getImportValidationIssues([correctedRow]))).toBe('READY');
  });

  it('keeps editable review row keys stable while mutable values change', () => {
    const before = buildImportRow({
      documentId: 'doc-golden',
      sourceSheetName: 'Needs Review',
      sourceRow: 3,
      quantity: { value: 5, confidence: 'low' },
      unit: { value: 'bad', confidence: 'low' },
    });
    const after = buildImportRow({
      documentId: 'doc-golden',
      sourceSheetName: 'Needs Review',
      sourceRow: 3,
      quantity: { value: 500, confidence: 'medium' },
      unit: { value: 'kWh', confidence: 'medium' },
      jurisdictionRegion: { value: 'Alberta', confidence: 'medium' },
      matchingStatus: 'MATCHED',
      calculationStatus: 'CALCULATED',
      reportTreatment: 'INCLUDED',
    });

    expect(getParsedActivityRowKey(before, 0)).toBe(getParsedActivityRowKey(after, 0));
  });

  it('uses source sheet and row, not corrected business values, as import identity', () => {
    const before = buildDocumentImportRecordKey({
      sourceDocumentId: 'doc-golden',
      sourceSheetName: 'Needs Review',
      sourceRow: 3,
      activityType: 'ELECTRICITY',
      quantity: 0,
      unit: 'bad',
    });
    const after = buildDocumentImportRecordKey({
      sourceDocumentId: 'doc-golden',
      sourceSheetName: 'Needs Review',
      sourceRow: 3,
      activityType: 'ELECTRICITY',
      quantity: 980,
      unit: 'kWh',
    });

    expect(after).toBe(before);
    expect(after).toBe('doc-golden::sheet::Needs Review::row::3');
  });

  it('matches imported BC electricity with the same canonical metadata as manual entry', () => {
    const payload = buildDocumentImportActivityPayload({
      item: buildImportRow({
        activityType: { value: 'Electricity', confidence: 'high' },
        recordDate: { value: '2026-07-20', confidence: 'high' },
        quantity: { value: 100, confidence: 'high' },
        unit: { value: ' KWH ', confidence: 'high' },
        jurisdictionCountry: { value: 'Canada', confidence: 'high' },
        jurisdictionRegion: { value: 'BC', confidence: 'high' },
      }),
      documentId: 'doc-bc',
      sourceFileName: 'bc-hydro.pdf',
      importBatchId: 'document-doc-bc',
      organizationId: 'org-1',
      conversionFactors: [
        {
          id: 'factor-electricity-bc-2025',
          organizationId: null,
          name: 'Electricity - British Columbia - 2025',
          type: 'EMISSION',
          activityType: 'ELECTRICITY',
          inputUnit: 'kWh',
          unit: 'kWh',
          factorValue: 0.02,
          resultUnit: 'kgCO2e/kWh',
          sourceYear: 2025,
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'British Columbia',
          isSystemDefault: true,
          isDefault: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ] as any,
    });

    expect(payload).toMatchObject({
      activityType: 'ELECTRICITY',
      quantity: 100,
      unit: ' KWH ',
      jurisdictionRegion: 'BC',
      sourceType: 'DOCUMENT_AI',
      matchingStatus: 'MATCHED',
      reportTreatment: 'INCLUDED',
      scope: 'SCOPE_2',
      matchedFactorId: 'factor-electricity-bc-2025',
      matchedFactorName: 'Electricity - British Columbia - 2025',
      matchedFactorSourceYear: 2025,
      calculatedEmissionsKgCO2e: 2,
      calculationStatus: 'CALCULATED',
      calculationMessage: 'Proxy factor · Review recommended. No exact 2026 factor was available. The nearest available factor was used for internal review only.',
    });
    expect(payload.notes).not.toMatch(/Missing Factor|No conversion factor/i);
    expect(payload.notes).toContain('Imported via PDF extraction. Source file: bc-hydro.pdf.');
    expect(payload.notes).not.toContain('Document ID');
  });

  it('uses the same canonical selector and evaluator for equivalent Excel and document electricity records', () => {
    const factors = [albertaElectricity2025Factor] as any;
    const excelEvaluation = evaluateActivityRecord({
      activityType: 'Electricity',
      quantity: 980,
      unit: 'kWh',
      jurisdictionCountry: 'Canada',
      jurisdictionRegion: 'Alberta',
      recordYear: 2026,
      organizationId: 'org-1',
      factors,
    });
    const documentPayload = buildDocumentImportActivityPayload({
      item: buildImportRow({
        activityType: { value: 'Electricity', confidence: 'high' },
        recordDate: { value: '2026-05-31', confidence: 'high' },
        quantity: { value: 980, confidence: 'high' },
        unit: { value: 'kWh', confidence: 'high' },
        jurisdictionCountry: { value: 'Canada', confidence: 'high' },
        jurisdictionRegion: { value: 'Alberta', confidence: 'high' },
      }),
      documentId: 'doc-enmax-electricity',
      sourceFileName: 'enmax-electricity.pdf',
      importBatchId: 'document-doc-enmax-electricity',
      organizationId: 'org-1',
      conversionFactors: factors,
    });

    expect(excelEvaluation).toMatchObject({
      activityType: 'ELECTRICITY',
      normalizedUnit: 'kWh',
      matchingStatus: 'MATCHED',
      calculationStatus: 'CALCULATED',
      reportTreatment: 'INCLUDED',
      matchedFactorName: 'Electricity - Alberta',
      matchedFactorSourceYear: 2025,
      calculatedEmissionsKgCO2e: 519.4,
    });
    expect(documentPayload).toMatchObject({
      activityType: 'ELECTRICITY',
      unit: 'kWh',
      jurisdictionRegion: 'Alberta',
      matchingStatus: excelEvaluation.matchingStatus,
      calculationStatus: excelEvaluation.calculationStatus,
      reportTreatment: excelEvaluation.reportTreatment,
      matchedFactorId: excelEvaluation.matchedFactorId,
      matchedFactorName: excelEvaluation.matchedFactorName,
      matchedFactorValue: 0.53,
      matchedFactorUnit: 'kgCO2e/kWh',
      matchedFactorSourceYear: 2025,
      matchedFactorVersion: 'v1.0',
      matchedFactorSourceAuthority: LEGITIMATE_OFFICIAL_FACTOR.sourceAuthority,
      matchedFactorSourceDocument: LEGITIMATE_OFFICIAL_FACTOR.sourceDocument,
      matchedFactorVerificationStatus: 'INTERNAL_REVIEW_REQUIRED',
      matchedFactorConfidenceLevel: 'LOW',
      factorSelectionReason: 'PRIOR_YEAR_FALLBACK',
      calculatedEmissionsKgCO2e: excelEvaluation.calculatedEmissionsKgCO2e,
    });
    expect(documentPayload.notes).not.toMatch(/Missing Factor/i);
  });

  it('calculates document electricity quantities generically without depending on the golden 980 kWh row', () => {
    const payload = buildDocumentImportActivityPayload({
      item: buildImportRow({
        activityType: { value: 'Electric Utility', confidence: 'high' },
        recordDate: { value: '2026-05-31', confidence: 'high' },
        quantity: { value: 500, confidence: 'high' },
        unit: { value: 'kwh', confidence: 'high' },
        jurisdictionCountry: { value: 'Canada', confidence: 'high' },
        jurisdictionRegion: { value: 'AB', confidence: 'high' },
      }),
      documentId: 'doc-enmax-electricity',
      sourceFileName: 'enmax-electricity.pdf',
      importBatchId: 'document-doc-enmax-electricity',
      organizationId: 'org-1',
      conversionFactors: [albertaElectricity2025Factor] as any,
    });

    expect(payload).toMatchObject({
      activityType: 'ELECTRICITY',
      matchingStatus: 'MATCHED',
      calculationStatus: 'CALCULATED',
      reportTreatment: 'INCLUDED',
      matchedFactorName: 'Electricity - Alberta',
      matchedFactorValue: 0.53,
      matchedFactorSourceYear: 2025,
      calculatedEmissionsKgCO2e: 265,
    });
  });

  it('preserves canonical spreadsheet lineage metadata in confirm import payloads', () => {
    const payload = buildDocumentImportActivityPayload({
      item: buildImportRow({
        documentFileName: 'carbonlite_needs_review_test.xlsx',
        activityType: { value: 'Electricity', confidence: 'high' },
        recordDate: { value: '2026-03-01', confidence: 'high' },
        quantity: { value: 980, confidence: 'high' },
        unit: { value: 'kWh', confidence: 'high' },
        jurisdictionCountry: { value: 'Canada', confidence: 'high' },
        jurisdictionRegion: { value: 'Alberta', confidence: 'high' },
        sourceReference: { value: 'MARCH-ELEC-001', confidence: 'high' },
        sourceSheetName: 'Messy_Operations',
        sourceRow: 2,
        costCad: '214.55',
        costCurrency: 'CAD',
      }),
      documentId: 'doc-golden-spreadsheet',
      sourceFileName: 'carbonlite_needs_review_test.xlsx',
      importBatchId: 'document-doc-golden-spreadsheet',
      organizationId: 'org-1',
      conversionFactors: [albertaElectricity2025Factor] as any,
    });

    expect(payload).toMatchObject({
      sourceReference: 'MARCH-ELEC-001',
      sourceFileName: 'carbonlite_needs_review_test.xlsx',
      sourceSheetName: 'Messy_Operations',
      sourceRow: 2,
      costCad: 214.55,
      costCurrency: 'CAD',
    });
  });

  it('prioritizes missing province over missing factor for document electricity rows', () => {
    const payload = buildDocumentImportActivityPayload({
      item: buildImportRow({
        activityType: { value: 'Electricity', confidence: 'high' },
        recordDate: { value: '2026-05-31', confidence: 'high' },
        quantity: { value: 500, confidence: 'high' },
        unit: { value: 'KWH', confidence: 'high' },
        jurisdictionCountry: { value: 'Canada', confidence: 'high' },
        jurisdictionRegion: { value: '', confidence: 'low' },
      }),
      documentId: 'doc-electricity-missing-province',
      sourceFileName: 'electricity-bill.pdf',
      importBatchId: 'document-doc-electricity-missing-province',
      organizationId: 'org-1',
      conversionFactors: [albertaElectricity2025Factor] as any,
    });

    expect(payload).toMatchObject({
      activityType: 'ELECTRICITY',
      matchingStatus: 'MISSING_PROVINCE',
      calculationStatus: 'MISSING_PROVINCE',
      reportTreatment: 'EXCLUDED',
      calculatedEmissionsKgCO2e: undefined,
    });
    expect(payload.calculationMessage).toContain('province');
    expect(payload.calculationMessage).not.toMatch(/Missing Factor|No matching emission factor/i);
  });

  it.each(['kWh', 'KWH', 'kwh'])('normalizes %s document electricity units for factor matching', (unit) => {
    const payload = buildDocumentImportActivityPayload({
      item: buildImportRow({
        activityType: { value: 'Power', confidence: 'high' },
        recordDate: { value: '2026-05-31', confidence: 'high' },
        quantity: { value: 500, confidence: 'high' },
        unit: { value: unit, confidence: 'high' },
        jurisdictionCountry: { value: 'Canada', confidence: 'high' },
        jurisdictionRegion: { value: 'Alberta', confidence: 'high' },
      }),
      documentId: `doc-electricity-${unit}`,
      sourceFileName: 'electricity-bill.pdf',
      importBatchId: `document-doc-electricity-${unit}`,
      organizationId: 'org-1',
      conversionFactors: [albertaElectricity2025Factor] as any,
    });

    expect(payload).toMatchObject({
      activityType: 'ELECTRICITY',
      matchingStatus: 'MATCHED',
      calculationStatus: 'CALCULATED',
      matchedFactorName: 'Electricity - Alberta',
      calculatedEmissionsKgCO2e: 265,
    });
  });

  it('uses service period year instead of upload or record date for imported bill factor matching', () => {
    const payload = buildDocumentImportActivityPayload({
      item: buildImportRow({
        activityType: { value: 'Electricity', confidence: 'high' },
        recordDate: { value: '2026-01-15', confidence: 'low' },
        periodEndDate: '2025-07-09',
        quantity: { value: 358, confidence: 'high' },
        unit: { value: 'kWh', confidence: 'high' },
        jurisdictionCountry: { value: 'Canada', confidence: 'high' },
        jurisdictionRegion: { value: 'Alberta', confidence: 'high' },
      }),
      documentId: 'doc-enmax',
      sourceFileName: 'enmax-2025-bill.pdf',
      importBatchId: 'document-doc-enmax',
      organizationId: 'org-1',
      conversionFactors: [
        {
          id: 'eccc-electricity-ab-2025',
          organizationId: null,
          name: 'Electricity - Alberta - 2025 Reference',
          type: 'EMISSION',
          activityType: 'ELECTRICITY',
          inputUnit: 'kWh',
          unit: 'kWh',
          factorValue: 0.49,
          resultUnit: 'kgCO2e/kWh',
          sourceYear: 2025,
          effectiveYear: 2025,
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Alberta',
          isSystemDefault: true,
          isDefault: false,
        },
        {
          id: 'eccc-electricity-ab-2026',
          organizationId: null,
          name: 'Electricity - Alberta - 2026 Reference',
          type: 'EMISSION',
          activityType: 'ELECTRICITY',
          inputUnit: 'kWh',
          unit: 'kWh',
          factorValue: 0.438,
          resultUnit: 'kgCO2e/kWh',
          sourceYear: 2026,
          effectiveYear: 2026,
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Alberta',
          isSystemDefault: true,
          isDefault: true,
        },
      ] as any,
    });

    expect(payload).toMatchObject({
      recordDate: '2026-01-15',
      recordYear: 2025,
      matchedFactorId: 'eccc-electricity-ab-2025',
      matchedFactorSourceYear: 2025,
      calculatedEmissionsKgCO2e: 175.42,
      calculationStatus: 'CALCULATED',
    });
  });

  it('keeps unsupported imported electricity provinces as missing factor metadata', () => {
    const payload = buildDocumentImportActivityPayload({
      item: buildImportRow({
        activityType: { value: 'ELECTRICITY', confidence: 'high' },
        quantity: { value: 100, confidence: 'high' },
        unit: { value: 'kWh', confidence: 'high' },
        jurisdictionCountry: { value: 'Canada', confidence: 'high' },
        jurisdictionRegion: { value: 'Saskatchewan', confidence: 'high' },
      }),
      documentId: 'doc-sk',
      sourceFileName: 'sk-power.pdf',
      importBatchId: 'document-doc-sk',
      conversionFactors: [],
    });

    expect(payload).toMatchObject({
      activityType: 'ELECTRICITY',
      jurisdictionRegion: 'Saskatchewan',
      matchingStatus: 'MISSING_FACTOR',
      reportTreatment: 'EXCLUDED',
      calculationStatus: 'MISSING_FACTOR',
    });
  });
});

describe('document table formatting', () => {
  it('formats created timestamps for compact Input Review display', () => {
    expect(formatDocumentCreatedAt('2026-07-03T01:12:30')).toBe('2026-07-03 01:12');
    expect(formatDocumentCreatedAt('not-a-date')).toBe('not-a-date');
    expect(formatDocumentCreatedAt(null)).toBe('-');
  });
});

describe('import row validation', () => {
  it('requires unit before import', () => {
    expect(
      getImportValidationIssues([
        buildImportRow({ unit: { value: '', confidence: 'low' } }),
      ]),
    ).toEqual([
      {
        rowIndex: 0,
        field: 'unit',
        message: 'Unit is required.',
      },
    ]);
  });

  it('treats literal null unit values as missing before import', () => {
    expect(
      getImportValidationIssues([
        buildImportRow({ unit: { value: 'null', confidence: 'low' } }),
      ]),
    ).toEqual([
      {
        rowIndex: 0,
        field: 'unit',
        message: 'Unit is required.',
      },
    ]);
  });

  it('treats numeric OCR unit values as invalid before import', () => {
    expect(
      getImportValidationIssues([
        buildImportRow({ unit: { value: '20', confidence: 'low' } }),
      ]),
    ).toEqual([
      {
        rowIndex: 0,
        field: 'unit',
        message: 'Invalid unit detected. Please review this record.',
      },
    ]);
  });

  it('requires quantity before import', () => {
    expect(
      getImportValidationIssues([
        buildImportRow({ quantity: { value: null, confidence: 'low' } }),
      ]),
    ).toEqual([
      {
        rowIndex: 0,
        field: 'quantity',
        message: 'Quantity is required.',
      },
    ]);
  });

  it('returns multiple required-field errors with row numbers preserved', () => {
    expect(
      getImportValidationIssues([
        buildImportRow({ activityType: { value: '', confidence: 'low' } }),
        buildImportRow({
          recordDate: { value: '', confidence: 'low' },
          unit: { value: '', confidence: 'low' },
        }),
      ]),
    ).toEqual([
      {
        rowIndex: 0,
        field: 'activityType',
        message: 'Activity type is required.',
      },
      {
        rowIndex: 1,
        field: 'unit',
        message: 'Unit is required.',
      },
      {
        rowIndex: 1,
        field: 'recordDate',
        message: 'Record date is required.',
      },
    ]);
  });

  it('requires record date before import', () => {
    expect(
      getImportValidationIssues([
        buildImportRow({ recordDate: { value: null, confidence: 'low' } }),
      ]),
    ).toEqual([
      {
        rowIndex: 0,
        field: 'recordDate',
        message: 'Record date is required.',
      },
    ]);
  });

  it('allows valid selected rows', () => {
    expect(getImportValidationIssues([buildImportRow()])).toEqual([]);
  });

  it('marks unsupported pilot activity types before import', () => {
    expect(
      getImportValidationIssues([
        buildImportRow({ activityType: { value: 'WASTE', confidence: 'medium' } }),
      ]),
    ).toEqual([
      {
        rowIndex: 0,
        field: 'activityType',
        message:
          'Unsupported Activity Type: This activity type is not supported in the current CarbonLite pilot.',
      },
    ]);
  });
});

describe('formatSourceReference', () => {
  it('keeps string source references readable', () => {
    expect(formatSourceReference('Central Alberta Water GHG.pdf')).toBe(
      'Central Alberta Water GHG.pdf',
    );
  });

  it('formats object source references without rendering raw objects', () => {
    const result = formatSourceReference({
      fileName: 'Central Alberta Water GHG.pdf',
      pageNumber: 2,
    });

    expect(result).toBe('Central Alberta Water GHG.pdf - Page 2');
    expect(result).not.toContain('[object Object]');
  });

  it('does not invent source review status when object metadata has no filename', () => {
    expect(formatSourceReference({ value: { page: 2 } })).toBe('');
  });

  it('uses the uploaded filename when source reference is missing', () => {
    expect(formatSourceReference(undefined, 'uploaded-bill.pdf')).toBe(
      'uploaded-bill.pdf',
    );
  });

  it('uses source-type labels based on uploaded file extension', () => {
    expect(formatDocumentSourceTypeLabel({ fileName: 'Golden Test Data.xlsx' })).toBe(
      'Spreadsheet import',
    );
    expect(formatDocumentSourceTypeLabel({ fileName: 'utility.pdf' })).toBe('PDF extraction');
    expect(formatDocumentSourceTypeLabel({ fileName: '' })).toBe('Source information needed');
  });
});

describe('getDocumentDownloadUrl', () => {
  it('uses the backend document download endpoint instead of frontend uploads paths', () => {
    const url = getDocumentDownloadUrl('doc-123');

    expect(url).toContain('/api/documents/doc-123/download');
    expect(url).not.toContain('/uploads/');
  });
});

describe('resolveActivityRecordDate', () => {
  it('keeps extracted record dates as confirmed dates', () => {
    expect(
      resolveActivityRecordDate({
        recordDate: '2026-05-29',
        extractedDocumentDate: '2026-05-20',
        uploadDate: '2026-05-30T10:00:00.000Z',
      }),
    ).toEqual({
      value: '2026-05-29',
      dateEstimated: false,
      label: '2026-05-29',
    });
  });

  it('uses extracted document date fallback as estimated', () => {
    expect(
      resolveActivityRecordDate({
        recordDate: '',
        extractedDocumentDate: '2026-05-20',
        uploadDate: '2026-05-30T10:00:00.000Z',
      }),
    ).toEqual({
      value: '2026-05-20',
      dateEstimated: true,
      label: '2026-05-20 (estimated)',
    });
  });

  it('uses upload date fallback as estimated when extraction has no date', () => {
    expect(
      resolveActivityRecordDate({
        recordDate: null,
        extractedDocumentDate: null,
        uploadDate: '2026-05-29T18:30:00.000Z',
      }),
    ).toEqual({
      value: '2026-05-29',
      dateEstimated: true,
      label: '2026-05-29 (estimated)',
    });
  });

  it('uses current local date fallback as estimated when no source date exists', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-26T12:00:00.000-06:00'));

    expect(resolveActivityRecordDate({})).toEqual({
      value: '2026-07-26',
      dateEstimated: true,
      label: '2026-07-26 (estimated)',
    });
    vi.useRealTimers();
  });
});

describe('document upload action model', () => {
  it('shows uploaded documents with details, download, extract, and delete actions', () => {
    const model = getDocumentActionModel({ status: 'UPLOADED' });

    expect(model.statusLabel).toBe('Uploaded');
    expect(model.primaryAction).toMatchObject({
      kind: 'extract',
      label: 'Extract',
    });
    expect(model.menuActions.map((action) => action.label)).toEqual([
      'View Details',
      'Download Source File',
      'Delete Source Document',
    ]);
  });

  it('processed documents no longer show Extract as the primary action', () => {
    const model = getDocumentActionModel({
      status: 'PROCESSED',
      hasPreview: true,
      canImport: true,
    });

    expect(model.statusLabel).toBe('Ready for Review');
    expect(model.primaryAction).toMatchObject({
      kind: 'preview',
      label: 'Review Rows',
    });
    expect(model.primaryAction.label).not.toBe('Extract');
    expect(model.menuActions.map((action) => action.label)).toEqual([
      'View Details',
      'Download Source File',
      'Import',
      'Re-extract',
      'Delete Source Document',
    ]);
  });

  it('imported documents no longer show Import or Extract actions', () => {
    const model = getDocumentActionModel({
      status: 'IMPORTED',
      canImport: true,
      hasPreview: true,
    });

    expect(model.statusLabel).toBe('Imported');
    expect(model.primaryAction).toMatchObject({
      kind: 'viewRecords',
      label: 'View Imported Records',
    });
    expect(model.menuActions.map((action) => action.label)).toEqual([
      'View Details',
      'Download Source File',
      'Delete Source Document',
    ]);
    expect(model.menuActions.map((action) => action.label)).not.toContain('Import');
    expect(model.menuActions.map((action) => action.label)).not.toContain('Extract');
  });

  it('failed documents show Retry Extraction and Delete', () => {
    const model = getDocumentActionModel({ status: 'EXTRACTION_FAILED' });

    expect(model.statusLabel).toBe('Needs Attention');
    expect(model.primaryAction).toMatchObject({
      kind: 'reextract',
      label: 'Retry Extraction',
      title: 'Run extraction again',
    });
    expect(model.menuActions.map((action) => action.label)).toEqual(['Delete Source Document']);
  });

  it('file missing documents show Upload Again and direct Delete actions', () => {
    const model = getDocumentActionModel({ status: 'FILE_MISSING' });

    expect(model.statusLabel).toBe('Re-upload Required');
    expect(model.primaryAction).toMatchObject({
      kind: 'uploadAgain',
      label: 'Upload Again',
      title: FILE_MISSING_TOOLTIP,
    });
    expect(model.menuActions.map((action) => action.label)).toEqual(['Delete Source Document']);
  });

  it('handles backend REUPLOAD_REQUIRED status the same as FILE_MISSING', () => {
    const model = getDocumentActionModel({ status: 'REUPLOAD_REQUIRED' });

    expect(model.statusLabel).toBe('Re-upload Required');
    expect(model.primaryAction).toMatchObject({
      kind: 'uploadAgain',
      label: 'Upload Again',
      title: FILE_MISSING_TOOLTIP,
    });
    expect(model.menuActions.map((action) => action.label)).toEqual(['Delete Source Document']);
    expect(FILE_MISSING_EXPLANATION).toContain(
      'system updates or temporary storage cleanup',
    );
  });

  it('replaces technical status labels with user-friendly labels', () => {
    expect(getDocumentStatusLabel('PROCESSED')).toBe('Ready for Review');
    expect(getDocumentStatusLabel('IMPORTED')).toBe('Imported');
    expect(getDocumentStatusLabel('FAILED')).toBe('Needs Attention');
    expect(getDocumentStatusLabel('FILE_MISSING')).toBe('Re-upload Required');
    expect(getDocumentStatusLabel('REUPLOAD_REQUIRED')).toBe('Re-upload Required');
  });
});

describe('document report eligibility', () => {
  it.each([
    { status: 'IMPORTED', importedRecordCount: 5, eligible: true },
    { status: 'REVIEW_REQUIRED', importedRecordCount: 3, eligible: true },
    { status: 'REVIEW_REQUIRED', importedRecordCount: 0, eligible: false },
    { status: 'IMPORTED', importedRecordCount: 0, eligible: false },
    { status: 'IMPORTED', importedRecordCount: null, eligible: false },
    { status: 'REVIEW_REQUIRED', importedRecordCount: undefined, eligible: false },
  ])('uses linked records for $status with count $importedRecordCount', ({ eligible, ...document }) => {
    expect(hasImportedRecords(document)).toBe(eligible);
  });
});
