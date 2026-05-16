import { apiFetch } from './api';
import { demoParsedActivities, isDemoMode } from '../demo/demoData';

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
  if (isDemoMode()) {
    return {
      documentId,
      status: 'REVIEW_REQUIRED',
      parsedActivities: demoParsedActivities,
      sourceRowCount: demoParsedActivities.length,
      extractedRowCount: demoParsedActivities.length,
      possibleMissingRows: 0,
      warning: null,
    };
  }

  return apiFetch<ExtractResponse>('/document-extraction/extract', {
    method: 'POST',
    body: JSON.stringify({ documentId }),
  });
}

export async function confirmDocumentImport(
  documentId: string,
  activities: ParsedActivity[],
) {
  if (isDemoMode()) {
    return {
      count: activities.length,
      createdIds: activities.map((_, index) => `${documentId}-activity-${index + 1}`),
    };
  }

  return apiFetch<ConfirmImportResponse>('/document-extraction/confirm', {
    method: 'POST',
    body: JSON.stringify({
      documentId,
      activities,
    }),
  });
}
