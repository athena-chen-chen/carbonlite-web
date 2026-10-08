import type { CalculationAuditDetail } from '../services/metrics';
import type { SpreadsheetReviewRowItem } from '../services/spreadsheetReviewRows';
import { getActivityTypeLabel, getFactorDisplayName } from './activityType';
import { buildCalculatedFormula, formatCalculationStatus, formatFactorValue } from './calculationTraceability';
import { formatDateOnly } from './dateOnly';
import { formatDisplayNumber } from './numberFormatting';
import {
  formatReportFactorVersion,
  isTrackedMetricDetail,
} from './reportCredibility';
import {
  formatScopeClassification,
  resolveScopeClassification,
} from './scopeClassification';

export type BusinessAuditEventType =
  | 'SOURCE_UPLOADED'
  | 'ROW_EXTRACTED'
  | 'REVIEW_ROW_CREATED'
  | 'REVIEW_ROW_UPDATED'
  | 'REVIEW_STATUS_CHANGED'
  | 'IMPORT_CONFIRMED'
  | 'ACTIVITY_IMPORTED'
  | 'FACTOR_MATCHED'
  | 'FACTOR_OVERRIDDEN'
  | 'CONVERSION_APPLIED'
  | 'CONVERSION_NOT_APPLIED'
  | 'CALCULATION_CREATED'
  | 'CALCULATION_RECALCULATED'
  | 'CALCULATION_INVALIDATED'
  | 'SCOPE_ASSIGNED'
  | 'BOUNDARY_UPDATED'
  | 'BOUNDARY_REVIEWED'
  | 'MEMBER_INVITED'
  | 'MEMBER_ROLE_CHANGED'
  | 'MEMBER_REMOVED'
  | 'REPORT_GENERATED'
  | 'REPORT_REVIEWED'
  | 'AUDIT_HISTORY_START';

export type BusinessAuditEntityType =
  | 'SOURCE_DOCUMENT'
  | 'EXTRACTED_ROW'
  | 'REVIEW_ROW'
  | 'ACTIVITY_DATA'
  | 'FACTOR'
  | 'CALCULATION'
  | 'REPORT'
  | 'BOUNDARY'
  | 'REPORTING_BOUNDARY'
  | 'ORGANIZATION_MEMBER';

export type BusinessAuditActorType = 'USER' | 'SYSTEM' | 'REVIEWER' | 'MIGRATION';

export type BusinessAuditChangedField = {
  field: string;
  label: string;
  before: string | number | boolean | null;
  after: string | number | boolean | null;
};

export type BusinessAuditEvent = {
  id: string;
  organizationId?: string | null;
  eventType: BusinessAuditEventType;
  entityType: BusinessAuditEntityType;
  entityId: string;
  actorType: BusinessAuditActorType;
  actorUserId?: string | null;
  actorDisplayName?: string | null;
  occurredAt: string;
  sourceDocumentId?: string | null;
  reviewRowId?: string | null;
  activityDataId?: string | null;
  factorId?: string | null;
  calculationId?: string | null;
  reportId?: string | null;
  previousVersion?: number | null;
  newVersion?: number | null;
  changedFields?: BusinessAuditChangedField[];
  reason?: string | null;
  reasonCode?: string | null;
  overrideType?: 'FACTOR' | 'SCOPE' | 'JURISDICTION' | 'UNIT' | 'QUANTITY' | null;
  beforeSnapshot?: Record<string, unknown> | null;
  afterSnapshot?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
};

export type EvidenceChainReportMetadata = {
  reportId?: string | null;
  reportVersion?: string | null;
};

