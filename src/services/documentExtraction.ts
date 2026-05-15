import { apiFetch } from './api';

export type ParsedActivity = {
  activityType: string;
  recordDate: string;
  quantity: number;
  unit: string;
  sourceReference?: string | null;
  notes?: string | null;
};

export type ExtractResponse = {
  documentId: string;
  status: string;
  openaiFileId?: string;
  parsedActivities: ParsedActivity[];
    sourceRowCount:number;
  extractedRowCount:number;
  possibleMissingRows:number;
  warning:string|null;
};

export type ConfirmImportResponse = {
  count: number;
  createdIds: string[];
};

export async function extractDocument(documentId: string) {
  return apiFetch<ExtractResponse>('/document-extraction/extract', {
    method: 'POST',
    body: JSON.stringify({ documentId }),
  });
}

export async function confirmDocumentImport(
  documentId: string,
  activities: ParsedActivity[],
) {
  return apiFetch<ConfirmImportResponse>('/document-extraction/confirm', {
    method: 'POST',
    body: JSON.stringify({
      documentId,
      activities,
    }),
  });
}
