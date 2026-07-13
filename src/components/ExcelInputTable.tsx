
import { createActivityData, updateActivityData } from '../services/activityData';
import type { ReactNode } from 'react';
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
import {
  formatScopeClassification,
  inferDefaultScope,
} from '../utils/scopeClassification';
import {
  ELECTRICITY_FACTOR_PROVINCE_OPTIONS,
  getProvinceOptionsForActivity,
  normalizeProvince as normalizeCanadianProvince,
} from '../utils/province';
import { getFacilities, type FacilityItem } from '../services/facilities';
import {
  ManualEntryForm,
  type ManualEntryField,
} from './manual-entry/ManualEntryForm';
import { StatusBadge } from './shared/StatusBadge';
import { BulkProvinceToolbar } from './shared/BulkProvinceToolbar';

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
  const [bulkProvinceMessage, setBulkProvinceMessage] = useState('');
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
  return ['WATER', 'WATER_USAGE'].includes(String(activityType).toUpperCase());
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
        'Water usage is tracked as an operational metric and excluded from GHG emissions totals.',
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
  return row.status === 'saved' || row.status === 'saving' || isRowCompletelyEmpty(row);
}

function getRowSaveLabel(row: Row) {
  if (row.status === 'saving') return 'Saving...';
  if (row.status === 'saved') return 'Saved';
  return 'Save';
}

