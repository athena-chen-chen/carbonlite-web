import { useNavigate } from 'react-router-dom';
import {
  formatFuelUsageBreakdown,
  formatActivityUsageValue,
  formatActivityTypeLabel,
  type ActivityUsageTotals,
} from '../utils/activityAggregation';

export type MetricsCountSummary = {
  totalRecordsFound: number;
  processedRecords: number;
  skippedRecords: number;
  missingFactorRecords: number;
};

export type MetricsSummaryTableRow = {
  metricType: string;
  unit: string;
  totalValue: string;
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

  const rows: MetricsSummaryTableRow[] = [
    {
      metricType: 'Carbon Emissions',
      unit: 'kgCO2e',
      totalValue: String(totalEstimatedEmissionsKgCO2e),
    },
  ];

  usageTotals.fuelUsageBreakdown.forEach((item) => {
    rows.push({
      metricType: `Fuel Usage — ${formatActivityTypeLabel(item.activityType)}`,
      unit: item.unit,
      totalValue: String(item.total),
    });
  });

  if (Number(usageTotals.electricity) > 0) {
    rows.push({
      metricType: 'Electricity',
      unit: usageTotals.electricityUnitLabel,
      totalValue: String(usageTotals.electricity),
    });
  }

  return rows;
}

export function MetricsSummarySection({
  usageTotals,
  totalEstimatedEmissionsKgCO2e,
  countSummary,
  missingFactors = [],
  emptyMessage = 'No metrics yet. Import activity records or load sample data to preview a report-ready summary.',
}: {
  usageTotals: ActivityUsageTotals;
  totalEstimatedEmissionsKgCO2e: number;
  countSummary: MetricsCountSummary;
  missingFactors?: MissingFactorItem[];
  emptyMessage?: string;
}) {
  const navigate = useNavigate();
  const totalsByMetric = buildMetricsSummaryTableRows({
    usageTotals,
    totalEstimatedEmissionsKgCO2e,
    recordsIncluded: countSummary.processedRecords,
  });
  const missingFactorGroups = groupMissingFactors(missingFactors);

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
          value={formatFuelUsageBreakdown(
            usageTotals.fuelUsageBreakdown,
          )}
          icon="⛽"
          color="#f59e0b"
        />

        <MetricCard
          title="Electricity"
          value={formatActivityUsageValue(
            usageTotals.electricity,
            usageTotals.electricityUnitLabel,
          )}
          icon="⚡"
          color="#3b82f6"
        />

        <MetricCard
          title="CO₂ Emissions"
          value={`${totalEstimatedEmissionsKgCO2e} kg CO2e`}
          icon="🌱"
          color="#10b981"
          highlight
        />

        <MetricCard
          title="Records Included in Summary"
          value={String(countSummary.processedRecords)}
          icon="📄"
          color="#64748b"
        />
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
          <h2 style={{ margin: 0 }}>Totals by Metric</h2>
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
            {totalsByMetric.length === 0 ? (
              <tr>
                <td colSpan={3} style={tdStyle}>
                  {emptyMessage}
                </td>
              </tr>
            ) : null}
            {totalsByMetric.map((item) => (
              <tr key={`${item.metricType}-${item.unit}-${item.totalValue}`}>
                <td style={tdStyle}>{item.metricType}</td>
                <td style={tdStyle}>{item.unit}</td>
                <td style={tdStyle}>{item.totalValue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
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
}: {
  title: string;
  value: React.ReactNode;
  icon: string;
  color: string;
  highlight?: boolean;
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
        {value}
      </div>
    </div>
  );
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 20,
  marginBottom: 30,
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

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: 12,
  borderBottom: '1px solid #ddd',
};

const tdStyle: React.CSSProperties = {
  padding: 12,
  borderBottom: '1px solid #eee',
};
