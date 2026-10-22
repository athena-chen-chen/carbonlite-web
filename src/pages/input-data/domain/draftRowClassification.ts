import { normalizeActivityType as normalizeCanonicalActivityType } from '../../../utils/activityType';
import { type ActivityDataInput } from '../../../services/activityData';
import { normalizeUnitForDisplay } from '../../../utils/unitNormalization';
import { isSupportedPilotProvince, UNSUPPORTED_PILOT_ELECTRICITY_PROVINCE_MESSAGE } from '../../../utils/province';
import {
  type EditableParsedActivity,
  type DraftActivityInput,
  type ImportValidationIssue,
  type DraftRowClassification,
} from '../inputData.types';
import {
  normalizePreviewProvince,
} from './extractionNormalization';

export const UNSUPPORTED_ACTIVITY_TYPE_MESSAGE =
  'Unsupported Activity Type: This activity type is not supported in the current CarbonLite pilot.';

function isMissingImportValue(value: unknown) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return !normalized || normalized === 'null' || normalized === 'undefined';
}

export function normalizeClassificationSignal(value: unknown) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

function hasTrackedMetricSignal(row: Pick<
  EditableParsedActivity,
  'activityType' | 'status' | 'matchingStatus' | 'reportTreatment' | 'scope' | 'calculationStatus' | 'calculationMessage'
>) {
  const activityType = normalizeCanonicalActivityType(row.activityType.value);
  const signals = [
    row.status,
    row.matchingStatus,
    row.reportTreatment,
    row.scope,
    row.calculationStatus,
  ].map(normalizeClassificationSignal);
  const message = String(row.calculationMessage ?? '').toLowerCase();

  return (
    activityType === 'WATER' ||
    activityType === 'WATER_USAGE' ||
    signals.includes('TRACKED_ONLY') ||
    signals.includes('TRACKED_METRIC') ||
    message.includes('tracked only') ||
    message.includes('tracked-only')
  );
}

export function getExplicitReviewStatus(row: Pick<EditableParsedActivity, 'status'>) {
  return normalizeClassificationSignal(row.status);
}

function hasReviewBlockingCalculationSignal(row: Pick<
  EditableParsedActivity,
  'status' | 'matchingStatus' | 'reportTreatment' | 'calculationStatus' | 'calculationMessage'
>) {
  if (isCanonicalReadyReviewRow(row)) return false;

  const signals = [
    row.status,
    row.matchingStatus,
    row.reportTreatment,
    row.calculationStatus,
  ].map(normalizeClassificationSignal);
  const message = String(row.calculationMessage ?? '').toLowerCase();

  return (
    signals.some((signal) =>
      [
        'UNIT_MISMATCH',
        'INVALID_UNIT',
        'MISSING_FACTOR',
        'MISSING_PROVINCE',
        'MISSING_JURISDICTION',
        'REQUIRES_REVIEW',
        'NEEDS_REVIEW',
        'EXCLUDED',
      ].includes(signal),
    ) ||
    message.includes('unit mismatch') ||
    message.includes('missing factor') ||
    message.includes('requires review') ||
    message.includes('excluded from emissions totals')
  );
}

export function isCanonicalReadyReviewRow(row: Pick<
  EditableParsedActivity,
  'status' | 'matchingStatus' | 'reportTreatment' | 'calculationStatus'
>) {
  const status = getExplicitReviewStatus(row);
  if (status) return status === 'READY';

  return (
    normalizeClassificationSignal(row.matchingStatus) === 'MATCHED' &&
    normalizeClassificationSignal(row.calculationStatus) === 'CALCULATED' &&
    normalizeClassificationSignal(row.reportTreatment) === 'INCLUDED'
  );
}

export function getCanonicalReviewStatusFromPayload(payload: DraftActivityInput) {
  const matchingStatus = normalizeClassificationSignal(payload.matchingStatus);
  const calculationStatus = normalizeClassificationSignal(payload.calculationStatus);
  const reportTreatment = normalizeClassificationSignal(payload.reportTreatment);
  const scope = normalizeClassificationSignal(payload.scope);

  if (
    matchingStatus === 'TRACKED_ONLY' ||
    calculationStatus === 'TRACKED_ONLY' ||
    reportTreatment === 'TRACKED_ONLY' ||
    scope === 'TRACKED_METRIC'
  ) {
    return 'TRACKED_ONLY';
  }

  if (
    matchingStatus === 'MATCHED' &&
    calculationStatus === 'CALCULATED' &&
    reportTreatment === 'INCLUDED'
  ) {
    return 'READY';
  }

  return 'NEEDS_REVIEW';
}

export function classifyDraftRow(
  row: EditableParsedActivity,
  issues: ImportValidationIssue[] = getImportValidationIssues([row]),
): DraftRowClassification {
  if (issues.length > 0) return 'REQUIRES_REVIEW';
  const explicitStatus = getExplicitReviewStatus(row);
  if (explicitStatus === 'READY') return 'READY';
  if (explicitStatus === 'TRACKED_ONLY') return 'TRACKED_METRIC';
  if (explicitStatus === 'NEEDS_REVIEW') return 'REQUIRES_REVIEW';
  if (hasTrackedMetricSignal(row)) return 'TRACKED_METRIC';
  if (hasReviewBlockingCalculationSignal(row)) return 'REQUIRES_REVIEW';
  if (normalizeCanonicalActivityType(row.activityType.value)) return 'READY';
  return 'NOT_IMPORTABLE';
}

