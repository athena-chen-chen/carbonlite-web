import { useState } from 'react';
import {
  buildHotspotAnalysis,
  buildMetricsSummaryTableRows,
  type MetricsCountSummary,
} from './MetricsSummarySection';
import {
  formatFuelUsageBreakdown,
  type ActivityUsageTotals,
} from '../utils/activityAggregation';
import type { CalculationAuditDetail } from '../services/metrics';
import { formatFactorValue } from '../utils/calculationTraceability';
import { formatCredibilityLabel } from '../utils/factorCredibility';
import { formatDisplayNumber, formatEmissionsValue } from '../utils/numberFormatting';
import { normalizeUnitForDisplay } from '../utils/unitNormalization';
import {
  formatScopeClassification,
  formatScopeSource,
  resolveScopeClassification,
} from '../utils/scopeClassification';
import { getActivityTypeLabel } from '../utils/activityType';
import {
  buildSourceEvidenceNote,
  formatReportAssumptions,
  formatReportFactorVersion,
  formatReportSourceReference,
  formatReportSourceType,
  formatReportVerification,
  isRecordRequiringCorrection,
  isTrackedMetricDetail,
} from '../utils/reportCredibility';
import { ActivityBreakdownSection } from './reports/sections/ActivityBreakdownSection';
import { CalculationQualitySection } from './reports/sections/CalculationQualitySection';
import { CalculationTraceabilitySection } from './reports/sections/CalculationTraceabilitySection';
import { EmissionFactorsUsedSection } from './reports/sections/EmissionFactorsUsedSection';
import { EmissionsHotspotsSection } from './reports/sections/EmissionsHotspotsSection';
import { ExecutiveSummarySection } from './reports/sections/ExecutiveSummarySection';
import { MethodologyDisclaimerSection } from './reports/sections/MethodologyDisclaimerSection';
import { RecordsRequiringReviewSection } from './reports/sections/RecordsRequiringReviewSection';
import { ScopeBreakdownSection } from './reports/sections/ScopeBreakdownSection';
import { SourceEvidenceSection } from './reports/sections/SourceEvidenceSection';

export { formatFuelUsageBreakdown };

export const FORMAL_REPORT_DISCLAIMER =
  'CarbonLite does not certify emissions, guarantee compliance, or determine carbon credit eligibility. Users should review source documents, conversion factor traceability, and applicable reporting requirements before relying on this report.';

export const FORMAL_REPORT_METHODOLOGY = [
  'Emissions are calculated from imported or manually entered activity data and configured conversion factors. CarbonLite applies factor matching based on activity type, unit, jurisdiction, and reporting year.',
  'Records without valid factors, units, quantities, dates, or required jurisdiction are excluded from emissions totals and listed as records requiring review. Tracked-only metrics are not included in calculated emissions totals.',
  'Source documents, source references, and factor metadata should be reviewed before using report outputs for internal, consultant, or external reporting workflows.',
  FORMAL_REPORT_DISCLAIMER,
];

const DEFAULT_EXPANDED_REPORT_SECTIONS = new Set([
  'executive-summary',
  'emissions-hotspots',
  'scope-breakdown',
  'calculation-quality',
]);

const REPORT_SECTION_IDS = [
  'report-scope',
  'executive-summary',
  'emissions-hotspots',
  'scope-breakdown',
  'calculation-quality',
  'emissions-breakdown',
  'activity-breakdown',
  'emission-factors',
  'calculation-traceability',
  'source-evidence',
  'records-review',
  'methodology',
];

export type FormalActivityEmission = {
  activityDataId: string;
  activityType: string;
  quantity: string | number;
  unit: string;
  estimatedEmissionsKgCO2e: number;
  sourceType: string;
  sourceReference?: string | null;
  sourceFileName?: string | null;
  notes?: string | null;
  factorId: string;
};

