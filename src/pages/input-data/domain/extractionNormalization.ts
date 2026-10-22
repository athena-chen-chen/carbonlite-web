import type { DocumentItem, EditableParsedActivity } from '../inputData.types';
import { type DetectedSourceItem, type ParsedActivity } from '../../../services/documentExtraction';
import { normalizeActivityType as normalizeCanonicalActivityType } from '../../../utils/activityType';
import { isValidDateOnly, getTodayDateOnly } from '../../../utils/dateOnly';
import { normalizeJurisdictionCountry } from '../../../utils/conversionFactorMatching';
import { normalizeProvince, CANADIAN_PROVINCE_OPTIONS } from '../../../utils/province';
import {
  type RawExtractionField,
  type EditableDetectedSourceItem,
} from '../inputData.types';

export const SPREADSHEET_UPLOAD_EXTENSIONS = ['csv', 'xlsx', 'xls'] as const;

export function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function extractFieldConfidence(value: RawExtractionField): 'high' | 'medium' | 'low' {
  const confidence = isRecord(value) ? String(value.confidence ?? '').toLowerCase() : '';
  return confidence === 'high' || confidence === 'low' ? confidence : 'medium';
}

export function formatOptionalExtractionField(value: unknown) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);

  if (!isRecord(value)) return '';

  const nestedValue = value.value ?? value.text ?? value.label ?? value.source;
  if (typeof nestedValue === 'string' || typeof nestedValue === 'number') {
    return String(nestedValue);
  }

  return '';
}

export function normalizeOptionalImportString(value: unknown) {
  const normalized = formatOptionalExtractionField(value).trim();
  return normalized ? normalized : undefined;
}

export function normalizeOptionalImportCost(value: unknown) {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;

  const normalized = formatOptionalExtractionField(value).replace(/[$,\s]/g, '');
  if (!normalized) return undefined;
  const numericValue = Number(normalized);

  return Number.isFinite(numericValue) ? numericValue : undefined;
}

export function formatSourceReference(
  value: RawExtractionField,
  documentFileName = '',
) {
  if (typeof value === 'string' && value.trim()) return value;
  if (typeof value === 'number') return String(value);

  if (!isRecord(value)) return documentFileName;

  const fileLabel = formatOptionalExtractionField(
    value.fileName ??
      value.filename ??
      value.documentFileName ??
      value.documentName ??
      value.document,
  );
  const page = value.pageNumber ?? value.page;
  const sourceLabel = formatOptionalExtractionField(
    value.sourceLabel ?? value.label ?? value.sourceType ?? value.type ?? value.method,
  );
  const parts = [
    formatOptionalExtractionField(
      fileLabel || (typeof value.value === 'string' ? value.value : ''),
    ),
    page ? `Page ${page}` : '',
    /^source (review required|information needed)$/i.test(sourceLabel) ? '' : sourceLabel,
  ].filter((part) => String(part).trim());

  return parts.join(' - ') || documentFileName;
}

