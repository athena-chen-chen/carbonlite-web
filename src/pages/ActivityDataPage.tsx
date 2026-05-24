import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { isDemoMode } from '../demo/demoData';

const PAGE_SIZE = 15;

type ActivityDataItem = {
  id: string;
  activityType: string;
  recordDate: string;
  quantity: string | number;
  unit: string;
  sourceType: string;
  sourceReference?: string | null;
  notes?: string | null;
};

export function ActivityDataPage() {
  const navigate = useNavigate();
  const demoMode = isDemoMode();
  const [items, setItems] = useState<ActivityDataItem[]>([]);
  const [loading, setLoading] = useState(false);
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

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const paginatedItems = items.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

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

  if (!row.activityType) errors.activityType = 'Required';
  if (!row.recordDate) errors.recordDate = 'Required';

  if (!row.quantity) {
    errors.quantity = 'Required';
  } else if (Number(row.quantity) <= 0) {
    errors.quantity = 'Must be greater than 0';
  }

  if (!row.unit) errors.unit = 'Required';

  return errors;
}
async function handleDelete(row: ActivityDataItem) {
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
  return (
    <tr key={row.id}>
      <td style={tdStyle}>
  <input
    type="checkbox"
    checked={selectedIds.includes(row.id)}
    onChange={(e) => toggleSelect(row.id, e.target.checked)}
  />
</td>
      <td style={tdStyle}>{row.recordDate?.slice(0, 10)}</td>
      <td style={tdStyle}>{row.activityType}</td>
      <td style={tdStyle}>{row.quantity}</td>
      <td style={tdStyle}>{row.unit}</td>
      <td style={tdStyle}>{row.sourceType}</td>
      <td style={tdStyle}>
        <div style={rowActionStyle}>
          <button onClick={() => startEdit(row)} style={secondaryActionBtn}>
            Edit
          </button>
          <button onClick={() => handleDelete(row)} style={dangerActionBtn}>
            Delete
          </button>
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
      {demoMode ? (
        <div style={demoNoticeStyle}>
          Demo Mode is showing imported records from the sample fuel invoice, utility bill, and CSV activity data.
        </div>
      ) : null}

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
       <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
  <h2 style={{ margin: 0 }}>Activity Records</h2>

  <div style={tableToolbarStyle}>
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

        {loading ? (
          <p>Loading...</p>
        ) : items.length === 0 ? (
          <div style={emptyStateStyle}>
            No activity records yet. Import extracted rows from Upload or start Demo Mode to review sample data.
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
              <thead>
                <tr>
                  <th style={thStyle}>
                    <input
                      type="checkbox"
                      checked={
                        paginatedItems.length > 0 &&
                        paginatedItems.every((item) => selectedIds.includes(item.id))
                      }
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Quantity</th>
                  <th style={thStyle}>Unit</th>
                  <th style={thStyle}>Source</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((row) => (
                  editingId === row.id ? renderEditRow(row) : renderNormalRow(row)
                ))}
              </tbody>
            </table>

            <div style={paginationStyle}>
              <span>
                Showing {(currentPage - 1) * PAGE_SIZE + 1}-
                {Math.min(currentPage * PAGE_SIZE, items.length)} of {items.length}
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
  flexWrap: 'wrap',
};

const editRowActionStyle = {
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  flexWrap: 'nowrap' as const,
  minWidth: 150,
};

const tableToolbarStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  alignItems: 'center',
  flexWrap: 'wrap',
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
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  background: '#fff',
  color: '#111827',
  fontWeight: 600,
  cursor: 'pointer',
};

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
  padding: '12px 14px',
  background: '#f8fafc',
  color: '#475569',
  fontSize: 13,
  fontWeight: 700,
  borderBottom: '1px solid #e5e7eb',
};

const tdStyle = {
  padding: '12px 14px',
  borderBottom: '1px solid #f1f5f9',
  verticalAlign: 'top' as const,
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

const demoNoticeStyle: React.CSSProperties = {
  marginBottom: 18,
  padding: 12,
  borderRadius: 10,
  border: '1px solid #c7d2fe',
  background: '#eef2ff',
  color: '#3730a3',
  fontWeight: 600,
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
