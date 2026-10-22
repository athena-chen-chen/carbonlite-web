import {
  type EditableParsedActivity,
} from '../inputData.types';
import {
  classifyDraftRow,
  getImportValidationIssues,
} from './draftRowClassification';
import {
  getEditableParsedActivityRecordKeyForAudit,
} from './importIdentity';

export function buildDraftRowAuditSummary(rows: EditableParsedActivity[]) {
  const classifications = rows.map((row) => classifyDraftRow(row, getImportValidationIssues([row])));
  const readyCount = classifications.filter((classification) => classification === 'READY').length;
  const trackedMetricCount = classifications.filter((classification) => classification === 'TRACKED_METRIC').length;
  const requiresReviewCount = classifications.filter((classification) => classification === 'REQUIRES_REVIEW').length;
  const importableCount = readyCount + trackedMetricCount;

  return {
    draftRecordsCreated: rows.length,
    readyCount,
    trackedMetricCount,
    requiresReviewCount,
    importableCount,
  };
}

export function buildConfirmImportAuditSummary(input: {
  rowsForConfirm: EditableParsedActivity[];
  importedRows: EditableParsedActivity[];
  remainingRows: EditableParsedActivity[];
}) {
  const importedKeys = new Set(
    input.importedRows.map(getEditableParsedActivityRecordKeyForAudit).filter(Boolean),
  );
  const remainingKeys = new Set(
    input.remainingRows.map(getEditableParsedActivityRecordKeyForAudit).filter(Boolean),
  );
  const summary = {
    totalRowsConsidered: input.rowsForConfirm.length,
    includedEmissionsCreated: 0,
    trackedMetricsCreated: 0,
    alreadyImportedSkipped: 0,
    needsReviewSkipped: 0,
    duplicateSkipped: 0,
    otherSkipped: 0,
  };

  input.rowsForConfirm.forEach((row) => {
    const key = getEditableParsedActivityRecordKeyForAudit(row);
    const classification = classifyDraftRow(row, getImportValidationIssues([row]));

    if (key && importedKeys.has(key)) {
      if (classification === 'TRACKED_METRIC') {
        summary.trackedMetricsCreated += 1;
      } else {
        summary.includedEmissionsCreated += 1;
      }
      return;
    }

    if (classification === 'READY' || classification === 'TRACKED_METRIC') {
      if (key && !remainingKeys.has(key)) {
        summary.alreadyImportedSkipped += 1;
      } else {
        summary.duplicateSkipped += 1;
      }
      return;
    }

    if (classification === 'REQUIRES_REVIEW') {
      summary.needsReviewSkipped += 1;
      return;
    }

    summary.otherSkipped += 1;
  });

  const reconciledTotal =
    summary.includedEmissionsCreated +
    summary.trackedMetricsCreated +
    summary.alreadyImportedSkipped +
    summary.needsReviewSkipped +
    summary.duplicateSkipped +
    summary.otherSkipped;

  if (reconciledTotal !== summary.totalRowsConsidered && import.meta.env.DEV) {
    console.warn('Import audit counts do not reconcile.', {
      ...summary,
      reconciledTotal,
    });
  }

  return {
    ...summary,
    rowsNotImported:
      summary.alreadyImportedSkipped +
      summary.needsReviewSkipped +
      summary.duplicateSkipped +
      summary.otherSkipped,
  };
}

export function getAuditSourceType(fileName?: string | null, sourceType?: string | null) {
  const file = String(fileName ?? '').toLowerCase();
  const type = String(sourceType ?? '').toUpperCase();

  if (type === 'MANUAL') return 'Manual Entry';
  if (/\.(xlsx|xls|csv|json)$/i.test(file) || ['SPREADSHEET', 'CSV', 'EXCEL'].includes(type)) {
    return 'Spreadsheet Import';
  }
  if (/\.pdf$/i.test(file) || type === 'PDF') return 'PDF Extraction';
  if (/\.(png|jpg|jpeg)$/i.test(file) || type === 'IMAGE') return 'Document Import';
  return 'Source Review Required';
}
