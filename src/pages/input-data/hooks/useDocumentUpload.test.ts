import { act, renderHook } from '@testing-library/react';
import type { ChangeEvent, DragEvent } from 'react';
import { useDocumentUpload } from './useDocumentUpload';
import { uploadDocument } from '../../../services/documents';

vi.mock('../../../services/documents', async importOriginal => ({ ...await importOriginal<typeof import('../../../services/documents')>(), uploadDocument: vi.fn() }));

function options() {
  return {
    canUploadData: true, isProcessing: () => false, permissionDeniedReason: 'Upload permission denied.',
    feedback: { error: vi.fn(), success: vi.fn() }, onFilesSelected: vi.fn(), onUploaded: vi.fn(),
    formatDuplicateDocumentMessage: () => 'Already uploaded.',
  };
}
const file = () => new File(['bill'], 'bill.pdf', { type: 'application/pdf' });
const fileChange = (files: File[]) => ({ target: { files } } as unknown as ChangeEvent<HTMLInputElement>);
const drag = (files: File[] = []) => ({ preventDefault: vi.fn(), stopPropagation: vi.fn(), dataTransfer: { files, dropEffect: '' } } as unknown as DragEvent<HTMLDivElement>);

it('opens the input and keeps selected files and invalidation in the upload workflow', () => {
  const p = options();
  const { result } = renderHook(() => useDocumentUpload(p));
  const input = document.createElement('input');
  const click = vi.spyOn(input, 'click');
  act(() => { result.current.fileInputRef.current = input; result.current.handleChooseFile(); });
  expect(click).toHaveBeenCalledOnce();
  expect(result.current.uploadAccept).toBe('.pdf,.jpg,.jpeg,.png');
  const files = [file(), new File(['image'], 'receipt.png', { type: 'image/png' })];
  act(() => result.current.handleFileChange(fileChange(files)));
  expect(result.current.selectedFiles).toEqual(files);
  expect(p.onFilesSelected).toHaveBeenCalledOnce();
});

it.each([
  ['PDF', 'bill.PDF', 'application/pdf'],
  ['JPG', 'receipt.jpg', 'image/jpeg'],
  ['JPEG', 'receipt.JPEG', 'image/jpeg'],
  ['PNG', 'meter.png', 'image/png'],
] as const)('accepts %s files selected from the file picker', (_label, name, type) => {
  const p = options();
  const selected = new File(['source'], name, { type });
  const { result } = renderHook(() => useDocumentUpload(p));

  act(() => result.current.handleFileChange(fileChange([selected])));

  expect(result.current.selectedFiles).toEqual([selected]);
  expect(p.feedback.error).toHaveBeenLastCalledWith(null);
});

