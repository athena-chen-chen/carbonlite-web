import type { CSSProperties } from 'react';

type ReportScope = 'dateRange' | 'selectedDocuments' | 'selectedRecords';

type ReportScopeSectionProps = {
  reportScope: ReportScope;
  selectedDocumentCount: number;
  selectedRecordCount: number;
  draftPeriodStart: string;
  draftPeriodEnd: string;
  loading: boolean;
  fullYearShortcutYears: number[];
  onReportScopeChange: (scope: ReportScope) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onCommitDateRange: () => void;
  onFullYear: (year: number) => void;
  styles: {
    filterCard: CSSProperties;
    label: CSSProperties;
    scopeToggle: CSSProperties;
    input: CSSProperties;
    secondaryButton: (disabled?: boolean) => CSSProperties;
    scopeButton: (active: boolean, disabled?: boolean) => CSSProperties;
  };
};

export function ReportScopeSection({
  reportScope,
  selectedDocumentCount,
  selectedRecordCount,
  draftPeriodStart,
  draftPeriodEnd,
  loading,
  fullYearShortcutYears,
  onReportScopeChange,
  onStartDateChange,
  onEndDateChange,
  onCommitDateRange,
  onFullYear,
  styles,
}: ReportScopeSectionProps) {
  return (
    <div style={styles.filterCard}>
      <div style={{ width: '100%' }}>
        <label style={styles.label}>Report Scope</label>
        <div style={styles.scopeToggle}>
          <button
            type="button"
            onClick={() => onReportScopeChange('dateRange')}
            style={styles.scopeButton(reportScope === 'dateRange')}
          >
            Date Range
          </button>
          <button
            type="button"
            onClick={() => {
              if (selectedDocumentCount) onReportScopeChange('selectedDocuments');
            }}
            disabled={!selectedDocumentCount}
            style={styles.scopeButton(reportScope === 'selectedDocuments', !selectedDocumentCount)}
          >
            Selected Documents
          </button>
          <button
            type="button"
            onClick={() => {
              if (selectedRecordCount) onReportScopeChange('selectedRecords');
            }}
            disabled={!selectedRecordCount}
            style={styles.scopeButton(reportScope === 'selectedRecords', !selectedRecordCount)}
          >
            Selected Records
          </button>
        </div>
      </div>

      <div>
        <label style={styles.label}>Start Date</label>
        <input
          type="date"
          value={draftPeriodStart}
          onChange={(event) => onStartDateChange(event.target.value)}
          onBlur={onCommitDateRange}
          style={styles.input}
          disabled={reportScope !== 'dateRange' || loading}
        />
      </div>

      <div>
        <label style={styles.label}>End Date</label>
        <input
          type="date"
          value={draftPeriodEnd}
          onChange={(event) => onEndDateChange(event.target.value)}
          onBlur={onCommitDateRange}
          style={styles.input}
          disabled={reportScope !== 'dateRange' || loading}
        />
      </div>

      {fullYearShortcutYears.map((year) => (
        <button
          key={year}
          type="button"
          onClick={() => onFullYear(year)}
          style={styles.secondaryButton(reportScope !== 'dateRange' || loading)}
          disabled={reportScope !== 'dateRange' || loading}
        >
          {year} Full Year
        </button>
      ))}
    </div>
  );
}
