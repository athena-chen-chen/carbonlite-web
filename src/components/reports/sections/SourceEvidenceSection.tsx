import { useState, type CSSProperties, type ReactNode } from 'react';
import {
  buildSourceEvidenceSummaryRows,
  type SourceEvidenceRow,
} from '../../FormalReportPreview';
import { getActivityTypeLabel } from '../../../utils/activityType';

type SourceEvidenceSectionProps = {
  sourceEvidenceRows: SourceEvidenceRow[];
};

export function SourceEvidenceSection({
  sourceEvidenceRows,
}: SourceEvidenceSectionProps) {
  const [showRecordLevelEvidence, setShowRecordLevelEvidence] = useState(false);
  const summaryRows = buildSourceEvidenceSummaryRows(sourceEvidenceRows);
  const includedCount = summaryRows.reduce((total, item) => total + item.includedRecords, 0);
  const trackedCount = summaryRows.reduce((total, item) => total + item.trackedMetrics, 0);
  const reviewCount = summaryRows.reduce((total, item) => total + item.recordsRequiringReview, 0);

  return (
    <div style={sectionGridStyle}>
      <p style={introStyle}>
        This section summarizes the source files and import methods used to create the activity records included in this pilot report. Detailed record-level source evidence is provided in the appendix.
      </p>
      <div style={summaryGridStyle}>
        <SummaryItem label="Source files" value={summaryRows.length} />
        <SummaryItem label="Included GHG records" value={includedCount} />
        <SummaryItem label="Tracked operational metrics" value={trackedCount} />
        <SummaryItem label="Records requiring review" value={reviewCount} />
      </div>
      <SimpleTable
        minWidth="900px"
        headers={[
          'Source File',
          'Source Type',
          'Import Method',
          'Source Reference',
          'Included GHG Records',
          'Tracked Metrics',
          'Review Records',
        ]}
        emptyMessage="No source evidence available."
        rows={summaryRows.map((item) => [
          item.sourceFile,
          item.sourceType,
          item.importMethod,
          item.sourceReference,
          item.includedRecords,
          item.trackedMetrics,
          item.recordsRequiringReview,
        ])}
      />
      {trackedCount > 0 ? (
        <p style={trackedMetricNoteStyle}>
          Water is tracked as an operational metric and excluded from GHG emissions totals unless a reviewed water emissions factor is provided.
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => setShowRecordLevelEvidence((current) => !current)}
        style={expandButtonStyle}
      >
        {showRecordLevelEvidence ? 'Collapse Record-Level Source Evidence' : 'Expand Record-Level Source Evidence'}
      </button>

      {showRecordLevelEvidence ? (
        <SimpleTable
          minWidth="1280px"
          headers={[
            'Activity Type',
            'Quantity',
            'Unit',
            'Record Date',
            'Source File',
            'Source Type',
            'Import Method',
            'Source Reference',
            'Matching Status',
            'Report Treatment',
            'Review Note',
          ]}
          emptyMessage="No source evidence available."
          rows={sourceEvidenceRows.map((item) => [
            getActivityTypeLabel(item.activityType),
            item.quantity,
            item.unit,
            item.recordDate,
            item.sourceFile,
            item.sourceType,
            item.importMethod,
            item.sourceReference,
            item.matchingStatus,
            item.reportTreatment,
            item.notes || 'Source evidence requires review. The original file or source reference was not available.',
          ])}
        />
      ) : null}
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div style={summaryItemStyle}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SimpleTable({
  headers,
  rows,
  emptyMessage,
  minWidth = '1280px',
}: {
  headers: string[];
  rows: Array<Array<ReactNode>>;
  emptyMessage: string;
  minWidth?: string;
}) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ ...tableStyle, width: `max(100%, ${minWidth})` }}>
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
  borderCollapse: 'collapse',
};

const sectionGridStyle: CSSProperties = {
  display: 'grid',
  gap: 14,
};

const introStyle: CSSProperties = {
  margin: 0,
  color: '#475569',
  lineHeight: 1.6,
};

const summaryGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: 10,
};

const summaryItemStyle: CSSProperties = {
  display: 'grid',
  gap: 4,
  padding: 10,
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
  color: '#334155',
};

const trackedMetricNoteStyle: CSSProperties = {
  margin: 0,
  color: '#475569',
  fontSize: 13,
  lineHeight: 1.5,
};

const expandButtonStyle: CSSProperties = {
  justifySelf: 'start',
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  background: '#fff',
  color: '#0f172a',
  padding: '8px 12px',
  fontWeight: 800,
  cursor: 'pointer',
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