export function isImportableDraftRowClassification(classification: DraftRowClassification) {
  return classification === 'READY' || classification === 'TRACKED_METRIC';
}

function hasBlockingImportStatus(activity: DraftActivityInput) {
  const matchingStatus = normalizeClassificationSignal(activity.matchingStatus);
  const calculationStatus = normalizeClassificationSignal(activity.calculationStatus);
  const reportTreatment = normalizeClassificationSignal(activity.reportTreatment);

  return [matchingStatus, calculationStatus, reportTreatment].some((status) =>
    [
      'UNIT_MISMATCH',
      'INVALID_UNIT',
      'MISSING_FACTOR',
      'MISSING_PROVINCE',
      'MISSING_JURISDICTION',
      'REQUIRES_REVIEW',
      'NEEDS_REVIEW',
      'EXCLUDED',
    ].includes(status),
  );
}

function hasTrackedMetricImportStatus(activity: DraftActivityInput) {
  const matchingStatus = normalizeClassificationSignal(activity.matchingStatus);
  const calculationStatus = normalizeClassificationSignal(activity.calculationStatus);
  const reportTreatment = normalizeClassificationSignal(activity.reportTreatment);
  const scope = normalizeClassificationSignal(activity.scope);

  return (
    matchingStatus === 'TRACKED_ONLY' ||
    calculationStatus === 'TRACKED_ONLY' ||
    reportTreatment === 'TRACKED_ONLY' ||
    scope === 'TRACKED_METRIC'
  );
}

function hasBlockingImportValueIssue(activity: DraftActivityInput) {
  const activityType = String(activity.activityType ?? '').trim();
  const quantity = Number(activity.quantity);
  const unit = String(activity.unit ?? '').trim();

  return !activityType || !Number.isFinite(quantity) || quantity <= 0 || !unit;
}

export function isDocumentImportPayloadImportable(activity: DraftActivityInput): activity is ActivityDataInput {
  const matchingStatus = normalizeClassificationSignal(activity.matchingStatus);
  const calculationStatus = normalizeClassificationSignal(activity.calculationStatus);
  const reportTreatment = normalizeClassificationSignal(activity.reportTreatment);

  if (hasBlockingImportValueIssue(activity)) return false;
  if (hasBlockingImportStatus(activity)) return false;
  if (hasTrackedMetricImportStatus(activity)) return true;

  return (
    matchingStatus === 'MATCHED' &&
    calculationStatus === 'CALCULATED' &&
    reportTreatment === 'INCLUDED'
  );
}

export function getImportValidationIssues(rows: EditableParsedActivity[]) {
  const issues: ImportValidationIssue[] = [];

  rows.forEach((row, index) => {
    const normalizedActivityType = normalizeCanonicalActivityType(row.activityType.value);

    if (isMissingImportValue(row.activityType.value)) {
      issues.push({
        rowIndex: index,
        field: 'activityType',
        message: 'Activity type is required.',
      });
    } else if (!normalizedActivityType) {
      issues.push({
        rowIndex: index,
        field: 'activityType',
        message: UNSUPPORTED_ACTIVITY_TYPE_MESSAGE,
      });
    }

    if (
      row.quantity.value === null ||
      row.quantity.value === undefined ||
      isMissingImportValue(row.quantity.value)
    ) {
      issues.push({
        rowIndex: index,
        field: 'quantity',
        message: 'Quantity is required.',
      });
    } else {
      const quantity = Number(row.quantity.value);

      if (!Number.isFinite(quantity)) {
        issues.push({
          rowIndex: index,
          field: 'quantity',
          message: 'Quantity is required.',
        });
      } else if (quantity <= 0) {
        issues.push({
          rowIndex: index,
          field: 'quantity',
          message: 'Quantity must be greater than 0.',
        });
      }
    }

    const normalizedUnit = normalizeUnitForDisplay(row.unit.value);

    if (normalizedUnit.status === 'missing') {
      issues.push({
        rowIndex: index,
        field: 'unit',
        message: 'Unit is required.',
      });
    } else if (normalizedUnit.status === 'invalid') {
      issues.push({
        rowIndex: index,
        field: 'unit',
        message: 'Invalid unit detected. Please review this record.',
      });
    }

    if (isMissingImportValue(row.recordDate.value)) {
      issues.push({
        rowIndex: index,
        field: 'recordDate',
        message: 'Record date is required.',
      });
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(String(row.recordDate.value))) {
      issues.push({
        rowIndex: index,
        field: 'recordDate',
        message: 'Record date must use YYYY-MM-DD.',
      });
    }

    if (normalizedActivityType === 'ELECTRICITY') {
      const normalizedProvince = normalizePreviewProvince(row.jurisdictionRegion.value);

      if (!normalizedProvince) {
        issues.push({
          rowIndex: index,
          field: 'jurisdictionRegion',
          message: 'Missing Province: Electricity records require province before factor matching.',
        });
      } else if (!isSupportedPilotProvince(normalizedProvince)) {
        issues.push({
          rowIndex: index,
          field: 'jurisdictionRegion',
          message: UNSUPPORTED_PILOT_ELECTRICITY_PROVINCE_MESSAGE,
        });
      }
    }
  });

  return issues;
}
