import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import FactorForm, { FactorFormValues } from './FactorForm';
import type { CarbonFactor } from '@carbonlite/shared-types';

type Mode = { kind: 'idle' } |
            { kind: 'create' } |
            { kind: 'edit', row: CarbonFactor };

export default function FactorsPage() {
  const [rows, setRows] = useState<CarbonFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>({ kind: 'idle' });
  const busy = useMemo(() => loading || mode.kind !== 'idle', [loading, mode]);

  const load = () => {
    setLoading(true);
    api.get('/factors')
      .then(r => setRows(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const onCreate = async (values: FactorFormValues) => {
    await api.post('/factors', values);
    setMode({ kind: 'idle' });
    load();
  };

  const onUpdate = async (id: string, values: FactorFormValues) => {
    await api.put(`/factors/${id}`, values);
    setMode({ kind: 'idle' });
    load();
  };

  const onDelete = async (id: string) => {
    if (!window.confirm('Delete this factor?')) return;
    await api.delete(`/factors/${id}`);
    load();
  };

  return (
    <main style={{ padding: 24 }}>
      <h1>Carbon Factors</h1>

      {mode.kind === 'idle' && (
        <>
          <button onClick={() => setMode({ kind: 'create' })} disabled={busy}>+ New</button>
          <table cellPadding={6} style={{ marginTop: 12, borderCollapse:'collapse' }}>
            <thead>
              <tr>
                <th>Category</th>
                <th>SubCategory</th>
                <th>Value</th>
                <th>Unit</th>
                <th>Year</th>
                <th>Region</th>
                <th>Scope</th>
                <th>Source</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td>{r.category}</td>
                <td>{r.subCategory}</td>
                <td>{r.factorValue}</td>
                <td>{r.unit}</td>
                <td>{r.year}</td>
                <td>{r.region}</td>
                <td>{r.scope}</td>
                <td>{r.source}</td>
                <td>{r.notes}</td>
                <td>
                  <button onClick={() => setMode({ kind: 'edit', row: r })}>Edit</button>
                  <button onClick={() => onDelete(r.id!)}>Delete</button>
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        </>
      )}

      {mode.kind === 'create' && (
        <>
          <h2>New Factor</h2>
          <FactorForm
            onSubmit={onCreate}
            onCancel={() => setMode({ kind: 'idle' })}
          />
        </>
      )}

      {mode.kind === 'edit' && (
        <>
          <h2>Edit Factor</h2>
          <FactorForm
            initial={{
              category: mode.row.category,
              subCategory: mode.row.subCategory,
              factorValue: mode.row.factorValue,
              unit: mode.row.unit,
              source: mode.row.source,
              year: mode.row.year,
              region: mode.row.region,
              scope: mode.row.scope,
              notes: mode.row.notes,
            }}
            onSubmit={(v) => onUpdate(mode.row.id!, v)}
            onCancel={() => setMode({ kind: 'idle' })}
          />
        </>
      )}
    </main>
  );
}
