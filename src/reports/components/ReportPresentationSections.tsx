import type React from 'react';
import { CollapsibleSection } from '../../components/common/CollapsibleSection';
import { CollapsibleReportSection } from '../../components/reports/CollapsibleReportSection';
import type {
  CalculationQualitySummary,
  CanonicalReportData,
  RegulatoryReportingReference,
  SourceReviewSummary,
} from '../domain/reportTypes';
import type { SpreadsheetReviewRowItem } from '../../services/spreadsheetReviewRows';
import type { CarbonCreditReadinessAssessment } from '../../components/MetricsSummarySection';
import type { ReportingReadinessAssessment, ReportingReadinessItem } from '../../utils/reportingReadiness';
import { formatReadinessStatus } from '../../utils/reportingReadiness';
import type {
  FacilityThresholdReferenceRow,
  SiteFacilityBreakdownRow,
} from '../../utils/siteFacilityBreakdown';
import { FACILITY_THRESHOLD_REFERENCE_DISCLAIMER } from '../../utils/siteFacilityBreakdown';
import {
  formatDisplayNumber,
  formatEmissionsWithUnit,
} from '../../utils/numberFormatting';
import { getActivityTypeLabel } from '../../utils/activityType';
import { formatDateOnly } from '../../utils/dateOnly';
import { formatCalculationStatusLabel } from '../../utils/terminology';
import { formatReportUnit } from '../../components/FormalReportPreview';
import {
  CARBONLITE_CALCULATION_COVERAGE_LABEL,
  getInventoryBoundaryStatus,
  type InventoryBoundary,
} from '../../constants/inventoryBoundary';

export type ReportActivityRecordRow = {
  id: string;
  recordDate: string;
  activityType: string;
  quantity: string | number;
  unit: string;
  source: string;
  reference: string;
};

export type AuditEvidenceSummaryRow = {
  source: string;
  activity: string;
  factor: string;
  calculation: string;
  scope: string;
  report: string;
  warnings: string;
};

export function ReportHeader({
  subtitle,
}: {
  subtitle: string;
}) {
  return (
    <div style={reportsHeaderStyle}>
      <div>
        <h1 style={reportsTitleStyle}>Reports</h1>

        <p style={reportsSubtitleStyle}>{subtitle}</p>
      </div>
    </div>
  );
}

export function InventoryBoundaryPanel({
  boundary,
  summary,
  expanded,
  onToggle,
  canEdit,
  isPilotReviewerAccount,
  onEdit,
}: {
  boundary: InventoryBoundary;
  summary: string;
  expanded: boolean;
  onToggle: () => void;
  canEdit: boolean;
  isPilotReviewerAccount: boolean;
  onEdit: () => void;
}) {
  const boundaryStatus = getInventoryBoundaryStatus(boundary);
  const boundaryComplete = boundaryStatus === 'Complete';

  return (
    <CollapsibleSection
      id="report-reporting-boundary"
      title="Reporting Boundary"
      summary={summary}
      expanded={expanded}
      onToggle={onToggle}
      style={inventoryBoundaryPanelStyle}
      contentStyle={inventoryBoundaryGridStyle}
    >
      <div style={reportingBoundaryIntroStyle}>
        <span>
          {isPilotReviewerAccount
            ? 'Pilot review account · Sample boundary information · Read-only'
            : 'This reporting boundary is read-only on Reports and comes from Organization & Boundary settings.'}
        </span>
        {canEdit ? (
          <button
            type="button"
            onClick={onEdit}
            style={reportingBoundaryEditButtonStyle}
          >
            Edit in Organization & Boundary
          </button>
        ) : !isPilotReviewerAccount ? (
          <span style={reportingBoundaryReadOnlyTextStyle}>
            This reporting boundary is read-only for your account.
          </span>
        ) : null}
      </div>

      {!boundaryComplete ? (
        <div style={reportingBoundaryWarningStyle}>
          Reporting boundary information is incomplete. Calculation results may still be reviewed,
          but boundary assumptions should be confirmed before formal reporting.
        </div>
      ) : null}

      <div style={reportingBoundaryGroupStyle}>
        <h3 style={reportingBoundaryGroupHeadingStyle}>Configured reporting boundary</h3>
        <DataQualityNote label="Boundary status" value={boundaryStatus} />
        <DataQualityNote label="Boundary review status" value={formatBoundaryReviewStatus(boundary)} />
        <DataQualityNote label="Boundary version" value={`v${boundary.boundaryVersion ?? 1}`} />
        <DataQualityNote label="Boundary reviewed by" value={boundary.boundaryReviewedBy || 'Not assigned'} />
        <DataQualityNote label="Boundary reviewed at" value={formatBoundaryReviewedAt(boundary.boundaryReviewedAt)} />
        <DataQualityNote label="Organization / Workspace" value={formatBoundaryValue(boundary.organizationWorkspace)} />
        {boundary.industry ? (
          <DataQualityNote label="Industry" value={boundary.industry} />
        ) : null}
        {boundary.country ? (
          <DataQualityNote label="Country" value={boundary.country} />
        ) : null}
        {boundary.provinceOrTerritory ? (
          <DataQualityNote label="Province / Territory" value={boundary.provinceOrTerritory} />
        ) : null}
        {boundary.city ? (
          <DataQualityNote label="City" value={boundary.city} />
        ) : null}
        <DataQualityNote label="Reporting period" value={formatBoundaryValue(boundary.reportingPeriod)} />
        <DataQualityNote label="Geographic boundary" value={formatBoundaryValue(boundary.geographicBoundary)} />
        <DataQualityNote
          label="Included facilities or locations"
          value={formatBoundaryValue(boundary.includedFacilitiesOrLocations)}
        />
        <DataQualityNote
          label="Excluded facilities or locations"
          value={formatBoundaryValue(boundary.excludedFacilitiesOrLocations)}
        />
        <DataQualityNote label="Included scopes" value={formatBoundaryValue(boundary.includedScopes)} />
        <DataQualityNote label="Scope 3 coverage note" value={formatBoundaryValue(boundary.scope3CoverageNote)} />
        <DataQualityNote label="Exclusions / limitations" value={formatBoundaryValue(boundary.exclusionsLimitations)} />
        <DataQualityNote label="Boundary notes" value={formatBoundaryValue(boundary.boundaryNotes)} />
      </div>

      <div style={reportingBoundaryGroupStyle}>
        <h3 style={reportingBoundaryGroupHeadingStyle}>CarbonLite calculation coverage</h3>
        <DataQualityNote label="Pilot calculation coverage" value={CARBONLITE_CALCULATION_COVERAGE_LABEL} />
        <div style={calculationCoverageNoteStyle}>
          This describes the activity categories CarbonLite currently calculates. It does not
          replace the organization's configured reporting boundary.
        </div>
      </div>
    </CollapsibleSection>
  );
}

