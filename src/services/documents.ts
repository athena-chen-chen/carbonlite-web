import { apiFetch } from './api';
import { demoDocuments, isDemoMode } from '../demo/demoData';

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
  if (isDemoMode()) {
    return {
      id: `demo-upload-${Date.now()}`,
      fileName: input.file.name,
      fileUrl: '#demo-upload',
      mimeType: input.file.type,
      fileSize: input.file.size,
      type: input.type,
      status: 'UPLOADED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const formData = new FormData();
  formData.append('file', input.file);
  formData.append('type', input.type);

  return apiFetch<DocumentItem>('/documents/upload', {
    method: 'POST',
    body: formData,
  });
}

export async function getDocuments() {
  if (isDemoMode()) {
    return {
      items: demoDocuments,
      page: 1,
      pageSize: demoDocuments.length,
      total: demoDocuments.length,
      totalPages: 1,
    };
  }

  return apiFetch<DocumentListResponse>('/documents');
}

export async function deleteDocument(id: string) {
  if (isDemoMode()) return;

  try {
    return await apiFetch<void>(`/documents/${id}`, {
      method: 'DELETE',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';

    if (/api 403/i.test(message)) {
      throw new Error('You can only delete your own uploaded documents.');
    }

    throw new Error('Document deletion failed. Please try again.');
  }
}
