import {
  buildHotspotAnalysis,
  buildMetricsSummaryTableRows,
  type HotspotAnalysis,
  type MetricsCountSummary,
} from './MetricsSummarySection';
import {
  formatFuelUsageBreakdown,
  type ActivityUsageTotals,
} from '../utils/activityAggregation';
import type { CalculationAuditDetail } from '../services/metrics';
import {
  buildCalculatedFormula,
  formatCalculationStatus,
  formatMatchingMethod,
  formatRecordSource,
  formatTraceabilitySource,
  formatTraceableFactor,
} from '../utils/calculationTraceability';
import { formatDisplayNumber, formatEmissionsValue } from '../utils/numberFormatting';
import { normalizeUnitForDisplay } from '../utils/unitNormalization';

export { formatFuelUsageBreakdown };

export const FORMAL_REPORT_DISCLAIMER =
  'CarbonLite does not certify emissions, guarantee compliance, or determine carbon credit eligibility. Users should review source documents, conversion factor traceability, and applicable reporting requirements before relying on this report.';

export const FORMAL_REPORT_METHODOLOGY = [
  'Emissions are calculated from imported or manually entered activity data and configured conversion factors. CarbonLite applies factor matching based on activity type, unit, jurisdiction, and reporting year.',
  'Records without valid factors, units, quantities, dates, or required jurisdiction are excluded from emissions totals and listed as records requiring review. Tracked-only metrics are not included in calculated emissions totals.',
  'Source documents, source references, and factor metadata should be reviewed before using report outputs for internal, consultant, or external reporting workflows.',
  FORMAL_REPORT_DISCLAIMER,
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
  factorId?: string | null;
  factorVersionId?: string | null;
  activityType?: string | null;
  factorName: string;
  factorValue: string | number;
  inputUnit: string;
  resultUnit: string;
  jurisdiction?: string | null;
  factorYear?: number | null;
  factorStatus?: string | null;
  confidenceLevel?: string | null;
  sourceAuthority: string;
  sourceDocument?: string | null;
  sourceUrl?: string | null;
  sourcePage?: string | number | null;
  sourceTable?: string | null;
  sourceYear?: number | null;
  reportingYear?: number | null;
  factorType: 'System' | 'Custom';
  verified: boolean;
  usedRecordsCount?: number;
  matchingMethod?: string | null;
  matchingMessage?: string | null;
};

export type ReportExecutiveSummary = {
  estimatedEmissions: string;
  recordsIncluded: number;
  recordsSkipped: number;
  primaryActivityTypes: string;
  missingFactorCount: number;
  dataQualityCoverage: string;
};

export type ReportSkippedReasonSummary = {
  missingFactor: number;
  missingJurisdiction: number;
  invalidUnit: number;
  trackedOnly: number;
  missingData: number;
  invalidQuantity: number;
  outsideDateRange: number;
  outsideScope: number;
};

export function buildPrimarySkippedReasonSummary(
  calculationDetails: CalculationAuditDetail[] = [],
  fallback?: MetricsCountSummary,
): ReportSkippedReasonSummary {
  const reasons: ReportSkippedReasonSummary = {
    missingFactor: 0,
    missingJurisdiction: 0,
    invalidUnit: 0,
    trackedOnly: 0,
    missingData: 0,
    invalidQuantity: 0,
    outsideDateRange: fallback?.skippedReasons?.outsideDateRange ?? 0,
    outsideScope: 0,
  };

  calculationDetails.forEach((detail) => {
    switch (detail.status) {
      case 'MISSING_FACTOR':
        reasons.missingFactor += 1;
        break;
      case 'MISSING_JURISDICTION':
        reasons.missingJurisdiction += 1;
        break;
      case 'INVALID_UNIT':
        reasons.invalidUnit += 1;
        break;
      case 'TRACKED_ONLY':
        reasons.trackedOnly += 1;
        break;
      case 'MISSING_DATA':
        reasons.missingData += 1;
        break;
      case 'INVALID_QUANTITY':
        reasons.invalidQuantity += 1;
        break;
      case 'OUTSIDE_SCOPE':
        reasons.outsideScope += 1;
        break;
      default:
        break;
    }
  });

  if (calculationDetails.length === 0 && fallback) {
    reasons.missingFactor = fallback.skippedReasons?.missingFactor ?? fallback.missingFactorRecords ?? 0;
    reasons.outsideScope = fallback.skippedReasons?.outsideScope ?? 0;
    reasons.outsideDateRange = fallback.skippedReasons?.outsideDateRange ?? 0;
    reasons.missingData = fallback.skippedReasons?.invalidData ?? 0;
  }

  return reasons;
}

