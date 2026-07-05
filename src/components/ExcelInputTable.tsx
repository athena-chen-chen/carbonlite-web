
import { createActivityData, updateActivityData } from '../services/activityData';
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
  normalizeActivityType,
  normalizeJurisdictionRegion,
} from '../utils/conversionFactorMatching';
import { getCurrentUser, getOrganizationId } from '../services/auth';
import { normalizeUnitForDisplay } from '../utils/unitNormalization';
import { getFacilities, type FacilityItem } from '../services/facilities';

type Row = {
  id: string;
  activityType: string;
  quantity: string;
  unit: string;
  recordDate: string;
  jurisdictionCountry: string;
  jurisdictionRegion: string;
  facilityId?: string;
  facilityName?: string;
  sourceReference?: string;
  notes?: string;
  factorId?: string;
  factorName?: string;
  factorValue?: string | number;
  factorSourceLabel?: string;
  factorSourceAuthority?: string;
  factorSourceYear?: string | number | null;
  factorStatus?: 'matched' | 'missing';
  calculationStatus?: 'calculated' | 'invalidUnit' | 'missingFactor' | 'missingJurisdiction' | 'trackedMetric' | 'needsReview';
  calculationMessage?: string;
  supportedUnits?: string[];
  errors?: string[];
  status?: 'draft' | 'saved' | 'error' | 'saving';
  savedActivityId?: string;
};

