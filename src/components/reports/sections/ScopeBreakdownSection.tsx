import type { CSSProperties, ReactNode } from 'react';
import type { CalculationAuditDetail } from '../../../services/metrics';
import { formatDisplayNumber, formatEmissionsValue } from '../../../utils/numberFormatting';
import { getActivityTypeLabel } from '../../../utils/activityType';

type ScopeSummary = {
  SCOPE_1: number;
  SCOPE_2: number;
  SCOPE_3: number;
  UNCLASSIFIED: number;
};

type ScopeBreakdownSectionProps = {
  scopeSummary: ScopeSummary;
  electricityRecordCount: number;
  calculatedElectricityCount: number;
  unclassifiedCalculatedRecords: CalculationAuditDetail[];
  formatRecordUnit: (unit?: string | number | null, detail?: Pick<CalculationAuditDetail, 'status'> | null) => string;
  formatScopeSourceLabel: (detail: CalculationAuditDetail) => string;
};

export function ScopeBreakdownSection({
  scopeSummary,
  electricityRecordCount,
  calculatedElectricityCount,
  unclassifiedCalculatedRecords,
  formatRecordUnit,
  formatScopeSourceLabel,
}: ScopeBreakdownSectionProps) {
  return (
    <>
      <p style={sectionHelperStyle}>
        Scope totals include only successfully calculated records. Records requiring review are excluded from emissions totals.
      </p>
      <div style={summaryGridStyle}>
        <Fact label="Scope 1" value={`${formatEmissionsValue(scopeSummary.SCOPE_1)} kgCO2e`} />
        <Fact label="Scope 2" value={`${formatEmissionsValue(scopeSummary.SCOPE_2)} kgCO2e`} />
        <Fact label="Scope 3" value={`${formatEmissionsValue(scopeSummary.SCOPE_3)} kgCO2e`} />
      </div>
      {electricityRecordCount > 0 && calculatedElectricityCount === 0 ? (
        <div style={qualityReasonStyle}>
          Electricity records were found, but none were included in Scope 2 because they require review, such as missing province or missing factor.
        </div>
      ) : null}
      {scopeSummary.UNCLASSIFIED > 0 ? (
        <div style={qualityReasonStyle}>
          {formatEmissionsValue(scopeSummary.UNCLASSIFIED)} kgCO2e is calculated but unclassified. Review these records before relying on the scope breakdown.
        </div>
      ) : null}
      {unclassifiedCalculatedRecords.length > 0 ? (
        <div style={{ marginTop: 12 }}>
          <SimpleTable
            headers={['Activity', 'Quantity', 'Calculated Emissions', 'Scope Source']}
            emptyMessage="No unclassified calculated records."
            rows={unclassifiedCalculatedRecords.map((item) => [
              getActivityTypeLabel(item.activityType),
              `${formatDisplayNumber(item.activityQuantity)} ${formatRecordUnit(item.activityUnit, item)}`,
              `${formatEmissionsValue(item.calculatedEmissionsKgCO2e ?? item.calculatedEmission ?? 0)} kgCO2e`,
              formatScopeSourceLabel(item),
            ])}
          />
        </div>
      ) : null}
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div style={factStyle}>
      <div style={{ fontSize: 12, fontWeight: 800, color: '#475569' }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 16, fontWeight: 800, color: '#0f172a', whiteSpace: 'pre-line' }}>
        {value || '-'}
      </div>
    </div>
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

const summaryGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
  gap: 12,
};

const factStyle: CSSProperties = {
  padding: 14,
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
};

const qualityReasonStyle: CSSProperties = {
  marginTop: 14,
  padding: 12,
  border: '1px solid #fed7aa',
  borderRadius: 8,
  background: '#fff7ed',
  color: '#9a3412',
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
