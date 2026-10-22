import type { Ref } from 'react';
import type { DocumentItem } from '../inputData.types';
import { DocumentTable, type DocumentTableProps } from './DocumentTable';
import {
  sectionCardStyle,
  uploadedDocumentsHeaderStyle,
  selectedDocumentsActionWrapStyle,
  selectedDocumentsReportButtonStyle,
  selectedDocumentsActionHelpStyle,
  emptyStateStyle,
  missingFileNoticeStyle,
  documentToggleRowStyle,
  secondaryButtonStyle,
} from '../../UploadPage.styles';

type ReviewDataSectionProps = Omit<DocumentTableProps, 'documents'> & {
  loading: boolean;
  hasLoaded?: boolean;
  loadError?: string | null;
  total?: number;
  onRetryDocuments?: () => void;
  documents: DocumentItem[];
  visibleDocuments: DocumentItem[];
  hasMissingFiles: boolean;
  selectedDocumentsActionLabel: string;
  selectedDocumentsActionDisabled: boolean;
  selectedDocumentsActionHelp: string;
  showAllDocuments: boolean;
  lastSavedSpreadsheetDocumentId: string | null;
  lastConfirmDocumentId: string | null;
  reviewSectionRef: Ref<HTMLDivElement>;
  reviewHeadingRef: Ref<HTMLHeadingElement>;
  fileMissingExplanation: string;
  onSelectedDocumentsAction: () => void;
  onToggleShowAllDocuments: () => void;
};

export function ReviewDataSection({
  loading,
  hasLoaded = true,
  loadError = null,
  onRetryDocuments,
  documents,
  total = documents.length,
  visibleDocuments,
  hasMissingFiles,
  selectedDocumentsActionLabel,
  selectedDocumentsActionDisabled,
  selectedDocumentsActionHelp,
  showAllDocuments,
  lastSavedSpreadsheetDocumentId,
  lastConfirmDocumentId,
  reviewSectionRef,
  reviewHeadingRef,
  fileMissingExplanation,
  onSelectedDocumentsAction,
  onToggleShowAllDocuments,
  ...tableProps
}: ReviewDataSectionProps) {
  const { selectedDocumentIds } = tableProps;

  return (
    <>
      <div id="review" ref={reviewSectionRef} style={sectionCardStyle}>
        <div style={uploadedDocumentsHeaderStyle}>
          <div>
            <h2 ref={reviewHeadingRef} tabIndex={-1} style={{ margin: 0, fontSize: 18 }}>
              Review Data
            </h2>
            <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 14 }}>
              Select imported data to view calculation results.
            </p>
            {lastSavedSpreadsheetDocumentId || lastConfirmDocumentId ? (
              <p style={{ margin: '6px 0 0', color: '#334155', fontSize: 12 }}>
                Save All documentId: {lastSavedSpreadsheetDocumentId ?? '-'} · Confirm documentId: {lastConfirmDocumentId ?? '-'}
              </p>
            ) : null}
          </div>
          <div style={selectedDocumentsActionWrapStyle}>
            <button
              type="button"
              onClick={onSelectedDocumentsAction}
              disabled={selectedDocumentsActionDisabled}
              title={selectedDocumentsActionHelp}
              style={selectedDocumentsReportButtonStyle(
                selectedDocumentIds.length,
                selectedDocumentsActionDisabled,
              )}
            >
              {selectedDocumentsActionLabel}
            </button>
            {selectedDocumentsActionHelp ? (
              <div style={selectedDocumentsActionHelpStyle}>
                {selectedDocumentsActionHelp}
              </div>
            ) : null}
          </div>
        </div>

        {loading || (!hasLoaded && !loadError) ? (
          <div style={{ padding: 16 }}>
            <strong>Loading input sources...</strong>
            <div style={{ marginTop: 8, color: '#64748b' }}>
              Preparing uploaded files, spreadsheet imports, and status.
            </div>
          </div>
        ) : loadError ? (
          <div role="alert" style={{ padding: 16 }}>
            <strong>Input sources could not be fully loaded.</strong>
            <p>{loadError}</p>
            <button type="button" onClick={onRetryDocuments} style={secondaryButtonStyle}>
              Retry loading input sources
            </button>
          </div>
        ) : documents.length === 0 ? (
          <div style={emptyStateStyle}>
            <strong>No data sources to review yet.</strong>
            <p style={{ margin: '8px 0 0', color: '#64748b' }}>
              Upload documents or import a spreadsheet to create reviewable activity data.
            </p>
          </div>
        ) : (
          <>
          {hasMissingFiles ? (
            <div style={missingFileNoticeStyle}>
              {fileMissingExplanation}
            </div>
          ) : null}
          <DocumentTable {...tableProps} documents={visibleDocuments} />
          </>
        )}
      </div>

      {hasLoaded && !loading && !loadError && total > 3 ? (
        <div style={documentToggleRowStyle}>
          <button
            type="button"
            onClick={onToggleShowAllDocuments}
            style={secondaryButtonStyle}
          >
            {showAllDocuments ? 'Collapse document list' : `Expand document list (${total})`}
          </button>
        </div>
      ) : null}
    </>
  );
}