export function buildReportCountSummary(
  countSummary: MetricsCountSummary,
  calculationDetails: CalculationAuditDetail[] = [],
): MetricsCountSummary {
  if (calculationDetails.length === 0) return countSummary;

  const primaryReasons = buildPrimarySkippedReasonSummary(calculationDetails, countSummary);
  const processedRecords = calculationDetails.filter((detail) => detail.status === 'CALCULATED').length;
  const skippedRecords = calculationDetails.filter(
    (detail) => detail.status !== 'CALCULATED' && detail.status !== 'OUTSIDE_SCOPE',
  ).length;

  return {
    ...countSummary,
    totalRecordsFound: calculationDetails.length,
    processedRecords,
    skippedRecords,
    missingFactorRecords: primaryReasons.missingFactor,
    skippedReasons: {
      missingFactor: primaryReasons.missingFactor,
      outsideDateRange: primaryReasons.outsideDateRange,
      outsideScope: primaryReasons.outsideScope,
      invalidData:
        primaryReasons.invalidUnit +
        primaryReasons.missingData +
        primaryReasons.invalidQuantity +
        primaryReasons.missingJurisdiction,
    },
  };
}

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
    estimatedEmissions: `${formatEmissionsValue(totalEstimatedEmissionsKgCO2e)} kgCO2e`,
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
    formatDisplayNumber(factor.factorValue),
    factor.inputUnit || 'Not specified',
    factor.resultUnit || 'kgCO2e',
    formatReportJurisdiction(factor.jurisdiction),
    factor.sourceAuthority || 'Source not specified',
    factor.sourceYear || 'Source not specified',
    factor.verified
      ? 'Verified'
      : factor.factorStatus
      ? formatCalculationStatus(factor.factorStatus)
      : 'Unverified / user review required',
    factor.factorType,
    factor.sourceDocument || 'Source not specified',
    factor.sourceUrl || 'Source not specified',
    factor.usedRecordsCount ?? 1,
  ]);
}

export type SourceEvidenceRow = {
  activityType: string;
  quantity: string;
  unit: string;
  sourceFile: string;
  sourceReference: string;
  sourceType: string;
  notes: string;
};

export function buildSourceEvidenceRows(
  activities: Array<{
    id?: string | null;
    activityType?: string | null;
    quantity?: string | number | null;
    unit?: string | null;
    sourceReference?: string | null;
    sourceType?: string | null;
    sourceFileName?: string | null;
    sourcePage?: string | number | null;
    sourceRow?: string | number | null;
    sourceTextSnippet?: string | null;
    notes?: string | null;
  }>,
  calculationDetails: CalculationAuditDetail[] = [],
) {
  const detailsByActivityId = new Map(
    calculationDetails.map((detail) => [detail.activityDataId, detail]),
  );

  return activities.map((activity) => {
    const detail = activity.id ? detailsByActivityId.get(activity.id) : undefined;
    const sourceType = formatSourceType(activity.sourceType);
    const isManual = sourceType === 'Manual entry';
    const sourceReferenceParts = [
      activity.sourceReference?.trim(),
      activity.sourcePage ? `Page ${activity.sourcePage}` : '',
      activity.sourceRow ? `Line item ${activity.sourceRow}` : '',
    ].filter(Boolean);

    return {
      activityType: activity.activityType || 'Not specified',
      quantity:
        activity.quantity === null || activity.quantity === undefined
          ? '-'
          : formatDisplayNumber(activity.quantity),
      unit: formatSourceEvidenceUnit(detail?.activityUnit ?? activity.unit, detail),
      sourceFile:
        activity.sourceFileName?.trim() ||
        (isManual ? 'Manual entry' : 'Source not specified'),
      sourceReference: isManual
        ? 'Manual entry'
        : sourceReferenceParts.join(' · ') || 'Source not specified',
      sourceType,
      notes:
        activity.sourceTextSnippet ||
        activity.notes ||
        '',
    };
  });
}

