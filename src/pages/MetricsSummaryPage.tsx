import { useEffect, useMemo, useState } from 'react';
import { calculateMetrics, getMetricsSummary } from '../services/metrics';
import { getActivityDataList } from '../services/activityData';

type SummaryCardProps = {
  title: string;
  value: string;
  subtitle?: string;
};

function SummaryCard({ title, value, subtitle }: SummaryCardProps) {
  return (
    <div
      style={{
        padding: 20,
        border: '1px solid #ddd',
        borderRadius: 12,
        background: '#fff',
        minHeight: 120,
      }}
    >
      <div style={{ fontSize: 14, color: '#666', marginBottom: 10 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2 }}>{value}</div>
      {subtitle ? (
        <div style={{ marginTop: 10, fontSize: 13, color: '#777' }}>{subtitle}</div>
      ) : null}
    </div>
  );
}

export function MetricsSummaryPage() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [calcLoading, setCalcLoading] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  async function loadSummary(showRefreshState = false) {
    if (showRefreshState) {
      setRefreshLoading(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const data = await getMetricsSummary();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load summary');
    } finally {
      if (showRefreshState) {
        setRefreshLoading(false);
      } else {
        setLoading(false);
      }
    }
  }

  async function handleCalculate() {
    setCalcLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      const list: any = await getActivityDataList();
      const items = list.items ?? [];
      const ids = items.map((item: any) => item.id);

      if (!ids.length) {
        setInfoMessage('No activity data found. Please create activity data first.');
        return;
      }

      const result = await calculateMetrics(ids);

      await loadSummary(true);

      setInfoMessage(
        `Calculation finished. ${result.count ?? 0} metric result(s) created or refreshed.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate metrics');
    } finally {
      setCalcLoading(false);
    }
  }

  async function handleRefresh() {
    setInfoMessage(null);
    await loadSummary(true);
  }

  useEffect(() => {
    loadSummary();
  }, []);

  const totalsByMetric = summary?.totalsByMetric ?? [];
  const totalsByFacility = summary?.totalsByFacility ?? [];

  const primaryMetric = useMemo(() => {
    return totalsByMetric.find((item: any) => item.metricType === 'CARBON_EMISSION')
      ?? totalsByMetric[0]
      ?? null;
  }, [totalsByMetric]);

  const facilityCount = useMemo(() => {
    const uniqueIds = new Set(
      totalsByFacility.map((item: any) => item.facilityId ?? 'unassigned'),
    );
    return uniqueIds.size;
  }, [totalsByFacility]);

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Metrics Summary</h1>
          <p style={{ marginTop: 8, color: '#666' }}>
            Calculate and review aggregated carbon results.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={handleCalculate}
            disabled={calcLoading}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid #111',
              background: '#111',
              color: '#fff',
              cursor: calcLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {calcLoading ? 'Calculating...' : 'Calculate Carbon Emission'}
          </button>

          <button
            onClick={handleRefresh}
            disabled={refreshLoading || loading}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid #ccc',
              background: '#fff',
              color: '#111',
              cursor: refreshLoading || loading ? 'not-allowed' : 'pointer',
            }}
          >
            {refreshLoading ? 'Refreshing...' : 'Refresh Summary'}
          </button>
        </div>
      </div>

      {error ? (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 8,
            border: '1px solid #f1b5b5',
            background: '#fff4f4',
            color: '#9b1c1c',
          }}
        >
          {error}
        </div>
      ) : null}

      {infoMessage ? (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 8,
            border: '1px solid #b8dfc1',
            background: '#f3fff5',
            color: '#1d6b2d',
          }}
        >
          {infoMessage}
        </div>
      ) : null}

      {loading ? (
        <p>Loading summary...</p>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 16,
              marginBottom: 24,
            }}
          >
            <SummaryCard
              title="Total Carbon Emission"
              value={
                primaryMetric
                  ? `${primaryMetric.totalValue} ${primaryMetric.unit}`
                  : 'No data'
              }
              subtitle={
                primaryMetric
                  ? `${primaryMetric.count} metric record(s)`
                  : 'Run calculation after creating activity data and factors.'
              }
            />

            <SummaryCard
              title="Metric Groups"
              value={String(totalsByMetric.length)}
              subtitle="Number of aggregated metric buckets."
            />

            <SummaryCard
              title="Facilities Covered"
              value={String(totalsByFacility.length ? facilityCount : 0)}
              subtitle="Distinct facility groups in current summary."
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: 24,
            }}
          >
            <section
              style={{
                border: '1px solid #ddd',
                borderRadius: 12,
                background: '#fff',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: 16, borderBottom: '1px solid #eee' }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>Totals by Metric</h2>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fafafa' }}>
                    <th style={thStyle}>Metric Type</th>
                    <th style={thStyle}>Unit</th>
                    <th style={thStyle}>Total Value</th>
                    <th style={thStyle}>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {totalsByMetric.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: 16, textAlign: 'center' }}>
                        No metrics yet.
                      </td>
                    </tr>
                  ) : (
                    totalsByMetric.map((item: any, index: number) => (
                      <tr key={`${item.metricType}-${item.unit}-${index}`}>
                        <td style={tdStyle}>{item.metricType}</td>
                        <td style={tdStyle}>{item.unit}</td>
                        <td style={tdStyle}>{item.totalValue}</td>
                        <td style={tdStyle}>{item.count}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>

            <section
              style={{
                border: '1px solid #ddd',
                borderRadius: 12,
                background: '#fff',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: 16, borderBottom: '1px solid #eee' }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>Totals by Facility</h2>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fafafa' }}>
                    <th style={thStyle}>Facility</th>
                    <th style={thStyle}>Metric Type</th>
                    <th style={thStyle}>Unit</th>
                    <th style={thStyle}>Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  {totalsByFacility.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: 16, textAlign: 'center' }}>
                        No facility summary yet.
                      </td>
                    </tr>
                  ) : (
                    totalsByFacility.map((item: any, index: number) => (
                      <tr
                        key={`${item.facilityId ?? 'unassigned'}-${item.metricType}-${item.unit}-${index}`}
                      >
                        <td style={tdStyle}>{item.facilityId ?? 'Unassigned'}</td>
                        <td style={tdStyle}>{item.metricType}</td>
                        <td style={tdStyle}>{item.unit}</td>
                        <td style={tdStyle}>{item.totalValue}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>
          </div>
        </>
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