export type ActivitySourceType = 'MANUAL' | 'IMPORT' | 'API' | 'DOCUMENT_AI';

export function getActivitySourceType(source?: string | null): ActivitySourceType {
  const normalized = String(source ?? '').trim().toUpperCase();

  if (['CSV', 'EXCEL', 'XLS', 'XLSX', 'PASTE', 'SPREADSHEET', 'IMPORT'].includes(normalized)) {
    return 'IMPORT';
  }

  if (['DOCUMENT_AI', 'AI_EXTRACTION', 'DOCUMENT', 'OCR', 'UPLOAD'].includes(normalized)) {
    return 'DOCUMENT_AI';
  }

  if (normalized === 'API') return 'API';

  return 'MANUAL';
}
