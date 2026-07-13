import type { CSSProperties } from 'react';
import type { MetricsCountSummary } from '../../MetricsSummarySection';

type SkippedReasonSummary = {
  missingFactor: number;
  missingJurisdiction: number;
  invalidUnit: number;
  trackedOnly: number;
  missingData: number;
  invalidQuantity: number;
  outsideDateRange: number;
  outsideScope: number;
};

type CalculationQualitySectionProps = {
  reportCountSummary: MetricsCountSummary;
  primarySkippedReasons: SkippedReasonSummary;
  dataQualityCoverage: string;
  skippedReasonsLabel: string;
};

export function CalculationQualitySection({
  reportCountSummary,
  primarySkippedReasons,
  dataQualityCoverage,
  skippedReasonsLabel,
}: CalculationQualitySectionProps) {
  return (
    <>
      <div style={summaryGridStyle}>
        <Fact label="Total Records Found" value={String(reportCountSummary.totalRecordsFound)} />
        <Fact label="Records Calculated" value={String(reportCountSummary.processedRecords)} />
        <Fact label="Records Skipped" value={String(reportCountSummary.skippedRecords)} />
        <Fact label="Missing Factors" value={String(primarySkippedReasons.missingFactor)} />
        <Fact label="Missing Jurisdiction" value={String(primarySkippedReasons.missingJurisdiction)} />
        <Fact label="Invalid Unit" value={String(primarySkippedReasons.invalidUnit)} />
        <Fact label="Tracked Metrics" value={String(primarySkippedReasons.trackedOnly)} />
        <Fact label="Data Quality Coverage" value={dataQualityCoverage} />
      </div>
      {reportCountSummary.skippedRecords > 0 ? (
        <div style={qualityReasonStyle}>
          <strong>Skipped reasons:</strong>{' '}
          {skippedReasonsLabel}
        </div>
      ) : (
        <div style={qualitySuccessStyle}>All in-scope records were calculated.</div>
      )}
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

const qualitySuccessStyle: CSSProperties = {
  marginTop: 14,
  color: '#047857',
  fontWeight: 700,
};
