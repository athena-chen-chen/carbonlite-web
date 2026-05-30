import {
  buildMetricsSummaryTableRows,
  type MetricsCountSummary,
} from './MetricsSummarySection';
import {
  formatFuelUsageBreakdown,
  formatActivityUsageValue,
  type ActivityUsageTotals,
} from '../utils/activityAggregation';

export { formatFuelUsageBreakdown };

export const FORMAL_REPORT_DISCLAIMER =
  'Estimated emissions are calculated by multiplying activity quantities by applicable conversion factors. Conversion factors may include CarbonLite system defaults and organization-specific custom factors. Users should verify factors against applicable reporting requirements before using final reports for regulatory submission.';

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
  sourceAuthority: string;
  sourceYear?: number | null;
  factorType: 'System' | 'Custom';
  verified: boolean;
};

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
}) {
  const totalsByMetric = buildMetricsSummaryTableRows({
    usageTotals,
    totalEstimatedEmissionsKgCO2e,
    recordsIncluded: countSummary.processedRecords,
  });

  return (
    <section style={reportShellStyle}>
      <div style={reportHeaderStyle}>
        <div style={brandBlockStyle}>
          <div style={brandIconStyle}>CL</div>
          <div>
            <div style={brandNameStyle}>CarbonLite AI</div>
            <div style={brandSubtitleStyle}>Environmental Reporting Platform</div>
          </div>
        </div>
        <div style={headerMetaStyle}>
          <div style={reportTitleStyle}>Generated Emissions Report</div>
          <div>Generated: {generatedAt}</div>
          <div>Organization: {organizationName || 'Workspace'}</div>
          <div>Reporting Period: {reportPeriod}</div>
          <div>Report Scope: {scopeLabel}</div>
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
          <Fact
            label="Fuel Usage"
            value={formatFuelUsageBreakdown(usageTotals.fuelUsageBreakdown)}
          />
          <Fact
            label="Electricity Consumption"
            value={formatActivityUsageValue(
              usageTotals.electricity,
              usageTotals.electricityUnitLabel,
            )}
          />
          <Fact
            label="Estimated Emissions"
            value={`${totalEstimatedEmissionsKgCO2e} kgCO2e`}
          />
          <Fact label="Records Included" value={String(countSummary.processedRecords)} />
        </div>
      </ReportSection>

      <ReportSection title="C. Totals by Metric">
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

      <ReportSection title="D. Activity Breakdown">
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

      <ReportSection title="E. Conversion Factors Used">
        <SimpleTable
          headers={[
            'Activity Type',
            'Factor Value',
            'Input Unit',
            'Result Unit',
            'Source Authority',
            'Source Year',
            'System / Custom',
            'Verified',
          ]}
          emptyMessage="No conversion factors found for this report scope."
          rows={conversionFactorsUsed.map((factor) => [
            factor.activityType || '-',
            factor.factorValue,
            factor.inputUnit || '-',
            factor.resultUnit || '-',
            factor.sourceAuthority || '-',
            factor.sourceYear || '-',
            factor.factorType,
            factor.verified ? 'Verified' : 'Needs review',
          ])}
        />
      </ReportSection>

      <ReportSection title="F. Source Evidence">
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

      <ReportSection title="G. Methodology and Disclaimer">
        <p style={{ margin: 0, lineHeight: 1.7, color: '#475569' }}>
          {FORMAL_REPORT_DISCLAIMER}
        </p>
      </ReportSection>
    </section>
  );
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

const reportHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 16,
  marginBottom: 20,
  paddingBottom: 16,
  borderBottom: '1px solid #cbd5e1',
  flexWrap: 'wrap',
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
  fontSize: 15,
  fontWeight: 900,
};

const reportSectionStyle: React.CSSProperties = {
  marginTop: 16,
  padding: 18,
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  background: '#fff',
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
