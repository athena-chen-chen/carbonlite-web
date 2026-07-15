import { ChangeEvent, DragEvent, useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  DuplicateDocumentError,
  deleteDocument,
  getDocuments,
  uploadDocument,
} from '../services/documents';
import {
  DuplicateDocumentImportError,
  confirmDocumentImport,
  extractDocument,
  getDocumentExtraction,
  type ParsedActivity,
} from '../services/documentExtraction';
import { useLocation, useNavigate } from 'react-router-dom';
import { calculateMetrics } from '../services/metrics';
import {
  activityTypeDefaultUnits,
  activityTypes,
  defaultActivityType,
} from '../constants/activityTypes';
import {
  getActivityTypeLabel,
  normalizeActivityType as normalizeCanonicalActivityType,
} from '../utils/activityType';
import {
  normalizeJurisdictionCountry,
} from '../utils/conversionFactorMatching';
import { buildApiUrl } from '../config/api';
import { ApiError } from '../services/api';
import { getToken } from '../services/auth';
import { track } from '../services/analytics.service';
import {
  sampleDocuments,
  sampleParsedActivities,
} from '../demo/demoData';
import { normalizeUnitForDisplay } from '../utils/unitNormalization';
import { ExcelInputTable } from '../components/ExcelInputTable';
import {
  UNSUPPORTED_PILOT_ELECTRICITY_PROVINCE_MESSAGE,
  isSupportedPilotProvince,
  normalizeProvince,
} from '../utils/province';


type DocumentItem = {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string | null;
  fileSize?: number | null;
  type: string;
  status: string;
  createdAt: string;
  importedAt?: string | null;
  importBatchId?: string | null;
};

type EditableConfidenceField<T> = {
  value: T | null;
  confidence: 'high' | 'medium' | 'low';
};

type EditableParsedActivity = {
  selected: boolean;
  documentId: string;
  documentFileName: string;
  dateEstimated: boolean;
  periodEndDate?: string | null;
  activityType: EditableConfidenceField<string>;
  recordDate: EditableConfidenceField<string>;
  quantity: EditableConfidenceField<number>;
  unit: EditableConfidenceField<string>;
  jurisdictionCountry: EditableConfidenceField<string>;
  jurisdictionRegion: EditableConfidenceField<string>;
  sourceReference: EditableConfidenceField<string>;
  sourcePage?: string | number | null;
  sourceRow?: string | number | null;
  sourceTextSnippet?: string | null;
  notes: EditableConfidenceField<string>;
};

type ImportValidationField =
  | 'activityType'
  | 'quantity'
  | 'unit'
  | 'recordDate'
  | 'jurisdictionRegion';

type ImportValidationIssue = {
  rowIndex: number;
  field: ImportValidationField;
  message: string;
};

type RawExtractionField = string | number | null | undefined | Record<string, any>;
type InputMethod = 'documents' | 'spreadsheet' | 'manual';
type UploadRouteState = {
  focusInputMethod?: InputMethod;
  loadSampleWorkspace?: boolean;
};

const INPUT_TEMPLATE_HEADERS = [
  'Activity Type',
  'Quantity',
  'Unit',
  'Date',
  'Country',
  'Province',
  'Facility',
  'Source Reference',
  'Notes',
];

const MAX_UPLOAD_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const FILE_MISSING_MESSAGE = 'This file is no longer available. Please upload it again.';
export const FILE_MISSING_EXPLANATION =
  'This file is no longer available on the server. This may happen after system updates or temporary storage cleanup. Please upload the file again if you need to extract or review it.';
export const FILE_MISSING_TOOLTIP =
  'The original uploaded file is no longer available. Please upload it again.';

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

type DocumentActionKind =
  | 'view'
  | 'extract'
  | 'preview'
  | 'reextract'
  | 'import'
  | 'viewRecords'
  | 'delete';

type DocumentActionConfig = {
  kind: DocumentActionKind;
  label: string;
  disabled?: boolean;
  title?: string;
  danger?: boolean;
};

type DocumentActionModel = {
  statusLabel: string;
  primaryAction: DocumentActionConfig;
  menuActions: DocumentActionConfig[];
};

export function getDocumentDownloadUrl(documentId: string) {
  return buildApiUrl(`/documents/${documentId}/download`);
}

function isMissingImportValue(value: unknown) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return !normalized || normalized === 'null' || normalized === 'undefined';
}

