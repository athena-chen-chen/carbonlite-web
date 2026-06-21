
import { createActivityData } from '../services/activityData';
import { useEffect, useRef, useState } from 'react';
import { getConversionFactors } from '../services/conversionFactors';
import {
  activityTypeDefaultUnits,
  activityTypes,
} from '../constants/activityTypes';
import * as XLSX from 'xlsx';
import {
  findBestConversionFactorMatch,
  getFactorSourceAuthority,
} from '../utils/conversionFactorMatching';
import { getCurrentUser, getOrganizationId } from '../services/auth';

type Row = {
  id: string;
  activityType: string;
  quantity: string;
  unit: string;
  recordDate: string;
  factorId?: string;
  factorName?: string;
  factorValue?: string | number;
  factorSourceLabel?: string;
  factorSourceAuthority?: string;
  factorSourceYear?: string | number | null;
  factorStatus?: 'matched' | 'missing';
  errors?: string[];
  status?: 'draft' | 'saved' | 'error' | 'saving';
  savedActivityId?: string;
};

export function ExcelInputTable({ onSuccess }: { onSuccess: () => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const dragDepthRef = useRef(0);
  const [entrySourceType, setEntrySourceType] = useState<'MANUAL' | 'CSV' | 'EXCEL' | 'PASTE'>('MANUAL');
  useEffect(() => {
  async function loadFactors() {
    try {
      const data = await getConversionFactors();
      setConversionFactors(data.items ?? []);
    } catch {
      setConversionFactors([]);
    }
  }

  loadFactors();
}, []);
const [conversionFactors, setConversionFactors] = useState<any[]>([]);
useEffect(() => {
  setRows((prev) => prev.map(applyFactorToRow));
}, [conversionFactors]);

const hasUnsavedRows = rows.some(
  (row) => !isRowCompletelyEmpty(row) && row.status !== 'saved',
);

useEffect(() => {
  function handleBeforeUnload(event: BeforeUnloadEvent) {
    if (!hasUnsavedRows) return;

    event.preventDefault();
    event.returnValue = 'You have unsaved activity rows.';
  }

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [hasUnsavedRows]);

function importFile(file: File) {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.csv')) {
    importCSVFile(file);
    return;
  }

  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    importExcelFile(file);
    return;
  }

  alert('Please drop or select a CSV or Excel file.');
}

function handleDragEnter(event: React.DragEvent<HTMLDivElement>) {
  event.preventDefault();
  event.stopPropagation();
  dragDepthRef.current += 1;
  setIsDragging(true);
}

function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
  event.preventDefault();
  event.stopPropagation();
  event.dataTransfer.dropEffect = 'copy';
  setIsDragging(true);
}

function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
  event.preventDefault();
  event.stopPropagation();
  dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

  if (dragDepthRef.current === 0) {
    setIsDragging(false);
  }
}

function handleDrop(event: React.DragEvent<HTMLDivElement>) {
  event.preventDefault();
  event.stopPropagation();
  dragDepthRef.current = 0;
  setIsDragging(false);

  const file = event.dataTransfer.files?.[0];
  if (!file) return;

  importFile(file);
  const sourceType = getSourceTypeFromFile(file);
setEntrySourceType(sourceType);
}
function importCSVFile(file: File) {
  const reader = new FileReader();

  reader.onload = () => {
    const text = String(reader.result ?? '');
    parseCSVText(text);
  };

  reader.readAsText(file);
  setEntrySourceType('CSV');
}
function findMatchingFactor(activityType: string, unit: string) {
  if (!activityType || !unit) return undefined;

  return findBestConversionFactorMatch({
    activityType,
    inputUnit: unit,
    organizationId: getOrganizationId(getCurrentUser()),
    factors: conversionFactors,
  });
}


