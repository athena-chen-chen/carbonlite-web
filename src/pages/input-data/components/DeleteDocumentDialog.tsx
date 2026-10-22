import {
  secondaryActionButtonStyle,
  dangerButtonStyle,
  modalBackdropStyle,
  modalStyle,
  warningTextStyle,
  modalActionRowStyle,
} from '../../UploadPage.styles';

type DeleteDocumentDialogProps = {
  isImported: boolean;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteDocumentDialog({ isImported, deleting, onCancel, onConfirm }: DeleteDocumentDialogProps) {
  return (
    <div style={modalBackdropStyle} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-document-title"
        style={modalStyle}
      >
        <h2 id="delete-document-title" style={{ marginTop: 0 }}>
          Delete source document?
        </h2>
        {isImported ? (
          <>
            <p style={{ color: '#475569', lineHeight: 1.6 }}>
              This source document has already been imported.
            </p>
            <p style={warningTextStyle}>
              Deleting/removing the source document from Review Data will NOT delete the imported Activity Records.
            </p>
          </>
        ) : (
          <>
            <p style={{ color: '#475569', lineHeight: 1.6 }}>
              This will remove the uploaded file and its extracted review rows.
            </p>
            <p style={warningTextStyle}>
              This action cannot be undone.
            </p>
          </>
        )}
        <div style={modalActionRowStyle}>
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            style={secondaryActionButtonStyle(deleting)}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            style={dangerButtonStyle(deleting)}
          >
            {deleting
              ? 'Deleting...'
              : isImported
                ? 'Delete Source Document'
                : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