export function formatReportUnit(
  unit?: string | number | null,
  detail?: Pick<CalculationAuditDetail, 'status'> | null,
) {
  if (detail?.status === 'INVALID_UNIT') return 'Invalid unit';
  const normalized = normalizeUnitForDisplay(unit);
  return normalized.value;
}

function formatSourceEvidenceUnit(
  unit?: string | number | null,
  detail?: Pick<CalculationAuditDetail, 'status'> | null,
) {
  if (detail?.status === 'INVALID_UNIT') return 'Invalid unit';
  const normalized = normalizeUnitForDisplay(unit);
  if (normalized.status !== 'valid') return normalized.value;
  return String(unit ?? '').trim();
}

export function formatReportJurisdiction(
  jurisdiction?: string | null,
  country?: string | null,
) {
  const cleanRegion = String(jurisdiction ?? '').trim();
  const cleanCountry = String(country ?? '').trim();

  if (!cleanRegion && !cleanCountry) return 'Not specified';
  if (!cleanRegion) return cleanCountry;
  if (!cleanCountry) return cleanRegion;
  if (cleanRegion === cleanCountry) return cleanRegion;
  if (cleanRegion.toLowerCase().includes(cleanCountry.toLowerCase())) return cleanRegion;

  return `${cleanRegion}, ${cleanCountry}`;
}

