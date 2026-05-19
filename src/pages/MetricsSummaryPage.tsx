import { useEffect, useMemo, useState } from 'react';
import { calculateMetrics, getMetricsSummary } from '../services/metrics';
import { getActivityDataList } from '../services/activityData';
import { useLocation } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { isDemoMode } from '../demo/demoData';
import {
  aggregateActivityUsage,
  formatActivityUsageValue,
  type ActivityUsageRecord,
} from '../utils/activityAggregation';


export function MetricsSummaryPage() {
  const location = useLocation();
  const [summary, setSummary] = useState<any>(null);
  const [activities, setActivities] = useState<ActivityUsageRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [calcLoading, setCalcLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    () => (location.state as { metricsError?: string } | null)?.metricsError ?? null,
  );
const [reloadKey, setReloadKey] = useState(0);

useEffect(() => {
  loadSummary();
}, [reloadKey]);
  async function loadSummary() {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, activityData] = await Promise.all([
        getMetricsSummary(),
        getActivityDataList(),
      ]);
      setSummary(summaryData);
      setActivities(activityData.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load summary');
    } finally {
      setLoading(false);
    }
  }

  async function handleCalculate() {
    setCalcLoading(true);
    setError(null);

    try {
      const list: any = await getActivityDataList();
      const ids = (list.items ?? []).map((item: any) => item.id);

      if (!ids.length) {
        alert('No activity data found');
        return;
      }

      await calculateMetrics(ids);
      await loadSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate metrics');
    } finally {
      setCalcLoading(false);
    }
  }

// function handleDownloadCSV() {
//   const totalsByMetric = summary?.totalsByMetric ?? [];

//   const rows = [
//     ['Metric Type', 'Unit', 'Total Value', 'Count'],
//     ...totalsByMetric.map((item: any) => [
//       item.metricType,
//       item.unit,
//       item.totalValue,
//       item.count,
//     ]),
//   ];

//   const csv = rows.map((row) => row.join(',')).join('\n');
//   const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
//   const url = URL.createObjectURL(blob);

//   const link = document.createElement('a');
//   link.href = url;
//   link.download = 'carbonlite-metrics-summary.csv';
//   link.click();

