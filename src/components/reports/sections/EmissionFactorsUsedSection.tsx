import type { CSSProperties, ReactNode } from 'react';
import type { FormalConversionFactorUsed } from '../../FormalReportPreview';
import { formatCalculationStatus } from '../../../utils/calculationTraceability';
import { formatDisplayNumber } from '../../../utils/numberFormatting';

type EmissionFactorsUsedSectionProps = {
  conversionFactorsUsed: FormalConversionFactorUsed[];
  formatJurisdiction: (jurisdiction?: string | null, country?: string | null) => string;
};

export function EmissionFactorsUsedSection({
  conversionFactorsUsed,
  formatJurisdiction,
}: EmissionFactorsUsedSectionProps) {
  return (
    <SimpleTable
      headers={[
        'Factor',
        'Version',
        'Value',
        'Unit',
        'Jurisdiction',
        'Year',
        'Source Authority',
        'Source Document',
        'Verified / Status',
        'Used Records',
      ]}
      emptyMessage="No conversion factors found for this report scope."
      rows={conversionFactorsUsed.map((factor) => [
        factor.factorName || factor.activityType || 'Factor not specified',
        factor.factorVersionId || 'Legacy factor',
        formatDisplayNumber(factor.factorValue),
        `${factor.resultUnit || 'kgCO2e'}/${factor.inputUnit || '-'}`,
        formatJurisdiction(factor.jurisdiction),
        factor.factorYear || factor.sourceYear || 'Not specified',
        factor.sourceAuthority || 'Source not specified',
        factor.sourceDocument || 'Source not specified',
        factor.verified
          ? 'Verified'
          : factor.factorStatus
          ? formatCalculationStatus(factor.factorStatus)
          : 'Unverified / user review required',
        factor.usedRecordsCount ?? 1,
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
