import { createRef } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentActionMenu } from './DocumentActionMenu';
import { DocumentDetailsDialog } from './DocumentDetailsDialog';
import { DeleteDocumentDialog } from './DeleteDocumentDialog';
import type { DocumentActionConfig, DocumentItem } from '../inputData.types';

const document: DocumentItem = {
  id: 'source', fileName: 'source.xlsx', fileUrl: '', type: 'SPREADSHEET',
  status: 'REVIEW_REQUIRED', createdAt: '2026-07-20T00:00:00Z', importedRecordCount: 3,
};

it('portals the menu to document.body with its ref, filename and supplied fixed position', () => {
  const menuRef = createRef<HTMLDivElement>();
  const { container } = render(<DocumentActionMenu document={document} actions={[]} position={{ top: 160, right: 230 }} menuRef={menuRef} onAction={vi.fn()} />);
  const menu = screen.getByRole('menu', { name: 'More actions for source.xlsx' });
  expect(menu.parentElement).toBe(globalThis.document.body);
  expect(container).not.toContainElement(menu);
  expect(menuRef.current).toBe(menu);
  expect(menu).toHaveStyle({ position: 'fixed', top: '160px', right: '230px', zIndex: 1000 });
});

it('preserves action order, labels, titles, disabled states, separators, styles and callback arguments', async () => {
  const actions: DocumentActionConfig[] = [
    { kind: 'viewDetails', label: 'View Details', title: 'View source metadata' },
    { kind: 'downloadSource', label: 'Opening source file...', disabled: true },
    { kind: 'delete', label: 'Delete Source Document', danger: true, separatorBefore: true },
  ];
  const onAction = vi.fn();
  render(<DocumentActionMenu document={document} actions={actions} position={{ top: 12, right: 24 }} menuRef={createRef()} onAction={onAction} />);
  const menu = screen.getByRole('menu');
  const items = within(menu).getAllByRole('menuitem');
  expect(items.map(item => item.textContent)).toEqual(actions.map(action => action.label));
  expect(items[0]).toHaveAttribute('type', 'button');
  expect(items[0]).toHaveAttribute('title', 'View source metadata');
  expect(items[1]).toHaveAttribute('title', 'Opening source file...');
  expect(items[2]).toHaveAttribute('title', 'Delete Source Document');
  expect(items[1]).toBeDisabled();
  expect(items[0]).toHaveStyle({ color: '#0f172a', cursor: 'pointer', padding: '9px 10px' });
  expect(items[1]).toHaveStyle({ color: '#94a3b8', cursor: 'not-allowed' });
  expect(items[2]).toHaveStyle({ color: '#b91c1c', cursor: 'pointer' });
  expect(within(menu).getAllByRole('separator')).toHaveLength(1);
  expect(items[2].previousElementSibling).toHaveAttribute('role', 'separator');
  await userEvent.click(items[0]);
  expect(onAction).toHaveBeenLastCalledWith(document, actions[0]);
  await userEvent.click(items[1]);
  expect(onAction).toHaveBeenCalledTimes(1);
  await userEvent.click(items[2]);
  expect(onAction).toHaveBeenLastCalledWith(document, actions[2]);
});

const metadata = [
  { label: 'File name', value: 'source.xlsx' }, { label: 'Type', value: 'SPREADSHEET' },
  { label: 'Status', value: 'Needs Review' }, { label: 'Created date', value: '2026-07-19 18:00' },
  { label: 'Source row count', value: '9' }, { label: 'Extracted row count', value: '8' },
  { label: 'Imported record count', value: '3' },
];