export type EvidenceChain = {
  sourceDocument: {
    id: string | null;
    fileName: string;
    sheetName: string;
    page: string;
    row: string;
    sourceReference: string;
    sourceTextSnippet: string;
  };
  extractedRow: {
    id: string;
    reviewRowId: string | null;
    sourceRow: string;
    rawSourceRow?: Record<string, unknown> | null;
  };
  reviewedActivity: {
    id: string;
    version: number;
    activityType: string;
    recordDate: string;
    quantity: number | string;
    unit: string;
    jurisdictionCountry: string;
    jurisdictionRegion: string;
    facilityName: string;
    reportTreatment: 'INCLUDED' | 'TRACKED_ONLY' | 'EXCLUDED';
    status: string;
  };
  factor: {
    id: string | null;
    versionId: string | null;
    version: string;
    name: string;
    value: string;
    unit: string;
    source: string;
    sourceYear: string;
    selectionReason: string;
  };
  conversion: {
    status: 'APPLIED' | 'NOT_REQUIRED' | 'NOT_APPLIED' | 'NOT_APPLICABLE';
    fromQuantity: string;
    fromUnit: string;
    toQuantity: string;
    toUnit: string;
    factor: string;
    reason: string;
  };
  calculation: {
    id: string | null;
    version: number | null;
    status: string;
    formula: string;
    resultKgCO2e: number | null;
  };
  scope: {
    value: string;
    source: string;
    overrideReason: string;
  };
  finalResult: {
    reportId: string;
    reportVersion: string;
    treatment: 'INCLUDED' | 'TRACKED_ONLY' | 'EXCLUDED';
    resultKgCO2e: number | null;
    operationalMetric: string;
  };
  auditEvents: BusinessAuditEvent[];
  warnings: string[];
};

type ReviewRowLookup = Map<string, SpreadsheetReviewRowItem>;

function clean(value: unknown, fallback = '') {
  const text = String(value ?? '').trim();
  return text && text.toLowerCase() !== 'null' && text.toLowerCase() !== 'undefined'
    ? text
    : fallback;
}

function cleanNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function buildStableId(...parts: Array<string | number | null | undefined>) {
  const text = parts.map((part) => clean(part)).filter(Boolean).join('|') || 'unknown';
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).toUpperCase().padStart(7, '0');
}

function normalizeStatus(value?: string | null) {
  return clean(value).replace(/[\s-]+/g, '_').toUpperCase();
}

function getReportTreatment(detail: CalculationAuditDetail): 'INCLUDED' | 'TRACKED_ONLY' | 'EXCLUDED' {
  if (isTrackedMetricDetail(detail)) return 'TRACKED_ONLY';
  return detail.status === 'CALCULATED' ? 'INCLUDED' : 'EXCLUDED';
}

function getReviewRowForDetail(
  detail: CalculationAuditDetail,
  reviewRows?: SpreadsheetReviewRowItem[] | ReviewRowLookup,
) {
  if (!reviewRows) return null;
  const lookup = reviewRows instanceof Map ? reviewRows : buildReviewRowLookup(reviewRows);
  const keys = [
    detail.activityDataId,
    detail.sourceReference,
    `${detail.sourceDocumentId ?? ''}:${detail.sourceSheetName ?? ''}:${detail.sourceRow ?? ''}`,
    `${detail.sourceFileName ?? ''}:${detail.sourceSheetName ?? ''}:${detail.sourceRow ?? ''}`,
  ].map((key) => clean(key));

  for (const key of keys) {
    if (!key) continue;
    const row = lookup.get(key);
    if (row) return row;
  }
  return null;
}

export function buildReviewRowLookup(rows: SpreadsheetReviewRowItem[]) {
  const lookup: ReviewRowLookup = new Map();
  rows.forEach((row) => {
    [
      row.id,
      row.rowId,
      row.sourceReference,
      `${row.sourceDocumentId ?? ''}:${row.sourceSheetName ?? ''}:${row.sourceRow ?? ''}`,
      `${row.sourceFileName ?? ''}:${row.sourceSheetName ?? ''}:${row.sourceRow ?? ''}`,
    ].forEach((key) => {
      const normalized = clean(key);
      if (normalized) lookup.set(normalized, row);
    });
  });
  return lookup;
}

