import type { CSSProperties, ReactNode } from 'react';
import type { HotspotAnalysis } from '../../MetricsSummarySection';
import { formatDisplayNumber, formatEmissionsValue } from '../../../utils/numberFormatting';

type EmissionsHotspotsSectionProps = {
  analysis: HotspotAnalysis;
};

export function EmissionsHotspotsSection({ analysis }: EmissionsHotspotsSectionProps) {
  if (analysis.totalRecordCount <= 0) {
    return (
      <p style={sectionHelperStyle}>
        Emissions hotspots are not available because no activity records were found.
      </p>
    );
  }

  if (!analysis.categoryHotspots.length || analysis.totalCalculatedEmissions <= 0) {
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        <p style={sectionHelperStyle}>
          Emissions hotspots are not available yet because no records could be calculated. Resolve calculation issues before using hotspot analysis.
        </p>
        {analysis.excludedRecordCount > 0 ? (
          <div style={qualityReasonStyle}>
            Some records were excluded from hotspot analysis because they require review or are tracked-only.
          </div>
        ) : null}
      </div>
    );
  }

  const top = analysis.categoryHotspots[0];

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <p style={sectionHelperStyle}>
        This section highlights the activity categories contributing the largest share of calculated emissions. Hotspot analysis only includes successfully calculated records.
      </p>
      <div style={hotspotHighlightStyle}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#047857' }}>Top emissions hotspot</div>
        <div style={{ marginTop: 4, fontSize: 20, fontWeight: 900, color: '#064e3b' }}>{top.displayName}</div>
        <div style={{ marginTop: 4, color: '#475569' }}>
          {top.displayName} contributes {formatDisplayNumber(top.percentageOfTotal)}% of calculated emissions.
        </div>
      </div>
      <SimpleTable
        headers={['Rank', 'Category', 'Calculated Emissions', 'Share of Total', 'Records', 'Hotspot Level', 'Focus Message']}
        emptyMessage="No hotspot categories available."
        rows={analysis.categoryHotspots.map((row) => [
          row.rank,
          row.displayName,
          `${formatEmissionsValue(row.emissions)} kgCO2e`,
          `${formatDisplayNumber(row.percentageOfTotal)}%`,
          row.calculatedRecordCount,
          formatHotspotLevel(row.hotspotLevel),
          row.focusMessage,
        ])}
      />
      {analysis.focusRecommendations.length > 0 ? (
        <div style={recommendationGridStyle}>
          {analysis.focusRecommendations.slice(0, 3).map((item) => (
            <div key={`${item.priority}-${item.title}`} style={recommendationCardStyle}>
              <div style={{ fontWeight: 900, color: '#0f172a' }}>{item.title}</div>
              <div style={{ marginTop: 5, color: '#475569', lineHeight: 1.5 }}>{item.message}</div>
            </div>
          ))}
        </div>
      ) : null}
      {analysis.excludedRecordCount > 0 ? (
        <div style={qualityReasonStyle}>
          {analysis.excludedRecordCount} records were excluded from hotspot totals. See Records Requiring Review for details.
        </div>
      ) : null}
    </div>
  );
}

function formatHotspotLevel(level: HotspotAnalysis['categoryHotspots'][number]['hotspotLevel']) {
  if (level === 'HIGH') return 'High';
  if (level === 'MEDIUM') return 'Medium';
  return 'Low';
}

function SimpleTable({
  headers,
  rows,
  emptyMessage,
}: {
  headers: string[];
  rows: Array<Array<ReactNode>>;
  emptyMessage: string;
}) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} style={thStyle}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} style={emptyStyle}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} style={tdStyle}>{cell}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

const sectionHelperStyle: CSSProperties = {
  margin: '0 0 12px',
  color: '#475569',
  lineHeight: 1.55,
};

const qualityReasonStyle: CSSProperties = {
  marginTop: 14,
  padding: 12,
  border: '1px solid #fed7aa',
  borderRadius: 8,
  background: '#fff7ed',
  color: '#9a3412',
};

const hotspotHighlightStyle: CSSProperties = {
  padding: 14,
  borderRadius: 10,
  border: '1px solid #bbf7d0',
  background: '#ecfdf5',
};

const recommendationGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
  gap: 10,
};

const recommendationCardStyle: CSSProperties = {
  padding: 12,
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
};

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
};

const thStyle: CSSProperties = {
  padding: 10,
  textAlign: 'left',
  borderBottom: '1px solid #cbd5e1',
  background: '#f1f5f9',
  color: '#475569',
  fontSize: 12,
};

const tdStyle: CSSProperties = {
  padding: 10,
  borderBottom: '1px solid #e2e8f0',
  color: '#0f172a',
  fontSize: 13,
  verticalAlign: 'top',
};

const emptyStyle: CSSProperties = {
  padding: 14,
  color: '#64748b',
  textAlign: 'center',
};
