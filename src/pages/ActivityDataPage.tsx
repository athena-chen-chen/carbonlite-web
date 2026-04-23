import { FormEvent, useEffect, useState } from 'react';
import {
  createActivityData,
  getActivityDataList,
  type ActivityDataInput,
} from '../services/activityData';

type ActivityDataItem = {
  id: string;
  activityType: string;
  recordDate: string;
  quantity: string | number;
  unit: string;
  sourceType: string;
  sourceReference?: string | null;
  notes?: string | null;
};

type ActivityDataListResponse = {
  items: ActivityDataItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const initialForm: ActivityDataInput = {
  activityType: 'DIESEL',
  recordDate: '2026-03-17T00:00:00.000Z',
  quantity: 100,
  unit: 'liters',
  sourceType: 'MANUAL',
  sourceReference: '',
  notes: '',
};

export function ActivityDataPage() {
  const [form, setForm] = useState<ActivityDataInput>(initialForm);
  const [items, setItems] = useState<ActivityDataItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function loadItems() {
    setLoading(true);
    setError(null);
    try {
      const data = (await getActivityDataList()) as ActivityDataListResponse;
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  function updateField<K extends keyof ActivityDataInput>(key: K, value: ActivityDataInput[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await createActivityData({
        ...form,
        quantity: Number(form.quantity),
      });

      setSuccessMessage('Activity data created successfully.');
      setForm(initialForm);
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create activity data');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h1>Activity Data</h1>

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(220px, 1fr))',
          gap: 16,
          padding: 16,
          border: '1px solid #ddd',
          borderRadius: 12,
          marginBottom: 24,
        }}
      >
        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>Activity Type</label>
          <select
            value={form.activityType}
            onChange={(e) => updateField('activityType', e.target.value)}
            style={{ width: '100%', padding: 8 }}
          >
            <option value="ELECTRICITY">ELECTRICITY</option>
            <option value="NATURAL_GAS">NATURAL_GAS</option>
            <option value="DIESEL">DIESEL</option>
            <option value="GASOLINE">GASOLINE</option>
            <option value="STEAM">STEAM</option>
            <option value="WATER">WATER</option>
            <option value="WASTE">WASTE</option>
            <option value="BUSINESS_TRAVEL">BUSINESS_TRAVEL</option>
            <option value="FREIGHT">FREIGHT</option>
            <option value="CUSTOM">CUSTOM</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>Record Date</label>
          <input
            type="text"
            value={form.recordDate}
            onChange={(e) => updateField('recordDate', e.target.value)}
            style={{ width: '100%', padding: 8 }}
            placeholder="2026-03-17T00:00:00.000Z"
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>Quantity</label>
          <input
            type="number"
            value={form.quantity}
            onChange={(e) => updateField('quantity', Number(e.target.value))}
            style={{ width: '100%', padding: 8 }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>Unit</label>
          <input
            type="text"
            value={form.unit}
            onChange={(e) => updateField('unit', e.target.value)}
            style={{ width: '100%', padding: 8 }}
            placeholder="liters"
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>Source Type</label>
          <select
            value={form.sourceType}
            onChange={(e) => updateField('sourceType', e.target.value)}
            style={{ width: '100%', padding: 8 }}
          >
            <option value="MANUAL">MANUAL</option>
            <option value="IMPORT">IMPORT</option>
            <option value="API">API</option>
            <option value="DOCUMENT_AI">DOCUMENT_AI</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>Source Reference</label>
          <input
            type="text"
            value={form.sourceReference ?? ''}
            onChange={(e) => updateField('sourceReference', e.target.value)}
            style={{ width: '100%', padding: 8 }}
            placeholder="manual-test-001"
          />
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', marginBottom: 6 }}>Notes</label>
          <textarea
            value={form.notes ?? ''}
            onChange={(e) => updateField('notes', e.target.value)}
            style={{ width: '100%', padding: 8, minHeight: 80 }}
            placeholder="Optional notes..."
          />
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <button type="submit" disabled={submitting} style={{ padding: '10px 16px' }}>
            {submitting ? 'Creating...' : 'Create Activity Data'}
          </button>
        </div>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
      {loading && <p>Loading activity data...</p>}

      {!loading && (
        <div style={{ border: '1px solid #ddd', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f7f7f7' }}>
                <th style={thStyle}>Record Date</th>
                <th style={thStyle}>Activity Type</th>
                <th style={thStyle}>Quantity</th>
                <th style={thStyle}>Unit</th>
                <th style={thStyle}>Source Type</th>
                <th style={thStyle}>Source Reference</th>
                <th style={thStyle}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 16, textAlign: 'center' }}>
                    No activity data yet.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td style={tdStyle}>{item.recordDate}</td>
                    <td style={tdStyle}>{item.activityType}</td>
                    <td style={tdStyle}>{item.quantity}</td>
                    <td style={tdStyle}>{item.unit}</td>
                    <td style={tdStyle}>{item.sourceType}</td>
                    <td style={tdStyle}>{item.sourceReference ?? '-'}</td>
                    <td style={tdStyle}>{item.notes ?? '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: 12,
  borderBottom: '1px solid #ddd',
};

const tdStyle: React.CSSProperties = {
  padding: 12,
  borderBottom: '1px solid #eee',
  verticalAlign: 'top',
};