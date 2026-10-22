import { createRef, type ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReviewDataSection } from './ReviewDataSection';
import { FILE_MISSING_EXPLANATION, formatDocumentCreatedAt } from '../../UploadPage';
import { getDocumentActionModel } from '../domain/documentActions';
import type { DocumentItem } from '../inputData.types';

const document: DocumentItem = {
  id: 'imported', fileName: 'imported.xlsx', fileUrl: '', type: 'SPREADSHEET',
  status: 'IMPORTED', importedRecordCount: 3, createdAt: '2026-07-20T00:00:00Z',
};

function props(): ComponentProps<typeof ReviewDataSection> {
  return {
    loading: false, documents: [], visibleDocuments: [], hasMissingFiles: false,
    selectedDocumentsActionLabel: 'View Calculation Results',
    selectedDocumentsActionDisabled: true,
    selectedDocumentsActionHelp: 'Select one or more files with imported records.',
    selectedDocumentIds: [], selectableVisibleDocuments: [], latestDocumentId: null,
    openDocumentMenuId: null, documentMenuButtonRefs: { current: {} },
    getDocumentActionModelForDoc: doc => getDocumentActionModel({ status: doc.status }),
    handleDocumentAction: vi.fn(), toggleDocumentSelection: vi.fn(),
    toggleVisibleDocumentSelection: vi.fn(), toggleDocumentMenu: vi.fn(),
    formatInputReviewRowCount: () => '9', formatDocumentCreatedAt,
    documentStatusBadgeStyle: () => ({}),
    noImportedRecordsMessage: 'No imported records are available for calculation results yet.',
    showAllDocuments: false, lastSavedSpreadsheetDocumentId: null, lastConfirmDocumentId: null,
    reviewSectionRef: createRef<HTMLDivElement>(), reviewHeadingRef: createRef<HTMLHeadingElement>(),
    fileMissingExplanation: FILE_MISSING_EXPLANATION,
    onSelectedDocumentsAction: vi.fn(), onToggleShowAllDocuments: vi.fn(),
  };
}

it('preserves the heading, helper, parent refs, and provided action state', async () => {
  const p = props();
  const { rerender } = render(<ReviewDataSection {...p} />);
  const heading = screen.getByRole('heading', { name: 'Review Data', level: 2 });
  expect(heading).toHaveAttribute('tabindex', '-1');
  expect(p.reviewHeadingRef).toHaveProperty('current', heading);
  expect(p.reviewSectionRef).toHaveProperty('current', heading.closest('#review'));
  expect(screen.getByText('Select imported data to view calculation results.')).toBeInTheDocument();
  const action = screen.getByRole('button', { name: 'View Calculation Results' });
  expect(action).toBeDisabled();
  expect(action).toHaveAttribute('title', p.selectedDocumentsActionHelp);
  expect(screen.getByText(p.selectedDocumentsActionHelp)).toBeInTheDocument();
  await userEvent.click(action);
  expect(p.onSelectedDocumentsAction).not.toHaveBeenCalled();
  // Even an empty selection uses the parent's disabled decision.
  rerender(<ReviewDataSection {...p} selectedDocumentsActionDisabled={false} />);
  await userEvent.click(action);
  expect(p.onSelectedDocumentsAction).toHaveBeenCalledOnce();
});

it('keeps the loading copy and hides the table, empty state, and missing-file notice', () => {
  render(<ReviewDataSection {...props()} loading hasMissingFiles documents={[document]} visibleDocuments={[document]} />);
  expect(screen.getByText('Loading input sources...')).toBeInTheDocument();
  expect(screen.getByText('Preparing uploaded files, spreadsheet imports, and status.')).toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  expect(screen.queryByText('No data sources to review yet.')).not.toBeInTheDocument();
  expect(screen.queryByText(FILE_MISSING_EXPLANATION)).not.toBeInTheDocument();
});

it('keeps the empty copy and hides the missing-file notice without documents', () => {
  render(<ReviewDataSection {...props()} hasMissingFiles />);
  expect(screen.getByText('No data sources to review yet.')).toBeInTheDocument();
  expect(screen.getByText('Upload documents or import a spreadsheet to create reviewable activity data.')).toBeInTheDocument();
  expect(screen.queryByText(FILE_MISSING_EXPLANATION)).not.toBeInTheDocument();
});

it('composes only the provided visible documents and conditionally shows the missing-file notice', () => {
  const p = { ...props(), documents: [document, { ...document, id: 'hidden', fileName: 'hidden.xlsx' }], visibleDocuments: [document] };
  const { rerender } = render(<ReviewDataSection {...p} hasMissingFiles />);
  expect(screen.getByRole('table')).toBeInTheDocument();
  expect(screen.getByText(document.fileName)).toBeInTheDocument();
  expect(screen.queryByText('hidden.xlsx')).not.toBeInTheDocument();
  expect(screen.getByText(FILE_MISSING_EXPLANATION)).toBeInTheDocument();
  rerender(<ReviewDataSection {...p} />);
  expect(screen.queryByText(FILE_MISSING_EXPLANATION)).not.toBeInTheDocument();
});

it('preserves Save All and Confirm IDs including the absent-value fallback', () => {
  const { rerender } = render(<ReviewDataSection {...props()} />);
  expect(screen.queryByText(/Save All documentId:/)).not.toBeInTheDocument();
  rerender(<ReviewDataSection {...props()} lastSavedSpreadsheetDocumentId="save-id" />);
  expect(screen.getByText('Save All documentId: save-id · Confirm documentId: -')).toBeInTheDocument();
  rerender(<ReviewDataSection {...props()} lastSavedSpreadsheetDocumentId="save-id" lastConfirmDocumentId="confirm-id" />);
  expect(screen.getByText('Save All documentId: save-id · Confirm documentId: confirm-id')).toBeInTheDocument();
});

it('preserves the three-document threshold, expand/collapse labels, and parent callback', async () => {
  const p = props();
  const documents = Array.from({ length: 4 }, (_, i) => ({ ...document, id: String(i) }));
  const { rerender } = render(<ReviewDataSection {...p} documents={documents.slice(0, 3)} />);
  expect(screen.queryByRole('button', { name: /document list/ })).not.toBeInTheDocument();
  rerender(<ReviewDataSection {...p} documents={documents} />);
  await userEvent.click(screen.getByRole('button', { name: 'Expand document list (4)' }));
  expect(p.onToggleShowAllDocuments).toHaveBeenCalledTimes(1);
  rerender(<ReviewDataSection {...p} documents={documents} showAllDocuments />);
  await userEvent.click(screen.getByRole('button', { name: 'Collapse document list' }));
  expect(p.onToggleShowAllDocuments).toHaveBeenCalledTimes(2);
});

it('does not claim there are no sources before a successful load or after a failed load, and exposes retry', async () => {
  const retry = vi.fn();
  const { rerender } = render(<ReviewDataSection {...props()} hasLoaded={false} />);
  expect(screen.queryByText('No data sources to review yet.')).not.toBeInTheDocument();
  rerender(<ReviewDataSection {...props()} hasLoaded={false} loadError="Page 2 unavailable" onRetryDocuments={retry} />);
  expect(screen.queryByText('No data sources to review yet.')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Retry loading input sources' }));
  expect(retry).toHaveBeenCalledOnce();
});
