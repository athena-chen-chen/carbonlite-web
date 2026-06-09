import { apiFetch } from './api';
import { track } from './analytics.service';

export type ParsedActivity = {
  activityType: string;
  recordDate: string | null;
  quantity: number;
  unit: string;
  sourceType?: string | null;
  sourceReference?: string | null;
  sourceDocumentId?: string | null;
  sourceFileName?: string | null;
  dateEstimated?: boolean;
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
  track('EXTRACTION_STARTED', {
    documentCount: 1,
  });

  try {
    const response = await apiFetch<ExtractResponse>('/document-extraction/extract', {
      method: 'POST',
      body: JSON.stringify({ documentId }),
    });

    if (response.extractedRowCount > 0) {
      track('EXTRACTION_SUCCEEDED', {
        recordCount: response.extractedRowCount,
      });
    } else {
      track('EXTRACTION_FAILED', {
        reason: 'NO_DATA_FOUND',
        recordCount: 0,
      });
    }

    return response;
  } catch (error) {
    track('EXTRACTION_FAILED', {
      reason: 'REQUEST_FAILED',
    });
    throw error;
  }
}

export async function confirmDocumentImport(
  documentId: string,
  activities: ParsedActivity[],
) {
  const response = await apiFetch<ConfirmImportResponse>('/document-extraction/confirm', {
    method: 'POST',
    body: JSON.stringify({
      documentId,
      activities,
    }),
  });

  if (response.count > 0) {
    track('ACTIVITY_RECORD_CREATED', {
      source: 'document_import',
      recordCount: response.count,
    });
  }

  return response;
}
