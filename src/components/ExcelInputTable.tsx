
import { createActivityData, updateActivityData } from '../services/activityData';
import {
  saveSpreadsheetReviewRows,
  type SpreadsheetReviewIssue,
  type SpreadsheetReviewRowInput,
  type SpreadsheetReviewRowStatus,
} from '../services/spreadsheetReviewRows';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { getAllConversionFactors } from '../services/conversionFactors';
import {
  activityTypes,
  getDefaultUnitForActivityType,
} from '../constants/activityTypes';
import * as XLSX from 'xlsx';
import {
  buildFactorUnitMismatchMessage,
  findBestConversionFactorMatch,
  getCompatibleFactorUnitLabels,
  getFactorResultUnit,
  getFactorSourceAuthority,
  getFactorSourceYear,
  getFactorValue,
  normalizeActivityType,
  normalizeFactorActivityType,
  normalizeJurisdictionRegion,
  resolveActivityYear,
} from '../utils/conversionFactorMatching';
import {
  buildMatchedFactorSnapshot,
  getFactorAssumptionDisclosure,
  getFactorCredibilityBadges,
  getFactorVersionLabel,
} from '../utils/factorCredibility';
import { canImportActivityRecords } from '../utils/permissions';
import {
  getCurrentUser,
  getOrganizationId,
} from '../services/auth';
import { normalizeUnitForDisplay } from '../utils/unitNormalization';
import {
  formatScopeClassification,
  inferDefaultScope,
} from '../utils/scopeClassification';
import {
  ELECTRICITY_FACTOR_PROVINCE_OPTIONS,
  normalizeProvince as normalizeCanadianProvince,
} from '../utils/province';
import {
  formatDateOnly,
  getDateOnlyYear,
  getTodayDateOnly,
  isValidDateOnly,
} from '../utils/dateOnly';
import { getActivityTypeLabel } from '../utils/activityType';
import { getFacilities, type FacilityItem } from '../services/facilities';
import {
  ManualEntryForm,
  type ManualEntryField,
} from './manual-entry/ManualEntryForm';
import { StatusBadge } from './shared/StatusBadge';
import { BulkProvinceToolbar } from './shared/BulkProvinceToolbar';
import { useToast } from './Toast';
import { useAppDialog } from './AppDialog';
import { getUserFriendlyErrorMessage } from '../utils/userFriendlyErrors';
import { formatReportFactorUnit } from '../utils/reportCredibility';
import { getActivitySourceType } from '../utils/activitySourceType';
import { formatCount, formatEmissionsUnit } from '../utils/numberFormatting';

type Row = {
  id: string;
  origin?: 'MANUAL' | 'CSV' | 'EXCEL' | 'PASTE';
  importBatchId?: string;
  activityType: string;
  quantity: string;
  unit: string;
  recordDate: string;
  jurisdictionCountry: string;
  jurisdictionRegion: string;
  facilityId?: string;
  facilityName?: string;
  sourceReference?: string;
  sourceFileName?: string;
  sourceSheetName?: string;
  sourceRow?: string | number;
  costCad?: string | number;
  costCurrency?: string;
  rawRecordDate?: unknown;
  rawQuantity?: string;
  rawActivityType?: string;
  rawSourceRow?: Record<string, unknown>;
  notes?: string;
  factorId?: string;
  factorName?: string;
  factorValue?: string | number;
  factorSourceLabel?: string;
  factorSourceAuthority?: string;
  factorSourceDocument?: string;
  factorSourceYear?: string | number | null;
  factorVersion?: string;
  factorConfidenceLevel?: string;
  factorVerificationStatus?: string;
  factorAssumptions?: string;
  factorCredibilityBadges?: string[];
  factorYearFallback?: boolean;
  factorResultUnit?: string;
  factorStatus?: 'matched' | 'missing';
  calculationStatus?: 'calculated' | 'invalidUnit' | 'missingFactor' | 'missingJurisdiction' | 'trackedMetric' | 'needsReview';
  calculationMessage?: string;
  supportedUnits?: string[];
  errors?: string[];
  status?: 'draft' | 'saved' | 'error' | 'saving';
  savedActivityId?: string;
};

const SITE_FACILITY_ALIASES = [
  'Facility',
  'facility',
  'facilityName',
  'Facility Name',
  'site',
  'Site',
  'siteName',
  'Site Name',
  'location',
  'Location',
  'branch',
  'Branch',
  'factory',
  'Factory',
];

export function normalizeSpreadsheetDate(value: unknown) {
  if (value === undefined || value === null || value === '') return '';

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const day = String(value.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return '';

    const year = Number(parsed.y);
    const month = Number(parsed.m);
    const day = Number(parsed.d);

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      return '';
    }

    return [
      String(year).padStart(4, '0'),
      String(month).padStart(2, '0'),
      String(day).padStart(2, '0'),
    ].join('-');
  }

  const text = String(value).trim();
  const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/);
  if (isoDate) return `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`;

  return '';
}

function normalizeSpreadsheetText(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

function isSpreadsheetSummaryLabel(value: unknown) {
  const text = normalizeSpreadsheetText(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

  return ['TOTAL', 'SUBTOTAL', 'SUB TOTAL', 'GRAND TOTAL', 'SUMMARY'].includes(text);
}

function hasSpreadsheetNonActivitySignal(row: Pick<Row, 'rawRecordDate' | 'sourceReference' | 'notes'>) {
  return [row.rawRecordDate, row.sourceReference, row.notes].some((value) => {
    const text = normalizeSpreadsheetText(value)
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();

    return (
      isSpreadsheetSummaryLabel(value) ||
      /\b(SUBTOTAL|SUB TOTAL|GRAND TOTAL|TOTAL|SUMMARY)\b/.test(text) ||
      /\bHEADER[- ]?LIKE\b/.test(text)
    );
  });
}

function isNonActivitySpreadsheetRow(
  row: Pick<Row, 'activityType' | 'rawActivityType' | 'recordDate' | 'rawRecordDate' | 'unit' | 'sourceReference' | 'notes'>,
) {
  if (row.activityType || normalizeSpreadsheetText(row.rawActivityType) || row.recordDate || normalizeSpreadsheetText(row.unit)) {
    return false;
  }

  return hasSpreadsheetNonActivitySignal(row);
}

function createSpreadsheetImportBatchId(fileName: string) {
  const randomId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  return `spreadsheet-${fileName}-${Date.now()}-${randomId}`;
}

const SPREADSHEET_HEADER_ALIASES = [
  'activityType',
  'Activity Type',
  'type',
  'activity',
  'recordDate',
  'Record Date',
  'date',
  'Date',
  'quantity',
  'Quantity',
  'qty',
  'amount',
  'usage',
  'unit',
  'Unit',
  'uom',
  'measurement',
  'province',
  'Province',
  'sourceReference',
  'Source Reference',
  'costCad',
  'Cost CAD',
  'cost',
  'Cost',
  'currency',
  'Currency',
  'site',
  'Site',
  'facility',
  'Facility',
];

function getSpreadsheetHeaderScore(row: unknown[]) {
  const normalizedKnownHeaders = new Set(SPREADSHEET_HEADER_ALIASES.map(normalizeHeader));
  return row.reduce((score, cell) => {
    const text = String(cell ?? '').trim();
    return text && normalizedKnownHeaders.has(normalizeHeader(text)) ? score + 1 : score;
  }, 0);
}

function getSpreadsheetHeaderRowIndex(rows: unknown[][]) {
  const scoredRows = rows.map((row, index) => ({
    index,
    score: getSpreadsheetHeaderScore(row),
  }));
  const best = scoredRows.reduce(
    (current, next) => (next.score > current.score ? next : current),
    { index: 0, score: 0 },
  );

  return best.score >= 2 ? best.index : 0;
}

function buildSpreadsheetObjectsFromWorksheet(worksheet: XLSX.WorkSheet) {
  const sheetRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    defval: '',
    header: 1,
    raw: true,
  });
  const headerRowIndex = getSpreadsheetHeaderRowIndex(sheetRows);
  const headers = (sheetRows[headerRowIndex] ?? []).map((header) => String(header ?? '').trim());

  return sheetRows
    .slice(headerRowIndex + 1)
    .map((values, index) => {
      const row: Record<string, unknown> = {};
      headers.forEach((header, cellIndex) => {
        if (header) row[header] = values[cellIndex] ?? '';
      });

      return {
        row,
        sourceRow: headerRowIndex + index + 2,
      };
    })
    .filter(({ row }) =>
      Object.values(row).some((value) => String(value ?? '').trim()),
    );
}

type ExcelInputTableMode = 'spreadsheet' | 'manual';

