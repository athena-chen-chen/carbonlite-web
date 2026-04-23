import { apiFetch } from './api';

export type UploadDocumentInput = {
  file: File;
  type: string;
};

export type DocumentItem = {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string | null;
  fileSize?: number | null;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type DocumentListResponse = {
  items: DocumentItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const API_BASE_URL = 'http://localhost:3333/api';

export async function uploadDocument(input: UploadDocumentInput) {
  const formData = new FormData();
  formData.append('file', input.file);
  formData.append('type', input.type);

  const response = await fetch(`${API_BASE_URL}/documents/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API ${response.status}: ${text}`);
  }

  return response.json() as Promise<DocumentItem>;
}

export async function getDocuments() {
  return apiFetch<DocumentListResponse>('/documents');
}