//   URL.revokeObjectURL(url);
// }
function escapeCSV(value: unknown) {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function handleDownloadCSV() {
  const totalsByMetric = summary?.totalsByMetric ?? [];
  const totalsByFacility = summary?.totalsByFacility ?? [];

  const rows = [
    ['Section', 'Metric Type', 'Facility', 'Unit', 'Total Value', 'Count'],

    ...totalsByMetric.map((item: any) => [
      'Totals by Metric',
      item.metricType,
      '',
      item.unit,
      item.totalValue,
      item.count,
    ]),

    ...totalsByFacility.map((item: any) => [
      'Totals by Facility',
      item.metricType,
      item.facilityId ?? 'Unassigned',
      item.unit,
      item.totalValue,
      '',
    ]),
  ];

  const csv = rows
    .map((row) => row.map(escapeCSV).join(','))
    .join('\n');

  const blob = new Blob([csv], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `carbonlite-metrics-summary-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
function handleDownloadPDF() {
  const totalsByMetric = summary?.totalsByMetric ?? [];
  const totalsByFacility = summary?.totalsByFacility ?? [];

  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('CarbonLite AI Metrics Summary', 14, 20);

  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);
  doc.text('Prepared for internal reporting and compliance preparation.', 14, 35);

  autoTable(doc, {
    startY: 45,
    head: [['Metric Type', 'Unit', 'Total Value', 'Count']],
    body: totalsByMetric.map((item: any) => [
      item.metricType,
      item.unit,
      item.totalValue,
      item.count,
    ]),
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 12,
    head: [['Facility', 'Metric Type', 'Unit', 'Total Value']],
    body: totalsByFacility.map((item: any) => [
      item.facilityId ?? 'Unassigned',
      item.metricType,
      item.unit,
      item.totalValue,
    ]),
  });

  doc.save(
    `carbonlite-metrics-summary-${new Date().toISOString().slice(0, 10)}.pdf`,
  );
}
  const totalsByMetric = summary?.totalsByMetric ?? [];
  const demoMode = isDemoMode();
  const usageTotals = useMemo(
    () => aggregateActivityUsage(activities),
    [activities],
  );

  const carbonMetric = totalsByMetric.find((m: any) =>
    m.metricType.includes('CARBON')
  );

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 8 }}>Metrics Summary</h1>

      <p style={{ color: '#666', marginBottom: 24 }}>
        Your uploaded documents have been automatically converted into structured data and summarized.
      </p>
      {demoMode ? (
        <div style={demoNoticeStyle}>
          Demo metrics are preloaded from a fuel invoice, utility bill, and CSV activity import.
        </div>
      ) : null}
 
<div style={{display:'flex',flexDirection: 'row',  gap: 8,marginBottom: 24}}>
      <button
        onClick={handleCalculate}
        disabled={calcLoading}
        style={{
          
          padding: '10px 16px',
          borderRadius: 10,
          border: 'none',
          background: calcLoading ? '#9ca3af' : '#10b981',
          color: '#fff',
          fontWeight: 600,
          cursor: calcLoading ? 'not-allowed' : 'pointer',
        }}
      >
        {calcLoading ? 'Generating...' : 'Generate Metrics'}
      </button>
{/* <button
  type="button"
  onClick={handleDownloadCSV}
  disabled={!summary?.totalsByMetric?.length}
  style={{
    padding: '10px 16px',
    borderRadius: 10,
    border: '1px solid #10b981',
    background: '#fff',
    color: '#047857',
    fontWeight: 700,
    cursor: summary?.totalsByMetric?.length ? 'pointer' : 'not-allowed',
  }}
>
  Download CSV
</button> */}
{/* <button
  type="button"
  onClick={handleDownloadPDF}
  disabled={!summary?.totalsByMetric?.length}
  style={{
    padding: '10px 16px',
    borderRadius: 10,
    border: '1px solid #111827',
    background: '#111827',
    color: '#fff',
    fontWeight: 700,
    cursor: summary?.totalsByMetric?.length ? 'pointer' : 'not-allowed',
  }}
>
  Download PDF
</button> */}
</div>
      {error && <div style={warningStyle}>{error}</div>}

      {loading ? (
        <div style={loadingStyle}>Generating metrics summary...</div>
      ) : (
        <>
          {/* ⭐ 核心卡片 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 20,
              marginBottom: 30,
            }}
          >
            <MetricCard
              title="Fuel Usage"
              value={formatActivityUsageValue(
                usageTotals.fuel,
                usageTotals.fuelUnitLabel,
              )}
              icon="⛽"
              color="#f59e0b"
            />

            <MetricCard
              title="Electricity"
              value={formatActivityUsageValue(
                usageTotals.electricity,
                usageTotals.electricityUnitLabel,
              )}
              icon="⚡"
              color="#3b82f6"
            />

            <MetricCard
              title="CO₂ Emissions"
              value={
                carbonMetric
                  ? `${carbonMetric.totalValue} ${carbonMetric.unit}`
                  : '—'
              }
              icon="🌱"
              color="#10b981"
              highlight
            />
          </div>
<div
  style={{
    border: '1px solid #bbf7d0',
    background: '#f0fdf4',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
  }}
>
  <h2 style={{ margin: 0, fontSize: 18, color: '#166534' }}>
    Report-ready summary
  </h2>
  <p style={{ marginTop: 8, color: '#166534' }}>
    These results can be reviewed, exported, and used as supporting data for internal reporting or compliance preparation.
  </p>
</div>
          {/* ⭐ 明细表 */}
          <div
            style={{
              border: '1px solid #ddd',
              borderRadius: 12,
              background: '#fff',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: 16, borderBottom: '1px solid #eee' }}>
              <h2 style={{ margin: 0 }}>Totals by Metric</h2>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  <th style={th}>Type</th>
                  <th style={th}>Unit</th>
                  <th style={th}>Total</th>
                  <th style={th}>Count</th>
                </tr>
              </thead>
              <tbody>
                {totalsByMetric.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={td}>
                      No metrics yet. Import activity records or use Demo Mode to preview a report-ready summary.
                    </td>
                  </tr>
                ) : null}
                {totalsByMetric.map((item: any, i: number) => (
                  <tr key={i}>
                    <td style={td}>{item.metricType}</td>
                    <td style={td}>{item.unit}</td>
                    <td style={td}>{item.totalValue}</td>
                    <td style={td}>{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon,
  color,
  highlight,
}: any) {
  return (
    <div
      style={{
        borderRadius: 16,
        padding: 20,
        background: '#fff',
        border: highlight ? `2px solid ${color}` : '1px solid #eee',
        boxShadow: '0 6px 20px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ fontSize: 26 }}>{icon}</div>

      <div style={{ marginTop: 10, color: '#666', fontSize: 14 }}>{title}</div>

      <div
        style={{
          marginTop: 6,
          fontSize: 28,
          fontWeight: 700,
          color: highlight ? color : '#111',
        }}
      >
        {value}
      </div>
    </div>
  );
}

const th = {
  textAlign: 'left' as const,
  padding: 12,
  borderBottom: '1px solid #ddd',
};

const td = {
  padding: 12,
  borderBottom: '1px solid #eee',
};

const demoNoticeStyle: React.CSSProperties = {
  marginBottom: 18,
  padding: 12,
  borderRadius: 10,
  border: '1px solid #c7d2fe',
  background: '#eef2ff',
  color: '#3730a3',
  fontWeight: 600,
};

const warningStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 12,
  borderRadius: 10,
  border: '1px solid #fed7aa',
  background: '#fff7ed',
  color: '#9a3412',
};

const loadingStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
  color: '#475569',
};
