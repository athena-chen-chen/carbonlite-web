import { createRef, type ComponentProps } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InputMethodTabs } from './InputMethodTabs';
import { DocumentUploadPanel } from './DocumentUploadPanel';
import { SpreadsheetImportPanel } from './SpreadsheetImportPanel';
import { ManualEntryPanel } from './ManualEntryPanel';
import { ExcelInputTable } from '../../../components/ExcelInputTable';

vi.mock('../../../components/ExcelInputTable', () => ({
  ExcelInputTable: vi.fn(({ mode }: { mode: string }) => <div data-testid="input-table">{mode}</div>),
}));

function documentProps(): ComponentProps<typeof DocumentUploadPanel> {
  return {
    selectedFiles: [],
    isDraggingUpload: false,
    isProcessing: false,
    canUploadData: true,
    uploadAccept: '.pdf,.xlsx',
    uploadExtractInProgress: false,
    fileInputRef: createRef<HTMLInputElement>(),
    onChooseFiles: vi.fn(),
    onFileChange: vi.fn(),
    onDragEnter: vi.fn(),
    onDragOver: vi.fn(),
    onDragLeave: vi.fn(),
    onDrop: vi.fn(),
    onUploadAndExtract: vi.fn(),
  };
}

const selectedFiles = () => [
  new File(['invoice'], 'invoice.pdf', { type: 'application/pdf', lastModified: 123 }),
  new File(['data'], 'operations.xlsx', { lastModified: 456 }),
];

it.each(['documents', 'spreadsheet', 'manual'] as const)('keeps tab order, selection, and callbacks for %s', async (activeMethod) => {
  const onChange = vi.fn();
  render(<InputMethodTabs activeMethod={activeMethod} onChange={onChange} />);
  const tabs = within(screen.getByRole('tablist', { name: 'Input data methods' })).getAllByRole('tab');
  const methods = ['documents', 'spreadsheet', 'manual'];
  const labels = ['Upload Documents', 'Import Spreadsheet', 'Manual Entry'];
  expect(tabs).toHaveLength(3);
  for (const [index, tab] of tabs.entries()) {
    expect(tab).toHaveTextContent(labels[index]);
    expect(tab).toHaveAttribute('aria-selected', String(methods[index] === activeMethod));
    await userEvent.click(tab);
    expect(onChange).toHaveBeenLastCalledWith(methods[index]);
  }
});

it('delegates choosing files from a click', () => {
  const props = documentProps();
  render(<DocumentUploadPanel {...props} />);
  const dropzone = screen.getByRole('button', { name: /Drop files here or choose files/ });
  expect(dropzone).toHaveAttribute('tabindex', '0');
  expect(dropzone).toHaveAttribute('aria-disabled', 'false');
  fireEvent.click(dropzone);
  expect(props.onChooseFiles).toHaveBeenCalledOnce();
});

it.each(['Enter', ' '])('delegates %j keyboard activation and prevents default', (key) => {
  const props = documentProps();
  render(<DocumentUploadPanel {...props} />);
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  fireEvent(screen.getByRole('button', { name: /Drop files here or choose files/ }), event);
  expect(event.defaultPrevented).toBe(true);
  expect(props.onChooseFiles).toHaveBeenCalledOnce();
});

it('ignores unrelated keyboard keys', () => {
  const props = documentProps();
  render(<DocumentUploadPanel {...props} />);
  expect(fireEvent.keyDown(screen.getByRole('button', { name: /Drop files here or choose files/ }), { key: 'Escape' })).toBe(true);
  expect(props.onChooseFiles).not.toHaveBeenCalled();
});

it.each([
  { canUploadData: false, isProcessing: false },
  { canUploadData: true, isProcessing: true },
])('prevents click/keyboard choosing when disabled: %j', (disabled) => {
  const props = { ...documentProps(), ...disabled, selectedFiles: selectedFiles(), uploadDisabledReason: 'Workspace is read-only.' };
  render(<DocumentUploadPanel {...props} />);
  const dropzone = screen.getByRole('button', { name: /Drop files here or choose files/ });
  expect(dropzone).toHaveAttribute('aria-disabled', 'true');
  fireEvent.click(dropzone);
  for (const key of ['Enter', ' ']) {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    fireEvent(dropzone, event);
    expect(event.defaultPrevented).toBe(false);
  }
  expect(props.onChooseFiles).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Extract Data' })).toBeDisabled();
  if (!disabled.canUploadData) {
    expect(dropzone).toHaveAttribute('title', props.uploadDisabledReason);
    expect(screen.getByRole('button', { name: 'Extract Data' })).toHaveAttribute('title', props.uploadDisabledReason);
  }
});

