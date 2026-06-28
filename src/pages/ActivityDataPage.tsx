import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  createActivityData,
  getAllActivityData,
  updateActivityData,
  deleteActivityData,
  bulkDeleteActivityData,
  type DeleteActivityDataResponse,
} from '../services/activityData';
import{ExcelInputTable} from '../components/ExcelInputTable';
import {
  activityTypes,
} from '../constants/activityTypes';
import { normalizeUnitForDisplay } from '../utils/unitNormalization';

const PAGE_SIZE = 15;

const ACTIVITY_TABLE_COLUMNS = [
  { key: 'status', label: 'Status' },
  { key: 'date', label: 'Date' },
  { key: 'type', label: 'Type' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'unit', label: 'Unit' },
  { key: 'source', label: 'Source' },
  { key: 'sourceReference', label: 'Source Reference' },
] as const;

type ActivityTableColumnKey = (typeof ACTIVITY_TABLE_COLUMNS)[number]['key'];

type ActivityDataItem = {
  id: string;
  activityType?: string | null;
  recordDate?: string | null;
  quantity?: string | number | null;
  unit?: string | null;
  documentId?: string | null;
  sourceDocumentId?: string | null;
  sourceFileName?: string | null;
  sourceType: string;
  sourceReference?: string | null;
  sourcePage?: string | number | null;
  sourceRow?: string | number | null;
  notes?: string | null;
};

export function ActivityDataPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<ActivityDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

const [editingId, setEditingId] = useState<string | null>(null);
const [editRow, setEditRow] = useState<any>({});
const [editErrors, setEditErrors] = useState<Record<string, string>>({});
const [lastDeleted, setLastDeleted] = useState<ActivityDataItem | null>(null);
const [selectedIds, setSelectedIds] = useState<string[]>([]);
const [reloadKey, setReloadKey] = useState(0);
const [currentPage, setCurrentPage] = useState(1);
const [bulkDeleting, setBulkDeleting] = useState(false);
const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
const [actionMenuPosition, setActionMenuPosition] = useState<{ top: number; left: number } | null>(null);
const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
const [visibleColumns, setVisibleColumns] = useState<Record<ActivityTableColumnKey, boolean>>({
  status: true,
  date: true,
  type: true,
  quantity: true,
  unit: true,
  source: true,
  sourceReference: true,
});
const [tableHasOverflow, setTableHasOverflow] = useState(false);
const tableScrollRef = useRef<HTMLDivElement | null>(null);
const columnMenuRef = useRef<HTMLDivElement | null>(null);
const actionMenuRef = useRef<HTMLDivElement | null>(null);
const documentFilterId = searchParams.get('documentId');
const recordFilterId = searchParams.get('recordId');
const sourceDocumentNameFromState =
  (location.state as { sourceDocumentName?: string } | null)?.sourceDocumentName;
const filteredItems = recordFilterId
  ? items.filter((item) => item.id === recordFilterId)
  : documentFilterId
  ? items.filter((item) => {
      const recordDocumentId = item.sourceDocumentId ?? item.documentId;
      return recordDocumentId === documentFilterId;
    })
  : items;
const documentFilterName =
  sourceDocumentNameFromState ??
  filteredItems.find((item) => item.sourceFileName)?.sourceFileName ??
  documentFilterId;
