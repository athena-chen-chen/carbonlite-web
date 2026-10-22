import { formatDocumentMetadataValue } from './input-data/components/DocumentDetailsDialog';
import { defaultFormatDocumentCreatedAt as formatDocumentCreatedAt } from './input-data/components/DocumentTable';
export { defaultFormatDocumentCreatedAt as formatDocumentCreatedAt } from './input-data/components/DocumentTable';
import { useDraftReview } from './input-data/hooks/useDraftReview';
import { useDocumentUpload } from './input-data/hooks/useDocumentUpload';
import { useDocuments } from './input-data/hooks/useDocuments';
import { DocumentActionMenu } from './input-data/components/DocumentActionMenu';
import { DocumentDetailsDialog } from './input-data/components/DocumentDetailsDialog';
import { DeleteDocumentDialog } from './input-data/components/DeleteDocumentDialog';
import { DraftRecordsReview } from './input-data/components/DraftRecordsReview';
import { ReviewDataSection } from './input-data/components/ReviewDataSection';
import { InputMethodTabs } from './input-data/components/InputMethodTabs';
import { DocumentUploadPanel } from './input-data/components/DocumentUploadPanel';
import { SpreadsheetImportPanel } from './input-data/components/SpreadsheetImportPanel';
import { ManualEntryPanel } from './input-data/components/ManualEntryPanel';
import { PageHeader } from '../components/PageHeader';
import { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { buildApiUrl } from '../config/api';
import {
  canImportDraftRows,
  canSetProvinceForActivityRecords,
  canUploadFiles,
  isPilotReviewer,
} from '../utils/permissions';
import {
  getCurrentUser,
  getOrganizationId,
  getToken,
} from '../services/auth';
import { track } from '../services/analytics.service';
import { trackActivityEvent } from '../services/activityEvents';
import {
  sampleDocuments,
} from '../demo/demoData';
import {
  type ExcelInputTableSaveResult,
} from '../components/ExcelInputTable';
import { useAppDialog } from '../components/AppDialog';
import {
  CALCULATION_REVIEW_ROUTE,
  DATA_RECORDS_ROUTE,
  INPUT_DATA_ROUTE,
  REPORTS_ROUTE,
} from '../constants/routes';
import { queryClient } from '../queryClient';
import {
  readOnlyNoticeStyle,
  sampleBannerStyle,
  dataHandlingNoticeStyle,
  successStyle,
  successLinkStyle,
  errorStyle,
  secondaryButtonStyle,
  primaryButtonStyle,
} from './UploadPage.styles';
import {
  type WorkflowEventInput,
  type InputMethod,
  type DocumentItem,
  type EditableParsedActivity,
  type DocumentActionKind,
  type DocumentActionConfig,
  type ImportValidationIssue,
} from './input-data/inputData.types';
import {
  formatDocumentSourceTypeLabel,
} from './input-data/domain/extractionNormalization';
import {
  isMissingFileStatus,
  hasImportedRecords,
  normalizeDocumentStatus,
  getDocumentActionModel,
  isImportedDocument,
} from './input-data/domain/documentActions';
import {
  buildDraftRowAuditSummary,
  getAuditSourceType,
} from './input-data/domain/importAudit';

export {
  classifyDraftRow,
  isDocumentImportPayloadImportable,
  getImportValidationIssues,
} from './input-data/domain/draftRowClassification';
export {
  getParsedActivityRowKey,
  buildDocumentImportRecordKey,
} from './input-data/domain/importIdentity';
export {
  buildDraftRowAuditSummary,
} from './input-data/domain/importAudit';
export {
  formatSourceReference,
  formatDocumentSourceTypeLabel,
  buildDetectedSourceItems,
  classifyExtractedDocumentSourceItems,
  resolveActivityRecordDate,
  extractProvinceFromAddress,
} from './input-data/domain/extractionNormalization';
export {
  buildDocumentImportActivityPayload,
} from './input-data/domain/documentImportPayload';
export {
  FILE_MISSING_TOOLTIP,
  getDocumentStatusLabel,
  hasImportedRecords,
  getDocumentActionModel,
} from './input-data/domain/documentActions';
export {
  type DraftRowClassification,
} from './input-data/inputData.types';



type UploadRouteState = {
  focusInputMethod?: InputMethod;
  loadSampleWorkspace?: boolean;
  flashMessage?: string;
};

type ImportReviewRouteState = {
  selectedDocumentIds?: string[];
  reportScope?: 'selectedDocuments';
};

const INPUT_TEMPLATE_HEADERS = [
  'Activity Type',
  'Record Category',
  'Quantity',
  'Consumption',
  'Unit',
  'UOM',
  'Date',
  'Country',
  'Province',
  'Facility',
  'Location Name',
  'Source Reference',
  'Original Document',
  'Notes',
];

const FILE_MISSING_MESSAGE = 'This file is no longer available. Please upload it again.';
const ACTIVITY_DATA_SAVED_SUCCESS_MESSAGE =
  'Activity data saved. Review saved records in Data Records, Calculation Results, or Reports.';
export const FILE_MISSING_EXPLANATION =
  'This file is no longer available on the server. This may happen after system updates or temporary storage cleanup. Please upload the file again if you need to extract or review it.';
function getRouteInputMethod(state: unknown): InputMethod | null {
  const focusInputMethod = (state as UploadRouteState | null)?.focusInputMethod;
  return (
    focusInputMethod === 'documents' ||
    focusInputMethod === 'spreadsheet' ||
    focusInputMethod === 'manual'
  )
    ? focusInputMethod
    : null;
}

export function getDocumentDownloadUrl(documentId: string) {
  return buildApiUrl(`/documents/${documentId}/download`);
}

function trackWorkflowEvent(input: WorkflowEventInput) {
  void trackActivityEvent({
    eventName: input.eventName,
    page: window.location.pathname,
    url: window.location.href,
    entityType: input.entityType,
    metadata: {
      eventLabel: input.description,
      entityDisplayName: input.entityDisplayName,
      ...input.metadata,
    },
  }).catch(() => {
    // Workflow audit events should not block upload/import actions.
  });
}

export function formatDuplicateDocumentMessage(input: {
  fileName: string;
  createdAt?: string | null;
}) {
  const uploadedDate = input.createdAt?.slice(0, 10);
  return uploadedDate
    ? `${input.fileName} was already uploaded on ${uploadedDate}.`
    : `${input.fileName} appears to have already been uploaded.`;
}

function getPreviewSourceSummary(input: {
  previewDocumentId: string | null;
  previewDocumentIds: string[];
  documents: DocumentItem[];
}) {
  if (input.previewDocumentIds.length > 1) {
    return `Files: ${input.previewDocumentIds.length} documents`;
  }

  const documentId = input.previewDocumentIds[0] ?? input.previewDocumentId;
  const document = input.documents.find((item) => item.id === documentId);

  if (!document) return 'Source: Review document metadata';

  return [
    `File: ${document.fileName}`,
    `Source type: ${formatDocumentSourceTypeLabel(document)}`,
    `Imported: ${formatDocumentCreatedAt(document.createdAt)}`,
  ].join(' · ');
}

function getDraftRowsPermissionDeniedReason(user: ReturnType<typeof getCurrentUser>) {
  const rawRole = String(user?.role ?? '').trim().toUpperCase();
  const membershipRole = String(user?.membershipRole ?? '').trim().toUpperCase();

  if (isPilotReviewer(user)) {
    return 'Pilot review accounts cannot edit draft rows.';
  }

  if (!getOrganizationId(user)) {
    return 'Your account is not connected to a workspace.';
  }

  if (rawRole === 'VIEWER' || rawRole === 'REVIEWER' || membershipRole === 'VIEWER' || membershipRole === 'REVIEWER') {
    return 'Your current role does not allow importing draft rows.';
  }

  return 'You do not have permission to edit draft rows.';
}

function getSetProvincePermissionDeniedReason(user: ReturnType<typeof getCurrentUser>) {
  const rawRole = String(user?.role ?? '').trim().toUpperCase();

  if (isPilotReviewer(user)) {
    return 'Pilot review accounts cannot edit draft rows.';
  }

  if (!getOrganizationId(user)) {
    return 'Your account is not connected to a workspace.';
  }

  if (rawRole === 'VIEWER' || rawRole === 'REVIEWER') {
    return 'Your current role does not allow setting province.';
  }

  return 'You do not have permission to set province.';
}

function getUploadPermissionDeniedReason(user: ReturnType<typeof getCurrentUser>) {
  const rawRole = String(user?.role ?? '').trim().toUpperCase();
  const membershipRole = String(user?.membershipRole ?? '').trim().toUpperCase();

  if (isPilotReviewer(user)) {
    return 'Pilot review accounts cannot upload files.';
  }

  if (!getOrganizationId(user)) {
    return 'Your account is not connected to a workspace.';
  }

  if (rawRole === 'VIEWER' || rawRole === 'REVIEWER' || membershipRole === 'VIEWER' || membershipRole === 'REVIEWER') {
    return 'Your current role does not allow file upload.';
  }

  return 'You do not have permission to upload files.';
}


export function UploadPage() {
  const location = useLocation();
  const { confirm } = useAppDialog();
  const [activeInputMethod, setActiveInputMethod] = useState<InputMethod>(
    () => getRouteInputMethod(location.state) ?? 'documents',
  );
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [latestDocumentId, setLatestDocumentId] = useState<string | null>(null);
  const [lastSavedSpreadsheetDocumentId, setLastSavedSpreadsheetDocumentId] = useState<string | null>(null);
  const [lastConfirmDocumentId, setLastConfirmDocumentId] = useState<string | null>(null);
  const [lastImportedDocumentIds, setLastImportedDocumentIds] = useState<string[]>([]);
  const [showAllDocuments, setShowAllDocuments] = useState(false);
  const [sampleWorkspaceLoaded, setSampleWorkspaceLoaded] = useState(false);
  const [documentDetails, setDocumentDetails] = useState<DocumentItem | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<DocumentItem | null>(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [viewingDocumentId, setViewingDocumentId] = useState<string | null>(null);
  const [openDocumentMenuId, setOpenDocumentMenuId] = useState<string | null>(null);
  const [documentMenuPosition, setDocumentMenuPosition] = useState<{
    top: number;
    right: number;
  } | null>(null);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const currentUser = getCurrentUser();
  const canUploadData = canUploadFiles(currentUser);
  const canImportData = canImportDraftRows(currentUser);
  const canDeleteDocuments = canImportData;
  const canSetProvinceOnDraftRows = canSetProvinceForActivityRecords(currentUser);
  const pilotReviewerReadOnly = isPilotReviewer(currentUser);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const pageHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const reviewSectionRef = useRef<HTMLDivElement | null>(null);
  const reviewHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const manualEntryRef = useRef<HTMLDivElement | null>(null);
  const validationSummaryRef = useRef<HTMLDivElement | null>(null);
  const restoredReviewDocumentRef = useRef<string | null>(null);
  const uploadReviewRequestRef = useRef<number | null>(null);
  const documentMenuRef = useRef<HTMLDivElement | null>(null);
  const documentMenuButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const documents = useDocuments({
    skipLoad: Boolean((location.state as UploadRouteState | null)?.loadSampleWorkspace),
    onError: setError,
  });
  const upload = useDocumentUpload({
    canUploadData,
    isProcessing: () => isReviewProcessing,
    permissionDeniedReason: getUploadPermissionDeniedReason(currentUser),
    feedback: { error: setError, success: setSuccessMessage },
    onFilesSelected: () => { uploadReviewRequestRef.current = beginActiveReviewRequest({ clearRoute: true }); },
    onUploaded: (uploadedDocument, file, sourceType) => {
      trackWorkflowEvent({
        eventName: 'FILE_UPLOADED',
        entityType: 'DOCUMENT',
        entityDisplayName: uploadedDocument.fileName || file.name,
        description: 'File uploaded',
        metadata: {
          fileName: uploadedDocument.fileName || file.name,
          fileType: uploadedDocument.type || sourceType,
          fileSize: uploadedDocument.fileSize ?? file.size,
          sourceType: getAuditSourceType(uploadedDocument.fileName || file.name, uploadedDocument.type),
          statusAfterUpload: uploadedDocument.status,
          uploadedAt: new Date().toISOString(),
        },
      });
    },
    formatDuplicateDocumentMessage,
  });
  const review = useDraftReview({
    documents: documents.items,
    uploading: upload.uploading,
    canImportData,
    canSetProvinceOnDraftRows,
    organizationId: getOrganizationId(currentUser),
    setProvincePermissionDeniedReason: getSetProvincePermissionDeniedReason(currentUser),
    feedback: { error: setError, success: setSuccessMessage },
    collection: { loadDocuments: documents.loadDocuments, updateDocumentStatuses: documents.updateDocumentStatuses },
    shouldRefreshDocument: (doc) => doc.id === lastSavedSpreadsheetDocumentId || doc.type === 'SPREADSHEET',
    confirm,
    onWorkflowEvent: trackWorkflowEvent,
    formatImportCompletedMessage: getImportCompletedMessage,
    events: {
      onConfirmStarted: (ids) => { setLastConfirmDocumentId(ids.join(', ')); setLastImportedDocumentIds(ids); },
      onValidationIssue: scrollToImportValidation,
      onImportCompleted: navigateToDataRecordsAfterConfirm,
      onDocumentsExtracted: (items) => { if (items.length === 1) setReviewRouteDocument(items[0].id); },
    },
  });
  const isReviewProcessing = review.state.extractingId !== null ||
    review.state.confirmingId !== null || review.state.generatingMetrics;
  const visibleDocuments = showAllDocuments ? documents.items : documents.items.slice(0, 3);
  const hasMissingFiles = documents.items.some((doc) => isMissingFileStatus(doc.status));
  const selectedDocuments = documents.items.filter((document) =>
    selectedDocumentIds.includes(document.id),
  );
  const selectableDocuments = documents.items.filter(hasImportedRecords);
  const selectableVisibleDocuments = visibleDocuments.filter(hasImportedRecords);
  const selectedImportedDocuments = selectedDocuments.filter(hasImportedRecords);
  const selectedDocumentsActionLabel = 'View Calculation Results';
  const isProcessing = upload.uploading || isReviewProcessing;
  const selectedDocumentsActionDisabled =
    selectedImportedDocuments.length === 0 ||
    selectedImportedDocuments.length !== selectedDocumentIds.length ||
    isProcessing;
  const selectedDocumentsActionHelp = selectedImportedDocuments.length > 0
    ? `${selectedImportedDocuments.length} file${selectedImportedDocuments.length === 1 ? '' : 's'} selected. Calculations include imported records only; unresolved source rows remain excluded.`
    : 'Select one or more files with imported records.';
  const previewSourceSummary = getPreviewSourceSummary({
    previewDocumentId: review.state.previewDocumentId,
    previewDocumentIds: review.state.previewDocumentIds,
    documents: documents.items,
  });
  const routeReviewDocumentId =
    searchParams.get('view') === 'review'
      ? searchParams.get('documentId')?.trim() || null
      : null;

  function clearFeedback() {
    setError(null);
    setSuccessMessage(null);
  }

  function markMetricsStale() {
    window.sessionStorage.setItem('carbonliteMetricsStale', 'true');
    window.dispatchEvent(new Event('carbonlite:metrics-stale'));
  }

  function focusReviewSection() {
    reviewSectionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    reviewHeadingRef.current?.focus({ preventScroll: true });
  }

  function setReviewRouteDocument(documentId: string) {
    const nextParams = new URLSearchParams(location.search);
    nextParams.set('view', 'review');
    nextParams.set('documentId', documentId);
    setSearchParams(nextParams, { replace: true });
  }

  function clearReviewRouteDocument() {
    const nextParams = new URLSearchParams(location.search);
    const hadReviewRoute = nextParams.has('view') || nextParams.has('documentId');
    nextParams.delete('view');
    nextParams.delete('documentId');
    restoredReviewDocumentRef.current = null;

    if (hadReviewRoute) {
      setSearchParams(nextParams, { replace: true });
    }
  }

  function beginActiveReviewRequest(options: { clearRoute?: boolean } = {}) {
    const requestId = review.actions.beginActiveReviewRequest();
    setSelectedDocumentIds([]);
    if (options.clearRoute) clearReviewRouteDocument();
    return requestId;
  }

  useEffect(() => {
    documents.loadDocuments();
  }, [location.pathname]);

  useEffect(() => {
    const routeState = location.state as UploadRouteState | null;
    if (!routeState?.flashMessage) return;

    setSuccessMessage(routeState.flashMessage);
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [location.pathname, location.search, location.state, navigate]);

  useEffect(() => {
    if (new URLSearchParams(location.search).get('section') !== 'review') return;

    focusReviewSection();
  }, [location.search]);

  useEffect(() => {
    if (!routeReviewDocumentId) {
      restoredReviewDocumentRef.current = null;
      return;
    }

    if (review.state.previewDocumentId === routeReviewDocumentId) return;
    if (restoredReviewDocumentRef.current === routeReviewDocumentId) return;

    const documentToRestore = documents.items.find((document) => document.id === routeReviewDocumentId);
    if (!documentToRestore) {
      review.actions.clearReview();
      return;
    }

    restoredReviewDocumentRef.current = routeReviewDocumentId;
    void handlePreviewDocument(documentToRestore, { preserveRoute: true });
  }, [documents.items, review.state.previewDocumentId, routeReviewDocumentId]);

  useEffect(() => {
    function handleDemoDataReset() {
      documents.reset();
      upload.reset();
      review.actions.clearReview();
      setLatestDocumentId(null);
      setLastSavedSpreadsheetDocumentId(null);
      setLastConfirmDocumentId(null);
      setLastImportedDocumentIds([]);
      setSelectedDocumentIds([]);
      setDocumentDetails(null);
      setDocumentToDelete(null);
      setViewingDocumentId(null);
      setOpenDocumentMenuId(null);
      setDocumentMenuPosition(null);
      setSuccessMessage(null);
      setError(null);
    }

    window.addEventListener('carbonlite:demo-data-reset', handleDemoDataReset);

    return () => {
      window.removeEventListener('carbonlite:demo-data-reset', handleDemoDataReset);
    };
  }, []);

  useEffect(() => {
    if (!openDocumentMenuId) return;

    function closeDocumentMenu() {
      setOpenDocumentMenuId(null);
      setDocumentMenuPosition(null);
    }

    function isInsideOpenDocumentMenu(target: Node | null) {
      const activeButton = documentMenuButtonRefs.current[openDocumentMenuId ?? ''];

      return Boolean(
        target &&
          (documentMenuRef.current?.contains(target) || activeButton?.contains(target)),
      );
    }

    function handlePointerDown(event: PointerEvent) {
      if (isInsideOpenDocumentMenu(event.target as Node | null)) return;
      closeDocumentMenu();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeDocumentMenu();
      }
    }

    function handleFocusIn(event: FocusEvent) {
      if (isInsideOpenDocumentMenu(event.target as Node | null)) return;
      closeDocumentMenu();
    }

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocusIn);
    window.addEventListener('scroll', closeDocumentMenu, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('scroll', closeDocumentMenu, true);
    };
  }, [openDocumentMenuId]);

  useEffect(() => {
    if (!documentDetails) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setDocumentDetails(null);
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [documentDetails]);

  useEffect(() => {
    const routeInputMethod = getRouteInputMethod(location.state);
    if (routeInputMethod) {
      setActiveInputMethod(routeInputMethod);
    }
  }, [location.state]);

  useEffect(() => {
    if (getRouteInputMethod(location.state) !== 'manual' || activeInputMethod !== 'manual') return;

    manualEntryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    manualEntryRef.current?.focus({ preventScroll: true });
  }, [activeInputMethod, location.state]);

  useEffect(() => {
    if (
      !successMessage?.startsWith('Document deleted.') &&
      !successMessage?.startsWith('Source document deleted.') &&
      !successMessage?.startsWith('Source document removed')
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage((current) =>
        current?.startsWith('Document deleted.') ||
        current?.startsWith('Source document deleted.') ||
        current?.startsWith('Source document removed')
          ? null
          : current,
      );
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

  useEffect(() => {
    if ((location.state as UploadRouteState | null)?.loadSampleWorkspace) {
      loadSampleWorkspace();
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [location.state]);

  function getSpreadsheetSaveReviewMessage(rows: EditableParsedActivity[]) {
    const summary = buildDraftRowAuditSummary(rows);
    const importableLabel = summary.importableCount === 1 ? 'record' : 'records';
    const reviewLabel = summary.requiresReviewCount === 1 ? 'row' : 'rows';

    return `Spreadsheet rows saved for review. ${summary.importableCount} ${importableLabel} ready to import; ${summary.requiresReviewCount} source ${reviewLabel} remain in Input Review.`;
  }

  function loadSampleWorkspace() {
    if (!canImportData) {
      setError('You do not have permission to perform this action.');
      setSuccessMessage(null);
      return;
    }

    documents.replace(sampleDocuments);
    review.actions.loadSampleReview();
    setSampleWorkspaceLoaded(true);
    setSuccessMessage('Sample files loaded. You can review, import, edit, and generate reports like a real workflow.');
    setError(null);
  }

  function downloadCsvTemplate() {
    const csv = `${INPUT_TEMPLATE_HEADERS.join(',')}\n`;
    downloadBlob(new Blob([csv], { type: 'text/csv' }), 'carbonlite-activity-data-template.csv');
  }

  function downloadExcelTemplate() {
    const worksheet = XLSX.utils.aoa_to_sheet([INPUT_TEMPLATE_HEADERS]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Activity Data');
    const output = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    downloadBlob(
      new Blob([output], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      'carbonlite-activity-data-template.xlsx',
    );
  }

  function downloadBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleManualOrSpreadsheetSave(result?: ExcelInputTableSaveResult) {
    markMetricsStale();

    if (result?.source === 'spreadsheet') {
      const requestId = beginActiveReviewRequest({ clearRoute: true });
      try {
        const refreshedDocuments = await documents.refresh();
        if (!review.actions.isActiveReviewRequest(requestId)) return;
        if (result.sourceDocumentId) {
          const sourceDocument =
            refreshedDocuments.find((document) => document.id === result.sourceDocumentId) ?? {
              id: result.sourceDocumentId,
              fileName:
                result.sourceDocumentFileName ??
                result.savedReviewRows?.find((row) => row.sourceFileName)?.sourceFileName ??
                'Spreadsheet import',
              createdAt: null,
            };
          setLatestDocumentId(result.sourceDocumentId);
          setLastSavedSpreadsheetDocumentId(result.sourceDocumentId);
          setLastImportedDocumentIds([result.sourceDocumentId]);
          setSelectedDocumentIds([result.sourceDocumentId]);

          if (result.savedReviewRows?.length) {
            const draftRows = await review.actions.loadSavedSpreadsheetReview(result.savedReviewRows, sourceDocument, requestId);
            if (!review.actions.isActiveReviewRequest(requestId)) return;
            setSuccessMessage(getSpreadsheetSaveReviewMessage(draftRows));
          } else {
            review.actions.clearSavedSpreadsheetReview();
            setSuccessMessage('Spreadsheet rows saved for review.');
          }
        } else {
          setSuccessMessage('Spreadsheet rows saved for review.');
        }
        setError(null);
        focusReviewSection();
      } catch {
        if (!review.actions.isActiveReviewRequest(requestId)) return;
        setError('Spreadsheet rows were saved, but Review Data could not be refreshed.');
      }
      return;
    }

    setSuccessMessage(ACTIVITY_DATA_SAVED_SUCCESS_MESSAGE);
  }

  async function handleUploadAndExtract() {
    let requestId: number | null = null;
    upload.beginUploadAndExtract();
    try {
      const uploadPromise = upload.uploadSelectedFiles();
      // uploadSelectedFiles begins its review generation synchronously via onFilesSelected.
      requestId = uploadReviewRequestRef.current;
      const uploadedDocuments = await uploadPromise;
      if (requestId === null || !review.actions.isActiveReviewRequest(requestId)) return;
      if (uploadedDocuments.length === 0) {
        if (canUploadData && upload.selectedFiles.length > 0) setSuccessMessage(null);
        return;
      }
      const refreshedDocuments = await documents.refresh();
      if (!review.actions.isActiveReviewRequest(requestId)) return;
      const latest = refreshedDocuments[0];
      if (!latest) throw new Error('Upload completed, but no uploaded document was found.');
      setLatestDocumentId(uploadedDocuments[0]?.id ?? latest.id);
      setSuccessMessage(
        upload.selectedFiles.length > 1
          ? `Uploaded ${upload.selectedFiles.length} files. Extracting data now...`
          : 'Upload completed. Extracting data now...',
      );
      await handleExtractDocuments(uploadedDocuments);
    } catch {
      if (requestId === null || !review.actions.isActiveReviewRequest(requestId)) return;
      setError('Extraction could not identify valid activity rows.');
      setSuccessMessage(null);
    } finally {
      upload.finishUploadAndExtract();
    }
  }

  function canImportDocument(doc: DocumentItem) {
    return (
      !review.state.generatingMetrics &&
      review.state.confirmingId !== doc.id &&
      review.state.previewDocumentIds.length <= 1 &&
      review.state.previewDocumentId === doc.id &&
      review.state.parsedActivities.length > 0
    );
  }

  function hasPreviewForDocument(doc: DocumentItem) {
    return (
      ['PROCESSED', 'EXTRACTED', 'REVIEW_REQUIRED'].includes(
        normalizeDocumentStatus(doc.status),
      ) ||
      (review.state.parsedActivities.some((item) => item.documentId === doc.id) &&
        (review.state.previewDocumentId === doc.id || review.state.previewDocumentIds.includes(doc.id)))
    );
  }

  function getDocumentActionModelForDoc(doc: DocumentItem) {
    const actionModel = getDocumentActionModel({
      status: doc.status,
      sourceType: doc.type,
      canImport: canImportData && canImportDocument(doc),
      hasPreview: hasPreviewForDocument(doc),
      isExtracting: review.state.extractingId === doc.id || review.state.extractingId === 'multiple',
      isImporting: review.state.confirmingId === doc.id,
      isGeneratingMetrics: review.state.generatingMetrics,
      isViewing: viewingDocumentId === doc.id,
      isDeleting: deletingDocumentId === doc.id,
    });

    const mutatingActions = new Set<DocumentActionKind>([
      'uploadAgain',
      'extract',
      'reextract',
      'import',
      'delete',
    ]);

    return {
      ...actionModel,
      primaryAction: mutatingActions.has(actionModel.primaryAction.kind) &&
        !canUseDocumentAction(actionModel.primaryAction.kind)
        ? {
            ...actionModel.primaryAction,
            disabled: true,
            title: 'You do not have permission to perform this action.',
          }
        : actionModel.primaryAction,
      menuActions: actionModel.menuActions.filter((action) => canUseDocumentAction(action.kind)),
    };
  }

  function canUseDocumentAction(kind: DocumentActionKind) {
    if (kind === 'delete') return canDeleteDocuments;
    if (kind === 'uploadAgain' || kind === 'extract' || kind === 'reextract') return canUploadData;
    if (kind === 'import') return canImportData;
    return true;
  }

  function getDocumentMenuPosition(button: HTMLButtonElement, actionCount: number) {
    const rect = button.getBoundingClientRect();
    const menuWidth = 224;
    const menuHeight = Math.max(48, actionCount * 42 + 20);
    const margin = 8;
    const sideOffset = 6;
    const top =
      rect.bottom + menuHeight + margin > window.innerHeight
        ? Math.max(margin, rect.top - menuHeight - sideOffset)
        : rect.bottom + sideOffset;
    const right = Math.min(
      Math.max(margin, window.innerWidth - rect.right),
      Math.max(margin, window.innerWidth - menuWidth - margin),
    );

    return { top, right };
  }

  function toggleDocumentMenu(documentId: string, button: HTMLButtonElement) {
    setOpenDocumentMenuId((current) => {
      if (current === documentId) {
        setDocumentMenuPosition(null);
        return null;
      }

      const document = documents.items.find((item) => item.id === documentId);
      if (!document) {
        setDocumentMenuPosition(null);
        return null;
      }

      const actionModel = getDocumentActionModelForDoc(document);
      setDocumentMenuPosition(getDocumentMenuPosition(button, actionModel.menuActions.length));
      return documentId;
    });
  }

  function closeDocumentMenu() {
    setOpenDocumentMenuId(null);
    setDocumentMenuPosition(null);
  }

  function handleDocumentAction(doc: DocumentItem, action: DocumentActionConfig) {
    if (action.disabled) {
      if (isMissingFileStatus(doc.status)) {
        setError(FILE_MISSING_MESSAGE);
        setSuccessMessage(null);
      }
      return;
    }
    closeDocumentMenu();

    switch (action.kind) {
      case 'viewDetails':
        setDocumentDetails(doc);
        clearFeedback();
        return;
      case 'downloadSource':
        handleViewDocument(doc);
        return;
      case 'uploadAgain':
        beginActiveReviewRequest({ clearRoute: true });
        setActiveInputMethod('documents');
        upload.setReplacementSourceDocument(doc);
        setSuccessMessage(`Select a replacement file for ${doc.fileName}, then click Extract Data.`);
        setError(null);
        window.setTimeout(() => upload.fileInputRef.current?.click(), 0);
        return;
      case 'preview':
        void handlePreviewDocument(doc);
        return;
      case 'import':
        review.actions.handleConfirmImport(doc.id);
        return;
      case 'viewRecords':
        navigate(`/activity-records?documentId=${encodeURIComponent(doc.id)}`, {
          state: {
            sourceDocumentId: doc.id,
            sourceDocumentName: doc.fileName,
          },
        });
        return;
      case 'delete':
        setDocumentToDelete(doc);
        return;
      case 'extract':
      case 'reextract':
        handleExtract(doc.id);
        return;
      default:
        return;
    }
  }

  async function handlePreviewDocument(doc: DocumentItem, options: { preserveRoute?: boolean } = {}) {
    const requestId = beginActiveReviewRequest();
    restoredReviewDocumentRef.current = doc.id;
    if (!options.preserveRoute) setReviewRouteDocument(doc.id);
    await review.actions.previewDocument(doc, requestId);
  }

  async function handleExtractDocuments(documentsToExtract: Array<{ id: string; fileName: string; createdAt?: string | null }>) {
    if (documentsToExtract.length === 0) {
      setError('No uploaded documents were found to extract.');
      return;
    }
    const requestId = beginActiveReviewRequest({ clearRoute: true });
    await review.actions.extractDocuments(documentsToExtract, requestId);
  }

  async function handleViewDocument(doc: DocumentItem) {
    if (viewingDocumentId === doc.id) return;

    if (review.actions.isSampleDocumentId(doc.id) && doc.fileUrl?.startsWith('/demo/')) {
      window.open(doc.fileUrl, '_blank', 'noopener,noreferrer');
      track('DOCUMENT_VIEWED', {
        documentType: doc.type,
        documentCount: 1,
        source: 'sample',
      });
      return;
    }

    if (!doc.id) {
      setError('File is unavailable for this document.');
      setSuccessMessage(null);
      return;
    }

    const token = getToken();

    if (!token) {
      setError('Please log in again to view this file.');
      setSuccessMessage(null);
      return;
    }

    setViewingDocumentId(doc.id);
    setError(null);
    const viewerWindow = window.open('', '_blank');

    if (viewerWindow) {
      viewerWindow.opener = null;
      viewerWindow.document.title = doc.fileName || 'Opening document';
      viewerWindow.document.body.innerHTML = '<p style="font-family: sans-serif;">Opening document...</p>';
    }

    try {
      // TODO: Backend endpoint should stream GET /api/documents/:id/download
      // with auth/org checks. Long term, store files in S3/Supabase Storage
      // instead of relying on Render local disk.
      const response = await fetch(getDocumentDownloadUrl(doc.id), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404 || response.status === 410) {
          throw new Error('FILE_UNAVAILABLE');
        }

        throw new Error(`Download failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      if (viewerWindow) {
        viewerWindow.location.href = objectUrl;
      } else {
        const openedWindow = window.open(objectUrl, '_blank', 'noopener,noreferrer');
        if (!openedWindow) {
          throw new Error('Popup blocked');
        }
      }

      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      track('DOCUMENT_VIEWED', {
        documentType: doc.type,
        documentCount: 1,
      });
    } catch (err) {
      viewerWindow?.close();
      setError(
        err instanceof Error && err.message === 'FILE_UNAVAILABLE'
          ? FILE_MISSING_MESSAGE
          : 'Unable to open document.',
      );
      setSuccessMessage(null);
    } finally {
      setViewingDocumentId(null);
    }
  }

  function clearDeletedDocumentPreview(documentId: string) {
    review.actions.removeSourceDocument(documentId);
    setSelectedDocumentIds((prev) => prev.filter((id) => id !== documentId));

    setLatestDocumentId((prev) => (prev === documentId ? null : prev));
    setLastSavedSpreadsheetDocumentId((prev) => (prev === documentId ? null : prev));
    setLastConfirmDocumentId((prev) => (prev === documentId ? null : prev));
  }

  async function handleDeleteDocument() {
    if (!canDeleteDocuments) {
      setError('You do not have permission to perform this action.');
      setSuccessMessage(null);
      setDocumentToDelete(null);
      return;
    }

    if (!documentToDelete) return;

    const documentId = documentToDelete.id;
    setDeletingDocumentId(documentId);
    clearFeedback();

    try {
      await documents.deleteSourceDocument(documentId);
      clearDeletedDocumentPreview(documentId);
      setDocumentToDelete(null);
      setOpenDocumentMenuId(null);
      markMetricsStale();
      setSuccessMessage(
        isImportedDocument(documentToDelete)
          ? 'Source document removed from Review Data. Imported records were kept.'
          : 'Source document deleted.',
      );
    } catch (err) {
      setError('Unable to delete source document. Please try again.');
    } finally {
      setDeletingDocumentId(null);
    }
  }

  function toggleDocumentSelection(documentId: string, checked: boolean) {
    if (checked && !selectableDocuments.some((document) => document.id === documentId)) return;
    setSelectedDocumentIds((prev) => checked
      ? Array.from(new Set([...prev, documentId]))
      : prev.filter((id) => id !== documentId));
  }

  function toggleVisibleDocumentSelection(checked: boolean) {
    const visibleIds = selectableVisibleDocuments.map((document) => document.id);
    setSelectedDocumentIds((prev) => checked
      ? Array.from(new Set([...prev, ...visibleIds]))
      : prev.filter((id) => !visibleIds.includes(id)));
  }

  function handleSelectedDocumentsAction() {
    if (selectedDocumentsActionDisabled) return;
    navigate('/metrics-summary', {
      state: {
        reportScope: 'selectedDocuments',
        selectedDocumentIds: selectedImportedDocuments.map((document) => document.id),
      },
    });
  }

  async function handleExtract(documentId: string) {
    const document = documents.items.find((doc) => doc.id === documentId);
    await handleExtractDocuments([
      {
        id: documentId,
        fileName: document?.fileName ?? documentId,
        createdAt: document?.createdAt,
      },
    ]);
  }

  function getSetProvinceDisabledReason() {
    if (!canSetProvinceOnDraftRows) {
      return getSetProvincePermissionDeniedReason(currentUser);
    }
    if (isProcessing) return undefined;
    if (review.validation.missingProvinceRowIndexes.length === 0) return 'No rows need a province.';
    if (!review.summary.hasBulkProvince) return 'Select a province to apply.';
    return undefined;
  }

  function getImportCompletedMessage(importedCount: number, trackedMetricCount: number) {
    const detailParts = [
      `${importedCount} record${importedCount === 1 ? '' : 's'} imported`,
    ];

    if (trackedMetricCount > 0) {
      detailParts.push(
        `${trackedMetricCount} tracked operational metric${
          trackedMetricCount === 1 ? '' : 's'
        } included as tracked-only`,
      );
    }

    detailParts.push('0 records need attention');

    return `Import completed successfully. The selected records have been saved as Data Records. ${detailParts.join(
      '. ',
    )}. Opening Data Records...`;
  }

  function renderSuccessMessage(message: string) {
    if (message !== ACTIVITY_DATA_SAVED_SUCCESS_MESSAGE) return message;

    return (
      <>
        Activity data saved. Review saved records in{' '}
        <Link className="input-data-success-link" style={successLinkStyle} to={DATA_RECORDS_ROUTE}>
          Data Records
        </Link>
        ,{' '}
        <Link className="input-data-success-link" style={successLinkStyle} to={CALCULATION_REVIEW_ROUTE}>
          Calculation Results
        </Link>
        , or{' '}
        <Link className="input-data-success-link" style={successLinkStyle} to={REPORTS_ROUTE}>
          Reports
        </Link>
        .
      </>
    );
  }

  function buildImportReviewRouteState(documentIds = lastImportedDocumentIds): ImportReviewRouteState | undefined {
    const scopedDocumentIds = Array.from(
      new Set(documentIds.map((id) => id.trim()).filter(Boolean)),
    );

    return scopedDocumentIds.length > 0
      ? {
          selectedDocumentIds: scopedDocumentIds,
          reportScope: 'selectedDocuments',
        }
      : undefined;
  }

  async function invalidatePostConfirmImportQueries() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['activity-data'] }),
      queryClient.invalidateQueries({ queryKey: ['documents'] }),
      queryClient.invalidateQueries({ queryKey: ['document-extraction'] }),
      queryClient.invalidateQueries({ queryKey: ['input-review'] }),
      queryClient.invalidateQueries({ queryKey: ['upload'] }),
      queryClient.invalidateQueries({ queryKey: ['import'] }),
      queryClient.invalidateQueries({ queryKey: ['metrics'] }),
      queryClient.invalidateQueries({ queryKey: ['reports'] }),
      queryClient.invalidateQueries({ queryKey: ['home', 'emissions'] }),
    ]);
  }

  async function navigateToDataRecordsAfterConfirm({
    documentIds,
    importedCount,
    trackedMetricCount,
    rowsLeftForReview,
    createdActivityIds = [],
    message,
  }: {
    documentIds: string[];
    importedCount: number;
    trackedMetricCount: number;
    rowsLeftForReview: number;
    createdActivityIds?: string[];
    message: string;
  }) {
    if (importedCount <= 0) return;

    await invalidatePostConfirmImportQueries();
    const returnDocumentId = documentIds[0];
    navigate(DATA_RECORDS_ROUTE, {
      state: {
        flashMessage: message,
        sourceDocumentIds: Array.from(new Set(documentIds)),
        inputReviewDocumentId: returnDocumentId,
        inputReviewPath: returnDocumentId
          ? `${INPUT_DATA_ROUTE}?documentId=${encodeURIComponent(returnDocumentId)}&view=review`
          : INPUT_DATA_ROUTE,
        importedActivityIds: createdActivityIds,
        importedCount,
        trackedMetricCount,
        rowsLeftForReview,
      },
    });
  }

  function scrollToImportValidation(firstIssue?: ImportValidationIssue) {
    window.requestAnimationFrame(() => {
      validationSummaryRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });

      if (!firstIssue) return;

      const selector = `[data-validation-field="${firstIssue.field}"][data-validation-row="${firstIssue.rowIndex}"]`;
      const field = document.querySelector<HTMLElement>(selector);
      field?.focus();
    });
  }

  function getRecordDateSuggestion(row: EditableParsedActivity) {
    const sourceDocument = documents.items.find((doc) => doc.id === row.documentId);
    return sourceDocument?.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10);
  }

  const hasReviewSources = documents.items.length > 0;
  const isSourceDeleteSuccessMessage = Boolean(
    successMessage?.startsWith('Source document deleted.') ||
      successMessage?.startsWith('Source document removed'),
  );
  const showPersistentSuccessPanel =
    Boolean(successMessage) && (!isSourceDeleteSuccessMessage || hasReviewSources);
  const showPostImportLinks =
    showPersistentSuccessPanel &&
    !isSourceDeleteSuccessMessage &&
    /import|metric/i.test(successMessage ?? '');

  const activeMenuDocument = openDocumentMenuId && documentMenuPosition
    ? documents.items.find((document) => document.id === openDocumentMenuId)
    : undefined;

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <PageHeader title="Input Data" headingRef={pageHeadingRef} />

      {!canImportData ? (
        <div style={readOnlyNoticeStyle}>
          {pilotReviewerReadOnly
            ? 'Pilot reviewer accounts use preloaded sample data. Please use Data Records, Calculation Results, and Reports to review the workflow. Upload, import, manual entry, editing, and reset actions are disabled for pilot reviewer accounts.'
            : 'Read-only access: you can view existing records, Calculation Results, and Reports, but cannot upload, import, edit, delete, or reset pilot data.'}
        </div>
      ) : null}

      {pilotReviewerReadOnly ? (
        <div style={sampleBannerStyle}>
          <div>
            <strong>Sample data is already loaded</strong>
            <div style={{ color: '#475569', marginTop: 4 }}>
              Review the preloaded golden sample records, calculation trail, and sample report. Pilot reviewer accounts are read-only.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => navigate('/data-records')} style={secondaryButtonStyle}>
              Data Records
            </button>
            <button type="button" onClick={() => navigate('/metrics-summary')} style={secondaryButtonStyle}>
              Calculation Results
            </button>
            <button type="button" onClick={() => navigate('/reports')} style={primaryButtonStyle(false)}>
              Reports
            </button>
          </div>
        </div>
      ) : null}

      {!pilotReviewerReadOnly ? <InputMethodTabs activeMethod={activeInputMethod} onChange={setActiveInputMethod} /> : null}

      {!pilotReviewerReadOnly ? (
        <div style={dataHandlingNoticeStyle}>
          <strong>Data handling notice</strong>
          <span>
            Upload only information you are authorized to provide. CarbonLite processes source files to
            extract operational rows, calculate emissions, and prepare review outputs. Workspace access is
            controlled by organization membership and role; avoid unnecessary personal or sensitive
            information in uploaded files.
          </span>
        </div>
      ) : null}

      {!pilotReviewerReadOnly ? <div style={sampleBannerStyle}>
        <div>
          <strong>{sampleWorkspaceLoaded ? 'Example workspace loaded' : 'Try sample data'}</strong>
          <div style={{ color: '#475569', marginTop: 4 }}>
            Load sample documents and extracted rows for demo purposes.
          </div>
        </div>
        <button
          type="button"
          onClick={loadSampleWorkspace}
          disabled={!canImportData}
          style={primaryButtonStyle(!canImportData)}
        >
          {sampleWorkspaceLoaded ? 'Reload Sample Data' : 'Load Sample Data'}
        </button>
      </div> : null}

      {!pilotReviewerReadOnly && activeInputMethod === 'documents' ? (
      <DocumentUploadPanel
          selectedFiles={upload.selectedFiles}
          isDraggingUpload={upload.isDraggingUpload}
          isProcessing={isProcessing}
          canUploadData={canUploadData}
          uploadAccept={upload.uploadAccept}
          uploadExtractInProgress={upload.uploadExtractInProgress}
          fileInputRef={upload.fileInputRef}
          uploadDisabledReason={!canUploadData ? getUploadPermissionDeniedReason(currentUser) : undefined}
          onChooseFiles={upload.handleChooseFile}
          onFileChange={upload.handleFileChange}
          onDragEnter={upload.handleUploadDragEnter}
          onDragOver={upload.handleUploadDragOver}
          onDragLeave={upload.handleUploadDragLeave}
          onDrop={upload.handleUploadDrop}
          onUploadAndExtract={handleUploadAndExtract}
        />
      ) : null}

      {!pilotReviewerReadOnly && activeInputMethod === 'spreadsheet' ? (
        <SpreadsheetImportPanel
          onDownloadCsvTemplate={downloadCsvTemplate}
          onDownloadExcelTemplate={downloadExcelTemplate}
          onSuccess={handleManualOrSpreadsheetSave}
          onSourceChange={() => {
            beginActiveReviewRequest({ clearRoute: true });
          }}
        />
      ) : null}

      {!pilotReviewerReadOnly && activeInputMethod === 'manual' ? (
        <ManualEntryPanel
          containerRef={manualEntryRef}
          onSuccess={handleManualOrSpreadsheetSave}
        />
      ) : null}

      {error ? <div style={errorStyle}>{error}</div> : null}

      <ReviewDataSection
        loading={documents.loading}
        hasLoaded={documents.hasLoaded}
        loadError={documents.error}
        total={documents.total}
        onRetryDocuments={() => void documents.loadDocuments()}
        documents={documents.items}
        visibleDocuments={visibleDocuments}
        hasMissingFiles={hasMissingFiles}
        selectedDocumentsActionLabel={selectedDocumentsActionLabel}
        selectedDocumentsActionDisabled={selectedDocumentsActionDisabled}
        selectedDocumentsActionHelp={selectedDocumentsActionHelp}
        showAllDocuments={showAllDocuments}
        lastSavedSpreadsheetDocumentId={lastSavedSpreadsheetDocumentId}
        lastConfirmDocumentId={lastConfirmDocumentId}
        reviewSectionRef={reviewSectionRef}
        reviewHeadingRef={reviewHeadingRef}
        fileMissingExplanation={FILE_MISSING_EXPLANATION}
        onSelectedDocumentsAction={handleSelectedDocumentsAction}
        onToggleShowAllDocuments={() => setShowAllDocuments((v) => !v)}
        selectedDocumentIds={selectedDocumentIds}
        selectableVisibleDocuments={selectableVisibleDocuments}
        latestDocumentId={latestDocumentId}
        openDocumentMenuId={openDocumentMenuId}
        documentMenuButtonRefs={documentMenuButtonRefs}
        getDocumentActionModelForDoc={getDocumentActionModelForDoc}
        handleDocumentAction={handleDocumentAction}
        toggleDocumentSelection={toggleDocumentSelection}
        toggleVisibleDocumentSelection={toggleVisibleDocumentSelection}
        toggleDocumentMenu={toggleDocumentMenu}
      />

      {showPersistentSuccessPanel ? (
        <div style={successStyle}>
          {renderSuccessMessage(successMessage ?? '')}

          {showPostImportLinks ? (
            <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="input-data-post-import-action cursor-pointer"
                onClick={() =>
                  navigate('/metrics-summary', {
                    state: buildImportReviewRouteState(),
                  })
                }
              >
                View Calculation Results
              </button>


            </div>
          ) : null}
        </div>
      ) : null}

      {documentDetails ? (
        <DocumentDetailsDialog
          document={documentDetails}
          metadata={[
            { label: 'File name', value: documentDetails.fileName },
            { label: 'Type', value: documentDetails.type },
            { label: 'Status', value: getDocumentActionModelForDoc(documentDetails).statusLabel },
            { label: 'Created date', value: formatDocumentCreatedAt(documentDetails.createdAt) },
            { label: 'Source row count', value: documentDetails.sourceRowCount ?? '-' },
            { label: 'Extracted row count', value: documentDetails.extractedRowCount ?? '-' },
            { label: 'Imported record count', value: documentDetails.importedRecordCount ?? '-' },
          ].map(({ label, value }) => ({ label, value: formatDocumentMetadataValue(value) }))}
          onClose={() => setDocumentDetails(null)}
        />
      ) : null}

      {review.state.previewDocumentId ? (
        <DraftRecordsReview
          hasImportValidationErrors={review.summary.hasImportValidationErrors}
          headerProps={{
            extractedRowCount: review.state.parsedActivities.length,
            readyImportableCount: review.summary.readyImportableCount,
            trackedImportableCount: review.summary.trackedImportableCount,
            rowsRequiringReviewCount: review.summary.rowsRequiringReviewCount,
            alreadyImportedParsedActivitiesCount: review.summary.alreadyImportedParsedActivitiesCount,
            detectedSourceItemCount: review.summary.detectedSourceItemCount,
            selectedImportableActivitiesCount: review.summary.selectedImportableActivitiesCount,
            previewSourceSummary,
            canImportData,
            canConfirmImport: review.summary.canConfirmImport,
            confirmingId: review.state.confirmingId,
            generatingMetrics: review.state.generatingMetrics,
            permissionDeniedReason: getDraftRowsPermissionDeniedReason(currentUser),
            selection: {
              selectedParsedActivitiesCount: review.summary.selectedParsedActivitiesCount,
              importableCount: review.summary.importableParsedActivities.length,
              selectedReadyImportableCount: review.summary.selectedReadyImportableCount,
              selectedTrackedImportableCount: review.summary.selectedTrackedImportableCount,
              rowsLeftOutOfImportCount: review.summary.rowsLeftOutOfImportCount,
            },
            selectAllParsedActivities: review.actions.selectAllParsedActivities,
            clearAllParsedActivities: review.actions.clearAllParsedActivities,
            addParsedActivity: review.actions.addParsedActivity,
            onConfirmImport: () => void review.actions.handleConfirmImport(),
          }}
          bulkProvinceProps={{
            missingProvinceCount: review.validation.missingProvinceRowIndexes.length,
            bulkProvince: review.state.bulkProvince,
            canSetProvinceOnDraftRows,
            isProcessing,
            canSetBulkProvince: review.summary.canSetBulkProvince,
            setProvinceDisabledReason: getSetProvinceDisabledReason(),
            onBulkProvinceChange: review.actions.setBulkProvince,
            applyBulkProvinceToMissingRows: review.actions.applyBulkProvinceToMissingRows,
          }}
          validationProps={{
            validationSummaryRef,
            importValidationIssues: review.validation.importValidationIssues,
          }}
          detectedSourceItemsProps={{
            detectedSourceItems: review.state.detectedSourceItems,
          }}
          tableProps={{
            rowClassifications: review.summary.draftRowClassifications,
            getRowValidationIssues: review.validation.getRowValidationIssues,
            parsedActivities: review.state.parsedActivities,
            getFieldValidationMessage: review.validation.getFieldValidationMessage,
            isParsedActivityImportable: review.validation.isParsedActivityImportable,
            isParsedActivityAlreadyImported: review.validation.isParsedActivityAlreadyImported,
            toggleParsedActivitySelected: review.actions.toggleParsedActivitySelected,
            updateParsedActivityField: review.actions.updateParsedActivityField,
            removeParsedActivity: review.actions.removeParsedActivity,
            getRecordDateSuggestion,
          }}
        />
      ) : null}

      {documentToDelete ? (
        <DeleteDocumentDialog
          isImported={isImportedDocument(documentToDelete)}
          deleting={deletingDocumentId !== null}
          onCancel={() => setDocumentToDelete(null)}
          onConfirm={handleDeleteDocument}
        />
      ) : null}
      {activeMenuDocument && documentMenuPosition ? (
        <DocumentActionMenu
          document={activeMenuDocument}
          actions={getDocumentActionModelForDoc(activeMenuDocument).menuActions}
          position={documentMenuPosition}
          menuRef={documentMenuRef}
          onAction={handleDocumentAction}
        />
      ) : null}
    </div>
  );
}
