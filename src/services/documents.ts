import { ApiError, apiFetch } from './api';
import { track } from './analytics.service';
import { trackEvent } from './ga4.service';
import {
  canImportDraftRows,
  canUploadFiles,
  requirePermission,
} from '../utils/permissions';
import {
  getCurrentUser,
  getOrganizationId,
} from './auth';

export type UploadDocumentInput = {
  file: File;
  type: string;
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
  sourceRowCount?: number | null;
  extractedRowCount?: number | null;
  importedRecordCount?: number | null;
};

export type DuplicateDocumentInfo = {
  id: string;
  fileName: string;
  createdAt: string;
  fileHash?: string | null;
};

type UploadDocumentResponse =
  | DocumentItem
  | {
      duplicate: true;
      existingDocumentId?: string;
      message?: string;
      existingDocument?: DuplicateDocumentInfo;
    };

export class DuplicateDocumentError extends Error {
  constructor(public readonly existingDocument?: DuplicateDocumentInfo) {
    super('This file has already been uploaded.');
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
  requirePermission(canUploadFiles(getCurrentUser()));

  const formData = new FormData();
  formData.append('file', input.file);
  formData.append('type', input.type);
  let fileHash: string | null = null;
  try {
    fileHash = await calculateFileSha256(input.file);
    formData.append('fileHash', fileHash);
  } catch {
    // The backend always calculates the authoritative hash.
  }

  const currentOrganizationId = getOrganizationId(getCurrentUser());
  if (fileHash && currentOrganizationId) {
    const duplicateDocument = await findExistingDocumentByHash(
      fileHash,
      currentOrganizationId,
    );
    if (duplicateDocument) {
      throw new DuplicateDocumentError({
        id: duplicateDocument.id,
        fileName: duplicateDocument.fileName,
        createdAt: duplicateDocument.createdAt,
        fileHash: duplicateDocument.fileHash,
      });
    }
  }

  try {
    const response = await apiFetch<UploadDocumentResponse>('/documents/upload', {
      method: 'POST',
      body: formData,
    });

    if ('duplicate' in response && response.duplicate) {
      throw new DuplicateDocumentError(
        response.existingDocument ??
          (response.existingDocumentId
            ? {
                id: response.existingDocumentId,
                fileName: 'existing upload',
                createdAt: '',
              }
            : undefined),
      );
    }

    if (!('id' in response)) throw new Error('Upload did not return a document. Please try again.');

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

async function findExistingDocumentByHash(
  fileHash: string,
  organizationId: string,
) {
  try {
    const response = await apiFetch<DocumentListResponse>('/documents');
    return (response.items ?? []).find((document) => {
      if (document.fileHash !== fileHash) return false;
      if ('organizationId' in document && document.organizationId) {
        return document.organizationId === organizationId;
      }

      return true;
    });
  } catch {
    return null;
  }
}

export async function calculateFileSha256(file: File) {
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export type DocumentCollectionResponse = { items: DocumentItem[]; total: number };

// Review Data owns the complete collection (recent three / expand all), not a server page.
export async function getDocuments(): Promise<DocumentCollectionResponse> {
  const organizationId = getOrganizationId(getCurrentUser());
  if (!organizationId) return { items: [], total: 0 };

  const itemsById = new Map<string, DocumentItem>();
  let pageSize: number | undefined;
  // Explicitly fail rather than silently truncate or follow inconsistent metadata forever.
  const maxPages = 1000;
  for (let page = 1; page <= maxPages; page += 1) {
    if (getOrganizationId(getCurrentUser()) !== organizationId) {
      throw new Error('The workspace changed. Please reload input sources.');
    }
    const query = page === 1 ? '' : `?page=${page}&pageSize=${pageSize}`;
    const response = await apiFetch<DocumentListResponse>(`/documents${query}`);
    if (getOrganizationId(getCurrentUser()) !== organizationId) {
      throw new Error('The workspace changed. Please reload input sources.');
    }
    const { total, totalPages } = response;
    if (!Array.isArray(response.items) || response.page !== page ||
        !Number.isSafeInteger(total) || total < 0 ||
        !Number.isSafeInteger(response.pageSize) || response.pageSize < 1 || response.pageSize > 100 ||
        (pageSize !== undefined && response.pageSize !== pageSize) ||
        !Number.isSafeInteger(totalPages) || totalPages < 0 ||
        (total === 0 ? totalPages > 1 : totalPages !== Math.ceil(total / response.pageSize)) ||
        response.items.length > response.pageSize) {
      throw new Error('Input source pagination was inconsistent. Please try again.');
    }
    pageSize = response.pageSize;
    const hasOrganizationScopedItems = response.items.some((item) => 'organizationId' in item);
    for (const item of response.items) {
      // Preserve the existing defensive tenant filter and the server's authoritative total.
      if (hasOrganizationScopedItems && item.organizationId !== organizationId) continue;
      if (!item.id) throw new Error('An input source had no document ID. Please try again.');
      if (!itemsById.has(item.id)) itemsById.set(item.id, item);
    }
    if (page >= totalPages) {
      if (itemsById.size !== total) {
        throw new Error('The input source collection changed or was incomplete. Please try again.');
      }
      return { items: [...itemsById.values()], total };
    }
    if (response.items.length === 0) {
      throw new Error('An input source page was missing. Please try again.');
    }
  }
  throw new Error('The input source collection exceeded the page limit. Please try again.');
}

export async function deleteDocument(id: string) {
  requirePermission(canImportDraftRows(getCurrentUser()));

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
