import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { getAuditLogs, type AuditLogItem, type AuditLogQuery } from '../services/auditLogs';
import {
  EVENT_LOG_PERIODS, getEventLogDateRange, formatEventLogDateTime, validateEventLogCustomRange,
  type EventLogPeriod, type EventLogDateRange,
} from '../utils/eventLogDateRange';

const commonActions = [
  '',
  'CREATE_ACTIVITY_RECORD',
  'UPDATE_ACTIVITY_RECORD',
  'DELETE_ACTIVITY_RECORD',
  'BULK_DELETE_ACTIVITY_RECORDS',
  'UPLOAD_DOCUMENT',
  'DELETE_DOCUMENT',
  'EXTRACT_DOCUMENT',
  'FILE_UPLOADED',
  'DATA_EXTRACTED',
  'RECORDS_IMPORTED',
  'REPORT_GENERATED',
  'CSV_EXPORTED',
  'IMPORT_FAILED',
  'REPORT_GENERATION_FAILED',
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
  const [period, setPeriod] = useState<EventLogPeriod>('TODAY');
  const [effectiveRange, setEffectiveRange] = useState(() => getEventLogDateRange('TODAY', new Date()));
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initialSearchStarted = useRef(false);
  const mounted = useRef(false);
  const requestId = useRef(0);
  const custom = useMemo(() => validateEventLogCustomRange(dateFrom, dateTo, effectiveRange), [dateFrom, dateTo, effectiveRange]);
  const dateError = period === 'CUSTOM' ? custom.error : null;

  useEffect(() => {
    mounted.current = true;
    // StrictMode replays effects. Reuse the intended initial request rather than
    // issuing a second search; its result can still update the mounted page.
    if (!initialSearchStarted.current) {
      initialSearchStarted.current = true;
      void loadAuditLogs(effectiveRange, { action: '', entityType: '', search: '' });
    }
    return () => { mounted.current = false; };
  }, []);

  async function loadAuditLogs(range: EventLogDateRange, filters: AuditLogQuery) {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const response = await getAuditLogs({ ...filters, dateFrom: range.start, dateTo: range.end });
      if (mounted.current && currentRequest === requestId.current) setItems(response.items);
    } catch {
      if (mounted.current && currentRequest === requestId.current) setError('Unable to load audit logs. Please try again.');
    } finally {
      if (mounted.current && currentRequest === requestId.current) setLoading(false);
    }
  }

  function selectPeriod(next: EventLogPeriod) {
    if (next === 'CUSTOM') {
      setDateFrom(formatEventLogDateTime(effectiveRange.start));
      setDateTo(formatEventLogDateTime(effectiveRange.end));
    } else {
      setEffectiveRange(getEventLogDateRange(next, new Date()));
    }
    setPeriod(next);
  }

  function searchLogs() {
    const range = period === 'CUSTOM' ? custom.range : getEventLogDateRange(period, new Date());
    if (!range) return;
    setEffectiveRange(range);
    void loadAuditLogs(range, { action, entityType, search });
  }

  function resetFilters() {
    const range = getEventLogDateRange('TODAY', new Date());
    setPeriod('TODAY');
    setDateFrom('');
    setDateTo('');
    setAction('');
    setEntityType('');
    setSearch('');
    setEffectiveRange(range);
    void loadAuditLogs(range, { action: '', entityType: '', search: '' });
  }

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Audit Log</h1>
          <p style={subtitleStyle}>Trace important CarbonLite user actions. Logs are read-only.</p>
        </div>
      </div>

      <form style={filterCardStyle} noValidate onSubmit={(event) => { event.preventDefault(); searchLogs(); }} aria-label="Event log filters">
        <label style={labelStyle}>
          Date range
          <select title="Mountain Time (America/Edmonton)" value={period} onChange={(event) => selectPeriod(event.target.value as EventLogPeriod)} style={inputStyle}>
            {EVENT_LOG_PERIODS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        {period === 'CUSTOM' ? (
          <div style={{ gridColumn: '1 / -1' }}>
            <p id="event-log-timezone" style={subtitleStyle}>Mountain Time (America/Edmonton). Repeated fall-back times use the first occurrence when edited.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
              <label style={labelStyle}>
                Start date/time
                <input type="datetime-local" step="0.001" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} style={inputStyle} aria-describedby="event-log-timezone event-log-date-error" aria-invalid={Boolean(dateError)} />
              </label>
              <label style={labelStyle}>
                End date/time
                <input type="datetime-local" step="0.001" value={dateTo} onChange={(event) => setDateTo(event.target.value)} style={inputStyle} aria-describedby="event-log-timezone event-log-date-error" aria-invalid={Boolean(dateError)} />
              </label>
            </div>
            {dateError ? <p id="event-log-date-error" role="alert" style={{ color: '#991b1b' }}>{dateError}</p> : null}
          </div>
        ) : null}
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
            placeholder="User, action, description"
            style={inputStyle}
          />
        </label>
        <div style={{ display: 'flex', alignItems: 'end', gap: 8 }}>
          <button type="submit" disabled={loading || Boolean(dateError)} style={filterButtonStyle}>Search</button>
          <button type="button" onClick={resetFilters} style={filterButtonStyle}>Reset</button>
        </div>
      </form>

      {error ? <div style={errorStyle}>{error}</div> : null}

      <div style={cardStyle}>
        {loading ? (
          <div style={emptyStyle}>Loading audit logs...</div>
        ) : error ? null : items.length === 0 ? (
          <div style={{ ...emptyStyle, fontSize: 20, fontWeight: 700 }}>No Events Found</div>
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
                    <td style={tdStyle}>{item.entityType || '-'}</td>
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
              <Detail label="Entity" value={selected.entityType || '-'} />
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
const labelStyle: CSSProperties = { minWidth: 0, display: 'grid', gap: 6, fontSize: 13, fontWeight: 700, color: '#334155' };
const inputStyle: CSSProperties = { minWidth: 0, width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 10px', fontSize: 14, background: '#fff' };
const filterButtonStyle: CSSProperties = { ...inputStyle, width: 'auto', cursor: 'pointer', fontWeight: 700 };
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