export function getImportValidationIssues(rows: EditableParsedActivity[]) {
  const issues: ImportValidationIssue[] = [];

  rows.forEach((row, index) => {
    if (isMissingImportValue(row.activityType.value)) {
      issues.push({
        rowIndex: index,
        field: 'activityType',
        message: 'Activity type is required.',
      });
    }

    if (
      row.quantity.value === null ||
      row.quantity.value === undefined ||
      isMissingImportValue(row.quantity.value)
    ) {
      issues.push({
        rowIndex: index,
        field: 'quantity',
        message: 'Quantity is required.',
      });
    } else {
      const quantity = Number(row.quantity.value);

      if (!Number.isFinite(quantity)) {
        issues.push({
          rowIndex: index,
          field: 'quantity',
          message: 'Quantity is required.',
        });
      } else if (quantity <= 0) {
        issues.push({
          rowIndex: index,
          field: 'quantity',
          message: 'Quantity must be greater than 0.',
        });
      }
    }

    const normalizedUnit = normalizeUnitForDisplay(row.unit.value);

    if (normalizedUnit.status === 'missing') {
      issues.push({
        rowIndex: index,
        field: 'unit',
        message: 'Unit is required.',
      });
    } else if (normalizedUnit.status === 'invalid') {
      issues.push({
        rowIndex: index,
        field: 'unit',
        message: 'Invalid unit detected. Please review this record.',
      });
    }

    if (isMissingImportValue(row.recordDate.value)) {
      issues.push({
        rowIndex: index,
        field: 'recordDate',
        message: 'Record date is required.',
      });
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(String(row.recordDate.value))) {
      issues.push({
        rowIndex: index,
        field: 'recordDate',
        message: 'Record date must use YYYY-MM-DD.',
      });
    }

    const normalizedActivityType = normalizeCanonicalActivityType(row.activityType.value);
    if (normalizedActivityType === 'ELECTRICITY') {
      const normalizedProvince = normalizePreviewProvince(row.jurisdictionRegion.value);

      if (!normalizedProvince) {
        issues.push({
          rowIndex: index,
          field: 'jurisdictionRegion',
          message: 'Missing Province: Electricity records require province before factor matching.',
        });
      } else if (!isSupportedPilotProvince(normalizedProvince)) {
        issues.push({
          rowIndex: index,
          field: 'jurisdictionRegion',
          message: UNSUPPORTED_PILOT_ELECTRICITY_PROVINCE_MESSAGE,
        });
      }
    }
  });

  return issues;
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

function formatDateValue(value: RawExtractionField) {
  const text = formatOptionalExtractionField(value).trim();
  if (!text) return '';

  return text.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(text)
    ? text.slice(0, 10)
    : text;
}

export function resolveActivityRecordDate(input: {
  recordDate?: RawExtractionField;
  extractedDocumentDate?: RawExtractionField;
  uploadDate?: RawExtractionField;
}) {
  const recordDate = formatDateValue(input.recordDate);
  if (recordDate) {
    return {
      value: recordDate,
      dateEstimated: false,
      label: recordDate,
    };
  }

  const extractedDocumentDate = formatDateValue(input.extractedDocumentDate);
  if (extractedDocumentDate) {
    return {
      value: extractedDocumentDate,
      dateEstimated: true,
      label: `${extractedDocumentDate} (estimated)`,
    };
  }

  const uploadDate = formatDateValue(input.uploadDate);
  if (uploadDate) {
    return {
      value: uploadDate,
      dateEstimated: true,
      label: `${uploadDate} (estimated)`,
    };
  }

  return {
    value: '',
    dateEstimated: true,
    label: 'Missing date',
  };
}

function getExtractedDocumentDate(item: ParsedActivity | any) {
  return (
    item.documentDate ??
    item.extractedDocumentDate ??
    item.invoiceDate ??
    item.billDate ??
    item.statementDate ??
    null
  );
}

function getAliasedExtractionField(item: Record<string, any>, aliases: string[]) {
  for (const alias of aliases) {
    if (item[alias] !== undefined && item[alias] !== null) return item[alias];
  }

  return undefined;
}

function normalizePreviewCountry(value: RawExtractionField) {
  return normalizeJurisdictionCountry(formatOptionalExtractionField(value)) ?? 'Canada';
}

function normalizePreviewProvince(value: RawExtractionField) {
  return normalizeProvince(formatOptionalExtractionField(value)) ?? '';
}

function normalizePreviewActivityType(value: RawExtractionField) {
  return normalizeCanonicalActivityType(formatOptionalExtractionField(value)) ?? '';
}

function getPreviewActivityTypeLabel(value?: string | null) {
  return getActivityTypeLabel(value);
}

function getExtractionFailureState(err: unknown): {
  status: 'EXTRACTION_FAILED' | 'FILE_MISSING';
  message: string;
} {
  if (err instanceof ApiError) {
    if (err.code === 'FILE_MISSING') {
      return {
        status: 'FILE_MISSING',
        message: FILE_MISSING_MESSAGE,
      };
    }

    if (err.code === 'TIMEOUT') {
      return {
        status: 'EXTRACTION_FAILED',
        message: 'The extraction took too long. Please retry.',
      };
    }

    return {
      status: 'EXTRACTION_FAILED',
      message: 'Extraction failed. Please try again or upload the file again.',
    };
  }

  const message = err instanceof Error ? err.message : String(err ?? '');

  if (
    /API 404/i.test(message) ||
    /file is no longer available|file.*missing|not found|file missing/i.test(message)
  ) {
    return {
      status: 'FILE_MISSING',
      message: FILE_MISSING_MESSAGE,
    };
  }

  if (/unsupported file type/i.test(message)) {
    return {
      status: 'EXTRACTION_FAILED',
      message: 'Unsupported file type. Please upload a PDF, CSV, XLSX, PNG, JPG, or JSON file.',
    };
  }

  return {
    status: 'EXTRACTION_FAILED',
    message: 'Extraction failed. Please try again or upload the file again.',
  };
}

function normalizeDocumentStatus(status: string) {
  return String(status || '').toUpperCase();
}

function isMissingFileStatus(status: string) {
  return ['FILE_MISSING', 'REUPLOAD_REQUIRED'].includes(normalizeDocumentStatus(status));
}

export function getDocumentStatusLabel(status: string) {
  const normalized = normalizeDocumentStatus(status);

  if (normalized === 'IMPORTED') return 'Imported';
  if (['PROCESSED', 'EXTRACTED', 'REVIEW_REQUIRED'].includes(normalized)) {
    return 'Ready for Review';
  }
  if (isMissingFileStatus(normalized)) return 'Re-upload Required';
  if (['FAILED', 'EXTRACTION_FAILED', 'NO_DATA_FOUND'].includes(normalized)) {
    return 'Needs Attention';
  }

  return 'Uploaded';
}

export function getDocumentActionModel(input: {
  status: string;
  canImport?: boolean;
  hasPreview?: boolean;
  isExtracting?: boolean;
  isImporting?: boolean;
  isGeneratingMetrics?: boolean;
  isViewing?: boolean;
  isDeleting?: boolean;
}): DocumentActionModel {
  const status = normalizeDocumentStatus(input.status);
  const viewAction: DocumentActionConfig = {
    kind: 'view',
    label: input.isViewing ? 'Opening...' : 'View',
    disabled: input.isViewing,
  };
  const deleteAction: DocumentActionConfig = {
    kind: 'delete',
    label: input.isDeleting ? 'Deleting...' : 'Delete',
    disabled: input.isDeleting,
    danger: true,
  };

  if (input.isExtracting) {
    return {
      statusLabel: getDocumentStatusLabel(status),
      primaryAction: { kind: 'extract', label: 'Extracting...', disabled: true },
      menuActions: [viewAction, deleteAction],
    };
  }

  if (input.isImporting || input.isGeneratingMetrics) {
    return {
      statusLabel: getDocumentStatusLabel(status),
      primaryAction: {
        kind: 'import',
        label: input.isGeneratingMetrics ? 'Generating...' : 'Importing...',
        disabled: true,
      },
      menuActions: [viewAction, deleteAction],
    };
  }

  if (status === 'IMPORTED') {
    return {
      statusLabel: 'Imported',
      primaryAction: {
        kind: 'viewRecords',
        label: 'View Records',
      },
      menuActions: [viewAction, deleteAction],
    };
  }

  if (['FAILED', 'EXTRACTION_FAILED', 'NO_DATA_FOUND'].includes(status)) {
    return {
      statusLabel: 'Needs Attention',
      primaryAction: {
        kind: 'reextract',
        label: 'Retry Extract',
        title: 'Run extraction again',
      },
      menuActions: [deleteAction],
    };
  }

  if (isMissingFileStatus(status)) {
    return {
      statusLabel: 'Re-upload Required',
      primaryAction: {
        kind: 'extract',
        label: 'Re-upload Required',
        disabled: true,
        title: FILE_MISSING_TOOLTIP,
      },
      menuActions: [deleteAction],
    };
  }

  if (['PROCESSED', 'EXTRACTED', 'REVIEW_REQUIRED'].includes(status)) {
    return {
      statusLabel: 'Ready for Review',
      primaryAction: {
        kind: 'preview',
        label: 'Preview Data',
        disabled: !input.hasPreview,
        title: input.hasPreview
          ? 'Review extracted activity rows'
          : 'No extraction preview is available. Use Re-extract to generate a new preview.',
      },
      menuActions: [
        viewAction,
        ...(input.canImport
          ? [{ kind: 'import', label: 'Import' } satisfies DocumentActionConfig]
          : []),
        {
          kind: 'reextract',
          label: 'Re-extract',
          title: 'Run extraction again',
        },
        deleteAction,
      ],
    };
  }

  return {
    statusLabel: 'Uploaded',
    primaryAction: {
      kind: 'extract',
      label: 'Extract',
    },
    menuActions: [viewAction, deleteAction],
  };
}

export function UploadPage() {
  const location = useLocation();
  const [activeInputMethod, setActiveInputMethod] = useState<InputMethod>(
    () => getRouteInputMethod(location.state) ?? 'documents',
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [documentType, setDocumentType] = useState('OTHER');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDraggingUpload, setIsDraggingUpload] = useState(false);
  const [uploadExtractInProgress, setUploadExtractInProgress] = useState(false);

  const [extractingId, setExtractingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [generatingMetrics, setGeneratingMetrics] = useState(false);
  const [previewDocumentId, setPreviewDocumentId] = useState<string | null>(null);
  const [previewDocumentIds, setPreviewDocumentIds] = useState<string[]>([]);
  const [parsedActivities, setParsedActivities] = useState<EditableParsedActivity[]>([]);
  const [latestDocumentId, setLatestDocumentId] = useState<string | null>(null);
  const [showAllDocuments, setShowAllDocuments] = useState(false);
  const [sampleWorkspaceLoaded, setSampleWorkspaceLoaded] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<DocumentItem | null>(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [viewingDocumentId, setViewingDocumentId] = useState<string | null>(null);
  const [openDocumentMenuId, setOpenDocumentMenuId] = useState<string | null>(null);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const manualEntryRef = useRef<HTMLDivElement | null>(null);
  const validationSummaryRef = useRef<HTMLDivElement | null>(null);
  const uploadDragDepthRef = useRef(0);
  const visibleDocuments = showAllDocuments ? documents : documents.slice(0, 3);
  const hasMissingFiles = documents.some((doc) => isMissingFileStatus(doc.status));
  const importValidationIssues = getImportValidationIssues(parsedActivities);
  const selectedImportValidationIssues = importValidationIssues.filter(
    (issue) => parsedActivities[issue.rowIndex]?.selected,
  );
  const selectedParsedActivitiesCount = parsedActivities.filter((item) => item.selected).length;
  const hasImportValidationErrors = importValidationIssues.length > 0;
  const hasSelectedImportValidationErrors = selectedImportValidationIssues.length > 0;
  const canAttemptConfirmImport =
    confirmingId === null &&
    !generatingMetrics &&
    parsedActivities.length > 0 &&
    selectedParsedActivitiesCount > 0;
  const canConfirmImport =
    canAttemptConfirmImport &&
    !hasSelectedImportValidationErrors;
  async function loadDocuments() {
    setLoading(true);
    setError(null);

    try {
      if ((location.state as UploadRouteState | null)?.loadSampleWorkspace) {
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
  }, []);

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
    if (!successMessage?.startsWith('Document deleted.')) return;

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage((current) =>
        current?.startsWith('Document deleted.') ? null : current,
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

  function buildSampleReviewRows() {
    return buildEditableParsedActivities(
      sampleParsedActivities,
      sampleDocuments[0],
    ).map((item, index) => ({
      ...item,
      documentId: sampleDocuments[index]?.id ?? sampleDocuments[0].id,
      documentFileName: sampleDocuments[index]?.fileName ?? sampleDocuments[0].fileName,
    }));
  }

  function getFieldValue<T>(value: RawExtractionField, fallback: T): T {
    if (isRecord(value) && 'value' in value) {
      return (value.value ?? fallback) as T;
    }

    return (value ?? fallback) as T;
  }

  function buildEditableParsedActivities(
    extractedActivities: Array<ParsedActivity | any>,
    document: { id: string; fileName: string; createdAt?: string | null },
  ): EditableParsedActivity[] {
    return extractedActivities.map((item) => {
      const activityTypeField = getAliasedExtractionField(item, [
        'activityType',
        'activity_type',
        'type',
        'category',
      ]);
      const quantityField = getAliasedExtractionField(item, [
        'quantity',
        'amount',
        'usage',
        'value',
      ]);
      const unitField = getAliasedExtractionField(item, ['unit', 'uom', 'measurement']);
      const startDateField = getAliasedExtractionField(item, [
        'recordDate',
        'date',
        'startDate',
        'periodStart',
        'fromDate',
      ]);
      const endDateField = getAliasedExtractionField(item, [
        'endDate',
        'periodEnd',
        'toDate',
      ]);
      const countryField = getAliasedExtractionField(item, [
        'jurisdictionCountry',
        'country',
        'countryCode',
      ]);
      const provinceField = getAliasedExtractionField(item, [
        'jurisdictionRegion',
        'province',
        'region',
        'state',
        'stateProvince',
      ]);
      const sourceReferenceField = getAliasedExtractionField(item, [
        'sourceReference',
        'sourceFile',
        'source',
        'reference',
      ]);
      const documentUploadDate =
        document.createdAt ??
        documents.find((doc) => doc.id === document.id)?.createdAt ??
        null;
      const resolvedDate = resolveActivityRecordDate({
        recordDate: startDateField,
        extractedDocumentDate: getExtractedDocumentDate(item),
        uploadDate: documentUploadDate,
      });

      const quantityValue = Number(getFieldValue(quantityField, 0));
      const normalizedActivityType = normalizePreviewActivityType(activityTypeField);
      const normalizedCountry = normalizePreviewCountry(countryField);
      const normalizedProvince = normalizePreviewProvince(provinceField);
      const periodEndDate = formatDateValue(endDateField) || null;
      const draftRow: EditableParsedActivity = {
        selected: true,
        documentId: document.id,
        documentFileName: document.fileName,
        dateEstimated: resolvedDate.dateEstimated || Boolean(item.dateEstimated),
        periodEndDate,
        activityType: {
          value: normalizedActivityType,
          confidence: extractFieldConfidence(activityTypeField),
        },
        recordDate: {
          value: resolvedDate.value,
          confidence: resolvedDate.dateEstimated
            ? 'low'
            : extractFieldConfidence(startDateField),
        },
        quantity: {
          value: Number.isFinite(quantityValue) ? quantityValue : 0,
          confidence: extractFieldConfidence(quantityField),
        },
        unit: {
          value: String(getFieldValue(unitField, '')),
          confidence: extractFieldConfidence(unitField),
        },
        jurisdictionCountry: {
          value: normalizedCountry,
          confidence: 'high',
        },
        jurisdictionRegion: {
          value: normalizedProvince,
          confidence: normalizedProvince ? 'high' : 'low',
        },
        sourceReference: {
          value: formatSourceReference(sourceReferenceField, document.fileName),
          confidence: extractFieldConfidence(sourceReferenceField),
        },
        sourcePage: getFieldValue(item.sourcePage, null) as string | number | null,
        sourceRow: getFieldValue(item.sourceRow, null) as string | number | null,
        sourceTextSnippet: formatOptionalExtractionField(item.sourceTextSnippet),
        notes: {
          value: formatOptionalExtractionField(item.notes),
          confidence: 'high',
        },
      };

      return {
        ...draftRow,
        selected: getImportValidationIssues([draftRow]).length === 0,
      };
    });
  }

  function loadSampleWorkspace() {
    setDocuments(sampleDocuments);
    setPreviewDocumentId('MULTIPLE');
    setPreviewDocumentIds(sampleDocuments.map((document) => document.id));
    setParsedActivities(buildSampleReviewRows());
    setSampleWorkspaceLoaded(true);
    setSuccessMessage('Sample files loaded. You can review, import, edit, and generate reports like a real workflow.');
    setError(null);
  }

  function isSampleDocumentId(documentId: string) {
    return sampleDocuments.some((document) => document.id === documentId);
  }

  function getDocumentTypeFromFile(file: File) {
    const fileName = file.name.toLowerCase();

    if (file.type.startsWith('image/') || /\.(png|jpg)$/i.test(fileName)) {
      return 'IMAGE';
    }

    if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
      return 'PDF';
    }

    if (/\.(csv|xlsx|json)$/i.test(fileName)) {
      return 'SPREADSHEET';
    }

    return 'OTHER';
  }

  function isSupportedUploadFile(file: File) {
    return /\.(pdf|csv|xlsx|png|jpg|json)$/i.test(file.name);
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
        `${unsupportedFile.name} is not supported. Please choose PDF, CSV, XLSX, PNG, JPG, or JSON files.`,
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
    setSuccessMessage('Sample CSV loaded. Click Extract Data.');
  }

  function handleUseSampleJSON() {
    const file = new File(
      [
        JSON.stringify(
          {
            activityRecords: [
              {
                activityType: 'Electricity',
                amount: 1250,
                unit: 'kWh',
                date: '2026-03-01',
                province: 'AB',
                facilityName: 'Calgary Office',
                serviceLocation: 'Calgary, AB',
                sourceReference: 'Sample JSON',
              },
              {
                activityType: 'Natural Gas',
                amount: 80,
                unit: 'GJ',
                date: '2026-03-01',
                province: 'AB',
                facilityName: 'Calgary Office',
                serviceLocation: 'Calgary, AB',
                sourceReference: 'Sample JSON',
              },
            ],
          },
          null,
          2,
        ),
      ],
      'carbonlite-sample-activity-records.json',
      { type: 'application/json' },
    );

    setSelectedFiles([file]);
    setDocumentType('SPREADSHEET');
    setError(null);
    setSuccessMessage('Sample JSON loaded. Click Extract Data.');
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

  function handleManualOrSpreadsheetSave() {
    window.sessionStorage.setItem('carbonliteMetricsStale', 'true');
    window.dispatchEvent(new Event('carbonlite:metrics-stale'));
    setSuccessMessage('Activity data saved. Review saved records in Data Records, Calculation Review, or Reports.');
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

      for (const file of selectedFiles) {
        try {
          const uploadedDocument = await uploadDocument({
            file,
            type: selectedFiles.length > 1 ? getDocumentTypeFromFile(file) : documentType,
          });
          uploadedDocuments.push(uploadedDocument);
        } catch (uploadError) {
          if (uploadError instanceof DuplicateDocumentError) {
            const duplicateMessage = formatDuplicateDocumentMessage({
              fileName:
                uploadError.existingDocument?.fileName || file.name,
              createdAt: uploadError.existingDocument?.createdAt,
            });
            const keepSeparateCopy = window.confirm(
              `${duplicateMessage}\n\nThis file appears to have already been uploaded. Select OK to keep it as a separate copy, or Cancel to prevent the duplicate.`,
            );

            if (!keepSeparateCopy) {
              setError(`${duplicateMessage} Duplicate upload cancelled.`);
              continue;
            }

            const duplicateCopy = await uploadDocument({
              file,
              type:
                selectedFiles.length > 1
                  ? getDocumentTypeFromFile(file)
                  : documentType,
              allowDuplicate: true,
            });
            uploadedDocuments.push(duplicateCopy);
            continue;
          }

          throw uploadError;
        }
      }

      if (uploadedDocuments.length === 0) {
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
    setUploadExtractInProgress(true);
    try {
      await uploadSelectedFile({ extractAfterUpload: true });
    } finally {
      setUploadExtractInProgress(false);
    }
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

  function canImportDocument(doc: DocumentItem) {
    return (
      !generatingMetrics &&
      confirmingId !== doc.id &&
      previewDocumentIds.length <= 1 &&
      previewDocumentId === doc.id &&
      parsedActivities.length > 0
    );
  }

  function hasPreviewForDocument(doc: DocumentItem) {
    return (
      ['PROCESSED', 'EXTRACTED', 'REVIEW_REQUIRED'].includes(
        normalizeDocumentStatus(doc.status),
      ) ||
      (parsedActivities.some((item) => item.documentId === doc.id) &&
        (previewDocumentId === doc.id || previewDocumentIds.includes(doc.id)))
    );
  }

  function getDocumentActionModelForDoc(doc: DocumentItem) {
    return getDocumentActionModel({
      status: doc.status,
      canImport: canImportDocument(doc),
      hasPreview: hasPreviewForDocument(doc),
      isExtracting: extractingId === doc.id || extractingId === 'multiple',
      isImporting: confirmingId === doc.id,
      isGeneratingMetrics: generatingMetrics,
      isViewing: viewingDocumentId === doc.id,
      isDeleting: deletingDocumentId === doc.id,
    });
  }

  function handleDocumentAction(doc: DocumentItem, action: DocumentActionConfig) {
    if (action.disabled) {
      if (isMissingFileStatus(doc.status)) {
        setError(FILE_MISSING_MESSAGE);
        setSuccessMessage(null);
      }
      return;
    }
    setOpenDocumentMenuId(null);

    switch (action.kind) {
      case 'view':
        handleViewDocument(doc);
        return;
      case 'preview':
        void handlePreviewDocument(doc);
        return;
      case 'import':
        handleConfirmImport(doc.id);
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

  async function handlePreviewDocument(doc: DocumentItem) {
    const localRows = parsedActivities.filter((item) => item.documentId === doc.id);

    if (localRows.length > 0) {
      setPreviewDocumentId(doc.id);
      setPreviewDocumentIds([doc.id]);
      setSuccessMessage('Review the extracted activity rows below, then confirm import.');
      setError(null);
      return;
    }

    if (isSampleDocumentId(doc.id)) {
      const sampleRows = buildSampleReviewRows().filter((item) => item.documentId === doc.id);
      setParsedActivities(sampleRows);
      setPreviewDocumentId(doc.id);
      setPreviewDocumentIds([doc.id]);
      setSuccessMessage('Review the extracted activity rows below, then confirm import.');
      setError(null);
      return;
    }

    setExtractingId(doc.id);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await getDocumentExtraction(doc.id);
      const extractedRows = buildEditableParsedActivities(
        result.parsedActivities ?? [],
        {
          id: doc.id,
          fileName: doc.fileName,
          createdAt: doc.createdAt,
        },
      );

      if (extractedRows.length === 0) {
        setError('No emissions data detected. You can view the file or retry extraction.');
        setSuccessMessage(null);
        return;
      }

      setParsedActivities((prev) => [
        ...prev.filter((item) => item.documentId !== doc.id),
        ...extractedRows,
      ]);
      setPreviewDocumentId(doc.id);
      setPreviewDocumentIds([doc.id]);
      updateDocumentStatuses([doc.id], result.status || 'REVIEW_REQUIRED');
      setSuccessMessage('Review the extracted activity rows below, then confirm import.');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EXTRACTION_NOT_FOUND') {
        setError('Preview data is no longer available. Please extract the document again.');
      } else if (err instanceof ApiError && err.code === 'FILE_MISSING') {
        setError(FILE_MISSING_MESSAGE);
        updateDocumentStatuses([doc.id], 'FILE_MISSING');
      } else {
        setError('Extraction preview could not be loaded. Please retry extraction.');
      }
      setSuccessMessage(null);
    } finally {
      setExtractingId(null);
    }
  }

  async function handleViewDocument(doc: DocumentItem) {
    if (viewingDocumentId === doc.id) return;

    if (isSampleDocumentId(doc.id) && doc.fileUrl?.startsWith('/demo/')) {
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
      const result = await deleteDocument(documentId);
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
      clearDeletedDocumentPreview(documentId);
      setDocumentToDelete(null);
      setOpenDocumentMenuId(null);
      window.sessionStorage.setItem('carbonliteMetricsStale', 'true');
      window.dispatchEvent(new Event('carbonlite:metrics-stale'));
      setSuccessMessage(
        result.deletedActivityRecords > 0
          ? `Document deleted. ${result.deletedActivityRecords} related activity record${result.deletedActivityRecords === 1 ? '' : 's'} removed.`
          : 'Document deleted.',
      );
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
        createdAt: document?.createdAt,
      },
    ]);
  }

  async function handleExtractDocuments(
    documentsToExtract: Array<{ id: string; fileName: string; createdAt?: string | null }>,
  ) {
    if (documentsToExtract.length === 0) {
      setError('No uploaded documents were found to extract.');
      return;
    }

    setExtractingId(documentsToExtract.length > 1 ? 'multiple' : documentsToExtract[0].id);
    setError(null);
    setSuccessMessage(null);

    try {
      if (documentsToExtract.every((document) => isSampleDocumentId(document.id))) {
        setSuccessMessage('Extracting sample fuel, electricity, and operations records...');
        setPreviewDocumentId(documentsToExtract.length === 1 ? documentsToExtract[0].id : 'MULTIPLE');
        setPreviewDocumentIds(documentsToExtract.map((document) => document.id));
        setParsedActivities(buildSampleReviewRows());
        updateDocumentStatuses(
          documentsToExtract.map((document) => document.id),
          'REVIEW_REQUIRED',
        );
        setSuccessMessage('Sample extraction completed. Review the activity rows, then confirm import.');
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
          ...buildEditableParsedActivities(extractedActivities, document),
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
        setSuccessMessage(null);
        await loadDocuments();
        updateDocumentStatuses(noDataDocumentIds, 'NO_DATA_FOUND');
        setError('No emissions data detected. You can view the file or retry extraction.');
        return;
      }

      setPreviewDocumentId(
        documentsToExtract.length === 1 ? documentsToExtract[0].id : 'MULTIPLE',
      );
      setPreviewDocumentIds(documentsToExtract.map((document) => document.id));
      setParsedActivities(extractedRows);
      await loadDocuments();
      updateDocumentStatuses(noDataDocumentIds, 'NO_DATA_FOUND');
      updateDocumentStatuses(reviewRequiredDocumentIds, 'REVIEW_REQUIRED');

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
    } catch (err) {
      const failure = getExtractionFailureState(err);
      const failedDocumentIds = documentsToExtract.map((document) => document.id);
      setSuccessMessage(null);
      await loadDocuments();
      updateDocumentStatuses(failedDocumentIds, failure.status);
      setError(failure.message);
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

    const alreadyImportedDocument = documents.find(
      (document) =>
        activeDocumentIds.includes(document.id) &&
        normalizeDocumentStatus(document.status) === 'IMPORTED',
    );

    if (alreadyImportedDocument) {
      setError('This document has already been imported.');
      setSuccessMessage(null);
      return;
    }

    if (!parsedActivities.length || activeDocumentIds.length === 0) {
      setError('No extracted activities to confirm.');
      return;
    }

    const selectedActivities = parsedActivities.filter((item) => item.selected);
    const validationIssues = getImportValidationIssues(parsedActivities).filter(
      (issue) => parsedActivities[issue.rowIndex]?.selected,
    );

    if (selectedActivities.length === 0) {
      setError('Please select at least one activity to import.');
      setSuccessMessage(null);
      return;
    }

    if (validationIssues.length > 0) {
      setError(null);
      setSuccessMessage(null);
      scrollToImportValidation(validationIssues[0]);
      return;
    }

    const missingDateCount = selectedActivities.filter(
      (item) => item.dateEstimated || !item.recordDate.value,
    ).length;

    if (missingDateCount > 0) {
      const shouldImport = window.confirm(
        `${missingDateCount} record${missingDateCount === 1 ? ' is' : 's are'} missing dates. Import anyway?`,
      );

      if (!shouldImport) {
        setError('Import cancelled. You can edit missing dates before importing.');
        setSuccessMessage(null);
        return;
      }
    }

    setConfirmingId(activeDocumentIds.length > 1 ? 'multiple' : activeDocumentIds[0]);
    setError(null);
    setSuccessMessage(null);

    try {
      if (activeDocumentIds.every((documentId) => isSampleDocumentId(documentId))) {
        const importedCount = selectedActivities.length;
        setPreviewDocumentId(null);
        setPreviewDocumentIds([]);
        setParsedActivities([]);
        setDocuments((prev) =>
          prev.map((document) =>
            activeDocumentIds.includes(document.id)
              ? { ...document, status: 'IMPORTED' }
              : document,
          ),
        );
        setSuccessMessage(`Imported ${importedCount} sample activity record(s). You can continue with the normal workflow.`);
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
        const importBatchId = `document-${activityDocumentId}`;
        const sourceFileName =
          activities[0]?.documentFileName ??
          documents.find((d) => d.id === activityDocumentId)?.fileName ??
          activityDocumentId;
        const normalizedActivities = activities.map((item) => ({
          activityType: item.activityType.value,
          recordDate: item.recordDate.value || null,
          quantity: item.quantity.value,
          unit: item.unit.value,
          jurisdictionCountry: item.jurisdictionCountry.value || 'Canada',
          jurisdictionRegion: item.jurisdictionRegion.value || undefined,
          sourceType: 'AI_EXTRACTION',
          sourceReference: item.sourceReference.value || sourceFileName,
          documentId: activityDocumentId,
          sourceDocumentId: activityDocumentId,
          sourceFileName,
          sourcePage: item.sourcePage ?? undefined,
          sourceRow: item.sourceRow ?? undefined,
          sourceTextSnippet: item.sourceTextSnippet ?? undefined,
          importBatchId,
          dateEstimated: item.dateEstimated,
          notes: `Imported from AI extraction. Document ID: ${activityDocumentId}`,
        }));

        if (normalizedActivities.length === 0) continue;

        const result = await confirmDocumentImport(
          activityDocumentId,
          normalizedActivities,
          importBatchId,
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
          `Imported ${importedCount} activity record(s). Generated emissions metrics. Redirecting to Calculation Review...`,
        );
        navigate('/metrics-summary');
      } catch {
        setError(
          'Imported activity records, but emissions metrics could not be generated automatically. Calculation Review will retry automatically, or you can use Refresh.',
        );
        navigate('/metrics-summary', {
          state: {
            metricsError:
              'Imported activity records, but emissions metrics could not be generated automatically. Calculation Review will retry automatically, or you can use Refresh.',
          },
        });
      } finally {
        setGeneratingMetrics(false);
      }
    } catch (err) {
      setError(
        err instanceof DuplicateDocumentImportError
          ? 'This document has already been imported.'
          : err instanceof Error
          ? err.message
          : 'Confirm import failed',
      );
    } finally {
      setConfirmingId(null);
    }
  }

  function getRowValidationIssues(rowIndex: number) {
    return importValidationIssues.filter((issue) => issue.rowIndex === rowIndex);
  }

  function getFieldValidationMessage(rowIndex: number, field: ImportValidationField) {
    return importValidationIssues.find(
      (issue) => issue.rowIndex === rowIndex && issue.field === field,
    )?.message;
  }

  function getFieldValidationDisplayMessage(
    field: ImportValidationField,
    message?: string,
  ) {
    if (!message) return '';
    if (field === 'jurisdictionRegion' && isUnsupportedPilotProvinceIssue(message)) {
      return 'Missing Factor';
    }
    if (field === 'jurisdictionRegion') return 'Province required';

    return message;
  }

  function getImportValidationIssueLabel(issue: ImportValidationIssue) {
    if (
      issue.field === 'jurisdictionRegion' &&
      isUnsupportedPilotProvinceIssue(issue.message)
    ) {
      return 'Missing Factor';
    }
    if (issue.field === 'jurisdictionRegion') return 'Missing Province';
    if (issue.field === 'unit') return 'Unit Mismatch';
    if (issue.field === 'quantity') return 'Invalid Amount';
    if (issue.field === 'activityType') return 'Missing Activity Type';
    if (issue.field === 'recordDate') return 'Missing Date';

    return 'Needs Review';
  }

  function getImportValidationIssueDetail(issue: ImportValidationIssue) {
    if (
      issue.field === 'jurisdictionRegion' &&
      isUnsupportedPilotProvinceIssue(issue.message)
    ) {
      return UNSUPPORTED_PILOT_ELECTRICITY_PROVINCE_MESSAGE;
    }
    if (issue.field === 'jurisdictionRegion') {
      return 'Electricity records require province before factor matching.';
    }

    return issue.message;
  }

  function getRowStatusLabel(rowIndex: number) {
    const issues = getRowValidationIssues(rowIndex);
    if (
      issues.some(
        (issue) =>
          issue.field === 'jurisdictionRegion' &&
          isUnsupportedPilotProvinceIssue(issue.message),
      )
    ) {
      return 'Missing Factor';
    }
    if (issues.some((issue) => issue.field === 'jurisdictionRegion')) return 'Missing Province';
    if (issues.some((issue) => issue.field === 'unit')) return 'Unit Mismatch';
    return issues.length > 0 ? 'Needs Review' : 'Ready';
  }

  function getRowIssueText(rowIndex: number) {
    const issues = getRowValidationIssues(rowIndex);
    return issues.length
      ? Array.from(new Set(issues.map(getImportValidationIssueLabel))).join(', ')
      : '-';
  }

  function getRowIssueTitle(rowIndex: number) {
    const issues = getRowValidationIssues(rowIndex);
    return issues.length
      ? issues.map(getImportValidationIssueDetail).join(' ')
      : undefined;
  }

  function getRowReportTreatment(rowIndex: number, item: EditableParsedActivity) {
    const issues = getRowValidationIssues(rowIndex);
    if (issues.length > 0) return 'Excluded';

    const activityType = normalizeCanonicalActivityType(item.activityType.value);
    if (activityType === 'WATER' || activityType === 'WATER_USAGE') return 'Tracked Only';

    return 'Included';
  }

  function parsedActivityHasValidationIssues(item: EditableParsedActivity) {
    return getImportValidationIssues([item]).length > 0;
  }

  function isUnsupportedPilotProvinceIssue(message?: string) {
    return message === UNSUPPORTED_PILOT_ELECTRICITY_PROVINCE_MESSAGE;
  }

  function getPreviewDatePeriod(item: EditableParsedActivity) {
    const startDate = item.recordDate.value ?? '';
    const endDate = item.periodEndDate ?? '';

    if (startDate && endDate && endDate !== startDate) {
      return `${startDate} to ${endDate}`;
    }

    return startDate;
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
    const sourceDocument = documents.find((doc) => doc.id === row.documentId);
    return sourceDocument?.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10);
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
        const nextValue =
          field === 'quantity'
            ? value.trim() === ''
              ? null
              : Number(value)
            : field === 'activityType'
            ? normalizePreviewActivityType(value)
            : field === 'jurisdictionCountry'
            ? normalizePreviewCountry(value)
            : field === 'jurisdictionRegion'
            ? normalizePreviewProvince(value)
            : formatOptionalExtractionField(value);

        const updatedItem = {
          ...item,
          ...(field === 'recordDate' ? { dateEstimated: false } : {}),
          [field]: {
            ...currentField,
            value: nextValue,
            confidence: 'medium',
          },
        };

        return {
          ...updatedItem,
          selected: parsedActivityHasValidationIssues(updatedItem) ? false : item.selected,
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
        dateEstimated: true,
        activityType: { value: defaultActivityType, confidence: 'medium' },
        recordDate: {
          value: '',
          confidence: 'low',
        },
        quantity: { value: 0, confidence: 'low' },
        unit: { value: 'liters', confidence: 'medium' },
        jurisdictionCountry: { value: 'Canada', confidence: 'medium' },
        jurisdictionRegion: { value: '', confidence: 'low' },
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
              selected: checked && !parsedActivityHasValidationIssues(item),
            }
          : item,
      ),
    );
  }

  function selectAllParsedActivities() {
    setParsedActivities((prev) =>
      prev.map((item) => ({
        ...item,
        selected: !parsedActivityHasValidationIssues(item),
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
      <h1 style={{ marginBottom: 8 }}>Input Data</h1>

      <p style={{ color: '#666', marginBottom: 16 }}>
        Add emissions-related activity data from documents, spreadsheets, or manual entry. New records can be reviewed before they are included in emissions calculations.
      </p>

      <div style={stepBarStyle}>
        Input Data → Input Review → Save Records → Data Records → Calculation Review → Reports
      </div>

      <div style={methodTabsStyle} role="tablist" aria-label="Input data methods">
        {[
          {
            key: 'documents' as const,
            title: 'Upload Documents',
            text: 'Upload utility bills, fuel invoices, water bills, travel documents, hotel invoices, or operational PDFs.',
          },
          {
            key: 'spreadsheet' as const,
            title: 'Import Spreadsheet',
            text: 'Import CSV or Excel activity data using the CarbonLite data template.',
          },
          {
            key: 'manual' as const,
            title: 'Manual Entry',
            text: 'Enter one activity record directly when no file is available.',
          },
        ].map((method) => (
          <button
            key={method.key}
            type="button"
            role="tab"
            aria-selected={activeInputMethod === method.key}
            onClick={() => setActiveInputMethod(method.key)}
            style={methodTabStyle(activeInputMethod === method.key)}
          >
            <strong>{method.title}</strong>
            <span>{method.text}</span>
          </button>
        ))}
      </div>

      <div style={sampleBannerStyle}>
        <div>
          <strong>{sampleWorkspaceLoaded ? 'Example workspace loaded' : 'Try sample files'}</strong>
          <div style={{ color: '#475569', marginTop: 4 }}>
            Preload sample uploaded documents and extracted rows without changing how the app works.
          </div>
        </div>
        <button type="button" onClick={loadSampleWorkspace} style={primaryButtonStyle(false)}>
          {sampleWorkspaceLoaded ? 'Reload Sample Data' : 'Load Sample Data'}
        </button>
      </div>

      {activeInputMethod === 'documents' ? (
      <div style={uploadCardStyle}>
        <h2 style={{ marginTop: 0 }}>Upload Documents</h2>
        <p style={{ color: '#666' }}>
          Upload utility bills, fuel invoices, natural gas bills, water bills, hotel or travel documents, shipping records, PDFs, images, CSV, XLSX, or structured JSON files. Extracted records appear in Input Review before import.
        </p>

        <div style={{ display: 'grid', gap: 16, maxWidth: 700 }}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              if (!isProcessing) handleChooseFile();
            }}
            onKeyDown={(event) => {
              if (isProcessing) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleChooseFile();
              }
            }}
            onDragEnter={handleUploadDragEnter}
            onDragOver={handleUploadDragOver}
            onDragLeave={handleUploadDragLeave}
            onDrop={handleUploadDrop}
            style={uploadDropzoneStyle(isDraggingUpload, isProcessing)}
          >
            <strong>
              {isDraggingUpload ? 'Drop to select files' : 'Drag and drop files here or browse files'}
            </strong>
            <span style={{ color: '#666' }}>
              PDF, CSV, XLSX, PNG, JPG, or JSON files are supported. Max 10 MB.
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

           <input
            ref={fileInputRef}
            id="document-upload-input"
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.csv,.xlsx,.png,.jpg,.json,application/json"
            style={{ display: 'none' }}
            multiple
          />

          {selectedFiles.length > 0 ? (
            <div style={fileInfoStyle}>
              <strong>
                Selected file{selectedFiles.length === 1 ? '' : 's'}:
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

          <div style={uploadWorkflowStyle}>
            {['Select document', 'Extract data', 'Review results', 'Import records', 'Generate reports'].map((step, index) => (
              <div key={step} style={uploadWorkflowStepStyle}>
                <span style={uploadWorkflowNumberStyle}>{index + 1}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>

          <div style={uploadActionStackStyle}>
            <button
              type="button"
              onClick={handleUploadAndExtract}
              disabled={isProcessing || selectedFiles.length === 0}
              style={primaryButtonStyle(isProcessing || selectedFiles.length === 0)}
              title={
                selectedFiles.length === 0
                  ? 'Select a document before extracting data.'
                  : 'Upload the selected document and extract activity data.'
              }
            >
              {uploadExtractInProgress ? 'Extracting...' : 'Extract Data'}
            </button>

            <div style={sampleCsvRowStyle}>
              <span style={{ color: '#64748b' }}>Need an example?</span>
              <button
                type="button"
                onClick={handleUseSampleCSV}
                disabled={isProcessing}
                style={linkButtonStyle(isProcessing)}
              >
                Use Sample CSV
              </button>
              <button
                type="button"
                onClick={handleUseSampleJSON}
                disabled={isProcessing}
                style={linkButtonStyle(isProcessing)}
              >
                Use Sample JSON
              </button>
            </div>
          </div>
        </div>
      </div>
      ) : null}

      {activeInputMethod === 'spreadsheet' ? (
        <div style={uploadCardStyle}>
          <h2 style={{ marginTop: 0 }}>Import Spreadsheet</h2>
          <p style={{ color: '#666' }}>
            Import CSV or Excel activity data using the CarbonLite data template. Include Province for electricity records so province-specific factors can match.
          </p>
          <div style={templateActionRowStyle}>
            <button type="button" onClick={downloadCsvTemplate} style={secondaryButtonStyle}>
              Download CSV template
            </button>
            <button type="button" onClick={downloadExcelTemplate} style={secondaryButtonStyle}>
              Download Excel template
            </button>
          </div>
          <ExcelInputTable onSuccess={handleManualOrSpreadsheetSave} />
        </div>
      ) : null}

      {activeInputMethod === 'manual' ? (
        <div ref={manualEntryRef} style={uploadCardStyle} tabIndex={-1}>
          <h2 style={{ marginTop: 0 }}>Manual Entry</h2>
          <p style={{ color: '#666' }}>
            Enter activity records directly when no file is available. Electricity records require province before calculation and can be saved for review if province is missing.
          </p>
          <ExcelInputTable onSuccess={handleManualOrSpreadsheetSave} />
        </div>
      ) : null}

      {error ? <div style={errorStyle}>{error}</div> : null}

      <div style={sectionCardStyle}>
        <div style={uploadedDocumentsHeaderStyle}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Input Review</h2>
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
              Add data from documents, spreadsheets, or manual entry to review draft records.
            </p>
          </div>
        ) : (
          <>
          {hasMissingFiles ? (
            <div style={missingFileNoticeStyle}>
              {FILE_MISSING_EXPLANATION}
            </div>
          ) : null}
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
              {visibleDocuments.map((doc) => {
                const actionModel = getDocumentActionModelForDoc(doc);
                const primaryAction = actionModel.primaryAction;

                return (
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
                    <td style={tdStyle}>
                      <span style={documentStatusBadgeStyle(doc.status)}>
                        {actionModel.statusLabel}
                      </span>
                    </td>
                    <td style={tdStyle}>{doc.fileSize ?? '-'}</td>
                    <td style={tdStyle}>{doc.createdAt}</td>
                    <td style={documentActionTdStyle}>
                      <div style={documentActionRowCompactStyle}>
                        <span
                          title={primaryAction.title ?? primaryAction.label}
                          onClick={() => {
                            if (primaryAction.disabled) {
                              handleDocumentAction(doc, primaryAction);
                            }
                          }}
                          style={primaryAction.disabled ? disabledActionWrapStyle : undefined}
                        >
                          <button
                            type="button"
                            onClick={() => handleDocumentAction(doc, primaryAction)}
                            disabled={primaryAction.disabled}
                            title={primaryAction.title ?? primaryAction.label}
                            style={documentPrimaryActionButtonStyle(
                              Boolean(primaryAction.disabled),
                            )}
                          >
                            {primaryAction.label}
                          </button>
                        </span>

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
                              {actionModel.menuActions.map((action) => (
                                <button
                                  key={action.kind}
                                  type="button"
                                  onClick={() => handleDocumentAction(doc, action)}
                                  disabled={action.disabled}
                                  title={action.title ?? action.label}
                                  style={
                                    action.danger
                                      ? documentMenuDangerItemStyle(Boolean(action.disabled))
                                      : documentMenuItemStyle(Boolean(action.disabled))
                                  }
                                >
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </>
        )}
      </div>

      {documents.length > 3 ? (
        <div style={documentToggleRowStyle}>
          <button
            type="button"
            onClick={() => setShowAllDocuments((v) => !v)}
            style={secondaryButtonStyle}
          >
            {showAllDocuments ? 'Show Less' : `View All Documents (${documents.length})`}
          </button>
        </div>
      ) : null}

      {successMessage ? (
        <div style={successStyle}>
          {successMessage}

          {showPostImportLinks ? (
            <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => navigate('/metrics-summary')}>
                View Calculation Review
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
              <h2 style={{ margin: 0, fontSize: 20 }}>Draft Records Review</h2>
              <p style={{ marginTop: 8, color: '#666' }}>
                Review extracted activity records before saving them as Data Records.
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
                disabled={!canAttemptConfirmImport}
                aria-disabled={!canConfirmImport}
                title={
                  hasSelectedImportValidationErrors
                    ? 'Please fix validation errors before importing.'
                    : selectedParsedActivitiesCount === 0
                    ? 'Please select at least one activity to import.'
                    : undefined
                }
                style={confirmButtonStyle(canConfirmImport)}
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
            <>
            {hasImportValidationErrors ? (
              <div ref={validationSummaryRef} style={validationSummaryStyle} role="alert">
                <strong>⚠ Please correct the following issues:</strong>
                <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                  {importValidationIssues.map((issue) => (
                    <li
                      key={`${issue.rowIndex}-${issue.field}`}
                      title={getImportValidationIssueDetail(issue)}
                    >
                      Row {issue.rowIndex + 1}: {getImportValidationIssueLabel(issue)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div style={previewScrollHintStyle}>Scroll horizontally to view all columns →</div>
            <div style={previewTableWrapStyle}>
            <table style={previewTableStyle}>
              <colgroup>
                <col style={previewSelectColStyle} />
                <col style={previewStatusColStyle} />
                <col style={previewActivityTypeColStyle} />
                <col style={previewDateColStyle} />
                <col style={previewQuantityColStyle} />
                <col style={previewUnitColStyle} />
                <col style={previewCountryColStyle} />
                <col style={previewProvinceColStyle} />
                <col style={previewSourceReferenceColStyle} />
                <col style={previewIssueColStyle} />
                <col style={previewTreatmentColStyle} />
                <col style={previewNotesColStyle} />
                <col style={previewActionsColStyle} />
              </colgroup>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  <th style={thStyle}>Select</th>
                  <th style={thStyle}>Status</th>
                  <th style={activityTypeThStyle}>Activity Type</th>
                  <th style={thStyle}>Record Date</th>
                  <th style={thStyle}>Quantity</th>
                  <th style={thStyle}>Unit</th>
                  <th style={thStyle}>Country</th>
                  <th style={thStyle}>Province</th>
                  <th style={thStyle}>Source Reference</th>
                  <th style={thStyle}>Issue</th>
                  <th style={thStyle}>Report Treatment</th>
                  <th style={thStyle}>Notes</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {parsedActivities.map((item, index) => {
                  const activityTypeError = getFieldValidationMessage(index, 'activityType');
                  const recordDateError = getFieldValidationMessage(index, 'recordDate');
                  const quantityError = getFieldValidationMessage(index, 'quantity');
                  const unitError = getFieldValidationMessage(index, 'unit');
                  const provinceError = getFieldValidationMessage(index, 'jurisdictionRegion');
                  const rowStatusLabel = getRowStatusLabel(index);
                  const rowIssueText = getRowIssueText(index);
                  const rowIssueTitle = getRowIssueTitle(index);
                  const rowHasValidationIssues = getRowValidationIssues(index).length > 0;
                  const rowReportTreatment = getRowReportTreatment(index, item);

                  return (
                  <tr key={`parsed-${index}`}>
                    <td style={tdStyle}>
                      <input
                        type="checkbox"
                        checked={item.selected && !rowHasValidationIssues}
                        disabled={rowHasValidationIssues}
                        aria-label={`Select preview row ${index + 1}`}
                        title={
                          rowHasValidationIssues
                            ? 'Fix validation issues before selecting this row.'
                            : undefined
                        }
                        onChange={(e) =>
                          toggleParsedActivitySelected(index, e.target.checked)
                        }
                      />
                    </td>

                    <td style={tdStyle}>
                      <span style={rowStatusBadgeStyle(rowStatusLabel)}>
                        {rowStatusLabel}
                      </span>
                    </td>

                    <td style={activityTypeTdStyle}>
                      <select
                        data-validation-field="activityType"
                        data-validation-row={index}
                        value={item.activityType.value ?? ''}
                        onChange={(e) =>
                          updateParsedActivityField(index, 'activityType', e.target.value)
                        }
                        style={validatedInputStyle(
                          activityTypeSelectStyle(item.activityType.confidence),
                          Boolean(activityTypeError),
                        )}
                      >
                        <option value="">-- Select --</option>
                        {activityTypes.map((type) => (
                          <option key={type} value={type}>
                            {getPreviewActivityTypeLabel(type)}
                          </option>
                        ))}
                      </select>
                      {activityTypeError ? (
                        <div style={fieldErrorStyle}>{activityTypeError}</div>
                      ) : null}
                    </td>

                    <td style={tdStyle}>
                      <input
                        data-validation-field="recordDate"
                        data-validation-row={index}
                        type="text"
                        value={item.recordDate.value ?? ''}
                        placeholder={item.dateEstimated ? 'Missing date' : 'YYYY-MM-DD'}
                        onChange={(e) =>
                          updateParsedActivityField(index, 'recordDate', e.target.value)
                        }
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: 8,
                          borderRadius: 6,
                          ...getConfidenceStyle(item.recordDate.confidence),
                          ...(recordDateError ? validationInputOverrideStyle : {}),
                        }}
                      />
                      {item.periodEndDate ? (
                        <div style={datePeriodStyle}>{getPreviewDatePeriod(item)}</div>
                      ) : null}
                      {recordDateError ? (
                        <div style={fieldErrorStyle}>{recordDateError}</div>
                      ) : null}
                      {recordDateError ? (
                        <div style={dateSuggestionStyle}>
                          Suggested: {getRecordDateSuggestion(item)}
                          <button
                            type="button"
                            onClick={() =>
                              updateParsedActivityField(
                                index,
                                'recordDate',
                                getRecordDateSuggestion(item),
                              )
                            }
                            style={useSuggestionButtonStyle}
                          >
                            Use Suggestion
                          </button>
                        </div>
                      ) : null}
                      {item.dateEstimated ? (
                        <div style={dateWarningStyle}>
                          {item.recordDate.value
                            ? `${item.recordDate.value} (estimated)`
                            : 'Missing date'}
                        </div>
                      ) : null}
                    </td>

                    <td style={tdStyle}>
                      <input
                        data-validation-field="quantity"
                        data-validation-row={index}
                        type="number"
                        min="0"
                        value={item.quantity.value ?? ''}
                        onChange={(e) =>
                          updateParsedActivityField(index, 'quantity', e.target.value)
                        }
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: 8,
                          borderRadius: 6,
                          ...getConfidenceStyle(item.quantity.confidence),
                          ...(quantityError ? validationInputOverrideStyle : {}),
                        }}
                      />
                      {quantityError ? (
                        <div style={fieldErrorStyle}>{quantityError}</div>
                      ) : null}
                    </td>

                    <td style={tdStyle}>
                      <input
                        data-validation-field="unit"
                        data-validation-row={index}
                        type="text"
                        value={item.unit.value ?? ''}
                        onChange={(e) =>
                          updateParsedActivityField(index, 'unit', e.target.value)
                        }
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: 8,
                          borderRadius: 6,
                          ...getConfidenceStyle(item.unit.confidence),
                          ...(unitError ? validationInputOverrideStyle : {}),
                        }}
                      />
                      {unitError ? (
                        <div style={fieldErrorStyle}>{unitError}</div>
                      ) : null}
                    </td>

                    <td style={tdStyle}>
                      <input
                        type="text"
                        value={item.jurisdictionCountry.value ?? ''}
                        placeholder="Canada"
                        onChange={(e) =>
                          updateParsedActivityField(index, 'jurisdictionCountry', e.target.value)
                        }
                        style={optionalInputStyle(
                          item.jurisdictionCountry.confidence,
                          item.jurisdictionCountry.value,
                          { neutralWhenPresent: true },
                        )}
                      />
                    </td>

                    <td style={tdStyle}>
                      {/* TODO: Consider ProvinceSelect here after preserving extraction confidence styling. */}
                      <input
                        data-validation-field="jurisdictionRegion"
                        data-validation-row={index}
                        type="text"
                        value={item.jurisdictionRegion.value ?? ''}
                        placeholder="Province"
                        onChange={(e) =>
                          updateParsedActivityField(index, 'jurisdictionRegion', e.target.value)
                        }
                        style={validatedInputStyle(
                          optionalInputStyle(
                            item.jurisdictionRegion.confidence,
                            item.jurisdictionRegion.value,
                            { neutralWhenPresent: true },
                          ),
                          Boolean(provinceError),
                        )}
                      />
                      {provinceError ? (
                        <div style={fieldErrorStyle} title={getRowIssueTitle(index)}>
                          {getFieldValidationDisplayMessage('jurisdictionRegion', provinceError)}
                        </div>
                      ) : null}
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
                          { neutralWhenPresent: true },
                        )}
                        title={item.sourceReference.value ?? item.documentFileName}
                      />
                    </td>

                    <td style={tdStyle}>
                      <span
                        style={rowIssueText === '-' ? mutedIssueStyle : issueTextStyle}
                        title={rowIssueTitle}
                      >
                        {rowIssueText}
                      </span>
                    </td>

                    <td style={tdStyle}>
                      <span
                        style={
                          rowReportTreatment === 'Included'
                            ? includedTreatmentStyle
                            : excludedTreatmentStyle
                        }
                      >
                        {rowReportTreatment}
                      </span>
                    </td>

                    <td style={tdStyle}>
                      <input
                        type="text"
                        value={item.notes.value ?? ''}
                        placeholder="Optional notes"
                        onChange={(e) =>
                          updateParsedActivityField(index, 'notes', e.target.value)
                        }
                        style={optionalInputStyle(item.notes.confidence, item.notes.value, {
                          neutralWhenPresent: true,
                        })}
                        title={item.notes.value ?? ''}
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
                  );
                })}
              </tbody>
            </table>
            </div>
            </>
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
              Delete this document and its imported activity records?
            </h2>
            <p style={{ color: '#475569', lineHeight: 1.6 }}>
              This will remove <strong>{documentToDelete.fileName}</strong> from Input Review and clear any extraction preview rows for this file.
            </p>
            <p style={warningTextStyle}>
              This will remove the uploaded document and all activity records created from this document.
            </p>
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

const sampleBannerStyle: React.CSSProperties = {
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

const methodTabsStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 12,
  marginBottom: 20,
};

function methodTabStyle(active: boolean): React.CSSProperties {
  return {
    display: 'grid',
    gap: 6,
    textAlign: 'left',
    padding: 16,
    borderRadius: 8,
    border: active ? '2px solid #10b981' : '1px solid #dbe3ec',
    background: active ? '#ecfdf5' : '#fff',
    color: '#0f172a',
    cursor: 'pointer',
    boxShadow: active ? '0 8px 20px rgba(16, 185, 129, 0.12)' : 'none',
  };
}

const templateActionRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
  marginBottom: 16,
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

const uploadWorkflowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
  gap: 10,
  padding: 12,
  borderRadius: 12,
  border: '1px solid #dbeafe',
  background: '#f8fafc',
};

const uploadWorkflowStepStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  color: '#334155',
  fontSize: 14,
  fontWeight: 600,
};

const uploadWorkflowNumberStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
  borderRadius: '50%',
  background: '#e0f2fe',
  color: '#075985',
  fontSize: 12,
  fontWeight: 800,
  flex: '0 0 auto',
};

const uploadActionStackStyle: React.CSSProperties = {
  display: 'grid',
  gap: 10,
  justifyItems: 'start',
};

const sampleCsvRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
  fontSize: 14,
};

const issueTextStyle: React.CSSProperties = {
  display: '-webkit-box',
  maxWidth: '100%',
  overflow: 'hidden',
  color: '#92400e',
  fontSize: 12,
  lineHeight: 1.4,
  fontWeight: 700,
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 2,
  overflowWrap: 'anywhere',
};

const mutedIssueStyle: React.CSSProperties = {
  display: 'block',
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: '#94a3b8',
  fontSize: 12,
};

const includedTreatmentStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  whiteSpace: 'nowrap',
  borderRadius: 999,
  padding: '3px 8px',
  fontSize: 12,
  fontWeight: 700,
  color: '#047857',
  background: '#d1fae5',
};

const excludedTreatmentStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  whiteSpace: 'nowrap',
  borderRadius: 999,
  padding: '3px 8px',
  fontSize: 12,
  fontWeight: 700,
  color: '#b91c1c',
  background: '#fee2e2',
};

function linkButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    border: 0,
    background: 'transparent',
    color: disabled ? '#94a3b8' : '#047857',
    padding: 0,
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    textDecoration: 'underline',
    textUnderlineOffset: 3,
  };
}

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
  cursor: isProcessing ? 'not-allowed' : 'pointer',
  opacity: isProcessing ? 0.72 : 1,
  transition: 'border-color 120ms ease, background 120ms ease, color 120ms ease',
});

const nativeFileInputStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 360,
};

const documentToggleRowStyle: React.CSSProperties = {
  margin: '14px 0 16px',
  display: 'flex',
  alignItems: 'center',
};

const successStyle: React.CSSProperties = {
  position: 'sticky',
  top: 88,
  zIndex: 5,
  marginTop: 12,
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
  padding: '10px 8px',
  borderBottom: '1px solid #ddd',
  boxSizing: 'border-box',
  color: '#475569',
  fontSize: 12,
  fontWeight: 800,
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: 8,
  borderBottom: '1px solid #eee',
  boxSizing: 'border-box',
  verticalAlign: 'top',
  minWidth: 0,
  maxWidth: 0,
};

const previewTableWrapStyle: React.CSSProperties = {
  overflowX: 'auto',
  width: '100%',
  maxWidth: '100%',
  WebkitOverflowScrolling: 'touch',
};

const previewScrollHintStyle: React.CSSProperties = {
  margin: '0 16px 6px',
  color: '#94a3b8',
  fontSize: 12,
  fontWeight: 600,
  textAlign: 'right',
  cursor: 'default',
  userSelect: 'none',
};

const previewTableStyle: React.CSSProperties = {
  width: '100%',
  minWidth: 1800,
  borderCollapse: 'collapse',
  tableLayout: 'fixed',
};

const activityTypeThStyle: React.CSSProperties = {
  ...thStyle,
};

const activityTypeTdStyle: React.CSSProperties = {
  ...tdStyle,
};

const previewSelectColStyle: React.CSSProperties = { width: 64 };
const previewStatusColStyle: React.CSSProperties = { width: 132 };
const previewActivityTypeColStyle: React.CSSProperties = { width: 180 };
const previewDateColStyle: React.CSSProperties = { width: 156 };
const previewQuantityColStyle: React.CSSProperties = { width: 112 };
const previewUnitColStyle: React.CSSProperties = { width: 112 };
const previewCountryColStyle: React.CSSProperties = { width: 124 };
const previewProvinceColStyle: React.CSSProperties = { width: 152 };
const previewSourceReferenceColStyle: React.CSSProperties = { width: 220 };
const previewIssueColStyle: React.CSSProperties = { width: 180 };
const previewTreatmentColStyle: React.CSSProperties = { width: 140 };
const previewNotesColStyle: React.CSSProperties = { width: 220 };
const previewActionsColStyle: React.CSSProperties = { width: 108 };

function activityTypeSelectStyle(confidence: string): React.CSSProperties {
  return {
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 30px 8px 8px',
    borderRadius: 6,
    ...getPreviewConfidenceStyle(confidence),
  };
}

function validatedInputStyle(
  baseStyle: React.CSSProperties,
  hasError: boolean,
): React.CSSProperties {
  return {
    ...baseStyle,
    ...(hasError ? validationInputOverrideStyle : {}),
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

const validationInputOverrideStyle: React.CSSProperties = {
  background: '#fff1f2',
  border: '1px solid #ef4444',
};

const fieldErrorStyle: React.CSSProperties = {
  marginTop: 5,
  color: '#b91c1c',
  fontSize: 12,
  fontWeight: 600,
  lineHeight: 1.25,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const validationSummaryStyle: React.CSSProperties = {
  margin: '0 16px 14px',
  padding: '12px 14px',
  borderRadius: 8,
  border: '1px solid #fecaca',
  background: '#fff1f2',
  color: '#991b1b',
  fontSize: 14,
};

const dateSuggestionStyle: React.CSSProperties = {
  marginTop: 6,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
  color: '#475569',
  fontSize: 12,
};

const datePeriodStyle: React.CSSProperties = {
  marginTop: 5,
  color: '#475569',
  fontSize: 12,
  fontWeight: 700,
};

const useSuggestionButtonStyle: React.CSSProperties = {
  padding: '3px 7px',
  borderRadius: 6,
  border: '1px solid #86efac',
  background: '#f0fdf4',
  color: '#047857',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};

function rowStatusBadgeStyle(status: string): React.CSSProperties {
  const isReady = status === 'Ready';

  return {
    display: 'inline-flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
    borderRadius: 999,
    padding: '3px 8px',
    fontSize: 12,
    fontWeight: 700,
    color: isReady ? '#047857' : '#b91c1c',
    background: isReady ? '#d1fae5' : '#fee2e2',
  };
}

function optionalInputStyle(
  confidence: string,
  value: string | null,
  options?: { neutralWhenPresent?: boolean },
): React.CSSProperties {
  const isEmpty = !String(value ?? '').trim();

  return {
    width: '100%',
    boxSizing: 'border-box',
    padding: 8,
    borderRadius: 6,
    ...(isEmpty
      ? {
          background: '#fff',
          border: '1px solid #d1d5db',
        }
      : options?.neutralWhenPresent
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

const disabledActionWrapStyle: React.CSSProperties = {
  display: 'inline-flex',
  cursor: 'not-allowed',
};

const missingFileNoticeStyle: React.CSSProperties = {
  margin: '0 16px 12px',
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid #fed7aa',
  background: '#fff7ed',
  color: '#9a3412',
  fontWeight: 600,
  lineHeight: 1.5,
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
    pointerEvents: disabled ? 'none' : 'auto',
  };
}

function documentStatusBadgeStyle(status: string): React.CSSProperties {
  const label = getDocumentStatusLabel(status);
  const palette =
    label === 'Imported'
      ? { border: '#bbf7d0', background: '#f0fdf4', color: '#166534' }
      : label === 'Ready for Review'
      ? { border: '#bfdbfe', background: '#eff6ff', color: '#1d4ed8' }
      : label === 'Needs Attention'
      ? { border: '#fed7aa', background: '#fff7ed', color: '#9a3412' }
      : label === 'Re-upload Required'
      ? { border: '#fecaca', background: '#fef2f2', color: '#991b1b' }
      : { border: '#e2e8f0', background: '#f8fafc', color: '#334155' };

  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 8px',
    borderRadius: 999,
    border: `1px solid ${palette.border}`,
    background: palette.background,
    color: palette.color,
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: 'nowrap',
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

const dateWarningStyle: React.CSSProperties = {
  marginTop: 4,
  color: '#92400e',
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: 'nowrap',
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