export function ExcelInputTable({
  onSuccess,
  mode = 'manual',
}: {
  onSuccess: (result?: {
    source: 'manual' | 'spreadsheet';
    sourceDocumentId?: string;
  }) => void | Promise<void>;
  mode?: ExcelInputTableMode;
}) {
  const canImportRows = canImportActivityRecords(getCurrentUser());
  const toast = useToast();
  const { showError } = useAppDialog();
  const [rows, setRows] = useState<Row[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const dragDepthRef = useRef(0);
  const spreadsheetFileInputRef = useRef<HTMLInputElement>(null);
  const [entrySourceType, setEntrySourceType] = useState<'MANUAL' | 'CSV' | 'EXCEL' | 'PASTE'>('MANUAL');
  const [bulkProvince, setBulkProvince] = useState('');
  const [bulkProvinceMessage, setBulkProvinceMessage] = useState('');
  const [facilities, setFacilities] = useState<FacilityItem[]>([]);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const isSpreadsheetMode = mode === 'spreadsheet';
  useEffect(() => {
  async function loadReferenceData() {
    try {
      const [factorItems, facilityData] = await Promise.all([
        getAllConversionFactors(),
        getFacilities().catch(() => []),
      ]);
      setConversionFactors(factorItems ?? []);
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
  if (!canImportRows) {
    showError({
      title: 'Permission required',
      message: 'You do not have permission to perform this action.',
    });
    return;
  }

  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.csv')) {
    importCSVFile(file);
    return;
  }

  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    importExcelFile(file);
    return;
  }

  showError({
    title: 'Unsupported file type',
    message: 'Please drop or select a CSV or Excel file.',
  });
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
  if (!canImportRows) {
    showError({
      title: 'Permission required',
      message: 'You do not have permission to perform this action.',
    });
    return;
  }

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

  const recordYear = resolveActivityYear({ recordDate: row.recordDate }).year;
  const matchInput = {
    activityType,
    inputUnit: unit,
    jurisdictionCountry: row.jurisdictionCountry,
    jurisdictionRegion: row.jurisdictionRegion,
    recordYear,
    organizationId: getOrganizationId(getCurrentUser()),
    allowPlaceholderConfidence: true,
    factors: conversionFactors,
  };
  return findBestConversionFactorMatch(matchInput);
}

function getSupportedUnitsForActivityType(activityType: string) {
  const normalizedActivityType = normalizeActivityType(activityType);
  const units = conversionFactors
    .filter((factor) => normalizeFactorActivityType(factor) === normalizedActivityType)
    .map((factor) => factor.inputUnit || factor.unit)
    .filter((unit): unit is string => Boolean(unit));

  return Array.from(new Set(units)).sort((a, b) => a.localeCompare(b));
}

function isTrackedMetricActivity(activityType: string) {
  return ['WATER', 'WATER_USAGE'].includes(String(activityType).toUpperCase());
}

function getRowCalculationReview(
  row: Pick<Row, 'activityType' | 'unit' | 'jurisdictionCountry' | 'jurisdictionRegion' | 'recordDate'>,
) {
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
  const activityTypeLabel = getActivityTypeLabel(row.activityType);
  const recordYear = resolveActivityYear({ recordDate: row.recordDate }).year;
  if (normalizedUnit.status !== 'valid') {
    return {
      calculationStatus: 'invalidUnit' as const,
      calculationMessage: `Unit '${row.unit}' could not be matched to a supported ${activityTypeLabel} factor unit.${supportedUnits.length ? ` Supported unit: ${supportedUnits.join(', ')}.` : ''}`,
      supportedUnits,
    };
  }

  const normalizedSupportedUnits = supportedUnits.map((unit) => normalizeUnitForDisplay(unit).value);
  if (supportedUnits.length > 0 && !normalizedSupportedUnits.includes(normalizedUnit.value)) {
    const compatibleUnits = getCompatibleFactorUnitLabels({
      activityType: row.activityType,
      inputUnit: normalizedUnit.value,
      jurisdictionCountry: row.jurisdictionCountry,
      jurisdictionRegion: row.jurisdictionRegion,
      recordYear,
      organizationId: getOrganizationId(getCurrentUser()),
      allowPlaceholderConfidence: true,
      factors: conversionFactors,
    }).filter((unit) => unit.toLowerCase() !== normalizedUnit.value.toLowerCase());

    return {
      calculationStatus: 'invalidUnit' as const,
      calculationMessage: compatibleUnits.length > 0
        ? buildFactorUnitMismatchMessage({
          activityType: row.activityType,
          inputUnit: normalizedUnit.value,
          availableUnits: compatibleUnits,
        })
        : `Unit '${row.unit}' could not be matched to a supported ${activityTypeLabel} factor unit.${supportedUnits.length ? ` Supported unit: ${supportedUnits.join(', ')}.` : ''}`,
      supportedUnits,
    };
  }

  return {
    calculationStatus: 'missingFactor' as const,
    calculationMessage: `No conversion factor found for ${activityTypeLabel} / ${normalizedUnit.value}. This record was saved but excluded from emissions totals.`,
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
      factorSourceDocument: undefined,
      factorSourceYear: undefined,
      factorVersion: undefined,
      factorConfidenceLevel: undefined,
      factorVerificationStatus: undefined,
      factorAssumptions: undefined,
      factorCredibilityBadges: undefined,
      factorYearFallback: undefined,
      factorResultUnit: undefined,
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
  const review = getRowCalculationReview(normalizedRow);

  if (review.calculationStatus === 'trackedMetric') {
    return {
      ...normalizedRow,
      factorId: undefined,
      factorName: undefined,
      factorValue: undefined,
      factorSourceLabel: undefined,
      factorSourceAuthority: undefined,
      factorSourceDocument: undefined,
      factorSourceYear: undefined,
      factorVersion: undefined,
      factorConfidenceLevel: undefined,
      factorVerificationStatus: undefined,
      factorAssumptions: undefined,
      factorCredibilityBadges: undefined,
      factorYearFallback: undefined,
      factorResultUnit: undefined,
      factorStatus: undefined,
      ...review,
    };
  }

  const match = findMatchingFactor(normalizedRow);

  if (!match) {
    return {
      ...normalizedRow,
      factorId: undefined,
      factorName: undefined,
      factorValue: undefined,
      factorSourceLabel: undefined,
      factorSourceAuthority: undefined,
      factorSourceDocument: undefined,
      factorSourceYear: undefined,
      factorVersion: undefined,
      factorConfidenceLevel: undefined,
      factorVerificationStatus: undefined,
      factorAssumptions: undefined,
      factorCredibilityBadges: undefined,
      factorYearFallback: undefined,
      factorResultUnit: undefined,
      factorStatus: 'missing',
      ...review,
    };
  }

  const { factor } = match;

  return {
    ...normalizedRow,
    factorId: factor.id,
    factorName: factor.name,
    factorValue: getFactorValue(factor),
    factorSourceLabel: match.sourceLabel,
    factorSourceAuthority: getFactorSourceAuthority(factor),
    factorSourceDocument: buildMatchedFactorSnapshot(match).matchedFactorSourceDocument,
    factorSourceYear: match.factorYear ?? getFactorSourceYear(factor),
    factorVersion: getFactorVersionLabel(factor),
    factorConfidenceLevel: buildMatchedFactorSnapshot(match).matchedFactorConfidenceLevel,
    factorVerificationStatus: buildMatchedFactorSnapshot(match).matchedFactorVerificationStatus,
    factorAssumptions: getFactorAssumptionDisclosure(row.activityType, factor),
    factorCredibilityBadges: getFactorCredibilityBadges(row.activityType, factor),
    factorYearFallback: match.usedPriorYearFallback,
    factorResultUnit: getFactorResultUnit(factor),
    factorStatus: 'matched',
    calculationStatus: 'calculated',
    calculationMessage: match.usedProxyFactor && match.proxyReason
      ? `Proxy factor · Review recommended. ${match.proxyReason}`
      : match.usedPriorYearFallback && match.factorYear
      ? `Matched factor. Using latest available factor year: ${match.factorYear}.`
      : 'Matched factor. This row can be included in emissions totals.',
    supportedUnits: getSupportedUnitsForActivityType(row.activityType),
  };
}
function importExcelFile(file: File) {
  const importBatchId = createSpreadsheetImportBatchId(file.name);

  function importWorkbookData(result: ArrayBuffer) {
    const data = new Uint8Array(result);
    const workbook = XLSX.read(data, { type: 'array', cellDates: false });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const workbookRows = buildSpreadsheetObjectsFromWorksheet(worksheet);

    const importedRows = workbookRows.map(({ row, sourceRow }) => {
      const activityType =
        normalizeActivityType(readAliasedField(row, ['activityType', 'Activity Type', 'type', 'activity'])) || '';
      const rawActivityType = readAliasedField(row, ['activityType', 'Activity Type', 'type', 'activity']);
      const rawRecordDate = readAliasedRawField(row, [
        'recordDate',
        'Record Date',
        'date',
        'Date',
        'Service Date',
        'Activity Date',
        'Reporting Date',
      ]);
      const recordDate = normalizeSpreadsheetDate(rawRecordDate);
      const rawQuantity = readAliasedField(row, ['quantity', 'Quantity', 'qty', 'amount', 'usage']);
      const sourceReference = readAliasedField(row, ['Source Reference', 'sourceReference', 'reference']);
      const costCad = readAliasedField(row, [
        'Cost CAD',
        'costCad',
        'costCAD',
        'amountCad',
        'Amount CAD',
        'cost',
        'Cost',
      ]);
      const costCurrency =
        readAliasedField(row, ['Currency', 'currency', 'Cost Currency', 'costCurrency']) ||
        (costCad ? 'CAD' : '');

      const importedRow = {
        id: Math.random().toString(),
        origin: 'EXCEL' as const,
        importBatchId,
        activityType,
        rawActivityType,
        recordDate,
        rawRecordDate,
        quantity: rawQuantity,
        rawQuantity,
        unit: readAliasedField(row, ['unit', 'Unit', 'uom', 'measurement']) || '',
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
        facilityName: readAliasedField(row, SITE_FACILITY_ALIASES),
        sourceReference,
        sourceFileName: file.name,
        sourceSheetName: sheetName,
	        sourceRow,
        costCad,
        costCurrency,
        rawSourceRow: row,
        notes: readAliasedField(row, ['Notes', 'notes']),
      };

      return importedRow;
    });

   setRows(
  importedRows.length
    ? importedRows.map(applyFactorToRow)
    : [],
);
  }

  if (typeof file.arrayBuffer === 'function') {
    file.arrayBuffer()
      .then(importWorkbookData)
      .catch((err) => {
        if (import.meta.env.DEV) {
          console.error('Spreadsheet import failed', err);
        }
        showError({
          title: 'Unable to import spreadsheet',
          message: 'We could not read this Excel file. Please check the file and try again.',
        });
      });
  } else {
    const reader = new FileReader();
    reader.onload = (e) => {
      importWorkbookData(e.target?.result as ArrayBuffer);
    };
    reader.readAsArrayBuffer(file);
  }
  setEntrySourceType('EXCEL');
}
function parseCSVText(text: string) {
  const lines = text.split(/\r?\n/).filter(Boolean);

  if (lines.length < 2) {
    showError({
      title: 'Unable to import CSV',
      message: 'CSV must include a header row and at least one data row.',
    });
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
  const facilityIndex = findColumnIndex(headers, [
    'facility',
    'facilityName',
    'facility name',
    'site',
    'siteName',
    'site name',
    'location',
    'branch',
    'factory',
  ]);
  const sourceReferenceIndex = findColumnIndex(headers, ['sourceReference', 'source reference', 'reference']);
  const costCadIndex = findColumnIndex(headers, [
    'costCad',
    'cost CAD',
    'costCAD',
    'amountCad',
    'amount CAD',
    'cost',
  ]);
  const costCurrencyIndex = findColumnIndex(headers, ['currency', 'costCurrency', 'cost currency']);
  const notesIndex = findColumnIndex(headers, ['notes', 'note']);

  if (activityTypeIndex === -1 || quantityIndex === -1) {
    showError({
      title: 'Unable to import CSV',
      message: 'CSV must include at least activity type and quantity columns.',
    });
    return;
  }

  const importBatchId = createSpreadsheetImportBatchId('csv-paste-import.csv');
  const importedRows = lines.slice(1).map((line) => {
    const cols = line.split(',').map((v) => v.trim());
    const activityType = normalizeActivityType(cols[activityTypeIndex] || '');

    const rawRecordDate = recordDateIndex >= 0 ? cols[recordDateIndex] : '';

    return {
      id: Math.random().toString(),
      origin: 'CSV' as const,
      importBatchId,
      activityType,
      recordDate: recordDateIndex >= 0 ? normalizeSpreadsheetDate(rawRecordDate) : getTodayDateOnly(),
      rawRecordDate,
      quantity: cols[quantityIndex] || '',
      unit:
        unitIndex >= 0
          ? cols[unitIndex]
          : getDefaultUnit(activityType),
      jurisdictionCountry: normalizeCountry(countryIndex >= 0 ? cols[countryIndex] : 'Canada'),
      jurisdictionRegion: normalizeProvince(provinceIndex >= 0 ? cols[provinceIndex] : ''),
      facilityName: facilityIndex >= 0 ? cols[facilityIndex] : '',
      sourceReference: sourceReferenceIndex >= 0 ? cols[sourceReferenceIndex] : '',
      costCad: costCadIndex >= 0 ? cols[costCadIndex] : '',
      costCurrency:
        costCurrencyIndex >= 0
          ? cols[costCurrencyIndex]
          : costCadIndex >= 0
          ? 'CAD'
          : '',
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
  if (row.recordDate && !isValidDateOnly(row.recordDate)) {
    errors.push('Invalid date');
  }
  if (!row.quantity) errors.push('Missing quantity');
  if (!Number.isFinite(Number(row.quantity)) || Number(row.quantity) <= 0) {
    errors.push('Quantity must be greater than 0');
  }
  if (!row.unit) errors.push('Missing unit');

  return errors;
}

function getSpreadsheetReviewIssues(row: Row): SpreadsheetReviewIssue[] {
  const issues = validateRow(row).map((message) => ({
    code: getReviewIssueCode(message),
    field: getReviewIssueField(message),
    message,
  }));

  if (row.calculationStatus === 'missingJurisdiction') {
    issues.push({
      code: 'MISSING_PROVINCE',
      field: 'jurisdictionRegion',
      message: 'Missing Province',
    });
  }

  if (row.calculationStatus === 'invalidUnit') {
    issues.push({
      code: 'UNIT_MISMATCH',
      field: 'unit',
      message: row.calculationMessage || 'Unit Mismatch',
    });
  }

  if (row.calculationStatus === 'missingFactor') {
    issues.push({
      code: 'MISSING_FACTOR',
      field: 'factor',
      message: row.calculationMessage || 'Missing Factor',
    });
  }

  if (!row.activityType && row.rawActivityType) {
    issues.push({
      code: 'UNSUPPORTED_ACTIVITY_TYPE',
      field: 'activityType',
      message: 'Unsupported activity type',
    });
  }

  return dedupeReviewIssues(issues);
}

function getReviewIssueCode(message: string) {
  if (/activity type/i.test(message)) return 'MISSING_ACTIVITY_TYPE';
  if (/date/i.test(message)) return /invalid/i.test(message) ? 'INVALID_DATE' : 'MISSING_DATE';
  if (/quantity|greater than 0/i.test(message)) return /missing/i.test(message) ? 'MISSING_QUANTITY' : 'INVALID_QUANTITY';
  if (/unit/i.test(message)) return 'MISSING_UNIT';
  return 'NEEDS_REVIEW';
}

function getReviewIssueField(message: string) {
  if (/activity type/i.test(message)) return 'activityType';
  if (/date/i.test(message)) return 'recordDate';
  if (/quantity|greater than 0/i.test(message)) return 'quantity';
  if (/unit/i.test(message)) return 'unit';
  return 'row';
}

function dedupeReviewIssues(issues: SpreadsheetReviewIssue[]) {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.code}:${issue.field}:${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getSpreadsheetReviewStatus(row: Row): SpreadsheetReviewRowStatus {
  const issues = getSpreadsheetReviewIssues(row);
  if (issues.length > 0) return 'NEEDS_REVIEW';
  if (row.calculationStatus === 'trackedMetric') return 'TRACKED_ONLY';
  return row.calculationStatus !== 'calculated'
    ? 'NEEDS_REVIEW'
    : 'READY';
}

function isRowReadyToSave(row: Row) {
  return !isRowCompletelyEmpty(row) && !isNonActivitySpreadsheetRow(row) && validateRow(row).length === 0;
}

function isRowPersistable(row: Row) {
  return !isRowCompletelyEmpty(row) && !isNonActivitySpreadsheetRow(row) && row.status !== 'saved';
}

function isRowSaveDisabled(row: Row) {
  return row.status === 'saved' || row.status === 'saving' || isRowCompletelyEmpty(row) || isNonActivitySpreadsheetRow(row);
}

function getRowSaveLabel(row: Row) {
  if (row.status === 'saving') return 'Saving...';
  if (row.status === 'saved') return 'Saved';
  return 'Save';
}

function getSaveAllDisabledReason(input: {
  canImportRows: boolean;
  hasRowsToReview: boolean;
  isSavingAll: boolean;
  hasPersistableRows: boolean;
}) {
  if (!input.canImportRows) return 'You do not have permission to perform this action.';
  if (input.isSavingAll) return 'Saving spreadsheet rows...';
  if (!input.hasRowsToReview) return 'Add or import spreadsheet rows before saving.';
  if (!input.hasPersistableRows) return 'Imported rows need required fields before any can be saved.';
  return undefined;
}

function buildActivityPayload(row: Row) {
  const isMissingElectricityProvince =
    row.activityType === 'ELECTRICITY' && row.calculationStatus === 'missingJurisdiction';
  const estimatedEmission = getRowEstimatedEmission(row);
  const canonicalCalculation = getCanonicalCalculationFields(row, estimatedEmission);
  const matchedNotes = row.factorStatus === 'matched'
    ? [
        row.notes,
        `Calculation status: Matched.${row.factorYearFallback && row.factorSourceYear ? ` Using latest available factor year: ${row.factorSourceYear}.` : ''}`,
        `Matched factor: ${row.factorName ?? 'N/A'} (${row.factorValue ?? 'N/A'}).`,
        estimatedEmission === null
          ? ''
          : `Calculated emissions: ${formatEmissionNumber(estimatedEmission)} kgCO2e.`,
      ].filter(Boolean).join(' ')
    : '';

  return {
    activityType: row.activityType,
    recordDate: formatDateOnly(row.recordDate),
    quantity: Number(row.quantity),
    unit: row.unit,
    jurisdictionCountry: normalizeOptional(row.jurisdictionCountry) ?? 'Canada',
    jurisdictionRegion: normalizeOptional(row.jurisdictionRegion),
    facility: normalizeOptional(row.facilityName) ?? normalizeOptional(row.facilityId),
    facilityId: normalizeOptional(row.facilityId),
    recordYear: getDateOnlyYear(row.recordDate),
    sourceType: getActivitySourceType(row.origin ?? entrySourceType),
    sourceReference: normalizeOptional(row.sourceReference),
    sourceFileName: normalizeOptional(row.sourceFileName),
    sourceRow: row.sourceRow,
    costCad: normalizeOptionalNumber(row.costCad),
    costCurrency: normalizeOptional(row.costCurrency),
    notes: matchedNotes || [
      row.notes,
      row.facilityName ? `Site / Facility: ${row.facilityName}` : '',
      row.sourceSheetName ? `Source sheet: ${row.sourceSheetName}` : '',
      row.sourceRow ? `Source row: ${row.sourceRow}` : '',
      isMissingElectricityProvince
        ? 'Requires Review. Status: MISSING_PROVINCE. excludedFromTotals=true. Province is required before this electricity record can be calculated.'
        : '',
      `Created from ${entrySourceType}. Calculation status: ${getCalculationStatusLabel(row)}. ${row.calculationMessage ?? ''} Matched factor: ${row.factorName ?? 'N/A'} (${row.factorValue ?? 'N/A'})`,
    ].filter(Boolean).join(' '),
    matchingStatus: canonicalCalculation.matchingStatus,
    reportTreatment: canonicalCalculation.reportTreatment,
    scope: inferDefaultScope(row.activityType),
    matchedFactorId: canonicalCalculation.matchedFactorId,
    matchedFactorName: canonicalCalculation.matchedFactorName,
    matchedFactorSourceYear: canonicalCalculation.matchedFactorSourceYear,
    matchedFactorValue: canonicalCalculation.matchedFactorValue,
    matchedFactorUnit: canonicalCalculation.matchedFactorUnit,
    matchedFactorVersion: canonicalCalculation.matchedFactorVersion,
    matchedFactorSourceAuthority: canonicalCalculation.matchedFactorSourceAuthority,
    matchedFactorSourceDocument: canonicalCalculation.matchedFactorSourceDocument,
    matchedFactorVerificationStatus: canonicalCalculation.matchedFactorVerificationStatus,
    matchedFactorConfidenceLevel: canonicalCalculation.matchedFactorConfidenceLevel,
    matchedFactorAssumptions: canonicalCalculation.matchedFactorAssumptions,
    calculatedEmissionsKgCO2e: canonicalCalculation.calculatedEmissionsKgCO2e,
    calculationStatus: canonicalCalculation.calculationStatus,
    calculationMessage: row.calculationMessage,
  };
}

function buildSpreadsheetReviewRowPayload(row: Row): SpreadsheetReviewRowInput {
  const estimatedEmission = getRowEstimatedEmission(row);
  const canonicalCalculation = getCanonicalCalculationFields(row, estimatedEmission);
  const issues = getSpreadsheetReviewIssues(row);
  const reviewCalculation = getValidationBlockedCalculationFields(canonicalCalculation, issues);
  const quantity = Number(row.quantity);
  const factorSourceYear = typeof row.factorSourceYear === 'number'
    ? row.factorSourceYear
    : Number.isFinite(Number(row.factorSourceYear))
    ? Number(row.factorSourceYear)
    : undefined;

  return {
    rowId: row.id,
    status: getSpreadsheetReviewStatus(row),
    activityType: row.activityType,
    rawActivityType: row.rawActivityType,
    recordDate: row.recordDate || null,
    rawRecordDate: row.rawRecordDate,
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : null,
    rawQuantity: row.rawQuantity ?? row.quantity,
    unit: row.unit,
    jurisdictionCountry: normalizeOptional(row.jurisdictionCountry),
    jurisdictionRegion: normalizeOptional(row.jurisdictionRegion),
    facilityName: normalizeOptional(row.facilityName),
    sourceReference: normalizeOptional(row.sourceReference),
    sourceFileName: normalizeOptional(row.sourceFileName),
    sourceSheetName: normalizeOptional(row.sourceSheetName),
    sourceRow: row.sourceRow,
    costCad: normalizeOptionalNumber(row.costCad),
    costCurrency: normalizeOptional(row.costCurrency),
    rawSourceRow: row.rawSourceRow,
    notes: normalizeOptional(row.notes),
    issues,
    matchingStatus: reviewCalculation.matchingStatus,
    reportTreatment: reviewCalculation.reportTreatment,
    scope: inferDefaultScope(row.activityType),
    calculationStatus: reviewCalculation.calculationStatus,
    calculationMessage: reviewCalculation.calculationMessage ?? row.calculationMessage ?? reviewCalculation.calculationStatus,
    matchedFactorId: canonicalCalculation.matchedFactorId,
    matchedFactorName: canonicalCalculation.matchedFactorName,
    matchedFactorSourceYear: canonicalCalculation.matchedFactorSourceYear ?? factorSourceYear,
    matchedFactorValue: canonicalCalculation.matchedFactorValue,
    matchedFactorUnit: canonicalCalculation.matchedFactorUnit,
    matchedFactorVersion: canonicalCalculation.matchedFactorVersion,
    matchedFactorSourceAuthority: canonicalCalculation.matchedFactorSourceAuthority,
    matchedFactorSourceDocument: canonicalCalculation.matchedFactorSourceDocument,
    matchedFactorVerificationStatus: canonicalCalculation.matchedFactorVerificationStatus,
    matchedFactorConfidenceLevel: canonicalCalculation.matchedFactorConfidenceLevel,
    matchedFactorAssumptions: canonicalCalculation.matchedFactorAssumptions,
    calculatedEmissionsKgCO2e: reviewCalculation.calculatedEmissionsKgCO2e,
  };
}

function getSpreadsheetSaveTechnicalDetails(err: unknown) {
  if (err && typeof err === 'object' && 'status' in err) {
    const error = err as { status?: number; message?: string; technicalMessage?: string };
    return [
      error.status ? `HTTP ${error.status}` : '',
      error.technicalMessage ?? error.message ?? '',
    ].filter(Boolean).join(' · ');
  }

  return err instanceof Error ? err.message : 'Failed to save spreadsheet review rows';
}

function buildSpreadsheetDebugRow(row: Row) {
  return {
    sourceRow: row.sourceRow,
    rawRecordDate: row.rawRecordDate,
    recordDate: row.recordDate || null,
    activityType: row.activityType,
    quantity: row.quantity,
    sourceReference: row.sourceReference,
    sourceFileName: row.sourceFileName,
    sourceSheetName: row.sourceSheetName,
    ignored: isNonActivitySpreadsheetRow(row),
    issues: isNonActivitySpreadsheetRow(row)
      ? [
          {
            code: 'NON_ACTIVITY_ROW',
            field: 'row',
            message: 'Ignored subtotal/summary row',
          },
        ]
      : getSpreadsheetReviewIssues(row),
  };
}

function getCanonicalCalculationFields(row: Row, estimatedEmission: number | null) {
  const factorSourceYear = typeof row.factorSourceYear === 'number'
    ? row.factorSourceYear
    : Number.isFinite(Number(row.factorSourceYear))
    ? Number(row.factorSourceYear)
    : undefined;

  if (row.calculationStatus === 'trackedMetric' || inferDefaultScope(row.activityType) === 'TRACKED_METRIC') {
    return {
      matchingStatus: 'TRACKED_ONLY',
      reportTreatment: 'TRACKED_ONLY',
      calculationStatus: 'TRACKED_ONLY',
      matchedFactorId: undefined,
      matchedFactorName: undefined,
      matchedFactorSourceYear: undefined,
      matchedFactorValue: undefined,
      matchedFactorUnit: undefined,
      matchedFactorVersion: undefined,
      matchedFactorSourceAuthority: undefined,
      matchedFactorSourceDocument: undefined,
      matchedFactorVerificationStatus: undefined,
      matchedFactorConfidenceLevel: undefined,
      matchedFactorAssumptions: undefined,
      calculatedEmissionsKgCO2e: undefined,
    };
  }

  if (row.calculationStatus === 'calculated' && row.factorStatus === 'matched') {
    return {
      matchingStatus: 'MATCHED',
      reportTreatment: 'INCLUDED',
      calculationStatus: 'CALCULATED',
      matchedFactorId: row.factorId,
      matchedFactorName: row.factorName,
      matchedFactorSourceYear: factorSourceYear,
      matchedFactorValue: Number.isFinite(Number(row.factorValue))
        ? Number(row.factorValue)
        : undefined,
      matchedFactorUnit: row.factorResultUnit
        ? `${row.factorResultUnit}/${normalizeUnitForDisplay(row.unit).value || row.unit}`
        : undefined,
      matchedFactorVersion: row.factorVersion,
      matchedFactorSourceAuthority: row.factorSourceAuthority,
      matchedFactorSourceDocument: row.factorSourceDocument,
      matchedFactorVerificationStatus: row.factorVerificationStatus,
      matchedFactorConfidenceLevel: row.factorConfidenceLevel,
      matchedFactorAssumptions: row.factorAssumptions,
      calculatedEmissionsKgCO2e: estimatedEmission ?? undefined,
    };
  }

  if (row.calculationStatus === 'missingJurisdiction') {
    return {
      matchingStatus: 'MISSING_PROVINCE',
      reportTreatment: 'EXCLUDED',
      calculationStatus: 'MISSING_PROVINCE',
      matchedFactorId: undefined,
      matchedFactorName: undefined,
      matchedFactorSourceYear: undefined,
      matchedFactorValue: undefined,
      matchedFactorUnit: undefined,
      matchedFactorVersion: undefined,
      matchedFactorSourceAuthority: undefined,
      matchedFactorSourceDocument: undefined,
      matchedFactorVerificationStatus: undefined,
      matchedFactorConfidenceLevel: undefined,
      matchedFactorAssumptions: undefined,
      calculatedEmissionsKgCO2e: undefined,
    };
  }

  if (row.calculationStatus === 'missingFactor') {
    return {
      matchingStatus: 'MISSING_FACTOR',
      reportTreatment: 'EXCLUDED',
      calculationStatus: 'MISSING_FACTOR',
      matchedFactorId: undefined,
      matchedFactorName: undefined,
      matchedFactorSourceYear: undefined,
      matchedFactorValue: undefined,
      matchedFactorUnit: undefined,
      matchedFactorVersion: undefined,
      matchedFactorSourceAuthority: undefined,
      matchedFactorSourceDocument: undefined,
      matchedFactorVerificationStatus: undefined,
      matchedFactorConfidenceLevel: undefined,
      matchedFactorAssumptions: undefined,
      calculatedEmissionsKgCO2e: undefined,
    };
  }

  if (row.calculationStatus === 'invalidUnit') {
    return {
      matchingStatus: 'UNIT_MISMATCH',
      reportTreatment: 'EXCLUDED',
      calculationStatus: 'UNIT_MISMATCH',
      matchedFactorId: undefined,
      matchedFactorName: undefined,
      matchedFactorSourceYear: undefined,
      matchedFactorValue: undefined,
      matchedFactorUnit: undefined,
      matchedFactorVersion: undefined,
      matchedFactorSourceAuthority: undefined,
      matchedFactorSourceDocument: undefined,
      matchedFactorVerificationStatus: undefined,
      matchedFactorConfidenceLevel: undefined,
      matchedFactorAssumptions: undefined,
      calculatedEmissionsKgCO2e: undefined,
    };
  }

  return {
    matchingStatus: 'REQUIRES_REVIEW',
    reportTreatment: 'EXCLUDED',
    calculationStatus: 'REQUIRES_REVIEW',
    matchedFactorId: undefined,
    matchedFactorName: undefined,
    matchedFactorSourceYear: undefined,
    matchedFactorValue: undefined,
    matchedFactorUnit: undefined,
    matchedFactorVersion: undefined,
    matchedFactorSourceAuthority: undefined,
    matchedFactorSourceDocument: undefined,
    matchedFactorVerificationStatus: undefined,
    matchedFactorConfidenceLevel: undefined,
    matchedFactorAssumptions: undefined,
    calculatedEmissionsKgCO2e: undefined,
  };
}

function getValidationBlockedCalculationFields(
  canonicalCalculation: ReturnType<typeof getCanonicalCalculationFields>,
  issues: SpreadsheetReviewIssue[],
) {
  if (issues.length === 0) return canonicalCalculation;

  const calculationStatus = getValidationCalculationStatus(issues);

  return {
    ...canonicalCalculation,
    reportTreatment: 'EXCLUDED',
    calculationStatus,
    calculationMessage: getValidationCalculationMessage(calculationStatus),
    calculatedEmissionsKgCO2e: null,
  };
}

function getValidationCalculationStatus(issues: SpreadsheetReviewIssue[]) {
  const codes = issues.map((issue) => String(issue.code ?? '').toUpperCase());

  if (codes.includes('MISSING_ACTIVITY_TYPE') || codes.includes('UNSUPPORTED_ACTIVITY_TYPE')) {
    return 'MISSING_ACTIVITY_TYPE';
  }
  if (codes.includes('MISSING_QUANTITY')) return 'MISSING_QUANTITY';
  if (codes.includes('INVALID_QUANTITY')) return 'INVALID_QUANTITY';
  if (codes.includes('MISSING_PROVINCE') || codes.includes('MISSING_JURISDICTION')) {
    return 'MISSING_PROVINCE';
  }
  if (codes.includes('UNIT_MISMATCH') || codes.includes('INVALID_UNIT')) return 'UNIT_MISMATCH';
  if (codes.includes('MISSING_FACTOR')) return 'MISSING_FACTOR';

  return 'REQUIRES_REVIEW';
}

function getValidationCalculationMessage(status: string) {
  switch (status) {
    case 'MISSING_ACTIVITY_TYPE':
      return 'Activity type is required before this row can be calculated.';
    case 'MISSING_QUANTITY':
      return 'Quantity is required before this row can be calculated.';
    case 'INVALID_QUANTITY':
      return 'Quantity must be a valid number greater than 0 before this row can be calculated.';
    case 'MISSING_PROVINCE':
      return 'Province is required before this row can be calculated.';
    case 'UNIT_MISMATCH':
      return 'Unit mismatch. This record is excluded from emissions totals.';
    case 'MISSING_FACTOR':
      return 'No matching conversion factor is available for this record.';
    default:
      return 'Required fields must be completed before calculation.';
  }
}

function normalizeOptional(value?: string | null) {
  const normalized = String(value ?? '').trim();
  return normalized ? normalized : undefined;
}

function normalizeOptionalNumber(value?: string | number | null) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;

  const normalized = value.trim();
  if (!normalized) return undefined;
  const numericValue = Number(normalized.replace(/[$,\s]/g, ''));

  return Number.isFinite(numericValue) ? numericValue : undefined;
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
    origin: 'MANUAL',
    activityType: '',
    quantity: '',
    unit: '',
    recordDate: getTodayDateOnly(),
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

function isImportedReviewRow(row: Row) {
  return row.origin !== 'MANUAL' && !isRowCompletelyEmpty(row) && !isNonActivitySpreadsheetRow(row);
}

function hasRowStarted(row: Row) {
  return Boolean(row.activityType || row.quantity || row.unit);
}

function canRemoveRow(row: Row) {
  if (row.status === 'saved') return false;
  if (rows.length === 1 && isRowCompletelyEmpty(row)) return false;
  return Boolean(row.activityType || row.quantity);
}

function getCalculationStatusLabel(row: Row) {
  if (!row.activityType) return 'Missing Activity Type';
  if (!String(row.quantity ?? '').trim()) return 'Invalid Amount';
  if (row.activityType === 'ELECTRICITY' && !normalizeJurisdictionRegion(row.jurisdictionRegion)) {
    return 'Missing Province';
  }

  switch (row.calculationStatus) {
    case 'calculated':
      return 'Ready';
    case 'trackedMetric':
      return 'Tracked Only';
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
  const activeRows = rows.filter(isImportedReviewRow);

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
  const credibilityBadges = getRowCredibilityBadges(row);

  if (isNonActivitySpreadsheetRow(row)) {
    return (
      <div style={{ display: 'grid', gap: 4 }}>
        <StatusBadge status="IGNORED" label="Ignored" />
        <span style={statusMessageStyle}>Non-activity row</span>
      </div>
    );
  }

  if (row.status === 'saved') {
    return (
      <div style={{ display: 'grid', gap: 4 }}>
        <StatusBadge
          status={row.calculationStatus ?? row.status}
          label={getSavedReviewLabel(row)}
        />
        {row.errors?.length ? (
          <span style={statusMessageStyle}>{row.errors.join(', ')}</span>
        ) : null}
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
      {credibilityBadges.length ? (
        <span style={factorBadgeRowStyle}>
          {credibilityBadges.map((badge) => (
            <span key={badge} style={factorCredibilityBadgeStyle}>{badge}</span>
          ))}
        </span>
      ) : null}
    </div>
  );
}

function renderFactorCell(row: Row) {
  if (isNonActivitySpreadsheetRow(row)) {
    return (
      <div style={{ color: '#64748b', fontSize: 12, lineHeight: 1.45 }}>
        <strong>Non-activity row</strong>
        <br />
        Ignored during Activity Record creation.
      </div>
    );
  }

  if (isRowCompletelyEmpty(row) || !row.activityType) {
    return <span style={{ color: '#94a3b8', fontSize: 12 }}>-</span>;
  }

  if (row.factorStatus === 'matched') {
    const factorTitle = row.factorName ?? 'Matched factor';
    const credibilityBadges = getRowCredibilityBadges(row);

    return (
      <div style={factorCellTextStyle}>
        <strong>{factorTitle}</strong>
        <span>
          {formatReportFactorUnit(row.factorResultUnit || 'kgCO2e', row.unit)} {row.factorSourceYear ? `· ${row.factorSourceYear}` : ''}
        </span>
        {row.factorYearFallback && row.factorSourceYear ? (
          <span>Using latest available factor year: {row.factorSourceYear}</span>
        ) : null}
        {row.factorSourceAuthority ? <span>Source: {row.factorSourceAuthority}</span> : null}
        {row.factorVersion ? <span>Version: {row.factorVersion}</span> : null}
        {credibilityBadges.length ? (
          <span style={factorBadgeRowStyle}>
            {credibilityBadges.map((badge) => (
              <span key={badge} style={factorCredibilityBadgeStyle}>{badge}</span>
            ))}
          </span>
        ) : null}
        {row.factorAssumptions ? (
          <span title={row.factorAssumptions}>
            {row.factorAssumptions}
          </span>
        ) : null}
        <span>{formatEstimatedEmissions(row)}</span>
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
        {row.calculationMessage ? (
          <>
            <br />
            {row.calculationMessage}
          </>
        ) : null}
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

function getRowCredibilityBadges(row: Row) {
  const explicitBadges = row.factorCredibilityBadges ?? [];
  if (explicitBadges.length) return explicitBadges;

  if (
    row.factorStatus === 'matched' &&
    inferDefaultScope(row.activityType) === 'SCOPE_3'
  ) {
    return ['Pilot Estimate', 'Consultant Review Recommended'];
  }

  return [];
}

function formatEstimatedEmissions(row: Row) {
  const emissions = getRowEstimatedEmission(row);
  const resultUnit = getEmissionResultUnit(row);

  if (!String(row.quantity ?? '').trim()) return 'Estimated emissions: Waiting for quantity';
  if (emissions === null) return 'Estimated emissions: Waiting for valid quantity';

  return `Estimated emissions: ${formatEmissionNumber(emissions)} ${formatEmissionsUnit(resultUnit)}`;
}

function getRowEstimatedEmission(row: Row) {
  const quantity = Number(row.quantity);
  const factorValue = Number(row.factorValue);

  if (!String(row.quantity ?? '').trim()) return null;
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  if (!Number.isFinite(factorValue)) return null;

  return quantity * factorValue;
}

function getEmissionResultUnit(row: Row) {
  const resultUnit = row.factorResultUnit || 'kgCO2e';
  return resultUnit.includes('/')
    ? resultUnit.split('/')[0]
    : resultUnit;
}

function formatEmissionNumber(value: number) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 3,
  });
}

function getRowStatusSummary(row: Row): { badge: string; detail: string } {
  if (!row.activityType) {
    return { badge: 'Missing Activity Type', detail: 'Select an activity type.' };
  }

  const quantity = Number(row.quantity);
  if (!String(row.quantity ?? '').trim() || !Number.isFinite(quantity) || quantity <= 0) {
    return { badge: 'Invalid Amount', detail: 'Enter a quantity greater than 0.' };
  }

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
        badge: 'Ready',
        detail: row.factorYearFallback && row.factorSourceYear
          ? `${province || 'Province'} electricity factor matched. Using latest available factor year: ${row.factorSourceYear}.`
          : `${province || 'Province'} electricity factor matched.`,
      };
    }
  }

  switch (row.calculationStatus) {
    case 'calculated':
      return { badge: 'Ready', detail: 'Factor matched.' };
    case 'trackedMetric':
      return { badge: 'Not Emissions Factor Required', detail: 'Tracked only, excluded from GHG totals.' };
    case 'invalidUnit':
      return { badge: 'Unit Mismatch', detail: row.calculationMessage || 'Review unit before calculation.' };
    case 'missingFactor':
      return { badge: 'Missing Factor', detail: 'No matching factor found.' };
    case 'needsReview':
      return { badge: 'Requires Review', detail: 'Review before calculation.' };
    default:
      return { badge: 'Draft', detail: 'Complete row details.' };
  }
}

function getReportTreatment(row: Row) {
  if (row.calculationStatus === 'trackedMetric' || inferDefaultScope(row.activityType) === 'TRACKED_METRIC') {
    return {
      label: 'Tracked Only',
      detail: 'Excluded from GHG total.',
    };
  }

  if (row.calculationStatus === 'calculated') {
    return {
      label: 'Included',
      detail: 'Included in GHG total.',
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
  return getDefaultUnitForActivityType(activityType);
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
    if (!canImportRows) {
      showError({
        title: 'Permission required',
        message: 'You do not have permission to perform this action.',
      });
      return;
    }

    setRows((prev) => [...prev, applyFactorToRow(createEmptyRow())]);
  }

function removeRow(id: string) {
  if (!canImportRows) {
    showError({
      title: 'Permission required',
      message: 'You do not have permission to perform this action.',
    });
    return;
  }

  setRows((prev) => prev.filter((row) => row.id !== id));
  setEntrySourceType('MANUAL');
}

function clearSavedRowsFromForm() {
  if (!canImportRows) {
    showError({
      title: 'Permission required',
      message: 'You do not have permission to perform this action.',
    });
    return;
  }

  setRows((prev) => prev.filter((row) => row.status !== 'saved'));
}

function handleQuickEntryKeyDown(event: React.KeyboardEvent<HTMLTableElement>) {
  if (event.key === 'Enter') {
    event.preventDefault();
  }
}

function findColumnIndex(headers: string[], candidates: string[]) {
  const normalized = headers.map(normalizeHeader);

  return normalized.findIndex((header) =>
    candidates.map(normalizeHeader).includes(header),
  );
}

function readAliasedField(row: Record<string, unknown>, aliases: string[]) {
  const value = readAliasedRawField(row, aliases);
  return String(value ?? '').trim();
}

function readAliasedRawField(row: Record<string, unknown>, aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeHeader);
  const key = Object.keys(row).find((candidate) =>
    normalizedAliases.includes(normalizeHeader(candidate)),
  );
  return key ? row[key] : undefined;
}

function normalizeProvince(value?: string | null) {
  return normalizeCanadianProvince(value) ?? '';
}

function getProvinceOptions(currentProvince?: string | null) {
  const normalizedProvince = normalizeProvince(currentProvince);
  return normalizedProvince && !ELECTRICITY_FACTOR_PROVINCE_OPTIONS.includes(normalizedProvince)
    ? [...ELECTRICITY_FACTOR_PROVINCE_OPTIONS, normalizedProvince]
    : ELECTRICITY_FACTOR_PROVINCE_OPTIONS;
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
  if (!canImportRows) return;

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
      origin: 'PASTE' as const,
      activityType: type,
        recordDate: recordDate || getTodayDateOnly(),
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
  if (!canImportRows) {
    event.target.value = '';
    showError({
      title: 'Permission required',
      message: 'You do not have permission to perform this action.',
    });
    return;
  }

  const file = event.target.files?.[0];
  if (file) importFile(file);
  event.target.value = '';
  setEntrySourceType('CSV');
}
function handleImportExcel(event: React.ChangeEvent<HTMLInputElement>) {
  if (!canImportRows) {
    event.target.value = '';
    showError({
      title: 'Permission required',
      message: 'You do not have permission to perform this action.',
    });
    return;
  }

  const file = event.target.files?.[0];
  if (file) importFile(file);
  event.target.value = '';
  setEntrySourceType('EXCEL');
}

function handleImportSpreadsheet(event: React.ChangeEvent<HTMLInputElement>) {
  if (!canImportRows) {
    event.target.value = '';
    showError({
      title: 'Permission required',
      message: 'You do not have permission to perform this action.',
    });
    return;
  }

  const file = event.target.files?.[0];
  if (file) {
    importFile(file);
    const sourceType = getSourceTypeFromFile(file);
    setEntrySourceType(sourceType === 'CSV' ? 'CSV' : 'EXCEL');
  }
  event.target.value = '';
}
async function saveRow(row: Row) {
  if (!canImportRows) {
    updateRowStatus(row.id, {
      errors: ['You do not have permission to perform this action.'],
      status: 'error',
    });
    return;
  }

  if (isNonActivitySpreadsheetRow(row)) {
    updateRowStatus(row.id, {
      errors: ['Ignored non-activity row'],
      status: 'error',
    });
    return;
  }

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
    void onSuccess({ source: 'manual' });
  } catch (err) {
    updateRowStatus(row.id, {
      errors: [getUserFriendlyErrorMessage(err, 'draftRecordReview')],
      status: 'error',
    });
  }
}

async function saveAll() {
  if (!canImportRows) {
    showError({
      title: 'Permission required',
      message: 'You do not have permission to perform this action.',
    });
    return;
  }

  if (isSpreadsheetMode && import.meta.env.DEV && rows[8]) {
    console.debug('spreadsheet review row 8', buildSpreadsheetDebugRow(rows[8]));
  }

  const rowsToSave = rows.filter(
    (row) =>
      !isRowCompletelyEmpty(row) &&
      row.status !== 'saved' &&
      (!isSpreadsheetMode || !isNonActivitySpreadsheetRow(row)),
  );

  if (isSpreadsheetMode) {
    await saveAllSpreadsheetRows(rowsToSave);
    return;
  }

  const validatedRows = rowsToSave.map((row) => ({
    ...row,
    errors: validateRow(row),
  }));
  const persistableRows = validatedRows.filter((row) => !row.errors?.length);
  const invalidRows = validatedRows.filter((row) => row.errors?.length);

  if (persistableRows.length === 0) {
    setRows((prev) =>
      prev.map((row) =>
        validatedRows.find((validatedRow) => validatedRow.id === row.id)
          ? {
              ...row,
              errors: validateRow(row),
              status: 'error',
            }
          : row,
      ),
    );
    showError({
      title: 'Unable to save records',
      message: 'No rows can be saved yet. Please fix highlighted required fields before saving.',
    });
    return;
  }

  setIsSavingAll(true);
  setRows((prev) =>
    prev.map((row) => {
      if (persistableRows.some((item) => item.id === row.id)) {
        return {
          ...row,
          errors: undefined,
          status: 'saving',
        };
      }

      const invalidRow = invalidRows.find((item) => item.id === row.id);
      if (invalidRow) {
        return {
          ...row,
          errors: invalidRow.errors,
          status: 'error',
        };
      }

      return row;
    }),
  );

  try {
    const savedRows: Array<{ rowId: string; savedActivityId?: string }> = [];

    for (const row of persistableRows) {
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
    await onSuccess({ source: 'manual' });
    toast.success(
      invalidRows.length > 0
        ? `Spreadsheet rows saved for review. ${invalidRows.length} row${invalidRows.length === 1 ? '' : 's'} still need required fields before saving.`
        : 'Spreadsheet rows saved for review.',
    );
  } catch (err) {
    setRows((prev) =>
      prev.map((row) =>
        persistableRows.some((item) => item.id === row.id)
          ? {
              ...row,
              status: 'error',
              errors: [getUserFriendlyErrorMessage(err, 'draftRecordReview')],
            }
          : row,
      ),
    );
    showError({
      title: 'Unable to save records',
      message: 'We could not save these records. Please review the information and try again.',
      technicalDetails: err instanceof Error ? err.message : 'Failed to save',
    });
  } finally {
    setIsSavingAll(false);
  }
}

async function saveAllSpreadsheetRows(rowsToSave: Row[]) {
  if (rowsToSave.length === 0) return;

  const reviewRows = rowsToSave.map(buildSpreadsheetReviewRowPayload);

  setIsSavingAll(true);
  setRows((prev) =>
    prev.map((row) =>
      rowsToSave.some((item) => item.id === row.id)
        ? {
            ...row,
            errors: getSpreadsheetReviewIssues(row).map((issue) => issue.message),
            status: 'saving',
          }
        : row,
    ),
  );

  try {
    const response = await saveSpreadsheetReviewRows({
      sourceType: entrySourceType === 'CSV' || entrySourceType === 'EXCEL' || entrySourceType === 'PASTE'
        ? entrySourceType
        : 'EXCEL',
      importBatchId: rowsToSave.find((row) => row.importBatchId)?.importBatchId,
      sourceFileName: reviewRows.find((row) => row.sourceFileName)?.sourceFileName,
      rows: reviewRows,
    });
    const failedRows = response.failedRows ?? [];
    const failedKeys = new Set(
      failedRows.map((row) => row.rowId ?? String(row.sourceRow ?? '')),
    );

    setRows((prev) =>
      prev.map((row) => {
        if (!rowsToSave.some((item) => item.id === row.id)) return row;

        const failedRow = failedRows.find(
          (item) => item.rowId === row.id || String(item.sourceRow ?? '') === String(row.sourceRow ?? ''),
        );

        if (failedRow) {
          return {
            ...row,
            status: 'error',
            errors: [failedRow.message],
          };
        }

        return {
          ...row,
          status: 'saved',
          errors: getSpreadsheetReviewIssues(row).map((issue) => issue.message),
        };
      }),
    );

    await onSuccess({
      source: 'spreadsheet',
      sourceDocumentId: response.sourceDocument?.id,
    });
    const savedCount = Number(response.savedCount ?? Math.max(0, reviewRows.length - failedKeys.size));
    const readyCount = response.readyCount ?? reviewRows.filter((row) => row.status === 'READY').length;
    const needsReviewCount = response.needsReviewCount ?? reviewRows.filter((row) => row.status === 'NEEDS_REVIEW').length;
    const trackedOnlyCount = response.trackedOnlyCount ?? reviewRows.filter((row) => row.status === 'TRACKED_ONLY').length;
    const failedCount = failedRows.length;

    toast.success(
      failedCount > 0
        ? `${savedCount} spreadsheet row${savedCount === 1 ? '' : 's'} saved for review. ${failedCount} row${failedCount === 1 ? '' : 's'} could not be saved.`
        : `${savedCount} spreadsheet row${savedCount === 1 ? '' : 's'} saved for review. ${readyCount} ready · ${needsReviewCount} need review · ${trackedOnlyCount} tracked.`,
    );
  } catch (err) {
    setRows((prev) =>
      prev.map((row) =>
        rowsToSave.some((item) => item.id === row.id)
          ? {
              ...row,
              status: 'error',
              errors: [getUserFriendlyErrorMessage(err, 'draftRecordReview')],
            }
          : row,
      ),
    );
    showError({
      title: 'Unable to save records',
      message: 'We could not save these records. Please review the information and try again.',
      technicalDetails: getSpreadsheetSaveTechnicalDetails(err),
    });
  } finally {
    setIsSavingAll(false);
  }
}

const rowsToSave = rows.filter(
  (row) =>
    !isRowCompletelyEmpty(row) &&
    row.status !== 'saved' &&
    (!isSpreadsheetMode || !isNonActivitySpreadsheetRow(row)),
);
const hasPersistableRows = rowsToSave.some((row) =>
  isSpreadsheetMode ? isRowPersistable(row) : validateRow(row).length === 0,
);
const hasRowsToReview = rowsToSave.length > 0;
const saveAllDisabled = !hasRowsToReview || isSavingAll || !canImportRows || (!isSpreadsheetMode && !hasPersistableRows);
const saveAllDisabledReason = getSaveAllDisabledReason({
  canImportRows,
  hasRowsToReview,
  isSavingAll,
  hasPersistableRows,
});
const hasSavedRows = rows.some((row) => row.status === 'saved');
const importedReviewRows = rows.filter(isImportedReviewRow);
const hasImportedReviewRows = importedReviewRows.length > 0;
const importReviewSummary = buildImportReviewSummary(rows);
const hasImportedMissingElectricityProvince = importedReviewRows.some(
  (row) => row.calculationStatus === 'missingJurisdiction',
);
const importedMissingElectricityProvinceCount = importedReviewRows.filter(
  (row) => row.calculationStatus === 'missingJurisdiction',
).length;

  return (

<div style={{
    ...cardStyle,
    border: isSpreadsheetMode && isDragging ? '2px dashed #047857' : '1px solid #E2E8F0',
    background: isSpreadsheetMode && isDragging ? '#ECFDF5' : '#fff',
  }}
  onDragEnter={isSpreadsheetMode ? handleDragEnter : undefined}
  onDragOver={isSpreadsheetMode ? handleDragOver : undefined}
  onDragLeave={isSpreadsheetMode ? handleDragLeave : undefined}
  onDrop={isSpreadsheetMode ? handleDrop : undefined}>
  <div style={headerStyle}>
    <div>
      <h3 style={{ margin: 0 }}>{isSpreadsheetMode ? 'Spreadsheet rows' : 'Manual activity rows'}</h3>
      <p style={{ margin: '6px 0 0', color: '#64748b' }}>
        {isSpreadsheetMode
          ? 'Import a CSV/XLSX file or paste rows from Excel.'
          : 'Enter one activity record manually when no file is available.'}
      </p>
      {!canImportRows ? (
        <p style={readOnlyNoticeStyle}>
          Read-only access: you can view records and reports, but cannot import or edit activity rows.
        </p>
      ) : null}
      {hasSavedRows ? (
        <p style={savedRowsHelperStyle}>
          Saved rows remain here for review. Use Data Records for delete actions.
        </p>
      ) : null}
      {bulkProvinceMessage ? (
        <div role="status" style={bulkProvinceSuccessStyle}>
          {bulkProvinceMessage}
        </div>
      ) : null}
      {hasImportedReviewRows && importReviewSummary.total > 0 ? (
        <div style={importReviewSummaryStyle}>
          <strong>Import Review Summary</strong>
          <span>{formatCount(importReviewSummary.total, 'record')} found</span>
          <span>{importReviewSummary.ready} ready for calculation</span>
          <span>{formatCount(importReviewSummary.tracked, 'tracked metric')}</span>
          <span>{importReviewSummary.review} {importReviewSummary.review === 1 ? 'requires' : 'require'} review</span>
          <span>{formatCount(importReviewSummary.missingDate, 'record')} missing date</span>
          <span>{formatCount(importReviewSummary.missingQuantity, 'record')} missing quantity</span>
          <span>{formatCount(importReviewSummary.invalidUnit, 'record')} invalid unit</span>
          <span>{importReviewSummary.missingProvince} missing province</span>
        </div>
      ) : null}
    </div>
  </div>

  <div style={manualEntryToolbarStyle} aria-label={isSpreadsheetMode ? 'Spreadsheet import toolbar' : 'Manual entry toolbar'}>
    <div style={manualEntryToolbarRowStyle}>
      <div style={manualEntryToolbarGroupStyle}>
        {isSpreadsheetMode ? (
          <div style={spreadsheetFileImportStyle}>
            <strong style={spreadsheetFileImportTitleStyle}>File import</strong>
            <button
              type="button"
              onClick={() => spreadsheetFileInputRef.current?.click()}
              disabled={!canImportRows}
              style={secondaryButtonStyle}
            >
              Choose spreadsheet file
            </button>
            <input
              ref={spreadsheetFileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={handleImportSpreadsheet}
              style={{ display: 'none' }}
            />
            <span style={spreadsheetFileImportHelperStyle}>
              Select a CSV or XLSX file from your computer.
            </span>
            <span style={spreadsheetFileImportHintStyle}>
              To paste copied rows, use the paste area below.
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={addRow}
            disabled={!canImportRows}
            style={secondaryButtonStyle}
          >
            {rows.length === 0 ? 'Add activity record' : 'Add another manual row'}
          </button>
        )}
      </div>
    </div>

    <div style={manualEntryToolbarRowStyle}>
      <div style={manualEntryToolbarGroupStyle}>
        {hasImportedMissingElectricityProvince && canImportRows ? (
          <BulkProvinceToolbar
            selectedCount={importedMissingElectricityProvinceCount}
            eligibleCount={importedMissingElectricityProvinceCount}
            selectedProvince={bulkProvince}
            onProvinceChange={setBulkProvince}
            provinceOptions={ELECTRICITY_FACTOR_PROVINCE_OPTIONS}
            label="Bulk set province for selected imported rows"
            applyLabel="Apply province"
            helperText="Apply a province to selected imported electricity rows that need province-specific factor matching."
            onApply={() => {
              const normalizedBulkProvince = normalizeProvince(bulkProvince);
              setRows((prev) =>
                prev.map((row) =>
                  isImportedReviewRow(row) && row.calculationStatus === 'missingJurisdiction'
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
              setBulkProvinceMessage('Province applied to imported electricity rows.');
            }}
          />
        ) : null}
      </div>

      <div style={manualEntryToolbarGroupStyle}>
        <button
          type="button"
          onClick={saveAll}
          disabled={saveAllDisabled}
          title={saveAllDisabledReason}
          style={primaryButtonStyle(saveAllDisabled)}
        >
          {isSavingAll ? 'Saving...' : 'Save All'}
        </button>
        {hasSavedRows ? (
          <>
            <button
              type="button"
              onClick={clearSavedRowsFromForm}
              disabled={!canImportRows}
              style={secondaryButtonStyle}
            >
              Clear Saved Rows
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = '/metrics-summary';
              }}
              style={secondaryButtonStyle}
            >
              View Calculation Review
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

  <div
    style={manualEntryFormListStyle}
    aria-label={isSpreadsheetMode ? 'Paste spreadsheet rows' : undefined}
    onPaste={isSpreadsheetMode ? handlePasteRows : undefined}
    onKeyDown={handleQuickEntryKeyDown}
  >
    {rows.length === 0 ? (
      <>
        <div style={manualEntryFormTitleStyle}>
          <strong>{isSpreadsheetMode ? 'Paste spreadsheet rows' : 'Add activity record'}</strong>
          <span>
            {isSpreadsheetMode
              ? 'Paste rows copied from Excel here.'
              : 'Enter one activity record manually. Electricity records require province before emissions can be calculated.'}
          </span>
        </div>
        <div style={quickEntryEmptyStyle}>
          <strong>{isSpreadsheetMode ? 'No spreadsheet rows yet.' : 'No manual activity rows yet.'}</strong>
          <span>
            {isSpreadsheetMode
              ? 'Choose a spreadsheet file above or paste rows from Excel.'
              : 'Click "Add activity record" to begin.'}
          </span>
        </div>
      </>
    ) : (
      <div style={draftRecordListStyle}>
        {rows.map((row, index) => (
          <ManualEntryForm
            key={row.id}
            values={row}
            rowNumber={index + 1}
            title={index === 0 ? (isSpreadsheetMode ? 'Review spreadsheet row' : 'Add activity record') : undefined}
            description={
              index === 0
                ? isSpreadsheetMode
                  ? 'Review imported spreadsheet rows before saving. Electricity records require province before emissions can be calculated.'
                  : 'Enter one activity record manually. Electricity records require province before emissions can be calculated.'
                : undefined
            }
            activityTypes={activityTypes}
            provinceOptions={getProvinceOptions(row.jurisdictionRegion)}
            hasErrors={Boolean(row.errors?.length)}
            onChange={(field: ManualEntryField, value) => {
              if (!canImportRows) return;

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
            saveDisabled={isRowSaveDisabled(row) || !canImportRows}
            saveLabel={getRowSaveLabel(row)}
            canRemove={canImportRows && canRemoveRow(row)}
            removeLabel="Clear Draft"
            removeAriaLabel={`Clear draft row ${index + 1}`}
            onRemove={() => removeRow(row.id)}
            savedActions={
              row.status === 'saved' ? (
                <>
                  <button
                    type="button"
                    onClick={addRow}
                    disabled={!canImportRows}
                    style={secondaryButtonStyle}
                  >
                    {isSpreadsheetMode ? 'Add another manual row' : 'Add Another Record'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = '/activity-records';
                    }}
                    style={secondaryButtonStyle}
                  >
                    View in Data Records
                  </button>
                </>
              ) : null
            }
          />
        ))}
      </div>
    )}
  </div>
  {hasImportedMissingElectricityProvince ? (
    <div style={validationSummaryStyle}>
      Imported electricity rows require province-specific factors. Use the bulk action above or edit each imported row before saving.
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
  border: '1px solid #E2E8F0',
  borderRadius: 12,
  background: '#fff',
  marginBottom: 24,
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

const readOnlyNoticeStyle: React.CSSProperties = {
  margin: '10px 0 0',
  padding: 10,
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  background: '#f8fafc',
  color: '#475569',
  fontSize: 13,
  lineHeight: 1.45,
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
    borderRadius: 8,
    border: disabled ? '1px solid #E2E8F0' : '1px solid #047857',
    background: disabled ? '#F1F5F9' : '#047857',
    color: disabled ? '#94A3B8' : '#fff',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

const secondaryButtonStyle: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: 8,
  border: '1px solid #E2E8F0',
  background: '#fff',
  color: '#334155',
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

const spreadsheetFileImportStyle: React.CSSProperties = {
  display: 'grid',
  gap: 6,
  alignItems: 'start',
};

const spreadsheetFileImportTitleStyle: React.CSSProperties = {
  color: '#334155',
  fontSize: 13,
};

const spreadsheetFileImportHelperStyle: React.CSSProperties = {
  color: '#475569',
  fontSize: 13,
};

const spreadsheetFileImportHintStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: 13,
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

const factorBadgeRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 4,
};

const factorCredibilityBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  width: 'fit-content',
  padding: '2px 6px',
  borderRadius: 999,
  border: '1px solid #f59e0b',
  background: '#fffbeb',
  color: '#B45309',
  fontSize: 11,
  fontWeight: 800,
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