export function ReportSectionControls({
  onExpandAll,
  onCollapseAll,
}: {
  onExpandAll: () => void;
  onCollapseAll: () => void;
}) {
  return (
    <div style={sectionControlsStyle}>
      <button type="button" onClick={onExpandAll} style={secondaryButtonStyle(false)}>
        Expand all
      </button>
      <button type="button" onClick={onCollapseAll} style={secondaryButtonStyle(false)}>
        Collapse all
      </button>
    </div>
  );
}

export function ReportActions({
  loading,
  exportDisabled,
  exportDisabledTitle,
  hasNoDataInSystem,
  isExportMenuOpen,
  exportMenuRef,
  exportMenuTriggerRef,
  onGenerate,
  onToggleExportMenu,
  onExportExecutive,
  onExportTechnical,
  onExportCsv,
}: {
  loading: boolean;
  exportDisabled: boolean;
  exportDisabledTitle?: string;
  hasNoDataInSystem: boolean;
  isExportMenuOpen: boolean;
  exportMenuRef: React.RefObject<HTMLDivElement | null>;
  exportMenuTriggerRef: React.RefObject<HTMLButtonElement | null>;
  onGenerate: () => void;
  onToggleExportMenu: () => void;
  onExportExecutive: () => void;
  onExportTechnical: () => void;
  onExportCsv: () => void;
}) {
  return (
    <div style={reportActionsStyle}>
      <button
        onClick={onGenerate}
        disabled={loading || hasNoDataInSystem}
        style={secondaryButtonStyle(loading || hasNoDataInSystem)}
        title={hasNoDataInSystem ? 'Upload and import activity data before generating a report.' : undefined}
      >
        {loading ? 'Generating...' : 'Generate Report'}
      </button>

      <div ref={exportMenuRef} style={exportMenuWrapperStyle}>
        <button
          ref={exportMenuTriggerRef}
          type="button"
          onClick={onToggleExportMenu}
          disabled={exportDisabled}
          title={exportDisabledTitle}
          aria-haspopup="menu"
          aria-expanded={isExportMenuOpen}
          aria-controls="report-export-menu"
          style={primaryButtonStyle(exportDisabled)}
        >
          <span style={exportButtonContentStyle}>
            Export reports
            <span aria-hidden="true" style={exportButtonChevronStyle}>▾</span>
          </span>
        </button>
        {isExportMenuOpen ? (
          <div
            id="report-export-menu"
            role="menu"
            aria-label="Export report"
            style={exportMenuStyle}
          >
            <button
              type="button"
              role="menuitem"
              disabled={exportDisabled}
              onClick={onExportExecutive}
              style={exportMenuItemStyle(exportDisabled)}
            >
              Executive Summary (PDF)
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={exportDisabled}
              onClick={onExportTechnical}
              style={exportMenuItemStyle(exportDisabled)}
            >
              Technical Review Package (PDF)
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={exportDisabled}
              onClick={onExportCsv}
              style={exportMenuItemStyle(exportDisabled)}
            >
              Data Export (CSV)
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ReportEmptyState({ onInputData }: { onInputData: () => void }) {
  return (
    <div style={reportEmptyStateStyle}>
      <h2 style={{ margin: 0, fontSize: 22 }}>No reporting data found.</h2>
      <p style={{ margin: '10px 0 18px', color: reportsPalette.infoText, lineHeight: 1.6 }}>
        Add and import activity data to generate your first emissions report.
      </p>
      <button type="button" onClick={onInputData} style={primaryButtonStyle(false)}>
        Go to Input Data
      </button>
    </div>
  );
}

export function ActivityRecordsSection({
  rows,
  expanded,
  onToggle,
}: {
  rows: ReportActivityRecordRow[];
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <CollapsibleReportSection
      id="activity-records-report-section"
      title="Activity Records"
      summary={`${rows.length} activity record${rows.length === 1 ? '' : 's'}`}
      expanded={expanded}
      onToggle={onToggle}
    >
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Date</th>
            <th style={thStyle}>Activity Type</th>
            <th style={thStyle}>Quantity</th>
            <th style={thStyle}>Unit</th>
            <th style={thStyle}>Source</th>
            <th style={thStyle}>Reference</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} style={emptyStyle}>
                No activity records available.
              </td>
            </tr>
          ) : (
            rows.map((item) => (
              <tr key={item.id}>
                <td style={tdStyle}>{formatDateOnly(item.recordDate)}</td>
                <td style={tdStyle}>{item.activityType}</td>
                <td style={tdStyle}>{formatDisplayNumber(item.quantity)}</td>
                <td style={tdStyle}>{item.unit}</td>
                <td style={tdStyle}>{item.source}</td>
                <td style={tdStyle}>{item.reference}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </CollapsibleReportSection>
  );
}

export function CalculationQualitySection({
  data,
  readiness,
  sourceReview,
  primarySkippedReasonsText,
  expanded,
  onToggle,
}: {
  data: CalculationQualitySummary;
  readiness: ReportingReadinessAssessment;
  sourceReview: SourceReviewSummary;
  primarySkippedReasonsText: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const readinessSummary = data.dataReadinessSummary;

  return (
    <CollapsibleReportSection
      id="data-quality-notes-report-section"
      title="Data Quality Notes"
      summary={`${readinessSummary.recordsReadyForCalculation} calculated · ${readinessSummary.recordsRequiringReview} imported requiring review`}
      expanded={expanded}
      onToggle={onToggle}
    >
      <div style={dataQualityNotesGridStyle}>
        <DataQualityNote label="Readiness Status" value={formatReadinessStatus(readiness.overallStatus)} />
        <DataQualityNote label="Calculation Coverage" value={data.calculationCoverage} />
        <DataQualityNote
          label="Optional Data Completeness"
          value={`${formatDisplayNumber(readinessSummary.optionalDataCompleteness.score)}%`}
          detail={formatOptionalDataCompletenessDetail(readinessSummary)}
        />
        <DataQualityNote label="Calculated Records" value={readinessSummary.recordsReadyForCalculation} />
        <DataQualityNote label="Imported Activity Records Requiring Review" value={readinessSummary.recordsRequiringReview} />
        <DataQualityNote
          label="Source Rows Still Requiring Review"
          value={formatSourceReviewCount(sourceReview, sourceReview.needsReviewCount)}
        />
        <DataQualityNote label="Tracked Operational Metrics" value={readinessSummary.trackedOnlyCount} />
        <DataQualityNote label="Missing Factors" value={readinessSummary.missingFactorCount} />
        <DataQualityNote label="Missing Jurisdiction" value={readinessSummary.missingJurisdictionCount} />
      </div>
      <ReportingReadinessChecklist assessment={readiness} />
      <div style={dataQualityExplanationStyle}>
        <strong>How to read these metrics:</strong>
        <p>
          Calculation Coverage is calculated emission-bearing records divided by eligible emission-bearing records. Tracked metrics are retained for review but excluded from the denominator.
        </p>
        <p>
          Reporting Readiness is an evidence-based checklist. Optional metadata such as cost is reported separately and does not reduce readiness.
        </p>
        <p>
          Accommodation estimates are treated as selected business-travel-related Scope 3 activity records in this pilot.
        </p>
      </div>
      {readinessSummary.recordsRequiringReview > 0 ? (
        <p style={{ color: reportsPalette.secondaryText, lineHeight: 1.6, marginTop: 10 }}>
          Review reasons: {primarySkippedReasonsText}.
        </p>
      ) : readinessSummary.trackedOnlyCount > 0 ? (
        <p style={{ color: reportsPalette.secondaryText, lineHeight: 1.6, marginTop: 10 }}>
          Tracked operational metrics are retained for review but excluded from the calculated GHG emissions total.
        </p>
      ) : null}
      <p style={{ color: reportsPalette.secondaryText, lineHeight: 1.6, marginTop: 10 }}>
        Hotspot analysis is based only on calculated records. Records requiring review are excluded until fixed.
      </p>
    </CollapsibleReportSection>
  );
}

export function SourceDatasetReviewSection({
  data,
  expanded,
  onToggle,
}: {
  data: SourceReviewSummary;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <CollapsibleReportSection
      id="source-dataset-review-status-report-section"
      title="Source Dataset Review Status"
      summary={formatSourceReviewStatus(data)}
      expanded={expanded}
      onToggle={onToggle}
    >
      <div style={dataQualityNotesGridStyle}>
        <DataQualityNote label="Source Files" value={formatSourceReviewFiles(data)} />
        <DataQualityNote label="Reviewable Source Rows" value={formatSourceReviewCount(data, data.totalRows)} />
        <DataQualityNote
          label="Rows Resolved / Imported"
          value={data.available ? `${data.resolvedCount} of ${data.totalRows}` : formatSourceReviewCount(data, data.importedCount ?? 0)}
        />
        <DataQualityNote label="Emission Rows Eligible for Import" value={formatSourceReviewCount(data, data.readyCount)} />
        <DataQualityNote label="Tracked Operational Rows" value={formatSourceReviewCount(data, data.trackedOnlyCount)} />
        <DataQualityNote label="Source Rows Still Requiring Review" value={formatSourceReviewCount(data, data.needsReviewCount)} />
      </div>
      <p style={{ color: reportsPalette.secondaryText, lineHeight: 1.6, marginTop: 10 }}>
        {getSourceReviewSectionNote(data)}
      </p>
      {data.needsReviewRows.length > 0 ? (
        <table style={{ ...tableStyle, marginTop: 12 }}>
          <thead>
            <tr>
              <th style={thStyle}>Source Reference</th>
              <th style={thStyle}>Activity</th>
              <th style={thStyle}>Quantity</th>
              <th style={thStyle}>Unit</th>
              <th style={thStyle}>Issue</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.needsReviewRows.map((row) => (
              <tr key={row.id || row.rowId || row.sourceReference || row.sourceRow}>
                <td style={tdStyle}>{row.sourceReference || row.rowId || 'Source row'}</td>
                <td style={tdStyle}>{getActivityTypeLabel(row.activityType || row.rawActivityType || 'UNKNOWN')}</td>
                <td style={tdStyle}>{row.quantity ?? row.rawQuantity ?? ''}</td>
                <td style={tdStyle}>{formatReportUnit(row.unit || '')}</td>
                <td style={tdStyle}>{formatSourceReviewIssue(row)}</td>
                <td style={tdStyle}>{formatSourceReviewAction(row)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </CollapsibleReportSection>
  );
}

export function AuditEvidenceChainSection({
  rows,
  reportId,
  expanded,
  onToggle,
}: {
  rows: AuditEvidenceSummaryRow[];
  reportId: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <CollapsibleReportSection
      id="audit-evidence-chain-report-section"
      title="Audit / Evidence Chain"
      summary={`${rows.length} source-to-report chain${rows.length === 1 ? '' : 's'} · ${reportId}`}
      expanded={expanded}
      onToggle={onToggle}
    >
      <p style={sectionDescriptionStyle}>
        Read-only evidence chain derived from linked source, review, factor, calculation, scope, and report metadata. Export Audit Evidence for the machine-readable version.
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Source</th>
            <th style={thStyle}>Activity</th>
            <th style={thStyle}>Factor</th>
            <th style={thStyle}>Calculation</th>
            <th style={thStyle}>Scope</th>
            <th style={thStyle}>Report</th>
            <th style={thStyle}>Warnings</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} style={emptyStyle}>
                No evidence chains available for this report.
              </td>
            </tr>
          ) : (
            rows.slice(0, 25).map((row, index) => (
              <tr key={`${row.source}-${row.activity}-${index}`}>
                <td style={tdStyle}>{row.source}</td>
                <td style={tdStyle}>{row.activity}</td>
                <td style={tdStyle}>{row.factor}</td>
                <td style={tdStyle}>{row.calculation}</td>
                <td style={tdStyle}>{row.scope}</td>
                <td style={tdStyle}>{row.report || reportId}</td>
                <td style={tdStyle}>{row.warnings || 'None'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {rows.length > 25 ? (
        <p style={{ ...sectionDescriptionStyle, marginTop: 10 }}>
          Showing first 25 chains in the report preview. Export Audit Evidence for the full set.
        </p>
      ) : null}
    </CollapsibleReportSection>
  );
}

export function CarbonCreditReadinessSection({
  assessment,
  readinessLevelLabel,
  recordsRequiringReview,
  trackedOnlyCount,
  disclaimer,
  expanded,
  onToggle,
}: {
  assessment: CarbonCreditReadinessAssessment;
  readinessLevelLabel: string;
  recordsRequiringReview: number;
  trackedOnlyCount: number;
  disclaimer: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <CollapsibleReportSection
      id="carbon-credit-readiness-report-section"
      title="Optional Carbon Credit Screening Notes"
      summary={`${readinessLevelLabel} · ${assessment.score}/100`}
      expanded={expanded}
      onToggle={onToggle}
    >
      <p style={{ color: reportsPalette.secondaryText, lineHeight: 1.6, margin: '0 0 12px' }}>
        This section is not included in standard pilot reports and does not determine eligibility for carbon credits.
      </p>
      <p style={{ color: reportsPalette.secondaryText, lineHeight: 1.6, margin: '0 0 12px' }}>
        This optional section is an early screening note only. It is not a certification, verification, eligibility determination, or compliance assessment.
      </p>
      <div style={dataQualityNotesGridStyle}>
        <DataQualityNote label="Readiness Level" value={readinessLevelLabel} />
        <DataQualityNote label="Readiness Score" value={`${assessment.score}/100`} />
        <DataQualityNote
          label="Reduction Detected"
          value={
            assessment.reductionAmount !== null && assessment.reductionPercentage !== null
              ? `${formatEmissionsWithUnit(assessment.reductionAmount)} · ${formatDisplayNumber(assessment.reductionPercentage)}%`
              : 'Not assessed or not detected'
          }
        />
        <DataQualityNote label="Records Requiring Review" value={recordsRequiringReview} />
        <DataQualityNote label="Tracked Operational Metrics" value={trackedOnlyCount} />
      </div>
      <p style={{ color: reportsPalette.infoText, lineHeight: 1.7, marginTop: 12 }}>
        {assessment.summary}
      </p>
      <p style={creditDisclaimerReportStyle}>
        {disclaimer}
      </p>
    </CollapsibleReportSection>
  );
}

export function ScopeBreakdownSection({
  data,
  unclassifiedCalculatedRecordCount,
  expanded,
  onToggle,
}: {
  data: CanonicalReportData['scopeBreakdown'];
  unclassifiedCalculatedRecordCount: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const scopeSummary = data.totals;

  return (
    <CollapsibleReportSection
      id="scope-breakdown-report-section"
      title="Emissions by Scope"
      summary={`Scope 1: ${formatDisplayNumber(scopeSummary['Scope 1'])} · Scope 2: ${formatDisplayNumber(scopeSummary['Scope 2'])} · Scope 3: ${formatDisplayNumber(scopeSummary['Scope 3'])}`}
      expanded={expanded}
      onToggle={onToggle}
    >
      <ScopeExplanation />
      <div style={scopeCardGridStyle}>
        <Card title="Scope 1" subtitle={scopeLabelByName['Scope 1']} value={formatEmissionsWithUnit(scopeSummary['Scope 1'])} icon="🏭" />
        <Card title="Scope 2" subtitle={scopeLabelByName['Scope 2']} value={formatEmissionsWithUnit(scopeSummary['Scope 2'])} icon="⚡" />
        <Card title="Scope 3" subtitle={scopeLabelByName['Scope 3']} value={formatEmissionsWithUnit(scopeSummary['Scope 3'])} icon="🌍" />
        {scopeSummary.Unclassified > 0 ? (
          <Card title="Unclassified" subtitle="Requires scope review" value={formatEmissionsWithUnit(scopeSummary.Unclassified)} icon="?" />
        ) : null}
      </div>
      {unclassifiedCalculatedRecordCount > 0 ? (
        <div style={scopeUnclassifiedWarningStyle}>
          {unclassifiedCalculatedRecordCount} calculated record(s) could not be assigned to Scope 1, 2, or 3 and should be reviewed.
        </div>
      ) : null}
    </CollapsibleReportSection>
  );
}

export function FacilityBreakdownSection({
  data,
  expanded,
  onToggle,
}: {
  data: CanonicalReportData['facilityBreakdown'];
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <CollapsibleReportSection
      id="site-facility-breakdown-report-section"
      title="Emissions by Site / Facility"
      summary={
        data.rows.length > 0
          ? `Organization total: ${formatEmissionsWithUnit(data.organizationTotalKgCO2e)} · ${data.rows.length} site/facility ${data.rows.length === 1 ? 'group' : 'groups'}`
          : 'No calculated site/facility totals'
      }
      expanded={expanded}
      onToggle={onToggle}
    >
      <p style={sectionDescriptionStyle}>
        Organization total: <strong>{formatEmissionsWithUnit(data.organizationTotalKgCO2e)}</strong>. This section summarizes calculated emissions by the facility, site, or location assigned to each activity record. Records without a specified site are grouped under “Unassigned”.
      </p>
      <SiteFacilityBreakdownTable rows={data.rows} />
    </CollapsibleReportSection>
  );
}

export function FacilityThresholdReferenceSection({
  rows,
  expanded,
  onToggle,
}: {
  rows: FacilityThresholdReferenceRow[];
  expanded: boolean;
  onToggle: () => void;
}) {
  if (rows.length === 0) return null;

  return (
    <CollapsibleReportSection
      id="facility-threshold-reference-report-section"
      title="Facility-Level Reporting Threshold Reference"
      summary="Regulatory threshold screening provenance not configured"
      expanded={expanded}
      onToggle={onToggle}
    >
      <p style={sectionDescriptionStyle}>
        Regulatory threshold screening is not yet configured with reviewed source provenance for this jurisdiction.
      </p>
      <p style={thresholdDisclaimerStyle}>{FACILITY_THRESHOLD_REFERENCE_DISCLAIMER}</p>
      <FacilityThresholdReferenceTable rows={rows} />
    </CollapsibleReportSection>
  );
}

export function RegulatoryReportingReferenceSection({
  regulatoryReportingReference,
  title,
  summary,
  text,
  expanded,
  onToggle,
  formatReference,
}: {
  regulatoryReportingReference: RegulatoryReportingReference;
  title: string;
  summary: string;
  text: string;
  expanded: boolean;
  onToggle: () => void;
  formatReference: (reference: RegulatoryReportingReference['thresholdReferences'][number]) => string;
}) {
  return (
    <CollapsibleReportSection
      id="regulatory-reporting-reference-report-section"
      title={title}
      summary={summary}
      expanded={expanded}
      onToggle={onToggle}
    >
      <div style={regulatoryReferenceContentStyle}>
        <p style={sectionDescriptionStyle}>{text}</p>
        <div>
          <p style={regulatoryReferenceIntroStyle}>Current regulatory/reporting references:</p>
          <ul style={regulatoryReferenceListStyle}>
            {regulatoryReportingReference.currentSystems.map((system) => (
              <li key={system}>{system}</li>
            ))}
          </ul>
        </div>
        {regulatoryReportingReference.historicalNotes.length ? (
          <div>
            <p style={regulatoryReferenceIntroStyle}>Historical / period-specific reference:</p>
            <ul style={regulatoryReferenceListStyle}>
              {regulatoryReportingReference.historicalNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div>
          <p style={regulatoryReferenceIntroStyle}>Regulatory threshold provenance:</p>
          {regulatoryReportingReference.thresholdReferences.length ? (
            <ul style={regulatoryReferenceListStyle}>
              {regulatoryReportingReference.thresholdReferences.map((reference) => (
                <li key={`${reference.jurisdictionRegion}-${reference.programName}`}>
                  {formatReference(reference)}
                </li>
              ))}
            </ul>
          ) : (
            <p style={thresholdDisclaimerStyle}>
              Regulatory threshold screening is not yet configured with reviewed source provenance for this jurisdiction.
            </p>
          )}
        </div>
        <p style={thresholdDisclaimerStyle}>
          Reference only. CarbonLite does not determine regulatory obligations. Consult a qualified professional before making regulatory filing or compliance decisions.
        </p>
      </div>
    </CollapsibleReportSection>
  );
}

function DataQualityNote({
  label,
  value,
  detail,
}: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
}) {
  const valueTitle =
    typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;

  return (
    <div style={dataQualityNoteStyle}>
      <span>{label}</span>
      <strong style={dataQualityNoteValueStyle} title={valueTitle}>
        {value}
      </strong>
      {detail ? <span style={dataQualityNoteDetailStyle}>{detail}</span> : null}
    </div>
  );
}

function ReportingReadinessChecklist({ assessment }: { assessment: ReportingReadinessAssessment }) {
  return (
    <div style={reportingReadinessChecklistStyle}>
      <h3 style={reportingReadinessChecklistTitleStyle}>Reporting Readiness Checklist</h3>
      {assessment.items.map((item) => (
        <div key={item.code} style={reportingReadinessRowStyle}>
          <span style={reportingReadinessBadgeStyle(item)}>{formatReadinessStatus(item.status)}</span>
          <div>
            <strong>{item.workflowStageLabel}: {item.label}</strong>
            <div style={reportingReadinessEvidenceStyle}>{item.evidence}</div>
            {item.action ? <div style={reportingReadinessActionStyle}>{item.action}</div> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatOptionalDataCompletenessDetail(summary: CalculationQualitySummary['dataReadinessSummary']) {
  const { costDataCount, totalRecords } = summary.optionalDataCompleteness;
  return `${costDataCount} of ${totalRecords} imported activity records include optional cost data`;
}

function formatSourceReviewFiles(summary: SourceReviewSummary) {
  if (summary.availability === 'DOCUMENT_LINEAGE_AVAILABLE') {
    return summary.sourceFiles.length ? summary.sourceFiles.join(', ') : 'Document source file available';
  }
  if (!summary.available) return 'Not applicable';
  return summary.sourceFiles.length ? summary.sourceFiles.join(', ') : 'Source file not specified';
}

function formatSourceReviewCount(summary: SourceReviewSummary, value: number | undefined) {
  if (summary.availability === 'DOCUMENT_LINEAGE_AVAILABLE') return 'Limited';
  if (!summary.available) return 'Not applicable';
  return value ?? 0;
}

function getSourceReviewSectionNote(summary: SourceReviewSummary) {
  if (summary.availability === 'DOCUMENT_LINEAGE_AVAILABLE') {
    return 'Source document lineage is available for imported records. Structured unresolved-source-row counts are not available for this document import.';
  }
  if (!summary.available) {
    return 'Source-document review is not applicable when this report scope contains manually entered records with no associated source document.';
  }
  return 'Source dataset review status is joined by source document ID. Unresolved source rows remain in spreadsheet review history and are not imported into ActivityData or included in emissions totals.';
}

function formatSourceReviewStatus(summary: SourceReviewSummary) {
  if (summary.availability === 'DOCUMENT_LINEAGE_AVAILABLE') {
    return 'Document source lineage available; structured review counts limited';
  }
  if (!summary.available) return 'Not applicable for manual-only report scope';
  return `${summary.resolvedCount} of ${summary.totalRows} source rows resolved/imported · ${summary.needsReviewCount} require review`;
}

function formatSourceReviewIssue(row: SpreadsheetReviewRowItem) {
  const issues = row.issues ?? [];
  if (issues.length > 0) {
    return issues.map((issue) => issue.message || issue.code).filter(Boolean).join('; ');
  }

  return row.calculationMessage || row.status || 'Review required';
}

function formatSourceReviewIssueType(row: SpreadsheetReviewRowItem) {
  const issue = row.issues?.[0];
  return formatCalculationStatusLabel(
    issue?.code || row.calculationStatus || row.matchingStatus || row.status || 'NEEDS_REVIEW',
  ) || 'Needs Review';
}

function formatSourceReviewAction(row: SpreadsheetReviewRowItem) {
  const issueType = formatSourceReviewIssueType(row).toUpperCase();

  if (issueType.includes('PROVINCE') || issueType.includes('JURISDICTION')) {
    return 'Add the missing province/jurisdiction and re-import or update the row.';
  }
  if (issueType.includes('UNIT')) {
    return 'Correct the unit to a supported factor unit and rerun review.';
  }
  if (issueType.includes('QUANTITY')) {
    return 'Enter a numeric quantity and rerun review.';
  }
  if (issueType.includes('ACTIVITY')) {
    return 'Map the raw activity to a supported activity type.';
  }
  if (issueType.includes('FACTOR')) {
    return 'Add or select a matching emissions factor before including in GHG totals.';
  }

  return 'Review and correct this source row before importing it into the report scope.';
}

function Card({
  title,
  subtitle,
  value,
  icon,
}: {
  title: string;
  subtitle?: string;
  value: string;
  icon: string;
}) {
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 28 }}>{icon}</div>
      <div style={{ marginTop: 10, color: reportsPalette.secondaryText, fontSize: 14 }}>{title}</div>
      {subtitle ? <div style={cardSubtitleStyle}>{subtitle}</div> : null}
      <div style={{ marginTop: 6, fontSize: 26, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

function ScopeExplanation() {
  return (
    <details style={scopeHelpStyle}>
      <summary style={scopeHelpSummaryStyle} aria-label="What do emissions scopes mean?">
        <span style={scopeHelpIconStyle} aria-hidden="true">i</span>
        What do scopes mean?
      </summary>
      <div style={scopeHelpGridStyle}>
        {SCOPE_HELP.map((item) => (
          <div key={item.scope} style={scopeHelpItemStyle}>
            <strong>{item.scope}: {item.label}</strong>
            <p style={scopeHelpTextStyle}>{item.description}</p>
            <div style={scopeHelpExamplesStyle}>Examples: {item.examples}</div>
          </div>
        ))}
        <div style={scopeHelpNoteStyle}>
          Water is treated as a tracked operational metric unless a reviewed water emissions factor is enabled.
        </div>
      </div>
    </details>
  );
}

function SiteFacilityBreakdownTable({ rows }: { rows: SiteFacilityBreakdownRow[] }) {
  if (rows.length === 0) {
    return (
      <div style={emptySiteFacilityStyle}>
        No calculated GHG records are available for site or facility totals.
      </div>
    );
  }

  return (
    <div style={siteFacilityTableWrapStyle}>
      <table style={siteFacilityTableStyle}>
        <thead>
          <tr>
            <th style={siteFacilityThStyle}>Site / Facility</th>
            <th style={siteFacilityThStyle}>Scope 1</th>
            <th style={siteFacilityThStyle}>Scope 2</th>
            <th style={siteFacilityThStyle}>Scope 3</th>
            <th style={siteFacilityThStyle}>Total</th>
            <th style={siteFacilityThStyle}>Included Records</th>
            <th style={siteFacilityThStyle}>Activity Type Breakdown</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.siteFacility}>
              <td style={siteFacilityTdStyle}>{row.siteFacility}</td>
              <td style={siteFacilityTdStyle}>{formatEmissionsWithUnit(row.scope1KgCO2e)}</td>
              <td style={siteFacilityTdStyle}>{formatEmissionsWithUnit(row.scope2KgCO2e)}</td>
              <td style={siteFacilityTdStyle}>{formatEmissionsWithUnit(row.scope3KgCO2e)}</td>
              <td style={siteFacilityTotalTdStyle}>{formatEmissionsWithUnit(row.totalKgCO2e)}</td>
              <td style={siteFacilityTdStyle}>{row.includedRecords}</td>
              <td style={siteFacilityTdStyle}>{formatSiteFacilityActivityBreakdown(row)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FacilityThresholdReferenceTable({ rows }: { rows: FacilityThresholdReferenceRow[] }) {
  return (
    <div style={siteFacilityTableWrapStyle}>
      <table style={thresholdReferenceTableStyle}>
        <thead>
          <tr>
            <th style={siteFacilityThStyle}>Site / Facility</th>
            <th style={siteFacilityThStyle}>Jurisdiction</th>
            <th style={siteFacilityThStyle}>Regulatory reference</th>
            <th style={siteFacilityThStyle}>Threshold</th>
            <th style={siteFacilityThStyle}>Total calculated emissions</th>
            <th style={siteFacilityThStyle}>Status</th>
            <th style={siteFacilityThStyle}>Screening note</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.siteFacility}>
              <td style={siteFacilityTdStyle}>{row.siteFacility}</td>
              <td style={siteFacilityTdStyle}>{row.jurisdictionLabel}</td>
              <td style={siteFacilityTdStyle}>{row.regulatoryReference}</td>
              <td style={siteFacilityTdStyle}>{row.thresholdLabel}</td>
              <td style={siteFacilityTotalTdStyle}>
                {formatEmissionsWithUnit(row.totalKgCO2e)} ({formatThresholdTonnes(row.totalTCO2e)} t CO₂e)
              </td>
              <td style={siteFacilityTdStyle}>{row.status}</td>
              <td style={siteFacilityTdStyle}>{row.screeningNote}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatSiteFacilityActivityBreakdown(row: SiteFacilityBreakdownRow) {
  if (row.activityBreakdown.length === 0) return 'No activity breakdown available';

  return row.activityBreakdown
    .map(
      (item) =>
        `${item.activityType}: ${formatEmissionsWithUnit(item.totalKgCO2e)} (${item.includedRecords} ${item.includedRecords === 1 ? 'record' : 'records'})`,
    )
    .join('; ');
}

function formatThresholdTonnes(value: number) {
  return formatThresholdNumber(value, value >= 100 ? 0 : 1);
}

function formatThresholdNumber(value: number, maximumFractionDigits: number) {
  if (!Number.isFinite(value)) return '-';

  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  });
}

function formatBoundaryValue(value?: string | null) {
  const trimmed = String(value ?? '').trim();
  return trimmed || 'Not specified';
}

function formatBoundaryReviewStatus(boundary: Pick<InventoryBoundary, 'boundaryStatus'>) {
  switch (boundary.boundaryStatus) {
    case 'REVIEWED':
      return 'Reviewed';
    case 'NOT_DEFINED':
      return 'Not Defined';
    case 'DRAFT':
    default:
      return 'Draft';
  }
}

function formatBoundaryReviewedAt(value?: string | null) {
  if (!value) return 'Not reviewed';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not reviewed';
  return date.toLocaleString();
}

function reportingReadinessBadgeStyle(item: ReportingReadinessItem): React.CSSProperties {
  const colorByStatus: Record<string, { background: string; color: string; border: string }> = {
    COMPLETE: { background: '#ECFDF5', color: '#047857', border: '#BBF7D0' },
    READY: { background: '#ECFDF5', color: '#047857', border: '#BBF7D0' },
    LIMITED: { background: '#FFFBEB', color: '#B45309', border: '#FDE68A' },
    NEEDS_ATTENTION: { background: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
    NOT_REVIEWED: { background: '#F8FAFC', color: '#64748B', border: '#E2E8F0' },
    NOT_APPLICABLE: { background: '#F8FAFC', color: '#64748B', border: '#E2E8F0' },
  };
  const colors = colorByStatus[item.status] ?? colorByStatus.NOT_REVIEWED;
  return {
    display: 'inline-flex',
    alignItems: 'center',
    alignSelf: 'flex-start',
    padding: '4px 8px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    whiteSpace: 'nowrap',
    border: `1px solid ${colors.border}`,
    background: colors.background,
    color: colors.color,
  };
}

const SCOPE_HELP = [
  {
    scope: 'Scope 1',
    label: 'Direct emissions',
    description:
      'Direct emissions from sources owned or controlled by the organization, such as natural gas, diesel, gasoline, or fleet fuel.',
    examples: 'Diesel, gasoline, natural gas, fleet fuel',
  },
  {
    scope: 'Scope 2',
    label: 'Purchased energy',
    description:
      'Indirect emissions from purchased electricity, steam, heating, or cooling.',
    examples: 'Electricity',
  },
  {
    scope: 'Scope 3',
    label: 'Selected indirect pilot estimates',
    description:
      'Selected Scope 3 activity records in this pilot, focused on business travel and transportation-related estimates. This does not represent a complete Scope 3 inventory.',
    examples: 'Air travel, business travel accommodation, ground transport, shipping',
  },
] as const;

const scopeLabelByName = Object.fromEntries(
  SCOPE_HELP.map((item) => [item.scope, item.label]),
) as Record<string, string>;

const reportsPalette = {
  primaryGreen: '#047857',
  primaryGreenHover: '#065F46',
  primaryText: '#0F172A',
  secondaryText: '#64748B',
  mutedText: '#94A3B8',
  border: '#E2E8F0',
  subtleBorder: '#F1F5F9',
  white: '#FFFFFF',
  subtleBackground: '#F8FAFC',
  disabledBackground: '#F1F5F9',
  successBackground: '#ECFDF5',
  successBorder: '#BBF7D0',
  warningBackground: '#FFFBEB',
  warningBorder: '#FDE68A',
  warningText: '#B45309',
  errorText: '#B91C1C',
  infoText: '#475569',
};

const reportsHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
  flexWrap: 'wrap',
  marginBottom: 20,
};

const reportsTitleStyle: React.CSSProperties = {
  margin: 0,
};

const reportsSubtitleStyle: React.CSSProperties = {
  color: reportsPalette.secondaryText,
  margin: '8px 0 0',
  lineHeight: 1.5,
};

const inventoryBoundaryPanelStyle: React.CSSProperties = {
  display: 'grid',
  margin: '0 0 20px',
  padding: 16,
  borderRadius: 12,
  border: `1px solid ${reportsPalette.border}`,
  background: reportsPalette.white,
  color: reportsPalette.primaryText,
};

const inventoryBoundaryGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 10,
  marginTop: 14,
};

const reportingBoundaryIntroStyle: React.CSSProperties = {
  gridColumn: '1 / -1',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  flexWrap: 'wrap',
  padding: 12,
  borderRadius: 12,
  background: reportsPalette.subtleBackground,
  border: `1px solid ${reportsPalette.border}`,
  color: reportsPalette.infoText,
  fontSize: 13,
  lineHeight: 1.45,
};

const reportingBoundaryWarningStyle: React.CSSProperties = {
  gridColumn: '1 / -1',
  padding: 12,
  borderRadius: 10,
  border: '1px solid #fde68a',
  background: '#fffbeb',
  color: '#92400e',
  fontSize: 13,
  lineHeight: 1.5,
};

const reportingBoundaryGroupStyle: React.CSSProperties = {
  gridColumn: '1 / -1',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 10,
};

const reportingBoundaryGroupHeadingStyle: React.CSSProperties = {
  gridColumn: '1 / -1',
  margin: '4px 0 0',
  fontSize: 15,
  color: reportsPalette.primaryText,
};

const calculationCoverageNoteStyle: React.CSSProperties = {
  gridColumn: '1 / -1',
  color: reportsPalette.infoText,
  fontSize: 13,
  lineHeight: 1.5,
};

const reportingBoundaryEditButtonStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: `1px solid ${reportsPalette.border}`,
  background: reportsPalette.white,
  color: reportsPalette.primaryText,
  cursor: 'pointer',
  fontWeight: 800,
};

const reportingBoundaryReadOnlyTextStyle: React.CSSProperties = {
  color: reportsPalette.secondaryText,
  fontWeight: 700,
};

const reportActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  marginBottom: 24,
  flexWrap: 'wrap',
  alignItems: 'center',
};

const sectionControlsStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 10,
  margin: '0 0 12px',
  flexWrap: 'wrap',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  borderBottom: `1px solid ${reportsPalette.border}`,
  color: reportsPalette.infoText,
  fontWeight: 800,
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderBottom: `1px solid ${reportsPalette.subtleBorder}`,
};

const emptyStyle: React.CSSProperties = {
  padding: 16,
  color: reportsPalette.secondaryText,
};

const dataQualityNotesGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 10,
};

const dataQualityNoteStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 10,
  border: `1px solid ${reportsPalette.border}`,
  background: reportsPalette.subtleBackground,
  display: 'grid',
  gap: 6,
  minWidth: 0,
};

const dataQualityNoteValueStyle: React.CSSProperties = {
  display: '-webkit-box',
  minWidth: 0,
  maxWidth: '100%',
  overflow: 'hidden',
  overflowWrap: 'anywhere',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 2,
};

const dataQualityNoteDetailStyle: React.CSSProperties = {
  color: reportsPalette.secondaryText,
  fontSize: 12,
  lineHeight: 1.4,
};

const reportingReadinessChecklistStyle: React.CSSProperties = {
  display: 'grid',
  gap: 10,
  marginTop: 14,
};

const reportingReadinessChecklistTitleStyle: React.CSSProperties = {
  margin: '4px 0 0',
  fontSize: 16,
};

const reportingReadinessRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'auto 1fr',
  gap: 10,
  alignItems: 'start',
};

const reportingReadinessEvidenceStyle: React.CSSProperties = {
  marginTop: 3,
  color: reportsPalette.infoText,
  lineHeight: 1.45,
};

const reportingReadinessActionStyle: React.CSSProperties = {
  marginTop: 3,
  color: reportsPalette.warningText,
  fontWeight: 700,
};

const dataQualityExplanationStyle: React.CSSProperties = {
  marginTop: 14,
  padding: 12,
  borderRadius: 10,
  border: `1px solid ${reportsPalette.border}`,
  background: reportsPalette.white,
  color: reportsPalette.infoText,
  lineHeight: 1.55,
};

const cardStyle: React.CSSProperties = {
  borderRadius: 12,
  padding: 20,
  background: reportsPalette.white,
  border: `1px solid ${reportsPalette.border}`,
  boxShadow: 'none',
};

const cardSubtitleStyle: React.CSSProperties = {
  marginTop: 4,
  color: reportsPalette.infoText,
  fontSize: 13,
  fontWeight: 800,
  lineHeight: 1.3,
};

const scopeCardGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
  gap: 16,
};

const scopeUnclassifiedWarningStyle: React.CSSProperties = {
  marginTop: 12,
  padding: 12,
  borderRadius: 8,
  border: `1px solid ${reportsPalette.warningBorder}`,
  background: reportsPalette.warningBackground,
  color: reportsPalette.warningText,
  fontSize: 13,
  fontWeight: 700,
};

const sectionDescriptionStyle: React.CSSProperties = {
  margin: '0 0 12px',
  color: reportsPalette.infoText,
  lineHeight: 1.6,
};

const thresholdDisclaimerStyle: React.CSSProperties = {
  margin: '0 0 12px',
  color: reportsPalette.infoText,
  fontSize: 13,
  fontWeight: 700,
};

const creditDisclaimerReportStyle: React.CSSProperties = {
  marginTop: 12,
  padding: 12,
  borderRadius: 12,
  background: reportsPalette.warningBackground,
  border: `1px solid ${reportsPalette.warningBorder}`,
  color: reportsPalette.warningText,
  lineHeight: 1.6,
  fontWeight: 700,
};

const regulatoryReferenceContentStyle: React.CSSProperties = {
  display: 'grid',
  gap: 12,
};

const regulatoryReferenceIntroStyle: React.CSSProperties = {
  margin: '0 0 6px',
  color: reportsPalette.infoText,
  fontSize: 13,
  fontWeight: 800,
};

const regulatoryReferenceListStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: 20,
  color: reportsPalette.infoText,
  lineHeight: 1.7,
};

const siteFacilityTableWrapStyle: React.CSSProperties = {
  overflowX: 'auto',
};

const siteFacilityTableStyle: React.CSSProperties = {
  width: '100%',
  minWidth: 920,
  borderCollapse: 'collapse',
  fontSize: 13,
};

const thresholdReferenceTableStyle: React.CSSProperties = {
  ...siteFacilityTableStyle,
  minWidth: 820,
};

const siteFacilityThStyle: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'left',
  borderBottom: `1px solid ${reportsPalette.border}`,
  color: reportsPalette.infoText,
  background: reportsPalette.subtleBackground,
  fontWeight: 800,
};

const siteFacilityTdStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderBottom: `1px solid ${reportsPalette.subtleBorder}`,
  color: reportsPalette.primaryText,
  verticalAlign: 'top',
};

const siteFacilityTotalTdStyle: React.CSSProperties = {
  ...siteFacilityTdStyle,
  fontWeight: 800,
};

const emptySiteFacilityStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 10,
  border: `1px solid ${reportsPalette.border}`,
  background: reportsPalette.subtleBackground,
  color: reportsPalette.infoText,
};

const scopeHelpStyle: React.CSSProperties = {
  marginBottom: 14,
  borderRadius: 12,
  border: `1px solid ${reportsPalette.border}`,
  background: reportsPalette.subtleBackground,
};

const scopeHelpSummaryStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 12px',
  color: reportsPalette.primaryText,
  fontWeight: 800,
  cursor: 'pointer',
};

const scopeHelpIconStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 18,
  height: 18,
  borderRadius: 999,
  background: reportsPalette.successBackground,
  color: reportsPalette.primaryGreen,
  fontSize: 12,
  fontWeight: 900,
};

const scopeHelpGridStyle: React.CSSProperties = {
  display: 'grid',
  gap: 10,
  padding: '0 12px 12px',
};

const scopeHelpItemStyle: React.CSSProperties = {
  padding: 10,
  borderRadius: 10,
  background: reportsPalette.white,
  border: `1px solid ${reportsPalette.border}`,
};

const scopeHelpTextStyle: React.CSSProperties = {
  margin: '6px 0',
  color: reportsPalette.infoText,
  lineHeight: 1.5,
};

const scopeHelpExamplesStyle: React.CSSProperties = {
  color: reportsPalette.secondaryText,
  fontSize: 13,
  fontWeight: 700,
};

const scopeHelpNoteStyle: React.CSSProperties = {
  color: reportsPalette.infoText,
  fontSize: 13,
  lineHeight: 1.5,
};

const exportMenuWrapperStyle: React.CSSProperties = {
  position: 'relative',
  display: 'inline-flex',
};

const exportMenuStyle: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 8px)',
  left: 0,
  zIndex: 30,
  width: 260,
  padding: 6,
  borderRadius: 12,
  border: `1px solid ${reportsPalette.border}`,
  background: reportsPalette.white,
  boxShadow: '0 20px 42px rgba(15, 23, 42, 0.12)',
};

const exportButtonContentStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
};

const exportButtonChevronStyle: React.CSSProperties = {
  fontSize: 12,
  lineHeight: 1,
};

function exportMenuItemStyle(disabled = false): React.CSSProperties {
  return {
    width: '100%',
    padding: '10px 12px',
    border: 0,
    borderRadius: 8,
    background: 'transparent',
    color: disabled ? reportsPalette.mutedText : reportsPalette.primaryText,
    cursor: disabled ? 'not-allowed' : 'pointer',
    textAlign: 'left',
    fontWeight: 700,
  };
}

function primaryButtonStyle(disabled = false): React.CSSProperties {
  return {
    padding: '10px 16px',
    borderRadius: 8,
    border: 'none',
    background: disabled ? reportsPalette.disabledBackground : reportsPalette.primaryGreen,
    color: disabled ? reportsPalette.mutedText : reportsPalette.white,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 700,
  };
}

function secondaryButtonStyle(disabled = false): React.CSSProperties {
  return {
    padding: '10px 16px',
    borderRadius: 8,
    border: `1px solid ${reportsPalette.border}`,
    background: reportsPalette.white,
    color: disabled ? reportsPalette.mutedText : reportsPalette.primaryText,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 700,
  };
}

const reportEmptyStateStyle: React.CSSProperties = {
  border: `1px dashed ${reportsPalette.border}`,
  borderRadius: 12,
  padding: 24,
  marginBottom: 20,
  background: reportsPalette.white,
};
