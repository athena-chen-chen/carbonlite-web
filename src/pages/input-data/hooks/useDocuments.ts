import { useEffect, useRef, useState } from 'react';
import { deleteDocument, getDocuments } from '../../../services/documents';
import { getCurrentUser, getOrganizationId } from '../../../services/auth';
import { getUserFriendlyErrorMessage } from '../../../utils/userFriendlyErrors';
import type { DocumentItem } from '../inputData.types';

type DocumentsOptions = {
  skipLoad: boolean;
  onError: (message: string | null) => void;
};

type DocumentCollection = {
  workspaceId: string;
  items: DocumentItem[];
  total: number;
  loading: boolean;
  hasLoaded: boolean;
  error: string | null;
};

export function useDocuments({ skipLoad, onError }: DocumentsOptions) {
  const workspaceId = getOrganizationId(getCurrentUser());
  const emptyCollection = (hasLoaded = false): DocumentCollection => ({
    workspaceId, items: [], total: 0, loading: false, hasLoaded, error: null,
  });
  const [collection, setCollection] = useState<DocumentCollection>(emptyCollection);
  const requestGenerationRef = useRef(0);
  const mountedRef = useRef(true);
  const previousWorkspaceRef = useRef(workspaceId);
  const isCurrent = (generation: number) => mountedRef.current &&
    requestGenerationRef.current === generation && getOrganizationId(getCurrentUser()) === workspaceId;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; requestGenerationRef.current += 1; };
  }, []);

  useEffect(() => {
    if (previousWorkspaceRef.current === workspaceId) return;
    previousWorkspaceRef.current = workspaceId;
    requestGenerationRef.current += 1;
    setCollection(emptyCollection());
    if (!skipLoad) void loadDocuments();
  }, [workspaceId]);

  // Refresh callers retain their page-feedback lifecycle; collection loading covers every page.
  async function refresh() {
    if (!mountedRef.current || getOrganizationId(getCurrentUser()) !== workspaceId) return [];
    const generation = ++requestGenerationRef.current;
    setCollection((prev) => ({ ...(prev.workspaceId === workspaceId ? prev : emptyCollection()), loading: true, error: null }));
    try {
      const data = await getDocuments();
      if (!isCurrent(generation)) return [];
      setCollection({ workspaceId, items: data.items, total: data.total, loading: false, hasLoaded: true, error: null });
      return data.items;
    } catch (error) {
      if (!isCurrent(generation)) return [];
      setCollection((prev) => ({ ...prev, loading: false, error: getUserFriendlyErrorMessage(error, 'draftRecordReview') }));
      throw error;
    }
  }

  async function loadDocuments() {
    if (skipLoad || !mountedRef.current || getOrganizationId(getCurrentUser()) !== workspaceId) return;
    onError(null);
    const pending = refresh();
    const generation = requestGenerationRef.current;
    try {
      await pending;
    } catch (error) {
      if (isCurrent(generation)) onError(getUserFriendlyErrorMessage(error, 'draftRecordReview'));
    }
  }

  function updateDocumentStatuses(documentIds: string[], status: string) {
    setCollection((prev) => prev.workspaceId !== workspaceId ? prev : {
      ...prev,
      items: prev.items.map((document) => documentIds.includes(document.id) ? { ...document, status } : document),
    });
  }

  async function deleteSourceDocument(documentId: string) {
    await deleteDocument(documentId);
    if (!mountedRef.current || getOrganizationId(getCurrentUser()) !== workspaceId) return;
    requestGenerationRef.current += 1;
    setCollection((prev) => {
      const items = prev.items.filter((document) => document.id !== documentId);
      return { ...prev, items, total: prev.total - (prev.items.length - items.length), loading: false };
    });
  }

  function replace(items: DocumentItem[] | ((prev: DocumentItem[]) => DocumentItem[])) {
    requestGenerationRef.current += 1;
    setCollection((prev) => {
      const next = typeof items === 'function' ? items(prev.items) : items;
      return { ...emptyCollection(true), items: next, total: next.length };
    });
  }

  const current = collection.workspaceId === workspaceId ? collection : emptyCollection();
  return {
    items: current.items,
    total: current.total,
    loading: current.loading,
    hasLoaded: current.hasLoaded,
    error: current.error,
    replace,
    loadDocuments,
    refresh,
    updateDocumentStatuses,
    deleteSourceDocument,
    reset: () => replace([]),
  };
}