function getConversion(detail: CalculationAuditDetail): EvidenceChain['conversion'] {
  if (isTrackedMetricDetail(detail)) {
    return {
      status: 'NOT_APPLICABLE',
      fromQuantity: clean(detail.activityQuantity),
      fromUnit: clean(detail.activityUnit),
      toQuantity: '',
      toUnit: '',
      factor: '',
      reason: 'Tracked operational metric. No GHG calculation is created.',
    };
  }

  const normalizedQuantity = cleanNumber(detail.normalizedQuantity);
  const activityQuantity = cleanNumber(detail.activityQuantity);
  const fromUnit = clean(detail.activityUnit);
  const toUnit = clean(detail.normalizedUnit || detail.factorInputUnit);
  const hasConversion =
    detail.status === 'CALCULATED' &&
    normalizedQuantity !== null &&
    activityQuantity !== null &&
    toUnit &&
    fromUnit &&
    toUnit.toLowerCase() !== fromUnit.toLowerCase();

  if (hasConversion) {
    const factor = activityQuantity !== 0 ? normalizedQuantity / activityQuantity : null;
    return {
      status: 'APPLIED',
      fromQuantity: clean(detail.activityQuantity),
      fromUnit,
      toQuantity: clean(normalizedQuantity),
      toUnit,
      factor: factor === null ? '' : clean(factor),
      reason: 'Activity quantity was normalized to the factor input unit before calculation.',
    };
  }

  if (normalizeStatus(detail.status).includes('UNIT')) {
    return {
      status: 'NOT_APPLIED',
      fromQuantity: clean(detail.activityQuantity),
      fromUnit,
      toQuantity: '',
      toUnit: clean(detail.factorInputUnit || detail.normalizedUnit),
      factor: '',
      reason: 'Unit could not be normalized or matched to the selected factor input unit.',
    };
  }

  return {
    status: detail.status === 'CALCULATED' ? 'NOT_REQUIRED' : 'NOT_APPLIED',
    fromQuantity: clean(detail.activityQuantity),
    fromUnit,
    toQuantity: clean(detail.activityQuantity),
    toUnit: fromUnit,
    factor: '',
    reason:
      detail.status === 'CALCULATED'
        ? 'Activity unit already matches the factor input unit.'
        : formatCalculationStatus(detail.status),
  };
}

function getCalculation(detail: CalculationAuditDetail): EvidenceChain['calculation'] {
  if (detail.status !== 'CALCULATED' || isTrackedMetricDetail(detail)) {
    return {
      id: null,
      version: null,
      status: formatCalculationStatus(detail.status),
      formula: buildCalculatedFormula(detail),
      resultKgCO2e: null,
    };
  }

  return {
    id: `calc:${detail.activityDataId}:v1`,
    version: 1,
    status: 'Calculated',
    formula: detail.calculationFormula || buildCalculatedFormula(detail),
    resultKgCO2e: cleanNumber(detail.calculatedEmissionsKgCO2e ?? detail.calculatedEmission),
  };
}

function getFactor(detail: CalculationAuditDetail): EvidenceChain['factor'] {
  if (isTrackedMetricDetail(detail) || !detail.factorId) {
    return {
      id: null,
      versionId: null,
      version: '',
      name: '',
      value: '',
      unit: '',
      source: '',
      sourceYear: '',
      selectionReason: '',
    };
  }

  return {
    id: clean(detail.factorId),
    versionId: clean(detail.factorVersionId) || null,
    version: formatReportFactorVersion({
      factorVersion: detail.factorVersion,
      sourceDocument: detail.sourceDocument,
      sourceReference: detail.sourceUrl,
      sourceAuthority: detail.sourceAuthority || detail.factorSource,
    }),
    name: getFactorDisplayName(detail.factorDisplayName || detail.factorName) || clean(detail.factorName),
    value: formatFactorValue(detail.factorValue),
    unit: clean(detail.factorResultUnit || detail.factorInputUnit),
    source: clean(detail.sourceAuthority || detail.factorSource || detail.sourceDocument, 'Source not specified'),
    sourceYear: clean(detail.factorEffectiveYear ?? detail.sourceYear ?? detail.factorYear),
    selectionReason: clean(detail.factorSelectionExplanation || detail.factorSelectionReason || detail.matchingMethod),
  };
}