it.each([
  ['CSV', 'activities.csv', 'text/csv'],
  ['XLS', 'activities.xls', 'application/vnd.ms-excel'],
  ['XLSX', 'activities.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
] as const)('rejects %s picker files with spreadsheet guidance', (_label, name, type) => {
  const p = options();
  const { result } = renderHook(() => useDocumentUpload(p));

  act(() => result.current.handleFileChange(fileChange([new File(['sheet'], name, { type })])));

  expect(result.current.selectedFiles).toEqual([]);
  expect(p.feedback.error).toHaveBeenLastCalledWith(
    `Spreadsheet files should be imported using Import spreadsheet. Rejected files: ${name}.`,
  );
  expect(p.onFilesSelected).not.toHaveBeenCalled();
});

it.each([
  ['DOC', 'invoice.doc', 'application/msword'],
  ['DOCX', 'invoice.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
] as const)('rejects %s picker files as unsupported', (_label, name, type) => {
  const p = options();
  const { result } = renderHook(() => useDocumentUpload(p));

  act(() => result.current.handleFileChange(fileChange([new File(['document'], name, { type })])));

  expect(result.current.selectedFiles).toEqual([]);
  expect(p.feedback.error).toHaveBeenLastCalledWith(
    `Unsupported file type. Upload PDF, JPG, JPEG, or PNG files. Rejected files: ${name}.`,
  );
});

it('rejects a document extension when its available MIME type is unsupported', () => {
  const p = options();
  const { result } = renderHook(() => useDocumentUpload(p));

  act(() => result.current.handleFileChange(fileChange([
    new File(['not a PDF'], 'disguised.pdf', { type: 'application/msword' }),
  ])));

  expect(result.current.selectedFiles).toEqual([]);
  expect(p.feedback.error).toHaveBeenLastCalledWith(
    'Unsupported file type. Upload PDF, JPG, JPEG, or PNG files. Rejected files: disguised.pdf.',
  );
});

it('preserves nested drag depth, drop effect and multiple-file drop behavior', () => {
  const p = options();
  const { result } = renderHook(() => useDocumentUpload(p));
  act(() => { result.current.handleUploadDragEnter(drag()); result.current.handleUploadDragEnter(drag()); });
  expect(result.current.isDraggingUpload).toBe(true);
  act(() => result.current.handleUploadDragLeave(drag()));
  expect(result.current.isDraggingUpload).toBe(true);
  const over = drag();
  act(() => result.current.handleUploadDragOver(over));
  expect(over.dataTransfer.dropEffect).toBe('copy');
  const files = [file(), new File(['image'], 'receipt.jpg', { type: 'image/jpeg' })];
  act(() => result.current.handleUploadDrop(drag(files)));
  expect(result.current.isDraggingUpload).toBe(false);
  expect(result.current.selectedFiles).toEqual(files);
});

it.each([
  ['XLSX', 'dropped.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ['CSV', 'dropped.csv', ''],
] as const)('rejects dropped %s files through the shared validation path', (_label, name, type) => {
  const p = options();
  const { result } = renderHook(() => useDocumentUpload(p));

  act(() => result.current.handleUploadDrop(drag([new File(['sheet'], name, { type })])));

  expect(result.current.selectedFiles).toEqual([]);
  expect(p.feedback.error).toHaveBeenLastCalledWith(
    `Spreadsheet files should be imported using Import spreadsheet. Rejected files: ${name}.`,
  );
});

it('keeps valid documents from a mixed selection and reports every rejected file', () => {
  const p = options();
  const validPdf = file();
  const validPng = new File(['image'], 'meter.png', { type: 'image/png' });
  const { result } = renderHook(() => useDocumentUpload(p));

  act(() => result.current.handleFileChange(fileChange([
    validPdf,
    new File(['sheet'], 'activities.xlsx', { type: '' }),
    validPng,
    new File(['word'], 'notes.docx', { type: '' }),
  ])));

  expect(result.current.selectedFiles).toEqual([validPdf, validPng]);
  expect(p.feedback.error).toHaveBeenLastCalledWith(
    'Spreadsheet files should be imported using Import spreadsheet. Rejected files: activities.xlsx. '
      + 'Unsupported file type. Upload PDF, JPG, JPEG, or PNG files. Rejected files: notes.docx.',
  );
  expect(p.onFilesSelected).toHaveBeenCalledOnce();
});

it.each(['invalid', 'oversize'] as const)('preserves %s file errors and clears selection', (kind) => {
  const p = options();
  const { result } = renderHook(() => useDocumentUpload(p));
  const invalid = kind === 'invalid' ? new File(['bad'], 'bad.exe') : file();
  if (kind === 'oversize') Object.defineProperty(invalid, 'size', { value: 10 * 1024 * 1024 + 1 });
  act(() => result.current.handleFileChange(fileChange([invalid])));
  expect(result.current.selectedFiles).toEqual([]);
  expect(p.feedback.error).toHaveBeenLastCalledWith(kind === 'invalid'
    ? 'Unsupported file type. Upload PDF, JPG, JPEG, or PNG files. Rejected files: bad.exe.'
    : 'Files must be 10 MB or less. Rejected files: bill.pdf.');
  expect(p.onFilesSelected).not.toHaveBeenCalled();
});

it('keeps document-only restrictions for replacement actions, then resets all upload state', () => {
  const p = options();
  const { result } = renderHook(() => useDocumentUpload(p));
  act(() => result.current.setReplacementSourceDocument({ id: 'doc', fileName: 'sheet.xlsx', type: 'SPREADSHEET', status: 'FILE_MISSING', fileUrl: '', createdAt: '2026-01-01' }));
  expect(result.current.uploadAccept).toBe('.pdf,.jpg,.jpeg,.png');
  act(() => result.current.handleFileChange(fileChange([
    new File(['sheet'], 'sheet.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
  ])));
  expect(p.feedback.error).toHaveBeenLastCalledWith(
    'Spreadsheet files should be imported using Import spreadsheet. Rejected files: sheet.xlsx.',
  );
  act(() => { result.current.handleUploadDragEnter(drag()); result.current.beginUploadAndExtract(); });
  act(() => result.current.reset());
  expect(result.current.selectedFiles).toEqual([]);
  expect(result.current.replacementSourceDocument).toBeNull();
  expect(result.current.isDraggingUpload).toBe(false);
  expect(result.current.uploading).toBe(false);
  expect(result.current.uploadExtractInProgress).toBe(false);
});

it('blocks input and drop interactions during denied permission or other processing', () => {
  const p = { ...options(), canUploadData: false };
  const { result } = renderHook(() => useDocumentUpload(p));
  act(() => result.current.handleFileChange(fileChange([file()])));
  act(() => result.current.handleUploadDrop(drag([file()])));
  expect(result.current.selectedFiles).toEqual([]);
  expect(p.feedback.error).toHaveBeenLastCalledWith('Upload permission denied.');
  const over = drag();
  act(() => result.current.handleUploadDragOver(over));
  expect(over.dataTransfer.dropEffect).toBe('none');
});

it('returns uploaded sources in order and keeps the combined busy lifecycle until page completion', async () => {
  const p = options();
  const files = [file(), new File(['image'], 'receipt.png', { type: 'image/png' })];
  vi.mocked(uploadDocument).mockImplementation(async ({ file, type }) => ({ id: file.name, fileName: file.name, fileUrl: '', type, status: 'UPLOADED', createdAt: '2026-01-01', updatedAt: '2026-01-01' }));
  const { result } = renderHook(() => useDocumentUpload(p));
  act(() => { result.current.handleFileChange(fileChange(files)); result.current.beginUploadAndExtract(); });
  await act(async () => {
    const uploaded = await result.current.uploadSelectedFiles();
    expect(uploaded.map(item => item.id)).toEqual(['bill.pdf', 'receipt.png']);
  });
  expect(result.current.uploading).toBe(true);
  expect(result.current.selectedFiles).toEqual([]);
  expect(p.onUploaded).toHaveBeenCalledTimes(2);
  act(() => result.current.finishUploadAndExtract());
  expect(result.current.uploading).toBe(false);
  expect(result.current.uploadExtractInProgress).toBe(false);
});