export function formatSourceType(sourceType?: string | null) {
  if (!sourceType) return 'Unknown';

  const value = sourceType.toUpperCase();

  if (value === 'MANUAL') return 'Manual entry';
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
  const reportCountSummary = buildReportCountSummary(countSummary, calculationDetails);
  const primarySkippedReasons = buildPrimarySkippedReasonSummary(calculationDetails, reportCountSummary);
  const totalsByMetric = buildMetricsSummaryTableRows({
    usageTotals,
    totalEstimatedEmissionsKgCO2e,
    recordsIncluded: reportCountSummary.processedRecords,
  });
  const executiveSummary = buildReportExecutiveSummary({
    totalEstimatedEmissionsKgCO2e,
    countSummary: reportCountSummary,
    matchedActivityEmissions,
  });
  const hotspotAnalysis = buildHotspotAnalysis(calculationDetails);
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
          <Fact label="Records Included" value={String(reportCountSummary.processedRecords)} />
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

      <ReportSection title="C. Emissions Hotspots">
        <ReportHotspots analysis={hotspotAnalysis} />
      </ReportSection>

      <ReportSection title="D. Calculation Quality Summary">
        <div style={summaryGridStyle}>
          <Fact label="Total Records Found" value={String(reportCountSummary.totalRecordsFound)} />
          <Fact label="Records Calculated" value={String(reportCountSummary.processedRecords)} />
          <Fact label="Records Skipped" value={String(reportCountSummary.skippedRecords)} />
          <Fact label="Missing Factors" value={String(primarySkippedReasons.missingFactor)} />
          <Fact label="Missing Jurisdiction" value={String(primarySkippedReasons.missingJurisdiction)} />
          <Fact label="Invalid Unit" value={String(primarySkippedReasons.invalidUnit)} />
          <Fact label="Tracked Metrics" value={String(primarySkippedReasons.trackedOnly)} />
          <Fact label="Data Quality Coverage" value={executiveSummary.dataQualityCoverage} />
        </div>
        {reportCountSummary.skippedRecords > 0 ? (
          <div style={qualityReasonStyle}>
            <strong>Skipped reasons:</strong>{' '}
            {formatSkippedReasons(primarySkippedReasons)}
          </div>
        ) : (
          <div style={qualitySuccessStyle}>All in-scope records were calculated.</div>
        )}
      </ReportSection>

      <ReportSection title="E. Emissions Breakdown">
        <SimpleTable
          headers={['Category', 'Metric Type', 'Unit', 'Total']}
          emptyMessage="No metrics available for this report scope."
          rows={totalsByMetric.map((item) => [
            item.category === 'calculated' ? 'Calculated Result' : 'Input Data',
            item.metricType,
            item.unit,
            item.totalValue,
          ])}
        />
      </ReportSection>

      <ReportSection title="F. Activity Breakdown">
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
            formatDisplayNumber(item.quantity),
            item.unit,
            `${formatEmissionsValue(item.estimatedEmissionsKgCO2e)} kgCO2e`,
            item.sourceReference || '-',
          ])}
        />
      </ReportSection>

      <ReportSection title="G. Emission Factors Used">
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
            formatReportJurisdiction(factor.jurisdiction),
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
      </ReportSection>

      <ReportSection title="H. Calculation Traceability">
        <p style={sectionHelperStyle}>
          Each calculated row shows the activity quantity, matched conversion factor, source, formula, and emissions result.
        </p>
        <details>
          <summary style={detailsSummaryStyle}>
            Show calculation audit ({calculationDetails.length} records)
          </summary>
          <div style={{ marginTop: 14 }}>
            <SimpleTable
              headers={[
                'Activity',
                'Quantity',
                'Factor Used',
                'Source',
                'Match',
                'Calculation',
                'Status',
              ]}
              emptyMessage="No calculation details available."
              rows={calculationDetails.map((item) => [
                item.activityType,
                `${formatDisplayNumber(item.activityQuantity)} ${formatReportUnit(item.activityUnit, item)}`,
                formatTraceableFactor(item),
                formatTraceabilitySource(item),
                formatMatchingMethod(item),
                buildCalculatedFormula(item),
                formatCalculationStatus(item.status),
              ])}
            />
          </div>
        </details>
      </ReportSection>

      <ReportSection title="I. Source Evidence">
        <SimpleTable
          headers={['Activity Type', 'Quantity', 'Unit', 'Source File', 'Source Reference', 'Source Type', 'Notes']}
          emptyMessage="No source evidence available."
          rows={sourceEvidenceRows.map((item) => [
            item.activityType,
            item.quantity,
            item.unit,
            item.sourceFile,
            item.sourceReference,
            item.sourceType,
            item.notes || '-',
          ])}
        />
      </ReportSection>

      <ReportSection title="J. Records Requiring Review">
        <SimpleTable
          headers={['Activity', 'Quantity', 'Unit', 'Issue Type', 'Issue Message', 'Source Reference', 'Action']}
          emptyMessage="No records require review for this report scope."
          rows={calculationDetails
            .filter((item) => item.status !== 'CALCULATED' && item.status !== 'OUTSIDE_SCOPE')
            .map((item) => [
              item.activityType,
              formatDisplayNumber(item.activityQuantity),
              formatReportUnit(item.activityUnit, item),
              formatCalculationStatus(item.status),
              item.matchingMessage || item.reason || 'Review this record before calculation.',
              formatRecordSource(item),
              item.status === 'MISSING_FACTOR' ? 'Create factor' : 'Fix record',
            ])}
        />
      </ReportSection>

      <ReportSection title="K. Methodology and Disclaimer">
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

