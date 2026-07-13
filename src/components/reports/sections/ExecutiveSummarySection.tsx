import type { CSSProperties } from 'react';

type ExecutiveSummary = {
  estimatedEmissions: string;
  recordsIncluded: number;
  recordsSkipped: number;
  primaryActivityTypes: string;
  missingFactorCount: number;
  dataQualityCoverage: string;
};

type ExecutiveSummarySectionProps = {
  executiveSummary: ExecutiveSummary;
};

export function ExecutiveSummarySection({
  executiveSummary,
}: ExecutiveSummarySectionProps) {
  return (
    <div style={summaryGridStyle}>
      <Fact label="Estimated Emissions" value={executiveSummary.estimatedEmissions} />
      <Fact label="Records Included" value={String(executiveSummary.recordsIncluded)} />
      <Fact label="Records Skipped" value={String(executiveSummary.recordsSkipped)} />
      <Fact label="Primary Activity Types" value={executiveSummary.primaryActivityTypes} />
      <Fact label="Missing Factor Count" value={String(executiveSummary.missingFactorCount)} />
      <Fact label="Data Quality Coverage" value={executiveSummary.dataQualityCoverage} />
    </div>
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
