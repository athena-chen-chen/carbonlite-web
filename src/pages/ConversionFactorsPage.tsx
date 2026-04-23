import { FormEvent, useEffect, useState } from 'react';
import {
  createConversionFactor,
  getConversionFactors,
  type ConversionFactorInput,
} from '../services/conversionFactors';

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
};

type ConversionFactorListResponse = {
  items: ConversionFactorItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const initialForm: ConversionFactorInput = {
  name: 'Diesel emission factor',
  type: 'EMISSION',
  activityType: 'DIESEL',
  unit: 'liters',
  factorValue: 2.68,
  resultUnit: 'kgCO2e',
  sourceName: 'Manual test factor',
  sourceReference: 'local-test',
  isDefault: true,
};

export function ConversionFactorsPage() {
  const [form, setForm] = useState<ConversionFactorInput>(initialForm);
  const [items, setItems] = useState<ConversionFactorItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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

  function updateField<K extends keyof ConversionFactorInput>(
    key: K,
    value: ConversionFactorInput[K],
  ) {
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
      await createConversionFactor({
        ...form,
        factorValue: Number(form.factorValue),
      });

      setSuccessMessage('Conversion factor created successfully.');
      setForm(initialForm);
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create conversion factor');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h1>Conversion Factors</h1>

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
          <label style={{ display: 'block', marginBottom: 6 }}>Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            style={{ width: '100%', padding: 8 }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>Type</label>
          <select
            value={form.type}
            onChange={(e) => updateField('type', e.target.value)}
            style={{ width: '100%', padding: 8 }}
          >
            <option value="EMISSION">EMISSION</option>
            <option value="ENERGY">ENERGY</option>
            <option value="COST">COST</option>
            <option value="CUSTOM">CUSTOM</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>Activity Type</label>
          <select
            value={form.activityType ?? ''}
            onChange={(e) => updateField('activityType', e.target.value)}
            style={{ width: '100%', padding: 8 }}
          >
            <option value="">-- Select --</option>
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
          <label style={{ display: 'block', marginBottom: 6 }}>Unit</label>
          <input
            type="text"
            value={form.unit}
            onChange={(e) => updateField('unit', e.target.value)}
            style={{ width: '100%', padding: 8 }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>Factor Value</label>
          <input
            type="number"
            step="0.0001"
            value={form.factorValue}
            onChange={(e) => updateField('factorValue', Number(e.target.value))}
            style={{ width: '100%', padding: 8 }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>Result Unit</label>
          <input
            type="text"
            value={form.resultUnit}
            onChange={(e) => updateField('resultUnit', e.target.value)}
            style={{ width: '100%', padding: 8 }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>Source Name</label>
          <input
            type="text"
            value={form.sourceName ?? ''}
            onChange={(e) => updateField('sourceName', e.target.value)}
            style={{ width: '100%', padding: 8 }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>Source Reference</label>
          <input
            type="text"
            value={form.sourceReference ?? ''}
            onChange={(e) => updateField('sourceReference', e.target.value)}
            style={{ width: '100%', padding: 8 }}
          />
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={!!form.isDefault}
              onChange={(e) => updateField('isDefault', e.target.checked)}
            />
            Is Default
          </label>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <button type="submit" disabled={submitting} style={{ padding: '10px 16px' }}>
            {submitting ? 'Creating...' : 'Create Conversion Factor'}
          </button>
        </div>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
      {loading && <p>Loading conversion factors...</p>}

      {!loading && (
        <div style={{ border: '1px solid #ddd', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f7f7f7' }}>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Activity Type</th>
                <th style={thStyle}>Unit</th>
                <th style={thStyle}>Factor Value</th>
                <th style={thStyle}>Result Unit</th>
                <th style={thStyle}>Default</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 16, textAlign: 'center' }}>
                    No conversion factors yet.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    <td style={tdStyle}>{item.name}</td>
                    <td style={tdStyle}>{item.type}</td>
                    <td style={tdStyle}>{item.activityType ?? '-'}</td>
                    <td style={tdStyle}>{item.unit}</td>
                    <td style={tdStyle}>{item.factorValue}</td>
                    <td style={tdStyle}>{item.resultUnit}</td>
                    <td style={tdStyle}>{item.isDefault ? 'Yes' : 'No'}</td>
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