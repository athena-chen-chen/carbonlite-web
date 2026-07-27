import { ApiError, apiFetch } from './api';
import { track } from './analytics.service';
import { trackEvent } from './ga4.service';
import {
  canImportActivityRecords,
  getCurrentUser,
  getOrganizationId,
  requirePermission,
} from './auth';

export type UploadDocumentInput = {
  file: File;
  type: string;
  allowDuplicate?: boolean;
};

export type DocumentItem = {
  id: string;
  organizationId?: string | null;
  fileName: string;
  fileUrl: string;
  mimeType?: string | null;
  fileSize?: number | null;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  fileHash?: string | null;
  importedAt?: string | null;
  importBatchId?: string | null;
};

export type DuplicateDocumentInfo = {
  id: string;
  fileName: string;
  createdAt: string;
};

type UploadDocumentResponse =
  | DocumentItem
  | {
      duplicate: true;
      message?: string;
      existingDocument?: DuplicateDocumentInfo;
    };

export class DuplicateDocumentError extends Error {
  constructor(public readonly existingDocument?: DuplicateDocumentInfo) {
    super('This file appears to have already been uploaded.');
    this.name = 'DuplicateDocumentError';
  }
}

export type DocumentListResponse = {
  items: DocumentItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type DeleteDocumentResponse = {
  deletedDocument: boolean;
  deletedActivityRecords: number;
};

export async function uploadDocument(input: UploadDocumentInput) {
  requirePermission(canImportActivityRecords(getCurrentUser()));

  const formData = new FormData();
  formData.append('file', input.file);
  formData.append('type', input.type);
  try {
    formData.append('fileHash', await calculateFileSha256(input.file));
  } catch {
    // The backend always calculates the authoritative hash.
  }
  if (input.allowDuplicate) {
    formData.append('allowDuplicate', 'true');
  }

  try {
    const response = await apiFetch<UploadDocumentResponse>('/documents/upload', {
      method: 'POST',
      body: formData,
    });

    if ('duplicate' in response && response.duplicate) {
      throw new DuplicateDocumentError(response.existingDocument);
    }

    track('DOCUMENT_UPLOADED', {
      documentType: response.type,
      documentCount: 1,
    });
    trackEvent('DOCUMENT_UPLOADED', {
      document_type: response.type,
      document_count: 1,
    });

    return response;
  } catch (error) {
    if (error instanceof DuplicateDocumentError) throw error;

    if (error instanceof ApiError && error.status === 409) {
      const data =
        error.data && typeof error.data === 'object'
          ? (error.data as Record<string, any>)
          : {};
      throw new DuplicateDocumentError(
        data.existingDocument ?? data.duplicateDocument,
      );
    }

    throw error;
  }
}

export async function calculateFileSha256(file: File) {
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function getDocuments() {
  const response = await apiFetch<DocumentListResponse>('/documents');
  const organizationId = getOrganizationId(getCurrentUser());

  if (!organizationId) {
    return {
      ...response,
      items: [],
      total: 0,
      totalPages: 1,
    };
  }

  const hasOrganizationScopedItems = (response.items ?? []).some(
    (item) => 'organizationId' in item,
  );
  if (!hasOrganizationScopedItems) return response;

  const items = (response.items ?? []).filter(
    (item) => item.organizationId === organizationId,
  );

  return {
    ...response,
    items,
    total: Math.min(Number(response.total ?? items.length), items.length),
    totalPages: Math.max(
      1,
      Math.ceil(
        items.length /
          Math.max(1, Number(response.pageSize ?? (items.length || 1))),
      ),
    ),
  };
}

export async function deleteDocument(id: string) {
  requirePermission(canImportActivityRecords(getCurrentUser()));

  try {
    const response = await apiFetch<DeleteDocumentResponse | void>(`/documents/${id}`, {
      method: 'DELETE',
    });

    return response ?? {
      deletedDocument: true,
      deletedActivityRecords: 0,
    };
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) {
      throw new Error('You do not have permission to perform this action.');
    }

    throw new Error('Document deletion failed. Please try again.');
  }
}
