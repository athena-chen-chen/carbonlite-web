import {
  FILE_MISSING_EXPLANATION,
  FILE_MISSING_TOOLTIP,
  formatSourceReference,
  formatDocumentSourceTypeLabel,
  formatDocumentCreatedAt,
  formatDuplicateDocumentMessage,
  getDocumentActionModel,
  getDocumentStatusLabel,
  getDocumentDownloadUrl,
  getImportValidationIssues,
  buildDraftRowAuditSummary,
  resolveActivityRecordDate,
  buildDocumentImportActivityPayload,
} from './UploadPage';

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
      matchingStatus: 'MATCHED',
      reportTreatment: 'INCLUDED',
      scope: 'SCOPE_2',
      matchedFactorId: 'factor-electricity-bc-2025',
      matchedFactorName: 'Electricity - British Columbia - 2025',
      matchedFactorSourceYear: 2025,
      calculatedEmissionsKgCO2e: 2,
      calculationStatus: 'CALCULATED',
      calculationMessage: 'Matched factor. Using latest available factor year: 2025.',
    });
    expect(payload.notes).not.toMatch(/Missing Factor|No conversion factor/i);
    expect(payload.notes).toContain('Imported via PDF extraction. Source file: bc-hydro.pdf.');
    expect(payload.notes).not.toContain('Document ID');
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

  it('falls back to source review when object metadata has no filename', () => {
    expect(formatSourceReference({ value: { page: 2 } })).toBe('Source review required');
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
    expect(formatDocumentSourceTypeLabel({ fileName: '' })).toBe('Source review required');
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
  it('shows uploaded documents with View, Extract, and Delete actions', () => {
    const model = getDocumentActionModel({ status: 'UPLOADED' });

    expect(model.statusLabel).toBe('Uploaded');
    expect(model.primaryAction).toMatchObject({
      kind: 'extract',
      label: 'Extract',
    });
    expect(model.menuActions.map((action) => action.label)).toEqual([
      'View',
      'Delete',
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
      'View',
      'Import',
      'Re-extract',
      'Delete',
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
      'View',
      'Delete',
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
    expect(model.menuActions.map((action) => action.label)).toEqual(['Delete']);
  });

  it('file missing documents show Upload Again and direct Delete actions', () => {
    const model = getDocumentActionModel({ status: 'FILE_MISSING' });

    expect(model.statusLabel).toBe('Re-upload Required');
    expect(model.primaryAction).toMatchObject({
      kind: 'uploadAgain',
      label: 'Upload Again',
      title: FILE_MISSING_TOOLTIP,
    });
    expect(model.menuActions.map((action) => action.label)).toEqual(['Delete']);
  });

  it('handles backend REUPLOAD_REQUIRED status the same as FILE_MISSING', () => {
    const model = getDocumentActionModel({ status: 'REUPLOAD_REQUIRED' });

    expect(model.statusLabel).toBe('Re-upload Required');
    expect(model.primaryAction).toMatchObject({
      kind: 'uploadAgain',
      label: 'Upload Again',
      title: FILE_MISSING_TOOLTIP,
    });
    expect(model.menuActions.map((action) => action.label)).toEqual(['Delete']);
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
