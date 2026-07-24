import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  formatFuelUsageBreakdown,
  formatActivityUsageValue,
  formatActivityTypeLabel,
  formatInvalidActivityRecordNote,
  type ActivityUsageTotals,
} from '../utils/activityAggregation';
import type { CalculationAuditDetail } from '../services/metrics';
import {
  buildCalculatedFormula,
  buildCalculatedFromLine,
  formatCalculationStatus,
  formatMatchingMethod,
  formatTraceabilitySource,
  formatTraceableFactor,
} from '../utils/calculationTraceability';
import { formatCredibilityLabel } from '../utils/factorCredibility';
import { formatDisplayNumber, formatEmissionsValue } from '../utils/numberFormatting';
import { normalizeUnitForDisplay } from '../utils/unitNormalization';
import {
  formatScopeClassification,
  formatScopeSource,
  resolveScopeClassification,
} from '../utils/scopeClassification';
import { getDateOnlyYear } from '../utils/dateOnly';
import {
  isRecordRequiringCorrection,
  isTrackedMetricDetail,
} from '../utils/reportCredibility';
import { IssueBadge as SharedIssueBadge } from './shared/StatusBadge';

export type MetricsCountSummary = {
  totalRecordsFound: number;
  processedRecords: number;
  skippedRecords: number;
  missingFactorRecords: number;
  skippedReasons?: {
    missingFactor: number;
    outsideDateRange: number;
    outsideScope: number;
    invalidData: number;
  };
};

export type MetricsSummaryTableRow = {
  metricType: string;
  unit: string;
  totalValue: string;
  category: 'input' | 'calculated';
  activityType?: string;
};

export type MissingFactorItem = {
  activityDataId?: string;
  activityType?: string | null;
  unit?: string | null;
  availableUnitsForActivityType?: string[];
};

export type MissingFactorGroup = {
  activityType: string;
  unit: string;
  count: number;
  availableUnitsForActivityType: string[];
  activityDataIds: string[];
};

type CalculationIssueGroup = MissingFactorGroup & {
  issueType: 'missingData' | 'missingFactor' | 'informational' | 'invalidUnit' | 'missingJurisdiction';
  missingField?: 'activityType' | 'unit' | 'quantity' | 'date' | 'jurisdiction';
};

export type HotspotAnalysis = {
  totalCalculatedEmissions: number;
  calculatedRecordCount: number;
  excludedRecordCount: number;
  totalRecordCount: number;
  topCategory: {
    activityType: string;
    displayName: string;
    emissions: number;
    percentageOfTotal: number;
  } | null;
  categoryHotspots: Array<{
    activityType: string;
    displayName: string;
    emissions: number;
    percentageOfTotal: number;
    recordCount: number;
    calculatedRecordCount: number;
    excludedRecordCount: number;
    rank: number;
    hotspotLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    focusMessage: string;
  }>;
  excludedCategories: Array<{
    activityType: string;
    displayName: string;
    excludedRecordCount: number;
    reason: 'MISSING_FACTOR' | 'INVALID_UNIT' | 'TRACKED_ONLY' | 'NEEDS_REVIEW' | 'MISSING_JURISDICTION';
    message: string;
  }>;
  focusRecommendations: Array<{
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    message: string;
    relatedActivityType?: string;
  }>;
};

export type DataReadinessSummary = {
  score: number;
  level: 'Good' | 'Needs Review' | 'Incomplete';
  message: string;
  checks: Array<{
    key: string;
    label: string;
    passed: boolean;
    count?: number;
    total?: number;
    message: string;
  }>;
  totalRecords: number;
  recordsReadyForCalculation: number;
  recordsRequiringReview: number;
  trackedOnlyCount: number;
  missingFactorCount: number;
  invalidUnitCount: number;
  missingJurisdictionCount: number;
};

export type CarbonCreditReadinessAssessment = {
  readinessLevel: 'NOT_READY' | 'NEEDS_MORE_DATA' | 'READY_FOR_PROFESSIONAL_REVIEW';
  score: number;
  summary: string;
  reductionAmount: number | null;
  reductionPercentage: number | null;
  checklist: Array<{
    key: string;
    label: string;
    status: 'PASS' | 'WARNING' | 'MISSING' | 'NOT_ASSESSED';
    message: string;
  }>;
  nextSteps: string[];
  disclaimer: string;
};

export const CARBON_CREDIT_READINESS_DISCLAIMER =
  'CarbonLite does not determine carbon credit eligibility, certify reductions, or replace professional advice. This readiness check is intended to help identify whether a reduction activity may need further assessment under an applicable program, protocol, or verification process.';

export function groupMissingFactors(
  missingFactors: MissingFactorItem[] = [],
): MissingFactorGroup[] {
  const groups = new Map<string, MissingFactorGroup>();

  missingFactors.forEach((item) => {
    const activityType = String(item.activityType || 'UNKNOWN').toUpperCase();
    const normalizedUnit = normalizeUnitForDisplay(item.unit);
    const unit = normalizedUnit.value;
    const key = `${normalizedUnit.status}:${activityType}:${unit.toLowerCase()}`;
    const existing = groups.get(key) ?? {
      activityType,
      unit,
      count: 0,
      availableUnitsForActivityType: [],
      activityDataIds: [],
    };

    existing.count += 1;
    if (item.activityDataId && !existing.activityDataIds.includes(item.activityDataId)) {
      existing.activityDataIds.push(item.activityDataId);
    }
    item.availableUnitsForActivityType?.forEach((unit) => {
      const normalizedAvailableUnit = normalizeUnitForDisplay(unit);
      const nextUnit =
        normalizedAvailableUnit.status === 'valid' ? normalizedAvailableUnit.value : unit;

      if (!existing.availableUnitsForActivityType.includes(nextUnit)) {
        existing.availableUnitsForActivityType.push(nextUnit);
      }
    });
    groups.set(key, existing);
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      availableUnitsForActivityType: group.availableUnitsForActivityType.sort((a, b) =>
        a.localeCompare(b),
      ),
    }))
    .sort((a, b) =>
      `${a.activityType}:${a.unit}`.localeCompare(`${b.activityType}:${b.unit}`),
    );
}

export function buildMetricsSummaryTableRows(input: {
  usageTotals: ActivityUsageTotals;
  totalEstimatedEmissionsKgCO2e: number;
  recordsIncluded: number;
}): MetricsSummaryTableRow[] {
  const { usageTotals, totalEstimatedEmissionsKgCO2e, recordsIncluded } = input;

  if (recordsIncluded <= 0) return [];

  const rows: MetricsSummaryTableRow[] = [];

  usageTotals.fuelUsageBreakdown.forEach((item) => {
    rows.push({
      metricType: `Fuel Usage — ${formatActivityTypeLabel(item.activityType)}`,
      unit: item.unit,
      totalValue: formatDisplayNumber(item.total),
      category: 'input',
      activityType: item.activityType,
    });
  });

  if (Number(usageTotals.electricity) > 0) {
    rows.push({
      metricType: 'Electricity',
      unit: usageTotals.electricityUnitLabel,
      totalValue: formatDisplayNumber(usageTotals.electricity),
      category: 'input',
      activityType: 'ELECTRICITY',
    });
  }

  rows.push({
    metricType: 'Carbon Emissions',
    unit: 'kgCO2e',
    totalValue: formatEmissionsValue(totalEstimatedEmissionsKgCO2e),
    category: 'calculated',
  });

  return rows;
}

