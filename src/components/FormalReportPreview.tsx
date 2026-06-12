import {
  buildMetricsSummaryTableRows,
  type MetricsCountSummary,
} from './MetricsSummarySection';
import {
  formatFuelUsageBreakdown,
  type ActivityUsageTotals,
} from '../utils/activityAggregation';
import type { CalculationAuditDetail } from '../services/metrics';

export { formatFuelUsageBreakdown };

export const FORMAL_REPORT_DISCLAIMER =
  'Estimated emissions are calculated by multiplying activity quantities by applicable conversion factors. Conversion factors may include CarbonLite system defaults and organization-specific custom factors. Users should review factor sources and methodology before using reports for regulatory or client-facing submissions.';

export const FORMAL_REPORT_METHODOLOGY = [
  'Estimated emissions are calculated by multiplying activity quantities by applicable conversion factors. CarbonLite applies factor matching based on activity type, unit, jurisdiction, and reporting year. Records without a matching factor are excluded from emissions totals and listed in the quality summary for user review.',
  FORMAL_REPORT_DISCLAIMER,
  'Activity data may come from uploaded documents, spreadsheets, or manual entry. Extracted and imported records should be reviewed for accuracy and completeness.',
  'Records without matching conversion factors are excluded from estimated emissions totals and are identified as skipped or missing-factor records.',
  'Users should review source documents, conversion factor traceability, and applicable reporting requirements before relying on this report.',
];

export type FormalActivityEmission = {
  activityDataId: string;
  activityType: string;
  quantity: string | number;
  unit: string;
  estimatedEmissionsKgCO2e: number;
  sourceType: string;
  sourceReference?: string | null;
  notes?: string | null;
  factorId: string;
};

export type FormalConversionFactorUsed = {
  factorId: string;
  activityType?: string | null;
  factorName: string;
  factorValue: string | number;
  inputUnit: string;
  resultUnit: string;
  jurisdiction?: string | null;
  sourceAuthority: string;
  sourceDocument?: string | null;
  sourceUrl?: string | null;
  sourceYear?: number | null;
  reportingYear?: number | null;
  factorType: 'System' | 'Custom';
  verified: boolean;
};

export type ReportExecutiveSummary = {
  estimatedEmissions: string;
  recordsIncluded: number;
  recordsSkipped: number;
  primaryActivityTypes: string;
  missingFactorCount: number;
  dataQualityCoverage: string;
};

export function buildReportExecutiveSummary({
  totalEstimatedEmissionsKgCO2e,
  countSummary,
  matchedActivityEmissions,
}: {
  totalEstimatedEmissionsKgCO2e: number;
  countSummary: MetricsCountSummary;
  matchedActivityEmissions: FormalActivityEmission[];
}): ReportExecutiveSummary {
  const primaryActivityTypes = Array.from(
    new Set(
      matchedActivityEmissions
        .map((item) => String(item.activityType ?? '').trim())
        .filter(Boolean),
    ),
  );
  const coverage =
    countSummary.totalRecordsFound > 0
      ? (countSummary.processedRecords / countSummary.totalRecordsFound) * 100
      : 0;

  return {
    estimatedEmissions: `${totalEstimatedEmissionsKgCO2e} kgCO2e`,
    recordsIncluded: countSummary.processedRecords,
    recordsSkipped: countSummary.skippedRecords,
    primaryActivityTypes: primaryActivityTypes.length
      ? primaryActivityTypes.join(', ')
      : 'None included',
    missingFactorCount: countSummary.missingFactorRecords,
    dataQualityCoverage: `${formatPercentage(coverage)}%`,
  };
}

export function buildConversionFactorTraceabilityRows(
  conversionFactorsUsed: FormalConversionFactorUsed[],
) {
  return conversionFactorsUsed.map((factor) => [
    factor.activityType || 'Not specified',
    factor.jurisdiction || 'Not specified',
    factor.inputUnit || 'Not specified',
    factor.factorValue,
    factor.resultUnit || 'kgCO2e',
    factor.sourceAuthority || 'Source not specified',
    factor.sourceDocument || 'Source not specified',
    factor.sourceUrl || 'Source not specified',
    factor.sourceYear || 'Source not specified',
    factor.verified ? 'Verified' : 'Unverified / user review required',
    factor.factorType,
  ]);
}

