import { useNavigate } from 'react-router-dom';
import {
  formatFuelUsageBreakdown,
  formatActivityUsageValue,
  formatActivityTypeLabel,
  type ActivityUsageTotals,
} from '../utils/activityAggregation';
import type { CalculationAuditDetail } from '../services/metrics';
import { buildCalculatedFromLine } from '../utils/calculationTraceability';

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
  activityType: string;
  unit: string;
  availableUnitsForActivityType?: string[];
};

export type MissingFactorGroup = {
  activityType: string;
  unit: string;
  count: number;
  availableUnitsForActivityType: string[];
};

export function groupMissingFactors(
  missingFactors: MissingFactorItem[] = [],
): MissingFactorGroup[] {
  const groups = new Map<string, MissingFactorGroup>();

  missingFactors.forEach((item) => {
    const activityType = String(item.activityType || 'UNKNOWN').toUpperCase();
    const unit = String(item.unit || '-');
    const key = `${activityType}:${unit.toLowerCase()}`;
    const existing = groups.get(key) ?? {
      activityType,
      unit,
      count: 0,
      availableUnitsForActivityType: [],
    };

    existing.count += 1;
    item.availableUnitsForActivityType?.forEach((unit) => {
      if (!existing.availableUnitsForActivityType.includes(unit)) {
        existing.availableUnitsForActivityType.push(unit);
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
      totalValue: String(item.total),
      category: 'input',
      activityType: item.activityType,
    });
  });

  if (Number(usageTotals.electricity) > 0) {
    rows.push({
      metricType: 'Electricity',
      unit: usageTotals.electricityUnitLabel,
      totalValue: String(usageTotals.electricity),
      category: 'input',
      activityType: 'ELECTRICITY',
    });
  }

  rows.push({
    metricType: 'Carbon Emissions',
    unit: 'kgCO2e',
    totalValue: String(totalEstimatedEmissionsKgCO2e),
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
  emptyMessage = 'No metrics yet. Import activity records or load sample data to preview a report-ready summary.',
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
  const calculatedFromLine = buildCalculatedFromLine(firstCalculatedDetail);
  const missingFactorGroups = groupMissingFactors(missingFactors);
  const skippedReasons = countSummary.skippedReasons ?? {
    missingFactor: countSummary.missingFactorRecords,
    outsideDateRange: 0,
    outsideScope: 0,
    invalidData: Math.max(
      0,
      countSummary.skippedRecords - countSummary.missingFactorRecords,
    ),
  };

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

  return (
    <>
      <div style={gridStyle}>
        <MetricCard
          title="Fuel Usage"
          value={formatFuelUsageBreakdown(usageTotals.fuelUsageBreakdown)}
          icon="⛽"
          color="#f59e0b"
          loading={isLoading}
        />

        <MetricCard
          title="Electricity"
          value={formatActivityUsageValue(
            usageTotals.electricity,
            usageTotals.electricityUnitLabel,
          )}
          icon="⚡"
          color="#3b82f6"
          loading={isLoading}
        />

        <MetricCard
          title="CO₂ Emissions"
          value={`${totalEstimatedEmissionsKgCO2e} kg CO2e`}
          icon="🌱"
          color="#10b981"
          highlight
          loading={isLoading}
          traceText={calculatedFromLine ? `Calculated from: ${calculatedFromLine}` : undefined}
        />

        <MetricCard
          title="Records Included in Summary"
          value={String(countSummary.processedRecords)}
          icon="📄"
          color="#64748b"
          loading={isLoading}
        />
      </div>

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

      {missingFactorGroups.length > 0 ? (
        <div style={warningStyle}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>
            Some records were skipped because no matching conversion factor was found.
          </div>
          <div style={{ marginBottom: 10 }}>
            Add a factor to include them in emissions calculations.
          </div>
          <div style={missingFactorListStyle}>
            {missingFactorGroups.map((group) => (
              <div key={`${group.activityType}-${group.unit}`} style={missingFactorRowStyle}>
                <div style={missingFactorTextStyle}>
                  <div>
                    <strong>{group.activityType} / {group.unit}</strong>
                    {' — '}
                    {group.count} {group.count === 1 ? 'record' : 'records'}
                  </div>
                  {group.availableUnitsForActivityType.length > 0 ? (
                    <div style={missingFactorHintStyle}>
                      A factor exists for {group.activityType} / {group.availableUnitsForActivityType.join(', ')}.
                      You may create a custom factor for {group.activityType} / {group.unit} or convert {group.unit} to {group.availableUnitsForActivityType[0]} before import.
                      {getUnitMismatchDensityHint(group) ? (
                        <div>{getUnitMismatchDensityHint(group)}</div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => handleCreateFactor(group)}
                  style={createFactorButtonStyle}
                >
                  Create Factor
                </button>
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
                  {emptyMessage}
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
        <details style={sourceDetailsStyle}>
          <summary style={sourceDetailsSummaryStyle}>Source references used in summary</summary>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={thStyle}>Activity Type</th>
                <th style={thStyle}>Quantity</th>
                <th style={thStyle}>Source File</th>
                <th style={thStyle}>Source Reference</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {calculationDetails.map((detail) => (
                <tr key={detail.activityDataId}>
                  <td style={tdStyle}>{detail.activityType}</td>
                  <td style={tdStyle}>{detail.activityQuantity} {detail.activityUnit}</td>
                  <td style={tdStyle}>
                    {detail.sourceFileName || (detail.sourceType === 'MANUAL' ? 'Manual entry' : 'Source not specified')}
                  </td>
                  <td style={tdStyle}>{formatCalculationSourceReference(detail)}</td>
                  <td style={tdStyle}>{detail.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      ) : null}
    </>
  );
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
    { label: 'Missing conversion factors', count: skippedReasons.missingFactor },
    { label: 'Outside selected date range', count: skippedReasons.outsideDateRange },
    { label: 'Outside selected report scope', count: skippedReasons.outsideScope },
    { label: 'Invalid data', count: skippedReasons.invalidData },
  ].filter((reason) => reason.count > 0);
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
}: {
  title: string;
  value: React.ReactNode;
  icon: string;
  color: string;
  highlight?: boolean;
  loading?: boolean;
  traceText?: string;
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
        <div style={traceTextStyle}>{traceText}</div>
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

const traceTextStyle: React.CSSProperties = {
  marginTop: 10,
  paddingTop: 10,
  borderTop: '1px solid #dcfce7',
  color: '#166534',
  fontSize: 12,
  lineHeight: 1.45,
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
