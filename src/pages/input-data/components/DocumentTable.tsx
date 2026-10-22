import type { CSSProperties, MutableRefObject } from 'react';
import type { DocumentItem, DocumentActionConfig, DocumentActionModel } from '../inputData.types';
import { hasImportedRecords, getDocumentStatusLabel } from '../domain/documentActions';
import { formatDocumentSourceTypeLabel } from '../domain/extractionNormalization';
import {
  inputReviewPalette,
  inputReviewTableWrapStyle,
  inputReviewTableStyle,
  inputReviewSelectColStyle,
  inputReviewFileNameColStyle,
  inputReviewTypeColStyle,
  inputReviewStatusColStyle,
  inputReviewSizeColStyle,
  inputReviewCreatedAtColStyle,
  inputReviewActionsColStyle,
  thStyle,
  tdStyle,
  inputReviewFileNameTdStyle,
  inputReviewTypeTdStyle,
  inputReviewStatusTdStyle,
  inputReviewCreatedAtTdStyle,
  documentActionTdStyle,
  documentActionRowCompactStyle,
  disabledActionWrapStyle,
  documentPrimaryActionButtonStyle,
  documentSecondaryActionButtonStyle,
  documentMenuWrapStyle,
  kebabButtonStyle,
} from '../../UploadPage.styles';

export type DocumentTableProps = {
  documents: DocumentItem[];
  selectedDocumentIds: string[];
  selectableVisibleDocuments: DocumentItem[];
  latestDocumentId: string | null;
  openDocumentMenuId: string | null;
  documentMenuButtonRefs: MutableRefObject<Record<string, HTMLButtonElement | null>>;
  getDocumentActionModelForDoc: (document: DocumentItem) => DocumentActionModel;
  handleDocumentAction: (document: DocumentItem, action: DocumentActionConfig) => void;
  toggleDocumentSelection: (documentId: string, checked: boolean) => void;
  toggleVisibleDocumentSelection: (checked: boolean) => void;
  toggleDocumentMenu: (documentId: string, button: HTMLButtonElement) => void;
  formatInputReviewRowCount?: (document: DocumentItem) => string;
  formatDocumentCreatedAt?: (value?: string | null) => string;
  documentStatusBadgeStyle?: (status: string) => CSSProperties;
  noImportedRecordsMessage?: string;
};

