import { useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getMetricsSummary } from '../services/metrics';
import { getActivityDataList } from '../services/activityData';

type ActivityItem = {
  id: string;
  activityType: string;
  recordDate: string;
  quantity: string | number;
  unit: string;
  sourceType: string;
  sourceReference?: string | null;
  notes?: string | null;
};
const SCOPE_MAP: Record<string, 'Scope 1' | 'Scope 2' | 'Scope 3'> = {
  // Scope 1（直接排放）
  DIESEL: 'Scope 1',
  GASOLINE: 'Scope 1',
  NATURAL_GAS: 'Scope 1',
  PROPANE: 'Scope 1',

  // Scope 2（电力）
  ELECTRICITY: 'Scope 2',

  // Scope 3（其他）
  TRAVEL: 'Scope 3',
  WASTE: 'Scope 3',
  WATER: 'Scope 3',
  FREIGHT: 'Scope 3',
};

export default function ReportingPage() {
  const [summary, setSummary] = useState<any>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
const [reloadKey, setReloadKey] = useState(0);
const [periodStart, setPeriodStart] = useState('2026-01-01');
const [periodEnd, setPeriodEnd] = useState('2026-12-31');
  async function loadReportData() {
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
      setError(err instanceof Error ? err.message : 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  }
useEffect(() => {
  loadReportData();
}, [reloadKey]);

function classifyScope(activityType?: string) {
  const type = String(activityType ?? '').toUpperCase();

  if (['DIESEL', 'GASOLINE', 'NATURAL_GAS', 'PROPANE'].includes(type)) {
    return 'Scope 1';
  }

  if (type === 'ELECTRICITY') {
    return 'Scope 2';
  }

  return 'Scope 3';
}

  const totalsByMetric = summary?.totalsByMetric ?? [];
  const totalsByFacility = summary?.totalsByFacility ?? [];

  const carbonMetric = totalsByMetric.find((m: any) =>
    String(m.metricType).includes('CARBON'),
  );
  const filteredActivities = useMemo(() => {
  return activities.filter((item) => {
    const date = item.recordDate?.slice(0, 10);

    if (!date) return false;

    return date >= periodStart && date <= periodEnd;
  });
}, [activities, periodStart, periodEnd]);
const fuelActivities = filteredActivities.filter((item) =>
  ['DIESEL', 'GASOLINE', 'NATURAL_GAS'].includes(item.activityType),
);

const electricityActivities = filteredActivities.filter(
  (item) => item.activityType === 'ELECTRICITY',
);


  const totalFuel = useMemo(() => {
    return fuelActivities.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }, [fuelActivities]);

  const totalElectricity = useMemo(() => {
    return electricityActivities.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0,
    );
  }, [electricityActivities]);

const scopeRows = useMemo(() => {
  return filteredActivities.map((item) => ({
    scope: classifyScope(item.activityType),
    activityType: item.activityType,
    quantity: item.quantity,
    unit: item.unit,
    source: formatSourceType(item.sourceType),
    reference: item.sourceReference ?? '-',
  }));
}, [filteredActivities]);

  const scopeSummary = useMemo(() => {
  const summary = {
    'Scope 1': 0,
    'Scope 2': 0,
    'Scope 3': 0,
  };

  activities.forEach((item) => {
    const scope = classifyScope(item.activityType);
    summary[scope] += Number(item.quantity || 0);
  });

  return summary;
}, [activities]);

  function handleDownloadCSV() {
    const rows = [
      ['Scope', 'Activity Type', 'Quantity', 'Unit', 'Source'],
      ...scopeRows.map((r) => [
        r.scope,
        r.activityType,
        r.quantity,
        r.unit,
        r.source,
      ]),
    ];

    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `carbonlite-ai-report-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }
 
function buildScopeNarrative(scopeSummary: Record<string, number>) {
  const scope1 = scopeSummary['Scope 1'] ?? 0;
  const scope2 = scopeSummary['Scope 2'] ?? 0;
  const scope3 = scopeSummary['Scope 3'] ?? 0;

  const lines = [];

  if (scope1 > 0) {
    lines.push(
      `Scope 1 emissions are associated with direct fuel use, such as diesel, gasoline, natural gas, or propane consumed by owned or controlled operations.`
    );
  }

  if (scope2 > 0) {
    lines.push(
      `Scope 2 emissions are associated with purchased electricity consumed by the organization.`
    );
  }

  if (scope3 > 0) {
    lines.push(
      `Scope 3 emissions are associated with other indirect activities such as freight, waste, water, travel, or third-party services.`
    );
  }

  if (!lines.length) {
    lines.push(
      `No activity data was available for Scope 1, Scope 2, or Scope 3 classification.`
    );
  }

  lines.push(
    `Scope classification is based on activity type and is intended to support internal review and compliance preparation.`
  );

  return lines;
}
const scopeNarrative = useMemo(() => {
  return buildScopeNarrative(scopeSummary);
}, [scopeSummary]);

function handleDownloadPDF() {
  const doc = new jsPDF();
  const today = new Date().toISOString().slice(0, 10);

  // Cover / Header
  doc.setFontSize(20);
  doc.text('CarbonLite AI', 14, 20);

  doc.setFontSize(16);
  doc.text('Emissions Reporting Summary', 14, 32);

  doc.setFontSize(10);
  doc.text('Company: KACH CANADA LTD.', 14, 45);
  doc.text('Reporting Period: Draft period / user selected period', 14, 52);
  doc.text(`Generated Date: ${today}`, 14, 59);
  doc.text('Status: Draft for internal review and compliance preparation', 14, 66);

  // Executive summary
  autoTable(doc, {
    startY: 78,
    head: [['Date', 'Activity Type', 'Quantity', 'Unit', 'Source', 'Reference']],
    body: filteredActivities.map((item) => [
      item.recordDate?.slice(0, 10) ?? '',
      item.activityType,
      item.quantity,
      item.unit,
      formatSourceType(item.sourceType),
      item.sourceReference ?? '',
    ]),
  });

  const executiveY = (doc as any).lastAutoTable?.finalY ?? 115;

  // Scope 1/2/3
  autoTable(doc, {
    startY: executiveY + 12,
    head: [['Scope', 'Description', 'Activity Type', 'Quantity', 'Unit', 'Source']],
    body: scopeRows.map((r) => [
      r.scope,
      getScopeDescription(r.scope),
      r.activityType,
      r.quantity,
      r.unit,
      r.source,
    ]),
  });

  const scopeY = (doc as any).lastAutoTable?.finalY ?? 170;

  // Source Evidence
  if (scopeY > 230) {
    doc.addPage();
  }

  const sourceStartY = scopeY > 230 ? 20 : scopeY + 12;

  doc.setFontSize(14);
  doc.text('Source Evidence / Audit Trail', 14, sourceStartY);

  autoTable(doc, {
    startY: sourceStartY + 8,
    head: [['Date', 'Activity Type', 'Quantity', 'Unit', 'Source Type', 'Source Reference']],
    body: filteredActivities.map((item) => [
      item.recordDate?.slice(0, 10) ?? '',
      item.activityType,
      item.quantity,
      item.unit,
      item.sourceType,
      item.sourceReference ?? '',
    ]),
  });

  // Methodology
  doc.addPage();

  doc.setFontSize(14);
  doc.text('Methodology & Assumptions', 14, 20);

  doc.setFontSize(10);
  doc.text(
    [
      'Emissions estimates are calculated using imported activity data and configured conversion factors.',
      'Scope classification is based on activity type:',
      '- Scope 1: direct fuel combustion such as diesel, gasoline, natural gas, or propane.',
      '- Scope 2: purchased electricity.',
      '- Scope 3: other indirect activity such as freight, waste, water, travel, or third-party services.',
      'Uploaded documents may be processed using AI-assisted extraction and reviewed before import.',
      'This report is intended for internal reporting support and compliance preparation.',
      'Final submission requirements may vary by jurisdiction and reporting program.',
    ],
    14,
    32,
  );

  // Review Notes
  autoTable(doc, {
    startY: 86,
    head: [['Review Notes', '']],
    body: [
      ['Reviewer', ''],
      ['Review Date', ''],
      ['Notes', ''],
      ['Approval Status', 'Draft / Reviewed / Approved'],
    ],
  });

  doc.save(`carbonlite-ai-emissions-report-${today}.pdf`);
}
function getScopeDescription(scope: string) {
  if (scope === 'Scope 1') return 'Direct fuel emissions';
  if (scope === 'Scope 2') return 'Purchased electricity';
  if (scope === 'Scope 3') return 'Other indirect emissions';
  return 'Unclassified';
}
function formatSourceType(sourceType?: string) {
  if (!sourceType) return 'Unknown';

  const value = sourceType.toUpperCase();

  if (value === 'MANUAL') return 'Manual';
  if (value === 'CSV') return 'CSV Import';
  if (value === 'EXCEL') return 'Excel Import';
  if (value === 'PASTE') return 'Pasted from Excel';
  if (value === 'DOCUMENT_AI' || value === 'AI_EXTRACTION') return 'AI Extraction';

  return sourceType;
}

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h1>Government Reporting</h1>

      <p style={{ color: '#666', marginBottom: 20 }}>
        Prepare structured emissions summaries using imported activity records
        and calculated metrics.
      </p>
<div style={filterCardStyle}>
  <div>
    <label style={labelStyle}>Start Date</label>
    <input
      type="date"
      value={periodStart}
      onChange={(e) => setPeriodStart(e.target.value)}
      style={inputStyle}
    />
  </div>

  <div>
    <label style={labelStyle}>End Date</label>
    <input
      type="date"
      value={periodEnd}
      onChange={(e) => setPeriodEnd(e.target.value)}
      style={inputStyle}
    />
  </div>

  <button
    type="button"
    onClick={() => {
      setPeriodStart('2026-01-01');
      setPeriodEnd('2026-12-31');
    }}
    style={secondaryButtonStyle}
  >
    2026 Full Year
  </button>
</div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button onClick={loadReportData} style={secondaryButtonStyle}>
          Refresh
        </button>

        <button
          onClick={handleDownloadCSV}
          disabled={!activities.length}
          style={secondaryButtonStyle}
        >
          Download CSV
        </button>

        <button
          onClick={handleDownloadPDF}
          disabled={!activities.length}
          style={primaryButtonStyle}
        >
          Download PDF
        </button>
      </div>

      {error ? <div style={errorStyle}>{error}</div> : null}

      {loading ? (
        <p>Loading report data...</p>
      ) : (
        <>
          <div style={gridStyle}>
            <Card
              title="Estimated Emissions"
              value={
                carbonMetric
                  ? `${carbonMetric.totalValue} ${carbonMetric.unit}`
                  : 'No data'
              }
              icon="🌱"
            />

            <Card title="Fuel Usage" value={`${totalFuel} L / m3`} icon="⛽" />

            <Card
              title="Electricity"
              value={`${totalElectricity} kWh`}
              icon="⚡"
            />

            <Card
              title="Records Processed"
              value={String(activities.length)}
              icon="📄"
            />
          </div>

          <Section title="Scope Breakdown">
            <table style={tableStyle}>
              <thead>
                <tr>
              <th style={thStyle}>Date</th>
<th style={thStyle}>Activity Type</th>
<th style={thStyle}>Quantity</th>
<th style={thStyle}>Unit</th>
<th style={thStyle}>Source</th>
<th style={thStyle}>Reference</th>
                </tr>
              </thead>
              <tbody>
                {scopeRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={emptyStyle}>
                      No activity records available.
                    </td>
                  </tr>
                ) : (
                  filteredActivities.map((item) => (
                    <tr key={item.id}>
                      <td style={tdStyle}>{item.recordDate?.slice(0, 10)}</td>
                      <td style={tdStyle}>{item.activityType}</td>
                      <td style={tdStyle}>{item.quantity}</td>
                      <td style={tdStyle}>{item.unit}</td>
                      <td style={tdStyle}>{formatSourceType(item.sourceType)}</td>
                      <td style={tdStyle}>{item.sourceReference ?? '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Section>

          <Section title="Metrics Summary">
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Metric Type</th>
                  <th style={thStyle}>Unit</th>
                  <th style={thStyle}>Total Value</th>
                  <th style={thStyle}>Count</th>
                </tr>
              </thead>
              <tbody>
                {totalsByMetric.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={emptyStyle}>
                      No calculated metrics available.
                    </td>
                  </tr>
                ) : (
                  totalsByMetric.map((item: any, index: number) => (
                    <tr key={index}>
                      <td style={tdStyle}>{item.metricType}</td>
                      <td style={tdStyle}>{item.unit}</td>
                      <td style={tdStyle}>{item.totalValue}</td>
                      <td style={tdStyle}>{item.count}</td>
                    </tr>
                  ))
                  
                )}
              </tbody>
            </table>
          </Section>

          <Section title="Methodology & Assumptions">
            <p style={{ color: '#555', lineHeight: 1.7 }}>
              Emissions estimates are calculated using imported activity data and
              configured conversion factors. Uploaded documents are processed using
              AI-assisted extraction and reviewed before import. This report is
              intended for internal reporting support and compliance preparation.
            </p>
          </Section>
          <Section title="Emissions by Scope">
  <div style={{ display: 'flex', gap: 16 }}>
    <Card title="Scope 1" value={scopeSummary['Scope 1']} icon="🏭" />
    <Card title="Scope 2" value={scopeSummary['Scope 2']} icon="⚡" />
    <Card title="Scope 3" value={scopeSummary['Scope 3']} icon="🌍" />
  </div>
</Section>
        </>
      )}
    </div>
  );
}

function Card({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: string;
}) {
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 28 }}>{icon}</div>
      <div style={{ marginTop: 10, color: '#666', fontSize: 14 }}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 26, fontWeight: 800 }}>
        {value}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={sectionStyle}>
      <h2 style={{ marginTop: 0, fontSize: 20 }}>{title}</h2>
      {children}
    </div>
  );
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 16,
  marginBottom: 24,
};

const cardStyle: React.CSSProperties = {
  borderRadius: 16,
  padding: 20,
  background: '#fff',
  border: '1px solid #eee',
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
};

const sectionStyle: React.CSSProperties = {
  borderRadius: 16,
  padding: 20,
  background: '#fff',
  border: '1px solid #eee',
  marginBottom: 20,
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: 12,
  borderBottom: '1px solid #ddd',
  color: '#475569',
};

const tdStyle: React.CSSProperties = {
  padding: 12,
  borderBottom: '1px solid #eee',
};

const emptyStyle: React.CSSProperties = {
  padding: 16,
  textAlign: 'center',
  color: '#666',
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: 10,
  border: 'none',
  background: '#10b981',
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: 10,
  border: '1px solid #d1d5db',
  background: '#fff',
  color: '#111',
  fontWeight: 700,
  cursor: 'pointer',
};

const errorStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 12,
  borderRadius: 10,
  border: '1px solid #fecaca',
  background: '#fef2f2',
  color: '#991b1b',
};

const filterCardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'end',
  gap: 12,
  flexWrap: 'wrap',
  padding: 16,
  borderRadius: 16,
  background: '#fff',
  border: '1px solid #e5e7eb',
  marginBottom: 20,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 700,
  color: '#475569',
};

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #cbd5e1',
};