export type FormalConversionFactorUsed = {
  factorId?: string | null;
  factorVersionId?: string | null;
  factorVersion?: string | null;
  activityType?: string | null;
  factorName: string;
  factorValue: string | number;
  inputUnit: string;
  resultUnit: string;
  jurisdiction?: string | null;
  factorYear?: number | null;
  factorStatus?: string | null;
  confidenceLevel?: string | null;
  verificationStatus?: string | null;
  assumptions?: string | null;
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
        .map((item) => getActivityTypeLabel(item.activityType))
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
    getActivityTypeLabel(factor.activityType),
    formatFactorValue(factor.factorValue),
    factor.inputUnit || 'Not specified',
    factor.resultUnit || 'kgCO2e',
    formatReportJurisdiction(factor.jurisdiction),
    factor.sourceAuthority || 'Source not specified',
    factor.sourceYear || 'Source not specified',
    formatReportVerification(factor),
    factor.factorType,
    formatCredibilityLabel(factor.confidenceLevel) || 'Not specified',
    formatReportFactorVersion(factor),
    formatReportAssumptions(factor),
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
    const sourceType = formatSourceType(
      activity.sourceType,
      activity.sourceFileName,
      activity.sourceReference,
    );
    const isManual = sourceType === 'Manual Entry';
    const sourceReferenceParts = [
      activity.sourceReference?.trim(),
      activity.sourcePage ? `Page ${activity.sourcePage}` : '',
      activity.sourceRow ? `Line item ${activity.sourceRow}` : '',
    ].filter(Boolean);
    const rawSourceReference = sourceReferenceParts.join(' · ');

    return {
      activityType: getActivityTypeLabel(activity.activityType),
      quantity:
        activity.quantity === null || activity.quantity === undefined
          ? '-'
          : formatDisplayNumber(activity.quantity),
      unit: formatSourceEvidenceUnit(detail?.activityUnit ?? activity.unit, detail),
      sourceFile:
        activity.sourceFileName?.trim() ||
        (isManual ? 'Manual entry' : 'Source not specified'),
      sourceReference: isManual
        ? 'manual'
        : formatReportSourceReference({
            sourceReference: rawSourceReference || activity.sourceReference,
            sourceType: activity.sourceType,
            sourceFileName: activity.sourceFileName,
          }),
      sourceType,
      notes: buildSourceEvidenceNote({ activity, detail }),
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

export function formatSourceType(
  sourceType?: string | null,
  sourceFileName?: string | null,
  sourceReference?: string | null,
) {
  return formatReportSourceType(sourceType, sourceFileName, sourceReference);
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
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      REPORT_SECTION_IDS.map((id) => [id, DEFAULT_EXPANDED_REPORT_SECTIONS.has(id)]),
    ),
  );
  const reportCountSummary = buildReportCountSummary(countSummary, calculationDetails);
  const primarySkippedReasons = buildPrimarySkippedReasonSummary(calculationDetails, reportCountSummary);
  const reviewRecordCount = calculationDetails.filter(isRecordRequiringCorrection).length;
  const trackedMetricCount = calculationDetails.filter(isTrackedMetricDetail).length;
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
  const scopeSummary = buildFormalScopeSummary(calculationDetails);
  const scopeSummaryLine = `Scope 1: ${formatEmissionsValue(scopeSummary.SCOPE_1)} · Scope 2: ${formatEmissionsValue(scopeSummary.SCOPE_2)} · Scope 3: ${formatEmissionsValue(scopeSummary.SCOPE_3)}`;
  const electricityRecordCount = calculationDetails.filter((item) => item.activityType === 'ELECTRICITY').length;
  const calculatedElectricityCount = calculationDetails.filter(
    (item) => item.activityType === 'ELECTRICITY' && item.status === 'CALCULATED',
  ).length;
  const unclassifiedCalculatedRecords = calculationDetails.filter(
    (item) => item.status === 'CALCULATED' && getFormalScopeResolution(item).scope === 'UNCLASSIFIED',
  );

  function toggleSection(sectionId: string) {
    setExpandedSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  }

  function expandAllSections() {
    setExpandedSections(Object.fromEntries(REPORT_SECTION_IDS.map((id) => [id, true])));
  }

  function collapseAllSections() {
    setExpandedSections(Object.fromEntries(REPORT_SECTION_IDS.map((id) => [id, false])));
  }

  return (
    <section style={reportShellStyle}>
      <div style={coverPageStyle}>
        <div style={reportHeaderStyle}>
          <div style={brandBlockStyle}>
            <div style={brandIconStyle}>CL</div>
            <div>
              <div style={brandNameStyle}>CarbonLite</div>
              <div style={brandSubtitleStyle}>Pilot reporting workflow</div>
            </div>
          </div>
          <div style={coverLabelStyle}>Report Cover</div>
        </div>
        <div style={coverBodyStyle}>
          <div style={reportTitleStyle}>Pilot Emissions Data Readiness Report</div>
          <div style={coverOrganizationStyle}>{organizationName || 'Workspace'}</div>
          <div style={coverFactsStyle}>
            <div><strong>Reporting period:</strong> {reportPeriod}</div>
            <div><strong>Report scope:</strong> {scopeLabel}</div>
            <div><strong>Generated date:</strong> {generatedAt}</div>
            <div><strong>Prepared by:</strong> CarbonLite</div>
            <div>Prepared for review as part of a pilot emissions data readiness and reporting workflow.</div>
          </div>
        </div>
      </div>

      <div style={reportSectionToolbarStyle}>
        <button type="button" onClick={expandAllSections} style={reportSectionToolbarButtonStyle}>
          Expand all
        </button>
        <button type="button" onClick={collapseAllSections} style={reportSectionToolbarButtonStyle}>
          Collapse all
        </button>
      </div>

      <ReportSection
        title="A. Report Scope"
        sectionId="report-scope"
        expanded={expandedSections['report-scope']}
        onToggle={toggleSection}
        summary={`${reportPeriod} · ${scopeLabel}`}
      >
        <div style={factsGridStyle}>
          <Fact label="Organization" value={organizationName} />
          <Fact label="Report Period" value={reportPeriod} />
          <Fact label="Scope Mode" value={scopeLabel} />
          <Fact label="Records Included" value={String(reportCountSummary.processedRecords)} />
          <Fact label="Generated Date" value={generatedAt} />
        </div>
      </ReportSection>

      <ReportSection
        title="B. Executive Summary"
        sectionId="executive-summary"
        expanded={expandedSections['executive-summary']}
        onToggle={toggleSection}
        summary={`${executiveSummary.estimatedEmissions} · ${executiveSummary.recordsIncluded} included · ${executiveSummary.recordsSkipped} require review`}
      >
        <ExecutiveSummarySection executiveSummary={executiveSummary} />
      </ReportSection>

      <ReportSection
        title="C. Emissions Hotspots"
        sectionId="emissions-hotspots"
        expanded={expandedSections['emissions-hotspots']}
        onToggle={toggleSection}
        summary={
          hotspotAnalysis.topCategory
            ? `Top hotspot: ${hotspotAnalysis.topCategory.displayName} · ${formatDisplayNumber(hotspotAnalysis.topCategory.percentageOfTotal)}%`
            : 'No calculated hotspots yet'
        }
      >
        <EmissionsHotspotsSection analysis={hotspotAnalysis} />
      </ReportSection>

      <ReportSection
        title="D. Scope Breakdown"
        sectionId="scope-breakdown"
        expanded={expandedSections['scope-breakdown']}
        onToggle={toggleSection}
        summary={scopeSummaryLine}
      >
        <ScopeBreakdownSection
          scopeSummary={scopeSummary}
          electricityRecordCount={electricityRecordCount}
          calculatedElectricityCount={calculatedElectricityCount}
          unclassifiedCalculatedRecords={unclassifiedCalculatedRecords}
          formatRecordUnit={formatReportUnit}
          formatScopeSourceLabel={(item) => formatScopeSource(getFormalScopeResolution(item).source)}
        />
      </ReportSection>

      <ReportSection
        title="E. Calculation Quality Summary"
        sectionId="calculation-quality"
        expanded={expandedSections['calculation-quality']}
        onToggle={toggleSection}
        summary={`${reportCountSummary.processedRecords} calculated · ${reportCountSummary.skippedRecords} skipped`}
      >
        <CalculationQualitySection
          reportCountSummary={reportCountSummary}
          primarySkippedReasons={primarySkippedReasons}
          dataQualityCoverage={executiveSummary.dataQualityCoverage}
          skippedReasonsLabel={formatSkippedReasons(primarySkippedReasons)}
        />
      </ReportSection>

      <ReportSection
        title="F. Emissions Breakdown"
        sectionId="emissions-breakdown"
        expanded={expandedSections['emissions-breakdown']}
        onToggle={toggleSection}
        summary={`${totalsByMetric.length} metric rows`}
      >
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

      <ReportSection
        title="G. Activity Breakdown"
        sectionId="activity-breakdown"
        expanded={expandedSections['activity-breakdown']}
        onToggle={toggleSection}
        summary={`${matchedActivityEmissions.length} calculated activity records`}
      >
        <ActivityBreakdownSection matchedActivityEmissions={matchedActivityEmissions} />
      </ReportSection>

      <ReportSection
        title="H. Emission Factors Used"
        sectionId="emission-factors"
        expanded={expandedSections['emission-factors']}
        onToggle={toggleSection}
        summary={`${conversionFactorsUsed.length} factors used`}
      >
        <EmissionFactorsUsedSection
          conversionFactorsUsed={conversionFactorsUsed}
          formatJurisdiction={formatReportJurisdiction}
        />
      </ReportSection>

      <ReportSection
        title="I. Calculation Traceability"
        sectionId="calculation-traceability"
        expanded={expandedSections['calculation-traceability']}
        onToggle={toggleSection}
        summary={`${calculationDetails.length} audit records`}
      >
        <CalculationTraceabilitySection
          calculationDetails={calculationDetails}
          formatRecordUnit={formatReportUnit}
          formatScopeLabel={(item) => formatScopeClassification(getFormalScopeResolution(item).scope)}
        />
      </ReportSection>

      <ReportSection
        title="J. Source Evidence"
        sectionId="source-evidence"
        expanded={expandedSections['source-evidence']}
        onToggle={toggleSection}
        summary={`${sourceEvidenceRows.length} source rows`}
      >
        <SourceEvidenceSection sourceEvidenceRows={sourceEvidenceRows} />
      </ReportSection>

      <ReportSection
        title="K. Records Requiring Review"
        sectionId="records-review"
        expanded={expandedSections['records-review']}
        onToggle={toggleSection}
        summary={`${reviewRecordCount} records require review${trackedMetricCount ? ` · ${trackedMetricCount} tracked metrics` : ''}`}
      >
        <RecordsRequiringReviewSection
          calculationDetails={calculationDetails}
          formatRecordUnit={formatReportUnit}
        />
      </ReportSection>

      <ReportSection
        title="L. Methodology and Disclaimer"
        sectionId="methodology"
        expanded={expandedSections.methodology}
        onToggle={toggleSection}
        summary="Calculation approach and use disclaimer"
      >
        <MethodologyDisclaimerSection methodology={FORMAL_REPORT_METHODOLOGY} />
      </ReportSection>
    </section>
  );
}