function getScope(detail: CalculationAuditDetail): EvidenceChain['scope'] {
  const resolution = resolveScopeClassification({
    activityType: detail.activityType,
    scopeOverride: detail.scopeOverride,
    factorDefaultScope: detail.factorDefaultScope,
    factorScope: detail.factorScope,
  });

  return {
    value: formatScopeClassification(resolution.scope),
    source: resolution.source,
    overrideReason: clean(detail.scopeOverrideReason),
  };
}

function getWarnings(detail: CalculationAuditDetail, chain: Omit<EvidenceChain, 'warnings'>) {
  const warnings: string[] = [];
  if (!chain.sourceDocument.id) warnings.push('Source document ID is not available on this calculation detail.');
  if (!chain.sourceDocument.fileName) warnings.push('Source file name is not available.');
  if (!chain.sourceDocument.sourceReference && !chain.sourceDocument.row) {
    warnings.push('Source row/reference is not available.');
  }
  if (chain.reviewedActivity.reportTreatment === 'INCLUDED' && !chain.factor.id) {
    warnings.push('Calculated record is missing factor ID.');
  }
  if (chain.reviewedActivity.reportTreatment === 'INCLUDED' && !chain.calculation.id) {
    warnings.push('Included record is missing calculation ID.');
  }
  if (detail.status !== 'CALCULATED' && !isTrackedMetricDetail(detail)) {
    warnings.push(formatCalculationStatus(detail.status));
  }
  return warnings;
}

function buildDerivedEvent(input: {
  eventType: BusinessAuditEventType;
  entityType: BusinessAuditEntityType;
  entityId: string;
  detail: CalculationAuditDetail;
  occurredAt: string;
  sourceDocumentId?: string | null;
  reviewRowId?: string | null;
  factorId?: string | null;
  calculationId?: string | null;
  reportId?: string | null;
  metadata?: Record<string, unknown>;
}): BusinessAuditEvent {
  return {
    id: `derived:${input.eventType}:${buildStableId(input.entityId, input.reportId, input.occurredAt)}`,
    eventType: input.eventType,
    entityType: input.entityType,
    entityId: input.entityId,
    actorType: 'SYSTEM',
    occurredAt: input.occurredAt,
    sourceDocumentId: input.sourceDocumentId,
    reviewRowId: input.reviewRowId,
    activityDataId: input.detail.activityDataId,
    factorId: input.factorId,
    calculationId: input.calculationId,
    reportId: input.reportId,
    reason: 'Derived from current linked record state because durable business audit events are not yet persisted in this frontend repo.',
    metadata: {
      derivedFromCurrentState: true,
      ...input.metadata,
    },
  };
}

