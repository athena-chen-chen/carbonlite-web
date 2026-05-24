import { ChangeEvent, DragEvent, useEffect, useRef, useState } from 'react';
import { deleteDocument, getDocuments, uploadDocument } from '../services/documents';
import {
  confirmDocumentImport,
  extractDocument,
  type ParsedActivity,
} from '../services/documentExtraction';
import { useNavigate } from 'react-router-dom';
import { calculateMetrics } from '../services/metrics';
import {
  activityTypeDefaultUnits,
  activityTypes,
  defaultActivityType,
} from '../constants/activityTypes';
import { buildApiUrl } from '../config/api';
import { getToken } from '../services/auth';
import {
  demoDocuments,
  demoParsedActivities,
  enableDemoMode,
  isDemoMode,
} from '../demo/demoData';


type DocumentItem = {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string | null;
  fileSize?: number | null;
  type: string;
  status: string;
  createdAt: string;
};

type EditableConfidenceField<T> = {
  value: T | null;
  confidence: 'high' | 'medium' | 'low';
};

type EditableParsedActivity = {
  selected: boolean;
  documentId: string;
  documentFileName: string;
  activityType: EditableConfidenceField<string>;
  recordDate: EditableConfidenceField<string>;
  quantity: EditableConfidenceField<number>;
  unit: EditableConfidenceField<string>;
  sourceReference: EditableConfidenceField<string>;
  notes: EditableConfidenceField<string>;
};

type RawExtractionField = string | number | null | undefined | Record<string, any>;

const MAX_UPLOAD_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export function getDocumentDownloadUrl(documentId: string) {
  return buildApiUrl(`/documents/${documentId}/download`);
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function extractFieldConfidence(value: RawExtractionField) {
  return isRecord(value) && typeof value.confidence === 'string'
    ? value.confidence
    : 'medium';
}

function formatOptionalExtractionField(value: RawExtractionField) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);

  if (!isRecord(value)) return '';

  const nestedValue = value.value ?? value.text ?? value.label ?? value.source;
  if (typeof nestedValue === 'string' || typeof nestedValue === 'number') {
    return String(nestedValue);
  }

  return '';
}

export function formatSourceReference(
  value: RawExtractionField,
  documentFileName = '',
) {
  if (typeof value === 'string' && value.trim()) return value;
  if (typeof value === 'number') return String(value);

  if (!isRecord(value)) return documentFileName;

  const fileLabel = formatOptionalExtractionField(
    value.fileName ??
      value.filename ??
      value.documentFileName ??
      value.documentName ??
      value.document,
  );
  const page = value.pageNumber ?? value.page;
  const sourceLabel = formatOptionalExtractionField(
    value.sourceLabel ?? value.label ?? value.sourceType ?? value.type ?? value.method,
  );
  const parts = [
    formatOptionalExtractionField(
      fileLabel || (typeof value.value === 'string' ? value.value : ''),
    ),
    page ? `Page ${page}` : '',
    sourceLabel,
  ].filter((part) => String(part).trim());

  return parts.join(' - ') || 'PDF extraction';
}