export function DocumentTable({
  documents,
  selectedDocumentIds,
  selectableVisibleDocuments,
  latestDocumentId,
  openDocumentMenuId,
  documentMenuButtonRefs,
  getDocumentActionModelForDoc,
  handleDocumentAction,
  toggleDocumentSelection,
  toggleVisibleDocumentSelection,
  toggleDocumentMenu,
  formatInputReviewRowCount = defaultFormatInputReviewRowCount,
  formatDocumentCreatedAt = defaultFormatDocumentCreatedAt,
  documentStatusBadgeStyle = defaultDocumentStatusBadgeStyle,
  noImportedRecordsMessage = 'No imported records are available for calculation results yet.',
}: DocumentTableProps) {
  return (
    <div style={inputReviewTableWrapStyle}>
    <table style={inputReviewTableStyle}>
      <colgroup>
        <col style={inputReviewSelectColStyle} />
        <col style={inputReviewFileNameColStyle} />
        <col style={inputReviewTypeColStyle} />
        <col style={inputReviewStatusColStyle} />
        <col style={inputReviewSizeColStyle} />
        <col style={inputReviewCreatedAtColStyle} />
        <col style={inputReviewActionsColStyle} />
      </colgroup>
      <thead>
        <tr style={{ background: '#fafafa' }}>
          <th style={thStyle}>
            <input
              type="checkbox"
              checked={
                selectableVisibleDocuments.length > 0 &&
                selectableVisibleDocuments.every((doc) => selectedDocumentIds.includes(doc.id))
              }
              onChange={(event) =>
                toggleVisibleDocumentSelection(event.target.checked)
              }
              disabled={selectableVisibleDocuments.length === 0}
              aria-label="Select visible documents"
            />
          </th>
          <th style={thStyle}>File Name</th>
          <th style={thStyle}>Type</th>
          <th style={thStyle}>Status</th>
          <th style={thStyle}>Rows</th>
          <th style={thStyle}>Created At</th>
          <th style={thStyle}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {documents.map((doc) => {
          const actionModel = getDocumentActionModelForDoc(doc);
          const primaryAction = actionModel.primaryAction;
          const directSecondaryAction =
            actionModel.menuActions.length === 1 ? actionModel.menuActions[0] : null;
          const shouldShowMenu = actionModel.menuActions.length > 1;

          return (
            <tr
              key={doc.id}
              style={doc.id === latestDocumentId ? { background: '#f0f7ff' } : undefined}
            >
              <td style={tdStyle}>
                <input
                  type="checkbox"
                  checked={hasImportedRecords(doc) && selectedDocumentIds.includes(doc.id)}
                  disabled={!hasImportedRecords(doc)}
                  title={!hasImportedRecords(doc) ? noImportedRecordsMessage : undefined}
                  aria-describedby={!hasImportedRecords(doc) ? `document-eligibility-${doc.id}` : undefined}
                  onChange={(event) =>
                    toggleDocumentSelection(doc.id, event.target.checked)
                  }
                  aria-label={`Select document ${doc.fileName}`}
                />
              </td>
              <td style={inputReviewFileNameTdStyle}>
                {doc.fileName}
                <div id={`document-eligibility-${doc.id}`} style={{ marginTop: 4, fontSize: 12, color: '#475569' }}>
                  {hasImportedRecords(doc) ? `${doc.importedRecordCount} imported records` : noImportedRecordsMessage}
                </div>
              </td>
              <td style={inputReviewTypeTdStyle}>
                {formatDocumentSourceTypeLabel({
                  fileName: doc.fileName,
                  type: doc.type,
                })}
              </td>
              <td style={inputReviewStatusTdStyle}>
                <span style={documentStatusBadgeStyle(doc.status)}>
                  {actionModel.statusLabel}
                </span>
              </td>
              <td style={tdStyle}>{formatInputReviewRowCount(doc)}</td>
              <td style={inputReviewCreatedAtTdStyle}>{formatDocumentCreatedAt(doc.createdAt)}</td>
              <td style={documentActionTdStyle}>
                <div style={documentActionRowCompactStyle}>
                  <span
                    title={primaryAction.title ?? primaryAction.label}
                    onClick={() => {
                      if (primaryAction.disabled) {
                        handleDocumentAction(doc, primaryAction);
                      }
                    }}
                    style={primaryAction.disabled ? disabledActionWrapStyle : undefined}
                  >
                    <button
                      type="button"
                      onClick={() => handleDocumentAction(doc, primaryAction)}
                      disabled={primaryAction.disabled}
                      title={primaryAction.title ?? primaryAction.label}
                      style={documentPrimaryActionButtonStyle(
                        Boolean(primaryAction.disabled),
                      )}
                    >
                      {primaryAction.label}
                    </button>
                  </span>

                  {directSecondaryAction ? (
                    <button
                      type="button"
                      onClick={() => handleDocumentAction(doc, directSecondaryAction)}
                      disabled={directSecondaryAction.disabled}
                      title={directSecondaryAction.title ?? directSecondaryAction.label}
                      style={documentSecondaryActionButtonStyle(
                        Boolean(directSecondaryAction.disabled),
                        Boolean(directSecondaryAction.danger),
                      )}
                    >
                      {directSecondaryAction.label}
                    </button>
                  ) : null}

                  {shouldShowMenu ? (
                    <div style={documentMenuWrapStyle}>
                    <button
                      ref={(element) => {
                        documentMenuButtonRefs.current[doc.id] = element;
                      }}
                      type="button"
                      aria-label={`Open document actions for ${doc.fileName}`}
                      aria-haspopup="menu"
                      aria-expanded={openDocumentMenuId === doc.id}
                      onClick={(event) =>
                        toggleDocumentMenu(doc.id, event.currentTarget)
                      }
                      style={kebabButtonStyle}
                    >
                      ⋮
                    </button>
                    </div>
                  ) : null}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
    </div>
  );
}

export function defaultFormatDocumentCreatedAt(value?: string | null) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function defaultFormatInputReviewRowCount(doc: DocumentItem) {
  const extracted = doc.extractedRowCount;
  const source = doc.sourceRowCount;

  if (typeof extracted === 'number' && typeof source === 'number' && source !== extracted) {
    return `${extracted}/${source}`;
  }

  if (typeof extracted === 'number') return String(extracted);
  if (typeof source === 'number') return String(source);
  return '-';
}

function defaultDocumentStatusBadgeStyle(status: string): React.CSSProperties {
  const label = getDocumentStatusLabel(status);
  const palette =
    label === 'Imported'
      ? { border: '#BBF7D0', background: inputReviewPalette.successBackground, color: inputReviewPalette.primaryGreen }
      : label === 'Ready for Review'
      ? { border: '#BBF7D0', background: inputReviewPalette.successBackground, color: inputReviewPalette.primaryGreen }
      : label === 'Needs Attention'
      ? { border: '#FDE68A', background: inputReviewPalette.warningBackground, color: inputReviewPalette.warningText }
      : label === 'Re-upload Required'
      ? { border: '#FECACA', background: inputReviewPalette.errorBackground, color: inputReviewPalette.errorText }
      : { border: inputReviewPalette.border, background: inputReviewPalette.subtleBackground, color: inputReviewPalette.infoText };

  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 8px',
    borderRadius: 999,
    border: `1px solid ${palette.border}`,
    background: palette.background,
    color: palette.color,
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: 'nowrap',
  };
}