export type SourceEvidenceRow = {
  sourceReference: string;
  sourceType: string;
  recordCount: number;
  notes: string;
};

export function buildSourceEvidenceRows(
  activities: Array<{
    sourceReference?: string | null;
    sourceType?: string | null;
    notes?: string | null;
  }>,
) {
  const evidence = new Map<string, SourceEvidenceRow>();

  activities.forEach((activity) => {
    const sourceReference =
      activity.sourceReference?.trim() || 'No source reference provided';
    const sourceType = formatSourceType(activity.sourceType);
    const key = `${sourceType}:${sourceReference}`;
    const existing = evidence.get(key) ?? {
      sourceReference,
      sourceType,
      recordCount: 0,
      notes: '',
    };

    existing.recordCount += 1;
    if (activity.notes && !existing.notes.includes(activity.notes)) {
      existing.notes = [existing.notes, activity.notes].filter(Boolean).join('; ');
    }

    evidence.set(key, existing);
  });

  return Array.from(evidence.values());
}

export function formatSourceType(sourceType?: string | null) {
  if (!sourceType) return 'Unknown';

  const value = sourceType.toUpperCase();

  if (value === 'MANUAL') return 'Manual';
  if (value === 'CSV') return 'CSV Import';
  if (value === 'EXCEL') return 'Excel Import';
  if (value === 'PASTE') return 'Pasted from Excel';
  if (value === 'DOCUMENT_AI' || value === 'AI_EXTRACTION') return 'AI Extraction';

  return sourceType;
}