it('delegates every drag/drop event with its files and shows dragging presentation', () => {
  const props = { ...documentProps(), isDraggingUpload: true };
  render(<DocumentUploadPanel {...props} />);
  const dropzone = screen.getByRole('button', { name: /Drop files here Supported files/ });
  const dataTransfer = { files: selectedFiles() };
  fireEvent.dragEnter(dropzone, { dataTransfer });
  fireEvent.dragOver(dropzone, { dataTransfer });
  fireEvent.dragLeave(dropzone, { dataTransfer });
  fireEvent.drop(dropzone, { dataTransfer });
  for (const callback of [props.onDragEnter, props.onDragOver, props.onDragLeave, props.onDrop]) {
    expect(callback).toHaveBeenCalledOnce();
    expect(vi.mocked(callback).mock.calls[0][0].dataTransfer).toBe(dataTransfer);
  }
});

it('preserves the hidden input attributes, parent ref, and file-change callback', () => {
  const props = documentProps();
  const { container } = render(<DocumentUploadPanel {...props} />);
  const input = container.querySelector<HTMLInputElement>('#document-upload-input')!;
  expect(props.fileInputRef).toHaveProperty('current', input);
  expect(input).toHaveAttribute('type', 'file');
  expect(input).toHaveAttribute('accept', props.uploadAccept);
  expect(input).toHaveAttribute('multiple');
  expect(input).toHaveStyle({ display: 'none' });
  const files = selectedFiles();
  fireEvent.change(input, { target: { files } });
  expect(props.onFileChange).toHaveBeenCalledOnce();
  expect(vi.mocked(props.onFileChange).mock.calls[0][0].target.files).toBe(files);
});

it('keeps filenames, MIME fallbacks, byte sizes, and workflow steps', () => {
  render(<DocumentUploadPanel {...documentProps()} selectedFiles={selectedFiles()} />);
  expect(screen.getByText('Selected files:')).toBeInTheDocument();
  expect(screen.getAllByRole('listitem').map(item => item.textContent)).toEqual([
    'invoice.pdf · application/pdf · 7 bytes',
    'operations.xlsx · Unknown · 4 bytes',
  ]);
  const workflow = screen.getByLabelText('Input Data local steps');
  for (const step of ['Select source document', 'Extract activity data', 'Review parser results', 'Save rows for review']) {
    expect(within(workflow).getByText(step)).toBeInTheDocument();
  }
});

it('disables extraction until a file is selected, then delegates extraction', async () => {
  const props = documentProps();
  const { rerender } = render(<DocumentUploadPanel {...props} />);
  expect(screen.getByRole('button', { name: 'Extract Data' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Extract Data' })).toHaveAttribute('title', 'Select a document before extracting data.');
  rerender(<DocumentUploadPanel {...props} selectedFiles={selectedFiles().slice(0, 1)} />);
  expect(screen.getByText('Selected file:')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Extract Data' }));
  expect(props.onUploadAndExtract).toHaveBeenCalledOnce();
});

it('preserves the processing label and disabled extraction', () => {
  render(<DocumentUploadPanel {...documentProps()} selectedFiles={selectedFiles()} isProcessing uploadExtractInProgress />);
  expect(screen.getByRole('button', { name: 'Extracting...' })).toBeDisabled();
});

it('wires spreadsheet templates, mode, success, and source changes to the parent', async () => {
  const props = { onDownloadCsvTemplate: vi.fn(), onDownloadExcelTemplate: vi.fn(), onSuccess: vi.fn(), onSourceChange: vi.fn() };
  render(<SpreadsheetImportPanel {...props} />);
  expect(screen.getByRole('heading', { name: 'Import Spreadsheet', level: 2 })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Download CSV template' }));
  await userEvent.click(screen.getByRole('button', { name: 'Download Excel template' }));
  expect(props.onDownloadCsvTemplate).toHaveBeenCalledOnce();
  expect(props.onDownloadExcelTemplate).toHaveBeenCalledOnce();
  const tableProps = vi.mocked(ExcelInputTable).mock.calls.at(-1)![0];
  expect(tableProps.mode).toBe('spreadsheet');
  const result = { source: 'spreadsheet' as const, savedCount: 5, sourceDocumentId: 'source-1' };
  await tableProps.onSuccess(result);
  tableProps.onSourceChange?.();
  expect(props.onSuccess).toHaveBeenCalledWith(result);
  expect(props.onSourceChange).toHaveBeenCalledOnce();
});

it('attaches the parent manual ref to the existing focusable container and preserves save wiring', async () => {
  const containerRef = createRef<HTMLDivElement>();
  const onSuccess = vi.fn();
  const { container } = render(<ManualEntryPanel containerRef={containerRef} onSuccess={onSuccess} />);
  expect(containerRef.current).toBe(container.firstElementChild);
  expect(containerRef.current).toHaveAttribute('tabindex', '-1');
  expect(screen.getByRole('heading', { name: 'Manual Entry', level: 2 })).toBeInTheDocument();
  const tableProps = vi.mocked(ExcelInputTable).mock.calls.at(-1)![0];
  expect(tableProps.mode).toBe('manual');
  const result = { source: 'manual' as const, savedCount: 1 };
  await tableProps.onSuccess(result);
  expect(onSuccess).toHaveBeenCalledWith(result);
});
