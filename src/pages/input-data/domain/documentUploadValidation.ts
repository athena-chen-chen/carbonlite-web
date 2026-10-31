export const DOCUMENT_UPLOAD_ACCEPT = '.pdf,.jpg,.jpeg,.png';

const DOCUMENT_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png']);
const SPREADSHEET_EXTENSIONS = new Set(['csv', 'xls', 'xlsx']);
const SPREADSHEET_MIME_TYPES = new Set([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);
const DOCUMENT_MIME_TYPES_BY_EXTENSION: Record<string, ReadonlySet<string>> = {
  pdf: new Set(['application/pdf']),
  jpg: new Set(['image/jpeg', 'image/jpg', 'image/pjpeg']),
  jpeg: new Set(['image/jpeg', 'image/jpg', 'image/pjpeg']),
  png: new Set(['image/png']),
};

export type DocumentUploadRejectionReason = 'spreadsheet' | 'unsupported';

export type DocumentUploadValidationResult =
  | { accepted: true }
  | { accepted: false; reason: DocumentUploadRejectionReason };

function normalizedExtension(fileName: string) {
  const extensionStart = fileName.lastIndexOf('.');
  return extensionStart >= 0 ? fileName.slice(extensionStart + 1).trim().toLowerCase() : '';
}

function normalizedMimeType(mimeType: string) {
  return mimeType.split(';', 1)[0].trim().toLowerCase();
}

export function validateDocumentUploadFile(file: File): DocumentUploadValidationResult {
  const extension = normalizedExtension(file.name);
  const mimeType = normalizedMimeType(file.type);

  if (SPREADSHEET_EXTENSIONS.has(extension) || SPREADSHEET_MIME_TYPES.has(mimeType)) {
    return { accepted: false, reason: 'spreadsheet' };
  }

  if (!DOCUMENT_EXTENSIONS.has(extension)) {
    return { accepted: false, reason: 'unsupported' };
  }

  if (mimeType && !DOCUMENT_MIME_TYPES_BY_EXTENSION[extension]?.has(mimeType)) {
    return { accepted: false, reason: 'unsupported' };
  }

  return { accepted: true };
}