function ReportHotspots({ analysis }: { analysis: HotspotAnalysis }) {
  if (analysis.totalRecordCount <= 0) {
    return (
      <p style={sectionHelperStyle}>
        Emissions hotspots are not available because no activity records were found.
      </p>
    );
  }

  if (!analysis.categoryHotspots.length || analysis.totalCalculatedEmissions <= 0) {
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        <p style={sectionHelperStyle}>
          Emissions hotspots are not available yet because no records could be calculated. Resolve calculation issues before using hotspot analysis.
        </p>
        {analysis.excludedRecordCount > 0 ? (
          <div style={qualityReasonStyle}>
            Some records were excluded from hotspot analysis because they require review or are tracked-only.
          </div>
        ) : null}
      </div>
    );
  }

  const top = analysis.categoryHotspots[0];

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <p style={sectionHelperStyle}>
        This section highlights the activity categories contributing the largest share of calculated emissions. Hotspot analysis only includes successfully calculated records.
      </p>
      <div style={hotspotHighlightStyle}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#047857' }}>Top emissions hotspot</div>
        <div style={{ marginTop: 4, fontSize: 20, fontWeight: 900, color: '#064e3b' }}>{top.displayName}</div>
        <div style={{ marginTop: 4, color: '#475569' }}>
          {top.displayName} contributes {formatDisplayNumber(top.percentageOfTotal)}% of calculated emissions.
        </div>
      </div>
      <SimpleTable
        headers={['Rank', 'Category', 'Calculated Emissions', 'Share of Total', 'Records', 'Hotspot Level', 'Focus Message']}
        emptyMessage="No hotspot categories available."
        rows={analysis.categoryHotspots.map((row) => [
          row.rank,
          row.displayName,
          `${formatEmissionsValue(row.emissions)} kgCO2e`,
          `${formatDisplayNumber(row.percentageOfTotal)}%`,
          row.calculatedRecordCount,
          formatHotspotLevel(row.hotspotLevel),
          row.focusMessage,
        ])}
      />
      {analysis.focusRecommendations.length > 0 ? (
        <div style={recommendationGridStyle}>
          {analysis.focusRecommendations.slice(0, 3).map((item) => (
            <div key={`${item.priority}-${item.title}`} style={recommendationCardStyle}>
              <div style={{ fontWeight: 900, color: '#0f172a' }}>{item.title}</div>
              <div style={{ marginTop: 5, color: '#475569', lineHeight: 1.5 }}>{item.message}</div>
            </div>
          ))}
        </div>
      ) : null}
      {analysis.excludedRecordCount > 0 ? (
        <div style={qualityReasonStyle}>
          {analysis.excludedRecordCount} records were excluded from hotspot totals. See Records Requiring Review for details.
        </div>
      ) : null}
    </div>
  );
}

function formatHotspotLevel(level: HotspotAnalysis['categoryHotspots'][number]['hotspotLevel']) {
  if (level === 'HIGH') return 'High';
  if (level === 'MEDIUM') return 'Medium';
  return 'Low';
}

export function formatSkippedReasons(reasons: ReportSkippedReasonSummary) {
  return [
    ['Missing factor', reasons.missingFactor],
    ['Missing jurisdiction', reasons.missingJurisdiction],
    ['Invalid unit', reasons.invalidUnit],
    ['Tracked metric', reasons.trackedOnly],
    ['Missing data', reasons.missingData],
    ['Invalid quantity', reasons.invalidQuantity],
    ['Outside date range', reasons.outsideDateRange],
    ['Outside scope', reasons.outsideScope],
  ]
    .filter(([, count]) => Number(count) > 0)
    .map(([label, count]) => `${label}: ${count}`)
    .join('; ') || 'Not specified';
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

const hotspotHighlightStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 10,
  border: '1px solid #bbf7d0',
  background: '#ecfdf5',
};

const recommendationGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
  gap: 10,
};

const recommendationCardStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
};

const sectionHelperStyle: React.CSSProperties = {
  margin: '0 0 12px',
  color: '#475569',
  lineHeight: 1.55,
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
