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

export async function uploadDocument(input: UploadDocumentInput) {
  const formData = new FormData();
  formData.append('file', input.file);
  formData.append('type', input.type);

  return apiFetch<DocumentItem>('/documents/upload', {
    method: 'POST',
    body: formData,
  });
}

export async function getDocuments() {
  return apiFetch<DocumentListResponse>('/documents');
}