it('preserves the details dialog semantics, subtitle and all seven metadata fields', () => {
  render(<DocumentDetailsDialog document={document} metadata={metadata} onClose={vi.fn()} />);
  const dialog = screen.getByRole('dialog', { name: 'Document Details' });
  expect(dialog).toHaveAttribute('aria-modal', 'true');
  expect(dialog).toHaveAttribute('aria-labelledby', 'document-details-title');
  expect(dialog.parentElement).toHaveAttribute('role', 'presentation');
  expect(screen.getByRole('heading', { name: 'Document Details' })).toHaveAttribute('id', 'document-details-title');
  expect(screen.getByText('Metadata for source.xlsx')).toBeInTheDocument();
  expect(within(dialog).getAllByRole('term')).toHaveLength(7);
  expect(within(dialog).getAllByRole('definition')).toHaveLength(7);
  for (const { label, value } of metadata) {
    expect(screen.getByText(label).nextElementSibling).toHaveTextContent(value);
  }
});

it('delegates both details close buttons without adding backdrop or Escape handlers', async () => {
  const onClose = vi.fn();
  render(<DocumentDetailsDialog document={document} metadata={metadata} onClose={onClose} />);
  const dialog = screen.getByRole('dialog');
  fireEvent.click(dialog.parentElement!);
  await userEvent.keyboard('{Escape}');
  expect(onClose).not.toHaveBeenCalled();
  const icon = screen.getByRole('button', { name: 'Close document details' });
  expect(icon).toHaveTextContent('×');
  await userEvent.click(icon);
  expect(onClose).toHaveBeenCalledTimes(1);
  await userEvent.click(screen.getByRole('button', { name: 'Close', exact: true }));
  expect(onClose).toHaveBeenCalledTimes(2);
});

it.each([true, false])('preserves delete copy, semantics and callbacks for imported=%s', async (isImported) => {
  const onCancel = vi.fn();
  const onConfirm = vi.fn();
  render(<DeleteDocumentDialog isImported={isImported} deleting={false} onCancel={onCancel} onConfirm={onConfirm} />);
  const dialog = screen.getByRole('dialog', { name: 'Delete source document?' });
  expect(dialog).toHaveAttribute('aria-modal', 'true');
  expect(dialog).toHaveAttribute('aria-labelledby', 'delete-document-title');
  expect(dialog.parentElement).toHaveAttribute('role', 'presentation');
  const importedCopy = ['This source document has already been imported.', 'Deleting/removing the source document from Review Data will NOT delete the imported Activity Records.'];
  const unimportedCopy = ['This will remove the uploaded file and its extracted review rows.', 'This action cannot be undone.'];
  for (const text of isImported ? importedCopy : unimportedCopy) expect(screen.getByText(text)).toBeInTheDocument();
  for (const text of isImported ? unimportedCopy : importedCopy) expect(screen.queryByText(text)).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(onCancel).toHaveBeenCalledOnce();
  await userEvent.click(screen.getByRole('button', { name: isImported ? 'Delete Source Document' : 'Delete', exact: true }));
  expect(onConfirm).toHaveBeenCalledOnce();
});

it.each([true, false])('disables both delete actions and gives deleting label priority (imported=%s)', async (isImported) => {
  const onCancel = vi.fn();
  const onConfirm = vi.fn();
  render(<DeleteDocumentDialog isImported={isImported} deleting onCancel={onCancel} onConfirm={onConfirm} />);
  const cancel = screen.getByRole('button', { name: 'Cancel' });
  const confirm = screen.getByRole('button', { name: 'Deleting...' });
  expect(cancel).toBeDisabled();
  expect(confirm).toBeDisabled();
  await userEvent.click(cancel);
  await userEvent.click(confirm);
  expect(onCancel).not.toHaveBeenCalled();
  expect(onConfirm).not.toHaveBeenCalled();
});

it('adds no delete dialog Escape or backdrop close behavior', async () => {
  const onCancel = vi.fn();
  render(<DeleteDocumentDialog isImported={false} deleting={false} onCancel={onCancel} onConfirm={vi.fn()} />);
  fireEvent.click(screen.getByRole('dialog').parentElement!);
  await userEvent.keyboard('{Escape}');
  expect(onCancel).not.toHaveBeenCalled();
});
