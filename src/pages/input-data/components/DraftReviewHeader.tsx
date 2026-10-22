import {
  previewHeaderStyle,
  importReviewCountsStyle,
  importSelectionHelpStyle,
  secondaryButtonStyle,
  confirmButtonStyle,
} from '../../UploadPage.styles';

export type DraftReviewHeaderProps = {
  extractedRowCount: number;
  readyImportableCount: number;
  trackedImportableCount: number;
  rowsRequiringReviewCount: number;
  alreadyImportedParsedActivitiesCount: number;
  detectedSourceItemCount: number;
  selectedImportableActivitiesCount: number;
  previewSourceSummary: string;
  canImportData: boolean;
  canConfirmImport: boolean;
  confirmingId: string | null;
  generatingMetrics: boolean;
  confirmDisabledReason: string | undefined;
  importSelectionSummary: string;
  selectAllParsedActivities: () => void;
  clearAllParsedActivities: () => void;
  addParsedActivity: () => void;
  onConfirmImport: () => void;
};

export function DraftReviewHeader({
  extractedRowCount,
  readyImportableCount,
  trackedImportableCount,
  rowsRequiringReviewCount,
  alreadyImportedParsedActivitiesCount,
  detectedSourceItemCount,
  selectedImportableActivitiesCount,
  previewSourceSummary,
  canImportData,
  canConfirmImport,
  confirmingId,
  generatingMetrics,
  confirmDisabledReason,
  importSelectionSummary,
  selectAllParsedActivities,
  clearAllParsedActivities,
  addParsedActivity,
  onConfirmImport,
}: DraftReviewHeaderProps) {
  return (
    <div style={previewHeaderStyle}>
      <div>
        <h2 style={{ margin: 0, fontSize: 20 }}>Draft Records Review</h2>
        <p style={{ marginTop: 8, color: '#666' }}>
          Review extracted activity records before saving them as Data Records.
        </p>
        <p style={{ marginTop: 8, color: '#047857', fontWeight: 600 }}>
          Extracted rows: {extractedRowCount}
        </p>
        <p style={importReviewCountsStyle}>
    Calculated: {readyImportableCount} · Tracked metrics: {trackedImportableCount} · Requires review: {rowsRequiringReviewCount} · Already imported: {alreadyImportedParsedActivitiesCount} · Detected source items: {detectedSourceItemCount} · Selected for import: {selectedImportableActivitiesCount}
        </p>
        <p style={{ marginTop: 8, color: '#999' }}>
          {previewSourceSummary}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={selectAllParsedActivities}
          disabled={!canImportData}
          style={secondaryButtonStyle}
        >
          Select All
        </button>

        <button
          type="button"
          onClick={clearAllParsedActivities}
          disabled={!canImportData}
          style={secondaryButtonStyle}
        >
          Clear All
        </button>

        <button
          type="button"
          onClick={addParsedActivity}
          disabled={!canImportData}
          style={secondaryButtonStyle}
        >
          Add Row
        </button>

        <button
          type="button"
          onClick={onConfirmImport}
          disabled={!canConfirmImport || !canImportData}
          aria-disabled={!canConfirmImport || !canImportData}
          title={confirmDisabledReason}
          style={confirmButtonStyle(canConfirmImport && canImportData)}
        >
          {generatingMetrics
            ? 'Generating metrics...'
            : confirmingId
            ? 'Importing...'
            : 'Confirm Import'}
        </button>
        {extractedRowCount > 0 ? (
          <div style={importSelectionHelpStyle}>
            {importSelectionSummary}
          </div>
        ) : null}
      </div>
    </div>
  );
}