export function buildEvidenceChainFromCalculationDetail(
  detail: CalculationAuditDetail,
  options: {
    reviewRows?: SpreadsheetReviewRowItem[] | ReviewRowLookup;
    report?: EvidenceChainReportMetadata;
    occurredAt?: string;
  } = {},
): EvidenceChain {
  const reviewRow = getReviewRowForDetail(detail, options.reviewRows);
  const sourceDocumentId = clean(detail.sourceDocumentId) || clean(reviewRow?.sourceDocumentId) || null;
  const sourceReference = clean(detail.sourceReference || reviewRow?.sourceReference);
  const sourceRow = clean(detail.sourceRow || reviewRow?.sourceRow);
  const extractedRowId =
    clean(reviewRow?.rowId) ||
    clean(reviewRow?.id) ||
    `row:${buildStableId(sourceDocumentId, detail.sourceSheetName || reviewRow?.sourceSheetName, sourceRow, sourceReference)}`;
  const treatment = getReportTreatment(detail);
  const factor = getFactor(detail);
  const conversion = getConversion(detail);
  const calculation = getCalculation(detail);
  const scope = getScope(detail);
  const occurredAt = options.occurredAt || new Date().toISOString();
  const reportId = clean(options.report?.reportId);
  const reportVersion = clean(options.report?.reportVersion);
  const sourceDocument = {
    id: sourceDocumentId,
    fileName: clean(detail.sourceFileName || reviewRow?.sourceFileName),
    sheetName: clean(detail.sourceSheetName || reviewRow?.sourceSheetName),
    page: clean(detail.sourcePage),
    row: sourceRow,
    sourceReference,
    sourceTextSnippet: clean(detail.sourceTextSnippet),
  };
  const reviewedActivity = {
    id: detail.activityDataId,
    version: 1,
    activityType: getActivityTypeLabel(detail.activityType),
    recordDate: formatDateOnly(detail.recordDate),
    quantity: detail.activityQuantity,
    unit: clean(detail.activityUnit),
    jurisdictionCountry: clean(detail.jurisdictionCountry || detail.jurisdiction),
    jurisdictionRegion: clean(detail.jurisdictionRegion),
    facilityName: clean(detail.facilityName, 'Unassigned'),
    reportTreatment: treatment,
    status: formatCalculationStatus(detail.status),
  };
  const finalResult = {
    reportId,
    reportVersion,
    treatment,
    resultKgCO2e: treatment === 'INCLUDED' ? calculation.resultKgCO2e : null,
    operationalMetric:
      treatment === 'TRACKED_ONLY'
        ? `${formatDisplayNumber(detail.activityQuantity)} ${clean(detail.activityUnit)} ${getActivityTypeLabel(detail.activityType)}`
        : '',
  };
  const auditEvents = [
    buildDerivedEvent({
      eventType: 'ROW_EXTRACTED',
      entityType: 'EXTRACTED_ROW',
      entityId: extractedRowId,
      detail,
      occurredAt,
      sourceDocumentId,
      reviewRowId: clean(reviewRow?.id) || null,
      reportId,
    }),
    buildDerivedEvent({
      eventType: 'ACTIVITY_IMPORTED',
      entityType: 'ACTIVITY_DATA',
      entityId: detail.activityDataId,
      detail,
      occurredAt,
      sourceDocumentId,
      reviewRowId: clean(reviewRow?.id) || null,
      reportId,
    }),
  ];

  if (factor.id) {
    auditEvents.push(
      buildDerivedEvent({
        eventType: 'FACTOR_MATCHED',
        entityType: 'FACTOR',
        entityId: factor.id,
        detail,
        occurredAt,
        sourceDocumentId,
        reviewRowId: clean(reviewRow?.id) || null,
        factorId: factor.id,
        reportId,
      }),
    );
  }
  if (calculation.id) {
    auditEvents.push(
      buildDerivedEvent({
        eventType: 'CALCULATION_CREATED',
        entityType: 'CALCULATION',
        entityId: calculation.id,
        detail,
        occurredAt,
        sourceDocumentId,
        reviewRowId: clean(reviewRow?.id) || null,
        factorId: factor.id,
        calculationId: calculation.id,
        reportId,
      }),
    );
  }

  const chainWithoutWarnings = {
    sourceDocument,
    extractedRow: {
      id: extractedRowId,
      reviewRowId: clean(reviewRow?.id) || null,
      sourceRow,
      rawSourceRow: reviewRow?.rawSourceRow ?? null,
    },
    reviewedActivity,
    factor,
    conversion,
    calculation,
    scope,
    finalResult,
    auditEvents,
  };

  return {
    ...chainWithoutWarnings,
    warnings: getWarnings(detail, chainWithoutWarnings),
  };
}

const MATERIAL_REVIEW_FIELDS: Array<{
  field: keyof SpreadsheetReviewRowItem | string;
  label: string;
}> = [
  { field: 'activityType', label: 'Activity Type' },
  { field: 'recordDate', label: 'Record Date' },
  { field: 'quantity', label: 'Quantity' },
  { field: 'unit', label: 'Unit' },
  { field: 'jurisdictionCountry', label: 'Country' },
  { field: 'jurisdictionRegion', label: 'Province / Region' },
  { field: 'facilityName', label: 'Site / Facility' },
  { field: 'status', label: 'Review Status' },
  { field: 'matchedFactorId', label: 'Matched Factor ID' },
  { field: 'matchedFactorName', label: 'Matched Factor Name' },
  { field: 'calculationStatus', label: 'Calculation Status' },
  { field: 'calculatedEmissionsKgCO2e', label: 'Calculated Emissions kgCO2e' },
];

