import type { CSSProperties, ReactNode } from 'react';
import type { CalculationAuditDetail } from '../../../services/metrics';
import {
  buildCalculatedFormula,
  formatCalculationStatus,
  formatMatchingMethod,
  formatTraceabilitySource,
  formatTraceableFactor,
} from '../../../utils/calculationTraceability';
import { formatDisplayNumber } from '../../../utils/numberFormatting';

type CalculationTraceabilitySectionProps = {
  calculationDetails: CalculationAuditDetail[];
  formatRecordUnit: (unit?: string | number | null, detail?: Pick<CalculationAuditDetail, 'status'> | null) => string;
  formatScopeLabel: (detail: CalculationAuditDetail) => string;
  formatScopeSourceLabel: (detail: CalculationAuditDetail) => string;
};

export function CalculationTraceabilitySection({
  calculationDetails,
  formatRecordUnit,
  formatScopeLabel,
  formatScopeSourceLabel,
}: CalculationTraceabilitySectionProps) {
  return (
    <>
      <p style={sectionHelperStyle}>
        Each calculated row shows the activity quantity, matched conversion factor, source, formula, and emissions result.
      </p>
      <details>
        <summary style={detailsSummaryStyle}>
          Show calculation audit ({calculationDetails.length} records)
        </summary>
        <div style={{ marginTop: 14 }}>
          <SimpleTable
            headers={[
              'Activity',
              'Quantity',
              'Factor Used',
              'Source',
              'Match',
              'Calculation',
              'Scope',
              'Scope Source',
              'Status',
            ]}
            emptyMessage="No calculation details available."
            rows={calculationDetails.map((item) => [
              item.activityType,
              `${formatDisplayNumber(item.activityQuantity)} ${formatRecordUnit(item.activityUnit, item)}`,
              formatTraceableFactor(item),
              formatTraceabilitySource(item),
              formatMatchingMethod(item),
              buildCalculatedFormula(item),
              formatScopeLabel(item),
              formatScopeSourceLabel(item),
              formatCalculationStatus(item.status),
            ])}
          />
        </div>
      </details>
    </>
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

const sectionHelperStyle: CSSProperties = {
  margin: '0 0 12px',
  color: '#475569',
  lineHeight: 1.55,
};

const detailsSummaryStyle: CSSProperties = {
  cursor: 'pointer',
  color: '#0f766e',
  fontWeight: 800,
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
