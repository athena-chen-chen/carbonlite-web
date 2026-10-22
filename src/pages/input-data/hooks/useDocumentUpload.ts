import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { DuplicateDocumentError, uploadDocument } from '../../../services/documents';
import { hasSupportedFileExtension, isSpreadsheetFileName, SPREADSHEET_UPLOAD_EXTENSIONS } from '../domain/extractionNormalization';
import type { DocumentItem } from '../inputData.types';

const MAX_UPLOAD_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const DOCUMENT_UPLOAD_ACCEPT =
  '.pdf,.csv,.xlsx,.xls,.json,.jpg,.jpeg,.png,application/pdf,text/csv,application/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/json,text/json,image/jpeg,image/png';
const SPREADSHEET_UPLOAD_ACCEPT =
  '.csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel';
const DOCUMENT_UPLOAD_FORMAT_LABEL = 'PDF, CSV, XLSX, JSON, JPG, or PNG';
const DOCUMENT_UPLOAD_EXTENSIONS = ['pdf', 'csv', 'xlsx', 'xls', 'json', 'jpg', 'jpeg', 'png'] as const;

type UploadOptions = {
  canUploadData: boolean;
  isProcessing: () => boolean;
  permissionDeniedReason: string;
  feedback: { error: (message: string | null) => void; success: (message: string | null) => void };
  onFilesSelected: () => void;
  onUploaded: (document: DocumentItem, file: File, sourceType: string) => void;
  formatDuplicateDocumentMessage: (input: { fileName: string; createdAt?: string | null }) => string;
};

