import { calculateMetrics } from '../../../services/metrics';
import { useEffect, useRef, useState } from 'react';
import { DuplicateDocumentImportError, confirmDocumentImport, extractDocument, getDocumentExtraction, type ConfirmImportResponse } from '../../../services/documentExtraction';
import { createActivityData, getAllActivityData, type ActivityDataInput } from '../../../services/activityData';
import { getAllConversionFactors, type ConversionFactorItem } from '../../../services/conversionFactors';
import { ApiError } from '../../../services/api';
import { getUserFriendlyErrorMessage } from '../../../utils/userFriendlyErrors';
import { defaultActivityType } from '../../../constants/activityTypes';
import { sampleDocuments, sampleParsedActivities } from '../../../demo/demoData';
import type { SpreadsheetReviewRowInput } from '../../../services/spreadsheetReviewRows';
import type { DocumentItem, EditableParsedActivity, EditableDetectedSourceItem, EditableConfidenceField, DraftActivityInput, ImportValidationField, ImportValidationIssue, WorkflowEventInput, ImportCompletion } from '../inputData.types';
import { buildEditableParsedActivities as buildReviewRows, buildDetectedSourceItems, classifyExtractedDocumentSourceItems, isSpreadsheetFileName, normalizePreviewProvince, normalizePreviewActivityType, normalizePreviewCountry, formatOptionalExtractionField } from '../domain/extractionNormalization';
import { classifyDraftRow, getImportValidationIssues, isCanonicalReadyReviewRow, isImportableDraftRowClassification } from '../domain/draftRowClassification';
import { buildDocumentImportActivityPayload, applyConfirmReviewPayload } from '../domain/documentImportPayload';
import { getActivitySourceDocumentId, getImportedActivityRecordKey, getImportActivityRecordKey, getEditableParsedActivityRecordKey } from '../domain/importIdentity';
import { buildDraftRowAuditSummary, buildConfirmImportAuditSummary, getAuditSourceType } from '../domain/importAudit';
import { isDocumentImportPayloadImportable } from '../domain/draftRowClassification';

// Local identity survives object spreads without changing persisted/import row identity.
const LOCAL_REVIEW_ROW = Symbol('localReviewRow');
type LocalReviewRow = EditableParsedActivity & { [LOCAL_REVIEW_ROW]?: number };

const FILE_MISSING_MESSAGE = 'This file is no longer available. Please upload it again.';

type ImportedKeyLookup = {
  documentKey: string | null;
  keys: string[];
  status: 'unknown' | 'ready' | 'unavailable';
};

class DraftReviewLookupError extends Error {
  constructor(readonly lookup: 'factor' | 'imported') {
    super(lookup === 'factor'
      ? 'Conversion factors could not be loaded. Please try again.'
      : 'Imported records could not be checked. Please retry the review before importing.');
  }
}

type DraftReviewOptions = {
  documents: DocumentItem[];
  uploading: boolean;
  canImportData: boolean;
  canSetProvinceOnDraftRows: boolean;
  organizationId: string | null;
  setProvincePermissionDeniedReason: string;
  feedback: { error: (message: string | null) => void; success: (message: string | null) => void };
  collection: { loadDocuments: () => Promise<void>; updateDocumentStatuses: (ids: string[], status: string) => void };
  shouldRefreshDocument: (document: DocumentItem) => boolean;
  confirm: (options: { title: string; message: string; confirmLabel?: string; cancelLabel?: string }) => Promise<boolean>;
  onWorkflowEvent: (input: WorkflowEventInput) => void;
  formatImportCompletedMessage: (importedCount: number, trackedMetricCount: number) => string;
  events: {
    onConfirmStarted: (ids: string[]) => void;
    onValidationIssue: (issue?: ImportValidationIssue) => void;
    onImportCompleted: (result: ImportCompletion) => Promise<void>;
    onDocumentsExtracted: (documents: Array<{ id: string; fileName: string }>) => void;
  };
};

