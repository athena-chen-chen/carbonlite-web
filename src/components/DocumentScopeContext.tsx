import { Link } from 'react-router-dom';

type DocumentScopeContextProps = {
  selectedDocumentIds: string[];
  importedRecordCount: number;
  sourceFileNames?: string[];
  sourceReview: { available: boolean; sourceFiles: string[]; needsReviewCount: number };
  loading: boolean;
  destination: 'calculations' | 'report';
};

export function DocumentScopeContext({ selectedDocumentIds, importedRecordCount, sourceFileNames = [], sourceReview, loading, destination }: DocumentScopeContextProps) {
  const files = Array.from(new Set([
    ...sourceFileNames,
    ...sourceReview.sourceFiles,
  ]));

  return (
    <section aria-label="Document review scope" style={{ marginBottom: 20, padding: 16, border: '1px solid #e2e8f0', borderRadius: 12, background: '#f8fafc', color: '#334155' }}>
      <h2 style={{ margin: '0 0 8px', fontSize: 16 }}>Review scope</h2>
      <p style={{ margin: '0 0 8px', overflowWrap: 'anywhere' }}>{loading ? 'Loading selected documents…' : files.length ? files.join(', ') : `${selectedDocumentIds.length} selected documents`}</p>
      <p style={{ margin: '0 0 8px' }}>
        Imported records: {loading ? 'Loading…' : importedRecordCount}
        {' · '}Unresolved source rows: {loading ? 'Loading…' : sourceReview.available ? sourceReview.needsReviewCount : 'Not available'}
      </p>
      <p style={{ margin: '0 0 8px', fontSize: 14 }}>Calculations and reports include imported records only. Unresolved source rows remain excluded until corrected and imported.</p>
      <Link style={destination === 'report' ? { display: 'inline-block', padding: '10px 16px', borderRadius: 8, background: '#047857', color: '#fff', fontWeight: 700, textDecoration: 'none' } : undefined} to={destination === 'report' ? '/reports' : '/metrics-summary'} state={{ reportScope: 'selectedDocuments', selectedDocumentIds }}>
        {destination === 'report' ? 'Generate Report' : 'View Calculation Results'}
      </Link>
    </section>
  );
}
