import { useEffect, useMemo, useState } from 'react';
import { calculateMetrics, getMetricsSummary } from '../services/metrics';
import { getActivityDataList } from '../services/activityData';

export function MetricsSummaryPage() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [calcLoading, setCalcLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSummary() {
    setLoading(true);
    setError(null);
    try {
      const data = await getMetricsSummary();
      setSummary(data);
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

  useEffect(() => {
    loadSummary();
  }, []);

  const totalsByMetric = summary?.totalsByMetric ?? [];

  const fuelMetric = totalsByMetric.find((m: any) =>
    m.metricType.includes('FUEL')
  );

  const electricityMetric = totalsByMetric.find((m: any) =>
    m.metricType.includes('ELECTRIC')
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

      <button
        onClick={handleCalculate}
        style={{
          marginBottom: 24,
          padding: '10px 16px',
          borderRadius: 10,
          border: 'none',
          background: '#10b981',
          color: '#fff',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {calcLoading ? 'Generating...' : 'Generate Metrics'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {loading ? (
        <p>Loading...</p>
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
              value={fuelMetric ? `${fuelMetric.totalValue} ${fuelMetric.unit}` : '—'}
              icon="⛽"
              color="#f59e0b"
            />

            <MetricCard
              title="Electricity"
              value={
                electricityMetric
                  ? `${electricityMetric.totalValue} ${electricityMetric.unit}`
                  : '—'
              }
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