export function UploadPage() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [documentType, setDocumentType] = useState('OTHER');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDraggingUpload, setIsDraggingUpload] = useState(false);

  const [extractingId, setExtractingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [generatingMetrics, setGeneratingMetrics] = useState(false);
  const [previewDocumentId, setPreviewDocumentId] = useState<string | null>(null);
  const [previewDocumentIds, setPreviewDocumentIds] = useState<string[]>([]);
  const [parsedActivities, setParsedActivities] = useState<EditableParsedActivity[]>([]);
  const [latestDocumentId, setLatestDocumentId] = useState<string | null>(null);
  const [showAllDocuments, setShowAllDocuments] = useState(false);
  const [demoMode, setDemoMode] = useState(() => isDemoMode());
  const [documentToDelete, setDocumentToDelete] = useState<DocumentItem | null>(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [viewingDocumentId, setViewingDocumentId] = useState<string | null>(null);
  const [openDocumentMenuId, setOpenDocumentMenuId] = useState<string | null>(null);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadDragDepthRef = useRef(0);
  const visibleDocuments = showAllDocuments ? documents : documents.slice(0, 3);
  async function loadDocuments() {
    setLoading(true);
    setError(null);

    try {
      if (demoMode) {
        setDocuments(demoDocuments);
        setPreviewDocumentId('MULTIPLE');
        setPreviewDocumentIds(demoDocuments.map((document) => document.id));
        setParsedActivities(buildDemoReviewRows());
        setSuccessMessage('Demo Mode is ready with sample documents, activity records, metrics, and report examples.');
        return;
      }

      const data = await getDocuments();
      setDocuments(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocuments();
  }, [demoMode]);

  useEffect(() => {
    if (window.location.search.includes('demo=1')) {
      enableDemoMode();
      setDemoMode(true);
    }
  }, []);

  function buildDemoReviewRows() {
    return demoParsedActivities.map((item, index) => ({
      selected: true,
      documentId: demoDocuments[index]?.id ?? demoDocuments[0].id,
      documentFileName: demoDocuments[index]?.fileName ?? demoDocuments[0].fileName,
      ...item,
    }));
  }

  function startDemoMode() {
    enableDemoMode();
    setDemoMode(true);
    setDocuments(demoDocuments);
    setPreviewDocumentId('MULTIPLE');
    setPreviewDocumentIds(demoDocuments.map((document) => document.id));
    setParsedActivities(buildDemoReviewRows());
    setSuccessMessage('Demo Mode loaded: sample fuel invoice, utility bill, CSV records, and extracted activity rows are ready for review.');
    setError(null);
  }

  function getDocumentTypeFromFile(file: File) {
    const fileName = file.name.toLowerCase();

    if (file.type.startsWith('image/') || /\.(png|jpg)$/i.test(fileName)) {
      return 'IMAGE';
    }

    if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
      return 'PDF';
    }

    if (/\.(csv|xlsx)$/i.test(fileName)) {
      return 'SPREADSHEET';
    }

    return 'OTHER';
  }

  function isSupportedUploadFile(file: File) {
    return /\.(pdf|csv|xlsx|png|jpg)$/i.test(file.name);
  }

  function clearUploadInput() {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function selectUploadFiles(files: File[]) {
    const unsupportedFile = files.find((file) => !isSupportedUploadFile(file));

    if (unsupportedFile) {
      setSelectedFiles([]);
      setSuccessMessage(null);
      setError(
        `${unsupportedFile.name} is not supported. Please choose PDF, CSV, XLSX, PNG, or JPG files.`,
      );
      clearUploadInput();
      return;
    }

    const oversizedFile = files.find(
      (file) => file.size > MAX_UPLOAD_FILE_SIZE_BYTES,
    );

    if (oversizedFile) {
      setSelectedFiles([]);
      setSuccessMessage(null);
      setError(`${oversizedFile.name} must be 10 MB or less.`);
      clearUploadInput();
      return;
    }

    setSelectedFiles(files);
    setSuccessMessage(null);
    setError(null);

    if (files[0]) {
      setDocumentType(getDocumentTypeFromFile(files[0]));
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    selectUploadFiles(files);
  }

  function handleUploadDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (isProcessing) return;

    uploadDragDepthRef.current += 1;
    setIsDraggingUpload(true);
  }

  function handleUploadDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (isProcessing) {
      event.dataTransfer.dropEffect = 'none';
      return;
    }

    event.dataTransfer.dropEffect = 'copy';
    setIsDraggingUpload(true);
  }

  function handleUploadDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();

    uploadDragDepthRef.current = Math.max(0, uploadDragDepthRef.current - 1);

    if (uploadDragDepthRef.current === 0) {
      setIsDraggingUpload(false);
    }
  }

  function handleUploadDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();

    uploadDragDepthRef.current = 0;
    setIsDraggingUpload(false);

    if (isProcessing) return;

    const files = Array.from(event.dataTransfer.files ?? []);
    selectUploadFiles(files);
  }

  function handleUseSampleCSV() {
    const sampleRows = activityTypes.slice(0, 3).map((activityType, index) => {
      const quantity = [120, 80, 300][index] ?? 100;
      const unit = activityTypeDefaultUnits[activityType] || 'unit';
      return `${activityType},2026-03-0${index + 1},${quantity},${unit}`;
    });

    const blob = new Blob(
      [
        `activityType,recordDate,quantity,unit
${sampleRows.join('\n')}`,
      ],
      { type: 'text/csv' },
    );

    const file = new File([blob], 'carbonlite-sample.csv', {
      type: 'text/csv',
    });

    setSelectedFiles([file]);
    setDocumentType('SPREADSHEET');
    setError(null);
    setSuccessMessage('Sample CSV loaded. Click Upload & Extract.');
  }

  async function uploadSelectedFile(options?: { extractAfterUpload?: boolean }) {
    if (selectedFiles.length === 0) {
      setError('Please select at least one file first.');
      return;
    }

    const shouldExtractAfterUpload = options?.extractAfterUpload ?? false;

    setUploading(true);
    setError(null);
    setSuccessMessage(
      shouldExtractAfterUpload
        ? 'Uploading document...'
        : selectedFiles.length > 1
        ? `Uploading ${selectedFiles.length} files...`
        : 'Uploading file...',
    );

    try {
      const uploadedDocuments: DocumentItem[] = [];

      try {
        for (const file of selectedFiles) {
          const uploadedDocument = await uploadDocument({
            file,
            type: selectedFiles.length > 1 ? getDocumentTypeFromFile(file) : documentType,
          });
          uploadedDocuments.push(uploadedDocument);
        }
      } catch {
        setError('Upload failed. Please try again.');
        setSuccessMessage(null);
        return;
      }

      setSelectedFiles([]);

      const input = document.getElementById(
        'document-upload-input',
      ) as HTMLInputElement | null;

      if (input) {
        input.value = '';
      }

      const data = await getDocuments();
      setDocuments(data.items ?? []);

      const latest = data.items?.[0];

      if (!latest) {
        throw new Error('Upload completed, but no uploaded document was found.');
      }

      setLatestDocumentId(uploadedDocuments[0]?.id ?? latest.id);
      if (shouldExtractAfterUpload) {
        setSuccessMessage(
          selectedFiles.length > 1
            ? `Uploaded ${selectedFiles.length} files. Extracting data now...`
            : 'Upload completed. Extracting data now...',
        );
        await handleExtractDocuments(uploadedDocuments);
      } else {
        setSuccessMessage(
          selectedFiles.length > 1
            ? `Uploaded ${selectedFiles.length} files. You can now extract or review them.`
            : 'Upload completed. You can now extract or review the uploaded file.',
        );
      }
    } catch (err) {
      setError(
        shouldExtractAfterUpload
          ? 'Extraction could not identify valid activity rows.'
          : err instanceof Error
          ? err.message
          : 'Upload completed, but documents could not be refreshed.',
      );
      setSuccessMessage(null);
    } finally {
      setUploading(false);
    }
  }


  function handleChooseFile() {
    fileInputRef.current?.click();
  }
  async function handleUploadAndExtract() {
    await uploadSelectedFile({ extractAfterUpload: true });
  }

  function updateDocumentStatuses(documentIds: string[], status: string) {
    setDocuments((prev) =>
      prev.map((document) =>
        documentIds.includes(document.id)
          ? {
              ...document,
              status,
            }
          : document,
      ),
    );
  }

  function isRetryableExtractionStatus(status: string) {
    return status === 'NO_DATA_FOUND' || status === 'EXTRACTION_FAILED';
  }

  function canImportDocument(doc: DocumentItem) {
    return (
      !generatingMetrics &&
      confirmingId !== doc.id &&
      previewDocumentIds.length <= 1 &&
      previewDocumentId === doc.id &&
      parsedActivities.length > 0
    );
  }

  function getDocumentPrimaryAction(doc: DocumentItem) {
    if (extractingId === doc.id) return { label: 'Extracting...', disabled: true };
    if (confirmingId === doc.id) return { label: 'Importing...', disabled: true };
    if (generatingMetrics) return { label: 'Generating...', disabled: true };

    if (doc.status === 'IMPORTED') {
      return { label: 'View Results', disabled: false };
    }

    if (canImportDocument(doc)) {
      return { label: 'Import', disabled: false };
    }

    if (doc.status === 'REVIEW_REQUIRED') {
      return { label: 'Re-extract', disabled: false };
    }

    return {
      label: isRetryableExtractionStatus(doc.status) ? 'Re-extract' : 'Extract',
      disabled: false,
    };
  }

  function handleDocumentPrimaryAction(doc: DocumentItem) {
    const action = getDocumentPrimaryAction(doc);
    if (action.disabled) return;
    setOpenDocumentMenuId(null);

    if (action.label === 'View Results') {
      navigate('/metrics-summary');
      return;
    }

    if (action.label === 'Import') {
      handleConfirmImport(doc.id);
      return;
    }

    handleExtract(doc.id);
  }

  async function handleViewDocument(doc: DocumentItem) {
    if (viewingDocumentId === doc.id) return;

    if (demoMode && doc.fileUrl?.startsWith('/demo/')) {
      window.open(doc.fileUrl, '_blank', 'noopener,noreferrer');
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
    } catch (err) {
      viewerWindow?.close();
      setError(
        err instanceof Error && err.message === 'FILE_UNAVAILABLE'
          ? 'This uploaded file is no longer available. Please upload it again.'
          : 'Unable to open document.',
      );
      setSuccessMessage(null);
    } finally {
      setViewingDocumentId(null);
    }
  }

  function clearDeletedDocumentPreview(documentId: string) {
    setParsedActivities((prev) => prev.filter((item) => item.documentId !== documentId));
    setSelectedDocumentIds((prev) => prev.filter((id) => id !== documentId));
    setPreviewDocumentIds((prev) => {
      const next = prev.filter((id) => id !== documentId);
      setPreviewDocumentId(next.length === 0 ? null : next.length === 1 ? next[0] : 'MULTIPLE');
      return next;
    });

    setLatestDocumentId((prev) => (prev === documentId ? null : prev));
  }

  async function handleDeleteDocument() {
    if (!documentToDelete) return;

    const documentId = documentToDelete.id;
    setDeletingDocumentId(documentId);
    setError(null);
    setSuccessMessage(null);

    try {
      await deleteDocument(documentId);
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
      clearDeletedDocumentPreview(documentId);
      setDocumentToDelete(null);
      setOpenDocumentMenuId(null);
      setSuccessMessage('Document deleted. Existing activity records will remain.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Document deletion failed. Please try again.');
    } finally {
      setDeletingDocumentId(null);
    }
  }

  function toggleDocumentSelection(documentId: string, checked: boolean) {
    setSelectedDocumentIds((prev) =>
      checked
        ? Array.from(new Set([...prev, documentId]))
        : prev.filter((id) => id !== documentId),
    );
  }

  function toggleVisibleDocumentSelection(checked: boolean) {
    const visibleIds = visibleDocuments.map((document) => document.id);

    setSelectedDocumentIds((prev) => {
      if (checked) {
        return Array.from(new Set([...prev, ...visibleIds]));
      }

      return prev.filter((id) => !visibleIds.includes(id));
    });
  }

  function handleGenerateReportFromSelectedDocuments() {
    if (!selectedDocumentIds.length) return;

    navigate('/reports', {
      state: {
        reportScope: 'selectedDocuments',
        selectedDocumentIds,
      },
    });
  }

  async function handleExtract(documentId: string) {
    const document = documents.find((doc) => doc.id === documentId);
    await handleExtractDocuments([
      {
        id: documentId,
        fileName: document?.fileName ?? documentId,
      },
    ]);
  }

  async function handleExtractDocuments(
    documentsToExtract: Array<{ id: string; fileName: string }>,
  ) {
    if (documentsToExtract.length === 0) {
      setError('No uploaded documents were found to extract.');
      return;
    }

    setExtractingId(documentsToExtract.length > 1 ? 'multiple' : documentsToExtract[0].id);
    setError(null);
    setSuccessMessage(null);

    try {
      if (demoMode) {
        setSuccessMessage('Extracting sample fuel, electricity, and operations records...');
        setPreviewDocumentId(documentsToExtract.length === 1 ? documentsToExtract[0].id : 'MULTIPLE');
        setPreviewDocumentIds(documentsToExtract.map((document) => document.id));
        setParsedActivities(buildDemoReviewRows());
        updateDocumentStatuses(
          documentsToExtract.map((document) => document.id),
          'REVIEW_REQUIRED',
        );
        setSuccessMessage('Extraction completed. Review the three realistic activity rows, then confirm import.');
        return;
      }

      const extractedRows: EditableParsedActivity[] = [];
      const warnings: string[] = [];
      const noDataDocumentIds: string[] = [];
      const reviewRequiredDocumentIds: string[] = [];

      for (const document of documentsToExtract) {
        const result = await extractDocument(document.id);
        const extractedActivities = result.parsedActivities ?? [];

        if (extractedActivities.length === 0) {
          noDataDocumentIds.push(document.id);
        } else {
          reviewRequiredDocumentIds.push(document.id);
        }

        extractedRows.push(
          ...extractedActivities.map((item: ParsedActivity | any) => ({
            selected: true,
            documentId: document.id,
            documentFileName: document.fileName,
            ...item,
            sourceReference: {
              value: formatSourceReference(item.sourceReference, document.fileName),
              confidence: extractFieldConfidence(item.sourceReference),
            },
            notes: {
              value: formatOptionalExtractionField(item.notes),
              confidence: extractFieldConfidence(item.notes),
            },
          })),
        );

        if (result.possibleMissingRows) {
          warnings.push(result.warning ?? `${document.fileName}: possible missing rows detected.`);
        }
      }

      if (noDataDocumentIds.length > 0) {
        updateDocumentStatuses(noDataDocumentIds, 'NO_DATA_FOUND');
      }

      if (reviewRequiredDocumentIds.length > 0) {
        updateDocumentStatuses(reviewRequiredDocumentIds, 'REVIEW_REQUIRED');
      }

      if (extractedRows.length === 0) {
        setPreviewDocumentId(null);
        setPreviewDocumentIds([]);
        setParsedActivities([]);
        setError('No emissions data detected. You can view the file or retry extraction.');
        setSuccessMessage(null);
        await loadDocuments();
        return;
      }

      setPreviewDocumentId(
        documentsToExtract.length === 1 ? documentsToExtract[0].id : 'MULTIPLE',
      );
      setPreviewDocumentIds(documentsToExtract.map((document) => document.id));
      setParsedActivities(extractedRows);
      await loadDocuments();

      if (warnings.length > 0) {
        setError(warnings.join(' '));
        setSuccessMessage(null);
      } else {
        setSuccessMessage(
          documentsToExtract.length > 1
            ? 'Extraction completed for multiple files. Review the preview below, then click Confirm Import.'
            : 'Extraction completed. Review the preview below, then click Confirm Import.',
        );
        setError(null);
      }
    } catch {
      updateDocumentStatuses(
        documentsToExtract.map((document) => document.id),
        'EXTRACTION_FAILED',
      );
      setError('Extraction could not identify valid activity rows.');
      await loadDocuments();
    } finally {
      setExtractingId(null);
    }
  }

  async function handleConfirmImport(documentId?: string) {
    const activeDocumentIds =
      previewDocumentIds.length > 0
        ? previewDocumentIds
        : documentId
        ? [documentId]
        : [];

    if (!parsedActivities.length || activeDocumentIds.length === 0) {
      setError('No extracted activities to confirm.');
      return;
    }

    const selectedActivities = parsedActivities.filter((item) => item.selected);
    const invalidQuantityIndex = selectedActivities.findIndex((item) => {
      const quantity = Number(item.quantity.value);
      return !Number.isFinite(quantity) || quantity < 0;
    });

    if (invalidQuantityIndex !== -1) {
      setError(
        `Quantity cannot be negative. Please fix selected row ${invalidQuantityIndex + 1} before importing.`,
      );
      setSuccessMessage(null);
      return;
    }

    setConfirmingId(activeDocumentIds.length > 1 ? 'multiple' : activeDocumentIds[0]);
    setError(null);
    setSuccessMessage(null);

    try {
      if (demoMode) {
        const importedCount = selectedActivities.length;
        setPreviewDocumentId(null);
        setPreviewDocumentIds([]);
        setParsedActivities([]);
        setGeneratingMetrics(true);
        setSuccessMessage(`Imported ${importedCount} activity record(s). Metrics generated automatically.`);
        await calculateMetrics(selectedActivities.map((_, index) => `demo-activity-${index + 1}`));
        navigate('/metrics-summary?demo=1');
        return;
      }

      const activitiesByDocument = selectedActivities.reduce(
        (groups, item) => {
          const group = groups.get(item.documentId) ?? [];
          group.push(item);
          groups.set(item.documentId, group);
          return groups;
        },
        new Map<string, EditableParsedActivity[]>(),
      );

      let importedCount = 0;
      const createdActivityIds: string[] = [];

      for (const [activityDocumentId, activities] of activitiesByDocument) {
        const sourceFileName =
          activities[0]?.documentFileName ??
          documents.find((d) => d.id === activityDocumentId)?.fileName ??
          activityDocumentId;
        const normalizedActivities = activities.map((item) => ({
          activityType: item.activityType.value,
          recordDate: item.recordDate.value,
          quantity: item.quantity.value,
          unit: item.unit.value,
          sourceType: 'AI_EXTRACTION',
          sourceReference: item.sourceReference.value || sourceFileName,
          notes: `Imported from AI extraction. Document ID: ${activityDocumentId}`,
        }));

        if (normalizedActivities.length === 0) continue;

        const result = await confirmDocumentImport(
          activityDocumentId,
          normalizedActivities,
        );
        importedCount += result.count;
        createdActivityIds.push(...(result.createdIds ?? []));
      }

      if (importedCount === 0) {
        setError('Please select at least one activity to import.');
        setConfirmingId(null);
        return;
      }

      setPreviewDocumentId(null);
      setPreviewDocumentIds([]);
      setParsedActivities([]);

      setGeneratingMetrics(true);
      setSuccessMessage('Generating emissions metrics...');

      try {
        if (createdActivityIds.length > 0) {
          await calculateMetrics(createdActivityIds);
        }

        setSuccessMessage(
          `Imported ${importedCount} activity record(s). Generated emissions metrics. Redirecting to Metrics Summary...`,
        );
        navigate('/metrics-summary');
      } catch {
        setError(
          'Imported activity records, but emissions metrics could not be generated automatically. You can click Generate Metrics on the Metrics Summary page.',
        );
        navigate('/metrics-summary', {
          state: {
            metricsError:
              'Imported activity records, but emissions metrics could not be generated automatically. Click Generate Metrics to retry.',
          },
        });
      } finally {
        setGeneratingMetrics(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirm import failed');
    } finally {
      setConfirmingId(null);
    }
  }

  function getConfidenceStyle(confidence: string): React.CSSProperties {
    if (confidence === 'low') {
      return {
        background: '#fff1f1',
        border: '1px solid #f5c2c7',
      };
    }

    if (confidence === 'medium') {
      return {
        background: '#fff8e6',
        border: '1px solid #f3d28b',
      };
    }

    return {
      background: '#f6fff7',
      border: '1px solid #b7e4c7',
    };
  }

function updateParsedActivityField(
    index: number,
    field: keyof EditableParsedActivity,
    value: string,
  ) {
    setParsedActivities((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        if (field === 'selected') return item;

        const currentField = item[field] as EditableConfidenceField<any>;

        return {
          ...item,
          [field]: {
            ...currentField,
            value:
              field === 'quantity'
                ? Number(value)
                : formatOptionalExtractionField(value),
            confidence: 'medium',
          },
        };
      }),
    );
  }

  function removeParsedActivity(index: number) {
    setParsedActivities((prev) => prev.filter((_, i) => i !== index));
  }

  function addParsedActivity() {
    setParsedActivities((prev) => [
      ...prev,
      {
        selected: true,
        documentId: previewDocumentIds[0] ?? previewDocumentId ?? '',
        documentFileName:
          documents.find((doc) => doc.id === (previewDocumentIds[0] ?? previewDocumentId))
            ?.fileName ??
          previewDocumentIds[0] ??
          previewDocumentId ??
          '',
        activityType: { value: defaultActivityType, confidence: 'medium' },
        recordDate: {
          value: new Date().toISOString().slice(0, 10),
          confidence: 'medium',
        },
        quantity: { value: 0, confidence: 'low' },
        unit: { value: 'liters', confidence: 'medium' },
        sourceReference: {
          value:
            documents.find((doc) => doc.id === (previewDocumentIds[0] ?? previewDocumentId))
              ?.fileName ?? '',
          confidence: 'medium',
        },
        notes: { value: '', confidence: 'medium' },
      },
    ]);
  }

  function toggleParsedActivitySelected(index: number, checked: boolean) {
    setParsedActivities((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              selected: checked,
            }
          : item,
      ),
    );
  }

  function selectAllParsedActivities() {
    setParsedActivities((prev) =>
      prev.map((item) => ({
        ...item,
        selected: true,
      })),
    );
  }

  function clearAllParsedActivities() {
    setParsedActivities((prev) =>
      prev.map((item) => ({
        ...item,
        selected: false,
      })),
    );
  }

  const isProcessing =
    uploading ||
    extractingId !== null ||
    confirmingId !== null ||
    generatingMetrics;
  const showPostImportLinks =
    Boolean(successMessage) && /import|metric/i.test(successMessage ?? '');

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 8 }}>Upload & Extract Carbon Data</h1>

      <p style={{ color: '#666', marginBottom: 16 }}>
        Upload invoices, fuel receipts, utility bills, or CSV files. CarbonLite AI will extract activity data and prepare it for review.
      </p>

      <div style={stepBarStyle}>
        Upload → Extract → Review → Import → Metrics → Reports
      </div>

      <div style={demoBannerStyle}>
        <div>
          <strong>{demoMode ? 'Demo Mode active' : 'Prepare a 90-second demo'}</strong>
          <div style={{ color: '#475569', marginTop: 4 }}>
            Preload a fuel invoice, utility bill, CSV activity file, extracted rows, metrics, and report examples.
          </div>
        </div>
        <button type="button" onClick={startDemoMode} style={primaryButtonStyle(false)}>
          {demoMode ? 'Reload Demo Data' : 'Start Demo Mode'}
        </button>
      </div>

      <div style={uploadCardStyle}>
        <h2 style={{ marginTop: 0 }}>Upload your documents</h2>
        <p style={{ color: '#666' }}>
          Drop documents here, choose documents with the file picker, or use a sample file to test the workflow.
        </p>

        <div style={{ display: 'grid', gap: 16, maxWidth: 700 }}>
          <div
            onDragEnter={handleUploadDragEnter}
            onDragOver={handleUploadDragOver}
            onDragLeave={handleUploadDragLeave}
            onDrop={handleUploadDrop}
            style={uploadDropzoneStyle(isDraggingUpload, isProcessing)}
          >
            <strong>{isDraggingUpload ? 'Drop to select files' : 'Drag and drop files here'}</strong>
            <span style={{ color: '#666' }}>
              PDF, CSV, XLSX, PNG, or JPG files are supported. Max 10 MB.
            </span>
          </div>

          <div>
            <label style={documentTypeLabelStyle}>
              Document Type
            </label>
            <div style={documentTypeSelectWrapStyle}>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                style={documentTypeSelectStyle}
              >
                <option value="UTILITY_BILL">UTILITY_BILL</option>
                <option value="FUEL_INVOICE">FUEL_INVOICE</option>
                <option value="SPREADSHEET">SPREADSHEET</option>
                <option value="PDF">PDF</option>
                <option value="IMAGE">IMAGE</option>
                <option value="OTHER">OTHER</option>
              </select>
              <span aria-hidden="true" style={documentTypeSelectArrowStyle} />
            </div>
          </div>

   

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
           <input
            ref={fileInputRef}
            id="document-upload-input"
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.csv,.xlsx,.png,.jpg"
            style={{ display: 'none' }}
            multiple
          />

            <button
              type="button"
             onClick={handleChooseFile}
              disabled={isProcessing}
              style={secondaryActionButtonStyle(isProcessing)}
            >
              {uploading ? 'Uploading...' : 'Upload File'}
            </button>

            <button
              type="button"
              onClick={handleUseSampleCSV}
              disabled={isProcessing}
              style={secondaryActionButtonStyle(isProcessing)}
            >
              Use Sample CSV
            </button>

            <button
              type="button"
              onClick={handleUploadAndExtract}
              disabled={isProcessing}
              style={primaryButtonStyle(isProcessing)}
            >
              {isProcessing ? 'Processing...' : 'Upload & Extract'}
            </button>
          </div>

          {selectedFiles.length > 0 ? (
            <div style={fileInfoStyle}>
              <strong>
                Selected {selectedFiles.length} file{selectedFiles.length === 1 ? '' : 's'}:
              </strong>
              <ul style={selectedFileListStyle}>
                {selectedFiles.map((file) => (
                  <li key={`${file.name}-${file.size}-${file.lastModified}`}>
                    {file.name} · {file.type || 'Unknown'} · {file.size} bytes
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      {error ? <div style={errorStyle}>{error}</div> : null}

      <div style={sectionCardStyle}>
        <div style={uploadedDocumentsHeaderStyle}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Uploaded Documents</h2>
          <button
            type="button"
            onClick={handleGenerateReportFromSelectedDocuments}
            disabled={!selectedDocumentIds.length}
            style={selectedDocumentsReportButtonStyle(selectedDocumentIds.length)}
          >
            Generate Report from Selected Documents
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 16 }}>
            <strong>Loading documents...</strong>
            <div style={{ marginTop: 8, color: '#64748b' }}>
              Preparing uploaded files and extraction status.
            </div>
          </div>
        ) : documents.length === 0 ? (
          <div style={emptyStateStyle}>
            <strong>No documents yet</strong>
            <p style={{ margin: '8px 0 0', color: '#64748b' }}>
              Upload a file or start Demo Mode to see a complete source-document workflow.
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <colgroup>
              <col style={{ width: 52 }} />
              <col />
              <col style={{ width: 110 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 80 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 190 }} />
            </colgroup>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                <th style={thStyle}>
                  <input
                    type="checkbox"
                    checked={
                      visibleDocuments.length > 0 &&
                      visibleDocuments.every((doc) => selectedDocumentIds.includes(doc.id))
                    }
                    onChange={(event) =>
                      toggleVisibleDocumentSelection(event.target.checked)
                    }
                    aria-label="Select visible documents"
                  />
                </th>
                <th style={thStyle}>File Name</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Size</th>
                <th style={thStyle}>Created At</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleDocuments.map((doc) => (
                <tr
                  key={doc.id}
                  style={doc.id === latestDocumentId ? { background: '#f0f7ff' } : undefined}
                >
                  <td style={tdStyle}>
                    <input
                      type="checkbox"
                      checked={selectedDocumentIds.includes(doc.id)}
                      onChange={(event) =>
                        toggleDocumentSelection(doc.id, event.target.checked)
                      }
                      aria-label={`Select document ${doc.fileName}`}
                    />
                  </td>
                  <td style={tdStyle}>{doc.fileName}</td>
                  <td style={tdStyle}>{doc.type}</td>
                  <td style={tdStyle}>{doc.status}</td>
                  <td style={tdStyle}>{doc.fileSize ?? '-'}</td>
                  <td style={tdStyle}>{doc.createdAt}</td>
                  <td style={documentActionTdStyle}>
                    <div style={documentActionRowCompactStyle}>
                      <button
                        type="button"
                        onClick={() => handleDocumentPrimaryAction(doc)}
                        disabled={getDocumentPrimaryAction(doc).disabled}
                        title={getDocumentPrimaryAction(doc).label}
                        style={documentPrimaryActionButtonStyle(
                          getDocumentPrimaryAction(doc).disabled,
                        )}
                      >
                        {getDocumentPrimaryAction(doc).label}
                      </button>

                      <div style={documentMenuWrapStyle}>
                        <button
                          type="button"
                          aria-label={`More actions for ${doc.fileName}`}
                          aria-expanded={openDocumentMenuId === doc.id}
                          onClick={() =>
                            setOpenDocumentMenuId((current) =>
                              current === doc.id ? null : doc.id,
                            )
                          }
                          style={kebabButtonStyle}
                        >
                          ⋮
                        </button>

                        {openDocumentMenuId === doc.id ? (
                          <div style={documentMenuStyle}>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenDocumentMenuId(null);
                                handleViewDocument(doc);
                              }}
                              disabled={viewingDocumentId === doc.id}
                              style={documentMenuItemStyle(viewingDocumentId === doc.id)}
                            >
                              {viewingDocumentId === doc.id ? 'Opening...' : 'View'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenDocumentMenuId(null);
                                handleConfirmImport(doc.id);
                              }}
                              disabled={!canImportDocument(doc)}
                              style={documentMenuItemStyle(!canImportDocument(doc))}
                            >
                              Import
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenDocumentMenuId(null);
                                setDocumentToDelete(doc);
                              }}
                              disabled={deletingDocumentId === doc.id}
                              style={documentMenuDangerItemStyle(deletingDocumentId === doc.id)}
                            >
                              {deletingDocumentId === doc.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <br/>
 {documents.length > 3 && (
  <button
    type="button"
    onClick={() => setShowAllDocuments((v) => !v)}
    style={secondaryButtonStyle}
  >
    {showAllDocuments ? 'Show Less' : `View All Documents (${documents.length})`}
  </button>
)}

{successMessage ? (
  <div style={successStyle}>
    {successMessage}

    {showPostImportLinks ? (
    <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
      <button type="button" onClick={() => navigate('/metrics-summary')}>
        View Metrics
      </button>

      <button type="button" onClick={() => navigate('/reports')}>
        View Reports
      </button>
    </div>
    ) : null}
  </div>
) : null}
      {previewDocumentId ? (
        <div style={{ ...sectionCardStyle, marginTop: 24 }}>
          <div style={previewHeaderStyle}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20 }}>Review & Edit Data Before Import</h2>
              <p style={{ marginTop: 8, color: '#666' }}>
                Review extracted activity records before importing them into CarbonLite AI.
              </p>
              <p style={{ marginTop: 8, color: '#047857', fontWeight: 600 }}>
                Extracted rows: {parsedActivities.length}
              </p>
              <p style={{ marginTop: 8, color: '#999' }}>
                {previewDocumentIds.length > 1
                  ? `Documents: ${previewDocumentIds.length}`
                  : `Document ID: ${previewDocumentId}`}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" onClick={selectAllParsedActivities} style={secondaryButtonStyle}>
                Select All
              </button>

              <button type="button" onClick={clearAllParsedActivities} style={secondaryButtonStyle}>
                Clear All
              </button>

              <button type="button" onClick={addParsedActivity} style={secondaryButtonStyle}>
                Add Row
              </button>

              <button
                type="button"
                onClick={() => handleConfirmImport()}
                disabled={
                  confirmingId !== null ||
                  generatingMetrics ||
                  parsedActivities.length === 0
                }
                style={confirmButtonStyle(parsedActivities.length > 0)}
              >
                {generatingMetrics
                  ? 'Generating metrics...'
                  : confirmingId
                  ? 'Importing...'
                  : 'Confirm Import'}
              </button>
            </div>
          </div>

          {parsedActivities.length === 0 ? (
            <div style={{ padding: 16 }}>No extracted activities.</div>
          ) : (
            <div style={previewTableWrapStyle}>
            <table style={previewTableStyle}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  <th style={thStyle}>Select</th>
                  <th style={activityTypeThStyle}>Activity Type</th>
                  <th style={thStyle}>Record Date</th>
                  <th style={thStyle}>Quantity</th>
                  <th style={thStyle}>Unit</th>
                  <th style={thStyle}>Source Reference</th>
                  <th style={thStyle}>Notes</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {parsedActivities.map((item, index) => (
                  <tr key={`parsed-${index}`}>
                    <td style={tdStyle}>
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={(e) =>
                          toggleParsedActivitySelected(index, e.target.checked)
                        }
                      />
                    </td>

                    <td style={activityTypeTdStyle}>
                      <select
                        value={item.activityType.value ?? ''}
                        onChange={(e) =>
                          updateParsedActivityField(index, 'activityType', e.target.value)
                        }
                        style={activityTypeSelectStyle(item.activityType.confidence)}
                      >
                        <option value="">-- Select --</option>
                        {activityTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td style={tdStyle}>
                      <input
                        type="text"
                        value={item.recordDate.value ?? ''}
                        onChange={(e) =>
                          updateParsedActivityField(index, 'recordDate', e.target.value)
                        }
                        style={{
                          width: '100%',
                          padding: 8,
                          borderRadius: 6,
                          ...getConfidenceStyle(item.recordDate.confidence),
                        }}
                      />
                    </td>

                    <td style={tdStyle}>
                      <input
                        type="number"
                        min="0"
                        value={item.quantity.value ?? ''}
                        onChange={(e) =>
                          updateParsedActivityField(index, 'quantity', e.target.value)
                        }
                        style={{
                          width: '100%',
                          padding: 8,
                          borderRadius: 6,
                          ...getConfidenceStyle(item.quantity.confidence),
                        }}
                      />
                    </td>

                    <td style={tdStyle}>
                      <input
                        type="text"
                        value={item.unit.value ?? ''}
                        onChange={(e) =>
                          updateParsedActivityField(index, 'unit', e.target.value)
                        }
                        style={{
                          width: '100%',
                          padding: 8,
                          borderRadius: 6,
                          ...getConfidenceStyle(item.unit.confidence),
                        }}
                      />
                    </td>

                    <td style={tdStyle}>
                      <input
                        type="text"
                        value={item.sourceReference.value ?? ''}
                        placeholder={item.documentFileName}
                        onChange={(e) =>
                          updateParsedActivityField(index, 'sourceReference', e.target.value)
                        }
                        style={optionalInputStyle(
                          item.sourceReference.confidence,
                          item.sourceReference.value,
                        )}
                      />
                    </td>

                    <td style={tdStyle}>
                      <input
                        type="text"
                        value={item.notes.value ?? ''}
                        placeholder="Optional notes"
                        onChange={(e) =>
                          updateParsedActivityField(index, 'notes', e.target.value)
                        }
                        style={optionalInputStyle(item.notes.confidence, item.notes.value)}
                      />
                    </td>

                    <td style={tdStyle}>
                      <button
                        type="button"
                        onClick={() => removeParsedActivity(index)}
                        style={deleteButtonStyle}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      ) : null}

      {documentToDelete ? (
        <div style={modalBackdropStyle} role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-document-title"
            style={modalStyle}
          >
            <h2 id="delete-document-title" style={{ marginTop: 0 }}>
              Delete uploaded document?
            </h2>
            <p style={{ color: '#475569', lineHeight: 1.6 }}>
              This will remove <strong>{documentToDelete.fileName}</strong> from Uploaded Documents and clear any extraction preview rows for this file.
            </p>
            <p style={warningTextStyle}>Imported activity records will remain.</p>
            <div style={modalActionRowStyle}>
              <button
                type="button"
                onClick={() => setDocumentToDelete(null)}
                disabled={deletingDocumentId !== null}
                style={secondaryActionButtonStyle(deletingDocumentId !== null)}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteDocument}
                disabled={deletingDocumentId !== null}
                style={dangerButtonStyle(deletingDocumentId !== null)}
              >
                {deletingDocumentId ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const stepBarStyle: React.CSSProperties = {
  marginBottom: 24,
  padding: 12,
  borderRadius: 12,
  background: '#ecfdf5',
  border: '1px solid #a7f3d0',
  color: '#047857',
  fontWeight: 600,
};

const demoBannerStyle: React.CSSProperties = {
  marginBottom: 24,
  padding: 16,
  borderRadius: 12,
  border: '1px solid #c7d2fe',
  background: '#eef2ff',
  color: '#1e293b',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  flexWrap: 'wrap',
};

const uploadCardStyle: React.CSSProperties = {
  border: '1px solid #ddd',
  borderRadius: 16,
  padding: 20,
  marginBottom: 24,
  background: '#fff',
  boxShadow: '0 6px 20px rgba(0,0,0,0.04)',
};

const sectionCardStyle: React.CSSProperties = {
  border: '1px solid #ddd',
  borderRadius: 12,
  background: '#fff',
  overflow: 'visible',
};

const fileInfoStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 10,
  background: '#f7f7f7',
  border: '1px solid #eee',
};

const selectedFileListStyle: React.CSSProperties = {
  margin: '8px 0 0',
  paddingLeft: 20,
  color: '#475569',
  lineHeight: 1.7,
};

const documentTypeLabelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 8,
  color: '#0f172a',
  fontSize: 14,
  fontWeight: 700,
};

const documentTypeSelectWrapStyle: React.CSSProperties = {
  position: 'relative',
  maxWidth: 420,
};

const documentTypeSelectStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 46,
  padding: '10px 44px 10px 14px',
  borderRadius: 10,
  border: '2px solid #64748b',
  background: '#f8fafc',
  color: '#0f172a',
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
  appearance: 'none',
  outlineColor: '#10b981',
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)',
};

const documentTypeSelectArrowStyle: React.CSSProperties = {
  position: 'absolute',
  right: 16,
  top: '50%',
  width: 0,
  height: 0,
  borderLeft: '6px solid transparent',
  borderRight: '6px solid transparent',
  borderTop: '7px solid #0f172a',
  transform: 'translateY(-35%)',
  pointerEvents: 'none',
};

const uploadDropzoneStyle = (
  isDragging: boolean,
  isProcessing: boolean,
): React.CSSProperties => ({
  display: 'grid',
  gap: 6,
  padding: 18,
  borderRadius: 12,
  border: `2px dashed ${isDragging ? '#10b981' : '#cbd5e1'}`,
  background: isDragging ? '#ecfdf5' : '#f8fafc',
  color: isProcessing ? '#94a3b8' : '#0f172a',
  cursor: isProcessing ? 'not-allowed' : 'copy',
  opacity: isProcessing ? 0.72 : 1,
  transition: 'border-color 120ms ease, background 120ms ease, color 120ms ease',
});

const nativeFileInputStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 360,
};

const successStyle: React.CSSProperties = {
  position: 'sticky',
  top: 88,
  zIndex: 5,
  marginBottom: 16,
  padding: 14,
  borderRadius: 10,
  border: '1px solid #b8dfc1',
  background: '#f3fff5',
  color: '#1d6b2d',
  boxShadow: '0 10px 25px rgba(16, 185, 129, 0.12)',
};

const errorStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 12,
  borderRadius: 8,
  border: '1px solid #fed7aa',
  background: '#fff7ed',
  color: '#9a3412',
};

const emptyStateStyle: React.CSSProperties = {
  padding: 24,
  background: '#f8fafc',
  color: '#0f172a',
};

const previewHeaderStyle: React.CSSProperties = {
  padding: 16,
  borderBottom: '1px solid #eee',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  flexWrap: 'wrap',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: 12,
  borderBottom: '1px solid #ddd',
};

const tdStyle: React.CSSProperties = {
  padding: 12,
  borderBottom: '1px solid #eee',
  verticalAlign: 'top',
};

const previewTableWrapStyle: React.CSSProperties = {
  overflowX: 'auto',
};

const previewTableStyle: React.CSSProperties = {
  width: '100%',
  minWidth: 980,
  borderCollapse: 'collapse',
};

const activityTypeThStyle: React.CSSProperties = {
  ...thStyle,
  minWidth: 170,
};

const activityTypeTdStyle: React.CSSProperties = {
  ...tdStyle,
  minWidth: 170,
};

function activityTypeSelectStyle(confidence: string): React.CSSProperties {
  return {
    width: '100%',
    minWidth: 150,
    padding: '8px 30px 8px 8px',
    borderRadius: 6,
    ...getPreviewConfidenceStyle(confidence),
  };
}

function getPreviewConfidenceStyle(confidence: string): React.CSSProperties {
  if (confidence === 'low') {
    return {
      background: '#fff1f1',
      border: '1px solid #f5c2c7',
    };
  }

  if (confidence === 'medium') {
    return {
      background: '#fff8e6',
      border: '1px solid #f3d28b',
    };
  }

  return {
    background: '#f6fff7',
    border: '1px solid #b7e4c7',
  };
}

function optionalInputStyle(
  confidence: string,
  value: string | null,
): React.CSSProperties {
  const isEmpty = !String(value ?? '').trim();

  return {
    width: '100%',
    padding: 8,
    borderRadius: 6,
    ...(isEmpty
      ? {
          background: '#fff',
          border: '1px solid #d1d5db',
        }
      : getPreviewConfidenceStyle(confidence)),
  };
}

const documentActionTdStyle: React.CSSProperties = {
  ...tdStyle,
  width: 190,
  minWidth: 190,
  maxWidth: 190,
  whiteSpace: 'normal',
};

const documentActionRowCompactStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  flexWrap: 'wrap',
};

function documentPrimaryActionButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 112,
    minHeight: 34,
    padding: '6px 12px',
    borderRadius: 8,
    border: '1px solid #047857',
    background: disabled ? '#e5e7eb' : '#047857',
    color: disabled ? '#6b7280' : '#fff',
    fontSize: 14,
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

const documentMenuWrapStyle: React.CSSProperties = {
  position: 'relative',
};

const kebabButtonStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#0f172a',
  cursor: 'pointer',
  fontSize: 18,
  fontWeight: 800,
  lineHeight: 1,
};

const documentMenuStyle: React.CSSProperties = {
  position: 'absolute',
  right: 0,
  top: 40,
  zIndex: 20,
  minWidth: 150,
  padding: 6,
  borderRadius: 10,
  border: '1px solid #e5e7eb',
  background: '#fff',
  boxShadow: '0 14px 36px rgba(15, 23, 42, 0.16)',
};

function documentMenuItemStyle(disabled: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '9px 10px',
    border: 'none',
    borderRadius: 8,
    background: 'transparent',
    color: disabled ? '#94a3b8' : '#0f172a',
    cursor: disabled ? 'not-allowed' : 'pointer',
    textAlign: 'left',
    fontWeight: 600,
  };
}

