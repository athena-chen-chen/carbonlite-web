import type { DocumentItem } from '../inputData.types';
import {
  secondaryButtonStyle,
  modalBackdropStyle,
  documentDetailsModalStyle,
  documentDetailsHeaderStyle,
  documentDetailsTitleStyle,
  documentDetailsSubtitleStyle,
  modalCloseButtonStyle,
  documentDetailsGridStyle,
  documentMetadataFieldStyle,
  documentMetadataLabelStyle,
  documentMetadataValueStyle,
  modalActionRowStyle,
} from '../../UploadPage.styles';

type DocumentDetailsDialogProps = {
  document: DocumentItem;
  metadata: { label: string; value: string }[];
  onClose: () => void;
};

export function DocumentDetailsDialog({ document, metadata, onClose }: DocumentDetailsDialogProps) {
  return (
    <div style={modalBackdropStyle} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-details-title"
        style={documentDetailsModalStyle}
      >
        <div style={documentDetailsHeaderStyle}>
          <div>
            <h2 id="document-details-title" style={documentDetailsTitleStyle}>
              Document Details
            </h2>
            <p style={documentDetailsSubtitleStyle}>
              Metadata for {document.fileName}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close document details"
            onClick={onClose}
            style={modalCloseButtonStyle}
          >
            ×
          </button>
        </div>

        <dl style={documentDetailsGridStyle}>
          {metadata.map(({ label, value }) => (
            <DocumentMetadataField key={label} label={label} value={value} />
          ))}
        </dl>

        <div style={modalActionRowStyle}>
          <button
            type="button"
            onClick={onClose}
            style={secondaryButtonStyle}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DocumentMetadataField({ label, value }: { label: string; value: string }) {
  return (
    <div style={documentMetadataFieldStyle}>
      <dt style={documentMetadataLabelStyle}>{label}</dt>
      <dd style={documentMetadataValueStyle}>{value}</dd>
    </div>
  );
}

export function formatDocumentMetadataValue(value?: string | number | null) {
  if (value === undefined || value === null || value === '') return '-';
  return String(value);
}
