import { useEffect, useState } from 'react';
import { LinearLoadingIndicator } from '../components/LinearLoadingIndicator';
import { PageHeader } from '../components/PageHeader';
import {
  getCustomerMethodologyFactors,
  type CustomerMethodologyFactor,
} from '../services/conversionFactors';
import { getActivityTypeLabel } from '../utils/activityType';
import { getUserFriendlyErrorMessage } from '../utils/userFriendlyErrors';

export function CustomerMethodologyFactorsPage() {
  const [items, setItems] = useState<CustomerMethodologyFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getCustomerMethodologyFactors()
      .then((response) => {
        if (active) setItems(response.items ?? []);
      })
      .catch((loadError) => {
        if (active) setError(getUserFriendlyErrorMessage(loadError, 'conversionFactors'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div style={pageStyle}>
      <PageHeader
        title="Methodology & emission factors"
        subtitle="Review the approved factors CarbonLite may use for normal customer calculations."
      />

      <section style={summaryStyle} aria-label="Approved factor summary">
        <div style={summaryLabelStyle}>Approved factors</div>
        <div style={summaryValueStyle}>{loading ? '—' : items.length}</div>
        <div style={summaryHelpStyle}>Read-only methodology reference</div>
      </section>

      {loading ? (
        <div style={{ marginBottom: 16 }}>
          <LinearLoadingIndicator label="Loading approved emission factors" />
        </div>
      ) : null}
      {error ? <div style={errorStyle}>{error}</div> : null}

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr style={headerRowStyle}>
              <th style={thStyle}>Activity type</th>
              <th style={thStyle}>Factor</th>
              <th style={thStyle}>Geography</th>
              <th style={thStyle}>Applicability year</th>
              <th style={thStyle}>Value / unit</th>
              <th style={thStyle}>Source</th>
              <th style={thStyle}>Methodology / accounting basis</th>
              <th style={thStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {!loading && !error && items.length === 0 ? (
              <tr>
                <td colSpan={8} style={emptyStyle}>No approved emission factors are available.</td>
              </tr>
            ) : items.map((item) => (
              <tr key={factorRowKey(item)}>
                <td style={tdStyle}>{getActivityTypeLabel(item.activityType)}</td>
                <td style={nameCellStyle}>{item.displayName}</td>
                <td style={tdStyle}>{item.geography}</td>
                <td style={tdStyle}>{item.applicabilityYear ?? '—'}</td>
                <td style={tdStyle}>{formatValue(item.factorValue)} {item.resultUnit}/{item.inputUnit}</td>
                <td style={tdStyle}>
                  {item.sourceUrl ? (
                    <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{item.source}</a>
                  ) : item.source}
                </td>
                <td style={methodologyCellStyle}>
                  <strong>{item.accountingBasis}</strong>
                  <div style={methodologyTextStyle}>{item.methodology}</div>
                  {item.assumptions ? <div style={assumptionsStyle}>{item.assumptions}</div> : null}
                </td>
                <td style={tdStyle}><span style={approvedBadgeStyle}>{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function factorRowKey(item: CustomerMethodologyFactor) {
  return [item.activityType, item.displayName, item.geography, item.applicabilityYear, item.inputUnit].join('|');
}

function formatValue(value: number) {
  return new Intl.NumberFormat('en-CA', { maximumFractionDigits: 10 }).format(value);
}

const pageStyle: React.CSSProperties = { padding: 24, maxWidth: 1200, margin: '0 auto' };
const summaryStyle: React.CSSProperties = { width: 240, padding: 16, marginBottom: 20, border: '1px solid #BBF7D0', borderRadius: 12, background: '#F0FDF4' };
const summaryLabelStyle: React.CSSProperties = { color: '#166534', fontSize: 13, fontWeight: 800 };
const summaryValueStyle: React.CSSProperties = { color: '#14532D', fontSize: 26, fontWeight: 800, marginTop: 4 };
const summaryHelpStyle: React.CSSProperties = { color: '#15803D', fontSize: 12, marginTop: 3 };
const tableWrapStyle: React.CSSProperties = { overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: 12, background: '#FFF' };
const tableStyle: React.CSSProperties = { width: '100%', minWidth: 1100, borderCollapse: 'collapse' };
const headerRowStyle: React.CSSProperties = { background: '#F8FAFC' };
const thStyle: React.CSSProperties = { padding: '11px 12px', textAlign: 'left', color: '#334155', borderBottom: '1px solid #E2E8F0', fontSize: 12, fontWeight: 800 };
const tdStyle: React.CSSProperties = { padding: '11px 12px', color: '#334155', borderBottom: '1px solid #F1F5F9', fontSize: 13, verticalAlign: 'top' };
const nameCellStyle: React.CSSProperties = { ...tdStyle, color: '#0F172A', fontWeight: 700, minWidth: 210 };
const methodologyCellStyle: React.CSSProperties = { ...tdStyle, minWidth: 280, lineHeight: 1.45 };
const methodologyTextStyle: React.CSSProperties = { marginTop: 4 };
const assumptionsStyle: React.CSSProperties = { marginTop: 5, color: '#64748B', fontSize: 12 };
const approvedBadgeStyle: React.CSSProperties = { display: 'inline-flex', padding: '3px 8px', borderRadius: 999, color: '#166534', background: '#DCFCE7', fontWeight: 800, fontSize: 12 };
const emptyStyle: React.CSSProperties = { padding: 24, textAlign: 'center', color: '#64748B' };
const errorStyle: React.CSSProperties = { padding: 12, marginBottom: 16, border: '1px solid #FECACA', borderRadius: 8, background: '#FEF2F2', color: '#B91C1C' };
