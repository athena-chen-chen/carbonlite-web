import { formatSourceReference, getDocumentDownloadUrl } from './UploadPage';

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
