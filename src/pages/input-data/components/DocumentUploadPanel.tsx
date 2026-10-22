import type { ChangeEvent, DragEvent, Ref } from 'react';
import {
  uploadCardStyle,
  uploadDropzoneStyle,
  fileInfoStyle,
  selectedFileListStyle,
  uploadWorkflowStyle,
  uploadWorkflowStepStyle,
  uploadWorkflowNumberStyle,
  uploadActionStackStyle,
  primaryButtonStyle,
} from '../../UploadPage.styles';

type DocumentUploadPanelProps = {
  selectedFiles: File[];
  isDraggingUpload: boolean;
  isProcessing: boolean;
  canUploadData: boolean;
  uploadAccept: string;
  uploadExtractInProgress: boolean;
  fileInputRef: Ref<HTMLInputElement>;
  uploadDisabledReason?: string;
  onChooseFiles: () => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDragEnter: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onUploadAndExtract: () => void | Promise<void>;
};

export function DocumentUploadPanel({
  selectedFiles,
  isDraggingUpload,
  isProcessing,
  canUploadData,
  uploadAccept,
  uploadExtractInProgress,
  fileInputRef,
  uploadDisabledReason,
  onChooseFiles,
  onFileChange,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  onUploadAndExtract,
}: DocumentUploadPanelProps) {
  return (
    <div style={uploadCardStyle}>
      <h2 style={{ marginTop: 0 }}>Upload Documents</h2>
      <p style={{ color: '#666' }}>
        Upload utility bills, fuel invoices, water bills, travel documents, hotel invoices, or operational PDFs.
      </p>

      <div style={{ display: 'grid', gap: 16, maxWidth: 700 }}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            if (!isProcessing && canUploadData) onChooseFiles();
          }}
          onKeyDown={(event) => {
            if (isProcessing || !canUploadData) return;
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onChooseFiles();
            }
          }}
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          aria-disabled={isProcessing || !canUploadData}
          title={!canUploadData ? uploadDisabledReason : undefined}
          style={uploadDropzoneStyle(isDraggingUpload, isProcessing || !canUploadData)}
        >
          <strong>
            {isDraggingUpload ? 'Drop files here' : 'Drop files here or choose files'}
          </strong>
          <span style={{ color: '#666' }}>
            Supported files: PDF, CSV, XLS, XLSX, JSON, JPG, JPEG, PNG. Max 10 MB.
          </span>
        </div>

         <input
          ref={fileInputRef}
          id="document-upload-input"
          type="file"
          onChange={onFileChange}
          accept={uploadAccept}
          style={{ display: 'none' }}
          multiple
        />

        {selectedFiles.length > 0 ? (
          <div style={fileInfoStyle}>
            <strong>
              Selected file{selectedFiles.length === 1 ? '' : 's'}:
            </strong>
            <ul style={selectedFileListStyle}>
              {selectedFiles.map((file) => (
                <li key={`${file.name}-${file.size}-${file.lastModified}`}>
                  {file.name} · {file.type || 'Unknown'} · {file.size} bytes
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div style={uploadWorkflowStyle} aria-label="Input Data local steps">
          {['Select source document', 'Extract activity data', 'Review parser results', 'Save rows for review'].map((step, index) => (
            <div key={step} style={uploadWorkflowStepStyle}>
              <span style={uploadWorkflowNumberStyle}>{index + 1}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>

        <div style={uploadActionStackStyle}>
          <button
            type="button"
            onClick={onUploadAndExtract}
            disabled={isProcessing || selectedFiles.length === 0 || !canUploadData}
            style={primaryButtonStyle(isProcessing || selectedFiles.length === 0 || !canUploadData)}
            title={
              !canUploadData
                ? uploadDisabledReason
                : selectedFiles.length === 0
                ? 'Select a document before extracting data.'
                : 'Upload the selected document and extract activity data.'
            }
          >
            {uploadExtractInProgress ? 'Extracting...' : 'Extract Data'}
          </button>
        </div>
      </div>
    </div>
  );
}
