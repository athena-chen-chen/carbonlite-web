import { getActivityTypeLabel, getFactorDisplayName } from './activityType';
import { formatDateOnly } from './dateOnly';
import { escapeCsvValue } from './reportCsvExport';
import {
  formatScopeClassification,
  resolveScopeClassification,
} from './scopeClassification';
import { normalizeUnitForDisplay } from './unitNormalization';

export type DataRecordCsvExportItem = {
  activityType?: string | null;
  customTypeLabel?: string | null;
  recordDate?: string | null;
  quantity?: string | number | null;
  unit?: string | null;
  jurisdictionCountry?: string | null;
  jurisdictionRegion?: string | null;
  country?: string | null;
  province?: string | null;
  facility?: string | { name?: string | null } | null;
  facilityName?: string | null;
  sourceType?: string | null;
  sourceFileName?: string | null;
  sourceReference?: string | null;
  sourcePage?: string | number | null;
  sourceRow?: string | number | null;
  notes?: string | null;
  matchingStatus?: string | null;
  reportTreatment?: string | null;
  scope?: string | null;
  matchedFactorName?: string | null;
  matchedFactorValue?: number | string | null;
  matchedFactorUnit?: string | null;
  calculatedEmissionsKgCO2e?: number | string | null;
  calculatedEmission?: number | string | null;
  calculationStatus?: string | null;
};

export const DATA_RECORDS_CSV_HEADERS = [
  'Record Date',
  'Activity Type',
  'Quantity',
  'Unit',
  'Country',
  'Province',
  'Site / Facility',
  'Scope',
  'Emission Factor',
  'Factor Unit',
  'Calculated Emissions kgCO2e',
  'Treatment',
  'Status',
  'Source',
  'Source Reference',
  'Notes',
] as const;

type DataRecordsCsvHeader = (typeof DATA_RECORDS_CSV_HEADERS)[number];
type DataRecordsCsvRow = Record<DataRecordsCsvHeader, string>;

const STATUS_LABELS: Record<string, string> = {
  CALCULATED: 'Ready',
  MATCHED: 'Ready',
  READY: 'Ready',
  INCLUDED: 'Included',
  TRACKED_ONLY: 'Tracked Metric',
  TRACKED_METRIC: 'Tracked Metric',
  REQUIRES_REVIEW: 'Requires Review',
  MISSING_FACTOR: 'Missing Factor',
  MISSING_PROVINCE: 'Missing Province',
  MISSING_JURISDICTION: 'Missing Province',
  UNIT_MISMATCH: 'Unit Mismatch',
  INVALID_UNIT: 'Unit Mismatch',
  UNSUPPORTED_ACTIVITY: 'Unsupported Activity',
  EXCLUDED: 'Excluded',
};

function normalizeStatus(value?: string | null) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

function formatDisplayLabel(value?: string | null) {
  const normalized = normalizeStatus(value);
  if (!normalized) return '';

  return STATUS_LABELS[normalized] ?? normalized
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatOptionalValue(value: unknown) {
  const text = String(value ?? '').trim();
  return text && text.toLowerCase() !== 'null' && text.toLowerCase() !== 'undefined'
    ? text
    : '';
}

function formatNumberValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return String(Math.round((numeric + Number.EPSILON) * 1_000_000) / 1_000_000);
}

function isTrackedMetricRecord(record: DataRecordCsvExportItem) {
  const activityType = normalizeStatus(record.activityType);
  return (
    activityType === 'WATER' ||
    normalizeStatus(record.reportTreatment) === 'TRACKED_ONLY' ||
    normalizeStatus(record.calculationStatus) === 'TRACKED_ONLY' ||
    normalizeStatus(record.matchingStatus) === 'TRACKED_ONLY' ||
    normalizeStatus(record.scope) === 'TRACKED_METRIC'
  );
}

function formatSiteFacility(record: DataRecordCsvExportItem) {
  const facilityRelationName =
    record.facility && typeof record.facility === 'object'
      ? record.facility.name
      : record.facility;
  return formatOptionalValue(record.facilityName ?? facilityRelationName) || 'Unassigned';
}

