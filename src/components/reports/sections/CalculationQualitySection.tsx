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
  dataReadinessScore?: string;
  reviewReasonsLabel: string;
};

export function CalculationQualitySection({
  reportCountSummary,
  primarySkippedReasons,
  dataQualityCoverage,
  dataReadinessScore,
  reviewReasonsLabel,
}: CalculationQualitySectionProps) {
  const recordsRequiringReview =
    primarySkippedReasons.missingFactor +
    primarySkippedReasons.missingJurisdiction +
    primarySkippedReasons.invalidUnit +
    primarySkippedReasons.missingData +
    primarySkippedReasons.invalidQuantity +
    primarySkippedReasons.outsideDateRange +
    primarySkippedReasons.outsideScope;

  return (
    <>
      <div style={summaryGridStyle}>
        <Fact label="Total Records Found" value={String(reportCountSummary.totalRecordsFound)} />
        <Fact label="Records Calculated" value={String(reportCountSummary.processedRecords)} />
        <Fact label="Tracked Operational Metrics" value={String(primarySkippedReasons.trackedOnly)} />
        <Fact label="Records Requiring Review" value={String(recordsRequiringReview)} />
        <Fact label="Missing Factors" value={String(primarySkippedReasons.missingFactor)} />
        <Fact label="Missing Jurisdiction" value={String(primarySkippedReasons.missingJurisdiction)} />
        <Fact label="Invalid Unit" value={String(primarySkippedReasons.invalidUnit)} />
        <Fact label="Data Quality Coverage" value={dataQualityCoverage} />
        {dataReadinessScore ? (
          <Fact label="Data Readiness Score" value={dataReadinessScore} />
        ) : null}
      </div>
      <div style={qualityExplanationStyle}>
        <strong>How to read these metrics:</strong>
        <p>
          Data Quality Coverage reflects the percentage of records that were successfully calculated as GHG emissions records.
        </p>
        <p>
          Data Readiness Score is a broader pilot readiness signal that also considers factor match quality, jurisdiction completeness, source traceability, review status, and tracked operational metrics.
        </p>
        <p>
          Data Quality Coverage and Data Readiness Score are related but not identical. Tracked operational metrics such as Water are retained for review and excluded from the calculated GHG emissions total by design.
        </p>
      </div>
      {recordsRequiringReview > 0 ? (
        <div style={qualityReasonStyle}>
          <strong>Review reasons:</strong>{' '}
          {reviewReasonsLabel}
        </div>
      ) : primarySkippedReasons.trackedOnly > 0 ? (
        <div style={qualityTrackedStyle}>
          Tracked operational metrics are retained for review but excluded from the calculated GHG emissions total.
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

const qualityTrackedStyle: CSSProperties = {
  marginTop: 14,
  padding: 12,
  border: '1px solid #bae6fd',
  borderRadius: 8,
  background: '#f0f9ff',
  color: '#075985',
  fontWeight: 700,
  lineHeight: 1.5,
};

const qualityExplanationStyle: CSSProperties = {
  display: 'grid',
  gap: 6,
  marginTop: 14,
  padding: 12,
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  background: '#f8fafc',
  color: '#334155',
  lineHeight: 1.55,
};
