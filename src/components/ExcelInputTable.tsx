
import { createActivityData, updateActivityData } from '../services/activityData';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { getAllConversionFactors } from '../services/conversionFactors';
import {
  activityTypeDefaultUnits,
  activityTypes,
} from '../constants/activityTypes';
import * as XLSX from 'xlsx';
import {
  findBestConversionFactorMatch,
  getFactorResultUnit,
  getFactorSourceAuthority,
  getFactorSourceYear,
  getFactorValue,
  normalizeActivityType,
  normalizeFactorActivityType,
  normalizeJurisdictionRegion,
} from '../utils/conversionFactorMatching';
import {
  buildMatchedFactorSnapshot,
  getFactorAssumptionDisclosure,
  getFactorCredibilityBadges,
  getFactorVersionLabel,
} from '../utils/factorCredibility';
import {
  canImportActivityRecords,
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

type Row = {
  id: string;
  origin?: 'MANUAL' | 'CSV' | 'EXCEL' | 'PASTE';
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

export function ExcelInputTable({ onSuccess }: { onSuccess: () => void }) {
  const canImportRows = canImportActivityRecords(getCurrentUser());
  const toast = useToast();
  const { showError } = useAppDialog();
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

  const recordYear = getDateOnlyYear(row.recordDate);
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
  const activityTypeLabel = getActivityTypeLabel(row.activityType);
  if (normalizedUnit.status !== 'valid') {
    return {
      calculationStatus: 'invalidUnit' as const,
      calculationMessage: `Unit '${row.unit}' could not be matched to a supported ${activityTypeLabel} factor unit.${supportedUnits.length ? ` Supported unit: ${supportedUnits.join(', ')}.` : ''}`,
      supportedUnits,
    };
  }

  const normalizedSupportedUnits = supportedUnits.map((unit) => normalizeUnitForDisplay(unit).value);
  if (supportedUnits.length > 0 && !normalizedSupportedUnits.includes(normalizedUnit.value)) {
    return {
      calculationStatus: 'invalidUnit' as const,
      calculationMessage: `Unit '${row.unit}' could not be matched to a supported ${activityTypeLabel} factor unit.${supportedUnits.length ? ` Supported unit: ${supportedUnits.join(', ')}.` : ''}`,
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
    calculationMessage: match.usedPriorYearFallback && match.factorYear
      ? `Matched factor. Using latest available factor year: ${match.factorYear}.`
      : 'Matched factor. This row can be included in emissions totals.',
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
        origin: 'EXCEL' as const,
        activityType,
        recordDate:
          readAliasedField(row, ['recordDate', 'Record Date', 'date', 'Date']) ||
          getTodayDateOnly(),
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
  const facilityIndex = findColumnIndex(headers, ['facility', 'facilityName', 'facility name']);
  const sourceReferenceIndex = findColumnIndex(headers, ['sourceReference', 'source reference', 'reference']);
  const notesIndex = findColumnIndex(headers, ['notes', 'note']);

  if (activityTypeIndex === -1 || quantityIndex === -1) {
    showError({
      title: 'Unable to import CSV',
      message: 'CSV must include at least activity type and quantity columns.',
    });
    return;
  }

  const importedRows = lines.slice(1).map((line) => {
    const cols = line.split(',').map((v) => v.trim());
    const activityType = normalizeActivityType(cols[activityTypeIndex] || '');

    return {
      id: Math.random().toString(),
      origin: 'CSV' as const,
      activityType,
      recordDate:
        recordDateIndex >= 0
          ? cols[recordDateIndex]
          : getTodayDateOnly(),
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
    facilityId: normalizeOptional(row.facilityId),
    recordYear: getDateOnlyYear(row.recordDate),
    sourceType: row.origin ?? entrySourceType,
    sourceReference: normalizeOptional(row.sourceReference) ?? String(row.origin ?? entrySourceType).toLowerCase(),
    notes: matchedNotes || [
      row.notes,
      row.facilityName ? `Facility: ${row.facilityName}` : '',
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
  return row.origin !== 'MANUAL' && !isRowCompletelyEmpty(row);
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
  switch (row.calculationStatus) {
    case 'calculated':
      return 'Matched';
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

  return `Estimated emissions: ${formatEmissionNumber(emissions)} ${resultUnit}`;
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
        detail: row.factorYearFallback && row.factorSourceYear
          ? `${province || 'Province'} electricity factor matched. Using latest available factor year: ${row.factorSourceYear}.`
          : `${province || 'Province'} electricity factor matched.`,
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
async function saveRow(row: Row) {
  if (!canImportRows) {
    updateRowStatus(row.id, {
      errors: ['You do not have permission to perform this action.'],
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
    onSuccess();
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
    showError({
      title: 'Unable to save records',
      message: 'Some rows have errors. Please fix highlighted rows before saving.',
    });
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
    toast.success('Saved.');
  } catch (err) {
    showError({
      title: 'Unable to save records',
      message: 'We could not save these records. Please review the information and try again.',
      technicalDetails: err instanceof Error ? err.message : 'Failed to save',
    });
  }
}

const rowsToSave = rows.filter(
  (row) => !isRowCompletelyEmpty(row) && row.status !== 'saved',
);
const hasValidRows = rowsToSave.some((row) => validateRow(row).length === 0);
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
        <button
          type="button"
          onClick={addRow}
          disabled={!canImportRows}
          style={secondaryButtonStyle}
        >
          + Add Row
        </button>
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
          disabled={!hasValidRows || !canImportRows}
          style={primaryButtonStyle(!hasValidRows || !canImportRows)}
        >
          Save All
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
                    Add Another Record
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
  color: '#92400e',
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