const [highlightedRecordId, setHighlightedRecordId] = useState<string | null>(null);
  async function loadItems(options: { updateState?: boolean } = {}) {
    const { updateState = true } = options;
    setLoading(true);
    try {
      const nextItems = (await getAllActivityData()) as ActivityDataItem[];

      if (updateState) {
        setItems(nextItems);
      }

      return nextItems;
    } finally {
      setLoading(false);
    }
  }

  function getDeletedCount(result: DeleteActivityDataResponse) {
    if (result && typeof result === 'object') {
      return Number(result.deletedCount ?? result.count ?? 0);
    }

    return 0;
  }

  function removeDeletedRows(idsToDelete: string[]) {
    setItems((prev) => prev.filter((item) => !idsToDelete.includes(item.id)));
  }

  function getStillReturnedDeletedIds(
    records: ActivityDataItem[],
    deletedIds: string[],
  ) {
    return deletedIds.filter((id) => records.some((item) => item.id === id));
  }

  function reconcileDeletedRowsAfterReload(
    refreshedItems: ActivityDataItem[],
    deletedIds: string[],
  ) {
    const stillReturnedIds = getStillReturnedDeletedIds(refreshedItems, deletedIds);

    if (stillReturnedIds.length > 0) {
      setError(
        `Delete succeeded, but GET /activity-data still returned ${stillReturnedIds.length} deleted record(s). Showing synced UI while backend list is checked.`,
      );
      setItems(refreshedItems.filter((item) => !deletedIds.includes(item.id)));
      return;
    }

    setItems(refreshedItems);
  }

  function formatDeletedMessage(deletedCount: number) {
    return `${deletedCount} ${deletedCount === 1 ? 'record' : 'records'} deleted.`;
  }

  useEffect(() => {
    loadItems();
  }, []);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [documentFilterId, recordFilterId]);

  useEffect(() => {
    const container = tableScrollRef.current;
    if (!container) return;

    function updateOverflowState() {
      setTableHasOverflow(container.scrollWidth > container.clientWidth + 1);
    }

    updateOverflowState();

    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(updateOverflowState);
      resizeObserver.observe(container);
      return () => resizeObserver.disconnect();
    }

    window.addEventListener('resize', updateOverflowState);
    return () => window.removeEventListener('resize', updateOverflowState);
  }, [filteredItems.length, currentPage, editingId]);

  useEffect(() => {
    if (!recordFilterId || filteredItems.length === 0) return;

    const scrollTimer = window.setTimeout(() => {
      const row = document.querySelector(`[data-testid="activity-row-${recordFilterId}"]`);
      if (row && 'scrollIntoView' in row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setHighlightedRecordId(recordFilterId);
    }, 100);

    const highlightTimer = window.setTimeout(() => {
      setHighlightedRecordId((current) => (current === recordFilterId ? null : current));
    }, 4200);

    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(highlightTimer);
    };
  }, [recordFilterId, filteredItems.length]);

  useEffect(() => {
    if (!isColumnMenuOpen) return;

    function handleDocumentClick(event: MouseEvent) {
      const target = event.target as Node | null;
      if (target && columnMenuRef.current?.contains(target)) return;
      setIsColumnMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsColumnMenuOpen(false);
      }
    }

    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isColumnMenuOpen]);

  useEffect(() => {
    if (!openActionMenuId) return;

    function closeActionMenu() {
      setOpenActionMenuId(null);
      setActionMenuPosition(null);
    }

    function handleDocumentClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (target && actionMenuRef.current?.contains(target)) return;
      if (target?.closest('[data-activity-action-menu-button="true"]')) return;
      closeActionMenu();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeActionMenu();
      }
    }

    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', closeActionMenu, true);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', closeActionMenu, true);
    };
  }, [openActionMenuId]);

function clearActivityRecordFilters() {
  setSearchParams({});
}

function toggleSelect(id: string, checked: boolean) {
  setSelectedIds((prev) =>
    checked ? [...prev, id] : prev.filter((x) => x !== id),
  );
}

function toggleSelectAll(checked: boolean) {
  const pageIds = paginatedItems.map((item) => item.id);

  setSelectedIds((prev) => {
    if (checked) {
      return Array.from(new Set([...prev, ...pageIds]));
    }

    return prev.filter((id) => !pageIds.includes(id));
  });
}

function handleGenerateReportFromSelection() {
  if (!selectedIds.length) return;

  navigate('/reports', {
    state: {
      reportScope: 'selectedRecords',
      selectedActivityRecordIds: selectedIds,
      selectedRecordIds: selectedIds,
    },
  });
}

function toggleColumn(columnKey: ActivityTableColumnKey) {
  setVisibleColumns((current) => ({
    ...current,
    [columnKey]: !current[columnKey],
  }));
}

function getActionMenuPosition(button: HTMLButtonElement) {
  const rect = button.getBoundingClientRect();
  const menuWidth = 112;
  const menuHeight = 92;
  const margin = 8;
  const top =
    rect.bottom + menuHeight + margin > window.innerHeight
      ? Math.max(margin, rect.top - menuHeight - 6)
      : rect.bottom + 6;
  const left = Math.min(
    Math.max(margin, rect.right - menuWidth),
    Math.max(margin, window.innerWidth - menuWidth - margin),
  );

  return { top, left };
}

function toggleActionMenu(rowId: string, button: HTMLButtonElement) {
  setOpenActionMenuId((current) => {
    if (current === rowId) {
      setActionMenuPosition(null);
      return null;
    }

    setActionMenuPosition(getActionMenuPosition(button));
    return rowId;
  });
}

function closeActionMenu() {
  setOpenActionMenuId(null);
  setActionMenuPosition(null);
}

function renderActionMenuPortal() {
  if (!openActionMenuId || !actionMenuPosition) return null;

  const row = items.find((item) => item.id === openActionMenuId);
  if (!row) return null;

  return createPortal(
    <div
      ref={actionMenuRef}
      role="menu"
      style={{
        ...overflowMenuStyle,
        position: 'fixed',
        top: actionMenuPosition.top,
        left: actionMenuPosition.left,
        right: 'auto',
        zIndex: 9999,
      }}
    >
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          closeActionMenu();
          startEdit(row);
        }}
        style={menuItemStyle}
      >
        Edit
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          closeActionMenu();
          void handleDelete(row);
        }}
        style={menuItemDangerStyle}
      >
        Delete
      </button>
    </div>,
    document.body,
  );
}

