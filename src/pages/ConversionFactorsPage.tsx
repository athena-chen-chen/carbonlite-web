import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  createConversionFactor,
  deleteConversionFactor,
  getConversionFactors,
  updateConversionFactor,
  type ConversionFactorInput,
} from '../services/conversionFactors';
import { activityTypes } from '../constants/activityTypes';

type ConversionFactorItem = {
  id: string;
  name: string;
  type: string;
  activityType?: string | null;
  unit: string;
  factorValue: string | number;
  resultUnit: string;
  sourceName?: string | null;
  sourceReference?: string | null;
  isDefault: boolean;
  isSystemDefault: boolean;
};

type ConversionFactorListResponse = {
  items: ConversionFactorItem[];
};

const initialForm: ConversionFactorInput = {
  name: '',
  type: 'EMISSION',
  activityType: '',
  unit: '',
  factorValue: '' as unknown as number,
  resultUnit: 'kgCO2e',
  sourceName: '',
  sourceReference: '',
  isDefault: true,
};

export function ConversionFactorsPage() {
  const [form, setForm] = useState<ConversionFactorInput>(initialForm);
  const [items, setItems] = useState<ConversionFactorItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showFactorForm, setShowFactorForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function loadItems() {
    setLoading(true);
    setError(null);

    try {
      const data = (await getConversionFactors()) as ConversionFactorListResponse;
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversion factors');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  const defaultCount = useMemo(
    () => items.filter((item) => item.isSystemDefault).length,
    [items],
  );

  const emissionCount = useMemo(
    () => items.filter((item) => item.type === 'EMISSION').length,
    [items],
  );

  const activityTypesCovered = useMemo(() => {
    const types = new Set(
      items
        .map((item) => item.activityType)
        .filter((value): value is string => Boolean(value)),
    );

    return types.size;
  }, [items]);

  function updateField<K extends keyof ConversionFactorInput>(
    key: K,
    value: ConversionFactorInput[K],
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function getPayloadFromForm() {
    return {
      ...form,
      factorValue: Number(form.factorValue),
    };
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (editingId) {
        await updateConversionFactor(editingId, getPayloadFromForm());
        setSuccessMessage('Conversion factor updated successfully.');
        setEditingId(null);
        setShowFactorForm(false);
      } else {
        await createConversionFactor(getPayloadFromForm());
        setSuccessMessage('Conversion factor created successfully.');
        setShowFactorForm(false);
      }

      setForm(initialForm);
      await loadItems();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : editingId
          ? 'Failed to update conversion factor'
          : 'Failed to create conversion factor',
      );
    } finally {
      setSubmitting(false);
    }
  }

  function handleEditFactor(item: ConversionFactorItem) {
    if (item.isSystemDefault) return;

    setEditingId(item.id);
    setShowFactorForm(true);
    setForm({
      name: item.name,
      type: item.type,
      activityType: item.activityType ?? '',
      unit: item.unit,
      factorValue: Number(item.factorValue),
      resultUnit: item.resultUnit,
      sourceName: item.sourceName ?? '',
      sourceReference: item.sourceReference ?? '',
      isDefault: item.isDefault,
    });
    setError(null);
    setSuccessMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(initialForm);
    setShowFactorForm(false);
    setError(null);
    setSuccessMessage(null);
  }

  async function deleteFactorById(id: string) {
    setDeletingId(id);
    setError(null);
    setSuccessMessage(null);

    try {
      await deleteConversionFactor(id);
      setSuccessMessage('Conversion factor deleted successfully.');
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete conversion factor');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteFactor(item: ConversionFactorItem) {
    if (item.isSystemDefault) return;

    const shouldDelete = window.confirm(
      `Delete conversion factor "${item.name}"?`,
    );

    if (!shouldDelete) return;

    await deleteFactorById(item.id);
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={{ margin: 0 }}>Conversion Factors</h1>
          <p style={{ marginTop: 8, color: '#666' }}>
            Manage the factors CarbonLite AI uses to convert activity data into carbon metrics.
          </p>
        </div>
      </div>

      <div style={summaryGridStyle}>
        <SummaryCard
          icon="🧮"
          title="Total Factors"
          value={String(items.length)}
          subtitle="Available conversion rules"
        />

        <SummaryCard
          icon="🌱"
          title="Emission Factors"
          value={String(emissionCount)}
          subtitle="Used for CO₂e calculations"
          accent="#10b981"
        />

        <SummaryCard
          icon="✅"
          title="Default Factors"
          value={String(defaultCount)}
          subtitle="System-provided starter library"
          accent="#3b82f6"
        />

        <SummaryCard
          icon="📊"
          title="Activity Types"
          value={String(activityTypesCovered)}
          subtitle="Covered data categories"
          accent="#f59e0b"
        />
      </div>

      {!showFactorForm ? (
        <div style={collapsedFormStyle}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20 }}>Custom conversion factors</h2>
            <p style={{ marginTop: 6, color: '#666' }}>
              System default factors are already available. Add a custom factor only when you need organization-specific values.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setForm(initialForm);
              setEditingId(null);
              setShowFactorForm(true);
              setError(null);
              setSuccessMessage(null);
            }}
            style={primaryButtonStyle(false)}
          >
            + Add Custom Factor
          </button>
        </div>
      ) : (
      <form onSubmit={handleSubmit} style={formCardStyle}>
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>
            {editingId ? 'Edit Conversion Factor' : 'Add Custom Factor'}
          </h2>
          <p style={{ marginTop: 6, color: '#666' }}>
            {editingId
              ? 'Update this conversion rule, then save your changes.'
              : 'Define how an activity record should be converted into a calculated result.'}
          </p>
        </div>

        <div style={formGridStyle}>
          <Field label="Name">
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              style={inputStyle}
              placeholder="e.g. Diesel emission factor"
            />
          </Field>

          <Field label="Type">
            <select
              value={form.type}
              onChange={(e) => updateField('type', e.target.value)}
              style={inputStyle}
            >
              <option value="EMISSION">EMISSION</option>
              <option value="ENERGY">ENERGY</option>
              <option value="COST">COST</option>
              <option value="CUSTOM">CUSTOM</option>
            </select>
          </Field>

          <Field label="Activity Type">
            <select
              value={form.activityType ?? ''}
              onChange={(e) => updateField('activityType', e.target.value)}
              style={inputStyle}
            >
              <option value="">-- Select --</option>
              {activityTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Input Unit">
            <input
              type="text"
              value={form.unit}
              onChange={(e) => updateField('unit', e.target.value)}
              style={inputStyle}
              placeholder="e.g. liters"
            />
          </Field>

          <Field label="Factor Value">
            <input
              type="number"
              step="0.0001"
              value={form.factorValue}
              onChange={(e) =>
                updateField(
                  'factorValue',
                  e.target.value === '' ? ('' as unknown as number) : Number(e.target.value),
                )
              }
              style={inputStyle}
              placeholder="e.g. 2.68"
            />
          </Field>

          <Field label="Result Unit">
            <input
              type="text"
              value={form.resultUnit}
              onChange={(e) => updateField('resultUnit', e.target.value)}
              style={inputStyle}
              placeholder="e.g. kgCO2e"
            />
          </Field>

          <Field label="Source Name">
            <input
              type="text"
              value={form.sourceName ?? ''}
              onChange={(e) => updateField('sourceName', e.target.value)}
              style={inputStyle}
              placeholder="e.g. Environment Canada"
            />
          </Field>

          <Field label="Source Reference">
            <input
              type="text"
              value={form.sourceReference ?? ''}
              onChange={(e) => updateField('sourceReference', e.target.value)}
              style={inputStyle}
              placeholder="e.g. 2025 factor table"
            />
          </Field>
        </div>

        <label style={checkboxRowStyle}>
          <input
            type="checkbox"
            checked={!!form.isDefault}
            onChange={(e) => updateField('isDefault', e.target.checked)}
          />
          Use as default factor for this activity type
        </label>

        <div style={{ marginTop: 18 }}>
          <button type="submit" disabled={submitting} style={primaryButtonStyle(submitting)}>
            {submitting
              ? editingId
                ? 'Saving...'
                : 'Creating...'
              : editingId
              ? 'Save Changes'
              : 'Create Conversion Factor'}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={cancelEdit}
              disabled={submitting}
              style={cancelButtonStyle}
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={cancelEdit}
              disabled={submitting}
              style={cancelButtonStyle}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
      )}

      {error ? <div style={errorStyle}>{error}</div> : null}
      {successMessage ? <div style={successStyle}>{successMessage}</div> : null}

      <div style={tableCardStyle}>
        <div style={tableHeaderStyle}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20 }}>Conversion Factor Library</h2>
            <p style={{ marginTop: 6, color: '#666' }}>
              These factors are used when generating emissions and other calculated metrics.
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 16 }}>Loading conversion factors...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Activity Type</th>
                <th style={thStyle}>Input Unit</th>
                <th style={thStyle}>Factor</th>
                <th style={thStyle}>Result Unit</th>
                <th style={thStyle}>Library</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 18, textAlign: 'center', color: '#666' }}>
                    No conversion factors yet.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      {item.sourceName ? (
                        <div style={{ marginTop: 4, fontSize: 12, color: '#777' }}>
                          Source: {item.sourceName}
                        </div>
                      ) : null}
                    </td>
                    <td style={tdStyle}>
                      <Badge label={item.type} color="#0f766e" background="#ccfbf1" />
                    </td>
                    <td style={tdStyle}>{item.activityType ?? '-'}</td>
                    <td style={tdStyle}>{item.unit}</td>
                    <td style={tdStyle}>
                      <strong>{item.factorValue}</strong>
                    </td>
                    <td style={tdStyle}>{item.resultUnit}</td>
                    <td style={tdStyle}>
                      {item.isSystemDefault ? (
                        <Badge label="System" color="#1d4ed8" background="#dbeafe" />
                      ) : (
                        <Badge label="Custom" color="#6b7280" background="#f3f4f6" />
                      )}
                    </td>
                    <td style={tdStyle}>
                      {item.isSystemDefault ? (
                        <div style={{ marginBottom: 6, fontSize: 12, color: '#64748b' }}>
                          Locked
                        </div>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleEditFactor(item)}
                        disabled={item.isSystemDefault || deletingId === item.id || submitting}
                        style={editButtonStyle(item.isSystemDefault)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteFactor(item)}
                        disabled={
                          item.isSystemDefault ||
                          deletingId === item.id ||
                          editingId === item.id
                        }
                        style={deleteButtonStyle(
                          item.isSystemDefault || deletingId === item.id,
                        )}
                      >
                        {deletingId === item.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  title,
  value,
  subtitle,
  accent = '#111827',
}: {
  icon: string;
  title: string;
  value: string;
  subtitle: string;
  accent?: string;
}) {
  return (
    <div style={summaryCardStyle}>
      <div style={{ fontSize: 26 }}>{icon}</div>
      <div style={{ marginTop: 12, color: '#666', fontSize: 14 }}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 28, fontWeight: 800, color: accent }}>
        {value}
      </div>
      <div style={{ marginTop: 8, color: '#777', fontSize: 13 }}>{subtitle}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Badge({
  label,
  color,
  background,
}: {
  label: string;
  color: string;
  background: string;
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        padding: '4px 10px',
        fontSize: 12,
        fontWeight: 700,
        color,
        background,
      }}
    >
      {label}
    </span>
  );
}

const pageHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  flexWrap: 'wrap',
  marginBottom: 24,
};

const summaryGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 16,
  marginBottom: 24,
};

const summaryCardStyle: React.CSSProperties = {
  borderRadius: 16,
  padding: 20,
  background: '#fff',
  border: '1px solid #eee',
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
};

const formCardStyle: React.CSSProperties = {
  border: '1px solid #ddd',
  borderRadius: 16,
  background: '#fff',
  padding: 20,
  marginBottom: 20,
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
};

const collapsedFormStyle: React.CSSProperties = {
  ...formCardStyle,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 16,
  flexWrap: 'wrap',
};

const formGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 16,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #d1d5db',
  outline: 'none',
};

const checkboxRowStyle: React.CSSProperties = {
  marginTop: 16,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  color: '#444',
};

function primaryButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '10px 16px',
    borderRadius: 10,
    border: 'none',
    background: disabled ? '#9ca3af' : '#10b981',
    color: '#fff',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

const cancelButtonStyle: React.CSSProperties = {
  marginLeft: 10,
  padding: '10px 16px',
  borderRadius: 10,
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#334155',
  fontWeight: 700,
  cursor: 'pointer',
};

const successStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 12,
  borderRadius: 10,
  border: '1px solid #bbf7d0',
  background: '#f0fdf4',
  color: '#166534',
};

const errorStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 12,
  borderRadius: 10,
  border: '1px solid #fecaca',
  background: '#fef2f2',
  color: '#991b1b',
};

const tableCardStyle: React.CSSProperties = {
  border: '1px solid #ddd',
  borderRadius: 16,
  overflow: 'hidden',
  background: '#fff',
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
};

const tableHeaderStyle: React.CSSProperties = {
  padding: 16,
  borderBottom: '1px solid #eee',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: 12,
  borderBottom: '1px solid #ddd',
  color: '#475569',
  fontSize: 13,
};

const tdStyle: React.CSSProperties = {
  padding: 12,
  borderBottom: '1px solid #eee',
  verticalAlign: 'top',
};

function editButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    marginRight: 8,
    padding: '7px 10px',
    borderRadius: 8,
    border: disabled ? '1px solid #e5e7eb' : '1px solid #bfdbfe',
    background: disabled ? '#f3f4f6' : '#eff6ff',
    color: disabled ? '#9ca3af' : '#1d4ed8',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

function deleteButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '7px 10px',
    borderRadius: 8,
    border: '1px solid #fecaca',
    background: disabled ? '#f3f4f6' : '#fff',
    color: disabled ? '#9ca3af' : '#dc2626',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}