export function FormalReportPreview({
  organizationName,
  reportPeriod,
  scopeLabel,
  generatedAt,
  usageTotals,
  totalEstimatedEmissionsKgCO2e,
  countSummary,
  matchedActivityEmissions,
  conversionFactorsUsed,
  sourceEvidenceRows,
  calculationDetails,
}: {
  organizationName: string;
  reportPeriod: string;
  scopeLabel: string;
  generatedAt: string;
  usageTotals: ActivityUsageTotals;
  totalEstimatedEmissionsKgCO2e: number;
  countSummary: MetricsCountSummary;
  matchedActivityEmissions: FormalActivityEmission[];
  conversionFactorsUsed: FormalConversionFactorUsed[];
  sourceEvidenceRows: SourceEvidenceRow[];
  calculationDetails: CalculationAuditDetail[];
}) {
  const totalsByMetric = buildMetricsSummaryTableRows({
    usageTotals,
    totalEstimatedEmissionsKgCO2e,
    recordsIncluded: countSummary.processedRecords,
  });
  const executiveSummary = buildReportExecutiveSummary({
    totalEstimatedEmissionsKgCO2e,
    countSummary,
    matchedActivityEmissions,
  });
  const factorTraceabilityRows =
    buildConversionFactorTraceabilityRows(conversionFactorsUsed);

  return (
    <section style={reportShellStyle}>
      <div style={coverPageStyle}>
        <div style={reportHeaderStyle}>
          <div style={brandBlockStyle}>
            <div style={brandIconStyle}>CL</div>
            <div>
              <div style={brandNameStyle}>CarbonLite AI</div>
              <div style={brandSubtitleStyle}>Environmental Reporting Platform</div>
            </div>
          </div>
          <div style={coverLabelStyle}>Report Cover</div>
        </div>
        <div style={coverBodyStyle}>
          <div style={reportTitleStyle}>Emissions Summary Report</div>
          <div style={coverOrganizationStyle}>{organizationName || 'Workspace'}</div>
          <div style={coverFactsStyle}>
            <div><strong>Reporting period:</strong> {reportPeriod}</div>
            <div><strong>Report scope:</strong> {scopeLabel}</div>
            <div><strong>Generated date:</strong> {generatedAt}</div>
            <div><strong>Prepared by:</strong> CarbonLite AI</div>
          </div>
        </div>
      </div>

      <ReportSection title="A. Report Scope">
        <div style={factsGridStyle}>
          <Fact label="Organization" value={organizationName} />
          <Fact label="Report Period" value={reportPeriod} />
          <Fact label="Scope Mode" value={scopeLabel} />
          <Fact label="Records Included" value={String(countSummary.processedRecords)} />
          <Fact label="Generated Date" value={generatedAt} />
        </div>
      </ReportSection>

      <ReportSection title="B. Executive Summary">
        <div style={summaryGridStyle}>
          <Fact label="Estimated Emissions" value={executiveSummary.estimatedEmissions} />
          <Fact label="Records Included" value={String(executiveSummary.recordsIncluded)} />
          <Fact label="Records Skipped" value={String(executiveSummary.recordsSkipped)} />
          <Fact label="Primary Activity Types" value={executiveSummary.primaryActivityTypes} />
          <Fact label="Missing Factor Count" value={String(executiveSummary.missingFactorCount)} />
          <Fact label="Data Quality Coverage" value={executiveSummary.dataQualityCoverage} />
        </div>
      </ReportSection>

      <ReportSection title="C. Calculation Quality Summary">
        <div style={summaryGridStyle}>
          <Fact label="Total Records Found" value={String(countSummary.totalRecordsFound)} />
          <Fact label="Records Calculated" value={String(countSummary.processedRecords)} />
          <Fact label="Records Skipped" value={String(countSummary.skippedRecords)} />
          <Fact label="Missing Factors" value={String(countSummary.missingFactorRecords)} />
          <Fact
            label="Invalid Records"
            value={String(countSummary.skippedReasons?.invalidData ?? 0)}
          />
          <Fact label="Data Quality Coverage" value={executiveSummary.dataQualityCoverage} />
        </div>
        {countSummary.skippedRecords > 0 ? (
          <div style={qualityReasonStyle}>
            <strong>Skipped reasons:</strong>{' '}
            {formatSkippedReasons(countSummary)}
          </div>
        ) : (
          <div style={qualitySuccessStyle}>All in-scope records were calculated.</div>
        )}
      </ReportSection>

      <ReportSection title="D. Totals by Metric">
        <SimpleTable
          headers={['Metric Type', 'Unit', 'Total']}
          emptyMessage="No metrics available for this report scope."
          rows={totalsByMetric.map((item) => [
            item.metricType,
            item.unit,
            item.totalValue,
          ])}
        />
      </ReportSection>

      <ReportSection title="E. Activity Breakdown">
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
            item.activityType,
            item.quantity,
            item.unit,
            `${item.estimatedEmissionsKgCO2e} kgCO2e`,
            item.sourceReference || '-',
          ])}
        />
      </ReportSection>

      <ReportSection title="F. Conversion Factors Used">
        <SimpleTable
          headers={[
            'Activity Type',
            'Jurisdiction',
            'Input Unit',
            'Factor Value',
            'Result Unit',
            'Source Authority',
            'Source Document',
            'Source URL',
            'Source Year',
            'Verified',
            'System / Custom',
          ]}
          emptyMessage="No conversion factors found for this report scope."
          rows={factorTraceabilityRows}
        />
      </ReportSection>

      <ReportSection title="G. Calculation Details">
        <details>
          <summary style={detailsSummaryStyle}>
            Show calculation audit ({calculationDetails.length} records)
          </summary>
          <div style={{ marginTop: 14 }}>
            <SimpleTable
              headers={[
                'Activity Type',
                'Quantity',
                'Unit',
                'Factor Used',
                'Source',
                'Year',
                'Jurisdiction',
                'Emissions kgCO2e',
                'Status',
              ]}
              emptyMessage="No calculation details available."
              rows={calculationDetails.map((item) => [
                item.activityType,
                item.activityQuantity,
                item.activityUnit,
                item.factorValue === null || item.factorValue === undefined
                  ? '-'
                  : `${item.factorValue} ${item.factorResultUnit || ''} / ${item.factorInputUnit || item.activityUnit}`.trim(),
                item.factorSource || '-',
                item.sourceYear ?? item.reportingYear,
                item.jurisdiction || '-',
                item.calculatedEmissionsKgCO2e ?? '-',
                item.status,
              ])}
            />
          </div>
        </details>
      </ReportSection>

      <ReportSection title="H. Source Evidence">
        <SimpleTable
          headers={['Source Document / File', 'Source Type', 'Record Count', 'Notes']}
          emptyMessage="No source evidence available."
          rows={sourceEvidenceRows.map((item) => [
            item.sourceReference,
            item.sourceType,
            item.recordCount,
            item.notes || '-',
          ])}
        />
      </ReportSection>

      <ReportSection title="I. Methodology and Disclaimer">
        <div style={{ display: 'grid', gap: 10 }}>
          {FORMAL_REPORT_METHODOLOGY.map((paragraph) => (
            <p key={paragraph} style={{ margin: 0, lineHeight: 1.7, color: '#475569' }}>
              {paragraph}
            </p>
          ))}
        </div>
      </ReportSection>
    </section>
  );
}