function formatSourceType(record: DataRecordCsvExportItem) {
  const sourceType = normalizeStatus(record.sourceType);
  const fileName = formatOptionalValue(record.sourceFileName || record.sourceReference);
  const extension = fileName.toLowerCase().match(/\.([a-z0-9]+)(?:$|[?#])/)?.[1] ?? '';

  if (extension === 'xlsx' || extension === 'xls' || extension === 'csv') return 'Spreadsheet Import';
  if (extension === 'pdf') return 'PDF Extraction';
  if (sourceType === 'MANUAL') return 'Manual Entry';
  if (sourceType === 'DOCUMENT_AI' || sourceType === 'AI_EXTRACTION') return 'Document';
  return formatDisplayLabel(record.sourceType) || '';
}

function formatSourceReference(record: DataRecordCsvExportItem) {
  if (normalizeStatus(record.sourceType) === 'MANUAL') return 'Manual Entry';

  const parts = [
    record.sourceFileName,
    record.sourceReference,
    record.sourcePage ? `Page ${record.sourcePage}` : '',
    record.sourceRow ? `Line item ${record.sourceRow}` : '',
  ].map(formatOptionalValue).filter(Boolean);

  return parts.join(' · ');
}

function formatScope(record: DataRecordCsvExportItem) {
  const scope = resolveScopeClassification({
    activityType: record.activityType,
    scopeOverride: record.scope,
  }).scope;

  return formatScopeClassification(scope);
}

function formatTreatment(record: DataRecordCsvExportItem) {
  if (isTrackedMetricRecord(record)) return 'Tracked Only';
  return formatDisplayLabel(record.reportTreatment) || '';
}

function formatRecordStatus(record: DataRecordCsvExportItem) {
  if (isTrackedMetricRecord(record)) return 'Tracked Metric';

  const calculationStatus = normalizeStatus(record.calculationStatus);
  const matchingStatus = normalizeStatus(record.matchingStatus);
  const treatment = normalizeStatus(record.reportTreatment);

  if (
    calculationStatus === 'CALCULATED' ||
    matchingStatus === 'MATCHED' ||
    treatment === 'INCLUDED'
  ) {
    return 'Ready';
  }

  return (
    formatDisplayLabel(record.calculationStatus) ||
    formatDisplayLabel(record.matchingStatus) ||
    formatDisplayLabel(record.reportTreatment) ||
    ''
  );
}

function buildDataRecordsCsvRows(records: DataRecordCsvExportItem[]): DataRecordsCsvRow[] {
  return records.map((record) => ({
    'Record Date': formatDateOnly(record.recordDate),
    'Activity Type': record.customTypeLabel?.trim() || getActivityTypeLabel(record.activityType),
    Quantity: formatNumberValue(record.quantity),
    Unit: normalizeUnitForDisplay(record.unit).status === 'valid'
      ? normalizeUnitForDisplay(record.unit).value
      : formatOptionalValue(record.unit),
    Country: formatOptionalValue(record.jurisdictionCountry ?? record.country),
    Province: formatOptionalValue(record.jurisdictionRegion ?? record.province),
    'Site / Facility': formatSiteFacility(record),
    Scope: formatScope(record),
    'Emission Factor': isTrackedMetricRecord(record)
      ? ''
      : formatOptionalValue(getFactorDisplayName(record.matchedFactorName)) ||
        formatNumberValue(record.matchedFactorValue),
    'Factor Unit': isTrackedMetricRecord(record) ? '' : formatOptionalValue(record.matchedFactorUnit),
    'Calculated Emissions kgCO2e': isTrackedMetricRecord(record)
      ? ''
      : formatNumberValue(record.calculatedEmissionsKgCO2e ?? record.calculatedEmission),
    Treatment: formatTreatment(record),
    Status: formatRecordStatus(record),
    Source: formatSourceType(record),
    'Source Reference': formatSourceReference(record),
    Notes: formatOptionalValue(record.notes),
  }));
}

export function buildDataRecordsCsv(records: DataRecordCsvExportItem[]) {
  const rows = buildDataRecordsCsvRows(records);
  return [
    DATA_RECORDS_CSV_HEADERS.join(','),
    ...rows.map((row) =>
      DATA_RECORDS_CSV_HEADERS.map((header) => escapeCsvValue(row[header])).join(','),
    ),
  ].join('\n');
}

export function buildDataRecordsCsvFileName(scope: 'all' | 'filtered' | 'selected', date = new Date()) {
  return `carbonlite-data-records-${scope}-${formatDateOnly(date.toISOString())}.csv`;
}
