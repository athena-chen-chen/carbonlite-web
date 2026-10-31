import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { DuplicateDocumentError, uploadDocument } from '../../../services/documents';
import { hasSupportedFileExtension, SPREADSHEET_UPLOAD_EXTENSIONS } from '../domain/extractionNormalization';
import { DOCUMENT_UPLOAD_ACCEPT, validateDocumentUploadFile } from '../domain/documentUploadValidation';
import type { DocumentItem } from '../inputData.types';

const MAX_UPLOAD_FILE_SIZE_BYTES = 10 * 1024 * 1024;

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
  const uploadAccept = DOCUMENT_UPLOAD_ACCEPT;
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

  function clearUploadInput() {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function selectUploadFiles(files: File[]) {
    const spreadsheetFiles: File[] = [];
    const unsupportedFiles: File[] = [];
    const validTypeFiles = files.filter((file) => {
      const validation = validateDocumentUploadFile(file);
      if (validation.accepted) return true;
      (validation.reason === 'spreadsheet' ? spreadsheetFiles : unsupportedFiles).push(file);
      return false;
    });
    const oversizedFiles = validTypeFiles.filter((file) => file.size > MAX_UPLOAD_FILE_SIZE_BYTES);
    const acceptedFiles = validTypeFiles.filter((file) => file.size <= MAX_UPLOAD_FILE_SIZE_BYTES);
    const errors: string[] = [];

    if (spreadsheetFiles.length > 0) {
      errors.push(`Spreadsheet files should be imported using Import spreadsheet. Rejected files: ${spreadsheetFiles.map((file) => file.name).join(', ')}.`);
    }
    if (unsupportedFiles.length > 0) {
      errors.push(`Unsupported file type. Upload PDF, JPG, JPEG, or PNG files. Rejected files: ${unsupportedFiles.map((file) => file.name).join(', ')}.`);
    }
    if (oversizedFiles.length > 0) {
      errors.push(`Files must be 10 MB or less. Rejected files: ${oversizedFiles.map((file) => file.name).join(', ')}.`);
    }

    if (acceptedFiles.length > 0) onFilesSelected();
    setSelectedFiles(acceptedFiles);
    setSuccessMessage(null);
    setError(errors.length > 0 ? errors.join(' ') : null);
    if (errors.length > 0) clearUploadInput();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (!canUploadData) {
      clearUploadInput();
      setError(permissionDeniedReason);
      setSuccessMessage(null);
      return;
    }

    const files = Array.from(event.target.files ?? []);
    selectUploadFiles(files);
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