function formatSkippedReasons(countSummary: MetricsCountSummary) {
  const reasons = countSummary.skippedReasons;
  if (!reasons) return 'Not specified';
  return [
    ['Missing factor', reasons.missingFactor],
    ['Invalid data', reasons.invalidData],
    ['Outside date range', reasons.outsideDateRange],
    ['Outside scope', reasons.outsideScope],
  ]
    .filter(([, count]) => Number(count) > 0)
    .map(([label, count]) => `${label}: ${count}`)
    .join('; ');
}

function ReportSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={reportSectionStyle}>
      <h3 style={{ margin: '0 0 14px', fontSize: 18 }}>{title}</h3>
      {children}
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

function SimpleTable({
  headers,
  rows,
  emptyMessage,
}: {
  headers: string[];
  rows: Array<Array<React.ReactNode>>;
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

const reportShellStyle: React.CSSProperties = {
  marginBottom: 24,
  padding: 20,
  borderRadius: 12,
  border: '1px solid #cbd5e1',
  background: '#fff',
};

const coverPageStyle: React.CSSProperties = {
  minHeight: 310,
  padding: 24,
  borderRadius: 10,
  border: '1px solid #cbd5e1',
  background: '#fff',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
};

const reportHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 16,
  marginBottom: 0,
  paddingBottom: 16,
  borderBottom: '1px solid #cbd5e1',
  flexWrap: 'wrap',
};

const coverLabelStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: 11,
  fontWeight: 800,
  textTransform: 'uppercase',
};

const coverBodyStyle: React.CSSProperties = {
  paddingTop: 42,
  maxWidth: 680,
};

const coverOrganizationStyle: React.CSSProperties = {
  marginTop: 14,
  color: '#047857',
  fontSize: 20,
  fontWeight: 800,
};

const coverFactsStyle: React.CSSProperties = {
  display: 'grid',
  gap: 7,
  marginTop: 28,
  color: '#475569',
  fontSize: 13,
  lineHeight: 1.5,
};

const brandBlockStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
};

const brandIconStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#064e3b',
  color: '#fff',
  fontSize: 13,
  fontWeight: 900,
};

const brandNameStyle: React.CSSProperties = {
  color: '#0f172a',
  fontSize: 20,
  fontWeight: 900,
  lineHeight: 1.1,
};

const brandSubtitleStyle: React.CSSProperties = {
  marginTop: 2,
  color: '#047857',
  fontSize: 12,
  fontWeight: 800,
};

const headerMetaStyle: React.CSSProperties = {
  color: '#475569',
  fontSize: 12,
  lineHeight: 1.55,
  textAlign: 'right',
};

const reportTitleStyle: React.CSSProperties = {
  color: '#0f172a',
  fontSize: 30,
  fontWeight: 900,
};

const reportSectionStyle: React.CSSProperties = {
  marginTop: 16,
  padding: 18,
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  background: '#fff',
};

const qualityReasonStyle: React.CSSProperties = {
  marginTop: 14,
  padding: 12,
  border: '1px solid #fed7aa',
  borderRadius: 8,
  background: '#fff7ed',
  color: '#9a3412',
};

const qualitySuccessStyle: React.CSSProperties = {
  marginTop: 14,
  color: '#047857',
  fontWeight: 700,
};

const detailsSummaryStyle: React.CSSProperties = {
  cursor: 'pointer',
  color: '#0f766e',
  fontWeight: 800,
};

const factsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 12,
};

const summaryGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
  gap: 12,
};

const factStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
};

const thStyle: React.CSSProperties = {
  padding: 10,
  textAlign: 'left',
  borderBottom: '1px solid #cbd5e1',
  background: '#f1f5f9',
  color: '#475569',
  fontSize: 12,
};

const tdStyle: React.CSSProperties = {
  padding: 10,
  borderBottom: '1px solid #e2e8f0',
  color: '#0f172a',
  fontSize: 13,
  verticalAlign: 'top',
};

const emptyStyle: React.CSSProperties = {
  padding: 14,
  color: '#64748b',
  textAlign: 'center',
};

function formatPercentage(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
