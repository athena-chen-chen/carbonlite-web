import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentTable, type DocumentTableProps } from './DocumentTable';
import { getDocumentActionModel, hasImportedRecords } from '../domain/documentActions';
import type { DocumentItem } from '../inputData.types';

const noImportedRecordsMessage = 'No imported records are available for calculation results yet.';
const imported: DocumentItem = {
  id: 'imported', fileName: 'imported.xlsx', fileUrl: '', type: 'SPREADSHEET',
  status: 'IMPORTED', importedRecordCount: 3, sourceRowCount: 9, extractedRowCount: 9,
  createdAt: '2026-07-20T00:00:00Z',
};
const partial: DocumentItem = { ...imported, id: 'partial', fileName: 'partial.xlsx', status: 'REVIEW_REQUIRED' };
const empty: DocumentItem = { ...imported, id: 'empty', fileName: 'empty.pdf', type: 'DOCUMENT', importedRecordCount: 0 };

function props(documents = [imported, partial, empty]): DocumentTableProps {
  return {
    documents, selectedDocumentIds: [], selectableVisibleDocuments: documents.filter(hasImportedRecords),
    latestDocumentId: null, openDocumentMenuId: null, documentMenuButtonRefs: { current: {} },
    getDocumentActionModelForDoc: vi.fn(doc => getDocumentActionModel({ status: doc.status, sourceType: doc.type, hasPreview: true })),
    handleDocumentAction: vi.fn(), toggleDocumentSelection: vi.fn(),
    toggleVisibleDocumentSelection: vi.fn(), toggleDocumentMenu: vi.fn(),
    formatInputReviewRowCount: vi.fn(() => '9'), formatDocumentCreatedAt: vi.fn(() => '2026-07-19 18:00'),
    documentStatusBadgeStyle: vi.fn(() => ({ color: '#123456' })), noImportedRecordsMessage,
  };
}

it('preserves columns, colgroup, filenames, eligibility, types, statuses, and provided formatters', () => {
  const p = props();
  const { container } = render(<DocumentTable {...p} />);
  expect(screen.getAllByRole('columnheader').map(cell => cell.textContent)).toEqual(['', 'File Name', 'Type', 'Status', 'Rows', 'Created At', 'Actions']);
  expect(container.querySelectorAll('colgroup col')).toHaveLength(7);
  for (const doc of p.documents) {
    const row = within(screen.getByLabelText(`Select document ${doc.fileName}`).closest('tr')!);
    expect(row.getByText(doc.fileName)).toBeInTheDocument();
    expect(row.getByText(hasImportedRecords(doc) ? '3 imported records' : noImportedRecordsMessage)).toHaveAttribute('id', `document-eligibility-${doc.id}`);
    expect(row.getByText(doc === empty ? 'PDF extraction' : 'Spreadsheet import')).toBeInTheDocument();
    expect(row.getByText(doc === partial ? 'Needs Review' : 'Imported')).toHaveStyle({ color: '#123456' });
    expect(row.getByText('9')).toBeInTheDocument();
    expect(row.getByText('2026-07-19 18:00')).toBeInTheDocument();
    expect(p.formatInputReviewRowCount).toHaveBeenCalledWith(doc);
    expect(p.formatDocumentCreatedAt).toHaveBeenCalledWith(doc.createdAt);
    expect(p.documentStatusBadgeStyle).toHaveBeenCalledWith(doc.status);
    expect(p.getDocumentActionModelForDoc).toHaveBeenCalledWith(doc);
  }
});

it('enables imported and Needs Review partial imports, disables zero imports, and delegates selection', async () => {
  const p = props();
  render(<DocumentTable {...p} selectedDocumentIds={['empty']} />);
  const zero = screen.getByLabelText('Select document empty.pdf');
  expect(zero).toBeDisabled();
  expect(zero).not.toBeChecked();
  expect(zero).toHaveAttribute('title', noImportedRecordsMessage);
  expect(zero).toHaveAttribute('aria-describedby', 'document-eligibility-empty');
  expect(zero).toHaveAccessibleDescription(noImportedRecordsMessage);
  await userEvent.click(zero);
  expect(p.toggleDocumentSelection).not.toHaveBeenCalled();
  for (const doc of [imported, partial]) {
    const checkbox = screen.getByLabelText(`Select document ${doc.fileName}`);
    expect(checkbox).toBeEnabled();
    expect(checkbox).not.toHaveAttribute('aria-describedby');
    await userEvent.click(checkbox);
    expect(p.toggleDocumentSelection).toHaveBeenLastCalledWith(doc.id, true);
  }
});