function getSourceFileExtension(value?: string | null) {
  const match = String(value ?? '').trim().toLowerCase().match(/\.([a-z0-9]+)(?:$|[?#])/);
  return match?.[1] ?? '';
}

export function hasSupportedFileExtension(
  fileName: string,
  extensions: readonly string[],
) {
  return extensions.includes(getSourceFileExtension(fileName));
}

export function isSpreadsheetFileName(value?: string | null) {
  return hasSupportedFileExtension(value ?? '', SPREADSHEET_UPLOAD_EXTENSIONS);
}

function isPdfExtractionLabel(value?: string | null) {
  return String(value ?? '').trim().toLowerCase() === 'pdf extraction';
}

export function formatDocumentSourceTypeLabel(input: {
  fileName?: string | null;
  type?: string | null;
}) {
  const extension = getSourceFileExtension(input.fileName);
  const type = String(input.type ?? '').trim().toUpperCase();

  if (extension === 'xlsx' || extension === 'xls' || extension === 'csv') {
    return 'Spreadsheet import';
  }
  if (extension === 'pdf') return 'PDF extraction';
  if (type === 'SPREADSHEET' || type === 'CSV' || type === 'EXCEL') return 'Spreadsheet import';
  if (type === 'PDF') return 'PDF extraction';
  if (type === 'MANUAL') return 'Manual entry';
  return 'Source information needed';
}

export function buildDetectedSourceItems(
  items: DetectedSourceItem[] = [],
  document: { id: string; fileName: string },
): EditableDetectedSourceItem[] {
  return items.map((item, index) => ({
    ...item,
    id: item.id ?? `${document.id}-detected-${index + 1}`,
    documentId: document.id,
    documentFileName: item.sourceFileName || document.fileName,
    sourceDocumentId: item.sourceDocumentId ?? document.id,
    sourceFileName: item.sourceFileName || document.fileName,
  }));
}

type ExtractedSourceItemClassification = {
  reviewableActivities: Array<ParsedActivity | any>;
  detectedSourceItems: DetectedSourceItem[];
};

export function classifyExtractedDocumentSourceItems(
  extractedActivities: Array<ParsedActivity | any> = [],
  document: { id: string; fileName: string },
): ExtractedSourceItemClassification {
  if (isSpreadsheetFileName(document.fileName)) {
    return {
      reviewableActivities: extractedActivities,
      detectedSourceItems: [],
    };
  }

  return extractedActivities.reduce<ExtractedSourceItemClassification>(
    (result, item, index) => {
      const detectedSourceItem = classifyDetectedDocumentSourceItem(item, document, index);
      if (detectedSourceItem) {
        result.detectedSourceItems.push(detectedSourceItem);
      } else {
        result.reviewableActivities.push(item);
      }
      return result;
    },
    { reviewableActivities: [], detectedSourceItems: [] },
  );
}

function classifyDetectedDocumentSourceItem(
  item: ParsedActivity | any,
  document: { id: string; fileName: string },
  index: number,
): DetectedSourceItem | null {
  const activityTypeField = getAliasedExtractionField(item, [
    'activityType',
    'activity_type',
    'recordCategory',
    'Record Category',
    'type',
    'category',
  ]);
  const rawActivityType = formatOptionalExtractionField(activityTypeField).trim();
  const quantity = getFieldNumber(getAliasedExtractionField(item, [
    'quantity',
    'consumption',
    'Consumption',
    'amount',
    'usage',
    'value',
  ]));
  const unit = formatOptionalExtractionField(getAliasedExtractionField(item, [
    'unit',
    'uom',
    'measurement',
    'UOM',
  ])).trim();
  const costCad = normalizeOptionalImportCost(
    item.sourceCostCad ?? item.costCad ?? item.cost ?? item.amountCad ?? item.totalCost,
  );
  const label = getSourceItemLabel(item, rawActivityType, document.fileName);
  const searchableText = [
    label,
    rawActivityType,
    unit,
    formatOptionalExtractionField(item.sourceReference),
    formatOptionalExtractionField(item.sourceTextSnippet),
    formatOptionalExtractionField(item.notes),
  ]
    .join(' ')
    .toLowerCase();

  if (isWastewaterEvidence(searchableText)) {
    return buildDetectedDocumentSourceItem({
      item,
      document,
      index,
      type: 'WASTEWATER',
      label: label || 'Wastewater',
      quantity,
      unit,
      costCad,
      reason: 'NOT_SEPARATELY_MODELED',
      reasonDetail: 'Based on water usage and not separately modeled in the current pilot.',
      potentialCategory: 'WASTEWATER',
    });
  }

  const normalizedActivityType = normalizeCanonicalActivityType(rawActivityType);
  if (normalizedActivityType) return null;

  const hasPhysicalWasteQuantity = isPhysicalWasteUnit(unit) && Number.isFinite(quantity);
  if (isWasteServiceEvidence(searchableText) && !hasPhysicalWasteQuantity) {
    return buildDetectedDocumentSourceItem({
      item,
      document,
      index,
      type: 'WASTE_SERVICES',
      label: label || 'Waste Services',
      quantity,
      unit,
      costCad,
      reason: 'INSUFFICIENT_ACTIVITY_QUANTITY',
      reasonDetail: 'No supported physical waste quantity was provided.',
      potentialCategory: 'WASTE',
    });
  }

  if (isUtilityFeeEvidence(searchableText)) {
    return buildDetectedDocumentSourceItem({
      item,
      document,
      index,
      type: 'UTILITY_FEE',
      label,
      quantity,
      unit,
      costCad,
      reason: 'NON_ACTIVITY_BILLING_ITEM',
      reasonDetail: 'Billing charge detected, but not imported as ActivityData.',
      potentialCategory: 'UTILITY_BILLING',
    });
  }

  return null;
}

function buildDetectedDocumentSourceItem(input: {
  item: ParsedActivity | any;
  document: { id: string; fileName: string };
  index: number;
  type: string;
  label: string;
  quantity?: number;
  unit?: string;
  costCad?: number;
  reason: string;
  reasonDetail: string;
  potentialCategory: string;
}): DetectedSourceItem {
  const sourceQuantity =
    Number.isFinite(input.quantity) && input.quantity !== undefined
      ? input.quantity
      : undefined;
  const sourceUnit = input.unit?.trim() || undefined;
  const sourceDetails: DetectedSourceItem['sourceDetails'] = [];
  if (sourceQuantity !== undefined && sourceUnit) {
    sourceDetails.push({ label: 'Quantity', value: `${sourceQuantity} ${sourceUnit}` });
  }
  if (input.costCad !== undefined) {
    sourceDetails.push({ label: 'Source cost', amountCad: input.costCad });
  }

  return {
    id: input.item.id ?? input.item.rowId ?? `${input.document.id}-detected-from-row-${input.index + 1}`,
    type: input.type,
    label: input.label,
    classification: 'DETECTED_SOURCE_ITEM',
    importEligibility: 'NOT_IMPORTABLE',
    reason: input.reason,
    reasonDetail: input.reasonDetail,
    sourceDocumentId: input.item.sourceDocumentId ?? input.document.id,
    sourceFileName: input.item.sourceFileName ?? input.document.fileName,
    sourceReference: formatSourceReference(input.item.sourceReference, input.document.fileName),
    sourcePage: getRawExtractionFieldValue(input.item.sourcePage, null) as string | number | null,
    sourceTextSnippet: formatOptionalExtractionField(input.item.sourceTextSnippet),
    servicePeriodStart: formatDateValue(input.item.startDate ?? input.item.periodStart),
    servicePeriodEnd: formatDateValue(input.item.endDate ?? input.item.periodEnd),
    sourceQuantity,
    sourceUnit,
    sourceCostCad: input.costCad,
    sourceCostCurrency: normalizeOptionalImportString(input.item.costCurrency) ?? 'CAD',
    potentialCategory: input.potentialCategory,
    sourceDetails,
  };
}

function getSourceItemLabel(
  item: ParsedActivity | any,
  rawActivityType: string,
  documentFileName: string,
) {
  return (
    formatOptionalExtractionField(item.label) ||
    formatOptionalExtractionField(item.sourceLabel) ||
    formatOptionalExtractionField(item.description) ||
    formatOptionalExtractionField(item.lineItem) ||
    rawActivityType ||
    formatSourceReference(item.sourceReference, documentFileName)
  ).trim();
}

function getFieldNumber(value: RawExtractionField) {
  const numericValue = Number(formatOptionalExtractionField(value).replace(/[$,\s]/g, ''));
  return Number.isFinite(numericValue) ? numericValue : undefined;
}

function getRawExtractionFieldValue<T>(value: RawExtractionField, fallback: T): T {
  if (isRecord(value) && 'value' in value) {
    return (value.value ?? fallback) as T;
  }

  return (value ?? fallback) as T;
}

function isWastewaterEvidence(text: string) {
  return /\b(waste\s*water|wastewater|sewer|sewage)\b/.test(text);
}

function isWasteServiceEvidence(text: string) {
  return /\b(waste|garbage|recycling|refuse|organics|sanitation)\b/.test(text);
}

function isUtilityFeeEvidence(text: string) {
  return /\b(admin(?:istration)?|delivery|distribution|transmission|service charge|service fee|storm\s*water|stormwater|municipal|franchise|tax|gst|fee|charge)\b/.test(text);
}

function isPhysicalWasteUnit(unit: string) {
  return /\b(kg|kilogram|kilograms|tonne|tonnes|metric ton|metric tons|ton|tons|lb|lbs|pound|pounds|yd3|yard|yards|m3|cubic metre|cubic meter)\b/i.test(
    unit,
  );
}

export function normalizeSourceReferenceForDocument(sourceReference: string, documentFileName: string) {
  if (isSpreadsheetFileName(documentFileName) && isPdfExtractionLabel(sourceReference)) {
    return documentFileName;
  }

  return sourceReference;
}

export function isLikelyMisclassifiedSiteFacilityReference(value: string, documentFileName: string) {
  if (!isSpreadsheetFileName(documentFileName)) return false;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized === documentFileName.trim().toLowerCase()) return false;
  if (getSourceFileExtension(normalized)) return false;
  if (/invoice|receipt|bill|statement|reference|ref\s*#|document|page|row/i.test(normalized)) {
    return false;
  }

  return /\b(office|factory|yard|field office|branch|facility|site|location|warehouse|plant|shop|store|depot)\b/i.test(
    normalized,
  );
}

export function formatDateValue(value: RawExtractionField) {
  const text = formatOptionalExtractionField(value).trim();
  if (!text) return '';

  return text.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(text)
    ? text.slice(0, 10)
    : '';
}

export function resolveActivityRecordDate(input: {
  recordDate?: RawExtractionField;
  extractedDocumentDate?: RawExtractionField;
  uploadDate?: RawExtractionField;
}) {
  const recordDate = formatDateValue(input.recordDate);
  if (recordDate && isValidDateOnly(recordDate)) {
    return {
      value: recordDate,
      dateEstimated: false,
      label: recordDate,
    };
  }

  const extractedDocumentDate = formatDateValue(input.extractedDocumentDate);
  if (extractedDocumentDate && isValidDateOnly(extractedDocumentDate)) {
    return {
      value: extractedDocumentDate,
      dateEstimated: true,
      label: `${extractedDocumentDate} (estimated)`,
    };
  }

  const uploadDate = formatDateValue(input.uploadDate);
  if (uploadDate && isValidDateOnly(uploadDate)) {
    return {
      value: uploadDate,
      dateEstimated: true,
      label: `${uploadDate} (estimated)`,
    };
  }

  const today = getTodayDateOnly();
  if (isValidDateOnly(today)) {
    return {
      value: today,
      dateEstimated: true,
      label: `${today} (estimated)`,
    };
  }

  return {
    value: '',
    dateEstimated: true,
    label: 'Missing date',
  };
}

export function getExtractedDocumentDate(item: ParsedActivity | any) {
  return (
    item.documentDate ??
    item.extractedDocumentDate ??
    item.invoiceDate ??
    item.billDate ??
    item.statementDate ??
    null
  );
}

export function getAliasedExtractionField(item: Record<string, any>, aliases: readonly string[]) {
  for (const alias of aliases) {
    if (item[alias] !== undefined && item[alias] !== null) return item[alias];
  }

  return undefined;
}

export function normalizePreviewCountry(value: RawExtractionField) {
  return normalizeJurisdictionCountry(formatOptionalExtractionField(value)) ?? 'Canada';
}

export function normalizePreviewProvince(value: RawExtractionField) {
  return normalizeProvince(formatOptionalExtractionField(value)) ?? '';
}

function isKnownCanadianProvince(value?: string | null): value is string {
  return CANADIAN_PROVINCE_OPTIONS.includes(value as (typeof CANADIAN_PROVINCE_OPTIONS)[number]);
}

export function extractProvinceFromAddress(value: RawExtractionField) {
  const text = formatOptionalExtractionField(value);
  if (!text.trim()) return '';

  const directProvince = normalizeProvince(text);
  if (isKnownCanadianProvince(directProvince)) return directProvince;

  const tokens = text
    .split(/[^A-Za-z]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  for (const token of tokens) {
    const province = normalizeProvince(token);
    if (isKnownCanadianProvince(province)) return province;
  }

  const normalizedText = text.toLowerCase().replace(/\s+/g, ' ');
  for (const province of CANADIAN_PROVINCE_OPTIONS) {
    if (normalizedText.includes(province.toLowerCase())) return province;
  }

  return '';
}

export function normalizePreviewSiteFacility(value: RawExtractionField) {
  return formatOptionalExtractionField(value);
}

export function normalizePreviewActivityType(value: RawExtractionField) {
  const rawValue = formatOptionalExtractionField(value).trim();
  if (!rawValue) return '';

  return normalizeCanonicalActivityType(rawValue) ?? rawValue;
}

const SITE_FACILITY_ALIASES = [
  'facilityName',
  'Facility Name',
  'facility',
  'Facility',
  'siteName',
  'Site Name',
  'site',
  'Site',
  'location',
  'Location',
  'locationName',
  'Location Name',
  'location name',
  'branch',
  'Branch',
  'factory',
  'Factory',
] as const;

const SOURCE_REFERENCE_ALIASES = [
  'sourceReference',
  'Source Reference',
  'source reference',
  'originalDocument',
  'Original Document',
  'original document',
  'reference',
  'Reference',
  'invoice',
  'Invoice',
  'documentReference',
  'Document Reference',
  'document reference',
  'sourceDocument',
  'Source Document',
  'source document',
] as const;

const ADDRESS_ALIASES = [
  'serviceAddress',
  'Service Address',
  'service address',
  'billingAddress',
  'Billing Address',
  'billing address',
  'address',
  'Address',
  'customerAddress',
  'Customer Address',
  'customer address',
  'siteAddress',
  'Site Address',
  'site address',
  'facilityAddress',
  'Facility Address',
  'facility address',
  'locationAddress',
  'Location Address',
  'location address',
] as const;


function getFieldValue<T>(value: RawExtractionField, fallback: T): T {
  if (isRecord(value) && 'value' in value) {
    return (value.value ?? fallback) as T;
  }

  return (value ?? fallback) as T;
}

function filterCurrentPeriodParsedActivities(
  extractedActivities: Array<ParsedActivity | any>,
  document?: { id: string; fileName: string },
) {
  const currentPeriodCandidates = extractedActivities.filter(
    (item) => !isHistoricalComparisonActivity(item),
  );
  const bestByLogicalActivity = new Map<string, ParsedActivity | any>();

  currentPeriodCandidates.forEach((item) => {
    const key = buildLogicalActivityCandidateKey(item, document);
    if (!key) return;

    const existing = bestByLogicalActivity.get(key);
    if (!existing || getCurrentPeriodEvidenceScore(item) > getCurrentPeriodEvidenceScore(existing)) {
      bestByLogicalActivity.set(key, item);
    }
  });

  const seenKeys = new Set<string>();
  return currentPeriodCandidates.filter((item) => {
    const key = buildLogicalActivityCandidateKey(item, document);
    if (!key) return true;
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return bestByLogicalActivity.get(key) === item;
  });
}

function isHistoricalComparisonActivity(item: ParsedActivity | any) {
  const periodRole = normalizeExtractionRole(item.periodRole);
  const comparisonType = normalizeExtractionRole(item.comparisonType);
  const usageType = normalizeExtractionRole(item.usageType);

  if (['PREVIOUS_PERIOD', 'PRIOR_YEAR', 'HISTORICAL_COMPARISON'].includes(periodRole)) {
    return true;
  }

  if (
    ['PREVIOUS_PERIOD', 'PRIOR_YEAR', 'HISTORICAL_COMPARISON'].includes(comparisonType) ||
    ['PREVIOUS_PERIOD', 'PRIOR_YEAR', 'HISTORICAL_COMPARISON'].includes(usageType)
  ) {
    return true;
  }

  if (periodRole === 'CURRENT') return false;

  const context = getParsedActivityContextText(item);
  if (!context) return false;

  const hasHistoricalContext =
    /\b(last|previous|prior)\s+(bill|billing period|month|period|year)\b/i.test(context) ||
    /\bsame\s+period\s+last\s+year\b/i.test(context) ||
    /\bhistorical\b|\bcomparison\b|\bcompare\b|\busage\s+chart\b|\bchart\s+value\b/i.test(context);
  if (!hasHistoricalContext) return false;

  const hasCurrentContext =
    /\bthis\s+bill\b|\bcurrent\s+(bill|billing period|period|usage|charges?)\b/i.test(context) ||
    /\bgas\s+charges?\b|\bdelivery\s*\(/i.test(context);

  return !hasCurrentContext || /\b(last|previous|prior)\s+(bill|billing period|month|period|year)\b/i.test(context);
}

function getParsedActivityContextText(item: ParsedActivity | any) {
  return [
    item.periodRole,
    item.sourceReference,
    item.sourceTextSnippet,
    item.notes,
    item.label,
    item.sourceLabel,
    item.context,
    item.sourceContext,
    item.periodLabel,
    item.rowLabel,
    item.section,
    item.description,
    item.usageType,
    item.comparisonType,
  ]
    .map((value) => formatOptionalExtractionField(value))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeExtractionRole(value: RawExtractionField) {
  return formatOptionalExtractionField(value)
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

function buildLogicalActivityCandidateKey(
  item: ParsedActivity | any,
  document?: { id: string; fileName: string },
) {
  const activityType = normalizePreviewActivityType(
    getAliasedExtractionField(item, ['activityType', 'activity_type', 'recordCategory', 'Record Category', 'type', 'category']),
  );
  const unit = String(getFieldValue(getAliasedExtractionField(item, ['unit', 'uom', 'UOM', 'measurement']), '')).trim().toUpperCase();
  const recordDate = formatDateValue(
    getAliasedExtractionField(item, ['recordDate', 'date', 'Service Date', 'startDate', 'periodStart', 'fromDate']),
  );
  const endDate = formatDateValue(getAliasedExtractionField(item, ['endDate', 'periodEnd', 'toDate']));
  const country = normalizeJurisdictionCountry(
    getFieldValue(getAliasedExtractionField(item, ['jurisdictionCountry', 'country', 'countryCode']), 'Canada'),
  );
  const region = normalizePreviewProvince(
    getAliasedExtractionField(item, ['jurisdictionRegion', 'province', 'region', 'state', 'stateProvince']),
  );
  const facility = normalizePreviewSiteFacility(
    getAliasedExtractionField(item, [
      'facilityName',
      'facility',
      'site',
      'siteName',
      'location',
      'locationName',
      'Location Name',
      'branch',
      'factory',
    ]),
  );
  const sourceDocument = formatOptionalExtractionField(item.sourceDocumentId) ||
    document?.id ||
    formatOptionalExtractionField(item.sourceFileName) ||
    document?.fileName ||
    '';

  if (!activityType || !unit) return '';

  return [
    sourceDocument,
    activityType.toUpperCase(),
    unit,
    endDate || recordDate,
    country,
    region,
    facility,
  ].join('::');
}

function getCurrentPeriodEvidenceScore(item: ParsedActivity | any) {
  const context = getParsedActivityContextText(item);
  let score = 0;
  const periodRole = normalizeExtractionRole(item.periodRole);
  if (periodRole === 'CURRENT') score += 10;
  if (/\bthis\s+bill\b|\bcurrent\s+(bill|billing period|period|usage|charges?)\b/i.test(context)) score += 4;
  if (/\bgas\s+charges?\b|\bdelivery\s*\(/i.test(context)) score += 3;
  if (/\bmeter\b|\bread(ing)?\b|\bbilling\s+period\b/i.test(context)) score += 2;
  if (item.sourcePage !== undefined && item.sourcePage !== null) score += 1;
  return score;
}

export function buildEditableParsedActivities(
  extractedActivities: Array<ParsedActivity | any>,
  document: { id: string; fileName: string; createdAt?: string | null },
  options: { preserveRows?: boolean } = {},
  documents: DocumentItem[],
  isRowImportable: (row: EditableParsedActivity) => boolean,
): EditableParsedActivity[] {
  const reviewActivities = options.preserveRows
    ? extractedActivities
    : filterCurrentPeriodParsedActivities(extractedActivities, document);

  return reviewActivities.map((item) => {
    const activityTypeField = getAliasedExtractionField(item, [
      'activityType',
      'activity_type',
      'recordCategory',
      'Record Category',
      'type',
      'category',
    ]);
    const quantityField = getAliasedExtractionField(item, [
      'quantity',
      'consumption',
      'Consumption',
      'amount',
      'usage',
      'value',
    ]);
    const unitField = getAliasedExtractionField(item, ['unit', 'uom', 'UOM', 'measurement']);
    const startDateField = getAliasedExtractionField(item, [
      'recordDate',
      'date',
      'Service Date',
      'startDate',
      'periodStart',
      'fromDate',
    ]);
    const endDateField = getAliasedExtractionField(item, [
      'endDate',
      'periodEnd',
      'toDate',
    ]);
    const countryField = getAliasedExtractionField(item, [
      'jurisdictionCountry',
      'country',
      'countryCode',
    ]);
    const provinceField = getAliasedExtractionField(item, [
      'jurisdictionRegion',
      'province',
      'region',
      'state',
      'stateProvince',
    ]);
    const addressField = getAliasedExtractionField(item, ADDRESS_ALIASES);
    const facilityField = getAliasedExtractionField(item, SITE_FACILITY_ALIASES);
    const sourceReferenceField = getAliasedExtractionField(item, SOURCE_REFERENCE_ALIASES);
    const documentUploadDate =
      document.createdAt ??
      documents.find((doc) => doc.id === document.id)?.createdAt ??
      null;
    const resolvedDate = resolveActivityRecordDate({
      recordDate: startDateField,
      extractedDocumentDate: getExtractedDocumentDate(item),
      uploadDate: documentUploadDate,
    });

    const quantityValue = Number(getFieldValue(quantityField, 0));
    const normalizedActivityType = normalizePreviewActivityType(activityTypeField);
    const normalizedCountry = normalizePreviewCountry(countryField);
    const normalizedProvince =
      normalizePreviewProvince(provinceField) || extractProvinceFromAddress(addressField);
    const normalizedFacility = (isSpreadsheetFileName(document.fileName) || /\.json$/i.test(document.fileName))
      ? normalizePreviewSiteFacility(facilityField)
      : '';
    const rawSourceReferenceValue = formatSourceReference(sourceReferenceField, document.fileName);
    const sourceReferenceLooksLikeFacility =
      !normalizedFacility &&
      isLikelyMisclassifiedSiteFacilityReference(rawSourceReferenceValue, document.fileName);
    const previewFacility = sourceReferenceLooksLikeFacility
      ? rawSourceReferenceValue.trim()
      : normalizedFacility;
    const sourceReferenceValue = normalizeSourceReferenceForDocument(
      sourceReferenceLooksLikeFacility ? document.fileName : rawSourceReferenceValue,
      document.fileName,
    );
    const periodEndDate = formatDateValue(endDateField) || null;
    const draftRow: EditableParsedActivity = {
      rowId: item.rowId ?? null,
      selected: true,
      documentId: document.id,
      documentFileName: document.fileName,
      status: item.status ?? null,
      dateEstimated: resolvedDate.dateEstimated || Boolean(item.dateEstimated),
      periodEndDate,
      activityType: {
        value: normalizedActivityType,
        confidence: extractFieldConfidence(activityTypeField),
      },
      recordDate: {
        value: resolvedDate.value,
        confidence: resolvedDate.dateEstimated
          ? 'low'
          : extractFieldConfidence(startDateField),
      },
      quantity: {
        value: Number.isFinite(quantityValue) ? quantityValue : 0,
        confidence: extractFieldConfidence(quantityField),
      },
      unit: {
        value: String(getFieldValue(unitField, '')),
        confidence: extractFieldConfidence(unitField),
      },
      jurisdictionCountry: {
        value: normalizedCountry,
        confidence: 'high',
      },
      jurisdictionRegion: {
        value: normalizedProvince,
        confidence: normalizedProvince ? 'high' : 'low',
      },
      facilityName: {
        value: previewFacility,
        confidence: sourceReferenceLooksLikeFacility
          ? extractFieldConfidence(sourceReferenceField)
          : extractFieldConfidence(facilityField),
      },
      sourceReference: {
        value: sourceReferenceValue,
        confidence: extractFieldConfidence(sourceReferenceField),
      },
      sourceSheetName: formatOptionalExtractionField(item.sourceSheetName) || null,
      sourcePage: getFieldValue(item.sourcePage, null) as string | number | null,
      sourceRow: getFieldValue(item.sourceRow, null) as string | number | null,
      sourceTextSnippet: formatOptionalExtractionField(item.sourceTextSnippet),
      costCad: normalizeOptionalImportCost(item.costCad) ?? null,
      costCurrency: normalizeOptionalImportString(item.costCurrency) ?? null,
      matchingStatus: item.matchingStatus ?? null,
      reportTreatment: item.reportTreatment ?? null,
      scope: item.scope ?? null,
      calculationStatus: item.calculationStatus ?? null,
      calculationMessage: item.calculationMessage ?? null,
      matchedFactorId: item.matchedFactorId ?? null,
      matchedFactorName: item.matchedFactorName ?? null,
      matchedFactorSourceYear: Number.isFinite(Number(item.matchedFactorSourceYear))
        ? Number(item.matchedFactorSourceYear)
        : null,
      matchedFactorValue: Number.isFinite(Number(item.matchedFactorValue))
        ? Number(item.matchedFactorValue)
        : null,
      matchedFactorUnit: item.matchedFactorUnit ?? null,
      matchedFactorVersion: item.matchedFactorVersion ?? null,
      matchedFactorSourceAuthority: item.matchedFactorSourceAuthority ?? null,
      matchedFactorSourceDocument: item.matchedFactorSourceDocument ?? null,
      matchedFactorSourceUrl: item.matchedFactorSourceUrl ?? null,
      matchedFactorVerificationStatus: item.matchedFactorVerificationStatus ?? null,
      matchedFactorConfidenceLevel: item.matchedFactorConfidenceLevel ?? null,
      matchedFactorAssumptions: item.matchedFactorAssumptions ?? null,
      factorSelectionReason: item.factorSelectionReason ?? null,
      factorSelectionExplanation: item.factorSelectionExplanation ?? null,
      calculatedEmissionsKgCO2e: Number.isFinite(Number(item.calculatedEmissionsKgCO2e))
        ? Number(item.calculatedEmissionsKgCO2e)
        : null,
      notes: {
        value: formatOptionalExtractionField(item.notes),
        confidence: 'high',
      },
    };

    return {
      ...draftRow,
      selected: isRowImportable(draftRow),
    };
  });
}
