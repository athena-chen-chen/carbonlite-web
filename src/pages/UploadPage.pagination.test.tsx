import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { UploadPage } from './UploadPage';
import { uploadDocument, type DocumentItem } from '../services/documents';
import { extractDocument, getDocumentExtraction } from '../services/documentExtraction';

// Exercise the real paged document service and useDocuments through the existing page UI.
vi.mock('../services/documents', async (original) => ({ ...await original<typeof import('../services/documents')>(), uploadDocument: vi.fn() }));
vi.mock('../services/documentExtraction', async (original) => ({ ...await original<typeof import('../services/documentExtraction')>(), extractDocument: vi.fn(), getDocumentExtraction: vi.fn() }));
vi.mock('../services/activityData', async (original) => ({ ...await original<typeof import('../services/activityData')>(), getAllActivityData: vi.fn().mockResolvedValue([]) }));
vi.mock('../services/conversionFactors', async (original) => ({ ...await original<typeof import('../services/conversionFactors')>(), getAllConversionFactors: vi.fn().mockResolvedValue([]) }));
vi.mock('../services/activityEvents', () => ({ trackActivityEvent: vi.fn().mockResolvedValue({}) }));
vi.mock('../services/analytics.service', () => ({ track: vi.fn() }));
vi.mock('../services/ga4.service', () => ({ trackEvent: vi.fn() }));
vi.mock('../components/AppDialog', () => ({ useAppDialog: () => ({ confirm: vi.fn().mockResolvedValue(true), showError: vi.fn() }) }));
vi.mock('../components/ExcelInputTable', () => ({ ExcelInputTable: () => null }));

let documents: DocumentItem[];
let requests: string[];
let failSecondPage: boolean;
let holdSecondPage: Promise<void> | null;
function extraction(id: string) {
  return { documentId: id, status: 'REVIEW_REQUIRED', parsedActivities: [{ activityType: 'WATER', quantity: 18, unit: 'm3', recordDate: '2026-01-01', sourceRow: 2 }], detectedSourceItems: [], sourceRowCount: 1, extractedRowCount: 1, possibleMissingRows: false, warning: null };
}
function locationProbe() {
  const location = useLocation();
  return <output data-testid="scope-state">{JSON.stringify(location.state)}</output>;
}
function mount(path = '/') {
  const Probe = locationProbe;
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/" element={<UploadPage />} /><Route path="/metrics-summary" element={<Probe />} /></Routes></MemoryRouter>);
}
async function expand() {
  await userEvent.click(await screen.findByRole('button', { name: /Expand document list \(25\)/ }));
}
beforeEach(() => {
  localStorage.setItem('currentUser', JSON.stringify({ id: 'user', organizationId: 'org-1', role: 'ADMIN', accountType: 'CUSTOMER' }));
  localStorage.setItem('accessToken', 'token');
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
  documents = Array.from({ length: 25 }, (_, i) => ({ id: `doc-${i + 1}`, organizationId: 'org-1', fileName: `source-${i + 1}.xlsx`, fileUrl: '', type: 'SPREADSHEET', status: i === 24 ? 'REVIEW_REQUIRED' : i === 23 ? 'EXTRACTION_FAILED' : 'IMPORTED', importedRecordCount: i === 23 ? 0 : i === 24 ? 3 : 1, createdAt: new Date(Date.UTC(2026, 0, 25 - i)).toISOString(), updatedAt: '2026-01-01' }));
  requests = []; failSecondPage = false; holdSecondPage = null;
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    const parsed = new URL(String(url)); requests.push(`${init?.method ?? 'GET'} ${parsed.pathname}${parsed.search}`);
    if (parsed.pathname.endsWith('/documents') && (!init?.method || init.method === 'GET')) {
      const page = Number(parsed.searchParams.get('page') ?? 1); const pageSize = Number(parsed.searchParams.get('pageSize') ?? 20);
      if (page === 2) {
        if (holdSecondPage) await holdSecondPage;
        if (failSecondPage) throw new Error('page 2 unavailable');
      }
      return new Response(JSON.stringify({ items: documents.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total: documents.length, totalPages: Math.ceil(documents.length / pageSize) }), { status: 200 });
    }
    if (parsed.pathname.includes('/documents/') && init?.method === 'DELETE') {
      const id = parsed.pathname.split('/').at(-1); documents = documents.filter((doc) => doc.id !== id);
      return new Response(JSON.stringify({ deletedDocument: true, deletedActivityRecords: 0 }), { status: 200 });
    }
    return new Response('{}', { status: 200 });
  });
  vi.mocked(uploadDocument).mockImplementation(async ({ file }) => {
    const doc = { ...documents[0], id: 'new-upload', fileName: file.name, status: 'UPLOADED', importedRecordCount: 0, createdAt: '2026-02-01' };
    documents.unshift(doc); return doc;
  });
  vi.mocked(extractDocument).mockImplementation(async (id) => { const doc = documents.find((item) => item.id === id); if (doc) doc.status = 'REVIEW_REQUIRED'; return extraction(id); });
  vi.mocked(getDocumentExtraction).mockImplementation(async (id) => extraction(id));
});

