import type { CSSProperties, ReactNode } from 'react';
import type { FormalConversionFactorUsed } from '../../FormalReportPreview';
import {
  formatFactorValue,
} from '../../../utils/calculationTraceability';
import { getActivityTypeLabel } from '../../../utils/activityType';
import { formatCredibilityLabel } from '../../../utils/factorCredibility';
import {
  formatReportAssumptions,
  formatReportFactorSource,
  formatReportFactorSummaryVerification,
  formatReportFactorUnit,
  formatReportFactorVersion,
  formatReportVerification,
} from '../../../utils/reportCredibility';

type EmissionFactorsUsedSectionProps = {
  conversionFactorsUsed: FormalConversionFactorUsed[];
  formatJurisdiction: (jurisdiction?: string | null, country?: string | null) => string;
};

export function EmissionFactorsUsedSection({
  conversionFactorsUsed,
  formatJurisdiction,
}: EmissionFactorsUsedSectionProps) {
  return (
    <div>
      <h4 style={subsectionTitleStyle}>Emission Factors Summary</h4>
      <SimpleTable
        headers={[
          'Factor',
          'Value',
          'Unit',
          'Jurisdiction',
          'Source Year',
          'Verification',
          'Used Records',
        ]}
        emptyMessage="No conversion factors found for this report scope."
        rows={conversionFactorsUsed.map((factor) => [
          factor.factorName || getActivityTypeLabel(factor.activityType),
          formatFactorValue(factor.factorValue),
          formatReportFactorUnit(factor.resultUnit, factor.inputUnit),
          formatJurisdiction(factor.jurisdiction),
          factor.factorYear || factor.sourceYear || 'Not specified',
          formatReportFactorSummaryVerification(factor),
          factor.usedRecordsCount ?? 1,
        ])}
      />
      <p style={summaryNoteStyle}>
        Detailed source, version, confidence level, and assumptions are provided in the Factor Details / Assumptions section below.
      </p>

      {conversionFactorsUsed.length > 0 ? (
        <div style={factorDetailsWrapperStyle}>
          <h4 style={subsectionTitleStyle}>Factor Details / Assumptions</h4>
          <div style={factorDetailsGridStyle}>
            {conversionFactorsUsed.map((factor) => (
              <section key={factor.factorId || factor.factorName} style={factorDetailBlockStyle}>
                <div style={factorDetailTitleStyle}>
                  {factor.factorName || getActivityTypeLabel(factor.activityType)}
                </div>
                <dl style={detailListStyle}>
                  <Detail label="Value" value={`${formatFactorValue(factor.factorValue)} ${formatReportFactorUnit(factor.resultUnit, factor.inputUnit)}`} />
                  <Detail label="Source" value={formatReportFactorSource(factor)} />
                  <Detail label="Version" value={formatReportFactorVersion(factor)} />
                  <Detail label="Verification" value={formatReportVerification(factor)} />
                  <Detail label="Confidence" value={formatCredibilityLabel(factor.confidenceLevel) || 'Not specified'} />
                  <Detail label="Assumption" value={formatReportAssumptions(factor)} />
                </dl>
              </section>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <>
      <dt style={detailLabelStyle}>{label}</dt>
      <dd style={detailValueStyle}>{value}</dd>
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

const subsectionTitleStyle: CSSProperties = {
  margin: '0 0 10px',
  color: '#0f172a',
  fontSize: 14,
};

const summaryNoteStyle: CSSProperties = {
  margin: '8px 0 0',
  color: '#64748b',
  fontSize: 12,
  lineHeight: 1.45,
};

const factorDetailsWrapperStyle: CSSProperties = {
  marginTop: 18,
};

const factorDetailsGridStyle: CSSProperties = {
  display: 'grid',
  gap: 12,
};

const factorDetailBlockStyle: CSSProperties = {
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  padding: 12,
  background: '#f8fafc',
};

const factorDetailTitleStyle: CSSProperties = {
  fontWeight: 800,
  color: '#0f172a',
  marginBottom: 8,
};

const detailListStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '120px 1fr',
  gap: '6px 12px',
  margin: 0,
};

const detailLabelStyle: CSSProperties = {
  color: '#64748b',
  fontSize: 12,
  fontWeight: 700,
};

const detailValueStyle: CSSProperties = {
  margin: 0,
  color: '#0f172a',
  fontSize: 13,
  lineHeight: 1.45,
};