export function useDraftReview({ documents, uploading, canImportData, canSetProvinceOnDraftRows,
  organizationId, setProvincePermissionDeniedReason, feedback, collection, shouldRefreshDocument,
  confirm, onWorkflowEvent, formatImportCompletedMessage, events }: DraftReviewOptions) {
  const { error: setError, success: setSuccessMessage } = feedback;
  const { loadDocuments, updateDocumentStatuses } = collection;
  const [extractingId, setExtractingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [generatingMetrics, setGeneratingMetrics] = useState(false);
  const [previewDocumentId, setPreviewDocumentId] = useState<string | null>(null);
  const [previewDocumentIds, setPreviewDocumentIds] = useState<string[]>([]);
  const [parsedActivities, commitParsedActivities] = useState<EditableParsedActivity[]>([]);
  const parsedActivitiesRef = useRef<EditableParsedActivity[]>([]);
  const nextRowKeyRef = useRef(0);
  const rowRevisionsRef = useRef(new Map<number, number>());
  const pendingRowEvaluationsRef = useRef(new Set<number>());
  const selectionRevisionsRef = useRef(new Map<number, number>());
  const mountedRef = useRef(true);
  const activeReviewDocumentIdsRef = useRef<string[]>([]);

  function rowKey(item: EditableParsedActivity) {
    return (item as LocalReviewRow)[LOCAL_REVIEW_ROW]!;
  }

  function setParsedActivities(update: EditableParsedActivity[] | ((rows: EditableParsedActivity[]) => EditableParsedActivity[])) {
    if (!mountedRef.current) return;
    const rows = typeof update === 'function' ? update(parsedActivitiesRef.current) : update;
    const next = rows.map((row) => rowKey(row) === undefined
      ? { ...row, [LOCAL_REVIEW_ROW]: ++nextRowKeyRef.current }
      : row);
    parsedActivitiesRef.current = next;
    commitParsedActivities(next);
  }

  function reviseRow(item: EditableParsedActivity) {
    const key = rowKey(item);
    const revision = (rowRevisionsRef.current.get(key) ?? 0) + 1;
    rowRevisionsRef.current.set(key, revision);
    return revision;
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      activeReviewRequestRef.current += 1;
      rowRevisionsRef.current.clear();
    };
  }, []);
  const [detectedSourceItems, setDetectedSourceItems] = useState<EditableDetectedSourceItem[]>([]);
  const [importedKeyLookup, commitImportedKeyLookup] = useState<ImportedKeyLookup>({ documentKey: null, keys: [], status: 'unknown' });
  const importedKeyLookupRef = useRef(importedKeyLookup);
  const importedRecordKeySetRef = useRef(new Set<string>());
  const importedKeyRequestRef = useRef(0);
  const importedRecordKeys = importedKeyLookup.keys;
  const lookupErrorRef = useRef<'factor' | 'imported' | null>(null);

  function setImportedKeyLookup(value: ImportedKeyLookup) {
    importedKeyLookupRef.current = value;
    importedRecordKeySetRef.current = new Set(value.keys);
    commitImportedKeyLookup(value);
  }

  function setImportedRecordKeys(update: string[] | ((keys: string[]) => string[])) {
    const current = importedKeyLookupRef.current;
    setImportedKeyLookup({ ...current, keys: typeof update === 'function' ? update(current.keys) : update });
  }

  function showLookupError(error: DraftReviewLookupError) {
    lookupErrorRef.current = error.lookup;
    setError(error.message);
    setSuccessMessage(null);
  }

  function clearLookupError(lookup: 'factor' | 'imported') {
    if (lookupErrorRef.current !== lookup) return;
    lookupErrorRef.current = null;
    setError(null);
  }

  function importedDocumentKey(documentIds: string[]) {
    return JSON.stringify([...new Set(documentIds)].sort());
  }
  const [bulkProvince, setBulkProvince] = useState('');
  const conversionFactorCacheRef = useRef<ConversionFactorItem[] | null>(null);
  const activeReviewRequestRef = useRef(0);
  const isProcessing = uploading || extractingId !== null || confirmingId !== null || generatingMetrics;
  const importValidationIssues = getImportValidationIssues(parsedActivities);

  const missingProvinceRowIndexes = Array.from(
    new Set(
      importValidationIssues
        .filter(
          (issue) =>
            issue.field === 'jurisdictionRegion' &&
            issue.message.includes('Missing Province'),
        )
        .map((issue) => issue.rowIndex),
    ),
  );
  const selectedImportValidationIssues = importValidationIssues.filter(
    (issue) => parsedActivities[issue.rowIndex]?.selected,
  );
  const selectedParsedActivitiesCount = parsedActivities.filter((item) => item.selected).length;
  const draftRowClassifications = parsedActivities.map((item, index) =>
    classifyDraftRow(item, getRowValidationIssues(index)),
  );
  const importableParsedActivities = parsedActivities.filter((item, index) =>
    isParsedActivityImportable(index, item),
  );
  const selectedImportableActivities = parsedActivities.filter(
    (item, index) => item.selected && isParsedActivityImportable(index, item),
  );
  const selectedImportableActivitiesCount = selectedImportableActivities.length;
  const readyImportableCount = draftRowClassifications.filter(
    (classification) => classification === 'READY',
  ).length;
  const trackedImportableCount = draftRowClassifications.filter(
    (classification) => classification === 'TRACKED_METRIC',
  ).length;
  const selectedReadyImportableCount = parsedActivities.filter(
    (item, index) => item.selected && draftRowClassifications[index] === 'READY',
  ).length;
  const selectedTrackedImportableCount = parsedActivities.filter(
    (item, index) => item.selected && draftRowClassifications[index] === 'TRACKED_METRIC',
  ).length;
  const rowsRequiringReviewCount = draftRowClassifications.filter(
    (classification) => classification === 'REQUIRES_REVIEW',
  ).length;
  const detectedSourceItemCount = detectedSourceItems.length;
  const alreadyImportedParsedActivitiesCount = parsedActivities.filter(isParsedActivityAlreadyImported).length;
  const rowsLeftOutOfImportCount =
    parsedActivities.length - selectedImportableActivitiesCount - alreadyImportedParsedActivitiesCount;
  const hasImportValidationErrors = importValidationIssues.length > 0;
  const hasSelectedImportValidationErrors = selectedImportValidationIssues.length > 0;
  const canAttemptConfirmImport =
    canImportData &&
    confirmingId === null &&
    !generatingMetrics &&
    parsedActivities.length > 0;
  const canConfirmImport =
    canAttemptConfirmImport &&
    importedKeyLookup.status === 'ready' &&
    selectedImportableActivitiesCount > 0;
  const normalizedBulkProvince = normalizePreviewProvince(bulkProvince);
  const hasBulkProvince = Boolean(normalizedBulkProvince);
  const canSetBulkProvince =
    canSetProvinceOnDraftRows &&
    missingProvinceRowIndexes.length > 0 &&
    hasBulkProvince &&
    !isProcessing;
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

  async function enrichDraftRowsWithCalculationStatus(
    rows: EditableParsedActivity[],
    options: { preserveSelection?: boolean } = {},
  ) {
    if (rows.length === 0) return rows;

    const conversionFactors = await getEmissionConversionFactors();
    if (conversionFactors.length === 0) return rows;

  
    return rows.map((item) => {
      if (isCanonicalReadyReviewRow(item)) {
        const alreadyImported = isParsedActivityAlreadyImported(item);
        return {
          ...item,
          selected: alreadyImported ? false : options.preserveSelection ? item.selected : true,
        };
      }

      const sourceFileName =
        item.documentFileName ||
        documents.find((document) => document.id === item.documentId)?.fileName ||
        item.documentId;
      const payload = buildDocumentImportActivityPayload({
        item,
        documentId: item.documentId,
        sourceFileName,
        importBatchId: `document-${item.documentId}`,
        conversionFactors,
        organizationId,
      });
      const enrichedItem = applyConfirmReviewPayload(item, payload);
      const classification = classifyDraftRow(
        enrichedItem,
        getImportValidationIssues([enrichedItem]),
      );

      return {
        ...enrichedItem,
        selected: options.preserveSelection
          ? item.selected && !isParsedActivityAlreadyImported(enrichedItem) && isImportableDraftRowClassification(classification)
          : !isParsedActivityAlreadyImported(enrichedItem) && isImportableDraftRowClassification(classification),
      };
    });
  }

  async function getEmissionConversionFactors() {
    if (conversionFactorCacheRef.current) return conversionFactorCacheRef.current;

    const requestId = activeReviewRequestRef.current;
    let conversionFactors: ConversionFactorItem[];
    try {
      conversionFactors = await getAllConversionFactors({ type: 'EMISSION' });
    } catch {
      throw new DraftReviewLookupError('factor');
    }
    if (isActiveReviewRequest(requestId)) conversionFactorCacheRef.current = conversionFactors;
    return conversionFactors;
  }

  async function reloadRemainingDraftRowsAfterConfirm(input: {
    documentIds: string[];
    importedRows: EditableParsedActivity[];
    fallbackRows: EditableParsedActivity[];
  }) {
    if (input.documentIds.length === 0) {
      return clearDraftRowSelection(input.fallbackRows);
    }
    const requestId = activeReviewRequestRef.current;
    try {
      const loadedKeys = await getImportedActivityRecordKeysForDocuments(input.documentIds);
      const importedKeys = new Set([
        ...input.importedRows.map(getEditableParsedActivityRecordKey), ...loadedKeys,
      ].filter(Boolean));
      if (isActiveReviewRequest(requestId)) {
        setImportedKeyLookup({ documentKey: importedDocumentKey(input.documentIds), keys: [...importedKeys], status: 'ready' });
        clearLookupError('imported');
      }
      const reloadedRows: EditableParsedActivity[] = [];

      for (const documentId of input.documentIds) {
      const document = documents.find((item) => item.id === documentId);
      const result = await getDocumentExtraction(documentId);
      const sourceClassification = classifyExtractedDocumentSourceItems(
        result.parsedActivities ?? [],
        {
          id: documentId,
          fileName: document?.fileName ?? documentId,
        },
      );
      const sourceRows = buildEditableParsedActivities(
          sourceClassification.reviewableActivities,
          {
            id: documentId,
            fileName: document?.fileName ?? documentId,
            createdAt: document?.createdAt,
          },
          {
            preserveRows: isSpreadsheetFileName(document?.fileName ?? documentId),
          },
        );

        reloadedRows.push(
          ...filterUnimportedDraftRows(sourceRows, importedKeys),
        );
      }

      if (reloadedRows.length === 0 && input.fallbackRows.length > 0) {
        return clearDraftRowSelection(filterUnimportedDraftRows(input.fallbackRows, importedKeys));
      }

      const enrichedRows = await enrichDraftRowsWithCalculationStatus(reloadedRows, {
        preserveSelection: false,
      });
      return clearDraftRowSelection(enrichedRows);
    } catch (error) {
      if (isActiveReviewRequest(requestId) && error instanceof DraftReviewLookupError) {
        if (error.lookup === 'imported') setImportedKeyLookup({ ...importedKeyLookupRef.current, status: 'unavailable' });
        showLookupError(error);
      }
      const knownKeys = importedKeyLookupRef.current.documentKey === importedDocumentKey(input.documentIds)
        ? importedKeyLookupRef.current.keys : [];
      const importedKeys = new Set([...knownKeys, ...input.importedRows.map(getEditableParsedActivityRecordKey)].filter(Boolean));
      return clearDraftRowSelection(filterUnimportedDraftRows(input.fallbackRows, importedKeys));
    }
  }

  async function getImportedActivityRecordKeysForDocuments(documentIds: string[]) {
    try {
      const documentIdSet = new Set(documentIds);
      const existingActivities = await getAllActivityData();
      return existingActivities
        .filter((activity) => documentIdSet.has(getActivitySourceDocumentId(activity)))
        .map(getImportedActivityRecordKey)
        .filter(Boolean);
    } catch {
      throw new DraftReviewLookupError('imported');
    }
  }

  async function refreshImportedRecordKeys(
    documentIds: string[],
    requestId = activeReviewRequestRef.current,
  ) {
    if (!isActiveReviewRequest(requestId)) return false;
    const lookupRequest = ++importedKeyRequestRef.current;
    const isCurrentLookup = () => isActiveReviewRequest(requestId) && importedKeyRequestRef.current === lookupRequest;
    const documentKey = importedDocumentKey(documentIds);
    const previous = importedKeyLookupRef.current;
    setImportedKeyLookup({ documentKey, keys: previous.documentKey === documentKey ? previous.keys : [], status: 'unknown' });
    try {
      const keys = await getImportedActivityRecordKeysForDocuments(documentIds);
      if (!isCurrentLookup()) return false;
      setImportedKeyLookup({ documentKey, keys: Array.from(new Set(keys)), status: 'ready' });
      clearLookupError('imported');
      return true;
    } catch (error) {
      if (!isCurrentLookup()) return false;
      setImportedKeyLookup({ ...importedKeyLookupRef.current, status: 'unavailable' });
      showLookupError(error as DraftReviewLookupError);
      return false;
    }
  }

  function filterUnimportedDraftRows(
    rows: EditableParsedActivity[],
    importedKeys: Set<string>,
  ) {
    return rows.filter((row) => {
      const key = getEditableParsedActivityRecordKey(row);
      return !key || !importedKeys.has(key);
    });
  }

  function clearDraftRowSelection(rows: EditableParsedActivity[]) {
    return rows.map((row) => ({
      ...row,
      selected: false,
    }));
  }

  async function buildSpreadsheetDraftRowsFromSavedReviewRows(
    rows: SpreadsheetReviewRowInput[],
    document: { id: string; fileName: string; createdAt?: string | null },
  ) {
    return buildEditableParsedActivities(
      rows.map((row) => ({
        ...row,
        country: row.jurisdictionCountry,
        province: row.jurisdictionRegion,
        date: row.recordDate,
        amount: row.quantity,
        sourceTextSnippet:
          row.notes ||
          row.sourceReference ||
          row.sourceSheetName ||
          row.sourceFileName ||
          '',
      })),
      document,
      { preserveRows: true },
    );
  }

  function isSampleDocumentId(documentId: string) {
    return sampleDocuments.some((document) => document.id === documentId);
  }


  async function previewDocument(
    doc: DocumentItem,
    requestId = beginActiveReviewRequest(),
  ) {

    if (!isActiveReviewRequest(requestId)) return;
    activeReviewDocumentIdsRef.current = [doc.id];
    const localRows = parsedActivities.filter((item) => item.documentId === doc.id);
    const localSourceItems = detectedSourceItems.filter((item) => item.documentId === doc.id);

    if (localRows.length > 0 && !shouldRefreshDocument(doc)) {
      if (!isActiveReviewRequest(requestId)) return;
      setPreviewDocumentId(doc.id);
      setPreviewDocumentIds([doc.id]);
      setParsedActivities(localRows);
      setDetectedSourceItems(localSourceItems);
      void refreshImportedRecordKeys([doc.id], requestId);
      setSuccessMessage('Review the extracted activity rows below, then confirm import.');
      setError(null);
      return;
    }

    if (isSampleDocumentId(doc.id)) {
      const sampleRows = buildSampleReviewRows().filter((item) => item.documentId === doc.id);
      if (!isActiveReviewRequest(requestId)) return;
      setParsedActivities(sampleRows);
      setDetectedSourceItems([]);
      setImportedKeyLookup({ documentKey: importedDocumentKey([doc.id]), keys: [], status: 'ready' });
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
      if (!isActiveReviewRequest(requestId)) return;
      const sourceClassification = classifyExtractedDocumentSourceItems(
        result.parsedActivities ?? [],
        doc,
      );
      const sourceItems = buildDetectedSourceItems(
        [...(result.detectedSourceItems ?? []), ...sourceClassification.detectedSourceItems],
        {
          id: doc.id,
          fileName: doc.fileName,
        },
      );
      const extractedRows = await enrichDraftRowsWithCalculationStatus(buildEditableParsedActivities(
        sourceClassification.reviewableActivities,
        {
          id: doc.id,
          fileName: doc.fileName,
          createdAt: doc.createdAt,
        },
        { preserveRows: isSpreadsheetFileName(doc.fileName) },
      ));
      if (!isActiveReviewRequest(requestId)) return;

      if (extractedRows.length === 0) {
        setError('No emissions data detected. You can view the file or retry extraction.');
        setSuccessMessage(null);
        setDetectedSourceItems(sourceItems);
        return;
      }

      setParsedActivities(extractedRows);
      setDetectedSourceItems(sourceItems);
      void refreshImportedRecordKeys([doc.id], requestId);
      setPreviewDocumentId(doc.id);
      setPreviewDocumentIds([doc.id]);
      updateDocumentStatuses([doc.id], result.status || 'REVIEW_REQUIRED');
      setSuccessMessage('Review the extracted activity rows below, then confirm import.');
    } catch (err) {
      if (!isActiveReviewRequest(requestId)) return;
      if (err instanceof DraftReviewLookupError) {
        showLookupError(err);
      } else if (err instanceof ApiError && err.code === 'EXTRACTION_NOT_FOUND') {
        setError('Preview data is no longer available. Please extract the document again.');
      } else if (err instanceof ApiError && err.code === 'FILE_MISSING') {
        setError(FILE_MISSING_MESSAGE);
        updateDocumentStatuses([doc.id], 'FILE_MISSING');
      } else {
        setError('Extraction preview could not be loaded. Please retry extraction.');
      }
      setSuccessMessage(null);
    } finally {
      if (isActiveReviewRequest(requestId)) {
        setExtractingId(null);
      }
    }
  }

  async function extractDocuments(
    documentsToExtract: Array<{ id: string; fileName: string; createdAt?: string | null }>,
    requestId = beginActiveReviewRequest(),
  ) {
    if (!isActiveReviewRequest(requestId)) return;
    activeReviewDocumentIdsRef.current = documentsToExtract.map((document) => document.id);
    if (documentsToExtract.length === 0) {
      setError('No uploaded documents were found to extract.');
      return;
    }

    setExtractingId(documentsToExtract.length > 1 ? 'multiple' : documentsToExtract[0].id);
    setError(null);
    setSuccessMessage(null);

    try {
      if (documentsToExtract.every((document) => isSampleDocumentId(document.id))) {
        const sampleRows = buildSampleReviewRows();
        if (!isActiveReviewRequest(requestId)) return;
        setSuccessMessage('Extracting sample fuel, electricity, and operations records...');
        setPreviewDocumentId(documentsToExtract.length === 1 ? documentsToExtract[0].id : 'MULTIPLE');
        setPreviewDocumentIds(documentsToExtract.map((document) => document.id));
        setParsedActivities(sampleRows);
        setImportedKeyLookup({ documentKey: importedDocumentKey(documentsToExtract.map((document) => document.id)), keys: [], status: 'ready' });
        events.onDocumentsExtracted(documentsToExtract);
        updateDocumentStatuses(
          documentsToExtract.map((document) => document.id),
          'REVIEW_REQUIRED',
        );
        const extractionSummary = buildDraftRowAuditSummary(sampleRows);
        onWorkflowEvent({
          eventName: 'DATA_EXTRACTED',
          entityType: 'IMPORT_BATCH',
          entityDisplayName: documentsToExtract.map((document) => document.fileName).join(', '),
          description: 'Draft records created',
          metadata: {
            sourceFileName: documentsToExtract.map((document) => document.fileName).join(', '),
            sourceType: getAuditSourceType(documentsToExtract[0]?.fileName),
            extractedAt: new Date().toISOString(),
            extractionStatus: 'REVIEW_REQUIRED',
            ...extractionSummary,
          },
        });
        setSuccessMessage('Sample extraction completed. Review the activity rows, then confirm import.');
        return;
      }

      const extractedRows: EditableParsedActivity[] = [];
      const extractedSourceItems: EditableDetectedSourceItem[] = [];
      const warnings: string[] = [];
      const noDataDocumentIds: string[] = [];
      const reviewRequiredDocumentIds: string[] = [];

      for (const document of documentsToExtract) {
        const result = await extractDocument(document.id);
        if (!isActiveReviewRequest(requestId)) return;
        const sourceClassification = classifyExtractedDocumentSourceItems(
          result.parsedActivities ?? [],
          document,
        );
        const extractedActivities = sourceClassification.reviewableActivities;
        extractedSourceItems.push(
          ...buildDetectedSourceItems(
            [...(result.detectedSourceItems ?? []), ...sourceClassification.detectedSourceItems],
            document,
          ),
        );

        if (extractedActivities.length === 0) {
          noDataDocumentIds.push(document.id);
        } else {
          reviewRequiredDocumentIds.push(document.id);
        }

        extractedRows.push(...buildEditableParsedActivities(extractedActivities, document));

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
        if (!isActiveReviewRequest(requestId)) return;
        setPreviewDocumentId(null);
        setPreviewDocumentIds([]);
        setParsedActivities([]);
        setDetectedSourceItems(extractedSourceItems);
        setImportedRecordKeys([]);
        setSuccessMessage(null);
        await loadDocuments();
        if (!isActiveReviewRequest(requestId)) return;
        updateDocumentStatuses(noDataDocumentIds, 'NO_DATA_FOUND');
        setError('No emissions data detected. You can view the file or retry extraction.');
        return;
      }

      const enrichedExtractedRows = await enrichDraftRowsWithCalculationStatus(extractedRows);
      if (!isActiveReviewRequest(requestId)) return;

      setPreviewDocumentId(
        documentsToExtract.length === 1 ? documentsToExtract[0].id : 'MULTIPLE',
      );
      setPreviewDocumentIds(documentsToExtract.map((document) => document.id));
      setParsedActivities(enrichedExtractedRows);
      setDetectedSourceItems(extractedSourceItems);
      events.onDocumentsExtracted(documentsToExtract);
      void refreshImportedRecordKeys(documentsToExtract.map((document) => document.id), requestId);
      const extractionSummary = buildDraftRowAuditSummary(enrichedExtractedRows);
      onWorkflowEvent({
        eventName: 'DATA_EXTRACTED',
        entityType: 'IMPORT_BATCH',
        entityDisplayName: documentsToExtract.map((document) => document.fileName).join(', '),
        description: 'Draft records created',
        metadata: {
          sourceFileName: documentsToExtract.map((document) => document.fileName).join(', '),
          sourceType: getAuditSourceType(documentsToExtract[0]?.fileName),
          extractedAt: new Date().toISOString(),
          extractionStatus: 'REVIEW_REQUIRED',
          ...extractionSummary,
        },
      });
      await loadDocuments();
      if (!isActiveReviewRequest(requestId)) return;
      updateDocumentStatuses(noDataDocumentIds, 'NO_DATA_FOUND');
      updateDocumentStatuses(reviewRequiredDocumentIds, 'REVIEW_REQUIRED');
      if (importedKeyLookupRef.current.status === 'unavailable') {
        showLookupError(new DraftReviewLookupError('imported'));
        return;
      }

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
      if (!isActiveReviewRequest(requestId)) return;
      if (err instanceof DraftReviewLookupError) {
        showLookupError(err);
        return;
      }
      const failure = getExtractionFailureState(err);
      const failedDocumentIds = documentsToExtract.map((document) => document.id);
      setSuccessMessage(null);
      await loadDocuments();
      if (!isActiveReviewRequest(requestId)) return;
      updateDocumentStatuses(failedDocumentIds, failure.status);
      setError(failure.message);
    } finally {
      if (isActiveReviewRequest(requestId)) {
        setExtractingId(null);
      }
    }
  }

  async function handleConfirmImport(documentId?: string) {
    const requestId = activeReviewRequestRef.current;
    const rowsSnapshot = parsedActivitiesRef.current;
    rowRevisionsRef.current.clear();
    if (!canImportData) {
      setError('You do not have permission to perform this action.');
      setSuccessMessage(null);
      return;
    }

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
    events.onConfirmStarted(activeDocumentIds);

    if (importedKeyLookupRef.current.status !== 'ready') {
      if (!await refreshImportedRecordKeys(activeDocumentIds, requestId)) return;
      if (!isActiveReviewRequest(requestId) || parsedActivitiesRef.current !== rowsSnapshot) return;
    }
    let rowsForConfirm: EditableParsedActivity[];
    try {
      rowsForConfirm = await enrichDraftRowsWithCalculationStatus(parsedActivities, { preserveSelection: true });
    } catch (error) {
      if (isActiveReviewRequest(requestId) && parsedActivitiesRef.current === rowsSnapshot) showLookupError(error as DraftReviewLookupError);
      return;
    }
    if (!isActiveReviewRequest(requestId) || parsedActivitiesRef.current !== rowsSnapshot) return;
    clearLookupError('factor');
    setParsedActivities(rowsForConfirm);

    const isRowImportableForConfirm = (item: EditableParsedActivity) =>
      isImportableDraftRowClassification(
        classifyDraftRow(item, getImportValidationIssues([item])),
      );
    const selectedRows = rowsForConfirm.filter((item) => item.selected);
    const selectedActivities = rowsForConfirm.filter(
      (item) => item.selected && !isParsedActivityAlreadyImported(item) && isRowImportableForConfirm(item),
    );

    if (selectedRows.length === 0) {
      setError('Please select at least one activity to import.');
      setSuccessMessage(null);
      return;
    }

    if (selectedActivities.length === 0) {
      const firstSelectedIssue = getImportValidationIssues(rowsForConfirm).find(
        (issue) => rowsForConfirm[issue.rowIndex]?.selected,
      );
      setError('Selected rows contain blocking errors. Select calculated rows or fix errors.');
      setSuccessMessage(null);
      events.onValidationIssue(firstSelectedIssue);
      return;
    }

    const missingDateCount = selectedActivities.filter(
      (item) => !item.recordDate.value,
    ).length;

    if (missingDateCount > 0) {
      const shouldImport = await confirm({
        title: 'Import records with missing dates',
        message: `${missingDateCount} record${missingDateCount === 1 ? ' is' : 's are'} missing dates. Import anyway?`,
        confirmLabel: 'Import anyway',
        cancelLabel: 'Review dates',
      });

      if (!isActiveReviewRequest(requestId)) return;
      if (!shouldImport) {
        setError('Import cancelled. You can edit missing dates before importing.');
        setSuccessMessage(null);
        return;
      }
    }
    const estimatedDateCount = selectedActivities.filter(
      (item) => item.dateEstimated && item.recordDate.value,
    ).length;

    setConfirmingId(activeDocumentIds.length > 1 ? 'multiple' : activeDocumentIds[0]);
    setError(null);
    setSuccessMessage(null);

    try {
      if (activeDocumentIds.every((documentId) => isSampleDocumentId(documentId))) {
        const importedCount = selectedActivities.length;
        const selectedImportSummary = buildDraftRowAuditSummary(selectedActivities);
        const remainingRows = clearDraftRowSelection(
          rowsForConfirm.filter((item) => !selectedActivities.includes(item)),
        );
        const rowsLeftForReview = remainingRows.length;
        if (remainingRows.length === 0) {
          setPreviewDocumentId(null);
          setPreviewDocumentIds([]);
          setParsedActivities([]);
          setDetectedSourceItems((prev) =>
            prev.filter((item) => !activeDocumentIds.includes(item.documentId)),
          );
        } else {
          setParsedActivities(remainingRows);
          const remainingDocumentIds = Array.from(
            new Set(remainingRows.map((item) => item.documentId).filter(Boolean)),
          );
          setDetectedSourceItems((prev) =>
            prev.filter((item) => remainingDocumentIds.includes(item.documentId)),
          );
          setPreviewDocumentIds(remainingDocumentIds);
          setPreviewDocumentId(
            remainingDocumentIds.length === 0
              ? null
              : remainingDocumentIds.length === 1
              ? remainingDocumentIds[0]
              : 'MULTIPLE',
          );
        }
        updateDocumentStatuses(activeDocumentIds, 'IMPORTED');
        const importSuccessMessage =
          rowsLeftForReview > 0
            ? `Imported ${importedCount} sample activity record(s). ${rowsLeftForReview} row${rowsLeftForReview === 1 ? '' : 's'} were left in draft because they require review.`
            : formatImportCompletedMessage(importedCount, selectedImportSummary.trackedMetricCount);
        setSuccessMessage(importSuccessMessage);
        const auditSummary = buildConfirmImportAuditSummary({
          rowsForConfirm,
          importedRows: selectedActivities,
          remainingRows,
        });
        onWorkflowEvent({
          eventName: 'RECORDS_IMPORTED',
          entityType: 'IMPORT_BATCH',
          entityDisplayName: selectedActivities[0]?.documentFileName || 'Sample import',
          description: 'Records imported',
          metadata: {
            sourceFileName: Array.from(new Set(selectedActivities.map((item) => item.documentFileName))).join(', '),
            sourceType: getAuditSourceType(selectedActivities[0]?.documentFileName),
            importedAt: new Date().toISOString(),
            selectedRows: selectedRows.length,
            totalRowsConsidered: auditSummary.totalRowsConsidered,
            documentReviewRowCount: auditSummary.totalRowsConsidered,
            confirmCandidateCount: selectedRows.length,
            importedRecords: importedCount,
            includedEmissionsRecords: auditSummary.includedEmissionsCreated,
            includedEmissionsCreated: auditSummary.includedEmissionsCreated,
            trackedOnlyRecords: auditSummary.trackedMetricsCreated,
            trackedMetricsCreated: auditSummary.trackedMetricsCreated,
            alreadyImportedSkipped: auditSummary.alreadyImportedSkipped,
            needsReviewSkipped: auditSummary.needsReviewSkipped,
            duplicateSkipped: auditSummary.duplicateSkipped,
            otherSkipped: auditSummary.otherSkipped,
            excludedRecords: auditSummary.rowsNotImported,
            rowsNotImported: auditSummary.rowsNotImported,
            recordsRequiringReview: auditSummary.needsReviewSkipped,
            importStatus: 'IMPORTED',
          },
        });
        await events.onImportCompleted({
          documentIds: activeDocumentIds,
          importedCount,
          trackedMetricCount: selectedImportSummary.trackedMetricCount,
          rowsLeftForReview,
          message: importSuccessMessage,
        });
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
      const importedSourceActivities: EditableParsedActivity[] = [];
      const reviewPayloadByActivity = new Map<EditableParsedActivity, DraftActivityInput>();
      const conversionFactors = await getEmissionConversionFactors();
      if (!isActiveReviewRequest(requestId)) return;
    
      for (const [activityDocumentId, activities] of activitiesByDocument) {
        const importBatchId = `document-${activityDocumentId}`;
        const sourceFileName =
          activities[0]?.documentFileName ??
          documents.find((d) => d.id === activityDocumentId)?.fileName ??
          activityDocumentId;
        const payloadPairs = activities.map((item) => ({
          item,
          payload: buildDocumentImportActivityPayload({
              item,
              documentId: activityDocumentId,
              sourceFileName,
              importBatchId,
              conversionFactors,
              organizationId,
          }),
        }));
        const importablePairs = payloadPairs.filter((pair): pair is typeof pair & { payload: ActivityDataInput } => {
          const { item, payload } = pair;
          const importable = isDocumentImportPayloadImportable(payload);
          if (!importable) {
            reviewPayloadByActivity.set(item, payload);
          }
          return importable;
        });
        const normalizedActivities = importablePairs.map(({ payload }) => payload);

        if (normalizedActivities.length === 0) continue;

        const result = await confirmDocumentImportWithRecordFallback(
          activityDocumentId,
          normalizedActivities,
          importBatchId,
        );
        const createdCount = getConfirmedImportCreatedCount(result);
        importedCount += createdCount;
        createdActivityIds.push(...(result.createdIds ?? []));
        if (!isActiveReviewRequest(requestId)) {
          await finishObsoleteImportMetrics(createdActivityIds);
          return;
        }
        const createdRecordKeys = new Set(result.createdRecordKeys ?? []);
        if (createdRecordKeys.size > 0) {
          importedSourceActivities.push(
            ...importablePairs
              .filter(({ payload }) => {
                const key = getImportActivityRecordKey(payload);
                return key && createdRecordKeys.has(key);
              })
              .map(({ item }) => item),
          );
        } else {
          importedSourceActivities.push(
            ...importablePairs.slice(0, createdCount).map(({ item }) => item),
          );
        }
      }
      const importedSourceKeys = importedSourceActivities
        .map(getEditableParsedActivityRecordKey)
        .filter(Boolean);
      if (importedSourceKeys.length > 0) {
        setImportedRecordKeys((prev) => Array.from(new Set([...prev, ...importedSourceKeys])));
      }

      if (importedCount === 0) {
        setError(null);
        if (reviewPayloadByActivity.size > 0) {
          setParsedActivities((prev) =>
            prev.map((item) =>
              reviewPayloadByActivity.has(item)
                ? applyConfirmReviewPayload(item, reviewPayloadByActivity.get(item)!)
                : item,
            ),
          );
        }
        setSuccessMessage('No new records were imported.');
        setConfirmingId(null);
        return;
      }

      const fallbackRemainingRows = rowsForConfirm
        .filter((item) => !importedSourceActivities.includes(item))
        .map((item) =>
          reviewPayloadByActivity.has(item)
            ? applyConfirmReviewPayload(item, reviewPayloadByActivity.get(item)!)
            : item,
        );
      const remainingRows = await reloadRemainingDraftRowsAfterConfirm({
        documentIds: activeDocumentIds,
        importedRows: importedSourceActivities,
        fallbackRows: fallbackRemainingRows,
      });
      if (!isActiveReviewRequest(requestId)) {
        await finishObsoleteImportMetrics(createdActivityIds);
        return;
      }
      const rowsLeftForReview = remainingRows.length;
      const selectedImportSummary = buildDraftRowAuditSummary(importedSourceActivities);
      const auditSummary = buildConfirmImportAuditSummary({
        rowsForConfirm,
        importedRows: importedSourceActivities,
        remainingRows,
      });
      const remainingDocumentIds = Array.from(
        new Set(remainingRows.map((item) => item.documentId).filter(Boolean)),
      );

      setGeneratingMetrics(true);
      setSuccessMessage('Generating emissions metrics...');
      onWorkflowEvent({
        eventName: 'RECORDS_IMPORTED',
        entityType: 'IMPORT_BATCH',
        entityDisplayName: importedSourceActivities[0]?.documentFileName || 'Imported records',
        description: 'Records imported',
        metadata: {
          sourceFileName: Array.from(new Set(importedSourceActivities.map((item) => item.documentFileName))).join(', '),
          sourceType: getAuditSourceType(importedSourceActivities[0]?.documentFileName),
          importedAt: new Date().toISOString(),
          selectedRows: selectedRows.length,
          totalRowsConsidered: auditSummary.totalRowsConsidered,
          documentReviewRowCount: auditSummary.totalRowsConsidered,
          confirmCandidateCount: selectedRows.length,
          importedRecords: importedCount,
          includedEmissionsRecords: auditSummary.includedEmissionsCreated,
          includedEmissionsCreated: auditSummary.includedEmissionsCreated,
          trackedOnlyRecords: auditSummary.trackedMetricsCreated,
          trackedMetricsCreated: auditSummary.trackedMetricsCreated,
          alreadyImportedSkipped: auditSummary.alreadyImportedSkipped,
          needsReviewSkipped: auditSummary.needsReviewSkipped,
          duplicateSkipped: auditSummary.duplicateSkipped,
          otherSkipped: auditSummary.otherSkipped,
          excludedRecords: auditSummary.rowsNotImported,
          rowsNotImported: auditSummary.rowsNotImported,
          recordsRequiringReview: auditSummary.needsReviewSkipped,
          importStatus: 'IMPORTED',
        },
      });

      try {
        if (createdActivityIds.length > 0) {
          await calculateMetrics(createdActivityIds);
        }
        if (!isActiveReviewRequest(requestId)) return;

        if (remainingRows.length === 0) {
          setPreviewDocumentId(null);
          setPreviewDocumentIds([]);
          setParsedActivities([]);
          const importSuccessMessage = formatImportCompletedMessage(
            importedCount,
            selectedImportSummary.trackedMetricCount,
          );
          setSuccessMessage(importSuccessMessage);
          await events.onImportCompleted({
            documentIds: activeDocumentIds,
            importedCount,
            trackedMetricCount: selectedImportSummary.trackedMetricCount,
            rowsLeftForReview,
            createdActivityIds,
            message: importSuccessMessage,
          });
        } else {
          setParsedActivities(remainingRows);
          setDetectedSourceItems((prev) =>
            prev.filter((item) => remainingDocumentIds.includes(item.documentId)),
          );
          setPreviewDocumentIds(remainingDocumentIds);
          setPreviewDocumentId(
            remainingDocumentIds.length === 0
              ? null
              : remainingDocumentIds.length === 1
              ? remainingDocumentIds[0]
              : 'MULTIPLE',
          );
          const importSuccessMessage =
            `Imported ${importedCount} activity record(s). ${rowsLeftForReview} row${rowsLeftForReview === 1 ? '' : 's'} were left in draft because they require review. Generated emissions metrics.${
              estimatedDateCount > 0
                ? ` ${estimatedDateCount} imported row${estimatedDateCount === 1 ? ' used an' : 's used'} estimated date.`
                : ''
            }`;
          setSuccessMessage(importSuccessMessage);
          await events.onImportCompleted({
            documentIds: activeDocumentIds,
            importedCount,
            trackedMetricCount: selectedImportSummary.trackedMetricCount,
            rowsLeftForReview,
            createdActivityIds,
            message: importSuccessMessage,
          });
        }
      } catch {
        if (!isActiveReviewRequest(requestId)) return;
        if (remainingRows.length > 0) {
          setParsedActivities(remainingRows);
          setPreviewDocumentIds(remainingDocumentIds);
          setPreviewDocumentId(
            remainingDocumentIds.length === 0
              ? null
              : remainingDocumentIds.length === 1
              ? remainingDocumentIds[0]
              : 'MULTIPLE',
          );
          setError(
            `Imported ${importedCount} activity record(s), but emissions metrics could not be generated automatically. ${rowsLeftForReview} row${rowsLeftForReview === 1 ? '' : 's'} were left in draft because they require review.`,
          );
          await events.onImportCompleted({
            documentIds: activeDocumentIds,
            importedCount,
            trackedMetricCount: selectedImportSummary.trackedMetricCount,
            rowsLeftForReview,
            createdActivityIds,
            message: `Imported ${importedCount} activity record(s), but emissions metrics could not be generated automatically.`,
          });
        } else {
          const metricsErrorMessage =
            'Imported activity records, but emissions metrics could not be generated automatically.';
          setError(metricsErrorMessage);
          await events.onImportCompleted({
            documentIds: activeDocumentIds,
            importedCount,
            trackedMetricCount: selectedImportSummary.trackedMetricCount,
            rowsLeftForReview,
            createdActivityIds,
            message: metricsErrorMessage,
          });
        }
      } finally {
        if (isActiveReviewRequest(requestId)) setGeneratingMetrics(false);
      }
    } catch (err) {
      if (!isActiveReviewRequest(requestId)) return;
      if (err instanceof DraftReviewLookupError) {
        showLookupError(err);
        return;
      }
      onWorkflowEvent({
        eventName: 'IMPORT_FAILED',
        entityType: 'IMPORT_BATCH',
        entityDisplayName: selectedActivities[0]?.documentFileName || 'Import batch',
        description: 'Import failed',
        metadata: {
          sourceFileName: selectedActivities[0]?.documentFileName,
          selectedRows: selectedRows.length,
          importStatus: 'FAILED',
          friendlyError:
            err instanceof DuplicateDocumentImportError
              ? 'This document has already been imported.'
              : 'Import failed. Review the selected rows and try again.',
        },
      });
      setError(
        err instanceof DuplicateDocumentImportError
          ? 'This document has already been imported.'
          : 'Import could not be completed. Please review the records and try again.',
      );
    } finally {
      if (isActiveReviewRequest(requestId)) {
        setConfirmingId(null);
        if (importedKeyLookupRef.current.status === 'unavailable') showLookupError(new DraftReviewLookupError('imported'));
      }
    }
  }

  async function finishObsoleteImportMetrics(createdActivityIds: string[]) {
    // Already-created records still need metrics, even though this review no longer owns the UI.
    try {
      if (createdActivityIds.length > 0) await calculateMetrics(createdActivityIds);
    } catch {
      // A superseded review must not publish metrics feedback into the current review.
    }
  }

  async function confirmDocumentImportWithRecordFallback(
    documentId: string,
    activities: ActivityDataInput[],
    importBatchId: string,
  ) {
    try {
      const result = await confirmDocumentImport(documentId, activities, importBatchId);
      return result;
    } catch (error) {
      if (!(error instanceof DuplicateDocumentImportError)) {
        throw error;
      }

      return importMissingDocumentRecordsIndividually(documentId, activities);
    }
  }

  async function importMissingDocumentRecordsIndividually(
    documentId: string,
    activities: ActivityDataInput[],
  ) {
    const existingActivities = await getAllActivityData();
    const importedKeys = new Set(
      existingActivities
        .filter((activity) => getActivitySourceDocumentId(activity) === documentId)
        .map(getImportedActivityRecordKey)
        .filter(Boolean),
    );

    const createdIds: string[] = [];
    const createdRecordKeys: string[] = [];
    const skippedIds = new Set<string>();

    for (const activity of activities) {
      const key = getImportActivityRecordKey(activity);
      if (key && importedKeys.has(key)) {
        skippedIds.add(key);
        continue;
      }

      const created = await createActivityData(activity);
      if (created?.id) {
        createdIds.push(created.id);
      }
      if (key) {
        createdRecordKeys.push(key);
        importedKeys.add(key);
      }
    }

    return {
      count: createdIds.length,
      createdIds,
      createdRecordKeys,
      importBatchId: activities[0]?.importBatchId,
      alreadyImported: createdIds.length === 0,
      skippedCount: skippedIds.size,
      message:
        createdIds.length === 0
          ? 'No new calculated records to import.'
          : undefined,
    };
  }

  function getRowValidationIssues(rowIndex: number) {
    return importValidationIssues.filter((issue) => issue.rowIndex === rowIndex);
  }

  function getFieldValidationMessage(rowIndex: number, field: ImportValidationField) {
    return importValidationIssues.find(
      (issue) => issue.rowIndex === rowIndex && issue.field === field,
    )?.message;
  }

  function isParsedActivityImportable(
    rowIndex: number,
    item: EditableParsedActivity,
  ) {
    if (importedKeyLookupRef.current.status !== 'ready' || isParsedActivityAlreadyImported(item)) return false;

    return isImportableDraftRowClassification(
      classifyDraftRow(item, getRowValidationIssues(rowIndex)),
    );
  }

  function isParsedActivityAlreadyImported(item: EditableParsedActivity) {
    const key = getEditableParsedActivityRecordKey(item);
    return Boolean(key && importedRecordKeySetRef.current.has(key));
  }

  function parsedActivityHasValidationIssues(item: EditableParsedActivity) {
    return getImportValidationIssues([item]).length > 0;
  }

  async function applyBulkProvinceToMissingRows() {
    if (!canSetProvinceOnDraftRows) {
      setError(setProvincePermissionDeniedReason);
      setSuccessMessage(null);
      return;
    }

    if (!normalizedBulkProvince) {
      setError('Select a province to apply.');
      setSuccessMessage(null);
      return;
    }

    if (missingProvinceRowIndexes.length === 0) {
      setError('No rows need a province.');
      setSuccessMessage(null);
      return;
    }

    const requestId = activeReviewRequestRef.current;
    const revisions = new Map<number, number>();
    const selectionRevisions = new Map<number, number | undefined>();
    const rowsToUpdate = new Set(missingProvinceRowIndexes);
    const updatedRows = parsedActivitiesRef.current.map((item, index) => {
        if (!rowsToUpdate.has(index)) return item;
        revisions.set(rowKey(item), reviseRow(item));
        selectionRevisions.set(rowKey(item), selectionRevisionsRef.current.get(rowKey(item)));
        pendingRowEvaluationsRef.current.add(rowKey(item));

        const updatedItem = {
          ...item,
          matchingStatus: null,
          reportTreatment: null,
          scope: null,
          calculationStatus: null,
          calculationMessage: null,
          jurisdictionRegion: {
            ...item.jurisdictionRegion,
            value: normalizedBulkProvince,
            confidence: 'medium' as const,
          },
        };

        return {
          ...updatedItem,
          selected: isImportableDraftRowClassification(
            classifyDraftRow(updatedItem, getImportValidationIssues([updatedItem])),
          ),
        };
      });
    setParsedActivities(updatedRows);
    let enrichedRows: EditableParsedActivity[];
    try {
      enrichedRows = await enrichDraftRowsWithCalculationStatus(updatedRows);
    } catch (error) {
      if (!isActiveReviewRequest(requestId)) return;
      const currentKeys = [...revisions].filter(([key, revision]) => rowRevisionsRef.current.get(key) === revision);
      currentKeys.forEach(([key]) => pendingRowEvaluationsRef.current.delete(key));
      if (currentKeys.length > 0) showLookupError(error as DraftReviewLookupError);
      return;
    }
    if (!isActiveReviewRequest(requestId)) return;
    const evaluatedByKey = new Map(enrichedRows.map((row) => [rowKey(row), row]));
    setParsedActivities((current) => current.map((row) => {
      const key = rowKey(row);
      if (!revisions.has(key) || rowRevisionsRef.current.get(key) !== revisions.get(key)) return row;
      pendingRowEvaluationsRef.current.delete(key);
      const evaluated = evaluatedByKey.get(key)!;
      return selectionRevisionsRef.current.get(key) !== selectionRevisions.get(key)
        ? { ...evaluated, selected: row.selected && evaluated.selected }
        : evaluated;
    }));
    if ([...revisions].some(([key, revision]) => rowRevisionsRef.current.get(key) !== revision)) return;
    setError(null);
    setSuccessMessage(
      `Province set to ${normalizedBulkProvince} for ${missingProvinceRowIndexes.length} row${
        missingProvinceRowIndexes.length === 1 ? '' : 's'
      }.`,
    );
  }

  function updateParsedActivityField(
    index: number,
    field: keyof EditableParsedActivity,
    value: string,
  ) {
    if (!canImportData) return;

    const currentItem = parsedActivitiesRef.current[index];
    if (!currentItem || field === 'selected') return;

    const currentField = currentItem[field] as EditableConfidenceField<any>;
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
      ...currentItem,
      ...(field === 'recordDate' ? { dateEstimated: false } : {}),
      [field]: {
        ...currentField,
        value: nextValue,
        confidence: 'medium' as const,
      },
    };
    const calculationFieldChanged = [
      'activityType',
      'recordDate',
      'quantity',
      'unit',
      'jurisdictionCountry',
      'jurisdictionRegion',
    ].includes(field);
    const nextItem = calculationFieldChanged
      ? {
          ...updatedItem,
          status: null,
          matchingStatus: null,
          reportTreatment: null,
          scope: null,
          calculationStatus: null,
          calculationMessage: null,
          matchedFactorId: null,
          matchedFactorName: null,
          matchedFactorSourceYear: null,
          matchedFactorValue: null,
          matchedFactorUnit: null,
          matchedFactorVersion: null,
          matchedFactorSourceAuthority: null,
          matchedFactorSourceDocument: null,
          matchedFactorSourceUrl: null,
          matchedFactorVerificationStatus: null,
          matchedFactorConfidenceLevel: null,
          matchedFactorAssumptions: null,
          factorSelectionReason: null,
          factorSelectionExplanation: null,
          calculatedEmissionsKgCO2e: null,
        }
      : updatedItem;
    const nextRow = {
      ...nextItem,
      selected: parsedActivityHasValidationIssues(nextItem) ? false : currentItem.selected,
    };

    const key = rowKey(currentItem);
    const revision = reviseRow(currentItem);
    setParsedActivities((prev) => prev.map((item) => rowKey(item) === key ? nextRow : item));
    if (calculationFieldChanged || pendingRowEvaluationsRef.current.has(key)) {
      void refreshParsedActivityEvaluation(nextRow, revision);
    }
  }

  async function refreshParsedActivityEvaluation(
    item: EditableParsedActivity,
    revision: number,
  ) {
    const requestId = activeReviewRequestRef.current;
    const key = rowKey(item);
    const selectionRevision = selectionRevisionsRef.current.get(key);
    const isCurrent = () => isActiveReviewRequest(requestId) && rowRevisionsRef.current.get(key) === revision;
    const issues = getImportValidationIssues([item]);
    if (issues.length > 0) {
      pendingRowEvaluationsRef.current.delete(key);
      return;
    }

    pendingRowEvaluationsRef.current.add(key);
    let conversionFactors: ConversionFactorItem[];
    try {
      conversionFactors = await getEmissionConversionFactors();
    } catch (error) {
      if (!isCurrent()) return;
      pendingRowEvaluationsRef.current.delete(key);
      showLookupError(error as DraftReviewLookupError);
      return;
    }
    if (!isCurrent()) return;
    clearLookupError('factor');
    pendingRowEvaluationsRef.current.delete(key);
    if (conversionFactors.length === 0) return;

    const sourceFileName =
      item.documentFileName ||
      documents.find((document) => document.id === item.documentId)?.fileName ||
      item.documentId;
    const payload = buildDocumentImportActivityPayload({
      item,
      documentId: item.documentId,
      sourceFileName,
      importBatchId: `document-${item.documentId}`,
      conversionFactors,
      organizationId,
    });
    const evaluatedItem = applyConfirmReviewPayload(item, payload);
    const classification = classifyDraftRow(
      evaluatedItem,
      getImportValidationIssues([evaluatedItem]),
    );
    setParsedActivities((prev) => {
      if (!isCurrent()) return prev;
      return prev.map((current) => rowKey(current) === key
        ? {
            ...evaluatedItem,
            selected: !isParsedActivityAlreadyImported(evaluatedItem) &&
              isImportableDraftRowClassification(classification) &&
              (selectionRevisionsRef.current.get(key) !== selectionRevision ? current.selected : true),
          }
        : current);
    });
  }

  function removeParsedActivity(index: number) {
    if (!canImportData) return;
    const item = parsedActivitiesRef.current[index];
    if (!item) return;
    rowRevisionsRef.current.delete(rowKey(item));
    pendingRowEvaluationsRef.current.delete(rowKey(item));
    selectionRevisionsRef.current.delete(rowKey(item));
    setParsedActivities((prev) => prev.filter((row) => rowKey(row) !== rowKey(item)));
  }

  function addParsedActivity() {
    if (!canImportData) {
      setError('You do not have permission to perform this action.');
      setSuccessMessage(null);
      return;
    }

    setParsedActivities((prev) => [
      ...prev,
      {
        selected: false,
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
        facilityName: { value: '', confidence: 'medium' },
        sourceReference: {
          value:
            documents.find((doc) => doc.id === (previewDocumentIds[0] ?? previewDocumentId))
              ?.fileName ?? '',
          confidence: 'medium' as const,
        },
        notes: { value: '', confidence: 'medium' },
      },
    ]);
  }

  function toggleParsedActivitySelected(index: number, checked: boolean) {
    if (!canImportData) return;
    const row = parsedActivitiesRef.current[index];
    if (row) selectionRevisionsRef.current.set(rowKey(row), (selectionRevisionsRef.current.get(rowKey(row)) ?? 0) + 1);

    setParsedActivities((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              selected:
                checked &&
                importedKeyLookupRef.current.status === 'ready' &&
                !isParsedActivityAlreadyImported(item) &&
                isImportableDraftRowClassification(
                  classifyDraftRow(item, getImportValidationIssues([item])),
                ),
            }
          : item,
      ),
    );
  }

  function selectAllParsedActivities() {
    if (!canImportData) return;
    parsedActivitiesRef.current.forEach((row) => selectionRevisionsRef.current.set(rowKey(row), (selectionRevisionsRef.current.get(rowKey(row)) ?? 0) + 1));

    setParsedActivities((prev) =>
      prev.map((item) => ({
        ...item,
        selected:
          importedKeyLookupRef.current.status === 'ready' &&
          !isParsedActivityAlreadyImported(item) &&
          isImportableDraftRowClassification(
            classifyDraftRow(item, getImportValidationIssues([item])),
          ),
      })),
    );
  }

  function clearAllParsedActivities() {
    if (!canImportData) return;
    parsedActivitiesRef.current.forEach((row) => selectionRevisionsRef.current.set(rowKey(row), (selectionRevisionsRef.current.get(rowKey(row)) ?? 0) + 1));

    setParsedActivities((prev) =>
      prev.map((item) => ({
        ...item,
        selected: false,
      })),
    );
  }

  function buildEditableParsedActivities(
    rows: Parameters<typeof buildReviewRows>[0],
    document: Parameters<typeof buildReviewRows>[1],
    options: { preserveRows?: boolean } = {},
  ) {
    return buildReviewRows(rows, document, options, documents, (row) =>
      isImportableDraftRowClassification(classifyDraftRow(row, getImportValidationIssues([row]))),
    );
  }

  function invalidateReviewWork() {
    activeReviewRequestRef.current += 1;
    activeReviewDocumentIdsRef.current = [];
    rowRevisionsRef.current.clear();
    pendingRowEvaluationsRef.current.clear();
    selectionRevisionsRef.current.clear();
    setExtractingId(null);
    setConfirmingId(null);
    setGeneratingMetrics(false);
  }

  function clearReview() {
    invalidateReviewWork();
    setPreviewDocumentId(null);
    setPreviewDocumentIds([]);
    setParsedActivities([]);
    setDetectedSourceItems([]);
    setImportedKeyLookup({ documentKey: null, keys: [], status: 'unknown' });
    setBulkProvince('');
  }

  function beginActiveReviewRequest() {
    const previous = importedKeyLookupRef.current;
    clearReview();
    setImportedKeyLookup({ ...previous, status: 'unknown' });
    return activeReviewRequestRef.current;
  }

  function isActiveReviewRequest(requestId: number) {
    return mountedRef.current && requestId === activeReviewRequestRef.current;
  }

  function loadSampleReview() {
    clearReview();
    setPreviewDocumentId('MULTIPLE');
    setPreviewDocumentIds(sampleDocuments.map((document) => document.id));
    setParsedActivities(buildSampleReviewRows());
    setImportedKeyLookup({ documentKey: importedDocumentKey(sampleDocuments.map((document) => document.id)), keys: [], status: 'ready' });
    setDetectedSourceItems([]);
    setBulkProvince('');
  }

  async function loadSavedSpreadsheetReview(rows: SpreadsheetReviewRowInput[], document: { id: string; fileName: string; createdAt?: string | null }, requestId = beginActiveReviewRequest()) {
    if (!isActiveReviewRequest(requestId)) return [];
    activeReviewDocumentIdsRef.current = [document.id];
    const draftRows = await buildSpreadsheetDraftRowsFromSavedReviewRows(rows, document);
    if (!isActiveReviewRequest(requestId)) return [];
    setParsedActivities(draftRows);
    setDetectedSourceItems([]);
    void refreshImportedRecordKeys([document.id], requestId);
    setPreviewDocumentId(document.id);
    setPreviewDocumentIds([document.id]);
    return draftRows;
  }

  function clearSavedSpreadsheetReview() {
    clearReview();
  }

  function removeSourceDocument(documentId: string) {
    if (activeReviewDocumentIdsRef.current.includes(documentId) ||
        parsedActivitiesRef.current.some((row) => row.documentId === documentId)) {
      invalidateReviewWork();
      setImportedRecordKeys((prev) => prev.filter((key) => !key.startsWith(`${documentId}::`)));
    }
    setParsedActivities((prev) => prev.filter((item) => item.documentId !== documentId));
    setDetectedSourceItems((prev) => prev.filter((item) => item.documentId !== documentId));
    setPreviewDocumentIds((prev) => {
      const next = prev.filter((id) => id !== documentId);
      setPreviewDocumentId(next.length === 0 ? null : next.length === 1 ? next[0] : 'MULTIPLE');
      return next;
    });
  }

  return {
    state: {
      extractingId,
      confirmingId,
      generatingMetrics,
      previewDocumentId,
      previewDocumentIds,
      parsedActivities,
      detectedSourceItems,
      importedRecordKeys,
      importedKeysStatus: importedKeyLookup.status,
      bulkProvince,
    },
    summary: {
      hasBulkProvince,
      draftRowClassifications,
      selectedParsedActivitiesCount,
      importableParsedActivities,
      selectedImportableActivitiesCount,
      readyImportableCount,
      trackedImportableCount,
      selectedReadyImportableCount,
      selectedTrackedImportableCount,
      rowsRequiringReviewCount,
      detectedSourceItemCount,
      alreadyImportedParsedActivitiesCount,
      rowsLeftOutOfImportCount,
      hasImportValidationErrors,
      canConfirmImport,
      canSetBulkProvince,
    },
    validation: { importValidationIssues, missingProvinceRowIndexes, getRowValidationIssues, getFieldValidationMessage,
      isParsedActivityImportable, isParsedActivityAlreadyImported },
    actions: {
      handleConfirmImport,
      applyBulkProvinceToMissingRows,
      updateParsedActivityField,
      removeParsedActivity,
      addParsedActivity,
      toggleParsedActivitySelected,
      selectAllParsedActivities,
      clearAllParsedActivities,
      previewDocument,
      extractDocuments,
      setBulkProvince,
      isSampleDocumentId,
      clearReview,
      beginActiveReviewRequest,
      isActiveReviewRequest,
      loadSampleReview,
      loadSavedSpreadsheetReview,
      clearSavedSpreadsheetReview,
      removeSourceDocument,
    },
  };
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
        message: 'The extraction took too long. Please try again.',
      };
    }

    return {
      status: 'EXTRACTION_FAILED',
      message: getUserFriendlyErrorMessage(err, 'dataExtraction'),
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
    message: getUserFriendlyErrorMessage(err, 'dataExtraction'),
  };
}

function getConfirmedImportCreatedCount(result: ConfirmImportResponse) {
  if (Number.isFinite(result.count)) {
    return Math.max(0, result.count);
  }

  return result.createdIds?.length ?? 0;
}