function handleViewCalculation(rowId: string) {
  navigate('/reports', {
    state: {
      reportScope: 'selectedRecords',
      selectedActivityRecordIds: [rowId],
      selectedRecordIds: [rowId],
    },
  });
}

function isMissingRecordValue(value: unknown) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return !normalized || normalized === 'null' || normalized === 'undefined';
}

function isActivityRecordIncomplete(row: ActivityDataItem) {
  const quantity = Number(row.quantity);

  return (
    isMissingRecordValue(row.activityType) ||
    isMissingRecordValue(row.recordDate) ||
    isMissingRecordValue(row.unit) ||
    normalizeUnitForDisplay(row.unit).status !== 'valid' ||
    isMissingRecordValue(row.quantity) ||
    !Number.isFinite(quantity) ||
    quantity <= 0
  );
}

function formatRequiredRecordValue(value: unknown) {
  return isMissingRecordValue(value) ? '⚠ Missing' : String(value);
}

function formatRecordUnit(value: unknown) {
  const normalized = normalizeUnitForDisplay(value as string | number | null);

  if (normalized.status === 'missing') return 'Missing unit';
  if (normalized.status === 'invalid') return 'Invalid unit';

  return normalized.value;
}

function formatActivitySourceType(sourceType?: string | null) {
  switch (sourceType) {
    case 'DOCUMENT_AI':
    case 'AI_EXTRACTION':
      return 'Document';
    case 'MANUAL':
      return 'Manual Entry';
    default:
      return sourceType || '-';
  }
}

function formatActivitySourceReference(row: ActivityDataItem) {
  if (row.sourceType === 'MANUAL') return 'Manual Entry';

  const parts = [
    row.sourceFileName,
    row.sourceReference,
    row.sourcePage ? `Page ${row.sourcePage}` : '',
    row.sourceRow ? `Line item ${row.sourceRow}` : '',
  ].filter((part) => !isMissingRecordValue(part));

  return parts.length ? parts.join(' · ') : 'Source unavailable';
}
  async function handleBulkDelete() {
  if (!selectedIds.length) return;

  if (!confirm(`Delete ${selectedIds.length} selected record(s)?`)) return;

  const idsToDelete = [...selectedIds];
  setBulkDeleting(true);
  setError(null);
  setSuccessMessage(null);

  try {
    const result = await bulkDeleteActivityData(idsToDelete);
    const deletedCount = getDeletedCount(result);

    if (deletedCount <= 0) {
      setError('No records were deleted. Activity records were refreshed.');
      await loadItems();
      return;
    }

    removeDeletedRows(idsToDelete);
    setSelectedIds([]);
    setSuccessMessage(formatDeletedMessage(deletedCount));
    window.sessionStorage.setItem('carbonliteMetricsStale', 'true');
    window.dispatchEvent(new Event('carbonlite:metrics-stale'));

    const refreshedItems = await loadItems({ updateState: false });
    reconcileDeletedRowsAfterReload(refreshedItems, idsToDelete);
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : 'Unable to delete selected records. Please try again.',
    );
  } finally {
    setBulkDeleting(false);
  }
}
function startEdit(row: any) {
  setOpenActionMenuId(null);
  setEditingId(row.id);
  setEditRow({
    ...row,
    recordDate: row.recordDate?.slice(0, 10),
  });
}
async function saveEdit() {
  const errors = validateEditRow(editRow);

  if (Object.keys(errors).length > 0) {
    setEditErrors(errors);
    return;
  }

  try {
    await updateActivityData(editingId!, {
      activityType: editRow.activityType,
      recordDate: editRow.recordDate,
      quantity: Number(editRow.quantity),
      unit: editRow.unit,
      sourceType: editRow.sourceType,
      sourceReference: editRow.sourceReference ?? '',
      notes: editRow.notes ?? '',
      facilityId: editRow.facilityId ?? '',
      assetId: editRow.assetId ?? '',
      documentId: editRow.documentId ?? '',
      customTypeLabel: editRow.customTypeLabel ?? '',
      periodStart: editRow.periodStart ?? '',
      periodEnd: editRow.periodEnd ?? '',
    });

    setEditingId(null);
    setEditRow({});
    setEditErrors({});
    await loadItems();
    setSuccessMessage('Activity record updated.');
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Update failed');
  }
}
function validateEditRow(row: any) {
  const errors: Record<string, string> = {};

  if (isMissingRecordValue(row.activityType)) errors.activityType = 'Required';
  if (isMissingRecordValue(row.recordDate)) errors.recordDate = 'Required';

  if (isMissingRecordValue(row.quantity)) {
    errors.quantity = 'Required';
  } else if (Number(row.quantity) <= 0) {
    errors.quantity = 'Must be greater than 0';
  }

  if (isMissingRecordValue(row.unit)) {
    errors.unit = 'Required';
  } else if (normalizeUnitForDisplay(row.unit).status === 'invalid') {
    errors.unit = 'Invalid unit';
  }

  return errors;
}
async function handleDelete(row: ActivityDataItem) {
  setOpenActionMenuId(null);
  if (!confirm('Delete this record?')) return;

  setError(null);
  setSuccessMessage(null);

  try {
    const result = await deleteActivityData(row.id);
    const deletedCount = getDeletedCount(result);

    if (deletedCount <= 0) {
      setError('No records were deleted. Activity records were refreshed.');
      await loadItems();
      return;
    }

    removeDeletedRows([row.id]);
    setLastDeleted(row);
    setSelectedIds((prev) => prev.filter((id) => id !== row.id));
    setSuccessMessage(formatDeletedMessage(deletedCount));
    window.sessionStorage.setItem('carbonliteMetricsStale', 'true');
    window.dispatchEvent(new Event('carbonlite:metrics-stale'));

    const refreshedItems = await loadItems({ updateState: false });
    reconcileDeletedRowsAfterReload(refreshedItems, [row.id]);
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : 'Unable to delete selected records. Please try again.',
    );
  }
}
function updateEditField(key: string, value: any) {
  setEditRow((prev: any) => ({
    ...prev,
    [key]: value,
  }));

  setEditErrors((prev) => {
    const next = { ...prev };
    delete next[key];
    return next;
  });
}

