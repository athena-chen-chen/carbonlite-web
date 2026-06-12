import {
  formatSourceReference,
  formatDuplicateDocumentMessage,
  getDocumentActionModel,
  getDocumentStatusLabel,
  getDocumentDownloadUrl,
  resolveActivityRecordDate,
} from './UploadPage';

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

  it('falls back to PDF extraction for object metadata without a filename', () => {
    expect(formatSourceReference({ value: { page: 2 } })).toBe('PDF extraction');
  });

  it('uses the uploaded filename when source reference is missing', () => {
    expect(formatSourceReference(undefined, 'uploaded-bill.pdf')).toBe(
      'uploaded-bill.pdf',
    );
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

  it('returns a missing date label when no fallback exists', () => {
    expect(resolveActivityRecordDate({})).toEqual({
      value: '',
      dateEstimated: true,
      label: 'Missing date',
    });
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
      label: 'Preview Data',
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
      label: 'View Records',
    });
    expect(model.menuActions.map((action) => action.label)).toEqual([
      'View',
      'Delete',
    ]);
    expect(model.menuActions.map((action) => action.label)).not.toContain('Import');
    expect(model.menuActions.map((action) => action.label)).not.toContain('Extract');
  });

  it('failed documents show Retry Extract and Delete', () => {
    const model = getDocumentActionModel({ status: 'EXTRACTION_FAILED' });

    expect(model.statusLabel).toBe('Needs Attention');
    expect(model.primaryAction).toMatchObject({
      kind: 'reextract',
      label: 'Retry Extract',
      title: 'Run extraction again',
    });
    expect(model.menuActions.map((action) => action.label)).toEqual(['Delete']);
  });

  it('file missing documents require re-upload and disable extraction', () => {
    const model = getDocumentActionModel({ status: 'FILE_MISSING' });

    expect(model.statusLabel).toBe('Re-upload Required');
    expect(model.primaryAction).toMatchObject({
      kind: 'extract',
      label: 'Re-upload Required',
      disabled: true,
      title: 'This file is no longer available. Please upload it again.',
    });
    expect(model.menuActions.map((action) => action.label)).toEqual(['Delete']);
  });

  it('replaces technical status labels with user-friendly labels', () => {
    expect(getDocumentStatusLabel('PROCESSED')).toBe('Ready for Review');
    expect(getDocumentStatusLabel('IMPORTED')).toBe('Imported');
    expect(getDocumentStatusLabel('FAILED')).toBe('Needs Attention');
    expect(getDocumentStatusLabel('FILE_MISSING')).toBe('Re-upload Required');
  });
});