function applyFactorToRow(row: Row): Row {
  if (isRowCompletelyEmpty(row) || !row.activityType || !row.unit) {
    return {
      ...row,
      factorId: undefined,
      factorName: undefined,
      factorValue: undefined,
      factorSourceLabel: undefined,
      factorSourceAuthority: undefined,
      factorSourceYear: undefined,
      factorStatus: undefined,
    };
  }

  const match = findMatchingFactor(row.activityType, row.unit);

  if (!match) {
    return {
      ...row,
      factorId: undefined,
      factorName: undefined,
      factorValue: undefined,
      factorSourceLabel: undefined,
      factorSourceAuthority: undefined,
      factorSourceYear: undefined,
      factorStatus: 'missing',
    };
  }

  const { factor } = match;

  return {
    ...row,
    factorId: factor.id,
    factorName: factor.name,
    factorValue: factor.factorValue,
    factorSourceLabel: match.sourceLabel,
    factorSourceAuthority: getFactorSourceAuthority(factor),
    factorSourceYear: factor.sourceYear,
    factorStatus: 'matched',
  };
}
function importExcelFile(file: File) {
  const reader = new FileReader();

  reader.onload = (e) => {
    const data = new Uint8Array(e.target?.result as ArrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

    const importedRows = jsonData.map((row) => {
      const activityType =
        row.activityType || row.type || row.activity || '';

      return {
        id: Math.random().toString(),
        activityType,
        recordDate:
          row.recordDate ||
          row.date ||
          new Date().toISOString().slice(0, 10),
        quantity: row.quantity || row.qty || row.amount || '',
        unit: row.unit || row.uom || getDefaultUnit(activityType),
      };
    });

   setRows(
  importedRows.length
    ? importedRows.map(applyFactorToRow)
    : [],
);
  };

  reader.readAsArrayBuffer(file);
  setEntrySourceType('EXCEL');
}
function parseCSVText(text: string) {
  const lines = text.split(/\r?\n/).filter(Boolean);

  if (lines.length < 2) {
    alert('CSV must include a header row and at least one data row.');
    return;
  }

  const headers = lines[0].split(',').map((v) => v.trim());

  const activityTypeIndex = findColumnIndex(headers, [
    'activityType',
    'activity',
    'type',
    'fuelType',
    'fuel',
  ]);

  const recordDateIndex = findColumnIndex(headers, [
    'recordDate',
    'date',
    'invoiceDate',
    'transactionDate',
  ]);

  const quantityIndex = findColumnIndex(headers, [
    'quantity',
    'qty',
    'amount',
    'usage',
    'volume',
  ]);

  const unitIndex = findColumnIndex(headers, ['unit', 'uom', 'measurement']);

  if (activityTypeIndex === -1 || quantityIndex === -1) {
    alert('CSV must include at least activity type and quantity columns.');
    return;
  }

  const importedRows = lines.slice(1).map((line) => {
    const cols = line.split(',').map((v) => v.trim());
    const activityType = cols[activityTypeIndex] || '';

    return {
      id: Math.random().toString(),
      activityType,
      recordDate:
        recordDateIndex >= 0
          ? cols[recordDateIndex]
          : new Date().toISOString().slice(0, 10),
      quantity: cols[quantityIndex] || '',
      unit:
        unitIndex >= 0
          ? cols[unitIndex]
          : getDefaultUnit(activityType),
    };
  });

 setRows(
  importedRows.length
    ? importedRows.map(applyFactorToRow)
    : [],
);
}
function validateRow(row: Row) {
  const errors: string[] = [];

  if (!row.activityType) errors.push('Missing activity type');
  if (!row.recordDate) errors.push('Missing date');
  if (!row.quantity) errors.push('Missing quantity');
  if (Number(row.quantity) <= 0) errors.push('Quantity must be greater than 0');
  if (!row.unit) errors.push('Missing unit');
  if (row.factorStatus !== 'matched') errors.push('No matching conversion factor');

  return errors;
}

function isRowReadyToSave(row: Row) {
  return !isRowCompletelyEmpty(row) && validateRow(row).length === 0;
}

function isRowSaveDisabled(row: Row) {
  return row.status === 'saved' || row.status === 'saving' || !isRowReadyToSave(row);
}

function getRowSaveLabel(row: Row) {
  if (row.status === 'saving') return 'Saving...';
  if (row.status === 'saved') return 'Saved';
  return 'Save';
}

function buildActivityPayload(row: Row) {
  return {
    activityType: row.activityType,
    recordDate: row.recordDate,
    quantity: Number(row.quantity),
    unit: row.unit,
    sourceType: entrySourceType,
    sourceReference: entrySourceType.toLowerCase(),
    notes: `Created from ${entrySourceType}. Matched factor: ${row.factorName ?? 'N/A'} (${row.factorValue ?? 'N/A'})`,
  };
}

function updateRowStatus(id: string, patch: Partial<Row>) {
  setRows((prev) =>
    prev.map((row) =>
      row.id === id
        ? {
            ...row,
            ...patch,
          }
        : row,
    ),
  );
}
function createEmptyRow(): Row {
  return {
    id: Math.random().toString(),
    activityType: '',
    quantity: '',
    unit: '',
    recordDate: new Date().toISOString().slice(0, 10),
    status: 'draft',
  };
}
function isRowCompletelyEmpty(row: Row) {
  return !row.activityType && !row.quantity && !row.unit;
}

function hasRowStarted(row: Row) {
  return Boolean(row.activityType || row.quantity || row.unit);
}

function canRemoveRow(row: Row) {
  if (rows.length === 1 && isRowCompletelyEmpty(row)) return false;
  return Boolean(row.activityType || row.quantity);
}

function renderStatusCell(row: Row) {
  if (row.status === 'saved') {
    return <span style={{ color: '#047857', fontSize: 12, fontWeight: 700 }}>Saved</span>;
  }

  if (row.status === 'saving') {
    return <span style={{ color: '#0369a1', fontSize: 12, fontWeight: 700 }}>Saving...</span>;
  }

  if (row.errors?.length) {
    return (
      <div style={{ color: '#be123c', fontSize: 12 }}>
        <strong>Error</strong>
        <br />
        {row.errors.join(', ')}
      </div>
    );
  }

  if (!hasRowStarted(row)) {
    return <span style={{ color: '#94a3b8', fontSize: 12 }}>-</span>;
  }

  return <span style={{ color: '#475569', fontSize: 12, fontWeight: 700 }}>Draft</span>;
}

function renderFactorCell(row: Row) {
  if (isRowCompletelyEmpty(row) || !row.activityType) {
    return <span style={{ color: '#94a3b8', fontSize: 12 }}>-</span>;
  }

  if (row.factorStatus === 'matched') {
    return (
      <div style={{ color: '#047857', fontSize: 12 }}>
        Matched: {row.factorName}
        <br />
        Factor: {row.factorValue}
        <br />
        Source: {row.factorSourceLabel}
        {row.factorSourceAuthority ? (
          <>
            <br />
            Authority: {row.factorSourceAuthority}
          </>
        ) : null}
        {row.factorSourceYear ? (
          <>
            <br />
            Year: {row.factorSourceYear}
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ color: '#be123c', fontSize: 12 }}>
      No matching factor
    </div>
  );
}

function getDefaultUnit(activityType: string) {
  return activityTypeDefaultUnits[activityType] ?? '';
}
 function updateRow(id: string, key: keyof Row, value: string) {
  setRows((prev) =>
    prev.map((row) => {
      if (row.id !== id) return row;

      const updated = {
        ...row,
        [key]: value,
        status: 'draft' as const,
        savedActivityId: undefined,
        errors: undefined,
      };

      if (key === 'activityType') {
        updated.unit = getDefaultUnit(value);
      }

      return applyFactorToRow(updated);
    }),
  );
  setEntrySourceType('MANUAL');
}

  function addRow() {
    setRows((prev) => [...prev, applyFactorToRow(createEmptyRow())]);
  }

function removeRow(id: string) {
  setRows((prev) => prev.filter((row) => row.id !== id));
  setEntrySourceType('MANUAL');
}

function handleQuickEntryKeyDown(event: React.KeyboardEvent<HTMLTableElement>) {
  if (event.key === 'Enter') {
    event.preventDefault();
  }
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

function findColumnIndex(headers: string[], candidates: string[]) {
  const normalized = headers.map(normalizeHeader);

  return normalized.findIndex((header) =>
    candidates.map(normalizeHeader).includes(header),
  );
}
function handlePasteRows(event: React.ClipboardEvent<HTMLTableElement>) {
  const text = event.clipboardData.getData('text');

  if (!text.includes('\t') && !text.includes('\n')) {
    return;
  }

  event.preventDefault();

  const pastedRows = text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split('\t').map((cell) => cell.trim()))
    .map(([activityType, recordDate, quantity, unit]) => {
      const type = activityType || '';

      return {
        id: Math.random().toString(),
        activityType: type,
        recordDate: recordDate || new Date().toISOString().slice(0, 10),
        quantity: quantity || '',
        unit: unit || getDefaultUnit(type),
      };
    });

setRows((prev) => [...prev, ...pastedRows.map(applyFactorToRow)]);
setEntrySourceType('PASTE');
}

function getSourceTypeFromFile(file: File) {
  const name = file.name.toLowerCase();

  if (name.endsWith('.csv')) return 'CSV';
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return 'EXCEL';
  if (name.endsWith('.pdf') || name.endsWith('.png') || name.endsWith('.jpg')) {
    return 'AI_EXTRACTION';
  }

  return 'MANUAL';
}
function handleImportCSV(event: React.ChangeEvent<HTMLInputElement>) {
  const file = event.target.files?.[0];
  if (file) importFile(file);
  event.target.value = '';
  setEntrySourceType('CSV');
}
function handleImportExcel(event: React.ChangeEvent<HTMLInputElement>) {
  const file = event.target.files?.[0];
  if (file) importFile(file);
  event.target.value = '';
  setEntrySourceType('EXCEL');
}
async function saveRow(row: Row) {
  const errors = validateRow(row);

  if (errors.length > 0) {
    updateRowStatus(row.id, {
      errors,
      status: 'error',
    });
    return;
  }

  updateRowStatus(row.id, {
    errors: undefined,
    status: 'saving',
  });

  try {
    const saved = await createActivityData(buildActivityPayload(row));
    updateRowStatus(row.id, {
      errors: undefined,
      status: 'saved',
      savedActivityId: (saved as { id?: string })?.id,
    });
    onSuccess();
  } catch (err) {
    updateRowStatus(row.id, {
      errors: [err instanceof Error ? err.message : 'Failed to save row'],
      status: 'error',
    });
  }
}

async function saveAll() {
  const rowsToSave = rows.filter(
    (row) => !isRowCompletelyEmpty(row) && row.status !== 'saved',
  );
  const validatedRows = rowsToSave.map((row) => ({
    ...row,
    errors: validateRow(row),
  }));

  const hasErrors = validatedRows.some((row) => row.errors?.length);

  if (hasErrors) {
    setRows((prev) =>
      prev.map((row) =>
        validatedRows.find((validatedRow) => validatedRow.id === row.id) ?? row,
      ),
    );
    alert('Some rows have errors. Please fix highlighted rows before saving.');
    return;
  }

  try {
    const savedRows: Array<{ rowId: string; savedActivityId?: string }> = [];

    for (const row of validatedRows) {
      const saved = await createActivityData(buildActivityPayload(row));
      savedRows.push({
        rowId: row.id,
        savedActivityId: (saved as { id?: string })?.id,
      });
    }

    setRows((prev) =>
      prev.map((row) => {
        const savedRow = savedRows.find((item) => item.rowId === row.id);

        if (!savedRow) return row;

        return {
          ...row,
          errors: undefined,
          status: 'saved',
          savedActivityId: savedRow.savedActivityId,
        };
      }),
    );
    onSuccess();
    alert('Saved!');
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Failed to save');
  }
}

const rowsToSave = rows.filter(
  (row) => !isRowCompletelyEmpty(row) && row.status !== 'saved',
);
const hasValidRows = rowsToSave.some((row) => validateRow(row).length === 0);

  return (

<div style={{
    ...cardStyle,
    border: isDragging ? '2px dashed #10b981' : '1px solid #e5e7eb',
    background: isDragging ? '#ecfdf5' : '#fff',
  }}
  onDragEnter={handleDragEnter}
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}>
  <div style={headerStyle}>
    <div>
      <h3 style={{ margin: 0 }}>Activity Rows</h3>
      <p style={{ margin: '6px 0 0', color: '#64748b' }}>
        Type directly, paste rows from Excel, import CSV/XLSX files, or drag and drop a file here. Use + Add Row to add another row.
      </p>
    </div>
  </div>

  <div style={{ overflowX: 'auto' }}>
    {rows.length === 0 ? (
      <div style={quickEntryEmptyStyle}>
        <strong>No activity rows.</strong>
        <span>Click "+ Add Row" to begin.</span>
      </div>
    ) : (
    <table style={tableStyle} onPaste={handlePasteRows} onKeyDown={handleQuickEntryKeyDown}>
      <thead>
        <tr>
          <th style={thStyle}>Type</th>
          <th style={thStyle}>Quantity</th>
          <th style={thStyle}>Unit</th>
          <th style={thStyle}>Date</th>
          <th style={thStyle}>Status</th>
          <th style={thStyle}>Factor</th>
          <th style={thStyle}>Actions</th>
        </tr>
      </thead>

      <tbody>
        {rows.map((row, index) => (
          <tr key={row.id} style={{
    background: row.errors?.length ? '#fff1f2' : '#fff',
  }}>
            <td style={tdStyle}>
              <select
                value={row.activityType}
                onChange={(e) => {
                  const activityType = e.target.value;
                  setRows((prev) =>
                    prev.map((r) =>
                      r.id === row.id
                        ? applyFactorToRow({
                            ...r,
                            activityType,
                            unit: getDefaultUnit(activityType),
                            status: 'draft',
                            savedActivityId: undefined,
                            errors: undefined,
                          })
                        : r,
                    ),
                  );
                }}
                style={inputStyle}
              >
                <option value="">Select type</option>
                {activityTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </td>

            <td style={tdStyle}>
              <input
                type="number"
                value={row.quantity}
                onChange={(e) => updateRow(row.id, 'quantity', e.target.value)}
                placeholder="Quantity"
                style={inputStyle}
              />
            </td>

            <td style={tdStyle}>
              <input
                value={row.unit}
                onChange={(e) => updateRow(row.id, 'unit', e.target.value)}
                placeholder="Auto-filled after type"
                style={inputStyle}
              />
            </td>

            <td style={tdStyle}>
              <input
                type="date"
                value={row.recordDate}
                onChange={(e) => updateRow(row.id, 'recordDate', e.target.value)}
                style={inputStyle}
              />
            </td>
            <td style={tdStyle}>
  {renderStatusCell(row)}
</td>
<td style={tdStyle}>
  {renderFactorCell(row)}
</td>
<td style={tdStyle}>
  <div style={rowActionStyle}>
    <button
      type="button"
      onClick={() => saveRow(row)}
      disabled={isRowSaveDisabled(row)}
      aria-label={`Save row ${index + 1}`}
      style={rowSaveButtonStyle(isRowSaveDisabled(row), row.status === 'saved')}
    >
      {getRowSaveLabel(row)}
    </button>
    {canRemoveRow(row) ? (
      <button
        type="button"
        onClick={() => removeRow(row.id)}
        aria-label={`Remove row ${index + 1}`}
        style={removeButtonStyle}
      >
        Remove
      </button>
    ) : null}
  </div>
</td>
          </tr>
        ))}
      </tbody>
    </table>
    )}
  </div>

  <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
    <button type="button" onClick={addRow} style={secondaryButtonStyle}>
      + Add Row
    </button>

    <button
      type="button"
      onClick={saveAll}
      disabled={!hasValidRows}
      style={primaryButtonStyle(!hasValidRows)}
    >
      Save All
    </button>
    {/* <label style={secondaryButtonStyle}>
  Import CSV
  <input
    type="file"
    accept=".csv"
    onChange={handleImportCSV}
    style={{ display: 'none' }}
  /> */}
{/* </label>
<label style={secondaryButtonStyle}>
  Import Excel
  <input
    type="file"
    accept=".xlsx,.xls"
    onChange={handleImportExcel}
    style={{ display: 'none' }}
  />
</label> */}
  </div>
</div>
  );
}

const card = {
  padding: 16,
  border: '1px solid #eee',
  borderRadius: 12,
  marginBottom: 20,
};

const cardStyle: React.CSSProperties = {
  padding: 20,
  border: '1px solid #e5e7eb',
  borderRadius: 16,
  background: '#fff',
  marginBottom: 24,
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
  marginBottom: 16,
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'separate',
  borderSpacing: 0,
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  overflow: 'hidden',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '12px 14px',
  background: '#f8fafc',
  color: '#475569',
  fontSize: 13,
  fontWeight: 700,
  borderBottom: '1px solid #e5e7eb',
};

const tdStyle: React.CSSProperties = {
  padding: 10,
  borderBottom: '1px solid #f1f5f9',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #cbd5e1',
  background: '#fff',
  fontSize: 14,
  outline: 'none',
};

const quickEntryEmptyStyle: React.CSSProperties = {
  display: 'grid',
  gap: 6,
  padding: 24,
  border: '1px dashed #cbd5e1',
  borderRadius: 12,
  background: '#f8fafc',
  color: '#475569',
};

function primaryButtonStyle(disabled = false): React.CSSProperties {
  return {
    padding: '10px 16px',
    borderRadius: 10,
    border: 'none',
    background: disabled ? '#9ca3af' : '#10b981',
    color: '#fff',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

const secondaryButtonStyle: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: 10,
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#111827',
  fontWeight: 700,
  cursor: 'pointer',
};

const rowActionStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
};

function rowSaveButtonStyle(disabled: boolean, saved: boolean): React.CSSProperties {
  return {
    padding: '8px 12px',
    borderRadius: 8,
    border: saved ? '1px solid #bbf7d0' : '1px solid #10b981',
    background: saved ? '#ecfdf5' : disabled ? '#f3f4f6' : '#10b981',
    color: saved ? '#047857' : disabled ? '#6b7280' : '#fff',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

const removeButtonStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #fecaca',
  background: '#fff',
  color: '#b91c1c',
  fontWeight: 700,
  cursor: 'pointer',
};
