import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  getActivityEvents,
  getActivityEventSummary,
  type ActivityEventItem,
  type ActivityEventSummary,
} from '../services/activityEvents';

const eventOptions = [
  '',
  'USER_REGISTERED',
  'USER_LOGGED_IN',
  'USER_LOGGED_OUT',
  'DOCUMENT_UPLOADED',
  'DOCUMENT_VIEWED',
  'DOCUMENT_EXTRACT_STARTED',
  'DOCUMENT_EXTRACT_SUCCEEDED',
  'DOCUMENT_EXTRACT_FAILED',
  'DOCUMENT_DELETED',
  'ACTIVITY_RECORD_IMPORTED',
  'ACTIVITY_RECORD_CREATED',
  'ACTIVITY_RECORD_UPDATED',
  'ACTIVITY_RECORD_DELETED',
  'ACTIVITY_RECORD_BULK_DELETED',
  'CONVERSION_FACTOR_CREATED',
  'CONVERSION_FACTOR_UPDATED',
  'CONVERSION_FACTOR_DELETED',
  'METRICS_SUMMARY_VIEWED',
  'REPORT_VIEWED',
  'REPORT_GENERATED',
  'REPORT_EXPORTED_PDF',
  'REPORT_EXPORTED_CSV',
  'FEEDBACK_SUBMITTED',
];

const emptySummary: ActivityEventSummary = {
  activeUsers: 0,
  documentsUploaded: 0,
  extractionAttempts: 0,
  successfulExtractions: 0,
  reportsGenerated: 0,
  pdfExports: 0,
  feedbackSubmitted: 0,
};

export function UserActivityPage() {
  const [items, setItems] = useState<ActivityEventItem[]>([]);
  const [summary, setSummary] = useState<ActivityEventSummary>(emptySummary);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [eventName, setEventName] = useState('');
  const [pagePath, setPagePath] = useState('');
  const [user, setUser] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(
    () => ({ dateFrom, dateTo, eventName, pagePath, user }),
    [dateFrom, dateTo, eventName, pagePath, user],
  );

  useEffect(() => {
    void loadActivity();
  }, [query]);

  async function loadActivity() {
    setLoading(true);
    setError(null);

    try {
      const [eventsResponse, summaryResponse] = await Promise.all([
        getActivityEvents(query),
        getActivityEventSummary(query),
      ]);
      setItems(eventsResponse.items);
      setSummary(summaryResponse);
    } catch {
      setError('Unable to load user activity. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>User Activity</h1>
          <p style={subtitleStyle}>Pilot workflow usage events without sensitive document content.</p>
        </div>
      </div>

      <div style={summaryGridStyle}>
        <SummaryCard label="Active Users" value={summary.activeUsers} />
        <SummaryCard label="Documents Uploaded" value={summary.documentsUploaded} />
        <SummaryCard label="Extraction Attempts" value={summary.extractionAttempts} />
        <SummaryCard label="Successful Extractions" value={summary.successfulExtractions} />
        <SummaryCard label="Reports Generated" value={summary.reportsGenerated} />
        <SummaryCard label="PDF Exports" value={summary.pdfExports} />
        <SummaryCard label="Feedback Submitted" value={summary.feedbackSubmitted} />
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
          Event
          <select value={eventName} onChange={(event) => setEventName(event.target.value)} style={inputStyle}>
            {eventOptions.map((item) => (
              <option key={item || 'all'} value={item}>{item ? formatEvent(item) : 'All events'}</option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>
          Page
          <input value={pagePath} onChange={(event) => setPagePath(event.target.value)} placeholder="/reports" style={inputStyle} />
        </label>
        <label style={labelStyle}>
          User
          <input value={user} onChange={(event) => setUser(event.target.value)} placeholder="Email or user id" style={inputStyle} />
        </label>
      </div>

      {error ? <div style={errorStyle}>{error}</div> : null}

      <div style={cardStyle}>
        {loading ? (
          <div style={emptyStyle}>Loading user activity...</div>
        ) : items.length === 0 ? (
          <div style={emptyStyle}>No user activity found.</div>
        ) : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>User</th>
                  <th style={thStyle}>Event</th>
                  <th style={thStyle}>Page</th>
                  <th style={thStyle}>Entity</th>
                  <th style={thStyle}>Details</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td style={tdStyle}>{formatDate(item.createdAt)}</td>
                    <td style={tdStyle}>{item.user?.email || item.userId || '-'}</td>
                    <td style={tdStyle}>{formatEvent(item.eventName)}</td>
                    <td style={tdStyle}>{item.page || '-'}</td>
                    <td style={tdStyle}>{item.entityType ? `${item.entityType}${item.entityId ? ` · ${item.entityId}` : ''}` : '-'}</td>
                    <td style={tdStyle}>{formatMetadata(item.metadata)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={summaryCardStyle}>
      <div style={summaryValueStyle}>{value}</div>
      <div style={summaryLabelStyle}>{label}</div>
    </div>
  );
}

function formatEvent(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatMetadata(metadata?: Record<string, unknown> | null) {
  if (!metadata || Object.keys(metadata).length === 0) return '-';
  return Object.entries(metadata)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(', ');
}

const pageStyle: CSSProperties = { maxWidth: 1180, margin: '0 auto', padding: '0 24px 48px' };
const headerStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 };
const titleStyle: CSSProperties = { margin: 0, fontSize: 28, color: '#0f172a' };
const subtitleStyle: CSSProperties = { margin: '6px 0 0', color: '#64748b' };
const summaryGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 };
const summaryCardStyle: CSSProperties = { background: '#fff', border: '1px solid #dbeafe', borderRadius: 8, padding: 16 };
const summaryValueStyle: CSSProperties = { fontSize: 26, fontWeight: 800, color: '#047857' };
const summaryLabelStyle: CSSProperties = { marginTop: 4, color: '#475569', fontSize: 13, fontWeight: 700 };
const filterCardStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 16 };
const labelStyle: CSSProperties = { display: 'grid', gap: 6, color: '#334155', fontSize: 13, fontWeight: 700 };
const inputStyle: CSSProperties = { minHeight: 38, border: '1px solid #cbd5e1', borderRadius: 6, padding: '8px 10px', fontSize: 14 };
const cardStyle: CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' };
const tableWrapStyle: CSSProperties = { overflowX: 'auto' };
const tableStyle: CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 14 };
const thStyle: CSSProperties = { textAlign: 'left', padding: '12px 14px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', color: '#0f172a' };
const tdStyle: CSSProperties = { padding: '12px 14px', borderBottom: '1px solid #f1f5f9', color: '#334155', verticalAlign: 'top' };
const emptyStyle: CSSProperties = { padding: 24, color: '#64748b' };
const errorStyle: CSSProperties = { marginBottom: 16, border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', borderRadius: 8, padding: 12 };
