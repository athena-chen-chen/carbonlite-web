import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  getAdminFeedbackList,
  updateAdminFeedbackStatus,
  type FeedbackItem,
  type FeedbackStatus,
} from '../services/feedback';

const statuses: FeedbackStatus[] = [
  'NEW',
  'REVIEWED',
  'PLANNED',
  'RESOLVED',
  'DISMISSED',
  'CLOSED',
];

export function FeedbackManagementPage() {
  const [selectedStatus, setSelectedStatus] = useState<FeedbackStatus>('NEW');
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void loadFeedback(selectedStatus);
  }, [selectedStatus]);

  async function loadFeedback(status: FeedbackStatus) {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getAdminFeedbackList(status);
      setItems(response.items);
    } catch {
      setError('Unable to load feedback. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStatusChange(id: string, status: FeedbackStatus) {
    setError(null);
    setSuccess(null);

    try {
      const updated = await updateAdminFeedbackStatus(id, status);
      setItems((current) =>
        status === selectedStatus
          ? current.map((item) => (item.id === id ? { ...item, ...updated } : item))
          : current.filter((item) => item.id !== id),
      );
      setSuccess(`Feedback marked as ${formatStatus(status)}.`);
    } catch {
      setError('Unable to update feedback status.');
    }
  }

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Feedback Management</h1>
          <p style={subtitleStyle}>Review pilot user feedback from the CarbonLite app.</p>
        </div>
        <div style={filterGroupStyle} aria-label="Feedback status filters">
          {statuses.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setSelectedStatus(status)}
              style={selectedStatus === status ? activeFilterStyle : filterButtonStyle}
            >
              {formatStatus(status)}
            </button>
          ))}
        </div>
      </div>

      {success ? <div style={successStyle}>{success}</div> : null}
      {error ? <div style={errorStyle}>{error}</div> : null}

      <div style={cardStyle}>
        {isLoading ? (
          <div style={emptyStyle}>Loading feedback...</div>
        ) : items.length === 0 ? (
          <div style={emptyStyle}>No feedback in this status.</div>
        ) : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <colgroup>
                <col style={{ width: 92 }} />
                <col style={{ width: 140 }} />
                <col style={{ width: 118 }} />
                <col style={{ width: 88 }} />
                <col style={{ width: 150 }} />
                <col />
                <col style={{ width: 140 }} />
                <col style={{ width: 82 }} />
                <col style={{ width: 112 }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Submitter</th>
                  <th style={thStyle}>Organization</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Page</th>
                  <th style={thStyle}>Message</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>App Version</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td style={dateCellStyle}>{formatDate(item.createdAt)}</td>
                    <td style={submitterCellStyle} title={formatSubmitterTitle(item)}>
                      <div style={submitterPrimaryStyle}>{formatSubmitterPrimary(item)}</div>
                      {formatSubmitterSecondary(item) ? (
                        <div style={submitterSecondaryStyle}>
                          {formatSubmitterSecondary(item)}
                        </div>
                      ) : null}
                    </td>
                    <td style={orgCellStyle} title={formatOrganization(item)}>
                      {formatOrganization(item)}
                    </td>
                    <td style={typeCellStyle}>{formatType(item.type)}</td>
                    <td style={pageCellStyle}>
                      <div style={pageRouteStyle} title={item.page || undefined}>
                        {item.page || '-'}
                      </div>
                      {item.url ? (
                        <div style={mutedSmallStyle} title={item.url}>
                          {item.url}
                        </div>
                      ) : null}
                    </td>
                    <td style={messageCellStyle}>
                      <div style={messageScrollStyle}>
                        <div style={intentStyle}>{item.intent || 'No intent provided'}</div>
                        <div style={messageStyle}>{item.message || 'No details provided'}</div>
                      </div>
                    </td>
                    <td style={emailCellStyle} title={item.email || undefined}>
                      {item.email || '-'}
                    </td>
                    <td style={versionCellStyle} title={item.appVersion || undefined}>
                      {item.appVersion || '-'}
                    </td>
                    <td style={statusCellStyle}>
                      <span style={statusBadgeWrapStyle}>
                        <select
                          value={item.status}
                          onChange={(event) =>
                            handleStatusChange(item.id, event.target.value as FeedbackStatus)
                          }
                          style={statusSelectStyle}
                          aria-label={`Status for feedback ${item.id}`}
                        >
                          {statuses.map((status) => (
                            <option key={status} value={status}>
                              {formatStatus(status)}
                            </option>
                          ))}
                        </select>
                        <span aria-hidden="true" style={statusArrowStyle}>
                          ▼
                        </span>
                      </span>
                    </td>
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatType(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function formatStatus(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}

function getSubmitter(item: FeedbackItem) {
  return item.user ?? item.submitter;
}

function formatSubmitterPrimary(item: FeedbackItem) {
  const submitter = getSubmitter(item);
  return submitter?.name || submitter?.email || item.userId || 'Unknown';
}

function formatSubmitterSecondary(item: FeedbackItem) {
  const submitter = getSubmitter(item);
  if (!submitter?.email || submitter.email === formatSubmitterPrimary(item)) return '';
  return submitter.email;
}

function formatSubmitterTitle(item: FeedbackItem) {
  const submitter = item.user ?? item.submitter;
  return [submitter?.name, submitter?.email].filter(Boolean).join(' · ') || item.userId || 'Unknown';
}

function formatOrganization(item: FeedbackItem) {
  return item.organization?.name || item.organization?.id || item.organizationId || 'Unknown';
}

const pageStyle: CSSProperties = {
  maxWidth: 1360,
  margin: '0 auto',
  padding: '0 24px 48px',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-end',
  gap: 20,
  marginBottom: 20,
};

const titleStyle: CSSProperties = {
  margin: 0,
  color: '#0f172a',
};

const subtitleStyle: CSSProperties = {
  margin: '8px 0 0',
  color: '#64748b',
};

const filterGroupStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
};

const filterButtonStyle: CSSProperties = {
  border: '1px solid #cbd5e1',
  borderRadius: 999,
  background: '#fff',
  color: '#334155',
  padding: '9px 14px',
  fontWeight: 700,
  cursor: 'pointer',
};

const activeFilterStyle: CSSProperties = {
  ...filterButtonStyle,
  borderColor: '#047857',
  background: '#047857',
  color: '#fff',
};

const cardStyle: CSSProperties = {
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  background: '#fff',
  overflow: 'hidden',
};

const tableWrapStyle: CSSProperties = {
  overflowX: 'auto',
};

const tableStyle: CSSProperties = {
  width: '100%',
  minWidth: 1040,
  borderCollapse: 'collapse',
  tableLayout: 'fixed',
};

const thStyle: CSSProperties = {
  textAlign: 'left',
  padding: '11px 10px',
  borderBottom: '1px solid #e2e8f0',
  background: '#f8fafc',
  color: '#0f172a',
  fontSize: 12,
  whiteSpace: 'nowrap',
};

const tdStyle: CSSProperties = {
  padding: '10px',
  borderBottom: '1px solid #e2e8f0',
  color: '#334155',
  verticalAlign: 'top',
  fontSize: 13,
  minWidth: 0,
};

const dateCellStyle: CSSProperties = {
  ...tdStyle,
  whiteSpace: 'nowrap',
  fontSize: 12,
  color: '#475569',
};

const submitterCellStyle: CSSProperties = {
  ...tdStyle,
  overflow: 'hidden',
};

const submitterPrimaryStyle: CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: '#0f172a',
  fontWeight: 700,
};

const submitterSecondaryStyle: CSSProperties = {
  marginTop: 2,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: '#64748b',
  fontSize: 12,
};

const orgCellStyle: CSSProperties = {
  ...tdStyle,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const typeCellStyle: CSSProperties = {
  ...tdStyle,
  whiteSpace: 'nowrap',
};

const pageCellStyle: CSSProperties = {
  ...tdStyle,
};

const messageCellStyle: CSSProperties = {
  ...tdStyle,
  whiteSpace: 'normal',
  overflowWrap: 'anywhere',
};

const emailCellStyle: CSSProperties = {
  ...tdStyle,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const versionCellStyle: CSSProperties = {
  ...tdStyle,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  fontSize: 12,
};

const statusCellStyle: CSSProperties = {
  ...tdStyle,
  textAlign: 'center',
  whiteSpace: 'nowrap',
};

const intentStyle: CSSProperties = {
  color: '#0f172a',
  fontWeight: 800,
  marginBottom: 4,
  lineHeight: 1.3,
};

const messageStyle: CSSProperties = {
  color: '#475569',
  lineHeight: 1.35,
  whiteSpace: 'normal',
  overflowWrap: 'anywhere',
};

const messageScrollStyle: CSSProperties = {
  maxHeight: 96,
  overflowY: 'auto',
  paddingRight: 4,
};

const pageRouteStyle: CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: '#0f172a',
  fontWeight: 700,
};

const mutedSmallStyle: CSSProperties = {
  marginTop: 4,
  color: '#94a3b8',
  fontSize: 12,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const statusSelectStyle: CSSProperties = {
  appearance: 'none',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
  border: 0,
  borderRadius: 999,
  padding: '5px 18px 5px 9px',
  background: 'transparent',
  color: '#065f46',
  fontSize: 13,
  fontWeight: 800,
  minWidth: 74,
  maxWidth: 112,
  width: 'auto',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  lineHeight: 1.3,
  outline: 'none',
};

const statusBadgeWrapStyle: CSSProperties = {
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: 'fit-content',
  minWidth: 78,
  maxWidth: 120,
  border: '1px solid #a7f3d0',
  borderRadius: 999,
  background: '#ecfdf5',
  boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.7)',
};

const statusArrowStyle: CSSProperties = {
  position: 'absolute',
  right: 8,
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#047857',
  fontSize: 9,
  lineHeight: 1,
  pointerEvents: 'none',
};

const emptyStyle: CSSProperties = {
  padding: 28,
  color: '#64748b',
  textAlign: 'center',
};

const successStyle: CSSProperties = {
  border: '1px solid #bbf7d0',
  borderRadius: 8,
  background: '#f0fdf4',
  color: '#166534',
  padding: '10px 12px',
  marginBottom: 12,
  fontWeight: 700,
};

const errorStyle: CSSProperties = {
  border: '1px solid #fecaca',
  borderRadius: 8,
  background: '#fef2f2',
  color: '#991b1b',
  padding: '10px 12px',
  marginBottom: 12,
  fontWeight: 700,
};