export function useDocumentUpload({
  canUploadData, isProcessing, permissionDeniedReason, feedback,
  onFilesSelected, onUploaded, formatDuplicateDocumentMessage,
}: UploadOptions) {
  const { error: setError, success: setSuccessMessage } = feedback;
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDraggingUpload, setIsDraggingUpload] = useState(false);
  const [uploadExtractInProgress, setUploadExtractInProgress] = useState(false);
  const [replacementSourceDocument, setReplacementSourceDocument] = useState<DocumentItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadDragDepthRef = useRef(0);
  const isSpreadsheetReplacement = isSpreadsheetSourceDocument(replacementSourceDocument);
  const uploadAccept = isSpreadsheetReplacement ? SPREADSHEET_UPLOAD_ACCEPT : DOCUMENT_UPLOAD_ACCEPT;
  function getDocumentTypeFromFile(file: File) {
    const fileName = file.name.toLowerCase();

    if (hasSupportedFileExtension(fileName, SPREADSHEET_UPLOAD_EXTENSIONS)) {
      return 'SPREADSHEET';
    }

    if (file.type.startsWith('image/') || /\.(png|jpe?g)$/i.test(fileName)) {
      return 'IMAGE';
    }

    if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
      return 'PDF';
    }

    return 'OTHER';
  }

  function isSupportedUploadFile(file: File) {
    return hasSupportedFileExtension(file.name, DOCUMENT_UPLOAD_EXTENSIONS);
  }

  function isSupportedSpreadsheetUploadFile(file: File) {
    return hasSupportedFileExtension(file.name, SPREADSHEET_UPLOAD_EXTENSIONS);
  }

  function clearUploadInput() {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function isSpreadsheetSourceDocument(doc?: DocumentItem | null) {
    return Boolean(
      doc &&
        (isSpreadsheetFileName(doc.fileName) ||
          ['SPREADSHEET', 'CSV', 'EXCEL'].includes(
            String(doc.type ?? '').trim().toUpperCase(),
          )),
    );
  }

  function selectUploadFiles(files: File[], replacementDocument?: DocumentItem | null) {
    const expectsSpreadsheet = isSpreadsheetSourceDocument(replacementDocument);
    const unsupportedFile = files.find((file) =>
      expectsSpreadsheet
        ? !isSupportedSpreadsheetUploadFile(file)
        : !isSupportedUploadFile(file),
    );

    if (unsupportedFile) {
      setSelectedFiles([]);
      setSuccessMessage(null);
      setError(
        expectsSpreadsheet
          ? `${unsupportedFile.name} is not supported. Please select a supported spreadsheet file (.csv, .xlsx, or .xls).`
          : `${unsupportedFile.name} is not supported. Please choose ${DOCUMENT_UPLOAD_FORMAT_LABEL} files.`,
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

    onFilesSelected();
    setSelectedFiles(files);
    setSuccessMessage(null);
    setError(null);

  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (!canUploadData) {
      clearUploadInput();
      setError(permissionDeniedReason);
      setSuccessMessage(null);
      return;
    }

    const files = Array.from(event.target.files ?? []);
    selectUploadFiles(files, replacementSourceDocument);
  }

  function handleUploadDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (isProcessing() || uploading || !canUploadData) return;

    uploadDragDepthRef.current += 1;
    setIsDraggingUpload(true);
  }

  function handleUploadDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (isProcessing() || uploading || !canUploadData) {
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

    if (isProcessing() || uploading || !canUploadData) {
      setError(permissionDeniedReason);
      setSuccessMessage(null);
      return;
    }

    const files = Array.from(event.dataTransfer.files ?? []);
    setReplacementSourceDocument(null);
    selectUploadFiles(files);
  }

  function handleChooseFile() {
    if (!canUploadData) {
      setError(permissionDeniedReason);
      setSuccessMessage(null);
      return;
    }

    setReplacementSourceDocument(null);
    fileInputRef.current?.click();
  }
  // UploadPage ends this busy lifecycle after refreshing documents and extracting rows.
  async function uploadSelectedFiles() {
    if (!canUploadData) {
      setError(permissionDeniedReason);
      setSuccessMessage(null);
      return [];
    }
    if (selectedFiles.length === 0) {
      setError('Please select at least one file first.');
      return [];
    }
    onFilesSelected();
    setUploading(true);
    setError(null);
    setSuccessMessage('Uploading document...');
    const uploadedDocuments: DocumentItem[] = [];

    for (const file of selectedFiles) {
      try {
        const uploadedDocument = await uploadDocument({
          file,
          type: getDocumentTypeFromFile(file),
        });
        uploadedDocuments.push(uploadedDocument);
        onUploaded(uploadedDocument, file, getDocumentTypeFromFile(file));
      } catch (uploadError) {
        if (uploadError instanceof DuplicateDocumentError) {
          const duplicateMessage = formatDuplicateDocumentMessage({
            fileName:
              uploadError.existingDocument?.fileName || file.name,
            createdAt: uploadError.existingDocument?.createdAt,
          });
          setError(`${duplicateMessage} Duplicate upload blocked.`);
          continue;
        }

        throw uploadError;
      }
    }

    if (uploadedDocuments.length === 0) {
      setSuccessMessage(null);
      return [];
    }

    setSelectedFiles([]);
    setReplacementSourceDocument(null);

    const input = fileInputRef.current;

    if (input) {
      input.value = '';
    }

    return uploadedDocuments;
  }

  function reset() {
    setSelectedFiles([]);
    setReplacementSourceDocument(null);
    setUploading(false);
    setIsDraggingUpload(false);
    setUploadExtractInProgress(false);
    uploadDragDepthRef.current = 0;
    clearUploadInput();
  }

  return {
    selectedFiles, uploading, isDraggingUpload, uploadExtractInProgress,
    replacementSourceDocument, fileInputRef, uploadAccept,
    setSelectedFiles, setReplacementSourceDocument,
    handleChooseFile, handleFileChange, handleUploadDragEnter, handleUploadDragOver,
    handleUploadDragLeave, handleUploadDrop, uploadSelectedFiles, reset,
    beginUploadAndExtract: () => setUploadExtractInProgress(true),
    finishUploadAndExtract: () => { setUploading(false); setUploadExtractInProgress(false); },
  };
}
