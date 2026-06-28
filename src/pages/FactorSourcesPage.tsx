import { useEffect, useState } from 'react';
import {
  archiveFactorSource,
  FactorSource,
  getFactorSources,
} from '../services/factorSources';

const pageStyle: React.CSSProperties = {
  maxWidth: 1180,
  margin: '0 auto',
  padding: '0 24px',
};

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 10,
  overflow: 'hidden',
};

const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 16,
  margin: '18px 0',
  flexWrap: 'wrap',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '12px 14px',
  background: '#f8fafc',
  borderBottom: '1px solid #e5e7eb',
  fontSize: 13,
  color: '#334155',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 14px',
  borderBottom: '1px solid #eef2f7',
  verticalAlign: 'top',
  fontSize: 14,
};

const mutedStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: 13,
};

const buttonStyle: React.CSSProperties = {
  border: '1px solid #d1d5db',
  borderRadius: 8,
  background: '#fff',
  color: '#111827',
  padding: '8px 11px',
  fontWeight: 700,
  cursor: 'pointer',
};

const dangerButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  borderColor: '#fecaca',
  color: '#b91c1c',
};

function badgeStyle(source: FactorSource): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: 999,
    padding: '3px 8px',
    fontSize: 12,
    fontWeight: 700,
    background: source.isOfficial ? '#dcfce7' : '#ffedd5',
    color: source.isOfficial ? '#166534' : '#9a3412',
  };
}

export function FactorSourcesPage() {
  const [sources, setSources] = useState<FactorSource[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [archivingId, setArchivingId] = useState<string | null>(null);

  useEffect(() => {
    void loadSources();
  }, [includeArchived]);

  async function loadSources() {
    setLoading(true);
    setError('');
    try {
      const response = await getFactorSources(includeArchived);
      setSources(response.items);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load factor sources. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleArchive(source: FactorSource) {
    const confirmed = window.confirm(
      `Archive ${source.sourceShortName || source.sourceAuthority}? Existing historical factor links will remain available.`,
    );
    if (!confirmed) return;

    setArchivingId(source.id);
    setMessage('');
    setError('');
    try {
      const result = await archiveFactorSource(source.id);
      setMessage(
        result.archived
          ? `Source archived. ${result.usedByFactors} linked factor version(s) preserved.`
          : 'Unused source deleted.',
      );
      await loadSources();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to archive source. Please try again.',
      );
    } finally {
      setArchivingId(null);
    }
  }

  return (
    <section style={pageStyle}>
      <div>
        <h1 style={{ marginBottom: 6 }}>Factor Sources</h1>
        <p style={{ ...mutedStyle, maxWidth: 760 }}>
          Governed source registry for official emission factor publications.
          Factor values should only be marked verified after their source and
          methodology have been reviewed.
        </p>
      </div>

      <div style={toolbarStyle}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(event) => setIncludeArchived(event.target.checked)}
          />
          Include archived sources
        </label>
        <button type="button" onClick={loadSources} style={buttonStyle}>
          Refresh
        </button>
      </div>

      {message ? (
        <div style={successStyle}>{message}</div>
      ) : null}
      {error ? <div style={errorStyle}>{error}</div> : null}

      <div style={cardStyle}>
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Source</th>
                <th style={thStyle}>Document</th>
                <th style={thStyle}>Year</th>
                <th style={thStyle}>Publisher</th>
                <th style={thStyle}>Official</th>
                <th style={thStyle}>Active</th>
                <th style={thStyle}>Used By Factors</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td style={tdStyle} colSpan={8}>
                    Loading factor sources...
                  </td>
                </tr>
              ) : sources.length === 0 ? (
                <tr>
                  <td style={tdStyle} colSpan={8}>
                    No factor sources found.
                  </td>
                </tr>
              ) : (
                sources.map((source) => (
                  <tr key={source.id}>
                    <td style={tdStyle}>
                      <strong>{source.sourceShortName || source.sourceAuthority}</strong>
                      <div style={mutedStyle}>{source.sourceAuthority}</div>
                    </td>
                    <td style={tdStyle}>
                      <div>{source.sourceDocument}</div>
                      {source.sourceUrl ? (
                        <a
                          href={source.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#047857', fontWeight: 700 }}
                        >
                          Open source document
                        </a>
                      ) : null}
                    </td>
                    <td style={tdStyle}>{source.sourceYear || '-'}</td>
                    <td style={tdStyle}>
                      <div>{source.publisherType.replaceAll('_', ' ')}</div>
                      <div style={mutedStyle}>{source.trustLabel}</div>
                    </td>
                    <td style={tdStyle}>
                      <span style={badgeStyle(source)}>
                        {source.isOfficial ? 'Official' : 'Unverified'}
                      </span>
                    </td>
                    <td style={tdStyle}>{source.isActive ? 'Active' : 'Archived'}</td>
                    <td style={tdStyle}>{source.usedByFactors}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 8, whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          onClick={() => void handleArchive(source)}
                          disabled={!source.isActive || archivingId === source.id}
                          style={{
                            ...dangerButtonStyle,
                            opacity: !source.isActive ? 0.55 : 1,
                            cursor: !source.isActive ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {archivingId === source.id ? 'Archiving...' : 'Archive'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

const successStyle: React.CSSProperties = {
  marginBottom: 14,
  padding: '12px 14px',
  borderRadius: 8,
  border: '1px solid #bbf7d0',
  background: '#f0fdf4',
  color: '#166534',
  fontWeight: 700,
};

const errorStyle: React.CSSProperties = {
  marginBottom: 14,
  padding: '12px 14px',
  borderRadius: 8,
  border: '1px solid #fecaca',
  background: '#fef2f2',
  color: '#991b1b',
  fontWeight: 700,
};
