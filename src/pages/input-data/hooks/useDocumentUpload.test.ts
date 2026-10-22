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
  const files = [file(), new File(['csv'], 'data.csv')];
  act(() => result.current.handleFileChange(fileChange(files)));
  expect(result.current.selectedFiles).toEqual(files);
  expect(p.onFilesSelected).toHaveBeenCalledOnce();
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
  const files = [file(), new File(['{}'], 'data.json')];
  act(() => result.current.handleUploadDrop(drag(files)));
  expect(result.current.isDraggingUpload).toBe(false);
  expect(result.current.selectedFiles).toEqual(files);
});

it.each(['invalid', 'oversize'] as const)('preserves %s file errors and clears selection', (kind) => {
  const p = options();
  const { result } = renderHook(() => useDocumentUpload(p));
  const invalid = kind === 'invalid' ? new File(['bad'], 'bad.exe') : file();
  if (kind === 'oversize') Object.defineProperty(invalid, 'size', { value: 10 * 1024 * 1024 + 1 });
  act(() => result.current.handleFileChange(fileChange([invalid])));
  expect(result.current.selectedFiles).toEqual([]);
  expect(p.feedback.error).toHaveBeenLastCalledWith(kind === 'invalid'
    ? 'bad.exe is not supported. Please choose PDF, CSV, XLSX, JSON, JPG, or PNG files.'
    : 'bill.pdf must be 10 MB or less.');
  expect(p.onFilesSelected).not.toHaveBeenCalled();
});

it('keeps spreadsheet replacement restrictions, then resets all upload state', () => {
  const p = options();
  const { result } = renderHook(() => useDocumentUpload(p));
  act(() => result.current.setReplacementSourceDocument({ id: 'doc', fileName: 'sheet.xlsx', type: 'SPREADSHEET', status: 'FILE_MISSING', fileUrl: '', createdAt: '2026-01-01' }));
  expect(result.current.uploadAccept).not.toContain('.pdf');
  act(() => result.current.handleFileChange(fileChange([file()])));
  expect(p.feedback.error).toHaveBeenLastCalledWith('bill.pdf is not supported. Please select a supported spreadsheet file (.csv, .xlsx, or .xls).');
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
  const files = [file(), new File(['csv'], 'data.csv')];
  vi.mocked(uploadDocument).mockImplementation(async ({ file, type }) => ({ id: file.name, fileName: file.name, fileUrl: '', type, status: 'UPLOADED', createdAt: '2026-01-01', updatedAt: '2026-01-01' }));
  const { result } = renderHook(() => useDocumentUpload(p));
  act(() => { result.current.handleFileChange(fileChange(files)); result.current.beginUploadAndExtract(); });
  await act(async () => {
    const uploaded = await result.current.uploadSelectedFiles();
    expect(uploaded.map(item => item.id)).toEqual(['bill.pdf', 'data.csv']);
  });
  expect(result.current.uploading).toBe(true);
  expect(result.current.selectedFiles).toEqual([]);
  expect(p.onUploaded).toHaveBeenCalledTimes(2);
  act(() => result.current.finishUploadAndExtract());
  expect(result.current.uploading).toBe(false);
  expect(result.current.uploadExtractInProgress).toBe(false);
});
