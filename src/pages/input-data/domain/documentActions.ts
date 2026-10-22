import {
  type DocumentActionConfig,
  type DocumentActionModel,
  type DocumentItem,
} from '../inputData.types';

export const FILE_MISSING_TOOLTIP =
  'The original uploaded file is no longer available. Please upload it again.';

export function normalizeDocumentStatus(status: string) {
  return String(status || '').toUpperCase();
}

export function isMissingFileStatus(status: string) {
  return ['FILE_MISSING', 'REUPLOAD_REQUIRED'].includes(normalizeDocumentStatus(status));
}

export function getDocumentStatusLabel(status: string) {
  const normalized = normalizeDocumentStatus(status);

  if (normalized === 'IMPORTED') return 'Imported';
  if (['PROCESSED', 'EXTRACTED', 'REVIEW_REQUIRED'].includes(normalized)) {
    return 'Ready for Review';
  }
  if (isMissingFileStatus(normalized)) return 'Re-upload Required';
  if (['FAILED', 'EXTRACTION_FAILED', 'NO_DATA_FOUND'].includes(normalized)) {
    return 'Needs Attention';
  }

  return 'Uploaded';
}

export function hasImportedRecords(doc: Pick<DocumentItem, 'importedRecordCount'>) {
  return Number(doc.importedRecordCount ?? 0) > 0;
}

export function isImportedDocument(doc: Pick<DocumentItem, 'status' | 'importedAt' | 'importBatchId' | 'importedRecordCount'>) {
  return (
    normalizeDocumentStatus(doc.status) === 'IMPORTED' ||
    Boolean(doc.importedAt) ||
    Boolean(doc.importBatchId) ||
    Number(doc.importedRecordCount ?? 0) > 0
  );
}

export function getDocumentActionModel(input: {
  status: string;
  sourceType?: string | null;
  canImport?: boolean;
  hasPreview?: boolean;
  isExtracting?: boolean;
  isImporting?: boolean;
  isGeneratingMetrics?: boolean;
  isViewing?: boolean;
  isDeleting?: boolean;
}): DocumentActionModel {
  const status = normalizeDocumentStatus(input.status);
  const sourceType = String(input.sourceType ?? '').trim().toUpperCase();
  const isSpreadsheetSource = sourceType === 'SPREADSHEET';
  const viewDetailsAction: DocumentActionConfig = {
    kind: 'viewDetails',
    label: 'View Details',
  };
  const downloadSourceAction: DocumentActionConfig = {
    kind: 'downloadSource',
    label: input.isViewing ? 'Opening source file...' : 'Download Source File',
    disabled: input.isViewing,
  };
  const deleteAction: DocumentActionConfig = {
    kind: 'delete',
    label: input.isDeleting ? 'Deleting...' : 'Delete Source Document',
    disabled: input.isDeleting,
    danger: true,
    separatorBefore: true,
  };

  if (input.isExtracting) {
    return {
      statusLabel: getDocumentStatusLabel(status),
      primaryAction: { kind: 'extract', label: 'Extracting...', disabled: true },
      menuActions: [viewDetailsAction, downloadSourceAction, deleteAction],
    };
  }

  if (input.isImporting || input.isGeneratingMetrics) {
    return {
      statusLabel: getDocumentStatusLabel(status),
      primaryAction: {
        kind: 'import',
        label: input.isGeneratingMetrics ? 'Generating...' : 'Importing...',
        disabled: true,
      },
      menuActions: [viewDetailsAction, downloadSourceAction, deleteAction],
    };
  }

  if (status === 'IMPORTED') {
    return {
      statusLabel: 'Imported',
      primaryAction: {
        kind: 'viewRecords',
        label: 'View Imported Records',
      },
      menuActions: [viewDetailsAction, downloadSourceAction, deleteAction],
    };
  }

  if (['FAILED', 'EXTRACTION_FAILED', 'NO_DATA_FOUND'].includes(status)) {
    return {
      statusLabel: 'Needs Attention',
      primaryAction: {
        kind: 'reextract',
        label: 'Retry Extraction',
        title: 'Run extraction again',
      },
      menuActions: [deleteAction],
    };
  }

  if (isMissingFileStatus(status)) {
    return {
      statusLabel: 'Re-upload Required',
      primaryAction: {
        kind: 'uploadAgain',
        label: 'Upload Again',
        title: FILE_MISSING_TOOLTIP,
      },
      menuActions: [deleteAction],
    };
  }

  if (['PROCESSED', 'EXTRACTED', 'REVIEW_REQUIRED'].includes(status)) {
    return {
      statusLabel: isSpreadsheetSource && status === 'REVIEW_REQUIRED'
        ? 'Needs Review'
        : 'Ready for Review',
      primaryAction: {
        kind: 'preview',
        label: 'Review Rows',
        disabled: !input.hasPreview,
        title: input.hasPreview
          ? 'Review extracted rows from this document'
          : 'No extraction preview is available. Use Re-extract to generate a new preview.',
      },
      menuActions: [
        viewDetailsAction,
        downloadSourceAction,
        ...(input.canImport
          ? [{ kind: 'import', label: 'Import' } satisfies DocumentActionConfig]
          : []),
        {
          kind: 'reextract',
          label: 'Re-extract',
          title: 'Run extraction again',
        },
        deleteAction,
      ],
    };
  }

  return {
    statusLabel: 'Uploaded',
    primaryAction: {
      kind: 'extract',
      label: 'Extract',
    },
    menuActions: [viewDetailsAction, downloadSourceAction, deleteAction],
  };
}