function documentMenuDangerItemStyle(disabled: boolean): React.CSSProperties {
  return {
    ...documentMenuItemStyle(disabled),
    color: disabled ? '#94a3b8' : '#b91c1c',
  };
}

const uploadedDocumentsHeaderStyle: React.CSSProperties = {
  padding: 16,
  borderBottom: '1px solid #eee',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
};

function selectedDocumentsReportButtonStyle(selectedCount: number): React.CSSProperties {
  const hasSelection = selectedCount > 0;

  return {
    padding: '8px 12px',
    borderRadius: 8,
    border: hasSelection ? '1px solid #10b981' : '1px solid #d1d5db',
    background: hasSelection ? '#10b981' : '#f3f4f6',
    color: hasSelection ? '#fff' : '#6b7280',
    cursor: hasSelection ? 'pointer' : 'not-allowed',
    fontWeight: 700,
  };
}

const secondaryButtonStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid #111',
  background: '#fff',
  cursor: 'pointer',
  fontSize: 14,
};

function primaryButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '10px 16px',
    borderRadius: 8,
    border: '1px solid #047857',
    background: disabled ? '#9ca3af' : '#047857',
    color: '#fff',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

function secondaryActionButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '10px 16px',
    borderRadius: 8,
    border: '1px solid #111',
    background: disabled ? '#f3f4f6' : '#fff',
    color: disabled ? '#9ca3af' : '#111',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

function confirmButtonStyle(enabled: boolean): React.CSSProperties {
  return {
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid #111',
    background: enabled ? '#111' : '#ddd',
    color: enabled ? '#fff' : '#666',
    cursor: enabled ? 'pointer' : 'not-allowed',
  };
}

function dangerButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '10px 16px',
    borderRadius: 8,
    border: '1px solid #b91c1c',
    background: disabled ? '#fca5a5' : '#dc2626',
    color: '#fff',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

const deleteButtonStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid #d33',
  background: '#fff',
  color: '#d33',
  cursor: 'pointer',
};

const modalBackdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 50,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
  background: 'rgba(15, 23, 42, 0.45)',
};

const modalStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 480,
  borderRadius: 16,
  border: '1px solid #e5e7eb',
  background: '#fff',
  padding: 24,
  boxShadow: '0 25px 80px rgba(15, 23, 42, 0.25)',
};

const warningTextStyle: React.CSSProperties = {
  margin: '16px 0',
  padding: 12,
  borderRadius: 10,
  border: '1px solid #fed7aa',
  background: '#fff7ed',
  color: '#9a3412',
  fontWeight: 600,
};

const modalActionRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 10,
  marginTop: 20,
};