function buildActivityPayload(row: Row) {
  const isMissingElectricityProvince =
    row.activityType === 'ELECTRICITY' && row.calculationStatus === 'missingJurisdiction';

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
      isMissingElectricityProvince
        ? 'Requires Review. Status: MISSING_PROVINCE. excludedFromTotals=true. Province is required before this electricity record can be calculated.'
        : '',
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
      return 'Matched';
    case 'trackedMetric':
      return 'Not Emissions Factor Required';
    case 'invalidUnit':
      return 'Unit Mismatch';
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

function getSavedReviewLabel(row: Row) {
  if (row.calculationStatus === 'missingJurisdiction') return 'Requires Review';
  const status = getCalculationStatusLabel(row);
  return status === 'Matched' ? 'Saved · Matched' : `Saved · ${status}`;
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
  const summary = getRowStatusSummary(row);

  if (row.status === 'saved') {
    return (
      <div style={{ display: 'grid', gap: 4 }}>
        <StatusBadge
          status={row.calculationStatus ?? row.status}
          label={getSavedReviewLabel(row)}
        />
        {row.calculationStatus !== 'calculated' ? (
          <span style={statusMessageStyle}>{summary.detail}</span>
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
      <StatusBadge status={summary.badge} label={summary.badge} />
      <span style={statusMessageStyle}>{summary.detail}</span>
    </div>
  );
}

function renderFactorCell(row: Row) {
  if (isRowCompletelyEmpty(row) || !row.activityType) {
    return <span style={{ color: '#94a3b8', fontSize: 12 }}>-</span>;
  }

  if (row.factorStatus === 'matched') {
    const normalizedUnit = normalizeUnitForDisplay(row.unit).value || row.unit;
    const factorTitle =
      row.activityType === 'ELECTRICITY' && row.jurisdictionRegion
        ? `Electricity - ${row.jurisdictionRegion}`
        : row.factorName ?? 'Matched factor';

    return (
      <div style={factorCellTextStyle}>
        <strong>{factorTitle}</strong>
        <span>
          kgCO2e/{normalizedUnit} {row.factorSourceYear ? `· ${row.factorSourceYear}` : ''}
        </span>
      </div>
    );
  }

  if (row.calculationStatus === 'trackedMetric') {
    return (
      <div style={{ color: '#0369a1', fontSize: 12, lineHeight: 1.45 }}>
        <strong>Not Emissions Factor Required</strong>
        <br />
        Tracked only.
        <br />
        {row.calculationMessage}
      </div>
    );
  }

  if (row.calculationStatus === 'invalidUnit') {
    return (
      <div style={{ color: '#b45309', fontSize: 12, lineHeight: 1.45 }}>
        <strong>Unit Mismatch</strong>
        <br />
        Submitted unit does not match available factor units.
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
      <div style={factorCellTextStyle}>
        <strong>Not selected</strong>
        <span>Province required</span>
      </div>
    );
  }

  if (row.activityType === 'ELECTRICITY' && normalizeProvince(row.jurisdictionRegion)) {
    return (
      <div style={factorCellTextStyle}>
        <strong>No factor found</strong>
        <span>
          {normalizeProvince(row.jurisdictionRegion)} · {normalizeUnitForDisplay(row.unit).value || row.unit}
        </span>
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

function getRowStatusSummary(row: Row): { badge: string; detail: string } {
  if (row.activityType === 'ELECTRICITY') {
    if (row.calculationStatus === 'missingJurisdiction') {
      return {
        badge: 'Missing Province',
        detail: row.status === 'saved'
          ? 'Province is required before this electricity record can be calculated.'
          : 'Select province to calculate.',
      };
    }

    if (row.calculationStatus === 'missingFactor') {
      return {
        badge: 'Missing Factor',
        detail: 'No factor for selected province/year.',
      };
    }

    if (row.calculationStatus === 'calculated') {
      const province = normalizeProvince(row.jurisdictionRegion);
      return {
        badge: 'Matched',
        detail: `${province || 'Province'} electricity factor matched.`,
      };
    }
  }

  switch (row.calculationStatus) {
    case 'calculated':
      return { badge: 'Matched', detail: 'Factor matched.' };
    case 'trackedMetric':
      return { badge: 'Not Emissions Factor Required', detail: 'Tracked only, excluded from GHG totals.' };
    case 'invalidUnit':
      return { badge: 'Unit Mismatch', detail: 'Review unit before calculation.' };
    case 'missingFactor':
      return { badge: 'Missing Factor', detail: 'No matching factor found.' };
    case 'needsReview':
      return { badge: 'Requires Review', detail: 'Review before calculation.' };
    default:
      return { badge: 'Draft', detail: 'Complete row details.' };
  }
}

function getReportTreatment(row: Row) {
  if (row.calculationStatus === 'calculated') {
    return {
      label: 'Included',
      detail: 'Included in GHG total.',
    };
  }

  if (row.calculationStatus === 'trackedMetric') {
    return {
      label: 'Tracked Only',
      detail: 'Operational metric, excluded from GHG total.',
    };
  }

  if (row.calculationStatus === 'missingJurisdiction') {
    return {
      label: 'Excluded',
      detail: 'Province required before calculation.',
    };
  }

  if (row.calculationStatus === 'invalidUnit') {
    return {
      label: 'Excluded',
      detail: 'Unit mismatch must be reviewed.',
    };
  }

  if (row.calculationStatus === 'missingFactor') {
    return {
      label: 'Excluded',
      detail: 'No matching factor found.',
    };
  }

  return {
    label: 'Excluded',
    detail: 'Excluded until this record is ready.',
  };
}

function renderEmptyPreviewValue(helpText: string) {
  return (
    <div style={factorCellTextStyle}>
      <span style={previewEmptyValueStyle}>-</span>
      <span style={previewHelpTextStyle}>{helpText}</span>
    </div>
  );
}

function renderScopeCell(row: Row) {
  if (!hasRowStarted(row)) {
    return renderEmptyPreviewValue('Default scope appears after you select an activity type.');
  }

  const scope = inferDefaultScope(row.activityType);

  return (
    <div style={factorCellTextStyle}>
      <strong>{formatScopeClassification(scope)}</strong>
      <span>{scope === 'TRACKED_METRIC' ? 'Operational metric' : 'Default activity mapping'}</span>
    </div>
  );
}

function renderTreatmentCell(row: Row) {
  if (!hasRowStarted(row)) {
    return renderEmptyPreviewValue('Shows whether this row will be included, excluded, or tracked only.');
  }

  const treatment = getReportTreatment(row);

  return (
    <div style={factorCellTextStyle}>
      <StatusBadge status={treatment.label} label={treatment.label} />
      <span>{treatment.detail}</span>
    </div>
  );
}

function renderPreviewPanel(title: string, helpText: string, children: ReactNode) {
  return (
    <div style={draftReviewPanelStyle}>
      <div style={previewPanelHeaderStyle}>
        <span style={reviewPanelLabelStyle}>{title}</span>
        <span style={previewHelpTextStyle}>{helpText}</span>
      </div>
      {children}
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
      const normalizedValue =
        key === 'jurisdictionRegion'
          ? normalizeProvince(value)
          : key === 'jurisdictionCountry'
          ? normalizeCountry(value)
          : value;

      const updated = {
        ...row,
        [key]: normalizedValue,
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
  return normalizeCanadianProvince(value) ?? '';
}

function getProvinceOptions(currentProvince?: string | null) {
  return getProvinceOptionsForActivity(undefined, currentProvince);
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
const hasMissingElectricityProvince = rows.some(
  (row) => row.calculationStatus === 'missingJurisdiction',
);
const missingElectricityProvinceCount = rows.filter(
  (row) => row.calculationStatus === 'missingJurisdiction',
).length;

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
      {bulkProvinceMessage ? (
        <div role="status" style={bulkProvinceSuccessStyle}>
          {bulkProvinceMessage}
        </div>
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
    </div>
  </div>

  <div style={manualEntryToolbarStyle} aria-label="Manual entry toolbar">
    <div style={manualEntryToolbarRowStyle}>
      <div style={manualEntryToolbarGroupStyle}>
        <button type="button" onClick={addRow} style={secondaryButtonStyle}>
          + Add Row
        </button>
      </div>
    </div>

    <div style={manualEntryToolbarRowStyle}>
      <div style={manualEntryToolbarGroupStyle}>
        {hasMissingElectricityProvince ? (
          <BulkProvinceToolbar
            selectedCount={missingElectricityProvinceCount}
            eligibleCount={missingElectricityProvinceCount}
            selectedProvince={bulkProvince}
            onProvinceChange={setBulkProvince}
            provinceOptions={ELECTRICITY_FACTOR_PROVINCE_OPTIONS}
            onApply={() => {
              const normalizedBulkProvince = normalizeProvince(bulkProvince);
              setRows((prev) =>
                prev.map((row) =>
                  row.calculationStatus === 'missingJurisdiction'
                    ? applyFactorToRow({
                        ...row,
                        jurisdictionRegion: normalizedBulkProvince,
                        status: 'draft',
                        errors: undefined,
                      })
                    : row,
                ),
              );
              setBulkProvince('');
              setBulkProvinceMessage('Province applied to electricity rows.');
            }}
          />
        ) : null}
      </div>

      <div style={manualEntryToolbarGroupStyle}>
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
              Clear Saved Rows
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = '/metrics-summary';
              }}
              style={secondaryButtonStyle}
            >
              View Metrics
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = '/activity-records';
              }}
              style={secondaryButtonStyle}
            >
              View Records
            </button>
          </>
        ) : null}
      </div>
    </div>
  </div>

  <div style={manualEntryFormListStyle} onPaste={handlePasteRows} onKeyDown={handleQuickEntryKeyDown}>
    {rows.length === 0 ? (
      <>
        <div style={manualEntryFormTitleStyle}>
          <strong>Add activity record</strong>
          <span>
            Enter one activity record manually. Electricity records require province before emissions can be calculated.
          </span>
        </div>
        <div style={quickEntryEmptyStyle}>
          <strong>No activity rows.</strong>
          <span>Click "+ Add Row" to begin.</span>
        </div>
      </>
    ) : (
      <div style={draftRecordListStyle}>
        {rows.map((row, index) => (
          <ManualEntryForm
            key={row.id}
            values={row}
            rowNumber={index + 1}
            title={index === 0 ? 'Add activity record' : undefined}
            description={
              index === 0
                ? 'Enter one activity record manually. Electricity records require province before emissions can be calculated.'
                : undefined
            }
            activityTypes={activityTypes}
            provinceOptions={getProvinceOptions(row.jurisdictionRegion)}
            hasErrors={Boolean(row.errors?.length)}
            onChange={(field: ManualEntryField, value) => {
              if (field === 'activityType') {
                setRows((prev) =>
                  prev.map((currentRow) =>
                    currentRow.id === row.id
                      ? applyFactorToRow({
                          ...currentRow,
                          activityType: value,
                          unit: getDefaultUnit(value),
                          status: 'draft',
                          errors: undefined,
                        })
                      : currentRow,
                  ),
                );
                return;
              }

              updateRow(row.id, field as keyof Row, value);
            }}
            review={
              <div style={draftReviewRowStyle}>
                {renderPreviewPanel(
                  'Scope',
                  'GHG Protocol category inferred from activity type.',
                  renderScopeCell(row),
                )}
                {renderPreviewPanel(
                  'Factor Status',
                  'Whether this record is ready for emissions calculation.',
                  renderStatusCell(row),
                )}
                {renderPreviewPanel(
                  'Matched Factor',
                  'Conversion factor matched by type, unit, province, and year.',
                  renderFactorCell(row),
                )}
                {renderPreviewPanel(
                  'Report Treatment',
                  'How this row will affect totals after saving.',
                  renderTreatmentCell(row),
                )}
              </div>
            }
            onSave={() => saveRow(row)}
            saveDisabled={isRowSaveDisabled(row)}
            saveLabel={getRowSaveLabel(row)}
            canRemove={canRemoveRow(row)}
            onRemove={() => removeRow(row.id)}
          />
        ))}
      </div>
    )}
  </div>
  {hasMissingElectricityProvince ? (
    <div style={validationSummaryStyle}>
      Electricity emissions require a province-specific factor. Please select the province where the electricity was used.
    </div>
  ) : null}

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

const manualEntryFormListStyle: React.CSSProperties = {
  display: 'grid',
  gap: 12,
};

const manualEntryFormTitleStyle: React.CSSProperties = {
  display: 'grid',
  gap: 4,
  color: '#334155',
  fontSize: 13,
  lineHeight: 1.4,
};

const draftRecordListStyle: React.CSSProperties = {
  display: 'grid',
  gap: 12,
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

const draftReviewRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 10,
};

const draftReviewPanelStyle: React.CSSProperties = {
  padding: 10,
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
};

const manualEntryToolbarStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  padding: 12,
  marginBottom: 14,
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
};

const manualEntryToolbarRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
  width: '100%',
};

const manualEntryToolbarGroupStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
};

const bulkProvinceSuccessStyle: React.CSSProperties = {
  width: 'fit-content',
  marginTop: 10,
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #bbf7d0',
  background: '#ecfdf5',
  color: '#047857',
  fontSize: 13,
  fontWeight: 800,
};

const validationSummaryStyle: React.CSSProperties = {
  marginTop: 12,
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #fed7aa',
  background: '#fff7ed',
  color: '#9a3412',
  fontSize: 13,
  lineHeight: 1.45,
};

const statusMessageStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: 12,
  lineHeight: 1.35,
  maxWidth: 170,
};

const factorCellTextStyle: React.CSSProperties = {
  display: 'grid',
  gap: 4,
  color: '#334155',
  fontSize: 12,
  lineHeight: 1.35,
};

const previewPanelHeaderStyle: React.CSSProperties = {
  display: 'grid',
  gap: 3,
};

const reviewPanelLabelStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: 11,
  fontWeight: 800,
  textTransform: 'uppercase',
};

const previewHelpTextStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: 11,
  lineHeight: 1.35,
};

const previewEmptyValueStyle: React.CSSProperties = {
  color: '#94a3b8',
  fontSize: 12,
  fontWeight: 700,
};