it('loads all 25 sources and opens details for document 25', async () => {
  mount(); await expand();
  expect(screen.getAllByRole('checkbox', { name: /^Select document / })).toHaveLength(25);
  await userEvent.click(screen.getByRole('button', { name: 'Open document actions for source-25.xlsx' }));
  await userEvent.click(screen.getByRole('menuitem', { name: 'View Details' }));
  const dialog = screen.getByRole('dialog');
  expect(dialog).toHaveTextContent('source-25.xlsx');
  expect(dialog).toHaveTextContent('3');
  expect(requests.some((url) => url.includes('page=2'))).toBe(true);
});

it('selects imported documents across pages, including a later Needs Review document, exactly once', async () => {
  mount(); await expand();
  const later = screen.getByRole('checkbox', { name: 'Select document source-25.xlsx' });
  expect(later).toBeEnabled();
  expect(later.closest('tr')).toHaveTextContent('Needs Review');
  await userEvent.click(screen.getByRole('checkbox', { name: 'Select document source-1.xlsx' }));
  await userEvent.click(later);
  await userEvent.click(screen.getByRole('button', { name: 'View Calculation Results' }));
  expect(JSON.parse(screen.getByTestId('scope-state').textContent!)).toEqual({ reportScope: 'selectedDocuments', selectedDocumentIds: ['doc-1', 'doc-25'] });
});

it('deletes only the later-page source, keeps other later sources, and preserves the F01 delete contract', async () => {
  mount(); await expand();
  await userEvent.click(screen.getByRole('button', { name: 'Open document actions for source-25.xlsx' }));
  await userEvent.click(screen.getByRole('menuitem', { name: 'Delete Source Document' }));
  const dialog = screen.getByRole('dialog');
  expect(dialog).toHaveTextContent('will NOT delete the imported Activity Records');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Delete Source Document', exact: true }));
  await waitFor(() => expect(screen.queryByText('source-25.xlsx')).not.toBeInTheDocument());
  expect(screen.getByText('source-24.xlsx')).toBeInTheDocument();
  expect(screen.getAllByRole('checkbox', { name: /^Select document / })).toHaveLength(24);
  expect(requests.filter((url) => url.startsWith('DELETE'))).toEqual(['DELETE /api/documents/doc-25']);
  await userEvent.click(screen.getByRole('button', { name: 'Collapse document list' }));
  expect(screen.getByRole('button', { name: 'Expand document list (24)' })).toBeInTheDocument();
});

it('retry extraction for a later-page source refreshes the whole collection', async () => {
  mount(); await expand();
  const row = screen.getByText('source-24.xlsx').closest('tr')!;
  await userEvent.click(within(row).getByRole('button', { name: 'Retry Extraction' }));
  await waitFor(() => expect(extractDocument).toHaveBeenCalledWith('doc-24'));
  expect(await screen.findByText('Draft Records Review')).toBeInTheDocument();
  expect(screen.getByText('source-25.xlsx')).toBeInTheDocument();
  expect(screen.getAllByRole('checkbox', { name: /^Select document / })).toHaveLength(25);
  expect(requests.filter((url) => url.includes('page=2')).length).toBeGreaterThanOrEqual(2);
});

it('upload with 25 sources keeps every older source accessible after refresh', async () => {
  mount(); await expand();
  await userEvent.upload(document.getElementById('document-upload-input') as HTMLInputElement, new File(['bill'], 'new-source.pdf', { type: 'application/pdf' }));
  await userEvent.click(screen.getByRole('button', { name: 'Extract Data' }));
  await waitFor(() => expect(screen.getAllByRole('checkbox', { name: /^Select document / })).toHaveLength(26));
  expect(screen.getByText('source-25.xlsx')).toBeInTheDocument();
  const names = screen.getAllByRole('checkbox', { name: /^Select document / }).map((box) => box.getAttribute('aria-label'));
  expect(names[0]).toBe('Select document new-source.pdf');
  await userEvent.click(screen.getByRole('button', { name: 'Collapse document list' }));
  expect(screen.getByRole('button', { name: 'Expand document list (26)' })).toBeInTheDocument();
});

it('page 2 failure shows retry instead of a false empty state, and recovers without remount', async () => {
  failSecondPage = true; mount();
  await userEvent.click(await screen.findByRole('button', { name: 'Retry loading input sources' }));
  expect(screen.queryByText('No data sources to review yet.')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Expand document list/ })).not.toBeInTheDocument();
  failSecondPage = false;
  await userEvent.click(await screen.findByRole('button', { name: 'Retry loading input sources' }));
  await expand(); expect(screen.getByText('source-25.xlsx')).toBeInTheDocument();
});

it('route-restores document 25 only after the complete collection finishes loading', async () => {
  let release!: () => void;
  holdSecondPage = new Promise<void>((resolve) => { release = resolve; });
  mount('/?view=review&documentId=doc-25');
  expect(await screen.findByText('Loading input sources...')).toBeInTheDocument();
  expect(getDocumentExtraction).not.toHaveBeenCalled();
  await act(async () => release());
  await waitFor(() => expect(getDocumentExtraction).toHaveBeenCalledWith('doc-25'));
  expect(await screen.findByText('Draft Records Review')).toBeInTheDocument();
});
