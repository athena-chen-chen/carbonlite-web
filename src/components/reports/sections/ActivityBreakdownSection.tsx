import type { CSSProperties, ReactNode } from 'react';
import type { FormalActivityEmission } from '../../FormalReportPreview';
import { formatDisplayNumber, formatEmissionsValue } from '../../../utils/numberFormatting';
import { getActivityTypeLabel } from '../../../utils/activityType';
import { getDisplaySourceLabel } from '../../../utils/reportCredibility';

type ActivityBreakdownSectionProps = {
  matchedActivityEmissions: FormalActivityEmission[];
};

export function ActivityBreakdownSection({
  matchedActivityEmissions,
}: ActivityBreakdownSectionProps) {
  return (
    <SimpleTable
      headers={[
        'Activity Type',
        'Quantity',
        'Unit',
        'Estimated Emissions',
        'Source Reference',
      ]}
      emptyMessage="No activity records with matching conversion factors."
      rows={matchedActivityEmissions.map((item) => [
        getActivityTypeLabel(item.activityType),
        formatDisplayNumber(item.quantity),
        item.unit,
        `${formatEmissionsValue(item.estimatedEmissionsKgCO2e)} kgCO2e`,
        getDisplaySourceLabel(item),
      ])}
    />
  );
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
