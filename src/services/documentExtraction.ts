const API_BASE_URL = 'http://localhost:3333/api';

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
  const response = await fetch(`${API_BASE_URL}/document-extraction/extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ documentId }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API ${response.status}: ${text}`);
  }

  return response.json() as Promise<ExtractResponse>;
}

export async function confirmDocumentImport(
  documentId: string,
  activities: ParsedActivity[],
) {
  const response = await fetch(`${API_BASE_URL}/document-extraction/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      documentId,
      activities,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API ${response.status}: ${text}`);
  }

  return response.json() as Promise<ConfirmImportResponse>;
}