import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { CalculationAuditDetail } from '../../../services/metrics';
import {
  buildCalculatedFormula,
  formatCalculationStatus,
  formatTraceableFactor,
} from '../../../utils/calculationTraceability';
import { formatDisplayNumber } from '../../../utils/numberFormatting';
import { getActivityTypeLabel } from '../../../utils/activityType';
import {
  formatTraceabilityReviewNote,
} from '../../../utils/reportCredibility';

type CalculationTraceabilitySectionProps = {
  calculationDetails: CalculationAuditDetail[];
  formatRecordUnit: (unit?: string | number | null, detail?: Pick<CalculationAuditDetail, 'status'> | null) => string;
  formatScopeLabel: (detail: CalculationAuditDetail) => string;
};

export function CalculationTraceabilitySection({
  calculationDetails,
  formatRecordUnit,
  formatScopeLabel,
}: CalculationTraceabilitySectionProps) {
  const [isAuditExpanded, setIsAuditExpanded] = useState(false);
  return (
    <>
      <p style={sectionHelperStyle}>
        Each row shows the activity quantity, matched factor, calculation formula, scope, status, and review note.
      </p>
      <details
        onToggle={(event) => setIsAuditExpanded(event.currentTarget.open)}
      >
        <summary
          aria-label={`${isAuditExpanded ? 'Collapse' : 'Expand'} calculation audit`}
          style={detailsButtonStyle}
        >
          <span aria-hidden="true">{isAuditExpanded ? '▾' : '▸'}</span>
          <span>{isAuditExpanded ? 'Collapse' : 'Expand'} calculation audit ({calculationDetails.length} records)</span>
        </summary>
        <div style={{ marginTop: 14 }}>
          <SimpleTable
            headers={[
              'Activity',
              'Quantity',
              'Factor Used',
              'Calculation',
              'Scope',
              'Status',
              'Review Note',
            ]}
            emptyMessage="No calculation details available."
            rows={calculationDetails.map((item) => [
              getActivityTypeLabel(item.activityType),
              `${formatDisplayNumber(item.activityQuantity)} ${formatRecordUnit(item.activityUnit, item)}`,
              formatTraceableFactor(item),
              buildCalculatedFormula(item),
              formatScopeLabel(item),
              formatCalculationStatus(item.status),
              formatTraceabilityReviewNote(item),
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

const detailsButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '7px 10px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  background: '#fff',
  cursor: 'pointer',
  color: '#334155',
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