export function ExcelInputTable({ onSuccess }: { onSuccess: () => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const dragDepthRef = useRef(0);
  const [entrySourceType, setEntrySourceType] = useState<'MANUAL' | 'CSV' | 'EXCEL' | 'PASTE'>('MANUAL');
  const [bulkProvince, setBulkProvince] = useState('');
  const [facilities, setFacilities] = useState<FacilityItem[]>([]);
  useEffect(() => {
  async function loadReferenceData() {
    try {
      const [factorData, facilityData] = await Promise.all([
        getConversionFactors(),
        getFacilities().catch(() => []),
      ]);
      setConversionFactors(factorData.items ?? []);
      setFacilities(facilityData);
    } catch {
      setConversionFactors([]);
      setFacilities([]);
    }
  }

  loadReferenceData();
}, []);
const [conversionFactors, setConversionFactors] = useState<any[]>([]);
useEffect(() => {
  setRows((prev) => prev.map(applyFactorToRow));
}, [conversionFactors, facilities]);

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
function findMatchingFactor(row: Pick<Row, 'activityType' | 'unit' | 'jurisdictionCountry' | 'jurisdictionRegion' | 'recordDate'>) {
  const { activityType, unit } = row;
  if (!activityType || !unit) return undefined;

  return findBestConversionFactorMatch({
    activityType,
    inputUnit: unit,
    jurisdictionCountry: row.jurisdictionCountry,
    jurisdictionRegion: row.jurisdictionRegion,
    recordYear: row.recordDate ? new Date(row.recordDate).getUTCFullYear() : undefined,
    organizationId: getOrganizationId(getCurrentUser()),
    factors: conversionFactors,
  });
}

function getSupportedUnitsForActivityType(activityType: string) {
  const units = conversionFactors
    .filter((factor) => factor.activityType === activityType)
    .map((factor) => factor.inputUnit || factor.unit)
    .filter((unit): unit is string => Boolean(unit));

  return Array.from(new Set(units)).sort((a, b) => a.localeCompare(b));
}

function isTrackedMetricActivity(activityType: string) {
  return ['WATER', 'WASTE', 'WASTE_VOLUME'].includes(String(activityType).toUpperCase());
}

function getRowCalculationReview(row: Pick<Row, 'activityType' | 'unit' | 'jurisdictionRegion'>) {
  if (!row.activityType || !row.unit) {
    return {
      calculationStatus: undefined,
      calculationMessage: undefined,
      supportedUnits: [],
    };
  }

  const supportedUnits = getSupportedUnitsForActivityType(row.activityType);

  if (row.activityType === 'ELECTRICITY' && !normalizeJurisdictionRegion(row.jurisdictionRegion)) {
    return {
      calculationStatus: 'missingJurisdiction' as const,
      calculationMessage:
        'Electricity emissions require a province-specific factor. Please select the province where the electricity was used.',
      supportedUnits,
    };
  }

  if (isTrackedMetricActivity(row.activityType)) {
    return {
      calculationStatus: 'trackedMetric' as const,
      calculationMessage:
        'Water usage is tracked for operational insight. Emissions are optional and require a reviewed water emissions factor.',
      supportedUnits,
    };
  }

  const normalizedUnit = normalizeUnitForDisplay(row.unit);
  if (normalizedUnit.status !== 'valid') {
    return {
      calculationStatus: 'invalidUnit' as const,
      calculationMessage: `Unit '${row.unit}' could not be matched to a supported ${row.activityType} factor unit.${supportedUnits.length ? ` Supported unit: ${supportedUnits.join(', ')}.` : ''}`,
      supportedUnits,
    };
  }

  const normalizedSupportedUnits = supportedUnits.map((unit) => normalizeUnitForDisplay(unit).value);
  if (supportedUnits.length > 0 && !normalizedSupportedUnits.includes(normalizedUnit.value)) {
    return {
      calculationStatus: 'invalidUnit' as const,
      calculationMessage: `Unit '${row.unit}' could not be matched to a supported ${row.activityType} factor unit.${supportedUnits.length ? ` Supported unit: ${supportedUnits.join(', ')}.` : ''}`,
      supportedUnits,
    };
  }

  return {
    calculationStatus: 'missingFactor' as const,
    calculationMessage: `No conversion factor found for ${row.activityType} / ${normalizedUnit.value}. This record was saved but excluded from emissions totals.`,
    supportedUnits,
  };
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
      calculationStatus: undefined,
      calculationMessage: undefined,
      supportedUnits: undefined,
    };
  }

  const matchedFacility = findFacilityByName(row.facilityName, facilities);
  const facilityProvince = normalizeProvince(matchedFacility?.provinceState);
  const facilityCountry = normalizeCountry(matchedFacility?.country);
  const normalizedRow = {
    ...row,
    facilityId: matchedFacility?.id ?? row.facilityId,
    jurisdictionCountry: normalizeCountry(row.jurisdictionCountry || facilityCountry),
    jurisdictionRegion: normalizeProvince(row.jurisdictionRegion) || facilityProvince,
  };
  const match = findMatchingFactor(normalizedRow);
  const review = getRowCalculationReview(normalizedRow);

  if (!match) {
    return {
      ...normalizedRow,
      factorId: undefined,
      factorName: undefined,
      factorValue: undefined,
      factorSourceLabel: undefined,
      factorSourceAuthority: undefined,
      factorSourceYear: undefined,
      factorStatus: 'missing',
      ...review,
    };
  }

  const { factor } = match;

  return {
    ...normalizedRow,
    factorId: factor.id,
    factorName: factor.name,
    factorValue: factor.factorValue,
    factorSourceLabel: match.sourceLabel,
    factorSourceAuthority: getFactorSourceAuthority(factor),
    factorSourceYear: factor.sourceYear,
    factorStatus: 'matched',
    calculationStatus: 'calculated',
    calculationMessage: 'Matched factor. This row can be included in emissions totals.',
    supportedUnits: getSupportedUnitsForActivityType(row.activityType),
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
        normalizeActivityType(readAliasedField(row, ['activityType', 'Activity Type', 'type', 'activity'])) || '';

      return {
        id: Math.random().toString(),
        activityType,
        recordDate:
          readAliasedField(row, ['recordDate', 'Record Date', 'date', 'Date']) ||
          new Date().toISOString().slice(0, 10),
        quantity: readAliasedField(row, ['quantity', 'Quantity', 'qty', 'amount', 'usage']) || '',
        unit: readAliasedField(row, ['unit', 'Unit', 'uom', 'measurement']) || getDefaultUnit(activityType),
        jurisdictionCountry: normalizeCountry(readAliasedField(row, [
          'jurisdictionCountry',
          'Jurisdiction Country',
          'Country',
          'country',
        ])),
        jurisdictionRegion: normalizeProvince(readAliasedField(row, [
          'jurisdictionRegion',
          'Jurisdiction Region',
          'Province',
          'province',
          'Jurisdiction',
          'jurisdiction',
          'Region',
          'region',
          'State/Province',
          'Facility Province',
          'facilityProvince',
        ])),
        facilityName: readAliasedField(row, ['Facility', 'facility', 'facilityName', 'Facility Name']),
        sourceReference: readAliasedField(row, ['Source Reference', 'sourceReference', 'reference']),
        notes: readAliasedField(row, ['Notes', 'notes']),
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
  const countryIndex = findColumnIndex(headers, ['country', 'jurisdictionCountry', 'jurisdiction country']);
  const provinceIndex = findColumnIndex(headers, [
    'province',
    'jurisdiction',
    'jurisdictionRegion',
    'jurisdiction region',
    'region',
    'state',
    'state/province',
    'facilityProvince',
    'facility province',
  ]);
  const facilityIndex = findColumnIndex(headers, ['facility', 'facilityName', 'facility name']);
  const sourceReferenceIndex = findColumnIndex(headers, ['sourceReference', 'source reference', 'reference']);
  const notesIndex = findColumnIndex(headers, ['notes', 'note']);

  if (activityTypeIndex === -1 || quantityIndex === -1) {
    alert('CSV must include at least activity type and quantity columns.');
    return;
  }

  const importedRows = lines.slice(1).map((line) => {
    const cols = line.split(',').map((v) => v.trim());
    const activityType = normalizeActivityType(cols[activityTypeIndex] || '');

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
      jurisdictionCountry: normalizeCountry(countryIndex >= 0 ? cols[countryIndex] : 'Canada'),
      jurisdictionRegion: normalizeProvince(provinceIndex >= 0 ? cols[provinceIndex] : ''),
      facilityName: facilityIndex >= 0 ? cols[facilityIndex] : '',
      sourceReference: sourceReferenceIndex >= 0 ? cols[sourceReferenceIndex] : '',
      notes: notesIndex >= 0 ? cols[notesIndex] : '',
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
  if (row.recordDate && Number.isNaN(new Date(row.recordDate).getTime())) {
    errors.push('Invalid date');
  }
  if (!row.quantity) errors.push('Missing quantity');
  if (!Number.isFinite(Number(row.quantity)) || Number(row.quantity) <= 0) {
    errors.push('Quantity must be greater than 0');
  }
  if (!row.unit) errors.push('Missing unit');

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
    jurisdictionCountry: normalizeOptional(row.jurisdictionCountry) ?? 'Canada',
    jurisdictionRegion: normalizeOptional(row.jurisdictionRegion),
    facilityId: normalizeOptional(row.facilityId),
    recordYear: row.recordDate ? new Date(row.recordDate).getUTCFullYear() : undefined,
    sourceType: entrySourceType,
    sourceReference: normalizeOptional(row.sourceReference) ?? entrySourceType.toLowerCase(),
    notes: [
      row.notes,
      row.facilityName ? `Facility: ${row.facilityName}` : '',
      `Created from ${entrySourceType}. Calculation status: ${getCalculationStatusLabel(row)}. ${row.calculationMessage ?? ''} Matched factor: ${row.factorName ?? 'N/A'} (${row.factorValue ?? 'N/A'})`,
    ].filter(Boolean).join(' '),
  };
}

function normalizeOptional(value?: string | null) {
  const normalized = String(value ?? '').trim();
  return normalized ? normalized : undefined;
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
    jurisdictionCountry: 'Canada',
    jurisdictionRegion: '',
    facilityId: '',
    facilityName: '',
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

function getCalculationStatusLabel(row: Row) {
  switch (row.calculationStatus) {
    case 'calculated':
      return 'Calculated';
    case 'trackedMetric':
      return 'Tracked Metric';
    case 'invalidUnit':
      return 'Invalid Unit';
    case 'missingFactor':
      return 'Missing Factor';
    case 'missingJurisdiction':
      return 'Missing Province';
    case 'needsReview':
      return 'Needs Review';
    default:
      return 'Needs Review';
  }
}

function getStatusTone(row: Row): StatusTone {
  if (row.calculationStatus === 'calculated') return 'success';
  if (row.calculationStatus === 'trackedMetric') return 'info';
  if (row.calculationStatus === 'invalidUnit' || row.calculationStatus === 'missingFactor' || row.calculationStatus === 'missingJurisdiction') return 'warning';
  return 'neutral';
}

function getSavedReviewLabel(row: Row) {
  const status = getCalculationStatusLabel(row);
  return status === 'Calculated' ? 'Saved · Calculated' : `Saved · ${status}`;
}

function buildImportReviewSummary(rows: Row[]) {
  const activeRows = rows.filter((row) => !isRowCompletelyEmpty(row));

  return activeRows.reduce(
    (summary, row) => {
      const errors = validateRow(row);
      summary.total += 1;
      if (errors.some((error) => error.toLowerCase().includes('date'))) summary.missingDate += 1;
      if (errors.some((error) => error.toLowerCase().includes('quantity'))) summary.missingQuantity += 1;
      if (row.calculationStatus === 'trackedMetric') summary.tracked += 1;
      if (row.calculationStatus === 'invalidUnit') summary.invalidUnit += 1;
      if (row.calculationStatus === 'missingJurisdiction') summary.missingProvince += 1;

      if (errors.length === 0 && row.calculationStatus === 'calculated') {
        summary.ready += 1;
      } else if (errors.length > 0 || row.calculationStatus !== 'calculated') {
        summary.review += 1;
      }

      return summary;
    },
    {
      total: 0,
      ready: 0,
      tracked: 0,
      review: 0,
      missingDate: 0,
      missingQuantity: 0,
      invalidUnit: 0,
      missingProvince: 0,
    },
  );
}

function renderStatusCell(row: Row) {
  if (row.status === 'saved') {
    return (
      <div style={{ display: 'grid', gap: 4 }}>
        <span style={statusBadgeStyle(getStatusTone(row))}>{getSavedReviewLabel(row)}</span>
        {row.calculationStatus !== 'calculated' && row.calculationMessage ? (
          <span style={statusMessageStyle}>{row.calculationMessage}</span>
        ) : null}
      </div>
    );
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

  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <span style={draftBadgeStyle(getStatusTone(row))}>
        {row.calculationStatus && row.calculationStatus !== 'calculated'
          ? `Draft · ${getCalculationStatusLabel(row)}`
          : 'Draft'}
      </span>
      {row.calculationStatus && row.calculationStatus !== 'calculated' && row.calculationMessage ? (
        <span style={statusMessageStyle}>{row.calculationMessage}</span>
      ) : null}
    </div>
  );
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

  if (row.calculationStatus === 'trackedMetric') {
    return (
      <div style={{ color: '#0369a1', fontSize: 12, lineHeight: 1.45 }}>
        <strong>Tracked metric</strong>
        <br />
        No emissions factor required by default.
        <br />
        {row.calculationMessage}
      </div>
    );
  }

  if (row.calculationStatus === 'invalidUnit') {
    return (
      <div style={{ color: '#b45309', fontSize: 12, lineHeight: 1.45 }}>
        <strong>No valid factor match</strong>
        <br />
        Reason: Invalid unit
        {row.supportedUnits?.length ? (
          <>
            <br />
            Supported unit: {row.supportedUnits.join(', ')}
          </>
        ) : null}
      </div>
    );
  }

  if (row.calculationStatus === 'missingJurisdiction') {
    return (
      <div style={{ color: '#b45309', fontSize: 12, lineHeight: 1.45 }}>
        <strong>Missing Province</strong>
        <br />
        Electricity emissions require province-specific factor matching.
        {row.calculationMessage ? (
          <>
            <br />
            {row.calculationMessage}
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ color: '#be123c', fontSize: 12, lineHeight: 1.45 }}>
      <strong>No valid factor match</strong>
      <br />
      Reason: Missing factor
      {row.calculationMessage ? (
        <>
          <br />
          {row.calculationMessage}
        </>
      ) : null}
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

function clearSavedRowsFromForm() {
  setRows((prev) => prev.filter((row) => row.status !== 'saved'));
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

function readAliasedField(row: Record<string, unknown>, aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeHeader);
  const key = Object.keys(row).find((candidate) =>
    normalizedAliases.includes(normalizeHeader(candidate)),
  );
  const value = key ? row[key] : undefined;
  return String(value ?? '').trim();
}

function normalizeProvince(value?: string | null) {
  return normalizeJurisdictionRegion(value) ?? '';
}

function normalizeCountry(value?: string | null) {
  const raw = String(value ?? '').trim();
  if (!raw) return 'Canada';
  if (['ca', 'can', 'canada'].includes(raw.toLowerCase())) return 'Canada';
  return raw;
}

function findFacilityByName(name: string | undefined, facilities: FacilityItem[]) {
  const normalizedName = String(name ?? '').trim().toLowerCase();
  if (!normalizedName) return undefined;

  return facilities.find((facility) =>
    facility.name.trim().toLowerCase() === normalizedName,
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
    .map(([activityType, recordDate, quantity, unit, country, province, facilityName]) => {
      const type = normalizeActivityType(activityType || '');

      return {
        id: Math.random().toString(),
        activityType: type,
        recordDate: recordDate || new Date().toISOString().slice(0, 10),
        quantity: quantity || '',
        unit: unit || getDefaultUnit(type),
        jurisdictionCountry: normalizeCountry(country || 'Canada'),
        jurisdictionRegion: normalizeProvince(province || ''),
        facilityName: facilityName || '',
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
    const saved = row.savedActivityId
      ? await updateActivityData(row.savedActivityId, buildActivityPayload(row))
      : await createActivityData(buildActivityPayload(row));
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
      const saved = row.savedActivityId
        ? await updateActivityData(row.savedActivityId, buildActivityPayload(row))
        : await createActivityData(buildActivityPayload(row));
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
const hasSavedRows = rows.some((row) => row.status === 'saved');
const importReviewSummary = buildImportReviewSummary(rows);

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
      {hasSavedRows ? (
        <p style={savedRowsHelperStyle}>
          Saved rows remain here so you can review, edit, or remove them before viewing metrics.
        </p>
      ) : null}
      {importReviewSummary.total > 0 ? (
        <div style={importReviewSummaryStyle}>
          <strong>Import Review Summary</strong>
          <span>{importReviewSummary.total} records found</span>
          <span>{importReviewSummary.ready} ready for calculation</span>
          <span>{importReviewSummary.tracked} tracked metric</span>
          <span>{importReviewSummary.review} requires review</span>
          <span>{importReviewSummary.missingDate} missing date</span>
          <span>{importReviewSummary.missingQuantity} missing quantity</span>
          <span>{importReviewSummary.invalidUnit} invalid unit</span>
          <span>{importReviewSummary.missingProvince} missing province</span>
        </div>
      ) : null}
      {rows.some((row) => row.calculationStatus === 'missingJurisdiction') ? (
        <div style={bulkProvinceStyle}>
          <label style={{ fontWeight: 800 }}>
            Set province for electricity rows needing province
          </label>
          <select
            value={bulkProvince}
            onChange={(event) => setBulkProvince(event.target.value)}
            style={inputStyle}
          >
            <option value="">Select province</option>
            <option value="British Columbia">British Columbia</option>
            <option value="Alberta">Alberta</option>
            <option value="Ontario">Ontario</option>
          </select>
          <button
            type="button"
            disabled={!bulkProvince}
            onClick={() => {
              setRows((prev) =>
                prev.map((row) =>
                  row.calculationStatus === 'missingJurisdiction'
                    ? applyFactorToRow({ ...row, jurisdictionRegion: bulkProvince, status: 'draft', errors: undefined })
                    : row,
                ),
              );
              setBulkProvince('');
            }}
            style={secondaryButtonStyle}
          >
            Apply
          </button>
        </div>
      ) : null}
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
          <th style={thStyle}>Country</th>
          <th style={thStyle}>Province</th>
          <th style={thStyle}>Facility</th>
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
              <input
                value={row.jurisdictionCountry}
                onChange={(e) => updateRow(row.id, 'jurisdictionCountry', e.target.value)}
                placeholder="Canada"
                style={inputStyle}
              />
            </td>
            <td style={tdStyle}>
              <input
                value={row.jurisdictionRegion}
                onChange={(e) => updateRow(row.id, 'jurisdictionRegion', e.target.value)}
                placeholder="Province"
                style={inputStyle}
              />
              {row.activityType === 'ELECTRICITY' ? (
                <div style={fieldHelperStyle}>
                  Electricity factors are province-specific. Please provide the province or facility location.
                </div>
              ) : null}
            </td>
            <td style={tdStyle}>
              <input
                value={row.facilityName ?? ''}
                onChange={(e) => updateRow(row.id, 'facilityName', e.target.value)}
                placeholder="Facility"
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

  <div style={footerActionsStyle}>
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
    {hasSavedRows ? (
      <>
        <button type="button" onClick={clearSavedRowsFromForm} style={secondaryButtonStyle}>
          Clear Saved Rows from Form
        </button>
        <button
          type="button"
          onClick={() => {
            window.location.href = '/metrics-summary';
          }}
          style={secondaryButtonStyle}
        >
          View Metrics Summary
        </button>
        <button
          type="button"
          onClick={() => {
            window.location.href = '/activity-records';
          }}
          style={secondaryButtonStyle}
        >
          View Activity Records
        </button>
      </>
    ) : null}
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

const savedRowsHelperStyle: React.CSSProperties = {
  margin: '10px 0 0',
  color: '#047857',
  fontSize: 13,
  fontWeight: 700,
};

const importReviewSummaryStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px 12px',
  alignItems: 'center',
  marginTop: 12,
  padding: 12,
  borderRadius: 12,
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  color: '#334155',
  fontSize: 13,
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

const fieldHelperStyle: React.CSSProperties = {
  marginTop: 6,
  color: '#64748b',
  fontSize: 12,
  lineHeight: 1.35,
  maxWidth: 220,
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

const footerActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  marginTop: 16,
  flexWrap: 'wrap',
  alignItems: 'center',
};

const bulkProvinceStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  alignItems: 'center',
  flexWrap: 'wrap',
  padding: 12,
  marginTop: 12,
  borderRadius: 10,
  border: '1px solid #fed7aa',
  background: '#fff7ed',
  color: '#9a3412',
};

type StatusTone = 'success' | 'info' | 'warning' | 'neutral';

function statusBadgeStyle(tone: StatusTone): React.CSSProperties {
  const styles: Record<StatusTone, React.CSSProperties> = {
    success: {
      color: '#047857',
      background: '#ecfdf5',
      border: '1px solid #bbf7d0',
    },
    info: {
      color: '#0369a1',
      background: '#eff6ff',
      border: '1px solid #bfdbfe',
    },
    warning: {
      color: '#92400e',
      background: '#fffbeb',
      border: '1px solid #fde68a',
    },
    neutral: {
      color: '#475569',
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
    },
  };

  return {
    display: 'inline-flex',
    alignItems: 'center',
    width: 'fit-content',
    borderRadius: 999,
    padding: '3px 8px',
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: 'nowrap',
    ...styles[tone],
  };
}

function draftBadgeStyle(tone: StatusTone): React.CSSProperties {
  return {
    ...statusBadgeStyle(tone),
    opacity: 0.9,
  };
}

const statusMessageStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: 12,
  lineHeight: 1.35,
  maxWidth: 260,
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
