import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { getAuditLogs, type AuditLogItem } from '../services/auditLogs';

const commonActions = [
  '',
  'CREATE_ACTIVITY_RECORD',
  'UPDATE_ACTIVITY_RECORD',
  'DELETE_ACTIVITY_RECORD',
  'BULK_DELETE_ACTIVITY_RECORDS',
  'UPLOAD_DOCUMENT',
  'DELETE_DOCUMENT',
  'EXTRACT_DOCUMENT',
  'CREATE_CONVERSION_FACTOR',
  'UPDATE_CONVERSION_FACTOR',
  'DELETE_CONVERSION_FACTOR',
  'GENERATE_REPORT',
  'EXPORT_PDF',
  'GENERATE_METRICS_SUMMARY',
  'LOGIN',
  'LOGOUT',
];

const commonEntityTypes = [
  '',
  'ActivityData',
  'Document',
  'ConversionFactor',
  'Report',
  'MetricResult',
  'Authentication',
];

export function AuditLogPage() {
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [selected, setSelected] = useState<AuditLogItem | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(
    () => ({ dateFrom, dateTo, action, entityType, search }),
    [dateFrom, dateTo, action, entityType, search],
  );

  useEffect(() => {
    void loadAuditLogs();
  }, [query]);

  async function loadAuditLogs() {
    setLoading(true);
    setError(null);

    try {
      const response = await getAuditLogs(query);
      setItems(response.items);
    } catch {
      setError('Unable to load audit logs. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Audit Log</h1>
          <p style={subtitleStyle}>Trace important CarbonLite user actions. Logs are read-only.</p>
        </div>
      </div>

      <div style={filterCardStyle}>
        <label style={labelStyle}>
          Date from
          <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Date to
          <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Action
          <select value={action} onChange={(event) => setAction(event.target.value)} style={inputStyle}>
            {commonActions.map((item) => (
              <option key={item || 'all'} value={item}>{item ? formatAction(item) : 'All actions'}</option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>
          Entity type
          <select value={entityType} onChange={(event) => setEntityType(event.target.value)} style={inputStyle}>
            {commonEntityTypes.map((item) => (
              <option key={item || 'all'} value={item}>{item || 'All entities'}</option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>
          Search
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="User, entity id, description"
            style={inputStyle}
          />
        </label>
      </div>

      {error ? <div style={errorStyle}>{error}</div> : null}

      <div style={cardStyle}>
        {loading ? (
          <div style={emptyStyle}>Loading audit logs...</div>
        ) : items.length === 0 ? (
          <div style={emptyStyle}>No audit logs found.</div>
        ) : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>User</th>
                  <th style={thStyle}>Action</th>
                  <th style={thStyle}>Entity</th>
                  <th style={thStyle}>Description</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} onClick={() => setSelected(item)} style={rowStyle}>
                    <td style={tdStyle}>{formatDate(item.createdAt)}</td>
                    <td style={tdStyle}>{item.user?.email || item.userId || '-'}</td>
                    <td style={tdStyle}>{formatAction(item.action)}</td>
                    <td style={tdStyle}>{item.entityType}{item.entityId ? ` · ${item.entityId}` : ''}</td>
                    <td style={tdStyle}>{item.description || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected ? (
        <div style={overlayStyle} role="dialog" aria-modal="true" aria-labelledby="audit-detail-title">
          <div style={modalStyle}>
            <div style={modalHeaderStyle}>
              <h2 id="audit-detail-title" style={modalTitleStyle}>Audit Log Detail</h2>
              <button type="button" onClick={() => setSelected(null)} style={closeButtonStyle} aria-label="Close audit detail">×</button>
            </div>
            <dl style={detailGridStyle}>
              <Detail label="Timestamp" value={formatDate(selected.createdAt)} />
              <Detail label="User" value={selected.user?.email || selected.userId || '-'} />
              <Detail label="Organization" value={selected.organization?.name || selected.organizationId || '-'} />
              <Detail label="Action" value={formatAction(selected.action)} />
              <Detail label="Entity" value={`${selected.entityType}${selected.entityId ? ` · ${selected.entityId}` : ''}`} />
              <Detail label="Description" value={selected.description || '-'} />
            </dl>
            <div style={jsonGridStyle}>
              <JsonBlock title="Old Value" value={selected.oldValue} />
              <JsonBlock title="New Value" value={selected.newValue} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt style={detailLabelStyle}>{label}</dt>
      <dd style={detailValueStyle}>{value}</dd>
    </>
  );
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div>
      <h3 style={jsonTitleStyle}>{title}</h3>
      <pre style={preStyle}>{value ? JSON.stringify(value, null, 2) : '-'}</pre>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatAction(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const pageStyle: CSSProperties = { maxWidth: 1180, margin: '0 auto', padding: '0 24px 48px' };
const headerStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, marginBottom: 20 };
const titleStyle: CSSProperties = { margin: 0, color: '#0f172a' };
const subtitleStyle: CSSProperties = { margin: '8px 0 0', color: '#64748b' };
const filterCardStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', padding: 16, marginBottom: 16 };
const labelStyle: CSSProperties = { display: 'grid', gap: 6, fontSize: 13, fontWeight: 700, color: '#334155' };
const inputStyle: CSSProperties = { border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 10px', fontSize: 14, background: '#fff' };
const cardStyle: CSSProperties = { border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', overflow: 'hidden' };
const tableWrapStyle: CSSProperties = { overflowX: 'auto' };
const tableStyle: CSSProperties = { width: '100%', borderCollapse: 'collapse' };
const thStyle: CSSProperties = { textAlign: 'left', padding: '13px 14px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', color: '#0f172a', fontSize: 13 };
const tdStyle: CSSProperties = { padding: '14px', borderBottom: '1px solid #e2e8f0', color: '#334155', verticalAlign: 'top', fontSize: 14 };
const rowStyle: CSSProperties = { cursor: 'pointer' };
const emptyStyle: CSSProperties = { padding: 28, color: '#64748b', textAlign: 'center' };
const errorStyle: CSSProperties = { border: '1px solid #fecaca', borderRadius: 8, background: '#fef2f2', color: '#991b1b', padding: '10px 12px', marginBottom: 12, fontWeight: 700 };
const overlayStyle: CSSProperties = { position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.45)', padding: 20 };
const modalStyle: CSSProperties = { width: 'min(880px, 100%)', maxHeight: '90vh', overflow: 'auto', borderRadius: 12, border: '1px solid #dbe4ea', background: '#fff', boxShadow: '0 24px 60px rgba(15, 23, 42, 0.25)', padding: 24 };
const modalHeaderStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', marginBottom: 18 };
const modalTitleStyle: CSSProperties = { margin: 0, color: '#0f172a' };
const closeButtonStyle: CSSProperties = { border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', color: '#334155', fontSize: 22, lineHeight: 1, width: 34, height: 34, cursor: 'pointer' };
const detailGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: '150px 1fr', gap: '10px 14px', marginBottom: 18 };
const detailLabelStyle: CSSProperties = { margin: 0, color: '#64748b', fontWeight: 700 };
const detailValueStyle: CSSProperties = { margin: 0, color: '#0f172a' };
const jsonGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 };
const jsonTitleStyle: CSSProperties = { margin: '0 0 8px', color: '#0f172a', fontSize: 15 };
const preStyle: CSSProperties = { minHeight: 120, margin: 0, padding: 12, borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', overflow: 'auto', fontSize: 12 };
