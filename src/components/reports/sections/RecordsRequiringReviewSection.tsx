import type { CSSProperties, ReactNode } from 'react';
import type { CalculationAuditDetail } from '../../../services/metrics';
import {
  formatCalculationStatus,
  formatRecordSource,
} from '../../../utils/calculationTraceability';
import { formatDisplayNumber } from '../../../utils/numberFormatting';
import { getActivityTypeLabel } from '../../../utils/activityType';
import {
  getTrackedMetricAction,
  getTrackedMetricMessage,
  isRecordRequiringCorrection,
  isTrackedMetricDetail,
} from '../../../utils/reportCredibility';

type RecordsRequiringReviewSectionProps = {
  calculationDetails: CalculationAuditDetail[];
  formatRecordUnit: (unit?: string | number | null, detail?: Pick<CalculationAuditDetail, 'status'> | null) => string;
};

export function RecordsRequiringReviewSection({
  calculationDetails,
  formatRecordUnit,
}: RecordsRequiringReviewSectionProps) {
  const reviewRows = calculationDetails.filter(isRecordRequiringCorrection);
  const trackedMetricRows = calculationDetails.filter(isTrackedMetricDetail);

  return (
    <>
      <SimpleTable
        headers={['Activity', 'Quantity', 'Unit', 'Issue Type', 'Issue Message', 'Source Reference', 'Action']}
        emptyMessage="No records require review for this report scope."
        rows={reviewRows.map((item) => [
          getActivityTypeLabel(item.activityType),
          formatDisplayNumber(item.activityQuantity),
          formatRecordUnit(item.activityUnit, item),
          formatCalculationStatus(item.status),
          item.matchingMessage || item.reason || 'Review this record before calculation.',
          formatRecordSource(item),
          item.status === 'MISSING_FACTOR' ? 'Create factor' : 'Fix record',
        ])}
      />
      {trackedMetricRows.length ? (
        <div style={trackedMetricSectionStyle}>
          <h3 style={trackedMetricTitleStyle}>Tracked Metrics</h3>
          <SimpleTable
            headers={['Activity', 'Quantity', 'Unit', 'Status', 'Message', 'Source Reference', 'Action']}
            emptyMessage="No tracked-only operational metrics in this report scope."
            rows={trackedMetricRows.map((item) => [
              getActivityTypeLabel(item.activityType),
              formatDisplayNumber(item.activityQuantity),
              formatRecordUnit(item.activityUnit, item),
              'Tracked Metric',
              getTrackedMetricMessage(item),
              formatRecordSource(item),
              getTrackedMetricAction(),
            ])}
          />
        </div>
      ) : null}
    </>
  );
}

function SimpleTable({
  headers,
  rows,
  emptyMessage,
}: {
  headers: string[];
  rows: Array<Array<ReactNode>>;
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

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
};

const thStyle: CSSProperties = {
  padding: 10,
  textAlign: 'left',
  borderBottom: '1px solid #cbd5e1',
  background: '#f1f5f9',
  color: '#475569',
  fontSize: 12,
};

const tdStyle: CSSProperties = {
  padding: 10,
  borderBottom: '1px solid #e2e8f0',
  color: '#0f172a',
  fontSize: 13,
  verticalAlign: 'top',
};

const emptyStyle: CSSProperties = {
  padding: 14,
  color: '#64748b',
  textAlign: 'center',
};

const trackedMetricSectionStyle: CSSProperties = {
  marginTop: 18,
};

const trackedMetricTitleStyle: CSSProperties = {
  margin: '0 0 8px',
  color: '#0f172a',
  fontSize: 15,
};