function getFormalScopeResolution(detail: CalculationAuditDetail) {
  return resolveScopeClassification({
    activityType: detail.activityType,
    scopeOverride: detail.scopeOverride,
    factorDefaultScope: detail.factorDefaultScope,
    factorScope: detail.factorScope,
  });
}

function buildFormalScopeSummary(calculationDetails: CalculationAuditDetail[]) {
  const summary = {
    SCOPE_1: 0,
    SCOPE_2: 0,
    SCOPE_3: 0,
    UNCLASSIFIED: 0,
  };

  calculationDetails.forEach((detail) => {
    if (detail.status !== 'CALCULATED') return;

    const emissions = Number(detail.calculatedEmissionsKgCO2e ?? detail.calculatedEmission ?? 0);
    if (!Number.isFinite(emissions)) return;

    const scope = getFormalScopeResolution(detail).scope;
    if (scope === 'TRACKED_METRIC') return;
    if (scope === 'UNCLASSIFIED') {
      summary.UNCLASSIFIED += emissions;
      return;
    }

    summary[scope] += emissions;
  });

  return summary;
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
  sectionId,
  expanded,
  onToggle,
  summary,
  children,
}: {
  title: string;
  sectionId: string;
  expanded: boolean;
  onToggle: (sectionId: string) => void;
  summary?: string;
  children: React.ReactNode;
}) {
  const contentId = `report-section-${sectionId}`;

  return (
    <div style={reportSectionStyle}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={() => onToggle(sectionId)}
        style={reportSectionHeaderButtonStyle}
      >
        <span aria-hidden="true" style={reportSectionChevronStyle}>
          {expanded ? '▾' : '▸'}
        </span>
        <span style={reportSectionTitleStyle}>{title}</span>
      </button>
      {summary ? <div style={reportSectionSummaryStyle}>{summary}</div> : null}
      {expanded ? (
        <div id={contentId} style={reportSectionContentStyle}>
          {children}
        </div>
      ) : null}
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

const reportSectionToolbarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 10,
  marginTop: 16,
  flexWrap: 'wrap',
};

const reportSectionToolbarButtonStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#0f172a',
  fontWeight: 800,
  cursor: 'pointer',
};

const reportSectionHeaderButtonStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: 0,
  border: 0,
  background: 'transparent',
  color: '#0f172a',
  textAlign: 'left',
  cursor: 'pointer',
};

const reportSectionChevronStyle: React.CSSProperties = {
  width: 18,
  color: '#047857',
  fontSize: 16,
  fontWeight: 900,
};

const reportSectionTitleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 900,
};

const reportSectionSummaryStyle: React.CSSProperties = {
  margin: '6px 0 0 26px',
  color: '#64748b',
  fontSize: 13,
  lineHeight: 1.4,
};

const reportSectionContentStyle: React.CSSProperties = {
  marginTop: 14,
};

const qualityReasonStyle: React.CSSProperties = {
  marginTop: 14,
  padding: 12,
  border: '1px solid #fed7aa',
  borderRadius: 8,
  background: '#fff7ed',
  color: '#9a3412',
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