async function handleUndoDelete() {
  if (!lastDeleted) return;

  try {
    await createActivityData({
      activityType: lastDeleted.activityType,
      recordDate: lastDeleted.recordDate?.slice(0, 10),
      quantity: Number(lastDeleted.quantity),
      unit: lastDeleted.unit,
      sourceType: lastDeleted.sourceType,
      sourceReference: lastDeleted.sourceReference ?? '',
      notes: lastDeleted.notes ?? '',
    });

    setLastDeleted(null);
    await loadItems();
  } catch {
    alert('Undo failed');
  }
}

function getEditInputStyle(field: string): React.CSSProperties {
  return {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 8,
    border: editErrors[field] ? '1px solid #dc2626' : '1px solid #cbd5e1',
    background: editErrors[field] ? '#fff1f2' : '#fff',
  };
}
function renderNormalRow(row){
  const isIncomplete = isActivityRecordIncomplete(row);

  return (
    <tr
      key={row.id}
      data-testid={`activity-row-${row.id}`}
      style={highlightedRecordId === row.id ? highlightedRecordRowStyle : undefined}
    >
      <td style={tdStyle}>
  <input
    type="checkbox"
    checked={selectedIds.includes(row.id)}
    onChange={(e) => toggleSelect(row.id, e.target.checked)}
  />
</td>
      {visibleColumns.status ? (
      <td style={tdStyle}>
        <span
          style={recordStatusBadgeStyle(isIncomplete)}
          title={
            isIncomplete
              ? 'This record requires additional information before calculations can be performed.'
              : 'This record is complete.'
          }
        >
          {isIncomplete ? 'Incomplete' : 'Complete'}
        </span>
      </td>
      ) : null}
      {visibleColumns.date ? <td style={dateCellStyle}>{formatRequiredRecordValue(row.recordDate?.slice(0, 10))}</td> : null}
      {visibleColumns.type ? <td style={tdStyle}>{formatRequiredRecordValue(row.activityType)}</td> : null}
      {visibleColumns.quantity ? <td style={tdStyle}>{formatRequiredRecordValue(row.quantity)}</td> : null}
      {visibleColumns.unit ? <td style={unitCellStyle}>{formatRecordUnit(row.unit)}</td> : null}
      {visibleColumns.source ? <td style={tdStyle}>{formatActivitySourceType(row.sourceType)}</td> : null}
      {visibleColumns.sourceReference ? (
      <td style={sourceReferenceCellStyle} title={formatActivitySourceReference(row)}>
        {formatActivitySourceReference(row)}
      </td>
      ) : null}
      <td style={actionsCellStyle}>
        <div style={rowActionStyle}>
          <button
            onClick={() => handleViewCalculation(row.id)}
            disabled={isIncomplete}
            title={
              isIncomplete
                ? 'This record requires additional information before calculations can be performed.'
                : undefined
            }
            style={secondaryActionBtnStyle(isIncomplete)}
          >
            View
          </button>
          <div style={overflowMenuWrapperStyle}>
            <button
              type="button"
              data-activity-action-menu-button="true"
              aria-label={`More actions for ${row.activityType} ${row.recordDate?.slice(0, 10) ?? ''}`}
              aria-haspopup="menu"
              aria-expanded={openActionMenuId === row.id}
              onClick={(event) => toggleActionMenu(row.id, event.currentTarget)}
              style={overflowButtonStyle}
            >
              ⋮
            </button>
          </div>
        </div>
      </td>
    </tr>
  )
}
function renderEditRow(row){
  return (
    <tr key={row.id}>
      <td style={tdStyle}>
        <input
          type="checkbox"
          checked={selectedIds.includes(row.id)}
          onChange={(e) => toggleSelect(row.id, e.target.checked)}
        />
      </td>

      {visibleColumns.status ? (
      <td style={tdStyle}>
        <span style={recordStatusBadgeStyle(false)}>Editing</span>
      </td>
      ) : null}

      {visibleColumns.date ? (
      <td style={tdStyle}>
        <input
          type="date"
          value={editRow.recordDate ?? ''}
          onChange={(e) => updateEditField('recordDate', e.target.value)}
          style={getEditInputStyle('recordDate')}
        />
        {editErrors.recordDate && (
          <div style={errorTextStyle}>{editErrors.recordDate}</div>
        )}
      </td>
      ) : null}

      {visibleColumns.type ? (
      <td style={tdStyle}>
        <select
          value={editRow.activityType ?? ''}
          onChange={(e) => updateEditField('activityType', e.target.value)}
          style={getEditInputStyle('activityType')}
        >
          {activityTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        {editErrors.activityType && (
          <div style={errorTextStyle}>{editErrors.activityType}</div>
        )}
      </td>
      ) : null}

      {visibleColumns.quantity ? (
      <td style={tdStyle}>
        <input
          type="number"
          value={editRow.quantity ?? ''}
          onChange={(e) => updateEditField('quantity', e.target.value)}
          style={getEditInputStyle('quantity')}
        />
        {editErrors.quantity && (
          <div style={errorTextStyle}>{editErrors.quantity}</div>
        )}
      </td>
      ) : null}

      {visibleColumns.unit ? (
      <td style={tdStyle}>
        <input
          value={editRow.unit ?? ''}
          onChange={(e) => updateEditField('unit', e.target.value)}
          style={getEditInputStyle('unit')}
        />
        {editErrors.unit && (
          <div style={errorTextStyle}>{editErrors.unit}</div>
        )}
      </td>
      ) : null}

      {visibleColumns.source ? (
      <td style={tdStyle}>
        <select
          value={editRow.sourceType ?? 'MANUAL'}
          onChange={(e) => updateEditField('sourceType', e.target.value)}
          style={getEditInputStyle('sourceType')}
        >
          <option value="MANUAL">Manual</option>
          <option value="IMPORT">Import</option>
          <option value="DOCUMENT_AI">AI</option>
          <option value="AI_EXTRACTION">AI Extraction</option>
        </select>
      </td>
      ) : null}

      {visibleColumns.sourceReference ? (
      <td style={tdStyle}>
        <input
          value={editRow.sourceReference ?? ''}
          onChange={(e) => updateEditField('sourceReference', e.target.value)}
          style={getEditInputStyle('sourceReference')}
          placeholder="Source reference"
        />
      </td>
      ) : null}

      <td style={tdStyle}>
        <div style={editRowActionStyle}>
          <button onClick={saveEdit} style={primaryActionBtn}>
            Save
          </button>
          <button onClick={cancelEdit} style={secondaryActionBtn}>
            Cancel
          </button>
        </div>
      </td>
    </tr>
  )
}
function cancelEdit() {
  setEditingId(null);
  setEditRow({});
  setEditErrors({});
}
const errorTextStyle: React.CSSProperties = {
  marginTop: 4,
  color: '#dc2626',
  fontSize: 12,
};
  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {/* ⭐ 标题区 */}
      <h1 style={{ marginBottom: 8 }}>Activity Data</h1>

      <p style={{ color: '#666', marginBottom: 24 }}>
        Manage and review extracted or manually entered activity records.
      </p>
      {/* ⭐ Summary 卡片 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <Card title="Total Activity Records" value={items.length} icon="📄" />
        <Card title="Manual Entries" value={items.filter(i => i.sourceType === 'MANUAL').length} icon="✍️" />
        <Card title="Imported" value={items.filter(i => i.sourceType !== 'MANUAL').length} icon="📥" />
      </div>

      {/* 状态 */}
      {error && <div style={warningStyle}>{error}</div>}
      {successMessage && <div style={successStyle}>{successMessage}</div>}
      <div style={quickEntryIntroStyle}>
        <div>
          <h2 style={{ margin: 0 }}>Quick Entry</h2>
          <p style={{ margin: '6px 0 0', color: '#64748b' }}>
            Enter manually, paste from Excel, or import CSV/XLSX files.
          </p>
        </div>
      </div>
          <ExcelInputTable
  onSuccess={() => {
    setReloadKey((k) => k + 1);
       //loadDocuments();
       loadItems();
    window.sessionStorage.setItem('carbonliteMetricsStale', 'true');
    window.dispatchEvent(new Event('carbonlite:metrics-stale'));
    setSuccessMessage('Activity data saved. You can now review Metrics or Reports.');
  }}
/>
{lastDeleted && (
  <div style={undoBarStyle}>
    <span>
      Deleted record: {lastDeleted.activityType} {lastDeleted.quantity}{' '}
      {lastDeleted.unit}
    </span>

    <button type="button" onClick={handleUndoDelete} style={undoButtonStyle}>
      Undo
    </button>

    <button
      type="button"
      onClick={() => setLastDeleted(null)}
      style={dismissButtonStyle}
    >
      Dismiss
    </button>
  </div>
)}
      {/* ⭐ Table */}
      <div style={tableCard}>
       <div style={tableHeaderRowStyle}>
  <h2 style={{ margin: 0 }}>Activity Records</h2>

  <div style={tableToolbarStyle}>
    <div ref={columnMenuRef} style={columnMenuWrapperStyle}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isColumnMenuOpen}
        aria-controls="activity-column-menu"
        onClick={() => {
          setIsColumnMenuOpen((current) => !current);
        }}
        style={secondaryActionBtn}
      >
        Columns
      </button>
      {isColumnMenuOpen ? (
        <div
          id="activity-column-menu"
          role="menu"
          aria-label="Activity table columns"
          style={columnMenuStyle}
        >
          {ACTIVITY_TABLE_COLUMNS.map((column) => (
            <label
              key={column.key}
              role="menuitemcheckbox"
              aria-checked={visibleColumns[column.key]}
              style={columnMenuItemStyle}
            >
              <input
                type="checkbox"
                checked={visibleColumns[column.key]}
                onChange={() => toggleColumn(column.key)}
              />
              <span>{column.label}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>

    <button
      type="button"
      onClick={handleGenerateReportFromSelection}
      disabled={!selectedIds.length}
      style={generateReportButtonStyle(selectedIds.length)}
    >
      Generate Report from Selected Records
    </button>

    <button
      type="button"
      onClick={handleBulkDelete}
      disabled={!selectedIds.length || bulkDeleting}
      style={bulkDeleteButtonStyle(selectedIds.length, bulkDeleting)}
    >
      {bulkDeleting
        ? 'Deleting...'
        : selectedIds.length
        ? `Delete Selected (${selectedIds.length})`
        : 'Delete Selected'}
    </button>
  </div>
</div>

        {recordFilterId || documentFilterId ? (
          <div style={documentFilterBannerStyle}>
            <div>
              <div style={{ fontSize: 12, color: '#047857', fontWeight: 700 }}>
                {recordFilterId ? 'Showing 1 record requiring attention.' : 'Showing records from:'}
              </div>
              {!recordFilterId ? (
                <div style={{ marginTop: 3, color: '#0f172a', fontWeight: 700 }}>
                  {documentFilterName}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={clearActivityRecordFilters}
              style={clearFilterButtonStyle}
            >
              Clear Filter
            </button>
          </div>
        ) : null}

        {loading ? (
          <p>Loading...</p>
        ) : filteredItems.length === 0 ? (
          <div style={emptyStateStyle}>
            {recordFilterId
              ? 'The requested record could not be found.'
              : documentFilterId
              ? 'No records have been imported from this document.'
              : 'No activity records yet. Import extracted rows from Upload or load sample data to review an example workflow.'}
          </div>
        ) : (
          <>
            {tableHasOverflow ? (
              <div style={scrollHintStyle}>Scroll horizontally →</div>
            ) : null}
            <div ref={tableScrollRef} style={tableScrollContainerStyle}>
            <table style={activityRecordsTableStyle}>
              <thead>
                <tr>
                  <th style={checkboxThStyle}>
                    <input
                      type="checkbox"
                      checked={
                        paginatedItems.length > 0 &&
                        paginatedItems.every((item) => selectedIds.includes(item.id))
                      }
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                    />
                  </th>
                  {visibleColumns.status ? <th style={statusThStyle}>Status</th> : null}
                  {visibleColumns.date ? <th style={dateThStyle}>Date</th> : null}
                  {visibleColumns.type ? <th style={typeThStyle}>Type</th> : null}
                  {visibleColumns.quantity ? <th style={quantityThStyle}>Quantity</th> : null}
                  {visibleColumns.unit ? <th style={unitThStyle}>Unit</th> : null}
                  {visibleColumns.source ? <th style={sourceThStyle}>Source</th> : null}
                  {visibleColumns.sourceReference ? <th style={sourceReferenceThStyle}>Source Reference</th> : null}
                  <th style={actionsThStyle}></th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((row) => (
                  editingId === row.id ? renderEditRow(row) : renderNormalRow(row)
                ))}
              </tbody>
            </table>
            {/* {tableHasOverflow ? <div aria-hidden="true" style={tableFadeStyle} /> : null} */}
            </div>

            <div style={paginationStyle}>
              <span>
                Showing {(currentPage - 1) * PAGE_SIZE + 1}-
                {Math.min(currentPage * PAGE_SIZE, filteredItems.length)} of {filteredItems.length}
              </span>
              <div style={paginationActionsStyle}>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  style={paginationButtonStyle(currentPage === 1)}
                >
                  Previous
                </button>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  style={paginationButtonStyle(currentPage === totalPages)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      {renderActionMenuPortal()}
    </div>
  );
}

function Card({ title, value, icon }: any) {
  return (
    <div style={card}>
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div style={{ color: '#666' }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

/* ⭐ Styles */

const card = {
  padding: 16,
  borderRadius: 12,
  background: '#fff',
  border: '1px solid #eee',
};

const tableCard = {
  padding: 20,
  borderRadius: 12,
  border: '1px solid #ddd',
  background: '#fff',
  overflow: 'visible',
};

const tableHeaderRowStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 20,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 16,
  flexWrap: 'wrap',
  marginBottom: 4,
};

const quickEntryIntroStyle: React.CSSProperties = {
  marginBottom: 12,
  padding: '16px 18px',
  borderRadius: 12,
  border: '1px solid #bbf7d0',
  background: '#f0fdf4',
  color: '#0f172a',
};

const rowActionStyle = {
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  flexWrap: 'nowrap' as const,
  whiteSpace: 'nowrap' as const,
};

const editRowActionStyle = {
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  flexWrap: 'nowrap' as const,
  minWidth: 150,
};

const tableToolbarStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 20,
  display: 'flex',
  gap: 10,
  alignItems: 'center',
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
  marginLeft: 'auto',
};

const columnMenuWrapperStyle: React.CSSProperties = {
  position: 'relative',
  display: 'inline-flex',
  zIndex: 40,
};

const columnMenuStyle: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 8px)',
  right: 0,
  zIndex: 1000,
  minWidth: 210,
  padding: 8,
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  background: '#fff',
  boxShadow: '0 20px 42px rgba(15, 23, 42, 0.18)',
};

const columnMenuItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 10px',
  borderRadius: 8,
  color: '#0f172a',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const tableScrollContainerStyle: React.CSSProperties = {
  marginTop: 16,
  overflowX: 'auto',
  width: '100%',
  borderRadius: 10,
  position: 'relative',
  zIndex: 1,
};

const activityRecordsTableStyle: React.CSSProperties = {
  width: '100%',
  minWidth: 1040,
  borderCollapse: 'collapse',
  tableLayout: 'fixed',
};

const scrollHintStyle: React.CSSProperties = {
  marginTop: 12,
  color: '#94a3b8',
  fontSize: 12,
  fontWeight: 600,
  textAlign: 'right',
  cursor: 'default',
  userSelect: 'none',
};

const tableFadeStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  right: 0,
  width: 28,
  height: '100%',
  pointerEvents: 'none',
  zIndex: 1,
  background: 'linear-gradient(90deg, rgba(255,255,255,0), #fff)',
};

const documentFilterBannerStyle: React.CSSProperties = {
  marginTop: 14,
  marginBottom: 2,
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid #bbf7d0',
  background: '#f0fdf4',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  flexWrap: 'wrap',
};

const clearFilterButtonStyle: React.CSSProperties = {
  padding: '7px 10px',
  borderRadius: 8,
  border: '1px solid #86efac',
  background: '#fff',
  color: '#047857',
  fontWeight: 700,
  cursor: 'pointer',
};

const primaryActionBtn = {
  padding: '8px 14px',
  borderRadius: 8,
  border: 'none',
  background: '#10b981',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
};

const secondaryActionBtn = {
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  background: '#fff',
  color: '#111827',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
};

function secondaryActionBtnStyle(disabled = false): React.CSSProperties {
  return {
    ...secondaryActionBtn,
    background: disabled ? '#f8fafc' : '#fff',
    color: disabled ? '#94a3b8' : '#111827',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

const dangerActionBtn = {
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px solid #fca5a5',
  background: '#fff1f2',
  color: '#be123c',
  fontWeight: 600,
  cursor: 'pointer',
};

function bulkDeleteButtonStyle(
  selectedCount: number,
  deleting = false,
): React.CSSProperties {
  const hasSelection = selectedCount > 0 && !deleting;

  return {
    padding: '8px 12px',
    borderRadius: 8,
    border: hasSelection ? '1px solid #dc2626' : '1px solid #d1d5db',
    background: hasSelection ? '#dc2626' : '#f3f4f6',
    color: hasSelection ? '#fff' : '#6b7280',
    cursor: hasSelection ? 'pointer' : 'not-allowed',
    fontWeight: 700,
  };
}

function generateReportButtonStyle(selectedCount: number): React.CSSProperties {
  const hasSelection = selectedCount > 0;

  return {
    padding: '8px 12px',
    borderRadius: 8,
    border: hasSelection ? '1px solid #10b981' : '1px solid #d1d5db',
    background: hasSelection ? '#10b981' : '#f3f4f6',
    color: hasSelection ? '#fff' : '#6b7280',
    cursor: hasSelection ? 'pointer' : 'not-allowed',
    fontWeight: 700,
  };
}

const thStyle = {
  textAlign: 'left' as const,
  padding: '8px 10px',
  background: '#f8fafc',
  color: '#475569',
  fontSize: 12,
  fontWeight: 700,
  borderBottom: '1px solid #e5e7eb',
};

const checkboxThStyle: React.CSSProperties = {
  ...thStyle,
  width: 44,
};

const statusThStyle: React.CSSProperties = {
  ...thStyle,
  width: 116,
};

const dateThStyle: React.CSSProperties = {
  ...thStyle,
  width: 112,
};

const typeThStyle: React.CSSProperties = {
  ...thStyle,
  width: 150,
};

const quantityThStyle: React.CSSProperties = {
  ...thStyle,
  width: 96,
};

const unitThStyle: React.CSSProperties = {
  ...thStyle,
  width: 120,
};

const sourceThStyle: React.CSSProperties = {
  ...thStyle,
  width: 120,
};

const sourceReferenceThStyle: React.CSSProperties = {
  ...thStyle,
  width: 280,
};

const actionsThStyle: React.CSSProperties = {
  ...thStyle,
  width: 118,
  position: 'sticky',
  right: 0,
  zIndex: 3,
  background: '#f8fafc',
  boxShadow: '-8px 0 12px rgba(248, 250, 252, 0.9)',
};

const tdStyle = {
  padding: '7px 10px',
  borderBottom: '1px solid #f1f5f9',
  verticalAlign: 'middle' as const,
  fontSize: 13,
  lineHeight: 1.25,
};

const dateCellStyle: React.CSSProperties = {
  ...tdStyle,
  whiteSpace: 'nowrap',
};

const unitCellStyle: React.CSSProperties = {
  ...tdStyle,
  whiteSpace: 'nowrap',
};

const sourceReferenceCellStyle: React.CSSProperties = {
  ...tdStyle,
  maxWidth: 260,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: '#475569',
};

const highlightedRecordRowStyle: React.CSSProperties = {
  background: '#ecfdf5',
  boxShadow: 'inset 4px 0 0 #10b981',
  transition: 'background 0.2s ease, box-shadow 0.2s ease',
};

function recordStatusBadgeStyle(incomplete: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: 999,
    padding: '3px 8px',
    fontSize: 12,
    fontWeight: 700,
    color: incomplete ? '#b45309' : '#047857',
    background: incomplete ? '#fef3c7' : '#d1fae5',
    whiteSpace: 'nowrap',
  };
}

const actionsCellStyle: React.CSSProperties = {
  ...tdStyle,
  width: 112,
  position: 'sticky',
  right: 0,
  zIndex: 2,
  background: '#fff',
  whiteSpace: 'nowrap',
  boxShadow: '-8px 0 12px rgba(255, 255, 255, 0.92)',
};

const overflowMenuWrapperStyle: React.CSSProperties = {
  position: 'relative',
  display: 'inline-flex',
};

const overflowButtonStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#0f172a',
  fontWeight: 800,
  cursor: 'pointer',
};

const overflowMenuStyle: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 6px)',
  right: 0,
  zIndex: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  minWidth: 96,
  padding: 6,
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  background: '#fff',
  boxShadow: '0 14px 30px rgba(15, 23, 42, 0.14)',
};

const menuItemStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  padding: '8px 10px',
  border: 'none',
  borderRadius: 8,
  background: '#fff',
  color: '#0f172a',
  textAlign: 'left',
  fontWeight: 600,
  cursor: 'pointer',
};

const menuItemDangerStyle: React.CSSProperties = {
  ...menuItemStyle,
  color: '#b91c1c',
};

const paginationStyle: React.CSSProperties = {
  marginTop: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  flexWrap: 'wrap',
  color: '#475569',
  fontSize: 14,
};

const paginationActionsStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
};

function paginationButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    background: disabled ? '#f8fafc' : '#fff',
    color: disabled ? '#94a3b8' : '#0f172a',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

const undoBarStyle: React.CSSProperties = {
  marginBottom: 12,
  padding: '12px 14px',
  borderRadius: 10,
  background: '#fefce8',
  border: '1px solid #fde68a',
  color: '#854d0e',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
};

const undoButtonStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid #ca8a04',
  background: '#fff',
  color: '#854d0e',
  fontWeight: 700,
  cursor: 'pointer',
};

const dismissButtonStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  background: '#fff',
  color: '#374151',
  cursor: 'pointer',
};

const warningStyle: React.CSSProperties = {
  marginBottom: 12,
  padding: 12,
  borderRadius: 10,
  border: '1px solid #fed7aa',
  background: '#fff7ed',
  color: '#9a3412',
};

const successStyle: React.CSSProperties = {
  marginBottom: 12,
  padding: 12,
  borderRadius: 10,
  border: '1px solid #bbf7d0',
  background: '#f0fdf4',
  color: '#166534',
};

const emptyStateStyle: React.CSSProperties = {
  marginTop: 16,
  padding: 18,
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
  color: '#475569',
};
