import type { ActivityDataItem } from '../../../services/activityData';
import type { DraftActivityInput } from '../inputData.types';
import {
  type EditableParsedActivity,
} from '../inputData.types';

export function getParsedActivityRowKey(item: EditableParsedActivity, index: number) {
  const rowId = String(item.rowId ?? '').trim();
  if (rowId) return `parsed-row-${rowId}`;

  const sourceRow = String(item.sourceRow ?? '').trim();
  if (sourceRow) {
    return [
      'parsed-source',
      item.documentId,
      item.sourceSheetName ?? '',
      sourceRow,
    ]
      .map((part) => String(part ?? '').trim())
      .join('::');
  }

  return `parsed-${item.documentId || 'draft'}-${index}`;
}

export function buildDocumentImportRecordKey(input: {
  sourceDocumentId?: unknown;
  documentId?: unknown;
  sourceSheetName?: unknown;
  sourceRow?: unknown;
  sourceReference?: unknown;
  activityType?: unknown;
  recordDate?: unknown;
  quantity?: unknown;
  unit?: unknown;
}) {
  const sourceDocumentId = String(input.sourceDocumentId ?? input.documentId ?? '').trim();
  if (!sourceDocumentId) return '';

  const sourceRow = String(input.sourceRow ?? '').trim();
  if (sourceRow) {
    return [
      sourceDocumentId,
      'sheet',
      String(input.sourceSheetName ?? '').trim(),
      'row',
      sourceRow,
    ].join('::');
  }

  return [
    sourceDocumentId,
    String(input.sourceReference ?? '').trim(),
    String(input.activityType ?? '').trim().toUpperCase(),
    String(input.recordDate ?? '').trim(),
    String(input.quantity ?? '').trim(),
    String(input.unit ?? '').trim().toUpperCase(),
  ].join('::');
}

export function getEditableParsedActivityRecordKeyForAudit(activity: EditableParsedActivity) {
  return buildDocumentImportRecordKey({
    documentId: activity.documentId,
    sourceSheetName: activity.sourceSheetName,
    sourceRow: activity.sourceRow,
    sourceReference: activity.sourceReference.value,
    activityType: activity.activityType.value,
    recordDate: activity.recordDate.value,
    quantity: activity.quantity.value,
    unit: activity.unit.value,
  });
}

export function getActivitySourceDocumentId(activity: { sourceDocumentId?: string | null; documentId?: string | null }) {
  return String(
    activity.sourceDocumentId ??
      (activity as { documentId?: unknown }).documentId ??
      '',
  ).trim();
}

export function getImportedActivityRecordKey(activity: Partial<ActivityDataItem>) {
  return buildDocumentImportRecordKey({
    sourceDocumentId: getActivitySourceDocumentId(activity),
    sourceSheetName: activity.sourceSheetName,
    sourceRow: activity.sourceRow,
    sourceReference: activity.sourceReference,
    activityType: activity.activityType,
    recordDate: activity.recordDate,
    quantity: activity.quantity,
    unit: activity.unit,
  });
}

export function getImportActivityRecordKey(activity: DraftActivityInput) {
  return buildDocumentImportRecordKey({
    sourceDocumentId: getActivitySourceDocumentId(activity),
    sourceSheetName: activity.sourceSheetName,
    sourceRow: activity.sourceRow,
    sourceReference: activity.sourceReference,
    activityType: activity.activityType,
    recordDate: activity.recordDate,
    quantity: activity.quantity,
    unit: activity.unit,
  });
}

export { getEditableParsedActivityRecordKeyForAudit as getEditableParsedActivityRecordKey };