function valueForDiff(row: Record<string, unknown>, field: string) {
  const value = row[field];
  return value === undefined || value === '' ? null : (value as string | number | boolean | null);
}

export function diffMaterialActivityFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): BusinessAuditChangedField[] {
  return MATERIAL_REVIEW_FIELDS.flatMap(({ field, label }) => {
    const beforeValue = valueForDiff(before, String(field));
    const afterValue = valueForDiff(after, String(field));
    return Object.is(beforeValue, afterValue)
      ? []
      : [{ field: String(field), label, before: beforeValue, after: afterValue }];
  });
}

export function buildReviewRowUpdateAuditEvent(input: {
  organizationId?: string | null;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  actorType?: BusinessAuditActorType;
  actorUserId?: string | null;
  actorDisplayName?: string | null;
  occurredAt?: string;
  previousVersion?: number;
  newVersion?: number;
  reason?: string | null;
}): BusinessAuditEvent {
  const reviewRowId = clean(input.after.id || input.after.rowId || input.before.id || input.before.rowId);
  const changedFields = diffMaterialActivityFields(input.before, input.after);

  return {
    id: `event:review-row-updated:${reviewRowId}:v${input.newVersion ?? 2}`,
    organizationId: input.organizationId,
    eventType: changedFields.some((field) => field.field === 'status')
      ? 'REVIEW_STATUS_CHANGED'
      : 'REVIEW_ROW_UPDATED',
    entityType: 'REVIEW_ROW',
    entityId: reviewRowId,
    actorType: input.actorType ?? 'USER',
    actorUserId: input.actorUserId,
    actorDisplayName: input.actorDisplayName,
    occurredAt: input.occurredAt || new Date().toISOString(),
    sourceDocumentId: clean(input.after.sourceDocumentId || input.before.sourceDocumentId) || null,
    reviewRowId,
    previousVersion: input.previousVersion ?? 1,
    newVersion: input.newVersion ?? 2,
    changedFields,
    reason: input.reason ?? 'Reviewer changed source review row fields.',
    beforeSnapshot: input.before,
    afterSnapshot: input.after,
    metadata: {
      sourceReference: clean(input.after.sourceReference || input.before.sourceReference),
      sourceSheetName: clean(input.after.sourceSheetName || input.before.sourceSheetName),
      sourceRow: clean(input.after.sourceRow || input.before.sourceRow),
    },
  };
}

export function buildEvidenceChainSummaryRows(chains: EvidenceChain[]) {
  return chains.map((chain) => ({
    source: [
      chain.sourceDocument.fileName,
      chain.sourceDocument.sheetName,
      chain.sourceDocument.row ? `row ${chain.sourceDocument.row}` : '',
      chain.sourceDocument.sourceReference,
    ].filter(Boolean).join(' / ') || 'Source not specified',
    activity: `${chain.reviewedActivity.activityType} ${formatDisplayNumber(chain.reviewedActivity.quantity)} ${chain.reviewedActivity.unit}`.trim(),
    factor: chain.factor.name
      ? `${chain.factor.name} ${chain.factor.value} ${chain.factor.unit}`.trim()
      : 'No factor selected',
    calculation: chain.calculation.resultKgCO2e === null
      ? chain.calculation.status
      : `${formatDisplayNumber(chain.calculation.resultKgCO2e)} kgCO2e`,
    scope: chain.scope.value,
    report: [chain.finalResult.reportId, chain.finalResult.reportVersion].filter(Boolean).join(' / '),
    warnings: chain.warnings.join('; '),
  }));
}
