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
};

const initialForm: ActivityDataInput = {
  activityType: 'DIESEL',
  recordDate: new Date().toISOString().slice(0, 10),
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
    try {
      const data = (await getActivityDataList()) as ActivityDataListResponse;
      setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  function updateField<K extends keyof ActivityDataInput>(key: K, value: ActivityDataInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
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

      setSuccessMessage('Activity data added.');
      setForm(initialForm);
      await loadItems();
    } catch (err) {
      setError('Failed to create activity data');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {/* ⭐ 标题区 */}
      <h1 style={{ marginBottom: 8 }}>Activity Data</h1>

      <p style={{ color: '#666', marginBottom: 24 }}>
        Manage and review extracted or manually entered activity records.
      </p>

      {/* ⭐ Summary 卡片 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <Card title="Total Records" value={items.length} icon="📄" />
        <Card title="Manual Entries" value={items.filter(i => i.sourceType === 'MANUAL').length} icon="✍️" />
        <Card title="Imported" value={items.filter(i => i.sourceType !== 'MANUAL').length} icon="📥" />
      </div>

      {/* ⭐ Form */}
      <form onSubmit={handleSubmit} style={formCard}>
        <h2 style={{ marginTop: 0 }}>Add Activity Data</h2>

        <div style={grid}>
          <Field label="Activity Type">
            <select value={form.activityType} onChange={(e) => updateField('activityType', e.target.value)}>
              <option value="DIESEL">DIESEL</option>
              <option value="ELECTRICITY">ELECTRICITY</option>
              <option value="NATURAL_GAS">NATURAL_GAS</option>
            </select>
          </Field>

          <Field label="Record Date">
            <input
              type="date"
              value={form.recordDate.slice(0, 10)}
              onChange={(e) => updateField('recordDate', e.target.value)}
            />
          </Field>

          <Field label="Quantity">
            <input
              type="number"
              value={form.quantity}
              onChange={(e) => updateField('quantity', Number(e.target.value))}
            />
          </Field>

          <Field label="Unit">
            <input value={form.unit} onChange={(e) => updateField('unit', e.target.value)} />
          </Field>

          <Field label="Source">
            <select value={form.sourceType} onChange={(e) => updateField('sourceType', e.target.value)}>
              <option value="MANUAL">Manual</option>
              <option value="IMPORT">Import</option>
              <option value="DOCUMENT_AI">AI</option>
            </select>
          </Field>

          <Field label="Reference">
            <input value={form.sourceReference ?? ''} onChange={(e) => updateField('sourceReference', e.target.value)} />
          </Field>
        </div>

        <textarea
          placeholder="Notes"
          value={form.notes ?? ''}
          onChange={(e) => updateField('notes', e.target.value)}
          style={{ width: '100%', marginTop: 12 }}
        />

        <button type="submit" disabled={submitting} style={primaryBtn}>
          {submitting ? 'Adding...' : 'Add Activity'}
        </button>
      </form>

      {/* 状态 */}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}

      {/* ⭐ Table */}
      <div style={tableCard}>
        <h2 style={{ margin: 0 }}>Activity Records</h2>

        {loading ? (
          <p>Loading...</p>
        ) : items.length === 0 ? (
          <p>No data yet</p>
        ) : (
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td>{i.recordDate}</td>
                  <td>{i.activityType}</td>
                  <td>{i.quantity}</td>
                  <td>{i.unit}</td>
                  <td>{i.sourceType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ⭐ UI Components */

function Card({ title, value, icon }: any) {
  return (
    <div style={card}>
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div style={{ color: '#666' }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function Field({ label, children }: any) {
  return (
    <div>
      <label>{label}</label>
      <div style={{ marginTop: 6 }}>{children}</div>
    </div>
  );
}

/* ⭐ Styles */

const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2,1fr)',
  gap: 16,
};

const card = {
  padding: 16,
  borderRadius: 12,
  background: '#fff',
  border: '1px solid #eee',
};

const formCard = {
  padding: 20,
  borderRadius: 12,
  border: '1px solid #ddd',
  background: '#fff',
  marginBottom: 24,
};

const tableCard = {
  padding: 20,
  borderRadius: 12,
  border: '1px solid #ddd',
  background: '#fff',
};

const primaryBtn = {
  marginTop: 16,
  padding: '10px 16px',
  borderRadius: 8,
  background: '#10b981',
  color: '#fff',
  border: 'none',
};