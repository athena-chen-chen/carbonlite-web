import { useEffect, useMemo, useState } from 'react';

/** Keep in sync with Emissions.tsx */
type EmissionRow = {
  id: string;
  date: string;   // YYYY-MM-DD
  scope: string;
  category: string;
  activity: string;
  amount: number;
  unit: string;
  factor: number;
  co2e: number;   // kg
  notes?: string;
};

const LS_KEY = 'emissions_v1';

/* ----------------------------- utils ----------------------------- */

function loadRows(): EmissionRow[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as EmissionRow[]) : [];
  } catch {
    return [];
  }
}

function fmt(n: number | string, digits = 2) {
  const num = typeof n === 'string' ? Number(n) : n;
  if (Number.isNaN(num)) return String(n);
  return Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(num);
}

function sum(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0);
}

function toCSV(rows: Array<Record<string, any>>): string {
  const headers = Object.keys(rows[0] || {});
  const escape = (v: any) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
  const lines = [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(',')),
  ];
  return lines.join('\n');
}

function downloadFile(filename: string, contents: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function startOfYearISO(d = new Date()) {
  return new Date(d.getFullYear(), 0, 1).toISOString().slice(0, 10);
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/* ----------------------------- page ------------------------------ */

export default function Reports() {
  const [rows, setRows] = useState<EmissionRow[]>([]);
  const [from, setFrom] = useState<string>(startOfYearISO());
  const [to, setTo] = useState<string>(todayISO());

  useEffect(() => setRows(loadRows()), []);

  const filtered = useMemo(() => {
    return rows.filter(r => (!from || r.date >= from) && (!to || r.date <= to));
  }, [rows, from, to]);

  const total = useMemo(() => sum(filtered.map(r => r.co2e || 0)), [filtered]);
  const byScope = useMemo(() => groupSum(filtered, 'scope'), [filtered]);
  const byCategory = useMemo(() => groupSum(filtered, 'category'), [filtered]);
  const topActivities = useMemo(() => groupSum(filtered, 'activity').slice(0, 10), [filtered]);

  const exportRawCSV = () => {
    if (filtered.length === 0) return;
    const csv = toCSV(
      filtered.map(r => ({
        date: r.date,
        scope: r.scope,
        category: r.category,
        activity: r.activity,
        amount: r.amount,
        unit: r.unit,
        factor: r.factor,
        co2e_kg: r.co2e,
        notes: r.notes ?? '',
      }))
    );
    downloadFile(`emissions_raw_${from || 'all'}_${to || 'all'}.csv`, csv);
  };

  const exportSummaryCSV = () => {
    const rows: Array<Record<string, any>> = [
      { section: 'Totals', label: 'Total CO2e (kg)', value: total },
      { section: 'Totals', label: 'Records', value: filtered.length },
      ...byScope.map(i => ({ section: 'By Scope', label: i.label, value: i.value })),
      ...byCategory.map(i => ({ section: 'By Category', label: i.label, value: i.value })),
      ...topActivities.map(i => ({ section: 'Top Activities', label: i.label, value: i.value })),
    ];
    const csv = toCSV(rows);
    downloadFile(`emissions_summary_${from || 'all'}_${to || 'all'}.csv`, csv);
  };

  const printReport = () => window.print();

  return (
    <>
      <div className="no-print" style={{ display: 'flex', gap: 12, alignItems: 'end', marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Reports</h2>
          <small>Create exports and printable summaries (works offline)</small>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
          <label>From <input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
          <label>To <input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
          <button onClick={() => { setFrom(startOfYearISO()); setTo(todayISO()); }}>This Year</button>
          <button onClick={() => { setFrom(''); setTo(''); }}>All Time</button>
        </div>
      </div>

      {/* Printable cover/header */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>CarbonLite Emissions Report</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 8 }}>
          <div><strong>Date Range:</strong> {from || '—'} → {to || '—'}</div>
          <div><strong>Generated:</strong> {new Date().toLocaleString()}</div>
          <div><strong>Records:</strong> {filtered.length}</div>
          <div><strong>Total CO₂e:</strong> {fmt(total)} kg</div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid" style={{ marginTop: 12 }}>
        <div className="card">
          <div>Total CO₂e</div>
          <div className="mono" style={{ fontSize: 28 }}>{fmt(total)}</div>
          <small>kg</small>
        </div>
        <div className="card">
          <div>Avg per Record</div>
          <div className="mono" style={{ fontSize: 28 }}>
            {fmt(filtered.length ? total / filtered.length : 0)}
          </div>
          <small>kg / record</small>
        </div>
        <div className="card">
          <div>Date Range</div>
          <div className="mono">{from || '—'} → {to || '—'}</div>
        </div>
      </div>

      {/* Summaries */}
      <div className="grid" style={{ marginTop: 12 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>By Scope</h3>
          <SimpleTable rows={byScope} />
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>By Category</h3>
          <SimpleTable rows={byCategory} />
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Top Activities</h3>
          <SimpleTable rows={topActivities} />
        </div>
      </div>

      {/* Raw records (optional in print) */}
      <div className="card print-only" style={{ marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Raw Records</h3>
        {filtered.length === 0 ? (
          <p style={{ color: '#666' }}>No data in selected range.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table cellPadding={6} style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Scope</Th>
                  <Th>Category</Th>
                  <Th>Activity</Th>
                  <Th style={{ textAlign: 'right' }}>Amount</Th>
                  <Th>Unit</Th>
                  <Th style={{ textAlign: 'right' }}>Factor</Th>
                  <Th style={{ textAlign: 'right' }}>CO₂e (kg)</Th>
                  <Th>Notes</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <Td>{r.date}</Td>
                    <Td>{r.scope}</Td>
                    <Td>{r.category}</Td>
                    <Td>{r.activity}</Td>
                    <Td style={{ textAlign: 'right' }}>{fmt(r.amount)}</Td>
                    <Td>{r.unit}</Td>
                    <Td style={{ textAlign: 'right' }}>{fmt(r.factor)}</Td>
                    <Td style={{ textAlign: 'right' }}>{fmt(r.co2e)}</Td>
                    <Td>{r.notes}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="no-print" style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <button onClick={exportSummaryCSV} disabled={!filtered.length}>Export Summary CSV</button>
        <button onClick={exportRawCSV} disabled={!filtered.length}>Export Raw CSV</button>
        <button onClick={printReport} disabled={!filtered.length}>Print / Save as PDF</button>
      </div>

      <small className="no-print" style={{ display:'block', marginTop:8, color:'#6b7280' }}>
        Tip: Use “Print / Save as PDF” to create a one-click report pack. The “Raw Records” section only appears in print.
      </small>
    </>
  );
}

/* --------------------------- subcomponents ------------------------- */

function groupSum(rows: EmissionRow[], key: keyof EmissionRow) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = String((r as any)[key] ?? '—').trim();
    map.set(k, (map.get(k) || 0) + (r.co2e || 0));
  }
  const items = Array.from(map.entries()).map(([label, value]) => ({ label, value }));
  items.sort((a, b) => b.value - a.value);
  return items;
}

function SimpleTable({ rows }: { rows: { label: string; value: number }[] }) {
  if (!rows.length) return <p style={{ color: '#666' }}>No data.</p>;
  return (
    <table cellPadding={6} style={{ borderCollapse: 'collapse', width: '100%' }}>
      <thead>
        <tr>
          <Th>Label</Th>
          <Th style={{ textAlign: 'right' }}>CO₂e (kg)</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.label}>
            <Td>{r.label}</Td>
            <Td style={{ textAlign: 'right' }}>{fmt(r.value)}</Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Th(props: any) {
  return (
    <th
      {...props}
      style={{
        textAlign: 'left',
        borderBottom: '1px solid #eee',
        padding: 6,
        ...(props.style || {}),
      }}
    />
  );
}

function Td(props: any) {
  return (
    <td
      {...props}
      style={{
        borderBottom: '1px solid #f2f2f2',
        padding: 6,
        verticalAlign: 'top',
        ...(props.style || {}),
      }}
    />
  );
}
