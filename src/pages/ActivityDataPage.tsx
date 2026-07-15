import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  createActivityData,
  getAllActivityData,
  updateActivityData,
  deleteActivityData,
  bulkDeleteActivityData,
  clearActivityRecordsForCurrentCompany,
  type ClearActivityRecordsResponse,
  type DeleteActivityDataResponse,
} from '../services/activityData';
import { getCurrentUser, isAdminOrOwnerUser } from '../services/auth';
import { EditRecordPanel } from '../components/data-records/EditRecordPanel';
import { StatusBadge } from '../components/shared/StatusBadge';
import { BulkProvinceToolbar } from '../components/shared/BulkProvinceToolbar';
import {
  activityTypes,
} from '../constants/activityTypes';
import {
  CANADIAN_PROVINCE_OPTIONS,
  ELECTRICITY_FACTOR_PROVINCE_OPTIONS,
  normalizeProvince as normalizeCanadianProvince,
} from '../utils/province';
import { normalizeUnitForDisplay } from '../utils/unitNormalization';

const PAGE_SIZE = 15;
const CLEAR_ACTIVITY_RECORDS_CONFIRMATION = 'CLEAR RECORDS';

const ACTIVITY_TABLE_COLUMNS = [
  { key: 'status', label: 'Status' },
  { key: 'date', label: 'Date' },
  { key: 'type', label: 'Type' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'unit', label: 'Unit' },
  { key: 'country', label: 'Country' },
  { key: 'province', label: 'Province' },
  { key: 'facility', label: 'Facility' },
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
  jurisdictionCountry?: string | null;
  jurisdictionRegion?: string | null;
  facilityId?: string | null;
  recordYear?: number | null;
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
  const [recordLoadError, setRecordLoadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

const [editingId, setEditingId] = useState<string | null>(null);
const [editRow, setEditRow] = useState<any>({});
const [editErrors, setEditErrors] = useState<Record<string, string>>({});
const [lastDeleted, setLastDeleted] = useState<ActivityDataItem | null>(null);
const [selectedIds, setSelectedIds] = useState<string[]>([]);
const [currentPage, setCurrentPage] = useState(1);
const [bulkDeleting, setBulkDeleting] = useState(false);
const [bulkProvince, setBulkProvince] = useState('');
const [bulkApplyingProvince, setBulkApplyingProvince] = useState(false);
const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
const [actionMenuPosition, setActionMenuPosition] = useState<{ top: number; left: number } | null>(null);
const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
const [qualityFilter, setQualityFilter] = useState('all');
const [viewedRecord, setViewedRecord] = useState<ActivityDataItem | null>(null);
const [isClearRecordsModalOpen, setIsClearRecordsModalOpen] = useState(false);
const [clearRecordsConfirmation, setClearRecordsConfirmation] = useState('');
const [isClearingRecords, setIsClearingRecords] = useState(false);
const [visibleColumns, setVisibleColumns] = useState<Record<ActivityTableColumnKey, boolean>>({
  status: true,
  date: true,
  type: true,
  quantity: true,
  unit: true,
  country: true,
  province: true,
  facility: true,
  source: true,
  sourceReference: true,
});
const tableScrollRef = useRef<HTMLDivElement | null>(null);
const columnMenuRef = useRef<HTMLDivElement | null>(null);
const actionMenuRef = useRef<HTMLDivElement | null>(null);
const actionMenuButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
const documentFilterId = searchParams.get('documentId');
const recordFilterId = searchParams.get('recordId');
const sourceDocumentNameFromState =
  (location.state as { sourceDocumentName?: string } | null)?.sourceDocumentName;
const scopeFilteredItems = recordFilterId
  ? items.filter((item) => item.id === recordFilterId)
  : documentFilterId
  ? items.filter((item) => {
      const recordDocumentId = item.sourceDocumentId ?? item.documentId;
      return recordDocumentId === documentFilterId;
    })
  : items;
const filteredItems = scopeFilteredItems.filter((item) =>
  qualityFilter === 'all' ? true : getActivityRecordQuality(item).filterKey === qualityFilter,
);
const documentFilterName =
  sourceDocumentNameFromState ??
  scopeFilteredItems.find((item) => item.sourceFileName)?.sourceFileName ??
  documentFilterId;
const selectedMissingProvinceElectricityRows = items.filter(
  (item) =>
    selectedIds.includes(item.id) &&
    String(item.activityType ?? '').toUpperCase() === 'ELECTRICITY' &&
    isMissingRecordValue(item.jurisdictionRegion),
);
const canClearActivityRecords = isAdminOrOwnerUser(getCurrentUser());
const [highlightedRecordId, setHighlightedRecordId] = useState<string | null>(null);
  async function loadItems(options: { updateState?: boolean } = {}) {
    const { updateState = true } = options;
    setLoading(true);
    setRecordLoadError(null);
    try {
      const nextItems = (await getAllActivityData()) as ActivityDataItem[];

      if (updateState) {
        setItems(nextItems);
      }

      setRecordLoadError(null);
      return nextItems;
    } catch {
      const message = 'Unable to load activity records. Please try again.';
      setRecordLoadError(message);
      setError(message);
      return items;
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

  function formatClearRecordsSuccess(summary: ClearActivityRecordsResponse) {
    return [
      `${summary.deletedActivityRecords} activity record${summary.deletedActivityRecords === 1 ? '' : 's'}`,
      `${summary.deletedCalculationDetails} calculated result${summary.deletedCalculationDetails === 1 ? '' : 's'}`,
      `${summary.deletedImportBatches} import batch${summary.deletedImportBatches === 1 ? '' : 'es'}`,
      `${summary.resetReports} report draft${summary.resetReports === 1 ? '' : 's'} reset`,
    ].join(', ') + '.';
  }

  useEffect(() => {
    loadItems();
  }, []);

  const isInitialRecordsLoading = loading && items.length === 0 && !recordLoadError;
  const isRefreshingRecords = loading && items.length > 0;

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
    if (!viewedRecord) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setViewedRecord(null);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewedRecord]);

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

    function isInsideActiveActionMenu(target: Node | null) {
      const activeButton = actionMenuButtonRefs.current[openActionMenuId];

      return Boolean(
        target &&
          (actionMenuRef.current?.contains(target) || activeButton?.contains(target)),
      );
    }

    function handleDocumentPointerDown(event: PointerEvent) {
      if (isInsideActiveActionMenu(event.target as Node | null)) return;
      closeActionMenu();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeActionMenu();
      }
    }

    function handleFocusIn(event: FocusEvent) {
      if (isInsideActiveActionMenu(event.target as Node | null)) return;
      closeActionMenu();
    }

    const tableScrollContainer = tableScrollRef.current;

    document.addEventListener('pointerdown', handleDocumentPointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocusIn);
    window.addEventListener('scroll', closeActionMenu, true);
    tableScrollContainer?.addEventListener('scroll', closeActionMenu);

    return () => {
      document.removeEventListener('pointerdown', handleDocumentPointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('scroll', closeActionMenu, true);
      tableScrollContainer?.removeEventListener('scroll', closeActionMenu);
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

function normalizeProvinceValue(value?: string | null) {
  return normalizeCanadianProvince(value) ?? '';
}

function getProvinceOptions(value?: string | null) {
  const normalized = normalizeProvinceValue(value);
  return Array.from(new Set([normalized, ...CANADIAN_PROVINCE_OPTIONS].filter(Boolean)));
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
        zIndex: 900,
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

function handleViewRecord(row: ActivityDataItem) {
  setViewedRecord(row);
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

function getActivityRecordQuality(row: ActivityDataItem) {
  const normalizedUnit = normalizeUnitForDisplay(row.unit);
  const notes = String(row.notes ?? '').toLowerCase();
  const activityType = String(row.activityType ?? '').toUpperCase();
  const missingRequired =
    isMissingRecordValue(row.activityType) ||
    isMissingRecordValue(row.recordDate) ||
    isMissingRecordValue(row.quantity) ||
    isMissingRecordValue(row.unit) ||
    Number(row.quantity) <= 0;
  const missingSource =
    row.sourceType !== 'MANUAL' &&
    !row.sourceDocumentId &&
    !row.documentId &&
    !row.sourceFileName &&
    !row.sourceReference;

  if (activityType === 'ELECTRICITY' && isMissingRecordValue(row.jurisdictionRegion)) {
    return {
      label: 'Missing Province',
      filterKey: 'missing-jurisdiction',
      tone: 'warning' as const,
      title: 'Electricity emissions require a province-specific factor. Please select the province where the electricity was used.',
    };
  }

  if (normalizedUnit.status === 'invalid' || notes.includes('invalid unit')) {
    return {
      label: 'Invalid Unit',
      filterKey: 'invalid-unit',
      tone: 'warning' as const,
      title: 'Invalid unit. Please review this record before calculation.',
    };
  }

  if (missingRequired || normalizedUnit.status === 'missing') {
    return {
      label: 'Requires Review',
      filterKey: 'requires-review',
      tone: 'warning' as const,
      title: 'This record requires required fields before calculations can be performed.',
    };
  }

  if (activityType === 'WATER' || notes.includes('tracked metric')) {
    return {
      label: 'Tracked Metric',
      filterKey: 'tracked-metric',
      tone: 'info' as const,
      title: 'This record is tracked for operational insight and excluded from emissions totals by default.',
    };
  }

  if (notes.includes('missing factor') || notes.includes('no conversion factor')) {
    return {
      label: 'Missing Factor',
      filterKey: 'missing-factor',
      tone: 'warning' as const,
      title: 'No matching conversion factor is available yet.',
    };
  }

  if (missingSource) {
    return {
      label: 'Missing Source',
      filterKey: 'missing-source',
      tone: 'neutral' as const,
      title: 'Add a source reference to improve traceability.',
    };
  }

  return {
    label: 'Ready',
    filterKey: 'ready',
    tone: 'success' as const,
    title: 'This record has the required fields for calculation review.',
  };
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

function formatOptionalRecordValue(value: unknown) {
  return isMissingRecordValue(value) ? '-' : String(value);
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

async function handleBulkApplyProvince() {
  const normalizedProvince = normalizeProvinceValue(bulkProvince);
  const rowsToUpdate = selectedMissingProvinceElectricityRows;

  if (!normalizedProvince || rowsToUpdate.length === 0) return;

  setBulkApplyingProvince(true);
  setError(null);
  setSuccessMessage(null);

  try {
    await Promise.all(
      rowsToUpdate.map((row) => {
        const quantity = Number(row.quantity);

        return updateActivityData(row.id, {
          activityType: row.activityType ?? 'ELECTRICITY',
          recordDate: row.recordDate?.slice(0, 10) ?? null,
          quantity: Number.isFinite(quantity) ? quantity : 0,
          unit: row.unit ?? '',
          jurisdictionCountry: row.jurisdictionCountry || 'Canada',
          jurisdictionRegion: normalizedProvince,
          recordYear: row.recordYear ?? undefined,
          sourceType: row.sourceType || 'MANUAL',
          sourceReference: row.sourceReference ?? '',
          notes: row.notes ?? '',
          facilityId: row.facilityId ?? '',
          documentId: row.documentId ?? '',
          sourceDocumentId: row.sourceDocumentId ?? '',
          sourceFileName: row.sourceFileName ?? '',
          sourcePage: row.sourcePage ?? undefined,
          sourceRow: row.sourceRow ?? undefined,
        });
      }),
    );

    await loadItems();
    setSuccessMessage('Province applied to selected electricity records.');
    window.sessionStorage.setItem('carbonliteMetricsStale', 'true');
    window.dispatchEvent(new Event('carbonlite:metrics-stale'));
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : 'Unable to apply province to selected electricity records.',
    );
  } finally {
    setBulkApplyingProvince(false);
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
      jurisdictionCountry: editRow.jurisdictionCountry ?? '',
      jurisdictionRegion: editRow.jurisdictionRegion ?? '',
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

function renderNormalRow(row){
  const quality = getActivityRecordQuality(row);

  return (
    <tr
      key={row.id}
      data-testid={`activity-row-${row.id}`}
      style={
        editingId === row.id || highlightedRecordId === row.id
          ? highlightedRecordRowStyle
          : undefined
      }
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
        <StatusBadge
          status={quality.label}
          label={quality.label}
          title={quality.title}
        />
      </td>
      ) : null}
      {visibleColumns.date ? <td style={dateCellStyle}>{formatRequiredRecordValue(row.recordDate?.slice(0, 10))}</td> : null}
      {visibleColumns.type ? <td style={tdStyle}>{formatRequiredRecordValue(row.activityType)}</td> : null}
      {visibleColumns.quantity ? <td style={tdStyle}>{formatRequiredRecordValue(row.quantity)}</td> : null}
      {visibleColumns.unit ? <td style={unitCellStyle}>{formatRecordUnit(row.unit)}</td> : null}
      {visibleColumns.country ? <td style={tdStyle}>{formatOptionalRecordValue(row.jurisdictionCountry)}</td> : null}
      {visibleColumns.province ? (
      <td style={tdStyle}>
        {formatOptionalRecordValue(normalizeProvinceValue(row.jurisdictionRegion))}
        {String(row.activityType ?? '').toUpperCase() === 'ELECTRICITY' &&
        isMissingRecordValue(row.jurisdictionRegion) ? (
          <div style={helperTextStyle}>Set province</div>
        ) : null}
      </td>
      ) : null}
      {visibleColumns.facility ? <td style={tdStyle}>{formatOptionalRecordValue(row.facilityId)}</td> : null}
      {visibleColumns.source ? <td style={tdStyle}>{formatActivitySourceType(row.sourceType)}</td> : null}
      {visibleColumns.sourceReference ? (
      <td style={sourceReferenceCellStyle} title={formatActivitySourceReference(row)}>
        {formatActivitySourceReference(row)}
      </td>
      ) : null}
      <td style={actionsCellStyle}>
        <div style={rowActionStyle}>
          <button
            onClick={() => handleViewRecord(row)}
            style={secondaryActionBtnStyle(false)}
          >
            View
          </button>
          <div style={overflowMenuWrapperStyle}>
            <button
              ref={(element) => {
                actionMenuButtonRefs.current[row.id] = element;
              }}
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

function getEditRowColSpan() {
  return Object.values(visibleColumns).filter(Boolean).length + 2;
}

function renderEditRow(row){
  return (
    <tr key={`${row.id}-edit`}>
      <td colSpan={getEditRowColSpan()} style={expandedEditCellStyle}>
        <EditRecordPanel
          record={row}
          draftValues={editRow}
          activityTypes={activityTypes}
          provinceOptions={getProvinceOptions(editRow.jurisdictionRegion)}
          validationMessages={editErrors}
          selected={selectedIds.includes(row.id)}
          onSelectedChange={(checked) => toggleSelect(row.id, checked)}
          onChange={updateEditField}
          onSave={saveEdit}
          onCancel={cancelEdit}
          onDelete={() => void handleDelete(row)}
          normalizeProvince={normalizeProvinceValue}
        />
      </td>
    </tr>
  )
}

function renderViewedRecordModal() {
  if (!viewedRecord) return null;

  const quality = getActivityRecordQuality(viewedRecord);

  return createPortal(
    <div style={detailsModalBackdropStyle} onClick={() => setViewedRecord(null)}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-record-details-title"
        style={detailsModalStyle}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={detailsModalHeaderStyle}>
          <div>
            <h2 id="activity-record-details-title" style={detailsModalTitleStyle}>
              Activity Record Details
            </h2>
            <p style={detailsModalSubtitleStyle}>
              {formatOptionalRecordValue(viewedRecord.activityType)} ·{' '}
              {formatOptionalRecordValue(viewedRecord.recordDate?.slice(0, 10))}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setViewedRecord(null)}
            aria-label="Close activity record details"
            style={detailsModalCloseButtonStyle}
          >
            ×
          </button>
        </div>

        <div style={detailsModalGridStyle}>
          <DetailsField label="Status" value={quality.label} />
          <DetailsField label="Activity Type" value={formatRequiredRecordValue(viewedRecord.activityType)} />
          <DetailsField label="Quantity" value={formatRequiredRecordValue(viewedRecord.quantity)} />
          <DetailsField label="Unit" value={formatRecordUnit(viewedRecord.unit)} />
          <DetailsField label="Date" value={formatRequiredRecordValue(viewedRecord.recordDate?.slice(0, 10))} />
          <DetailsField label="Country" value={formatOptionalRecordValue(viewedRecord.jurisdictionCountry)} />
          <DetailsField
            label="Province"
            value={formatOptionalRecordValue(normalizeProvinceValue(viewedRecord.jurisdictionRegion))}
          />
          <DetailsField label="Facility" value={formatOptionalRecordValue(viewedRecord.facilityId)} />
          <DetailsField label="Source" value={formatActivitySourceType(viewedRecord.sourceType)} />
          <DetailsField
            label="Source Reference"
            value={formatActivitySourceReference(viewedRecord)}
            fullWidth
          />
          <DetailsField label="Notes" value={formatOptionalRecordValue(viewedRecord.notes)} fullWidth />
          <DetailsField label="Record ID" value={viewedRecord.id} fullWidth />
        </div>
      </section>
    </div>,
    document.body,
  );
}

function cancelEdit() {
  setEditingId(null);
  setEditRow({});
  setEditErrors({});
}

function closeClearRecordsModal() {
  if (isClearingRecords) return;

  setIsClearRecordsModalOpen(false);
  setClearRecordsConfirmation('');
}

async function handleClearActivityRecords() {
  if (clearRecordsConfirmation !== CLEAR_ACTIVITY_RECORDS_CONFIRMATION) return;

  setIsClearingRecords(true);
  setError(null);
  setSuccessMessage(null);

  try {
    const summary = await clearActivityRecordsForCurrentCompany();

    setItems([]);
    setSelectedIds([]);
    setLastDeleted(null);
    setCurrentPage(1);
    setIsClearRecordsModalOpen(false);
    setClearRecordsConfirmation('');
    setSuccessMessage(`Activity records cleared: ${formatClearRecordsSuccess(summary)}`);
    window.sessionStorage.setItem('carbonliteMetricsStale', 'true');
    window.dispatchEvent(new Event('carbonlite:metrics-stale'));
    window.dispatchEvent(new Event('carbonlite:reports-stale'));

    const refreshedItems = await loadItems({ updateState: false });
    setItems(refreshedItems);
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : 'Unable to clear activity records. Please try again.',
    );
  } finally {
    setIsClearingRecords(false);
  }
}

function renderClearRecordsModal() {
  if (!isClearRecordsModalOpen) return null;

  const canConfirm =
    clearRecordsConfirmation === CLEAR_ACTIVITY_RECORDS_CONFIRMATION &&
    !isClearingRecords;

  return createPortal(
    <div style={detailsModalBackdropStyle} onClick={closeClearRecordsModal}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="clear-activity-records-title"
        style={clearRecordsModalStyle}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={detailsModalHeaderStyle}>
          <div>
            <h2 id="clear-activity-records-title" style={detailsModalTitleStyle}>
              Clear Activity Records
            </h2>
            <p style={detailsModalSubtitleStyle}>Advanced company data action</p>
          </div>
          <button
            type="button"
            onClick={closeClearRecordsModal}
            aria-label="Close clear activity records confirmation"
            style={detailsModalCloseButtonStyle}
            disabled={isClearingRecords}
          >
            ×
          </button>
        </div>

        <div style={clearRecordsModalBodyStyle}>
          <p style={clearRecordsWarningTextStyle}>
            This will permanently remove all activity records and related calculated results for the current company. It will not delete users, facilities, emission factors, or settings.
          </p>
          <label style={clearRecordsConfirmLabelStyle}>
            <span>Type CLEAR RECORDS to confirm</span>
            <input
              value={clearRecordsConfirmation}
              onChange={(event) => setClearRecordsConfirmation(event.target.value)}
              style={clearRecordsInputStyle}
              autoFocus
            />
          </label>
          <div style={clearRecordsModalActionsStyle}>
            <button
              type="button"
              onClick={closeClearRecordsModal}
              disabled={isClearingRecords}
              style={secondaryActionBtnStyle(isClearingRecords)}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleClearActivityRecords}
              disabled={!canConfirm}
              style={clearRecordsConfirmButtonStyle(canConfirm)}
            >
              {isClearingRecords ? 'Clearing...' : 'Clear Activity Records'}
            </button>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}

function handleRetryLoad() {
  setError(null);
  setRecordLoadError(null);
  void loadItems();
}
  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {/* ⭐ 标题区 */}
      <h1 style={{ marginBottom: 8 }}>Data Records</h1>

      <p style={{ color: '#666', marginBottom: 24 }}>
        Data Records shows saved activity records. To add new data, go to Input Data.
      </p>
      <button
        type="button"
        onClick={() => navigate('/input-data', { state: { focusInputMethod: 'manual' } })}
        style={{ ...primaryActionBtn, marginBottom: 20 }}
      >
        Add data
      </button>
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
      {canClearActivityRecords ? (
        <section style={advancedActionsStyle} aria-labelledby="advanced-actions-title">
          <div>
            <h2 id="advanced-actions-title" style={advancedActionsTitleStyle}>
              Advanced Actions
            </h2>
            <p style={advancedActionsTextStyle}>
              Admin-only data management for pilot resets in the current company.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsClearRecordsModalOpen(true)}
            disabled={isClearingRecords}
            style={clearRecordsButtonStyle}
          >
            Clear Activity Records
          </button>
        </section>
      ) : null}
      {/* ⭐ Table */}
      <div style={tableCard}>
        <div style={tableHeaderRowStyle}>
          <h2 style={{ margin: 0 }}>Activity Records</h2>
        </div>

        <div style={tableToolbarStyle} aria-label="Activity records toolbar">
          <div style={toolbarRowStyle}>
            <div style={toolbarGroupStyle}>
              <label style={qualityFilterLabelStyle}>
                <span>Show</span>
                <select
                  value={qualityFilter}
                  onChange={(event) => setQualityFilter(event.target.value)}
                  style={qualityFilterSelectStyle}
                >
                  <option value="all">All records</option>
                  <option value="ready">Ready records</option>
                  <option value="requires-review">Records requiring review</option>
                  <option value="tracked-metric">Tracked metrics</option>
                  <option value="missing-factor">Missing factor records</option>
                  <option value="missing-jurisdiction">Missing province records</option>
                  <option value="invalid-unit">Invalid unit records</option>
                  <option value="missing-source">Missing source records</option>
                </select>
              </label>

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
            </div>
          </div>

          <div style={toolbarRowStyle}>
            <div style={toolbarGroupStyle}>
              <BulkProvinceToolbar
                selectedCount={selectedIds.length}
                eligibleCount={selectedMissingProvinceElectricityRows.length}
                selectedProvince={bulkProvince}
                onProvinceChange={(value) => setBulkProvince(normalizeProvinceValue(value))}
                provinceOptions={ELECTRICITY_FACTOR_PROVINCE_OPTIONS}
                onApply={handleBulkApplyProvince}
                isApplying={bulkApplyingProvince}
                applyLabel="Set province"
              />
            </div>

            <div style={toolbarGroupStyle}>
              <button
                type="button"
                onClick={handleGenerateReportFromSelection}
                disabled={!selectedIds.length}
                aria-label="Generate report from selected records"
                style={generateReportButtonStyle(selectedIds.length)}
              >
                Generate Report
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

        {isRefreshingRecords ? (
          <div style={refreshingNoticeStyle}>
            <span style={loadingBarStyle} aria-hidden="true" />
            Refreshing activity records...
          </div>
        ) : null}

        {isInitialRecordsLoading ? (
          <ActivityRecordsLoadingState visibleColumns={visibleColumns} />
        ) : recordLoadError && items.length === 0 ? (
          <div style={tableErrorStateStyle}>
            <div style={{ fontWeight: 800 }}>Unable to load activity records.</div>
            <div>Please try again.</div>
            <button type="button" onClick={handleRetryLoad} style={retryButtonStyle}>
              Retry
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={emptyStateStyle}>
            {recordFilterId
              ? 'The requested record could not be found.'
              : documentFilterId
              ? 'No records have been imported from this document.'
              : 'No saved activity records yet. Add data from Input Data to create records for review.'}
          </div>
        ) : (
          <>
            <div style={scrollHintStyle}>Scroll horizontally to view all columns →</div>
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
                  {visibleColumns.country ? <th style={countryThStyle}>Country</th> : null}
                  {visibleColumns.province ? <th style={provinceThStyle}>Province</th> : null}
                  {visibleColumns.facility ? <th style={facilityThStyle}>Facility</th> : null}
                  {visibleColumns.source ? <th style={sourceThStyle}>Source</th> : null}
                  {visibleColumns.sourceReference ? <th style={sourceReferenceThStyle}>Source Reference</th> : null}
                  <th style={actionsThStyle}></th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.flatMap((row) =>
                  editingId === row.id
                    ? [renderNormalRow(row), renderEditRow(row)]
                    : [renderNormalRow(row)],
                )}
              </tbody>
            </table>
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
      {renderViewedRecordModal()}
      {renderClearRecordsModal()}
    </div>
  );
}

function DetailsField({
  label,
  value,
  fullWidth = false,
}: {
  label: string;
  value: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div style={fullWidth ? detailsFieldFullStyle : detailsFieldStyle}>
      <span style={detailsFieldLabelStyle}>{label}</span>
      <span style={detailsFieldValueStyle}>{value}</span>
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

function ActivityRecordsLoadingState({
  visibleColumns,
}: {
  visibleColumns: Record<ActivityTableColumnKey, boolean>;
}) {
  const skeletonRows = Array.from({ length: 5 }, (_, index) => index);

  return (
    <div style={loadingStateStyle} aria-busy="true" aria-live="polite">
      <div style={loadingStateHeaderStyle}>
        <span>Loading activity records...</span>
        <span style={loadingBarStyle} aria-hidden="true" />
      </div>
      <div style={tableScrollContainerStyle}>
        <table style={activityRecordsTableStyle}>
          <thead>
            <tr>
              <th style={checkboxThStyle} />
              {visibleColumns.status ? <th style={statusThStyle}>Status</th> : null}
              {visibleColumns.date ? <th style={dateThStyle}>Date</th> : null}
              {visibleColumns.type ? <th style={typeThStyle}>Type</th> : null}
              {visibleColumns.quantity ? <th style={quantityThStyle}>Quantity</th> : null}
              {visibleColumns.unit ? <th style={unitThStyle}>Unit</th> : null}
              {visibleColumns.country ? <th style={countryThStyle}>Country</th> : null}
              {visibleColumns.province ? <th style={provinceThStyle}>Province</th> : null}
              {visibleColumns.facility ? <th style={facilityThStyle}>Facility</th> : null}
              {visibleColumns.source ? <th style={sourceThStyle}>Source</th> : null}
              {visibleColumns.sourceReference ? <th style={sourceReferenceThStyle}>Source Reference</th> : null}
              <th style={actionsThStyle} />
            </tr>
          </thead>
          <tbody>
            {skeletonRows.map((row) => (
              <tr key={row}>
                <td style={tdStyle}><span style={skeletonDotStyle} /></td>
                {visibleColumns.status ? <td style={tdStyle}><span style={skeletonPillStyle} /></td> : null}
                {visibleColumns.date ? <td style={tdStyle}><span style={skeletonLineStyle} /></td> : null}
                {visibleColumns.type ? <td style={tdStyle}><span style={skeletonLineWideStyle} /></td> : null}
                {visibleColumns.quantity ? <td style={tdStyle}><span style={skeletonLineStyle} /></td> : null}
                {visibleColumns.unit ? <td style={tdStyle}><span style={skeletonLineStyle} /></td> : null}
                {visibleColumns.country ? <td style={tdStyle}><span style={skeletonLineStyle} /></td> : null}
                {visibleColumns.province ? <td style={tdStyle}><span style={skeletonLineWideStyle} /></td> : null}
                {visibleColumns.facility ? <td style={tdStyle}><span style={skeletonLineStyle} /></td> : null}
                {visibleColumns.source ? <td style={tdStyle}><span style={skeletonLineStyle} /></td> : null}
                {visibleColumns.sourceReference ? <td style={tdStyle}><span style={skeletonLineFullStyle} /></td> : null}
                <td style={actionsCellStyle}><span style={skeletonButtonStyle} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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

const rowActionStyle = {
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  flexWrap: 'nowrap' as const,
  whiteSpace: 'nowrap' as const,
};

const expandedEditCellStyle: React.CSSProperties = {
  padding: 12,
  borderBottom: '1px solid #e2e8f0',
  background: '#f8fafc',
};

const tableToolbarStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  marginTop: 14,
};

const toolbarRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
  width: '100%',
};

const toolbarGroupStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
};

const qualityFilterLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  color: '#475569',
  fontSize: 13,
  fontWeight: 700,
};

const qualityFilterSelectStyle: React.CSSProperties = {
  height: 38,
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#0f172a',
  padding: '0 10px',
  fontWeight: 700,
};

const columnMenuWrapperStyle: React.CSSProperties = {
  position: 'relative',
  display: 'inline-flex',
  zIndex: 30,
};

const columnMenuStyle: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 8px)',
  right: 0,
  zIndex: 900,
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
  minWidth: 1380,
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

const detailsModalBackdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  display: 'grid',
  placeItems: 'center',
  padding: 20,
  background: 'rgba(15, 23, 42, 0.38)',
};

const detailsModalStyle: React.CSSProperties = {
  width: 'min(760px, 100%)',
  maxHeight: 'min(720px, calc(100vh - 40px))',
  overflow: 'auto',
  borderRadius: 14,
  border: '1px solid #cbd5e1',
  background: '#fff',
  boxShadow: '0 24px 70px rgba(15, 23, 42, 0.22)',
};

const detailsModalHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
  padding: '18px 20px 14px',
  borderBottom: '1px solid #e2e8f0',
};

const detailsModalTitleStyle: React.CSSProperties = {
  margin: 0,
  color: '#0f172a',
  fontSize: 20,
};

const detailsModalSubtitleStyle: React.CSSProperties = {
  margin: '4px 0 0',
  color: '#64748b',
  fontSize: 14,
  lineHeight: 1.4,
};

const detailsModalCloseButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 34,
  height: 34,
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#334155',
  fontSize: 22,
  lineHeight: 1,
  cursor: 'pointer',
};

const detailsModalGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 12,
  padding: 20,
};

const detailsFieldStyle: React.CSSProperties = {
  display: 'grid',
  gap: 5,
  alignContent: 'start',
  minWidth: 0,
};

const detailsFieldFullStyle: React.CSSProperties = {
  ...detailsFieldStyle,
  gridColumn: '1 / -1',
};

const detailsFieldLabelStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: 12,
  fontWeight: 800,
  textTransform: 'uppercase',
};

const detailsFieldValueStyle: React.CSSProperties = {
  color: '#0f172a',
  fontSize: 14,
  lineHeight: 1.5,
  overflowWrap: 'anywhere',
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

const countryThStyle: React.CSSProperties = {
  ...thStyle,
  width: 112,
};

const provinceThStyle: React.CSSProperties = {
  ...thStyle,
  width: 176,
};

const facilityThStyle: React.CSSProperties = {
  ...thStyle,
  width: 140,
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

const helperTextStyle: React.CSSProperties = {
  marginTop: 4,
  color: '#64748b',
  fontSize: 11,
  lineHeight: 1.25,
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

const advancedActionsStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 16,
  borderRadius: 10,
  border: '1px solid #fecaca',
  background: '#fff7f7',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 14,
  flexWrap: 'wrap',
};

const advancedActionsTitleStyle: React.CSSProperties = {
  margin: 0,
  color: '#7f1d1d',
  fontSize: 18,
};

const advancedActionsTextStyle: React.CSSProperties = {
  margin: '4px 0 0',
  color: '#7f1d1d',
  fontSize: 13,
};

const clearRecordsButtonStyle: React.CSSProperties = {
  padding: '9px 12px',
  borderRadius: 8,
  border: '1px solid #dc2626',
  background: '#dc2626',
  color: '#fff',
  fontWeight: 800,
  cursor: 'pointer',
};

const clearRecordsModalStyle: React.CSSProperties = {
  width: 'min(560px, 100%)',
  borderRadius: 14,
  border: '1px solid #fecaca',
  background: '#fff',
  boxShadow: '0 24px 70px rgba(15, 23, 42, 0.22)',
};

const clearRecordsModalBodyStyle: React.CSSProperties = {
  display: 'grid',
  gap: 16,
  padding: 20,
};

const clearRecordsWarningTextStyle: React.CSSProperties = {
  margin: 0,
  color: '#7f1d1d',
  lineHeight: 1.55,
  fontWeight: 700,
};

const clearRecordsConfirmLabelStyle: React.CSSProperties = {
  display: 'grid',
  gap: 7,
  color: '#334155',
  fontSize: 13,
  fontWeight: 800,
};

const clearRecordsInputStyle: React.CSSProperties = {
  height: 40,
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  padding: '0 10px',
  color: '#0f172a',
  fontWeight: 700,
};

const clearRecordsModalActionsStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 10,
  flexWrap: 'wrap',
};

function clearRecordsConfirmButtonStyle(enabled: boolean): React.CSSProperties {
  return {
    padding: '8px 12px',
    borderRadius: 8,
    border: enabled ? '1px solid #dc2626' : '1px solid #d1d5db',
    background: enabled ? '#dc2626' : '#f3f4f6',
    color: enabled ? '#fff' : '#6b7280',
    cursor: enabled ? 'pointer' : 'not-allowed',
    fontWeight: 800,
  };
}

const emptyStateStyle: React.CSSProperties = {
  marginTop: 16,
  padding: 18,
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
  color: '#475569',
};

const loadingStateStyle: React.CSSProperties = {
  marginTop: 14,
};

const loadingStateHeaderStyle: React.CSSProperties = {
  display: 'grid',
  gap: 8,
  color: '#475569',
  fontSize: 14,
  fontWeight: 700,
};

const loadingBarStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  height: 4,
  borderRadius: 999,
  overflow: 'hidden',
  background:
    'linear-gradient(90deg, #d1fae5 0%, #10b981 45%, #d1fae5 90%)',
  backgroundSize: '180% 100%',
};

const refreshingNoticeStyle: React.CSSProperties = {
  display: 'grid',
  gap: 7,
  marginTop: 12,
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #bbf7d0',
  background: '#f0fdf4',
  color: '#047857',
  fontSize: 13,
  fontWeight: 800,
};

const tableErrorStateStyle: React.CSSProperties = {
  marginTop: 16,
  padding: 18,
  borderRadius: 12,
  border: '1px solid #fecaca',
  background: '#fff1f2',
  color: '#991b1b',
  display: 'grid',
  gap: 10,
};

const retryButtonStyle: React.CSSProperties = {
  justifySelf: 'start',
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #be123c',
  background: '#fff',
  color: '#be123c',
  fontWeight: 800,
  cursor: 'pointer',
};

const skeletonBaseStyle: React.CSSProperties = {
  display: 'inline-block',
  borderRadius: 999,
  background: '#e2e8f0',
};

const skeletonDotStyle: React.CSSProperties = {
  ...skeletonBaseStyle,
  width: 16,
  height: 16,
};

const skeletonPillStyle: React.CSSProperties = {
  ...skeletonBaseStyle,
  width: 78,
  height: 20,
};

const skeletonLineStyle: React.CSSProperties = {
  ...skeletonBaseStyle,
  width: 72,
  height: 12,
};

const skeletonLineWideStyle: React.CSSProperties = {
  ...skeletonBaseStyle,
  width: 110,
  height: 12,
};

const skeletonLineFullStyle: React.CSSProperties = {
  ...skeletonBaseStyle,
  width: '82%',
  height: 12,
};

const skeletonButtonStyle: React.CSSProperties = {
  ...skeletonBaseStyle,
  width: 72,
  height: 28,
  borderRadius: 8,
};
