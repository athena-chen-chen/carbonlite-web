import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  getFeedbackList,
  updateFeedbackStatus,
  type FeedbackItem,
  type FeedbackStatus,
} from '../services/feedback';

const statuses: FeedbackStatus[] = ['NEW', 'REVIEWED', 'CLOSED'];

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
      const response = await getFeedbackList(status);
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
      await updateFeedbackStatus(id, status);
      setSuccess('Feedback status updated.');
      await loadFeedback(selectedStatus);
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
          <div style={emptyStyle}>No {formatStatus(selectedStatus).toLowerCase()} feedback yet.</div>
        ) : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Page</th>
                  <th style={thStyle}>Message</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td style={tdStyle}>{formatDate(item.createdAt)}</td>
                    <td style={tdStyle}>{formatType(item.type)}</td>
                    <td style={tdStyle}>{item.page || '-'}</td>
                    <td style={messageCellStyle}>
                      <div style={intentStyle}>{item.intent}</div>
                      <div style={messageStyle}>{item.message}</div>
                    </td>
                    <td style={tdStyle}>{item.email || '-'}</td>
                    <td style={tdStyle}>
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
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatType(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function formatStatus(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

const pageStyle: CSSProperties = {
  maxWidth: 1180,
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
  borderCollapse: 'collapse',
};

const thStyle: CSSProperties = {
  textAlign: 'left',
  padding: '13px 14px',
  borderBottom: '1px solid #e2e8f0',
  background: '#f8fafc',
  color: '#0f172a',
  fontSize: 13,
};

const tdStyle: CSSProperties = {
  padding: '14px',
  borderBottom: '1px solid #e2e8f0',
  color: '#334155',
  verticalAlign: 'top',
  fontSize: 14,
};

const messageCellStyle: CSSProperties = {
  ...tdStyle,
  minWidth: 280,
};

const intentStyle: CSSProperties = {
  color: '#0f172a',
  fontWeight: 800,
  marginBottom: 6,
};

const messageStyle: CSSProperties = {
  color: '#475569',
  lineHeight: 1.5,
};

const statusSelectStyle: CSSProperties = {
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  padding: '8px 10px',
  background: '#fff',
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
