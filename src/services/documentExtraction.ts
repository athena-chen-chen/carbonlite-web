import { ApiError, apiFetch } from './api';
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
  importBatchId?: string | null;
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
  importBatchId?: string;
  alreadyImported?: boolean;
};

export class DuplicateDocumentImportError extends Error {
  constructor() {
    super('This document has already been imported.');
    this.name = 'DuplicateDocumentImportError';
  }
}

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
  importBatchId?: string,
) {
  try {
    const response = await apiFetch<ConfirmImportResponse>('/document-extraction/confirm', {
      method: 'POST',
      body: JSON.stringify({
        documentId,
        importBatchId,
        activities,
      }),
    });

    if (response.alreadyImported) {
      throw new DuplicateDocumentImportError();
    }

    if (response.count > 0) {
      track('ACTIVITY_RECORD_CREATED', {
        source: 'document_import',
        recordCount: response.count,
      });
    }

    return response;
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status === 409 &&
      /already been imported|duplicate import/i.test(error.message)
    ) {
      throw new DuplicateDocumentImportError();
    }

    throw error;
  }
}
