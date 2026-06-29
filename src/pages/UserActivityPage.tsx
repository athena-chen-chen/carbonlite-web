import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useAuth } from '../auth/AuthProvider';
import {
  getAdminActiveUsers,
  getAdminActivityEvents,
  getAdminActivityEventSummary,
  getActivityEvents,
  getActivityEventSummary,
  type ActiveUserItem,
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
  today: 0,
  thisWeek: 0,
  thisMonth: 0,
  activeUsers: 0,
  documentsUploaded: 0,
  extractionAttempts: 0,
  successfulExtractions: 0,
  reportsGenerated: 0,
  pdfExports: 0,
  feedbackSubmitted: 0,
};

export function UserActivityPage() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<ActivityEventItem[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUserItem[]>([]);
  const [summary, setSummary] = useState<ActivityEventSummary>(emptySummary);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activityType, setActivityType] = useState('');
  const [pagePath, setPagePath] = useState('');
  const [user, setUser] = useState('');
  const [organization, setOrganization] = useState('');
  const [showActiveUsers, setShowActiveUsers] = useState(false);
  const [activeUsersLoading, setActiveUsersLoading] = useState(false);
  const [activeUsersError, setActiveUsersError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(
    () => ({
      dateFrom,
      dateTo,
      activityType,
      pagePath,
      ...(isAdmin ? { user, organization } : {}),
    }),
    [activityType, dateFrom, dateTo, isAdmin, organization, pagePath, user],
  );

  useEffect(() => {
    void loadActivity();
  }, [query]);

  useEffect(() => {
    if (isAdmin && showActiveUsers) {
      void loadActiveUsers();
    }
  }, [dateFrom, dateTo, isAdmin, showActiveUsers]);

  async function loadActivity() {
    setLoading(true);
    setError(null);

    try {
      const eventsRequest = isAdmin ? getAdminActivityEvents(query) : getActivityEvents(query);
      const summaryRequest = isAdmin
        ? getAdminActivityEventSummary(query)
        : getActivityEventSummary(query);
      const [eventsResponse, summaryResponse] = await Promise.all([
        eventsRequest,
        summaryRequest,
      ]);
      setItems(eventsResponse.items);
      setSummary(summaryResponse);
    } catch {
      setError('Unable to load user activity. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function loadActiveUsers() {
    setActiveUsersLoading(true);
    setActiveUsersError(null);

    try {
      const response = await getAdminActiveUsers({ dateFrom, dateTo });
      setActiveUsers(response.items);
    } catch {
      setActiveUsersError('Unable to load active users. Please try again.');
    } finally {
      setActiveUsersLoading(false);
    }
  }

  function handleActiveUsersClick() {
    if (!isAdmin) return;
    setShowActiveUsers((current) => !current);
  }

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>User Activity</h1>
          <p style={subtitleStyle}>
            {isAdmin
              ? 'Activity across pilot users and organizations without sensitive document content.'
              : 'Your workflow activity without sensitive document content.'}
          </p>
        </div>
      </div>

      <div style={summaryGridStyle}>
        <SummaryCard label="Today" value={summary.today ?? 0} />
        <SummaryCard label="This Week" value={summary.thisWeek ?? 0} />
        <SummaryCard label="This Month" value={summary.thisMonth ?? 0} />
        <SummaryCard
          label="Active Users"
          value={summary.activeUsers}
          onClick={isAdmin ? handleActiveUsersClick : undefined}
          active={showActiveUsers}
        />
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
          Activity Type
          <select value={activityType} onChange={(event) => setActivityType(event.target.value)} style={inputStyle}>
            {eventOptions.map((item) => (
              <option key={item || 'all'} value={item}>{item ? formatEvent(item) : 'All events'}</option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>
          Page
          <input value={pagePath} onChange={(event) => setPagePath(event.target.value)} placeholder="/reports" style={inputStyle} />
        </label>
        {isAdmin ? (
          <>
            <label style={labelStyle}>
              User
              <input value={user} onChange={(event) => setUser(event.target.value)} placeholder="Email, name, or user id" style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Organization
              <input value={organization} onChange={(event) => setOrganization(event.target.value)} placeholder="Organization name or id" style={inputStyle} />
            </label>
          </>
        ) : null}
      </div>

      {isAdmin && showActiveUsers ? (
        <section style={activeUsersPanelStyle} aria-label="Active users">
          <div style={activeUsersHeaderStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Active Users</h2>
              <p style={sectionSubtitleStyle}>
                Users with at least one activity event in the selected period.
              </p>
            </div>
            <button type="button" onClick={() => setShowActiveUsers(false)} style={secondaryButtonStyle}>
              Hide
            </button>
          </div>

          {activeUsersError ? <div style={errorStyle}>{activeUsersError}</div> : null}
          {activeUsersLoading ? (
            <div style={emptyStyle}>Loading active users...</div>
          ) : activeUsers.length === 0 ? (
            <div style={emptyStyle}>No active users found for this period.</div>
          ) : (
            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>User</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Organization</th>
                    <th style={thStyle}>Activity Count</th>
                    <th style={thStyle}>Last Active</th>
                    <th style={thStyle}>Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {activeUsers.map((item) => (
                    <tr key={item.userId}>
                      <td style={tdStyle}>{item.name || item.email || item.userId}</td>
                      <td style={tdStyle}>{item.email || '-'}</td>
                      <td style={tdStyle}>{item.organizationName || item.organizationId || '-'}</td>
                      <td style={tdStyle}>{item.activityCount}</td>
                      <td style={tdStyle}>{item.lastActiveAt ? formatDate(item.lastActiveAt) : '-'}</td>
                      <td style={tdStyle}>
                        {item.mostRecentActivityType ? formatEvent(item.mostRecentActivityType) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

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
                  {isAdmin ? <th style={thStyle}>Organization</th> : null}
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
                    <td style={tdStyle}>{item.userEmail || item.user?.email || item.userName || item.userId || '-'}</td>
                    {isAdmin ? <td style={tdStyle}>{item.organizationName || item.organizationId || '-'}</td> : null}
                    <td style={tdStyle}>{formatEvent(item.activityType || item.eventName)}</td>
                    <td style={tdStyle}>{item.page || '-'}</td>
                    <td style={tdStyle}>{item.entityType ? `${item.entityType}${item.entityId ? ` · ${item.entityId}` : ''}` : '-'}</td>
                    <td style={tdStyle}>{item.description || formatMetadata(item.metadata)}</td>
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

function SummaryCard({
  label,
  value,
  onClick,
  active = false,
}: {
  label: string;
  value: number;
  onClick?: () => void;
  active?: boolean;
}) {
  if (!onClick) {
    return (
      <div style={summaryCardStyle}>
        <div style={summaryValueStyle}>{value}</div>
        <div style={summaryLabelStyle}>{label}</div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      style={getClickableSummaryCardStyle(active)}
    >
      <div style={summaryValueStyle}>{value}</div>
      <div style={summaryLabelStyle}>{label}</div>
    </button>
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
const summaryCardStyle: CSSProperties = { background: '#fff', border: '1px solid #dbeafe', borderRadius: 8, padding: 16, textAlign: 'left' };
function getClickableSummaryCardStyle(active: boolean): CSSProperties {
  return {
    ...summaryCardStyle,
    width: '100%',
    cursor: 'pointer',
    borderColor: active ? '#047857' : '#bfdbfe',
    boxShadow: active ? '0 0 0 2px rgba(4, 120, 87, 0.12)' : 'none',
  };
}
const summaryValueStyle: CSSProperties = { fontSize: 26, fontWeight: 800, color: '#047857' };
const summaryLabelStyle: CSSProperties = { marginTop: 4, color: '#475569', fontSize: 13, fontWeight: 700 };
const filterCardStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 12,
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  padding: 16,
  marginBottom: 16,
  overflow: 'hidden',
};
const labelStyle: CSSProperties = {
  display: 'grid',
  gap: 6,
  minWidth: 0,
  color: '#334155',
  fontSize: 13,
  fontWeight: 700,
};
const inputStyle: CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  minWidth: 0,
  minHeight: 38,
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  padding: '8px 10px',
  fontSize: 14,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};
const cardStyle: CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' };
const activeUsersPanelStyle: CSSProperties = { ...cardStyle, marginBottom: 16 };
const activeUsersHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 16,
  padding: 16,
  borderBottom: '1px solid #e2e8f0',
};
const sectionTitleStyle: CSSProperties = { margin: 0, fontSize: 18, color: '#0f172a' };
const sectionSubtitleStyle: CSSProperties = { margin: '4px 0 0', color: '#64748b', fontSize: 13 };
const secondaryButtonStyle: CSSProperties = {
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  background: '#fff',
  color: '#334155',
  padding: '8px 12px',
  fontWeight: 700,
  cursor: 'pointer',
};
const tableWrapStyle: CSSProperties = { overflowX: 'auto' };
const tableStyle: CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 14 };
const thStyle: CSSProperties = { textAlign: 'left', padding: '12px 14px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', color: '#0f172a' };
const tdStyle: CSSProperties = { padding: '12px 14px', borderBottom: '1px solid #f1f5f9', color: '#334155', verticalAlign: 'top' };
const emptyStyle: CSSProperties = { padding: 24, color: '#64748b' };
const errorStyle: CSSProperties = { marginBottom: 16, border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', borderRadius: 8, padding: 12 };