it('uses controlled row selection and delegates deselection', async () => {
  const p = props([partial]);
  render(<DocumentTable {...p} selectedDocumentIds={[partial.id]} />);
  const checkbox = screen.getByLabelText('Select document partial.xlsx');
  expect(checkbox).toBeChecked();
  await userEvent.click(checkbox);
  expect(p.toggleDocumentSelection).toHaveBeenCalledWith(partial.id, false);
});

it('select-visible considers only eligible visible documents and delegates both states', async () => {
  const p = props();
  const { rerender } = render(<DocumentTable {...p} selectedDocumentIds={['imported', 'partial']} />);
  const header = screen.getByLabelText('Select visible documents');
  expect(header).toBeEnabled();
  expect(header).toBeChecked();
  await userEvent.click(header);
  expect(p.toggleVisibleDocumentSelection).toHaveBeenLastCalledWith(false);
  rerender(<DocumentTable {...p} selectedDocumentIds={['imported']} />);
  expect(header).not.toBeChecked();
  await userEvent.click(header);
  expect(p.toggleVisibleDocumentSelection).toHaveBeenLastCalledWith(true);
  rerender(<DocumentTable {...props([empty])} selectedDocumentIds={['empty']} />);
  expect(header).toBeDisabled();
  expect(header).not.toBeChecked();
});

it('delegates the provided primary and single direct secondary action with unchanged titles and danger style', async () => {
  const p = props([imported]);
  const model = { statusLabel: 'Custom status', primaryAction: { kind: 'preview' as const, label: 'Review Rows', title: 'Review this file' }, menuActions: [{ kind: 'delete' as const, label: 'Delete Source Document', title: 'Remove this file', danger: true }] };
  p.getDocumentActionModelForDoc = vi.fn(() => model);
  render(<DocumentTable {...p} />);
  expect(screen.getByText('Custom status')).toBeInTheDocument();
  const primary = screen.getByRole('button', { name: 'Review Rows' });
  expect(primary).toHaveAttribute('title', 'Review this file');
  await userEvent.click(primary);
  expect(p.handleDocumentAction).toHaveBeenLastCalledWith(imported, model.primaryAction);
  const secondary = screen.getByRole('button', { name: 'Delete Source Document' });
  expect(secondary).toHaveAttribute('title', 'Remove this file');
  expect(secondary).toHaveStyle({ color: '#b91c1c' });
  await userEvent.click(secondary);
  expect(p.handleDocumentAction).toHaveBeenLastCalledWith(imported, model.menuActions[0]);
  expect(screen.queryByRole('button', { name: /Open document actions/ })).not.toBeInTheDocument();
});

it('preserves disabled actions and the disabled primary wrapper callback', async () => {
  const p = props([imported]);
  const model = { statusLabel: 'Imported', primaryAction: { kind: 'preview' as const, label: 'Review Rows', disabled: true, title: 'No preview' }, menuActions: [{ kind: 'delete' as const, label: 'Deleting...', disabled: true }] };
  p.getDocumentActionModelForDoc = () => model;
  render(<DocumentTable {...p} />);
  const primary = screen.getByRole('button', { name: 'Review Rows' });
  const secondary = screen.getByRole('button', { name: 'Deleting...' });
  expect(primary).toBeDisabled();
  expect(secondary).toBeDisabled();
  await userEvent.click(secondary);
  expect(p.handleDocumentAction).not.toHaveBeenCalled();
  await userEvent.click(primary.parentElement!);
  expect(p.handleDocumentAction).toHaveBeenCalledWith(imported, model.primaryAction);
});

it('keeps the kebab trigger ref, menu semantics, parent callback, and controlled expanded state', async () => {
  const p = props([imported]);
  const { rerender } = render(<DocumentTable {...p} />);
  const trigger = screen.getByRole('button', { name: 'Open document actions for imported.xlsx' });
  expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(p.documentMenuButtonRefs.current.imported).toBe(trigger);
  await userEvent.click(trigger);
  expect(p.toggleDocumentMenu).toHaveBeenCalledWith(imported.id, trigger);
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  rerender(<DocumentTable {...p} openDocumentMenuId={imported.id} />);
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
});

it('highlights only the latest document', () => {
  render(<DocumentTable {...props()} latestDocumentId={partial.id} />);
  expect(screen.getByLabelText('Select document partial.xlsx').closest('tr')).toHaveStyle({ background: '#f0f7ff' });
  expect(screen.getByLabelText('Select document imported.xlsx').closest('tr')!.style.background).toBe('');
});
