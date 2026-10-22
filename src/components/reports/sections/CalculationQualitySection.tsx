import type { CSSProperties } from 'react';
import type { MetricsCountSummary } from '../../MetricsSummarySection';
import {
  formatReadinessStatus,
  type ReportingReadinessAssessment,
  type ReportingReadinessItem,
  type ReportingReadinessStatus,
} from '../../../utils/reportingReadiness';

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
  readinessAssessment: ReportingReadinessAssessment;
  optionalDataCompleteness?: string;
  reviewReasonsLabel: string;
};

export function CalculationQualitySection({
  reportCountSummary,
  primarySkippedReasons,
  dataQualityCoverage,
  readinessAssessment,
  optionalDataCompleteness,
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
        <Fact label="Records Needing Attention" value={String(recordsRequiringReview)} />
        <Fact label="Missing Factors" value={String(primarySkippedReasons.missingFactor)} />
        <Fact label="Missing Jurisdiction" value={String(primarySkippedReasons.missingJurisdiction)} />
        <Fact label="Invalid Unit" value={String(primarySkippedReasons.invalidUnit)} />
        <Fact label="Calculation Coverage" value={dataQualityCoverage} />
        {optionalDataCompleteness ? (
          <Fact label="Optional Data Completeness" value={optionalDataCompleteness} />
        ) : null}
        <Fact label="Readiness Status" value={formatReadinessStatus(readinessAssessment.overallStatus)} />
      </div>
      <div style={readinessChecklistStyle}>
        <h4 style={readinessChecklistTitleStyle}>Reporting Readiness Checklist</h4>
        {readinessAssessment.items.map((item) => (
          <ReadinessRow key={item.code} item={item} />
        ))}
      </div>
      <div style={qualityExplanationStyle}>
        <strong>How to read these metrics:</strong>
        <p>
          Calculation Coverage is calculated emission-bearing records divided by eligible emission-bearing records.
        </p>
        <p>
          Reporting Readiness is an evidence checklist. Tracked metrics are retained for review but excluded from the Calculation Coverage denominator. Optional metadata such as cost is tracked separately and does not reduce readiness.
        </p>
      </div>
      {recordsRequiringReview > 0 ? (
        <div style={qualityReasonStyle}>
          <strong>Attention reasons:</strong>{' '}
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

function ReadinessRow({ item }: { item: ReportingReadinessItem }) {
  const status = normalizeReadinessStatus(item.status);

  return (
    <div style={readinessRowStyle}>
      <span style={readinessBadgeStyle(status)}>{formatSafeReadinessStatus(item.status, status)}</span>
      <div>
        <strong>{item.workflowStageLabel}: {item.label}</strong>
        <div style={readinessEvidenceStyle}>{item.evidence}</div>
        {item.action ? <div style={readinessActionStyle}>{item.action}</div> : null}
      </div>
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

const readinessChecklistStyle: CSSProperties = {
  marginTop: 14,
  display: 'grid',
  gap: 8,
};

const readinessChecklistTitleStyle: CSSProperties = {
  margin: '0 0 2px',
  color: '#0f172a',
  fontSize: 14,
};

const readinessRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '120px 1fr',
  gap: 10,
  alignItems: 'start',
  padding: 10,
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  background: '#fff',
};

type ReadinessTone = { bg: string; fg: string; border: string };

const READINESS_TONES: Record<ReportingReadinessStatus, ReadinessTone> = {
  COMPLETE: { bg: '#dcfce7', fg: '#047857', border: '#bbf7d0' },
  LIMITED: { bg: '#fffbeb', fg: '#92400e', border: '#fde68a' },
  NEEDS_ATTENTION: { bg: '#fffbeb', fg: '#92400e', border: '#fde68a' },
  NOT_REVIEWED: { bg: '#f8fafc', fg: '#475569', border: '#cbd5e1' },
  NOT_APPLICABLE: { bg: '#f1f5f9', fg: '#475569', border: '#cbd5e1' },
};

function normalizeReadinessStatus(status: unknown): ReportingReadinessStatus {
  if (typeof status === 'string' && status in READINESS_TONES) {
    return status as ReportingReadinessStatus;
  }

  if (import.meta.env.DEV) {
    console.warn('Unexpected reporting readiness status', status);
  }

  return 'NOT_REVIEWED';
}

function formatSafeReadinessStatus(status: unknown, normalizedStatus = normalizeReadinessStatus(status)) {
  return normalizedStatus === status ? formatReadinessStatus(normalizedStatus) : 'Not reviewed';
}

function readinessBadgeStyle(status: ReportingReadinessStatus): CSSProperties {
  const colors = READINESS_TONES[status] ?? READINESS_TONES.NOT_REVIEWED;

  return {
    display: 'inline-flex',
    justifyContent: 'center',
    width: 'fit-content',
    padding: '4px 8px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    background: colors.bg,
    color: colors.fg,
    border: `1px solid ${colors.border}`,
    whiteSpace: 'nowrap',
  };
}

const readinessEvidenceStyle: CSSProperties = {
  marginTop: 4,
  color: '#475569',
  fontSize: 12,
  lineHeight: 1.45,
};

const readinessActionStyle: CSSProperties = {
  marginTop: 4,
  color: '#1d4ed8',
  fontSize: 12,
  fontWeight: 700,
  lineHeight: 1.45,
};