export function MetricsSummarySection({
  usageTotals,
  totalEstimatedEmissionsKgCO2e,
  countSummary,
  missingFactors = [],
  calculationDetails = [],
  emptyMessage = 'No activity records yet. Upload documents or add activity data to calculate metrics.',
  isLoading = false,
}: {
  usageTotals: ActivityUsageTotals;
  totalEstimatedEmissionsKgCO2e: number;
  countSummary: MetricsCountSummary;
  missingFactors?: MissingFactorItem[];
  calculationDetails?: CalculationAuditDetail[];
  emptyMessage?: string;
  isLoading?: boolean;
}) {
  const navigate = useNavigate();
  const [selectedCalculationDetail, setSelectedCalculationDetail] =
    useState<CalculationAuditDetail | null>(null);
  const totalsByMetric = buildMetricsSummaryTableRows({
    usageTotals,
    totalEstimatedEmissionsKgCO2e,
    recordsIncluded: countSummary.processedRecords,
  });
  const inputMetricRows = totalsByMetric.filter((item) => item.category === 'input');
  const calculatedMetricRows = totalsByMetric.filter(
    (item) => item.category === 'calculated',
  );
  const firstCalculatedDetail = calculationDetails.find(
    (detail) => detail.status === 'CALCULATED',
  );
  const calculatedDetailsCount = calculationDetails.filter(
    (detail) => detail.status === 'CALCULATED',
  ).length;
  const calculatedFromLine =
    calculatedDetailsCount > 1
      ? `Calculated from ${calculatedDetailsCount} activity records`
      : buildCalculatedFromLine(firstCalculatedDetail);
  const co2TraceText =
    calculatedDetailsCount > 1
      ? calculatedFromLine
      : calculatedFromLine
      ? `Calculated from: ${calculatedFromLine}`
      : undefined;
  const calculationIssueGroups =
    calculationDetails.length > 0
      ? groupCalculationIssuesFromDetails(calculationDetails)
      : groupMissingFactors(missingFactors).map(classifyCalculationIssue);
  const informationalIssueGroups = calculationIssueGroups.filter(
    (group) => group.issueType === 'informational',
  );
  const skippedReasons = countSummary.skippedReasons ?? {
    missingFactor: countSummary.missingFactorRecords,
    outsideDateRange: 0,
    outsideScope: 0,
    invalidData: Math.max(
      0,
      countSummary.skippedRecords - countSummary.missingFactorRecords,
    ),
  };
  const hotspotAnalysis = buildHotspotAnalysis(calculationDetails);
  const scopeSummary = buildScopeSummary(calculationDetails);
  const dataReadiness = buildDataReadinessSummary(calculationDetails);
  const carbonCreditReadiness = buildCarbonCreditReadinessAssessment(
    calculationDetails,
    dataReadiness,
  );
  const electricityReviewCount = calculationDetails.filter(
    (detail) => detail.activityType === 'ELECTRICITY' && detail.status !== 'CALCULATED',
  ).length;

  function handleCreateFactor(group: MissingFactorGroup) {
    navigate('/conversion-factors', {
      state: {
        prefillFactor: {
          activityType: group.activityType,
          unit: group.unit,
          resultUnit: 'kgCO2e',
          type: 'EMISSION',
        },
      },
    });
  }

  function handleFixRecord(group: MissingFactorGroup) {
    const recordId = group.activityDataIds[0];

    navigate(recordId ? `/activity-records?recordId=${encodeURIComponent(recordId)}` : '/activity-records');
  }

  return (
    <>
      <div style={gridStyle}>
        <MetricCard
          title="Fuel Usage"
          value={
            appendReviewNote(
              formatFuelUsageBreakdown(usageTotals.fuelUsageBreakdown),
              usageTotals.invalidFuelRecordCount,
            )
          }
          icon="⛽"
          color="#f59e0b"
          loading={isLoading}
        />

        <MetricCard
          title="Electricity"
          value={appendReviewNote(
            formatActivityUsageValue(
              usageTotals.electricity,
              usageTotals.electricityUnitLabel,
            ),
            electricityReviewCount || usageTotals.invalidElectricityRecordCount,
          )}
          icon="⚡"
          color="#3b82f6"
          loading={isLoading}
        />

        <MetricCard
          title="CO₂ Emissions"
          value={`${formatEmissionsValue(totalEstimatedEmissionsKgCO2e)} kg CO2e`}
          icon="🌱"
          color="#10b981"
          highlight
          loading={isLoading}
          traceText={co2TraceText}
          traceActionLabel={calculatedDetailsCount > 1 ? 'View calculation details' : undefined}
          onTraceAction={() => {
            document
              .getElementById('metrics-calculation-details')
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        />

        <MetricCard
          title="Records Included in Summary"
          value={String(countSummary.processedRecords)}
          icon="📄"
          color="#64748b"
          loading={isLoading}
        />
      </div>

      <DataReadinessCard summary={dataReadiness} />

      <ScopeSummaryCard summary={scopeSummary} />

      <HotspotAnalysisSection
        analysis={hotspotAnalysis}
        totalRecordsFound={countSummary.totalRecordsFound}
      />

      <CarbonCreditReadinessPanel assessment={carbonCreditReadiness} />

      <div style={reconciliationStyle}>
        <div style={reconciliationHeaderStyle}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Record Reconciliation</h2>
          <span
            title="Records included in summary are records successfully used in emissions calculations."
            style={helpBadgeStyle}
          >
            ?
          </span>
        </div>
        <div style={reconciliationGridStyle}>
          <div>
            <strong>{countSummary.totalRecordsFound}</strong> total activity records found
          </div>
          <div>
            <strong>{countSummary.processedRecords}</strong> records included in summary
          </div>
          <div>
            <strong>{countSummary.skippedRecords}</strong> records skipped
          </div>
        </div>
        {countSummary.skippedRecords > 0 ? (
          <div style={reasonListStyle}>
            <div style={{ fontWeight: 800, color: '#334155' }}>Reasons:</div>
            {buildSkippedReasonRows(skippedReasons).map((reason) => (
              <div key={reason.label} style={reasonRowStyle}>
                <span>{reason.label}</span>
                <strong>{reason.count}</strong>
              </div>
            ))}
          </div>
        ) : (
          <div style={allIncludedStyle}>All records included</div>
        )}
      </div>

      {countSummary.processedRecords > 0 && countSummary.skippedRecords > 0 ? (
        <div style={partialCalculationWarningStyle}>
          Some records require review and were not included in emissions totals.
        </div>
      ) : null}

      {calculationIssueGroups.length > 0 ? (
        <div style={warningStyle}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>
            Calculation Issues
          </div>
          <div style={{ marginBottom: 10 }}>
            Review the items below to see whether the record needs more data, a conversion factor, or no emissions factor is required.
          </div>
          <div style={missingFactorListStyle}>
            {calculationIssueGroups.map((group) => (
              <div key={`${group.issueType}-${group.activityType}-${group.unit}`} style={missingFactorRowStyle}>
                <div style={missingFactorTextStyle}>
                  <div style={issueHeaderStyle}>
                    <IssueBadge type={group.issueType} />
                    <strong>{getCalculationIssueTitle(group)}</strong>
                    <span>
                      {group.count} {group.count === 1 ? 'record' : 'records'}
                    </span>
                  </div>
                  <div style={missingFactorHintStyle}>
                    {getCalculationIssueDescription(group)}
                  </div>
                  {group.issueType === 'missingFactor' && group.availableUnitsForActivityType.length > 0 ? (
                    <div style={missingFactorHintStyle}>
                      A factor exists for {group.activityType} / {group.availableUnitsForActivityType.join(', ')}.
                      You may create a custom factor for {group.activityType} / {group.unit} or convert {group.unit} to {group.availableUnitsForActivityType[0]} before import.
                      {getUnitMismatchDensityHint(group) ? (
                        <div>{getUnitMismatchDensityHint(group)}</div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                {group.issueType === 'missingFactor' ? (
                  <button
                    type="button"
                    onClick={() => handleCreateFactor(group)}
                    style={createFactorButtonStyle}
                  >
                    Create Factor
                  </button>
                ) : group.issueType === 'missingData' ||
                  group.issueType === 'invalidUnit' ||
                  group.issueType === 'missingJurisdiction' ? (
                  <button
                    type="button"
                    onClick={() => handleFixRecord(group)}
                    style={editRecordButtonStyle}
                  >
                    Fix Record
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : countSummary.skippedRecords > 0 ? (
        <div style={warningStyle}>
          {countSummary.skippedRecords} record(s) were skipped due to filters or validation.
        </div>
      ) : null}

      <div style={tableCardStyle}>
        <div style={{ padding: 16, borderBottom: '1px solid #eee' }}>
          <h2 style={{ margin: 0 }}>Calculation Summary</h2>
          <p style={summaryHelperTextStyle}>
            One activity record can contribute multiple metrics. Input metrics show the activity data used, while calculated results show estimated emissions.
          </p>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Unit</th>
              <th style={thStyle}>Total</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <>
                {[0, 1, 2].map((index) => (
                  <tr key={`metric-skeleton-${index}`}>
                    <td style={tdStyle}><SkeletonLine width="75%" /></td>
                    <td style={tdStyle}><SkeletonLine width="45%" /></td>
                    <td style={tdStyle}><SkeletonLine width="55%" /></td>
                  </tr>
                ))}
              </>
            ) : totalsByMetric.length === 0 ? (
              <tr>
                <td colSpan={3} style={tdStyle}>
                  <CalculationSummaryEmptyState
                    countSummary={countSummary}
                    emptyMessage={emptyMessage}
                    informationalIssueGroups={informationalIssueGroups}
                  />
                </td>
              </tr>
            ) : null}
            {!isLoading && totalsByMetric.length > 0 ? (
              <>
                {inputMetricRows.length > 0 ? (
                  <>
                    <tr>
                      <td colSpan={3} style={metricGroupHeaderStyle}>
                        Input Data
                      </td>
                    </tr>
                    {inputMetricRows.map((item) => (
                      <tr key={`${item.metricType}-${item.unit}-${item.totalValue}`}>
                        <td style={tdStyle}>
                          <MetricRelationshipLabel item={item} />
                        </td>
                        <td style={tdStyle}>{item.unit}</td>
                        <td style={tdStyle}>{item.totalValue}</td>
                      </tr>
                    ))}
                  </>
                ) : null}

                {inputMetricRows.length > 0 && calculatedMetricRows.length > 0 ? (
                  <tr aria-label="Calculation relationship">
                    <td colSpan={3} style={relationshipArrowStyle}>↓</td>
                  </tr>
                ) : null}

                {calculatedMetricRows.length > 0 ? (
                  <>
                    <tr>
                      <td colSpan={3} style={metricGroupHeaderStyle}>
                        Calculated Result
                      </td>
                    </tr>
                    {calculatedMetricRows.map((item) => (
                      <tr
                        key={`${item.metricType}-${item.unit}-${item.totalValue}`}
                        style={calculatedMetricRowStyle}
                      >
                        <td style={calculatedMetricCellStyle}>
                          <span aria-hidden="true" style={leafIconStyle}>🌱</span>
                          {item.metricType}
                        </td>
                        <td style={calculatedMetricCellStyle}>{item.unit}</td>
                        <td style={calculatedMetricTotalStyle}>{item.totalValue}</td>
                      </tr>
                    ))}
                  </>
                ) : null}
              </>
            ) : null}
          </tbody>
        </table>
      </div>

      {calculationDetails.length > 0 ? (
        <details id="metrics-calculation-details" style={sourceDetailsStyle}>
          <summary style={sourceDetailsSummaryStyle}>
            Calculation details and traceability ({calculationDetails.length} records)
          </summary>
          <div style={calculationDetailsTableWrapStyle}>
            <table style={calculationDetailsTableStyle}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={thStyle}>Activity</th>
                  <th style={thStyle}>Quantity</th>
                  <th style={thStyle}>Activity Source</th>
                  <th style={thStyle}>Jurisdiction</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Scope</th>
                  <th style={thStyle}>Factor Used</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {calculationDetails.map((detail) => (
                  <tr key={detail.activityDataId}>
                    <td style={tdStyle}>{formatActivityTypeLabel(detail.activityType)}</td>
                    <td style={tdStyle}>
                      {formatDisplayNumber(detail.activityQuantity)} {detail.activityUnit}
                    </td>
                    <td style={tdStyle}>{formatCalculationSourceReference(detail)}</td>
                    <td style={tdStyle}>{formatDetailJurisdiction(detail)}</td>
                    <td style={tdStyle}>{formatCalculationStatus(detail.status)}</td>
                    <td style={tdStyle}>{formatCalculationScopeLabel(detail)}</td>
                    <td style={tdStyle}>
                      {detail.status === 'CALCULATED' ? formatTraceableFactor(detail) : 'Not calculated'}
                    </td>
                    <td style={tdStyle}>
                      <button
                        type="button"
                        style={calculationDetailsButtonStyle}
                        onClick={() => setSelectedCalculationDetail(detail)}
                        aria-label={`View calculation details for ${formatActivityTypeLabel(detail.activityType)}`}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}

      {selectedCalculationDetail ? (
        <CalculationDetailModal
          detail={selectedCalculationDetail}
          onClose={() => setSelectedCalculationDetail(null)}
        />
      ) : null}
    </>
  );
}

function CalculationDetailModal({
  detail,
  onClose,
}: {
  detail: CalculationAuditDetail;
  onClose: () => void;
}) {
  return (
    <div style={calculationDetailModalBackdropStyle} onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="calculation-detail-modal-title"
        style={calculationDetailModalStyle}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={calculationDetailModalHeaderStyle}>
          <div>
            <h2 id="calculation-detail-modal-title" style={calculationDetailModalTitleStyle}>
              Calculation detail
            </h2>
            <p style={calculationDetailModalSubtitleStyle}>
              {formatActivityTypeLabel(detail.activityType)} ·{' '}
              {formatDisplayNumber(detail.activityQuantity)} {detail.activityUnit}
            </p>
          </div>
          <button
            type="button"
            style={calculationDetailModalCloseStyle}
            onClick={onClose}
            aria-label="Close calculation detail"
          >
            ×
          </button>
        </div>

        <div style={calculationDetailGridStyle}>
          <CalculationDetailField label="Activity" value={formatActivityTypeLabel(detail.activityType)} />
          <CalculationDetailField
            label="Quantity"
            value={`${formatDisplayNumber(detail.activityQuantity)} ${detail.activityUnit}`}
          />
          <CalculationDetailField label="Activity Source" value={formatCalculationSourceReference(detail)} />
          <CalculationDetailField label="Jurisdiction" value={formatDetailJurisdiction(detail)} />
          <CalculationDetailField label="Status" value={formatCalculationStatus(detail.status)} />
          <CalculationDetailField label="Scope" value={formatCalculationScopeLabel(detail)} />
          <CalculationDetailField
            label="Factor Used"
            value={detail.status === 'CALCULATED' ? formatTraceableFactor(detail) : 'Not calculated'}
          />
          <CalculationDetailField label="Factor Source" value={formatTraceabilitySource(detail)} />
          <CalculationDetailField label="Factor Version" value={detail.factorVersion || detail.factorVersionId || 'Not specified'} />
          <CalculationDetailField label="Verification" value={formatCredibilityLabel(detail.factorVerificationStatus) || 'Not specified'} />
          <CalculationDetailField label="Confidence" value={formatCredibilityLabel(detail.factorConfidenceLevel) || 'Not specified'} />
          <CalculationDetailField label="Assumptions" value={detail.factorAssumptions || 'None documented'} fullWidth />
          <CalculationDetailField
            label="Formula"
            value={buildCalculatedFormula(detail)}
            fullWidth
          />
          <CalculationDetailField
            label="Matching Explanation"
            value={formatMatchingMethod(detail)}
            fullWidth
          />
        </div>
      </section>
    </div>
  );
}

function CalculationDetailField({
  label,
  value,
  fullWidth = false,
}: {
  label: string;
  value: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div style={fullWidth ? calculationDetailFieldFullStyle : calculationDetailFieldStyle}>
      <span style={calculationDetailLabelStyle}>{label}</span>
      <span style={calculationDetailValueStyle}>{value}</span>
    </div>
  );
}

function formatCalculationScopeLabel(detail: CalculationAuditDetail) {
  if (detail.status !== 'CALCULATED') return 'Not calculated';

  const resolution = resolveScopeClassification({
    activityType: detail.activityType,
    scopeOverride: detail.scopeOverride,
    factorDefaultScope: detail.factorDefaultScope,
    factorScope: detail.factorScope,
  });

  return `${formatScopeClassification(resolution.scope)} (${formatScopeSource(resolution.source)})`;
}

function sanitizeIssueValue(value: unknown, fallback = 'Unknown') {
  const normalized = String(value ?? '').trim();

  if (!normalized || ['null', 'undefined', 'nan'].includes(normalized.toLowerCase())) {
    return fallback;
  }

  return normalized;
}

function appendReviewNote(value: string, invalidCount = 0) {
  const note = formatInvalidActivityRecordNote(invalidCount);

  return note ? `${value}\n${note}` : value;
}

export function buildHotspotAnalysis(calculationDetails: CalculationAuditDetail[]): HotspotAnalysis {
  const totals = new Map<string, {
    activityType: string;
    displayName: string;
    emissions: number;
    recordCount: number;
    calculatedRecordCount: number;
    excludedRecordCount: number;
  }>();

  calculationDetails.forEach((detail) => {
    const emissions = Number(detail.calculatedEmissionsKgCO2e ?? detail.calculatedEmission ?? 0);
    const activityType = detail.activityType || 'Unknown';
    const existing = totals.get(activityType) ?? {
      activityType,
      displayName: formatActivityTypeLabel(activityType),
      emissions: 0,
      recordCount: 0,
      calculatedRecordCount: 0,
      excludedRecordCount: 0,
    };

    existing.recordCount += 1;
    if (detail.status === 'CALCULATED' && Number.isFinite(emissions) && emissions > 0) {
      existing.emissions += emissions;
      existing.calculatedRecordCount += 1;
    } else if (detail.status !== 'CALCULATED') {
      existing.excludedRecordCount += 1;
    }
    totals.set(activityType, existing);
  });

  const totalEmissions = Array.from(totals.values()).reduce(
    (sum, row) => sum + row.emissions,
    0,
  );
  const categoryHotspots = Array.from(totals.values())
    .filter((row) => row.calculatedRecordCount > 0 && row.emissions > 0)
    .sort((a, b) => b.emissions - a.emissions)
    .map((row, index) => {
      const percentageOfTotal = totalEmissions > 0 ? (row.emissions / totalEmissions) * 100 : 0;
      return {
        ...row,
        emissions: roundDisplay(row.emissions),
        percentageOfTotal: roundDisplay(percentageOfTotal),
        rank: index + 1,
        hotspotLevel: getHotspotLevel(percentageOfTotal),
        focusMessage: buildHotspotFocusMessage(row.displayName, percentageOfTotal),
      };
    });
  const excludedCategories = buildExcludedHotspotCategories(calculationDetails);
  const topCategory = categoryHotspots[0]
    ? {
        activityType: categoryHotspots[0].activityType,
        displayName: categoryHotspots[0].displayName,
        emissions: categoryHotspots[0].emissions,
        percentageOfTotal: categoryHotspots[0].percentageOfTotal,
      }
    : null;

  return {
    totalCalculatedEmissions: roundDisplay(totalEmissions),
    calculatedRecordCount: calculationDetails.filter((detail) => detail.status === 'CALCULATED').length,
    excludedRecordCount: calculationDetails.filter((detail) => detail.status !== 'CALCULATED').length,
    totalRecordCount: calculationDetails.length,
    topCategory,
    categoryHotspots,
    excludedCategories,
    focusRecommendations: buildHotspotRecommendations({
      categoryHotspots,
      excludedCategories,
      excludedRecordCount: calculationDetails.filter((detail) => detail.status !== 'CALCULATED').length,
      totalCalculatedEmissions: totalEmissions,
    }),
  };
}

function buildExcludedHotspotCategories(calculationDetails: CalculationAuditDetail[]) {
  const excluded = new Map<string, HotspotAnalysis['excludedCategories'][number]>();

  calculationDetails
    .filter((detail) => detail.status !== 'CALCULATED')
    .forEach((detail) => {
      const reason = mapHotspotExcludedReason(detail);
      const activityType = detail.activityType || 'Unknown';
      const key = `${activityType}:${reason}`;
      const existing = excluded.get(key) ?? {
        activityType,
        displayName: formatActivityTypeLabel(activityType),
        excludedRecordCount: 0,
        reason,
        message: buildExcludedHotspotMessage(reason, activityType),
      };

      existing.excludedRecordCount += 1;
      excluded.set(key, existing);
    });

  return Array.from(excluded.values()).sort((a, b) =>
    `${a.reason}:${a.displayName}`.localeCompare(`${b.reason}:${b.displayName}`),
  );
}

function getHotspotLevel(percentage: number): HotspotAnalysis['categoryHotspots'][number]['hotspotLevel'] {
  if (percentage >= 40) return 'HIGH';
  if (percentage >= 15) return 'MEDIUM';
  return 'LOW';
}

function buildHotspotFocusMessage(displayName: string, percentage: number) {
  if (percentage >= 40) {
    return `${displayName} contributes ${formatDisplayNumber(percentage)}% of calculated emissions. Review this hotspot first for reduction opportunities or data quality checks.`;
  }
  if (percentage >= 15) {
    return `${displayName} is a material contributor to calculated emissions and should be included in early review.`;
  }
  return `${displayName} is a lower-share calculated emissions category. Keep it visible, but prioritize larger hotspots first.`;
}

function buildHotspotRecommendations(input: {
  categoryHotspots: HotspotAnalysis['categoryHotspots'];
  excludedCategories: HotspotAnalysis['excludedCategories'];
  excludedRecordCount: number;
  totalCalculatedEmissions: number;
}): HotspotAnalysis['focusRecommendations'] {
  const recommendations: HotspotAnalysis['focusRecommendations'] = [];
  const top = input.categoryHotspots[0];
  const second = input.categoryHotspots[1];

  if (!top || input.totalCalculatedEmissions <= 0) {
    recommendations.push({
      priority: 'HIGH',
      title: 'No calculated emissions available yet',
      message: 'Hotspot analysis will be available once activity records can be calculated with valid units and matching conversion factors.',
    });
  } else if (top.percentageOfTotal >= 40) {
    recommendations.push({
      priority: 'HIGH',
      title: `Focus first on ${top.displayName}`,
      message: `${top.displayName} contributes ${formatDisplayNumber(top.percentageOfTotal)}% of calculated emissions. This is the largest hotspot and should be reviewed first for reduction opportunities or data quality checks.`,
      relatedActivityType: top.activityType,
    });
  }

  if (top && second && top.percentageOfTotal + second.percentageOfTotal >= 70) {
    recommendations.push({
      priority: 'MEDIUM',
      title: 'Most emissions are concentrated in a few categories',
      message: `The top two categories contribute ${formatDisplayNumber(top.percentageOfTotal + second.percentageOfTotal)}% of calculated emissions. Focusing on these areas may provide the most useful first step.`,
    });
  }

  if (input.excludedRecordCount > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      title: 'Improve data quality before making decisions',
      message: `${input.excludedRecordCount} records were excluded from emissions totals due to missing factors, invalid units, tracked-only metrics, or records requiring review.`,
    });
  }

  if (input.excludedCategories.some((item) => item.reason === 'TRACKED_ONLY')) {
    recommendations.push({
      priority: 'LOW',
      title: 'Water is tracked separately',
      message: 'Water usage is currently tracked as an operational metric and is not included in emissions totals unless a reviewed water emissions factor is enabled.',
      relatedActivityType: 'WATER',
    });
  }

  if (input.excludedCategories.some((item) => item.reason === 'MISSING_FACTOR')) {
    recommendations.push({
      priority: 'MEDIUM',
      title: 'Some categories need conversion factors',
      message: 'Some records could not be calculated because no matching conversion factor was available.',
    });
  }

  return recommendations.slice(0, 4);
}

function mapHotspotExcludedReason(
  detail: CalculationAuditDetail,
): HotspotAnalysis['excludedCategories'][number]['reason'] {
  const status = detail.explanationStatus || detail.status;
  if (status.includes('MISSING_FACTOR') || detail.status === 'MISSING_FACTOR') return 'MISSING_FACTOR';
  if (status.includes('INVALID_UNIT') || detail.status === 'INVALID_UNIT') return 'INVALID_UNIT';
  if (status.includes('TRACKED_ONLY') || detail.status === 'TRACKED_ONLY') return 'TRACKED_ONLY';
  if (status.includes('MISSING_JURISDICTION') || detail.status === 'MISSING_JURISDICTION') return 'MISSING_JURISDICTION';
  return 'NEEDS_REVIEW';
}

function buildExcludedHotspotMessage(
  reason: HotspotAnalysis['excludedCategories'][number]['reason'],
  activityType: string,
) {
  const displayName = formatActivityTypeLabel(activityType);
  if (reason === 'MISSING_FACTOR') {
    return `${displayName} records were excluded because no matching conversion factor was available.`;
  }
  if (reason === 'INVALID_UNIT') {
    return `${displayName} records were excluded because the unit could not be normalized or matched.`;
  }
  if (reason === 'TRACKED_ONLY') {
    return `${displayName} is tracked as an operational metric and excluded from emissions totals by default.`;
  }
  if (reason === 'MISSING_JURISDICTION') {
    return `${displayName} records were excluded because jurisdiction is required for factor matching.`;
  }
  return `${displayName} records require review before emissions can be calculated.`;
}

function roundDisplay(value: number) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function buildDataReadinessSummary(calculationDetails: CalculationAuditDetail[]): DataReadinessSummary {
  const totalRecords = calculationDetails.length;
  const recordsReadyForCalculation = calculationDetails.filter((detail) => detail.status === 'CALCULATED').length;
  const trackedOnlyCount = calculationDetails.filter(isTrackedMetricDetail).length;
  const recordsRequiringReview = calculationDetails.filter(isRecordRequiringCorrection).length;
  const missingFactorCount = calculationDetails.filter((detail) => detail.status === 'MISSING_FACTOR').length;
  const invalidUnitCount = calculationDetails.filter((detail) => detail.status === 'INVALID_UNIT').length;
  const missingJurisdictionCount = calculationDetails.filter((detail) => detail.status === 'MISSING_JURISDICTION').length;
  const electricityMissingProvinceCount = calculationDetails.filter(
    (detail) => detail.activityType === 'ELECTRICITY' && !detail.jurisdictionRegion,
  ).length;
  const requiredCompleteCount = calculationDetails.filter((detail) => {
    const quantity = Number(detail.activityQuantity);
    return Boolean(
      detail.activityType &&
        detail.activityUnit &&
        detail.recordDate &&
        Number.isFinite(quantity) &&
        quantity > 0 &&
        detail.status !== 'INVALID_UNIT',
    );
  }).length;
  const jurisdictionCompleteCount = calculationDetails.filter((detail) => {
    if (detail.activityType === 'ELECTRICITY') {
      return Boolean(detail.jurisdictionRegion);
    }

    return Boolean(detail.jurisdictionCountry || detail.jurisdiction);
  }).length;
  const sourceReferenceCount = calculationDetails.filter((detail) =>
    Boolean(detail.sourceReference || detail.sourceFileName || detail.sourceDocumentId),
  ).length;
  const costDataCount = calculationDetails.filter((detail) =>
    /(\bcost\b|\$|\bcad\b|\busd\b)/i.test(`${detail.notes ?? ''} ${detail.sourceTextSnippet ?? ''}`),
  ).length;
  const requiredFieldsScore = percentage(requiredCompleteCount, totalRecords);
  const factorCoverageScore = percentage(recordsReadyForCalculation, totalRecords);
  const jurisdictionScore = percentage(jurisdictionCompleteCount, totalRecords);
  const sourceCoverageScore = percentage(sourceReferenceCount, totalRecords);
  const costCoverageScore = percentage(costDataCount, totalRecords);
  const score = roundDisplay(
    requiredFieldsScore * 0.4 +
      factorCoverageScore * 0.3 +
      jurisdictionScore * 0.15 +
      sourceCoverageScore * 0.1 +
      costCoverageScore * 0.05,
  );
  const calculatedCoverage = totalRecords > 0 ? recordsReadyForCalculation / totalRecords : 0;
  const hasCriticalIssues =
    missingFactorCount > 0 || invalidUnitCount > 0 || missingJurisdictionCount > 0;
  const level: DataReadinessSummary['level'] =
    totalRecords <= 0 || calculatedCoverage < 0.5
      ? 'Incomplete'
      : score >= 80 && !hasCriticalIssues && calculatedCoverage >= 0.8
      ? 'Good'
      : 'Needs Review';

  return {
    score,
    level,
    message: getDataReadinessMessage(level, score, totalRecords),
    totalRecords,
    recordsReadyForCalculation,
    recordsRequiringReview,
    trackedOnlyCount,
    missingFactorCount,
    invalidUnitCount,
    missingJurisdictionCount,
    checks: [
      {
        key: 'required-fields',
        label: 'Required fields completeness',
        passed: requiredFieldsScore >= 90,
        count: requiredCompleteCount,
        total: totalRecords,
        message: 'Activity type, quantity, unit, and date are needed before emissions can be calculated.',
      },
      {
        key: 'factor-coverage',
        label: 'Factor match coverage',
        passed: factorCoverageScore >= 80,
        count: recordsReadyForCalculation,
        total: totalRecords,
        message: 'Records need matching conversion factors to be included in emissions totals.',
      },
      {
        key: 'jurisdiction',
        label: 'Jurisdiction completeness',
        passed: electricityMissingProvinceCount === 0 && jurisdictionScore >= 90,
        count: jurisdictionCompleteCount,
        total: totalRecords,
        message:
          electricityMissingProvinceCount > 0
            ? `${electricityMissingProvinceCount} electricity ${electricityMissingProvinceCount === 1 ? 'record is' : 'records are'} missing province. Province is required because electricity factors vary by province.`
            : 'Province is required for electricity because electricity factors vary by province.',
      },
      {
        key: 'source-traceability',
        label: 'Source traceability',
        passed: sourceCoverageScore >= 80,
        count: sourceReferenceCount,
        total: totalRecords,
        message: 'Source references help trace emissions results back to bills, invoices, spreadsheets, or manual notes.',
      },
      {
        key: 'cost-data',
        label: 'Cost data completeness',
        passed: costCoverageScore >= 50,
        count: costDataCount,
        total: totalRecords,
        message: 'Cost is optional, but useful for later financial impact and prioritization analysis.',
      },
    ],
  };
}

function percentage(count: number, total: number) {
  if (total <= 0) return 0;
  return roundDisplay((count / total) * 100);
}

function getDataReadinessMessage(level: DataReadinessSummary['level'], score: number, totalRecords: number) {
  if (totalRecords <= 0) {
    return 'Add activity records to calculate a data readiness score.';
  }
  if (level === 'Good') {
    return `Data readiness is ${formatDisplayNumber(score)}%. Most records are ready for calculation and traceability review.`;
  }
  if (level === 'Needs Review') {
    return `Data readiness is ${formatDisplayNumber(score)}%. Some records need missing fields, factors, jurisdiction, or source references before final reporting.`;
  }
  return 'Data readiness is incomplete. Add required fields, source references, and matching factors before relying on emissions results.';
}

export function assessCarbonCreditReadiness(input: {
  baselineEmissions?: number | null;
  currentEmissions?: number | null;
  reductionAmount?: number | null;
  reductionPercentage?: number | null;
  jurisdictionCountry?: string | null;
  jurisdictionRegion?: string | null;
  dataQualityScore: number;
  hasBaselineData: boolean;
  hasMonitoringData: boolean;
  hasSourceEvidence: boolean;
  hasTraceableFactors: boolean;
  hasConsistentMethodology: boolean;
  recordsRequiringReviewCount: number;
  protocolKnown: boolean;
  projectBoundaryDefined: boolean;
}): CarbonCreditReadinessAssessment {
  const reductionDetected =
    input.hasBaselineData &&
    input.hasMonitoringData &&
    Number(input.reductionAmount ?? 0) > 0 &&
    Number(input.reductionPercentage ?? 0) > 0;
  const jurisdictionKnown = Boolean(input.jurisdictionCountry || input.jurisdictionRegion);
  const reviewThresholdPassed = input.recordsRequiringReviewCount <= 2;
  const hasReviewBlockers = input.recordsRequiringReviewCount > 0;
  let score = 0;

  if (input.hasBaselineData) score += 20;
  if (input.hasMonitoringData) score += 20;
  if (reductionDetected) score += 15;
  if (input.hasSourceEvidence) score += 15;
  if (input.hasTraceableFactors && input.hasConsistentMethodology) score += 15;
  if (jurisdictionKnown) score += 10;
  if (reviewThresholdPassed) score += 5;
  if (!input.protocolKnown) score = Math.min(score, 69);
  if (hasReviewBlockers) score = Math.min(score, 69);
  if (!input.hasBaselineData || !input.hasMonitoringData) score = Math.min(score, 39);

  const readinessLevel: CarbonCreditReadinessAssessment['readinessLevel'] =
    score >= 70 && input.protocolKnown && !hasReviewBlockers
      ? 'READY_FOR_PROFESSIONAL_REVIEW'
      : score >= 40
      ? 'NEEDS_MORE_DATA'
      : 'NOT_READY';

  return {
    readinessLevel,
    score,
    reductionAmount: reductionDetected ? roundDisplay(Number(input.reductionAmount)) : null,
    reductionPercentage: reductionDetected ? roundDisplay(Number(input.reductionPercentage)) : null,
    summary: getCarbonCreditReadinessSummary(readinessLevel, {
      hasBaselineData: input.hasBaselineData,
      reductionDetected,
    }),
    checklist: [
      {
        key: 'baseline-data',
        label: 'Baseline data available',
        status: input.hasBaselineData && Number(input.baselineEmissions ?? 0) > 0 ? 'PASS' : 'MISSING',
        message:
          'A carbon credit assessment usually requires an explicitly selected baseline period with calculated emissions.',
      },
      {
        key: 'monitoring-data',
        label: 'Current monitoring data available',
        status: input.hasMonitoringData && Number(input.currentEmissions ?? 0) > 0 ? 'PASS' : 'MISSING',
        message:
          'Current period emissions should be explicitly selected and supported by consistent activity records and calculation methodology.',
      },
      {
        key: 'reduction-evidence',
        label: 'Emissions reduction detected',
        status: !input.hasBaselineData || !input.hasMonitoringData ? 'NOT_ASSESSED' : reductionDetected ? 'PASS' : 'WARNING',
        message: reductionDetected
          ? 'A reduction was detected between available baseline and current periods.'
          : input.hasBaselineData && input.hasMonitoringData
          ? 'No reduction was detected in the available periods.'
          : 'Baseline and current reporting periods are not clearly defined, so reduction evidence cannot be assessed.',
      },
      {
        key: 'source-evidence',
        label: 'Source documents available',
        status: input.hasSourceEvidence ? 'PASS' : 'WARNING',
        message:
          'Invoices, bills, meter records, or operational documents help support traceability.',
      },
      {
        key: 'factor-traceability',
        label: 'Conversion factors are traceable',
        status: input.hasTraceableFactors ? 'PASS' : 'WARNING',
        message:
          'Factor source, year, jurisdiction, confidence level, and verification status should be visible.',
      },
      {
        key: 'jurisdiction',
        label: 'Jurisdiction identified',
        status: jurisdictionKnown && reviewThresholdPassed ? 'PASS' : 'WARNING',
        message:
          hasReviewBlockers
            ? 'Resolve records requiring jurisdiction or factor review before using this in carbon credit readiness discussions.'
            : 'Carbon credit programs and protocols may depend on jurisdiction, project type, and applicable program rules.',
      },
      {
        key: 'protocol',
        label: 'Applicable protocol confirmed',
        status: input.protocolKnown ? 'PASS' : 'NOT_ASSESSED',
        message:
          'A recognized protocol or program rule may be required. CarbonLite does not determine protocol eligibility.',
      },
      {
        key: 'professional-review',
        label: 'Professional review required',
        status: 'WARNING',
        message:
          'Carbon credit eligibility and verification should be assessed by qualified professionals or relevant program authorities.',
      },
    ],
    nextSteps: buildCarbonCreditNextSteps({
      hasBaselineData: input.hasBaselineData,
      hasSourceEvidence: input.hasSourceEvidence,
      hasTraceableFactors: input.hasTraceableFactors,
      jurisdictionKnown,
      recordsRequiringReviewCount: input.recordsRequiringReviewCount,
      protocolKnown: input.protocolKnown,
      projectBoundaryDefined: input.projectBoundaryDefined,
    }),
    disclaimer: CARBON_CREDIT_READINESS_DISCLAIMER,
  };
}

export function buildCarbonCreditReadinessAssessment(
  calculationDetails: CalculationAuditDetail[],
  dataReadiness: DataReadinessSummary,
): CarbonCreditReadinessAssessment {
  const calculatedDetails = calculationDetails.filter((detail) => detail.status === 'CALCULATED');
  const sourceEvidenceCount = calculatedDetails.filter((detail) =>
    Boolean(detail.sourceReference || detail.sourceFileName || detail.sourceDocumentId),
  ).length;
  const hasSourceEvidence =
    calculatedDetails.length > 0 && sourceEvidenceCount / calculatedDetails.length >= 0.8;
  const hasTraceableFactors =
    calculatedDetails.length > 0 &&
    calculatedDetails.every((detail) =>
      Boolean(
        detail.factorValue &&
          (detail.sourceAuthority || detail.sourceDocument) &&
          detail.factorYear &&
          (detail.factorJurisdictionRegion || detail.factorJurisdictionCountry || detail.jurisdictionRegion) &&
          detail.factorConfidenceLevel &&
          detail.factorVerificationStatus,
      ),
    );
  const hasConsistentMethodology =
    calculatedDetails.length > 0 &&
    calculatedDetails.every((detail) => Boolean(detail.calculationFormula || detail.factorValue));
  const jurisdictionCountry =
    calculatedDetails.find((detail) => detail.jurisdictionCountry)?.jurisdictionCountry ??
    calculationDetails.find((detail) => detail.jurisdictionCountry)?.jurisdictionCountry ??
    null;
  const jurisdictionRegion =
    calculatedDetails.find((detail) => detail.jurisdictionRegion)?.jurisdictionRegion ??
    calculationDetails.find((detail) => detail.jurisdictionRegion)?.jurisdictionRegion ??
    null;

  return assessCarbonCreditReadiness({
    baselineEmissions: null,
    currentEmissions: null,
    reductionAmount: null,
    reductionPercentage: null,
    jurisdictionCountry,
    jurisdictionRegion,
    dataQualityScore: dataReadiness.score,
    hasBaselineData: false,
    hasMonitoringData: false,
    hasSourceEvidence,
    hasTraceableFactors,
    hasConsistentMethodology,
    recordsRequiringReviewCount: dataReadiness.recordsRequiringReview,
    protocolKnown: false,
    projectBoundaryDefined: Boolean(jurisdictionCountry || jurisdictionRegion),
  });
}

function getCarbonCreditReadinessSummary(
  level: CarbonCreditReadinessAssessment['readinessLevel'],
  context: { hasBaselineData: boolean; reductionDetected: boolean },
) {
  if (level === 'READY_FOR_PROFESSIONAL_REVIEW') {
    return 'Data appears organized enough for a professional carbon credit readiness discussion. This does not mean the reduction can generate credits.';
  }

  if (level === 'NEEDS_MORE_DATA') {
    return context.hasBaselineData
      ? 'Some supporting data is available, but additional documentation or methodology review is needed before discussing carbon credit potential.'
      : 'Carbon credit readiness cannot be assessed because baseline and current reporting periods are not clearly defined.';
  }

  return 'Not ready for assessment. Baseline/current periods, source evidence, jurisdiction information, or calculation readiness is missing.';
}

function buildCarbonCreditNextSteps(input: {
  hasBaselineData: boolean;
  hasSourceEvidence: boolean;
  hasTraceableFactors: boolean;
  jurisdictionKnown: boolean;
  recordsRequiringReviewCount: number;
  protocolKnown: boolean;
  projectBoundaryDefined: boolean;
}) {
  const steps: string[] = [];

  if (!input.hasBaselineData) steps.push('Collect baseline data for a clear historical reference period.');
  if (!input.hasSourceEvidence) steps.push('Improve source documentation with bills, invoices, meter records, or source references.');
  if (!input.hasTraceableFactors) steps.push('Review conversion factor source, year, jurisdiction, confidence level, and verification status.');
  if (!input.jurisdictionKnown) steps.push('Confirm jurisdiction and facility location for the reduction activity.');
  if (!input.projectBoundaryDefined) steps.push('Define the activity boundary, facility, and operational scope before professional review.');
  if (input.recordsRequiringReviewCount > 0) steps.push('Resolve records requiring review before using results in carbon credit discussions.');
  if (!input.protocolKnown) steps.push('Review applicable carbon credit protocols with a qualified sustainability professional or program authority.');

  steps.push('Consult a qualified professional before making any carbon credit claim or program submission.');
  return steps.slice(0, 6);
}

function getYearFromDate(value?: string | null) {
  return getDateOnlyYear(value) ?? null;
}

function buildScopeSummary(calculationDetails: CalculationAuditDetail[]) {
  const summary = {
    SCOPE_1: 0,
    SCOPE_2: 0,
    SCOPE_3: 0,
    TRACKED_METRIC: 0,
    UNCLASSIFIED: 0,
  };

  calculationDetails.forEach((detail) => {
    const resolution = resolveScopeClassification({
      activityType: detail.activityType,
      scopeOverride: detail.scopeOverride,
      factorDefaultScope: detail.factorDefaultScope,
      factorScope: detail.factorScope,
    });

    if (detail.status === 'TRACKED_ONLY' || resolution.scope === 'TRACKED_METRIC') {
      summary.TRACKED_METRIC += 1;
      return;
    }

    if (detail.status !== 'CALCULATED') return;

    const emissions = Number(detail.calculatedEmissionsKgCO2e ?? detail.calculatedEmission ?? 0);
    if (!Number.isFinite(emissions)) return;

    summary[resolution.scope] += emissions;
  });

  return summary;
}

function ScopeSummaryCard({ summary }: { summary: ReturnType<typeof buildScopeSummary> }) {
  const rows = [
    { label: 'Scope 1', value: summary.SCOPE_1, note: 'Direct fuel emissions' },
    { label: 'Scope 2', value: summary.SCOPE_2, note: 'Purchased energy' },
    { label: 'Scope 3', value: summary.SCOPE_3, note: 'Other indirect emissions' },
  ];

  return (
    <section style={tableCardStyle} aria-labelledby="scope-summary-title">
      <div style={{ padding: 16, borderBottom: '1px solid #eee' }}>
        <h2 id="scope-summary-title" style={{ margin: 0, fontSize: 18 }}>
          Emissions by Scope
        </h2>
        <p style={summaryHelperTextStyle}>
          Scope totals include calculated records only. Tracked metrics and records requiring review are excluded from emissions totals.
        </p>
      </div>
      <div style={scopeSummaryGridStyle}>
        {rows.map((row) => (
          <div key={row.label} style={scopeSummaryItemStyle}>
            <span>{row.label}</span>
            <strong>{formatEmissionsValue(row.value)} kg CO2e</strong>
            <small>{row.note}</small>
          </div>
        ))}
      </div>
      {summary.UNCLASSIFIED > 0 ? (
        <div style={scopeWarningStyle}>
          {formatEmissionsValue(summary.UNCLASSIFIED)} kg CO2e is calculated but unclassified and should be reviewed.
        </div>
      ) : null}
      {summary.TRACKED_METRIC > 0 ? (
        <div style={trackedScopeNoteStyle}>
          {summary.TRACKED_METRIC} tracked metric {summary.TRACKED_METRIC === 1 ? 'record is' : 'records are'} excluded from Scope 1, 2, and 3 totals.
        </div>
      ) : null}
    </section>
  );
}

function DataReadinessCard({ summary }: { summary: DataReadinessSummary }) {
  return (
    <section style={readinessCardStyle} aria-labelledby="data-readiness-title">
      <div style={readinessHeaderStyle}>
        <div>
          <h2 id="data-readiness-title" style={{ margin: 0, fontSize: 18 }}>
            Data Readiness
          </h2>
          <p style={summaryHelperTextStyle}>
            CarbonLite checks whether records are complete, traceable, and ready for calculation before reports or hotspot analysis are used.
          </p>
        </div>
        <div style={readinessScoreStyle(summary.level)}>
          <span>{summary.level}</span>
          <strong>{formatDisplayNumber(summary.score)}%</strong>
        </div>
      </div>
      <p style={readinessMessageStyle}>{summary.message}</p>
      <p style={summaryHelperTextStyle}>
        Data readiness score is based on required field completeness, factor match coverage,
        jurisdiction completeness, source traceability, and optional cost data. It is not
        the same as the percentage of records calculated.
      </p>
      <div style={readinessStatsGridStyle}>
        <div><strong>{summary.recordsReadyForCalculation}</strong> ready for calculation</div>
        <div><strong>{summary.recordsRequiringReview}</strong> require review</div>
        <div><strong>{summary.missingFactorCount}</strong> missing factor</div>
        <div><strong>{summary.invalidUnitCount}</strong> invalid unit</div>
        <div><strong>{summary.missingJurisdictionCount}</strong> missing province</div>
        <div><strong>{summary.trackedOnlyCount}</strong> tracked metric</div>
      </div>
      <div style={readinessChecklistStyle}>
        {summary.checks.map((check) => (
          <div key={check.key} style={readinessCheckStyle}>
            <span style={readinessCheckBadgeStyle(check.passed)}>
              {check.passed ? 'Ready' : 'Needs review'}
            </span>
            <div>
              <strong>{check.label}</strong>
              <div style={missingFactorHintStyle}>
                {typeof check.count === 'number' && typeof check.total === 'number'
                  ? `${check.count} of ${check.total} records · `
                  : ''}
                {check.message}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CarbonCreditReadinessPanel({
  assessment,
}: {
  assessment: CarbonCreditReadinessAssessment;
}) {
  return (
    <section style={creditReadinessCardStyle} aria-labelledby="carbon-credit-readiness-title">
      <div style={creditReadinessHeaderStyle}>
        <div>
          <h2 id="carbon-credit-readiness-title" style={{ margin: 0, fontSize: 18 }}>
            Carbon Credit Readiness
          </h2>
          <p style={summaryHelperTextStyle}>
            Check whether an emissions reduction opportunity may need further professional assessment.
          </p>
        </div>
        <div style={creditScoreStyle(assessment.readinessLevel)}>
          <span>{formatCreditReadinessLevel(assessment.readinessLevel)}</span>
          <strong>{assessment.score}/100</strong>
        </div>
      </div>

      <p style={creditSummaryStyle}>{assessment.summary}</p>

      {assessment.reductionAmount !== null && assessment.reductionPercentage !== null ? (
        <div style={reductionSignalStyle}>
          Reduction detected: {formatEmissionsValue(assessment.reductionAmount)} kgCO2e (
          {formatDisplayNumber(assessment.reductionPercentage)}%). Further professional assessment may be required.
        </div>
      ) : (
        <div style={creditNoticeStyle}>
          Carbon credit readiness cannot be assessed because baseline and current reporting periods are not clearly defined.
        </div>
      )}

      <div style={creditChecklistStyle}>
        {assessment.checklist.map((item) => (
          <div key={item.key} style={creditCheckRowStyle}>
            <span style={creditCheckBadgeStyle(item.status)}>{formatCreditCheckStatus(item.status)}</span>
            <div>
              <strong>{item.label}</strong>
              <div style={missingFactorHintStyle}>{item.message}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={creditNextStepsStyle}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Next steps for readiness</h3>
        <ul style={{ margin: 0, paddingLeft: 20, color: '#334155', lineHeight: 1.55 }}>
          {assessment.nextSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </div>

      <div style={creditDisclaimerStyle}>{assessment.disclaimer}</div>
    </section>
  );
}

function HotspotAnalysisSection({
  analysis,
  totalRecordsFound,
}: {
  analysis: HotspotAnalysis;
  totalRecordsFound: number;
}) {
  const hasCalculatedHotspots = analysis.categoryHotspots.length > 0;

  return (
    <section style={hotspotCardStyle} aria-labelledby="emissions-hotspots-title">
      <div style={hotspotHeaderStyle}>
        <div>
          <h2 id="emissions-hotspots-title" style={{ margin: 0, fontSize: 18 }}>
            Emissions Hotspots
          </h2>
          <p style={summaryHelperTextStyle}>
            Calculated emissions by activity category. Records requiring review are excluded from hotspot totals.
          </p>
        </div>
        {analysis.topCategory ? (
          <div style={topHotspotCardStyle}>
            <div style={topHotspotLabelStyle}>Top Hotspot</div>
            <strong>{analysis.topCategory.displayName}</strong>
            <div style={topHotspotValueStyle}>
              {formatDisplayNumber(analysis.topCategory.percentageOfTotal)}% of calculated emissions
            </div>
          </div>
        ) : null}
      </div>

      {!hasCalculatedHotspots ? (
        <div style={hotspotEmptyStyle}>
          {totalRecordsFound <= 0
            ? 'No activity records yet. Upload documents or add activity data to identify emissions hotspots.'
            : 'No emissions hotspots available yet because no records could be calculated.'}
        </div>
      ) : (
        <>
          {analysis.excludedRecordCount > 0 ? (
            <div style={hotspotNoticeStyle}>
              Some records were excluded from hotspot analysis because they require review.
            </div>
          ) : null}

          <div style={hotspotChartStyle} aria-label="Top emission categories">
            <div style={hotspotChartTitleStyle}>
              <strong>Top Emission Categories</strong>
              <span>Share of calculated emissions</span>
            </div>
            {analysis.categoryHotspots.map((row) => (
              <div key={row.activityType} style={hotspotBarRowStyle}>
                <div style={hotspotBarLabelStyle}>
                  <strong>#{row.rank} {row.displayName}</strong>
                  <span>{formatEmissionsValue(row.emissions)} kgCO2e</span>
                </div>
                <div style={hotspotBarTrackStyle}>
                  <div
                    style={{
                      ...hotspotBarFillStyle,
                      width: `${Math.min(100, Math.max(0, row.percentageOfTotal))}%`,
                    }}
                  />
                </div>
                <div style={hotspotBarPercentStyle}>
                  {formatDisplayNumber(row.percentageOfTotal)}%
                </div>
              </div>
            ))}
          </div>

          <div style={hotspotTableWrapStyle}>
            <table style={hotspotTableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Rank</th>
                  <th style={thStyle}>Category</th>
                  <th style={thStyle}>Emissions</th>
                  <th style={thStyle}>Share of total</th>
                  <th style={thStyle}>Records</th>
                  <th style={thStyle}>Level</th>
                  <th style={thStyle}>Focus message</th>
                </tr>
              </thead>
              <tbody>
                {analysis.categoryHotspots.map((row) => (
                  <tr key={`hotspot-table-${row.activityType}`}>
                    <td style={tdStyle}>#{row.rank}</td>
                    <td style={tdStyle}>{row.displayName}</td>
                    <td style={tdStyle}>{formatEmissionsValue(row.emissions)} kgCO2e</td>
                    <td style={tdStyle}>{formatDisplayNumber(row.percentageOfTotal)}%</td>
                    <td style={tdStyle}>
                      {row.calculatedRecordCount} calculated
                      {row.excludedRecordCount > 0 ? ` · ${row.excludedRecordCount} excluded` : ''}
                    </td>
                    <td style={tdStyle}>
                      <span style={hotspotLevelBadgeStyle(row.hotspotLevel)}>
                        {formatHotspotLevel(row.hotspotLevel)}
                      </span>
                    </td>
                    <td style={tdStyle}>{row.focusMessage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {analysis.focusRecommendations.length > 0 ? (
        <div style={recommendationGridStyle}>
          {analysis.focusRecommendations.map((item) => (
            <div key={`${item.priority}-${item.title}`} style={recommendationCardStyle(item.priority)}>
              <span style={recommendationPriorityStyle(item.priority)}>{formatHotspotLevel(item.priority)}</span>
              <strong>{item.title}</strong>
              <p>{item.message}</p>
            </div>
          ))}
        </div>
      ) : null}

      {analysis.excludedCategories.length > 0 ? (
        <div style={excludedHotspotStyle}>
          <h3 style={{ margin: '0 0 10px', fontSize: 16 }}>Data quality gaps excluded from totals</h3>
          <div style={excludedHotspotListStyle}>
            {analysis.excludedCategories.map((item) => (
              <div key={`${item.activityType}-${item.reason}`} style={excludedHotspotRowStyle}>
                <span style={excludedReasonBadgeStyle(item.reason)}>{formatExcludedReason(item.reason)}</span>
                <div>
                  <strong>{item.displayName}</strong> — {item.excludedRecordCount}{' '}
                  {item.excludedRecordCount === 1 ? 'record' : 'records'}
                  <div style={missingFactorHintStyle}>{item.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {analysis.categoryHotspots.some((row) => row.hotspotLevel === 'HIGH') ? (
        <div style={hotspotCreditPromptStyle}>
          High-emission categories may be useful starting points for reduction planning. If reductions are later achieved and documented, they may require further professional assessment before any carbon credit discussion.
        </div>
      ) : null}
    </section>
  );
}

function formatCreditReadinessLevel(level: CarbonCreditReadinessAssessment['readinessLevel']) {
  const labels: Record<CarbonCreditReadinessAssessment['readinessLevel'], string> = {
    NOT_READY: 'Not ready',
    NEEDS_MORE_DATA: 'Needs more data',
    READY_FOR_PROFESSIONAL_REVIEW: 'Ready for professional review',
  };

  return labels[level];
}

function formatCreditCheckStatus(
  status: CarbonCreditReadinessAssessment['checklist'][number]['status'],
) {
  const labels: Record<CarbonCreditReadinessAssessment['checklist'][number]['status'], string> = {
    PASS: 'Pass',
    WARNING: 'Review',
    MISSING: 'Missing',
    NOT_ASSESSED: 'Not assessed',
  };

  return labels[status];
}

function formatHotspotLevel(level: 'HIGH' | 'MEDIUM' | 'LOW') {
  return level.charAt(0) + level.slice(1).toLowerCase();
}

function formatExcludedReason(reason: HotspotAnalysis['excludedCategories'][number]['reason']) {
  const labels: Record<HotspotAnalysis['excludedCategories'][number]['reason'], string> = {
    MISSING_FACTOR: 'Missing factor',
    INVALID_UNIT: 'Invalid unit',
    TRACKED_ONLY: 'Tracked metric',
    NEEDS_REVIEW: 'Needs review',
    MISSING_JURISDICTION: 'Missing jurisdiction',
  };

  return labels[reason];
}
function CalculationSummaryEmptyState({
  countSummary,
  emptyMessage,
  informationalIssueGroups,
}: {
  countSummary: MetricsCountSummary;
  emptyMessage?: string;
  informationalIssueGroups: CalculationIssueGroup[];
}) {
  if (
    emptyMessage &&
    emptyMessage !==
      'No activity records yet. Upload documents or add activity data to calculate metrics.'
  ) {
    return <span>{emptyMessage}</span>;
  }

  if (countSummary.totalRecordsFound <= 0) {
    return <span>No activity records yet. Import activity data to generate metrics.</span>;
  }

  return (
    <div style={calculationEmptyStateStyle}>
      <div style={calculationEmptyTitleStyle}>No calculated emissions yet.</div>
      <div>
        Records exist, but emissions could not be calculated because some records
        require missing factors or data review.
      </div>
      {informationalIssueGroups.length > 0 ? (
        <div style={trackedMetricListStyle}>
          <div style={{ fontWeight: 800 }}>Tracked Metrics</div>
          {informationalIssueGroups.map((group) => (
            <div key={`${group.activityType}-${group.unit}`}>
              {formatActivityTypeLabel(group.activityType)} / {group.unit} — {group.count}{' '}
              {group.count === 1 ? 'record' : 'records'}
            </div>
          ))}
        </div>
      ) : null}
      {countSummary.skippedRecords > 0 ? (
        <div>Review Calculation Issues above.</div>
      ) : null}
    </div>
  );
}

function isMissingIssueValue(value: unknown) {
  return sanitizeIssueValue(value, '') === '';
}

function isTrackedNonEmissionMetric(activityType: string) {
  return ['WATER', 'WASTE', 'WASTE_VOLUME'].includes(activityType.toUpperCase());
}

function groupCalculationIssuesFromDetails(
  calculationDetails: CalculationAuditDetail[],
): CalculationIssueGroup[] {
  const groups = new Map<string, CalculationIssueGroup>();

  calculationDetails
    .filter((detail) => detail.status !== 'CALCULATED' && detail.status !== 'OUTSIDE_SCOPE')
    .forEach((detail) => {
      const activityType = String(detail.activityType || 'UNKNOWN').toUpperCase();
      const classification = classifyCalculationDetailIssue(detail);
      const unit =
        classification.issueType === 'missingJurisdiction'
          ? 'Missing province'
          : classification.issueType === 'invalidUnit'
          ? 'Invalid unit'
          : classification.issueType === 'informational'
          ? normalizeUnitForDisplay(detail.activityUnit).value
          : classification.issueType === 'missingFactor'
          ? normalizeUnitForDisplay(detail.activityUnit).value
          : classification.missingField === 'unit'
          ? 'Missing unit'
          : classification.missingField === 'quantity'
          ? 'Missing quantity'
          : classification.missingField === 'date'
          ? 'Missing date'
          : 'Missing data';
      const key = `${classification.issueType}:${activityType}:${unit}`;
      const existing = groups.get(key) ?? {
        activityType,
        unit,
        count: 0,
        availableUnitsForActivityType: [],
        activityDataIds: [],
        issueType: classification.issueType,
        missingField: classification.missingField,
      };

      existing.count += 1;
      if (detail.activityDataId && !existing.activityDataIds.includes(detail.activityDataId)) {
        existing.activityDataIds.push(detail.activityDataId);
      }
      detail.availableUnitsForActivityType?.forEach((availableUnit) => {
        const normalizedAvailableUnit = normalizeUnitForDisplay(availableUnit);
        const nextUnit =
          normalizedAvailableUnit.status === 'valid'
            ? normalizedAvailableUnit.value
            : availableUnit;

        if (!existing.availableUnitsForActivityType.includes(nextUnit)) {
          existing.availableUnitsForActivityType.push(nextUnit);
        }
      });
      groups.set(key, existing);
    });

  return Array.from(groups.values()).sort((a, b) =>
    `${a.issueType}:${a.activityType}:${a.unit}`.localeCompare(
      `${b.issueType}:${b.activityType}:${b.unit}`,
    ),
  );
}

function classifyCalculationDetailIssue(detail: CalculationAuditDetail): Pick<CalculationIssueGroup, 'issueType' | 'missingField'> {
  if (detail.status === 'MISSING_JURISDICTION') {
    return { issueType: 'missingJurisdiction', missingField: 'jurisdiction' };
  }

  if (detail.status === 'INVALID_UNIT') {
    return { issueType: 'invalidUnit', missingField: 'unit' };
  }

  if (detail.status === 'TRACKED_ONLY' || isTrackedNonEmissionMetric(detail.activityType)) {
    return { issueType: 'informational' };
  }

  if (detail.status === 'MISSING_FACTOR') {
    return { issueType: 'missingFactor' };
  }

  if (detail.status === 'INVALID_QUANTITY') {
    return { issueType: 'missingData', missingField: 'quantity' };
  }

  if (detail.status === 'MISSING_DATA') {
    if (!detail.activityType) return { issueType: 'missingData', missingField: 'activityType' };
    if (!detail.activityUnit) return { issueType: 'missingData', missingField: 'unit' };
    if (!detail.recordDate) return { issueType: 'missingData', missingField: 'date' };
    return { issueType: 'missingData' };
  }

  return { issueType: 'missingData' };
}

function classifyCalculationIssue(group: MissingFactorGroup): CalculationIssueGroup {
  if (isMissingIssueValue(group.activityType) || group.activityType === 'UNKNOWN') {
    return { ...group, issueType: 'missingData', missingField: 'activityType' };
  }

  if (
    isMissingIssueValue(group.unit) ||
    group.unit === '-' ||
    group.unit === 'Missing unit' ||
    normalizeUnitForDisplay(group.unit).status === 'missing'
  ) {
    return { ...group, issueType: 'missingData', missingField: 'unit' };
  }

  if (group.unit === 'Invalid unit' || normalizeUnitForDisplay(group.unit).status === 'invalid') {
    return { ...group, issueType: 'invalidUnit', missingField: 'unit' };
  }

  if (isTrackedNonEmissionMetric(group.activityType)) {
    return { ...group, issueType: 'informational' };
  }

  return { ...group, issueType: 'missingFactor' };
}

function formatCalculationSourceReference(detail: CalculationAuditDetail) {
  if (detail.sourceType === 'MANUAL') return 'Manual entry';

  const parts = [
    detail.sourceReference,
    detail.sourcePage ? `Page ${detail.sourcePage}` : '',
    detail.sourceRow ? `Line item ${detail.sourceRow}` : '',
  ].filter(Boolean);

  return parts.length ? parts.join(' · ') : 'Source not specified';
}

function formatDetailJurisdiction(detail: CalculationAuditDetail) {
  const province = detail.jurisdictionRegion?.trim();
  const country = detail.jurisdictionCountry?.trim();
  const location = [province, country].filter(Boolean).join(', ') || detail.jurisdiction || 'Not specified';
  const source = detail.jurisdictionSource ? formatJurisdictionSource(detail.jurisdictionSource) : null;
  const assumed = detail.jurisdictionAssumed ? ' · assumed; review before reporting' : '';

  return `${location}${source ? ` · ${source}` : ''}${assumed}`;
}

function formatJurisdictionSource(source: NonNullable<CalculationAuditDetail['jurisdictionSource']>) {
  const normalized = String(source).toLowerCase();
  const labels: Record<string, string> = {
    record: 'record',
    facility: 'facility',
    organization: 'organization default',
    user: 'user profile',
    unknown: 'source unknown',
  };

  return labels[normalized] ?? normalized;
}

function MetricRelationshipLabel({ item }: { item: MetricsSummaryTableRow }) {
  if (item.category === 'input' && item.activityType) {
    return (
      <span>
        <strong>{item.totalValue} {item.unit}</strong>{' '}
        {formatActivityTypeLabel(item.activityType)}
      </span>
    );
  }

  return <span>{item.metricType}</span>;
}

function buildSkippedReasonRows(
  skippedReasons: NonNullable<MetricsCountSummary['skippedReasons']>,
) {
  return [
    { label: 'Calculation issues', count: skippedReasons.missingFactor },
    { label: 'Outside selected date range', count: skippedReasons.outsideDateRange },
    { label: 'Outside selected report scope', count: skippedReasons.outsideScope },
    { label: 'Invalid data', count: skippedReasons.invalidData },
  ].filter((reason) => reason.count > 0);
}

function getCalculationIssueTitle(group: CalculationIssueGroup) {
  if (group.issueType === 'invalidUnit') {
    return `${formatActivityTypeLabel(group.activityType)} — invalid unit`;
  }

  if (group.issueType === 'missingJurisdiction') {
    return `${formatActivityTypeLabel(group.activityType)} — missing province`;
  }

  if (group.issueType === 'missingData') {
    if (group.missingField === 'activityType') return 'Activity type required.';
    if (group.missingField === 'quantity') return `${formatActivityTypeLabel(group.activityType)} — missing quantity`;
    if (group.missingField === 'date') return `${formatActivityTypeLabel(group.activityType)} — missing date`;

    return group.unit === 'Invalid unit' || normalizeUnitForDisplay(group.unit).status === 'invalid'
      ? `${formatActivityTypeLabel(group.activityType)} — invalid unit`
      : `${formatActivityTypeLabel(group.activityType)} — missing unit`;
  }

  if (group.issueType === 'informational') {
    return `${formatActivityTypeLabel(group.activityType)} / ${group.unit} — tracked only`;
  }

  return `No factor found for: ${group.activityType} / ${group.unit}`;
}

function getCalculationIssueDescription(group: CalculationIssueGroup) {
  if (group.issueType === 'invalidUnit') {
    return 'Invalid unit detected. Please review this record.';
  }

  if (group.issueType === 'missingJurisdiction') {
    return `${group.count} electricity ${group.count === 1 ? 'record is' : 'records are'} missing province. Province is required because electricity factors vary by province.`;
  }

  if (group.issueType === 'missingData') {
    if (group.missingField === 'activityType') {
      return 'Add an activity type before calculations can be performed.';
    }
    if (group.missingField === 'quantity') {
      return 'Quantity must be present and greater than zero before calculations can be performed.';
    }
    if (group.missingField === 'date') {
      return 'A record date or billing period is required before calculations can be performed.';
    }

    return group.unit === 'Invalid unit' || normalizeUnitForDisplay(group.unit).status === 'invalid'
      ? 'Invalid unit detected. Please review this record.'
      : 'Missing unit. Please review this record.';
  }

  if (group.issueType === 'informational') {
    return 'Tracked metric only. No emission factor required.';
  }

  return 'Create a conversion factor to include these records in emissions calculations.';
}

function IssueBadge({ type }: { type: CalculationIssueGroup['issueType'] }) {
  return <SharedIssueBadge issueType={type} showTooltip />;
}

function getUnitMismatchDensityHint(group: MissingFactorGroup) {
  const activityType = group.activityType.toUpperCase();
  const unit = group.unit.toLowerCase();
  const availableUnits = group.availableUnitsForActivityType.map((item) =>
    item.toLowerCase(),
  );

  if (
    activityType === 'DIESEL' &&
    ['ton', 'tons', 'tonne', 'tonnes', 't'].includes(unit) &&
    availableUnits.some((item) => ['l', 'liter', 'liters', 'litre', 'litres'].includes(item))
  ) {
    return 'Informational guidance only: approximate diesel density is 1 ton diesel ≈ 1190 liters. CarbonLite will not auto-convert or auto-calculate emissions from this assumption.';
  }

  return '';
}

function MetricCard({
  title,
  value,
  icon,
  color,
  highlight,
  loading,
  traceText,
  traceActionLabel,
  onTraceAction,
}: {
  title: string;
  value: React.ReactNode;
  icon: string;
  color: string;
  highlight?: boolean;
  loading?: boolean;
  traceText?: string;
  traceActionLabel?: string;
  onTraceAction?: () => void;
}) {
  return (
    <div style={{
      borderRadius: 16,
      padding: 20,
      background: '#fff',
      border: highlight ? `2px solid ${color}` : '1px solid #eee',
      boxShadow: '0 6px 20px rgba(0,0,0,0.06)',
    }}>
      <div style={{ fontSize: 26 }}>{icon}</div>
      <div style={{ marginTop: 10, color: '#666', fontSize: 14 }}>{title}</div>
      <div style={{
        marginTop: 6,
        fontSize: title === 'Fuel Usage' ? 18 : 28,
        fontWeight: 700,
        color: highlight ? color : '#111',
        whiteSpace: 'pre-line',
        lineHeight: title === 'Fuel Usage' ? 1.45 : 1.2,
      }}>
        {loading ? (
          <div aria-label={`Loading ${title}`}>
            <SkeletonLine width={title === 'Fuel Usage' ? '82%' : '64%'} />
            {title === 'Fuel Usage' ? <SkeletonLine width="58%" /> : null}
          </div>
        ) : (
          value
        )}
      </div>
      {!loading && traceText ? (
        <div style={traceTextStyle}>
          <div>{traceText}</div>
          {traceActionLabel ? (
            <button type="button" onClick={onTraceAction} style={traceActionButtonStyle}>
              {traceActionLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SkeletonLine({ width = '100%' }: { width?: string }) {
  return (
    <span
      style={{
        display: 'block',
        width,
        height: 16,
        margin: '6px 0',
        borderRadius: 999,
        background: 'linear-gradient(90deg, #e2e8f0 0%, #f8fafc 50%, #e2e8f0 100%)',
      }}
    />
  );
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 20,
  marginBottom: 30,
};

const reconciliationStyle: React.CSSProperties = {
  marginBottom: 24,
  padding: 16,
  borderRadius: 12,
  border: '1px solid #dbeafe',
  background: '#f8fafc',
};

const readinessCardStyle: React.CSSProperties = {
  marginBottom: 24,
  padding: 16,
  borderRadius: 12,
  border: '1px solid #bfdbfe',
  background: '#eff6ff',
};

const readinessHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  alignItems: 'flex-start',
  flexWrap: 'wrap',
};

function readinessScoreStyle(level: DataReadinessSummary['level']): React.CSSProperties {
  return {
    display: 'grid',
    justifyItems: 'end',
    gap: 4,
    minWidth: 150,
    padding: 12,
    borderRadius: 12,
    background: '#fff',
    border: `1px solid ${level === 'Good' ? '#bbf7d0' : level === 'Needs Review' ? '#fde68a' : '#fecaca'}`,
    color: level === 'Good' ? '#047857' : level === 'Needs Review' ? '#92400e' : '#991b1b',
  };
}

const readinessMessageStyle: React.CSSProperties = {
  margin: '12px 0 0',
  color: '#334155',
  fontSize: 14,
  lineHeight: 1.5,
};

const readinessStatsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: 10,
  marginTop: 14,
  color: '#1e293b',
};

const readinessChecklistStyle: React.CSSProperties = {
  display: 'grid',
  gap: 10,
  marginTop: 14,
};

const readinessCheckStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '110px 1fr',
  gap: 12,
  alignItems: 'start',
  padding: 10,
  borderRadius: 10,
  background: '#fff',
  border: '1px solid #dbeafe',
};

function readinessCheckBadgeStyle(passed: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    justifyContent: 'center',
    width: 'fit-content',
    padding: '4px 8px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    color: passed ? '#047857' : '#92400e',
    background: passed ? '#dcfce7' : '#fffbeb',
    border: `1px solid ${passed ? '#bbf7d0' : '#fde68a'}`,
    whiteSpace: 'nowrap',
  };
}

const creditReadinessCardStyle: React.CSSProperties = {
  marginBottom: 24,
  padding: 16,
  borderRadius: 12,
  border: '1px solid #fed7aa',
  background: '#fff7ed',
};

const creditReadinessHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  alignItems: 'flex-start',
  flexWrap: 'wrap',
};

function creditScoreStyle(level: CarbonCreditReadinessAssessment['readinessLevel']): React.CSSProperties {
  const color =
    level === 'READY_FOR_PROFESSIONAL_REVIEW'
      ? '#047857'
      : level === 'NEEDS_MORE_DATA'
      ? '#92400e'
      : '#991b1b';
  const border =
    level === 'READY_FOR_PROFESSIONAL_REVIEW'
      ? '#bbf7d0'
      : level === 'NEEDS_MORE_DATA'
      ? '#fde68a'
      : '#fecaca';

  return {
    display: 'grid',
    justifyItems: 'end',
    gap: 4,
    minWidth: 190,
    padding: 12,
    borderRadius: 12,
    background: '#fff',
    border: `1px solid ${border}`,
    color,
  };
}

const creditSummaryStyle: React.CSSProperties = {
  margin: '12px 0 0',
  color: '#334155',
  fontSize: 14,
  lineHeight: 1.55,
};

const reductionSignalStyle: React.CSSProperties = {
  marginTop: 12,
  padding: '10px 12px',
  borderRadius: 10,
  color: '#047857',
  background: '#ecfdf5',
  border: '1px solid #bbf7d0',
  fontSize: 13,
  fontWeight: 800,
};

const creditNoticeStyle: React.CSSProperties = {
  marginTop: 12,
  padding: '10px 12px',
  borderRadius: 10,
  color: '#92400e',
  background: '#fffbeb',
  border: '1px solid #fde68a',
  fontSize: 13,
  fontWeight: 800,
};

const creditChecklistStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: 10,
  marginTop: 14,
};

const creditCheckRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '96px 1fr',
  gap: 10,
  alignItems: 'start',
  padding: 10,
  borderRadius: 10,
  background: '#fff',
  border: '1px solid #ffedd5',
};

function creditCheckBadgeStyle(
  status: CarbonCreditReadinessAssessment['checklist'][number]['status'],
): React.CSSProperties {
  const palette = {
    PASS: { color: '#047857', background: '#dcfce7', border: '#bbf7d0' },
    WARNING: { color: '#92400e', background: '#fffbeb', border: '#fde68a' },
    MISSING: { color: '#991b1b', background: '#fee2e2', border: '#fecaca' },
    NOT_ASSESSED: { color: '#475569', background: '#f8fafc', border: '#e2e8f0' },
  }[status];

  return {
    display: 'inline-flex',
    justifyContent: 'center',
    width: 'fit-content',
    padding: '4px 8px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    color: palette.color,
    background: palette.background,
    border: `1px solid ${palette.border}`,
    whiteSpace: 'nowrap',
  };
}

const creditNextStepsStyle: React.CSSProperties = {
  marginTop: 14,
  padding: 12,
  borderRadius: 12,
  background: '#fff',
  border: '1px solid #ffedd5',
};

const creditDisclaimerStyle: React.CSSProperties = {
  marginTop: 14,
  padding: 12,
  borderRadius: 12,
  background: '#fff',
  border: '1px solid #fed7aa',
  color: '#7c2d12',
  fontSize: 13,
  lineHeight: 1.5,
  fontWeight: 700,
};

const hotspotCardStyle: React.CSSProperties = {
  marginBottom: 24,
  padding: 16,
  borderRadius: 12,
  border: '1px solid #bbf7d0',
  background: '#f0fdf4',
};

const hotspotHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  alignItems: 'flex-start',
  flexWrap: 'wrap',
};

const topHotspotCardStyle: React.CSSProperties = {
  minWidth: 220,
  padding: 12,
  borderRadius: 10,
  border: '1px solid #86efac',
  background: '#fff',
  color: '#14532d',
};

const topHotspotLabelStyle: React.CSSProperties = {
  color: '#047857',
  fontSize: 12,
  fontWeight: 800,
  textTransform: 'uppercase',
};

const topHotspotValueStyle: React.CSSProperties = {
  marginTop: 4,
  fontSize: 13,
  color: '#166534',
};

const hotspotListStyle: React.CSSProperties = {
  display: 'grid',
  gap: 10,
  marginTop: 12,
};

const hotspotRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  padding: 12,
  borderRadius: 10,
  background: '#fff',
  border: '1px solid #dcfce7',
};

const hotspotEmptyStyle: React.CSSProperties = {
  marginTop: 12,
  padding: 12,
  borderRadius: 10,
  background: '#fff',
  color: '#475569',
  border: '1px solid #dcfce7',
};

const hotspotNoticeStyle: React.CSSProperties = {
  marginTop: 12,
  padding: '10px 12px',
  borderRadius: 10,
  color: '#92400e',
  background: '#fffbeb',
  border: '1px solid #fde68a',
  fontSize: 13,
  fontWeight: 700,
};

const hotspotCreditPromptStyle: React.CSSProperties = {
  marginTop: 16,
  padding: 12,
  borderRadius: 12,
  background: '#fff7ed',
  border: '1px solid #fed7aa',
  color: '#9a3412',
  fontSize: 13,
  lineHeight: 1.5,
  fontWeight: 700,
};

const hotspotChartStyle: React.CSSProperties = {
  display: 'grid',
  gap: 12,
  marginTop: 16,
  padding: 14,
  borderRadius: 12,
  background: '#fff',
  border: '1px solid #dcfce7',
};

const hotspotChartTitleStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  color: '#334155',
  fontSize: 13,
  flexWrap: 'wrap',
};

const hotspotBarRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(160px, 1.2fr) minmax(160px, 2fr) 64px',
  gap: 12,
  alignItems: 'center',
};

const hotspotBarLabelStyle: React.CSSProperties = {
  display: 'grid',
  gap: 2,
  color: '#0f172a',
  fontSize: 13,
};

const hotspotBarTrackStyle: React.CSSProperties = {
  height: 12,
  borderRadius: 999,
  background: '#dcfce7',
  overflow: 'hidden',
};

const hotspotBarFillStyle: React.CSSProperties = {
  height: '100%',
  borderRadius: 999,
  background: 'linear-gradient(90deg, #059669, #22c55e)',
};

const hotspotBarPercentStyle: React.CSSProperties = {
  textAlign: 'right',
  color: '#14532d',
  fontSize: 13,
  fontWeight: 800,
};

const hotspotTableWrapStyle: React.CSSProperties = {
  marginTop: 16,
  overflowX: 'auto',
  border: '1px solid #dcfce7',
  borderRadius: 12,
  background: '#fff',
};

const hotspotTableStyle: React.CSSProperties = {
  width: '100%',
  minWidth: 860,
  borderCollapse: 'collapse',
};

const recommendationGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 12,
  marginTop: 16,
};

function recommendationCardStyle(priority: 'HIGH' | 'MEDIUM' | 'LOW'): React.CSSProperties {
  const color = priority === 'HIGH' ? '#dc2626' : priority === 'MEDIUM' ? '#d97706' : '#0369a1';

  return {
    display: 'grid',
    alignContent: 'start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    background: '#fff',
    border: `1px solid ${priority === 'HIGH' ? '#fecaca' : priority === 'MEDIUM' ? '#fed7aa' : '#bfdbfe'}`,
    color,
  };
}

function recommendationPriorityStyle(priority: 'HIGH' | 'MEDIUM' | 'LOW'): React.CSSProperties {
  return {
    width: 'fit-content',
    padding: '3px 8px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    color: priority === 'HIGH' ? '#991b1b' : priority === 'MEDIUM' ? '#92400e' : '#075985',
    background: priority === 'HIGH' ? '#fee2e2' : priority === 'MEDIUM' ? '#fffbeb' : '#eff6ff',
  };
}

const excludedHotspotStyle: React.CSSProperties = {
  marginTop: 16,
  padding: 14,
  borderRadius: 12,
  background: '#fff',
  border: '1px solid #e2e8f0',
};

const excludedHotspotListStyle: React.CSSProperties = {
  display: 'grid',
  gap: 10,
};

const excludedHotspotRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '140px 1fr',
  gap: 12,
  alignItems: 'start',
};

function hotspotLevelBadgeStyle(level: 'HIGH' | 'MEDIUM' | 'LOW'): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    width: 'fit-content',
    padding: '3px 8px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    color: level === 'HIGH' ? '#991b1b' : level === 'MEDIUM' ? '#92400e' : '#166534',
    background: level === 'HIGH' ? '#fee2e2' : level === 'MEDIUM' ? '#fffbeb' : '#dcfce7',
  };
}

function excludedReasonBadgeStyle(
  reason: HotspotAnalysis['excludedCategories'][number]['reason'],
): React.CSSProperties {
  const isWarning = reason === 'MISSING_FACTOR' || reason === 'INVALID_UNIT' || reason === 'MISSING_JURISDICTION';
  const isInfo = reason === 'TRACKED_ONLY';

  return {
    display: 'inline-flex',
    justifyContent: 'center',
    width: 'fit-content',
    padding: '4px 8px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    color: isWarning ? '#92400e' : isInfo ? '#0369a1' : '#475569',
    background: isWarning ? '#fffbeb' : isInfo ? '#eff6ff' : '#f8fafc',
    border: `1px solid ${isWarning ? '#fde68a' : isInfo ? '#bfdbfe' : '#e2e8f0'}`,
    whiteSpace: 'nowrap',
  };
}

const traceTextStyle: React.CSSProperties = {
  marginTop: 10,
  paddingTop: 10,
  borderTop: '1px solid #dcfce7',
  color: '#166534',
  fontSize: 12,
  lineHeight: 1.45,
};

const traceActionButtonStyle: React.CSSProperties = {
  marginTop: 8,
  padding: 0,
  border: 'none',
  background: 'transparent',
  color: '#047857',
  fontWeight: 800,
  cursor: 'pointer',
};

const sourceDetailsStyle: React.CSSProperties = {
  marginTop: 18,
  padding: 16,
  borderRadius: 12,
  border: '1px solid #dbeafe',
  background: '#fff',
};

const sourceDetailsSummaryStyle: React.CSSProperties = {
  cursor: 'pointer',
  color: '#0f766e',
  fontWeight: 800,
};

const calculationDetailsTableWrapStyle: React.CSSProperties = {
  marginTop: 12,
  overflowX: 'auto',
};

const calculationDetailsTableStyle: React.CSSProperties = {
  width: '100%',
  minWidth: 820,
  borderCollapse: 'collapse',
};

const calculationDetailsButtonStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid #bfdbfe',
  background: '#eff6ff',
  color: '#1d4ed8',
  fontWeight: 800,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const calculationDetailModalBackdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  display: 'grid',
  placeItems: 'center',
  padding: 20,
  background: 'rgba(15, 23, 42, 0.38)',
};

const calculationDetailModalStyle: React.CSSProperties = {
  width: 'min(760px, 100%)',
  maxHeight: 'min(720px, calc(100vh - 40px))',
  overflow: 'auto',
  borderRadius: 14,
  border: '1px solid #cbd5e1',
  background: '#fff',
  boxShadow: '0 24px 70px rgba(15, 23, 42, 0.22)',
};

const calculationDetailModalHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
  padding: '18px 20px 14px',
  borderBottom: '1px solid #e2e8f0',
};

const calculationDetailModalTitleStyle: React.CSSProperties = {
  margin: 0,
  color: '#0f172a',
  fontSize: 20,
};

const calculationDetailModalSubtitleStyle: React.CSSProperties = {
  margin: '4px 0 0',
  color: '#64748b',
  fontSize: 14,
  lineHeight: 1.4,
};

const calculationDetailModalCloseStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 34,
  height: 34,
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#334155',
  fontSize: 22,
  lineHeight: 1,
  cursor: 'pointer',
};

const calculationDetailGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 12,
  padding: 20,
};

const calculationDetailFieldStyle: React.CSSProperties = {
  display: 'grid',
  gap: 5,
  alignContent: 'start',
  minWidth: 0,
};

const calculationDetailFieldFullStyle: React.CSSProperties = {
  ...calculationDetailFieldStyle,
  gridColumn: '1 / -1',
};

const calculationDetailLabelStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: 12,
  fontWeight: 800,
  textTransform: 'uppercase',
};

const calculationDetailValueStyle: React.CSSProperties = {
  color: '#0f172a',
  fontSize: 14,
  lineHeight: 1.5,
  overflowWrap: 'anywhere',
};

const reconciliationHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 12,
};

const helpBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 20,
  height: 20,
  borderRadius: 999,
  background: '#dbeafe',
  color: '#1d4ed8',
  fontWeight: 900,
  fontSize: 12,
  cursor: 'help',
};

const reconciliationGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
  gap: 10,
  color: '#475569',
};

const reasonListStyle: React.CSSProperties = {
  marginTop: 12,
  display: 'grid',
  gap: 8,
};

const reasonRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  maxWidth: 420,
  color: '#475569',
};

const allIncludedStyle: React.CSSProperties = {
  marginTop: 12,
  color: '#047857',
  fontWeight: 800,
};

const partialCalculationWarningStyle: React.CSSProperties = {
  margin: '-8px 0 16px',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #fde68a',
  background: '#fffbeb',
  color: '#92400e',
  fontWeight: 700,
};

const warningStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 12,
  borderRadius: 10,
  border: '1px solid #fed7aa',
  background: '#fff7ed',
  color: '#9a3412',
};

const missingFactorListStyle: React.CSSProperties = {
  display: 'grid',
  gap: 8,
};

const missingFactorRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
  padding: 10,
  borderRadius: 10,
  background: '#fff',
  border: '1px solid #fed7aa',
};

const missingFactorTextStyle: React.CSSProperties = {
  display: 'grid',
  gap: 6,
  flex: '1 1 280px',
};

const issueHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
};

const missingFactorHintStyle: React.CSSProperties = {
  color: '#7c2d12',
  fontSize: 13,
  lineHeight: 1.5,
  fontWeight: 600,
};

const createFactorButtonStyle: React.CSSProperties = {
  padding: '7px 10px',
  borderRadius: 8,
  border: '1px solid #10b981',
  background: '#ecfdf5',
  color: '#047857',
  fontWeight: 800,
  cursor: 'pointer',
};

const editRecordButtonStyle: React.CSSProperties = {
  padding: '7px 10px',
  borderRadius: 8,
  border: '1px solid #f59e0b',
  background: '#fffbeb',
  color: '#92400e',
  fontWeight: 800,
  cursor: 'pointer',
};

const tableCardStyle: React.CSSProperties = {
  border: '1px solid #ddd',
  borderRadius: 12,
  background: '#fff',
  overflow: 'hidden',
  marginBottom: 20,
};

const summaryHelperTextStyle: React.CSSProperties = {
  margin: '6px 0 0',
  color: '#64748b',
  lineHeight: 1.5,
  fontSize: 14,
};

const scopeSummaryGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 12,
  padding: 16,
};

const scopeSummaryItemStyle: React.CSSProperties = {
  display: 'grid',
  gap: 5,
  padding: 14,
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
};

const scopeWarningStyle: React.CSSProperties = {
  margin: '0 16px 12px',
  padding: 10,
  borderRadius: 8,
  border: '1px solid #fed7aa',
  background: '#fff7ed',
  color: '#9a3412',
  fontSize: 13,
};

const trackedScopeNoteStyle: React.CSSProperties = {
  margin: '0 16px 16px',
  color: '#0369a1',
  fontSize: 13,
  fontWeight: 700,
};

const calculationEmptyStateStyle: React.CSSProperties = {
  display: 'grid',
  gap: 8,
  color: '#475569',
  lineHeight: 1.5,
};

const calculationEmptyTitleStyle: React.CSSProperties = {
  color: '#0f172a',
  fontWeight: 900,
};

const trackedMetricListStyle: React.CSSProperties = {
  display: 'grid',
  gap: 4,
  padding: 10,
  borderRadius: 10,
  border: '1px solid #dbeafe',
  background: '#eff6ff',
  color: '#1e3a8a',
};

const metricGroupHeaderStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid #e5e7eb',
  background: '#f8fafc',
  color: '#334155',
  fontSize: 13,
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: 0,
};

const relationshipArrowStyle: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'center',
  color: '#10b981',
  fontSize: 22,
  fontWeight: 900,
  borderBottom: '1px solid #d1fae5',
  background: '#f0fdf4',
};

const calculatedMetricRowStyle: React.CSSProperties = {
  background: '#ecfdf5',
};

const calculatedMetricCellStyle: React.CSSProperties = {
  padding: 12,
  borderBottom: '1px solid #bbf7d0',
  color: '#047857',
  fontWeight: 800,
};

const calculatedMetricTotalStyle: React.CSSProperties = {
  ...calculatedMetricCellStyle,
  fontSize: 16,
};

const leafIconStyle: React.CSSProperties = {
  marginRight: 8,
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: 12,
  borderBottom: '1px solid #ddd',
};

const tdStyle: React.CSSProperties = {
  padding: 12,
  borderBottom: '1px solid #eee',
};
